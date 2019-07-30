

const BigRocket = function(x, y, vx, vy, size, parent){
    const density = 40;
    this.base = RobotShip;
    this.base(x, y, vx, vy, size, density, mis);
    this.gameClass      = 'missile';
    this.parent         = parent;
    this.team           = parent.team;
    this.angle          = this.parent.angle;
    // this.vx             = vx;
    // this.vy             = vy;
    this.showEnergyBar  = false;
    this.damagePts      = parent.size;

this.launchtime=Date.now();

};
BigRocket.prototype                   = Object.create(RobotShip.prototype);
BigRocket.prototype.constructor       = RobotShip;
BigRocket.prototype.getPilotCommand   = function(deltaT){
    // this.PDinnerLoop_OrientationControlForDesiredAngle(this.target.angle, deltaT);
    this.enginesActive.mainJet = 1;
    if (this.size > 10 && this.launchtime < (Date.now()-1000)){
        const split1 = new BigRocket(
            this.x + 1*this.size * Math.cos(this.angle + Math.PI / 2),
            this.y + 1*this.size * Math.sin(this.angle + Math.PI / 2),
            this.vx,
            this.vy,
            this.size / 2,
            this
        );
        gameObjects.push(split1);

        const split2 = new BigRocket(
            this.x + 1*this.size * Math.cos(this.angle - Math.PI / 2),
            this.y + 1*this.size * Math.sin(this.angle - Math.PI / 2),
            this.vx,
            this.vy,
            this.size / 2,
            this
        );
        gameObjects.push(split2);
        // this.explode();
        sound(tracks.Stinger);
        Particle.prototype.explode.call(this);
    } else if(this.size<10){
            this.explode();
    }
};

const Baddy                           = function(x, y){
    this.base = RobotShip;
    this.base(x, y, 0,0,30, 1, bombBaddy);
    this.team = 3;
    this.angle = Math.PI / 2;

    this.projectileEngines.mainJet.projectileSize       *= 1.2;
    this.projectileEngines.frontRight.projectileSize    *= 1.5;
    this.projectileEngines.frontLeft.projectileSize     *= 1.5;
    this.projectileEngines.backLeft.projectileSize      *= 1.5;
    this.projectileEngines.backRight.projectileSize     *= 1.5;
    this.projectileEngines.hoseGun.projectileSize       *= 3;
};
Baddy.prototype                     = Object.create(RobotShip.prototype);
Baddy.prototype.constructor         = RobotShip;
Baddy.prototype.getPilotCommand     = function(deltaT){
    this.canclePreviousControl();
    this.ensureTargetLock();
    let accel = this.getMainJetAcceleration();

    let X0 = this.target.x - this.x;
    let Y0 = this.target.y - this.y;
    let R0sqrd = X0 * X0 + Y0 * Y0;
    let VX0 = this.target.vx - this.vx;
    let VY0 = this.target.vy - this.vy;
    let RV0sqd = VX0 * VX0 + VY0 * VY0;
    let R0dotRV0 = X0 * VX0 + Y0 * VY0;
    let R2missilePrime   = t => 0.25 * accel * accel * t * t * t * t;
    let R2targetPrime    = t => R0sqrd + 2*t*R0dotRV0 + t*t*RV0sqd;

    let t;
    for (t = 0; t < 5000; t++){
        if (R2missilePrime(t) >= R2targetPrime(t)) {break}
    }
    let theta = getAngle(X0+t*VX0, Y0+t*VY0);
    // this.resetModel().prepModelPath(0).calcModelPath(0, deltaT, theta);
    this.fullLoopRotationalPD(theta, deltaT);
    if (this.getSeperationFrom(this.target) < 5*(this.target.size + this.size)) {this.enginesActive.hoseGun = 1;}
    this.enginesActive.mainJet = 1;//this.energy;
};


const BossBaddy                       = function(x,y){
    const density = 1;
    this.base = RobotShip;
    this.base(x, y, 0,0,300, density, spawnBaddy);
    this.team = 3;
    this.baddySpawnReady    = false;
    this.baddySpawnTimer    = (function(parent){setInterval(function(){parent.baddySpawnReady = true;}, 2000);})(this);
    this.angle = Math.PI / 2;
};
BossBaddy.prototype                 = Object.create(RobotShip.prototype);
BossBaddy.prototype.constructor     = RobotShip;
BossBaddy.prototype.getPilotCommand = function(deltaT){
    if (this.baddySpawnReady){
        this.baddySpawnReady = false;
        const childBaddy = new Baddy(
            this.x - 1.2 * this.size * Math.cos(this.angle) + 4 * Math.random() - 2,
            this.y - 1.2 * this.size * Math.sin(this.angle) + 4 * Math.random() - 2
        );
        childBaddy.parent = this;
        childBaddy.size = this.size / 2;
        gameObjects.push(childBaddy);
    }
    this.canclePreviousControl();
    this.ensureTargetLock();
    this.angle = 0;
    // this.othoganolThrustToReduceVelocityDeltaError(deltaT);
};