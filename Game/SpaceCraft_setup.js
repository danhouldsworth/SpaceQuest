"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

// -- Globals
var gameArea    = document.createElement('canvas'),
    ctx         = gameArea.getContext('2d'),
    w           = gameArea.width,
    h           = gameArea.height,

    particles       = [],
    elasticons      = [],
    attachments     = [],
    spaceShips      = [],

    keyState        = {},
    timerAnimate,
    baddySpawn,

    gravity         = -0.001,
    boundary_flag   = -1,
    speedCap        = 5,
    snapThreshhold  = 25,

    explosionActive = false;

// --

// -- Maths / Shortcuts
function modulus(x, y)      {return Math.sqrt(x * x + y * y);}
function restitution(P1,P2) {return (P1.restitution + P2.restitution) / 2;}
function friction(P1, P2)   {return (P1.friction + P2.friction) / 2;}
// -- Setup & initialisation
function initGameArea(){
    w = gameArea.width = (1900*1);
    h = gameArea.height= 1050;
    window.document.body.appendChild(gameArea);
    window.addEventListener('keydown',  function(e){keyState[e.keyCode] = true;});
    window.addEventListener('keyup',    function(e){keyState[e.keyCode] = false;});
}
// -- On screen display functions
function gameDisplayText(text){
    ctx.font = "100px Roboto";
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
mgun.shootRound(10, 0.08);
function MachineGun(context) {
  var ctx = this;
  function onLoaded(buffers) {ctx.buffers = buffers;};
  var loader = new BufferLoader(context, ['sounds/m1-garand.mp3'], onLoaded);
  loader.load();
}

MachineGun.prototype.shootRound = function(rounds, interval) {
  var time = context.currentTime;
  // Make multiple sources using the same buffer and play in quick succession.
  for (var i = 0; i < rounds; i++) {
    var source = this.makeSource(this.buffers[0]);
    source.playbackRate.value = 1 + Math.random();
    source.start(time + i * interval);
  }
}

MachineGun.prototype.makeSource = function(buffer) {
  var source        = context.createBufferSource();
  var compressor    = context.createDynamicsCompressor();
  var gain          = context.createGain();
  gain.gain.value   = 0.2;
  source.buffer     = buffer;
  source.connect(gain);
  gain.connect(compressor);
  compressor.connect(context.destination);
  return source;
};
