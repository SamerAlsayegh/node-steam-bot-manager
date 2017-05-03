TaskManager.prototype.__proto__ = require('events').EventEmitter.prototype;

function TaskManager(logger) {
    var self = this;
    self.logger = logger;
    self.delayedTasks = [];
}


/**
 * Function wrapper used to delay function calls by name and paramters
 * @param fn - function reference
 * @param context - Context to use for call
 * @param params - Parameters in arraylist to send with function
 * @returns {Function}
 */
TaskManager.prototype.wrapFunction = function (fn, context, params) {
    return function () {
        fn.apply(context, params);
    };
};
/**
 * Add a function to the queue which runs when we login usually.
 * @param functionV
 * @param functionData
 */
TaskManager.prototype.addToQueue = function (queueName, functionV, functionData) {
    var self = this;
    var functionVal = self.wrapFunction(functionV, self, functionData);
    if (!self.delayedTasks.hasOwnProperty(queueName))
        self.delayedTasks[queueName] = [];
    self.delayedTasks[queueName].push(functionVal);
};
/**
 * Process the queue to run tasks that were delayed.
 * @param queueName
 * @param callback
 */
TaskManager.prototype.processQueue = function (queueName, callback) {
    var self = this;
    if (self.delayedTasks.hasOwnProperty(queueName)) {
        while (self.delayedTasks[queueName].length > 0) {
            (self.delayedTasks[queueName].shift())();
        }
    }
    callback(undefined);
};

module.exports = TaskManager;
