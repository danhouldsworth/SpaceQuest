/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
/* globals Interaction, Wall, spaceShips, spaceShips, elasticons, particles, attachments, gameArea, timerAnimate, gameDisplayText */
"use strict";
var interaction = new Interaction();        // -- Interaction object is useful to have seperation x,y,vx,vy,mass etc
var wall        = new Wall();               // -- Simulate wall as a infinitely large particle

function timeStep(timer){
    deltaT[timer]   = Date.now() - lastTime[timer];
    lastTime[timer] = Date.now();
    return deltaT[timer];
}
function applyCollisionRules(obj1, obj2){
    switch (obj1.gameClass){
        case 'moon'     :
        case 'asteroid' : if (obj2 instanceof PlayerShip)                       {obj2.explode();}                               break;
        case 'bullet'   : if (obj2 instanceof Graphic && obj2 !== obj1.parent)  {obj2.energy -= obj1.damagePts / obj2.mass;}    break;
        case 'bomb'     : if (!obj2 instanceof Bomb)                            {obj2.energy -= obj1.damagePts / obj2.mass;}    break;
        case 'fireball' :
        case 'missile'  : if (obj2 instanceof Graphic || obj2 === wall)         {obj2.energy -= obj1.damagePts / obj2.mass; obj1.explode();} break;
    }
    // if (obj1 instanceof Ship && obj1.team !== obj2.team && obj2.damagePts ) GlobalParams.scores[obj2.team] += obj2.damagePts; // Includes baddies & missiles into scoring
    if (obj1 instanceof Graphic && obj1.team !== obj2.team && obj2.damagePts ) GlobalParams.scores[obj2.team] += Math.round(obj2.damagePts/1000000); // Includes baddies & missiles into scoring
}
function iteratePhysics(){
    var dT = timeStep("physics");
    // if (GlobalParams.slowMoCounter){
        // GlobalParams.slowMoCounter--;
    dT /= GlobalParams.slowMoFactor;
    // }
    var evaporationRateBullet   = (1 - Math.min(1,dT * dT / 3000));
    var evaporationRateVolatile = (1 - Math.min(1,dT * dT / 1000));

    // Calc interaction between pairs ONCE, so must accumulate the forces on the recipient
    for (let i = 0; i < gameObjects.length; i++) gameObjects[i].clearAccelerations();

    for (let i = 0; i < gameObjects.length; i++){
        const p1 = gameObjects[i];
        for (let j = i + 1; j < gameObjects.length; j++){
            const p2 = gameObjects[j];
            if (p1.collide(p2)) {
                applyCollisionRules(p1,p2);
                applyCollisionRules(p2,p1);
            }
        }

        // Attrition & recharge
        switch (p1.gameClass){
            case 'player'   :   p1.energy = Math.min(p1.energy + 0.001, 1); break;
            // case 'baddy'    :   p1.energy = Math.min(p1.energy + 0.001, 1); break;
            case 'thrust'   :   p1.size *= evaporationRateVolatile        ; break;
            case 'bomb'     :
            case 'bullet'   :   p1.size *= evaporationRateBullet;
        }

        if (p1.size > 1.1 && p1.energy > 0) {
            p1.updateForces(dT).updateVelocities(dT).applyDrag(dT).updatePosition(dT).sanitiseSingularities(dT).boundaryConstraint();
        } else {
            p1.explode();
        }
    }

    setTimeout(iteratePhysics, GlobalParams.refreshInterval.physics);
}

