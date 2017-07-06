/**
 * This is a simple example of a bot that will hook into the API and provide a way to follow and unfollow accounts.
 * I do not promote the use of this file, it is made for educational purposes on the possible functionality of this tool.
 *
 * Note: This is simply a proof-of-concept
 *
 * Make sure you copy this file and not use it directly. Follow install instructions on github.
 */


/* We will require the node-steam-bot-manager module to use it */
var BotManager = require('node-steam-bot-manager');

var botsManager = new BotManager();// Create new instance of the BotManager
var profileId = 'PROFILE_ID_OR_STEAM_ID';// The profile ID is the XXXX in the following, SteamID's do not work, if profile id is valid. : https://steamcommunity.com/id/XXXX or http://steamcommunity.com/profiles/XXXX/

function FollowBot() {

    /**
     * We will downvote shared files.
     */
    var unfollow = function () {
        /**
         * We will loop through all bot accounts
         */
        for (var botAccountIndex in botsManager.getAccounts()) {
            /**
             * To avoid over-writing the same variable due to the for loop, we will enclose in a function.
             */
            (function () {
                var botAccount = botsManager.getAccounts()[botAccountIndex];// Get botAccount from the index

                /**
                 * We will execute the command to down vote
                 */
                botAccount.Community.unfollowPublisher(profileId, function (err) {
                    if (err)
                        botsManager.errorDebug("Failed to un-follow user. User might already be un-followed. Error: " + err);
                    else
                        botsManager.infoDebug("Successfully un-followed user with  " + botAccount.getAccountName());
                });
            })();
        }
    };
    /**
     * We will up vote shared files.
     */
    var follow = function () {
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
                         * We will execute the command to up vote
                         */
                        botAccount.Community.followPublisher(profileId, function (err) {
                            if (err)
                                botsManager.errorDebug("Failed to follow user. User might already be followed. Error: " + err);
                            else
                                botsManager.infoDebug("Successfully followed user with  " + botAccount.getAccountName());
                        });
                    }
                })

            })();
        }
    };


    botsManager.startManager(function (err) {
        setTimeout(follow, 10000);
    });// You must start the manager at the end so that all the hooks above it, are registered.

}

// call the rest of the code and have it execute after 3 seconds
new FollowBot();// Run the code above.

module.exports = FollowBot;
