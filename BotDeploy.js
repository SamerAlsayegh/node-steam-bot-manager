/**
 * Documentation and comments will be done later...
 */

var SteamTotp = require('steam-totp');
var fs = require('fs');
var inquirer = require("inquirer");
var colors = require('colors');
var SteamCommunity = require('steamcommunity');
var SteamStore = require('steamstore');
var TradeOfferManager = require('steam-tradeoffer-manager');


var accountList = [];
var currentError;
var botInstances = [];


function getSavedAccounts(localURI, callback) {
    try {
        var content = fs.readFileSync(localURI);
        callback(null, JSON.parse(content));
    } catch (e) {
        callback(e, []);
    }
}

getSavedAccounts("config/accounts.json", function (err, response) {
    if (err) {
        console.log(err);
        console.log(response);
    } else {
        accountList = response;
        initBots();
        displayBotMenu();
    }
});

function saveAccounts(callback) {
    fs.writeFile("config/accounts.json", JSON.stringify(accountList), callback);
}


function initBots() {
    for (var accountIndex in accountList) {
        if (accountList.hasOwnProperty(accountIndex)) {
            var activeAccount = accountList[accountIndex];

            botInstances.push({
                community: new SteamCommunity(), trade: new TradeOfferManager({
                    "language": "en", // We want English item descriptions
                    "pollInterval": 5000 // We want to poll every 5 seconds since we don't have Steam notifying us of offers
                }), store: new SteamStore()
            });


            if (activeAccount.shared_secret) {
                loginAccountPrompt(activeAccount, false);
            }
            // Debugging code...
            //(function () {
            //    getInstance(activeAccount).community.on("chatMessage", function (sender, text) {
            //        getInstance(activeAccount).community.getSteamUser(sender, function (err, user) {
            //            successDebug("{0}: {1}".format(user.name, text));
            //            user.getInventory(730, 2, true, function (err, inventory, currency) {
            //                if (err) {
            //                    errorDebug(err);
            //                }
            //                else {
            //                    successDebug("Has inv size {0} and inside: ".format(inventory.length));
            //                    for (var x = 0; x < inventory.length; x++) {
            //                        successDebug(inventory[x].name);
            //                    }
            //                }
            //            });
            //        });
            //    });
            //})();
        }
    }
}
function displayBotMenu() {
    var tempList = [];
    for (var accountIndex in accountList) {
        if (accountList.hasOwnProperty(accountIndex)) {
            tempList.push(accountList[accountIndex].accountName);
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
                    registerAccount(result, function (err) {
                        if (err) {
                            // Handle error - can't register?
                        } else {
                            displayBotMenu();
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

function getInstance(activeAccount) {
    if (activeAccount.hasOwnProperty("accountName")) {
        // We are given the account object.
        for (var x = 0; x < accountList.length; x++) {
            if (accountList[x].accountName == activeAccount.accountName) {
                return botInstances[x];
            }
        }
    }
    else {
        // We are given the account name
        for (x = 0; x < accountList.length; x++) {
            if (accountList[x].accountName == activeAccount) {
                return botInstances[x];
            }
        }
    }
}


function displayMenu(activeAccount) {
    getInstance(activeAccount).community.loggedIn(function (err, loggedIn, familyView) {
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
                    var chatMenu = [
                        {
                            type: 'list',
                            name: 'chatOption',
                            message: 'Who would you like to chat with? (only active chats visible)',
                            choices: ["None"]
                        }
                    ];
                    inquirer.prompt(chatMenu, function (result) {
                        displayMenu(activeAccount);
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
                        successDebug("Trying to authenticate into {0}".format(activeAccount.accountName));
                        loginAccountPrompt(activeAccount, true);
                    } else {
                        getInstance(activeAccount).community.chatLogoff(activeAccount);
                        displayMenu(activeAccount);
                    }
                    break;
                case 6:

                    var authOptions = [];
                    authOptions.push((activeAccount.shared_secret ? "[ON]" : "[OFF]") + " Two Factor Authentication");
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
                                    enable2FA(activeAccount);
                                } else {
                                    // Disable 2FA
                                    disable2FA(activeAccount);

                                }
                                break;
                            case 1:
                                if (activeAccount.shared_secret) {
                                    // Send the auth key.
                                    successDebug("Your authentication code for {0} is {1}".format(activeAccount.accountName, SteamTotp.generateAuthCode(activeAccount.shared_secret)));
                                } else {
                                    // Authn not enabled?
                                    errorDebug("2-factor-authentication is not enabled. Check your email.");
                                }
                                displayMenu(activeAccount);
                                break;
                            case 2:
                                if (activeAccount.cookies) {
                                    // Get the API key
                                    getInstance(activeAccount).trade.setCookies(activeAccount.cookies, function (err) {
                                        if (err) {
                                            errorDebug(err);
                                        }
                                        else {
                                            successDebug("\nSuccessfully found the API key");
                                        }
                                    })
                                } else {
                                    // Auth not enabled?
                                    errorDebug("Account must have valid credentials.");
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
                                    errorMsg(err);
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


function registerAccount(accountDetails, callback) {
    accountList.push(accountDetails);
    var botInstance = {
        community: new SteamCommunity(), trade: new TradeOfferManager({
            "language": "en", // We want English item descriptions
            "pollInterval": 5000 // We want to poll every 5 seconds since we don't have Steam notifying us of offers
        }), store: new SteamStore()
    };


    botInstances.push(botInstance);


    saveAccounts(function (err) {
        if (err) {
            errorDebug(err);
            callback(err);
        }
        else {
            successDebug("Registered {0}".format(accountDetails.accountName));
            callback(null);
        }
    });
}
function unregisterAccount(accountDetails, callback) {
    accountList.splice(accountList.indexOf(accountDetails), accountList.indexOf(accountDetails) + 1);
    saveAccounts(function (err) {
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
function loginAccountPrompt(activeAccount, openMenu) {
    var accountDetailsModified = activeAccount;
    if (activeAccount.shared_secret) {
        accountDetailsModified.twoFactorCode = SteamTotp.generateAuthCode(activeAccount.shared_secret);
    }
    if (currentError) {
        if (currentError.modified) {
            var questions = [
                {
                    type: 'input',
                    name: 'code',
                    message: currentError.modified
                }
            ];

            inquirer.prompt(questions, function (result) {
                if (result.code) {
                    if (currentError.message = "SteamGuard" && !activeAccount.authCode)
                        accountDetailsModified.authCode = result.code;
                    else if (currentError.message = "SteamGuardMobile" && !activeAccount.twoFactorCode)
                        accountDetailsModified.twoFactorCode = result.code;
                }

                loginAccountLogic(activeAccount, accountDetailsModified, openMenu);
            });
        }
        else {
            if (openMenu)
                displayMenu(activeAccount);
        }
    }
    else {
        loginAccountLogic(activeAccount, accountDetailsModified, openMenu);
    }

}
function loginAccountLogic(activeAccount, accountDetailsModified, openMenu) {

    loginAccount(accountDetailsModified, function (err, sessionID, cookies, steamguard, oAuthToken) {
        if (err) {
            if (err.message == "SteamGuard") {
                err.modified = "An auth code has been sent to " + err.emaildomain;
            }
            else if (err.message == "SteamGuardMobile") {
                err.modified = "An auth code must be entered using the app-generator.";
            }
            else if (err.message == "CAPTCHA") {
                err.modified = "Enter CAPTCHA as on: " + err.captchaurl;
            }
            currentError = err;
            loginAccountPrompt(activeAccount, openMenu);
        }
        else {
            accountDetailsModified = activeAccount;
            var accountIndex = accountList.indexOf(activeAccount);
                accountList[accountIndex].sessionID = sessionID;
                accountList[accountIndex].cookies = cookies;
                accountList[accountIndex].oAuthToken = oAuthToken;
            if (openMenu) {
                successDebug("Authenticated into {0}".format(activeAccount.accountName));
            }

            getInstance(activeAccount).community.chatLogon(500, "web");

            if (activeAccount.cookies) {
                botInstances[accountIndex].store.setCookies(activeAccount.cookies);
            }

            if (activeAccount != accountDetailsModified) {
                saveAccounts(function (err) {
                    if (err) {
                        return errorDebug(err);
                    }
                    else {
                        if (openMenu) {
                            displayMenu(activeAccount);
                            successDebug("Updated {0} login details.".format(activeAccount.accountName));
                        }
                    }
                });
            }
            else {
                if (openMenu)
                    displayMenu(activeAccount);
            }
            currentError = null;
        }
    });
}
function loginAccount(activeAccount, callback) {
    getInstance(activeAccount).community.login(activeAccount, function (err, sessionID, cookies, steamguard, oAuthToken) {
        callback(err, sessionID, cookies, steamguard, oAuthToken);
    });
}


function enable2FA(activeAccount) {

    getInstance(activeAccount).store.hasPhone(function (err, hasPhone, lastDigits) {

        if (hasPhone) {
            getInstance(activeAccount).community.enableTwoFactor(function (err, response) {
                if (err) {
                    if (err.eresult == 2) {
                        errorDebug("Failed: Ensure you have a phone number associated with the account.");
                    }
                    displayMenu(activeAccount);
                }
                else {

                    successDebug("Save this code somewhere secure: {0}".format(response.revocation_code));

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

                            getInstance(activeAccount).community.finalizeTwoFactor(response.shared_secret, steamCode, function (err) {
                                if (err) {
                                    currentError = err;
                                    errorDebug(err);
                                    displayMenu(activeAccount);
                                }
                                else {
                                    var accountIndex = accountList.indexOf(activeAccount);
                                    accountList[accountIndex].shared_secret = response.shared_secret;
                                    accountList[accountIndex].revocation_code = response.revocation_code;
                                    saveAccounts(function (err) {
                                        if (err) {
                                            currentError = err;
                                            errorDebug(err);
                                            displayMenu(activeAccount);
                                        }
                                        else {
                                            successDebug("Updated {0}".format(activeAccount.accountName));
                                            displayMenu(activeAccount);
                                        }
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
                    // Set-up phone number

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
                        getInstance(activeAccount).store.addPhoneNumber(result.phoneNumber, true, function (err) {
                            if (err) {
                                errorDebug(err);
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
                                    getInstance(activeAccount).store.verifyPhoneNumber(result.code, function (err) {
                                        if (err) {
                                            errorDebug(err);
                                        }
                                        else {
                                            successDebug("Added phone number to account. Redirecting back to setting 2-factor-authentication system");
                                            enable2FA(activeAccount);
                                        }
                                    });
                                });
                            }
                        });
                    });
                }
                else {
                    // Take back to main menu.
                    displayMenu(activeAccount);
                }
            });
        }


    });
}


function botLookup(keyData, callback) {
    try {
        if (accountList[parseInt(keyData)])
            callback(null, accountList[parseInt(keyData)]);
        else
            for (var x = 0; x < accountList.length; x++) {
                if (accountList[x].accountName.toLowerCase() == keyData.toLowerCase()) {
                    callback(null, accountList[x]);
                }
            }
    } catch (e) {
        callback({msg: "Failed to find bot with name or id."}, null);
    }
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
