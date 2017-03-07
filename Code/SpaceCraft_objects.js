"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
/*global getAngle, console, normaliseAnglePItoMinusPI, normaliseAngle0to2PI, keyState, interaction, wall, restitution, friction , gameObjects, gameObjects, GlobalParams, deltaT, draw_ball, gameArea, ctx, ctxStars, w, h,  modulus, applyCollisionRules, asteroid, fireball, bomb, bossBaddy, bombBaddy, missile, spaceShip*/



// -- Basic Primitive Object has size and 6DoF in state space
var Primitive                   = function(x, y, vx, vy, size, angle, spin){
    this.x      = x || 0;
    this.y      = y || 0;
    this.vx     = vx || 0;
    this.vy     = vy || 0;
    this.ax     = 0;
    this.ay     = 0;
    this.angle  = angle || 0;
    this.spin   = spin  || 0;
    this.spinDot= 0;
    this.size   = size  || 0;
};
Primitive.prototype.speed       = function (){
    var speed = modulus(this.vx, this.vy);
    return speed;
};
Primitive.prototype.clearAccelerations = function (){
    this.ax = 0;
    this.ay = 0;
    this.spinDot = 0;
    return this;
};
Primitive.prototype.updateForces = function(deltaT){
    // These are cleared at the start of each physics iterations, and before collisions detected
    return this;
};
Primitive.prototype.updateVelocities  = function(deltaT){
    // Assume dT small, as we're about to move, based on the acceleration we've just calced
    this.vx     += this.ax      * deltaT;
    this.vy     += this.ay      * deltaT;
    this.spin   += this.spinDot * deltaT;
    return this;
};
Primitive.prototype.updatePosition = function(deltaT){
    // Likewise, assume dT small
    this.x      += this.vx      * deltaT;
    this.y      += this.vy      * deltaT;
    this.angle  += this.spin    * deltaT;
    // -- Normalise angle to 0<theta<2PI
    this.angle = normaliseAngle0to2PI(this.angle);
    return this;
};
Primitive.prototype.sanitiseSingularities   = function(deltaT) {
    // this.vx     = Math.min(1,  this.vx);
    // this.vy     = Math.min(1,  this.vy);
    // this.spin   = Math.min(0.1, this.spin);
    // this.vx     *= (1 - deltaT / 10000);
    // this.vy     *= (1 - deltaT / 10000);
    // this.spin   *= (1 - deltaT / 10000);
    return this; // chainable
};


