WebserverHandler.prototype.__proto__ = require('events').EventEmitter.prototype;
WebserverHandler.prototype.bodyParser = require('body-parser');// Used to parse POST and GET requests received via express
WebserverHandler.prototype.express = require('express');// Used to host an simple api for use with
WebserverHandler.prototype.app = WebserverHandler.prototype.express();
WebserverHandler.prototype.app.use(WebserverHandler.prototype.bodyParser.urlencoded({extended: true}));
WebserverHandler.prototype.app.set('json spaces', 2);
WebserverHandler.prototype.server = null;
WebserverHandler.prototype.config = null;

WebserverHandler.prototype.endpoints = [];


function WebserverHandler(port) {
    var self = this;
    self.port = port;
}


WebserverHandler.prototype.start = function () {
    var self = this;
    if (self.server == null) {
        self.server = self.app.listen(self.port);
        self.emit('apiLoaded');
    }
};

WebserverHandler.prototype.addEndpoint = function (method, url, callback) {
    var self = this;
    self.endpoints.push({method: method, url: url, callback: callback});
    switch (method.toLowerCase()) {
        case 'post':
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

WebserverHandler.prototype.restart = function () {
    var self = this;
    if (self.server != null)
        self.server.close();
    for (var endpoint in self.endpoints)
        if (self.endpoints.hasOwnProperty(endpoint))
            self.addEndpoint(self.endpoints[endpoint].method, self.endpoints[endpoint].url, self.endpoints[endpoint].callback);
    self.server = self.app.listen(self.port);
};


module.exports = WebserverHandler;
