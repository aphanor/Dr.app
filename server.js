/*
                                        +------------------------------------------------------------+
                                        | Module Name: NODE.JS API                                   |
                                        | Module Purpose: Doctor.app backend                         |
                                        | Author: Alexis Phanor                                      |
                                        | Date: 2016                                                 |
                                        | License: Copyright (C) ALEXIS PHANOR                       |
                                        +------------------------------------------------------------+ 
*/

require('dotenv').load();
var express = require('express'),
    http = require('http'),
    https = require('https'),
    bodyParser = require('body-parser'),
    app = express(),
    http_app = express(),
    router = express.Router(),
    jade = require('jade'),
    ip = require("ip"),
    path = require("path"),
    fs = require('fs'),
    path = require('path'),
    favicon = require('serve-favicon'),
    firebase = require("firebase"),
    pem = require('pem'),
    cache = require('apicache').middleware,
    cert = 'certificates';

/*
*   # SERVER CONFIGURATION
*   database: firebase
*   server: express
*   template: jade
*   protocol: http, https
*/

// Create SSL Certificates
pem.createCertificate({days:365, selfSigned:true}, function(err, keys) {
    var env;
    app.use(bodyParser.json());
    app.set('view engine', 'jade');
    app.enable('verbose errors');
    app.enable('trust proxy');
    
    // Certificates definition
    /*
    var httpsOpts = {
        key: fs.readFileSync(path.join(cert, "server.key")),
        cert: fs.readFileSync(path.join(cert, "server.crt"))
    };
    */
    
    // Function checking the ports
    var ports = function(http_p, https_p) {
        http_app.set('port', http_p);
        app.set('port', https_p);
    }
    
    // Ports definition
    if(ip.address() === process.env.MY_IP) {
        ports(process.env.PORT, process.env.PORT_HTTPS);
    } else {
        ports(80, 443);
    }
    
    // Checking environment
    var dev = function() {
        env = 'dev/'; 
        console.log('Running on Dev environment...');
    }
    
    ip.address() === process.env.MY_IP ? dev() : env = 'prod/';
    
    app.use(favicon(path.join(__dirname,'/frontend/',env,'favicon.ico')));
    app.use(express.static('frontend/' + env, { redirect : false }));
    
/*
*   # HTTP REQUESTS
*   purpose: REST API Definition
*   database type: nosql
*   http headers: JSON
*/

    // Firebase instance  
    firebase.initializeApp({
        apiKey: process.env.APIKEY,
        databaseURL: process.env.DATABASE_URL
    });
    
    var db = firebase.database(), // Database instance
        auth = firebase.auth(), // User management
        ref = db.ref("/"), // Main database
        ref_docs = db.ref("doctors"), // Doctors database
        ref_api = db.ref("apikeys"); // Apikeys database
    
    // Constructor Class
    var _constructor = {
        isInArray: function(value, array) {
            return array.indexOf(value) > -1;
        },
        messagingErr: function(msg, val) {
            errors_handling.Message = msg;
            val = errors_handling;
            return val;
        },
        messagingSucc: function(msg, val) {
            success_handling.Message = msg;
            val = success_handling;
            return val;
        },
        returnMessaging: function(msg, val, type) {
            if(type === "success") { return _constructor.messagingSucc(msg, val) } else { return _constructor.messagingErr(msg, val) }
        },
        logs: function(module, ip, request, appkey) {
            ref.once("value", function(data) {
                var logsObjt = {};
                logsObjt.date = Math.floor(Date.now() / 1000);
                logsObjt.ip = ip;
                logsObjt.request = request;
                logsObjt.appkey = appkey;
                logsObjt = logsObjt;
                ref.child(module).push(logsObjt);
            });
        },
        apikey_verification: function(key, callback) {
            ref_api.once("value").then(function(snapshot) {
                // Retrieve API keys from the database
                apikeys = Object.keys(snapshot.val());
                callback(_constructor.isInArray(key, apikeys));
            });
        }
    }
    
    // Response main format
    var errors_handling = {'HasErrors': true, 'Message': ''},
        success_handling = {'HasErrors': false, 'Message': ''};
    
    // Errors Class   
    var _messages = {
        login_success: { 
            get: _constructor.returnMessaging('User Authenticated!', 'login_success', 'success')
        },
        email_success: {
            get: _constructor.returnMessaging('Email sent!', 'email_success', 'success')
        },
        signup_success: {
            get: _constructor.returnMessaging('Sign up completed!', 'signup_success', 'success')
        },
        key_error: {
            get: _constructor.returnMessaging('This API key is invalid.', 'key_error', 'error')
        },
        key_missing: {
            get: _constructor.returnMessaging('Missing API key.', 'key_missing', 'error')
        },
        missing_params: {
            get: _constructor.returnMessaging('Missing query strings. Please add them.', 'missing_params', 'error')
        },
        email_err: {
            get: _constructor.returnMessaging('Could not send email. Please try again.', 'email_err', 'error')
        }
    };
    
/*
*   # Registration API
*   methods: post => apikey.json, doctors.json, get => docs.json
*   purpose: register doctors and apikeys
*/
    
    // New API keys creation e.g. localhost:3000/apikeys.json?developer=Alexis
    app.post('/apikeys.json', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        try { 
            // Check whether the query string "&developer=" exist
            if(!req.query.developer) throw _messages.missing_params();
            
            if(req.query.developer) {
                var devObject = {'developer' : '', 'timeStamp': ''};
                devObject.developer = req.query.developer;
                devObject.timeStamp = Math.floor(Date.now() / 1000);
                
                // Push key in the database
                ref.child("apikeys").push(devObject);
                res.status(200).send(JSON.stringify(devObject));
            }
        }
        catch(err) {
            res.status(500).send(JSON.stringify(err));
        }
    });
    
    // Get list of all the doctors e.g. localhost:3000/docs.json
    function onlyStatus200(req, res) {
        return req.statusCode === 200;
    }
    app.get('/docs.json', cache('2 minutes', onlyStatus200), function(req, res) {    
        res.setHeader('Content-Type', 'application/json');
        ref_docs.once("value", function(data) {
            var doctorsObject = JSON.stringify(data.val())
            // Doctor's object structure
            drObject = {};
            drObject.HasErrors = false;
            drObject.TotalResults = data.numChildren();
            drObject.Results = data.val();
            drOcject = JSON.stringify(drObject);
            // Send response back
            res.status(200).send(drOcject);
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
            res.status(500).send(JSON.stringify(errorObject.code));
        });
    });
    
    // Add new doctors in the database e.g. localhost:3000/doctors.json?name=Alexis&pr=GP&id={{ID_HERE}}apikey={{APIKEY_HERE}}
    app.post('/doctors.json', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        var module = "logs/doctors_list";
        var requestLog = req.protocol + '://' + req.get('host') + req.originalUrl;
        // Object Oriented functions
        var OO = {
            isValid: function(objectData) {
                return res.status(200).send(JSON.stringify(objectData));
            },
            isInValid: function(objtData) {
                return res.status(500).send(JSON.stringify(objtData));
            }
        };
        // Catch errors
        try { 
            // Erros handling
            if(!req.query.name || !req.query.pr || !req.query.id) throw _messages.missing_params();
            if(!req.query.apikey) throw _messages.key_missing();
            
            //Check API key in API call
            if(req.query.apikey) {
                _constructor.apikey_verification(req.query.apikey, function(val) {
                    if(val != true) {
                        OO.isInValid(_messages.key_error());
                    } else {
                        _constructor.logs(module, ip.address(), requestLog, req.query.apikey);
                        // Write new doctor if everything is in order
                        ref.once("value", function(data) {
                            // Object structure
                            var drObject = {'name' : '', 'practice': '', 'drID': '', 'signUpDate': ''};
                            drObject.HasErrors = false;
                            drObject.name = req.query.name;
                            drObject.practice = req.query.pr;
                            drObject.drID = req.query.id;
                            drObject.signUpDate = Math.floor(Date.now() / 1000);
                            drJSON = drObject;
                            // Send response to the server
                            ref.child("doctors").push(drJSON);
                            OO.isValid(drJSON);
                        });
                    }    
                });
            }
        }
        catch(err) {
            OO.isInValid(err);
        }
    });
    
