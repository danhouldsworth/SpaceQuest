/*
 Reflections:
 Currently differentiating between physics loop, and getPilotCommand loop
 Experimented with 'feedback' & 'feedforward'
 However, feedforward still reading real ship state at start of getPilotCommand routine.
 Yet - using drone as an example - physics wants to be as fast / continuous as possible to be realistic, and the control routine is ~400-1000Hz.
 This generally is sample, maths, output - and entirely feedback.
 The goal of an internal model, is to run an internal model at this fast rate, updating model. Acting accordingly. Then tweaking model (with Kalman filtering) of sample rate. (eg GPS)

 Our interception trajectory is close to this ideal feedfoward.

 The 'feedforward' orientation control actually reads from sensors each time. Not technically a mathmatical model.
 Ideally this should be able to take a single (assumed accurate for now) read, then control through time to a target orientation & rate blindly by just tracking passage of time against the forward plan.

 Todo : seperate physics, output, sample rates.

 Theory : a true feedforward, should be much more robust than a PID feedback with lower sample rates (if output rate still high?)
*/

const Ship                        = function(x, y, vx, vy, size, density, image){
    Graphic.call(this, x, y, vx, vy, size, 0, 0, density);
    this.gameClass      = 'ship';
    this.ShipType       = Ship;
    this.showEnergyBar  = true;
    this.image          = image;
    this.offSet         = image.drawingOffsetAngle;
    this.friction       = 0;
    this.projectileEngines        = {
    // NOTE: All projectileEngines assumed to start on the circumference of the circle
    // Oddly : Appear to be labled from 12oclock, anti-clockwise??
        mainJet     : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,   projectilePosition : PI,          projectileAngle : PI},
        frontLeft   : {projectileType : Thrust,     projectileSize : this.size / 12,    projectileSpeed :2.0,   projectilePosition : 0,                projectileAngle : PI / 2},
        frontRight  : {projectileType : Thrust,     projectileSize : this.size / 12,    projectileSpeed :2.0,   projectilePosition : 0,                projectileAngle : PI * 3 / 2},
        backLeft    : {projectileType : Thrust,     projectileSize : this.size / 12,    projectileSpeed :2.0,   projectilePosition : PI,          projectileAngle : PI / 2},
        backRight   : {projectileType : Thrust,     projectileSize : this.size / 12,    projectileSpeed :2.0,   projectilePosition : PI,          projectileAngle : PI * 3 / 2},
        hoseGun     : {projectileType : Bullet,     projectileSize : this.size / 8,     projectileSpeed :1.5,   projectilePosition : 0,                projectileAngle : 0},

        goUp        : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,    projectilePosition : PI,           projectileAngle : PI},
        goDown      : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,    projectilePosition : 0,                 projectileAngle : 0},
        goRight     : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,    projectilePosition : PI * 1 / 2,   projectileAngle : PI * 1 / 2},
        goLeft      : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,    projectilePosition : PI * 3 / 2,   projectileAngle : PI * 3 / 2},

        // *Bay* need getPilotCommand to reconfirm
        rocketBay   : {projectileType : BigRocket,  projectileSize : this.size *1,      projectileSpeed :0.0,   projectilePosition : PI,          projectileAngle : 0},
        bombBay     : {projectileType : Fireball,   projectileSize : this.size / 3,     projectileSpeed :0.2,   projectilePosition : PI,          projectileAngle : PI},
        // missileBayL : {projectileType : Missile,    projectileSize : this.size / 3,     projectileSpeed :0.2,   projectilePosition : PI / 2,      projectileAngle : PI / 2},
        missileBayL : {projectileType : PathChooser,    projectileSize : this.size / 3,     projectileSpeed :0.2,   projectilePosition : PI / 2,      projectileAngle : PI / 2},
        missileBayR : {projectileType : PathChooser,    projectileSize : this.size / 3,     projectileSpeed :0.2,   projectilePosition : PI * 3 / 2,  projectileAngle : PI * 3 / 2}
    };
    this.enginesActive = [];
    this.missileLaunchSide = 1;
};
Ship.prototype                  = Object.create(Graphic.prototype);
Ship.prototype.fireProjectiles       = function(engine, rate, internalModel){
    const clearanceBufferPx = 15;
    const engineFiring      = this.projectileEngines[engine];
    const ProjectileType    = engineFiring.projectileType;
    const projectile = new ProjectileType(
        this.x + this.vx + (this.size + engineFiring.projectileSize + clearanceBufferPx) * cos(this.angle + engineFiring.projectilePosition) + random() - 0.5,
        this.y + this.vy + (this.size + engineFiring.projectileSize + clearanceBufferPx) * sin(this.angle + engineFiring.projectilePosition) + random() - 0.5,
        engineFiring.projectileSpeed * cos(this.angle + engineFiring.projectileAngle),
        engineFiring.projectileSpeed * sin(this.angle + engineFiring.projectileAngle),
        max(0.5, engineFiring.projectileSize * rate), // enginesActive is a float [0:1]
        this
    );
    projectile.vx += this.vx;
    projectile.vy += this.vy;
    if (!internalModel) {gameObjects.push(projectile);}
    // return impulse on parent. Must be DELTA relative to parent! not absolute
    return {
        x       : (this.vx-projectile.vx) * projectile.mass,
        y       : (this.vy-projectile.vy) * projectile.mass,
        torque  : -projectile.momentum(this) * this.size * sin(engineFiring.projectileAngle - engineFiring.projectilePosition)
    };
};
Ship.prototype.getForceAvailable = function(engine){
    // CRUDE - doesn't take into account the engine vector as above
    const size    = this.projectileEngines[engine].projectileSize;
    const speed   = this.projectileEngines[engine].projectileSpeed;
    const mass    = PI * size * size;
    const impulse = mass * speed;
    return impulse;
};
Ship.prototype.getOrthogonalAcceleration = function(){
    return this.fireProjectiles("goRight", 1, true).x / this.mass;
};
Ship.prototype.getMainJetAcceleration = function(){
    return this.fireProjectiles("mainJet", 1, true).x / this.mass;
};
Ship.prototype.getTorque = function(engine){
    return this.fireProjectiles(engine, 1, true).torque;
};
Ship.prototype.launchMissileWhenReady       = function(){
    if (this.missleLaunchersHot === true) return;
    this.missleLaunchersHot = true;
    this.missleCoolTimer = (function(thisShip){setTimeout(function(){thisShip.missleLaunchersHot = false;}, 500);})(this);
    this.missileLaunchSide = -this.missileLaunchSide;
    this.enginesActive[((this.missileLaunchSide === 1)? "missileBayL" : "missileBayR")] = 1;
    return this; // chainable
};
Ship.prototype.launchRocketWhenReady        = function(){
    if (this.rocketLaunchersHot === true) return;
    this.rocketLaunchersHot = true;
    this.rocketCoolTimer = (function(thisShip){setTimeout(function(){thisShip.rocketLaunchersHot = false;}, 2000);})(this);
    this.enginesActive.rocketBay = 1;
    return this; // chainable
};
Ship.prototype.launchCannonWhenReady        = function(){
    if (this.longRangeGunHot === true) return;
    this.longRangeGunHot = true;
    this.cannonCoolTimer = (function(thisShip){setTimeout(function(){thisShip.longRangeGunHot = false;}, 500);})(this);
    this.enginesActive.bombBay = 1;
    return this; // chainable
};
Ship.prototype.updateForces                 = function(internalModel){
    Graphic.prototype.updateForces.call(this);
    // IMPULSE per unit time AKA Change in acceleration per ms
    // DON'T FORGET THIS IS ZEROED EVERY PHYSICS LOOP. For a single engine this is ax = impulse. (Conststant)

    // [However, the actual number of particles injected for animation and game purposes increases with 1 / deltaT].

    for (const engine in this.enginesActive) if (this.enginesActive[engine]){
        const impulse = this.fireProjectiles(engine, this.enginesActive[engine], internalModel);
        // if (internalModel) console.log(engine, impulse);
        this.ax     += (impulse.x      / this.mass)         ;
        this.ay     += (impulse.y      / this.mass)         ;
        this.spinDot+= (impulse.torque / this.inertiaRot)   ;
        if (engine.indexOf("Bay") !== -1) this.enginesActive[engine] = false; // Wait to be reactivated
    }
    return this;
};
Ship.prototype.getPilotCommand              = function(){
    // if (this.team === 1 && !(Date.now() % 2)){console.log(this.ax, this.vx);}
    this.enginesActive = [];
    return this; // chainable
};
Ship.prototype.addModel = function(){
    if (this.model)         kill("Already have model!");
    if (this.parent.model)  kill("We're already a model, prevent nesting!");
    this.model = {
        me      : new this.ShipType(this.x, this.y, this.vx, this.vy, this.size, this), // We need a way of dynamically creating
        target  : new Ship(this.target.x, this.target.y, this.target.vx, this.target.vy, this.target.size, this.target.density, this.target.image),
        dataPaths: [],
    };
    this.model.target.projectileEngines = this.target.projectileEngines; // Should have a good copy of the target type now
};
Ship.prototype.resetModel = function(){
    this.model.dataPaths = [];
    this.model.successfulTrajectorys = [];
    this.model.trajectoryCosts = [];
    return this;
};
Ship.prototype.prepModelPath = function(pathNum){
    this.model.me.previousAngleToTarget = false;
    this.model.me.lastErr               = false;
    this.model.me.lastTargetAngle       = false;
    this.model.me.angle                 = this.angle;
    this.model.me.x                     = this.x;
    this.model.me.y                     = this.y;
    this.model.me.spin                  = this.spin;
    this.model.me.vx                    = this.vx;
    this.model.me.vy                    = this.vy;
    this.model.target.angle             = this.target.angle;
    this.model.target.x                 = this.target.x;
    this.model.target.y                 = this.target.y;
    this.model.target.spin              = this.target.spin;
    this.model.target.vx                = this.target.vx;
    this.model.target.vy                = this.target.vy;
    this.model.target.enginesActive     = this.target.enginesActive;
    this.model.dataPaths[pathNum]       = [];
    this.model.successfulTrajectorys[pathNum] = false;
    this.model.trajectoryCosts[pathNum] = 0;
    return this;
};

