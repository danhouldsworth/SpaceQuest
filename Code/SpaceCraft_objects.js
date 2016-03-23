"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
/*global interaction, wall, restitution, friction , particles, spaceShips*/
var asteroid    = new Image(); asteroid.src  = "../FinnsArtwork/Asteroid.png";
var fireball    = new Image(); fireball.src  = "../FinnsArtwork/Fireball.png";
var bomb        = new Image(); bomb.src      = "../FinnsArtwork/Bomb.png";
var chaseBaddy  = new Image(); chaseBaddy.src= "../FinnsArtwork/ChaseBaddy_cutout.png";
var bossBaddy   = new Image(); bossBaddy.src = "../FinnsArtwork/BossBaddy_cutout.png"; bossBaddy.drawingOffsetAngle = 0;
var bombBaddy   = new Image(); bombBaddy.src = "../FinnsArtwork/BombBaddy_cutout.png"; bombBaddy.drawingOffsetAngle = Math.PI;
var spaceShip   = [];
spaceShip[1]    = new Image(); spaceShip[1].src = "../FinnsArtwork/SpaceShip.png";        spaceShip[1].drawingOffsetAngle = 0;
spaceShip[2]    = new Image(); spaceShip[2].src = "../FinnsArtwork/ChaseBaddy_cutout.png";spaceShip[2].drawingOffsetAngle = -Math.PI/2;

// -- Basic Primitive Object has Mass and Collide methods ***TO BE CHANGED WITH TRIANGLES***
var Primitive                   = function(x, y, vx, vy, size, angle, spin){
    this.x      = x || 0;
    this.y      = y || 0;
    this.vx     = vx || 0;
    this.vy     = vy || 0;
    this.size   = size  || 0;
    this.angle  = angle || 0;
    this.spin   = spin  || 0;
    this.density = 1;
    this.calcMass();
};
Primitive.prototype.calcMass    = function (){
    this.mass = 3 * this.size * this.size * this.density;
    return this;
};
Primitive.prototype.collide     = function(that){
    // Particle1 = this, Particle2 = that

    if (interaction.near(this, that) && interaction.touching(this, that)){

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
            var anti_squeeze = 0.5 * (interaction.size - interaction.seperation);
            var delta2 = anti_squeeze / (1 + that.mass / this.mass);
            var delta1 = anti_squeeze - delta2;
            this.x += -delta1 * cos_theta;
            this.y += -delta1 * sin_theta;
            that.x +=  delta2 * cos_theta;
            that.y +=  delta2 * sin_theta;
        }

        // Remember the ships are collided with the particles
        switch (that.gameClass){
            case 'bullet'   : if (this.gameClass !== 'bullet')  {this.energy -= 2  / this.mass;}    break;
            // case 'bullet'   : if (that.parent !== this)         {console.log("that.parent !== this");console.log(that.parent);console.log(this);}    break;
            case 'bomb'     : if (this.gameClass !== 'bomb')    {this.energy -= 10 / this.mass;}    break;
            case 'missile'  :     that.energy = -1;              this.energy -= 500 / this.mass;     break;
            // case 'fireball' :     that.energy = -1;              this.energy -= 500 / this.mass;     break;
            case 'wall'     :
                if (this.gameClass === 'missile') {this.energy = -1;}
                else if (this.gameClass === 'fireball') {
                    this.energy = -1;
                    this.parent.longRangeGunHot = false;
                }

                break;
        }
    }
    return this;
};

