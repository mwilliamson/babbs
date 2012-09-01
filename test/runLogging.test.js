var path = require("path");

var _ = require("underscore");
var q = require("q");

var runLogging = require("../lib/runLogging.js");

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
    var task = {
        id: "lop-tests",
        root: "/lop-tests"
    };
    runLogger.forTask(task).forRunNumber(42).fetch().then(function(result) {
        test.deepEqual({success: true, runNumber: 42}, result);
        test.done();
    }).end();
};

exports["allRuns is empty if run directory does not exist"] = function(test) {
    var fs = createFs({});
    var runLogger = runLogging.create(fs);
    var task = {
        id: "lop-tests",
        root: "/lop-tests"
    };
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
    var task = {
        id: "lop-tests",
        root: "/lop-tests"
    };
    runLogger.forTask(task).allRuns().then(function(runs) {
        var expected = [
            {runNumber: 2, success: false},
            {runNumber: 1, success: true}
        ];
        test.deepEqual(expected, runs);
        test.done();
    }).end();
};

function createFs(files) {
    function navigateTo(filePath) {
        if (!/^\//.test(filePath)) {
            return q.reject(new Error("Path must be absolute"));
        }
        var normalFilePath = path.normalize(filePath);
        var parts = normalFilePath.substring(1).split("/");
        return navigateToInner(files, parts);
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
    
    return {
        readFile: function(filePath) {
            return navigateTo(filePath).then(function(file) {
                if (_.isString(file)) {
                    return q.resolve(file);
                } else {
                    return q.reject(filePath + " is not a file");
                }
            });
        },
        readdir: function(dirPath) {
            return navigateTo(dirPath).then(function(file) {
                if (_.isString(file)) {
                    return q.reject(new Error(dirPath + " is not directory"));
                } else {
                    return q.resolve(_.keys(file));
                }
            });
        },
        exists: function(filePath) {
            return navigateTo(filePath).then(constant(true)).fail(constant(false));
        }
    };
}

function constant(value) {
    return function() {
        return value;
    };
}
