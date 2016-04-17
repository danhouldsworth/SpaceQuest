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
    this.size   = size  || 0;
    this.angle  = angle || 0;
    this.spin   = spin  || 0;
};
Primitive.prototype.speed    = function (){
    var speed = modulus(this.vx, this.vy);
    return speed;
};
Primitive.prototype.update   = function(deltaT){
    // -- Modify speed due to gravity (& other field forces)
    this.vx     += this.ax * deltaT;
    this.vy     += (this.ay + this.gravity) * deltaT;
    // -- Update position based on speed
    this.x      = this.x + this.vx * deltaT;
    this.y      = this.y + this.vy * deltaT;
    this.angle  = this.angle + this.spin * deltaT;
    // -- Normalise angle to 0<theta<2PI
    this.angle = (Math.PI * 2 + this.angle) % (Math.PI * 2);
    // --
    return this;
};
Primitive.prototype.stabilise= function() {
    // while (this.speed( > GlobalParams.speedCap){
        this.vx     *= 0.99;
        this.vy     *= 0.99;
        this.spin   *= 0.99;
    // }
    return this; // chainable
};

// -- Particle is a subset of Primitive. It has density (& therefor mass), restituion and friction - and so can interact with other gameObjects.
var Particle                = function(x, y, vx, vy, size, spin){
    this.base = Primitive;
    this.base(x, y, vx, vy, size, Math.PI / 2, spin);
    this.gameClass      = 'particle';
    this.density = 1;
    this.gravity        = GlobalParams.gravity;
    this.boundary_flag  = GlobalParams.boundary_flag;
    this.restitution    = 1;
    this.friction       = 20;
    this.calcMass     = function (){
        this.mass = 3 * this.size * this.size * this.density;
        return this;
    };
    this.calcMass();
    this.energy         = 1; // Consider it adhesion
};
Particle.prototype              = new Primitive();
Particle.prototype.collide      = function(that){

    // that.impulseModulus = 0;
    // var oldvx = that.vx || 0;
    // var oldvy = that.vy || 0;

    if (this === that || that.ephemeral) return false;

    if (interaction.near(this, that) && interaction.touching(this, that)){

        if (this.ephemeral && that instanceof Graphic) {
            this.size += 0.1; this.calcMass();
            that.size -= 0.1; that.calcMass();
            return;
        }

        interaction.resolve(this, that);

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
            var thatAcc = antiSqueezeForce * this.mass / (this.mass + that.mass);
            var thisAcc = antiSqueezeForce - thatAcc;
            this.x += -thisAcc * cos_theta;
            this.y += -thisAcc * sin_theta;
            that.x +=  thatAcc * cos_theta;
            that.y +=  thatAcc * sin_theta;
        }

        switch (that.gameClass){
            case 'bullet'   : if (this.gameClass !== 'bullet') {this.energy -= that.damagePts / this.mass;}                 break;
            case 'bomb'     : if (this.gameClass !== 'bomb')   {this.energy -= that.damagePts / this.mass;}                 break;
            case 'fireball' :
            case 'missile'  : if (this instanceof Graphic)     {this.energy -= that.damagePts / this.mass; that.explode();} break;
            case 'wall'     : if (this.gameClass === 'missile' || this.gameClass === 'fireball') {this.explode();}          break;
        }
        switch (this.gameClass){
            case 'bullet'   : if (that.gameClass !== 'bullet') {that.energy -= this.damagePts / that.mass;}                 break;
            case 'bomb'     : if (that.gameClass !== 'bomb')   {that.energy -= this.damagePts / that.mass;}                 break;
            case 'fireball' :
            case 'missile'  : if (that instanceof Graphic)     {that.energy -= this.damagePts / that.mass; this.explode();} break;
            case 'wall'     : if (that.gameClass === 'missile' || that.gameClass === 'fireball') {that.explode();}          break;
        }

        return true;
    }
    return false;
};
Particle.prototype.boundary     = function() {
    var w = gameArea.width,
        h = gameArea.height;

    if (this.boundary_flag == -1){
        if (this.x < this.size){
            wall.clear();
            wall.y      = this.y;
            wall.x      = -wall.size;
            this.collide(wall);
        }
        if (this.x > (w - this.size)){
            wall.clear();
            wall.y      = this.y;
            wall.x      = w + wall.size;
            this.collide(wall);
        }
        if (this.y < this.size){
            wall.clear();
            wall.x = this.x;
            wall.y = -wall.size;
            this.collide(wall);
        }
        if (this.y > (h - this.size)){
            wall.clear();
            wall.x      = this.x;
            wall.y      = h + wall.size;
            this.collide(wall);
        }

      } else if (this.boundary_flag == 1){
        while (this.x < this.size){
            this.x += w;
        }
        while (this.x > w){
            this.x -= w;
        }
        while (this.y < this.size){
            this.y += h;
        }
        while (this.y > h){
            this.y -= h;
        }
    }
    return this; // chainable
};
Particle.prototype.draw         = function(){
    this.calcColour();
    draw_ball(this.x, gameArea.height - this.y, this.size, this.red, this.green, this.blue);
    return this; // chainable
};
Particle.prototype.explode = function(){
    gameObjects.splice(gameObjects.indexOf(this),1);
};
Particle.prototype.getPilotCommand = function(deltaT){
    return this; // chainable
};

