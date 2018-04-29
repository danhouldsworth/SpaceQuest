/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
"use strict";
/*globals gameObjects, PlayerShip, stars, w, h */
function gliders(){
    gameObjects.push(new PlayerShip(-3.9*w, 3.9*h, 2));
    gameObjects.push(new PlayerShip(-3.8*w, 3.9*h, 1));
    for (var star of stars) star.vx = 0;
}
function pvp(){
    gameObjects.push(new PlayerShip(-0.25*w, 0, 2));
    gameObjects.push(new PlayerShip(+0.25*w, 0, 1));
}
function droneTesting_Orientation(){
    gameObjects.push(new PlayerShip(-w, 0, 2));
    gameObjects.push(new Drone3( 0, h, 100));
    // gameObjects.push(new Drone3( 0, 0, 500));
    gameObjects.push(new Drone3( -w, h, 200));
    gameObjects.push(new Drone3( -w/2, h/2, 50));
}
function droneTesting_MatchSpeed(){
    gameObjects.push(new PlayerShip(-w, 0, 2));
    gameObjects.push(new Drone1( 0, h, 100));
    gameObjects.push(new Drone1( 0, 0, 500));
    gameObjects.push(new Drone1( -w, h, 200));
    gameObjects.push(new Drone1( -w/2, h/2, 50));
}
function droneTesting_Intercept(){
    gameObjects.push(new PlayerShip(-w, 0, 2));
    gameObjects.push(new Drone2( 0, h, 100));
    gameObjects.push(new Drone2( 0, 0, 500));
    gameObjects.push(new Drone2( -w, h, 200));
    gameObjects.push(new Drone2( -w/2, h/2, 50));
}
function fullGame(){
    gameObjects.push(new PlayerShip(-w, 0, 2));
    gameObjects.push(new PlayerShip(w, 0, 1));
    gameObjects.push(new BossBaddy( 2*w, 0));
    gameObjects.push(new BossBaddy( -2*w, 0));

    for (var count = 0; count < 100; count++)
        gameObjects.push(new Asteroid( (Math.random()-0.5) * w, (Math.random()-0.5) * 8*h, 0.2 * (Math.random() - 0.5), 0.2 * (Math.random() - 0.5), 200 * Math.random(), 0.01 * (Math.random() - 0.5)));

}
function epicOribitalArena(){
    gameObjects.push(new PlayerShip(-w*3, 0, 2));
    gameObjects.push(new PlayerShip(-w*3, 100, 1));
    gameObjects.push(new BossBaddy( 2*w, 0));
    gameObjects.push(new BossBaddy( -2*w, 0));
     gameObjects.push(new Asteroid(0, 0, 0, 0, 1000, 0));
    for (var count = 0; count < 50; count++){
        let r = 1200 + 1500*Math.random();
        let angle = Math.random() * 2 * Math.PI;
        gameObjects.push(new Moon( r*Math.sin(angle), r*Math.cos(angle), 0.2 * (Math.random() - 0.5), 0.2 * (Math.random() - 0.5), 400 * Math.random(), 0.01 * (Math.random() - 0.5)));
    }

}

