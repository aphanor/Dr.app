/*
   NodeJS Doctor API made by Alexis Phanor
   2016 
*/

require('dotenv').load();

var express = require('express'),
    http = require('http'),
    bodyParser = require('body-parser'),
    app = express(),
    router = express.Router(),
    jade = require('jade'),
    ip = require("ip"),
    path = require("path"),
    favicon = require('serve-favicon'),
    firebase = require("firebase");

                        /****** SERVER CONFIGURATION ******/

var env;

app.use(bodyParser.json());
app.set('view engine', 'jade');
app.enable('verbose errors');
app.set('port', 3000);

// Checking environment
var dev = function() {
    env = 'dev/'; 
    console.log('Running on Dev environment...');
}
ip.address() === process.env.MY_IP ? dev() : env = 'prod/';


app.use(favicon(path.join(__dirname,'/frontend/',env,'favicon.ico')));
app.use(express.static('frontend/' + env, { redirect : false }));

                        /****** HTTP REQUESTS - API CONFIGURATION ******/

/*** FIREBARE CONFIG ***/

firebase.initializeApp({
    apiKey: process.env.APIKEY,
    databaseURL: process.env.DATABASE_URL
});

var db = firebase.database(); // Database instance
var auth = firebase.auth(); // User management
var ref = db.ref("/"); // main database
var ref_docs = db.ref("doctors"); // doctors database
var ref_api = db.ref("apikeys"); // apikeys database

/*** END ***/

// Object Oriented functions
var _constructor = {
    isInArray: function(value, array) {
        return array.indexOf(value) > -1;
    },
    messagingErr: function(txt, varl) {
        errors_handling.Message = txt;
        varl = errors_handling;
        return varl;
    },
    messagingSucc: function(msg, varl) {
        success_handling.Message = msg;
        varl = success_handling;
        return varl;
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

/* 
                        ERRORS MESSAGING CONFIGURATION
*/
var errors_handling = {'HasErrors': true, 'Message': ''};
var success_handling = {'HasErrors': false, 'Message': ''};

// Errors
var key_error = function(){ return _constructor.messagingErr('This API key is invalid.', key_error)},
    key_missing = function(){ return _constructor.messagingErr('Missing API key.', key_missing)},
    missing_params = function(){ return _constructor.messagingErr('Missing query strings. Please add them.', missing_params)},
    email_err = function(){ return _constructor.messagingErr('Could not send email. Please try again.', email_err)};

// Successes
var login_success = function(){ return _constructor.messagingSucc('Authenticated!', login_success)},
    email_success = function(){ return _constructor.messagingSucc('Email sent!', email_success)},
    signup_success = function(){ return _constructor.messagingSucc('Sign up completed!', signup_success)};

// _constructor.apikey_verification('-KUmL56BCzVJLGI9rDUP', function(val) {console.log(val);})

/*
                        API KEY CONFIGURATION
*/
// New API keys creation e.g. localhost:3000/apikeys.json?developer=Alexis
app.post('/apikeys.json', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    try { 
        // Check whether the query string "&developer=" exist
        if(!req.query.developer) throw missing_params();
        
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

/* 
                        DOCTORS REGISTRATION CONFIGURATION
*/
// Get list of all the doctors e.g. localhost:3000/docs.json
app.get('/docs.json', function(req, res) {    
    res.setHeader('Content-Type', 'application/json');
    ref_docs.once("value", function(data) {
        var doctorsObject = JSON.stringify(data.val())
        // Doctor's object structure
        drObject = {'TotalResults': '' , 'Results': ['']};
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
    var requestLog = '/doctor.json?' + req.query.name + '&pr=' + req.query.pr + '&id=' + req.query.id;
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
        if(!req.query.name || !req.query.pr || !req.query.id) throw missing_params();
        if(!req.query.apikey) throw key_missing();
        
        //Check API key in API call
        if(req.query.apikey) {
            _constructor.apikey_verification(req.query.apikey, function(val) {
                if(val != true) {
                    OO.isInValid(key_error());
                } else {
                    _constructor.logs(module, ip.address(), requestLog, req.query.apikey);
                    // Write new doctor if everything is in order
                    ref.once("value", function(data) {
                        // Object structure
                        var drObject = {'name' : '', 'practice': '', 'drID': '', 'signUpDate': ''};
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
                        AUTHENTICATION METHODS
*/
// Create user e.g. localhost:3000/auth.json?email={{email}}&password=alexistest&apikey={{APIKEY_HERE}}
app.post('/auth.json', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    var module = "logs/authentication";
    var requestLog = '/auth.json?email=' + req.query.email + "&password=" + req.query.password;
    try {
        if(!req.query.email && !req.query.password) throw missing_params();
        if(!req.query.apikey) throw key_missing();
        if(req.query.email && req.query.password) {
            _constructor.apikey_verification(req.query.apikey, function(val) {
                if(val != true) {
                    res.status(200).send(JSON.stringify(key_error()));
                } else {
                    _constructor.logs(module, ip.address(), requestLog, req.query.apikey);
                    auth.createUserWithEmailAndPassword(req.query.email, req.query.password)
                    .then(function() {
                        res.status(200).send(JSON.stringify(signup_success()));
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
                    res.status(200).send(JSON.stringify(login_success()));
                }).catch(function(error) {
                    res.status(500).send(JSON.stringify(error));
                });
            } else {
                res.status(500).send(JSON.stringify(key_error()));
            }
        })
    } else {
        res.status(500).send(JSON.stringify(missing_params()));
    }
});

// Reset password e.g localhost:3000/reset.json?email={{email}}&apikey={{APIKEY_HERE}}
app.get('/reset.json', function(req, res) {
    if(req.query.email && req.query.apikey) {
        _constructor.apikey_verification(req.query.apikey, function(val) {
            if(val === true) {
                var emailAddress = req.query.email;
                auth.sendPasswordResetEmail(req.query.email).then(function() {
                    res.status(200).send(JSON.stringify(email_success()));
                }, function(error) {
                    res.status(500).send(JSON.stringify(error));
                });
            } else {
                res.status(500).send(JSON.stringify(key_error()));
            }
        });
    } else {
        res.status(200).send(JSON.stringify(missing_params()));
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
                        ERRORS HANDLING CONFIGURATION
*/

// Handle 404 Error
app.use(function(req, res, next) {
    res.status(400);
    console.log('*************');
    console.log('GET ' + req.protocol + '://' + req.hostname + ':' + app.get('port') + req.originalUrl);
    console.log('At %d', Date.now());
    console.log('HTTP: 404 Error');
    next();
    res.render('404.jade', { url: req.protocol + '://' + req.hostname + ':' + app.get('port') + req.originalUrl });
    return;
});

// Start server on port :3000
app.listen(app.get('port'), function () {
    console.log(' ');
    console.log('**** ONLINE **** - The application is running on port ' + app.get('port'));
    console.log(' ');
});