// -- Particle is a subset of Primitive. It has density (& therefor mass), restituion and friction - and so can interact with other gameObjects.
var Particle                    = function(x, y, vx, vy, size, angle, spin, density){
    this.base = Primitive;
    this.base(x, y, vx, vy, size, angle, spin);
    this.gameClass      = 'particle';
    this.boundary_flag  = GlobalParams.boundary_flag;
    this.restitution    = 0;
    this.friction       = 100;
    this.density        = density;
    this.energy         = 1; // Consider it adhesion
    this.mass           = Math.PI   * this.size * this.size * this.density; // NOTE: mass is not recalculated during attrition!!
    this.inertiaRot     = 0.5       * this.size * this.size * this.mass;
};
Particle.prototype              = new Primitive();
Particle.prototype.momentum     = function(){
    return this.mass * this.speed();
};
Particle.prototype.collide      = function(that){

    if (this === that) return false;

    if (interaction.near(this, that) && interaction.touching()){
        interaction.resolve();

        var e = restitution(this,that);
        var f = friction(this,that);

        // theta = angle from x-axis to line P1P2 (anticlockwise)
        var cos_theta   = interaction.unitVector.x;
        var sin_theta   = interaction.unitVector.y;
        var u_spin1     = this.spin;
        var u_spin2     = that.spin;
        var mu1         = 1 + this.mass / that.mass;
        var mu2         = 1 + that.mass / this.mass;
        var r1          = this.size;
        var r2          = that.size;
        var alpha       = 2 / 5;

        // calculate P1 unitVector for first transform
        var u1x = this.vx;
        var u1y = this.vy;

        // Transform #1 (coords about stationary P1 ie apply -u1x,-u1y)
        var u2x = that.vx - u1x;
        var u2y = that.vy - u1y;
        var temp_vx = u2x;

        // Transform #2 (rotate coords to make P1P2 intersect along x-axis ie. theta=0)
        u2x = (cos_theta * u2x) + (sin_theta * u2y);        // Approach velocity
        u2y = (cos_theta * u2y) - (sin_theta * temp_vx);    // Velocity perpendicular to approach

        if (u2x < 0){
            var max_stopping_friction_coeff = Math.abs((u2y - r2 * u_spin2 - r1 * u_spin1) * alpha / (u2x * (e + 1) * (alpha + 1)));
            if (u2y > (r1 * u_spin1 + r2 * u_spin2)){
                f = -Math.min(f, max_stopping_friction_coeff);
            }
            if (u2y == (r1 * u_spin1 + r2 * u_spin2)){
                f = 0;
            }
            if (u2y < (r1 * u_spin1 + r2 * u_spin2)){
                f = Math.min(f, max_stopping_friction_coeff);
            }

            var v1x = u2x * (e + 1) / mu1;
            var v2x = u2x * ((1 / mu1) - (e / mu2));
            var v1y = u2x * f * (e + 1) / mu1;
            var v2y = u2y - u2x * f * (e + 1) / mu2;
            var v_spin1 = u_spin1 + u2x * f * (e + 1) / (alpha * r1 * mu1);
            var v_spin2 = u_spin2 + u2x * f * (e + 1) / (alpha * r2 * mu2);

            // reverse transform 2 then reverse transform 1 for P1 then P2
            this.vx     = (v1x * cos_theta - v1y * sin_theta) + u1x;
            this.vy     = (v1y * cos_theta + v1x * sin_theta) + u1y;
            this.spin   = v_spin1;
            that.vx     = (v2x * cos_theta - v2y * sin_theta) + u1x;
            that.vy     = (v2y * cos_theta + v2x * sin_theta) + u1y;
            that.spin   = v_spin2;
        }

        if ( (interaction.seperation < (0.99 * interaction.size) ) && ( (this instanceof Graphic && that instanceof Graphic) || (!(this instanceof Graphic) && !(that instanceof Graphic)) ) ){ // Try and save some cycles
            // !!! NOTE : This compressability parameter is HARD CODED !!
            var antiSqueezeForce = 0.5 * (interaction.size - interaction.seperation);
            var thatDisplacement = Math.max(1, antiSqueezeForce * this.mass / (this.mass + that.mass));
            var thisDisplacement = Math.max(1, antiSqueezeForce - thatDisplacement);
            this.x += -thisDisplacement * cos_theta;
            this.y += -thisDisplacement * sin_theta;
            that.x +=  thatDisplacement * cos_theta;
            that.y +=  thatDisplacement * sin_theta;
            if (this instanceof Graphic && that instanceof Graphic){
                that.energy -= thatDisplacement / 100;
                this.energy -= thisDisplacement / 100;
            }
        }

        return true;
    }
    else if (this instanceof Asteroid || that instanceof Asteroid) {
        // if (this.gameClass === "wall" || that.gameClass === "wall") console.log("wall");
        // interaction.touching();
        // interaction.resolve();
        // var gravityFactor = 0.00001;
        // this.ax += gravityFactor * interaction.unitVector.x * that.mass / interaction.seperationSqrd;
        // this.ay += gravityFactor * interaction.unitVector.y * that.mass / interaction.seperationSqrd;
        // that.ax -= gravityFactor * interaction.unitVector.x * this.mass / interaction.seperationSqrd;
        // that.ay -= gravityFactor * interaction.unitVector.y * this.mass / interaction.seperationSqrd;
    }
    return false;
};
Particle.prototype.boundaryConstraint = function() {
    var w = gameArea.width,
        h = gameArea.height;

    if (this.boundary_flag === -1){                 // BOUNCE
        if ((this.x - this.size) < -4*w){
            wall.clear();
            wall.y      = this.y;
            wall.x      = -4*w-wall.size;
            this.collide(wall);applyCollisionRules(this, wall);
        }
        if ((this.x + this.size) > 4*w){
            wall.clear();
            wall.y      = this.y;
            wall.x      = 4*w + wall.size;
            this.collide(wall);applyCollisionRules(this, wall);
        }
        if ((this.y - this.size) < -4*h){
            wall.clear();
            wall.x = this.x;
            wall.y = -4*h-wall.size;
            this.collide(wall);applyCollisionRules(this, wall);
        }
        if ((this.y + this.size) > 4*h){
            wall.clear();
            wall.x      = this.x;
            wall.y      = 4*h + wall.size;
            this.collide(wall);applyCollisionRules(this, wall);
        }
    } else if (this.boundary_flag == 1){            // WRAP
        while ((this.x - this.size) < -4*w){
            this.x += 8*w;
        }
        while ((this.x + this.size) > 4*w){
            this.x -= 8*w;
        }
        while ((this.y - this.size) < -4*h){
            this.y += 8*h;
        }
        while ((this.y + this.size) > 4*h){
            this.y -= 8*h;
        }
    } else {                                        // DEFAULT?
        console.log(this);
        if (this.x < -4*w || this.x > 4*w){
            this.vx = 0;
        }
        if (this.y < -4*h || this.y > 4*h){
            this.vy = 0;
        }
    }
    return this; // chainable
};
Particle.prototype.draw         = function(){
    this.calcColour();
    draw_ball(this.x, this.y, this.size, this.red, this.green, this.blue);
    return this; // chainable
};
Particle.prototype.explode      = function(){
    var index = gameObjects.indexOf(this);
    if (index !== -1) {gameObjects.splice(index,1);}
};

var Star = function(){
    this.base = Particle;
    this.base( (Math.random()-0.5) * 8*w, (Math.random()-0.5) * 8*h, Math.random() / 5, 0, Math.random() * 10, 0, 0, 0);
    this.boundary_flag = 1;
};
Star.prototype                  = Object.create(Particle.prototype);
Star.prototype.constructor      = Particle;
Star.prototype.draw             = function(){
    ctxStars.beginPath();
    ctxStars.arc(this.x,this.y,this.size, 0, 2 * Math.PI, false);
    ctxStars.fillStyle = "rgb("+Math.round(this.size*20)+","+Math.round(this.size*20)+","+Math.round(this.size*20)+")";
    ctxStars.fill();
};

// -- Game objects - based on gameObjects. They damage points for collisions, and know their parent.
var Bullet                      = function(x, y, vx, vy, size, parent){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0, 0, 0.0001);
    this.gameClass      = 'bullet';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = 20;
    this.calcColour = function(){
        this.red    = (this.parent.team % 2) ? 255                        : 255;
        this.green  = (this.parent.team % 2) ? Math.floor(this.size*50)  : 255;
        this.blue   = (this.parent.team % 2) ? Math.floor(this.size*50)  : Math.floor(this.size*50);
    };
};
Bullet.prototype                = Object.create(Particle.prototype);
Bullet.prototype.constructor    = Particle;

