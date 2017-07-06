/**
 * This is a simple example of a bot that will simply run the tool to use the GUI aspect of the bot.
 * This will not do any handling of events automatically.
 *
 *
 * Make sure you copy this file and not use it directly. Follow install instructions on github.
 */


/* We will require the node-steam-bot-manager module to use it */
var BotManager = require('node-steam-bot-manager');
var botsManager = new BotManager();// Create new instance of the BotManager

function GUIOnly() {



    botsManager.startManager(function (err) {
        if (err)
            botsManager.errorDebug("Failed to start Bot Manager")
    });// You must start the manager

}

new GUIOnly();// Run the code above.

module.exports = GUIOnly;
