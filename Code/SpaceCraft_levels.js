/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
"use strict";
/*globals gameObjects, PlayerShip, stars, w, h */
function gliders(){
    gameObjects.push(new PlayerShip(-3.9*w, 3.9*h, 0,0, 2));
    gameObjects.push(new PlayerShip(-3.8*w, 3.9*h, 0,0, 1));
    for (var star of stars) star.vx = 0;
}
function pvp(){
    gameObjects.push(new PlayerShip(-w, 0, 0,0, 2));
    gameObjects.push(new PlayerShip(+w, 0, 0,0, 1));
}
function fireball_testing(){
    gameObjects.push(new PlayerShip(-w, 0, 0,0, 2));
    gameObjects.push(new PlayerShip(+w, 0, 0,0, 1));
    // gameObjects.push(new Drone1(0,0, 0,0));
    // setInterval(()=>gameObjects.push(new Drone1((random()-0.5)*4*w,(0.5-random())*4*h, 0,0)), 5000);
}
function droneTesting_Orientation(){
    gameObjects.push(new PlayerShip(-2*w, 0, 0,0, 1));
    const droneType = Drone9;
    // gameObjects.push(new droneType( 0,      2*h, 0,0,    100));
    gameObjects.push(new droneType( 0,   0, 0,0,   100));
    // gameObjects.push(new droneType( -w,       h, 0,0,   50));
}
function droneTesting_MatchSpeed(){
    gameObjects.push(new PlayerShip(-w, 0, 0,0, 2));
    gameObjects.push(new Drone1( 0, h, 100));
    // gameObjects.push(new Drone1( 0, 0, 500));
    // gameObjects.push(new Drone1( -w, h, 200));
    // gameObjects.push(new Drone1( -w/2, h/2, 50));
}
function droneTesting_Intercept(){
    gameObjects.push(new PlayerShip(-w, 0, 0,0, 2));
    gameObjects.push(new Drone2( 0, h, 100));
    gameObjects.push(new Drone2( 0, 0, 500));
    gameObjects.push(new Drone2( -w, h, 200));
    gameObjects.push(new Drone2( -w/2, h/2, 50));
}
function fullGame(){
    gameObjects.push(new PlayerShip(-w, 0, 0,0, 2));
    gameObjects.push(new PlayerShip(+w, 0, 0,0, 1));
    gameObjects.push(new BossBaddy( +2*w, 0));
    gameObjects.push(new BossBaddy( -2*w, 0));

    for (var count = 0; count < 100; count++)
        gameObjects.push(new Asteroid( (random()-0.5) * w, (random()-0.5) * 8*h, 0.2 * (random() - 0.5), 0.2 * (random() - 0.5), 200 * random(), 0.01 * (random() - 0.5)));

}
function epicOribitalArena(){
    gameObjects.push(new PlayerShip(-w*3, 0,   0,0, 2));
    gameObjects.push(new PlayerShip(-w*3, 100, 0,0, 1));
    gameObjects.push(new BossBaddy( +2*w, 0));
    gameObjects.push(new BossBaddy( -2*w, 0));
     gameObjects.push(new Asteroid(0, 0, 0, 0, 1000, 0));
    for (var count = 0; count < 50; count++){
        let r = 1200 + 1500*random();
        let angle = random() * 2 * PI;
        gameObjects.push(new Moon( r*sin(angle), r*cos(angle), 0.2 * (random() - 0.5), 0.2 * (random() - 0.5), 400 * random(), 0.01 * (random() - 0.5)));
    }

}

