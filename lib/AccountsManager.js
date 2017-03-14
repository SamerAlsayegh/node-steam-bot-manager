AccountsManager.prototype.__proto__ = require('events').EventEmitter.prototype;


function AccountsManager(fileManager, logger) {
    var self = this;
    self.logger = logger;
    self.fileManager = fileManager;
    self.accounts = [];
    self.defaultAccounts = [];
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
    self.logger.log("debug", "Loading accounts");
    self.fileManager.getFile("accounts.json", self.defaultAccounts, function (err, accounts) {
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
            return callback(null, self.defaultAccounts);
        }
    });
};

/**
 * Save all accounts using a list of the BotAccounts class.
 * @param accounts
 * @param callback
 */
AccountsManager.prototype.saveAccounts = function (accounts, callback) {
    var self = this;
    var botAccountList = [];
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

                botAccountList.push(cleanedData);
            }
            else
                self.logger.log("error", "Did not save ", botAccount.username);
        }
    }
    self.fileManager.saveFile("accounts.json", botAccountList, callback);
};

module.exports = AccountsManager;
