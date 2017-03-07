var fs = require('fs');
var index = require('../index.js');


DataControl.prototype.config = {};

DataControl.prototype.__proto__ = require('events').EventEmitter.prototype;


function DataControl(localURI) {
    var self = this;
    self.localURI = localURI;
    try {
        self.emit('debug', "Creating missing folder.");
        fs.mkdirSync(localURI);
    } catch (e) {
        if (e.code != 'EEXIST') throw e;
    }
}


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
    if (!config.hasOwnProperty("tradeCancelTime"))
        config.tradeCancelTime = 60 * 60 * 24;
    if (!config.hasOwnProperty("tradePendingCancelTime"))
        config.tradePendingCancelTime = 60 * 60 * 24;
    if (!config.hasOwnProperty("language"))
        config.language = 60 * 60 * 24;
    if (!config.hasOwnProperty("tradePollInterval"))
        config.tradePollInterval = 60 * 60 * 24;
    if (!config.hasOwnProperty("tradeCancelOfferCount"))
        config.tradeCancelOfferCount = 60 * 60 * 24;
    if (!config.hasOwnProperty("tradeCancelOfferCountMinAge"))
        config.tradeCancelOfferCountMinAge = 60 * 60;
    if (!config.hasOwnProperty("cancelTradeOnOverflow"))
        config.cancelTradeOnOverflow = true;
    
    //if (!config.hasOwnProperty("api_port")) // Removed = disable api system
    //    config.api_port = 1338;// Default api port

    callback(null, config);
};

DataControl.prototype.registerAccount = function (accountDetails) {
    var self = this;
    self.emit('loadedAccount', accountDetails);
};


DataControl.prototype.getFile = function (filePath, expectedForm, callback) {
    var self = this;
    try {
        var rawContents = fs.readFileSync(filePath);
        callback(null, rawContents);
    } catch (e) {
        try {
            if (typeof expectedForm == "string") {
                var stream = fs.createReadStream(expectedForm).pipe(fs.createWriteStream(filePath));
                stream.on('finish', function () {
                    self.getFile(filePath, expectedForm, callback);
                });
            }
            else {
                fs.rename(filePath, filePath + "_backup", function (err) {
                    if (err) throw err;
                    console.log('Renamed a possibly faulty file - please check and determine issue using an online JSON parser');
                    fs.writeFile(filePath, JSON.stringify(expectedForm), function (err) {
                        self.getFile(filePath, expectedForm, callback);
                    });
                });

            }
        } catch (e) {
            callback(e, null);
        }
    }
};


DataControl.prototype.loadAccounts = function (callback) {
    var self = this;
    var accountList = [];
    self.getFile(this.localURI + "/accounts.json", [], function (err, rawAccounts) {

        try {
            var accountsJSON = JSON.parse(rawAccounts);
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
        bot_prefix: "__BOT_SHARED_PREFIX__",
        api_port: null,
        settings: {
            tradeCancelTime: 3600,
            tradePendingCancelTime: 3600,
            language: "en",
            tradePollInterval: 5000,
            tradeCancelOfferCount: 30,
            tradeCancelOfferCountMinAge: 60,
            cancelTradeOnOverflow: true
        }
    }, function (err, rawConfig) {

        try {
            var configJSON = JSON.parse(rawConfig);
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
            botAccountList.push(botAccounts[botAccount].getAccount());
        }
    }
    fs.writeFile(this.localURI + "/accounts.json", JSON.stringify(botAccountList), callback);
};

module.exports = DataControl;
