/**
 * Documentation and comments will be done later...
 */

var inquirer = require("inquirer");
var colors = require('colors');
var BotAccount = require('./classes/BotAccount.js');
var DataControl = require('./components/dataControl.js');
// Import events module

var botAccounts = [];
var dataControl = new DataControl("config");


dataControl.getSavedAccounts(function (err, response) {
    if (err) {
        console.log(err);
    } else {
        initBots(response, function (err) {
            displayBotMenu();
        });
    }
});

function addBot(accountInfo) {
    var activeAccount = new BotAccount(accountInfo);

    if (activeAccount.getAccount().shared_secret) {
        activeAccount.loginAccount();
    }

    activeAccount.on('displayBotMenu', function () {
        displayBotMenu();
    });
    activeAccount.on('loggedIn', function (activeAccount) {
        // User just logged in
    });
    activeAccount.on('updatedAccountDetails', function () {
        dataControl.saveAccounts(botAccounts, function (err) {
            if (err) {
                errorDebug(err);
            }
        });
    });

    activeAccount.on('incorrectCredentials', function (accountDetails) {
        // We must ask user for new details...
        errorDebug("The following details are incorrect: \nusername: {0}\npassword: {1}".format(accountDetails.accountName, accountDetails.password));
    });


    botAccounts.push(activeAccount);
}
function initBots(accountsList, callback) {
    for (var accountIndex in accountsList) {
        if (accountsList.hasOwnProperty(accountIndex)) {
            addBot(accountsList[accountIndex]);
        }
    }
    callback(null);
}
function displayBotMenu() {
    var tempList = [];
    for (var accountIndex in botAccounts) {
        if (botAccounts.hasOwnProperty(accountIndex)) {
            tempList.push(botAccounts[accountIndex].getAccountName());
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

                var questions = [
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

                inquirer.prompt(questions, function (result) {
                    addBot({accountName: result.accountName, password: result.password});
                    displayBotMenu();
                });

                break;
            case 'exit':
                process.exit();
                break;
            default:
                botLookup(result.accountName, function (err, accountDetails) {
                    // Check if bot is online or offline
                    if (err) {
                        errorDebug(err);
                    }
                    else {
                        displayMenu(accountDetails);
                    }
                });
                break;
        }


    });
}
function botLookup(keyData, callback) {
    try {
        if (botAccounts[parseInt(keyData)])
            callback(null, botAccounts[parseInt(keyData)]);
        else
            for (var botAccount in botAccounts) {
                if (botAccounts.hasOwnProperty(botAccount)) {
                    if (botAccounts[botAccount].getAccountName().toLowerCase() == keyData.toLowerCase()) {
                        callback(null, botAccounts[botAccount]);
                    }
                }
            }
    } catch (e) {
        callback({msg: "Failed to find bot with name or id."}, null);
    }
}

function processChat(activeAccount, target) {
    var chatMessage = [
        {
            message: 'Enter your message (\'quit\' to leave): ',
            type: 'input',
            name: 'message'
        }
    ];
    inquirer.prompt(chatMessage, function (result) {
        if (result.message.toLowerCase() == "quit" || result.message.toLowerCase() == "exit") {
            displayMenu(activeAccount);
        }
        else {
            activeAccount.sendMessage(target, result.message);
            processChat(activeAccount, target);
        }
    });
}

