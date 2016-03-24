"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

// -- Globals
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
    for (var count = 0, star; count < 500; count++) stars.push(new Star);
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
function draw_ball(x, y, size, r, g, b){
    var colourstring = "rgb(".concat(r, ",", g, ",", b, ")");
    ctx.beginPath();
    ctx.arc(x,y,size, 0, 2 * Math.PI, false);
    ctx.fillStyle = colourstring;
    ctx.fill();
}