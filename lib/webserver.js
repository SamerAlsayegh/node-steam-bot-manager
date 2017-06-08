webserver.prototype.__proto__ = require('events').EventEmitter.prototype;
webserver.prototype.bodyParser = require('body-parser');// Used to parse POST and GET requests received via express
webserver.prototype.express = require('express');// Used to host an simple api for use with
webserver.prototype.app = webserver.prototype.express();
webserver.prototype.app.use(webserver.prototype.bodyParser.urlencoded({extended: true}));
webserver.prototype.app.set('json spaces', 2);
webserver.prototype.server = null;
webserver.prototype.config = null;

webserver.prototype.endpoints = [];


function webserver(port) {
    var self = this;
    self.port = port;
}


webserver.prototype.start = function (callback) {
    var self = this;
    if (self.server == null) {
        try {
            self.server = self.app.listen(self.port);
            callback();
        } catch (e){
            callback({Error: e});
        }
    }
    else
    callback({Error: "Server is already active... Try restarting instead."});
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
            self.app.post(url, callback);

            break;
        case 'get':
            self.app.get(url, callback);
            break;
        default:
            self.app.post(url, callback);
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
    if (self.server != null)
        self.server.close();
    for (var endpoint in self.endpoints)
        if (self.endpoints.hasOwnProperty(endpoint))
            self.addEndpoint(self.endpoints[endpoint].method, self.endpoints[endpoint].url, self.endpoints[endpoint].callback);
    self.server = self.app.listen(self.port);
};


module.exports = webserver;
