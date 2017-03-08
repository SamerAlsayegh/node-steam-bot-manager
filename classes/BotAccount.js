var SteamUser = require('steam-user');
var SteamCommunity = require('steamcommunity');
var SteamStore = require('steamstore');
var TradeOfferManager = require('steam-tradeoffer-manager');
var SteamTotp = require('steam-totp');
BotAccount.prototype.__proto__ = require('events').EventEmitter.prototype;


/**
 * Creates a new BotAccount instance for a bot.
 * @class
 */
function BotAccount(accountDetails, settings) {
    // Ensure account values are valid
    var self = this;
    // Init all required variables
    self.tempSettings = {};
    self.settings = settings;
    self.community = new SteamCommunity();
    self.client = new SteamUser();
    if (!self.settings.hasOwnProperty("tradeCancelTime"))
        self.settings.tradeCancelTime = 60 * 60 * 24;
    if (!self.settings.hasOwnProperty("tradePendingCancelTime"))
        self.settings.tradePendingCancelTime = 60 * 60 * 24;
    if (!self.settings.hasOwnProperty("language"))
        self.settings.language = 60 * 60 * 24;
    if (!self.settings.hasOwnProperty("tradePollInterval"))
        self.settings.tradePollInterval = 60 * 60 * 24;
    if (!self.settings.hasOwnProperty("tradeCancelOfferCount"))
        self.settings.tradeCancelOfferCount = 60 * 60 * 24;
    if (!self.settings.hasOwnProperty("tradeCancelOfferCountMinAge"))
        self.settings.tradeCancelOfferCountMinAge = 60 * 60;
    if (!self.settings.hasOwnProperty("cancelTradeOnOverflow"))
        self.settings.cancelTradeOnOverflow = true;

    self.trade = new TradeOfferManager({
        "steam": self.client,
        "community": self.community,
        "cancelTime": self.settings.tradeCancelTime, // Keep offers upto 1 day, and then just cancel them.
        "pendingCancelTime": self.settings.tradePendingCancelTime, // Keep offers upto 30 mins, and then cancel them if they still need confirmation
        "cancelOfferCount": self.settings.tradeCancelOfferCount,// Cancel offers once we hit 7 day threshold
        "cancelOfferCountMinAge": self.settings.tradeCancelOfferCountMinAge,// Keep offers until 7 days old
        "language": self.settings.language, // We want English item descriptions
        "pollInterval": 5000 // We want to poll every 5 seconds since we don't have Steam notifying us of offers
    });
    self.SteamID = TradeOfferManager.SteamID;
    self.request = self.community.request;

    self.store = new SteamStore();
    self.accountDetails = accountDetails;
    self.loggedIn = false;
    self.rateLimited = false;
    self.delayedTasks = [];
    self.emit('displayBotMenu');
};

/**
 * Get the account's username, used to login to Steam
 * @returns {String} accountName
 */
BotAccount.prototype.getAccountName = function () {
    var self = this;
    return self.accountDetails.accountName;
};
/**
 * Generate two-factor-authentication code used for logging in.
 * @returns {Error | String}
 */
BotAccount.prototype.generateMobileAuthenticationCode = function () {
    var self = this;
    if (self.accountDetails.shared_secret)
        return SteamTotp.generateAuthCode(self.accountDetails.shared_secret);
    else
        return new Error("Failed to generate authentication code. Enable 2-factor-authentication via this tool.");
};

/**
 * Fetch SteamID Object from the SteamID.
 * @returns {Error | String}
 */
BotAccount.prototype.fromIndividualAccountID = function (id) {
    var self = this;
    return self.SteamID.fromIndividualAccountID(id);
};


/**
 *
 * @param time - Current time of trade (Please use getUnixTime())
 * @param tag - Type of confirmation required ("conf" to load the confirmations page, "details" to load details about a trade, "allow" to confirm a trade, "cancel" to cancel it.)
 * @returns {Error}
 */
BotAccount.prototype.generateMobileConfirmationCode = function (time, tag) {
    var self = this;
    if (self.accountDetails.identity_secret)
        return SteamTotp.generateConfirmationKey(self.accountDetails.identity_secret, time, tag);
    else
        return new Error("Failed to generate confirmation code. Enable 2-factor-authentication via this tool.");
};

/**
 * Get Unix time for usage with mobile confirmations.
 * @returns {number}
 */
