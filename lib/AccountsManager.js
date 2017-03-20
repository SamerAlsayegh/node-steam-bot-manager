AccountsManager.prototype.__proto__ = require('events').EventEmitter.prototype;


function AccountsManager(fileManager, logger) {
    var self = this;
    self.logger = logger;
    self.fileManager = fileManager;
    self.accounts = [];
    self.defaultAccount = {};
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

    if (!self.fileManager.exists("accounts.json")) {
        self.fileManager.getFileList("data/**.dat", function (err, fileList) {
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
        });
    }
    else {
        self.logger.log("debug", "Loading accounts via old method - Will be saving using new version");
        self.fileManager.getFile("accounts.json", [], function (err, accounts) {
            try {
                for (var accountIndex in accounts) {
                    if (accounts.hasOwnProperty(accountIndex)) {
                        self.emit("loadedAccount", accounts[accountIndex]);
                        accounts_temp.push(accounts[accountIndex]);
                    }
                }
                return callback(null, accounts_temp.slice());
            } catch (e) {
                self.logger.log("error", "Failed to read account data - check file for any malformation using a JSON parser - ", e);
                return callback(null, []);
            }
        });
    }

};

/**
 * Save all accounts using a list of the BotAccounts class.
 * @param accounts
 * @param callback
 */
AccountsManager.prototype.saveAccounts = function (accounts, callback) {
    var self = this;
    for (var account in accounts) {
        if (accounts.hasOwnProperty(account)) {
            var botAccount = accounts[account];
            self.saveAccount(botAccount, function (err) {
                if (err) {
                    self.logger.log("error", "Did not save ", botAccount.username, " due to ", err);
                }
            });
        }
    }
};


/**
 * Save all accounts using a list of the BotAccounts class.
 * @param botAccount
 * @param callbackErrorOnly
 */
AccountsManager.prototype.saveAccount = function (botAccount, callbackErrorOnly) {
    var self = this;
    if (botAccount.Auth.password != undefined || (botAccount.Auth.oAuthToken && botAccount.Auth.steamguard)) {
        var cleanedData = {};
        cleanedData.username = botAccount.username;
        if (botAccount.Auth.oAuthToken && botAccount.Auth.steamguard) {
            cleanedData.oAuthToken = botAccount.Auth.oAuthToken;
            cleanedData.steamguard = botAccount.Auth.steamguard;
        }
        else {
            cleanedData.password = botAccount.Auth.password;
        }
        cleanedData.displayName = botAccount.displayName;
        cleanedData.shared_secret = botAccount.Auth.shared_secret;
        cleanedData.identity_secret = botAccount.Auth.identity_secret;
        cleanedData.revocation_code = botAccount.Auth.revocation_code;

        self.fileManager.saveFile("data/" + botAccount.username + ".dat", cleanedData, function (err, savedDetails) {
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