var Star = function(x, y, vx, vy, size){
    this.base = Particle;
    this.base( Math.random() * w, Math.random() * h, Math.random() / 5, 0, Math.random() * 5, 0);
    this.gravity = 0;
    this.boundary_flag = 1;
};
Star.prototype = new Particle();
Star.prototype.draw = function(){
    ctxStars.beginPath();
    ctxStars.arc(this.x,h-this.y,this.size, 0, 2 * Math.PI, false);
    ctxStars.fillStyle = "rgb("+Math.round(this.size*40)+","+Math.round(this.size*40)+","+Math.round(this.size*40)+")";
    ctxStars.fill();
};


// -- Game objects - based on gameObjects. They damage points for collisions, and know their parent.
var Bullet              = function(x, y, vx, vy, size, parent){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    this.gameClass      = 'bullet';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = 2;
    this.restitution    = 0;
    this.friction       = 100;
    this.calcColour = function(){
        this.red    = (this.parent.team % 2) ? 255                        : 255;
        this.green  = (this.parent.team % 2) ? Math.floor(this.size*100)  : 128;
        this.blue   = (this.parent.team % 2) ? Math.floor(this.size*100)  : Math.floor(this.size*100);
    };
};
Bullet.prototype        = new Particle();

var Thrust              = function(x, y, vx, vy, size, parent){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    this.gameClass      = 'thrust';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = 0;
    this.restitution    = 0;
    this.friction       = 100;
    this.calcColour = function(){
        this.red    = (this.parent.team % 2) ? Math.floor(this.size*100) : Math.floor(this.size*100);
        this.green  = (this.parent.team % 2) ? Math.floor(this.size*100) : 255;
        this.blue   = (this.parent.team % 2) ? 255                       : Math.floor(this.size*100);
    };
};
Thrust.prototype        = new Particle();

var Bomb                = function(x, y, vx, vy, size, parent){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    this.gameClass      = 'bomb';
    this.parent         = parent;
    this.team           = parent.team;
    this.damagePts      = 15;
    this.restitution    = 0;
    this.friction       = 100;
    this.calcColour = function(){
        this.red    = 255;
        this.green  = 255;
        this.blue   = Math.floor(this.size*50);
    };
};
Bomb.prototype          = new Particle();
Bomb.prototype.stabilise = function(){
    if (Math.random() < (this.size*this.size/100000) ){
        var numberOfBombs   = 0    + (this.speed() * 5 + this.size * this.density);
        var bombSpeed       = 0.5   + (this.speed() * 0.5);
        for(var bombPiece = 1; bombPiece < numberOfBombs; bombPiece++) {
            gameObjects.push(new Bomb(
                this.x + this.size * Math.random() * Math.cos(2 * Math.PI * numberOfBombs / bombPiece),
                this.y + this.size * Math.random() * Math.sin(2 * Math.PI * numberOfBombs / bombPiece),
                bombSpeed * Math.cos(2 * Math.PI * numberOfBombs / bombPiece),
                bombSpeed * Math.sin(2 * Math.PI * numberOfBombs / bombPiece),
                Math.random() * this.size,
                this
            ));
        }
    }
    return this;
}
// --