BotAccount.prototype.getUnixTime = function () {
    var self = this;
    return SteamTotp.time();
};

/**
 * Get account details
 * @returns {*|{accountName: *, password: *}}
 */
BotAccount.prototype.getAccount = function () {
    var self = this;
    return self.accountDetails;
};

/**
 * Send a chat message to a receipient with callback
 * @param {SteamID} recipient - Recipient of the message
 * @param {String} message - Message to send
 * @param {String} type - saytest or typing (message ignored for 'typing')
 * @param {messageCallback} callback - Callback upon sending the message (null, or Error)
 */
BotAccount.prototype.sendMessage = function (recipient, message, type, callback) {
    var self = this;
    return self.community.chatMessage(recipient, message, type, callback);
};

/**
 * Send a chat message to a receipient with callback
 * @param {SteamID} recipient - Recipient of the message
 * @param {String} message - Message to send
 * @param {messageCallback} callback - Callback upon sending the message (null, or Error)
 */
BotAccount.prototype.sendMessage = function (recipient, message, callback) {
    var self = this;
    return self.community.chatMessage(recipient, message, callback);
};
/**
 * Send a chat message to a receipient without callback
 * @param {SteamID} recipient - Recipient of the message
 * @param {String} message - Message to send
 */
BotAccount.prototype.sendMessage = function (recipient, message) {
    var self = this;
    return self.community.chatMessage(recipient, message);
};

/**
 * @callback confirmationsCallback
 * @param {Error} error - An error message if the process failed, null if successful
 * @param {Array} confirmations - An array of Confirmations
 */

/**
 * Get outstanding confirmations
 * @param time
 * @param key
 * @param confirmationsCallback
 */
BotAccount.prototype.getConfirmations = function (time, key, confirmationsCallback) {
    var self = this;
    self.community.getConfirmations(time, key, confirmationsCallback);
};

/**
 * Set the user we are chatting with
 * @param {*|{accountName: *, sid: *}} chattingUserInfo
 */
BotAccount.prototype.setChatting = function (chattingUserInfo) {
    var self = this;
    self.currentChatting = chattingUserInfo;
};
/**
 * Get the display name of the account
 * @returns {String|null} displayName - Display name of the account
 */
BotAccount.prototype.getDisplayName = function () {
    var self = this;
    return (self.accountDetails.hasOwnProperty("displayName") ? self.accountDetails.displayName : null);
};

BotAccount.prototype.wrapFunction = function (fn, context, params) {
    return function () {
        fn.apply(context, params);
    };
};
/**
 * Add a function to the queue which runs when we login usually.
 * @param functionV
 * @param functionData
 */
BotAccount.prototype.addToQueue = function (functionV, functionData) {
    var self = this;
    var functionVal = self.wrapFunction(functionV, self, functionData);
    self.delayedTasks.push(functionVal);
};
/**
 * Process the queue to run tasks that were delayed.
 * @param callback
 */
BotAccount.prototype.processQueue = function (callback) {
    var self = this;
    while (self.delayedTasks.length > 0) {
        (self.delayedTasks.shift())();
    }
    callback(null);
};


BotAccount.prototype.upvoteSharedFile = function (sharedFileId, callback) {
    var self = this;

    var options = {
        form: {
            'sessionid': self.accountDetails.sessionID,
            'id': sharedFileId
        }
    };

    self.community.httpRequestPost('https://steamcommunity.com/sharedfiles/voteup', options, function (error, response, body) {
        if (!error && response.statusCode == 200)
            callback(null);
        else
            callback(error);
    });
};
BotAccount.prototype.downvoteSharedFile = function (sharedFileId, callback) {
    var self = this;

    var options = {
        form: {
            'sessionid': self.accountDetails.sessionID,
            'id': sharedFileId
        }
    };

    self.community.httpRequestPost('https://steamcommunity.com/sharedfiles/votedown', options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null);
        }
        else
            callback(error);
    });
};

/**
 * Change the display name of the account (with prefix)
 * @param {String} newName - The new display name
 * @param {String} namePrefix - The prefix if there is one (Nullable)
 * @param {errorCallback} errorCallback - A callback returned with possible errors
 */
BotAccount.prototype.changeName = function (newName, namePrefix, errorCallback) {
    var self = this;
    if (!self.loggedIn) {
        self.addToQueue(self.changeName, [newName, namePrefix, errorCallback]);
    }
    else {
        if (namePrefix == null) namePrefix = '';

        self.community.editProfile({name: namePrefix + newName}, function (err) {
            if (err)
                return errorCallback(err.Error);
            self.accountDetails.displayName = newName;
            self.emit('updatedAccountDetails');
            errorCallback(null);
        });
    }
};