// Sneaky test--
Ship.prototype.followConstantThetaToIntercept = function(target, deltaT){
    const accel = this.getMainJetAcceleration();
    const X0 = target.x - this.x;
    const Y0 = target.y - this.y;
    const R0sqrd = X0 * X0 + Y0 * Y0;
    const VX0 = target.vx - this.vx;
    const VY0 = target.vy - this.vy;
    const RV0sqd = VX0 * VX0 + VY0 * VY0;
    const R0dotRV0 = X0 * VX0 + Y0 * VY0;
    const R2missilePrime   = t => 0.25 * accel * accel * t * t * t * t;
    const R2targetPrime    = t => R0sqrd + 2*t*R0dotRV0 + t*t*RV0sqd;

    let t;
    for (t = 0; t < 5000; t++){
        if (R2missilePrime(t) >= R2targetPrime(t)) {break}
    }
    const theta = getAngle(X0+t*VX0, Y0+t*VY0);
    this.fullLoopRotationalPD(theta, deltaT);
    return theta;
};
Ship.prototype.fullLoopRotationalPD   = function(targetAngle, deltaT){
    const kP = 15;
    const kD = 130 * kP;
    if (!this.lastTargetAngle){this.lastTargetAngle = targetAngle; return;} // Don't acuate on first request
    const targetSpin = (targetAngle - this.lastTargetAngle) / deltaT;
    this.lastTargetAngle = targetAngle;
    const err       = normaliseAnglePItoMinusPI(targetAngle - this.angle);
    const errDot    = targetSpin - this.spin;
    const response  = kP * err + kD * errDot;

    // Orientation jets assumed zerod beforehand
    if (response > 0) {this.enginesActive.frontRight = this.enginesActive.backLeft  = min(1, +response);}
    if (response < 0) {this.enginesActive.frontLeft  = this.enginesActive.backRight = min(1, -response);}
};
// -- Sneaky test

