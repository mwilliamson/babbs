var fs = require("fs");
var path = require("path");

var q = require("q");
var mkdirp = require("mkdirp");

var comparators = require("./comparators");

exports.create = create;

function create() {
    return new RunLogs();
}

function RunLogs() {
    
}

RunLogs.prototype.forTask = function(task) {
    return new RunLogsForTask(task);
};

function RunLogsForTask(task) {
    this._task = task;
}

RunLogsForTask.prototype.fetchLogByRunNumber = function(runNumber) {
    return q.ninvoke(fs, "readFile", this._runResultFile(runNumber))
        .then(JSON.parse.bind(JSON));
};

RunLogsForTask.prototype.allRuns = function() {
    return this._getRunNumbers()
        .then(this._getRunsByRunNumbers.bind(this));
};

RunLogsForTask.prototype.saveRunResult = function(runResult) {
    var resultFile = this._runResultFile(runResult.runNumber);
    return q.ncall(mkdirp, null, path.dirname(resultFile)).then(function() {
        var fileContents = JSON.stringify(runResult, null, 4);
        return q.ninvoke(fs, "writeFile", resultFile, fileContents);
    });
};

RunLogsForTask.prototype.nextRunNumber = function() {
    return this._getRunNumbers().then(function(runNumbers) {
        var lastRunNumber = Math.max.apply(Math, runNumbers);
        return lastRunNumber >= 0 ? lastRunNumber + 1 : 1;
    });
};

RunLogsForTask.prototype._getRunsByRunNumbers = function(runNumbers) {
    var descendingRunNumbers = runNumbers.slice(0);
    descendingRunNumbers.sort(comparators.reverse(comparators.number));
    return q.all(descendingRunNumbers.map(this.fetchLogByRunNumber.bind(this)));
};
RunLogsForTask.prototype._getRunNumbers = function() {
    return q.ninvoke(fs, "readdir", this._rootPath())
        .then(function(files) {
            var runNumbers = files.map(parseDecimal);
            runNumbers.sort(comparators.number);
            return runNumbers;
        })
        .fail(function(err) {
            console.error("Hit error, returning empty list of runs");
            console.error(err.stack);
            return [];
        });
};

function parseDecimal(string) {
    return parseInt(string, 10);
}

RunLogsForTask.prototype._rootPath = function() {
    return path.join(this._task.root, "runs");
};

RunLogsForTask.prototype._runResultFile = function(runNumber) {
    return path.join(this._rootPath(), runNumber.toString(), "result.json");
};

