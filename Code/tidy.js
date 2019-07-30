RobotShip.prototype.PDinnerLoop_getThrustAngleForInterceptToTarget  = function(deltaT){
    const kP = 0.05 * this.mass / this.getForceAvailable('mainJet');
    const kD = 500 * kP; // NOT CLEAR HOW TO SET kD
    const theta   = this.sampleData.deflectionAngleToMovingTarget;
    // Simple fudge if travelling away from target AND YET APPEARS TO ENABLE CORRECT REVERSE ORIENTATION FOR OVERSHOOT
    if(theta >  Math.PI/2) theta = +Math.PI - theta;
    if(theta < -Math.PI/2) theta = -Math.PI - theta;
    // --
    const lastErr = this.lastSampleData.err_interceptEffort;

    const approachSpeed = this.sampleData.ourSpeedInTargetFrameOfRef;
    const err         = (approachSpeed < 0.25) ? approachSpeed * theta : approachSpeed * Math.tan(theta); // The quantiy we want to minimise to ensure a CONTROLLABLE intercept [closest approach of current trajectory / time to closest approach]
    const errDot      = (err - lastErr || 0) / deltaT;
    const response    = kP * err + kD * errDot;
    if (isNaN(response))response = 0;
    if (response > +1)  response = +1;
    if (response < -1)  response = -1;
    const desiredAngleForThrust = this.sampleData.absoluteAngleToTarget + response * Math.PI / 2;

    this.sampleerr_interceptEffort = err;
    return desiredAngleForThrust;
};
