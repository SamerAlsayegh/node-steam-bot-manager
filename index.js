const inquirer = require("inquirer");
const colors = require('colors');// Used to prettify messages send by the console

var BotAccount = require('./classes/BotAccount.js');
var DataControl = require('./components/DataControl.js');
var APIControl = require('./components/API_Control.js');


// Import events module
BotManager.prototype.dataControl = new DataControl("config");
BotManager.prototype.APIControl = null;
BotManager.prototype.__proto__ = require('events').EventEmitter.prototype;


BotManager.prototype.BotAccounts = [];

/**
 * Creates a new BotManager instance.
 * @class
 */
function BotManager() {

}
BotManager.prototype.startManager = function (callbackManager) {
    var self = this;
    self.config = {};
    self.logger = self.dataControl.getLogger();


    self.dataControl.on('loadedConfig', function (configResponse) {
        self.config = configResponse;

        if (self.config.hasOwnProperty("api_port") && self.config.api_port != null) {
            self.APIControl = new APIControl(self.config);
            self.APIControl.on('apiLoaded', function () {
                self.emit('loadedAPI');
            });
            self.APIControl.startAPI();
        }
    });

    self.dataControl.on('debug', function (msg) {
        self.infoDebug(msg);
    });


    self.dataControl.on('error', function (err) {
        self.errorDebug(err);
    });

    self.dataControl.on('config', function (configSetting) {
        self.config[configSetting.name] = configSetting.value;
    });


    self.dataControl.initData(function (err, botAccountsList) {
        if (err) {
            self.errorDebug("Error initializing data - " + err);
            if (callbackManager)
                callbackManager(err);
        }
        else {
            for (var botIndex in botAccountsList) {
                self.registerAccount(botAccountsList[botIndex], function (err, botAccount) {
                    if (err)
                        self.errorDebug("Error while loading bot info - " + err);
                });
            }

            // Finished loading...
            self.displayBotMenu();
            if (callbackManager)
                callbackManager(null);
        }
    });

};

BotManager.prototype.apiEndpoint = function (method, url, callback) {
    var self = this;
    self.APIControl.apiEndpoint(method, url, callback);
};
BotManager.prototype.restartAPI = function () {
    var self = this;
    self.APIControl.restartAPI();
};
BotManager.prototype.getAppID = function () {
    var self = this;
    return self.config.appid;
};

BotManager.prototype.displayBotMenu = function () {
    var self = this;
    var tempList = [];
    var botAccounts = self.getAccounts();
    for (var accountIndex in botAccounts) {
        if (botAccounts.hasOwnProperty(accountIndex)) {
            tempList.push(botAccounts[accountIndex].getAccountName() + "[{0}]".format(botAccounts[accountIndex].getDisplayName()));
        }
    }
    tempList.push(new inquirer.Separator());
    tempList.push("register");
    tempList.push("exit");

    var botList = [
        {
            type: 'list',
            name: 'accountName',
            message: 'Choose the bot you would like to operate:',
            choices: tempList
        }
    ];
    inquirer.prompt(botList, function (result) {
        switch (result.accountName) {

            case 'register':
                var tempList = [];
                tempList.push("new account");
                tempList.push(new inquirer.Separator());
                tempList.push("import account");

                var optionList = [
                    {
                        type: 'list',
                        name: 'registerOption',
                        message: 'Choose how you would like to register?:',
                        choices: tempList
                    }
                ];
                inquirer.prompt(optionList, function (result) {
                    var accountQuestions = [
                        {
                            type: 'input',
                            name: 'accountName',
                            message: 'What\'s the bot username?'
                        },
                        {
                            type: 'password',
                            name: 'password',
                            message: 'What\'s the bot password?'
                        }
                    ];
                    switch (result.registerOption) {
                        case 'new account':
                            inquirer.prompt(accountQuestions, function (result) {
                                self.registerAccount({
                                    accountName: result.accountName,
                                    password: result.password
                                }, function (err, botAccount) {
                                    if (err)
                                        self.errorDebug("The following details are incorrect: \nusername: {0}\npassword: {1}".format(result.accountName, result.password));
                                    self.emit('updatedAccountDetails', botAccount);
                                    self.displayBotMenu();

                                });
                            });
                            break;
                        case 'import account':
                            accountQuestions = [
                                {
                                    type: 'input',
                                    name: 'accountName',
                                    message: 'What\'s the bot username?'
                                },
                                {
                                    type: 'password',
                                    name: 'password',
                                    message: 'What\'s the bot password?'
                                },
                                {
                                    type: 'input',
                                    name: 'shared_secret',
                                    message: 'What\'s the shared_secret?'
                                },
                                {
                                    type: 'input',
                                    name: 'identity_secret',
                                    message: 'What\'s the identity_secret?'
                                },
                                {
                                    type: 'input',
                                    name: 'revocation',
                                    message: 'What\'s the revocation code?'
                                }
                            ];

                            inquirer.prompt(accountQuestions, function (result) {
                                // self.registerAccount()
                                self.registerAccount({
                                    accountName: result.accountName,
                                    password: result.password,
                                    shared_secret: result.shared_secret,
                                    identity_secret: result.identity_secret,
                                    revocation: result.revocation
                                }, function (err) {
                                    if (err)
                                        self.errorDebug("The following details are incorrect: \nusername: {0}\npassword: {1}".format(result.accountName, result.password));
                                    self.displayBotMenu();

                                });
                            });
                            break;
                    }
                });


                break;
            case 'exit':
                process.exit();
                break;
            default:
                self.botLookup(result.accountName.split("\[")[0], function (err, accountDetails) {
                    // Check if bot is online or offline
                    if (err) {
                        self.errorDebug(err);
                    }
                    else {
                        self.displayMenu(accountDetails);
                    }
                });
                break;
        }


    });
};


