Trade.prototype.__proto__ = require('events').EventEmitter.prototype;


/**
 * A class to handle all trade functions to be done on behalf of the bot account
 * @param trade
 * @param auth
 * @param tasks
 * @param settings
 * @param logger
 * @constructor
 */
function Trade(trade, auth, tasks, settings, logger) {
    var self = this;
    if (typeof trade != "object" || typeof auth != "object")
        throw Error("TradeOfferManager & AuthHandler must be passed respectively.");
    self.auth = auth;
    self.trade = trade;
    self.tasks = tasks;
    self.api_access = false;
    self.logger = logger;
    if (typeof settings != "object")
        self.settings = {
            cancelTradeOnOverflow: true
        };
    else
        self.settings = settings;
}

Trade.prototype.setAPIAccess = function (api_access) {
    var self = this;
    self.api_access = api_access;
};
/**
 * Confirm (not accept) all outstanding trades that were sent out, regardless of trade target via the two-factor authenticator.
 */
Trade.prototype.confirmOutstandingTrades = function (callback) {
    var self = this;
    self.auth.getTimeOffset(function (err, offset, latency) {
        var time = self.auth.getTime(offset);

        self.auth.getConfirmations(time, self.auth.generateMobileConfirmationCode(time, "conf"), function (err, confirmations) {
            if (err) {
                if (self.logger != undefined)
                    self.logger.log('error', "Failed to confirm outstanding trades, retrying in 5 seconds");
                setTimeout(self.confirmOutstandingTrades(callback), 5000);
            }
            else {
                if (confirmations.length > 0) {
                    var confIds = [];
                    var confKeys = [];

                    for (var confirmId in confirmations) {
                        if (confirmations.hasOwnProperty(confirmId)) {
                            confIds.push(confirmations[confirmId].id);
                            confKeys.push(confirmations[confirmId].key);
                        }
                    }

                    self.auth.getTimeOffset(function (err, offset, latency) {
                        var time = self.auth.getTime(offset);
                        self.auth.respondToConfirmation(confIds, confKeys, time, self.auth.generateMobileConfirmationCode(time, "allow"), true, function (err) {
                            if (err) {
                                if (self.logger != undefined)
                                    self.logger.log('error', "Failed to respond outstanding trade confirmation.");
                            } else
                                return callback(confirmations);
                        });
                    });

                } else {
                    callback([]);
                }
            }
        });
    });

};

/**
 * Create a trade offer with the recipient
 * @param steamid - SteamID id any form (SteamID2, SteamID3, SteamID64, or Tradeurl)
 * @param callback
 * @returns {*}
 */
Trade.prototype.createOffer = function (sid, token, callback) {
    var self = this;
    if (callback == null) {
        callback = token;
        token = null;
    }


    if (self.settings.cancelTradeOnOverflow && self.api_access) {
        if (self.logger != undefined)
            self.logger.log('debug', 'Checking for overflow in trades');
        self.trade.getOffers(1, null, function (err, sent, received) {
            if (err)
                return callback(err, undefined);

            var allTrades = [];
            var tradeToCancelDueToTotalLimit = undefined;
            var tradeToCancelDueToPersonalLimit = [];

            for (var tradeIndex in sent) {
                allTrades.push(sent[tradeIndex]);
            }
            for (var tradeIndex in received) {
                allTrades.push(received[tradeIndex]);
            }
            var savedTradesCounts = {};
            for (var tradeIndex in allTrades) {
                var trade = allTrades[tradeIndex];
                if (!savedTradesCounts.hasOwnProperty(trade.partner))
                    savedTradesCounts[trade.partner] = 0;
                savedTradesCounts[trade.partner] = savedTradesCounts[trade.partner] + 1;
                if (savedTradesCounts[trade.partner] >= 5)
                    tradeToCancelDueToPersonalLimit.push(trade);

                if (tradeToCancelDueToTotalLimit == undefined || tradeToCancelDueToTotalLimit.updated.getTime() > trade.updated.getTime()) {
                    tradeToCancelDueToTotalLimit = trade;
                }
            }
            if (tradeToCancelDueToPersonalLimit.length >= 0 && self.settings.cancelTradeOnOverflow) {
                for (var tradeIndex in tradeToCancelDueToPersonalLimit) {
                    if (self.logger != undefined)
                        self.logger.log('debug', "Cancelled trade #" + tradeToCancelDueToPersonalLimit[tradeIndex].id + " due to overload in personal trade requests");
                    tradeToCancelDueToPersonalLimit[tradeIndex].cancel();
                }
            }
            if (allTrades.length >= 30 && self.settings.cancelTradeOnOverflow) {
                if (self.logger != undefined)
                    self.logger.log('debug', "Cancelled trade #" + tradeToCancelDueToTotalLimit.id + " due to overload in total trade requests");
                tradeToCancelDueToTotalLimit.cancel();
            }
            self.emit('createdOffer', sid);
            if (self.logger != undefined)
                self.logger.log('debug', 'Sent trade offer');
            return callback(undefined, self.trade.createOffer(sid, token));

        });
    } else {
        if (self.logger != undefined)
            self.logger.log('debug', 'Sent trade offer');
        self.emit('createdOffer', sid);
        // Before we create an offer, we will get previous offers and ensure it meets the limitations, to avoid errors.
        return callback(undefined, self.trade.createOffer(sid, token));
    }
};

