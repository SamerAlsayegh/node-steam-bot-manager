TradeHandler.prototype.__proto__ = require('events').EventEmitter.prototype;

function TradeHandler(trade, auth, settings, logger) {
    var self = this;
    if (typeof trade != "object" || typeof auth != "object")
        throw Error("TradeOfferManager & AuthHandler must be passed respectively.");
    self.auth = auth;
    self.trade = trade;
    self.api_access = false;
    self.logger = logger;
    if (typeof settings != "object")
        self.settings = {
            cancelTradeOnOverflow: true
        };
    else
        self.settings = settings;
}


TradeHandler.prototype.setAPIAccess = function (api_access) {
    var self = this;
    self.api_access = api_access;
};
/**
 * Confirm (not accept) all outstanding trades that were sent out, regardless of trade target via the two-factor authenticator.
 */
TradeHandler.prototype.confirmOutstandingTrades = function (callback) {
    var self = this;
    var time = self.auth.getTime();
    self.auth.getConfirmations(time, self.auth.generateMobileConfirmationCode(time, "conf"), function (err, confirmations) {
        if (err) {
            if (self.logger != undefined)
                self.logger.log('error', "Failed to confirm outstanding trades");
            setTimeout(self.confirmOutstandingTrades(callback), 5000);
        }
        else {
            var confirmedTrades = [];
            if (confirmations.length > 0) {
                for (var confirmId in confirmations) {
                    if (confirmations.hasOwnProperty(confirmId)) {
                        confirmations[confirmId].respond(time, self.auth.generateMobileConfirmationCode(time, "allow"), true, function (err) {
                            confirmedTrades.push(confirmations[confirmId]);
                            if (confirmedTrades.length == confirmations.length) {
                                // Everything went smooth
                                return callback(undefined, confirmations);
                            }
                        });
                    }
                }
            } else {
                callback(undefined, []);
            }
        }
    });
};

/**
 * Create a trade offer with the recipient
 * @param steamid - SteamID id any form (SteamID2, SteamID3, SteamID64, or Tradeurl)
 * @param callback
 * @returns {*}
 */
TradeHandler.prototype.createOffer = function (sid, callback) {
    var self = this;

    if (self.settings.cancelTradeOnOverflow && self.api_access) {
        if (self.logger != undefined)
            self.logger.log('debug', 'Checking for overflow in trades');
        self.trade.getOffers(1, undefined, function (err, sent, received) {
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
            return callback(undefined, self.trade.createOffer(sid));

        });
    } else {
        if (self.logger != undefined)
            self.logger.log('debug', 'Sent trade offer');
        self.emit('createdOffer', sid);
        // Before we create an offer, we will get previous offers and ensure it meets the limitations, to avoid errors.
        return callback(undefined, self.trade.createOffer(sid));
    }
};

module.exports = TradeHandler;