BotManager.prototype.botLookup = function (keyData, callback) {
    var self = this;
    try {
        if (self.getAccounts()[parseInt(keyData)]) {
            callback(null, self.getAccounts()[parseInt(keyData)]);
        } else {
            var botAccounts = self.getAccounts();
            for (var botAccountIndex in botAccounts) {
                if (botAccounts.hasOwnProperty(botAccountIndex)) {
                    if (botAccounts[botAccountIndex].getAccountName().indexOf(keyData) != -1) {
                        return callback(null, botAccounts[botAccountIndex]);
                    } else if (botAccountIndex == botAccounts.length - 1)
                        return callback({Error: "Failed to locate bot."}, null);
                }
            }
        }
    } catch (e) {
        if (e)
            return callback(e, null);
    }
};

BotManager.prototype.processChat = function (botAccount, target) {
    var self = this;
    var chatMessage = [
        {
            message: 'Enter your message (\'quit\' to leave): ',
            type: 'input',
            name: 'message'
        }
    ];
    inquirer.prompt(chatMessage, function (result) {
        if (result.message.toLowerCase() == "quit" || result.message.toLowerCase() == "exit") {
            botAccount.setChatting(null);
            self.displayMenu(botAccount);
        }
        else {
            botAccount.sendMessage(target, result.message);
            self.processChat(botAccount, target);
        }
    });
};


