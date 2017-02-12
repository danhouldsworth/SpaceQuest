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
spaceShip[1]    = new Image(); spaceShip[1].src = "../FinnsArtwork/DaddyStealth.png";        spaceShip[1].drawingOffsetAngle = Math.PI;
spaceShip[2]    = new Image(); spaceShip[2].src = "../FinnsArtwork/finns ship.png";spaceShip[2].drawingOffsetAngle = Math.PI/2;

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
        boundary_flag   : -1,
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