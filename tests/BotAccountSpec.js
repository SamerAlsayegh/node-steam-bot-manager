var BotAccount = require('../classes/Bot.js');
// TBC - Just a test run with unit-tests

describe("BotAccount", function () {
    it("Initializing BotAccount", function () {
        expect(new BotAccount()).toThrow();
        var fakeBotValid = new BotAccount("username", "password");
        expect(fakeBotValid).toBeDefined();
        var fakeBotWithDetailsNoLogger = new BotAccount("username", "password", null);
        expect(fakeBotWithDetailsNoLogger).toBeDefined();
        var fakeBotWithDetailsNoLoggerOpts = new BotAccount("username", "password", {somerandomOption: null}, null);
        expect(fakeBotWithDetailsNoLoggerOpts).toBeDefined();
    });

    it("Set revocation code", function () {
        var fakeBot = new BotAccount("test", "test");
        expect(fakeBot.AuthManager.setRevocationCode("R12345")).toBeDefined();
        expect(fakeBot.AuthManager.setRevocationCode("1132123")).toBeUndefined();
    });
});