BotManager.prototype.tradeMenu = function (botAccount, tradeMenuOption) {
    var self = this;
    botAccount.getFriends(function (err, friendsList) {
        if (err) {
            self.errorDebug(err);
            self.displayMenu(botAccount);
        }
        else {
            friendsList.unshift({accountName: "Back"});// Add to first pos
            var nameList = [];
            for (var friendId in friendsList) {
                if (friendsList.hasOwnProperty(friendId)) {
                    nameList.push(friendsList[friendId].accountName);
                }
            }

            var tradeMenu = [
                {
                    type: 'list',
                    name: 'tradeOption',
                    message: 'Who would you like to trade with?',
                    choices: nameList
                }
            ];
            inquirer.prompt(tradeMenu, function (result) {
                var menuEntry = nameList.indexOf(result.tradeOption);
                // We will open chat with...
                switch (menuEntry) {
                    case 0:
                        // Go back
                        self.initTradeMenu(botAccount);
                        break;
                    default:
                        // Trade with user selected.
                        botAccount.createOffer(friendsList[menuEntry].accountSid, function (err, currentOffer) {

                            switch (tradeMenuOption) {
                                case 0:
                                    botAccount.getUserInventory(friendsList[menuEntry].accountSid, self.config.appid, 2, true, function (err, inventory, currencies) {
                                        if (err) {
                                            self.errorDebug("User does not have game - " + err);
                                            self.displayMenu(botAccount);
                                        }
                                        else {


                                            if (inventory == null || inventory.length < 1) {
                                                self.infoDebug("Other user has no items in inventory. Redirecting to menu...");
                                                self.initTradeMenu(botAccount);
                                                return;
                                            }

                                            var nameList = [];
                                            for (var id in inventory) {
                                                if (inventory.hasOwnProperty(id)) {
                                                    nameList.push(inventory[id].name);
                                                }
                                            }


                                            var tradeMenu = [
                                                {
                                                    type: 'checkbox',
                                                    name: 'tradeOption',
                                                    message: 'What would you like to take? (\'Enter\' to send trade)',
                                                    choices: nameList,
                                                    validate: function (answer) {
                                                        if (answer.length < 1) {
                                                            self.tradeMenu(botAccount, tradeMenuOption);
                                                            return false;
                                                        }
                                                        return true;
                                                    }
                                                }

                                            ];
                                            inquirer.prompt(tradeMenu, function (result) {
                                                for (var itemNameIndex in result.tradeOption) {
                                                    if (result.tradeOption.hasOwnProperty(itemNameIndex)) {
                                                        var itemName = result.tradeOption[itemNameIndex];
                                                        currentOffer.addTheirItem(inventory[nameList.indexOf(itemName)]);
                                                        nameList[nameList.indexOf(itemName)] = {
                                                            name: itemName,
                                                            displayed: true
                                                        };
                                                    }
                                                }
                                                currentOffer.send("Manual offer triggered by Bot Manager.", null, function (err, status) {
                                                    if (err) {
                                                        self.errorDebug(err);
                                                        self.displayMenu(botAccount);
                                                    } else {
                                                        botAccount.confirmOutstandingTrades(function (err, confirmedTrades) {
                                                            if (err)
                                                                self.errorDebug(err);
                                                            self.infoDebug("Confirmed and sent offer.");
                                                            self.displayMenu(botAccount);
                                                        });
                                                    }
                                                });
                                            });
                                        }
                                    });

                                    break;
                                case 1:
                                    botAccount.getInventory(self.config.appid, 2, true, function (err, inventory, currencies) {
                                        if (inventory == null || inventory.length < 1) {
                                            self.infoDebug("Bot has no items in inventory. Redirecting to menu...");
                                            self.initTradeMenu(botAccount);
                                            return;
                                        }

                                        var nameList = [];
                                        for (var id in inventory) {
                                            if (inventory.hasOwnProperty(id)) {
                                                nameList.push(inventory[id].name);
                                            }
                                        }


                                        var tradeMenu = [
                                            {
                                                type: 'checkbox',
                                                name: 'tradeOption',
                                                message: 'What would you like to offer? (\'Enter\' to send trade)',
                                                choices: nameList,
                                                validate: function (answer) {
                                                    if (answer.length < 1) {
                                                        self.tradeMenu(botAccount, tradeMenuOption);
                                                        return false;
                                                    }
                                                    return true;
                                                }
                                            }

                                        ];
                                        inquirer.prompt(tradeMenu, function (result) {
                                            for (var itemNameIndex in result.tradeOption) {
                                                if (result.tradeOption.hasOwnProperty(itemNameIndex)) {
                                                    var itemName = result.tradeOption[itemNameIndex];
                                                    currentOffer.addMyItem(inventory[nameList.indexOf(itemName)]);
                                                    nameList[nameList.indexOf(itemName)] = {
                                                        name: itemName,
                                                        displayed: true
                                                    };
                                                }
                                            }
                                            currentOffer.send("Manual offer triggered by Bot Manager.", null, function (err, status) {
                                                if (err) {
                                                    self.errorDebug(err);
                                                    self.displayMenu(botAccount);
                                                } else {
                                                    botAccount.confirmOutstandingTrades(function (err, confirmedTrades) {
                                                        if (err)
                                                            self.errorDebug(err);
                                                        self.infoDebug("Confirmed and sent offer.");
                                                        self.displayMenu(botAccount);
                                                    });
                                                }
                                            });
                                        });
                                    });
                                    break;
                                default:
                                    self.tradeMenu(botAccount, tradeMenuOption);
                                    break;
                            }

                        });
                        break;
                }
            });
        }
    });
};

