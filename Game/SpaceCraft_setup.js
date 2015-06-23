/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

// -- Globals
var gameArea    = document.createElement('canvas'),
    ctx         = gameArea.getContext('2d'),
    w           = gameArea.width,
    h           = gameArea.height,

    particles       = [],
    elasticons      = [],
    attachments     = [],
    baddies         = [],
    playerShips     = [],

    keyState        = {},
    timerAnimate,

    gravity         = -0.001,
    boundary_flag   = -1,
    speedCap        = 5,
    snapThreshhold  = 25,

    maxObjects      = 500,
    currentObjects  = 0;
// --

// -- Maths / Shortcuts
function modulus(x, y) {
    return Math.sqrt(x * x + y * y);
}

function restitution(P1,P2){
    return (P1.restitution + P2.restitution) / 2;
}

function friction(P1, P2){
    return (P1.friction + P2.friction) / 2;
}
// --

// -- Setup & initialisation
function initGameArea(){
    w = gameArea.width = 800;
    h = gameArea.height= 600;

    window.document.body.appendChild(gameArea);
    window.addEventListener('keydown', function(e){
        keyState[e.keyCode] = true;
    });
    window.addEventListener('keyup', function(e){
        keyState[e.keyCode] = false;
    });
}
// --

// -- On screen display functions
function gameDisplayText(text){
    ctx.font = "100px Verdana";
    // Create gradient
    var gradient = ctx.createLinearGradient(0, 0, gameArea.width, 0);
    gradient.addColorStop("0", "magenta");
    gradient.addColorStop("0.5", "blue");
    gradient.addColorStop("1.0", "red");
    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fillText(text, 100, gameArea.height / 2);
}

function draw_ball(x, y, size, r, g, b){
    var colourstring = "rgb(".concat(r, ",", g, ",", b, ")");
    ctx.beginPath();
    ctx.arc(x,y,size, 0, 2 * Math.PI, false);
    ctx.fillStyle = colourstring;
    ctx.fill();
}
// --