/*
*   # AUTHENTICATION METHODS
*   purpose: authentication methods using firebase
*   requests: post => auth.json, get => login.json, reset.json, delete => erase.json
*/
    // Create user e.g. localhost:3000/auth.json?email={{email}}&password=alexistest&apikey={{APIKEY_HERE}}
    app.post('/auth.json', function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        var module = "logs/authentication";
        var requestLog = req.protocol + '://' + req.get('host') + req.originalUrl;
        try {
            if(!req.query.email && !req.query.password) throw _messages.missing_params();
            if(!req.query.apikey) throw _messages.key_missing();
            if(req.query.email && req.query.password) {
                _constructor.apikey_verification(req.query.apikey, function(val) {
                    if(val != true) {
                        res.status(200).send(JSON.stringify(_messages.key_error()));
                    } else {
                        _constructor.logs(module, ip.address(), requestLog, req.query.apikey);
                        auth.createUserWithEmailAndPassword(req.query.email, req.query.password)
                        .then(function() {
                            res.status(200).send(JSON.stringify(_messages.signup_success()));
                            //auth.currentUser.sendEmailVerification();
                        })
                        .catch(function(error) {
                            res.status(500).send(JSON.stringify(error))
                        });
                    }
                });
            }
        }
        catch(err) {
            res.status(500).send(JSON.stringify(err));
        }
    });
    
    // Sign-in methods e.g. localhost:3000/login.json?email={{email}}&password=alexistest&apikey={{APIKEY_HERE}}
    app.get('/login.json', function(req, res) {  
        if(req.query.email && req.query.password && req.query.apikey) {
            _constructor.apikey_verification(req.query.apikey, function(val) {
                if(val === true) {
                    firebase.auth().signInWithEmailAndPassword(req.query.email, req.query.password).then(function(){
                        res.status(200).send(JSON.stringify(_messages.login_success()));
                    }).catch(function(error) {
                        res.status(500).send(JSON.stringify(error));
                    });
                } else {
                    res.status(500).send(JSON.stringify(_messages.key_error()));
                }
            })
        } else {
            res.status(500).send(JSON.stringify(_messages.missing_params()));
        }
    });
    
    // Reset password e.g localhost:3000/reset.json?email={{email}}&apikey={{APIKEY_HERE}}
    app.get('/reset.json', function(req, res) {
        if(req.query.email && req.query.apikey) {
            _constructor.apikey_verification(req.query.apikey, function(val) {
                if(val === true) {
                    var emailAddress = req.query.email;
                    auth.sendPasswordResetEmail(req.query.email).then(function() {
                        res.status(200).send(JSON.stringify(_messages.email_success()));
                    }, function(error) {
                        res.status(500).send(JSON.stringify(error));
                    });
                } else {
                    res.status(500).send(JSON.stringify(_messages.key_error()));
                }
            });
        } else {
            res.status(200).send(JSON.stringify(_messages.missing_params()));
        }
    });
    
    // Delete user
    app.delete('/erase.json', function(req, res) {
        var user = firebase.auth().remove();
        if(_constructor.isInArray(req.query.apikey, apikeys) === true) {
            user.delete().then(function() {
                res.status(200).send(JSON.stringify({'success': 'User deleted.'}))
            }, function(error) {
                res.status(500).send(JSON.stringify({'error': 'Couldn\'t delete user.'}))
            });
        }
    });
    
