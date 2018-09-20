"use strict"; /* jshint
browser : true,
quotmark : false,
white : false,
indent : false */
/* globals getAngle, console, normaliseAnglePItoMinusPI, normaliseAngle0to2PI, keyState, interaction, wall, restitution, friction , gameObjects, gameObjects, GlobalParams, deltaT, draw_ball, gameArea, ctx, ctxStars, w, h,  modulus, applyCollisionRules, asteroid, fireball, bomb, bossBaddy, bombBaddy, missile, spaceShip*/

// -- Basic Primitive Object has size and 6DoF in state space
const Primitive                   = function(x, y, vx, vy, size, angle, spin){
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
Primitive.prototype.speed       = function (relativeTo={vx:0, vy:0}){
    return modulus(this.vx-relativeTo.vx, this.vy-relativeTo.vy);
};
Primitive.prototype.clearAccelerations = function (){
    this.ax = 0;
    this.ay = 0;
    this.spinDot = 0;
    return this;
};
Primitive.prototype.updateForces = function(deltaT){
    // These are cleared at the start of each physics iterations, and before collisions detected
    if (GlobalParams.wind){
        this.ax += this.size * (GlobalParams.wind * (this.y+0.5*GlobalParams.universeSize*h)*(this.y+0.5*GlobalParams.universeSize*h)/(GlobalParams.universeSize*h*GlobalParams.universeSize*h)) / Math.max(10000,this.mass);
    }
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
    return this; // chainable
};
Primitive.prototype.applyDrag      = function(deltaT) {
    // this.vx     *= (1 - deltaT / 5000);
    // this.vy     *= (1 - deltaT / 5000);
    this.spin   *= (1 - deltaT / 1000);
    return this; // chainable
};



// -- Particle is a subset of Primitive. It has density (& therefor mass), restituion and friction - and so can interact with other gameObjects.
const Particle                    = function(x, y, vx, vy, size, angle, spin, density){
    this.base = Primitive;
    this.base(x, y, vx, vy, size, angle, spin);
    this.gameClass      = 'particle';
    this.boundary_flag  = GlobalParams.boundary_flag;
    this.restitution    = 0;
    this.friction       = 100;
    this.density        = density;
    this.energy         = 1; // Consider it adhesion
    const r = this.size;
    this.volume         = (4/3) * Math.PI * r*r*r; // NOTE: mass is not recalculated during attrition!!
    this.mass           = this.volume * this.density;
    const m = this.mass;
    // 4/3 pi r^3
    // this.mass           = Math.PI   * this.size * this.size * this.density; // NOTE: mass is not recalculated during attrition!!
    // this.inertiaRot     = 0.5       * this.size * this.size * this.mass;
    this.inertiaRot     = (2/5)*m*r*r;
};
Particle.prototype              = new Primitive();
Particle.prototype.momentum     = function(relativeTo){
    return this.mass * this.speed(relativeTo);
};
Particle.prototype.collide      = function(that){

    if (this.ephemeral || that.ephemeral) return false;
    if (this === that) return false;

    if (interaction.near(this, that) && interaction.touching()){
        interaction.resolve();

        const e = restitution(this,that);
        let f = friction(this,that);

        // theta = angle from x-axis to line P1P2 (anticlockwise)
        const cos_theta   = interaction.unitVector.x;
        const sin_theta   = interaction.unitVector.y;
        const u_spin1     = this.spin;
        const u_spin2     = that.spin;
        const mu1         = 1 + this.mass / that.mass;
        const mu2         = 1 + that.mass / this.mass;
        const r1          = this.size;
        const r2          = that.size;
        const alpha       = 2 / 5;

        // calculate P1 unitVector for first transform
        const u1x = this.vx;
        const u1y = this.vy;

        // Transform #1 (coords about stationary P1 ie apply -u1x,-u1y)
        let u2x = that.vx - u1x;
        let u2y = that.vy - u1y;
        const temp_vx = u2x;

        // Transform #2 (rotate coords to make P1P2 intersect along x-axis ie. theta=0)
        u2x = (cos_theta * u2x) + (sin_theta * u2y);        // Approach velocity
        u2y = (cos_theta * u2y) - (sin_theta * temp_vx);    // Velocity perpendicular to approach

        if (u2x < 0){
            const max_stopping_friction_coeff = Math.abs((u2y - r2 * u_spin2 - r1 * u_spin1) * alpha / (u2x * (e + 1) * (alpha + 1)));
            if (u2y > (r1 * u_spin1 + r2 * u_spin2)){
                f = -Math.min(f, max_stopping_friction_coeff);
            }
            if (u2y == (r1 * u_spin1 + r2 * u_spin2)){
                f = 0;
            }
            if (u2y < (r1 * u_spin1 + r2 * u_spin2)){
                f = Math.min(f, max_stopping_friction_coeff);
            }

            const v1x = u2x * (e + 1) / mu1;
            const v2x = u2x * ((1 / mu1) - (e / mu2));
            const v1y = u2x * f * (e + 1) / mu1;
            const v2y = u2y - u2x * f * (e + 1) / mu2;
            const v_spin1 = u_spin1 + u2x * f * (e + 1) / (alpha * r1 * mu1);
            const v_spin2 = u_spin2 + u2x * f * (e + 1) / (alpha * r2 * mu2);

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
            const antiSqueezeForce = 0.5 * (interaction.size - interaction.seperation);
            const thatDisplacement = Math.max(1, antiSqueezeForce * this.mass / (this.mass + that.mass));
            const thisDisplacement = Math.max(1, antiSqueezeForce - thatDisplacement);
            this.x += -thisDisplacement * cos_theta;
            this.y += -thisDisplacement * sin_theta;
            that.x +=  thatDisplacement * cos_theta;
            that.y +=  thatDisplacement * sin_theta;
            if (this instanceof Graphic && that instanceof Graphic){
                that.energy -= thatDisplacement / 100;
                this.energy -= thisDisplacement / 100;
                // Increase friction here?
            }
        }

        return true;
    }
    // else if (this instanceof Asteroid || that instanceof Asteroid) {
    // else if (this instanceof Asteroid && that instanceof Asteroid) {
    else if (this instanceof Graphic && that instanceof Graphic) {
        // ONLY IF NOT TOUCHING!!?!
        if (this.gameClass === "wall" || that.gameClass === "wall") {console.log("wall");}
        interaction.touching();
        interaction.resolve();
        const G = GlobalParams.gravityFactor;

        this.ax += G * interaction.unitVector.x * that.mass / interaction.seperationSqrd;
        this.ay += G * interaction.unitVector.y * that.mass / interaction.seperationSqrd;
        // Currently only 1st object experiencing gravity??

        that.ax -= G * interaction.unitVector.x * this.mass / interaction.seperationSqrd;
        that.ay -= G * interaction.unitVector.y * this.mass / interaction.seperationSqrd;

        // console.log(this.ax + " : " + this.vx + " -- " + that.ax + " : " + that.vx);
        // this does nothing??
    }
    return false;
};
Particle.prototype.boundaryConstraint = function() {
    // const w = gameArea.width,
        // h = gameArea.height;

    if (this.boundary_flag === -1){                 // BOUNCE
        if ((this.x - this.size) < -0.5*GlobalParams.universeSize*w){
            wall.clear();
            wall.y      = this.y;
            wall.x      = -0.5*GlobalParams.universeSize*w-wall.size;
            this.collide(wall);applyCollisionRules(this, wall);
        }
        if ((this.x + this.size) > 0.5*GlobalParams.universeSize*w){
            wall.clear();
            wall.y      = this.y;
            wall.x      = 0.5*GlobalParams.universeSize*w + wall.size;
            this.collide(wall);applyCollisionRules(this, wall);
        }
        if ((this.y - this.size) < -0.5*GlobalParams.universeSize*h){
            wall.clear();
            wall.x = this.x;
            wall.y = -0.5*GlobalParams.universeSize*h-wall.size;
            this.collide(wall);applyCollisionRules(this, wall);
        }
        if ((this.y + this.size) > 0.5*GlobalParams.universeSize*h){
            wall.clear();
            wall.x      = this.x;
            wall.y      = 0.5*GlobalParams.universeSize*h + wall.size;
            this.collide(wall);applyCollisionRules(this, wall);
        }
    } else if (this.boundary_flag == 1){            // WRAP
        while ((this.x - this.size) < -0.5*GlobalParams.universeSize*w){
            this.x += GlobalParams.universeSize*w;
        }
        while ((this.x + this.size) > 0.5*GlobalParams.universeSize*w){
            this.x -= GlobalParams.universeSize*w;
        }
        while ((this.y - this.size) < -0.5*GlobalParams.universeSize*h){
            this.y += GlobalParams.universeSize*h;
        }
        while ((this.y + this.size) > 0.5*GlobalParams.universeSize*h){
            this.y -= GlobalParams.universeSize*h;
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
    const index = gameObjects.indexOf(this);
    if (index !== -1) {gameObjects.splice(index,1);}
};

const Star = function(){
    this.base = Particle;
    const size  = Math.random() * 15;
    const x     = (Math.random()-0.5) * GlobalParams.universeSize*w;
    const y     = (Math.random()-0.5) * GlobalParams.universeSize*h;
    const vx    = 5 / size;
    this.base(x,y,vx,0,size,0, 0, 0);
    this.boundary_flag = 1;
};
Star.prototype                  = Object.create(Particle.prototype);
Star.prototype.constructor      = Particle;
Star.prototype.draw             = function(){
    ctxStars.beginPath();
    ctxStars.arc(this.x,this.y,this.size, 0, 2 * Math.PI, false);
    ctxStars.fillStyle = "rgb("+Math.round(300-this.size*20)+","+Math.round(300-this.size*20)+","+Math.round(300-this.size*20)+")";
    ctxStars.fill();
};

// -- Game objects - based on gameObjects. They damage points for collisions, and know their parent.
const Bullet                      = function(x, y, vx, vy, size, parent){
    const density = 0.0001;
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0, 0, density);
    this.gameClass      = 'bullet';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = parent.mass/10000;
    this.calcColour = function(){
        this.red    = (this.parent.team % 2) ? 255                       : 255;
        this.green  = (this.parent.team % 2) ? Math.floor(this.size*30)  : 255;
        this.blue   = (this.parent.team % 2) ? Math.floor(this.size*30)  : Math.floor(this.size*30);
    };
};
Bullet.prototype                = Object.create(Particle.prototype);
Bullet.prototype.constructor    = Particle;

const Thrust                      = function(x, y, vx, vy, size, parent){
    const density = 2;
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0, 0, density);
    this.gameClass      = 'thrust';
    this.parent         = parent;
    this.team           = parent.team;
    this.calcColour = function(){
        this.red    = (this.parent.team % 2) ? Math.floor(this.size*30) : Math.floor(this.size*30);
        this.green  = (this.parent.team % 2) ? Math.floor(this.size*30) : 255;
        this.blue   = (this.parent.team % 2) ? 255                      : Math.floor(this.size*30);
    };
};
Thrust.prototype                = Object.create(Particle.prototype);
Thrust.prototype.constructor    = Particle;

const Bomb                        = function(x, y, vx, vy, size, parent){
    const density = 1;
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0, 0, density);
    this.gameClass      = 'bomb';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = parent.mass/100;
    this.calcColour = function(){
        this.red    = 255;
        this.green  = 255;
        this.blue   = Math.floor(this.size*30);
    };
};
Bomb.prototype                  = Object.create(Particle.prototype);
Bomb.prototype.constructor      = Particle;
Bomb.prototype.detonate         = function(){
    // invoked with this=Graphic && this=Bomb
    const numberOfBombs   = Math.min(200, 5 * this.speed() + this.mass / 1);
    const bombSpeed       = Math.min(0.5, 1 * this.speed() + this.mass / 1000000);
    for(let bombPiece = 1; bombPiece < numberOfBombs; bombPiece++) {
        const fragSize = Math.random() * Math.min(10, this.size);
        const throwAngle = 2 * Math.PI * numberOfBombs / bombPiece;
        gameObjects.push(new Bomb(
            this.x + (this.size * Math.random() * Math.cos(throwAngle) ),
            this.y + (this.size * Math.random() * Math.sin(throwAngle) ),
            bombSpeed * Math.cos(throwAngle),
            bombSpeed * Math.sin(throwAngle),
            fragSize,
            this
        ));
    }
};
Bomb.prototype.sanitiseSingularities        = function(deltaT){
    Primitive.prototype.sanitiseSingularities.call(this, deltaT);
    if (Math.random() < (this.mass / 10000000) ) this.detonate();
    return this;
};
// --

