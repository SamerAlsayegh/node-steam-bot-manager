var SteamUser = require('steam-user');
var SteamCommunity = require('steamcommunity');
var SteamStore = require('steamstore');
var TradeOfferManager = require('steam-tradeoffer-manager');
var SteamTotp = require('steam-totp');
BotAccount.prototype.__proto__ = require('events').EventEmitter.prototype;


var SteamID = TradeOfferManager.SteamID;

/**
 * Creates a new BotAccount instance for a bot.
 * @class
 */
function BotAccount(accountDetails) {
    // Ensure account values are valid
    var self = this;
    // Init all required variables
    self.tempSettings = {};
    self.community = new SteamCommunity();
    self.client = new SteamUser();
    self.trade = new TradeOfferManager({
        "steam": self.client,
        "community": self.community,
        "cancelTime": 1000 * 60 * 60 * 24 * 10, // Keep offers upto 1 hour, and then just cancel them.
        "pendingCancelTime": 1000 * 60 * 30, // Keep offers upto 30 mins, and then cancel them if they still need confirmation
        "cancelOfferCount": 30,// Cancel offers once we hit 7 day threshold
        "cancelOfferCountMinAge": 1000 * 60 * 60 * 24 * 7,// Keep offers until 7 days old
        "language": "en", // We want English item descriptions
        "pollInterval": 5000 // We want to poll every 5 seconds since we don't have Steam notifying us of offers
    });
    self.store = new SteamStore();
    self.accountDetails = accountDetails;


    self.client.on('loggedOn', function (details) {
        self.client.setPersona(SteamUser.Steam.EPersonaState.Online);
        self.emit('loggedOn', details);
        if (self.getTempSetting('displayBotMenu') != null) {
            self.emit('displayBotMenu');
            self.deleteTempSetting('displayBotMenu');
        }
    });

    self.client.on('webSession', function (sessionID, cookies) {
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

        self.client.on('friendOrChatMessage', function (senderID, message, room) {
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
            self.emit('friendOrChatMessage', senderID, message, room);
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

        // Useless right now
        //self.client.on('friendsList', function () {
        //    self.emit('friendsList');
        //});

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


        // Really glitchy trade system... So just ignore it for now.
        //self.client.on('tradeResponse', function (steamid, response, restrictions) {
        //    self.emit('tradeResponse', steamid, response, restrictions);
        //});

        // Really glitchy trade system... So just ignore it for now.
        //self.client.on('tradeRequest', function (steamID, respond) {
        //    respond(false);
        //});

        self.client.on('tradeOffers', function (count) {
            /**
             * Emitted when we receive a new trade offer notification (only provides amount of offers and no other details)
             *
             * @event BotAccount#tradeOffers
             * @type {object}
             * @property {Integer} count - The amount of active trade offers (can be 0).
             */
            self.emit('tradeOffers', count);
        });

        self.client.on('steamGuard', function (domain, callback, lastCodeWrong) {
            /**
             * Emitted when Steam requests a Steam Guard code from us. You should collect the code from the user somehow and then call the callback with the code as the sole argument.
             *
             * @event BotAccount#steamGuard
             * @type {object}
             * @property {String} domain - If an email code is needed, the domain name of the address where the email was sent. null if an app code is needed.
             * @property {Callback} callbackSteamGuard - Should be called when the code is available.
             * @property {Boolean} lastCodeWrong - true if you're using 2FA and the last code you provided was wrong, false otherwise
             */
            self.emit('steamGuard', domain, callback, lastCodeWrong);
        });
        /**
         * Emitted when we fully sign into Steam and all functions are usable.
         *
         * @event BotAccount#loggedIn
         */
        self.emit('loggedIn');
    });


    self.client.on('error', function (e) {
        // Some error occurred during logon
        console.log(e);
        switch (e.eresult) {
            case 5:
                console.log("in correct auth??");

                self.emit('incorrectCredentials', self.accountDetails);
                var tempAccountDetails = {
                    accountName: self.accountDetails.accountName,
                    password: self.accountDetails.password
                };
                delete self.accountDetails;// Clearing any non-auth details we may have had saved.
                self.accountDetails = tempAccountDetails;
                self.emit('updatedAccountDetails');
                break;
            default:
                self.emit('debug', e);
        }
        self.emit('displayBotMenu');
    });

}

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
 * Send a chat message to a steam user
 * @param {SteamID} recipient - Recipient of the message
 * @param {String} message - Message to send
 */
BotAccount.prototype.sendMessage = function (recipient, message) {
    var self = this;
    return self.client.chatMessage(recipient, message, 1);
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
/**
 * Change the display name of the account (with prefix)
 * @param {String} newName - The new display name
 * @param {String} namePrefix - The prefix if there is one (Nullable)
 * @param {errorCallback} errorCallback - A callback returned with possible errors
 */
BotAccount.prototype.changeName = function (newName, namePrefix, errorCallback) {
    var self = this;
    if (namePrefix == null) namePrefix = '';

    self.community.editProfile({name: namePrefix + newName}, function (err) {
        errorCallback(err);
        self.accountDetails.displayName = newName;
        self.emit('updatedAccountDetails');
    });
};

BotAccount.prototype.getInventory = function (appid, contextid, tradeableOnly, callback) {
    var self = this;
    self.trade.loadInventory(appid, contextid, tradeableOnly, callback);
};


BotAccount.prototype.getUserInventory = function (steamID, appid, contextid, tradableOnly, callback) {
    var self = this;
    self.trade.loadUserInventory(steamID, appid, contextid, tradableOnly, callback);
};
BotAccount.prototype.addPhoneNumber = function (phoneNumber, callback) {
    var self = this;
    self.store.addPhoneNumber(phoneNumber, true, function (err) {
        if (err) {
            callback(err);
        }
        else {
            callback(null);
        }
    });
};


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
        self.confirmOutstandingTrades();

        callback(err, acceptedTrades);
    });
    // Old confirmation code - removed due to not providing enought info.
};

