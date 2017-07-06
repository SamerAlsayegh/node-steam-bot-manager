/**
 * This is a simple example of a bot that will hook into the API and provide a way to have bot accounts join a certain group.
 *
 * Make sure you copy this file and not use it directly. Follow install instructions on github.
 */


/* We will require the node-steam-bot-manager module to use it */
var BotManager = require('node-steam-bot-manager');

var botsManager = new BotManager();// Create new instance of the BotManager
var groupID = 'XXXXX';// The group ID can be the name of the group in the URL or SteamID Object. Example: http://steamcommunity.com/groups/XXXXX

function JoinBot() {

    /**
     * We will join the group
     */
    var join = function () {
        /**
         * We will loop through all bot accounts
         */
        for (var botAccountIndex in botsManager.getAccounts()) {
            /**
             * To avoid over-writing the same variable due to the for loop, we will enclose in a function.
             */
            (function () {
                var botAccount = botsManager.getAccounts()[botAccountIndex];// Get botAccount from the index


                botAccount.Community.setupProfile(function(err){
                    if (err){
                        botsManager.errorDebug("Failed to set-up account. Due to " + err);
                    }
                    else {
                        /**
                         * We will execute the command to join group
                         */
                        botAccount.Community.joinGroup(groupID, function (err) {
                            if (err)
                                botsManager.errorDebug("Failed to join group. " + err);
                            else
                                botsManager.infoDebug("Successfully joined group with  " + botAccount.getAccountName());
                        });
                    }
                })

            })();
        }
    };


    botsManager.startManager(function (err) {
        setTimeout(join, 1000 * 10);// We will delay 10 seconds until all accounts are expected to be logged in... There is obviously a much better way, however it requires a lot of code | This is just a simple example.
    });// You must start the manager at the end so that all the hooks above it, are registered.

}

// call the rest of the code and have it execute after 10 seconds
new JoinBot();// Run the code above.

module.exports = JoinBot;