// -- Like a particle but drawn with an image & explodes on destruction
const Graphic                     = function(x, y, vx, vy, size, angle, spin, density){
    this.base = Particle;
    this.offSet = 0;
    this.base(x, y, vx, vy, size, spin, 0, density);
    this.showPath = false;
};
Graphic.prototype               = Object.create(Particle.prototype);
Graphic.prototype.constructor   = Particle;
Graphic.prototype.draw          = function(){
    let grad;
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
    if (this.showThrustOrgs) {
        // let horizontalActuation = 0;
        const horizontalActuation   = Math.max(this.enginesActive.goLeft || 0, this.enginesActive.goRight || 0);
        const verticalActuation     = Math.max(this.enginesActive.goUp || 0, this.enginesActive.goDown || 0);
        ctx.save();
        ctx.translate(this.x, this.y);
        if (GlobalParams.rotatingFrame) {ctx.rotate(GlobalParams.theta);}
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillRect( - this.size - 1,  - this.size - 15, 2 * this.size + 2, 10);
        ctx.fillRect( - this.size - 15,  - this.size - 1, 10, 2 * this.size + 2);
        ctx.fillStyle = "rgb(" + (255 - this.enginesActive.goLeft?255:0) + "," + (255 - this.enginesActive.goRight?255:0) + ",0)";
        ctx.fillRect( - this.size,  - this.size -14, 2 * this.size * horizontalActuation, 8);
        ctx.fillStyle = "rgb(" + (255 - this.enginesActive.goUp?255:0) + "," + (255 - this.enginesActive.goDown?255:0) + ",0)";
        ctx.fillRect( - this.size-14,  - this.size, 8, 2 * this.size * verticalActuation);
        ctx.restore();
    }
    if (this.showPath) { // Show trace of where we'll travel in next 1000ms (under current acceleration)
        const maxTimeSteps = 500;
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
        for (let dT = 1; dT < maxTimeSteps; dT = dT+50){
            ctx.lineTo(this.x + (this.vx + 0.5 * this.ax * dT) * dT, this.y + (this.vy + 0.5 * this.ay * dT) * dT);
        }
        ctx.stroke();
    }
    if (this.engeryField && this.sampleData && this.sampleData.seperation){
        grad = ctx.createRadialGradient(this.x, this.y, 0, this.target.x, this.target.y, this.sampleData.seperation);
        grad.addColorStop(0, "yellow");
        grad.addColorStop(0.5, "transparent");
        grad.addColorStop(1, "transparent");
        // grad.addColorStop(1, "yellow");
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x + this.sampleData.x/2, this.y+ this.sampleData.y/2, this.sampleData.seperation/2, 0, 2 * Math.PI, false);
        ctx.fillStyle = grad;
        ctx.fill();
    }
    return this; // chainable
};
Graphic.prototype.explode       = function(){
    Particle.prototype.explode.call(this);
    Bomb.prototype.detonate.call(this);
    if (this.baddySpawnTimer)   {clearInterval(this.baddySpawnTimer);}
    if (this.selfDestructTimer) {clearTimeout(this.selfDestructTimer);}
    if (this instanceof Ship)   {sound(tracks.Explosion, Math.min(0.2, this.size / 200));}
    return this; // chainable
};
// --

