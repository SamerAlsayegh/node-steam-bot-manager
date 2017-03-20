Community.prototype.__proto__ = require('events').EventEmitter.prototype;


//
function Community(community, Auth, logger) {
    // Ensure account values are valid
    var self = this;
    self.community = community;
    self.Auth = Auth;
    self.logger = logger;
}


/**
 * Upvote an attachement file on SteamCommunity
 * @param sharedFileId
 * @param callback
 */
Community.prototype.upvoteSharedFile = function (sharedFileId, callbackErrorOnly) {
    var self = this;

    var options = {
        form: {
            'sessionid': self.Auth.sessionid,
            'id': sharedFileId
        }
    };

    self.community.httpRequestPost('https://steamcommunity.com/sharedfiles/voteup', options, function (error, response, body) {
        if (!error && response.statusCode == 200)
            callbackErrorOnly(undefined);
        else
            callbackErrorOnly(error);
    });
};
/**
 * Downvote an attachement file on SteamCommunity.
 * @param sharedFileId
 * @param callback
 */
Community.prototype.downvoteSharedFile = function (sharedFileId, callbackErrorOnly) {
    var self = this;

    var options = {
        form: {
            'sessionid': self.Auth.sessionid,
            'id': sharedFileId
        }
    };

    self.community.httpRequestPost('https://steamcommunity.com/sharedfiles/votedown', options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callbackErrorOnly(undefined);
        }
        else
            callbackErrorOnly(error);
    });
};
module.exports = Community;
