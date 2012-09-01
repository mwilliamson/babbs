var path = require("path");

var q = require("q");

var runLogging = require("../lib/runLogging.js");

exports["allRuns is empty if run directory does not exist"] = function(test) {
    var fs = createFs({});
    var runLogger = runLogging.create(fs);
    var task = {id: "lop-tests"};
    runLogger.forTask(task).allRuns().then(function(runs) {
        test.deepEqual([], runs);
        test.done();
    }).end();
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
    var task = {
        id: "lop-tests",
        root: "/lop-tests"
    };
    runLogger.forTask(task).forRunNumber(42).fetch().then(function(result) {
        test.deepEqual({success: true, runNumber: 42}, result);
        test.done();
    }).end();
};

function createFs(files) {
    return {
        readFile: function(filePath) {
            if (!/^\//.test(filePath)) {
                return q.reject(new Error("Path must be absolute"));
            }
            var normalFilePath = path.normalize(filePath);
            var parts = normalFilePath.substring(1).split("/");
            var current = files;
            for (var i = 0; i < parts.length; i += 1) {
                current = (current || {})[parts[i]];
            }
            if (current === undefined) {
                return q.reject(new Error("No such file: " + filePath));
            } else {
                return q.resolve(current);
            }
        },
        readdir: function(dirPath) {
            var normalDirPath = path.normalize(dirPath);
            var parts = normalDirPath.split("/");
            return q.reject(new Error("No such directory"));
        },
        exists: function(filePath) {
            return q.resolve(false);
        }
    };
}