const PlayerShip                    = function(x, y, vx, vy, team){
    Ship.call(this, x, y, vx, vy, 200, 1, spaceShip[team]);
    this.projectileEngines.mainJet.projectileSize   *= 1.2; this.projectileEngines.mainJet.projectileSpeed   *= 1.5;
    this.projectileEngines.backRight.projectileSize *= 1.2; this.projectileEngines.backRight.projectileSpeed *= 1.5;
    this.projectileEngines.backLeft.projectileSize  *= 1.2; this.projectileEngines.backLeft.projectileSpeed  *= 1.5;
    this.projectileEngines.frontRight.projectileSize*= 1.2; this.projectileEngines.frontRight.projectileSpeed*= 1.5;
    this.projectileEngines.frontLeft.projectileSize *= 1.2; this.projectileEngines.frontLeft.projectileSpeed *= 1.5;
    this.gameClass  = 'player';
    this.team       = team;
};
PlayerShip.prototype                = Object.create(Ship.prototype);
PlayerShip.prototype.getPilotCommand= function(deltaT){
    Ship.prototype.getPilotCommand.call(this);
    this.FinnsRayGun = false;
    const playerKeys  = {
                                        // Daddy/   Finn     [http://keycode.info/ to get keycodes]
        left        : [null, 81, 37],   // q    /   Arrow
        right       : [null, 87, 39],   // w    /   Arrow
        thrust      : [null, 69, 38],   // e    /   Arrow
        fire        : [null, 83, 32],   // s    /   Space
        missile     : [null, 82, null], // r    /   Down Arrow
        bigRocket   : [null, null, 40], // r    /   Down Arrow
        smartBomb   : [null, 84, 77]    // t    /   m
    };
    if (keyState[playerKeys.left[   this.team]])      {this.enginesActive.frontRight= this.enginesActive.backLeft  = 1;}
    if (keyState[playerKeys.right[  this.team]])      {this.enginesActive.frontLeft = this.enginesActive.backRight = 1;}
    if (keyState[playerKeys.thrust[ this.team]])      {this.enginesActive.mainJet   = 1;    sound(tracks.Thrust, 0.5, 1.5); if (this.team === 1){this.followConstantThetaToIntercept(gameObjects[0], deltaT);}}
    if (keyState[playerKeys.fire[   this.team]])      {this.enginesActive.hoseGun   = 1;    sound(tracks.LaserHose, 0.5, 0.5);}
    if (keyState[playerKeys.smartBomb[ this.team]])   {this.launchCannonWhenReady();        sound(tracks.Stinger, 0.5);}
    if (keyState[playerKeys.missile[this.team]])      {this.launchMissileWhenReady();       sound(tracks.Stinger, 0.5);}
    if (keyState[playerKeys.bigRocket[this.team]])    {this.FinnsRayGun = true;             sound(tracks.BigRocket, 0.5);}
    // if (keyState[playerKeys.bigRocket[this.team]])    {this.launchRocketWhenReady();        sound(tracks.BigRocket, 0.5);}

    if (this.FinnsRayGun){
        gameObjects.forEach(target => {
            if (!target || !target instanceof Graphic || target === this) {return;}
            const testIfNear = new Interaction();
            testIfNear.near(this, target);
            testIfNear.touching(this, target);
            if (testIfNear.seperationSqrd < (this.size * 10) * (this.size * 10)) {
                target.energy -= 0.005 * max(0,cos(getAngleV(testIfNear) - this.angle));
            }
        });
    }

    return this; // chainable
};
PlayerShip.prototype.applyDrag      = function(deltaT) {
    Primitive.prototype.applyDrag.call(this, deltaT);
    // this.vx     *= (1 - deltaT / 5000);
    // this.vy     *= (1 - deltaT / 5000);
    this.spin   *= (1 - deltaT / 1000);
    return this; // chainable
};
PlayerShip.prototype.explode        = function(){
    Graphic.prototype.explode.call(this);
};

