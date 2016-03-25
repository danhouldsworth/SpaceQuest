/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
/* global Interaction, Wall, spaceShips, spaceShips, elasticons, particles, attachments, , gameArea, timerAnimate, gameDisplayText */
"use strict";
var interaction = new Interaction();        // -- Interaction object is useful to have seperation x,y,vx,vy,mass etc
var wall        = new Wall();               // -- Simulate wall as a infinitely large particle

function timeStep(timer){
    deltaT[timer]   = Date.now() - lastTime[timer];
    lastTime[timer] = Date.now();
}

function iteratePhysics(){
    timeStep("iteratePhysics");
    var i,j;

    for (let p1 of gameObjects){
        for (let p2 of gameObjects) if (p1.collide(p2) && p1 instanceof Ship && p2.damagePts && p1 !== p2.parent) {
            GlobalParams.scores[p2.team] += p2.damagePts;
        }

        switch (p1.gameClass){
            case 'ship'     :   p1.energy = Math.min(p1.energy + 0.001, 1); break;
            case 'thrust'   :   p1.size -= deltaT.iteratePhysics/100;       break;
            case 'bomb'     :   p1.size -= deltaT.iteratePhysics/100;       break;
            case 'bullet'   :   p1.size -= deltaT.iteratePhysics/100;       break;
        }

        if (p1.size <= 1.1 || p1.energy <= 0) {p1.explode();}

        p1.boundary().stabilise().update(deltaT.iteratePhysics);
    }

    setTimeout(iteratePhysics, 0);
}

function animate(){
    timeStep('animate');
    gameArea.width = gameArea.width;

    for (var gameObject of gameObjects) gameObject.draw().getPilotCommand(deltaT.animate);

    // window.requestAnimationFrame(animate);
    setTimeout(animate,20);
}

function updateScoreStars(){
    timeStep("updateScoreStars");

    GlobalParams.FPS        = 1000 / deltaT.animate;
    GlobalParams.CPF        = deltaT.animate / deltaT.iteratePhysics;

    starfield.width = starfield.width;
    for (var star of stars) {star.boundary().update(deltaT.updateScoreStars).draw();}

    gameDisplayText("Daddy : "  + (1000000 + GlobalParams.scores[1]).toString().slice(1), .05, .1);
    gameDisplayText("Baddies : "  + (1000000 + GlobalParams.scores[3]).toString().slice(1), .4, .1);
    gameDisplayText("Finn : "   + (1000000 + GlobalParams.scores[2]).toString().slice(1), .8, .1);
    gameDisplayText("FPS : "    + Math.round(GlobalParams.FPS), .15, .95);
    gameDisplayText("Objects : "+ gameObjects.length, .45, .95);
    gameDisplayText("CPF : "    + Math.round(GlobalParams.CPF), .75, .95);

    setTimeout(updateScoreStars,30);
}

function launch(){
    iteratePhysics();
    animate();
    updateScoreStars();
}