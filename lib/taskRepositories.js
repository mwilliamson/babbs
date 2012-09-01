var _ = require("underscore");
var q = require("q");

var tasks = require("./tasks");
var actions = require("./actions");
var runLogging = require("./runLogging");

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

TaskRepository.prototype.allTasksStatuses = function() {
    var tasks = this.allTasks();
    return q.all(tasks.map(this._taskStatus.bind(this)));
};

TaskRepository.prototype._taskStatus = function(task) {
    var runLogger = runLogging.create();
    return runLogger.forTask(task).allRuns().then(function(runs) {
        var lastFinishedRun = _.find(runs, function(run) {
            return run.success !== undefined;
        });
        var status = lastFinishedRun ? (lastFinishedRun.success ? "success" : "failure") : "unknown";
        return {
            task: task,
            status: status
        };
    });
};
