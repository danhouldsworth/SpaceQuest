/* jshint
browser : true,

quotmark : false,
white : false,
indent : false,

onevar : false
*/

var canvas = document.createElement('canvas'),
    context = canvas.getContext('2d'),

    particles       = [],
    elasticons      = [],
    attachments     = [],

    gravity         = -0.001,
    boundary_flag   = -1,
    speedCap        = 5,

    iterations      = 0,
    frames          = 0,

    // timerRates   = setInterval(display, 1000),
    timerAnimate = setInterval(animate, 35);
    // timerIterate = setInterval(iterate, 5);

canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 20;
canvas.setAttribute('style', 'border:1px dotted');
window.document.body.appendChild(canvas);

function display(){
    console.log("Iterations : " + iterations + " , Frames : " + frames);
    iterations = 0;
    frames = 0;
}

function iterate(){
    iterations++;

    var i,j;

    // -- 1. Iterate through the Particles. Resolving the Particle-to-Particle interactions
    for (i = 0; i < particles.length; i++){

        for (j = i + 1; j < particles.length; j++){
            // interaction.clear();
            particles[i].collide(particles[j]);
            // particles[i].attract(particles[j]);
        }

        particles[i].boundary();
        particles[i].stabilise();
        particles[i].update();
    }
    // --

    // -- 2. Iterate throught the elasticons.
    // -- Resolving the Elasticon-to-Particle, Elasticon-to-Elasticon & Elasticon-to-Attachement interactions
    for (i = 0; i < elasticons.length; i++){

        // -- elasticons Phyiscal collision barrier to particles
        for (j = 0; j < particles.length; j++){
            elasticons[i].collide(particles[j]);
        }
        // --

        // -- elasticons attracted in order
        if (i != elasticons.length - 1){
            interaction.clear();
            elasticons[i].collide(elasticons[i + 1]);
            elasticons[i].stretch(elasticons[i + 1]);
        }
        // --

        // -- Attachments are ghost objects that attract a specific Elasticon #
        if (elasticons[i].attached !== false) {
            interaction.clear();
            elasticons[i].collide(attachments[elasticons[i].attached]);
            elasticons[i].stretch(attachments[elasticons[i].attached]);
        }
        // --

        elasticons[i].boundary(); // Likewise we could remove this on the basis that they will always be dragged back into frame
        elasticons[i].stabilise(); // Specific stabilisation could be quicker than drag?
        elasticons[i].update( -0.05 * elasticons[i].mass ); // Dampen the elasticons with drag
    }
}

function animate(){
    frames++;
    iterate();
    iterate();
    iterate();
    iterate();
    iterate();

    function draw_all_of(type, shade){
        for (var i = 0; i < type.length; i++){
            type[i].draw(shade);
        }
    }

    canvas.width = canvas.width;
    draw_all_of(particles, 0);
    draw_all_of(elasticons, 100);
    draw_all_of(attachments, 200);
}

// -- Basic Primitive Object has Mass and Collide methods ***TO BE CHANGED WITH TRIANGLES***
function Primitive(x, y, vx, vy, size, angle, spin){
    this.x      = x || 0;
    this.y      = y || 0;
    this.vx     = vx || 0;
    this.vy     = vy || 0;
    this.size   = size  || 0;
    this.angle  = angle || 0;
    this.spin   = spin  || 0;
}

Primitive.prototype.calcMass = function (){
    this.mass = (4/3) * Math.PI * this.size * this.size * this.size;
    return this.mass;
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

        if (interaction.seperation < 0.9 * interaction.size){ // Try and save some cycles
            // !!! NOTE : This compressability parameter is HARD CODED !!
            var anti_squeeze = 0.5 * (interaction.size - interaction.seperation);
            var delta2 = anti_squeeze / (1 + that.mass / this.mass);
            var delta1 = anti_squeeze - delta2;
            this.x += -delta1 * cos_theta;
            this.y += -delta1 * sin_theta;
            that.x +=  delta2 * cos_theta;
            that.y +=  delta2 * sin_theta;
        }
    }
};
// --

