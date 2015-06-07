/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

var asteroid    = new Image(); asteroid.src  = "../FinnsArtwork/Asteroid.png";
var fireball    = new Image(); fireball.src  = "../FinnsArtwork/Fireball.png";
var bomb        = new Image(); bomb.src      = "../FinnsArtwork/Bomb.png";
var chaseBaddy  = new Image(); chaseBaddy.src= "../FinnsArtwork/ChaseBaddy_cutout.png";
var bossBaddy   = new Image(); bossBaddy.src = "../FinnsArtwork/BossBaddy_cutout.png";
var bombBaddy   = new Image(); bombBaddy.src = "../FinnsArtwork/BombBaddy_cutout.png";
var spaceShip = [];
spaceShip[1] = new Image(); spaceShip[1].src = "../FinnsArtwork/SpaceShip.png";        spaceShip[1].drawingOffsetAngle = 0;
spaceShip[2] = new Image(); spaceShip[2].src = "../FinnsArtwork/ChaseBaddy_cutout.png";spaceShip[2].drawingOffsetAngle = -Math.PI/2;


// -- Basic Primitive Object has Mass and Collide methods ***TO BE CHANGED WITH TRIANGLES***
function Primitive(x, y, vx, vy, size, angle, spin){
    this.x      = x || 0;
    this.y      = y || 0;
    this.vx     = vx || 0;
    this.vy     = vy || 0;
    this.size   = size  || 0;
    this.angle  = angle || 0;
    this.spin   = spin  || 0;
    currentObjects++;
}

Primitive.prototype.calcMass = function (){
    // this.mass = (4/3) * Math.PI * this.size * this.size * this.size;
    this.mass = 3 * this.size * this.size;
    // return this.mass;
};

Primitive.prototype.collide = function(that){
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
        var massSuck = 1;
        if (that.name == 'baddy' && this.name == 'ship' && this.mass > 1 && that.mass > 1){
            that.mass += massSuck;
            this.mass -= massSuck;
            this.size = Math.sqrt(this.mass / 3);
            that.size = Math.sqrt(that.mass / 3);
        }
        if (this.name == 'baddy' && (that.name == 'bomb' || that.name == 'bullet' || that.name == 'virus') && this.mass > 1 && that.mass > 1){
            this.mass -= massSuck;
            that.mass -= massSuck;
            this.size = Math.sqrt(this.mass / 3);
            that.size = Math.sqrt(that.mass / 3);
        }
        if (that.name == 'wall'  && (this.name == 'bomb' || this.name == 'bullet' || this.name == 'virus') && this.mass > 1 && that.mass > 1){
            // that.mass -= massSuck;
            this.mass -= massSuck;
            this.size = Math.sqrt(this.mass / 3);
            // that.size = Math.sqrt(that.mass / 3);
        }
        if (this.name == 'ship' && that.name == 'particle' && this.mass > 1 && that.mass > 1){
            this.mass += massSuck;
            that.mass -= massSuck;
            this.size = Math.sqrt(this.mass / 3);
            that.size = Math.sqrt(that.mass / 3);
        }
    }
};
// --

// -- Particle is a BALL ONLY and a subset of Primitive. It can attract from a distance.
function Particle(x, y, vx, vy, size, spin){
    this.base = Primitive;
    this.base(x, y, vx, vy, size, Math.PI / 2, spin);
    this.calcMass();
    this.restitution = 1;
    this.friction = 20;
    this.name = 'particle';
}

Particle.prototype = new Primitive();

Particle.prototype.attract = function(that) {

    // F = Gm1m2/r^2
    var force = distance_force * interaction.mass / (interaction.seperation * interaction.seperation);

    this.vx +=  force * interaction.vector.x / this.mass;
    this.vy +=  force * interaction.vector.y / this.mass;
    that.vx += -force * interaction.vector.x / that.mass;
    that.vy += -force * interaction.vector.y / that.mass;
    this.spin += 0;
    that.spin += 0;
};

Particle.prototype.speed = function (){
    var speed = modulus(this.vx, this.vy);
    return speed;
};

