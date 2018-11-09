Bot.prototype.__proto__ = require('events').EventEmitter.prototype;
const Auth = require('./Auth.js');
const Trade = require('./Trade.js');
const Request = require('./Request.js');
const Friends = require('./Friends.js');
const Profile = require('./Profile.js');
const Community = require('./Community.js');
const TaskManager = require('../lib/TaskManager.js');
const SteamCommunity = require('steamcommunity');
const SteamUser = require('steam-user');
const SteamStore = require('steamstore');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamID = TradeOfferManager.SteamID;
const request = require('request');

/**
 * Create a new bot instance
 *
 * @param username
 * @param password
 * @param details
 * @param settings
 * @param logger
 * @constructor
 */
function Bot(username, password, details, settings) {
    var self = this;
    // TODO: Revamp the accountName and username fields... Currently 2 fields exist which are redundant
    // Init all required variables
    if (typeof username != "string" || typeof password != "string") {
        if (details == null || !details.hasOwnProperty("steamguard") || !(details.hasOwnProperty("oAuthToken"))) {
            throw Error("Invalid username/password or missing oAuthToken/Steamguard code");
        }
    }

    if (details != null) {
        if (details.hasOwnProperty("displayName"))
            self.displayName = details.displayName;
        if (details.hasOwnProperty("apiKey"))
            self.apiKey = details.apiKey;
    }


    self.username = username;
    self.password = password;
    self.settings = settings || {
        api_key: "",
        tradeCancelTime: 60 * 60 * 24 * 1000,
        tradePendingCancelTime: 60 * 60 * 24 * 1000,
        language: "en",
        tradePollInterval: 5000,
        tradeCancelOfferCount: 30,
        tradeCancelOfferCountMinAge: 60 * 60 * 1000,
        cancelTradeOnOverflow: true
    };

    // if (logger) {
    //     self.logger = logger;
    // }
    self.freshLogin = true;
    self.Auth = new Auth(details);
    self.Auth.setSettings(settings);
    self.Auth.on('error', function () {
        self.emit('error', ...arguments);
    });
    self.Auth.on('debug', function () {
        self.emit('debug', ...arguments);
    });

    self.Auth.on('updatedAccountDetails', function (accountDetails) {
        self.emit('updatedAccountDetails', accountDetails);
    });
    self.Auth.on('loggedInAccount', function (cookies, sessionID) {
        self.loggedInAccount(cookies, sessionID, function (err, SteamID) {
            if (err) self.emit('error', err);
            self.SteamID = SteamID;
        })
    });




    if (self.settings.autologin == true)
        self.initUser(function (err) {
            self.Auth.loginAccount();
        });


    // Events Listeners

    self.sentOfferChanged = function (offer, oldState) {
        /**
         * Emitted when a trade offer changes state (Ex. accepted, pending, escrow, etc...)
         *
         * @event Bot#sentOfferChanged
         * @type {object}
         * @property {TradeOffer} offer - The new offer's details
         * @property {TradeOffer} oldState - The old offer's details
         */
        self.emit('sentOfferChanged', offer, oldState);
    };

    self.chatLogOnFailed = function (err, fatal) {
        self.emit('chatLogOnFailed', err, fatal);
    };

    self.chatLoggedOn = function () {
        self.emit('chatLoggedOn');
    };

    self.chatTyping = function (senderID) {
        self.emit('chatTyping', senderID);
    };

    self.chatMessage = function (senderID, message) {
        if (self.currentChatting != undefined && senderID == self.currentChatting.sid) {
            console.log(("\n" + self.currentChatting.username + ": " + message));
        }
        self.emit('debug', 'Received message from %j: %s', senderID, message);
        /**
         * Emitted when a friend message or chat room message is received.
         *
         * @event Bot#chatMessage
         * @type {object}
         * @property {SteamID} senderID - The message sender, as a SteamID object
         * @property {String} message - The message text
         */
        self.emit('chatMessage', senderID, message);
    };

    self.sessionExpired = function (err) {
        self.emit('debug', "Login session expired for %s, due to ", self.getAccountName(), err);
        self.loggedIn = false;
        self.emit('sessionExpired', err);
    };

    self.receivedOfferChanged = function (offer, oldState) {
        self.emit('receivedOfferChanged', offer, oldState);
    };

    self.offerList = function (filter, sent, received) {
        /**
         * Emitted when we fetch the offerList
         *
         * @event Bot#offerList
         * @type {object}
         */
        self.emit('offerList', filter, sent, received);
    };

    self.newOffer = function (offer) {
        /**
         * Emitted when we receive a new trade offer
         *
         * @event Bot#newOffer
         * @type {object}
         * @property {TradeOffer} offer - The offer's details
         */
        self.emit('newOffer', offer);
    };

    self.realTimeTradeConfirmationRequired = function (offer) {
        /**
         * Emitted when a trade offer is cancelled
         *
         * @event Bot#tradeOffers
         * @type {object}
         * @property {Integer} count - The amount of active trade offers (can be 0).
         */
        self.emit('realTimeTradeConfirmationRequired', offer);
    };

    self.realTimeTradeCompleted = function (offer) {
        /**
         * Emitted when a trade offer is cancelled
         *
         * @event Bot#tradeOffers
         * @type {object}
         * @property {Integer} count - The amount of active trade offers (can be 0).
         */
        self.emit('realTimeTradeCompleted', offer);
    };

    self.sentOfferCanceled = function (offer) {
        /**
         * Emitted when a trade offer is cancelled
         *
         * @event Bot#tradeOffers
         * @type {object}
         * @property {Integer} count - The amount of active trade offers (can be 0).
         */
        self.emit('sentOfferCanceled', offer);
    };


}

