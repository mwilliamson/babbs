var path = require("path");
var child_process = require("child_process");
var fs = require("fs");

var q = require("q");
var mkdirp = require("mkdirp");

exports.readConfigs = readConfigs;

var root = "/tmp/babbs";

function readConfigs(templates, configs) {
    return configs.map(readConfig.bind(null, templates))
}

function readConfig(templates, config) {
    var taskRoot = path.join(root, config.id.toString());
    var workspace = path.join(taskRoot, "workspace");
    
    function setUpNextRun() {
        var runsRoot = path.join(taskRoot, "runs");
        return q.ncall(mkdirp, null, runsRoot).then(function() {
            return q.ninvoke(fs, "readdir", runsRoot);
        }).then(function(files) {
            var lastTaskNumber = Math.max.apply(Math, files.map(function(file) {
                return parseInt(file, 10);
            }));
            var nextTaskNumber = lastTaskNumber >= 0 ? lastTaskNumber + 1 : 1;
            var runRoot = path.join(runsRoot, nextTaskNumber.toString());
            return q.ncall(mkdirp, null, runRoot).then(function() {
                return {
                    saveResult: saveTaskResult.bind(null, config.id, nextTaskNumber)
                };
            });
        });
    }
    
    var self = {
        id: config.id,
        name: config.name,
        startRun: function() {
            return setUpNextRun().then(function(run) {
                var dependencies = config.dependencies || [];
                return q.all(dependencies.map(fetchDependency.bind(null, self))).then(function() {
                    return templates[config.template](self).then(function(taskResult) {
                        return run.saveResult(taskResult).then(function() {
                            return taskResult;
                        });
                    });
                });
            });
        },
        root: taskRoot,
        workspace: workspace,
        config: config
    }
    
    return self;
}

function fetchDependency(task, dependency) {
    var dependencyWorkspace = workspacePath(dependency.taskId);
    // TODO: take out hardcoded checkout
    var source = path.join(dependencyWorkspace, "checkout");
    return q.ncall(mkdirp, null, path.dirname(task.workspace))
        .then(function() {
            return copyRecursive({
                sourceDirectory: source,
                targetDirectory: task.workspace
            });
        });
}

function findTaskNumber(taskId) {
    var taskRoot = taskPath(taskId);
    var runsRoot = path.join(taskRoot, "runs");
    return q.ncall(mkdirp, null, runsRoot).then(function() {
        return q.ninvoke(fs, "readdir", runsRoot);
    }).then(function(files) {
        var lastTaskNumber = Math.max.apply(Math, files.map(function(file) {
            return parseInt(file, 10);
        }));
        return lastTaskNumber >= 0 ? lastTaskNumber + 1 : 1;
    });
}

function saveTaskResult(taskId, taskNumber, taskResult) {
    var taskRoot = taskPath(taskId);
    var runsRoot = path.join(taskRoot, "runs");
    var resultFile = path.join(runsRoot, taskNumber.toString(), "result.json");
    return q.ncall(mkdirp, null, path.dirname(resultFile)).then(function() {
        var fileContents = JSON.stringify(taskResult, null, 4);
        return q.ninvoke(fs, "writeFile", resultFile, fileContents);
    });
}

function copyRecursive(options) {
    var source = ensureTrailingSlash(options.sourceDirectory) + ".";
    var target = options.targetDirectory;
    var deferred = q.defer();
    
    var subProcess = child_process.spawn("cp", ["-R", source, target]);
    subProcess.on("exit", function() {
        deferred.resolve();
    });
    
    return deferred.promise;
}


function ensureTrailingSlash(str) {
    if (str.charAt(str.length - 1) !== "/") {
        return str + "/";
    } else {
        return str;
    }
}



function workspacePath(taskId) {
    return path.join(taskPath(taskId), "workspace");
}

function taskPath(taskId) {
    return path.join(root, taskId.toString());
}
