"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

const asteroid    = new Image(); asteroid.src   = "../FinnsArtwork/vortex.png";            asteroid.scale = 2;
const moon        = new Image(); moon.src       = "../FinnsArtwork/bluemoon.png";          moon.scale = 1.07;
const fireball    = new Image(); fireball.src   = "../FinnsArtwork/Fireball.png";          fireball.drawingOffsetAngle = 0;
const bomb        = new Image(); bomb.src       = "../FinnsArtwork/Bomb.png";              bomb.drawingOffsetAngle = 0;
const bossBaddy   = new Image(); bossBaddy.src  = "../FinnsArtwork/human_mothership.gif";  bossBaddy.drawingOffsetAngle = PI/4;
const spawnBaddy  = new Image(); spawnBaddy.src = "../FinnsArtwork/BossBaddy_cutout.png";  spawnBaddy.drawingOffsetAngle = PI/2;
const bombBaddy   = new Image(); bombBaddy.src  = "../FinnsArtwork/BombBaddy_cutout.png";  bombBaddy.drawingOffsetAngle = PI;
const missile     = new Image(); missile.src    = "../FinnsArtwork/Warheadtwo.png";         missile.drawingOffsetAngle=PI;
// bombBaddy=missile;
const spaceShip   = [];
spaceShip[1]    = new Image(); spaceShip[1].src = "../FinnsArtwork/DaddyStealth.png";       spaceShip[1].drawingOffsetAngle = PI;
spaceShip[2]    = new Image(); spaceShip[2].src = "../FinnsArtwork/finns_ship.png";         spaceShip[2].drawingOffsetAngle = PI/2;
// spaceShip[1]    = new Image(); spaceShip[1].src = "../FinnsArtwork/BiPlane.png";             spaceShip[1].drawingOffsetAngle = PI;
// spaceShip[2]    = new Image(); spaceShip[2].src = "../FinnsArtwork/Eurofighter.png";         spaceShip[2].drawingOffsetAngle = PI;
// spaceShip[1]    = new Image(); spaceShip[1].src = "../FinnsArtwork/BiPlane.png";          spaceShip[1].drawingOffsetAngle = PI;
// spaceShip[2]    = new Image(); spaceShip[2].src = "../FinnsArtwork/airfoil.png";         spaceShip[2].drawingOffsetAngle = PI;
// Load sounds!
const context = new AudioContext();

const tracks = {};
const sound = function(track, vol = 0.5, duration){
    if (track instanceof AudioBuffer){
        let source = context.createBufferSource();
        let volume = context.createGain();
        volume.connect(context.destination);
        volume.gain.value = vol;
        source.buffer = track;
        source.connect(volume);
        source.start(context.currentTime);
        if (duration) source.stop(context.currentTime + duration);
    }
};
const loadSound = function(name, filename){
    fetch(filename)
    .then(function(response)    {return response.arrayBuffer();})
    .then(function(arrayBuffer) {return context.decodeAudioData(arrayBuffer);})
    .then(function(audioBuffer) {tracks[name] = audioBuffer;});
};
loadSound("LaserHose",  "FinnsSounds/LaserHose.mp3");
loadSound("Explosion",  "FinnsSounds/ExplosionMedium.mp3");
loadSound("Stinger",    "FinnsSounds/StingerMissileLaunch.mp3");
loadSound("BigRocket",  "FinnsSounds/BigRocketLaunch.mp3");
loadSound("Thrust",     "FinnsSounds/Thrust.mp3");
//

