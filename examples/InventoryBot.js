/**
 * This is a simple example of a bot that will hook into the API and provide an Inventory system
 * In which a bot will accept any trades in-which people offer something and he offers nothing.
 * and
 * bot will accept any trades done by an admin in-which the bot offers something and the admin offers nothing.
 *
 */
var BotManager = require('../index.js');// We will require the BotManager


function InventoryBot() {
    var botsManager = new BotManager();// Create new instanceof the BotManager

    // Once we receive an offer from someone (Using trade offers not live trades)
    botsManager.on('newOffer', function (activeAccount, offer) {
        // 'activeAccount' refers to us (the bot) doing the trade, check docs.
        // 'offer' contains details about the trade, check docs.

        // We check if we are receiving or giving items.
        if (offer.itemsToGive.length > 0 && offer.itemsToReceive.length == 0) {
            // In this case we (the bot) are giving items.
            if (offer.partner.getSteamID64() == '__YOUR_STEAM_ID_64B__') {
                // We will be giving items in this case. So only accept if the 64Bit SteamID is ours/admins.
                offer.accept(true, function (err, status) {
                    if (err)
                        console.log(err);

                    // Since we (the bot) is giving away items, it must authorize the trades...
                    activeAccount.confirmOutstandingTrades();
                });
            }
            else {
                // Otherwise cancel the trade offer.
                offer.cancel(function (err) {
                    if (err)
                        console.log(err);
                });
            }
        }
        else if (offer.itemsToGive.length == 0 && offer.itemsToReceive.length > 0) {
            // The trader is giving items, we are not giving anything.
            offer.accept(true, function (err, status) {
                if (err)
                    console.log(err);
                // So accept. Usually however, user may need to authorize the trade, which can be checked with another event.
            });
        }
        else {
            // The trade requires deposit from both traders, so just decline.
            offer.cancel(function (err) {
                if (err)
                    console.log(err);
            });
        }
    });
    console.log("Random value? " + botsManager.chooseRandomBot());
    botsManager.startManager();// You must start the manager at the end so that all the hooks above it, are registered.
}

new InventoryBot();// Run the code above.

module.exports = InventoryBot;
