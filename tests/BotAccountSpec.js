var BotAccount = require('../classes/BotAccount.js');
// TBC - Just a test run with unit-tests

describe("BotAccount", function () {
    it("Initializing BotAccount", function () {
        var fakeBot = new BotAccount();
        expect(fakeBot).toThrow();
        var fakeBotValid = new BotAccount("username", "password");
        expect(fakeBotValid).toBeDefined();
        var fakeBotWithDetailsNoLogger = new BotAccount("username", "password", null);
        expect(fakeBotWithDetailsNoLogger).toBeDefined();
        var fakeBotWithDetailsNoLoggerOpts = new BotAccount("username", "password", {somerandomOption: null}, null);
        expect(fakeBotWithDetailsNoLoggerOpts).toBeDefined();
    });

    it("Set revocation code", function () {
        var fakeBot = new BotAccount("test", "test");
        expect(fakeBot.setRevocationCode("R12345")).toBeDefined();
        expect(fakeBot.setRevocationCode("1132123")).toBeUndefined();
    });
});