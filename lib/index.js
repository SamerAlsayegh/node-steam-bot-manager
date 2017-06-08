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
const GA_Tracking = require('universal-analytics');
const uuidV4 = require('uuid/v4');

/**
 * Loading internal libraries
 * @type {GUI_Handler}
 */
const GUI = require('../gui/GUI_Handler');
const BotAccount = require('../classes/Bot.js');
const Webserver = require('./webserver.js');
const ConfigManager = require('./ConfigManager.js');
const AccountsManager = require('./AccountsManager.js');
const FileManager = require('./FileManager.js');
const packageJson = require('../package.json');

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
    self.GUI = new GUI(self);
    self.fileManager = new FileManager("config", self.logger);
    self.ConfigManager = new ConfigManager(self.fileManager, self.logger);
    self.AccountsManager = new AccountsManager(self.fileManager, self.logger);
}

BotManager.prototype.startManager = function (callbackManager) {
    var self = this;

    self.ConfigManager.loadConfig(function (err, config) {
        if (err) {
            if (callbackManager)
                callbackManager(err);
        }
        else {
            self.config = config;
            if (config.hasOwnProperty("api_port") && config.api_port != null) {
                self.webserver = new Webserver(config.api_port);
                self.webserver.start(function(err){
                    if (err)
                        self.errorDebug("Failed to start th API webserver - ensure port is not occupied...", err);
                    else
                        self.emit('loadedAPI');
                });
            }

            /**
             * This section allows me (Undeadkillz) to track usage of the tool (fix issues asap, know how many people use the tool) - don't worry, the data is aggregated and sent to me anonymously.
             */
            if (config.hasOwnProperty("statistics") && config.statistics != null) {
                if (config.statistics){
                    var uuid = uuidV4();
                    self.fileManager.getFile("statistics.json", {uuid:uuid}, function(err, statistics){
                        if (statistics.hasOwnProperty("uuid")){
                            self.uuid = statistics.uuid;
                        } else {
                            self.fileManager.saveFile("statistics.json", {uuid: uuid}, function(err, statistics){
                                self.uuid = statistics.uuid;
                            })
                        }

                        self.track = GA_Tracking('UA-63794417-8', self.uuid);// Init the tracking code
                        self.track.event(packageJson.version, "Status", "Online").send();// Trigger the tool's startup.
                        setInterval(function(){
                            self.track.event(packageJson.version, "Status", "Online").send();// Trigger the tool's startup.
                        }, 5*1000*60);

                        self.track.event(packageJson.version, "Collection", "on").send();// Trigger the tool's startup.
                    });
                }
            }

            self.AccountsManager.getAccounts(function (accounts) {
                for (var botIndex in accounts) {
                    if (accounts.hasOwnProperty(botIndex)) {
                        var options = accounts[botIndex];
                        if (options != null) {
                        }
                        self.registerAccount(accounts[botIndex].hasOwnProperty("accountName") ? accounts[botIndex].accountName : accounts[botIndex].username, accounts[botIndex].password, options, function (err, botAccount) {
                            if (err)
                                self.errorDebug("Error while loading bot info - " + err);
                            if (config.hasOwnProperty("autologin") && config.autologin == true) {
                                botAccount.Auth.loginAccount();
                            }
                        });
                    }
                }
                // self.AccountsManager.saveAccount(self.ActiveBotAccounts, function (err, savedObj) {
                //     if (err)
                //         self.errorDebug("Error while saving bot info - " + err);
                // });
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
    if (self.track)
    self.track.event(packageJson.version, "Endpoints", "Added").send()// Trigger the tool's startup.
        self.webserver.addEndpoint(method, url, callback);
};

/**
 * Remove an API Endpoint (via webserver) at chosen location.
 * @param method
 * @param url
 * @param callback
 */
BotManager.prototype.removeEndpoint = function (method, url) {
    var self = this;
    if (self.track)
        self.track.event(packageJson.version, "Endpoints", "Removed").send()// Trigger the tool's startup.
    self.webserver.removeEndpoint(method, url);
};

// BotManager.prototype.saveAccounts = function (callback) {
//     var self = this;
//     self.AccountsManager.saveAccounts(self.ActiveBotAccounts, function (err, savedObj) {
//         callback(err, savedObj);
//     });
// };
/**
 * Add an API Endpoint (via webserver) at chosen location.
 * @param method
 * @param url
 * @param callback
 * @deprecated
 */
BotManager.prototype.apiEndpoint = function (method, url, callback) {
    var self = this;
    self.addEndpoint(method, url, callback);
};


BotManager.prototype.restartAPI = function () {
    var self = this;
    if (self.track)
        self.track.event(packageJson.version, "Endpoints", "Restarted API").send()// Trigger the tool's startup.
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
    if (self.track)
        self.track.event(packageJson.version, "Accounts", "Unregistered").send();// Trigger the tool's startup.
    self.ActiveBotAccounts.splice(self.ActiveBotAccounts.indexOf(botAccount), self.getAccounts().indexOf(botAccount) + 1);
    // self.AccountsManager.saveAccounts(self.ActiveBotAccounts, function (err, savedObject) {
    // if (err)
    //     self.logger.log("error", "Failed to save account information for %j", savedObject.username);
    // self.logger.log("debug", "Saved account list to file.");
    // });

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
 * Register an account for use with the steam-bot-manager
 * @param username
 * @param password
 * @param options
 * @param callback
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
    botAccount.on('updatedAccountDetails', function (accountDetails) {
        self.emit('updatedAccountDetails');
        self.AccountsManager.saveAccount(accountDetails, function (err, savedObject) {
            if (err)
                self.logger.log("error", "Failed to update account information for %j", botAccount.getAccountName());
            self.logger.log("debug", "Updated account information to file.");
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
    if (self.track)
        self.track.event(packageJson.version, "Accounts", "Registered").send()// Trigger the tool's startup.
    self.emit('loadedAccount', username, password);
    self.ActiveBotAccounts.push(botAccount);
    callback(null, botAccount);
};

/**
 * Choose a random bot (not checked if online)
 * @returns {*}
 * @deprecated
 */
BotManager.prototype.chooseRandomBot = function () {
    var self = this;
    var randomBotIndex = Math.floor((Math.random() * self.getAccounts().length) % 1 == 0 && (Math.random() * self.getAccounts().length) > 0 ? self.getAccounts().length - 1 : (Math.random() * self.getAccounts().length));
    return self.getAccounts()[randomBotIndex];
};
/**
 * Choose a random bot - with filters
 * Will simple loop until it find a bot that meets all filters - otherwise it will just randomly choose one.
 * Make sure to set filters based on your use-case.
 * filters: in array of Strings
 * 'canTrade' - Bot can access the API and can trade
 *
 * @returns {*}
 */
BotManager.prototype.randomBot = function (filters) {
    var self = this;
    if (filters.constructor !== Array)
        filters = [];

    if (filters.length == 0) {
        var randomBotIndex = Math.floor((Math.random() * self.getAccounts().length) % 1 == 0 && (Math.random() * self.getAccounts().length) > 0 ? self.getAccounts().length - 1 : (Math.random() * self.getAccounts().length));
        return self.getAccounts()[randomBotIndex];
    }
    else {
        for (var botIndex in self.getAccounts()) {
            if (filters.indexOf("canTrade") != -1) {
                if (self.getAccounts()[botIndex].Trade.api_access)
                    return self.getAccounts()[botIndex];
            }
            if (botIndex == self.getAccounts().length-1){
                // No bot meets our needs... Return undefined.
                return undefined;
            }
        }
    }




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
    if (self.track)
        self.track.exception(message, true).send();// Trigger the tool's startup.
    self.logger.log('error', message);
};