function animate(){
    var dT = timeStep('animation');
    gameArea.width = gameArea.width;

    // The issue with the camera blending, is that if all objects are moving together, then this is brains frame of reference
    // However, OldTargets is set at the coordinates, NOT the speed or Frame

    const camTool = new Interaction();
    // Lost target0 since last animation (and not blending from it)
    if (gameObjects.indexOf(GlobalParams.camera.Targets[0]) === -1) {
        GlobalParams.camera.OldTargets[0] = GlobalParams.camera.CurrentCam[0];
        GlobalParams.camera.Blender[0] = 100;
        // GlobalParams.camera.Targets[0] = (gameObjects[0] === GlobalParams.camera.Targets[1]) ? gameObjects[1] : gameObjects[0];
        GlobalParams.camera.Distance = GlobalParams.universeSize * w;
        for (var target of gameObjects) {
            if (target === GlobalParams.camera.Targets[1]) continue;
            if (!(target instanceof Graphic)) continue;

            if (target instanceof Ship) {
                GlobalParams.camera.Targets[0] = target;
                break;
            // } else if (target.mass > GlobalParams.camera.Targets[0].mass || (gameObjects.indexOf(GlobalParams.camera.Targets[0]) === -1)) {
            }

            const d = camTool.getSeperation(target, GlobalParams.camera.Targets[1]);
            if (d < GlobalParams.camera.Distance || (gameObjects.indexOf(GlobalParams.camera.Targets[0]) === -1)) {
                GlobalParams.camera.Distance = d;
                GlobalParams.camera.Targets[0] = target;
            }

            // if (target instanceof Graphic && !(GlobalParams.camera.Targets[0] instanceof Graphic)) {
            //     GlobalParams.camera.Distance = d;
            //     GlobalParams.camera.Targets[0] = target;
            // }

        }
    }
    // Lost target1 since last animation (and not blending from it)
    if (gameObjects.indexOf(GlobalParams.camera.Targets[1]) === -1) {
        GlobalParams.camera.OldTargets[1] = GlobalParams.camera.CurrentCam[1];
        GlobalParams.camera.Blender[1] = 100;
        // GlobalParams.camera.Targets[1] = (gameObjects[1] === GlobalParams.camera.Targets[0]) ? gameObjects[0] : gameObjects[1];
        GlobalParams.camera.Distance = GlobalParams.universeSize * w;
        for (var target of gameObjects) {
            if (target === GlobalParams.camera.Targets[0]) continue;
            if (!(target instanceof Graphic)) continue;

            if (target instanceof Ship) {
                GlobalParams.camera.Targets[1] = target;
                break;
            // } else if (target.mass > GlobalParams.camera.Targets[1].mass || (gameObjects.indexOf(GlobalParams.camera.Targets[1]) === -1)) {
            }

            const d = camTool.getSeperation(target, GlobalParams.camera.Targets[0]);
            if (d < GlobalParams.camera.Distance || (gameObjects.indexOf(GlobalParams.camera.Targets[1]) === -1)) {
                GlobalParams.camera.Distance = d;
                GlobalParams.camera.Targets[1] = target;
            }

            // if (target instanceof Graphic && !(GlobalParams.camera.Targets[1] instanceof Graphic)) {
            //     GlobalParams.camera.Distance = d;
            //     GlobalParams.camera.Targets[1] = target;
            // }
        }
    }

    if (GlobalParams.camera.Blender[0] > 0) GlobalParams.camera.Blender[0]--;
    if (GlobalParams.camera.Blender[1] > 0) GlobalParams.camera.Blender[1]--;

    GlobalParams.camera.OldTargets[0].updatePosition(dT);
    GlobalParams.camera.OldTargets[1].updatePosition(dT);

    // Cosine -1 --> 1 : k 1 --> 0
    const k1 = 0.5 * (1 - Math.cos(Math.PI * GlobalParams.camera.Blender[0] / 100));
    const k2 = 0.5 * (1 - Math.cos(Math.PI * GlobalParams.camera.Blender[1] / 100));

    // Create "currentCamera", so can start Tspline from here rather than waiting till now defunct destination
    var camera1 = GlobalParams.camera.CurrentCam[0];
    camera1.x = GlobalParams.camera.Targets[0].x + k1 * (GlobalParams.camera.OldTargets[0].x - GlobalParams.camera.Targets[0].x);
    camera1.y = GlobalParams.camera.Targets[0].y + k1 * (GlobalParams.camera.OldTargets[0].y - GlobalParams.camera.Targets[0].y);
    var camera2 = GlobalParams.camera.CurrentCam[1];
    camera2.x = GlobalParams.camera.Targets[1].x + k2 * (GlobalParams.camera.OldTargets[1].x - GlobalParams.camera.Targets[1].x);
    camera2.y = GlobalParams.camera.Targets[1].y + k2 * (GlobalParams.camera.OldTargets[1].y - GlobalParams.camera.Targets[1].y);

    interaction.near(camera1, camera2);
    interaction.touching();
    interaction.resolve();
    var cos_theta   = interaction.unitVector.x;
    var sin_theta   = interaction.unitVector.y;
    GlobalParams.theta = Math.atan(sin_theta/cos_theta);
    if (cos_theta < 0) GlobalParams.theta+= Math.PI;

    // Centre origin in middle of screen
    ctx.translate(w/2,  h/2);
    if (GlobalParams.rotatingFrame) {ctx.rotate(GlobalParams.theta);}

    // Reverse y axis so Y is up
    ctx.scale(1, -1);
    // Scale so always fits

    GlobalParams.scale = Math.min(3, (h*0.9)/interaction.seperation);
    GlobalParams.centreX = -(camera1.x + interaction.x * 0.5);
    GlobalParams.centreY = -(camera1.y + interaction.y * 0.5);

    ctx.scale( GlobalParams.scale, GlobalParams.scale);
    // Move viewport to centre on midpoint between ships
    ctx.translate(GlobalParams.centreX, GlobalParams.centreY);

    for (var gameObject of gameObjects){
        gameObject.draw();
        // if (gameObject === GlobalParams.camera.Targets[0])draw_ball(gameObject.x, gameObject.y, gameObject.size, 100-GlobalParams.camera.Blender[0], 0, 0);
        // if (gameObject === GlobalParams.camera.Targets[1])draw_ball(gameObject.x, gameObject.y, gameObject.size, 0, 100-GlobalParams.camera.Blender[1], 0);
    }
    // gameObject = GlobalParams.camera.OldTargets[0];
    // draw_ball(gameObject.x, gameObject.y, gameObject.size, 100, 100, 0);
    // gameObject = GlobalParams.camera.OldTargets[1];
    // draw_ball(gameObject.x, gameObject.y, gameObject.size, 100, 0, 100);

    setTimeout(animate, GlobalParams.refreshInterval.animation);
}

