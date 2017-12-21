module.exports = BotManager;


// Loading Loggers
const Winston = require('winston');
const GA_Tracking = require('universal-analytics');
const uuidV4 = require('uuid/v4');

// Loading internal classes
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


    self.ActiveBotAccounts = [];


    self.GUI = new GUI(self);
    self.fileManager = new FileManager("config");

    self.fileManager.on('debug', function () {
        self.logDebug(...arguments);
    });
    self.fileManager.on('info', function () {
        self.infoDebug(...arguments);
    });
    self.fileManager.on('error', function () {
        self.errorDebug(...arguments);
    });


    self.ConfigManager = new ConfigManager(self.fileManager);

    self.ConfigManager.on('debug', function () {
        self.logDebug(...arguments);
    });
    self.ConfigManager.on('info', function () {
        self.infoDebug(...arguments);
    });
    self.ConfigManager.on('error', function () {
        self.errorDebug(...arguments);
    });

    self.ConfigManager.loadConfig(function (err, config) {
        if (err) {
            self.errorDebug("Failed to load config");
        }
        else {
            self.config = config;

            self.logger = new (Winston.Logger)({
                transports: [
                    new (Winston.transports.Console)({
                        level: self.config.debug ? 'debug' : 'info',
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
        }
    });


    self.AccountsManager = new AccountsManager(self.fileManager);

    self.AccountsManager.on('debug', function () {
        self.logDebug(...arguments);
    });
    self.AccountsManager.on('info', function () {
        self.infoDebug(...arguments);
    });
    self.AccountsManager.on('error', function () {
        self.errorDebug(...arguments);
    });


}

BotManager.prototype.startWebserver = function (trySSL) {
    var self = this;
    if (self.config.hasOwnProperty("api_port") && self.config.api_port != null) {
        var options = null;
        if (self.config.hasOwnProperty("ssl") && trySSL == true) {
            if (self.config.ssl.hasOwnProperty("key")) {

                self.fileManager.getFileUnparsed(self.config.ssl.key + ".key", null, function (err, keyFile) {
                    if (err) {
                        self.errorDebug("Failed to access key file... Disabling SSL");
                        self.startWebserver(false);
                        return;
                    }

                    self.fileManager.getFileUnparsed(self.config.ssl.cert + ".cert", null, function (err, certFile) {
                        if (err) {
                            self.errorDebug("Failed to access cert file... Disabling SSL");
                            self.startWebserver(false);
                            return;
                        }
                        options = {
                            ssl: {
                                key: keyFile,
                                cert: certFile
                            }
                        };

                        self.webserver = new Webserver(self.logger, self.config.api_port, options);
                        self.webserver.start(function (err) {
                            if (err)
                                self.errorDebug("Failed to start the API webserver - ensure port is not occupied... " + err);
                            else
                                self.emit('loadedAPI');
                        });
                    });
                });

            }
        } else {
            self.webserver = new Webserver(self.logger, self.config.api_port, options);
            self.webserver.start(function (err) {
                if (err)
                    self.errorDebug("Failed to start the API webserver - ensure port is not occupied..." + err);
                else
                    self.emit('loadedAPI');
            });
        }


    }
};

BotManager.prototype.startManager = function (callback) {
    var self = this;


    self.startWebserver(true);
    /**
     * This section allows me (Undeadkillz) to track usage of the tool (fix issues asap, know how many people use the tool) - don't worry, the data is aggregated and sent to me anonymously.
     */
    if (self.config.hasOwnProperty("statistics") && self.config.statistics != null) {
        if (self.config.statistics) {
            var uuid = uuidV4();
            self.fileManager.getFile("statistics.json", {uuid: uuid}, function (err, statistics) {
                if (statistics.hasOwnProperty("uuid")) {
                    self.uuid = statistics.uuid;
                } else {
                    self.fileManager.saveFile("statistics.json", {uuid: uuid}, function (err, statistics) {
                        self.uuid = statistics.uuid;
                    })
                }

                self.track = GA_Tracking('UA-63794417-8', self.uuid);// Init the tracking code
                self.track.event(packageJson.version, "Status", "Online").send();// Trigger the tool's startup.
                setInterval(function () {
                    self.track.event(packageJson.version, "Status", "Online").send();// Trigger the tool's startup.
                }, 5 * 1000 * 60);

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
                    // if (config.hasOwnProperty("autologin") && config.autologin == true) {
                    //     // botAccount.Auth.loginAccount();
                    // }
                });
            }
        }
        self.GUI.displayBotMenu();
        if (callback)
            return callback();
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
BotManager.prototype.deleteAccount = function (botAccount, callbackErrorOnly) {
    var self = this;
    if (self.track)
        self.track.event(packageJson.version, "Accounts", "Unregistered").send();// Trigger the tool's startup.
    var accountName = botAccount.getAccountName();
    self.ActiveBotAccounts.splice(self.ActiveBotAccounts.indexOf(botAccount), self.getAccounts().indexOf(botAccount) + 1);
    self.fileManager.createFolderIfNotExist("deleted", function (err) {
        if (err) {
            self.errorDebug("Failed to create folder named 'deleted' under config. Error encountered: ", err);
            callbackErrorOnly(err);
        }
        else {
            self.fileManager.renameFile("data/{0}.dat".format(accountName), "deleted/{0}.dat".format(accountName), function (err) {
                callbackErrorOnly(err);
            })
        }
    });


};
/**
 * Lookup a botAccount using the username of the bot or the index of the bot in the list.
 * @param keyData
 * @param callback
 * @deprecated
 */
BotManager.prototype.botLookup = function (keyData, callback) {
    var self = this;
    self.findBot(keyData, callback);
};
/**
 * Lookup a botAccount using the username of the bot or the index of the bot or even the SteamID2, SteamID3, and SteamID64
 * @param keyData
 * @param callback
 * @param filters
 * @returns {*}
 */
BotManager.prototype.findBot = function (keyData, callback, filters) {
    let self = this;
    let botAccounts = self.getAccounts();


    if (keyData != null) {
        // We only want 1 account, only if it meets filter
        let lookup = {};

        for (let index in botAccounts) {
            let botAccount = botAccounts[index];
            if (botAccount.hasOwnProperty("SteamID")) {
                lookup[botAccount.SteamID.getSteam3RenderedID()] = index;
                lookup[botAccount.SteamID.getSteamID64()] = index;
                lookup[botAccount.SteamID.getSteam2RenderedID(true)] = index;
                lookup[botAccount.SteamID.getSteam2RenderedID()] = index;
            }
            lookup[index.toString()] = index;
            lookup[botAccount.getAccountName()] = index;
        }
        try {
            let chosenBotAccount = botAccounts[parseInt(lookup[keyData])];
            // Found the wanted bot.
            if (!chosenBotAccount) throw(new Error());

            self._testBotAgainstFilters(chosenBotAccount, filters, function (status) {
                if (status){
                    return callback(null, chosenBotAccount);
                } else {
                    return callback({Error: "Failed to locate bot with: ", keyData, filters}, null);
                }
            });
        } catch (e){
            return callback({Error: "Failed to locate bot with: ", keyData, filters}, null);
        }

    } else {
        // We will take any account provided they meet filters
        self._findNextBotCriteria(filters, 0, botAccounts, function (err, botAccount) {
            return callback(err, botAccount);
        });
    }


};

// Internal method, don't use as it is will be changed frequently.
BotManager.prototype._testBotAgainstFilters = function (botAccount, filters, callback) {
    let self = this;

    if (callback == null){
        callback = filters;
        filters = [];
    }

    if (filters == null)
        filters = [];


    // Add more room for other filters based on inventory space, and of such?

    if (filters.indexOf('loggedIn') != -1) {
        botAccount.community.loggedIn(function (err, loggedIn) {
            if (!loggedIn) {
                self.logDebug("Failed to choose '%s' bot since its not logged in.", botAccount.getAccountName());
                // Check if filters require re-logging in if not loggedin?
                if (filters.indexOf('logInIfNot') != -1){
                    if (err) self.errorDebug("Attempting to login from findBot into %s", botAccount.getAccountName());

                    botAccount.Auth.loginAccount(function (err) {
                        if (err) self.errorDebug("Encountered error while logging in... %s", err)
                    });
                }
                callback(false);
            } else {
                self.logDebug("Verified that %s is logged in.", botAccount.getAccountName());
                callback(true);
            }
        });

    } else {
        callback(true);
    }
};

// Internal method, don't use as it is will be changed frequently.
BotManager.prototype._findNextBotCriteria = function (filters, nextIndex, botAccountsList, callback) {
    let self = this;
    if (botAccountsList.length <= nextIndex) {
        return callback({Error: "Failed to locate bot with: ", filters}, null);
    } else {
        let botAccount = botAccountsList[nextIndex];

        self._testBotAgainstFilters(botAccount, filters, function(status){
            if (!status){
                self._findNextBotCriteria(filters, ++nextIndex, botAccountsList, function (err, botAccount) {
                    return callback(err, botAccount);
                });
            } else {
                return callback(null, botAccount);

            }
        });


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
    var config = self.ConfigManager.getConfig();
    var botAccount = new BotAccount(username, password, options, config);


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

    botAccount.on('loggedInNodeSteam', function () {
        self.emit('loggedInNodeSteam', botAccount);
    });

    botAccount.on('loggedIn', function (botAccount) {
        self.emit('loggedIn', botAccount);
    });

    botAccount.on('error', function () {
        self.errorDebug(...arguments);
    });

    botAccount.on('debug', function () {
        self.logDebug(...arguments)
    });

    botAccount.on('updatedAccountDetails', function (accountDetails) {
        self.AccountsManager.saveAccount(accountDetails, function (err) {
            if (err)
                self.logger.log("error", "Failed to update account information for %j", botAccount.getAccountName());
            else {
                self.emit('updatedAccountDetails', botAccount);
                self.logger.log("debug", "Updated account information to file.");
            }

        });
    });

    if (self.track)
        self.track.event(packageJson.version, "Accounts", "Registered").send()// Trigger the tool's startup.
    self.emit('loadedAccount', username, password);
    self.ActiveBotAccounts.push(botAccount);
    return callback(null, botAccount);
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
 * 'steamID:XX' - where XX is replaced with SteamID2, SteamID3, or SteamID64 or even TradeLink
 * @returns {*}
 */
BotManager.prototype.randomBot = function (filters) {
    var self = this;
    if (filters == undefined || filters.constructor !== Array)
        filters = [];


    var randomBotIndex;

    if (filters.length == 0) {
        randomBotIndex = Math.floor((Math.random() * self.getAccounts().length) % 1 == 0 && (Math.random() * self.getAccounts().length) > 0 ? self.getAccounts().length - 1 : (Math.random() * self.getAccounts().length));
        return self.getAccounts()[randomBotIndex];
    }
    else {
        var botsMeetingFilters = [];

        for (var botIndex in self.getAccounts()) {
            if (filters.indexOf("canTrade") != -1) {
                if (self.getAccounts()[botIndex].Trade.api_access)
                    botsMeetingFilters.push(botIndex);// Push the index of the bot from original list (saving memory by only saving index)
            }
            if (botIndex == self.getAccounts().length - 1) {
                // No bot meets our needs... Return undefined.
                randomBotIndex = Math.floor((Math.random() * botsMeetingFilters.length) % 1 == 0 && (Math.random() * botsMeetingFilters) > 0 ? botsMeetingFilters.length - 1 : (Math.random() * botsMeetingFilters.length));
                return self.getAccounts()[botsMeetingFilters[randomBotIndex]];
            }
        }
    }


};

/**
 * Post/log an informational message.
 * @param {string} message - Informational message to log
 */
BotManager.prototype.infoDebug = function () {
    var self = this;
    self.logger.log('info', ...arguments);
};


/**
 * Post/log an debug message.
 * @param {string} message - debug message to log
 */
BotManager.prototype.logDebug = function () {
    var self = this;
    self.logger.log('debug', ...arguments);
};

/**
 * Post/log an error-type message
 * @param {string} message - Error message to log
 */
BotManager.prototype.errorDebug = function () {
    var self = this;
    if (self.track)
        self.track.exception(arguments, true).send();// Trigger the tool's startup.
    self.logger.log('error', ...arguments);
};