/**
 * @callback callbackErrorOnly
 * @param {Error} error - An error message if the process failed, undefined if successful
 */
/**
 * @callback callbackSteamID
 * @param {Error} error - An error message if the process failed, undefined if successful
 * @param {SteamID} steamid - steamid if successful, null if error.
 */

/**
 * This error callback is expected only to return an error, and no other information.
 * @callback errorOnlyCallback
 * @param {Error} error - An error message if the process failed, undefined if successful
 */

/**
 * Initiate the user with custom options incase you wish to use a proxy/bind requests to localAddress. Or provide custom options to certain users.
 * @param options (optional)
 * @param callback (optional)
 */
Bot.prototype.initUser = function (options, callback) {
    let self = this;
    if (callback == null && options != null) {
        callback = options;
        options = {};
    }
    let allOpts = {};

    let requestOptions = {};
    if (options.hasOwnProperty("request")) {
        requestOptions = options.request;
        allOpts.request =  request.defaults(requestOptions);
    }



    self.community = new SteamCommunity(allOpts);

    self.client = new SteamUser({
        promptSteamGuardCode: false,
    });


    self.TradeOfferManager = new TradeOfferManager({
        "steam": self.client,
        "community": self.community,
        "cancelTime": options.hasOwnProperty("cancelTime") ? options.cancelTime : self.settings.tradeCancelTime, // Keep offers upto 1 day, and then just cancel them.
        "pendingCancelTime": options.hasOwnProperty("pendingCancelTime") ? options.pendingCancelTime : self.settings.tradePendingCancelTime, // Keep offers upto 30 mins, and then cancel them if they still need confirmation
        "cancelOfferCount": options.hasOwnProperty("cancelOfferCount") ? options.cancelOfferCount : self.settings.tradeCancelOfferCount,// Cancel offers once we hit 7 day threshold
        "cancelOfferCountMinAge": options.hasOwnProperty("cancelOfferCountMinAge") ? options.cancelOfferCountMinAge : self.settings.tradeCancelOfferCountMinAge,// Keep offers until 7 days old
        "language": options.hasOwnProperty("language") ? options.language : self.settings.language, // We want English item descriptions
        "pollInterval": options.hasOwnProperty("tradePollInterval") ? options.tradePollInterval : self.settings.tradePollInterval // We want to poll every 5 seconds since we don't have Steam notifying us of offers
    });
    self.request = self.community.request;
    self.store = new SteamStore();
    self.Auth.initAuth(self.community, self.store, self.client);

    self.loggedIn = false;
    // self.Tasks = new TaskManager();
    // self.Tasks.on('error', function () {
    //     self.emit('error', ...arguments);
    // });
    // self.Tasks.on('debug', function () {
    //     self.emit('debug', ...arguments);
    // });

    self.Request = new Request(self.request);
    self.Request.on('error', function () {
        self.emit('error', ...arguments);
    });
    self.Request.on('debug', function () {
        self.emit('debug', ...arguments);
    });

    self.client.on('loggedOn', function (details, parental) {
        self.emit('loggedInNodeSteam', details);
        self.emit('debug', 'Logged into Steam via SteamClient on %s.', self.getAccountName());
        self.client.setPersona(1);
    });

    self.client.on("steamGuard", function(domain, callback, lastCodeWrong) {
        if(lastCodeWrong) {
            self.emit('debug', 'SteamGuard code was incorrect for %s. Retrying in 30 seconds.', self.getAccountName());
        }
        setTimeout(function () {
            callback(self.Auth.generateMobileAuthenticationCode());
        }, 1000 * 5);
    });

    self.client.on('loginKey', function (loginKey) {
        self.emit('debug', 'Received a loginKey. This key must be removed if changing ip\'s.');
        self.Auth._updateAccountDetails({loginKey: loginKey});
    });

    self.client.on('error', function (err) {
        self.emit('error', "Error on %s for SteamUser %s", self.getAccountName(), err);
    });

    self.Profile = new Profile(self.Tasks, self.community, self.Auth);
    self.Profile.on('error', function () {
        self.emit('error', ...arguments);
    });
    self.Profile.on('debug', function () {
        self.emit('debug', ...arguments);
    });

    self.Profile.displayName = self.displayName;
    self.Friends = new Friends(self, self.Request);
    self.Friends.on('error', function () {
        self.emit('error', ...arguments);
    });
    self.Friends.on('debug', function () {
        self.emit('debug', ...arguments);
    });
    self.Trade = new Trade(self.TradeOfferManager, self.Auth, self.Tasks, self.settings);
    self.Trade.on('error', function () {
        self.emit('error', ...arguments);
    });
    self.Trade.on('debug', function () {
        self.emit('debug', ...arguments);
    });
    self.Community = new Community(self.community, self.Auth);


    self.errorCommunity = function () {
        self.emit('error', ...arguments);
    };
    self.Community.removeListener('error', self.errorCommunity);
    self.Community.on('error', self.errorCommunity);

    self.debugCommunity = function () {
        self.emit('debug', ...arguments);
    };

    self.Community.removeListener('debug', self.debugCommunity);
    self.Community.on('debug', self.debugCommunity);

    if (callback) {
        return callback();
    }
};
/**
 * Get the account's username, used to login to Steam
 * @returns {String} username
 */
