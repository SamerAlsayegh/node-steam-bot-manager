Profile.prototype.__proto__ = require('events').EventEmitter.prototype;

function Profile(community, logger) {
    var self = this;
    self.community = community;
    self.logger = logger;
}

Profile.prototype.uploadAvatar = function (image, format, callback) {
    var self = this;
    if (typeof image != "buffer" && typeof image != "string")
        return callback({Error: "Invalid Image. Image must be a path or buffer."});


};

Profile.prototype.changeDisplayName = function (newName, callback) {

};

Profile.prototype.changeDisplayName = function (newName, callback) {

};

module.exports = Profile;
