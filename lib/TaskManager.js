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
 * Add a function to be run as a part of a queue
 * @param context - Context to run the method from (usually the calling instance)
 * @param queueName - Name of the queue to run this commmand a part of ('login' is used, you may use any name as long as you processQueue later - otherwise a memery leak may occur)
 * @param functionName - Name of the function... Ex. 'Trade.getInventory'
 * @param parameters - An array of all parameters to pass to function
 */
TaskManager.prototype.addToQueue = function (queueName, context, functionName, parameters) {
    var self = this;
    var functionVal = self.wrapFunction(functionName, context, parameters);
    if (!self.delayedTasks.hasOwnProperty(queueName))
        self.delayedTasks[queueName] = [];
    self.delayedTasks[queueName].push(functionVal);
};
/**
 * Process the queue to run tasks that were delayed.
 * @param queueName
 * @param errorOnlyCallback
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