// -- Like a particle but drawn with an image
var Graphic             = function(x, y, vx, vy, size, spin){
    this.base = Particle;
    this.offSet = 0;
    this.base(x, y, vx, vy, size, spin);
};
Graphic.prototype       = new Particle();
Graphic.prototype.draw  = function(){
    ctx.save();
    ctx.translate(this.x, h-this.y);
    ctx.rotate(this.offSet - this.angle);
    ctx.drawImage(this.image, -this.size, -this.size, 2 * this.size, 2 * this.size);
    ctx.restore();
    return this; // chainable
};
Graphic.prototype.explode = function(){
    Particle.prototype.explode.call(this);
    var numberOfBombs   = 10    + (this.speed() * 5 + this.size * this.density);
    var bombSpeed       = 0.1   + (this.speed() * 0.5);
    for(var bombPiece = 1; bombPiece < numberOfBombs; bombPiece++) {
        gameObjects.push(new Bomb(
            this.x + this.size * Math.random() * Math.cos(2 * Math.PI * numberOfBombs / bombPiece),
            this.y + this.size * Math.random() * Math.sin(2 * Math.PI * numberOfBombs / bombPiece),
            bombSpeed * Math.cos(2 * Math.PI * numberOfBombs / bombPiece),
            bombSpeed * Math.sin(2 * Math.PI * numberOfBombs / bombPiece),
            Math.random() * this.size + 1,
            this
        ));
    }
    if (this.baddySpawnTimer) {clearInterval(this.baddySpawnTimer);}
    return this; // chainable
};
// --

// Game objects - based on Graphics. Have active controls and specific actions
var Asteroid            = function(x, y, vx, vy, size, spin){
    this.base = Graphic;
    this.image = asteroid;
    this.base(x, y, vx, vy, size, spin);
};
Asteroid.prototype      = new Graphic();

var Fireball            = function(x, y, vx, vy, parent){
    this.base = Graphic;
    this.image = fireball;
    this.parent = parent;
    this.team   = parent.team;
    this.base(x, y, vx, vy, parent.size / 3, 0);
    this.damagePts      = 1000;
    this.density        *= 10;
    this.calcMass();
    this.gameClass      = 'fireball';
};
Fireball.prototype      = new Graphic();
Fireball.prototype.explode = function(){
    Graphic.prototype.explode.call(this);
    // this.parent.longRangeGunHot = false;
    // experimentText("Cannon", this.x, this.y);
};
Fireball.prototype.stabilise = function(){
    return this;
};