const RobotShip                     = function(x, y, vx, vy, size, density, image){
    Ship.call(this, x, y, vx, vy, size, density, image);
    this.showPath               = false;
    this.showEnergyBar          = true;
    this.KpAdj                  = 1;
    this.previousAngleToTarget  = false;
    this.lastErr                = false;
    this.lastTargetAngle        = false;
    this.sampleData             = new Interaction();
};
RobotShip.prototype                 = Object.create(Ship.prototype);
RobotShip.prototype.canclePreviousControl       = function(){
    Ship.prototype.getPilotCommand.call(this); // Includes clearing enginesActive array
    this.engeryField = false;
    return this;
};
RobotShip.prototype.ensureTargetLock                = function(){
    // Get target if never had one OR lost // Don't forget we don't retarget once locked until dead
    if (gameObjects.indexOf(this.target) === -1) {
        this.getNewTarget();
    }
};
RobotShip.prototype.getNewTarget                    = function(){
    this.target = false;
    for (let threat of gameObjects){
        if (threat === this) {continue;}                                                                        // Ha! Don't target ourselves!
        if (this.target.team && this.target.team !== this.team && threat.team === this.team)    {continue;}     // If we're targetting another team, DO NOT target our own team!
        if (!(threat instanceof Graphic))                                                       {continue;}     // Don't target bullets / thrust
        if (this.target === false)                                      {this.target = threat;  continue;}      // Target the first graphic we come across if not yet targeted
        if (this.target.team === this.team && threat.team !== this.team){this.target = threat;  continue;}      // If we're targeting ourselves (from above), then target anyone else if poss

        if (!(this.target instanceof RobotShip) && (threat instanceof RobotShip) ){this.target = threat; continue;}
        // Target valid threats that not yet targeted?
        switch (this.team){
            case 1:
            case 2:
                if (threat.team === 3 && this.target.team !==3)                                                                   {this.target = threat;}
                if (threat.team === 3 && interaction.getSeperation(this, threat) < interaction.getSeperation(this, this.target))  {this.target = threat;}
                if (threat instanceof Asteroid && this.target instanceof Asteroid && threat.mass > this.target.mass)              {this.target = threat;}
                break; // Daddy&Finn Always target the baddies if we're not already. Only retarget for closer baddies or bigger asteroids
            case 3: if (threat.team < 3 && (threat.mass > this.target.mass))                              {this.target = threat;} break; // Baddies target the biggest Daddy/Finn they can
        }
    }
    return this; // chainable
};
RobotShip.prototype.activateWhenClearOf         = function(clearTarget){
    // Return true is EITHER already has target OR now clear of parent
    if (this.target) return true;
    interaction.full(this, clearTarget);
    if (interaction.seperation > 1.25 * interaction.size) return true;
};
RobotShip.prototype.rotationalThrustToReduceSpinError   = function(desiredSpin){
    const kP        = 0.005 * this.inertiaRot / (this.getForceAvailable('frontRight') * this.size);
    const err       = desiredSpin - this.spin;
    const response  = kP * err;
    if (response > 0) {this.enginesActive.frontRight = this.enginesActive.backLeft   = min(1, +response);}
    if (response < 0) {this.enginesActive.frontLeft  = this.enginesActive.backRight  = min(1, -response);}
};
RobotShip.prototype.getTargetSpinToReduceAngleError   = function(targetAngle){
    const kP = this.outerLoopOrientationKp || 0.005;
    const err     = normaliseAnglePItoMinusPI(targetAngle - this.angle); // THIS GIVES issues at err = PI !!
    const response= kP * err;
    return response; //desiredSpinToReduceOrientationError;
};
RobotShip.prototype.fullLoopRotationalFeedForward = function(targetAngle, deltaT){
    // FeedForward version seems less overshoot with sticking to fixed orientation
    let response = 0;
    const angleToTarget     = normaliseAnglePItoMinusPI(targetAngle - this.angle); // Note fringe issues with 180degree wrap. (maybe sensible to overshoot)
    const rotAccAtMaxThrust = (this.getTorque("frontRight") + this.getTorque("backLeft")) / this.inertiaRot;
    const minStoppingAngle  = 0.5 * this.spin * this.spin / rotAccAtMaxThrust;
    if      (this.spin < 0 && angleToTarget > 0)                response = +1;
    else if (this.spin > 0 && angleToTarget < 0)                response = -1;
    else if (angleToTarget > +minStoppingAngle)                 response = +1;
    else if (angleToTarget < -minStoppingAngle)                 response = -1;
    else if (angleToTarget > 0)                                 response = -1;
    else if (angleToTarget < 0)                                 response = +1;

    // Orientation jets assumed zerod beforehand
    if (response > 0) {this.enginesActive.frontRight = this.enginesActive.backLeft  = min(1, +response);}
    if (response < 0) {this.enginesActive.frontLeft  = this.enginesActive.backRight = min(1, -response);}
};
RobotShip.prototype.fullLoopTargetSpinFeedForward = function(targetSpin, deltaT){

    let response = 0;
    if      (this.spin < targetSpin)                response = +1;
    else if (this.spin > targetSpin)                response = -1;
    // Orientation jets assumed zerod beforehand
    if (response > 0) {this.enginesActive.frontRight = this.enginesActive.backLeft  = min(1, +response);}
    if (response < 0) {this.enginesActive.frontLeft  = this.enginesActive.backRight = min(1, -response);}
};
RobotShip.prototype.fullLoopRotationalFeedForward2 = function(targetAngle, deltaT){
    let response = 0;
    const angleToTarget     = normaliseAnglePItoMinusPI(targetAngle - this.angle); // Note fringe issues with 180degree wrap. (maybe sensible to overshoot)
    const rotAccAtMaxThrust = (this.getTorque("frontRight") + this.getTorque("backLeft")) / this.inertiaRot;
    const minStoppingAngle  = 0.5 * this.spin * this.spin / rotAccAtMaxThrust;
    const featherAngle      = 1 * 0.5 *rotAccAtMaxThrust*deltaT*deltaT;// s= 1/2 a t^2 ~ the distance expected to travel with burners on for a deltaT[control]
    const featherRate       = 1  *      rotAccAtMaxThrust*deltaT;       // v = a t      ~ the rate expected to increase with burners on for a deltaT[control]
    if      (this.spin < -featherRate && angleToTarget > 0)     response = +1;
    else if (this.spin > +featherRate && angleToTarget < 0)     response = -1;
    else if (this.spin < 0 && angleToTarget > +featherAngle)    response = +1;
    else if (this.spin > 0 && angleToTarget < -featherAngle)    response = -1;
    else if (this.spin < 0 && angleToTarget > 0)                response = -this.spin * angleToTarget / (featherRate*featherAngle);
    else if (this.spin > 0 && angleToTarget < 0)                response = -this.spin * angleToTarget / (featherRate*featherAngle);
        // Now spin is in direction of target
    else if (angleToTarget > +(minStoppingAngle+featherAngle))  response = +1;
    else if (angleToTarget < -(minStoppingAngle+featherAngle))  response = -1;
    else if (angleToTarget > +(minStoppingAngle-featherAngle))  response = (angleToTarget - minStoppingAngle) / featherAngle;
    else if (angleToTarget < -(minStoppingAngle-featherAngle))  response = (angleToTarget + minStoppingAngle) / featherAngle;
    else if (angleToTarget > 0)                                 response = -1;
    else if (angleToTarget < 0)                                 response = +1;

    if (response > 0) {this.enginesActive.frontRight = this.enginesActive.backLeft  = min(1, +response);}
    if (response < 0) {this.enginesActive.frontLeft  = this.enginesActive.backRight = min(1, -response);}
};
RobotShip.prototype.PDorthogalReponseToLandOn = function(target){
    const kP = 0.001;
    const kD = 1000 * kP;
    const response = {
        x: kP * (target.x - this.x) + kD * (target.vx - this.vx),
        y: kP * (target.y - this.y) + kD * (target.vy - this.vy)
    };
    return response;
};
RobotShip.prototype.PDorthogalReponseToLandMinimiseSpin = function(target, deltaT){
    // !! sampleData calculated in getDeflectionToIntercept !!
    const angleToMinimiseSpin = this.getDeflectionToIntercept(target, deltaT) - this.angleToTarget;

    const kP = 0.001;
    const kD = 1000 * kP;
    let xDiff = target.x - this.x - 1*(this.sampleData.size * cos(this.angleToTarget));
    let yDiff = target.y - this.y - 1*(this.sampleData.size * sin(this.angleToTarget));
    const response = {
        x: kP * xDiff + kD * (target.vx - this.vx) + 0.5 * unitVectorFromAngle(angleToMinimiseSpin).x,
        y: kP * yDiff + kD * (target.vy - this.vy) + 0.5 * unitVectorFromAngle(angleToMinimiseSpin).y
    };
    return response;
};
RobotShip.prototype.modifyResponseToAvoidBoundary = function(response, accAtMaxThrust, buffer){
    const minStoppingDistance   = {
        x : 0.5 * this.vx * this.vx / accAtMaxThrust,
        y : 0.5 * this.vy * this.vy / accAtMaxThrust
    };
    if (this.x > (+(0.5*GlobalParams.universeSize*w - buffer) - (this.vx > 0 ? minStoppingDistance.x : 0))) {response.x = -1000;console.log("wall")} // We cap at 1, so this helps to saturate a vector component
    if (this.x < (-(0.5*GlobalParams.universeSize*w - buffer) + (this.vx < 0 ? minStoppingDistance.x : 0))) {response.x = +1000;console.log("wall")}
    if (this.y > (+(0.5*GlobalParams.universeSize*h - buffer) - (this.vy > 0 ? minStoppingDistance.y : 0))) {response.y = -1000;console.log("wall")}
    if (this.y < (-(0.5*GlobalParams.universeSize*h - buffer) + (this.vy < 0 ? minStoppingDistance.y : 0))) {response.y = +1000;console.log("wall")}

    return response;
};
RobotShip.prototype.actuateOrthoganal = function(response){
    if (response.x > 0) {this.enginesActive.goRight = min(1, +response.x);}
    if (response.x < 0) {this.enginesActive.goLeft  = min(1, -response.x);}
    if (response.y > 0) {this.enginesActive.goUp    = min(1, +response.y);}
    if (response.y < 0) {this.enginesActive.goDown  = min(1, -response.y);}
    // console.log(modulusV(response));
};
RobotShip.prototype.getDeflectionToIntercept = function(target, deltaT){
    const sampleData = this.sampleData = new Interaction(); // We want to keep this data
    sampleData.full(this, target);
    const approachVector = {x:this.vx - target.vx, y:this.vy - target.vy}; // May not be 'approaching'! Could have high magnitude, and be orbiting.
    const approachAngle  = (getAngleV(approachVector));
    const angleToTarget  = (getAngleV(sampleData));
    let err              = normaliseAnglePItoMinusPI(angleToTarget - approachAngle);
    const dotProduct     = cos(err) * modulusV(approachVector); // Scaler approach speed. Negative for move away

    let kP = max(w * dotProduct / sampleData.seperation, 0.5* this.KpAdj); //
    let kD = max(w * dotProduct / sampleData.seperation, 0.01) * 10;

    this.rateOfOrbit = (angleToTarget - (this.previousAngleToTarget || angleToTarget)) / deltaT; // Note this is different to errDot which could be zero during a perfect orbit
    this.previousAngleToTarget = angleToTarget;
    // if (this.model && this.model.haveSuccessfulTrajectory){
        // kP *= 1 + this.model.trajectoryCost / 2000;
    // }

    this.kpTerm = constraintHalfPiToMinusHalfPi(err * kP);
    let errDot = (err - (this.lastErr || err)) / deltaT; // Not default to 0, but default to errDot = 0
    this.lastErr = err;
    // this.kdTerm = atan(errDot * kD);
    this.kdTerm = this.rateOfOrbit * 100;

    let kI = 0.0001;
    this.errIntegral = this.errIntegral || 0; // This is for the life of the real missile
    // if (this.model && this.model.haveSuccessfulTrajectory && this.model.data.length){
        // let signedDeflection = this.model.data[this.model.data.length-1].deflection;
        // this.errIntegral += signedDeflection;

        // console.log(signedDeflection, this.errIntegral, ":", kpTerm , kdTerm , kI * this.errIntegral);
    // }
    this.kiTerm = kI * this.errIntegral;
    let deflectionAngle = constraintHalfPiToMinusHalfPi(this.kpTerm - this.kdTerm + this.kiTerm);
    let actuationAngle = angleToTarget + (dotProduct > 0 ? deflectionAngle:0) ; // Note - this was meant for when at large distances. In a fast close orbit, this is a silly strategy.
    this.angleToTarget = angleToTarget;
    this.dotProduct = dotProduct;
    return actuationAngle;
};
// ---- Orthoganal Thrusting 'Lander' ----
const Drone1                    = function(x, y, vx, vy, size=100, density=1, image=bossBaddy){
    RobotShip.call(this, x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = PI / 2;
    // this.showThrustOrgs = true;
    // this.ephemeral      = true;
    this.showEnergyBar  = false;
};
Drone1.prototype                 = Object.create(RobotShip.prototype);
Drone1.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    this.actuateOrthoganal(this.modifyResponseToAvoidBoundary(this.PDorthogalReponseToLandMinimiseSpin(this.target, deltaT), this.getOrthogonalAcceleration(), 3*this.size));
    return this;
};
Drone1.prototype.applyDrag      = function(deltaT) {
    Primitive.prototype.applyDrag.call(this, deltaT);
    this.angle = PI / 2; this.spin = 0;// Fudge to keep orgogonal
    return this; // chainable
};
// ---- Rotational Thrust 'Lander' ----
const Drone2                       = function(x, y, vx, vy, size=100, density=1, image=bombBaddy){
    RobotShip.call(this, x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = PI / 2;
};
Drone2.prototype                 = Object.create(RobotShip.prototype);
Drone2.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    const actuationVector = this.modifyResponseToAvoidBoundary(this.PDorthogalReponseToLandMinimiseSpin(this.target, deltaT), this.getMainJetAcceleration(), 8*this.size);
    // this.rotationalThrustToReduceSpinError(this.getTargetSpinToReduceAngleError(getAngleV(actuationVector)));
    this.fullLoopRotationalPD(getAngleV(actuationVector), deltaT);
    this.enginesActive.mainJet = min(1, modulusV(actuationVector)); // Adjust this for power
    // if (this.sampleData.seperation < this.size * 15){
    //     this.engeryField = true;
    //     this.target.energy -= 0.01;
    // } else {
    //     this.engeryField = false;
    // }
    return this; // chainable
};
// ---- Vector 'Lander' ------
const Drone3                       = function(x, y, vx, vy, size=100, density=1, image=bomb){
    RobotShip.call(this, x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = PI / 2;
};
Drone3.prototype                 = Object.create(RobotShip.prototype);
Drone3.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    const actuationVector = this.PDorthogalReponseToLandOn(this.target);
    // const actuationVector = this.modifyResponseToAvoidBoundary(this.PDorthogalReponseToLandOn(this.target), this.getMainJetAcceleration(), 8*this.size);
    this.angle = getAngleV(actuationVector);
    this.enginesActive.mainJet = min(1, modulusV(actuationVector)); // Adjust this for power
    return this;
};
// ---- Vector 'Intercept' ------
const Drone4                       = function(x, y, vx, vy, size=100, density=1, image=bomb){
    RobotShip.call(this, x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = PI / 2;
};
Drone4.prototype                 = Object.create(RobotShip.prototype);
Drone4.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    this.angle = this.getDeflectionToIntercept(this.target, deltaT);
    this.enginesActive.mainJet = 1;
    return this;
};
// --- Orthoganal intercept
const Drone5                       = function(x, y, vx, vy, size=100, density=1, image=bossBaddy){
    RobotShip.call(this, x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = PI / 2;
    // this.showThrustOrgs = true;
};
Drone5.prototype                 = Object.create(RobotShip.prototype);
Drone5.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    this.actuateOrthoganal(unitVectorFromAngle(this.getDeflectionToIntercept(this.target, deltaT)));
    return this;
};
Drone5.prototype.applyDrag      = function(deltaT) {
    Primitive.prototype.applyDrag.call(this, deltaT);
    this.angle = PI / 2; this.spin = 0;// Fudge to keep orgogonal
    return this; // chainable
};
// --- Rotational intercept
const Drone6                       = function(x, y, vx, vy, size=100, density=1, image=missile){
    RobotShip.call(this, x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = PI / 2;
};
Drone6.prototype                 = Object.create(RobotShip.prototype);
Drone6.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    this.enginesActive.mainJet = this.energy;//min(1, cos(err)); // Adjust this for power
    this.fullLoopRotationalFeedForward(this.getDeflectionToIntercept(this.target, deltaT), deltaT);
    return this;
};
// --- Orientation Test FeedBack PD
const Drone7                       = function(x, y, vx, vy, size=100, density=1, image=missile){
    RobotShip.call(this, x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = PI / 2;
};
Drone7.prototype                 = Object.create(RobotShip.prototype);
Drone7.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    this.fullLoopRotationalPD(this.target.angle, deltaT);
    return this;
};
// --- Orientation Test FeedForward
const Drone8                       = function(x, y, vx, vy, size=100, density=1, image=bombBaddy){
    RobotShip.call(this, x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = PI / 2;
};
Drone8.prototype                 = Object.create(RobotShip.prototype);
Drone8.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    this.fullLoopRotationalFeedForward(this.target.angle, deltaT);
    return this;
};
// --- Orientation Test FeedForward
const Drone9                       = function(x, y, vx, vy, size=100, density=1, image=bombBaddy){
    RobotShip.call(this, x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = PI / 2;
};
Drone9.prototype                 = Object.create(RobotShip.prototype);
Drone9.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    this.fullLoopTargetSpinFeedForward(this.target.spin, deltaT);
    return this;
};
// --- Orientation Test Feedback, planned BLIND mission as function of time, occasional correction based on sensor read (Kalman / Fusion)
// Needs modification of sensor / control / physics loops

