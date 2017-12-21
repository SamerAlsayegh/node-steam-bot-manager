webserver.prototype.__proto__ = require('events').EventEmitter.prototype;

webserver.prototype.server = null;
webserver.prototype.config = null;
webserver.prototype.endpoints = [];


const bodyParser = require('body-parser');
const express = require('express');
const multer  = require('multer');
const formData = multer({ storage: multer.memoryStorage() });

const https = require('https');
const http = require('http');
const fs = require('fs');





/**
 * Initalize a webserver with options such as SSL
 * @param port
 * @param options
 */
function webserver(logger, port, options) {
    var self = this;
    self.logger = logger;
    self.port = port;
    self.options = options;
    self.app = express();
    self.app.use(bodyParser.urlencoded({extended: true}));
    self.app.set('json spaces', 2);

}


webserver.prototype.start = function (callback) {
    var self = this;


    if (self.HTTPserver != null && self.HTTPSserver != null)
        return callback({Error: "Server is already active... Try restarting instead."});

    if (self.HTTPSserver == null) {
        try {
            self.ssl = {};
            if (self.options && self.options.hasOwnProperty("ssl")) {
                // Create a service (the app object is just a callback).
                // This line is from the Node.js HTTPS documentation.
                if (self.options.ssl.hasOwnProperty("key") && self.options.ssl.hasOwnProperty("cert")) {

                    var options = {
                        key: self.options.ssl.key,
                        cert: self.options.ssl.cert
                    };
                    self.HTTPSserver = https.createServer(options, self.app).listen(443);// Create an HTTPS service identical to the HTTP service.
                    self.logger.log("debug", "Started SSL server on port 443.");
                }
            }
            if (self.HTTPserver == null) {
                try {
                    self.HTTPserver = http.createServer(self.app).listen(self.port);// Create an HTTP service.
                    self.logger.log("debug", "Started HTTP server on port " + self.port);
                    if (callback)
                        return callback();
                } catch (e){
                    console.log(e);
                    if (callback)
                        return callback({Error: "Failed to start HTTP server due to " + e});
                }
            }
        } catch (e){
            console.log(e);
            if (callback)
                return callback({Error: "Failed to start HTTP server due to " + e});
        }
    } else if (self.HTTPserver == null) {
        try {
            self.ssl = {};
            if (self.HTTPserver == null) {
                try {
                    self.HTTPserver = http.createServer(self.app).listen(self.port);// Create an HTTP service.
                    self.logger.log("debug", "Started HTTP server on port " + self.port);
                    if (self.options && self.options.hasOwnProperty("ssl")) {

                        if (self.options.ssl.hasOwnProperty("key") && self.options.ssl.hasOwnProperty("cert")) {

                            var options = {
                                key: self.options.ssl.key,
                                cert: self.options.ssl.cert
                            };
                            self.HTTPSserver = https.createServer(options, self.app).listen(443);// Create an HTTPS service identical to the HTTP service.
                            self.logger.log("debug", "Started SSL server on port 443.");
                        }
                    }
                } catch (e){
                    console.log(e);
                    if (callback)
                        return callback({Error: "Failed to start HTTP server due to " + e});
                }
            }
        } catch (e){
            console.log(e);
            if (callback)
                return callback({Error: "Failed to start HTTP server due to " + e});
        }
    }


};

webserver.prototype.addEndpoint = function (method, url, callback) {
    var self = this;
    self.endpoints.push({method: method, url: url, callback: callback});
    switch (method.toLowerCase()) {
        case 'post':
            // console.log("Reg post...");
            //
            // var func = new Function(
            //     "return function " + method + "_" + url + "(req, res, next){ " +
            //     "console.log('Test' + self.app._router.stack);}"
            // )();
            self.app.post(url, formData.array(), callback);

            break;
        case 'get':
            self.app.get(url, callback);
            break;
        default:
            self.app.post(url, formData.array(), callback);
            break;
    }
};

webserver.prototype.removeEndpoint = function (method, url) {
    var self = this;
    console.log("Added route " + self.app._router.stack);
    var routes = self.app._router.stack;
    routes.forEach(removeMiddlewares);
    function removeMiddlewares(route, i, routes) {
        switch (route.handle.name) {
            case method + "_" + url:
                routes.splice(i, 1);
        }
        if (route.route)
            route.route.stack.forEach(removeMiddlewares);
    }
};

webserver.prototype.restart = function () {
    var self = this;
    if (self.HTTPSserver != null && self.HTTPserver !=  null) {
        self.HTTPSserver.close();
        self.HTTPserver.close();
        for (var endpoint in self.endpoints)
            if (self.endpoints.hasOwnProperty(endpoint))
                self.addEndpoint(self.endpoints[endpoint].method, self.endpoints[endpoint].url, self.endpoints[endpoint].callback);
        self.start();
    }
};


module.exports = webserver;
