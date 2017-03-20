Auth.prototype.__proto__ = require('events').EventEmitter.prototype;
const SteamTotp = require('steam-totp');


//
function Auth(BotAccount, logger) {
    var self = this;
    self.logger = logger;
    self.BotAccount = BotAccount;
    // console.log(BotAccount.details);
    self.community = BotAccount.community;
    self.store = BotAccount.store;
    self.accountName = BotAccount.getAccountName();
    self.password = BotAccount.password;
    self.shared_secret = BotAccount.details.shared_secret;
    self.identity_secret = BotAccount.details.identity_secret;
    self.revocation_code = BotAccount.details.revocation_code;
    self.steamguard = BotAccount.details.steamguard;
    self.oAuthToken = BotAccount.details.oAuthToken;

}
Auth.prototype.finalizeTwoFactor = function (shared_secret, activationCode, callbackErrorOnly) {
    var self = this;
    self.emit('finalizedTwoFactorAuth');
    self.community.finalizeTwoFactor(shared_secret, activationCode, function (err) {
        callbackErrorOnly(err);
    });
};


Auth.prototype.has_shared_secret = function () {
    var self = this;
    return (self.shared_secret ? true : false);
};

/**
 * @callback loginCallback
 * @param {Error} error - An error message if the login processing failed, undefined if successful
 */

/**
 * Login to account using supplied details (2FactorCode, authcode, or captcha)
 * @param details
 * @param callbackErrorOnly
 */
Auth.prototype.loginAccount = function (details, callbackErrorOnly) {
    var self = this;
    self.emit('loggingIn');

    if (self.canReloginWithoutPrompt()) {
        self.twoFactorCode = self.generateMobileAuthenticationCode();
    }

    if (details != undefined) {
        if (details.authCode != undefined)
            self.authCode = details.authCode;
        if (details.captcha != undefined)
            self.captcha = details.captcha;
    }


    if (self.steamguard && self.oAuthToken) {
        self.community.oAuthLogin(self.steamguard, self.oAuthToken, function (err, sessionID, cookies) {
            if (err) {
                if (err != undefined && err.Error == "HTTP error 429") {
                    self.emit('rateLimitedSteam');
                    self.logger.log('error', "Rate limited by Steam - Delaying request.");
                    self.BotAccount.addToQueue('ratelimit', self.loginAccount, [details, loginCallback]);
                }
                self.logger.log('error', "Failed to login into account via oAuth due to " + err);
                if (callbackErrorOnly)
                    callbackErrorOnly(err);
            }
            else
                self.BotAccount.loggedInAccount(cookies, sessionID, callbackErrorOnly);
        });
    }
    else {
        self.community.login(self, function (err, sessionID, cookies, steamguard, oAuthToken) {
            if (err) {
                if (err != undefined && err.Error == "HTTP error 429") {
                    self.emit('rateLimitedSteam');
                    self.logger.log('error', "Rate limited by Steam - Delaying request.");
                    self.BotAccount.addToQueue('ratelimit', self.loginAccount, [details, callbackErrorOnly]);
                }
                self.logger.log('error', "Failed to login into account due to " + err);
                if (callbackErrorOnly)
                    callbackErrorOnly(err);
            }
            self.steamguard = steamguard;
            self.oAuthToken = oAuthToken;
            self.emit('updatedAccountDetails');
            self.BotAccount.loggedInAccount(cookies, sessionID, callbackErrorOnly);
        });
    }
};
/**
 * Sets the revocation code and returns it if successful (null if it fails validity checks).
 * @param revocationCode
 * @returns {String}
 */
Auth.prototype.setRevocationCode = function (revocationCode) {
    var self = this;
    if (revocationCode.indexOf("R") == 0 && revocationCode.length == 6)
        return self.revocationCode = revocationCode;
    else
        return undefined;
};

Auth.prototype.enableTwoFactor = function (callback) {
    var self = this;
    self.emit('enablingTwoFactorAuth');
    self.logger.log('debug', 'Enabling two factor authentication for %j', self.username);
    self.community.enableTwoFactor(function (err, response) {
        if (err) {
            self.logger.log('error', 'Failed to enable two factor authentication for %j due to : %j', self.username, err);
            return callback(err, undefined);
        }
        self.logger.log('debug', 'Enabled two factor authentication for %j', self.username);
        self.shared_secret = response.shared_secret;
        self.identity_secret = response.identity_secret;
        self.revocation_code = response.revocation_code;
        self.emit('enabledTwoFactorAuth', response);
        return callback(err, response);
    });
};

Auth.prototype.canReloginWithoutPrompt = function () {
    var self = this;
    return !!self.shared_secret;
};


Auth.prototype.disableTwoFactor = function (callback) {
    var self = this;
    self.emit('disablingTwoFactorAuth');
    self.logger.log('debug', 'Disabling two factor authentication for %j', self.getAccountName());
    if (!self.revocation_code)
        return callback({Error: "There is no revocation code saved."}, undefined);

    self.community.disableTwoFactor(self.revocation_code, function (err, response) {
        if (err)
            return callback(err, undefined);
        self.logger.log('debug', 'Disabled two factor authentication for %j', self.getAccountName());

        // self.accountDetails.shared_secret = response.shared_secret;
        // self.accountDetails.identity_secret = response.identity_secret;
        // self.accountDetails.revocation_code = response.revocation_code;
        self.emit('disabledTwoFactorAuth', response);
        return callback(undefined, response);
    });
};

/**
 * Get system time... for use with auth.
 * @param timeOffset
 * @returns {*}
 */
Auth.prototype.getTime = function (timeOffset) {
    return Math.floor(Date.now() / 1000) + timeOffset;
};


/**
 * Generate two-factor-authentication code used for logging in.
 * @returns {Error | String}
 */
Auth.prototype.generateMobileAuthenticationCode = function () {
    var self = this;
    if (self.shared_secret)
        return SteamTotp.generateAuthCode(self.shared_secret);
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
    if (self.identity_secret)
        return SteamTotp.generateConfirmationKey(self.identity_secret, time, tag);
    else
        return new Error("Failed to generate confirmation code. Enable 2-factor-authentication via this tool.");
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
module.exports = Auth;
