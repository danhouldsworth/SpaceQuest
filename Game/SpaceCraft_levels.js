/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

// -- Level definitions
function level1(){
    gravity         = 0;
    boundary_flag   = -1;

    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45, 1));
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55, 2));
    // spaceShips.push(new Baddy(gameArea.width * 0.90, gameArea.height / 2));
    spaceShips.push(new Baddy(gameArea.width * 0.95, gameArea.height / 2));

    particles.push(new Asteroid( w * 0.3, 1+ h / 2, 0,  0, 10, 0));
    particles.push(new Asteroid( w * 0.4, -1+ h / 2, 0,  0, 20, 0));
    particles.push(new Asteroid( w * 0.5, 1+ h / 2, 0,  0, 30, 0));
    particles.push(new Asteroid( w * 0.6, -1+ h / 2, 0,  0, 40, 0));
    particles.push(new Asteroid( w * 0.7, 1+ h / 2, 0,  0, 50, 0));
}

function level2(){ // Asteroid cloud
    gravity         = 0;
    boundary_flag   = -1;

    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45));
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55));
    spaceShips.push(new Baddy(gameArea.width * 0.90, gameArea.height / 2));
    spaceShips.push(new Baddy(gameArea.width * 0.95, gameArea.height / 2));

    for (var i = 0; i < w / 3; i += 6){
        for (var j = 0; j < h * 0.2 ; j += 6){
            particles.push(new Asteroid( w/2 + i , j + h * 0.4, 0, 0, 2, 0));
            particles[particles.length - 1].friction = 0.5;
            particles[particles.length - 1].restitution = 0;
        }
        if (particles.length > 800) break;
    }
    // particles.push(new Asteroid( w * 0.35, h / 2, 0.5, 0, 50, 0));
    // particles[particles.length - 1].friction = 0.5;
    // particles[particles.length - 1].restitution = 0;
}

function level3(){

    // -- Hardcode ship and baddy start points
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45, 1));
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55, 2));
    spaceShips.push(new Baddy(gameArea.width * 0.50, gameArea.height * 0.9));
    spaceShips.push(new Baddy(gameArea.width * 0.55, gameArea.height * 0.9));
    spaceShips.push(new BossBaddy(gameArea.width * 0.95,  gameArea.height * 0.50));
    // spaceShips[spaceShips.length-1].baddySpawn();
    spaceShips.push(new BossBaddy(gameArea.width * 0.95,  gameArea.height * 0.55));
    // spaceShips[spaceShips.length-1].baddySpawn();
    // --

    // gravity         = -0.005;
    boundary_flag   = -1;

    for (var i = w*0.1; i < w * 0.9; i += 2 * 4){
        elasticons.push(new Elasticon(i, h * 0.8, 4));
    }

    attachments.push(new Attachement(w * 0.1,  h * 0.8,                       0,  0));
    attachments.push(new Attachement(w * 0.9,  h * 0.8,   elasticons.length - 1,  1));
    // attachments.push(new Attachement(w * 0.5,    h * 0.5,    60)                 );

    particles.push(new Asteroid(    w * 0.15,    h*0.9, 0,    0,      10, 0.01));
    particles.push(new Asteroid(    w * 0.2,    h*0.9, 0,    0,      20, 0.02));
    particles.push(new Asteroid(    w * 0.3,    h*0.9, 0,    0,      30, 0.03));
    particles.push(new Asteroid(    w * 0.4,    h*0.9, 0,    0,      40, 0.04));
    particles.push(new Asteroid(    w * 0.5,    h*0.9, 0,    0,      50, 0.05));
    particles.push(new Asteroid(    w * 0.6,    h*0.9, 0,    0,      40, 0.06));
    particles.push(new Asteroid(    w * 0.7,    h*0.9, 0,    0,      30, 0.07));
    particles.push(new Asteroid(    w * 0.8,    h*0.9, 0,    0,      20, 0.08));
    particles.push(new Asteroid(    w * 0.85,    h*0.9, 0,    0,      10, 0.09));
}