BotManager.prototype.initTradeMenu = function (botAccount) {
    var self = this;
    var tradeOptions = [
        "Request Items",
        "Give Items",
        "Back"
    ];

    var tradeMenuOptions = [
        {
            type: 'list',
            name: 'tradeOption',
            message: 'What trade action would you like?',
            choices: tradeOptions
        }
    ];
    inquirer.prompt(tradeMenuOptions, function (result) {
        var tradeMenuEntry = tradeOptions.indexOf(result.tradeOption);
        switch (tradeMenuEntry) {
            case 0:
                self.tradeMenu(botAccount, 0);
                break;
            case 1:
                self.tradeMenu(botAccount, 1);
                break;
            default:
                self.displayMenu(botAccount);
                break;
        }
    });

};
BotManager.prototype.displayMenu = function (botAccount) {
    var self = this;
    botAccount.community.loggedIn(function (err, loggedIn, familyView) {
        var menuOptions = [
            "Chat",
            "Send trade offer",
            //"Calculate Inventory", This option was temporary, but may maybe added later.
            new inquirer.Separator(),
            botAccount.loggedIn ? "Logout" : "Login",
            new inquirer.Separator(),
            "Manage",
            "Delete",
            "Back"
        ];
        var mainMenu = [
            {
                type: 'list',
                name: 'menuOption',
                message: 'What would you like to do:',
                choices: menuOptions
            }
        ];
        inquirer.prompt(mainMenu, function (result) {
            var menuEntry = menuOptions.indexOf(result.menuOption);
            switch (menuEntry) {
                case 0:
                    botAccount.getFriends(function (err, friendsList) {
                        if (err) {
                            self.errorDebug(err);
                            self.displayMenu(botAccount);
                        }
                        else {
                            friendsList.unshift({accountName: "Back"});
                            var nameList = [];
                            for (var friendId in friendsList) {
                                if (friendsList.hasOwnProperty(friendId)) {
                                    nameList.push(friendsList[friendId].accountName);
                                }
                            }

                            var chatMenu = [
                                {
                                    type: 'list',
                                    name: 'chatOption',
                                    message: 'Who would you like to chat with? (only active chats visible)',
                                    choices: nameList
                                }
                            ];
                            inquirer.prompt(chatMenu, function (result) {
                                var menuEntry = nameList.indexOf(result.chatOption);
                                // We will open chat with...
                                switch (menuEntry) {
                                    case 0:
                                        self.displayMenu(botAccount);
                                        break;
                                    default:
                                        // User wants to actually chat with someone...
                                        botAccount.setChatting({
                                            accountName: friendsList[menuEntry].accountName,
                                            sid: friendsList[menuEntry].accountSid
                                        });
                                        self.processChat(botAccount, friendsList[menuEntry].accountSid);
                                        break;
                                }
                            });
                        }
                    });


                    break;
                case 1:
                    self.initTradeMenu(botAccount);
                    break;
                case 3:
                    // Handle logout/login logic and return to menu.
                    if (!loggedIn) {
                        self.successDebug("Trying to authenticate into {0}".format(botAccount.getAccountName()));
                        botAccount.loginAccount(null, function (err) {
                            self.displayBotMenu();
                        });
                    } else {
                        botAccount.logoutAccount();
                        self.displayBotMenu();
                    }
                    break;
                case 5:

                    var authOptions = [];
                    authOptions.push("Edit Display name");
                    authOptions.push(new inquirer.Separator());
                    authOptions.push((botAccount.has_shared_secret() ? "[ON]" : "[OFF]") + " Two Factor Authentication");
                    authOptions.push("Generate 2-factor-authentication code");
                    authOptions.push("Back");

                    var authMenu = [
                        {
                            type: 'list',
                            name: 'authOption',
                            message: 'Choose the authentication option you would like to activate.',
                            choices: authOptions
                        }
                    ];
                    inquirer.prompt(authMenu, function (result) {
                        var optionIndex = authOptions.indexOf(result.authOption);
                        switch (optionIndex) {
                            case 0:
                                var questions = [
                                    {
                                        type: 'input',
                                        name: 'newName',
                                        message: "Enter the new name of the bot: "
                                    },
                                    {
                                        type: 'confirm',
                                        name: 'prefix',
                                        default: true,
                                        message: "Give default prefix of '{0}'?".format(self.config.bot_prefix)
                                    }
                                ];

                                inquirer.prompt(questions, function (result) {
                                    botAccount.changeName(result.newName, self.config.bot_prefix, function (err) {
                                        if (err) {
                                            self.errorDebug("Failed to change name. Error: {0}".format(err));
                                        }
                                        else {
                                            self.infoDebug("Successfully changed display name");
                                        }
                                        self.displayMenu(botAccount);
                                    })
                                });


                                break;
                            case 2:
                                if (!botAccount.shared_secret) {
                                    // Enable 2FA
                                    self.enableTwoFactor(botAccount);
                                } else {
                                    // TODO: Move to BotAccount class
                                    //disable2FA(botAccount);

                                }
                                break;
                            case 3:
                                if (botAccount.has_shared_secret()) {
                                    // Send the auth key.
                                    self.successDebug("Your authentication code for {0} is {1}".format(botAccount.getAccountName(), botAccount.generateMobileAuthenticationCode()));
                                } else {
                                    // Authn not enabled?
                                    self.errorDebug("2-factor-authentication is not enabled. Check your email.");
                                }
                                self.displayMenu(botAccount);
                                break;
                            default:
                                self.displayMenu(botAccount);
                                break;
                        }
                    });


                    break;
                case 6:
                    var questions = [
                        {
                            type: 'confirm',
                            name: 'askDelete',
                            message: 'Are you sure you want to delete \'' + botAccount.accountName + '\' account?'
                        }
                    ];
                    inquirer.prompt(questions, function (answers) {
                        if (answers.askDelete) {
                            self.unregisterAccount(botAccount, function (err) {
                                if (err) {
                                    // Failed...
                                    self.errorDebug("Failed to unregister the account - " + err);
                                }
                                else {
                                    self.saveAccounts(function (err) {
                                        if (err)
                                            self.errorDebug("Error deleting the account info... " + err);
                                        self.displayBotMenu();
                                    });
                                }
                            });
                        }
                        else {
                            self.displayMenu(botAccount);
                        }
                    });

                    break;
                case 7:
                    self.displayBotMenu();
                    break;
            }

        });
    });
};
/**
 * Start the two-factor-authentication process using the GUI
 * @param {BotAccount} botAccount - The bot chosen to enable two-factor authentication for.
 */