/**
 * @callback inventoryCallback
 * @param {Error} error - An error message if the process failed, null if successful
 * @param {Array} inventory - An array of Items returned via fetch (if null, then game is not owned by user)
 * @param {Array} currencies - An array of currencies (Only a few games use this) - (if null, then game is not owned by user)
 */

/**
 * Retrieve account inventory based on filters
 * @param {Integer} appid - appid by-which to fetch inventory based on.
 * @param {Integer} contextid - contextid of lookup (1 - Gifts, 2 - In-game Items, 3 - Coupons, 6 - Game Cards, Profile Backgrounds & Emoticons)
 * @param {Boolean} tradableOnly - Items retrieved must be tradable
 * @param {inventoryCallback} inventoryCallback - Inventory details (refer to inventoryCallback for more info.)
 */
BotAccount.prototype.getInventory = function (appid, contextid, tradableOnly, inventoryCallback) {
    var self = this;
    if (!self.loggedIn) {
        self.addToQueue(self.getInventory, [appid, contextid, tradableOnly, inventoryCallback]);
    }
    else
        self.trade.loadInventory(appid, contextid, tradableOnly, inventoryCallback);
};

/**
 * Retrieve account inventory based on filters and provided steamID
 * @param {SteamID} steamID - SteamID to use for lookup of inventory
 * @param {Integer} appid - appid by-which to fetch inventory based on.
 * @param {Integer} contextid - contextid of lookup (1 - Gifts, 2 - In-game Items, 3 - Coupons, 6 - Game Cards, Profile Backgrounds & Emoticons)
 * @param {Boolean} tradableOnly - Items retrieved must be tradableOnly
 * @param {inventoryCallback} inventoryCallback - Inventory details (refer to inventoryCallback for more info.)
 */
BotAccount.prototype.getUserInventory = function (steamID, appid, contextid, tradableOnly, inventoryCallback) {
    var self = this;
    if (!self.loggedIn) {
        self.addToQueue(self.getUserInventory, [steamID, appid, contextid, tradableOnly, inventoryCallback]);
    }
    else
        self.trade.loadUserInventory(steamID, appid, contextid, tradableOnly, inventoryCallback);
};
/**
 * Add a phone-number to the account (For example before setting up 2-factor authentication)
 * @param phoneNumber - Certain format must be followed
 * @param {errorCallback} errorCallback - A callback returned with possible errors
 */
BotAccount.prototype.addPhoneNumber = function (phoneNumber, errorCallback) {
    var self = this;
    self.store.addPhoneNumber(phoneNumber, true, function (err) {
        errorCallback(err);
    });
};


/**
 * @callback acceptedTradesCallback
 * @param {Error} error - An error message if the process failed, null if successful
 * @param {Array} acceptedTrades - An array of trades that were confirmed in the process.
 */

/**
 * Confirm (not accept) all sent trades associated with a certain SteamID via the two-factor authenticator.
 * @param {SteamID} steamID - SteamID to use for lookup of inventory
 * @param {acceptedTradesCallback} acceptedTradesCallback - Inventory details (refer to inventoryCallback for more info.)
 */
BotAccount.prototype.confirmTradesFromUser = function (SteamID, callback) {
    var self = this;

    self.trade.getOffers(1, null, function (err, sent, received) {
        var acceptedTrades = [];
        for (var sentOfferIndex in sent) {
            if (sent.hasOwnProperty(sentOfferIndex)) {
                var sentOfferInfo = sent[sentOfferIndex];
                if (sentOfferInfo.partner.getSteamID64() == SteamID.getSteamID64) {
                    sentOfferInfo.accept();
                    acceptedTrades.push(sentOfferInfo);
                }
            }
        }

        for (var receivedOfferIndex in received) {
            if (received.hasOwnProperty(receivedOfferIndex)) {
                var receievedOfferInfo = received[receivedOfferIndex];
                if (receievedOfferInfo.partner.getSteamID64() == SteamID.getSteamID64) {
                    receievedOfferInfo.accept();
                    acceptedTrades.push(receievedOfferInfo);
                }
            }
        }
        self.confirmOutstandingTrades(function (err, confirmedTrades) {
            callback(err, acceptedTrades);
        });
    });
};