function level4(){
    // -- Hardcode ship and baddy start points
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45, 1));
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55, 2));
    spaceShips.push(new Baddy(gameArea.width * 0.05, gameArea.height * .1));
    spaceShips.push(new Baddy(gameArea.width * 0.95, gameArea.height * .9));
    spaceShips.push(new Baddy(gameArea.width * 0.95, gameArea.height * .1));
    spaceShips.push(new Baddy(gameArea.width * 0.05, gameArea.height * .9));
    // spaceShips.push(new Baddy(gameArea.width * 0.5,  gameArea.height * 0.9));
    // spaceShips.push(new Baddy(gameArea.width * 0.5,  gameArea.height * 0.95));
    // --

    gravity = 0;
    particles.push(new Asteroid( 25 + w * 0.4, -15 + h / 2,      0,  0, 30, 0));
    particles.push(new Asteroid( 20 + w * 0.4, -20 + h * 0.75,   0,  0, 40, 0));
    particles.push(new Asteroid( 15 + w * 0.1, -25 + h * 0.75,   0,  0, 50, 0));
}

function level5(){
    // -- Hardcode ship and baddy start points
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.45, 1));
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55, 2));
    spaceShips.push(new Baddy(gameArea.width * 0.90, gameArea.height / 2));
    spaceShips.push(new Baddy(gameArea.width * 0.95, gameArea.height / 2));
    spaceShips.push(new Baddy(gameArea.width * 0.5,  gameArea.height * 0.9));
    spaceShips.push(new Baddy(gameArea.width * 0.5,  gameArea.height * 0.95));
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

    particles.push(new Asteroid(    w * 0.15,    h*0.9, 0,    0,      20, 0.01));
    particles.push(new Asteroid(    w * 0.25,    h*0.9, 0,    0,      30, 0.01));
    particles.push(new Asteroid(    w * 0.85,    h*0.9, 0,    0,      50, 0.01));
}
function pvp(){
    // Finn & Daddy shooting each other!!
    boundary_flag   = 1;
    spaceShips.push(new Ship(gameArea.width * 0.9, gameArea.height * 0.5, 1));
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.5, 2));
}
function survival(){
    // Finn & Daddy shooting each other!!
    gravity         = 0;
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.1, 1));
    spaceShips.push(new Ship(gameArea.width * 0.9, gameArea.height * 0.1, 2));
    particles.push(new Asteroid(gameArea.width /2, gameArea.height / 2, 0,  0, 150, 0));
    spaceShips.push(new BossBaddy(gameArea.width / 2, gameArea.height * 0.95));
    spaceShips[spaceShips.length-1].baddySpawn();
}
function level6(){
    gravity         = 0;
    boundary_flag   = -1;

    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.55, 1));
    spaceShips.push(new Ship(gameArea.width * 0.4, gameArea.height * 0.45, 2));
    // spaceShips.push(new Baddy(gameArea.width * 0.90, gameArea.height / 2));
    spaceShips.push(new BossBaddy(gameArea.width * 0.6, gameArea.height / 2));

    // particles.push(new Asteroid( w * 0.3, 1+ h / 2, 0,  0, 10, 0));
    // particles.push(new Asteroid( w * 0.4, -1+ h / 2, 0,  0, 20, 0));
    // particles.push(new Asteroid( w * 0.5, 1+ h / 2, 0,  0, 30, 0));
    // particles.push(new Asteroid( w * 0.6, -1+ h / 2, 0,  0, 40, 0));
    // particles.push(new Asteroid( w * 0.7, 1+ h / 2, 0,  0, 50, 0));
}
function impossible(){
    gravity = 0.001;
    boundary_flag   = 1;
    spaceShips.push(new Ship(gameArea.width * 0.9, gameArea.height * 0.5, 1));
    spaceShips.push(new Ship(gameArea.width * 0.1, gameArea.height * 0.5, 2));
    spaceShips.push(new BossBaddy(gameArea.width * 0.5, gameArea.height / 2));
    // spaceShips.push(new BossBaddy(gameArea.width * 0.6, gameArea.height / 2));
}
// --

// -- Hardcode launch level
initGameArea();
// survival();
// pvp();
// level1();
// level2();
// level3();
// level4();
// level5();
// level6();
impossible();
// spaceShips[1].stabilise = function(){};
// spaceShips[1].thrust *= 2;
// spaceShips[1].sideThrust *= 2;
// spaceShips[1].fireRate *= 2;
// spaceShips[0].size *= 2;
// spaceShips[0].calcMass();
timerAnimate = setInterval(animate, 35);
// --