var Ship                        = function(x,y,version){
    this.base = Graphic;
    this.base(x, y, 0, 0, 40, 0);
    this.gameClass           = 'ship';
    this.showEnergyBar  = true;
    this.player         = version || 1;
    this.image          = spaceShip[this.player];
    this.offSet         = spaceShip[this.player].drawingOffsetAngle;
    this.team           = version;
    this.restitution    = 0;
    this.friction       = 0;
    this.thrust         = 5;
    this.thrustRate     = 1;
    this.sideThrust     = 4;
    this.fireRate       = 10;
};
Ship.prototype                  = new Graphic();
Ship.prototype.draw             = function(){
    Graphic.prototype.draw.call(this);
    if (this.showEnergyBar) {
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillRect(this.x - this.size - 1, h - this.y + this.size - 1, 2 * this.size + 2, 10);
        ctx.fillStyle = "rgb(" + (255 - Math.round(this.energy * 200)) + "," + (55 + Math.round(this.energy * 200)) + ",0)";
        ctx.fillRect(this.x - this.size, h - this.y + this.size, 2 * this.size * this.energy, 8);
    }
    return this; // chainable
};
Ship.prototype.spinThrusters    = function(deltaT, direction){
    var sideThrustSpeed = 0.1;
    var sideThrustMass  = Math.max(this.size / 15 - 1,1.5);
    this.spin += deltaT * direction * this.sideThrust / (this.mass * this.size); // proxy for I
    gameObjects.push(new Thrust(
        this.x + direction * 0.95* this.size * Math.sin(this.angle + direction * 1.3) + Math.random()-0.5,
        this.y - direction * 0.95* this.size * Math.cos(this.angle + direction * 1.3) + Math.random()-0.5,
        +direction * sideThrustSpeed * Math.sin(this.angle + 0.1*Math.random()-0.05),
        -direction * sideThrustSpeed * Math.cos(this.angle + 0.1*Math.random()-0.05),
        sideThrustMass,
        this
    ));
    gameObjects.push(new Thrust(
        this.x - direction * 0.95* this.size * Math.sin(this.angle + direction * 1.3) + Math.random()-0.5,
        this.y + direction * 0.95* this.size * Math.cos(this.angle + direction * 1.3) + Math.random()-0.5,
        -direction * sideThrustSpeed * Math.sin(this.angle + 0.1*Math.random()-0.05),
        +direction * sideThrustSpeed * Math.cos(this.angle + 0.1*Math.random()-0.05),
        sideThrustMass,
        this
    ));
    return this; // chainable
};
Ship.prototype.mainThrusters    = function(deltaT){
    var thrustSpeed = 0.2;
    var thrustMass  = Math.max(this.size / 10 - 1,2);
    // this.vx += (deltaT * this.thrust / this.mass) * Math.cos(this.angle);
    // this.vy += (deltaT * this.thrust / this.mass) * Math.sin(this.angle);
    this.ax = (this.thrust / this.mass) * Math.cos(this.angle);
    this.ay = (this.thrust / this.mass) * Math.sin(this.angle);
    for(var i = 0;i < this.thrustRate; i++) {gameObjects.push(new Thrust(
        this.x - 1.1* this.size * Math.cos(this.angle) + Math.random() - 0.5,
        this.y - 1.1* this.size * Math.sin(this.angle) + Math.random() - 0.5,
        -thrustSpeed * Math.cos(this.angle + 0.1 * Math.random() - 0.05),
        -thrustSpeed * Math.sin(this.angle + 0.1 * Math.random() - 0.05),
        thrustMass,
        this
    ));}
    return this; // chainable
};
Ship.prototype.fireGun          = function(deltaT){
    var bulletSpeed = 0.5;
    var bulletMass  = Math.max(this.size / 10 - 1, 2);
    for(var i = 0;i < this.fireRate; i++){
        gameObjects.push(new Bullet(
            this.x + 1.3 * this.size * Math.cos(this.angle) + 4 * Math.random() - 2,
            this.y + 1.3 * this.size * Math.sin(this.angle) + 4 * Math.random() - 2,
            bulletSpeed * Math.cos(this.angle + 0.1 * Math.random() - 0.05),
            bulletSpeed * Math.sin(this.angle + 0.1 * Math.random() - 0.05),
            bulletMass,
            this
        ));
    }
    return this; // chainable
};
Ship.prototype.fireMissile      = function(side){
    var missile = new Missile(
        this.x + 1.4 * side * this.size * Math.sin(this.angle),
        this.y - 1.4 * side * this.size * Math.cos(this.angle),
        this
    );
    missile.target = gameObjects[2];
    missile.orientate(side/10);
    missile.getTarget();
    // missile.target = gameObjects[gameObjects.length-1];
    missile.target.enemyLock = true;
    gameObjects.push(missile);
    return this; // chainable
};
Ship.prototype.fireCanonBall   = function(){
    if (this.longRangeGunHot === true) return;
    this.longRangeGunHot = true;
    this.cannonCoolTimer = (function(thisShip){setTimeout(function(){thisShip.longRangeGunHot = false;}, 1000);})(this);
    var bulletSpeed = 0.5;
    gameObjects.push(new Fireball(
        this.x + 1.5 * this.size * Math.cos(this.angle),
        this.y + 1.5 * this.size * Math.sin(this.angle),
        this.vx + bulletSpeed * Math.cos(this.angle),
        this.vy + bulletSpeed * Math.sin(this.angle),
        this
    ));
    return this; // chainable
};
Ship.prototype.getPilotCommand  = function(deltaT){
    // http://keycode.info/
    var playerKeys  = {
        left    : [null,81,37],   //       q    Arrow
        right   : [null,87,39],   //       w    Arrow
        thrust  : [null,69,38],   //       e    Arrow
        fire    : [null,83,32],   //       s    space
        missile : [null,null,40 ],   //       r
        cannon  : [null,82, null]    //            Down Arrow
    };
    if (keyState[playerKeys.left[   this.player]])      {this.spinThrusters(deltaT, 1);}
    if (keyState[playerKeys.right[  this.player]])      {this.spinThrusters(deltaT, -1);}
    if (keyState[playerKeys.thrust[ this.player]])      {this.mainThrusters(deltaT);} else {this.ax = this.ay = 0;}
    if (keyState[playerKeys.fire[   this.player]])      {this.fireGun();}
    if (keyState[playerKeys.cannon[ this.player]])      {
        // this.missleCoolTimer = (function(thisShip){setTimeout(function(){thisShip.missleLaunchersHot = false;}, 500);})(this);
        this.fireCanonBall();
    }
    if (keyState[playerKeys.missile[this.player]] && !this.missleLaunchersHot) {
        this.missleLaunchersHot = true;
        this.missleCoolTimer = (function(thisShip){setTimeout(function(){thisShip.missleLaunchersHot = false;}, 500);})(this);
        this.fireMissile(1);
        this.fireMissile(-1);
    }
    return this; // chainable
};
Ship.prototype.stabilise        = function() {
    this.vx     *= 0.999;
    this.vy     *= 0.999;
    this.spin   *= 0.99;
    return this; // chainable
};

