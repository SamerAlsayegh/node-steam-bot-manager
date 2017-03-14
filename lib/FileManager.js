FileManager.prototype.__proto__ = require('events').EventEmitter.prototype;


const fs = require('fs');

function FileManager(path, logger) {
    var self = this;
    self.fileManagerPath = path;
    self.logger = logger;
    try {
        self.logger.log('debug', "Creating missing folder named '%j'", path);
        fs.mkdirSync(path);
    } catch (e) {
        if (e.code != 'EEXIST') throw e;
    }
}


FileManager.prototype.getFile = function (fileName, expectedForm, callback) {
    var self = this;
    try {
        var rawContents = fs.readFileSync(self.fileManagerPath + "/" + fileName);
        callback(null, JSON.parse(rawContents));
    } catch (e) {
        try {
            fs.statSync(self.fileManagerPath + "/" + fileName);
            fs.rename(self.fileManagerPath + "/" + fileName, fileName + "_backup_" + (new Date().getTime() / 1000), function (err) {
                if (err) {
                    return callback(err, null);
                    self.logger.log('error', 'Renamed a possibly faulty file - please check and determine issue using an online JSON parser');
                }
                fs.writeFile(self.fileManagerPath + "/" + fileName, JSON.stringify(expectedForm), function (err) {
                    if (err)
                        return callback(err, null);
                    self.getFile(fileName, expectedForm, callback);
                });
            });
        }
        catch (e) {
            fs.writeFile(self.fileManagerPath + "/" + fileName, JSON.stringify(expectedForm), function (err) {
                if (err)
                    return callback(err, null);

                self.getFile(fileName, expectedForm, callback);
            });
        }
    }
};

FileManager.prototype.saveFile = function (fileName, contentObject, callback) {
    var self = this;
    try {
        fs.writeFile(self.fileManagerPath + "/" + fileName, JSON.stringify(contentObject), function (err) {
            if (err) {
                // Failed to writefile.
                self.logger.log("error", "Failed to write to file due to: ", err);
                return callback(err, null);
            }

            return callback(null, contentObject);
        });
    }
    catch (err) {
        //Failed to write file...
        self.logger.log("error", "Failed to write to file due to: ", err);
        return callback(err, null);
    }

};

module.exports = FileManager;