const Fireball                      = function(x, y, vx, vy, size, parent){
    // kill("Stop to analysis");
    Drone1.call(this, x, y, vx, vy, size, 1);
    this.projectileEngines.goUp.projectileSize      *= 1.25;
    this.projectileEngines.goDown.projectileSize    *= 1.25;
    this.projectileEngines.goRight.projectileSize   *= 1.25;
    this.projectileEngines.goLeft.projectileSize    *= 1.25;
    this.gameClass      = 'fireball';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = parent.mass/2;
};
Fireball.prototype                  = Object.create(Drone1.prototype);
Fireball.prototype.getPilotCommand = function(deltaT){
    Drone1.prototype.getPilotCommand.call(this, deltaT);
    if (this.sampleData.seperation < this.sampleData.size * 4){
        this.engeryField = true;
        this.target.energy -= 0.01;
    } else {
        this.engeryField = false;
    }
    return this;
};

// SeekerMissile (feedback)
// IntercepterMissile (single angle triangulation predictor)
const Missile                         = function(x, y, vx, vy, size, parent){
    Drone6.call(this, x, y, vx, vy, size, 1, bombBaddy);
    this.ShipType = Missile;
    // this.projectileEngines.mainJet.projectileSize *= 0.5;
    this.gameClass      = 'missile';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = parent.mass/2;
    this.angle          = this.parent.angle;
    this.plotAllCharts  = true;
    // this.projectileEngines.mainJet.projectileSize       *= 1.5;
    // this.projectileEngines.frontRight.projectileSize    *= 1.25;
    // this.projectileEngines.frontLeft.projectileSize     *= 1.25;
    // this.projectileEngines.backLeft.projectileSize      *= 1.25;
    // this.projectileEngines.backRight.projectileSize     *= 1.25;

};
Missile.prototype                   = Object.create(Drone6.prototype);
Missile.prototype.calcModelPath = function(pathNum, deltaT){
    const me        = this.model.me;
    const target    = this.model.target;
    const internalModel = true;
    let dT = GlobalParams.deltaT.physics
    const calcsPerAlgorithm = round(deltaT / dT);
    dT = deltaT / calcsPerAlgorithm;
    for (let t = 0; t < 1000; t++){

        // <-- Model control
        me.canclePreviousControl(); me.enginesActive.mainJet = this.energy; // Gamify : Reduce power with health
        me.fullLoopRotationalPD(me.getDeflectionToIntercept(target, deltaT), deltaT);
        // -->

        // <-- Model and path multiple physics iterations
        for (let p = 0; p < calcsPerAlgorithm; p++){
            // <-- Update ghosts of both us & target
            target.clearAccelerations().updateForces(internalModel).updateVelocities(dT).updatePosition(dT);
                me.clearAccelerations().updateForces(internalModel).updateVelocities(dT).updatePosition(dT);
            const path = {
                x           : me.x,
                y           : me.y,
                seperation  : me.sampleData.seperation,         // NO! - We've moved since last calculating this interaction!!
                speed       : me.speed(),
                rateOfOrbit : me.rateOfOrbit,
                dotProduct  : me.dotProduct,
                deflection  : normaliseAnglePItoMinusPI(me.angle - getAngle(me.vx, me.vy)),
                actuation   : (me.enginesActive.frontRight || 0) - (me.enginesActive.frontLeft || 0),  // Only one of these will be firing at any one time - give us the [-1:1] actuation in direction of +theta
                deltaT      : dT
            };
            this.model.dataPaths[pathNum].push(path);
            this.model.trajectoryCosts[pathNum] += abs(path.deflection) * path.speed;

            if (me.sampleData.seperation < me.sampleData.size) {this.model.successfulTrajectorys[pathNum] = true; t = 1000; break;}
            // if (abs(me.rateOfOrbit) > (PI/1000) && me.dotProduct < 0) {t = 1000;break;} // > 1/2Hz
            if ((me.x - me.size) < -0.5*GlobalParams.universeSize*w){t = 1000;break;}//this.canclePreviousControl().fullLoopRotationalPD(PI * 0/2, deltaT);this.enginesActive.mainJet=this.energy; }
            if ((me.y - me.size) < -0.5*GlobalParams.universeSize*h){t = 1000;break;}//this.canclePreviousControl().fullLoopRotationalPD(PI * 1/2, deltaT);this.enginesActive.mainJet=this.energy; }
            if ((me.x + me.size) > +0.5*GlobalParams.universeSize*w){t = 1000;break;}//this.canclePreviousControl().fullLoopRotationalPD(PI * 2/2, deltaT);this.enginesActive.mainJet=this.energy; }
            if ((me.y + me.size) > +0.5*GlobalParams.universeSize*h){t = 1000;break;}//this.canclePreviousControl().fullLoopRotationalPD(PI * 3/2, deltaT);this.enginesActive.mainJet=this.energy; }
        }
    }
};
Missile.prototype.ensureTargetLock  = function(){
    if (gameObjects.indexOf(this.target) === -1) {
        this.getNewTarget();
        if (!this.model){this.addModel();} // Creates target
    }
};
Missile.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();            // Add's model & sync's target
    this.enginesActive.mainJet = this.energy;

    // <-- Safe to use in this function as me.getPilotCommand never called
    this.resetModel().prepModelPath(0).calcModelPath(0, deltaT);    // For visuals only - Not used for trajectory
    // -->

    this.fullLoopRotationalPD(this.getDeflectionToIntercept(this.target, deltaT), deltaT);
    // if (abs(this.rateOfOrbit) > (PI/1000) && this.dotProduct < 0) {this.explode();} // > 1/2Hz

    return this;
};

