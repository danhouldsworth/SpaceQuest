const Ship                        = function(x, y, vx, vy, size, density, image){
    this.base = Graphic;
    this.base(x, y, vx, vy, size, 0, 0, density);
    this.gameClass      = 'ship';
    this.showEnergyBar  = true;
    this.image          = image;
    this.offSet         = image.drawingOffsetAngle;
    this.friction       = 0;
    this.projectileEngines        = {
    // NOTE: All projectileEngines assumed to start on the circumference of the circle
        mainJet     : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,   projectilePosition : Math.PI,          projectileAngle : Math.PI},
        frontLeft   : {projectileType : Thrust,     projectileSize : this.size / 12,    projectileSpeed :2.0,   projectilePosition : 0,                projectileAngle : Math.PI / 2},
        frontRight  : {projectileType : Thrust,     projectileSize : this.size / 12,    projectileSpeed :2.0,   projectilePosition : 0,                projectileAngle : Math.PI * 3 / 2},
        backLeft    : {projectileType : Thrust,     projectileSize : this.size / 12,    projectileSpeed :2.0,   projectilePosition : Math.PI,          projectileAngle : Math.PI / 2},
        backRight   : {projectileType : Thrust,     projectileSize : this.size / 12,    projectileSpeed :2.0,   projectilePosition : Math.PI,          projectileAngle : Math.PI * 3 / 2},
        hoseGun     : {projectileType : Bullet,     projectileSize : this.size / 8,     projectileSpeed :1.5,   projectilePosition : 0,                projectileAngle : 0},

        goUp        : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,    projectilePosition : Math.PI,           projectileAngle : Math.PI},
        goDown      : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,    projectilePosition : 0,                 projectileAngle : 0},
        goLeft      : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,    projectilePosition : Math.PI * 1 / 2,   projectileAngle : Math.PI * 1 / 2},
        goRight     : {projectileType : Thrust,     projectileSize : this.size / 6,     projectileSpeed :2.0,    projectilePosition : Math.PI * 3 / 2,   projectileAngle : Math.PI * 3 / 2},

        // *Bay* need getPilotCommand to reconfirm
        rocketBay   : {projectileType : BigRocket,  projectileSize : this.size *1,      projectileSpeed :0.0,   projectilePosition : Math.PI,          projectileAngle : 0},
        bombBay     : {projectileType : Fireball,   projectileSize : this.size / 3,     projectileSpeed :0.2,   projectilePosition : Math.PI,          projectileAngle : Math.PI},
        missileBayL : {projectileType : Missile,    projectileSize : this.size / 3,     projectileSpeed :0.2,   projectilePosition : Math.PI / 2,      projectileAngle : Math.PI / 2},
        missileBayR : {projectileType : Missile,    projectileSize : this.size / 3,     projectileSpeed :0.2,   projectilePosition : Math.PI * 3 / 2,  projectileAngle : Math.PI * 3 / 2}
    };
    this.enginesActive = [];
    this.missileLaunchSide = 1;
};
Ship.prototype                  = Object.create(Graphic.prototype);
Ship.prototype.constructor      = Graphic;
Ship.prototype.fireProjectiles       = function(engine, internalModel){
    const clearanceBufferPx = 15;
    const engineFiring      = this.projectileEngines[engine];
    const ProjectileType    = engineFiring.projectileType;
    const projectile = new ProjectileType(
        this.x + this.vx + (this.size + engineFiring.projectileSize + clearanceBufferPx) * Math.cos(this.angle + engineFiring.projectilePosition) + Math.random() - 0.5,
        this.y + this.vy + (this.size + engineFiring.projectileSize + clearanceBufferPx) * Math.sin(this.angle + engineFiring.projectilePosition) + Math.random() - 0.5,
        engineFiring.projectileSpeed * Math.cos(this.angle + engineFiring.projectileAngle),
        engineFiring.projectileSpeed * Math.sin(this.angle + engineFiring.projectileAngle),
        Math.max(0.5, engineFiring.projectileSize * this.enginesActive[engine]), // enginesActive is a float [0:1]
        this
    );
    projectile.vx += this.vx;
    projectile.vy += this.vy;
    if (!internalModel) {gameObjects.push(projectile);}
    // return impulse on parent. Must be DELTA relative to parent! not absolute
    return {
        x       : (this.vx-projectile.vx) * projectile.mass,
        y       : (this.vy-projectile.vy) * projectile.mass,
        torque  : -projectile.momentum(this) * this.size * Math.sin(engineFiring.projectileAngle - engineFiring.projectilePosition)
    };
};
Ship.prototype.getForceAvailable = function(engine){
    // CRUDE - doesn't take into account the engine vector as above
    const size    = this.projectileEngines[engine].projectileSize;
    const speed   = this.projectileEngines[engine].projectileSpeed;
    const mass    = Math.PI * size * size;
    const impulse = mass * speed;
    return impulse;
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
Ship.prototype.updateForces                 = function(deltaT, internalModel){
    Graphic.prototype.updateForces.call(this);
    // NOTE : Thrust acceleration (deltaV) will be independent of CPS / deltaT, and is correctly calculated on the momentum impulse of the thrust particle
    // However, the actual number of particles injected for animation and game purposes IS CPS / deltaT dependent.

    for (const engine in this.enginesActive) if (this.enginesActive[engine]){
        const impulse = this.fireProjectiles(engine, internalModel);
        // if (internalModel) console.log(engine, impulse);
        this.ax     += (impulse.x      / this.mass)         / deltaT;
        this.ay     += (impulse.y      / this.mass)         / deltaT;
        this.spinDot+= (impulse.torque / this.inertiaRot)   / deltaT;
        if (engine.indexOf("Bay") !== -1) this.enginesActive[engine] = false; // Wait to be reactivated
    }
    return this;
};
Ship.prototype.getPilotCommand              = function(){
    this.enginesActive = [];
    return this; // chainable
};
// Ship.prototype.sanitiseSingularities        = function(deltaT) {
//     Primitive.prototype.sanitiseSingularities.call(this, deltaT);
//     // this.vx     *= (1 - deltaT / 1000);
//     // this.vy     *= (1 - deltaT / 1000);
//     // this.spin   *= (1 - deltaT / 100);
//     return this; // chainable
// };


const PlayerShip                    = function(x, y, vx, vy, team){
    const shipSize = 200;
    const density = 1;
    this.base = Ship;
    this.base(x, y, vx, vy, shipSize, density, spaceShip[team]);
    this.projectileEngines.mainJet.projectileSize   *= 1.2; this.projectileEngines.mainJet.projectileSpeed   *= 1.5;
    this.projectileEngines.backRight.projectileSize *= 1.2; this.projectileEngines.backRight.projectileSpeed *= 1.5;
    this.projectileEngines.backLeft.projectileSize  *= 1.2; this.projectileEngines.backLeft.projectileSpeed  *= 1.5;
    this.projectileEngines.frontRight.projectileSize*= 1.2; this.projectileEngines.frontRight.projectileSpeed*= 1.5;
    this.projectileEngines.frontLeft.projectileSize *= 1.2; this.projectileEngines.frontLeft.projectileSpeed *= 1.5;
    this.gameClass  = 'player';
    this.team       = team;
};
PlayerShip.prototype                = Object.create(Ship.prototype);
PlayerShip.prototype.constructor    = Ship;
PlayerShip.prototype.getPilotCommand= function(){
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
    if (keyState[playerKeys.thrust[ this.team]])      {this.enginesActive.mainJet   = 1;    sound(tracks.Thrust, 0.5, 1.5);}
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
                target.energy -= 0.01 * Math.max(0,Math.cos(getAngleV(testIfNear) - this.angle));
            }
        });
    }

    return this; // chainable
};
PlayerShip.prototype.applyDrag      = function(deltaT) {
    Primitive.prototype.applyDrag.call(this, deltaT);
    this.vx     *= (1 - deltaT / 5000);
    this.vy     *= (1 - deltaT / 5000);
    this.spin   *= (1 - deltaT / 1000);
    return this; // chainable
};
PlayerShip.prototype.explode        = function(){
    Graphic.prototype.explode.call(this);
};


