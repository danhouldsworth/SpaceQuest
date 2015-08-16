/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */
/* global Interaction, Wall, playerShips, baddies, elasticons, particles, attachments, currentObjects, gameArea, timerAnimate, gameDisplayText */
"use strict";

var interaction = new Interaction();// -- Interaction object is useful to have seperation x,y,vx,vy,mass etc
var wall = new Wall();              // -- Simulate wall as a infinitely large particle

function iteratePhysics(){

    var i,j;

    // -- Iterate through the playerShips (aka Goodies)
    for (i = 0; i < playerShips.length; i++){

        for (j = i + 1; j < playerShips.length; j++) playerShips[i].collide(playerShips[j]);
        for (j = 0;     j < baddies.length;     j++) playerShips[i].collide(baddies[j]);
        for (j = 0;     j < elasticons.length;  j++) playerShips[i].collide(elasticons[j]);
        for (j = 0;     j < particles.length;   j++) playerShips[i].collide(particles[j]);

        playerShips[i].boundary();
        playerShips[i].stabilise();
        playerShips[i].update();
        playerShips[i].applyCommand();
    }
    // --

    // -- Iterate through the baddies
    for(i = 0; i < baddies.length; i++){

        for (j = i + 1; j < baddies.length;     j++) baddies[i].collide(baddies[j]);
        for (j = 0;     j < elasticons.length;  j++) baddies[i].collide(elasticons[j]);
        for (j = 0;     j < particles.length;   j++) baddies[i].collide(particles[j]);

        baddies[i].boundary();
        baddies[i].stabilise();
        baddies[i].update();
        baddies[i].chase();
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

    // -- 5x physics steps for every display frame
    iteratePhysics();
    iteratePhysics();
    iteratePhysics();
    iteratePhysics();
    iteratePhysics();
    // --

    function draw_all_of(typeGroup, shade){
        for (var i = 0; i < typeGroup.length; i++){
            if (typeGroup[i].size >=1.1){
                typeGroup[i].draw(shade);
                // -- Apply evaporation of particles
                if (typeGroup[i].name === 'thrust'){
                    typeGroup[i].size -= 0.1;
                }
                if (typeGroup[i].name === 'bomb'){
                    typeGroup[i].size -= 0.1;
                }
                if (typeGroup[i].name === 'bullet'){
                    typeGroup[i].size -= 0.05;
                }
                // --
            } else {
                // -- Remove objects too small
                typeGroup.splice(i--,1);
                currentObjects--;
                // --
            }
        }
    }

    gameArea.width = gameArea.width;
    draw_all_of(particles);
    draw_all_of(elasticons, 100);
    draw_all_of(attachments, 200);
    draw_all_of(baddies);
    draw_all_of(playerShips);

    if (playerShips.length < 1){
        clearInterval(timerAnimate);
        gameDisplayText("You LOSE!!");
    }
    else if (baddies.length < 1){
        clearInterval(timerAnimate);
        gameDisplayText("You WIN!!");
    }

}