BotAccount.prototype.confirmOutstandingTrades = function () {
    var self = this;
    var time = self.getUnixTime();
    self.getConfirmations(time, self.generateMobileConfirmationCode(time, "conf"), function (err, confirmations) {
        if (err) {
            self.emit('debug', {msg: "Failed to confirm outstanding trades"});
            self.emit('error', {code: 503, msg: "Failed to confirm outstanding trades"});
            setTimeout(self.confirmOutstandingTrades(), 5000);
        }
        else {
            for (var confirmId in confirmations) {
                if (confirmations.hasOwnProperty(confirmId)) {
                    confirmations[confirmId].respond(time, self.generateMobileConfirmationCode(time, "allow"), true, function (err) {
                        if (err) {
                            console.log("Trade failed to confirm");
                            console.log(err);
                        }
                    });
                }
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
BotAccount.prototype.getFriends = function (callback) {
    var self = this;
    var onlineFriendsList = [];
    // We need to convert SteamID to names... To do that, we need SteamCommunity package.
    for (var id in Object.keys(self.client.users)) {
        onlineFriendsList.push({
            accountName: self.client.users[Object.keys(self.client.users)[id]].player_name,
            accountSid: Object.keys(self.client.users)[id]
        });
    }
    self.emit('loadedFriends', onlineFriendsList);
    onlineFriendsList.splice(0, 1);//First entry is usually the bot's name. So just delete it
    callback({Error: new Error("Failed to find all friends?")}, onlineFriendsList);
};

BotAccount.prototype.createOffer = function (sid) {
    var self = this;
    self.emit('createdOffer', sid);
    return self.trade.createOffer(sid);
};

BotAccount.prototype.has_shared_secret = function () {
    var self = this;
    return (self.accountDetails.shared_secret ? true : false);
};

BotAccount.prototype.loginAccount = function (authCode) {
    var self = this;
    self.emit('loggingIn');
    var accountDetailsModified = self.accountDetails;
    if (self.accountDetails.shared_secret) {
        self.client.setOption("promptSteamGuardCode", false);
        accountDetailsModified.twoFactorCode = self.generateMobileAuthenticationCode();
    }
    accountDetailsModified.rememberPassword = true;
    accountDetailsModified.logonId = 100;
    if (authCode != undefined) {
        accountDetailsModified.authCode = authCode;
    }

    self.client.logOn(accountDetailsModified);
};
BotAccount.prototype.hasPhone = function (callback) {
    var self = this;
    self.store.hasPhone(function (err, hasPhone, lastDigits) {
        callback(err, hasPhone, lastDigits);
    });
};

BotAccount.prototype.finalizeTwoFactor = function (shared_secret, activationCode, callback) {
    var self = this;
    self.emit('finalizedTwoFactorAuth');
    self.client.finalizeTwoFactor(shared_secret, activationCode, callback);
};

BotAccount.prototype.enableTwoFactor = function (callback) {
    var self = this;
    self.emit('enablingTwoFactorAuth');
    self.client.enableTwoFactor(function (response) {
        self.accountDetails.shared_secret = response.shared_secret;
        self.accountDetails.identity_secret = response.identity_secret;
        self.accountDetails.revocation_code = response.revocation_code;
        self.emit('enabledTwoFactorAuth', response);
        callback(response);
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

BotAccount.prototype.logoutAccount = function () {
    var self = this;
    self.client.logOff();
};


module.exports = BotAccount;