function displayMenu(activeAccount) {
    activeAccount.community.loggedIn(function (err, loggedIn, familyView) {
        var menuOptions = [
            "Chat",
            "Send trade",
            "Calculate Inventory",
            new inquirer.Separator(),
            loggedIn ? "Logout" : "Login",
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
                    activeAccount.getFriends(function (err, friendsList) {
                        friendsList.unshift({accountName: "Back"});
                        var nameList = [];
                        for (var friendId in friendsList) {
                            nameList.push(friendsList[friendId].accountName);
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
                                    displayMenu(activeAccount);
                                    break;
                                default:
                                    // User wants to actually chat with someone...
                                    activeAccount.setChatting({
                                        accountName: friendsList[menuEntry].accountName,
                                        sid: friendsList[menuEntry].accountSid
                                    });
                                    processChat(activeAccount, friendsList[menuEntry].accountSid);
                                    break;
                            }
                        });
                    });


                    break;
                case 1:
                    activeAccount.getFriends(function (err, friendsList) {
                        friendsList.unshift({accountName: "Other SID/Name"});// Add to second pos
                        friendsList.unshift({accountName: "Back"});// Add to first pos
                        var nameList = [];
                        for (var friendId in friendsList) {
                            nameList.push(friendsList[friendId].accountName);
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
                                    displayMenu(activeAccount);
                                    break;
                                case 1:
                                    // Trade with custom steam id.
                                    // TODO: add trade to steam id
                                    displayMenu(activeAccount);
                                    break;
                                default:
                                    // Trade with user selected.
                                    var currentOffer = activeAccount.createOffer(friendsList[menuEntry].accountSid);
                                    activeAccount.getInventory(730, 2, true, function (err, inventory, currencies) {
                                        var nameList = [];
                                        for (var id in inventory) {
                                            nameList.push(inventory[id].name);
                                            if (id > 30)
                                                break;
                                        }


                                        var tradeMenu = [
                                            {
                                                type: 'list',
                                                name: 'tradeOption',
                                                message: 'What would you like to offer?',
                                                choices: nameList
                                            }
                                        ];
                                        inquirer.prompt(tradeMenu, function (result) {
                                            var menuEntry = nameList.indexOf(result.tradeOption);
                                            var added = currentOffer.addMyItem(inventory[menuEntry]);
                                            currentOffer.send("Testing...", null, function (err, status) {
                                                console.log(err);// if 50, then too many trades to this user currently...
                                                console.log(status);
                                                var time = activeAccount.getUnixTime();
                                                activeAccount.getConfirmations(time, activeAccount.generateMobileConfirmationCode(time, "conf"), function (err, confirmations) {
                                                    console.log("Trying to confirm...");


                                                    if (err) {
                                                        console.log(err);
                                                    }
                                                    else {
                                                        for (var confirmId in confirmations) {
                                                            console.log("Confirming trade with title: " + confirmations[confirmId].title);
                                                            confirmations[confirmId].respond(time, activeAccount.generateMobileConfirmationCode(time, "allow"), true, function (err) {
                                                                if (err) {
                                                                    console.log("Trade failed to confirm");
                                                                }
                                                            });
                                                        }
                                                    }
                                                });
                                            });
                                            console.log(added);
                                        });
                                    });
                                    break;
                            }
                        });
                    });
                    break;
                case 2:
                    // TODO

                    break;
                case 4:
                    // Handle logout/login logic and return to menu.
                    if (!loggedIn) {
                        successDebug("Trying to authenticate into {0}".format(activeAccount.getAccountName()));
                        activeAccount.loginAccount(null);
                        displayBotMenu();
                    } else {
                        // TODO: Add logoff system.
                        displayMenu(activeAccount);
                    }
                    break;
                case 6:

                    var authOptions = [];
                    authOptions.push((activeAccount.has_shared_secret() ? "[ON]" : "[OFF]") + " Two Factor Authentication");
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
                                if (!activeAccount.shared_secret) {
                                    // Enable 2FA
                                    enableTwoFactor(activeAccount);
                                } else {
                                    // Disable 2FA
                                    // TODO: Move to BotAccount class

                                    //disable2FA(activeAccount);

                                }
                                break;
                            case 1:
                                if (activeAccount.has_shared_secret()) {
                                    // Send the auth key.
                                    successDebug("Your authentication code for {0} is {1}".format(activeAccount.getAccountName(), activeAccount.generateMobileAuthenticationCode()));
                                } else {
                                    // Authn not enabled?
                                    errorDebug("2-factor-authentication is not enabled. Check your email.");
                                }
                                displayMenu(activeAccount);
                                break;
                            default:
                                displayMenu(activeAccount);
                                break;
                        }
                    });


                    break;
                case 7:
                    var questions = [
                        {
                            type: 'confirm',
                            name: 'askDelete',
                            message: 'Are you sure you want to delete \'' + activeAccount.accountName + '\' account?'
                        }
                    ];
                    inquirer.prompt(questions, function (answers) {
                        if (answers.askDelete) {
                            unregisterAccount(activeAccount, function (err) {
                                if (err) {
                                    // Failed...
                                    errorDebug(err);
                                }
                                else {
                                    displayBotMenu();
                                }
                            });
                        }
                        else {
                            displayMenu(activeAccount);
                        }
                    });

                    break;
                case 8:
                    displayBotMenu();
                    break;
            }

        });
    });
}

function enableTwoFactor(activeAccount) {
    activeAccount.hasPhone(function (err, hasPhone, lastDigits) {
        if (hasPhone) {
            activeAccount.enableTwoFactor(function (response) {
                successDebug("Make sure to save the following code saved somewhere secure: {0}".format(response.revocation_code));
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
                        activeAccount.finalizeTwoFactor(response.shared_secret, steamCode, function (err, keyInformation) {
                            if (err) {
                                errorDebug(err);
                                displayMenu(activeAccount);
                            }
                            else {
                                dataControl.saveAccounts(botAccounts, function (err) {
                                    if (err) {
                                        errorDebug(err);
                                    }
                                    displayMenu(activeAccount);
                                });
                            }
                        });
                    }
                });
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
                        activeAccount.addPhoneNumber(result.phoneNumber, function (err) {
                            if (err) {
                                errorDebug(err);
                                displayMenu(activeAccount);
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
                                    activeAccount.verifyPhoneNumber(result.code, function (err) {
                                        if (err) {
                                            errorDebug(err);
                                            displayMenu(activeAccount);
                                        }
                                        else {
                                            // Verified phone number...
                                            enableTwoFactor(activeAccount);
                                        }
                                    });
                                });
                            }
                        });
                    });
                }
                else {
                    // Take back to main menu.
                    errorDebug("Declined addition of phone number.");
                    displayMenu(activeAccount);
                }
            });
        }
    });
}
function unregisterAccount(accountDetails, callback) {
    botAccounts.splice(botAccounts.indexOf(accountDetails), botAccounts.indexOf(accountDetails) + 1);
    dataControl.saveAccounts(botAccounts, function (err) {
        if (err) {
            errorDebug(err);
            callback(err);
        }
        else {
            callback(null);
            successDebug("Deleted {0}".format(accountDetails.accountName));
        }
    });
}


function infoDebug(message) {
    console.log((message + " ").grey);
}
function errorDebug(message) {
    console.log((message + " ").red);
}
function successDebug(message) {
    console.log((message + " ").green);
}

/**
 * Apply format function for any string in the file (used to correctly format strings with variables).
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


