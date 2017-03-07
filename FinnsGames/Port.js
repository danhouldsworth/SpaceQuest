"use strict";
/* jshint
node : true
*/

var SerialPort = require('serialport');
var port = new SerialPort('/dev/tty.usbmodem11', {baudRate: 115200});
var DeskCopter = function(msg){
	port.write(msg, function(err) {
		if (err) {return console.log('Error on write to DeskCopter: ', err.message);}
		console.log(msg);
	});
};
port.on('open',	function() 		{console.log('SerialPort opened : ' + JSON.stringify(this));});
port.on('data', function(data) 	{process.stdout.write(data);});
port.on('error',function(err)	{console.log('Error: ', err.message);});

var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();
// client.on('connectFailed', 	function(error) 	{console.log('Connect Error: ' + error.toString());});
client.on('connect', 		function(connection){
	console.log('WebSocket Client Connected');
    connection.on('error', 	function(error) 	{console.log("Connection Error: " + error.toString());});
    connection.on('close', 	function() 			{console.log('echo-protocol Connection Closed');});
    connection.on('message',function(message) 	{
        if (message.type === 'utf8') {
        	let msgObj = JSON.parse(message.utf8Data);
        	if (msgObj.command && msgObj.command === "orientationData"){
        		// console.log("Angle:" + msgObj.orientationData.alpha);
        	}
        	if (msgObj.command && msgObj.command === "motionData"){
        		// Rx is degrees/sec in float(text)
        		// Need 0x8000 ~ +2000
        		let scaledValue = msgObj.motionData.rotationRate.alpha * 0x7fff / 2000;
        		if (scaledValue < 0) {scaledValue += 0xffff;}
        		let hexValue = Math.round(scaledValue).toString(16);
        		while (hexValue.length < 4) {hexValue = "0" + hexValue;}
				// DeskCopter("x" + hexValue);
				// DeskCopter("a");
				// DeskCopter("*");
        	}
        }
    });
    // if (connection.connected) {connection.sendUTF(number.toString());}
});
client.connect('ws://baremetalrobots.com:80/', 'bare-metal-robot');

setTimeout(function(){
	DeskCopter("a");
	// DeskCopter("*");
},5000);