// -- Particle is a BALL ONLY and a subset of Primitive. It can attract from a distance.
var Particle                = function(x, y, vx, vy, size, spin){
    this.base = Primitive;
    this.base(x, y, vx, vy, size, Math.PI / 2, spin);
    this.gameClass      = 'particle';
    this.gravity        = GlobalParams.gravity;
    this.boundary_flag  = GlobalParams.boundary_flag;
    this.restitution    = 1;
    this.friction       = 20;
    this.energy         = 1;
};
Particle.prototype          = new Primitive();
Particle.prototype.attract  = function(that) {

    // F = Gm1m2/r^2
    var force = distance_force * interaction.mass / (interaction.seperation * interaction.seperation);

    this.vx +=  force * interaction.vector.x / this.mass;
    this.vy +=  force * interaction.vector.y / this.mass;
    that.vx += -force * interaction.vector.x / that.mass;
    that.vy += -force * interaction.vector.y / that.mass;
    this.spin += 0;
    that.spin += 0;
};
Particle.prototype.speed    = function (){
    var speed = modulus(this.vx, this.vy);
    return speed;
};
Particle.prototype.draw     = function(){
    this.calcColour();
    draw_ball(this.x, gameArea.height - this.y, this.size, this.red, this.green, this.blue);
    return this;
};
Particle.prototype.update   = function(){

    // -- Modify speed due to gravity (& other field forces)
    this.vy     += this.gravity;
    // -- Update position based on speed
    this.x      = this.x + this.vx;
    this.y      = this.y + this.vy;
    this.angle  = this.angle + this.spin;
    // -- Normalise angle to 0<theta<2PI
    this.angle = (Math.PI * 2 + this.angle) % (Math.PI * 2);
    // --
    return this;
};
Particle.prototype.stabilise= function() {
    while (this.speed() > GlobalParams.speedCap){
        this.vx *= 0.9;
        this.vy *= 0.9;
    }
    return this;
};
Particle.prototype.boundary = function() {
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
    return this;
};
// --

// -- Particle based game objects
var Bullet              = function(x, y, vx, vy, size, parent){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    this.restitution = 0;
    this.friction = 100;
    this.gameClass = 'bullet';
    this.parent = parent;
    this.player = parent.player;
    this.calcColour = function(){
        this.red    = (this.player % 2) ? 255                        : 255;
        this.green  = (this.player % 2) ? Math.floor(this.size*100)  : 128;
        this.blue   = (this.player % 2) ? Math.floor(this.size*100)  : Math.floor(this.size*100);
    };
};
Bullet.prototype        = new Particle();

var Thrust              = function(x, y, vx, vy, size, parent){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    this.restitution = 0;
    this.friction = 100;
    this.gameClass = 'thrust';
    this.parent = parent;
    this.player = parent.player;
    this.calcColour = function(){
        this.red    = (this.player % 2) ? Math.floor(this.size*100) : Math.floor(this.size*100);
        this.green  = (this.player % 2) ? Math.floor(this.size*100) : 255;
        this.blue   = (this.player % 2) ? 255                       : Math.floor(this.size*100);
    };
};
Thrust.prototype        = new Particle();

var Bomb                = function(x, y, vx, vy, size){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    this.restitution = 0;
    this.friction = 100;
    this.gameClass = 'bomb';
    this.calcColour = function(){
        this.red    = 255;
        this.green  = 255;
        this.blue   = Math.floor(this.size*50);
    };
};
Bomb.prototype          = new Particle();
// --

// -- Add images
var Graphic             = function(x, y, vx, vy, size, spin){
    this.base = Particle;
    this.offSet = 0;
    this.base(x, y, vx, vy, size, spin);
};
Graphic.prototype       = new Particle();
Graphic.prototype.draw  = function(){
    var h = gameArea.height;
    ctx.translate(this.x, h-this.y);
    ctx.rotate(this.offSet - this.angle);
    ctx.drawImage(this.image, -this.size, -this.size, 2 * this.size, 2 * this.size);
    ctx.rotate(this.angle - this.offSet);
    ctx.translate(-this.x, -(h-this.y));
};
// --
// Image based game objects
var Asteroid            = function(x, y, vx, vy, size, spin){
    this.base = Graphic;
    this.image = asteroid;
    this.base(x, y, vx, vy, size, spin);
};
Asteroid.prototype      = new Graphic();