Bot.prototype.getAccountName = function () {
    let self = this;
    return self.username;
};


/**
 * Set the user we are chatting with
 * @param {*|{username: *, sid: *}} chattingUserInfo
 */
Bot.prototype.setChatting = function (chattingUserInfo) {
    let self = this;
    self.currentChatting = chattingUserInfo;
};


/**
 * Fetch SteamID Object from the Individual Account ID (i.e 46143802)
 * @returns {Error | String}
 */
Bot.prototype.getUserFromAccountID = function (id) {
    return SteamID.fromIndividualAccountID(id);
};


/**
 * This method simply destroys this instance of the object and recreates it. (Get rid of all data)
 */
Bot.prototype.destroyAndRecreate = function (callback) {
    let self = this;
    self.emit('recreate', callback);
};

/**
 * Fetch SteamID Object from the Individual Account ID (i.e 46143802)
 * @returns {Error | String}
 * @deprecated
 */
Bot.prototype.fromIndividualAccountID = function (id) {
    let self = this;
    return self.getUserFromAccountID(id);
};

/**
 * Fetch SteamID Object from the SteamID2, SteamID3, SteamID64 or Tradeurl.
 * @returns {Error | SteamID}
 */
Bot.prototype.getUser = function (steamid) {
    return new SteamID(steamid);
};


/**
 * Get the display name of the account
 * @returns {String|undefined} displayName - Display name of the account
 * @deprecated
 */
Bot.prototype.getDisplayName = function () {
    let self = this;
    return self.Profile ? self.Profile.getDisplayName() : self.username;
};

/**
 * Get the SteamID of the Bot
 */
Bot.prototype.getSteamID = function () {
    let self = this;
    return self.SteamID ? self.SteamID : self.steamid64;
};

/**
 * Change the display name of the account (with prefix)
 * @param {String} newName - The new display name
 * @param {String} namePrefix - The prefix if there is one (Nullable)
 * @param {callbackErrorOnly} callbackErrorOnly - A callback returned with possible errors
 * @deprecated
 */
Bot.prototype.changeName = function (newName, namePrefix, callbackErrorOnly) {
    let self = this;
    self.Profile.changeDisplayName(newName, namePrefix, callbackErrorOnly);
};

/**
 * Retrieve account inventory based on filters
 * @param {Integer} appid - appid by-which to fetch inventory based on.
 * @param {Integer} contextid - contextid of lookup (1 - Gifts, 2 - In-game Items, 3 - Coupons, 6 - Game Cards, Profile Backgrounds & Emoticons)
 * @param {Boolean} tradableOnly - Items retrieved must be tradable
 * @param {inventoryCallback} inventoryCallback - Inventory details (refer to inventoryCallback for more info.)
 * @deprecated
 */
