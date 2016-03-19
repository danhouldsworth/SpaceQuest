/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
/* global Interaction, Wall, spaceShips, spaceShips, elasticons, particles, attachments, , gameArea, timerAnimate, gameDisplayText */
"use strict";

var interaction = new Interaction();// -- Interaction object is useful to have seperation x,y,vx,vy,mass etc
var wall = new Wall();              // -- Simulate wall as a infinitely large particle
var scored = false;
function iteratePhysics(){

    var i,j;

    // -- Iterate through the spaceShips
    for (i = 0; i < spaceShips.length; i++){

        for (j = i + 1; j < spaceShips.length;  j++) spaceShips[i].collide(spaceShips[j]);
        for (j = 0;     j < elasticons.length;  j++) spaceShips[i].collide(elasticons[j]);
        for (j = 0;     j < particles.length;   j++) spaceShips[i].collide(particles[j]);

        spaceShips[i].boundary();
        spaceShips[i].stabilise();
        spaceShips[i].update();
    }
    // --

    // -- Iterate through the dumb particles.
    for (i = 0; i < particles.length; i++){

        for (j = i + 1; j < particles.length;   j++) particles[i].collide(particles[j]);
        for (j = 0;     j < elasticons.length;  j++) particles[i].collide(elasticons[j]);

        particles[i].boundary();
        particles[i].stabilise();
        particles[i].update();
    }
    // --

    // -- Iterate throught the elasticons.
    for (i = 0; i < elasticons.length; i++){

        // -- elasticons attracted in order so look at the next one (unless on the last)
        if (i != elasticons.length - 1){
            interaction.clear();        // Needed as stretch() will need to re-eval if collide() did not resolve()
            elasticons[i].collide(elasticons[i + 1]);
            elasticons[i].stretch(elasticons[i + 1]);
        }
        // --

        // -- Attachments are ghost objects that attract a specific Elasticon #
        if (elasticons[i].attached !== false) {
            interaction.clear();
            elasticons[i].collide(attachments[elasticons[i].attached]);
            elasticons[i].stretch(attachments[elasticons[i].attached]);
        }
        // --

        elasticons[i].boundary(); // Likewise we could remove this on the basis that they will always be dragged back into frame
        elasticons[i].stabilise(); // Specific stabilisation could be quicker than drag?
        elasticons[i].update( -0.05 * elasticons[i].mass ); // Dampen the elasticons with drag
    }
}

function animate(){

    explosionActive = false;

    for (var i = 0; i < spaceShips.length; i++) {spaceShips[i].getPilotCommand();}
    iteratePhysics();
    iteratePhysics();
    iteratePhysics();
    iteratePhysics();
    iteratePhysics();

    while ( particles.length > 400) {
        var largestSize = 0;
        var smallestSize = 100;
        var index = 0;
        for (var i = 0; i < particles.length; i++){
            // if (particles[i].size > largestSize){
            //     largestSize = particles[i].size;
            //     index = i;
            // }
            if (particles[i].size < smallestSize){
                smallestSize = particles[i].size;
                index = i;
            }
        }
        particles.splice(index, 1);
    }

    function draw_all_of(typeGroup){
        for (var i = 0; i < typeGroup.length; i++){
            var thisObject = typeGroup[i];
            if (thisObject.size >=1.1 && thisObject.energy > 0){
                thisObject.draw();
                switch (thisObject.gameClass){
                    case 'particle' :   thisObject.energy = 1; break;
                    case 'thrust'   :   thisObject.size -= 0.1; break;
                    case 'bomb'     :   thisObject.size -= 0.1; explosionActive = true; break;
                    case 'bullet'   :   thisObject.size -= 0.1; break;
                    case 'ship'     :
                    case 'baddy'    :   thisObject.energy = Math.min(thisObject.energy + 0.005, 1); break;
                }
            } else {
                // -- Remove objects too small
                typeGroup.splice(i--,1);
                // --
                // If its a baddy or a ship then blow up
                if (thisObject.gameClass === 'baddy'){
                    scored = true;
                    explosionActive = true;
                    clearInterval(thisObject.baddySpawnTimer);
                    var numberOfBombs = thisObject.mass / 20;
                    for(var bombPiece = 1; bombPiece < numberOfBombs; bombPiece++) {
                        particles.push(new Bomb(
                            thisObject.x + thisObject.size * Math.random() * Math.cos(2 * Math.PI * numberOfBombs / bombPiece),
                            thisObject.y + thisObject.size * Math.random() * Math.sin(2 * Math.PI * numberOfBombs / bombPiece),
                            Math.cos(2 * Math.PI * numberOfBombs / bombPiece),
                            Math.sin(2 * Math.PI * numberOfBombs / bombPiece),
                            Math.random() * 4 + 1
                        ));
                    }
                }
                if (thisObject.gameClass === 'ship'){
                    scored = true;
                    var spiritBaddy = new BossBaddy(thisObject.x, thisObject.y);
                    spiritBaddy.getPilotCommand = Ship.prototype.getPilotCommand;
                    spiritBaddy.player = thisObject.player;
                    // if (thisObject.player === 2) {
                        spiritBaddy.thrust *= 10;
                        spiritBaddy.sideThrust *= 3;
                        spiritBaddy.fireRate *= 3;
                        spiritBaddy.calcMass();
                    // } else {
                        // spiritBaddy.size *= 1.5;
                        // spiritBaddy.calcMass();
                    // }
                    spaceShips.push(spiritBaddy);
                    spiritBaddy.baddySpawn(spiritBaddy);
                }
            }
        }
    }

    gameArea.width = gameArea.width;
    draw_all_of(particles);
    draw_all_of(elasticons);
    draw_all_of(attachments);
    draw_all_of(spaceShips);

    if (scored && explosionActive === false){
        if ( (spaceShips.length === 1 && !(spaceShips[0] instanceof Baddy)) || (spaceShips.length === 2 && !(spaceShips[0] instanceof Baddy) && !(spaceShips[1] instanceof Baddy)) ) {
            clearInterval(timerAnimate);
            clearInterval(baddySpawn);
            gameDisplayText("You WIN!!");
        }
    }
}