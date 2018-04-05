"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
var asteroid    = new Image(); asteroid.src  = "../FinnsArtwork/vortex.png";
var moon        = new Image(); moon.src      = "../FinnsArtwork/bluemoon.png";          moon.scale = 1.05;
var fireball    = new Image(); fireball.src  = "../FinnsArtwork/Fireball.png";          fireball.drawingOffsetAngle = 0;
var bomb        = new Image(); bomb.src      = "../FinnsArtwork/Bomb.png";              bomb.drawingOffsetAngle = 0;
var bossBaddy   = new Image(); bossBaddy.src = "../FinnsArtwork/human_mothership.gif";  bossBaddy.drawingOffsetAngle = Math.PI/4;
var bombBaddy   = new Image(); bombBaddy.src = "../FinnsArtwork/BombBaddy_cutout.png";  bombBaddy.drawingOffsetAngle = Math.PI;
var missile     = new Image(); missile.src  = "../FinnsArtwork/Warheadtwo.png";         missile.drawingOffsetAngle=Math.PI;
bombBaddy=missile;
var spaceShip   = [];
spaceShip[1]    = new Image(); spaceShip[1].src = "../FinnsArtwork/DaddyStealth.png";       spaceShip[1].drawingOffsetAngle = Math.PI;
spaceShip[2]    = new Image(); spaceShip[2].src = "../FinnsArtwork/finns_ship.png";         spaceShip[2].drawingOffsetAngle = Math.PI/2;
// spaceShip[1]    = new Image(); spaceShip[1].src = "../FinnsArtwork/BiPlane.png";             spaceShip[1].drawingOffsetAngle = Math.PI;
// spaceShip[2]    = new Image(); spaceShip[2].src = "../FinnsArtwork/Eurofighter.png";         spaceShip[2].drawingOffsetAngle = Math.PI;
// spaceShip[1]    = new Image(); spaceShip[1].src = "../FinnsArtwork/BiPlane.png";          spaceShip[1].drawingOffsetAngle = Math.PI;
// spaceShip[2]    = new Image(); spaceShip[2].src = "../FinnsArtwork/airfoil.png";         spaceShip[2].drawingOffsetAngle = Math.PI;
// Load sounds!
var context = new AudioContext();

var tracks = {};
var sound = function(track, vol = 0.5, duration){
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
var loadSound = function(name, filename){
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
var gameArea    = document.createElement('canvas'),
    ctx         = gameArea.getContext('2d'),
    w           = gameArea.width,
    h           = gameArea.height,
    starfield   = document.createElement('canvas'),
    ctxStars    = starfield.getContext('2d'),
    gameObjects     = [],
    stars           = [],
    keyState        = {},
    lastTime = {
        physics             : Date.now(),
        animation           : Date.now(),
        starsAndScores      : Date.now(),
        pilotInput          : Date.now(),
    },
    deltaT = {
        physics             : 0,
        animation           : 0,
        starsAndScores      : 0,
        pilotInput          : 0
    },
    GlobalParams = {
        rotatingFrame   : false,
        boundary_flag   : -1, // -1=bounce  / +1=wrap
        universeSize    : 0.5,
        scores          : {1 : 0, 2 : 0, 3 : 0},
        camera          : {
            Targets         : [{x : 0, y : 0, size : 1}, {x : 0, y : 0, size : 1}],
            OldTargets      : [{x : 0, y : 0, size : 1}, {x : 0, y : 0, size : 1}],
            Blender         : [100, 100]
        },
        refreshInterval : {
            physics         : 0,    // 200 Hz
            animation       : 20,   //  50 Hz
            starsAndScores  : 50,   //  20 Hz
            pilotInput      : 100   //  10 Hz
        }
    };

// --

// -- Maths / Shortcuts
function modulus(x, y)                      {return Math.sqrt(x * x + y * y);}
function restitution(P1,P2)                 {return (P1.restitution + P2.restitution) / 2;}
function friction(P1, P2)                   {return (P1.friction + P2.friction) / 2;}
function normaliseAngle0to2PI (grossAngle)  {return (10 * Math.PI + grossAngle) % (2 * Math.PI);}
function normaliseAnglePItoMinusPI (grossAngle)  {
    var posiAngle = normaliseAngle0to2PI(grossAngle);
    if (posiAngle > Math.PI) return posiAngle - 2 * Math.PI;
    return posiAngle;
}
function getAngle(x, y) {
    var angle = Math.atan(y / x);
    if (y >= 0){
        if (x >= 0) angle += 0;
        if (x < 0)  angle += Math.PI;
    } else if (y < 0){
        if (x < 0)  angle += Math.PI;
        if (x >= 0) angle += Math.PI * 2;
    }
    return angle;
}

// -- Setup & initialisation
function initGameArea(){
    w = gameArea.width = starfield.width = window.innerWidth;
    h = gameArea.height = starfield.height=window.innerHeight;
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
        var i2tilt = e.beta;
        var i3tilt = e.gamma;
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
    for (var count = 0, star; count < 1500; count++) stars.push(new Star);
}
// -- On screen display functions
function gameDisplayText(text, x, y){
    ctxStars.font = Math.floor(h / 20) + "px 'LatoLatin-Light'";
    var gradient = ctxStars.createLinearGradient(0, 0, gameArea.width, 0);
    gradient.addColorStop("0", "magenta");
    gradient.addColorStop("0.5", "blue");
    gradient.addColorStop("1.0", "red");
    ctxStars.fillStyle = gradient;
    ctxStars.fillText(text, gameArea.width * x, gameArea.height * y);
}
function draw_ball(x, y, size, r, g, b){
    var colourstring = "rgb(".concat(r, ",", g, ",", b, ")");
    ctx.beginPath();
    ctx.arc(x,y,size, 0, 2 * Math.PI, false);
    ctx.fillStyle = colourstring;
    ctx.fill();
}