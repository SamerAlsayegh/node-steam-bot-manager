Auth.prototype.__proto__ = require('events').EventEmitter.prototype;
const SteamTotp = require('steam-totp');

var privateStore = {};

/**
 * A class to handle all authentication functions for a bot account
 * @param BotAccount
 * @param accountDetails
 * @param logger
 * @constructor
 */
function Auth(accountDetails) {
    let self = this;

    // self.BotAccount = BotAccount;
    self.accountName = accountDetails.accountName || accountDetails.username;
    // accountDetails.accountName = accountDetails.accountName;

    self.settings = {};


    if (accountDetails.password)
        accountDetails.password = accountDetails.password;


    self.loggedIn = false;
    // Create an object to manage this instance's state and
    // use a unique ID to reference it in the private store.
    privateStore[self.accountName] = {};
    // Store private stuff in the private store
    // instead of on `this`.
    privateStore[self.accountName].accountDetails = accountDetails;
}

Auth.prototype.initAuth = function (community, store, client) {
    let self = this;
    self.community = community;
    self.store = store;
    self.client = client;
};


Auth.prototype.enableTwoFactor = function (callback) {
    var self = this;
    self.emit('enablingTwoFactorAuth');
    self.emit('debug', 'Enabling two factor authentication for %j', self.username);
    self.community.enableTwoFactor(function (err, response) {
        if (err) {
            self.emit('error', 'Failed to enable two factor authentication for %j due to : %j', self.username, err);
            return callback(err, undefined);
        }
        self.emit('debug', 'Enabled two factor authentication for %j', self.username);
        privateStore[self.accountName].accountDetails.shared_secret = response.shared_secret;
        privateStore[self.accountName].accountDetails.identity_secret = response.identity_secret;
        privateStore[self.accountName].accountDetails.revocation_code = response.revocation_code;
        self.emit('enabledTwoFactorAuth');
        return callback(err, response);
    });
};

Auth.prototype.disableTwoFactor = function (callback) {
    var self = this;
    self.emit('disablingTwoFactorAuth');
    self.emit('debug', 'Disabling two factor authentication for %j', self.accountName);
    if (!privateStore[self.accountName].accountDetails.revocation_code)
        return callback({Error: "There is no revocation code saved."}, undefined);

    self.community.disableTwoFactor(privateStore[self.accountName].accountDetails.revocation_code, function (err) {
        if (err)
            return callback(err, undefined);
        self.emit('debug', 'Disabled two factor authentication for %j', self.accountName);
        // self.logger.log('debug', 'Disabled two factor authentication for %j', self.getAccountName());
        privateStore.splice(privateStore.indexOf(self.accountName, 1));
        self.emit('disabledTwoFactorAuth', response);
        return callback(undefined, response);
    });
};

Auth.prototype.setSettings = function (settings) {
    let self = this;
    self.settings = settings;
};

Auth.prototype.finalizeTwoFactor = function (activationCode, callbackErrorOnly) {
    var self = this;
    self.emit('finalizedTwoFactorAuth');
    self.community.finalizeTwoFactor(privateStore[self.accountName].accountDetails.shared_secret, activationCode, function (err) {
        callbackErrorOnly(err, privateStore[self.accountName].accountDetails);
    });
};

/**
 * Login to account using supplied details (2FactorCode, authcode, or captcha)
 * @param details
 * @callback {callbackErrorOnly}
 */
Auth.prototype.loginAccount = function (details, callbackErrorOnly) {
    if (callbackErrorOnly == null){
        callbackErrorOnly = details;
        details = {};
    }


    var self = this;



    self.emit('loggingIn');
    if (self.settings.steamClientLogin)
        self.client.logOff();

    if (self.has_shared_secret()) {
        privateStore[self.accountName].accountDetails.twoFactorCode = self.generateMobileAuthenticationCode();
    }

    if (details != undefined) {
        if (details.authCode != undefined)
            privateStore[self.accountName].accountDetails.authCode = details.authCode;
        if (details.captcha != undefined)
            privateStore[self.accountName].accountDetails.captcha = details.captcha;
    }
    let loginDetails = {
        accountName: self.accountName,
        password: privateStore[self.accountName].accountDetails.password,
        authCode: privateStore[self.accountName].accountDetails.authCode,
        twoFactorCode: privateStore[self.accountName].accountDetails.twoFactorCode,
        rememberPassword: true,
        logonID: 1337,
        machineName: "node-steam-bot-manager",
    };
    if (privateStore[self.accountName].accountDetails.loginKey){
        // loginDetails.loginKey = privateStore[self.accountName].accountDetails.loginKey;
    }
    self.emit('debug', 'Attempting to login to %s ', self.accountName);

    if (privateStore[self.accountName].accountDetails.steamguard && privateStore[self.accountName].accountDetails.oAuthToken) {
        self.emit('debug', 'OAuth method chosen for %s ', self.accountName);


        self.community.oAuthLogin(privateStore[self.accountName].accountDetails.steamguard, privateStore[self.accountName].accountDetails.oAuthToken, function (err, sessionID, cookies) {
            self.emit('debug', 'Login status for %s: %s', self.accountName, err ? false : true);

            if (err) {
                self.emit('error', 'Failed to login into "%s" via oAuth due to %s', self.accountName, err);
                if (callbackErrorOnly != undefined)
                    return callbackErrorOnly(err);
            }
            else {
                self.loggedIn = true;
                self.sessionid = sessionID;
                if (privateStore[self.accountName].accountDetails.password  && self.settings.steamClientLogin && !self.client.cellID) {
                    self.client.logOn(loginDetails);
                }

                self.emit('loggedInAccount', cookies, sessionID);
                if (callbackErrorOnly) {
                    callbackErrorOnly(null);
                }
            }
        });
    }
    else {
        self.community.login(privateStore[self.accountName].accountDetails, function (err, sessionID, cookies, steamguardGen, oAuthTokenGen) {
            if (err) {
                self.emit('error', 'Failed to login into "%s" via password due to %s', self.accountName, err);
                if (callbackErrorOnly != undefined)
                    callbackErrorOnly(err);
                return;
            } else {
                if (privateStore[self.accountName].accountDetails.password  && self.settings.steamClientLogin && !self.client.cellID) {
                    self.client.logOn(loginDetails);
                }
                self.emit('updatedAccountDetails', privateStore[self.accountName].accountDetails);

                privateStore[self.accountName].accountDetails.steamguard = steamguardGen;
                privateStore[self.accountName].accountDetails.oAuthToken = oAuthTokenGen;
                self.loggedIn = true;
                self.sessionid = sessionID;

                self.emit('loggedInAccount', cookies, sessionID);

                if (callbackErrorOnly) {
                    callbackErrorOnly(null);
                }
            }
        });
    }
};

