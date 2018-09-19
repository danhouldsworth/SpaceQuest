// npm install websocket
// sudo node Server.js 443
// https://54.246.224.158/spacequest

"use strict";
/* jshint
node : true
*/
// node Server.js 8000
// https://localhost:8000/spacequest

let WebSocketServer = require("websocket").server,
    fs = require("fs"),
    liveConnections = [],
    onGETrequest = function(request, response) {
        request.addListener("data", function(postDataChunk){console.log("Consuming data : " + postDataChunk);});
        request.addListener("end",  function(){
            response.writeHead(200);
            switch (request.url.toLowerCase()){
                case "/smashyball"  : response.end(fs.readFileSync("SmashyBall.html")); break;
                case "/spacequest"  : response.end(fs.readFileSync("SpaceCraft.html")); break;
                case "/accel"       : response.end(fs.readFileSync("AccelSpike.html")); break;
                case "/favicon.ico" :
                case "/favicon.png" : response.end(fs.readFileSync("favicon.png"));     break;
                default :
                    try {response.end(fs.readFileSync("../" + request.url)); break;}
                    catch (err){
                        console.log(err);
                    }
                }
        });
    },
    onWSrequest = function(request) {
        let thisConnection = request.accept("bare-metal-robot", request.origin);
        thisConnection.on("close", function(reasonCode, description) {
            let index = liveConnections.indexOf(this);
            liveConnections.splice(index,1);
            console.log("Closing a thisConnection..");
        });
        thisConnection.on("message" , function(message) {
            // console.log(message);
            liveConnections.forEach(function(conn){
                if (conn !== thisConnection) {conn.sendUTF(message.utf8Data);}
            });
        });
        liveConnections.push(thisConnection);
        thisConnection.sendUTF(JSON.stringify({command:"Begin!"}));
        // thisConnection.sendBytes(Buffer.from(msgObject.binaryData));
    },
    sslCert = {
        key  : "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCbWuuVzQlS+xZ9\n73p3EzsTo7iecLG4/IECBAPvCJz4WbIsXKhGP8dQtY/LGoUGaSr84B3guPg22O1z\nR6D+OVQhRw8LL0scXzHhr9CcodluveTL+KHG3ubllqpXj1LVz+owsGsNVBm7mf0S\ncJrRsnl2c9HX1M7XRBzLdVI2ogkD7MNRIm0l3gK6W2ZYAsNDzv5w7/A+RdkMHbAQ\n/2JPsg/vLBt4lkpVSRGU05EkUGzhnMqdcb6vgtEvaaDO58aVUA6s9s8xXiEiDqLZ\n1XA0mXmgqPA/+CKlRWpdWjwiYd83wT7ALUXOu4hAUiIO0iqR1VQ1jN6VwbJjnX+f\nIuj3v5cFAgMBAAECggEAKC9EcOMwXj6Eet7PFq3qwhG/V3xe/DKUTCktu07HC5Zn\n+AGfpUwqCj5si2S4tAfQDskJ8W7nBYjnIsKMajX6BQGUapg5HYWiKXaIx3s1+ucz\nn28YqZBOuWRXe36fNp8pPJ7lkfUHEvep9nMaGNPJh1I+HU32ksgTiq02LtuK6XCV\nfa9zT6suMdwMBAHKrKZ7puKrZFPlXGY7n+aKj0+BLqvtWv5ifhmga6jtFiE76po9\nuYhsjNxGXTIRg/IYq6w2gbI0TbEQCuTB/IIJEaKtztVRTfArXT8mbrvgD8imlHL0\nwAQJE78It2EwvaHyaB4NAQsq2BsP9BY9lgnJXveVoQKBgQDNfDiG4ENepvN9BWTA\n8iXtv9DR2FESMuosoMNHbVX56txAdQI6+3wyorC3BpC83ahHPDF6Kte2Z4rrrgZj\nXYn6xdOoCjXxEBUj4Cdq9JbygiKeXxQmGUdQxhC9m1lDEFMaUf5E1O8w7cxwsrQ7\nh/WZ+QoWcwkuIVeXFVG0TGNRwwKBgQDBi95oR1F2F1vcwer8bDi0rFB/EBHd60TK\nBUih3QNILmXnO3UrjZD4emQzKy8qdeiMQ1FUv33AZDGalHFTTe3ppn4IltOnX1en\nymG0QDHk95N8edDg64REJg06Nq7fIKQ/coVeH/kYSFhi+IcKEbhD+bMMOVgbphc/\n8P/4ArFflwKBgDgaE0DX1+zuvgnDQDfhpPNdbIDug2vplL/sgIRu2ItsUQgUKjC6\nWrVkb8T4uOmnxvrz9zo4mj6F1Ir2L25Pqo1aF6iIaSPQ1US/PWPZNaEuYI9GvDSO\nsEbgXM+3q05BFb9Y5Ygbbta4Bho64DRksWyBbvykGbyLg+OPAYitVmyLAoGAUWTp\n5n6/omMWbdNbaEZ23nxs6dKvQN2VM0RflDqnC67/iev2TZeedPC7vM0Xa8rkPkB9\nLp/NWaCJP9HXisoGGLG85Q3Q+t1ctqKkzjIFCZ6Ydsuf7Ub+e85o16dxiUJn8IrP\nzZKypeSezxhnafOjw2p6QtTG2fHSa0CF1R4EzAcCgYB3lC0D1q+zZfkvK/5C20TH\n6mq1vFoKb7ow+fM6LJxr/Ao/HSR8F26H/TE5N0fPkR58uGVHdYW7CQKf6Dnr7K0Z\nzDfStwnazKsA9NvLSvGC4ru+lh1BUgD1BLDjzquULM5eq1djH7Oqp97z6PEQUFFC\np0sXm7DDPpUNxfEZavtWyg==\n-----END PRIVATE KEY-----",
        cert : "-----BEGIN CERTIFICATE-----\nMIIFCDCCA/CgAwIBAgISAY508kYOdc/nL+laI4x6VuohMA0GCSqGSIb3DQEBCwUA\nMEoxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MSMwIQYDVQQD\nExpMZXQncyBFbmNyeXB0IEF1dGhvcml0eSBYMTAeFw0xNTEyMDcxNDAxMDBaFw0x\nNjAzMDYxNDAxMDBaMB0xGzAZBgNVBAMTEnN0YWdpbmcuYnJhbWJsZS5pbzCCASIw\nDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJta65XNCVL7Fn3vencTOxOjuJ5w\nsbj8gQIEA+8InPhZsixcqEY/x1C1j8sahQZpKvzgHeC4+DbY7XNHoP45VCFHDwsv\nSxxfMeGv0Jyh2W695Mv4ocbe5uWWqlePUtXP6jCwaw1UGbuZ/RJwmtGyeXZz0dfU\nztdEHMt1UjaiCQPsw1EibSXeArpbZlgCw0PO/nDv8D5F2QwdsBD/Yk+yD+8sG3iW\nSlVJEZTTkSRQbOGcyp1xvq+C0S9poM7nxpVQDqz2zzFeISIOotnVcDSZeaCo8D/4\nIqVFal1aPCJh3zfBPsAtRc67iEBSIg7SKpHVVDWM3pXBsmOdf58i6Pe/lwUCAwEA\nAaOCAhMwggIPMA4GA1UdDwEB/wQEAwIFoDAdBgNVHSUEFjAUBggrBgEFBQcDAQYI\nKwYBBQUHAwIwDAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQUBp6q8uOodzahUOZCoOmW\nzxwI6BcwHwYDVR0jBBgwFoAUqEpqYwR93brm0Tm3pkVl7/Oo7KEwcAYIKwYBBQUH\nAQEEZDBiMC8GCCsGAQUFBzABhiNodHRwOi8vb2NzcC5pbnQteDEubGV0c2VuY3J5\ncHQub3JnLzAvBggrBgEFBQcwAoYjaHR0cDovL2NlcnQuaW50LXgxLmxldHNlbmNy\neXB0Lm9yZy8wHQYDVR0RBBYwFIISc3RhZ2luZy5icmFtYmxlLmlvMIH+BgNVHSAE\ngfYwgfMwCAYGZ4EMAQIBMIHmBgsrBgEEAYLfEwEBATCB1jAmBggrBgEFBQcCARYa\naHR0cDovL2Nwcy5sZXRzZW5jcnlwdC5vcmcwgasGCCsGAQUFBwICMIGeDIGbVGhp\ncyBDZXJ0aWZpY2F0ZSBtYXkgb25seSBiZSByZWxpZWQgdXBvbiBieSBSZWx5aW5n\nIFBhcnRpZXMgYW5kIG9ubHkgaW4gYWNjb3JkYW5jZSB3aXRoIHRoZSBDZXJ0aWZp\nY2F0ZSBQb2xpY3kgZm91bmQgYXQgaHR0cHM6Ly9sZXRzZW5jcnlwdC5vcmcvcmVw\nb3NpdG9yeS8wDQYJKoZIhvcNAQELBQADggEBAEx0Jygnyc0umXZfUqIpN2mwy8Y8\nyXQwrEShcRD4QfaWEwLsku0C/EC/loMX8HavHVB2Yoi/QC703vwGH+uBo3lXZdD1\n5Mxyz1jrTxHtsor37NcQMT8GogLEBO9Ybnf2EnKONj2gOUr01WlzEwlqoQULQJH9\ntPe75PDLUMyqcS0vUFFmYW0/fEOeuw1yyEo17ys1Jqs+oi1CxlHYuP4ubtuiyp/I\nUpRfCIKWcRJm7RV/XpLezwfpIfIpjba/v2da8X1gk+0IQvBiIG9nvE546u+UnyKa\n8yW8XGZUvXghl3qtwXUfRVnkEZsCn22tLeKBELUB725lsoPqL5jnOJ2DciQ=\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nMIIEqDCCA5CgAwIBAgIRAJgT9HUT5XULQ+dDHpceRL0wDQYJKoZIhvcNAQELBQAw\nPzEkMCIGA1UEChMbRGlnaXRhbCBTaWduYXR1cmUgVHJ1c3QgQ28uMRcwFQYDVQQD\nEw5EU1QgUm9vdCBDQSBYMzAeFw0xNTEwMTkyMjMzMzZaFw0yMDEwMTkyMjMzMzZa\nMEoxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MSMwIQYDVQQD\nExpMZXQncyBFbmNyeXB0IEF1dGhvcml0eSBYMTCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBAJzTDPBa5S5Ht3JdN4OzaGMw6tc1Jhkl4b2+NfFwki+3uEtB\nBaupnjUIWOyxKsRohwuj43Xk5vOnYnG6eYFgH9eRmp/z0HhncchpDpWRz/7mmelg\nPEjMfspNdxIknUcbWuu57B43ABycrHunBerOSuu9QeU2mLnL/W08lmjfIypCkAyG\ndGfIf6WauFJhFBM/ZemCh8vb+g5W9oaJ84U/l4avsNwa72sNlRZ9xCugZbKZBDZ1\ngGusSvMbkEl4L6KWTyogJSkExnTA0DHNjzE4lRa6qDO4Q/GxH8Mwf6J5MRM9LTb4\n4/zyM2q5OTHFr8SNDR1kFjOq+oQpttQLwNh9w5MCAwEAAaOCAZIwggGOMBIGA1Ud\nEwEB/wQIMAYBAf8CAQAwDgYDVR0PAQH/BAQDAgGGMH8GCCsGAQUFBwEBBHMwcTAy\nBggrBgEFBQcwAYYmaHR0cDovL2lzcmcudHJ1c3RpZC5vY3NwLmlkZW50cnVzdC5j\nb20wOwYIKwYBBQUHMAKGL2h0dHA6Ly9hcHBzLmlkZW50cnVzdC5jb20vcm9vdHMv\nZHN0cm9vdGNheDMucDdjMB8GA1UdIwQYMBaAFMSnsaR7LHH62+FLkHX/xBVghYkQ\nMFQGA1UdIARNMEswCAYGZ4EMAQIBMD8GCysGAQQBgt8TAQEBMDAwLgYIKwYBBQUH\nAgEWImh0dHA6Ly9jcHMucm9vdC14MS5sZXRzZW5jcnlwdC5vcmcwPAYDVR0fBDUw\nMzAxoC+gLYYraHR0cDovL2NybC5pZGVudHJ1c3QuY29tL0RTVFJPT1RDQVgzQ1JM\nLmNybDATBgNVHR4EDDAKoQgwBoIELm1pbDAdBgNVHQ4EFgQUqEpqYwR93brm0Tm3\npkVl7/Oo7KEwDQYJKoZIhvcNAQELBQADggEBANHIIkus7+MJiZZQsY14cCoBG1hd\nv0J20/FyWo5ppnfjL78S2k4s2GLRJ7iD9ZDKErndvbNFGcsW+9kKK/TnY21hp4Dd\nITv8S9ZYQ7oaoqs7HwhEMY9sibED4aXw09xrJZTC9zK1uIfW6t5dHQjuOWv+HHoW\nZnupyxpsEUlEaFb+/SCI4KCSBdAsYxAcsHYI5xxEI4LutHp6s3OT2FuO90WfdsIk\n6q78OMSdn875bNjdBYAqxUp2/LEIHfDBkLoQz0hFJmwAbYahqKaLn73PAAm1X2kj\nf1w8DdnkabOLGeOVcj9LQ+s67vBykx4anTjURkbqZslUEUsn2k5xeua2zUk=\n-----END CERTIFICATE-----"
    };

let port = process.argv[2];
let HTTPserver = require("https").createServer(sslCert, onGETrequest).listen(port);
// let HTTPserver = require("http").createServer(onGETrequest).listen(process.argv[2]);

new WebSocketServer({httpServer : HTTPserver}).on("request", onWSrequest);

console.log("Listening on port " + port + "...");