var fs = require('fs');
var index = require('../index.js');
var Winston = require('winston');


DataControl.prototype.config = {};

DataControl.prototype.__proto__ = require('events').EventEmitter.prototype;

function DataControl(localURI) {
    var self = this;
    self.logger = new (Winston.Logger)({
        transports: [
            new (Winston.transports.Console)({
                level: 'error',
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


    self.localURI = localURI;
    try {
        self.emit('debug', "Creating missing folder.");
        fs.mkdirSync(localURI);
    } catch (e) {
        if (e.code != 'EEXIST') throw e;
    }
}

DataControl.prototype.getLogger = function () {
    var self = this;
    return self.logger;
};

DataControl.prototype.initData = function (callback) {
    var self = this;
    self.loadConfig(function (err, confValidated) {
        if (err) {
            self.emit('error', err);
            callback(err, null);
        } else {
            self.config = confValidated;

            self.emit('debug', "Loaded config");
            self.emit('loadedConfig', self.config);

            self.loadAccounts(function (err, callbackAccounts) {
                if (err) {
                    self.emit('error', err);
                    callback(err, callbackAccounts);
                } else {
                    callback(err, callbackAccounts);
                }
            });
        }
    });

};


DataControl.prototype.validateConfig = function (config, callback) {
    if (!config.hasOwnProperty("bot_prefix"))
        config.bot_prefix = "";// Default bot prefix

    if (!config.hasOwnProperty("appid"))
        config.appid = 730;

    if (config.hasOwnProperty("settings")) {
        if (!config.settings.hasOwnProperty("tradeCancelTime"))
            config.tradeCancelTime = 60 * 60 * 24;
        else
            config.tradeCancelTime = config.settings.tradeCancelTime;

        if (!config.settings.hasOwnProperty("tradePendingCancelTime"))
            config.tradePendingCancelTime = 60 * 60 * 24;
        else
            config.tradePendingCancelTime = config.settings.tradePendingCancelTime;

        if (!config.settings.hasOwnProperty("language"))
            config.settings.language = "en";
        else
            config.language = config.settings.language;

        if (!config.settings.hasOwnProperty("tradePollInterval"))
            config.tradePollInterval = 60 * 60 * 24;
        else
            config.tradePollInterval = config.settings.tradePollInterval;

        if (!config.settings.hasOwnProperty("tradeCancelOfferCount"))
            config.tradeCancelOfferCount = 60 * 60 * 24;
        else
            config.tradeCancelOfferCount = config.settings.tradeCancelOfferCount;

        if (!config.settings.hasOwnProperty("tradeCancelOfferCountMinAge"))
            config.tradeCancelOfferCountMinAge = 60 * 60;
        else
            config.tradeCancelOfferCountMinAge = config.settings.tradeCancelOfferCountMinAge;

        if (!config.settings.hasOwnProperty("cancelTradeOnOverflow"))
            config.cancelTradeOnOverflow = true;
        else
            config.cancelTradeOnOverflow = config.settings.cancelTradeOnOverflow;


    }
    callback(null, config);
};


DataControl.prototype.getFile = function (filePath, expectedForm, callback) {
    var self = this;
    try {
        var rawContents = fs.readFileSync(filePath);
        callback(null, JSON.parse(rawContents));
    } catch (e) {
        try {
            fs.statSync(filePath);
            fs.rename(filePath, filePath + "_backup_" + (new Date().getTime() / 1000), function (err) {
                if (err) throw err;
                console.log('Renamed a possibly faulty file - please check and determine issue using an online JSON parser');
                fs.writeFile(filePath, JSON.stringify(expectedForm), function (err) {
                    self.getFile(filePath, expectedForm, callback);
                });
            });
        }
        catch (e) {
            fs.writeFile(filePath, JSON.stringify(expectedForm), function (err) {
                if (err) throw err;
                self.getFile(filePath, expectedForm, callback);
            });
        }
    }
};


DataControl.prototype.loadAccounts = function (callback) {
    var self = this;
    var accountList = [];
    self.getFile(this.localURI + "/accounts.json", [], function (err, accountsJSON) {

        try {
            for (var accountIndex in accountsJSON) {
                if (accountsJSON.hasOwnProperty(accountIndex)) {
                    self.emit('loadedAccount', accountsJSON[accountIndex]);
                    accountList.push(accountsJSON[accountIndex]);
                }
            }
            callback(null, accountList);
        } catch (e) {
            self.emit('error', "Failed to read account data - check file for any malformation using a JSON parser");
            callback(e, null);
        }
    });
};
DataControl.prototype.loadConfig = function (callback) {
    var self = this;
    self.getFile(this.localURI + "/config.json", {
        bot_prefix: null,
        api_port: null,
        debug: false,
        appid: 730,
        settings: {
            api_key: "",
            tradeCancelTime: 3600,
            tradePendingCancelTime: 3600,
            language: "en",
            tradePollInterval: 5000,
            tradeCancelOfferCount: 30,
            tradeCancelOfferCountMinAge: 60,
            cancelTradeOnOverflow: true
        }
    }, function (err, configJSON) {

        try {
            self.validateConfig(configJSON, callback)
        } catch (e) {
            callback(e, null);
        }
    });


};
DataControl.prototype.getConfig = function () {
    var self = this;
    return self.config;
};


/**
 * Save all accounts using a list of the BotAccounts class.
 * @param botAccounts
 * @param callback
 */
DataControl.prototype.saveAccounts = function (botAccounts, callback) {
    var self = this;
    var botAccountList = [];
    for (var botAccount in botAccounts) {
        if (botAccounts.hasOwnProperty(botAccount)) {
            var cleanedData = botAccounts[botAccount].getAccount();
            delete cleanedData.cookies;
            delete cleanedData.rememberPassword;
            delete cleanedData.logonId;
            delete cleanedData.sessionID;

            botAccountList.push(cleanedData);
        }
    }
    fs.writeFile(this.localURI + "/accounts.json", JSON.stringify(botAccountList), callback);
};

module.exports = DataControl;
