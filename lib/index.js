"use strict";
module.exports = BotManager;

/**
 * Loading all external libraries needed for functionality across most files
 *
 */


/**
 * Loading logger
 */
const Winston = require('winston');

/**
 * Loading internal libraries
 * @type {GUI_Handler}
 */
const GUI = require('../gui/GUI_Handler');
const BotAccount = require('../classes/BotAccount.js');
const Webserver = require('./webserver.js');
const FileManager = require('./FileManager.js');
const ConfigManager = require('./ConfigManager.js');
const AccountsManager = require('./AccountsManager.js');


// Import events module
BotManager.prototype.__proto__ = require('events').EventEmitter.prototype;


/**
 * Creates a new BotManager instance.
 * @class
 */
function BotManager() {
    var self = this;

    self.ActiveBotAccounts = [];
    self.logger = new (Winston.Logger)({
        transports: [
            new (Winston.transports.Console)({
                level: 'info',
                timestamp: true,
                colorize: true
            }),
            new (Winston.transports.File)({
                level: 'debug',
                timestamp: true,
                filename: 'debug.log',
                json: false
            })
        ]
    });
    self.FileManager = new FileManager("./config", self.logger);
    self.ConfigManager = new ConfigManager(self.FileManager, self.logger);
    self.AccountsManager = new AccountsManager(self.FileManager, self.logger);
    self.GUI = new GUI(self);

}

BotManager.prototype.startManager = function (callbackManager) {
    var self = this;

    self.ConfigManager.loadConfig(function (err, config) {
        if (err) {
            if (callbackManager)
                callbackManager(err);
        }
        else {
            if (config.hasOwnProperty("api_port") && config.api_port != null) {
                self.webserver = new Webserver(config.api_port);
                self.webserver.on('apiLoaded', function () {
                    self.emit('loadedAPI');
                });
                self.webserver.start();
            }

            self.AccountsManager.getAccounts(function (accounts) {
                for (var botIndex in accounts) {
                    if (accounts.hasOwnProperty(botIndex)) {
                        var options = accounts[botIndex];
                        options.nosave = true;
                        self.registerAccount(accounts[botIndex].username == null ? accounts[botIndex].accountName : accounts[botIndex].username, accounts[botIndex].password, options, function (err, botAccount) {
                            if (err)
                                self.errorDebug("Error while loading bot info - " + err);
                        });
                    }
                }
                self.AccountsManager.saveAccounts(self.ActiveBotAccounts, function (err, savedObj) {
                    if (err)
                        self.errorDebug("Error while saving bot info - " + err);
                });

                self.GUI.displayBotMenu();
                if (callbackManager)
                    callbackManager(null);
            });
        }
    });
};
/**
 * Add an API Endpoint (via webserver) at chosen location.
 * @param method
 * @param url
 * @param callback
 */
BotManager.prototype.addEndpoint = function (method, url, callback) {
    var self = this;
    self.webserver.addEndpoint(method, url, callback);
};

BotManager.prototype.saveAccounts = function (callback) {
    var self = this;
    self.AccountsManager.saveAccounts(self.ActiveBotAccounts, function (err, savedObj) {
        callback(err, savedObj);
    });
};
/**
 * Add an API Endpoint (via webserver) at chosen location.
 * @param method
 * @param url
 * @param callback
 * @deprecated
 */
BotManager.prototype.apiEndpoint = function (method, url, callback) {
    var self = this;
    self.webserver.addEndpoint(method, url, callback);
};


BotManager.prototype.restartAPI = function () {
    var self = this;
    self.webserver.restart();
};


BotManager.prototype.getAppID = function () {
    var self = this;
    return self.ConfigManager.getConfig().appid;
};

/**
 *
 * @param {BotAccount} botAccount - The bot chosen as part of the random choice
 * @param {callback} unregisterCallback - A callback returned with possible errors
 */
BotManager.prototype.unregisterAccount = function (botAccount, unregisterCallback) {
    var self = this;
    self.ActiveBotAccounts.splice(self.ActiveBotAccounts.indexOf(botAccount), self.getAccounts().indexOf(botAccount) + 1);
    self.AccountsManager.saveAccounts(self.ActiveBotAccounts, function (err, savedObject) {
        if (err)
            self.logger.log("error", "Failed to save account information for %j", savedObject.username);
        self.logger.log("debug", "Saved account list to file.");
    });

    return unregisterCallback(null);
};

