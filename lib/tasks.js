var path = require("path");

var q = require("q");
var mkdirp = require("mkdirp");
var _ = require("underscore");

var runLogging = require("./runLogging");

exports.readConfigs = readConfigs;

var root = "/tmp/babbs";

var runRepository = runLogging.create();

function readConfigs(actions, configs) {
    var tasks = configs.map(readConfig.bind(null, actions));
    tasks.forEach(resolveTaskDependencies);
    return tasks;
}

function resolveTaskDependencies(task, index, tasks) {
    var configDependencies = task.config.dependencies || []; 
    task.dependencies = configDependencies.map(function(dependencyConfig) {
        return _.find(tasks, function(task) {
            return task.id === dependencyConfig.taskId;
        });
    });
}

function readConfig(actions, config) {
    var action = actions[config.action.name];
    return new Task(config, action);
}

function Task(config, action) {
    this.id = config.id;
    this.name = config.name;
    this.config = config;
    this.root = path.join(root, config.id.toString());
    this.workspace = path.join(this.root, "workspace");
    this._action = action(this.workspace, this.config.action);
}

Task.prototype.startRun = function() {
    var task = this;
    return this._setUpNextRun().then(function(run) {
        return task._fetchDependencies().then(function() {
            return run.execute();
        });
    });
};

Task.prototype._fetchDependencies = function() {
    return q.all(this.dependencies.map(fetchDependency.bind(null, this)));
};

Task.prototype._setUpNextRun = function() {
    var task = this;
    return this._setUpDirectories().then(function() {
        return runRepository.forTask(task).forNextRun();
    }).then(function(runLogger) {
        return createRun(task, task._action, runLogger);
    });
};

function createRun(task, action, runLogger) {
    function execute() {
        var startDateTime = new Date();
        return action.run(runLogger).then(function(result) {
            result.startDateTime = startDateTime;
            result.finishDateTime = new Date();
            result.timeTaken =
                result.finishDateTime.getTime() - startDateTime.getTime();
            return runLogger.logResult(result).then(function() {
                return result;
            });
        });
    }
    
    return {
        execute: execute
    };
}

Task.prototype._setUpDirectories = function() {
    return q.ncall(mkdirp, null, this.workspace);
};

function fetchDependency(task, dependency) {
    return dependency._action.exportToDependent(task.workspace);
}