function targetPractice(){
    gameObjects.push(new PlayerShip(-3*w, 0, 1));
    // gameObjects[0].angle = Math.PI/2;

    // var targetType = Drone;
     // var targetType = Asteroid;
   var targetType = Baddy;
    gameObjects.push(new targetType( +0 * w, h * 1));
    gameObjects.push(new targetType( +0 * w, h * 2));
    gameObjects.push(new targetType( +0 * w, h * 3));
    gameObjects.push(new targetType( +0 * w, -h * 1));
    gameObjects.push(new targetType( +0 * w, -h * 2));
    gameObjects.push(new targetType( +0 * w, -h * 3));
}
function bigmoon(){

    gameObjects.push(new PlayerShip(-w, -0.1*h, 1));
     gameObjects.push(new PlayerShip(-w, +0.1*h, 2));
    gameObjects.push(new Moon(0, 0, 0, 0, 800, 0));
    // gameObjects.push(new Moon(w*0.5, 0, 0, .2, 100, 0));
    // gameObjects.push(new Moon(-w*0.75, 0, 0, .12, 50, 0));
}
function orbitingMoons(){
    const planet = new Moon(0, 0,  0, 0,      400, 100);

    function speedForCircularOrbitAround(planet, r){
        const m = planet.mass;
        const G = GlobalParams.gravityFactor;
        const v = Math.sqrt(G * m / r);
        return v;
    }

    const maxMoons = 50;
    let r;
    r = (50 / maxMoons) * w * GlobalParams.universeSize * 0.25;
    gameObjects.push(new PlayerShip(-r, 0, 0, -speedForCircularOrbitAround(planet, r), 2));
    r = (4 / maxMoons) * w * GlobalParams.universeSize * 0.25;
    gameObjects.push(new PlayerShip(+r, 0, 0, +speedForCircularOrbitAround(planet, r), 1));
    for(var mooncount=5;mooncount < maxMoons;mooncount++){
        // const r = Math.random() * w * GlobalParams.universeSize * 0.5;
        r = (mooncount / maxMoons) * w * GlobalParams.universeSize * 0.25;
        // gameObjects.push(new Moon((Math.random()-0.5) * GlobalParams.universeSize*w,(Math.random()-0.5) * GlobalParams.universeSize*h,0,0,Math.random()*100,0));
        gameObjects.push(new Moon(planet.x + r, 0,  0, +speedForCircularOrbitAround(planet, r), 30, 0));   // Moon
        gameObjects.push(new Moon(planet.x - r, 0,  0, -speedForCircularOrbitAround(planet, r), 30, 0));   // Moon
    }
    gameObjects.push(planet);   // Big planet
    // gameObjects.push(new Moon(0,    0,  0, -3,      20, 0));
    // gameObjects.push(new Moon(-w/2, 0,  0,  3,       20, 0));
    // gameObjects.push(new Moon(-w/4, 500, 3, 0,       20, 0));
    // gameObjects.push(new Moon(-w/4, -500, -3, 0,     20, 0));


    // gameObjects.push(new Moon(w*0.5, 0, 0, .2, 100, 0));
    // gameObjects.push(new Moon(-w*0.75, 0, 0, .12, 50, 0));
    console.log(gameObjects[0].mass);
    console.log(gameObjects[1].mass);
    console.log(gameObjects[2].mass);
    // console.log(gameObjects[3].mass);
}
function invasionFleet(){
    gameObjects.push(new PlayerShip(-w,-.1*h,1));
    gameObjects.push(new PlayerShip(-w,+.1*h ,2));
    gameObjects.push(new Drone1(0,1000,400));
    gameObjects.push(new Drone1(1000,0,400));
    gameObjects.push(new Drone1(1000,1000,400));
}

function setCameras(){
    GlobalParams.camera.Targets[0] = gameObjects[0];
    GlobalParams.camera.Targets[1] = gameObjects[1];
    GlobalParams.camera.OldTargets[0] = new Primitive(-w*GlobalParams.universeSize, 0, 0, 0, 1, 0, 0);
    GlobalParams.camera.OldTargets[1] = new Primitive(+w*GlobalParams.universeSize, 0, 0, 0, 1, 0, 0);
    GlobalParams.camera.CurrentCam[0] = new Primitive(0, 0, 0, 0, 1, 0, 0);
    GlobalParams.camera.CurrentCam[1] = new Primitive(0, 0, 0, 0, 1, 0, 0);
}
// --
initGameArea();
// gliders();
orbitingMoons();
// epicOribitalArena();
// pvp();
// bigmoon();
// invasionFleet();
// droneTesting_Orientation();
// droneTesting_MatchSpeed();
// droneTesting_Intercept();
// targetPractice();
setCameras();
launch();


/*
1. Create Wing type     / gravity on Ay / Ay, Ax = f(speed, theta, vector)
2. Create PlayerCraft / Bots of Wing type wing controls
3. Get lookup tables for Cl, Cd, Cm from AoA(=theta-vector)
4. Set MI *and* Mass
5. Calculate torque from moveable Mass vs 1/4 chord
*/
