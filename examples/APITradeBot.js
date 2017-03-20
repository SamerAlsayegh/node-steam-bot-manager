/**
 * This is a simple example of a bot that will hook into the API and provide a way to deposit items into a bot inventory
 * In which a bot will accept any trades in-which the offer is initiated via API, and decline any others.
 * and
 * the api can be called via below:
 *
 * METHOD: POST
 * URL: localhost:1338/sendTrade (port can be changed in config)
 * PARAMS:
 *      partner - A string representation of SteamID2, SteamID3, or SteamID64
 *      items - An array of strings in the form of "classid_instanceid" of items (repeating the same values is a valid case)
 * RETURN:
 *   If failed to send trade:
 *      {status: 0, error: String}
 *
 *   If successful to send trade:
 *      {status: 1, offerInformation: tradeOfferObject}
 *
 * Make sure you copy this file and not use it directly. Follow install instructions on github.
 */


/* We will require the node-steam-bot-manager module to use it */
var BotManager = require('node-steam-bot-manager');


var CONTEXT_ID = 2;
var MESSAGE_ON_TRADE = "This trade offer was initiated via API of node-steam-bot-manager.";
function APITradeBot() {
    var botsManager = new BotManager();// Create new instance of the BotManager

    // Once we receive an offer from someone (Using trade offers not live trades)
    botsManager.on('newOffer', function (activeAccount, offer) {
        // 'activeAccount' refers to us (the bot receiving the offer) doing the trade, check docs for more info.
        // 'offer' contains details about the trade, check docs.


        // Cancel all offers received (the event does not trigger on sent-offers.)
        offer.cancel(function (err) {
            if (err)
                console.log(err);
        });
    });

    botsManager.infoDebug("Starting Bot Manager");


    // We start the manager, and then load the API Endpoints, since we need the webserver running to add the endpoints.
    botsManager.startManager(function (err) {
        if (err) {
            return botsManager.errorDebug("Failed to start Bot Manager");
        }
        // Register API endpoint
        botsManager.addEndpoint('POST', '/sendTrade', function (req, res) {
            if (req.body.hasOwnProperty("partner")) {
                var partner = req.body.partner;// We are getting the 'partner' parameter from the body of the request.
                if (req.body.hasOwnProperty("items")) {
                    var items = req.body.items;// We are getting the item list
                    var botAccount = botsManager.chooseRandomBot();

                    try {
                        var itemsList = JSON.parse(items);
                    } catch (e) {
                        return res.json({status: 0, error: "Invalid item list (ensure it can be parsed)."});
                    }


                    var partnerSid = botAccount.fromIndividualAccountID(partner);//Converting the id into a SteamID object (to verify it is valid)


                    if (partnerSid != null) {

                        // We will get user inventory so that we can find which items are requested.
                        botAccount.getUserInventory(partnerSid, botsManager.getAppID(), CONTEXT_ID, true, function (err, items) {
                            if (err)
                                return res.json({status: 0, error: "Failed to get Inventory - due to " + err});

                            // We will create an offer, and get the currentOffer object so that we fill it.
                            botAccount.TradeManager.createOffer(partnerSid, function (err, currentOffer) {
                                if (err)
                                    return res.json({status: 0, error: "Failed to create offer - due to " + err});

                                // We will build a lookup system for classid_instanceid
                                var lookup = {};
                                var countTracker = {};

                                for (var i = 0, len = items.length; i < len; i++) {
                                    if (!countTracker.hasOwnProperty(items[i].classid + "_" + items[i].instanceid))
                                        countTracker[items[i].classid + "_" + items[i].instanceid] = 1;
                                    else
                                        countTracker[items[i].classid + "_" + items[i].instanceid] = countTracker[items[i].classid + "_" + items[i].instanceid] + 1;
                                    lookup[items[i].classid + "_" + items[i].instanceid + "_" + countTracker[items[i].classid + "_" + items[i].instanceid]] = items[i];
                                }

                                countTracker = {};
                                // Go through all items in inventory, and check if they match any items needed for the trade
                                // Ensure to save the different properties of
                                for (var itemIndex in itemsList) {
                                    if (itemsList.hasOwnProperty(itemIndex)) {
                                        var neededItem = itemsList[itemIndex];

                                        if (!countTracker.hasOwnProperty(neededItem))
                                            countTracker[neededItem] = 1;
                                        else
                                            countTracker[neededItem] = countTracker[neededItem] + 1;

                                        var itemFound = lookup[neededItem + "_" + countTracker[neededItem]];
                                        if (itemFound != null) {
                                            currentOffer.addTheirItem(itemFound);// Add their item to the offer
                                            delete lookup[neededItem];
                                        }
                                    }
                                }


                                // Place some checks to ensure we don't send an empty trade or a missing-trade.
                                if (currentOffer.itemsToReceive.length != itemsList.length)
                                    return res.json({status: 0, error: "Failed to get some items required from trade"});

                                if (currentOffer.itemsToReceive.length == 0)
                                    return res.json({status: 0, error: "Failed to any items required from trade"});


                                // We will send the offer to the user with 'partnerSid'
                                currentOffer.send(MESSAGE_ON_TRADE, function (err, status) {
                                    if (err) {
                                        return res.json({status: 0, error: "Failed to send offer - due to " + err});
                                    } else {
                                        botAccount.TradeManager.confirmOutstandingTrades(function (err, confirmedTrades) {
                                            if (err) {
                                                return res.json({
                                                    status: 0,
                                                    error: "Failed to confirm offer - due to " + err
                                                });
                                            }
                                            else
                                                return res.json({
                                                    status: 1,
                                                    offerInformation: currentOffer.itemsToReceive
                                                });
                                        });
                                    }
                                });


                            });
                        });
                    }
                    else
                        return res.json({status: 0, error: "Invalid partner."});
                }
                else
                    return res.json({status: 0, error: "Missing 'items' parameter."});

            } else
                return res.json({status: 0, error: "Missing 'partner' parameter."});
        });
    });// You must start the manager at the end so that all the hooks above it, are registered.
}

new APITradeBot();// Run the code above.

module.exports = APITradeBot;
