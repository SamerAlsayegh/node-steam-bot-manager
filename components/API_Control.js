var index = require('../index.js');
APIControl.prototype.__proto__ = require('events').EventEmitter.prototype;
APIControl.prototype.bodyParser = require('body-parser');// Used to parse POST and GET requests received via express
APIControl.prototype.express = require('express');// Used to host an simple api for use with
APIControl.prototype.app = APIControl.prototype.express();
APIControl.prototype.app.use(APIControl.prototype.bodyParser.urlencoded({extended: true}));
APIControl.prototype.app.set('json spaces', 2);
APIControl.prototype.server = null;
APIControl.prototype.config = null;

APIControl.prototype.endPoints = [];


function APIControl(config) {
    var self = this;
    self.config = config;
}


APIControl.prototype.startAPI = function () {
    var self = this;
    if (self.server == null)
        self.server = self.app.listen(self.config.api_port);
    self.emit('apiLoaded');
};

APIControl.prototype.apiEndpoint = function (method, url, callback) {
    var self = this;
    self.endPoints.push({method: method, url: url, callback: callback});
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

APIControl.prototype.restartAPI = function () {
    var self = this;
    if (self.server != null)
        self.server.close();
    for (var endpoint in self.endPoints)
        if (self.endPoints.hasOwnProperty(endpoint))
            self.apiEndpoint(self.endPoints[endpoint].method, self.endPoints[endpoint].url, self.endPoints[endpoint].callback);
    self.server = self.app.listen(self.config.api_port);
};


module.exports = APIControl;
