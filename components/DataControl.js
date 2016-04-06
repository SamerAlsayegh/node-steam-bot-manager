var fs = require('fs');
var index = require('../index.js');


DataControl.prototype.config = {};

DataControl.prototype.__proto__ = require('events').EventEmitter.prototype;


function DataControl(localURI) {
    var self = this;
    self.localURI = localURI;
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
                fs.writeFile(filePath, JSON.stringify(expectedForm), function (err) {
                    self.getFile(filePath, expectedForm, callback);
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
            callback(e, null);
        }
    });
};


DataControl.prototype.loadConfig = function (callback) {
    var self = this;
    //this.localURI + "/config_template.json" depreciated...
    self.getFile(this.localURI + "/config.json", {
        bot_prefix: "__BOT_SHARED_PREFIX__"
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