/**
 * Confirm (not accept) all outstanding trades that were sent out, regardless of trade target via the two-factor authenticator.
 */
BotAccount.prototype.confirmOutstandingTrades = function (callback) {
    var self = this;
    var time = self.getUnixTime();
    self.getConfirmations(time, self.generateMobileConfirmationCode(time, "conf"), function (err, confirmations) {
        if (err) {
            self.emit('debug', {msg: "Failed to confirm outstanding trades"});
            self.emit('error', {code: 503, msg: "Failed to confirm outstanding trades"});
            setTimeout(self.confirmOutstandingTrades(callback), 5000);
        }
        else {
            var confirmedTrades = [];
            if (confirmations.length > 0) {
                for (var confirmId in confirmations) {
                    if (confirmations.hasOwnProperty(confirmId)) {
                        confirmations[confirmId].respond(time, self.generateMobileConfirmationCode(time, "allow"), true, function (err) {
                            confirmedTrades.push(confirmations[confirmId]);
                            if (confirmedTrades.length == confirmations.length) {
                                // Everything went smooth
                                return callback(null, confirmations);
                            }
                        });
                    }
                }
            } else {
                callback(null, []);
            }
        }
    });
};


BotAccount.prototype.verifyPhoneNumber = function (code, callback) {
    var self = this;
    self.store.verifyPhoneNumber(code, function (err) {
        if (err) {
            callback(err);
        }
        else {
            callback(null);
        }
    });
};


BotAccount.prototype.getRequest = function (url, callback) {
    var self = this;
    self.request({
        url: url,
        method: "GET",
        json: true
    }, function (err, response, body) {
        callback(err, body);
    });
}

BotAccount.prototype.getRequestAPI = function (interface, version, method, options, callback) {
    var self = this;
    //http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=CE2825A59C978C4102AB07EA52F225CD&steamid=76561197960435530&relationship=friend

    var string = '?';
    var x = 0
    for (var option in options)
        string += option + "=" + options[option] + (x++ < Object.keys(options).length - 1 ? "&" : '');
    self.community.request({
        url: 'http://api.steampowered.com/' + interface + '/' + method + '/' + version + '/' + string,
        method: "GET",
        json: true,
        // body: options
    }, function (err, response, body) {
        callback(err, body);
    });
}

BotAccount.prototype.getFriendsSummariesNonAPI = function (friends, atCount, friendsCompiled, callback) {
    var self = this;
    var steamids = ""
    var maxCount = atCount + 100;
    if (atCount + 100 > friends.length)
        maxCount = friends.length;
    for (var x = 0 + atCount; x < (maxCount); x++)
        steamids += friends[x].steamid + (x < maxCount - 1 ? ',' : "");


    self.getRequestAPI('ISteamUser', 'v2', 'GetPlayerSummaries', {
        key: self.settings.api_key,
        steamids: steamids
    }, function (err, body) {
        if (err)
            return callback(err, friendsCompiled);
        var compiledFriends = body.response.players;

        if (maxCount < friends.length) {
            self.getFriendsSummaries(friends, atCount + 100, friendsCompiled.concat(compiledFriends), function (err, friendsSummaries) {
                return callback(null, compiled);
            });
        }
        else
            return callback(null, friendsCompiled.concat(compiledFriends));

    })
};
BotAccount.prototype.getFriendsSummaries = function (friends, atCount, friendsCompiled, callback) {
    var self = this;
    var steamids = ""
    var maxCount = atCount + 100;
    if (atCount + 100 > friends.length)
        maxCount = friends.length;
    for (var x = 0 + atCount; x < (maxCount); x++)
        steamids += friends[x].steamid + (x < maxCount - 1 ? ',' : "");


    self.getRequestAPI('ISteamUser', 'v2', 'GetPlayerSummaries', {
        key: self.settings.api_key,
        steamids: steamids
    }, function (err, body) {
        if (err)
            return callback(err, friendsCompiled);
        var compiledFriends = body.response.players;

        if (maxCount < friends.length) {
            self.getFriendsSummaries(friends, atCount + 100, friendsCompiled.concat(compiledFriends), function (err, friendsSummaries) {
                return callback(null, compiled);
            });
        }
        else
            return callback(null, friendsCompiled.concat(compiledFriends));

    })
};

