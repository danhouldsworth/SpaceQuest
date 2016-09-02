/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

function impossible(){
    gameObjects.push(new Ship(      w * 0.1, h * 0.5, 1));
    gameObjects.push(new Ship(      w * 0.9, h * 0.5, 2));
    gameObjects.push(new BossBaddy( w * 0.5, h * 0.5));
    gameObjects.push(new BossBaddy( w * 1.5, h * 0.5));

    gameObjects.push(new Asteroid(  w * 0.25,  h * 0.25, 0, 0, 50, 0));
    gameObjects.push(new Asteroid(  w * 0.5,  h * 0.25, 0, 0, 50, 0));
    gameObjects.push(new Asteroid(  w * 0.75,  h * 0.25, 0, 0, 50, 0));
    gameObjects.push(new Asteroid(  w * 0.25,  h * 0.75, 0, 0, 50, 0));
    gameObjects.push(new Asteroid(  -w * 0.5,  -h * .5, 0, 0, 50, 0));
    gameObjects.push(new Asteroid(  w * 0.75,  h * 0.75, 0, 0, 50, 0));
}
// --
initGameArea();
impossible();
launch();