Particle.prototype.draw = function(shade){

    var h = gameArea.height;

    ctx.translate(this.x, h-this.y);
    ctx.rotate(-this.angle);
    ctx.drawImage(asteroid, -this.size, -this.size, 2 * this.size, 2 * this.size);
    ctx.rotate(this.angle);
    ctx.translate(-this.x, -(h-this.y));

    // draw_ball(
    //     this.x,
    //     h - this.y,
    //     this.size,
    //     Math.round(this.speed() * 30) + shade, shade, shade        // Redden with speed
    // );
    // if (this.size > 3) draw_ball(
    //     this.x + Math.cos(this.angle) * this.size / 2,
    //     h - (this.y + Math.sin(this.angle) * this.size / 2),
    //     this.size / 5,
    //     255, 255, 255
    // );
};

Particle.prototype.update = function(drag){

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

Particle.prototype.stabilise = function() {
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

function Bullet(x, y, vx, vy, size){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    // this.calcMass(); // Surely calculated as part of Particle constructor?
    this.restitution = 0;
    this.friction = 100;
    this.name = 'bullet';
}
Bullet.prototype = new Particle();
Bullet.prototype.draw = function(){
    var h = gameArea.height;

    draw_ball(
        this.x,
        h - this.y,
        this.size,
        255, 0, 0
    );
};

function Thrust(x, y, vx, vy, size){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    // this.calcMass(); // Surely calculated as part of Particle constructor?
    this.restitution = 0;
    this.friction = 100;
    this.name = 'thrust';
}
Thrust.prototype = new Particle();
Thrust.prototype.draw = function(){
    var h = gameArea.height;

    draw_ball(
        this.x,
        h - this.y,
        this.size,
        0, 0, 255
    );
};

function Bomb(x, y, vx, vy, size){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    // this.calcMass(); // Surely calculated as part of Particle constructor?
    this.restitution = 0;
    this.friction = 100;
    this.name = 'bomb';
}
Bomb.prototype = new Particle();
Bomb.prototype.draw = function(){
    var h = gameArea.height;

    draw_ball(
        this.x,
        h - this.y,
        this.size,
        255, 255, 0
    );
};


function Virus(x, y, vx, vy, size){
    this.base = Particle;
    this.base(x, y, vx, vy, size, 0);
    // this.calcMass(); // Surely calculated as part of Particle constructor?
    this.restitution = 0;
    this.friction = 100;
    this.name = 'virus';
}
Virus.prototype = new Particle();
Virus.prototype.draw = function(){
    var h = gameArea.height;

    draw_ball(
        this.x,
        h - this.y,
        this.size,
        0, 255, 0
    );
};


function Ship(x,y){
    this.base = Particle;
    this.base(x, y, 0, 0, 30, 0);
    this.restitution = 0;
    this.friction = 0;
    this.angle = 0;
    this.name = 'ship';
}
Ship.prototype = new Particle();
Ship.prototype.draw = function(){
    var h = gameArea.height;
    var offSet = spaceShip[this.player].drawingOffsetAngle;

    ctx.translate(this.x, h-this.y);
    ctx.rotate(offSet-this.angle);
    ctx.drawImage(spaceShip[this.player], -this.size, -this.size, 2 * this.size, 2 * this.size);
    ctx.rotate(this.angle-offSet);
    ctx.translate(-this.x, -(h-this.y));
};
Ship.prototype.applyCommand = function(){
    // This restricts input to the iteration frame rate
    var deltaThrust = 0.15;
    var deltaSpin  = 0.0020;
    var bulletSpeed = 3;
    var thrustSpeed = 1;
    var bombSpeed = 1;
    if (keyState[37]) this.spin += deltaSpin;
    if (keyState[39]) this.spin -= deltaSpin;
    if (keyState[38]){ // THRUST
        if (currentObjects < maxObjects) {
            this.vx += deltaThrust * Math.cos(this.angle);
            this.vy += deltaThrust * Math.sin(this.angle);
            particles.push(new Thrust(
                this.x - 1.1* this.size * Math.cos(this.angle) + Math.random() - 0.5,
                this.y - 1.1* this.size * Math.sin(this.angle) + Math.random() - 0.5,
                -thrustSpeed * Math.cos(this.angle + 0.1 * Math.random() - 0.05),
                -thrustSpeed * Math.sin(this.angle + 0.1 * Math.random() - 0.05),
                Math.max(this.size / 10 - 1,2)
            ));

        }
    }
    if (keyState[32]){ // FIRE !!

        if (currentObjects < maxObjects) particles.push(new Bullet(
            this.x + 1.1* this.size * Math.cos(this.angle) + Math.random() - 0.5,
            this.y + 1.1* this.size * Math.sin(this.angle) + Math.random() - 0.5,
            bulletSpeed * Math.cos(this.angle + 0.01 * Math.random() - 0.005),
            bulletSpeed * Math.sin(this.angle + 0.01 * Math.random() - 0.005),
            Math.max(this.size / 10 - 1,2)
        ));
    }
    if (keyState[40]){ // STOP!!
        this.vx = this.vy = this.spin = 0;
    }
    if (keyState[66]){ // BOMB!!
        if (currentObjects < maxObjects) for(var i = 0; i < 50; i++) {
            particles.push(new Bomb(
                this.x + 1.1 * this.size * Math.cos(2 * Math.PI * 100 / i),
                this.y + 1.1 * this.size * Math.sin(2 * Math.PI * 100 / i),
                bombSpeed * Math.cos(2 * Math.PI * 100 / i),
                bombSpeed * Math.sin(2 * Math.PI * 100 / i),
                Math.max(this.size / 5 - 1,4)
            ));
        }
    }
    if (keyState[67]){ // Virus??
            particles.push(new Virus(
                this.x,
                this.y,
                0,
                0,
                4
            ));
    }
};
Ship.prototype.stabilise = function() {
    // while (this.speed() > speedCap){
        this.vx     *= 0.98;
        this.vy     *= 0.98;
        this.spin   *= 0.95;
    // }
};

function Baddy(x,y){
    this.base = Particle;
    this.base(x, y, 0, 0, 45, 0);
    this.restitution = 0;
    this.friction = 20;
    this.angle = Math.PI;
    this.name = 'baddy';
}
Baddy.prototype = new Particle();
Baddy.prototype.draw = function(){
    var h = gameArea.height;
    ctx.translate(this.x, h-this.y);
    ctx.rotate(Math.PI - this.angle);
    ctx.drawImage(bombBaddy, -this.size, -this.size, 2 * this.size, 2 * this.size);
    ctx.rotate(this.angle - Math.PI);
    ctx.translate(-this.x, -(h-this.y));
};
Baddy.prototype.chase = function(){
    var deltaThrust = 0.001;
    interaction.near(this,playerShips[0]);
    interaction.touching(this,playerShips[0]);
    interaction.resolve(this, playerShips[0]);
    this.vx += deltaThrust * Math.cos(this.angle);
    this.vy += deltaThrust * Math.sin(this.angle);
    if (interaction.vector.y >= 0){
        if (interaction.vector.x >= 0) this.angle = Math.atan(interaction.vector.y / interaction.vector.x);
        if (interaction.vector.x < 0)  this.angle = Math.PI + Math.atan(interaction.vector.y / interaction.vector.x);
    }
    if (interaction.vector.y < 0){
        if (interaction.vector.x >= 0) this.angle = Math.atan(interaction.vector.y / interaction.vector.x);
        if (interaction.vector.x < 0)  this.angle = Math.PI + Math.atan(interaction.vector.y / interaction.vector.x);
    }
};

// -- Elasticon is a subset of Particle. And can stretch() [stronger / different attraction]
function Elasticon(x, y, size){
    this.base = Particle;
    this.base(x, y, 0, 0, size);
    this.restitution = 0;
    this.friction = 20;
    this.attached = false;
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
Elasticon.prototype.draw = function(shade){

    var h = gameArea.height;

    draw_ball(
        this.x,
        h - this.y,
        this.size,
        Math.round(this.speed() * 30) + shade, shade, shade        // Redden with speed
    );
};

// --

// -- Attachment is a fixed Ghost of a Elasticon. Targets only ONE Elasticon.
function Attachement(x, y, magnet_number, attachment_number){
    this.size = 5;
    this.base = Elasticon;
    this.base(x, y, this.size);
    elasticons[magnet_number].attached = attachment_number;
    this.restitution = 0;
    this.friction = 100;
}
Attachement.prototype = new Elasticon();
Attachement.prototype.draw = function(shade){

    var h = gameArea.height;

    draw_ball(
        this.x,
        h - this.y,
        this.size,
        Math.round(this.speed() * 30) + shade, shade, shade        // Redden with speed
    );
};

// --

// -- Interaction is used to resolve to objects, and refered to by collide, stretch, attract
function Interaction(){
    Primitive.call(this);
}
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
function Wall(){
    Primitive.call(this);
    this.size = 200;
    this.calcMass();
    this.restitution = 1;
    this.friction = 0;
    this.name = 'wall';
}
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