BotAccount.prototype.getFriends = function (callback) {
    var self = this;
    var onlineFriendsList = [];
    if (self.cachedFriendsList && (typeof self.cachedFriendsList == 'object') && ((new Date().getTime() / 1000) - (self.cachedFriendsList.cacheTime)) < (60 * 10)) {
        onlineFriendsList = self.cachedFriendsList.friendsList.slice();
        return callback(null, onlineFriendsList);
    } else {
        // Due to the fact that we must submit an API call everytime we need friends list, we will cach the data for 5 minutes. Clear cach on force.
        if (!self.loggedIn) {
            self.addToQueue(self.getFriends, [callback]);
        }
        else {
            self.getRequestAPI('ISteamUser', 'v1', 'GetFriendList', {
                key: self.settings.api_key,
                relationship: 'friend',
                steamid: self.community.steamID
            }, function (err, body) {
                if (err)
                    return callback(err, null);
                var friends = body.friendslist.friends;
                self.getFriendsSummaries(friends, 0, [], function (err, friendsSummaries) {
                    // We need to convert SteamID to names... To do that, we need SteamCommunity package.
                    for (var id in friendsSummaries) {
                        onlineFriendsList.push({
                            accountName: friendsSummaries[id].personaname,
                            accountSid: friendsSummaries[id].steamid
                        });
                    }
                    self.cachedFriendsList = {friendsList: onlineFriendsList, cacheTime: new Date().getTime() / 1000};

                    return callback(null, onlineFriendsList.slice());
                });

            })

            // self.emit('loadedFriends', onlineFriendsList);
            // onlineFriendsList.splice(0, 1);//First entry is usually the bot's name. So just delete it
            // callback({Error: new Error("Failed to find all friends?")}, onlineFriendsList);
        }
    }
};


// self.emit('loadedFriends', onlineFriendsList);
// onlineFriendsList.splice(0, 1);//First entry is usually the bot's name. So just delete it
// callback({Error: new Error("Failed to find all friends?")}, onlineFriendsList);


BotAccount.prototype.createOffer = function (sid, callback) {
    var self = this;

    if (self.settings.cancelTradeOnOverflow) {
        self.emit('debug', 'Checking for overflow in trades');
        self.trade.getOffers(1, null, function (err, sent, received) {
            if (err)
                return callback(err, null);

            var allTrades = [];
            var tradeToCancelDueToTotalLimit = null;
            var tradeToCancelDueToPersonalLimit = [];

            for (var tradeIndex in sent) {
                allTrades.push(sent[tradeIndex]);
            }
            for (var tradeIndex in received) {
                allTrades.push(received[tradeIndex]);
            }
            var savedTradesCounts = {};
            for (var tradeIndex in allTrades) {
                var trade = allTrades[tradeIndex];
                if (!savedTradesCounts.hasOwnProperty(trade.partner))
                    savedTradesCounts[trade.partner] = 0;
                savedTradesCounts[trade.partner] = savedTradesCounts[trade.partner] + 1;
                if (savedTradesCounts[trade.partner] >= 5)
                    tradeToCancelDueToPersonalLimit.push(trade);

                if (tradeToCancelDueToTotalLimit == null || tradeToCancelDueToTotalLimit.updated.getTime() > trade.updated.getTime()) {
                    tradeToCancelDueToTotalLimit = trade;
                }
            }
            if (tradeToCancelDueToPersonalLimit.length >= 0 && self.settings.cancelTradeOnOverflow) {
                for (var tradeIndex in tradeToCancelDueToPersonalLimit) {
                    self.emit('debug', "Cancelled trade #" + tradeToCancelDueToPersonalLimit[tradeIndex].id + " due to overload in personal trade requests");
                    tradeToCancelDueToPersonalLimit[tradeIndex].cancel();
                }
            }
            if (allTrades.length >= 30 && self.settings.cancelTradeOnOverflow) {
                self.emit('debug', "Cancelled trade #" + tradeToCancelDueToTotalLimit.id + " due to overload in total trade requests");
                tradeToCancelDueToTotalLimit.cancel();
            }
            self.emit('createdOffer', sid);
            self.emit('debug', 'Sent trade offer');
            return callback(null, self.trade.createOffer(sid));

        });
    } else {
        self.emit('debug', 'Sent trade offer');
        self.emit('createdOffer', sid);
        // Before we create an offer, we will get previous offers and ensure it meets the limitations, to avoid errors.
        return callback(null, self.trade.createOffer(sid));
    }
};

