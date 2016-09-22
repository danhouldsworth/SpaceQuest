"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
/*global interaction, wall, restitution, friction , gameObjects, gameObjects, GlobalParams, deltaT, draw_ball, gameArea, ctx*/

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
Primitive.prototype.updatePosition = function(deltaT){
    // -- Update position based on speed
    this.x      += this.vx      * deltaT;
    this.y      += this.vy      * deltaT;
    this.angle  += this.spin    * deltaT;
    // -- Normalise angle to 0<theta<2PI
    this.angle = normaliseAngle0to2PI(this.angle);
    // --
    return this;
};
Primitive.prototype.accelerate  = function(deltaT){
    // -- Modify speed due to forces
    this.vx     += this.ax      * deltaT;
    this.vy     += this.ay      * deltaT;
    this.spin   += this.spinDot * deltaT;
    return this;
};
Primitive.prototype.stabilise   = function(deltaT) {
    this.vx     = Math.min(2,  this.vx);
    this.vy     = Math.min(2,  this.vy);
    this.spin   = Math.min(0.1, this.spin);
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
    this.inertia        = 0.5       * this.size * this.size * this.mass;
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
        var cos_theta   = interaction.vector.x;
        var sin_theta   = interaction.vector.y;
        var u_spin1     = this.spin;
        var u_spin2     = that.spin;
        var mu1         = 1 + this.mass / that.mass;
        var mu2         = 1 + that.mass / this.mass;
        var r1          = this.size;
        var r2          = that.size;
        var alpha       = 2 / 5;

        // calculate P1 vector for first transform
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

        if (interaction.seperation < 0.99 * interaction.size){ // Try and save some cycles
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
        interaction.touching(this,that);
        interaction.resolve(this,that);
        var gravityFactor = 0.0001;
        this.ax += gravityFactor * interaction.vector.x * that.mass / interaction.seperationSqrd;
        this.ay += gravityFactor * interaction.vector.y * that.mass / interaction.seperationSqrd;
        that.ax -= gravityFactor * interaction.vector.x * this.mass / interaction.seperationSqrd;
        that.ay -= gravityFactor * interaction.vector.y * this.mass / interaction.seperationSqrd;
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
    this.base(x, y, vx, vy, size, 0, 0, 0.1);
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
    var numberOfBombs   = 5 * this.speed() + this.mass;
    var bombSpeed       = 1 * this.speed() + this.mass * 0.0001;
    if (numberOfBombs > 100) numberOfBombs = 100;
    for(var bombPiece = 1; bombPiece < numberOfBombs; bombPiece++) {
        var fragSize = Math.random() * this.size;
        var throwAngle = 2 * Math.PI * numberOfBombs / bombPiece;
        if (fragSize > 20) fragSize = 20;
        gameObjects.push(new Bomb(
            this.x + this.size * Math.random() * Math.cos(throwAngle),
            this.y + this.size * Math.random() * Math.sin(throwAngle),
            bombSpeed * Math.cos(throwAngle),
            bombSpeed * Math.sin(throwAngle),
            fragSize,
            this
        ));
    }
}
Bomb.prototype.stabilise        = function(){
    Primitive.prototype.stabilise.call(this);
    if (Math.random() < (this.mass / 1000000) ) this.detonate();
    return this;
};
// --

// -- Like a particle but drawn with an image & explodes on destruction
var Graphic                     = function(x, y, vx, vy, size, angle, spin, density){
    this.base = Particle;
    this.offSet = 0;
    this.base(x, y, vx, vy, size, spin, 0, 1);
    this.showPath = true;
};
Graphic.prototype               = Object.create(Particle.prototype);
Graphic.prototype.constructor   = Particle;
Graphic.prototype.draw          = function(){
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.offSet + this.angle);
    ctx.drawImage(this.image, -this.size, -this.size, 2 * this.size, 2 * this.size);
    ctx.restore();
    if (this.target){
        ctx.beginPath();
        var grad = ctx.createLinearGradient(this.x, this.y, this.target.x, this.target.y);
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
        var grad = ctx.createLinearGradient(
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
    return this; // chainable
};
// --

// Game objects - based on Graphics. Have active controls and specific actions
var Asteroid                    = function(x, y, vx, vy, size, spin){
    this.base = Graphic;
    this.base(x, y, vx, vy, size, 0, spin, 10);
    this.gameClass  = 'asteroid';
    this.image      = asteroid;
    this.showPath   = false;
    this.restitution= .25;
};
Asteroid.prototype              = Object.create(Graphic.prototype);
Asteroid.prototype.constructor  = Graphic;
Asteroid.prototype.stabilise      = function(deltaT) {
    Primitive.prototype.stabilise.call(this);
    this.ax = this.ay = 0; // Dont let gravity linger
    return this; // chainable
};

var Ship                        = function(x, y, size, density, image){
    this.base = Graphic;
    this.base(x, y, 0, 0, size, 0, 0, density);
    this.gameClass      = 'ship';
    this.showEnergyBar  = true;
    this.image          = image;
    this.offSet         = image.drawingOffsetAngle;
    // this.restitution    = 0;
    this.friction       = 0;
    this.projectileEngines        = {
    // NOTE: All projectileEngines assumed to start on the circumference of the circle
        mainJet     : {projectileType : Thrust,     projectileSize : this.size / 4,     projectileSpeed :  1,    projectilePosition : Math.PI,           projectileAngle : Math.PI},
        frontLeft   : {projectileType : Thrust,     projectileSize : this.size /20,     projectileSpeed :0.3,    projectilePosition : 0,                 projectileAngle : Math.PI / 2},
        frontRight  : {projectileType : Thrust,     projectileSize : this.size /20,     projectileSpeed :0.3,    projectilePosition : 0,                 projectileAngle : Math.PI * 3 / 2},
        backLeft    : {projectileType : Thrust,     projectileSize : this.size /20,     projectileSpeed :0.3,    projectilePosition : Math.PI * 2 / 3,   projectileAngle : Math.PI / 2},
        backRight   : {projectileType : Thrust,     projectileSize : this.size /20,     projectileSpeed :0.3,    projectilePosition : Math.PI * 4 / 3,   projectileAngle : Math.PI * 3 / 2},
        hoseGun     : {projectileType : Bullet,     projectileSize : this.size / 5,     projectileSpeed :  1,    projectilePosition : 0,                 projectileAngle : 0},
        cannonBay   : {projectileType : Fireball,   projectileSize : this.size / 3,     projectileSpeed :0.2,    projectilePosition : Math.PI,           projectileAngle : Math.PI},
        missileBayL : {projectileType : Missile,    projectileSize : this.size / 3,     projectileSpeed :0.2,    projectilePosition : Math.PI / 2,       projectileAngle : Math.PI / 2},
        missileBayR : {projectileType : Missile,    projectileSize : this.size / 3,     projectileSpeed :0.2,    projectilePosition : Math.PI * 3 / 2,   projectileAngle : Math.PI * 3 / 2}
    };
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
        engineFiring.projectileSize,
        this
    );
    gameObjects.push(projectile);
    return projectile;
};
Ship.prototype.fireMissile      = function(){
    if (this.missleLaunchersHot === true) return;
    this.missleLaunchersHot = true;
    this.missleCoolTimer = (function(thisShip){setTimeout(function(){thisShip.missleLaunchersHot = false;}, 500);})(this);
    this.missileLaunchSide = -this.missileLaunchSide
    this.fireProjectiles((this.missileLaunchSide === 1)? "missileBayL" : "missileBayR");
    return this; // chainable
};
Ship.prototype.fireCanonBall    = function(){
    if (this.longRangeGunHot === true) return;
    this.longRangeGunHot = true;
    this.cannonCoolTimer = (function(thisShip){setTimeout(function(){thisShip.longRangeGunHot = false;}, 250);})(this);
    this.fireProjectiles("cannonBay");
    return this; // chainable
};
Ship.prototype.accelerate       = function(deltaT){
    // NOTE : Thrust acceleration (deltaV) will be independent of CPS / deltaT, and is correctly calculated on the momentum impulse of the thrust particle
    // However, the actual number of particles injected for animation and game purposes IS CPS / deltaT dependent.
    // TODO : Return an impulse in ax, ax, spindot components, based on engine config
    // this.ax = this.ay = this.spinDot = 0;
    var impulse, forcePerDeltaT, torque;
    if (this.firing) {
        impulse = this.fireProjectiles("hoseGun").momentum();
        forcePerDeltaT = impulse / deltaT;
        this.ax -= (forcePerDeltaT / this.mass) * Math.cos(this.angle);
        this.ay -= (forcePerDeltaT / this.mass) * Math.sin(this.angle);
    }
    if (this.thrusting){
        impulse = this.fireProjectiles("mainJet").momentum();
        forcePerDeltaT = impulse / deltaT;
        this.ax += (forcePerDeltaT / this.mass) * Math.cos(this.angle);
        this.ay += (forcePerDeltaT / this.mass) * Math.sin(this.angle);
    }
    if (this.thrustLeft) {
        impulse = this.fireProjectiles("frontRight").momentum() + this.fireProjectiles("backLeft").momentum();
        forcePerDeltaT = impulse / deltaT;
        torque = impulse * this.size;
        this.spinDot += torque / this.inertia;
    }
    if (this.thrustRight) {
        impulse = this.fireProjectiles("frontLeft").momentum() + this.fireProjectiles("backRight").momentum();
        forcePerDeltaT = impulse / deltaT;
        torque = impulse * this.size;
        this.spinDot -= torque / this.inertia;
    }

    Particle.prototype.accelerate.call(this, deltaT);
    return this;
};
Ship.prototype.getPilotCommand = function(){
    this.ax = this.ay = this.spinDot = 0;
    this.firing = this.thrusting = this.thrustLeft = this.thrustRight = false;
    return this; // chainable
};
Ship.prototype.stabilise      = function(deltaT) {
    Primitive.prototype.stabilise.call(this);
    this.vx     *= (1 - deltaT / 1000);
    this.vy     *= (1 - deltaT / 1000);
    this.spin   *= (1 - deltaT / 100);
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
PlayerShip.prototype.getPilotCommand= function(deltaT){
    Ship.prototype.getPilotCommand.call(this);
    var playerKeys  = {
                                    // Daddy / Finn     // Use http://keycode.info/ to get keycodes
        left    : [null, 81, 37],   // q    Arrow
        right   : [null, 87, 39],   // w    Arrow
        thrust  : [null, 69, 38],   // e    Arrow
        fire    : [null, 83, 32],   // s    Space
        missile : [null, 82, 40],   // r    Down Arrow
        cannon  : [null, 84, 77]    // t    m
    };
    if (keyState[playerKeys.left[   this.team]])      {this.thrustLeft    = true;}
    if (keyState[playerKeys.right[  this.team]])      {this.thrustRight   = true;}
    if (keyState[playerKeys.thrust[ this.team]])      {this.thrusting     = true;}
    if (keyState[playerKeys.fire[   this.team]])      {this.firing        = true;}
    if (keyState[playerKeys.cannon[ this.team]])      {this.fireCanonBall();}
    if (keyState[playerKeys.missile[this.team]])      {this.fireMissile();}
    return this; // chainable
};
PlayerShip.prototype.stabilise      = function(deltaT) {
    Primitive.prototype.stabilise.call(this);
    this.vx     *= (1 - deltaT / 500);
    this.vy     *= (1 - deltaT / 500);
    this.spin   *= (1 - deltaT / 100);
    return this; // chainable
};

var RobotShip                       = function(x, y, size, density, image){
    this.base = Ship;
    this.base(x, y, size, density, image);
    this.showEnergyBar  = true;
};
RobotShip.prototype                 = Object.create(Ship.prototype);
RobotShip.prototype.constructor     = Ship;
RobotShip.prototype.getTarget       = function(){
    console.log(this);
    console.log("getTarget");
    this.target = false;
    for (var threat of gameObjects){
        if (!threat.team) {continue;}                                                                       // Don't target bullets / thrust
        if (this.target === false && threat instanceof Graphic)         {this.target = threat; continue;}   // Target the first graphic we come across if not yet targeted
        if (this.target.team === this.team && threat.team !== this.team){this.target = threat; continue;}   // If we're targeting ourselves (from above), then target anyone else if poss
        switch (this.team){
            case 1:
            case 2: if (threat.team === 3 && (this.target.team !==3 || (threat.mass > this.target.mass)))   {this.target = threat;} break; // Daddy&Finn Always target the baddies if we're not already. But don't detarget for smaller RobotShip
            case 3: if (threat.team !== 3 && (threat.mass > this.target.mass))                              {this.target = threat;} break; // Baddies target the biggest Daddy/Finn they can
        }
    }
    return this; // chainable
};
RobotShip.prototype.resolveTarget   = function(){
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();}

    interaction.near(this, this.target);
    interaction.touching();
    interaction.resolve();

    this.trajectory     = getAngle(this.vx, this.vy);
    this.absoluteAngleToTarget      = getAngle(interaction.vector.x, interaction.vector.y);
    this.deflectionAngleToTarget    = normaliseAnglePItoMinusPI(this.absoluteAngleToTarget - this.trajectory);
    this.orientationAgleToTarget    = normaliseAnglePItoMinusPI(this.absoluteAngleToTarget - this.angle);

    return this; // chainable
};
RobotShip.prototype.canclePreviousControl = function(){
    Ship.prototype.getPilotCommand.call(this);
};
RobotShip.prototype.activateWhenClearOf = function(clearTarget){
    if (!this.target){
        interaction.near(this, clearTarget);
        interaction.touching();
        interaction.resolve();
        if (interaction.seperation < 2 * clearTarget.size) return false;
    }
    return true; // Return true is EITHER already has target OR now clear of parent
};
RobotShip.prototype.basicSeekByPointAndThrust = function(){
    this.resolveTarget();
    this.angle = this.absoluteAngleToTarget;
    this.thrusting = true;
};
RobotShip.prototype.seekBySteerAndThrust = function(){
    this.resolveTarget();
    this.thrusting = true;

    if (Math.abs(this.orientationAgleToTarget) < Math.PI / 16) return; // Cruise if on target
    if (this.orientationAgleToTarget > 0)     {this.thrustLeft  = true;}
    if (this.orientationAgleToTarget < 0)     {this.thrustRight = true;}
};

var Fireball                        = function(x, y, vx, vy, size, parent){
    this.base = RobotShip;
    this.base(x, y, size, 5, fireball);
    this.gameClass      = 'fireball';
    this.parent         = parent;
    this.team           = parent.team;
    this.angle          = this.parent.angle;
    this.vx             = vx;
    this.vy             = vy;
    this.showEnergyBar  = false;
    this.showPath       = false;
    this.damagePts      = 3000;
};
Fireball.prototype                  = Object.create(RobotShip.prototype);
Fireball.prototype.constructor      = RobotShip;
Fireball.prototype.getPilotCommand  = function(deltaT){
    this.canclePreviousControl();
    if (this.activateWhenClearOf(this.parent)) this.basicSeekByPointAndThrust();

    return this; // chainable
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
};
Missile.prototype                   = Object.create(RobotShip.prototype);
Missile.prototype.constructor       = RobotShip;
Missile.prototype.getPilotCommand   = function(deltaT){
    this.canclePreviousControl();
    if (this.activateWhenClearOf(this.parent)) this.seekBySteerAndThrust();
    return this; // chainable
};

var Baddy                           = function(x, y){
    this.base = RobotShip;
    this.base(x, y, 30, 1, bombBaddy);
    this.team = 3;
};
Baddy.prototype                     = Object.create(RobotShip.prototype);
Baddy.prototype.constructor         = RobotShip;
Baddy.prototype.getPilotCommand     = function(deltaT){
    this.ax = this.ay = this.spinDot = 0;
    this.firing = this.thrusting = this.thrustLeft = this.thrustRight = false;

    this.resolveTarget();
    if      (this.angleToTarget <= Math.PI - 0.1)                                   {this.thrustLeft = true;}
    else if (this.angleToTarget >= Math.PI + 0.1)                                   {this.thrustRight = true;}
    var engagementDistance = this.target.size + this.size * 5;
    if (interaction.seperation > engagementDistance){
        if (Math.random() < 0.3 * (interaction.seperation / engagementDistance) )   {this.thrusting = true;}
    } else                                                                          {this.firing = true;}
    return this; // chainable
};


var BossBaddy                       = function(x,y){
    this.base   = RobotShip;
    this.base(x, y, 60, 1, bossBaddy);
    this.team               = 3;
    this.baddySpawnReady    = false;
    this.baddySpawnTimer    = (function(parent){setInterval(function(){parent.baddySpawnReady = true;}, 2000);})(this);
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
    Baddy.prototype.getPilotCommand.call(this, deltaT);
};

// -- Interaction is used to resolve to objects, and refered to by collide, stretch, attract
var Interaction                     = function(){
    Primitive.call(this);
};
Interaction.prototype               = Object.create(Primitive.prototype);
Interaction.prototype.constructor   = Primitive;
Interaction.prototype.near          = function(P1, P2){
    this.x = P2.x - P1.x;           // Contact Vector
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

    this.vector = {
        x : this.x / this.seperation,
        y : this.y / this.seperation
    };
    this.resolved = true;
};
Interaction.prototype.clear         = function(){
    this.resolved = false;
};
// --

// -- Wall is a size = 200 Primitive, that only collides.
var Wall                            = function(){
    this.base = Particle;
    this.base(0,0,0,0,200,0, 0, 10000);
    this.restitution    = 0.4;
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