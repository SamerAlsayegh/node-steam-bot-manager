var BotAccount = require('../classes/Bot.js');
var BotManager = require('../lib/index.js');

// TBC - Just a test run with unit-tests

describe("BotAccount", function () {
    // it("Initializing BotAccount", function () {
    //     // expect(function () {throw new Error("Parsing is not possible")}).toThrow(new Error("Parsing is not possible"));
    //     expect(function () { new BotAccount()}).toThrow(new Error("Invalid username/password or missing oAuthToken/Steamguard code"));
    //     var fakeBotValid = new BotAccount("username", "password");
    //     expect(fakeBotValid).toBeDefined();
    //     var fakeBotWithDetails = new BotAccount("username", "password");
    //     expect(fakeBotWithDetails).toBeDefined();
    //     var fakeBotWithDetailsOpts = new BotAccount("username", "password", {somerandomOption: null});
    //     expect(fakeBotWithDetailsOpts).toBeDefined();
    // });

    it("Finding Bots", function () {

        runs(function() {
            let botsManager = new BotManager();
            let accounts = botsManager.getAccounts();


            botsManager.on('loggedIn', function (botAccount) {
                botsManager.findBot(botAccount.getAccountName(), function (err) {
                    console.log("WEW")
                }, ["loggedIn"]);
            });
            botsManager.startManager(function (err) {
                if (err) {
                    return botsManager.errorDebug("Failed to start Bot Manager");
                }
                accounts.forEach(function (account) {
                    account.initUser(function (err) {
                        console.log(err, account);
                        account.Auth.loginAccount();
                    });

                })
            });// You must start the manager at the end so that all the hooks above it, are registered.
        });
        waitsFor(function() {
            return botsManager.getAccounts();
        }, "The Value should be incremented", 5000);

    });
    //
    // it("Set revocation code", function () {
    //     var fakeBot = new BotAccount("test", "test");
    //     expect(fakeBot.getAccountName()).toBeDefined();
    // });
    //
    // it("Set revocation code", function () {
    //     var fakeBot = new BotAccount("test", "test");
    //     expect(fakeBot.Auth.setRevocationCode("R12345")).toBeDefined();
    //     expect(fakeBot.Auth.setRevocationCode("1132123")).toBeUndefined();
    // });
    //
    // it("Create authentication object", function () {
    //     var fakeBot = new BotAccount("test", "test");
    //     expect(fakeBot.Auth.setRevocationCode("R12345")).toBeDefined();
    //     expect(fakeBot.Auth.setRevocationCode("1132123")).toBeUndefined();
    // });
});