BotManager.prototype.enableTwoFactor = function (botAccount) {
    var self = this;
    botAccount.hasPhone(function (err, hasPhone, lastDigits) {
        if (hasPhone) {
            botAccount.enableTwoFactor(function (response) {
                if (response.status == 84) {
                    // Rate limit exceeded. So delay the next request
                    self.successDebug("Please wait 5 seconds to continue... Possibly blocked by Steam for sending out too many SMS's. Retry in 24 hours, please.");
                    setTimeout(function () {
                        self.enableTwoFactor(botAccount);
                    }, 5000);
                }
                else if (response.status == 1) {
                    self.successDebug("Make sure to save the following code saved somewhere secure: {0}".format(response.revocation_code));
                    var questions = [
                        {
                            type: 'input',
                            name: 'code',
                            message: "Enter the code texted to the phone number associated (-{0}) to the account: ".format(lastDigits)
                        }
                    ];

                    inquirer.prompt(questions, function (result) {
                        if (result.code) {
                            var steamCode = result.code;
                            botAccount.finalizeTwoFactor(response.shared_secret, steamCode, function (err, keyInformation) {
                                if (err) {
                                    self.errorDebug("Failed to enable 2 factor auth - " + err);
                                }
                                else {
                                    self.saveAccounts(function (err) {
                                        if (err) {
                                            self.errorDebug("Failed to save accounts during 2 factor auth enable - " + err);
                                        }
                                        self.displayBotMenu();
                                    });
                                }
                            });
                        }
                    });
                }
                else {
                    self.errorDebug("Error encountered while trying to enable two-factor-authentication, error code: " + response);
                    self.displayBotMenu();
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
                            message: "Enter the number you would like to link to the account (ex. +18885550123)",
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
                        botAccount.addPhoneNumber(result.phoneNumber, function (err) {
                            if (err) {
                                self.errorDebug("Error while adding phone number: " + err);
                                self.displayMenu(botAccount);
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
                                    botAccount.verifyPhoneNumber(result.code, function (err) {
                                        if (err) {
                                            self.errorDebug("Error while verifying phone number: " + err);
                                            self.displayMenu(botAccount);
                                        }
                                        else {
                                            // Verified phone number...
                                            self.enableTwoFactor(botAccount);
                                        }
                                    });
                                });
                            }
                        });
                    });
                }
                else {
                    // Take back to main menu.
                    self.errorDebug("Declined addition of phone number.");
                    self.displayMenu(botAccount);
                }
            });
        }
    });
};

/**
 *
 * @param {BotAccount} accountDetails - The bot information chosen as part of the random choice
 * @param {errorCallback} errorCallback - A callback returned with possible errors
 */
