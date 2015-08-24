/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

// -- Level definitions
function level1(){
    gravity         = 0;
    boundary_flag   = -1;

    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45));
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55));
    // baddies.push(new Baddy(gameArea.width * 0.90, gameArea.height / 2));
    baddies.push(new Baddy(gameArea.width * 0.95, gameArea.height / 2));

    particles.push(new Particle( w * 0.3, 1+ h / 2, 0,  0, 10, 0));
    particles.push(new Particle( w * 0.4, -1+ h / 2, 0,  0, 20, 0));
    particles.push(new Particle( w * 0.5, 1+ h / 2, 0,  0, 30, 0));
    particles.push(new Particle( w * 0.6, -1+ h / 2, 0,  0, 40, 0));
    particles.push(new Particle( w * 0.7, 1+ h / 2, 0,  0, 50, 0));
}

function level2(){ // Asteroid cloud
    gravity         = 0;
    boundary_flag   = -1;

    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45));
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55));
    baddies.push(new Baddy(gameArea.width * 0.90, gameArea.height / 2));
    baddies.push(new Baddy(gameArea.width * 0.95, gameArea.height / 2));


    for (var i = 0; i < w / 3; i += 6){
        for (var j = 0; j < h * 0.2 ; j += 6){
            particles.push(new Particle( w/2 + i , j + h * 0.4, 0, 0, 2, 0));
            particles[particles.length - 1].friction = 0.5;
            particles[particles.length - 1].restitution = 0;
        }
        if (particles.length > 800) break;
    }
    // particles.push(new Particle( w * 0.35, h / 2, 0.5, 0, 50, 0));
    // particles[particles.length - 1].friction = 0.5;
    // particles[particles.length - 1].restitution = 0;
}

function level3(){

    // -- Hardcode ship and baddy start points
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45));
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55));
    baddies.push(new Baddy(gameArea.width * 0.50, gameArea.height * 0.9));
    baddies.push(new Baddy(gameArea.width * 0.55, gameArea.height * 0.9));
    baddies.push(new BossBaddy(gameArea.width * 0.95,  gameArea.height * 0.50));
    baddies.push(new BossBaddy(gameArea.width * 0.95,  gameArea.height * 0.55));
    // --

    // gravity         = -0.005;
    boundary_flag   = -1;

    for (var i = w*0.1; i < w * 0.9; i += 2 * 4){
        elasticons.push(new Elasticon(i, h * 0.8, 4));
    }

    attachments.push(new Attachement(w * 0.1,  h * 0.8,                       0,  0));
    attachments.push(new Attachement(w * 0.9,  h * 0.8,   elasticons.length - 1,  1));
    // attachments.push(new Attachement(w * 0.5,    h * 0.5,    60)                 );

    particles.push(new Particle(    w * 0.15,    h*0.9, 0,    0,      10, 0.01));
    particles.push(new Particle(    w * 0.2,    h*0.9, 0,    0,      20, 0.02));
    particles.push(new Particle(    w * 0.3,    h*0.9, 0,    0,      30, 0.03));
    particles.push(new Particle(    w * 0.4,    h*0.9, 0,    0,      40, 0.04));
    particles.push(new Particle(    w * 0.5,    h*0.9, 0,    0,      50, 0.05));
    particles.push(new Particle(    w * 0.6,    h*0.9, 0,    0,      40, 0.06));
    particles.push(new Particle(    w * 0.7,    h*0.9, 0,    0,      30, 0.07));
    particles.push(new Particle(    w * 0.8,    h*0.9, 0,    0,      20, 0.08));
    particles.push(new Particle(    w * 0.85,    h*0.9, 0,    0,      10, 0.09));
}

function level4(){
    // -- Hardcode ship and baddy start points
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45));
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55));
    baddies.push(new Baddy(gameArea.width * 0.90, gameArea.height / 2));
    baddies.push(new Baddy(gameArea.width * 0.95, gameArea.height / 2));
    // baddies.push(new Baddy(gameArea.width * 0.5,  gameArea.height * 0.9));
    // baddies.push(new Baddy(gameArea.width * 0.5,  gameArea.height * 0.95));
    // --

    gravity = 0;

    particles.push(new Particle( 25 + w * 0.4, -15 + h / 2,      0,  0, 30, 0));
    particles.push(new Particle( 20 + w * 0.4, -20 + h * 0.75,   0,  0, 40, 0));
    particles.push(new Particle( 15 + w * 0.1, -25 + h * 0.75,   0,  0, 50, 0));
}

function level5(){
    // -- Hardcode ship and baddy start points
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45));
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55));
    baddies.push(new Baddy(gameArea.width * 0.90, gameArea.height / 2));
    baddies.push(new Baddy(gameArea.width * 0.95, gameArea.height / 2));
    baddies.push(new Baddy(gameArea.width * 0.5,  gameArea.height * 0.9));
    baddies.push(new Baddy(gameArea.width * 0.5,  gameArea.height * 0.95));
    // --

    gravity         = -0.005;
    boundary_flag   = -1;

    for (var i = 0; i < w * 0.4; i += 2 * 4){
        elasticons.push(new Elasticon(i, h * 0.8 - i, 4));
    }

    attachments.push(new Attachement(w * 0.0,  h * 0.8,             0,                      0));
    attachments.push(new Attachement(w * 0.4,  h * 0.8 - w * 0.4,   elasticons.length - 1,  1));

    var startOfNewString = elasticons.length;

    for (i = w * 0.6; i < w * 1.0; i += 2 * 4){
        elasticons.push(new Elasticon(i, h * 0.8 + i - w, 4));
    }

    attachments.push(new Attachement(w * 0.6,  h * 0.8 - w * 0.4,   startOfNewString,       2));
    attachments.push(new Attachement(w * 1.0,  h * 0.8,             elasticons.length - 1,  3));

    particles.push(new Particle(    w * 0.15,    h*0.9, 0,    0,      20, 0.01));
    particles.push(new Particle(    w * 0.25,    h*0.9, 0,    0,      30, 0.01));
    particles.push(new Particle(    w * 0.85,    h*0.9, 0,    0,      50, 0.01));
}
function pvp(){
    // Finn & Daddy shooting each other!!
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.5));
    playerShips.push(new Ship(gameArea.width * 0.9, gameArea.height * 0.5));
}
function survival(){
    // Finn & Daddy shooting each other!!
    // gravity         = -0.01;
    playerShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.1));
    playerShips.push(new Ship(gameArea.width * 0.9, gameArea.height * 0.1));
    particles.push(new Particle(gameArea.width /2, gameArea.height / 2, 0,  0, 150, 0));
    baddies.push(new Baddy(gameArea.width / 2, gameArea.height * 0.9));
    baddySpawn = setInterval(function(){
        baddies.push(new Baddy(gameArea.width / 2, gameArea.height * 0.9));
        // baddies.push(new Baddy(gameArea.width / 2, gameArea.height * 0.1));
        baddies.push(new Baddy(gameArea.width * 0.9, gameArea.height * 0.5));
        baddies.push(new Baddy(gameArea.width * 0.1, gameArea.height * 0.5));
    }, 3000);
}
// --

// -- Hardcode launch level
initGameArea();
survival();
playerShips[0].player = 1;
playerShips[1].player = 2;
timerAnimate = setInterval(animate, 35);
// --