const RobotShip                     = function(x, y, vx, vy, size, density, image){
    this.base = Ship;
    this.base(x, y, vx, vy, size, density, image);
    this.showPath       = false;
    this.showEnergyBar  = true;
    this.KpAdj          = 1;
    this.sampleData     = new Interaction();
};
RobotShip.prototype                 = Object.create(Ship.prototype);
RobotShip.prototype.constructor     = Ship;
RobotShip.prototype.canclePreviousControl       = function(){
    Ship.prototype.getPilotCommand.call(this);
    this.engeryField = false;
    return this;
};
RobotShip.prototype.getTarget                   = function(){
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
    if (response > 0) {this.enginesActive.frontRight = this.enginesActive.backLeft   = Math.min(1, +response);}
    if (response < 0) {this.enginesActive.frontLeft  = this.enginesActive.backRight  = Math.min(1, -response);}
};
RobotShip.prototype.getTargetSpinToReduceAngleError   = function(targetAngle){
    const kP = this.outerLoopOrientationKp || 0.005;
    const err     = normaliseAnglePItoMinusPI(targetAngle - this.angle); // THIS GIVES issues at err = PI !!
    const response= kP * err;
    return response; //desiredSpinToReduceOrientationError;
};
RobotShip.prototype.fullLoopRotational   = function(targetAngle, deltaT){
    const kP = 15;
    const kD = 130 * kP;
    const targetSpin = (targetAngle - this.last_target_angle) / deltaT;
    this.last_target_angle = targetAngle;
    const err       = normaliseAnglePItoMinusPI(targetAngle - this.angle);
    const errDot    = targetSpin - this.spin;
    const response  = kP * err + kD * errDot;
    if (response > 0) {this.enginesActive.frontRight = this.enginesActive.backLeft  = Math.min(1, +response);}
    if (response < 0) {this.enginesActive.frontLeft  = this.enginesActive.backRight = Math.min(1, -response);}
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
    let xDiff = target.x - this.x - 1*(this.sampleData.size * Math.cos(this.angleToTarget));
    let yDiff = target.y - this.y - 1*(this.sampleData.size * Math.sin(this.angleToTarget));
    const response = {
        x: kP * xDiff + kD * (target.vx - this.vx) + 0.5 * unitVectorFromAngle(angleToMinimiseSpin).x,
        y: kP * yDiff + kD * (target.vy - this.vy) + 0.5 * unitVectorFromAngle(angleToMinimiseSpin).y
    };
    return response;
};
RobotShip.prototype.actuateOrthoganal = function(response){
    if (response.x > 0) {this.enginesActive.goLeft  = Math.min(1, +response.x);}
    if (response.x < 0) {this.enginesActive.goRight = Math.min(1, -response.x);}
    if (response.y > 0) {this.enginesActive.goUp    = Math.min(1, +response.y);}
    if (response.y < 0) {this.enginesActive.goDown  = Math.min(1, -response.y);}
    // console.log(modulusV(response));
};
RobotShip.prototype.getDeflectionToIntercept = function(target, deltaT){
    const sampleData = this.sampleData = new Interaction(); // We want to keep this data
    sampleData.full(this, target);
    const approachVector = {x:this.vx - target.vx, y:this.vy - target.vy}; // May not be 'approaching'! Could have high magnitude, and be orbiting.
    const approachAngle  = (getAngleV(approachVector));
    const angleToTarget  = (getAngleV(sampleData));
    let err              = normaliseAnglePItoMinusPI(angleToTarget - approachAngle);
    const dotProduct     = Math.cos(err) * modulusV(approachVector); // Scaler approach speed. Negative for move away

    let kP = Math.max(w * dotProduct / sampleData.seperation, 0.5* this.KpAdj); //
    let kD = Math.max(w * dotProduct / sampleData.seperation, 0.01);

    // if (this.model && this.model.haveSuccessfulTrajectory){
        // kP *= 1 + this.model.trajectoryCost / 2000;
    // }

    let kpTerm = constraintHalfPiToMinusHalfPi(err * kP);
    let errDot = (err - (sampleData.lastErr || 0)) / deltaT;
    sampleData.lastErr = err;
    let kdTerm = Math.atan(errDot * kD);
    let kI = 0.0001;
    this.errIntegral = this.errIntegral || 0; // This is for the life of the real missile
    // if (this.model && this.model.haveSuccessfulTrajectory && this.model.data.length){
        // let signedDeflection = this.model.data[this.model.data.length-1].deflection;
        // this.errIntegral += signedDeflection;

        // console.log(signedDeflection, this.errIntegral, ":", kpTerm , kdTerm , kI * this.errIntegral);
    // }
    let deflectionAngle = constraintHalfPiToMinusHalfPi(kpTerm + kdTerm + kI * this.errIntegral);
    let actuationAngle = angleToTarget + (dotProduct > 0 ? deflectionAngle:0) ;
    this.angleToTarget = angleToTarget;
    return actuationAngle;
};
// RobotShip.prototype.PDinnerLoop_getThrustAngleForInterceptToTarget  = function(deltaT){
//     const kP = 0.05 * this.mass / this.getForceAvailable('mainJet');
//     const kD = 500 * kP; // NOT CLEAR HOW TO SET kD
//     const theta   = this.sampleData.deflectionAngleToMovingTarget;
//     // Simple fudge if travelling away from target AND YET APPEARS TO ENABLE CORRECT REVERSE ORIENTATION FOR OVERSHOOT
//     if(theta >  Math.PI/2) theta = +Math.PI - theta;
//     if(theta < -Math.PI/2) theta = -Math.PI - theta;
//     // --
//     const lastErr = this.lastSampleData.err_interceptEffort;

