var path = require("path");
var child_process = require("child_process");
var fs = require("fs");

var q = require("q");
var mkdirp = require("mkdirp");

var files = require("./files");

exports.readConfigs = readConfigs;

var root = "/tmp/babbs";

function readConfigs(templates, configs) {
    var tasks = configs.map(readConfig.bind(null, templates));
    
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

function readConfig(templates, config) {
    var template = templates[config.template];
    return new Task(config, template);
}

function Task(config, template) {
    this.id = config.id;
    this.name = config.name;
    this.config = config;
    this.root = path.join(root, config.id.toString());
    this.workspace = path.join(this.root, "workspace");
    this._template = template;
    this._runsRoot = path.join(this.root, "runs");
}

Task.prototype.startRun = function() {
    var dependencies = this.dependencies;
    var template = this._template;
    var task = this;
    return this._setUpNextRun().then(function(run) {
        return q.all(dependencies.map(fetchDependency.bind(null, task))).then(function() {
            var startDateTime = new Date();
            return template(task).then(function(taskResult) {
                taskResult.startDateTime = startDateTime;
                taskResult.finishDateTime = new Date();
                taskResult.timeTaken =
                    taskResult.finishDateTime.getTime() - startDateTime.getTime();
                return run.saveResult(taskResult).then(function() {
                    return taskResult;
                });
            });
        });
    });
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
        return task._findNextTaskNumber();
    }).then(function(taskNumber) {
        var runRoot = path.join(runsRoot, taskNumber.toString());
        return q.ncall(mkdirp, null, runRoot).then(function() {
            return {
                saveResult: saveTaskResult.bind(null, task, taskNumber)
            };
        });
    });
};

Task.prototype._setUpDirectories = function() {
    return q.all([
        q.ncall(mkdirp, null, this.workspace),
        q.ncall(mkdirp, null, this._runsRoot)
    ]);
};

Task.prototype._findNextTaskNumber = function() {
    return this._getRunNumbers().then(function(runNumbers) {
        var lastTaskNumber = Math.max.apply(Math, runNumbers);
        return lastTaskNumber >= 0 ? lastTaskNumber + 1 : 1;
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

function saveTaskResult(task, taskNumber, taskResult) {
    taskResult.runNumber = taskNumber;
    var resultFile = task._runResultFile(taskNumber);
    return q.ncall(mkdirp, null, path.dirname(resultFile)).then(function() {
        var fileContents = JSON.stringify(taskResult, null, 4);
        return q.ninvoke(fs, "writeFile", resultFile, fileContents);
    });
}

function find(array, predicate) {
    for (var i = 0; i < array.length; i += 1) {
        if (predicate(array[i])) {
            return array[i];
        }
    }
}

function numberComparator(first, second) {
    if (first < second) {
        return -1;
    } else if (first > second) {
        return 1;
    } else {
        return 0;
    }
}
