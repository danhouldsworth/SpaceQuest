"use strict";
/* jshint
node : true
*/

var SerialPort = require('serialport');
var port = new SerialPort('/dev/tty.usbmodem11', {baudRate: 115200});

port.on('open', function() {
  // port.write('main screen turn on', function(err) {
  //   if (err) {
  //     return console.log('Error on write: ', err.message);
  //   }
  //   console.log('message written');
  // });
  console.log('SerialPort opened : ' + JSON.stringify(this));
});

port.on('error', function(err) {
  console.log('Error: ', err.message);
});

port.on('data', function(data) {
  // process.stdout.write(data);
});


var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});
client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) 	{console.log("Connection Error: " + error.toString());});
    connection.on('close', function() 		{console.log('echo-protocol Connection Closed');});
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
        	let msgObj = JSON.parse(message.utf8Data);
        	if (msgObj.command && msgObj.command === "orientationData"){console.log("Angle:" + msgObj.orientationData.alpha);}
        	if (msgObj.command && msgObj.command === "motionData"){console.log("Angle:" + msgObj.motionData.alpha);}
        }
    });
    // if (connection.connected) {connection.sendUTF(number.toString());}
    // sendNumber();
});
client.connect('ws://baremetalrobots.com:80/', 'bare-metal-robot');
