"use strict";
/* jshint browser : true, quotmark : false, white : false, indent : false, onevar : false */

// -- Math typing shortcuts
const PI    = Math.PI; const halfPi = PI/2;
const sin   = Math.sin;
const cos   = Math.cos;
const atan  = Math.atan; const atan2  = Math.atan2;
const sqrt  = Math.sqrt;
const min   = Math.min;
const max   = Math.max;
const abs   = Math.abs;
const floor = Math.floor;
const sign  = Math.sign;
const round = Math.round;
const random= Math.random;
// --

// -- Useful math functions
const modulus       = (x, y) => sqrt(x * x + y * y);
const restitution   = (P1,P2)=> (P1.restitution + P2.restitution) / 2;
const friction      = (P1,P2)=> (P1.friction + P2.friction) / 2;
const normaliseAngleMinus2PIto2PI   = grossAngle => grossAngle % (2 * PI);
const normaliseAngle0to2PI          = grossAngle => normaliseAngleMinus2PIto2PI(grossAngle) + (normaliseAngleMinus2PIto2PI(grossAngle) < 0 ? (2*PI) : 0);
const normaliseAnglePItoMinusPI     = grossAngle => normaliseAngle0to2PI(grossAngle)        - (normaliseAngle0to2PI(grossAngle) > PI ? (2*PI) : 0);

const unitVectorFromAngle = angle => ({x:cos(angle), y:sin(angle)});
const getAngle = (x, y) => atan2(y, x);

const getAngleV                     = v => getAngle(v.x, v.y);
const modulusV                      = v => modulus(v.x, v.y);
const constraintHalfPiToMinusHalfPi = v => max(min(halfPi, v), -halfPi); // Clips

const getAngleDelta     = (a, b) => normaliseAnglePItoMinusPI(b-a);
const getAngleAverage   = (a, b) => a + getAngleDelta(a, b) / 2;

// Display shortcut
const displayAsPI = f => round(100*f/PI)/100;
