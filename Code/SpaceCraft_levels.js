/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

function impossible(){
    gameObjects.push(new PlayerShip(      -w, h * 0.6, 1));
    gameObjects.push(new PlayerShip(      +w, h * 0.4, 2));
    // gameObjects.push(new BossBaddy( w, h * 0.6));
    // gameObjects.push(new BossBaddy( w, h * 0.4));

    for (var count = 0; count < 100; count++)
        gameObjects.push(new Asteroid( (Math.random()-0.5) * w, (Math.random()-0.5) * 8*h, 0.2 * (Math.random() - 0.5), 0.2 * (Math.random() - 0.5), 200 * Math.random(), 0.01 * (Math.random() - 0.5)));
        // gameObjects.push(new Asteroid( (Math.random()-0.5) * 8*w, (Math.random()-0.5) * 8*h, 0.2 * (Math.random() - 0.5), 0.2 * (Math.random() - 0.5), 200 * Math.random(), 0.01 * (Math.random() - 0.5)));

    GlobalParams.camera.Targets[0] = gameObjects[0];
    GlobalParams.camera.Targets[1] = gameObjects[1];
    GlobalParams.camera.OldTargets[0] = {x : -w*6, y : 0, size : 1};
    GlobalParams.camera.OldTargets[1] = {x : w*6, y : 0, size : 1};
}
// --
initGameArea();
impossible();
launch();
