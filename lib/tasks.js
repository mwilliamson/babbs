var path = require("path");

var q = require("q");
var mkdirp = require("mkdirp");
var _ = require("underscore");

var runRepositories = require("./runRepositories");

exports.readConfigs = readConfigs;

var root = "/tmp/babbs";

var runRepository = runRepositories.create();

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
    this._runsRoot = path.join(this.root, "runs");
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
    var runsRoot = this._runsRoot;
    var task = this;
    return this._setUpDirectories().then(function() {
        return runRepository.forTask(task).nextRunNumber();
    }).then(function(runNumber) {
        var runRoot = path.join(runsRoot, runNumber.toString());
        return q.ncall(mkdirp, null, runRoot).then(function() {
            return createRun(task, task._action, runNumber);
        });
    });
};

function createRun(task, action, runNumber) {
    function execute() {
        var startDateTime = new Date();
        return action.run().then(function(result) {
            result.runNumber = runNumber;
            result.startDateTime = startDateTime;
            result.finishDateTime = new Date();
            result.timeTaken =
                result.finishDateTime.getTime() - startDateTime.getTime();
            return saveResult(result).then(function() {
                return result;
            });
        });
    }

    function saveResult(result) {
        return runRepository.forTask(task).saveRunResult(result);
    }
    
    return {
        execute: execute
    };
}

Task.prototype._setUpDirectories = function() {
    return q.all([
        q.ncall(mkdirp, null, this.workspace),
        q.ncall(mkdirp, null, this._runsRoot)
    ]);
};

function fetchDependency(task, dependency) {
    return dependency._action.exportToDependent(task.workspace);
}