BotAccount.prototype.has_shared_secret = function () {
    var self = this;
    return (self.accountDetails.shared_secret ? true : false);
};


BotAccount.prototype.loginAccount = function (details, loginCallback) {

    var self = this;
    self.emit('loggingIn');
    var accountDetailsModified = self.accountDetails;
    if (self.accountDetails.shared_secret) {
        self.client.setOption("promptSteamGuardCode", false);
        accountDetailsModified.twoFactorCode = self.generateMobileAuthenticationCode();
    }
    accountDetailsModified.rememberPassword = true;
    accountDetailsModified.logonId = 100;

    if (details != null) {
        if (details.authCode != null)
            accountDetailsModified.authCode = authCode;
        if (details.captcha != null)
            accountDetailsModified.captcha = details.captcha;
    }
    self.community.login(accountDetailsModified, function (err, sessionID, cookies, steamguard, oAuthToken) {
        if (err) {
            if (err.Error == "SteamGuardMobile" && self.accountDetails.shared_secret) {
                return self.login(details, loginCallback);
            }
            else
                return loginCallback(err);
        }

        self.chatLogon(500, 'web');

        if (self.accountDetails.sessionID != sessionID || self.accountDetails.cookies != cookies) {
            self.accountDetails.sessionID = sessionID;
            self.accountDetails.cookies = cookies;
            delete self.accountDetails.twoFactorCode;
            /**
             * Updated an account's details (such as: username, password, sessionid, cookies...)
             *
             * @event BotAccount#updatedAccountDetails
             */
            self.emit('updatedAccountDetails');
        }

        if (self.accountDetails.cookies) {
            self.community.setCookies(cookies);
            self.store.setCookies(cookies);
            self.trade.setCookies(cookies);
        }
        self.loggedIn = true;
        self.processQueue(function (err) {
            if (err)
                return loginCallback(err);

            self.community.on('chatTyping', function (senderID) {
                self.emit('chatTyping', senderID);
            });
            self.community.on('chatLoggedOff', function () {
                self.emit('chatLoggedOff');
            });
            self.community.on('chatMessage', function (senderID, message) {
                if (self.currentChatting != null && senderID == self.currentChatting.sid) {
                    console.log(("\n" + self.currentChatting.accountName + ": " + message).green);
                }
                /**
                 * Emitted when a friend message or chat room message is received.
                 *
                 * @event BotAccount#friendOrChatMessage
                 * @type {object}
                 * @property {SteamID} senderID - The message sender, as a SteamID object
                 * @property {String} message - The message text
                 * @property {SteamID} room - The room to which the message was sent. This is the user's SteamID if it was a friend message
                 */
                self.emit('chatMessage', senderID, message);
            });

            self.trade.on('sentOfferChanged', function (offer, oldState) {
                /**
                 * Emitted when a trade offer changes state (Ex. accepted, pending, escrow, etc...)
                 *
                 * @event BotAccount#offerChanged
                 * @type {object}
                 * @property {TradeOffer} offer - The new offer's details
                 * @property {TradeOffer} oldState - The old offer's details
                 */
                self.emit('offerChanged', offer, oldState);
            });

            self.trade.on('receivedOfferChanged', function (offer, oldState) {
                self.emit('offerChanged', offer, oldState);
            });

            self.trade.on('newOffer', function (offer) {
                /**
                 * Emitted when we receive a new trade offer
                 *
                 * @event BotAccount#newOffer
                 * @type {object}
                 * @property {TradeOffer} offer - The offer's details
                 */
                self.emit('newOffer', offer);
            });

            self.trade.on('sentOfferChanged', function (offer) {
                /**
                 * Emitted when we receive a new trade offer notification (only provides amount of offers and no other details)
                 *
                 * @event BotAccount#tradeOffers
                 * @type {object}
                 * @property {Integer} count - The amount of active trade offers (can be 0).
                 */
                self.emit('sentOfferChanged', offer);
            });
            self.trade.on('realTimeTradeConfirmationRequired', function (offer) {
                /**
                 * Emitted when a trade offer is cancelled
                 *
                 * @event BotAccount#tradeOffers
                 * @type {object}
                 * @property {Integer} count - The amount of active trade offers (can be 0).
                 */
                self.emit('realTimeTradeConfirmationRequired', offer);
            });
            self.trade.on('realTimeTradeCompleted', function (offer) {
                /**
                 * Emitted when a trade offer is cancelled
                 *
                 * @event BotAccount#tradeOffers
                 * @type {object}
                 * @property {Integer} count - The amount of active trade offers (can be 0).
                 */
                self.emit('realTimeTradeCompleted', offer);
            });
            self.trade.on('sentOfferCanceled', function (offer) {
                /**
                 * Emitted when a trade offer is cancelled
                 *
                 * @event BotAccount#tradeOffers
                 * @type {object}
                 * @property {Integer} count - The amount of active trade offers (can be 0).
                 */
                self.emit('sentOfferCanceled', offer);
            });

            // self.client.on('steamGuard', function (domain, callback, lastCodeWrong) {
            //     /**
            //      * Emitted when Steam requests a Steam Guard code from us. You should collect the code from the user somehow and then call the callback with the code as the sole argument.
            //      *
            //      * @event BotAccount#steamGuard
            //      * @type {object}
            //      * @property {String} domain - If an email code is needed, the domain name of the address where the email was sent. null if an app code is needed.
            //      * @property {Callback} callbackSteamGuard - Should be called when the code is available.
            //      * @property {Boolean} lastCodeWrong - true if you're using 2FA and the last code you provided was wrong, false otherwise
            //      */
            //     self.emit('steamGuard', domain, callback, lastCodeWrong);
            // });
            /**
             * Emitted when we fully sign into Steam and all functions are usable.
             *
             * @event BotAccount#loggedIn
             */
            self.emit('loggedIn');
            return loginCallback(null);
        });
    });
};
BotAccount.prototype.hasPhone = function (callback) {
    var self = this;
    self.store.hasPhone(function (err, hasPhone, lastDigits) {
        callback(err, hasPhone, lastDigits);
    });
};
BotAccount.prototype.canReloginWithoutPrompt = function () {
    var self = this;
    return self.accountDetails.shared_secret ? true : false;
};
BotAccount.prototype.finalizeTwoFactor = function (shared_secret, activationCode, callback) {
    var self = this;
    self.emit('finalizedTwoFactorAuth');
    self.community.finalizeTwoFactor(shared_secret, activationCode, function (err) {
        callback(err);
    });
};