var Thrust                      = function(x, y, vx, vy, size, parent){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0, 0, 0.5);
    this.gameClass      = 'thrust';
    this.parent         = parent;
    this.team           = parent.team;
    this.calcColour = function(){
        this.red    = (this.parent.team % 2) ? Math.floor(this.size*50) : Math.floor(this.size*50);
        this.green  = (this.parent.team % 2) ? Math.floor(this.size*50) : 255;
        this.blue   = (this.parent.team % 2) ? 255                       : Math.floor(this.size*50);
    };
};
Thrust.prototype                = Object.create(Particle.prototype);
Thrust.prototype.constructor    = Particle;

var Bomb                        = function(x, y, vx, vy, size, parent){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0, 0, 1);
    this.gameClass      = 'bomb';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = 100;
    this.calcColour = function(){
        this.red    = 255;
        this.green  = 255;
        this.blue   = Math.floor(this.size*50);
    };
};
Bomb.prototype                  = Object.create(Particle.prototype);
Bomb.prototype.constructor      = Particle;
Bomb.prototype.detonate         = function(){
    var numberOfBombs   = Math.min(100, 5 * this.speed() + this.mass);
    var bombSpeed       = Math.min(2,   1 * this.speed() + this.mass * 0.0001);
    for(var bombPiece = 1; bombPiece < numberOfBombs; bombPiece++) {
        var fragSize = Math.min(20, Math.random() * this.size);
        var throwAngle = 2 * Math.PI * numberOfBombs / bombPiece;
        gameObjects.push(new Bomb(
            this.x + this.size * Math.random() * Math.cos(throwAngle),
            this.y + this.size * Math.random() * Math.sin(throwAngle),
            bombSpeed * Math.cos(throwAngle),
            bombSpeed * Math.sin(throwAngle),
            fragSize,
            this
        ));
    }
};
Bomb.prototype.sanitiseSingularities        = function(deltaT){
    Primitive.prototype.sanitiseSingularities.call(this, deltaT);
    if (Math.random() < (this.mass / 1000000) ) this.detonate();
    return this;
};
// --

// -- Like a particle but drawn with an image & explodes on destruction
var Graphic                     = function(x, y, vx, vy, size, angle, spin, density){
    this.base = Particle;
    this.offSet = 0;
    this.base(x, y, vx, vy, size, spin, 0, density);
    this.showPath = true;
};
Graphic.prototype               = Object.create(Particle.prototype);
Graphic.prototype.constructor   = Particle;
Graphic.prototype.draw          = function(){
    var grad;
    if (!this.scale) this.scale = 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.offSet + this.angle);
    ctx.drawImage(this.image, -this.size*this.scale, -this.size*this.scale, 2 * this.size*this.scale, 2 * this.size*this.scale);
    ctx.restore();
    if (this.target){
        ctx.beginPath();
        grad = ctx.createLinearGradient(this.x, this.y, this.target.x, this.target.y);
        grad.addColorStop(1, "cyan");
        grad.addColorStop(0, "transparent");
        ctx.moveTo(this.x, this.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth=2;
        ctx.lineTo(this.target.x, this.target.y);
        ctx.stroke();
    }
    if (this.showEnergyBar) {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (GlobalParams.rotatingFrame) {ctx.rotate(GlobalParams.theta);}
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillRect( - this.size - 1,  - this.size - 1, 2 * this.size + 2, 10);
        ctx.fillStyle = "rgb(" + (255 - Math.round(this.energy * 200)) + "," + (55 + Math.round(this.energy * 200)) + ",0)";
        ctx.fillRect( - this.size,  - this.size, 2 * this.size * this.energy, 8);
        ctx.restore();
    }
    if (this.showPath) {
        var maxTimeSteps = 1000;
        grad = ctx.createLinearGradient(
            this.x,
            this.y,
            this.x + (this.vx + 0.5 * this.ax * maxTimeSteps) * maxTimeSteps,
            this.y + (this.vy + 0.5 * this.ay * maxTimeSteps) * maxTimeSteps
        );
        grad.addColorStop(0, "red");
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth=4;
        for (var dT = 1; dT < maxTimeSteps; dT = dT+50){
            ctx.lineTo(this.x + (this.vx + 0.5 * this.ax * dT) * dT, this.y + (this.vy + 0.5 * this.ay * dT) * dT);
        }
        ctx.stroke();
    }
    return this; // chainable
};
Graphic.prototype.explode       = function(){
    Particle.prototype.explode.call(this);
    Bomb.prototype.detonate.call(this);
    if (this.baddySpawnTimer)   {clearInterval(this.baddySpawnTimer);}
    if (this.selfDestructTimer) {clearTimeout(this.selfDestructTimer);}
    sound(tracks.Explosion);
    return this; // chainable
};
// --

// Game objects - based on Graphics. Have active controls and specific actions
var Asteroid                    = function(x, y, vx, vy, size, spin, density){
    this.base = Graphic;
    this.base(x, y, vx, vy, size || 100, 0, spin, density || 10);
    this.gameClass  = 'asteroid';
    this.image      = asteroid;
    this.showPath   = false;
    this.restitution= 0.25;
    if (!size) this.energy = 0.01;// this.energy *= 10; // Fudge to stop all exploding
};
Asteroid.prototype              = Object.create(Graphic.prototype);
Asteroid.prototype.constructor  = Graphic;
Asteroid.prototype.sanitiseSingularities      = function(deltaT) {
    Primitive.prototype.sanitiseSingularities.call(this, deltaT);
    // Over large times we don't want energy to build up through trunaction errors & antisqueeze etc so we apply pseudo drag
    this.vx     *= (1 - deltaT / 1000);
    this.vy     *= (1 - deltaT / 1000);
    this.spin   *= (1 - deltaT / 1000);
    return this; // chainable
};