function targetPractice(){
    // gameObjects[0].angle = PI/2;

    // const targetType = Drone1;
    const targetType = Asteroid;
    // const targetType = BossBaddy;
   // var targetType = Baddy;
    gameObjects.push(new targetType( +0 * w, h  * 1));
    gameObjects.push(new targetType( +0 * w, h  * 2));
    gameObjects.push(new targetType( +0 * w, h  * 3));
    gameObjects.push(new targetType( +0 * w, -h * 1));
    gameObjects.push(new targetType( +0 * w, -h * 2));
    gameObjects.push(new targetType( +0 * w, -h * 3));
    gameObjects.push(new PlayerShip(-1*w, 0, 0,0, 1));
}
function bigmoon(){
    GlobalParams.gravityFactor = 0;
    gameObjects.push(new PlayerShip(-w, -0.1*h, 0,0, 1));
    gameObjects.push(new PlayerShip(-w, +0.1*h, 0,0, 2));
    gameObjects.push(new Moon(0, 0, 0, 0, 800, 0));
    // gameObjects.push(new Moon(w*0.5, 0, 0, .2, 100, 0));
    // gameObjects.push(new Moon(-w*0.75, 0, 0, .12, 50, 0));
}
function orbitingMoons(){
    const planet = new Moon(0, 0,  0, 0,      400, 100);

    function speedForCircularOrbitAround(planet, r){
        const m = planet.mass;
        const G = GlobalParams.gravityFactor;
        const v = sqrt(G * m / r);
        return v;
    }

    const maxMoons = 50;
    for(var mooncount=4;mooncount < maxMoons;mooncount++){
        // const r = random() * w * GlobalParams.universeSize * 0.5;
        const r = (mooncount / maxMoons) * w * GlobalParams.universeSize * 0.25;
        if (mooncount === 10){
            gameObjects.push(new PlayerShip(-r, 0, 0, -speedForCircularOrbitAround(planet, r), 1));
            gameObjects.push(new PlayerShip(+r, 0, 0, +speedForCircularOrbitAround(planet, r), 2));
        } else {
            // gameObjects.push(new Moon(planet.x + r, 0,  0, +speedForCircularOrbitAround(planet, r), 30, 0));   // Moon
            // gameObjects.push(new Moon(planet.x - r, 0,  0, -speedForCircularOrbitAround(planet, r), 30, 0));   // Moon
        }
    }
    gameObjects.push(planet);   // Big planet
    gameObjects.push(new Moon(0,    0,  0, -3,      20, 0));
    gameObjects.push(new Moon(-w/2, 0,  0,  3,       20, 0));
    gameObjects.push(new Moon(-w/4, 500, 3, 0,       20, 0));
    gameObjects.push(new Moon(-w/4, -500, -3, 0,     20, 0));


    // gameObjects.push(new Moon(w*0.5, 0, 0, .2, 100, 0));
    // gameObjects.push(new Moon(-w*0.75, 0, 0, .12, 50, 0));
    console.log(gameObjects[0].mass);
    console.log(gameObjects[1].mass);
    console.log(gameObjects[2].mass);
    console.log(gameObjects[3].mass);
}
function windyPVP(){
    GlobalParams.wind = 100;
    for (var star of stars) star.vx = 5*(star.y+0.5*GlobalParams.universeSize*h)*(star.y+0.5*GlobalParams.universeSize*h)/(GlobalParams.universeSize*h*GlobalParams.universeSize*h);
    gameObjects.push(new PlayerShip(-w, 0, 0,0,2));
    gameObjects.push(new PlayerShip(+w, 0, 0,0,1));
    gameObjects[0].angle = PI ;
    gameObjects[1].angle = PI ;
}
function invasionFleet(){
    gameObjects.push(new PlayerShip(-w,-.1*h, 0,0, 1));
    gameObjects.push(new PlayerShip(-w,+.1*h ,0,0, 2));
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
function addStars(){
    for (var count = 0, star; count < GlobalParams.starCount; count++) stars.push(new Star);
}
// --
initGameArea();
addStars();

// gliders();
// orbitingMoons();
// epicOribitalArena();
pvp();
// fireball_testing();
// windyPVP();
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


/*
1. Fix Drone testing levels (wind etc)                                      -DONE!
2. Review units / SI units / Mass / Damage
3. Review movement from reaction mass - too much realism / complexation?
4. Review control routines

1. Want to understand if / why not - can do feed forward based on maths model
2. OR user results of forward prediction of numerical model
3. OR blend of PID with either of above
WHY - this is part of running internal model, and comparing against AND THEN Kalman filtering
CONCERNS
1) Is it possible / hard to make stable? (given discrete sample time) ? YES! - Done. Issues still with 'ideal' feathering. But stable, simple, feedforward
2) Is the model correctly treating 'acceleration' 'force' vs 'impulse'? DONE - This was wrong! Now correct!
*/
// ** Consider parameterised options path fork (spreading cone / funnel colourised with time)
// ** Assume continuous, could do interpolation between forks (ie if colour either side of target then refine?)
// ** Optimise to maximise range of colour either side, and centeralise (ie maximises our options at all times)
