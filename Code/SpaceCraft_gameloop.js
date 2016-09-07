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

    for (var p1 of gameObjects){

        for (var p2 of gameObjects)
            if (p1.collide(p2) && p1 instanceof Ship && p2.damagePts && p1 !== p2.parent) GlobalParams.scores[p2.team] += p2.damagePts;

        switch (p1.gameClass){
            case 'ship'     :   p1.energy = Math.min(p1.energy + 0.001, 1); break;
            case 'baddy'    :   p1.energy = Math.min(p1.energy + 0.001, 1); break;
            case 'thrust'   :
            case 'bomb'     :
            case 'bullet'   :
                var evaporationRate = 1 - deltaT.iteratePhysics * deltaT.iteratePhysics / 2000;
                p1.size *= evaporationRate;
        }

        if (p1.size <= 1.1 || p1.energy <= 0) {p1.explode();}

        p1.boundary().stabilise().update(deltaT.iteratePhysics);
    }

    setTimeout(iteratePhysics, GlobalParams.refreshInterval.physics);
}

function animate(){
    timeStep('animate');
    gameArea.width = gameArea.width;
    GlobalParams.cameraPos1 = gameObjects[0];
    GlobalParams.cameraPos2 = gameObjects[1];
    interaction.near(GlobalParams.cameraPos1, GlobalParams.cameraPos2);
    interaction.touching();
    interaction.resolve();
    var cos_theta   = interaction.vector.x;
    var sin_theta   = interaction.vector.y;
    GlobalParams.theta = Math.atan(sin_theta/cos_theta);
    if (cos_theta < 0) GlobalParams.theta+= Math.PI;

    // Centre origin in middle of screen
    ctx.translate(w/2,  h/2);
    if (GlobalParams.rotatingFrame) {ctx.rotate(GlobalParams.theta);}

    // Reverse y axis so Y is up
    ctx.scale(1, -1);
    // Scale so always fits

    GlobalParams.scale = Math.min(3, (h*0.9)/interaction.seperation);
    GlobalParams.centreX = -(gameObjects[0].x + interaction.x * 0.5);
    GlobalParams.centreY = -(gameObjects[0].y + interaction.y * 0.5);

    ctx.scale( GlobalParams.scale, GlobalParams.scale);
    // Move viewport to centre on midpoint between ships
    ctx.translate(GlobalParams.centreX, GlobalParams.centreY);
    for (var gameObject of gameObjects) gameObject.draw().getPilotCommand(deltaT.animate);

    // window.requestAnimationFrame(animate);
    setTimeout(animate, GlobalParams.refreshInterval.animation);
}

function updateScoreStars(){
    timeStep("updateScoreStars");

    GlobalParams.FPS        = 1000 / deltaT.animate;
    GlobalParams.CPS        = 1000 / deltaT.iteratePhysics;

    starfield.width = starfield.width;

    gameDisplayText("Daddy : "  + (1000000 + GlobalParams.scores[1]).toString().slice(1), .05, .1);
    gameDisplayText("Baddies : "+ (1000000 + GlobalParams.scores[3]).toString().slice(1), .4, .1);
    gameDisplayText("Finn : "   + (1000000 + GlobalParams.scores[2]).toString().slice(1), .8, .1);
    gameDisplayText("FPS : "    + Math.round(GlobalParams.FPS), .15, .95);
    gameDisplayText("Objects : "+ gameObjects.length, .45, .95);
    gameDisplayText("CPS : "    + Math.round(GlobalParams.CPS), .75, .95);

    ctxStars.translate(w/2,  h/2);
    ctxStars.scale(1, -1);

    if (GlobalParams.rotatingFrame) {ctxStars.rotate(-GlobalParams.theta);}
    ctxStars.scale( GlobalParams.scale, GlobalParams.scale);
    ctxStars.translate(GlobalParams.centreX, GlobalParams.centreY);
    ctxStars.rect(-4 * w, -4 * h, 8 * w, 8 * h);
    ctxStars.lineWidth = 5;
    ctxStars.strokeStyle = "white";
    ctxStars.stroke();
    for (var star of stars) star.boundary().update(deltaT.updateScoreStars).draw();

    setTimeout(updateScoreStars, GlobalParams.refreshInterval.starsAndScores);
}

function launch(){
    iteratePhysics();
    animate();
    updateScoreStars();
}