ConfigManager.prototype.__proto__ = require('events').EventEmitter.prototype;

function ConfigManager(fileManager) {
    var self = this;
    self.fileManager = fileManager;
    self.config = {};
    self.defaultConfig = {
        bot_prefix: null,
        api_port: null,
        debug: false,
        statistics: true,
        appid: 730,
        settings: {
            api_key: null,
            steamClientLogin: false,
            retryOnFail: false,
            autologin: true,
            tradeCancelTime: 60 * 60 * 24 * 1000,
            tradePendingCancelTime: 60 * 60 * 24 * 1000,
            language: "en",
            tradePollInterval: 5000,
            tradeCancelOfferCount: 30,
            tradeCancelOfferCountMinAge: 60 * 60 * 1000,
            cancelTradeOnOverflow: true
        }
    };
}
/**
 * Validate the configuration file and ensure all files expected to be there are truly there.
 * @param config
 * @param callback
 */
ConfigManager.prototype.validateConfig = function (config, callback) {
    var self = this;
    for (var settingName in self.defaultConfig) {
        if (!config.hasOwnProperty(settingName) && self.defaultConfig.hasOwnProperty(settingName))
            config[settingName] = self.defaultConfig[settingName];
    }

    // Old version - Phasing it out
    if (config.hasOwnProperty("settings")) {
        for (settingName in config.settings) {
            if (config.settings.hasOwnProperty(settingName))
                config[settingName] = config.settings[settingName];
        }

        for (settingName in self.defaultConfig.settings) {
            if (!config.hasOwnProperty(settingName) && self.defaultConfig.settings.hasOwnProperty(settingName))
                config[settingName] = self.defaultConfig.settings[settingName];
        }
    }
    if (config.hasOwnProperty("settings"))
        delete config.settings;
    callback(config);
};

/**
 * Load the config file as usual
 * @param callback
 */
ConfigManager.prototype.loadConfig = function (callback) {
    var self = this;
    self.fileManager.getFile("config.json", self.defaultConfig, function (err, config) {
        if (err) {
            self.emit('error', "Failed to validate - ", err);
            callback(err, config);
        }
        else {
            try {
                self.validateConfig(config, function (config) {
                    self.emit('debug', "Loaded config file");
                    self.config = config;
                    self.emit('loadedConfig', self.config);
                    return callback(null, config);
                });
            } catch (e) {
                self.emit('error', e);
                return callback(e, null);
            }
        }
    });
};

/**
 * Get config file values
 * @returns {{}|*}
 */
ConfigManager.prototype.getConfig = function () {
    var self = this;
    return self.config;
};


module.exports = ConfigManager;
