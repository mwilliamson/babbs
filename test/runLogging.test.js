var path = require("path");

var _ = require("underscore");
var q = require("q");
var fsInMemory = require("fs-in-memory");

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
    return fsInMemory.createPromised(files);
}