/* 
*   # ERRORS HANDLING CONFIGURATION
*   status: 404 => jade template 404.jade, 200 => redirect to HTTPS
*/
    
    // Handle 404 Error
    app.use(function(req, res, next) {
        res.status(400);
        console.log('*************');
        console.log('GET ' + req.protocol + '://' + req.hostname + ':' + app.get('port') + req.originalUrl);
        console.log('At %d', Date.now());
        console.log('HTTP: 404 Error');
        next();
        res.render('404.jade', { url: req.protocol + '://' + req.headers.host + req.path });
        return;
    });
    
    // Redirect traffic to HTTPS
    http_app.get("*", function (req, res, next) {
        res.redirect("https://" + req.hostname + ':' + app.get('port') + req.url);
        console.log(req.protocol + '://' + req.get('host') + req.originalUrl);
    });

/* 
*   # SERVER CONFIGURATION
*   protocol: http => port :3000, https => port :4000
*/

    // Start HTTP server
    http.createServer(http_app).listen(http_app.get('port'), function () {
        console.log(' ');
        console.log('**** Web server ONLINE ****');
        console.log(' ');
        console.log('HTTP application is running on port ' + http_app.get('port'))
    });
    // Start HTTPS server
    https.createServer({key: keys.serviceKey, cert: keys.certificate}, app).listen(app.get('port'), function() {
        console.log('HTTPS server listening on port ' + app.get('port'));
        console.log('  ');
    });
});
