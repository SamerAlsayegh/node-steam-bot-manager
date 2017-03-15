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
                            self.logger.log("error", "Failed to load " + fileList[fileNameIndex]);
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
        self.logger.log("debug", "Loading accounts");
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
            if (botAccount.AuthManager.password != undefined || (botAccount.AuthManager.oAuthToken && botAccount.AuthManager.steamguard)) {
                var cleanedData = {};
                cleanedData.username = botAccount.username;
                if (botAccount.AuthManager.oAuthToken && botAccount.AuthManager.steamguard) {
                    cleanedData.oAuthToken = botAccount.AuthManager.oAuthToken;
                    cleanedData.steamguard = botAccount.AuthManager.steamguard;
                }
                else {
                    cleanedData.password = botAccount.AuthManager.password;
                }
                cleanedData.shared_secret = botAccount.AuthManager.shared_secret;
                cleanedData.identity_secret = botAccount.AuthManager.identity_secret;
                cleanedData.revocation_code = botAccount.AuthManager.revocation_code;

                self.fileManager.saveFile("data/" + botAccount.username.hashCode() + ".dat", cleanedData, function (err, savedDetails) {
                    if (err)
                        self.logger.log("error", "Did not save ", botAccount.username);

                });
            }
            else
                self.logger.log("error", "Did not save ", botAccount.username);
        }
    }
};


/**
 * Save all accounts using a list of the BotAccounts class.
 * @param accounts
 * @param callback
 */
AccountsManager.prototype.saveAccount = function (botAccount, callback) {
    var self = this;
    if (botAccount.AuthManager.password != undefined || (botAccount.AuthManager.oAuthToken && botAccount.AuthManager.steamguard)) {
        var cleanedData = {};
        cleanedData.username = botAccount.username;
        if (botAccount.AuthManager.oAuthToken && botAccount.AuthManager.steamguard) {
            cleanedData.oAuthToken = botAccount.AuthManager.oAuthToken;
            cleanedData.steamguard = botAccount.AuthManager.steamguard;
        }
        else {
            cleanedData.password = botAccount.AuthManager.password;
        }
        cleanedData.shared_secret = botAccount.AuthManager.shared_secret;
        cleanedData.identity_secret = botAccount.AuthManager.identity_secret;
        cleanedData.revocation_code = botAccount.AuthManager.revocation_code;
    }
    else
        self.logger.log("error", "Did not save ", botAccount.username);
    self.fileManager.saveFile("data/" + botAccount.username.hashCode() + ".json", cleanedData, callback);
};

String.prototype.hashCode = function () {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};
module.exports = AccountsManager;