// Image based game objects
var Fireball            = function(x, y, vx, vy, parent){
    this.base = Graphic;
    this.image = fireball;
    this.parent = parent;
    this.base(x, y, vx, vy, 20, 0);
    this.density        *= 10;
    this.calcMass();
    this.gameClass      = 'fireball';
};
Fireball.prototype      = new Graphic();

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
    this.thrust         = 1000;
    this.thrustRate     = 1;
    this.sideThrust     = 10;
    this.fireRate       = 10;
};
Ship.prototype                  = new Graphic();
Ship.prototype.draw             = function(){
    Graphic.prototype.draw.call(this);
    if (this.showEnergyBar) {
        var h = gameArea.height;
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillRect(this.x - this.size - 1, h - this.y + this.size - 1, 2 * this.size + 2, 10);
        ctx.fillStyle = "rgb(" + (255 - Math.round(this.energy * 200)) + "," + (55 + Math.round(this.energy * 200)) + ",0)";
        ctx.fillRect(this.x - this.size, h - this.y + this.size, 2 * this.size * this.energy, 8);
    }
};
Ship.prototype.spinThrusters    = function(direction){
    var sideThrustSpeed = 0.1;
    var sideThrustMass  = Math.max(this.size / 15 - 1,1.5);
    this.spin += direction * this.sideThrust / this.mass;
    particles.push(new Thrust(
        this.x + direction * 0.95* this.size * Math.sin(this.angle + direction * 1.3) + Math.random()-0.5,
        this.y - direction * 0.95* this.size * Math.cos(this.angle + direction * 1.3) + Math.random()-0.5,
        +direction * sideThrustSpeed * Math.sin(this.angle + 0.1*Math.random()-0.05),
        -direction * sideThrustSpeed * Math.cos(this.angle + 0.1*Math.random()-0.05),
        sideThrustMass,
        this
    ));
    particles.push(new Thrust(
        this.x - direction * 0.95* this.size * Math.sin(this.angle + direction * 1.3) + Math.random()-0.5,
        this.y + direction * 0.95* this.size * Math.cos(this.angle + direction * 1.3) + Math.random()-0.5,
        -direction * sideThrustSpeed * Math.sin(this.angle + 0.1*Math.random()-0.05),
        +direction * sideThrustSpeed * Math.cos(this.angle + 0.1*Math.random()-0.05),
        sideThrustMass,
        this
    ));
};
Ship.prototype.mainThrusters    = function(){
    var thrustSpeed = 0.5;
    var thrustMass  = Math.max(this.size / 10 - 1,2);
    this.vx += (this.thrust / this.mass) * Math.cos(this.angle);
    this.vy += (this.thrust / this.mass) * Math.sin(this.angle);
    for(var i = 0;i < this.thrustRate; i++) {particles.push(new Thrust(
        this.x - 1.1* this.size * Math.cos(this.angle) + Math.random() - 0.5,
        this.y - 1.1* this.size * Math.sin(this.angle) + Math.random() - 0.5,
        -thrustSpeed * Math.cos(this.angle + 0.1 * Math.random() - 0.05),
        -thrustSpeed * Math.sin(this.angle + 0.1 * Math.random() - 0.05),
        thrustMass,
        this
    ));}
};
Ship.prototype.fireGun          = function(){
    var bulletSpeed = 3;
    var bulletMass  = Math.max(this.size / 10 - 1,2);
    for(var i = 0;i < this.fireRate; i++){
        particles.push(new Bullet(
            this.x + 1.3 * this.size * Math.cos(this.angle) + 4 * Math.random() - 2,
            this.y + 1.3 * this.size * Math.sin(this.angle) + 4 * Math.random() - 2,
            bulletSpeed * Math.cos(this.angle + 0.1 * Math.random() - 0.05),
            bulletSpeed * Math.sin(this.angle + 0.1 * Math.random() - 0.05),
            bulletMass,
            this
        ));
    }
};
Ship.prototype.fireMissile      = function(side){
    var missile = new Missile(
        this.x + 1.4 * side * this.size * Math.sin(this.angle),
        this.y - 1.4 * side * this.size * Math.cos(this.angle)
    );
    missile.parent = this;
    missile.target = spaceShips[0];
    missile.orientate(side);
    missile.getTarget();
    missile.target.enemyLock = true;
    spaceShips.push(missile);
};
Ship.prototype.getPilotCommand     = function(){
    // This restricts input to the iteration frame rate
    var playerKeys  = {
        left  : [null,37,113-32],   // Arrow      q
        right : [null,39,119-32],   // Arrow      w
        thrust: [null,38,101-32],   // Arrow      e
        fire  : [null,32,115-32],   // space      s 115
        bomb  : [null,66,0]         // b          n/a
    };
    if (keyState[playerKeys.left[this.player]])     {this.spinThrusters(1);}
    if (keyState[playerKeys.right[this.player]])    {this.spinThrusters(-1);}
    if (keyState[playerKeys.thrust[this.player]])   {this.mainThrusters();}
    if (keyState[playerKeys.fire[this.player]])     {this.fireGun();}//mgun.shootRound(10, 0.08);}
    if (keyState[playerKeys.bomb[this.player]] && !this.missleLaunchersHot) {
        this.missleLaunchersHot = true;
        this.missleCoolTimer = (function(thisShip){setTimeout(function(){thisShip.missleLaunchersHot = false;}, 500);})(this);
        this.fireMissile(1);
        this.fireMissile(-1);
    }
};
Ship.prototype.stabilise        = function() {
    this.vx     *= 0.99;
    this.vy     *= 0.99;
    this.spin   *= 0.99;
};

