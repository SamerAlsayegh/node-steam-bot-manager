Profile.prototype.__proto__ = require('events').EventEmitter.prototype;

function Profile(logger) {
    var self = this;

    self.logger = logger;

}
module.exports = Profile;
