Friends.prototype.__proto__ = require('events').EventEmitter.prototype;


/**
 * A class to handle all friend functions for the bot account
 * @param main
 * @param request
 * @constructor
 */
function Friends(main, request) {
    var self = this;
    if (typeof main != "object")
        throw Error("Bot instance must be passed.");
    self.request = request;
    self.main = main;


    var getPlayerSummaries = function (friends, atCount, friendsCompiled, callback) {
        var steamids = "";
        var maxCount = atCount + 100;
        if (atCount + 100 > friends.length)
            maxCount = friends.length;
        for (var x = 0 + atCount; x < (maxCount); x++)
            steamids += friends[x].steamid + (x < maxCount - 1 ? ',' : "");


        self.request.getRequestAPI('ISteamUser', 'v2', 'GetPlayerSummaries', {
            key: self.main.settings.api_key,
            steamids: steamids
        }, function (err, body) {
            if (err)
                return callback(err, friendsCompiled);
            var compiledFriends = body.response.players;

            if (maxCount < friends.length) {
                getPlayerSummaries(friends, atCount + 100, friendsCompiled.concat(compiledFriends), function (err, friendsSummaries) {
                    return callback(undefined, friendsCompiled.concat(friendsSummaries));
                });
            }
            else
                return callback(undefined, friendsCompiled.concat(compiledFriends));

        })
    };


    self.getPlayerSummaries = function (friends, callback) {
        var self = this;
        self.emit('debug', 'Getting player summaries of a list of players.');

        var playerSummaries = [];
        getPlayerSummaries(friends, 0, [], function (err, friendsSummaries) {
            for (var id in friendsSummaries) {
                playerSummaries.push(friendsSummaries[id]);
            }
            return callback(undefined, playerSummaries.slice());
        });
    };

    self.getFriends = function (callback) {
        var self = this;
        var onlineFriendsList = [];

        if (self.main.settings.api_key == undefined)
            return callback(new Error("Failed to getFriends as 'api_key' is not defined in the config."), []);

        self.emit('debug', 'Getting friends list');
        if (self.cachedFriendsList && (typeof self.cachedFriendsList == 'object') && ((new Date().getTime() / 1000) - (self.cachedFriendsList.cacheTime)) < (60 * 10)) {
            onlineFriendsList = self.cachedFriendsList.friendsList.slice();
            self.emit('debug', 'Used cached friendslist');
            return callback(undefined, onlineFriendsList);
        } else {
            // Due to the fact that we must submit an API call everytime we need friends list, we will cach the data for 5 minutes. Clear cach on force.
            if (!self.main.loggedIn) {
                self.emit('debug', 'Queued getFriends method until login.');
                self.main.addToQueue('login', self, self.getFriends, [callback]);
            }
            else {
                self.emit('debug', 'Getting a fresh list of friends');
                self.request.getRequestAPI('ISteamUser', 'v1', 'GetFriendList', {
                    key: self.main.settings.api_key,
                    relationship: 'friend',
                    steamid: self.main.community.steamID
                }, function (err, body) {
                    if (err)
                        return callback(err, undefined);

                    if (body.hasOwnProperty("friendslist")) {
                        var friends = body.friendslist.friends;
                        getPlayerSummaries(friends, 0, [], function (err, friendsSummaries) {
                            // We need to convert SteamID to names... To do that, we need SteamCommunity package.
                            for (var id in friendsSummaries) {
                                onlineFriendsList.push({
                                    username: friendsSummaries[id].personaname,
                                    accountSid: friendsSummaries[id].steamid
                                });
                            }
                            self.cachedFriendsList = {
                                friendsList: onlineFriendsList,
                                cacheTime: new Date().getTime() / 1000
                            };

                            return callback(undefined, onlineFriendsList.slice());
                        });
                    } else {
                        // self.logger.log('debug', body);
                        self.emit('debug', 'Failed to fetch friends - API call failed');
                        if (body.indexOf("<title>Forbidden</title>") != -1)
                            return callback(new Error("Failed to getFriends due to invalid or expired 'api_key'"), onlineFriendsList.slice());
                        else
                            return callback(new Error("Failed to getFriends - " + body), onlineFriendsList.slice());
                    }
                })
            }
        }
    };

}


/**
 * Login to steam chat
 * @param interval
 * @param uiMode ('web' or 'mobile') are valid entries
 */
Friends.prototype.login = function (interval, uiMode) {
    var self = this;
    interval = interval || 500;
    uiMode = uiMode || 'web';

    self.emit('debug', 'Logged on to chat on %j', self.main.getAccountName());
    self.main.community.chatLogon(interval, uiMode);
};


/**
 * Logout from steam chat
 */
Friends.prototype.logout = function () {
    var self = this;
    if (self.main.community.chatState == 3) {
        self.emit('debug', 'Logged out from chat on %j', self.main.getAccountName());
        self.main.community.chatLogoff();
    }
};


/**
 * Send a chat message to a recipient with callback
 * @param {SteamID} recipient - Recipient of the message
 * @param message - Message to send
 * @param type - valid entries are 'text' or 'typing' (message ignored for 'typing')
 * @param callbackErrorOnly - Callback upon sending the message (undefined, or Error)
 */
Friends.prototype.sendMessage = function (recipient, message, type, callbackErrorOnly) {
    var self = this;
    type = type || 'text';
    callbackErrorOnly = callbackErrorOnly || function (err) {
        };
    self.main.community.chatMessage(recipient, message, type, callbackErrorOnly);
};


module.exports = Friends;
