var _ = require("underscore");

var tasks = require("./tasks");
var actions = require("./actions");

exports.fromJson = fromJson;

function fromJson(taskConfigs) {
    return new TaskRepository(taskConfigs);
}

function TaskRepository(taskConfigs) {
    this._taskConfigs = taskConfigs;
}

TaskRepository.prototype.findTaskById = function(id) {
    return _.find(this.allTasks(), function(config) {
        return config.id === id;
    });
};

TaskRepository.prototype.allTasks = function() {
    return tasks.readConfigs(actions, this._taskConfigs);
};