// -- GlobalParams
const gameArea      = document.createElement('canvas'),
    ctx             = gameArea.getContext('2d'),
    starfield       = document.createElement('canvas'),
    ctxStars        = starfield.getContext('2d'),
    w               = gameArea.width = starfield.width = window.innerWidth,
    h               = gameArea.height= starfield.height = window.innerHeight,
    gameObjects     = [],
    stars           = [],
    keyState        = {},
    GlobalParams = {
        lastTime : {
            physics             : Date.now(),
            animation           : Date.now(),
            starsAndScores      : Date.now(),
            pilotInput          : Date.now(),
        },
        deltaT : {
            physics             : 0,
            animation           : 0,
            starsAndScores      : 0,
            pilotInput          : 0
        },
        universeSize    : 16,
        starCount       : 1500,
        slowMoFactor    : 1,
        rotatingFrame   : true,
        gravityFlag     : false,
        boundary_flag   : -1, // -1=bounce  / +1=wrap
        safeBoundary    : true,
        wind            : 0,
        gravityFactor   : 0.0000001,
        scores          : {1 : 0, 2 : 0, 3 : 0},
        camera          : {
            Targets         : [],
            OldTargets      : [],
            CurrentCam      : [],
            Blender         : [100, 100],
            Distance        : 0
        },
        refreshInterval : {
            physics         : 0,    // ~200-300 Hz
            animation       : 20,   //  ~60Hz RAF
            starsAndScores  : 50,   //  20 Hz
            pilotInput      : 10   // 100 Hz  (HumanShips read keyboard input / Drones get input from AI)
        },
        timers : {}
    };
    const kill = errMessage => {
        clearTimeout(GlobalParams.timers.iteratePhysics);
        clearTimeout(GlobalParams.timers.animate);
        clearTimeout(GlobalParams.timers.getPilotInput);
        clearTimeout(GlobalParams.timers.updateScoreStars);
        throw errMessage;
    };

// --

// -- Setup & initialisation
function initGameArea(){
    window.document.body.appendChild(starfield);
    window.document.body.appendChild(gameArea);
    window.addEventListener('keydown',  function(e){keyState[e.keyCode] = true;});
    window.addEventListener('keyup',    function(e){keyState[e.keyCode] = false;});
    window.addEventListener('devicemotion',  function(e){
        // var i2tilt = e.rotationRate.alpha;
        // if (i2tilt < -100) {keyState[81] = true;} else {keyState[81] = false;}
        // if (i2tilt > +100) {keyState[87] = true;} else {keyState[87] = false;}
        // document.getElementById('alpha').innerHTML = e.rotationRate.alpha;
        // document.getElementById('beta').innerHTML = e.rotationRate.beta;
        // document.getElementById('gamma').innerHTML = e.rotationRate.gamma;
        // document.getElementById('interval').innerHTML = e.interval;
    });
    window.addEventListener('deviceorientation',  function(e){
        const i2tilt = e.beta;
        const i3tilt = e.gamma;
        if (i2tilt < -10) {keyState[81] = true;} else {keyState[81] = false;}
        if (i2tilt > +10) {keyState[87] = true;} else {keyState[87] = false;}
        if (i3tilt > +10) {keyState[69] = true;} else {keyState[69] = false;}
        if (i3tilt < -10) {keyState[83] = true;} else {keyState[83] = false;}

        // document.getElementById('o_alpha').innerHTML = e.alpha;
        // document.getElementById('o_beta').innerHTML = e.beta;
        // document.getElementById('o_gamma').innerHTML = e.gamma;
    });

    starfield.style.zIndex = 1;
    gameArea.style.zIndex = 2;
}
// -- On screen display functions
function gameDisplayText(text, x, y){
    ctxStars.font = Math.floor(h / 20) + "px 'LatoLatin-Light'";
    const gradient = ctxStars.createLinearGradient(0, 0, gameArea.width, 0);
    gradient.addColorStop("0", "magenta");
    gradient.addColorStop("0.5", "blue");
    gradient.addColorStop("1.0", "red");
    ctxStars.fillStyle = gradient;
    ctxStars.fillText(text, gameArea.width * x, gameArea.height * y);
}
function draw_ball(x, y, size, r, g, b){
    const colourstring = "rgb(".concat(r, ",", g, ",", b, ")");
    ctx.beginPath();
    ctx.arc(x,y,size, 0, 2 * PI, false);
    ctx.fillStyle = colourstring;
    ctx.fill();
}
