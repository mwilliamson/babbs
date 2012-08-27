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
}

Task.prototype.startRun = function() {
    var dependencies = this.dependencies;
    var template = this._template;
    var task = this;
    return this._setUpNextRun().then(function(run) {
        return q.all(dependencies.map(fetchDependency.bind(null, task))).then(function() {
            return template(task).then(function(taskResult) {
                return run.saveResult(taskResult).then(function() {
                    return taskResult;
                });
            });
        });
    });
};

Task.prototype._setUpNextRun = function() {
    var id = this.id;
    var runsRoot = path.join(this.root, "runs");
    return q.ncall(mkdirp, null, this.workspace).then(function() {
        return q.ncall(mkdirp, null, runsRoot);
    }).then(function() {
        return q.ninvoke(fs, "readdir", runsRoot);
    }).then(function(files) {
        var lastTaskNumber = Math.max.apply(Math, files.map(function(file) {
            return parseInt(file, 10);
        }));
        var taskNumber = lastTaskNumber >= 0 ? lastTaskNumber + 1 : 1;
        var runRoot = path.join(runsRoot, taskNumber.toString());
        return q.ncall(mkdirp, null, runRoot).then(function() {
            return {
                saveResult: saveTaskResult.bind(null, id, taskNumber)
            };
        });
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
    var runsRoot = path.join(task.root, "runs");
    var resultFile = path.join(runsRoot, taskNumber.toString(), "result.json");
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
