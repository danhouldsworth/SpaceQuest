/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

function impossible(){
    gameObjects.push(new Ship(      w * 0.1, h * 0.5, 1));
    gameObjects.push(new Ship(      w * 0.9, h * 0.5, 2));
    gameObjects.push(new BossBaddy( w * 0.5, h * 0.5));
    gameObjects.push(new BossBaddy( w * 1.5, h * 0.5));

    // gameObjects.push(new Asteroid(  w * 0.25,  h * 0.25, 0, 0, 50, 0));
    // gameObjects.push(new Asteroid(  w * 0.5,  h * 0.25, 0, 0, 50, 0));
    // gameObjects.push(new Asteroid(  w * 0.75,  h * 0.25, 0, 0, 50, 0));
    // gameObjects.push(new Asteroid(  w * 0.25,  h * 0.75, 0, 0, 50, 0));
    // gameObjects.push(new Asteroid(  -w * 0.5,  -h * .5, 0, 0, 50, 0));
    // gameObjects.push(new Asteroid(  w * 0.75,  h * 0.75, 0, 0, 50, 0));

    for (var count = 0, star; count < 50; count++)
        gameObjects.push(new Asteroid( (Math.random()-0.5) * 8*w, (Math.random()-0.5) * 8*h, 0.2 * (Math.random() - 0.5), 0.2 * (Math.random() - 0.5), 200 * Math.random(), 0.01 * (Math.random() - 0.5)));

    GlobalParams.camera.Targets[0] = gameObjects[0];
    GlobalParams.camera.Targets[1] = gameObjects[1];
    GlobalParams.camera.OldTargets[0] = GlobalParams.camera.OldTargets[1] = {
        x : (GlobalParams.camera.Targets[0].x + GlobalParams.camera.Targets[1].x) / 2,
        y : (GlobalParams.camera.Targets[0].y + GlobalParams.camera.Targets[1].y) / 2,
        size : 1
    };
}
// --
initGameArea();
impossible();
launch();
