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
Primitive.prototype.updateForces = function(){
    // These are cleared at the start of each physics iterations, and before collisions detected
    if (GlobalParams.wind){
        this.ax += this.size * (GlobalParams.wind * (this.y+0.5*GlobalParams.universeSize*h)*(this.y+0.5*GlobalParams.universeSize*h)/(GlobalParams.universeSize*h*GlobalParams.universeSize*h)) / Math.max(10000,this.mass);
    }
    return this;
};
Primitive.prototype.updateVelocities  = function(deltaT){
    // If accelerations are a field, then deltaV per Second is now independent of CPS
    // Likewise if accelerations are atomic impulsive, they have already been scaled down for CPS

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
    // this.spin   *= (1 - deltaT / 1000);
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
    const density = 0.2;
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
    if (this.model && this.model.dataPaths) { // Show trace of where we'll travel in next 1000ms (under current acceleration)
        // const data = this.model.data;
        // ctx.fillStyle=grad;
        for (let pathNum in this.model.dataPaths){
            const dataPath = this.model.dataPaths[pathNum];
            let pts = dataPath.length;
            if (!pts) continue;
            for (let i = 1; i < dataPath.length; i++){
                ctx.lineCap="round";
                ctx.beginPath();
                ctx.strokeStyle = "rgb("+Math.round(30*dataPath[i].speed)+","+Math.round((255-30*dataPath[i].speed))+",0)";
                ctx.lineWidth=Math.max(Math.abs(30 * dataPath[i].deflection) , 5);
                ctx.moveTo(dataPath[i-1].x, dataPath[i-1].y);
                ctx.lineTo(dataPath[i].x, dataPath[i].y);
                ctx.stroke();
            }
            const dT = 8;
            let x = dataPath[0].x + this.model.me.size * 2 + pathNum * 1000;
            for (let i = 0; i < dataPath.length; i++){
                ctx.lineCap="butt";
                ctx.beginPath();
                ctx.strokeStyle = "rgb(255,0,0)";
                ctx.lineWidth=dataPath[i].deltaT;
                ctx.moveTo(x, dataPath[0].y - 900);
                ctx.lineTo(x, dataPath[0].y - 900 + 300*dataPath[i].actuation);
                ctx.stroke();
                ctx.beginPath();
                ctx.strokeStyle = "rgb(0,255,0)";
                ctx.lineWidth=dataPath[i].deltaT;
                ctx.moveTo(x, dataPath[0].y - 300);
                ctx.lineTo(x, dataPath[0].y - 300 + 300*dataPath[i].deflection);
                ctx.stroke();
                ctx.beginPath();
                ctx.strokeStyle = "rgb(255,255,255)";
                ctx.lineWidth=dataPath[i].deltaT;
                ctx.moveTo(x, dataPath[0].y + 300);
                ctx.lineTo(x, dataPath[0].y + 300 + 300000*dataPath[i].rateOfOrbit);
                ctx.stroke();
                ctx.beginPath();
                ctx.strokeStyle = "rgb(0,0,255)";
                ctx.lineWidth=dataPath[i].deltaT;
                ctx.moveTo(x, dataPath[0].y + 900);
                // ctx.lineTo(x, dataPath[0].y + 900 + 100*dataPath[i].dotProduct);
                ctx.lineTo(x, dataPath[0].y + 900 + dataPath[i].seperation/10);
                // ctx.lineTo(x, dataPath[0].y + 900 + 50000*(dataPath[i].speed-dataPath[(i||1)-1].speed)/this.model.me.projectileEngines.mainJet.projectileSize);
                ctx.stroke();
                x += dataPath[i].deltaT;
            }

            ctx.beginPath();
            ctx.strokeStyle = this.model.successfulTrajectorys[pathNum] ? "red" : "white";
            ctx.lineWidth   = this.model.successfulTrajectorys[pathNum] ? 10 : 10;
            const impactRange = this.model.trajectoryCosts[pathNum];
            ctx.rect(dataPath[pts-1].x - impactRange/2, dataPath[pts-1].y - impactRange/2, impactRange, impactRange);
            ctx.stroke();
            if (this.model.successfulTrajectorys[pathNum]){
                ctx.beginPath();
                ctx.strokeStyle = "yellow";
                ctx.rect(this.target.x - this.target.size, this.target.y - this.target.size, 2*this.target.size, 2*this.target.size);
                ctx.stroke();
            }
        }
        // console.log(this.model.trajectoryCosts[i]);
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
        ctx.lineWidth   = 4;
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
    if (this.FinnsRayGun){
        const finnsRayGun = {
            size : this.size * 15,
            x : Math.cos(this.angle) * this.size * 15,
            y : Math.sin(this.angle) * this.size * 15
        };
        grad = ctx.createRadialGradient(this.x, this.y, 0, this.x+finnsRayGun.x, this.y+finnsRayGun.y, finnsRayGun.size);
        grad.addColorStop(0, "red");
        grad.addColorStop(0.5, "transparent");
        grad.addColorStop(1, "transparent");
        // grad.addColorStop(1, "yellow");
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x + finnsRayGun.x/2, this.y + finnsRayGun.y/2, finnsRayGun.size/2, 0, 2 * Math.PI, false);
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