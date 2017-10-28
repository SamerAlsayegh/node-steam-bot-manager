AccountsManager.prototype.__proto__ = require('events').EventEmitter.prototype;


function AccountsManager(fileManager, logger) {
    var self = this;
    self.logger = logger;
    self.fileManager = fileManager;
    self.accounts = [];
    self.defaultAccount = {};
    self.fileManager.createFolderIfNotExist("data", function(err){
        if (err)
            self.logger.log("error", "Failed to create 'data' folder under 'config'.");
        else
            self.logger.log("debug", "Created 'data' folder if it does not exist.");

    });
}


AccountsManager.prototype.getAccounts = function (callback) {
    var self = this;
    if (self.accounts.length == 0) {
        self.loadAccounts(function (err, accounts) {
            self.accounts = accounts.splice();
            callback(accounts);
        });
    }
    else
        callback(self.accounts);
};

AccountsManager.prototype.loadAccounts = function (callback) {
    var self = this;
    var accounts_temp = [];
    self.logger.log("debug", "Loading accounts - ", self.fileManager.exists("accounts.json"));

    if (self.fileManager.exists("data")) {
        self.fileManager.getFileList("data/**.dat", function (err, fileList) {

            if (fileList.length > 0) {
                for (var fileNameIndex in fileList) {
                    if (fileList.hasOwnProperty(fileNameIndex)) {

                        self.fileManager.getFile(fileList[fileNameIndex], self.defaultAccount, function (err, accountDetails) {
                            if (err) {
                                self.logger.log("error", "Failed to load %j due to %j", fileList[fileNameIndex], err);
                            }

                            self.emit("loadedAccount", accountDetails);
                            accounts_temp.push(accountDetails);
                            if (fileList.length == accounts_temp.length)
                                return callback(null, accounts_temp.slice());
                        });


                    }
                }
            } else {
                return callback(null, []);
            }
        });
    }
    else {
        if (self.fileManager.exists("accounts.json")) {
            self.fileManager.createFolderIfNotExist("data", function(err){
                if (err)
                    self.logger.log("error", "Failed to create folder named 'data' under config. Error encountered: " + err);
                else {
                    self.logger.log("debug", "Loading accounts via old method - Converting to new version...");
                    self.fileManager.getFile("accounts.json", [], function (err, accounts) {
                        try {
                            for (var accountIndex in accounts) {
                                if (accounts.hasOwnProperty(accountIndex)) {
                                    self.emit("loadedAccount", accounts[accountIndex]);
                                    accounts_temp.push(accounts[accountIndex]);
                                    self.saveAccount(accounts[accountIndex], function (err) {
                                        if (err)
                                            self.logger.log("error", "Failed to save into new format during conversion...");
                                    })
                                }
                            }
                            return callback(null, accounts_temp.slice());
                        } catch (e) {
                            self.logger.log("error", "Failed to read account data - check file for any malformation using a JSON parser - ", e);
                            return callback(null, []);
                        }
                    });
                }
            });

        } else {
            self.logger.log("error", "Failed to find an account's file. Please ensure it exists.");
            return callback(null, []);
        }
    }

};


/**
 * Save all accounts using a list of the BotAccounts class.
 * @param botAccountDetails
 * @param callbackErrorOnly
 */
AccountsManager.prototype.saveAccount = function (botAccountDetails, callbackErrorOnly) {
    var self = this;
    if (botAccountDetails.password != undefined || (botAccountDetails.oAuthToken && botAccountDetails.steamguard)) {
        var cleanedData = {};
        cleanedData.username = (botAccountDetails.username != null ? botAccountDetails.username : botAccountDetails.accountName);
        if (botAccountDetails.oAuthToken && botAccountDetails.steamguard) {
            cleanedData.oAuthToken = botAccountDetails.oAuthToken;
            cleanedData.password = botAccountDetails.password;
            cleanedData.steamguard = botAccountDetails.steamguard;
        }
        else {
            cleanedData.password = botAccountDetails.password;
        }
        cleanedData.displayName = botAccountDetails.displayName;
        cleanedData.shared_secret = botAccountDetails.shared_secret;
        cleanedData.identity_secret = botAccountDetails.identity_secret;
        cleanedData.revocation_code = botAccountDetails.revocation_code;
        cleanedData.steamid64 = botAccountDetails.steamid64;
        cleanedData.loginKey = botAccountDetails.loginKey;

        if (botAccountDetails.apiKey)
        cleanedData.apiKey = botAccountDetails.apiKey;

        self.fileManager.saveFile("data/" + (botAccountDetails.username != null ? botAccountDetails.username : botAccountDetails.accountName) + ".dat", cleanedData, function (err, savedDetails) {
            if (err) {
                return callbackErrorOnly(err);
            }
            return callbackErrorOnly(null);

        });
    }
    else {
        return callbackErrorOnly({Error: "Invalid account data - missing password or steamguard/oAuthtoken"});
    }
};

module.exports = AccountsManager;
