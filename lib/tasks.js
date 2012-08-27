var path = require("path");
var child_process = require("child_process");
var fs = require("fs");

var q = require("q");
var mkdirp = require("mkdirp");

var sourceControl = require("./source-control");

exports.checkout = checkout;
exports.exec = exec;

var root = "/tmp/babbs";

function checkout(options) {
    var id = options.id;
    var name = options.name;
    var uri = options.uri;
    
    var workspace = path.join(root, id.toString(), "workspace");
    
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
                output: output.join("")
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

function exec(options) {
    var id = options.id;
    var name = options.name;
    var workspace = path.join(root, id.toString(), "workspace");

    function run() {
        return createWorkspace().then(tryExecuteCommand);
    }

    function createWorkspace() {
        return q.ncall(mkdirp, null, workspace);
    }
    
    var command = path.resolve(path.join(taskDirectory, options.command));
    
    function tryExecuteCommand() {
        return verifyIsSuitableScript(command)
            .then(executeCommand)
            .fail(function(err) {
                var message = err.message === "Bad argument" ?
                    err.message + " [is the script executable?]" :
                    err.message;
                return q.resolve({
                    success: false,
                    output: message
                });
            });
    }
    
    function executeCommand() {
        var deferred = q.defer();
        var subProcess = child_process.spawn(command, [], {
            cwd: workspace,
            env: createEnv()
        });
        
        var output = [];
        subProcess.stdout.on("data", function(outputChunk) {
            output.push(outputChunk.toString());
        });
        subProcess.stderr.on("data", function(outputChunk) {
            output.push(outputChunk.toString());
        });
        
        subProcess.on("error", function(err) {
            deferred.resolve({
                success: false,
                output: output.join("")
            });
        });
        
        subProcess.on("exit", function() {
            // Use nextTick since stderr might be written to immediately after
            // exit
            process.nextTick(function() {
                deferred.resolve({
                    success: true,
                    output: output.join("")
                });
            });
        });
        
        return deferred.promise;
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
