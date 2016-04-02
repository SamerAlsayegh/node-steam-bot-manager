/**
 * Created by Samer on 2016-03-22.
 */
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
    if (!config.hasOwnProperty("botPrefix"))
        config.botPrefix = "";
    if (!config.hasOwnProperty("apiPort"))
        config.apiPort = 1338;

    callback(null, config);
};

DataControl.prototype.registerAccount = function (accountDetails) {
    var self = this;
    self.emit('loadedAccount', accountDetails);
};

DataControl.prototype.loadAccounts = function (callback) {
    var self = this;
    try {
        var rawAccounts = fs.readFileSync(this.localURI + "/accounts.json");
        var accountsJSON = JSON.parse(rawAccounts);
        for (var accountIndex in accountsJSON) {
            if (accountsJSON.hasOwnProperty(accountIndex)) {
                self.emit('loadedAccount', accountsJSON[accountIndex]);
            }
        }
        callback(null, accountsJSON);
    } catch (e) {
        callback(e, []);
    }
};


DataControl.prototype.loadConfig = function (callback) {
    var self = this;
    try {
        var rawConfig = fs.readFileSync(this.localURI + "/config.json");
        var configJSON = JSON.parse(rawConfig);
        self.validateConfig(configJSON, callback)
    } catch (e) {
        callback(e, {});
    }
};
DataControl.prototype.getConfig = function () {
    var self = this;
    return self.config;
};


//DataControl.prototype.getCustomConfig = function(optionTree){
//  self.config.custom
//};
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