//     const approachSpeed = this.sampleData.ourSpeedInTargetFrameOfRef;
//     const err         = (approachSpeed < 0.25) ? approachSpeed * theta : approachSpeed * Math.tan(theta); // The quantiy we want to minimise to ensure a CONTROLLABLE intercept [closest approach of current trajectory / time to closest approach]
//     const errDot      = (err - lastErr || 0) / deltaT;
//     const response    = kP * err + kD * errDot;
//     if (isNaN(response))response = 0;
//     if (response > +1)  response = +1;
//     if (response < -1)  response = -1;
//     const desiredAngleForThrust = this.sampleData.absoluteAngleToTarget + response * Math.PI / 2;

//     this.sampleerr_interceptEffort = err;
//     return desiredAngleForThrust;
// };
// ---- Orthoganal Thrusting 'Lander' ----
const Drone1                    = function(x, y, vx, vy, size=100, density=1, image=bossBaddy){
    this.base = RobotShip;
    this.base(x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = Math.PI / 2;
    // this.showThrustOrgs = true;
    // this.ephemeral      = true;
    this.showEnergyBar  = false;
};
Drone1.prototype                 = Object.create(RobotShip.prototype);
Drone1.prototype.constructor     = RobotShip;
Drone1.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost // Don't forget we don't retarget once locked until dead

    this.actuateOrthoganal(this.PDorthogalReponseToLandMinimiseSpin(this.target, deltaT));
    if (this.sampleData.seperation < this.sampleData.size * 4){
        this.engeryField = true;
        this.target.energy -= 0.01;
    } else {
        this.engeryField = false;
    }
    return this;
};
Drone1.prototype.applyDrag      = function(deltaT) {
    Primitive.prototype.applyDrag.call(this, deltaT);
    this.angle = Math.PI / 2; this.spin = 0;// Fudge to keep orgogonal
    return this; // chainable
};
// ---- Rotational Thrust 'Lander' ----
const Drone2                       = function(x, y, vx, vy, size=100, density=1, image=bombBaddy){
    this.base = RobotShip;
    this.base(x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = Math.PI / 2;
};
Drone2.prototype                 = Object.create(RobotShip.prototype);
Drone2.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    const actuationVector = this.PDorthogalReponseToLandMinimiseSpin(this.target, deltaT);
    // this.rotationalThrustToReduceSpinError(this.getTargetSpinToReduceAngleError(getAngleV(actuationVector)));
    this.fullLoopRotational(getAngleV(actuationVector), deltaT);
    this.enginesActive.mainJet = Math.min(1, modulusV(actuationVector)/2); // Adjust this for power
    if (this.sampleData.seperation < this.size * 15){
        this.engeryField = true;
        this.target.energy -= 0.01;
    }else {
        this.engeryField = false;
    }
    return this; // chainable
};
// ---- Vector 'Lander' ------
const Drone3                       = function(x, y, vx, vy, size=100, density=1, image=bomb){
    this.base = RobotShip;
    this.base(x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = Math.PI / 2;
};
Drone3.prototype                 = Object.create(RobotShip.prototype);
Drone3.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    const actuationVector = this.PDorthogalReponseToLandOn(this.target);
    this.angle = getAngleV(actuationVector);
    this.enginesActive.mainJet = Math.min(1, modulusV(actuationVector)/2); // Adjust this for power
    return this;
};
// ---- Vector 'Intercept' ------
const Drone4                       = function(x, y, vx, vy, size=100, density=1, image=bomb){
    this.base = RobotShip;
    this.base(x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = Math.PI / 2;
};
Drone4.prototype                 = Object.create(RobotShip.prototype);
Drone4.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    this.angle = this.getDeflectionToIntercept(this.target, deltaT);
    this.enginesActive.mainJet = 1;
    return this;
};
// --- Orthoganal intercept
const Drone5                       = function(x, y, vx, vy, size=100, density=1, image=bossBaddy){
    this.base = RobotShip;
    this.base(x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = Math.PI / 2;
    // this.showThrustOrgs = true;
};
Drone5.prototype                 = Object.create(RobotShip.prototype);
Drone5.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    this.actuateOrthoganal(unitVectorFromAngle(this.getDeflectionToIntercept(this.target, deltaT)));
    return this;
};
Drone5.prototype.applyDrag      = function(deltaT) {
    Primitive.prototype.applyDrag.call(this, deltaT);
    this.angle = Math.PI / 2; this.spin = 0;// Fudge to keep orgogonal
    return this; // chainable
};
// --- Rotational intercept
const Drone6                       = function(x, y, vx, vy, size=100, density=1, image=missile){
    this.base = RobotShip;
    this.base(x, y, vx, vy, size, density, image);
    this.team = 3;
    this.angle = Math.PI / 2;
};
Drone6.prototype                 = Object.create(RobotShip.prototype);
Drone6.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {
        this.getTarget();
        if (!this.model){this.addModel();} // Creates target
    }
    this.enginesActive.mainJet = this.energy;//Math.min(1, Math.cos(err)); // Adjust this for power
    this.refreshModel(); // Resyncs us & target
    this.model.me.KpAdj = 1 * 1;
    this.calcModelPath(0, deltaT);
    // this.model.me.KpAdj = 1 * 2;
    // this.calcModelPath(1, deltaT);
    // this.model.me.KpAdj = 1 / 2;
    // this.calcModelPath(2, deltaT);
    // this.KpAdj = 1;
    // if (this.model.successfulTrajectorys[1] && this.model.trajectoryCosts[1] < this.model.trajectoryCosts[0]) this.KpAdj = 2;
    // if (this.model.successfulTrajectorys[2] && this.model.trajectoryCosts[2] < this.model.trajectoryCosts[0]) this.KpAdj = 1/2;
    // if (this.model.successfulTrajectorys[1] && this.model.successfulTrajectorys[2] && this.model.trajectoryCosts[1] < this.model.trajectoryCosts[2]) this.KpAdj = 2;
    this.fullLoopRotational(this.getDeflectionToIntercept(this.target, deltaT), deltaT);
    return this;
};