/**
 * @callback acceptedTradesCallback
 * @param {Error} error - An error message if the process failed, undefined if successful
 * @param {Array} acceptedTrades - An array of trades that were confirmed in the process.
 */

/**
 * Confirm (not accept) all sent trades associated with a certain SteamID via the two-factor authenticator.
 * @param {SteamID} steamID - SteamID to use for lookup of inventory
 * @param {acceptedTradesCallback} acceptedTradesCallback - Inventory details (refer to inventoryCallback for more info.)
 */
Trade.prototype.confirmTradesFromUser = function (SteamID, callback) {
    var self = this;

    self.trade.getOffers(1, undefined, function (err, sent, received) {
        var acceptedTrades = [];
        for (var sentOfferIndex in sent) {
            if (sent.hasOwnProperty(sentOfferIndex)) {
                var sentOfferInfo = sent[sentOfferIndex];
                if (sentOfferInfo.partner.getSteamID64() == SteamID.getSteamID64) {
                    sentOfferInfo.accept();
                    acceptedTrades.push(sentOfferInfo);
                }
            }
        }

        for (var receivedOfferIndex in received) {
            if (received.hasOwnProperty(receivedOfferIndex)) {
                var receievedOfferInfo = received[receivedOfferIndex];
                if (receievedOfferInfo.partner.getSteamID64() == SteamID.getSteamID64) {
                    receievedOfferInfo.accept();
                    acceptedTrades.push(receievedOfferInfo);
                }
            }
        }
        self.confirmOutstandingTrades(function (err, confirmedTrades) {
            callback(err, acceptedTrades);
        });
    });
};
/**
 * @callback tradeTokenCallback
 * @param {Error} error - An error message if the process failed, undefined if successful
 * @param {Array} token - The token of the current bot account
 */


/**
 * Retrieves the token part of your account's trade URL.
 * @param {tradeTokenCallback} tradeTokenCallback - Token callback
 */
Trade.prototype.getOfferToken = function (tradeTokenCallback) {
    var self = this;
    self.trade.getOfferToken(tradeTokenCallback);
};


/**
 * @callback inventoryCallback
 * @param {Error} error - An error message if the process failed, undefined if successful
 * @param {Array} inventory - An array of Items returned via fetch (if undefined, then game is not owned by user)
 * @param {Array} currencies - An array of currencies (Only a few games use this) - (if undefined, then game is not owned by user)
 */

/**
 * Retrieve account inventory based on filters
 * @param {Integer} appid - appid by-which to fetch inventory based on.
 * @param {Integer} contextid - contextid of lookup (1 - Gifts, 2 - In-game Items, 3 - Coupons, 6 - Game Cards, Profile Backgrounds & Emoticons)
 * @param {Boolean} tradableOnly - Items retrieved must be tradable
 * @param {inventoryCallback} inventoryCallback - Inventory details (refer to inventoryCallback for more info.)
 */
Trade.prototype.getInventory = function (appid, contextid, tradableOnly, inventoryCallback) {
    var self = this;
    if (!self.auth.loggedIn) {
        self.tasks.addToQueue('login', self, self.getInventory, [appid, contextid, tradableOnly, inventoryCallback]);
    }
    else
        self.trade.getInventoryContents(appid, contextid, tradableOnly, inventoryCallback);
};

/**
 * Retrieve account inventory based on filters and provided steamID
 * @param {SteamID} steamID - SteamID to use for lookup of inventory
 * @param {Integer} appid - appid by-which to fetch inventory based on.
 * @param {Integer} contextid - contextid of lookup (1 - Gifts, 2 - In-game Items, 3 - Coupons, 6 - Game Cards, Profile Backgrounds & Emoticons)
 * @param {Boolean} tradableOnly - Items retrieved must be tradableOnly
 * @param {inventoryCallback} inventoryCallback - Inventory details (refer to inventoryCallback for more info.)
 */
Trade.prototype.getUserInventory = function (steamID, appid, contextid, tradableOnly, inventoryCallback) {
    var self = this;
    if (!self.auth.loggedIn) {
        self.tasks.addToQueue('login', self, self.getUserInventory, [steamID, appid, contextid, tradableOnly, inventoryCallback]);
    }
    else
        self.trade.getUserInventoryContents(steamID, appid, contextid, tradableOnly, inventoryCallback);
};


Trade.prototype.getStateName = function (state) {
    var self = this;
    return self.trade.getStateName(state);
};


module.exports = Trade;