var Baddy                       = function(x,y){
    this.base = Ship;
    this.base(x, y);
    this.image      = bombBaddy;
    this.offSet     = bombBaddy.drawingOffsetAngle;
    this.gameClass      = 'baddy';
    this.team           = 3;
    this.angle          = 3 * Math.PI/2;
    this.fireRate       = 3;
    this.size           *= 0.7;
    this.calcMass();
    this.thrust         *= 0.25;
    // this.sideThrust = 25;
};
Baddy.prototype                 = new Ship();
Baddy.prototype.getTarget       = function(){
    if (gameObjects.length === 1) {
        this.target = this;
        return;
    }
    // Hacky! Limited to 2 players
    this.target = (gameObjects[1] === this || gameObjects[1] === this.parent) ? gameObjects [0] : gameObjects[1];
    interaction.near(this, this.target);
    interaction.touching(this, this.target);
    this.seperationSqrd = interaction.seperationSqrd;
    this.target = (gameObjects[0] === this || gameObjects[0] === this.parent) ? gameObjects [1] : gameObjects[0];
    interaction.near(this, this.target);
    interaction.touching(this, this.target);
    if (interaction.seperationSqrd > this.seperationSqrd) {
        this.target = gameObjects[1];
    }
    return this; // chainable
};
Baddy.prototype.resolveTarget   = function(){
    interaction.near(this, this.target);
    interaction.touching(this, this.target);
    interaction.resolve(this, this.target);
    interaction.angle = Math.atan(interaction.vector.y / interaction.vector.x);
    if (interaction.vector.y >= 0){
        if (interaction.vector.x >= 0) interaction.angle += 0;
        if (interaction.vector.x < 0)  interaction.angle += Math.PI;
    } else if (interaction.vector.y < 0){
        if (interaction.vector.x < 0)  interaction.angle += Math.PI;
        if (interaction.vector.x >= 0) interaction.angle += Math.PI * 2;
    }
    this.angleToTarget = interaction.angle - this.angle;
    this.angleToTarget = (Math.PI * 2 + this.angleToTarget) % (Math.PI * 2);
    return this; // chainable
};
Baddy.prototype.getPilotCommand = function(deltaT){
    this.getTarget();
    this.resolveTarget();
    if      (this.angleToTarget <= Math.PI - 0.1){this.spinThrusters(deltaT,  1);}
    else if (this.angleToTarget >= Math.PI + 0.1){this.spinThrusters(deltaT, -1);}
    var engagementDistance = this.target.size + this.size * 5;
    if (interaction.seperation > engagementDistance){
        if (Math.random() < 0.3 * (interaction.seperation / engagementDistance) ) {this.mainThrusters(deltaT);}
        if ((this.angleToTarget < 0.1) || (this.angleToTarget > (Math.PI * 2 - 0.1))) {
            this.fireCanonBall();
        }
    } else {
        this.fireGun(deltaT);
    }
    return this; // chainable
};

