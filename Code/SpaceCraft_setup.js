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

// -- GlobalParams
var gameArea    = document.createElement('canvas'),
    ctx         = gameArea.getContext('2d'),
    w           = gameArea.width,
    h           = gameArea.height,
    starfield   = document.createElement('canvas'),
    ctxStars    = starfield.getContext('2d'),

    textsInAction = [],
    gameObjects     = [],

    stars           = [],

    keyState        = {},

    lastTime = {
        iteratePhysics      : Date.now(),
        animate             : Date.now(),
        updateScoreStars    : Date.now()
    },
    deltaT = {
        iteratePhysics      : 0,
        animate             : 0,
        updateScoreStars    : 0
    },

    GlobalParams = {
        gravity         : -0.001,
        boundary_flag   : -1,
        scores          : {1 : 0, 2 : 0, 3 : 0}
    };

// --

// -- Maths / Shortcuts
function modulus(x, y)      {return Math.sqrt(x * x + y * y);}
function restitution(P1,P2) {return (P1.restitution + P2.restitution) / 2;}
function friction(P1, P2)   {return (P1.friction + P2.friction) / 2;}
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
    // Create gradient
    var gradient = ctxStars.createLinearGradient(0, 0, gameArea.width, 0);
    gradient.addColorStop("0", "magenta");
    gradient.addColorStop("0.5", "blue");
    gradient.addColorStop("1.0", "red");
    // Fill with gradient
    ctxStars.fillStyle = gradient;
    ctxStars.fillText(text, gameArea.width * x, gameArea.height * y);
}
function experimentText(text, x, y){
    textsInAction.push({
        text : text,
        x : x,
        y:y,
        counter: 1
    });
}
function updateExperimentText(){
    // Create gradient
    var gradient = ctxStars.createLinearGradient(0, 0, gameArea.width, 0);
    gradient.addColorStop("0", "magenta");
    gradient.addColorStop("0.5", "blue");
    gradient.addColorStop("1.0", "red");
    // Fill with gradient
    ctxStars.fillStyle = gradient;

    for (var i = textsInAction.length - 1; i >= 0; i--) {
        textsInAction[i]
        ctxStars.font = (textsInAction[i].counter + 20) + "px 'LatoLatin-Light'";
        ctxStars.fillText(text, x, y);
        if (textsInAction[i].counter < 100) {
            textsInAction[i].counter += 2;
        } else {
            textsInAction.splice(i,1);
        }
    }
}
function draw_ball(x, y, size, r, g, b){
    var colourstring = "rgb(".concat(r, ",", g, ",", b, ")");
    ctx.beginPath();
    ctx.arc(x,y,size, 0, 2 * Math.PI, false);
    ctx.fillStyle = colourstring;
    ctx.fill();
}