// Game objects - based on Graphics. Have active controls and specific actions
const Asteroid                    = function(x, y, vx, vy, size, spin, density){
    this.base = Graphic;
    this.base(x, y, vx, vy, size || 100, 0, spin, density || 10);
    this.gameClass  = 'asteroid';
    this.image      = asteroid;
    this.scale      = asteroid.scale;
    this.showPath   = false;
    this.restitution= 0.25;
    if (!size) this.energy = 0.01;// this.energy *= 10; // Fudge to stop all exploding
};
Asteroid.prototype              = Object.create(Graphic.prototype);
Asteroid.prototype.constructor  = Graphic;

const Moon                    = function(x, y, vx, vy, size, spin, density){
    this.base = Asteroid;
    this.base(x, y, vx, vy, size, 0, density || 100);
    this.gameClass  = 'moon';
    this.image      = moon;
    this.scale      = moon.scale;
    this.showPath   = false;
    // this.restitution= 1;
    if (!size) this.energy = 0.01;// this.energy *= 10; // Fudge to stop all exploding
    // this.energy = (1/200000000) * this.mass;
};
Moon.prototype              = Object.create(Asteroid.prototype);
Moon.prototype.constructor  = Asteroid;

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
Ship.prototype.fireProjectiles       = function(engine){
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
    gameObjects.push(projectile);
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
Ship.prototype.updateForces                 = function(deltaT){
    Graphic.prototype.updateForces.call(this);
    // NOTE : Thrust acceleration (deltaV) will be independent of CPS / deltaT, and is correctly calculated on the momentum impulse of the thrust particle
    // However, the actual number of particles injected for animation and game purposes IS CPS / deltaT dependent.

    for (const engine in this.enginesActive) if (this.enginesActive[engine]){
        const impulse = this.fireProjectiles(engine);
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
    const playerKeys  = {
                                        // Daddy/   Finn     [http://keycode.info/ to get keycodes]
        left        : [null, 81, 37],   // q    /   Arrow
        right       : [null, 87, 39],   // w    /   Arrow
        thrust      : [null, 69, 38],   // e    /   Arrow
        fire        : [null, 83, 32],   // s    /   Space
        missile     : [null, 82, 40], // r    /   Down Arrow
        bigRocket   : [null, null, null], // r    /   Down Arrow
        smartBomb   : [null, 84, 77]    // t    /   m
    };
    if (keyState[playerKeys.left[   this.team]])      {this.enginesActive.frontRight= this.enginesActive.backLeft  = 1;}
    if (keyState[playerKeys.right[  this.team]])      {this.enginesActive.frontLeft = this.enginesActive.backRight = 1;}
    if (keyState[playerKeys.thrust[ this.team]])      {this.enginesActive.mainJet   = 1;    sound(tracks.Thrust, 0.5, 1.5);}
    if (keyState[playerKeys.fire[   this.team]])      {this.enginesActive.hoseGun   = 1;    sound(tracks.LaserHose, 0.5, 0.5);}
    if (keyState[playerKeys.smartBomb[ this.team]])   {this.launchCannonWhenReady();        sound(tracks.Stinger, 0.5);}
    if (keyState[playerKeys.missile[this.team]])      {this.launchMissileWhenReady();       sound(tracks.Stinger, 0.5);}
    if (keyState[playerKeys.bigRocket[this.team]])    {this.launchRocketWhenReady();        sound(tracks.BigRocket, 0.5);}
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
    this.sampleData     = new Interaction();
};
RobotShip.prototype                 = Object.create(Ship.prototype);
RobotShip.prototype.constructor     = Ship;
RobotShip.prototype.canclePreviousControl       = function(){
    Ship.prototype.getPilotCommand.call(this);
    this.engeryField = false;
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
RobotShip.prototype.resolveToThisTarget         = function(target){
    const sampleData = new Interaction(); // We want to keep this data
    sampleData.full(this, target);
    // sampleData.ourTrajectory                    = getAngle(this.vx, this.vy);
    sampleData.approachVector                       = {x:this.vx - target.vx, y:this.vy - target.vy};
    sampleData.approachAngle                        = getAngleV(sampleData.approachVector);
    // sampleData.ourSpeedInTargetFrameOfRef       = modulus( this.vx - target.vx, this.vy - target.vy);
    // sampleData.closingSpeed                      = modulus(this.vx - target.vx, this.vy - target.vy);
    sampleData.angleToTarget                        = getAngleV(sampleData);
    // sampleData.deflectionAngleToTarget          = normaliseAnglePItoMinusPI(sampleData.absoluteAngleToTarget - sampleData.ourTrajectory);
    // sampleData.deflectionAngleToMovingTarget    = normaliseAnglePItoMinusPI(sampleData.absoluteAngleToTarget - sampleData.ourTrajectoryInTargetFrameOfRef);
    // sampleData.orientationAgleToTarget          = normaliseAnglePItoMinusPI(sampleData.absoluteAngleToTarget - this.angle);
    return sampleData;
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

    const angleToMinimiseSpin = this.getDeflectionToIntercept(target, deltaT) - this.angleToTarget;

    const kP = 0.001;
    const kD = 1000 * kP;
    const response = {
        x: kP * (target.x - this.x) + kD * (target.vx - this.vx) + 0.5 * unitVectorFromAngle(angleToMinimiseSpin).x,
        y: kP * (target.y - this.y) + kD * (target.vy - this.vy) + 0.5 * unitVectorFromAngle(angleToMinimiseSpin).y
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
    // let kP = Math.max(0.05*GlobalParams.universeSize * GlobalParams.universeSize * w*w * dotProduct / sampleData.seperationSqrd, 0.1);
    let kP = Math.max(w * dotProduct / sampleData.seperation, 0.25);
    let kD = Math.max(w * dotProduct / sampleData.seperation, 0.01);

    let kpTerm = constraintHalfPiToMinusHalfPi(err * kP);
    let errDot = (err - (sampleData.lastErr || 0)) / deltaT;
    sampleData.lastErr = err;
    let kdTerm = Math.atan(errDot * kD);
    let deflectionAngle = constraintHalfPiToMinusHalfPi(kpTerm + kdTerm);
    let actuationAngle = angleToTarget + (dotProduct > 0 ? deflectionAngle:0);
    // console.log(displayAsPI(errDot) +"\t\t\t"+displayAsPI(err) +"\t\t\t"+ displayAsPI(dotProduct) +"\t\t\t"+ displayAsPI(kP) +"\t\t\t"+ displayAsPI(kpTerm) +"\t\t\t"+ displayAsPI(kdTerm) +"\t\t\t"+ displayAsPI(deflectionAngle) +"\t\t\t"+ displayAsPI(kpTerm + kdTerm - deflectionAngle));
    this.angleToTarget = angleToTarget;
    return actuationAngle;
};
RobotShip.prototype.PDinnerLoop_getThrustAngleForInterceptToTarget  = function(deltaT){
    const kP = 0.05 * this.mass / this.getForceAvailable('mainJet');
    const kD = 500 * kP; // NOT CLEAR HOW TO SET kD
    const theta   = this.sampleData.deflectionAngleToMovingTarget;
    // Simple fudge if travelling away from target AND YET APPEARS TO ENABLE CORRECT REVERSE ORIENTATION FOR OVERSHOOT
    if(theta >  Math.PI/2) theta = +Math.PI - theta;
    if(theta < -Math.PI/2) theta = -Math.PI - theta;
    // --
    const lastErr = this.lastSampleData.err_interceptEffort;

    const approachSpeed = this.sampleData.ourSpeedInTargetFrameOfRef;
    const err         = (approachSpeed < 0.25) ? approachSpeed * theta : approachSpeed * Math.tan(theta); // The quantiy we want to minimise to ensure a CONTROLLABLE intercept [closest approach of current trajectory / time to closest approach]
    const errDot      = (err - lastErr || 0) / deltaT;
    const response    = kP * err + kD * errDot;
    if (isNaN(response))response = 0;
    if (response > +1)  response = +1;
    if (response < -1)  response = -1;
    const desiredAngleForThrust = this.sampleData.absoluteAngleToTarget + response * Math.PI / 2;

    this.sampleerr_interceptEffort = err;
    return desiredAngleForThrust;
};
RobotShip.prototype.resample = function(){
    this.lastSampleData = this.sampleData.copy();
    this.sampleData     = this.resolveToThisTarget(this.target);
};

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
    if (!this.activateWhenClearOf(this.parent)) return;
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost // Don't forget we don't retarget once locked until dead
    this.actuateOrthoganal(this.PDorthogalReponseToLandMinimiseSpin(this.target, deltaT));
    if (this.sampleData.seperation < this.size * 15){
        // console.log("BANG");
        // this.explode();
        this.engeryField = true;
        this.target.energy -= 0.01;// * (1 - this.sampleData.seperation / (this.size * 15));
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
        this.target.energy -= 0.01;// * (1 - this.sampleData.seperation / (this.size * 15));
    }else {
        this.engeryField = false;
    }
    // console.log(this.sampleData.seperation);
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
    if (!this.activateWhenClearOf(this.parent)) return;
    if (gameObjects.indexOf(this.target) === -1) {this.getTarget();} // Get target if never had one OR lost
    this.fullLoopRotational(this.getDeflectionToIntercept(this.target, deltaT), deltaT);
    this.enginesActive.mainJet = 1;//Math.min(1, Math.cos(err)); // Adjust this for power
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
    this.projectileEngines.mainJet.projectileSize   *= 1.25;
    // this.projectileEngines.frontLeft.projectileSize *= 0.8;
    // this.projectileEngines.frontRight.projectileSize*= 0.8;
    // this.projectileEngines.backRight.projectileSize *= 0.8;
    // this.projectileEngines.backLeft.projectileSize  *= 0.8;
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
    this.resample();
    this.PDinnerLoop_OrientationControlForDesiredAngle(this.PDinnerLoop_getThrustAngleForInterceptToTarget(deltaT), deltaT);
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
    this.resample();
    // this.othoganolThrustToReduceVelocityDeltaError(deltaT);
};

// -- Interaction is used to resolve to objects, and refered to by collide, stretch, attract
const Interaction                     = function(){
    Primitive.call(this);
};
Interaction.prototype               = Object.create(Primitive.prototype);
Interaction.prototype.constructor   = Primitive;
Interaction.prototype.copy          = function(){
    const copy = new Interaction();
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
const Wall                            = function(){
    const density = 10000;
    this.base = Particle;
    this.base(0,0,0,0,200,0, 0, density);
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