BotManager.prototype.botLookup = function (keyData, callback) {
    var self = this;
    try {
        if (self.getAccounts()[parseInt(keyData)]) {
            callback(null, self.getAccounts()[parseInt(keyData)]);
        } else {
            var botAccounts = self.getAccounts();
            for (var botAccountIndex in botAccounts) {
                if (botAccounts.hasOwnProperty(botAccountIndex)) {
                    if (botAccounts[botAccountIndex].getAccountName().indexOf(keyData) != -1) {
                        return callback(null, botAccounts[botAccountIndex]);
                    } else if (botAccountIndex == botAccounts.length - 1)
                        return callback({Error: "Failed to locate bot."}, null);
                }
            }
        }
    } catch (e) {
        if (e)
            return callback(e, null);
    }
};

/**
 * Retrieve accounts registered within the instance
 * @returns {Array} - Array of BotAccount objects
 */
BotManager.prototype.getAccounts = function () {
    var self = this;
    return self.ActiveBotAccounts;
};


/**
 *
 * @param {BotAccount} accountDetails - The bot information chosen as part of the random choice
 * @param {errorCallback} errorCallback - A callback returned with possible errors
 */
BotManager.prototype.registerAccount = function (username, password, options, callback) {
    var self = this;
    var botAccount = new BotAccount(username, password, options, self.ConfigManager.getConfig(), self.logger);

    botAccount.on('sentOfferChanged', function (offer, oldState) {
        self.emit('sentOfferChanged', botAccount, offer, oldState);
    });
    botAccount.on('receivedOfferChanged', function (offer, oldState) {
        self.emit('receivedOfferChanged', botAccount, offer, oldState);
    });
    botAccount.on('offerList', function (filter, sent, received) {
        self.emit('offerList', botAccount, filter, sent, received);
    });
    botAccount.on('sessionExpired', function () {
        self.emit('sessionExpired', botAccount);
    });

    botAccount.on('newOffer', function (offer) {
        self.emit('newOffer', botAccount, offer);
    });

    botAccount.on('loggedIn', function (botAccount) {
        self.emit('loggedIn', botAccount);
    });
    botAccount.on('updatedAccountDetails', function (botAccount) {
        self.emit('updatedAccountDetails', botAccount);
        self.AccountsManager.saveAccounts(self.ActiveBotAccounts, function (err, savedObject) {
            if (err)
                self.logger.log("error", "Failed to save account information for %j", savedObject.username);
            self.logger.log("debug", "Saved account list to file.");
        });
    });
    botAccount.on('rateLimitedSteam', function () {
        for (var botAccountIndex in self.getAccounts()) {
            if (self.ActiveBotAccounts.hasOwnProperty(botAccountIndex)) {
                self.ActiveBotAccounts[botAccountIndex].setRateLimited(true);
            }
        }
        setTimeout(function () {
            for (var botAccountIndex in self.getAccounts()) {
                if (self.ActiveBotAccounts.hasOwnProperty(botAccountIndex)) {
                    self.ActiveBotAccounts[botAccountIndex].setRateLimited(false);
                }
            }
        }, 60000);
    });

    self.emit('loadedAccount', username, password);
    self.ActiveBotAccounts.push(botAccount);
    if (!options.hasOwnProperty("nosave") || options.nosave == false)
        self.AccountsManager.saveAccounts(self.ActiveBotAccounts, function (err, savedObject) {
            if (err)
                self.logger.log("error", "Failed to save account information for %j", savedObject.username);
            self.logger.log("debug", "Saved account list to file.");
        });
    if (botAccount.AuthManager.canReloginWithoutPrompt()) {
        botAccount.AuthManager.loginAccount({}, function (err) {
            callback(err, botAccount);
        });
    }
    else
        callback(null, botAccount);

};

/**
 * Choose a random bot (not checked if online)
 * @returns {*}
 */
BotManager.prototype.chooseRandomBot = function () {
    var self = this;
    var randomBotIndex = Math.floor((Math.random() * self.getAccounts().length) % 1 == 0 && (Math.random() * self.getAccounts().length) > 0 ? self.getAccounts().length - 1 : (Math.random() * self.getAccounts().length));
    return self.getAccounts()[randomBotIndex];
};


/**
 * Post/log an informational message.
 * @param {string} message - Informational message to log
 */
BotManager.prototype.infoDebug = function (message) {
    var self = this;
    self.logger.log('info', message);
};


/**
 * Post/log an informational message.
 * @param {string} message - Informational message to log
 */
BotManager.prototype.logDebug = function (message) {
    var self = this;
    self.logger.log('debug', message);
};

/**
 * Post/log an error-type message
 * @param {string} message - Error message to log
 */
BotManager.prototype.errorDebug = function (message) {
    var self = this;
    self.logger.log('error', message);
};
