/**
 * Created by Samer on 2016-03-22.
 */
var fs = require('fs');
var index = require('../index.js');

function dataControl(localURI) {
    this.localURI = localURI;
}


dataControl.prototype.getSavedAccounts = function (callback) {
    try {
        var content = fs.readFileSync(this.localURI + "/accounts.json");
        callback(null, JSON.parse(content));
    } catch (e) {
        callback(e, []);
    }
};


dataControl.prototype.saveAccounts = function (botAccounts, callback) {
    // Ensure of some this before saving the accountList
    var botAccountList = [];
    for (var botAccount in botAccounts) {
        botAccountList.push(botAccounts[botAccount].getAccount());
    }
    fs.writeFile(this.localURI + "/accounts.json", JSON.stringify(botAccountList), callback);
};

module.exports = dataControl;
