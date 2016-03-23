/**
 * Created by Samer on 2016-03-22.
 */
var SteamUser = require('steam-user');
var SteamCommunity = require('steamcommunity');
var SteamStore = require('steamstore');
var TradeOfferManager = require('steam-tradeoffer-manager');
var SteamTotp = require('steam-totp');


function BotAccount(accountDetails) {
    // Ensure account values are valid

    var self = this;
    // Init all required variables
    self.community = new SteamCommunity();
    self.client = new SteamUser();
    self.trade = new TradeOfferManager({
        "language": "en", // We want English item descriptions
        "pollInterval": 5000 // We want to poll every 5 seconds since we don't have Steam notifying us of offers
    });
    self.store = new SteamStore();
    self.accountDetails = accountDetails;


    self.client.on('loggedOn', function (details) {
        console.log("Logged into Steam as " + self.client.steamID.getSteam3RenderedID());
        self.client.setPersona(SteamUser.Steam.EPersonaState.Online);
    });

    self.client.on('webSession', function (sessionID, cookies) {
        console.log("Retrieved web session");
        self.accountDetails.sessionID = sessionID;
        self.accountDetails.cookies = cookies;

        if (self.accountDetails.cookies) {
            self.community.setCookies(self.accountDetails.cookies);
            self.store.setCookies(self.accountDetails.cookies);
        }
    });


    self.client.on('friendOrChatMessage', function (senderID, message, room) {
        if (senderID == self.currentChatting.sid) {
            console.log(("\n" + self.currentChatting.accountName + ": " + message).green);
        }
    });

    self.client.on('friendsList', function () {
        console.log("Friends list loaded");
    });


    self.client.on('error', function (e) {
        // Some error occurred during logon
        console.log(e);
    });
}


BotAccount.prototype.getStore = function () {
    var self = this;
    return self.store;
};

BotAccount.prototype.getAccountName = function () {
    var self = this;
    return self.accountDetails.accountName;
};

BotAccount.prototype.generateMobileAuthenticationCode = function () {
    var self = this;
    if (self.accountDetails.shared_secret)
        return SteamTotp.generateAuthCode(self.accountDetails.shared_secret);
    else
        return new Error("Failed to generate authentication code. Enable 2-factor-authentication via this tool.");
};

BotAccount.prototype.getAccount = function () {
    var self = this;
    return self.accountDetails;
};
BotAccount.prototype.sendMessage = function (recipient, message) {
    var self = this;
    return self.client.chatMessage(recipient, message, 1);
};
BotAccount.prototype.sendMessage = function (recipient, message, type) {
    var self = this;
    return self.client.chatMessage(recipient, message, type);
};

BotAccount.prototype.setChatting = function (chattingUserInfo) {
    var self = this;
    self.currentChatting = chattingUserInfo;
};
BotAccount.prototype.getFriends = function (callback) {
    var self = this;
    self.onlineFriendsList = [];
    // We need to convert SteamID to names... To do that, we need SteamCommunity package.
    for (var id in Object.keys(self.client.users)) {
        self.onlineFriendsList.push({
            accountName: self.client.users[Object.keys(self.client.users)[id]].player_name,
            accountSid: Object.keys(self.client.users)[id]
        });
        if (id > 30) {
            break;// Only show 30 - so menu loads fast.
        }
    }
    callback({Error: new Error("Failed to find all friends?")}, self.onlineFriendsList);
};


BotAccount.prototype.has_shared_secret = function () {
    var self = this;
    return (self.accountDetails.shared_secret ? true : false);
};

BotAccount.prototype.loginAccount = function (authCode) {
    var self = this;


    var accountDetailsModified = self.accountDetails;
    if (self.accountDetails.shared_secret) {
        self.client.setOption("promptSteamGuardCode", false);
        accountDetailsModified.twoFactorCode = self.generateMobileAuthenticationCode();
    }
    accountDetailsModified.rememberPassword = true;
    accountDetailsModified.logonId = 100;
    accountDetailsModified.authCode = authCode;

    self.client.logOn(accountDetailsModified);

};

BotAccount.prototype.enable2FactorAuthentication = function (activeAccount, callback) {
    var self = this;

    self.store.hasPhone(function (err, hasPhone, lastDigits) {

        if (hasPhone) {
            self.community.enableTwoFactor(function (err, response) {
                if (err) {
                    callback(err, {revocation_code: response.revocation_code});
                }
                else {
                    var questions = [
                        {
                            type: 'input',
                            name: 'code',
                            message: "Enter the code texted to the phone number associated to the account: "
                        }
                    ];

                    inquirer.prompt(questions, function (result) {
                        if (result.code) {
                            var steamCode = result.code;

                            self.community.finalizeTwoFactor(response.shared_secret, steamCode, function (err) {
                                if (err) {
                                    callback(err, {revocation_code: response.revocation_code});
                                }
                                else {
                                    self.accountDetails.shared_secret = response.shared_secret;
                                    self.accountDetails.revocation_code = response.revocation_code;
                                    callback(null, {
                                        shared_secret: response.shared_secret,
                                        revocation_code: response.revocation_code
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
        else {
            var questions = [
                {
                    type: 'confirm',
                    name: 'confirmAddition',
                    message: "A phone number is required to activate 2-factor-authentication. Would you like to set your phone number?",
                    default: false
                }
            ];

            inquirer.prompt(questions, function (result) {
                if (result.confirmAddition) {

                    var questions = [
                        {
                            type: 'input',
                            name: 'phoneNumber',
                            message: "Enter the number you would like to link to the account ()",
                            validate: function (value) {
                                var pass = value.match(/\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/i);
                                if (pass) {
                                    return true;
                                }
                                return 'Please enter a valid phone number (ex. +18885550123)';
                            }
                        }
                    ];

                    inquirer.prompt(questions, function (result) {
                        self.store.addPhoneNumber(result.phoneNumber, true, function (err) {
                            if (err) {
                                callback(err, null);
                            }
                            else {
                                var questions = [
                                    {
                                        type: 'input',
                                        name: 'code',
                                        message: "Enter the code sent to your phone number at " + result.phoneNumber
                                    }
                                ];

                                inquirer.prompt(questions, function (result) {
                                    self.store.verifyPhoneNumber(result.code, function (err) {
                                        if (err) {
                                            callback(err, null);
                                        }
                                        else {
                                            self.enable2FactorAuthentication(callback);
                                        }
                                    });
                                });
                            }
                        });
                    });
                }
                else {
                    // Take back to main menu.
                    callback({Error: "Declined addition of phone number."}, null);
                }
            });
        }


    });
};
module.exports = BotAccount;
