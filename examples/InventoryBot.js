/**
 * This is an example bot that will hook into the API and provide Jackpot functionality for the bots.
 */
require('request');// Used for sending requests to the jackpot website.
var BotManager = require('../index.js');// We will require the BotManager


function InventoryBot() {
    var botsManager = new BotManager();


    // Once we receive an offer from someone (Using trade offers not live trades)
    botsManager.on('newOffer', function (activeAccount, offer) {
        // 'activeAccount' refers to us (the bot) doing the trade, check docs.
        // 'offer' contains details about the trade, check docs.

        // We check if we are receiving or giving items.
        if (offer.itemsToGive.length > 0 && offer.itemsToReceive.length == 0) {
            // In this case we (the bot) are giving items.
            if (offer.partner.getSteamID64() == '76561198042954517') {
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
                console.log("Cancelled: " + err);
            })
        }
    });

    botsManager.startManager();
}

new InventoryBot();

module.exports = InventoryBot;
