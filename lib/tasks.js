var path = require("path");
var child_process = require("child_process");
var fs = require("fs");

var q = require("q");
var mkdirp = require("mkdirp");

exports.readConfig = readConfig;

var root = "/tmp/babbs";

function readConfig(templates, config) {
    var self = {
        id: config.id,
        name: config.name,
        run: runTask.bind(null, templates, config)
    }
    return self;
}

function runTask(templates, taskConfig) {
    var dependencies = (taskConfig.dependencies || []);
    var workspace = workspacePath(taskConfig.id);
    
    var templateInstance = templates[taskConfig.template](taskConfig);
    
    return q.all([findTaskNumber(taskConfig.id), q.all(dependencies.map(fetchDependency)), templateInstance.run()])
        .spread(function(taskNumber, _, taskResult) {
            return saveTaskResult(taskConfig.id, taskNumber, taskResult).then(function() {
                return taskResult;
            });
        });

    function fetchDependency(dependency) {
        var dependencyWorkspace = workspacePath(dependency.taskId);
        // TODO: take out hardcoded checkout
        var source = path.join(dependencyWorkspace, "checkout");
        return q.ncall(mkdirp, null, path.dirname(workspace))
            .then(function() {
                return copyRecursive({
                    sourceDirectory: source,
                    targetDirectory: workspace
                });
            });
    }
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

function workspacePath(taskId) {
    return path.join(taskPath(taskId), "workspace");
}

function taskPath(taskId) {
    return path.join(root, taskId.toString());
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

