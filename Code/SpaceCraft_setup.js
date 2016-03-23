"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

// -- Globals
var gameArea    = document.createElement('canvas'),
    ctx         = gameArea.getContext('2d'),
    w           = gameArea.width,
    h           = gameArea.height,
    starfield   = document.createElement('canvas'),
    ctxStars    = starfield.getContext('2d'),

    particles       = [],
    elasticons      = [],
    attachments     = [],
    spaceShips      = [],

    stars           = [],

    scores = {
        1 : 0,
        2 : 0
    },

    keyState        = {},
    timerAnimate,
    baddySpawn,

    GlobalParams = {
        gravity         : -0.001,
        boundary_flag   : -1,
        speedCap        : 5,
        snapThreshhold  : 25,
        explosionActive : false
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
    for (var count = 0, star; count < 500; count++){
        star = new Bomb( Math.random() * w, Math.random() * h, Math.random(), 0, Math.random() * 5);
        star.draw = function(){
            ctxStars.beginPath();
            ctxStars.arc(this.x,h-this.y,this.size, 0, 2 * Math.PI, false);
            ctxStars.fillStyle = "rgb(255,255,255)";
            ctxStars.fill();
        }
        star.gravity = 0;
        star.boundary_flag = 1;
        stars.push(star);
    }
}
// -- On screen display functions
function gameDisplayText(text, x, y){
    ctxStars.font = "100px 'LatoLatin-Light'";
    // Create gradient
    var gradient = ctxStars.createLinearGradient(0, 0, gameArea.width, 0);
    gradient.addColorStop("0", "magenta");
    gradient.addColorStop("0.5", "blue");
    gradient.addColorStop("1.0", "red");
    // Fill with gradient
    ctxStars.fillStyle = gradient;
    ctxStars.fillText(text, gameArea.width * x, gameArea.height * y);
    console.log(text);
}
function draw_ball(x, y, size, r, g, b){
    var colourstring = "rgb(".concat(r, ",", g, ",", b, ")");
    ctx.beginPath();
    ctx.arc(x,y,size, 0, 2 * Math.PI, false);
    ctx.fillStyle = colourstring;
    ctx.fill();
}

// --
// http://www.html5tutorial.info/html5-audio.php
// http://www.html5rocks.com/en/tutorials/webaudio/games/
// var mgun = new MachineGun(new AudioContext());

// function MachineGun(context) {
//   var ctx = this;
//   function onLoaded(buffers) {ctx.buffers = buffers;};
//   var loader = new BufferLoader(context, ['sounds/m1-garand.mp3'], onLoaded);
//   loader.load();
//   context.decodeAudioData()
// }

// MachineGun.prototype.shootRound = function(rounds, interval) {
//   var time = context.currentTime;
//   // Make multiple sources using the same buffer and play in quick succession.
//   for (var i = 0; i < rounds; i++) {
//     var source = this.makeSource(this.buffers[0]);
//     source.playbackRate.value = 1 + Math.random();
//     source.start(time + i * interval);
//   }
// }

// MachineGun.prototype.makeSource = function(buffer) {
//   var source        = context.createBufferSource();
//   var compressor    = context.createDynamicsCompressor();
//   var gain          = context.createGain();
//   gain.gain.value   = 0.2;
//   source.buffer     = buffer;
//   source.connect(gain);
//   gain.connect(compressor);
//   compressor.connect(context.destination);
//   return source;
// };