var Baddy                       = function(x,y){
    this.base = Ship;
    this.base(x, y);
    this.image      = bombBaddy;
    this.offSet     = bombBaddy.drawingOffsetAngle;
    this.gameClass      = 'baddy';
    this.angle          = 3*Math.PI/2;
    this.fireRate       = 3;
    this.size           *= .7;
    this.calcMass();
    this.thrust     /= 4;
    // this.sideThrust = 25;
};
Baddy.prototype                 = new Ship();
Baddy.prototype.getTarget           = function(){
    // Hacky! Limited to 2 players
    this.target = (spaceShips[0] === this || spaceShips[0] === this.parent) ? spaceShips [1] : spaceShips[0];
    interaction.near(this, this.target);
    interaction.touching(this, this.target);
    this.seperationSqrd = interaction.seperationSqrd;
    this.target = (spaceShips[1] === this || spaceShips[1] === this.parent) ? spaceShips [0] : spaceShips[1];
    interaction.near(this, this.target);
    interaction.touching(this, this.target);
    if (interaction.seperationSqrd > this.seperationSqrd) {
        this.target = spaceShips[0];
    }
    // --
};
Baddy.prototype.resolveTarget           = function(){
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
};
Baddy.prototype.getPilotCommand    = function(){
    this.getTarget();
    this.resolveTarget();
    if      (this.angleToTarget <= Math.PI - 0.1){this.spinThrusters( 1);}
    else if (this.angleToTarget >= Math.PI + 0.1){this.spinThrusters(-1);}
    if (interaction.seperation > (this.target.size + this.size * 5)){
        this.mainThrusters();
        if ((interaction.seperation > this.size * 5) && ((this.angleToTarget < 0.1) || (this.angleToTarget > Math.PI * 2 - 0.1))) {this.fireLongRange();}
    } else {
        this.fireGun();
    }
};
Baddy.prototype.fireLongRange = function(){
    // this.fireGun();
};

var Missile                   = function(x,y){
    this.base   = Baddy;
    this.base(x,y);
    this.gameClass      = 'missile';
    this.showEnergyBar  = false;
    this.size           /= 2;
    this.sideThrust     /= 3;
    this.thrust         *=2;
    this.thrustRate     = 6;
    this.density        *= 4;
    this.calcMass();
};
Missile.prototype                   = new Baddy;
Missile.prototype.getPilotCommand    = function(){
    if (!this.target) {
        this.energy = 0;
        return;
    }
    interaction.near(this, this.parent);
    interaction.touching(this, this.parent);
    interaction.resolve(this, this.parent);
    if (interaction.seperation > (this.parent.size * 2)){
        this.mainThrusters();
        this.resolveTarget();
        if      (this.angleToTarget <= Math.PI - 0.1){this.spinThrusters( 1);}
        else if (this.angleToTarget >= Math.PI + 0.1){this.spinThrusters(-1);}
    }
};
Missile.prototype.orientate = function(side){
    this.angle = this.parent.angle;
    this.vx = this.parent.vx + side * Math.sin(this.parent.angle);
    this.vy = this.parent.vy - side * Math.cos(this.parent.angle);
};
Missile.prototype.stabilise = function(){};
Missile.prototype.draw      = function(){
    Graphic.prototype.draw.call(this);
    ctx.strokeStyle = 'yellow';
    ctx.rect(this.target.x - this.target.size, h-this.target.y-this.target.size, 2 * this.target.size, 2 * this.target.size);
    ctx.stroke();
};