Bot.prototype.getInventory = function (appid, contextid, tradableOnly, inventoryCallback) {
    let self = this;
    self.Trade.getInventory(appid, contextid, tradableOnly, inventoryCallback);
};

/**
 * Retrieve account inventory based on filters and provided steamID
 * @param {SteamID} steamID - SteamID to use for lookup of inventory
 * @param {Integer} appid - appid by-which to fetch inventory based on.
 * @param {Integer} contextid - contextid of lookup (1 - Gifts, 2 - In-game Items, 3 - Coupons, 6 - Game Cards, Profile Backgrounds & Emoticons)
 * @param {Boolean} tradableOnly - Items retrieved must be tradableOnly
 * @param {inventoryCallback} inventoryCallback - Inventory details (refer to inventoryCallback for more info.)
 * @deprecated
 */
Bot.prototype.getUserInventory = function (steamID, appid, contextid, tradableOnly, inventoryCallback) {
    let self = this;
    if (!self.loggedIn) {
        return inventoryCallback("Not Logged In");
    }
    else
        self.Trade.getUserInventory(steamID, appid, contextid, tradableOnly, inventoryCallback);
};
/**
 * Add a phone-number to the account (For example before setting up 2-factor authentication)
 * @param phoneNumber - Certain format must be followed
 * @param {callbackErrorOnly} callbackErrorOnly - A callback returned with possible errors
 */
Bot.prototype.addPhoneNumber = function (phoneNumber, callbackErrorOnly) {
    let self = this;
    self.store.addPhoneNumber(phoneNumber, true, function (err) {
        callbackErrorOnly(err);
    });
};


/**
 * Enter the code to verify the phone number.
 * @param code
 * @param {callbackErrorOnly} callbackErrorOnly - A callback returned with possible errors
 */
Bot.prototype.verifyPhoneNumber = function (code, callbackErrorOnly) {
    let self = this;
    self.store.verifyPhoneNumber(code, function (err) {
        if (err) {
            callbackErrorOnly(err);
        }
        else {
            callbackErrorOnly(undefined);
        }
    });
};


/**
 * This is a private method - but incase you would like to edit it for your own usage...
 * @param cookies - Cookies sent by Steam when logged in
 * @param sessionID - Session ID as sent by Steam
 * @param {callbackSteamID} callbackSteamID - If encountered error (optional), and return SteamID Object
 */