const Interceptor                         = function(x, y, vx, vy, size, parent){
    Drone6.call(this, x, y, vx, vy, size, 1, bombBaddy);
    this.ShipType = Interceptor;
    this.gameClass      = 'missile';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = parent.mass/2;
    this.angle          = this.parent.angle;
    this.plotAllCharts  = false;
    this.triangulatedAngle      = 0;
    this.triangulationDelta     = PI/2;
    this.triangulatedCost    = 999999;
    // this.projectileEngines.mainJet.projectileSize       *= 1.5;
    // this.projectileEngines.frontRight.projectileSize    *= 1.25;
    // this.projectileEngines.frontLeft.projectileSize     *= 1.25;
    // this.projectileEngines.backLeft.projectileSize      *= 1.25;
    // this.projectileEngines.backRight.projectileSize     *= 1.25;
};
Interceptor.prototype                   = Object.create(Drone6.prototype);
Interceptor.prototype.ensureTargetLock  = function(){
    if (gameObjects.indexOf(this.target) === -1) {
        this.getNewTarget();
        if (!this.model){this.addModel();} // Creates target
    }
};
Interceptor.prototype.calcModelPath = function(pathNum, deltaT, testAbsAngle){
    // NOTE - this will never be invoked on me()
    const me        = this.model.me;
    const target    = this.model.target;
    const internalModel     = true;
    const calcsPerAlgorithm = 1;//round(deltaT / GlobalParams.deltaT.physics);
    const dT                = deltaT / calcsPerAlgorithm;

    // <-- Max a few K, but shorter on impact
    for (let t = 0; t < 1000; t++){
        // <-- Model control
        me.canclePreviousControl(); me.enginesActive.mainJet = this.energy;
        me.fullLoopRotationalFeedForward(testAbsAngle, dT*calcsPerAlgorithm); //
        // -->

        // <-- Model and path multiple physics iterations
        for (let p = 0; p < calcsPerAlgorithm; p++){
            // <-- Update ghosts of both us & target
            target.clearAccelerations().updateForces(internalModel).updateVelocities(dT).updatePosition(dT);
                me.clearAccelerations().updateForces(internalModel).updateVelocities(dT).updatePosition(dT);
            // -->
            const pathPt = {
                x           : me.x,
                y           : me.y,
                seperation  : me.getSeperationFrom(target),
                speed       : me.speed(),
                rateOfOrbit : me.getRateOfOrbitAround(target),
                dotProduct  : me.getRateOfApproachTo(target),
                deflection  : normaliseAnglePItoMinusPI(me.angle - getAngle(me.vx, me.vy)),
                actuation   : (me.enginesActive.frontRight || 0) - (me.enginesActive.frontLeft || 0),  // Only one of these will be firing at any one time - give us the [-1:1] actuation in direction of +theta
                deltaT      : dT
            };
            this.model.dataPaths[pathNum].push(pathPt);

            // <-- Kill if hit / flypast / wall
            if (pathPt.seperation< (me.size+target.size)) {this.model.successfulTrajectorys[pathNum] = true; t = 1000;break;}
            // if (abs(pathPt.rateOfOrbit) > (PI/1000) && pathPt.dotProduct < 0) {t = 1000break;} // > 1/2Hz
            // if ((me.x - me.size) < -0.5*GlobalParams.universeSize*w)                    {t = 1000;break;}
            // if ((me.y - me.size) < -0.5*GlobalParams.universeSize*h)                    {t = 1000;break;}
            // if ((me.x + me.size) > +0.5*GlobalParams.universeSize*w)                    {t = 1000;break;}
            // if ((me.y + me.size) > +0.5*GlobalParams.universeSize*h)                    {t = 1000;break;}
            // --
        }
        // -->
    }
    // -->
};
Interceptor.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl(); this.enginesActive.mainJet = this.energy;
    this.ensureTargetLock();            // Add's model & sync's target
    deltaT = 20;
    const getOrbitFromTestTrajAngle = (testAngle, n) => {
        // Predictively forward model ourselves moving wrt target
        this.prepModelPath(n).calcModelPath(n, deltaT, testAngle);
        // Assume point of tightest orbit (high rateOfOrbit) is closest approach -- DOESN'T WORK
        // Assume between +/- high rateOfOrbit is INTERCEPT, hence desired angle we're attempting to triangulate
        let pathsTightestOrbit = 0;
        let indexTightestOrbit;
        let pathsClosestOrbit = GlobalParams.universeSize*w*10;
        let indexClosestOrbit;

        let orbitIntegral = 0;

        const dataPath              = this.model.dataPaths[n];
        const successfulTrajectory  = this.model.successfulTrajectorys[n];

        for (let i = 1; i < dataPath.length; i++){
            orbitIntegral += dataPath[i].rateOfOrbit;
            const orbitTightness = abs(dataPath[i].rateOfOrbit);
            const orbitCloseness = dataPath[i].seperation;
            if (orbitTightness > pathsTightestOrbit){
                pathsTightestOrbit = orbitTightness;        // Always +ve
                indexTightestOrbit = i;
            }
            if (orbitCloseness < pathsClosestOrbit){
                pathsClosestOrbit = orbitCloseness;        // Always +ve
                indexClosestOrbit = i;
            }
        }

        let orbitAverage;
        if (dataPath.length){
            orbitAverage = orbitIntegral / dataPath.length;
        } else {
            orbitAverage = 0; console.log(n, displayAsPI(testAngle), orbitIntegral, "No dataPath.length");
        }
        this.model.trajectoryCosts[n] = orbitAverage;


        let directionOfTightestOrbit;
        if (indexTightestOrbit) {
            directionOfTightestOrbit = dataPath[indexTightestOrbit].rateOfOrbit;
        } else {
            directionOfTightestOrbit = 0; console.log(n, displayAsPI(testAngle), indexTightestOrbit, "No indexTightestOrbit");
        }

        return {
            closest             : pathsClosestOrbit,
            tightestOrbit       : directionOfTightestOrbit,
            orbitAverage        : orbitAverage,
            duration            : dataPath.length,
            successfulTrajectory: successfulTrajectory,
            // cost                : pathsClosestOrbit + (successfulTrajectory ? 0 : (1000-dataPath.length)) // If unsuccessful apply cost for how much cut short (ie a short path into the wall, well wide of the target will have the highest cost)
            cost                : pathsClosestOrbit
        };
    };

    for (let dummy = 0; dummy < 1; dummy++){
        this.resetModel();
        let deltaA = this.triangulationDelta;
        let testL = getOrbitFromTestTrajAngle(this.triangulatedAngle + deltaA, 0);
        let testR = getOrbitFromTestTrajAngle(this.triangulatedAngle - deltaA, 1);
        let newCost, newDuration;
        if (testL.cost < testR.cost) {
            this.triangulatedAngle += deltaA; newCost = testL.cost; newDuration = testL.duration; //this.chosenPath = 0;
        } else {
            this.triangulatedAngle -= deltaA; newCost = testR.cost; newDuration = testR.duration; //this.chosenPath = 1;
        }
        if (newCost < (this.target.size + this.size)) {
            this.triangulationDelta /= 1.5; dummy = 100;
        } else if (newCost < this.triangulatedCost){
            this.triangulationDelta /= 2;
        } else {
            this.triangulationDelta = max(this.triangulationDelta, 0.0001 * this.speed() * newCost); // Seek wider IFF fast OR far
        }
        this.triangulationDelta = max(this.triangulationDelta, 0.0001);                                 // Never less than jitter
        this.triangulationDelta = min(this.triangulationDelta, PI/4);                                   // Never more than PI/4
        this.triangulatedCost   = newCost;

    }
    // this.resetModel().prepModelPath(0).calcModelPath(0, deltaT, this.triangulatedAngle); // Just to clear out graphs!
    this.fullLoopRotationalFeedForward(this.triangulatedAngle, deltaT);

    // if (abs(this.rateOfOrbit) > (PI/1000) && this.dotProduct < 0) {this.explode();} // > 1/2Hz

    return this;
};