function getPilotInput(){
    timeStep('pilotInput');
    for (var gameObject of gameObjects)
        if (gameObject instanceof Ship)
            gameObject.getPilotCommand(deltaT.pilotInput);
    setTimeout(getPilotInput, GlobalParams.refreshInterval.pilotInput);
}

function updateScoreStars(){
    timeStep("starsAndScores");

    GlobalParams.FPS        = 1000 / deltaT.animation;
    GlobalParams.CPS        = 1000 / (deltaT.physics / GlobalParams.slowMoFactor);

    starfield.width = starfield.width;

    gameDisplayText("Daddy : "  + (1000000 + parseInt(GlobalParams.scores[1])).toString().slice(1), .05, .1);
    gameDisplayText("Baddies : "+ (1000000 + parseInt(GlobalParams.scores[3])).toString().slice(1), .4, .1);
    gameDisplayText("Finn : "   + (1000000 + parseInt(GlobalParams.scores[2])).toString().slice(1), .8, .1);

    // gameDisplayText("B0 : "     + GlobalParams.camera.Blender[0],   .00, .95);
    // gameDisplayText("B1 : "     + GlobalParams.camera.Blender[1],   .90, .95);
    // gameDisplayText("SloMo : "     + GlobalParams.slowMoCounter,   .00, .95);
    gameDisplayText(""     + GlobalParams.camera.Targets[1].gameClass,   .90, .95);
    gameDisplayText("FPS : "    + Math.round(GlobalParams.FPS),     .15, .95);
    gameDisplayText("Objects : "+ gameObjects.length,               .45, .95);
    gameDisplayText("CPS : "    + Math.round(GlobalParams.CPS),     .75, .95);

    ctxStars.translate(w/2,  h/2);
    ctxStars.scale(1, -1);

    if (GlobalParams.rotatingFrame) {ctxStars.rotate(-GlobalParams.theta);}
    ctxStars.scale( GlobalParams.scale, GlobalParams.scale);
    ctxStars.translate(GlobalParams.centreX, GlobalParams.centreY);
    ctxStars.rect(-0.5 * GlobalParams.universeSize * w, -0.5 * GlobalParams.universeSize * h, GlobalParams.universeSize * w, GlobalParams.universeSize * h);
    ctxStars.lineWidth = 5;
    ctxStars.strokeStyle = "white";
    ctxStars.stroke();
    for (var star of stars)
        star.updatePosition(deltaT.starsAndScores).boundaryConstraint().draw();

    setTimeout(updateScoreStars, GlobalParams.refreshInterval.starsAndScores);
}

function launch(){
    iteratePhysics();
    animate();
    updateScoreStars();
    getPilotInput();
}