BotManager.prototype.registerAccount = function (accountDetails, callback) {
    var self = this;
    var botAccount = new BotAccount(accountDetails, self.config, self.logger);

    botAccount.on('displayBotMenu', function () {
        self.displayBotMenu();
    });

    botAccount.on('offerChanged', function (offer, oldState) {
        self.emit('offerChanged', botAccount, offer, oldState);
    });

    botAccount.on('sessionExpired', function (offer, oldState) {
        self.emit('sessionExpired', botAccount);
        botAccount.loginAccount({}, function (err) {
            if (err)
                self.errorDebug("Failed to login to account - " + err);
            else
                self.infoDebug("Logged back in due to session expiry");
        });
    });

    botAccount.on('newOffer', function (offer) {
        self.emit('newOffer', botAccount, offer);
    });

    botAccount.on('debug', function (msg) {
        self.infoDebug(msg);
    });


    botAccount.on('error', function (err) {
        self.errorDebug(err);
    });

    botAccount.on('loggedIn', function (botAccount) {
        // User just logged in
        if (botAccount.getDisplayName() != null) {
            botAccount.changeName(botAccount.getDisplayName(), self.config.bot_prefix, function (err) {
                if (err) {
                    self.errorDebug("Failed to change name. Error: " + err);
                }
            })
        }
        self.emit('loggedIn', botAccount);
    });


    botAccount.on('updatedAccountDetails', function () {
        self.saveAccounts(function (err) {
            if (err)
                self.errorDebug("Error saving account info... " + err);
        });
        self.emit('updatedAccountDetails', botAccount);
    });


    self.emit('loadedAccount', accountDetails);
    self.BotAccounts.push(botAccount);
    self.saveAccounts(function (err) {
        if (err)
            self.errorDebug("Error saving account info... " + err);
        if (botAccount.canReloginWithoutPrompt()) {
            botAccount.loginAccount({}, function (err) {
                callback(err, botAccount);
            });
        }
        else
            callback(null, botAccount);
    });

};


/**
 *
 * @param {BotAccount} botAccount - The bot chosen as part of the random choice
 * @param {errorCallback} errorCallback - A callback returned with possible errors
 */
BotManager.prototype.unregisterAccount = function (botAccount, errorCallback) {
    var self = this;
    self.BotAccounts.splice(self.BotAccounts.indexOf(botAccount), self.BotAccounts.indexOf(botAccount) + 1);
    // Temporarily disable the save part as we want to make sure we unregister the AUTH before deleting.
    //self.saveAccounts(function(err){
    //    self.errorDebug(err);
    //});
    errorCallback(null);
};

/**
 * Retrieve accounts registered within the instance
 * @returns {Array} - Array of BotAccount objects
 */
BotManager.prototype.getAccounts = function () {
    var self = this;
    return self.BotAccounts;
};

/**
 * @callback errorCallback
 * @param {Error} error - An error message if the process failed, null if successful
 */

/**
 * Save bot accounts into json file
 * @param {errorCallback} errorCallback - A callback returned with possible errors
 */
BotManager.prototype.saveAccounts = function (errorCallback) {
    var self = this;
    self.dataControl.saveAccounts(self.getAccounts(), function (err) {
        if (err) {
            return errorCallback(err);
        }
        return errorCallback(null);
    });
};

/**
 * Post/log an informational message.
 * @param {string} message - Informational message to log
 */
BotManager.prototype.infoDebug = function (message) {
    var self = this;
    self.dataControl.logger.log('debug', message);
};

/**
 * Post/log an error-type message
 * @param {string} message - Error message to log
 */
BotManager.prototype.errorDebug = function (message) {
    var self = this;
    console.log((message + " ").red);
    self.dataControl.logger.log('error', message);
};

/**
 * Post/log a success-type message
 * @param {String} message - Success message to log
 */
BotManager.prototype.successDebug = function (message) {
    var self = this;
    console.log((message + " ").green);
    self.dataControl.logger.log('success', message);
};

/**
 * Choose a random bot
 */
BotManager.prototype.chooseRandomBot = function () {
    var self = this;
    var randomBotIndex = Math.floor((Math.random() * self.getAccounts().length) % 1 == 0 && (Math.random() * self.getAccounts().length) > 0 ? self.getAccounts().length - 1 : (Math.random() * self.getAccounts().length));
    return self.getAccounts()[randomBotIndex];
};


/**
 * Format the string based on arguments provided after the string
 * @returns {String}
 */
String.prototype.format = function () {
    var content = this;
    for (var i = 0; i < arguments.length; i++) {
        var replacement = '{' + i + '}';
        content = content.replace(replacement, arguments[i]);
    }
    return content;
};


module.exports = BotManager;


