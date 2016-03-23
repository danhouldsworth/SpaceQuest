/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
/* global Interaction, Wall, spaceShips, spaceShips, elasticons, particles, attachments, , gameArea, timerAnimate, gameDisplayText */
"use strict";
var interaction = new Interaction();// -- Interaction object is useful to have seperation x,y,vx,vy,mass etc
var wall = new Wall();              // -- Simulate wall as a infinitely large particle
var scored = false;
function iteratePhysics(){

    var i,j;
    deltaT.iteratePhysics = Date.now() - lastTime.iteratePhysics;
    lastTime.iteratePhysics = Date.now();
    // -- Iterate through the spaceShips
    for (i = 0; i < spaceShips.length; i++){

        for (j = i + 1; j < spaceShips.length;  j++) spaceShips[i].collide(spaceShips[j]);
        for (j = 0;     j < elasticons.length;  j++) spaceShips[i].collide(elasticons[j]);
        for (j = 0;     j < particles.length;   j++) spaceShips[i].collide(particles[j]);

        spaceShips[i].boundary().update().stabilise();
        spaceShips[i].energy = Math.min(spaceShips[i].energy + 0.001, 1);
    }
    // --

    // -- Iterate through the dumb particles.
    for (i = 0; i < particles.length; i++){

        for (j = i + 1; j < particles.length;   j++) particles[i].collide(particles[j]);
        for (j = 0;     j < elasticons.length;  j++) particles[i].collide(elasticons[j]);

        particles[i].boundary().stabilise().update();
        switch (particles[i].gameClass){
            case 'particle' :   particles[i].energy = 1; break;
            case 'thrust'   :   particles[i].size -= 0.02; break;
            case 'bomb'     :   particles[i].size -= 0.02; GlobalParams.explosionActive = true; break;
            case 'bullet'   :   particles[i].size -= 0.02; break;
        }
    }
    // --

    // -- Iterate throught the elasticons.
    for (i = 0; i < elasticons.length; i++){

        // -- elasticons attracted in order so look at the next one (unless on the last)
        if (i != elasticons.length - 1){
            interaction.clear();        // Needed as stretch() will need to re-eval if collide() did not resolve()
            elasticons[i].collide(elasticons[i + 1]).stretch(elasticons[i + 1]);
        }
        // -- Attachments are ghost objects that attract a specific Elasticon #
        if (elasticons[i].attached !== false) {
            interaction.clear();
            elasticons[i].collide(attachments[elasticons[i].attached]).stretch(attachments[elasticons[i].attached]);
        }
        // --
        elasticons[i].boundary().stabilise().update( -0.05 * elasticons[i].mass ); // Dampen the elasticons with drag
    }

    setTimeout(iteratePhysics, 1);
}


function animate(){
    deltaT.animate = Date.now() - lastTime.animate;
    lastTime.animate = Date.now();

    function draw_all_of(typeGroup){
        for (var i = 0; i < typeGroup.length; i++){
            var thisObject = typeGroup[i];
            if (thisObject.size >=1.1 && thisObject.energy > 0){
                thisObject.draw();
            } else {
                // -- Remove objects too small
                typeGroup.splice(i--,1);
                // If its a baddy or a ship then blow up
                if (thisObject instanceof Graphic){
                    scored = true;
                    GlobalParams.explosionActive = true;
                    if (thisObject.baddySpawnTimer) clearInterval(thisObject.baddySpawnTimer);
                    var numberOfBombs = (5 * thisObject.speed() + thisObject.mass) / 20;
                    var bombSpeed = 0.2;
                    for(var bombPiece = 1; bombPiece < numberOfBombs; bombPiece++) {
                        particles.push(new Bomb(
                            thisObject.x + thisObject.size * Math.random() * Math.cos(2 * Math.PI * numberOfBombs / bombPiece),
                            thisObject.y + thisObject.size * Math.random() * Math.sin(2 * Math.PI * numberOfBombs / bombPiece),
                            bombSpeed * Math.cos(2 * Math.PI * numberOfBombs / bombPiece),
                            bombSpeed * Math.sin(2 * Math.PI * numberOfBombs / bombPiece),
                            Math.random() * 4 + 1
                        ));
                    }
                }
            }
        }
    }

    GlobalParams.explosionActive = false;

    for (var i = 0; i < spaceShips.length; i++) {spaceShips[i].getPilotCommand();}

    while ( particles.length > 400) {
        var smallestSize = 100;
        var index = 0;
        for (var i = 0; i < particles.length; i++){
            if (particles[i].size < smallestSize){
                smallestSize = particles[i].size;
                index = i;
            }
        }
        particles.splice(index, 1);
    }

    gameArea.width = gameArea.width;
    draw_all_of(particles);
    draw_all_of(elasticons);
    draw_all_of(attachments);
    draw_all_of(spaceShips);
    setTimeout(animate, 20);
}

function updateScoreStars(){
    deltaT.updateScoreStars = Date.now() - lastTime.updateScoreStars;
    lastTime.updateScoreStars = Date.now();

    starfield.width = starfield.width;
    for (var i = 0; i < stars.length; i++){
        stars[i].update().boundary().draw();
    }
    gameDisplayText("Daddy : " + (1000000 + GlobalParams.scores[1]).toString().slice(1), .05, .1);
    gameDisplayText("Finn : "  + (1000000 + GlobalParams.scores[2]).toString().slice(1), .6, .1);
    gameDisplayText("FPS : " + Math.floor(1000/deltaT.animate), .2, .95);
    gameDisplayText("CPS : " + Math.floor(1000/deltaT.iteratePhysics), .6, .95);
    if (scored && GlobalParams.explosionActive === false){
        if ( (spaceShips.length === 1 && !(spaceShips[0] instanceof Baddy)) || (spaceShips.length === 2 && !(spaceShips[0] instanceof Baddy) && !(spaceShips[1] instanceof Baddy)) ) {
            clearInterval(baddySpawn);
            gameDisplayText("You WIN!!", spaceShips[0].x / w, spaceShips[0].y / h);
        }
    }
    setTimeout(updateScoreStars,50);
}
function launch(){
    iteratePhysics();
    animate();
    updateScoreStars();
}