const PathChooser                         = function(x, y, vx, vy, size, parent){
    Drone6.call(this, x, y, vx, vy, size, 1, bombBaddy);
    this.ShipType = PathChooser;
    this.gameClass      = 'missile';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = parent.mass/2;
    this.angle          = this.parent.angle;
    this.plotAllCharts  = true;
    this.projectileEngines.mainJet.projectileSize       *= 1.5;
    this.projectileEngines.frontRight.projectileSize    *= 1.25;
    this.projectileEngines.frontLeft.projectileSize     *= 1.25;
    this.projectileEngines.backLeft.projectileSize      *= 1.25;
    this.projectileEngines.backRight.projectileSize     *= 1.25;
};
PathChooser.prototype                   = Object.create(Drone6.prototype);
PathChooser.prototype.ensureTargetLock  = function(){
    if (gameObjects.indexOf(this.target) === -1) {
        this.getNewTarget();
        if (!this.model){this.addModel();} // Creates target
    }
};
PathChooser.prototype.calcModelPath = function(pathNum, deltaT, theta){
    // NOTE - this will never be invoked on me()
    const me        = this.model.me;
    const target    = this.model.target;
    const internalModel     = true;
    const calcsPerAlgorithm = 1;//round(deltaT / GlobalParams.deltaT.physics);
    const dT                = deltaT / calcsPerAlgorithm;

    // <-- Max a few K, but shorter on impact
    for (let t = 0; t < 1000; t++){
        // <-- Model control
        me.canclePreviousControl(); me.enginesActive.mainJet = this.energy;
        me.fullLoopRotationalPD(theta, deltaT);
        // me.angle = theta;
        // -->

        // <-- Model and path multiple physics iterations
        for (let p = 0; p < calcsPerAlgorithm; p++){
            // <-- Update ghosts of both us & target
            target.clearAccelerations().updateForces(internalModel).updateVelocities(dT).updatePosition(dT);
                me.clearAccelerations().updateForces(internalModel).updateVelocities(dT).updatePosition(dT);
            // -->
            const pathPt = {
                x           : me.x,
                y           : me.y,
                seperation  : me.getSeperationFrom(target),
                speed       : me.speed(),
                rateOfOrbit : me.getRateOfOrbitAround(target),
                dotProduct  : me.getRateOfApproachTo(target),
                deflection  : normaliseAnglePItoMinusPI(me.angle - getAngle(me.vx, me.vy)),
                actuation   : (me.enginesActive.frontRight || 0) - (me.enginesActive.frontLeft || 0),  // Only one of these will be firing at any one time - give us the [-1:1] actuation in direction of +theta
                deltaT      : dT
            };
            this.model.dataPaths[pathNum].push(pathPt);

            // <-- Kill if hit / flypast / wall
            if (pathPt.seperation< (me.size+target.size)) {this.model.successfulTrajectorys[pathNum] = true; t = 1000;break;}
            // if (abs(pathPt.rateOfOrbit) > (PI/1000) && pathPt.dotProduct < 0) {t = 1000break;} // > 1/2Hz
            if ((me.x - me.size) < -0.5*GlobalParams.universeSize*w)                    {t = 1000;break;}
            if ((me.y - me.size) < -0.5*GlobalParams.universeSize*h)                    {t = 1000;break;}
            if ((me.x + me.size) > +0.5*GlobalParams.universeSize*w)                    {t = 1000;break;}
            if ((me.y + me.size) > +0.5*GlobalParams.universeSize*h)                    {t = 1000;break;}
            // --
        }
        // -->
    }
    // -->
};
PathChooser.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl(); this.enginesActive.mainJet = this.energy;
    this.ensureTargetLock();            // Add's model & sync's target

    const theta = this.followConstantThetaToIntercept(this.target, deltaT);

    this.resetModel().prepModelPath(0).calcModelPath(0, deltaT, theta);
    // this.angle = theta;

    return this;
};