var BossBaddy                   = function(x,y){
    this.base   = Baddy;
    this.base(x,y);
    this.image      = bossBaddy;
    this.offSet     = bossBaddy.drawingOffsetAngle;
    this.angle      = Math.PI / 2;
    // this.fireRate   = 5;
    // this.thrust     = 100;
    this.size       = 60;
    this.calcMass();
    this.baddySpawn = function(parentBaddy){
        parentBaddy.baddySpawnTimer = setInterval(function(){
            var childBaddy = new Baddy(
                parentBaddy.x - 1.2 * parentBaddy.size * Math.cos(parentBaddy.angle) + 4 * Math.random() - 2,
                parentBaddy.y - 1.2 * parentBaddy.size * Math.sin(parentBaddy.angle) + 4 * Math.random() - 2
                );
            childBaddy.parent = parentBaddy;
            childBaddy.player = parentBaddy.player;
            spaceShips.push(childBaddy);
        }, (parentBaddy.player === 2) ? 5000 : 5000);
    };
};
BossBaddy.prototype             = new Baddy;
BossBaddy.prototype.fireLongRange  = function(){
    if (this.longRangeGunHot === true) return;
    this.longRangeGunHot = true;
    var bulletSpeed = 3;
    particles.push(new Fireball(
        this.x + 1.3 * this.size * Math.cos(this.angle) + 4 * Math.random() - 2,
        this.y + 1.3 * this.size * Math.sin(this.angle) + 4 * Math.random() - 2,
        bulletSpeed * Math.cos(this.angle + 0.1 * Math.random() - 0.05),
        bulletSpeed * Math.sin(this.angle + 0.1 * Math.random() - 0.05),
        this
    ));
};

// -- Elasticon is a subset of Particle. And can stretch() [stronger / different attraction]
var Elasticon               = function(x, y, size){
    this.base = Particle;
    this.base(x, y, 0, 0, size);
    this.restitution = 0;
    this.friction = 20;
    this.attached = false;
    this.calcColour = function(){
        this.red    = Math.round(this.speed() * 30) + 100;
        this.green  = 100;
        this.blue   = 100;
    }
    this.gameClass = 'elasticon';
}
Elasticon.prototype         = new Particle();
Elasticon.prototype.stretch = function(that) {

    if (!interaction.resolved) {
        interaction.touching(this, that);
        interaction.resolve(this, that);
    }

    if (interaction.seperation > snapThreshhold) return;

    interaction.massProduct = this.mass * that.mass;
    interaction.massSum     = this.mass + that.mass;
    // F = m1m2*r/(m1+m2) = ~~ mr/2
    var force = interaction.massProduct * (interaction.seperation - interaction.size) / (interaction.massSum);


    // We could make this more computationally efficient as x and / by mass several times.
    this.vx +=  force * interaction.vector.x / this.mass;
    this.vy +=  force * interaction.vector.y / this.mass;
    that.vx += -force * interaction.vector.x / that.mass;
    that.vy += -force * interaction.vector.y / that.mass;
    // this.spin += 0;
    // that.spin += 0;
};
// -- Attachment is a fixed Ghost of a Elasticon. Targets only ONE Elasticon.
var Attachement             = function(x, y, magnet_number, attachment_number){
    this.size = 5;
    this.base = Elasticon;
    this.base(x, y, this.size);
    elasticons[magnet_number].attached = attachment_number;
    this.restitution = 0;
    this.friction = 100;
};
Attachement.prototype       = new Elasticon();
// --

// -- Interaction is used to resolve to objects, and refered to by collide, stretch, attract
var Interaction                 = function(){
    Primitive.call(this);
};
Interaction.prototype           = new Primitive();
Interaction.prototype.near      = function(P1, P2){
    this.x = P2.x - P1.x;           // Contact Vector
    this.y = P2.y - P1.y;
    this.size = P2.size + P1.size;  // Interaction distance at point of contact
    return ((Math.abs(this.x) < this.size) && (Math.abs(this.y) < this.size));
};
Interaction.prototype.touching  = function(P1, P2){
    this.seperationSqrd = this.x * this.x + this.y * this.y;
    this.sizeSqrd = this.size * this.size;
    return ( this.seperationSqrd <= this.sizeSqrd );
};
Interaction.prototype.resolve   = function(P1, P2){

    this.seperation = Math.sqrt(this.seperationSqrd);

    // Hard coded stability!!!
    this.seperation = Math.max(this.seperation, 1);
    //

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
    Primitive.call(this);
    this.size = 200;
    this.calcMass();
    this.restitution = 0.4;
    this.friction = 1;
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