// -- Particle is a BALL ONLY and a subset of Primitive. It can attract from a distance.
function Particle(x, y, vx, vy, size, spin){
    this.base = Primitive;
    this.base(x, y, vx, vy, size, 0, spin);
    this.mass = (4/3) * Math.PI * this.size * this.size * this.size;
    this.restitution = 1;
    this.friction = 1;
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

    var h = canvas.height;

    function draw_ball(x, y, size, r, g, b){
        var colourstring = "rgb(".concat(r, ",", g, ",", b, ")");
        context.beginPath();
        context.arc(x,y,size, 0, 2 * Math.PI, false);
        context.fillStyle = colourstring;
        context.fill();
    }

    draw_ball(
        this.x,
        h - this.y,
        this.size,
        Math.round(this.speed() * 30) + shade, shade, shade        // Redden with speed
    );
    draw_ball(
        this.x + Math.cos(this.angle) * this.size / 2,
        h - (this.y + Math.sin(this.angle) * this.size / 2),
        this.size / 5,
        255, 255, 255
    );
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
    this.x      += this.vx;
    this.y      += this.vy;
    this.angle  += this.spin;
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
    var w = canvas.width,
        h = canvas.height;

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

// -- Elasticon is a subset of Particle. And can stretch() [stronger / different attraction]
function Elasticon(x, y, size){
    this.base = Particle;
    this.base(x, y, 0, 0, size);
    this.restitution = 0;
    this.friction = 20;
    this.attached = false;
}
Elasticon.prototype = new Particle();
Elasticon.prototype.stretch = function(that) {

    if (!interaction.resolved) {
        interaction.touching(this, that);
        interaction.resolve(this, that);
    }

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

    var h = canvas.height;

    function draw_ball(x, y, size, r, g, b){
        var colourstring = "rgb(".concat(r, ",", g, ",", b, ")");
        context.beginPath();
        context.arc(x,y,size, 0, 2 * Math.PI, false);
        context.fillStyle = colourstring;
        context.fill();
    }

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

    var h = canvas.height;

    function draw_ball(x, y, size, r, g, b){
        var colourstring = "rgb(".concat(r, ",", g, ",", b, ")");
        context.beginPath();
        context.arc(x,y,size, 0, 2 * Math.PI, false);
        context.fillStyle = colourstring;
        context.fill();
    }

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
}
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
}
var interaction = new Interaction(); // interaction object is useful to have seperation x,y,vx,vy,mass etc
// --

// -- Wall is a size = 200 Primitive, that only collides.
function Wall(){
    Primitive.call(this);
    this.size = 200;
    this.calcMass();
    this.restitution = 1;
    this.friction = 10;
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
var wall = new Wall();            // simulate wall as a infinitely large particle
// --

// -- Examples
function rubberExample(){

    var w = canvas.width,
        h = canvas.height;

    for (var i = 0; i < w * 0.75; i += 2 * 3){
        elasticons.push(new Elasticon(i, h * (1 - i / w), 3));
    }

    attachments.push(new Attachement(0,         h,          0,                      0));
    attachments.push(new Attachement(w * 0.75,  h * 0.25,   elasticons.length - 1,  1));
    // attachments.push(new Attachement(w * 0.5,    h * 0.5,    60)                 );

    particles.push(new Particle(    w * 0.5,    40, 0.4,    -1,     20, -0.1));
    particles.push(new Particle(    w - 50,     10, 0.5,    0,      10, -0.5));
}

function hammerExample(){

    var w = canvas.width,
        h = canvas.height;

    for (var i = 0; i < w / 3; i += 4){
        for (var j = 0; j < h * 0.2 ; j += 4){
            particles.push(new Particle( w/2 + i , j + h * 0.4, 0, 0, 2, 0));
            particles[particles.length - 1].friction = 0.5;
            particles[particles.length - 1].restitution = 0;
        }
        if (particles.length > 800) break;
    }
    particles.push(new Particle( w * 0.35, h / 2, 0.5, 0, 50, 0));
    particles[particles.length - 1].friction = 0.5;
    particles[particles.length - 1].restitution = 0;
}

function anotherExample(){
    var w = canvas.width,
        h = canvas.height;

    gravity *= 10;

    particles.push(new Particle( w * 0.1, h / 2, -1,  1, 10, 0.01));
    particles.push(new Particle( w * 0.2, h / 2, 0.5, 1, 20, 0.02));
    particles.push(new Particle( w * 0.4, h / 3, 0.5, 0, 30, 0.03));
    particles.push(new Particle( w * 0.6, h / 4, 0.5, 0, 40, 0.04));
    particles.push(new Particle( w * 0.7, h / 5, 0.5, 0, 50, 0.05));
    particles.push(new Particle( w * 0.9, h / 5, 0.5, 0, 50, 0.05));
    particles.push(new Particle( w * 0.1, h / 5, 0.5, 0, 50, 0.05));
    particles.push(new Particle( w * 0.2, h / 5, 0.5, 0, 50, 0.05));
}

function modulus(x, y) {
    return Math.sqrt(x * x + y * y);
}

function restitution(P1,P2){
    return (P1.restitution + P2.restitution) / 2;
}

function friction(P1, P2){
    return (P1.friction + P2.friction) / 2;
}

// rubberExample();
hammerExample();
// anotherExample();
