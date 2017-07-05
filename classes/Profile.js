Profile.prototype.__proto__ = require('events').EventEmitter.prototype;

function Profile(taskManager, community, auth, logger) {
    var self = this;
    self.community = community;
    self.TaskManager = taskManager;
    self.Auth = auth;
    self.logger = logger;
}

Profile.prototype.uploadAvatar = function (image, format, callbackImageUpload) {
    var self = this;
    if (typeof image != "object" && typeof image != "string")
        return callback({Error: "Invalid Image. Image must be a path or buffer."});

    self.community.uploadAvatar(image, format, function (err, url) {
        callbackImageUpload(err, url);
    });
};
/**
 * Get the display name of the account
 * @returns {String|undefined} displayName - Display name of the account
 */
Profile.prototype.getDisplayName = function () {
    var self = this;
    return (self.displayName ? self.displayName : undefined);
};


/**
 * Change the display name of the account (with prefix)
 * @param {String} newName - The new display name
 * @param {String} namePrefix - The prefix if there is one (Nullable)
 * @param {callbackErrorOnly} callbackErrorOnly - A callback returned with possible errors
 */
Profile.prototype.changeDisplayName = function (newName, namePrefix, callbackErrorOnly) {
    var self = this;
    if (!self.Auth.loggedIn) {
        self.TaskManager.addToQueue('login', self, self.changeDisplayName, [newName, namePrefix, callbackErrorOnly]);
    }
    else {
        if (namePrefix == undefined) namePrefix = '';
        else namePrefix = namePrefix + " ";


        self.community.editProfile({name: namePrefix + newName}, function (err) {
            if (err) {
                return callbackErrorOnly(err);
            }
            self.displayName = newName;
            self.Auth._updateAccountDetails({displayName: newName});
            return callbackErrorOnly(undefined);
        });
    }
};

module.exports = Profile;

