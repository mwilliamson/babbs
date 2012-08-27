var path = require("path");
var child_process = require("child_process");
var fs = require("fs");

var q = require("q");
var mkdirp = require("mkdirp");

var files = require("./files");
var numberComparator = require("./util").numberComparator;
var find = require("./util").find;

exports.readConfigs = readConfigs;

var root = "/tmp/babbs";

function readConfigs(actions, configs) {
    var tasks = configs.map(readConfig.bind(null, actions));
    
    tasks.forEach(function(task) {
        var configDependencies = task.config.dependencies || []; 
        task.dependencies = configDependencies.map(function(dependencyConfig) {
            return find(tasks, function(task) {
                return task.id === dependencyConfig.taskId;
            });
        });
    });
    
    return tasks;
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
    this._action = action;
    this._runsRoot = path.join(this.root, "runs");
}

Task.prototype.startRun = function() {
    var action = this._action;
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

Task.prototype.runs = function() {
    var task = this;
    var runNumbers = this._getRunNumbers().fail(function() {
        return [];
    });
    return runNumbers.then(function(runNumbers) {
        runNumbers.reverse();
        return q.all(runNumbers.map(task._getRunByRunNumber.bind(task)));
    })
};

Task.prototype.getRun = function(runNumber) {
    return this._getRunByRunNumber(runNumber);
};

Task.prototype._getRunByRunNumber = function(runNumber) {
    return q.ninvoke(fs, "readFile", this._runResultFile(runNumber)).then(function(result) {
        return JSON.parse(result);
    });
};

Task.prototype._getRunNumbers = function() {
    return q.ninvoke(fs, "readdir", this._runsRoot)
        .then(function(files) {
            var runNumbers = files.map(function(file) {
                return parseInt(file, 10);
            });
            runNumbers.sort(numberComparator);
            return runNumbers;
        });
};

Task.prototype._runResultFile = function(runNumber) {
    return path.join(this._runsRoot, runNumber.toString(), "result.json");
};

Task.prototype._setUpNextRun = function() {
    var runsRoot = this._runsRoot;
    var task = this;
    return this._setUpDirectories().then(function() {
        return task._findNextRunNumber();
    }).then(function(runNumber) {
        var runRoot = path.join(runsRoot, runNumber.toString());
        return q.ncall(mkdirp, null, runRoot).then(function() {
            return createRun(task, task._doAction.bind(task), runNumber);
        });
    });
};

Task.prototype._doAction = function() {
    return this._action(this.workspace, this.config.action);
};

function createRun(task, action, runNumber) {
    function execute() {
        var startDateTime = new Date();
        return action().then(function(result) {
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
        var resultFile = task._runResultFile(runNumber);
        return q.ncall(mkdirp, null, path.dirname(resultFile)).then(function() {
            var fileContents = JSON.stringify(result, null, 4);
            return q.ninvoke(fs, "writeFile", resultFile, fileContents);
        });
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

Task.prototype._findNextRunNumber = function() {
    return this._getRunNumbers().then(function(runNumbers) {
        var lastRunNumber = Math.max.apply(Math, runNumbers);
        return lastRunNumber >= 0 ? lastRunNumber + 1 : 1;
    });
};


function fetchDependency(task, dependency) {
    var dependencyWorkspace = dependency.workspace;
    // TODO: take out hardcoded checkout
    var source = path.join(dependencyWorkspace, "checkout");
    return q.ncall(mkdirp, null, path.dirname(task.workspace))
        .then(function() {
            return files.copyRecursive({
                sourceDirectory: source,
                targetDirectory: task.workspace
            });
        });
}
