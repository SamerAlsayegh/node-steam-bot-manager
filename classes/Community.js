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
 * @param callbackErrorOnly
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
        if (response.statusCode == 200 && JSON.parse(body).success == 1)
            callbackErrorOnly(undefined);
        else
            callbackErrorOnly(error || JSON.parse(body).success);
    });
};
/**
 * Downvote an attachement file on SteamCommunity.
 * @param sharedFileId
 * @param callbackErrorOnly
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
        if (response.statusCode == 200 && JSON.parse(body).success == 1)
            callbackErrorOnly(undefined);
        else
            callbackErrorOnly(error || JSON.parse(body).success);
    });
};
module.exports = Community;