/**
 * Logout from chat of the botAccount
 * @param details
 */
Auth.prototype.logoutAccount = function () {
    var self = this;
    self.emit('loggingOut');
    self.community.chatLogoff();

};

/**
 * Sets the revocation code and returns it if successful (null if it fails validity checks).
 * @param revocationCode
 * @returns {String}
 */
Auth.prototype.setRevocationCode = function (revocationCode) {
    var self = this;
    if (revocationCode.indexOf("R") == 0 && revocationCode.length == 6)
        return privateStore[self.accountName].accountDetails.revocation_code = revocationCode;
    else
        return null;
};

Auth.prototype.has_shared_secret = function () {
    var self = this;
    return !!privateStore[self.accountName].accountDetails.identity_secret;
};

/**
 * Generate two-factor-authentication code used for logging in.
 * @returns {Error | String}
 */
Auth.prototype.generateMobileAuthenticationCode = function () {
    var self = this;
    if (privateStore[self.accountName].accountDetails.shared_secret)
        return SteamTotp.generateAuthCode(privateStore[self.accountName].accountDetails.shared_secret);
    else
        return new Error("Failed to generate authentication code. Enable 2-factor-authentication via this tool.");
};
/**
 *
 * @param time - Current time of trade (Please use getUnixTime())
 * @param tag - Type of confirmation required ("conf" to load the confirmations page, "details" to load details about a trade, "allow" to confirm a trade, "cancel" to cancel it.)
 * @returns {Error}
 */
Auth.prototype.generateMobileConfirmationCode = function (time, tag) {
    var self = this;
    if (privateStore[self.accountName].accountDetails.identity_secret)
        return SteamTotp.generateConfirmationKey(privateStore[self.accountName].accountDetails.identity_secret, time, tag);
    else
        return new Error("Failed to generate confirmation code. Enable 2-factor-authentication via this tool.");
};

/**
 * This is meant to be a private method that updates account details securely (triggers an event to botAccount for a save, without revealing account information to preying eyes - can be bypassed, but simply makes it more challenging to be done without editing the the manager's code)
 * @param newDetails
 */
Auth.prototype._updateAccountDetails = function (newDetails) {
    // We will loop through all new details and ensure they do no edit any protected details
    var self = this;
    var protectedDetails = ["username", "accountName", "oAuthToken", "steamguard", "password", "shared_secret", "identity_secret", "revocation_code", "steamid64", "loginKey", "displayName"];
    for (var newDetail in newDetails) {
        if (newDetails.hasOwnProperty(newDetail))
            if (protectedDetails.indexOf(newDetail) == -1)
                if (newDetails.hasOwnProperty(newDetail))
                    privateStore[self.accountName].accountDetails[newDetail] = newDetails[newDetail];
    }
    self.emit('updatedAccountDetails', privateStore[self.accountName].accountDetails);
};
/**
 * @callback confirmationsCallback
 * @param {Error} error - An error message if the process failed, undefined if successful
 * @param {Array} confirmations - An array of Confirmations
 */
/**
 * Get outstanding confirmations
 * @param time
 * @param key
 * @param confirmationsCallback
 */
Auth.prototype.getConfirmations = function (time, key, confirmationsCallback) {
    var self = this;
    self.community.getConfirmations(time, key, confirmationsCallback);
};

Auth.prototype.respondToConfirmation = function (confID, confKey, time, key, accept, callback) {
    var self = this;
    self.community.respondToConfirmation(confID, confKey, time, key, accept, callback);
};
/**
 * Get system time... for use with auth.
 * @param timeOffset
 * @returns {*}
 */
Auth.prototype.getTime = function (timeOffset) {
    return Math.floor(Date.now() / 1000) + (timeOffset || 0);
};

/**
 * Get time offset using steam... for use with auth.
 * @param timeOffset
 * @returns {*}
 */
Auth.prototype.getTimeOffset = function (callback) {
    SteamTotp.getTimeOffset(callback);
};
module.exports = Auth;