var Missile                     = function(x, y, parent){
    this.base = Baddy;
    this.base(x,y);
    this.gameClass      = 'missile';
    this.parent         = parent;
    this.team           = parent.team;
    this.showEnergyBar  = false;

    this.damagePts      = 500;
    this.size           = parent.size / 3;
    this.sideThrust     *= 0.1;
    this.thrust         *= 2;
    this.thrustRate     *= 4;
    this.density        *= 4;
    this.calcMass();
};
Missile.prototype                   = new Baddy;
Missile.prototype.getPilotCommand   = function(deltaT){
    if (!this.target) {
        this.energy = 0;
        return;
    }
    interaction.near(       this, this.parent);
    interaction.touching(   this, this.parent);
    interaction.resolve(    this, this.parent);
    if (interaction.seperation > (this.parent.size * 2)){
        this.resolveTarget().mainThrusters(deltaT);
        if      (this.angleToTarget <= Math.PI - 0.1){this.spinThrusters(deltaT, 1);}
        else if (this.angleToTarget >= Math.PI + 0.1){this.spinThrusters(deltaT,-1);}
    }
    return this; // chainable
};
Missile.prototype.orientate         = function(side){
    this.angle = this.parent.angle;
    this.vx = this.parent.vx + side * Math.sin(this.parent.angle);
    this.vy = this.parent.vy - side * Math.cos(this.parent.angle);
    return this; // chainable
};
Missile.prototype.stabilise = function(){
    return this;
};
Missile.prototype.draw = function(){
    Graphic.prototype.draw.call(this);
    if (!this.ax || ! this.ay) return this;
    var dT = 1000;
    var grad = ctx.createLinearGradient(this.x, this.y, this.x + (this.vx + 0.5 * this.ax * dT) * dT, h - this.y - (this.vy + 0.5 * this.ay * dT) * dT);
    grad.addColorStop(0, "red");
    grad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.moveTo(this.x, h - this.y);
    ctx.strokeStyle = grad;
    for (dT = 1; dT < 1000; dT = dT+50){
        ctx.lineTo(this.x + (this.vx + 0.5 * this.ax * dT) * dT, h - this.y - (this.vy + 0.5 * this.ay * dT) * dT);
    }
    ctx.stroke();
    return this;
};

var BossBaddy                       = function(x,y){
    this.base   = Baddy;
    this.base(x,y);
    this.image      = bossBaddy;
    this.offSet     = bossBaddy.drawingOffsetAngle;
    this.angle      = Math.PI / 2;
    // this.fireRate   = 5;
    // this.thrust     = 100;
    this.size       = 60;
    this.calcMass();
    (function(parentBaddy){
        // Inside setInterval, this === window  !
        parentBaddy.baddySpawnTimer = setInterval(function(){
            var childBaddy = new Baddy(
                parentBaddy.x - 1.2 * parentBaddy.size * Math.cos(parentBaddy.angle) + 4 * Math.random() - 2,
                parentBaddy.y - 1.2 * parentBaddy.size * Math.sin(parentBaddy.angle) + 4 * Math.random() - 2
                );
            childBaddy.parent = parentBaddy;
            childBaddy.size = parentBaddy.size / 2;
            gameObjects.push(childBaddy);
        }, 5000);
    })(this);
};
BossBaddy.prototype                 = new Baddy;

