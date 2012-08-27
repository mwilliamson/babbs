var path = require("path");
var child_process = require("child_process");
var fs = require("fs");

var q = require("q");
var mkdirp = require("mkdirp");

var sourceControl = require("./source-control");

exports.checkout = checkout;
exports.execTask = execTask;
exports.exec = exec;

var root = "/tmp/babbs";

function checkout(options) {
    var id = options.id;
    var name = options.name;
    var uri = options.uri;
    
    var workspace = workspacePath(id);
    
    function createDirectories() {
        return q.ncall(mkdirp, null, path.dirname(workspace));
    }
    
    function fetchRepository() {
        var deferred = q.defer();
        
        var fetcher = sourceControl.fetchRepository(uri, workspace);
        
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
    
    function run() {
        return createDirectories().then(fetchRepository);
    }
    
    return {
        id: id,
        name: "Checkout: " + name,
        description: "Checkout: " + uri,
        run: run
    };
}

var taskDirectory = "tasks";

function execTask(options) {
    var id = options.id;
    var name = options.name;
    var workspace = workspacePath(id);

    function run() {
        return createWorkspace().then(tryExecuteCommand);
    }

    function createWorkspace() {
        return q.ncall(mkdirp, null, workspace);
    }
    
    var command = path.resolve(path.join(taskDirectory, options.command));
    
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
        for (var key in options.env) {
            if (Object.prototype.hasOwnProperty.call(options.env, key)) {
                env[key] = options.env[key];
            }
        }
        return env;
    }
    
    return {
        id: id,
        name: "Exec " + options.command + ": " + name,
        description: "Execute some command",
        run: run
    };
}

function exec(options) {
    var dependencies = options.dependencies;
    
    var workspace = workspacePath(options.id);
    
    function run() {
        return q.all(dependencies.map(fetchDependency))
            .then(runCommand);
    }
    
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
    
    function runCommand() {
        return executeCommand(options.command, {
            cwd: workspace
        });
    }
    
    return {
        id: options.id,
        name: options.name,
        run: run
    };
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

function workspacePath(taskId) {
    return path.join(root, taskId.toString(), "workspace");
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