var Moon                    = function(x, y, vx, vy, size, spin, density){
    this.base = Asteroid;
    this.base(x, y, vx, vy, size, 0, density || 100);
    this.gameClass  = 'moon';
    this.image      = moon;
    this.scale      = moon.scale;
    this.showPath   = false;
    this.restitution= 0.25;
    if (!size) this.energy = 0.01;// this.energy *= 10; // Fudge to stop all exploding
};
Moon.prototype              = Object.create(Asteroid.prototype);
Moon.prototype.constructor  = Asteroid;
Moon.prototype.sanitiseSingularities      = function(deltaT) {
    Primitive.prototype.sanitiseSingularities.call(this, deltaT);
    // Over large times we don't want energy to build up through trunaction errors & antisqueeze etc so we apply pseudo drag
    // this.vx     *= (1 - deltaT / 1000);
    // this.vy     *= (1 - deltaT / 1000);
    // this.spin   *= (1 - deltaT / 1000);
    return this; // chainable
};

var Ship                        = function(x, y, size, density, image){
    this.base = Graphic;
    this.base(x, y, 0, 0, size, 0, 0, density);
    this.gameClass      = 'ship';
    this.showEnergyBar  = true;
    this.image          = image;
    this.offSet         = image.drawingOffsetAngle;
    this.friction       = 0;
    var suitableSpinThrustSize = Math.min(30, 0.02 * this.size * Math.sqrt(this.size) );
    var suitableSpinThrustSpeed= 0.00002 * this.inertiaRot / (suitableSpinThrustSize * suitableSpinThrustSize * suitableSpinThrustSize * 0.5 * Math.PI) ;
    this.projectileEngines        = {
    // NOTE: All projectileEngines assumed to start on the circumference of the circle
        mainJet     : {projectileType : Thrust,     projectileSize : this.size / 4,             projectileSpeed :  1,    projectilePosition : Math.PI,          projectileAngle : Math.PI},
        frontLeft   : {projectileType : Thrust,     projectileSize : suitableSpinThrustSize,    projectileSpeed :suitableSpinThrustSpeed,    projectilePosition : 0,                projectileAngle : Math.PI / 2},
        frontRight  : {projectileType : Thrust,     projectileSize : suitableSpinThrustSize,    projectileSpeed :suitableSpinThrustSpeed,    projectilePosition : 0,                projectileAngle : Math.PI * 3 / 2},
        backLeft    : {projectileType : Thrust,     projectileSize : suitableSpinThrustSize,    projectileSpeed :suitableSpinThrustSpeed,    projectilePosition : Math.PI,          projectileAngle : Math.PI / 2},
        backRight   : {projectileType : Thrust,     projectileSize : suitableSpinThrustSize,    projectileSpeed :suitableSpinThrustSpeed,    projectilePosition : Math.PI,          projectileAngle : Math.PI * 3 / 2},
        hoseGun     : {projectileType : Bullet,     projectileSize : this.size / 5,             projectileSpeed :  1,    projectilePosition : 0,                projectileAngle : 0},
        // *Bay* need getPilotCommand to reconfirm
        rocketBay   : {projectileType : BigRocket,  projectileSize : this.size *3,                projectileSpeed :0.0,    projectilePosition : Math.PI,                projectileAngle : 0},
        bombBay   : {projectileType : Fireball,   projectileSize : this.size / 3,             projectileSpeed :0.2,    projectilePosition : Math.PI,          projectileAngle : Math.PI},
        missileBayL : {projectileType : Missile,    projectileSize : this.size / 3,             projectileSpeed :0.2,    projectilePosition : Math.PI / 2,      projectileAngle : Math.PI / 2},
        missileBayR : {projectileType : Missile,    projectileSize : this.size / 3,             projectileSpeed :0.2,    projectilePosition : Math.PI * 3 / 2,  projectileAngle : Math.PI * 3 / 2}
    };
    this.enginesActive = [];
    this.missileLaunchSide = 1;
};
Ship.prototype                  = Object.create(Graphic.prototype);
Ship.prototype.constructor      = Graphic;
Ship.prototype.fireProjectiles       = function(engine){
    var engineFiring    = this.projectileEngines[engine];
    var ProjectileType = engineFiring.projectileType;
    var projectile = new ProjectileType(
        this.x + (this.size + engineFiring.projectileSize + 1) * Math.cos(this.angle + engineFiring.projectilePosition) + Math.random() - 0.5,
        this.y + (this.size + engineFiring.projectileSize + 1) * Math.sin(this.angle + engineFiring.projectilePosition) + Math.random() - 0.5,
        engineFiring.projectileSpeed * Math.cos(this.angle + engineFiring.projectileAngle),
        engineFiring.projectileSpeed * Math.sin(this.angle + engineFiring.projectileAngle),
        Math.max(0.5, engineFiring.projectileSize * this.enginesActive[engine]),
        this
    );
    gameObjects.push(projectile);
    return {
        x       : -projectile.vx * projectile.mass,
        y       : -projectile.vy * projectile.mass,
        torque  : -projectile.momentum() * this.size * Math.sin(engineFiring.projectileAngle - engineFiring.projectilePosition)
    };
};
Ship.prototype.getForceAvailable = function(engine){
    // CRUDE - doesn't take into account the engine vector as above
    var size    = this.projectileEngines[engine].projectileSize;
    var speed   = this.projectileEngines[engine].projectileSpeed;
    var mass    = Math.PI * size * size;
    var impulse = mass * speed;
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
Ship.prototype.updateForces                 = function(deltaT){
    // NOTE : Thrust acceleration (deltaV) will be independent of CPS / deltaT, and is correctly calculated on the momentum impulse of the thrust particle
    // However, the actual number of particles injected for animation and game purposes IS CPS / deltaT dependent.
    for (var engine in this.enginesActive) if (this.enginesActive[engine]){
        var impulse = this.fireProjectiles(engine);
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
Ship.prototype.sanitiseSingularities        = function(deltaT) {
    Primitive.prototype.sanitiseSingularities.call(this, deltaT);
    // this.vx     *= (1 - deltaT / 1000);
    // this.vy     *= (1 - deltaT / 1000);
    // this.spin   *= (1 - deltaT / 100);
    return this; // chainable
};


var PlayerShip                      = function(x, y, team){
    this.base = Ship;
    this.base(x, y, 40, 1, spaceShip[team]);
    this.gameClass  = 'player';
    this.team       = team;
};
PlayerShip.prototype                = Object.create(Ship.prototype);
PlayerShip.prototype.constructor    = Ship;
PlayerShip.prototype.getPilotCommand= function(){
    Ship.prototype.getPilotCommand.call(this);
    var playerKeys  = {
                                         // Daddy / Finn     // Use http://keycode.info/ to get keycodes
        left        : [null, 81, 37],   // q    Arrow
        right       : [null, 87, 39],   // w    Arrow
        thrust      : [null, 69, 38],   // e    Arrow
        fire        : [null, 83, 32],   // s    Space
        missile     : [null, null, null],   // r    Down Arrow
        bigRocket   : [null, 82, 40],   // r    Down Arrow
        smartBomb   : [null, 84, 77]    // t    m
    };
    if (keyState[playerKeys.left[   this.team]])      {this.enginesActive.frontRight= this.enginesActive.backLeft  = 1;}
    if (keyState[playerKeys.right[  this.team]])      {this.enginesActive.frontLeft = this.enginesActive.backRight = 1;}
    if (keyState[playerKeys.thrust[ this.team]])      {this.enginesActive.mainJet   = 1;}
    if (keyState[playerKeys.fire[   this.team]])      {this.enginesActive.hoseGun   = 1;    sound(tracks.LaserHose, 0.5);}
    if (keyState[playerKeys.smartBomb[ this.team]])   {this.launchCannonWhenReady();        sound(tracks.Stinger);}
    if (keyState[playerKeys.missile[this.team]])      {this.launchMissileWhenReady();}
    if (keyState[playerKeys.bigRocket[this.team]])    {this.launchRocketWhenReady();        sound(tracks.BigRocket);}
    return this; // chainable
};
PlayerShip.prototype.sanitiseSingularities      = function(deltaT) {
    Primitive.prototype.sanitiseSingularities.call(this, deltaT);
    this.vx     *= (1 - deltaT / 500);
    this.vy     *= (1 - deltaT / 500);
    this.spin   *= (1 - deltaT / 100);
    return this; // chainable
};

var RobotShip                       = function(x, y, size, density, image){
    this.base = Ship;
    this.base(x, y, size, density, image);
    this.showEnergyBar  = true;
    this.sampleData = new Interaction();
};
RobotShip.prototype                 = Object.create(Ship.prototype);
RobotShip.prototype.constructor     = Ship;
RobotShip.prototype.canclePreviousControl = function(){
    Ship.prototype.getPilotCommand.call(this);
};
RobotShip.prototype.getTarget                   = function(){
    this.target = false;
    for (var threat of gameObjects){
        if (!(threat instanceof Graphic))                               {continue;}                         // Don't target bullets / thrust
        if (this.target === false)                                      {this.target = threat; continue;}   // Target the first graphic we come across if not yet targeted
        if (this.target.team === this.team && threat.team !== this.team){this.target = threat; continue;}   // If we're targeting ourselves (from above), then target anyone else if poss

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
RobotShip.prototype.anticipateTargetLocation    = function(){
    return this.target;
    // Based on our closing speed to target, estimate a crude time-to-intercept
    // Return a revised TARGET based on where our actual target will be
    // Ignores ours and their acceleration for this crude excercise
    var target = this.target;
    interaction.full(this, target);
    var closingSpeedSqrd = (this.vx - target.vx) * (this.vx - target.vx) + (this.vy - target.vy) * (this.vy - target.vy);
    var roughTimeToIntercept = Math.min(250, interaction.seperationSqrd / closingSpeedSqrd); // ***

    var revisedTarget = new Particle(
        target.x + target.vx * roughTimeToIntercept,
        target.y + target.vy * roughTimeToIntercept,
        target.vx,
        target.vy,
        target.size,
        target.angle,
        target.spin
    );
    // *** - Note : We ignore the effects of both OUR ACCELERATION on the time to intercept and also THE TARGETS ACCELERATION on the estimated position.
    // *** - Given that we're capping the look ahead time of 500ms anyway (to reduce risk of circular argument from low speed ==> high time ==> target behind us ==> infinite time), this should be safe.
    return revisedTarget;
};
RobotShip.prototype.resolveToThisTarget         = function(target){

    var sampleData = new Interaction(); // We want to keep this data
    sampleData.full(this, target);
    sampleData.ourOrientation           = this.angle;
    sampleData.ourTrajectory            = getAngle(this.vx, this.vy);
    sampleData.ourTrajectoryInTargetFrameOfRef  = getAngle(this.vx - target.vx, this.vy - target.vy);
    sampleData.ourSpeedInTargetFrameOfRef       = modulus(this.vx - target.vx, this.vy - target.vy);
    // sampleData.closingSpeed             = modulus(this.vx - target.vx, this.vy - target.vy);
    sampleData.absoluteAngleToTarget            = getAngle(sampleData.unitVector.x, sampleData.unitVector.y);
    sampleData.deflectionAngleToTarget          = normaliseAnglePItoMinusPI(sampleData.absoluteAngleToTarget - sampleData.ourTrajectory);
    sampleData.deflectionAngleToMovingTarget    = normaliseAnglePItoMinusPI(sampleData.absoluteAngleToTarget - sampleData.ourTrajectoryInTargetFrameOfRef);
    sampleData.orientationAgleToTarget          = normaliseAnglePItoMinusPI(sampleData.absoluteAngleToTarget - this.angle);
    sampleData.desired_vx               = target.vx;
    sampleData.desired_vy               = target.vy;

    return sampleData;
};
RobotShip.prototype.activateWhenClearOf         = function(clearTarget){
    // Return true is EITHER already has target OR now clear of parent
    if (this.target) return true;
    interaction.full(this, clearTarget);
    if (interaction.seperation > 2 * interaction.size) return true;
};
RobotShip.prototype.PDinnerLoop_getThrustAngleForInterceptToTarget  = function(deltaT){
    var kP = 0.05 * this.mass / this.getForceAvailable('mainJet');
    var kD = 500 * kP; // NOT CLEAR HOW TO SET kD
    var theta   = this.sampleData.deflectionAngleToMovingTarget;
    // Simple fudge if travelling away from target AND YET APPEARS TO ENABLE CORRECT REVERSE ORIENTATION FOR OVERSHOOT
    if(theta >  Math.PI/2) theta = +Math.PI - theta;
    if(theta < -Math.PI/2) theta = -Math.PI - theta;
    // --
    var lastErr = this.lastSampleData.err_interceptEffort;

    var approachSpeed = this.sampleData.ourSpeedInTargetFrameOfRef;
    var err         = (approachSpeed < 0.25) ? approachSpeed * theta : approachSpeed * Math.tan(theta); // The quantiy we want to minimise to ensure a CONTROLLABLE intercept [closest approach of current trajectory / time to closest approach]
    var errDot      = (err - lastErr || 0) / deltaT;
    var response    = kP * err + kD * errDot;
    if (isNaN(response))response = 0;
    if (response > +1)  response = +1;
    if (response < -1)  response = -1;
    var desiredAngleForThrust = this.sampleData.absoluteAngleToTarget + response * Math.PI / 2;

    this.sampleerr_interceptEffort = err;
    return desiredAngleForThrust;
};
RobotShip.prototype.PDouterLoop_OrientationControlForDesiredAngle   = function(desiredOrientation, deltaT){
    var kP = 0.0005 * this.inertiaRot / (2 * this.size * this.getForceAvailable('frontRight'));
    var kD = 500 * kP;

    var lastErr = this.lastSampleData.err_orientation;

    var err     = normaliseAnglePItoMinusPI(desiredOrientation - this.sampleData.ourOrientation);
    var errDot  = (err - lastErr) / deltaT;
    var response= kP * err + kD * errDot;
    // console.log("err = " + err + "\t errDot = " + errDot + "\t lastInteraction.err = " + this.lastInteraction.err);
    if (response > 0) {this.enginesActive.frontRight = this.enginesActive.backLeft   = Math.min(1, +response);}
    if (response < 0) {this.enginesActive.frontLeft  = this.enginesActive.backRight  = Math.min(1, -response);}
    this.sampleData.err_orientation = err;
};
RobotShip.prototype.PDsingleLoop_controlSpeedWithOrthoganalThrustNoDerivative      = function(deltaT){
    var kP = 0.1 * this.mass / this.getForceAvailable('goUp');

    var err_vx       = (this.sampleData.desired_vx - this.vx);
    var err_vy       = (this.sampleData.desired_vy - this.vy);
    var response_x  = kP * err_vx;
    var response_y  = kP * err_vy;
    if (response_x > 0) {this.enginesActive.goLeft  = Math.min(1, +response_x);}
    if (response_x < 0) {this.enginesActive.goRight = Math.min(1, -response_x);}
    if (response_y > 0) {this.enginesActive.goUp    = Math.min(1, +response_y);}
    if (response_y < 0) {this.enginesActive.goDown  = Math.min(1, -response_y);}
    this.angle = Math.PI / 2; this.spin = 0;
};
RobotShip.prototype.resample = function(){
    this.lastSampleData = this.sampleData.copy();
    this.sampleData     = this.resolveToThisTarget(this.anticipateTargetLocation());
};
var Drone1                       = function(x,y, size){
    this.base = RobotShip;
    this.base(x, y, size, 1, bossBaddy);
    this.team = 3;
    this.angle = Math.PI / 2;
    this.projectileEngines        = {
        goUp    : {projectileType : Thrust,     projectileSize : this.size / 10,     projectileSpeed : 1.0,    projectilePosition : Math.PI,           projectileAngle : Math.PI},
        goDown  : {projectileType : Thrust,     projectileSize : this.size / 10,     projectileSpeed : 1.0,    projectilePosition : 0,                 projectileAngle : 0},
        goLeft  : {projectileType : Thrust,     projectileSize : this.size / 10,     projectileSpeed : 1.0,    projectilePosition : Math.PI * 1 / 2,   projectileAngle : Math.PI * 1 / 2},
        goRight : {projectileType : Thrust,     projectileSize : this.size / 10,     projectileSpeed : 1.0,    projectilePosition : Math.PI * 3 / 2,   projectileAngle : Math.PI * 3 / 2}
    };
};
Drone1.prototype                 = Object.create(RobotShip.prototype);
Drone1.prototype.constructor     = RobotShip;
Drone1.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    //if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    this.target=gameObjects[1];
    this.resample();
    this.PDsingleLoop_controlSpeedWithOrthoganalThrustNoDerivative(deltaT);
    return this; // chainable
};
var Drone2                       = function(x,y,size){
    this.base = RobotShip;
    this.base(x, y, size, 10, fireball);
    this.team = 3;
    this.angle = Math.PI / 2;
    // this.projectileEngines.mainJet.projectileSize *= 0.5;
};
Drone2.prototype                 = Object.create(RobotShip.prototype);
Drone2.prototype.constructor     = RobotShip;
Drone2.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    this.resample();
    this.angle = this.PDinnerLoop_getThrustAngleForInterceptToTarget(deltaT);
    this.spin = 0;
    this.enginesActive.mainJet = 1;
    return this; // chainable
};
var Drone3                       = function(x,y, size){
    this.base = RobotShip;
    this.base(x, y, size, 1, bombBaddy);
    this.team = 3;
    this.angle = Math.PI / 2;
};
Drone3.prototype                 = Object.create(RobotShip.prototype);
Drone3.prototype.constructor     = RobotShip;
Drone3.prototype.getPilotCommand = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    this.resample();
    this.PDouterLoop_OrientationControlForDesiredAngle(this.target.angle, deltaT);
    // this.enginesActive.mainJet = 1;
    return this; // chainable
};

var Fireball                        = function(x, y, vx, vy, size, parent){
    this.base = RobotShip;
    this.base(x, y, size, 5, bomb);
    // this.base(x, y, size, 5, fireball);
    this.gameClass      = 'fireball';
    this.parent         = parent;
    this.team           = parent.team;
    this.angle          = this.parent.angle;
    this.vx             = vx;
    this.vy             = vy;
    this.showEnergyBar  = false;
    this.showPath       = false;
    this.damagePts      = 3000;
    this.projectileEngines.mainJet.projectileSize *= 2;
};
Fireball.prototype                  = Object.create(RobotShip.prototype);
Fireball.prototype.constructor      = RobotShip;
Fireball.prototype.getPilotCommand  = function(deltaT){
    this.canclePreviousControl();
    if (this.activateWhenClearOf(this.parent)) {
        if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
        this.resample();
        this.angle = this.PDinnerLoop_getThrustAngleForInterceptToTarget(deltaT);
        this.spin = 0;
        this.enginesActive.mainJet = 1;
    }
    return this; // chainable
};

var BigRocket = function(x, y, vx, vy, size, parent){
    this.base = RobotShip;
    this.base(x, y, size, 40, missile);
    this.gameClass      = 'missile';
    this.parent         = parent;
    this.team           = parent.team;
    this.angle          = this.parent.angle;
    this.vx             = vx;
    this.vy             = vy;
    this.showEnergyBar  = false;
    this.damagePts      = 20000;
    this.projectileEngines.mainJet.projectileSize       *= 4;
    // this.projectileEngines.frontLeft.projectileSize     *= 2;
    // this.projectileEngines.frontRight.projectileSize    *= 2;
    // this.projectileEngines.backLeft.projectileSize      *= 2;
    // this.projectileEngines.backRight.projectileSize     *= 2;
this.launchtime=Date.now();

};
BigRocket.prototype                   = Object.create(RobotShip.prototype);
BigRocket.prototype.constructor       = RobotShip;
BigRocket.prototype.getPilotCommand   = function(deltaT){
    // this.PDouterLoop_OrientationControlForDesiredAngle(this.target.angle, deltaT);
    this.enginesActive.mainJet = 1;
    if (this.size > 10 && this.launchtime < (Date.now()-1000)){
        var split1 = new BigRocket(
            this.x + 1*this.size * Math.cos(this.angle + Math.PI / 2),
            this.y + 1*this.size * Math.sin(this.angle + Math.PI / 2),
            this.vx,
            this.vy,
            this.size / 2,
            this
        );
        gameObjects.push(split1);

        var split2 = new BigRocket(
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

var Missile                         = function(x, y, vx, vy, size, parent){
    this.base = RobotShip;
    this.base(x, y, size, 10, missile);
    this.gameClass      = 'missile';
    this.parent         = parent;
    this.team           = parent.team;
    this.angle          = this.parent.angle;
    this.vx             = vx;
    this.vy             = vy;
    this.showEnergyBar  = false;
    this.damagePts      = 3000;
    this.projectileEngines.mainJet.projectileSize       *= 2;
    this.projectileEngines.frontLeft.projectileSize     *= 2;
    this.projectileEngines.frontRight.projectileSize    *= 2;
    this.projectileEngines.backLeft.projectileSize      *= 2;
    this.projectileEngines.backRight.projectileSize     *= 2;
};
Missile.prototype                   = Object.create(RobotShip.prototype);
Missile.prototype.constructor       = RobotShip;
Missile.prototype.getPilotCommand   = function(deltaT){
    this.canclePreviousControl();
    if (this.activateWhenClearOf(this.parent)) {
        if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
        this.resample();
        this.PDouterLoop_OrientationControlForDesiredAngle(this.PDinnerLoop_getThrustAngleForInterceptToTarget(deltaT), deltaT);
        this.enginesActive.mainJet = 1;
    }
    return this; // chainable
};

var Baddy                           = function(x, y){
    this.base = RobotShip;
    this.base(x, y, 30, 1, bombBaddy);
    this.team = 3;
    this.angle = Math.PI / 2;
    this.projectileEngines.mainJet.projectileSize       *= 0.5;
};
Baddy.prototype                     = Object.create(RobotShip.prototype);
Baddy.prototype.constructor         = RobotShip;
Baddy.prototype.getPilotCommand     = function(deltaT){
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    this.resample();
    this.PDouterLoop_OrientationControlForDesiredAngle(this.PDinnerLoop_getThrustAngleForInterceptToTarget(deltaT), deltaT);
    if (interaction.seperation < 5 * interaction.size) {this.enginesActive.hoseGun = 1;}
    else {this.enginesActive.mainJet = 1;}
};


var BossBaddy                       = function(x,y){
    this.base = RobotShip;
    this.base(x, y, 100, 1, bossBaddy);
    this.team = 3;
    this.baddySpawnReady    = false;
    this.baddySpawnTimer    = (function(parent){setInterval(function(){parent.baddySpawnReady = true;}, 2000);})(this);
    this.angle = Math.PI / 2;
    this.projectileEngines        = {
    // NOTE: All projectileEngines assumed to start on the circumference of the circle
        goUp    : {projectileType : Thrust,     projectileSize : this.size / 7,     projectileSpeed : 1.5,    projectilePosition : Math.PI,           projectileAngle : Math.PI},
        goDown  : {projectileType : Thrust,     projectileSize : this.size / 7,     projectileSpeed : 1.5,    projectilePosition : 0,                 projectileAngle : 0},
        goLeft  : {projectileType : Thrust,     projectileSize : this.size / 7,     projectileSpeed : 1.5,    projectilePosition : Math.PI * 1 / 2,   projectileAngle : Math.PI * 1 / 2},
        goRight : {projectileType : Thrust,     projectileSize : this.size / 7,     projectileSpeed : 1.5,    projectilePosition : Math.PI * 3 / 2,   projectileAngle : Math.PI * 3 / 2}
    };
};
BossBaddy.prototype                 = Object.create(RobotShip.prototype);
BossBaddy.prototype.constructor     = RobotShip;
BossBaddy.prototype.getPilotCommand = function(deltaT){
    if (this.baddySpawnReady){
        this.baddySpawnReady = false;
        var childBaddy = new Baddy(
            this.x - 1.2 * this.size * Math.cos(this.angle) + 4 * Math.random() - 2,
            this.y - 1.2 * this.size * Math.sin(this.angle) + 4 * Math.random() - 2
        );
        childBaddy.parent = this;
        childBaddy.size = this.size / 2;
        gameObjects.push(childBaddy);
    }
    this.canclePreviousControl();
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    this.resample();
    this.PDsingleLoop_controlSpeedWithOrthoganalThrustNoDerivative(deltaT);
};

// -- Interaction is used to resolve to objects, and refered to by collide, stretch, attract
var Interaction                     = function(){
    Primitive.call(this);
};
Interaction.prototype               = Object.create(Primitive.prototype);
Interaction.prototype.constructor   = Primitive;
Interaction.prototype.copy          = function(){
    var copy = new Interaction();
    // copy.x          = this.x;
    // copy.y          = this.y;
    // copy.size       = this.size;
    copy.err_interceptEffort    = this.err_interceptEffort;
    copy.err_orientation        = this.err_orientation;
    return copy;
};
Interaction.prototype.near          = function(P1, P2){
    this.x = P2.x - P1.x;           // Contact vector
    this.y = P2.y - P1.y;
    this.size = P2.size + P1.size;  // Interaction distance at point of contact
    return ((Math.abs(this.x) <= this.size) && (Math.abs(this.y) <= this.size));
};
Interaction.prototype.touching      = function(){
    this.seperationSqrd = this.x * this.x + this.y * this.y;
    this.sizeSqrd       = this.size * this.size;
    return ( this.seperationSqrd <= this.sizeSqrd );
};
Interaction.prototype.resolve       = function(){
    // Hard coded stability!!! Only 2 1/2px gameObjects colliding could have a sep < 1
    this.seperation = (this.seperationSqrd < 1) ? 1 : Math.sqrt(this.seperationSqrd);

    this.unitVector = {
        x : this.x / this.seperation,
        y : this.y / this.seperation
    };
    this.resolved = true;
};
Interaction.prototype.full       = function(P1, P2){
    this.near(P1, P2);
    this.touching();
    this.resolve();
};
Interaction.prototype.getSeperation = function(P1, P2){
    this.full(P1,P2);
    return this.seperation;
};
Interaction.prototype.clear         = function(){
    this.resolved = false;
};
// --

// -- Wall is a size = 200 Primitive, that only collides.
var Wall                            = function(){
    this.base = Particle;
    this.base(0,0,0,0,200,0, 0, 10000);
    this.restitution    = 0;
    this.friction       = 0;
    this.gameClass      = 'wall';
};
Wall.prototype                      = new Primitive();
Wall.prototype.clear                = function() {
    this.x          = 0;
    this.y          = 0;
    this.vx         = 0;
    this.vy         = 0;
    this.angle      = 0;
    this.spin       = 0;
};
// --
//