BotAccount.prototype.enableTwoFactor = function (callback) {
    var self = this;
    self.emit('enablingTwoFactorAuth');
    self.community.enableTwoFactor(function (err, response) {
        if (err)
            return callback(err, null);

        self.accountDetails.shared_secret = response.shared_secret;
        self.accountDetails.identity_secret = response.identity_secret;
        self.accountDetails.revocation_code = response.revocation_code;
        self.emit('enabledTwoFactorAuth', response);
        return callback(err, response);
    });
};

BotAccount.prototype.disableTwoFactor = function (callback) {
    var self = this;
    self.emit('disablingTwoFactorAuth');
    if (!self.accountDetails.revocation_code)
        return callback({Error: "There is no revocation code saved."}, null);

    self.community.disableTwoFactor(self.accountDetails.revocation_code, function (err, response) {
        if (err)
            return callback(err, null);

        self.accountDetails.shared_secret = response.shared_secret;
        self.accountDetails.identity_secret = response.identity_secret;
        self.accountDetails.revocation_code = response.revocation_code;
        self.emit('enabledTwoFactorAuth', response);
        return callback(null, response);
    });
};

BotAccount.prototype.getStateName = function (state) {
    return TradeOfferManager.getStateName(state);
};

BotAccount.prototype.setTempSetting = function (tempSetting, tempSettingValue) {
    var self = this;
    self.tempSettings[tempSetting] = tempSettingValue;
};
BotAccount.prototype.getTempSetting = function (tempSetting) {
    var self = this;
    if (self.tempSettings.hasOwnProperty(tempSetting))
        return self.tempSettings[tempSetting];
    return null;
};
BotAccount.prototype.deleteTempSetting = function (tempSetting) {
    var self = this;
    if (self.tempSettings.hasOwnProperty(tempSetting))
        delete self.tempSettings[tempSetting];
};

BotAccount.prototype.chatLogon = function (interval, uiMode) {
    var self = this;
    if (interval == null)
        interval = 500;
    if (uiMode == null)
        uiMode = 'web';
    self.community.chatLogon(interval, uiMode);
};
BotAccount.prototype.logoutAccount = function () {
    var self = this;
    self.community.chatLogoff();
};


module.exports = BotAccount;
