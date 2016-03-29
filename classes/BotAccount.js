/**
 * Created by Samer on 2016-03-22.
 */
var SteamUser = require('steam-user');
var SteamCommunity = require('steamcommunity');
var SteamStore = require('steamstore');
var TradeOfferManager = require('steam-tradeoffer-manager');
var SteamTotp = require('steam-totp');
BotAccount.prototype.__proto__ = require('events').EventEmitter.prototype;


function BotAccount(accountDetails) {
    // Ensure account values are valid

    var self = this;
    // Init all required variables
    self.community = new SteamCommunity();
    self.client = new SteamUser();
    self.trade = new TradeOfferManager({
        "steam": self.client,
        "community": self.community,
        "cancelTime": 1000 * 60 * 60 * 24 * 10, // Keep offers upto 1 hour, and then just cancel them.
        "pendingCancelTime": 1000 * 60 * 30, // Keep offers upto 30 mins, and then cancel them if they still need confirmation
        "cancelOfferCount": 30,// Cancel offers once we hit 7 day threshold
        "cancelOfferCountMinAge": 1000 * 60 * 60 * 24 * 7,// Keep offers until 7 days old
        "language": "en", // We want English item descriptions
        "pollInterval": 5000 // We want to poll every 5 seconds since we don't have Steam notifying us of offers
    });
    self.store = new SteamStore();
    self.accountDetails = accountDetails;


    // Sometimes this fails(Does not run) if logging-in/out really quickly.
    self.client.on('loggedOn', function (details) {
        self.client.setPersona(SteamUser.Steam.EPersonaState.Online);
    });

    self.client.on('webSession', function (sessionID, cookies) {
        if (self.accountDetails.sessionID != sessionID || self.accountDetails.cookies != cookies) {
            self.accountDetails.sessionID = sessionID;
            self.accountDetails.cookies = cookies;
            delete self.accountDetails.twoFactorCode;
            self.emit('updatedAccountDetails');
        }

        if (self.accountDetails.cookies) {
            self.community.setCookies(cookies);
            self.store.setCookies(cookies);
            self.trade.setCookies(cookies);
        }
        self.emit('loggedIn', self);
    });


    self.client.on('friendOrChatMessage', function (senderID, message, room) {
        if (self.currentChatting != null && senderID == self.currentChatting.sid) {
            console.log(("\n" + self.currentChatting.accountName + ": " + message).green);
        }
    });

    self.client.on('friendsList', function () {
        //console.log("Friends list loaded");
    });


    self.client.on('error', function (e) {
        // Some error occurred during logon
        console.log("error");
        console.log(e);
        switch (e.eresult) {
            case 5:
                console.log("in correct auth??");
                self.emit('incorrectCredentials', self.accountDetails);
                var tempAccountDetails = {
                    accountName: self.accountDetails.accountName,
                    password: self.accountDetails.password
                };
                delete self.accountDetails;// Clearing any non-auth details we may have had saved.
                self.accountDetails = tempAccountDetails;
                self.emit('updatedAccountDetails');
                break;
            default:
                self.emit('debug', e);
        }
        self.emit('displayBotMenu');
    });
    self.client.on('tradeResponse', function (steamid, response, restrictions) {
        console.log(response);
        console.log(restrictions);
    });

    self.client.on('tradeRequest', function (steamID, respond) {
        console.log("Incoming trade request from " + steamID.getSteam3RenderedID() + ", accepting");
        respond(true);
    });

    self.client.on('tradeOffers', function (count) {
        if (count != 0) {
            console.log("Offers outstanding: " + count);
        }

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
BotAccount.prototype.generateMobileConfirmationCode = function (time, tag) {
    var self = this;
    if (self.accountDetails.identity_secret)
        return SteamTotp.generateConfirmationKey(self.accountDetails.identity_secret, time, tag);
    else
        return new Error("Failed to generate confirmation code. Enable 2-factor-authentication via this tool.");
};
BotAccount.prototype.getUnixTime = function () {
    var self = this;
    return SteamTotp.time();
};
BotAccount.prototype.getAccount = function () {
    var self = this;
    return self.accountDetails;
};

BotAccount.prototype.sendMessage = function (recipient, message) {
    var self = this;
    return self.client.chatMessage(recipient, message, 1);
};

BotAccount.prototype.getConfirmations = function (time, key, callback) {
    var self = this;
    return self.community.getConfirmations(time, key, callback);
};

BotAccount.prototype.sendMessage = function (recipient, message, type) {
    var self = this;
    return self.client.chatMessage(recipient, message, type);
};


BotAccount.prototype.setChatting = function (chattingUserInfo) {
    var self = this;
    self.currentChatting = chattingUserInfo;
};

BotAccount.prototype.getDisplayName = function () {
    var self = this;
    return (self.accountDetails.hasOwnProperty("displayName") ? self.accountDetails.displayName : null);
};

BotAccount.prototype.changeName = function (newName, namePrefix, callback) {
    var self = this;
    self.community.editProfile({name: namePrefix + newName}, function (err) {
        callback(err);
        self.accountDetails.displayName = newName;
        self.emit('updatedAccountDetails');
    });
};

BotAccount.prototype.getInventory = function (appid, contextid, tradeableOnly, callback) {
    var self = this;
    self.trade.loadInventory(appid, contextid, tradeableOnly, callback);
};
BotAccount.prototype.addPhoneNumber = function (phoneNumber, callback) {
    var self = this;
    self.store.addPhoneNumber(phoneNumber, true, function (err) {
        if (err) {
            callback(err);
        }
        else {
            callback(null);
        }
    });
};

BotAccount.prototype.verifyPhoneNumber = function (code, callback) {
    var self = this;
    self.store.verifyPhoneNumber(code, function (err) {
        if (err) {
            callback(err);
        }
        else {
            callback(null);
        }
    });
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
    self.onlineFriendsList.splice(0, 1);
    callback({Error: new Error("Failed to find all friends?")}, self.onlineFriendsList);
};
BotAccount.prototype.createOffer = function (sid) {
    var self = this;
    return self.trade.createOffer(sid);
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
    if (authCode != undefined) {
        accountDetailsModified.authCode = authCode;
    }

    self.client.logOn(accountDetailsModified);
};
BotAccount.prototype.hasPhone = function (callback) {
    var self = this;
    self.store.hasPhone(function (err, hasPhone, lastDigits) {
        callback(err, hasPhone, lastDigits);
    });
};

BotAccount.prototype.finalizeTwoFactor = function (shared_secret, activationCode, callback) {
    var self = this;
    self.client.finalizeTwoFactor(shared_secret, activationCode, callback);
};

BotAccount.prototype.enableTwoFactor = function (callback) {
    var self = this;
    self.client.enableTwoFactor(function (response) {

        self.accountDetails.shared_secret = response.shared_secret;
        self.accountDetails.identity_secret = response.identity_secret;
        self.accountDetails.revocation_code = response.revocation_code;

        callback(response);

    });
};

BotAccount.prototype.logoutAccount = function () {
    var self = this;
    self.client.logOff();
};


module.exports = BotAccount;
