var path = require("path");

var _ = require("underscore");
var q = require("q");

var runLogging = require("../lib/runLogging.js");

var task = {
    id: "lop-tests",
    root: "/lop-tests"
};

exports["previous run results are read from file named as run number"] = function(test) {
    var fs = createFs({
        "lop-tests": {
            "runs": {
                "42": {
                    "result.json": JSON.stringify({success:true})
                }
            }
        }
    });
    var runLogger = runLogging.create(fs);
    runLogger.forTask(task).forRunNumber(42).fetch().then(function(result) {
        test.deepEqual({success: true, runNumber: 42}, result);
        test.done();
    }).end();
};

exports["allRuns is empty if run directory does not exist"] = function(test) {
    var fs = createFs({});
    var runLogger = runLogging.create(fs);
    runLogger.forTask(task).allRuns().then(function(runs) {
        test.deepEqual([], runs);
        test.done();
    }).end();
};

exports["allRuns reads runs from runs directory"] = function(test) {
    var fs = createFs({
        "lop-tests": {
            "runs": {
                "1": {
                    "result.json": JSON.stringify({success:true})
                },
                "2": {
                    "result.json": JSON.stringify({success: false})
                }
            }
        }
    });
    var runLogger = runLogging.create(fs);
    runLogger.forTask(task).allRuns().then(function(runs) {
        var expected = [
            {runNumber: 2, success: false},
            {runNumber: 1, success: true}
        ];
        test.deepEqual(expected, runs);
        test.done();
    }).end();
};

exports["next run result logs result to run number one if no previous run numbers"] = function(test) {
    var fs = createFs({});
    var runLogger = runLogging.create(fs);
    runLogger.forTask(task).forNextRun().then(function(logger) {
        return logger.logResult({success: true});
    }).then(function() {
        return runLogger.forTask(task).forRunNumber(1).fetch().then(function(result) {
            test.deepEqual({success: true, runNumber: 1}, result);
            test.done();
        });
    }).end();
};

function createFs(files) {
    function navigateTo(filePath) {
        return pathToParts(filePath).then(function(parts) {
            return navigateToInner(files, parts);
        });
    }
    
    function navigateToInner(current, filePathParts) {
        if (filePathParts.length === 0) {
            return q.resolve(current);
        } else if (_.isString(current)) {
            return q.reject(new Error("No such file"));
        } else {
            var next = current[filePathParts[0]];
            if (next) {
                return navigateToInner(next, filePathParts.slice(1));
            } else {
                return q.reject(new Error("No such file"));
            }
        }
    }
    
    function isFile(current) {
        return current && _.isString(current);
    }
    
    function isDirectory(current) {
        return current && !_.isString(current);
    }
    
    function pathToParts(filePath) {
        if (!/^\//.test(filePath)) {
            return q.reject(new Error("Path must be absolute"));
        }
        var normalFilePath = path.normalize(filePath);
        return q.resolve(normalFilePath.substring(1).split("/"));
    }
    
    function readFile(filePath) {
        return navigateTo(filePath).then(function(file) {
            if (isFile(file)) {
                return q.resolve(file);
            } else {
                return q.reject(filePath + " is not a file");
            }
        });
    }
    
    function readdir(dirPath) {
        return navigateTo(dirPath).then(function(file) {
            if (isFile(file)) {
                return q.reject(new Error(dirPath + " is not directory"));
            } else {
                return q.resolve(_.keys(file));
            }
        });
    }
    
    function exists(filePath) {
        return navigateTo(filePath).then(constant(true)).fail(constant(false));
    }
    
    function mkdirp(filePath) {
        return pathToParts(filePath).then(function(parts) {
            var current = files;
            for (var i = 0; i < parts.length; i += 1) {
                if (isDirectory(current)) {
                    current = current[parts[i]] = current[parts[i]] || {};
                } else {
                    return q.reject(new Error("/" + parts.slice(0, i).join("/") + " is not directory"));
                }
            }
            return q.resolve();
        });
    }
    
    function writeFile(filePath, contents) {
        var filename = path.basename(filePath);
        return navigateTo(path.dirname(filePath)).then(function(parent) {
            if (isDirectory(parent[filename])) {
                return q.reject(new Error(filePath + " is directory"));
            } else {
                parent[filename] = contents;
                return q.resolve();
            }
        });
    }
    
    return {
        readFile: readFile,
        readdir: readdir,
        exists: exists,
        mkdirp: mkdirp,
        writeFile: writeFile
    };
}

function constant(value) {
    return function() {
        return value;
    };
}
