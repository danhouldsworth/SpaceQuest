"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

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
    currentObjects++;
};
Primitive.prototype.calcMass    = function (){
    this.mass = 3 * this.size * this.size;
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

        if (this.name == 'ship' && that.name == 'particle' && that.mass > 1){
            this.energy += 1;
            that.mass -= 1;
        }
        if (this.name == 'ship' && that.name == 'baddy'){
            that.energy += 0.5;
            this.energy -= 0.5;
        }
        if (this.name == 'baddy' && that.name == 'bullet' && that.mass > 1){
            this.energy -= 0.1;
            that.mass -= 1;
        }
        if (this.name == 'baddy' && that.name == 'bomb' && that.mass > 1){
            this.energy -= 0.5;
            that.mass -= 1;
        }
        if (that.name == 'wall'  && (this.name == 'bomb' || this.name == 'bullet' || this.name == 'ship' || this.name == 'baddy') && this.mass > 1){
            this.energy -= this.speed() * 10;
            this.mass -= 1;
        }
    }
};

// -- Particle is a BALL ONLY and a subset of Primitive. It can attract from a distance.
var Particle                = function(x, y, vx, vy, size, spin){
    this.base = Primitive;
    this.base(x, y, vx, vy, size, Math.PI / 2, spin);
    this.calcMass();
    this.restitution = 1;
    this.friction = 20;
    this.energy = 100;
    this.name = 'particle';
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
    draw_ball(this.x, gameArea.height - this.y, this.size, this.red, this.green, this.blue)
};
Particle.prototype.update   = function(drag){

    // -- Modify speed due to gravity (& other field forces)
    this.vy     += gravity;
    // --

    // -- Modify speed due to drag
    if (drag){
        if (this.vx > 0){
            this.vx += Math.max(drag * this.vx * this.speed() / this.mass, -this.vx);
        }
        else {
            this.vx += Math.min(drag * this.vx * this.speed() / this.mass, -this.vx);
        }
        if (this.vy > 0){
            this.vy += Math.max(drag * this.vy * this.speed() / this.mass, -this.vy);
        }
        else {
            this.vy += Math.min(drag * this.vy * this.speed() / this.mass, -this.vy);
        }
    }
    // --

    // -- Update position based on speed
    this.x      = this.x + this.vx;
    this.y      = this.y + this.vy;
    this.angle  = this.angle + this.spin;
    // --

    // -- Normalise angle to 0<theta<2PI
    while (this.angle > Math.PI*2) {
        this.angle -= Math.PI*2;
    }
    // --
};
Particle.prototype.stabilise= function() {
    while (this.speed() > speedCap){
        this.vx *= 0.9;
        this.vy *= 0.9;
    }
};
Particle.prototype.boundary = function() {
    var w = gameArea.width,
        h = gameArea.height;

    if (boundary_flag == -1){
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

    } else if (boundary_flag == 1){
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
};
// --

// -- Particle based game objects
var Bullet = function(x, y, vx, vy, size, player){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    // this.calcMass(); // Surely calculated as part of Particle constructor?
    this.restitution = 0;
    this.friction = 100;
    this.name = 'bullet';
    this.player = player;
    this.calcColour = function(){
        this.red    = (player % 2) ? 255                        : 255;
        this.green  = (player % 2) ? Math.floor(this.size*100)  : 128;
        this.blue   = (player % 2) ? Math.floor(this.size*100)  : Math.floor(this.size*100);
    };
};
Bullet.prototype = new Particle();

var Thrust = function(x, y, vx, vy, size, player){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    // this.calcMass(); // Surely calculated as part of Particle constructor?
    this.restitution = 0;
    this.friction = 100;
    this.name = 'thrust';
    this.player = player;
    this.calcColour = function(){
        this.red    = (player % 2) ? Math.floor(this.size*100) : Math.floor(this.size*100);
        this.green  = (player % 2) ? Math.floor(this.size*100) : 255;
        this.blue   = (player % 2) ? Math.floor(this.size*100) : 255;
    };
}
Thrust.prototype = new Particle();

var Bomb = function(x, y, vx, vy, size){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    this.restitution = 0;
    this.friction = 100;
    this.name = 'bomb';
};
Bomb.prototype = new Particle();
Bomb.prototype.draw = function(){
    var h = gameArea.height;
    draw_ball(
        this.x,
        h - this.y,
        this.size,
        255, 255, Math.floor(this.size*50)
    );
};
// --

// -- Add images
var Graphic             = function(x, y, vx, vy, size, spin){
    this.base = Particle;
    this.offSet = 0;
    this.base(x, y, vx, vy, size, spin);
};
Graphic.prototype       = new Particle();
Graphic.prototype.draw  = function(shade){
    var h = gameArea.height;
    ctx.translate(this.x, h-this.y);
    ctx.rotate(this.offSet - this.angle);
    ctx.drawImage(this.image, -this.size, -this.size, 2 * this.size, 2 * this.size);
    ctx.rotate(this.angle - this.offSet);
    ctx.translate(-this.x, -(h-this.y));
};
// --
// Image based game objects
var Asteroid = function(x, y, vx, vy, size, spin){
    this.base = Graphic;
    this.image = asteroid;
    this.base(x, y, vx, vy, size, spin);
};
Asteroid.prototype = new Graphic();

var Ship = function(x,y,version){
    this.player = version || 1;
    this.base = Graphic;
    this.base(x, y, 0, 0, 40, 0);
    this.restitution = 0;
    this.friction = 0;
    this.angle = 0;
    this.thrust = 50;
    this.sideThrust = 2;
    this.offSet = spaceShip[this.player].drawingOffsetAngle;
    this.image  = spaceShip[this.player];
    this.name = 'ship';
};
Ship.prototype = new Graphic();
Ship.prototype.draw = function(){
    var h = gameArea.height;
    ctx.translate(this.x, h-this.y);
    ctx.rotate(this.offSet - this.angle);
    ctx.drawImage(this.image, -this.size, -this.size, 2 * this.size, 2 * this.size);
    ctx.rotate(this.angle - this.offSet);
    ctx.translate(-this.x, -(h-this.y));

    energyBar(this.x, this.y, Math.round(this.energy));
};
Ship.prototype.spinThrusters    = function(direction){
    this.spin += direction * this.sideThrust / this.mass;
    particles.push(new Thrust(
        this.x + direction * 0.95* this.size * Math.sin(this.angle + direction * 1.3) + Math.random()-0.5,
        this.y - direction * 0.95* this.size * Math.cos(this.angle + direction * 1.3) + Math.random()-0.5,
        +direction * sideThrustSpeed * Math.sin(this.angle + 0.1*Math.random()-0.05),
        -direction * sideThrustSpeed * Math.cos(this.angle + 0.1*Math.random()-0.05),
        sideThrustMass,
        this.player
    ));
    particles.push(new Thrust(
        this.x - direction * 0.95* this.size * Math.sin(this.angle + direction * 1.3) + Math.random()-0.5,
        this.y + direction * 0.95* this.size * Math.cos(this.angle + direction * 1.3) + Math.random()-0.5,
        -direction * sideThrustSpeed * Math.sin(this.angle + 0.1*Math.random()-0.05),
        +direction * sideThrustSpeed * Math.cos(this.angle + 0.1*Math.random()-0.05),
        sideThrustMass,
        this.player
    ));
};
Ship.prototype.mainThrusters    = function(){
    var thrustMass = Math.max(this.size / 10 - 1,2);
    this.vx += (this.thrust / this.mass) * Math.cos(this.angle);
    this.vy += (this.thrust / this.mass) * Math.sin(this.angle);
    particles.push(new Thrust(
        this.x - 1.1* this.size * Math.cos(this.angle) + Math.random() - 0.5,
        this.y - 1.1* this.size * Math.sin(this.angle) + Math.random() - 0.5,
        -thrustSpeed * Math.cos(this.angle + 0.1 * Math.random() - 0.05),
        -thrustSpeed * Math.sin(this.angle + 0.1 * Math.random() - 0.05),
        thrustMass,
        this.player
    ));
};
Ship.prototype.applyCommand     = function(){
    // This restricts input to the iteration frame rate
    var bulletSpeed     = 3;
    var thrustSpeed     = 1;
    var sideThrustSpeed = 1;
    var playerKeys  = {
        left  : [null,37,113-32],   // Arrow      q
        right : [null,39,119-32],   // Arrow      w
        thrust: [null,38,101-32],   // Arrow      e
        fire  : [null,32,115-32],   // space      s 115
        bomb  : [null,66,0]         // b          n/a
    };
    var sideThrustMass = Math.max(this.size / 15 - 1,1.5);
    if (keyState[playerKeys.left[this.player]])     {this.spinThrusters(1);}
    if (keyState[playerKeys.right[this.player]])    {this.spinThrusters(-1);
    if (keyState[playerKeys.thrust[this.player]]){ // THRUST
        this.vx += (this.thrust / this.mass) * Math.cos(this.angle);
        this.vy += (this.thrust / this.mass) * Math.sin(this.angle);
        var thrustMass = Math.max(this.size / 10 - 1,2);
        particles.push(new Thrust(
            this.x - 1.1* this.size * Math.cos(this.angle) + Math.random() - 0.5,
            this.y - 1.1* this.size * Math.sin(this.angle) + Math.random() - 0.5,
            -thrustSpeed * Math.cos(this.angle + 0.1 * Math.random() - 0.05),
            -thrustSpeed * Math.sin(this.angle + 0.1 * Math.random() - 0.05),
            thrustMass,
            this.player
        ));
    }
    if (keyState[playerKeys.fire[this.player]]){ // FIRE !!
        var bulletMass = Math.max(this.size / 10 - 1,2);
        particles.push(new Bullet(
            this.x + 1.1* this.size * Math.cos(this.angle) + Math.random() - 0.5,
            this.y + 1.1* this.size * Math.sin(this.angle) + Math.random() - 0.5,
            bulletSpeed * Math.cos(this.angle + 0.01 * Math.random() - 0.005),
            bulletSpeed * Math.sin(this.angle + 0.01 * Math.random() - 0.005),
            bulletMass,
            this.player
        ));
    }
};
Ship.prototype.stabilise        = function() {
    // while (this.speed() > speedCap){
        // this.vx     *= 0.98;
        // this.vy     *= 0.98;
        // this.spin   *= 0.98;
    // }
};

var Baddy = function(x,y){
    this.base = Ship;
    this.base(x, y);
    this.angle = Math.PI;
    this.playerTarget = Math.floor(Math.random() * playerShips.length);
    this.name = 'baddy';
    this.offSet = bombBaddy.drawingOffsetAngle;
    this.image  = bombBaddy;
};
Baddy.prototype = new Ship();
Baddy.prototype.chase = function(){
    // Hacky! Limited to 2 players
    this.target = playerShips[this.playerTarget] || playerShips[(this.playerTarget + 1)%2] || wall;
    // --

    interaction.near(this, this.target);
    interaction.touching(this, this.target);
    interaction.resolve(this, this.target);
    this.vx += (this.thrust / this.mass) * Math.cos(this.angle);
    this.vy += (this.thrust / this.mass) * Math.sin(this.angle);
    if (interaction.vector.y >= 0){
        if (interaction.vector.x >= 0) this.angle = Math.atan(interaction.vector.y / interaction.vector.x);
        if (interaction.vector.x < 0)  this.angle = Math.PI + Math.atan(interaction.vector.y / interaction.vector.x);
    }
    if (interaction.vector.y < 0){
        if (interaction.vector.x >= 0) this.angle = Math.atan(interaction.vector.y / interaction.vector.x);
        if (interaction.vector.x < 0)  this.angle = Math.PI + Math.atan(interaction.vector.y / interaction.vector.x);
    }
};

var BossBaddy = function(x,y){
    this.base   = Baddy;
    this.offSet = bossBaddy.drawingOffsetAngle;
    this.image  = bossBaddy;
    this.base(x,y);
};
BossBaddy.prototype = new Baddy;

// -- Elasticon is a subset of Particle. And can stretch() [stronger / different attraction]
var Elasticon = function(x, y, size){
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
    this.name = 'elasticon';
}
Elasticon.prototype = new Particle();
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

// --

// -- Attachment is a fixed Ghost of a Elasticon. Targets only ONE Elasticon.
var Attachement = function(x, y, magnet_number, attachment_number){
    this.size = 5;
    this.base = Elasticon;
    this.base(x, y, this.size);
    elasticons[magnet_number].attached = attachment_number;
    this.restitution = 0;
    this.friction = 100;
};
Attachement.prototype = new Elasticon();
// --

// -- Interaction is used to resolve to objects, and refered to by collide, stretch, attract
var Interaction = function(){
    Primitive.call(this);
};
Interaction.prototype = new Primitive();
Interaction.prototype.near = function(P1, P2){
    this.x = P2.x - P1.x;           // Contact Vector
    this.y = P2.y - P1.y;
    this.size = P2.size + P1.size;  // Interaction distance at point of contact
    return ((Math.abs(this.x) < this.size) && (Math.abs(this.y) < this.size));
};
Interaction.prototype.touching = function(P1, P2){
    this.seperationSqrd = this.x * this.x + this.y * this.y;
    this.sizeSqrd = this.size * this.size;
    return ( this.seperationSqrd <= this.sizeSqrd );
};
Interaction.prototype.resolve = function(P1, P2){

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
Interaction.prototype.clear = function(){
    this.resolved = false;
};
// --

// -- Wall is a size = 200 Primitive, that only collides.
var Wall = function(){
    Primitive.call(this);
    this.size = 200;
    this.calcMass();
    this.restitution = 0.4;
    this.friction = 1;
    this.name = 'wall';
};
Wall.prototype = new Primitive();
Wall.prototype.clear = function() {
    this.x          = 0;
    this.y          = 0;
    this.vx         = 0;
    this.vy         = 0;
    this.angle      = 0;
    this.spin       = 0;
};
// --