var GhostBaddy                  = function(x,y){
    this.base   = Baddy;
    this.base(x,y);
    this.ephemeral  = true;
    this.showEnergyBar  = false;
    this.image      = bossBaddy;
    this.offSet     = bossBaddy.drawingOffsetAngle;
    this.angle      = Math.PI / 2;
    this.size       = 70;
    this.calcMass();
};
GhostBaddy.prototype            = new Baddy;
GhostBaddy.prototype.draw       = function(){
    ctx.save();
    ctx.translate(this.x, h-this.y);
    ctx.rotate(this.offSet - this.angle);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(this.image, -this.size, -this.size, 2 * this.size, 2 * this.size);
    ctx.restore();
    return this; // chainable
};
GhostBaddy.prototype.mainThrusters      = function(deltaT, angle){
    var thrustSpeed = 0.2;
    var thrustMass  = 3;
    // this.vx += (this.thrust / this.mass) * Math.cos(angle);
    // this.vy += (this.thrust / this.mass) * Math.sin(angle);
    this.ax = (this.thrust / this.mass) * Math.cos(angle);
    this.ay = (this.thrust / this.mass) * Math.sin(angle);
    gameObjects.push(new Thrust(
        this.x - 1.1* this.size * Math.cos(angle) + Math.random() - 0.5,
        this.y - 1.1* this.size * Math.sin(angle) + Math.random() - 0.5,
        -thrustSpeed * Math.cos(angle + 0.1 * Math.random() - 0.05),
        -thrustSpeed * Math.sin(angle + 0.1 * Math.random() - 0.05),
        thrustMass,
        this
    ));
    return this; // chainable
};
GhostBaddy.prototype.getPilotCommand    = function(deltaT){
    this.getTarget();
    this.resolveTarget();
    if (interaction.y > 0) this.mainThrusters(deltaT, Math.PI * 0.5);
    if (interaction.y < 0) this.mainThrusters(deltaT, Math.PI * 1.5);
    if (interaction.x < 0) this.mainThrusters(deltaT, Math.PI * 1);
    if (interaction.x > 0) this.mainThrusters(deltaT, 0);
    return this; // chainable
};

// -- Interaction is used to resolve to objects, and refered to by collide, stretch, attract
var Interaction                 = function(){
    Primitive.call(this);
};
Interaction.prototype           = new Primitive();
Interaction.prototype.near      = function(P1, P2){
    this.x = P2.x - P1.x;           // Contact Vector
    this.y = P2.y - P1.y;
    this.size = P2.size + P1.size;  // Interaction distance at point of contact
    return ((Math.abs(this.x) <= this.size) && (Math.abs(this.y) <= this.size));
};
Interaction.prototype.touching  = function(P1, P2){
    this.seperationSqrd = this.x * this.x + this.y * this.y;
    this.sizeSqrd       = this.size * this.size;
    return ( this.seperationSqrd <= this.sizeSqrd );
};
Interaction.prototype.resolve = function(P1, P2){

    // Hard coded stability!!! Only 2 1/2px gameObjects colliding could have a sep < 1
    this.seperation = (this.seperationSqrd < 1) ? 1 : Math.sqrt(this.seperationSqrd);

    this.vector = {
        x : this.x / this.seperation,
        y : this.y / this.seperation
    };
    this.resolved = true;
};
Interaction.prototype.clear     = function(){
    this.resolved = false;
};
// --

// -- Wall is a size = 200 Primitive, that only collides.
var Wall                = function(){
    this.base = Particle;
    this.base(0,0,0,0,200,0);
    this.calcMass();
    this.restitution = 0.4;
    this.friction = 0;
    this.gameClass = 'wall';
};
Wall.prototype          = new Primitive();
Wall.prototype.clear    = function() {
    this.x          = 0;
    this.y          = 0;
    this.vx         = 0;
    this.vy         = 0;
    this.angle      = 0;
    this.spin       = 0;
};
// --
//