/**
 * Documentation and comments will be done later...
 */

var inquirer = require("inquirer");
var colors = require('colors');
var BotAccount = require('./classes/BotAccount.js');
var DataControl = require('./components/dataControl.js');

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


function initBots(accountsList, callback) {
    for (var accountIndex in accountsList) {
        if (accountsList.hasOwnProperty(accountIndex)) {
            var activeAccount = new BotAccount(accountsList[accountIndex]);

            if (activeAccount.getAccount().shared_secret) {
                activeAccount.loginAccount();
            }
            botAccounts.push(activeAccount);
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
                    var newAccount = new BotAccount({accountName: result.accountName, password: result.password});
                    botAccounts.push(newAccount);
                    dataControl.saveAccounts(botAccounts, function (err) {
                        if (err) {
                            errorDebug(err);
                        } else {
                            successDebug("Successfully added.");
                        }
                    });
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
                if (botAccounts[botAccount].getAccountName().toLowerCase() == keyData.toLowerCase()) {
                    callback(null, botAccounts[botAccount]);
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
                        friendsList[0].accountName = "Back";
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
                            if (menuEntry != 0) {
                                // User wants to actually chat with someone...
                                activeAccount.setChatting({
                                    accountName: friendsList[menuEntry].accountName,
                                    sid: friendsList[menuEntry].accountSid
                                });
                                processChat(activeAccount, friendsList[menuEntry].accountSid);
                            }
                            else {
                                displayMenu(activeAccount);
                            }
                        });
                    });


                    break;
                case 1:
                    var tradeMenu = [
                        {
                            type: 'list',
                            name: 'tradeOption',
                            message: 'Who would you like to trade with?',
                            choices: ["None"]
                        }
                    ];
                    inquirer.prompt(tradeMenu, function (result) {
                        displayMenu(activeAccount);
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
                    } else {
                        // TODO: Add logoff system.
                        displayMenu(activeAccount);
                    }
                    break;
                case 6:

                    var authOptions = [];
                    authOptions.push((activeAccount.has_shared_secret() ? "[ON]" : "[OFF]") + " Two Factor Authentication");
                    authOptions.push("Retrieve Auth Code");
                    authOptions.push("Retrieve API Key");
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
                                    activeAccount.enable2FactorAuthentication(activeAccount, function (err, authDetails) {
                                        if (err) {
                                            errorDebug(err);
                                        }
                                        else {
                                            successDebug(authDetails);
                                            dataControl.saveAccounts(botAccounts, function (err) {
                                                successDebug("Saved accounts data.");
                                            });
                                        }
                                    });
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
                            case 2:
                                // TODO: Add API key retrieval to BotAccount class.
                                //if (activeAccount.cookies) {
                                //    // Get the API key
                                //    getInstance(activeAccount).trade.setCookies(activeAccount.cookies, function (err) {
                                //        if (err) {
                                //            errorDebug(err);
                                //        }
                                //        else {
                                //            successDebug("\nSuccessfully found the API key");
                                //        }
                                //    })
                                //} else {
                                //    // Auth not enabled?
                                //    errorDebug("Account must have valid credentials.");
                                //}
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


