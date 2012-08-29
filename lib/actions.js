var path = require("path");
var child_process = require("child_process");
var fs = require("fs");

var q = require("q");
var mkdirp = require("mkdirp");

var sourceControl = require("./source-control");
var files = require("./files");

var root = "/tmp/babbs";

exports.checkout = function(workspace, args) {
    return {
        run: runCheckout.bind(null, workspace, args),
        exportToDependent: exportCheckout.bind(null, workspace, args)
    };
};

function runCheckout(workspace, args) {
    var uri = args.uri;
    
    function fetchRepository() {
        var deferred = q.defer();
        
        var fetcher = sourceControl.fetchRepository(uri, path.join(workspace, "checkout"));
        
        var output = [];
        fetcher.on("output", function(outputChunk) {
            output.push(outputChunk);
        });
        
        fetcher.on("error", function(err) {
            deferred.reject(err);
        });
        
        fetcher.on("end", function() {
            deferred.resolve({
                output: output.join(""),
                success: true
            });
        });
        
        return deferred.promise;
    }
    
    return fetchRepository();
}

function exportCheckout(workspace, args, dependentWorkspace) {
    var source = path.join(workspace, "checkout");
    return q.ncall(mkdirp, null, path.dirname(dependentWorkspace))
        .then(function() {
            return files.copyRecursive({
                sourceDirectory: source,
                targetDirectory: dependentWorkspace
            });
        });
}

var taskDirectory = "tasks";

exports.execTask = function(workspace, args) {
    return {
        run: runExecTask.bind(null, workspace, args)
    };
};

function runExecTask(workspace, args) {
    var command = path.resolve(path.join(taskDirectory, args.command));
    
    function tryExecuteCommand() {
        return verifyIsSuitableScript(command)
            .then(function() {
                return executeCommand(command, {
                    cwd: workspace,
                    env: createEnv()
                });
            })
            .fail(function(err) {
                var message = err.stack;
                return q.resolve({
                    success: false,
                    output: message
                });
            });
    }
    
    function createEnv() {
        var env = Object.create(process.env);
        env.workspace = workspace;
        var configEnv = args.env;
        for (var key in configEnv) {
            if (Object.prototype.hasOwnProperty.call(configEnv, key)) {
                env[key] = configEnv[key];
            }
        }
        return env;
    }
    
    return tryExecuteCommand();
}

exports.exec = function(workspace, args) {
    return {
        run: runExec.bind(null, workspace, args)
    };
};

function runExec(workspace, args) {
    return executeCommand(args.command, {
        cwd: workspace
    });
}
    
function executeCommand(command, options) {
    var deferred = q.defer();
    var output = [];
    output.push("$ " + command + "\n");
    var subProcess = child_process.exec(command, options);
    
    subProcess.stdout.on("data", function(outputChunk) {
        output.push(outputChunk.toString());
    });
    subProcess.stderr.on("data", function(outputChunk) {
        output.push(outputChunk.toString());
    });
    
    subProcess.on("error", function(err) {
        output.push("\n===== error =====\n");
        output.push(err.stack);
        deferred.resolve({
            success: false,
            output: output.join("")
        });
    });
    
    subProcess.on("exit", function(code) {
        // Use nextTick since stderr might be written to immediately after
        // exit
        process.nextTick(function() {
            deferred.resolve({
                success: code === 0,
                output: output.join("")
            });
        });
    });
    
    return deferred.promise;
}

function verifyIsSuitableScript(path) {
    return verifyScriptExists(path).then(verifyScriptIsExecutable);
}

function verifyScriptIsExecutable(path) {
    // TODO: actually check the script is executable
    return true;
}

function verifyScriptExists(path) {
    return fileExists(path).then(function(exists) {
        if (exists) {
            return path;
        } else {
            return q.reject(new Error("Task script not found: " + command));
        }
    });
}

function fileExists(path) {
    var deferred = q.defer();
    
    fs.exists(path, function(exists) {
        deferred.resolve(exists);
    });
    
    return deferred.promise;
}