const Fireball                      = function(x, y, vx, vy, size, parent){
    this.base = Drone1;
    this.base(x, y, vx, vy, size, 1);
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

const Missile                         = function(x, y, vx, vy, size, parent){
    this.base = Drone6;
    this.base(x, y, vx, vy, size, 1, bombBaddy);
    this.addModel = () => {
        if (this.model) throw "Already have model!";
        if (this.parent.model) throw "We're already a model, prevent nesting!";
        this.model = {
            me      : new Missile(this.x, this.y, this.vx, this.vy, this.size, this),
            target  : new Ship(this.target.x, this.target.y, this.target.vx, this.target.vy, this.target.size, this.target.density, this.target.image),
            dataPaths: [],
        };
        this.model.target.projectileEngines = this.target.projectileEngines; // Should have a good copy of the target type now
    };
    this.refreshModel = () => {
        this.model.dataPaths = [];
        this.model.successfulTrajectorys = [];
        this.model.trajectoryCosts = [];
    };
    this.calcModelPath = function(pathNum, deltaT){
        this.model.me.angle = this.angle;
        this.model.me.x     = this.x;
        this.model.me.y     = this.y;
        this.model.me.spin  = this.spin;
        this.model.me.vx    = this.vx;
        this.model.me.vy    = this.vy;
        this.model.target.angle = this.target.angle;
        this.model.target.x     = this.target.x;
        this.model.target.y     = this.target.y;
        this.model.target.spin  = this.target.spin;
        this.model.target.vx    = this.target.vx;
        this.model.target.vy    = this.target.vy;
        this.model.target.enginesActive = this.target.enginesActive;
        this.model.dataPaths[pathNum] = [];
        this.model.successfulTrajectorys[pathNum] = false;
        this.model.trajectoryCosts[pathNum] = 0;

        const me = this.model.me;
        for (let t = 0; t < 1000; t++){
            me.clearAccelerations().canclePreviousControl();
            this.model.target.clearAccelerations();
            me.fullLoopRotational(me.getDeflectionToIntercept(this.model.target, deltaT), deltaT);
            me.enginesActive.mainJet = this.energy;
            for (let p = 0; p < 2; p++){
                this.model.target.updateForces(deltaT/2, true).updateVelocities(deltaT/2).updatePosition(deltaT/2);
                me.updateForces(deltaT/2, true).updateVelocities(deltaT/2).updatePosition(deltaT/2);
                const path = {x:me.x, y:me.y, deflection:normaliseAnglePItoMinusPI(me.angle - getAngle(me.vx, me.vy)), speed:me.speed()};
                this.model.dataPaths[pathNum].push(path);
                this.model.trajectoryCosts[pathNum] += Math.abs(path.deflection) * path.speed;
                if (me.sampleData.seperation < this.sampleData.size) {
                    this.model.successfulTrajectorys[pathNum] = true;
                    t = 1000; break; // full break
                }
                if ((me.x - me.size) < -0.5*GlobalParams.universeSize*w){t = 1000;break;}//this.canclePreviousControl().fullLoopRotational(Math.PI * 0/2, deltaT);this.enginesActive.mainJet=this.energy; }
                if ((me.y - me.size) < -0.5*GlobalParams.universeSize*h){t = 1000;break;}//this.canclePreviousControl().fullLoopRotational(Math.PI * 1/2, deltaT);this.enginesActive.mainJet=this.energy; }
                if ((me.x + me.size) > +0.5*GlobalParams.universeSize*w){t = 1000;break;}//this.canclePreviousControl().fullLoopRotational(Math.PI * 2/2, deltaT);this.enginesActive.mainJet=this.energy; }
                if ((me.y + me.size) > +0.5*GlobalParams.universeSize*h){t = 1000;break;}//this.canclePreviousControl().fullLoopRotational(Math.PI * 3/2, deltaT);this.enginesActive.mainJet=this.energy; }
            }
        }
    };
    // this.projectileEngines.mainJet.projectileSize   *= .25;
    this.gameClass      = 'missile';
    // this.ephemeral = true;
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = parent.mass/2;
    this.angle          = this.parent.angle;
};
Missile.prototype                   = Object.create(Drone6.prototype);

const BigRocket = function(x, y, vx, vy, size, parent){
    const density = 40;
    this.base = RobotShip;
    this.base(x, y, vx, vy, size, density, missile);
    this.gameClass      = 'missile';
    this.parent         = parent;
    this.team           = parent.team;
    this.angle          = this.parent.angle;
    // this.vx             = vx;
    // this.vy             = vy;
    this.showEnergyBar  = false;
    this.damagePts      = parent.size;
this.launchtime=Date.now();

};
BigRocket.prototype                   = Object.create(RobotShip.prototype);
BigRocket.prototype.constructor       = RobotShip;
BigRocket.prototype.getPilotCommand   = function(deltaT){
    // this.PDinnerLoop_OrientationControlForDesiredAngle(this.target.angle, deltaT);
    this.enginesActive.mainJet = 1;
    if (this.size > 10 && this.launchtime < (Date.now()-1000)){
        const split1 = new BigRocket(
            this.x + 1*this.size * Math.cos(this.angle + Math.PI / 2),
            this.y + 1*this.size * Math.sin(this.angle + Math.PI / 2),
            this.vx,
            this.vy,
            this.size / 2,
            this
        );
        gameObjects.push(split1);

        const split2 = new BigRocket(
            this.x + 1*this.size * Math.cos(this.angle - Math.PI / 2),
            this.y + 1*this.size * Math.sin(this.angle - Math.PI / 2),
            this.vx,
            this.vy,
            this.size / 2,
            this
        );
        gameObjects.push(split2);
        // this.explode();
        sound(tracks.Stinger);
        Particle.prototype.explode.call(this);
    } else if(this.size<10){
            this.explode();
    }
};

const Baddy                           = function(x, y){
    this.base = RobotShip;
    this.base(x, y, 0,0,30, 1, bombBaddy);
    this.team = 3;
    this.angle = Math.PI / 2;
};
Baddy.prototype                     = Object.create(RobotShip.prototype);
Baddy.prototype.constructor         = RobotShip;
Baddy.prototype.getPilotCommand     = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    // this.PDinnerLoop_OrientationControlForDesiredAngle(this.PDinnerLoop_getThrustAngleForInterceptToTarget(deltaT), deltaT);
    if (interaction.seperation < 5 * interaction.size) {this.enginesActive.hoseGun = 1;}
    else {this.enginesActive.mainJet = 1;}
};


const BossBaddy                       = function(x,y){
    const density = 1;
    this.base = RobotShip;
    this.base(x, y, 0,0,100, density, bossBaddy);
    this.team = 3;
    this.baddySpawnReady    = false;
    this.baddySpawnTimer    = (function(parent){setInterval(function(){parent.baddySpawnReady = true;}, 2000);})(this);
    this.angle = Math.PI / 2;
};
BossBaddy.prototype                 = Object.create(RobotShip.prototype);
BossBaddy.prototype.constructor     = RobotShip;
BossBaddy.prototype.getPilotCommand = function(deltaT){
    if (this.baddySpawnReady){
        this.baddySpawnReady = false;
        const childBaddy = new Baddy(
            this.x - 1.2 * this.size * Math.cos(this.angle) + 4 * Math.random() - 2,
            this.y - 1.2 * this.size * Math.sin(this.angle) + 4 * Math.random() - 2
        );
        childBaddy.parent = this;
        childBaddy.size = this.size / 2;
        gameObjects.push(childBaddy);
    }
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    // this.othoganolThrustToReduceVelocityDeltaError(deltaT);
};