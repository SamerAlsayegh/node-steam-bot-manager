FileManager.prototype.__proto__ = require('events').EventEmitter.prototype;


const fs = require('fs');
const glob = require("glob");


function FileManager(path, logger) {
    var self = this;
    self.fileManagerPath = "";
    self.logger = logger;
    if (!self.exists(path)) {
        try {
            self.logger.log('debug', "Creating missing folder named '%j'", path);
            fs.mkdirSync(path);
        } catch (e) {
            if (e.code != 'EEXIST') throw e;
        }
    }
    self.fileManagerPath = path + "/";
}
FileManager.prototype.createFolderIfNotExist = function (folderPath) {
    var self = this;
    if (!self.exists(folderPath)) {
        try {
            self.logger.log('debug', "Creating missing folder named '%j'", self.fileManagerPath + folderPath);
            fs.mkdirSync(self.fileManagerPath + folderPath);
        } catch (e) {
            if (e.code != 'EEXIST') throw e;
        }
    }
};

FileManager.prototype.getFileList = function (pattern, callback) {
    var self = this;
    // options is optional
    glob(self.fileManagerPath + pattern, function (er, files) {
        var cleanFiles = [];
        for (var fileFilter in files) {
            if (files.hasOwnProperty(fileFilter)) {
                cleanFiles.push(files[fileFilter].replace(self.fileManagerPath, ""));
            }
        }
        callback(er, cleanFiles);
    });
};

FileManager.prototype.exists = function (filePath) {
    var self = this;
    try {
        fs.statSync(self.fileManagerPath + filePath);
        return true;
    }
    catch (e) {
        return false;
    }
};

FileManager.prototype.getFile = function (fileName, expectedForm, callback) {
    var self = this;
    try {
        if (self.exists(fileName)) {
            var rawContents = fs.readFileSync(self.fileManagerPath + fileName);
            callback(null, JSON.parse(rawContents));
        } else {
            if (expectedForm == null)
                return callback({Error: "File does not exist."}, null);
            else {
                fs.writeFile(self.fileManagerPath + fileName, JSON.stringify(expectedForm), function (err) {
                    if (err)
                        return callback(err, null);
                    self.getFile(fileName, expectedForm, callback);
                });
            }
        }
    } catch (e) {
        return callback({Error: "Failed to parse due to" + e}, null);
    }
};

FileManager.prototype.saveFile = function (fileName, contentObject, callback) {
    var self = this;

    try {
        fs.writeFile(self.fileManagerPath + fileName, JSON.stringify(contentObject), function (err) {
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