Bot.prototype.loggedInAccount = function (cookies, sessionID, callbackSteamID) {
    let self = this;
    if (self.Friends) self.Friends.login(500, 'web');
    self.emit('debug', 'Logged into %j', self.getAccountName());

    // self.logger.log('debug', );
    if (self.sessionID != sessionID || self.cookies != cookies) {
        self.emit('debug', 'Updated session cookies for %j', self.getAccountName());
        self.sessionID = sessionID;
        self.cookies = cookies;
    }


    if (self.cookies) {
        self.community.setCookies(self.cookies);
        self.store.setCookies(self.cookies);
        // self.TradeOfferManager.setCookies(self.cookies, function (err) {

            // self.SteamID = self.TradeOfferManager.steamID;
            // if (err) {
            //     self.emit('debug', 'Failed to get API Key - TradeOverflowChecking disabled for %j & getOffers call disabled due to %j', self.getAccountName(), err);
            //     self.api_access = false;
            //
            //     if (err.Error == "Access Denied") {
            //         self.emit('debug', '%j is a limited account. Check here for more info: https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663', self.getAccountName());
            //     }
            // }
            // else {
            //     self.api_access = true;
                self.loggedIn = true;

                // We will always fetch the apiKey on login and ensure it is the same as recorded, otherwise we save it.
                // if (!self.hasOwnProperty("apiKey")) {
                //     self.Community.getWebApiKey(function (err, apiKey) {
                //         if (err) {
                //             self.emit('debug', 'Failed to get apiKey for %j due to %s', self.getAccountName(), err);
                //             // self.logger.log("debug", "Failed to get apiKey for %j due to %s", self.username, err);
                //         } else {
                //             self.emit('debug', 'Updated apiKey for %s', self.getAccountName());
                //             // self.logger.log("debug", "Updated apiKey for %s", self.username);
                //             self.apiKey = apiKey;
                //             self.Auth._updateAccountDetails({apiKey: self.apiKey});
                //         }
                //     });
                // }

            // }
            // if (self.SteamID) {
            //     self.Profile.getSteamUser(self.SteamID, function (err, user) {
            //         if (err) {
            //             self.emit('debug', 'Failed to get display name for %s', self.getAccountName());
            //             //self.logger.log("debug", "Failed to get display name for ", self.username, err);
                    // } else {
                    //     self.emit('debug', 'Loaded account details for %s', self.getAccountName());
                    //     //self.logger.log("debug", "Loaded account details for %s", self.username);
                        // self.community_details = user;
                        // self.Profile.displayName = user.name;
                        // self.displayName = user.name;
                        // self.Auth._updateAccountDetails({displayName: user.name});
                    // }
                // });
            // }

            self.Trade.setAPIAccess(self.api_access);

            self.emit('loggedIn', self);
            // if (err) {
            //     self.emit('error', err);
            //     if (callbackSteamID)
            //         return callbackSteamID(err, self.SteamID);
            // }
            self.community.removeAllListeners();
            self.community.on('chatTyping', self.chatTyping);
            self.community.on('chatLoggedOn', self.chatLoggedOn);
            self.community.on('chatLogOnFailed', self.chatLogOnFailed);
            self.community.on('chatMessage', self.chatMessage);


            // self.client.removeAllListeners();
            self.client.on('friendTyping', self.chatTyping);
            self.client.on('loggedOn', self.chatLoggedOn);
            // self.client.on('chatLogOnFailed', self.chatLogOnFailed);
            self.client.on('friendOrChatMessage', self.chatMessage);


            self.community.on('sessionExpired', self.sessionExpired);

            self.TradeOfferManager.removeAllListeners();
            self.TradeOfferManager.on('sentOfferChanged', self.sentOfferChanged);
            self.TradeOfferManager.on('receivedOfferChanged', self.receivedOfferChanged);
            self.TradeOfferManager.on('offerList', self.offerList);
            self.TradeOfferManager.on('newOffer', self.newOffer);
            self.TradeOfferManager.on('realTimeTradeConfirmationRequired', self.realTimeTradeConfirmationRequired);
            self.TradeOfferManager.on('realTimeTradeCompleted', self.realTimeTradeCompleted);
            self.TradeOfferManager.on('sentOfferCanceled', self.sentOfferCanceled);


            if (callbackSteamID)
                return callbackSteamID(undefined, self.SteamID);
        // });
    }
    else
        return callbackSteamID(new Error("Invalid cookies supplied."), null);

};


Bot.prototype.hasPhone = function (callback) {
    let self = this;
    self.store.hasPhone(function (err, hasPhone, lastDigits) {
        callback(err, hasPhone, lastDigits);
    });
};

/**
 * Create a new account using this account as the maker.
 * @param username
 * @param password
 * @param email
 * @param callback
 */
Bot.prototype.createAccount = function (username, password, email, callback) {
    let self = this;
    if (self.client == null)
        self.client = new SteamUser({
            promptSteamGuardCode: false,
        });

    self.client.createAccount(username, password, email, function (EResult, steamid) {
        callback(EResult, steamid);
    })
};

Bot.prototype.setSetting = function (settingName, tempSettingValue) {
    let self = this;
    self.settings[settingName] = tempSettingValue;
};
Bot.prototype.getSetting = function (tempSetting) {
    let self = this;
    if (self.settings.hasOwnProperty(tempSetting))
        return self.settings[tempSetting];
    return undefined;
};
Bot.prototype.deleteSetting = function (tempSetting) {
    let self = this;
    if (self.settings.hasOwnProperty(tempSetting))
        delete self.settings[tempSetting];
};

Bot.prototype.logoutAccount = function () {
    let self = this;
    self.Friends.logout();

    self.community = new SteamCommunity();
    self.client = new SteamUser();
    self.TradeOfferManager = new TradeOfferManager({
        "steam": self.client,
        "community": self.community,
        "cancelTime": self.settings.tradeCancelTime, // Keep offers upto 1 day, and then just cancel them.
        "pendingCancelTime": self.settings.tradePendingCancelTime, // Keep offers upto 30 mins, and then cancel them if they still need confirmation
        "cancelOfferCount": self.settings.tradeCancelOfferCount,// Cancel offers once we hit 7 day threshold
        "cancelOfferCountMinAge": self.settings.tradeCancelOfferCountMinAge,// Keep offers until 7 days old
        "language": self.settings.language, // We want English item descriptions
        "pollInterval": 5000 // We want to poll every 5 seconds since we don't have Steam notifying us of offers
    });
    self.request = self.community.request;
    self.store = new SteamStore();
    self.loggedIn = false;
};


module.exports = Bot;
