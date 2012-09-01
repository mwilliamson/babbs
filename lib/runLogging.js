var path = require("path");

var q = require("q");
var mkdirp = require("mkdirp");

var comparators = require("./comparators");

exports.create = create;

function create(fs) {
    return new RunLogs(fs || require("./fs"));
}

function RunLogs(fs) {
    this._fs = fs;
}

RunLogs.prototype.forTask = function(task) {
    return new RunLogsForTask(this._fs, task);
};

function RunLogsForTask(fs, task) {
    this._fs = fs;
    this._task = task;
}

RunLogsForTask.prototype.forRunNumber = function(runNumber) {
    return new RunLogsForRun(this._fs, this._task, runNumber);
};

RunLogsForTask.prototype.allRuns = function() {
    return this._getRunNumbers()
        .then(this._getRunsByRunNumbers.bind(this));
};

RunLogsForTask.prototype.forNextRun = function() {
    var fs = this._fs;
    var task = this._task;
    return this._nextRunNumber().then(function(runNumber) {
        return new RunLogsForRun(fs, task, runNumber);
    });
};

RunLogsForTask.prototype._nextRunNumber = function() {
    return this._getRunNumbers().then(function(runNumbers) {
        var lastRunNumber = Math.max.apply(Math, runNumbers);
        return lastRunNumber >= 0 ? lastRunNumber + 1 : 1;
    });
};

RunLogsForTask.prototype._getRunsByRunNumbers = function(runNumbers) {
    var descendingRunNumbers = runNumbers.slice(0);
    descendingRunNumbers.sort(comparators.reverse(comparators.number));
    return q.all(descendingRunNumbers.map(this._fetchLogByRunNumber.bind(this)));
};

RunLogsForTask.prototype._fetchLogByRunNumber = function(runNumber) {
    return this.forRunNumber(runNumber).fetch();
};

RunLogsForTask.prototype._getRunNumbers = function() {
    var fs = this._fs;
    var root = runsRootForTask(this._task);
    return this._fs.exists(root).then(function(exists) {
        if (exists) {
            return fs.readdir(root).then(function(files) {
                var runNumbers = files.map(parseDecimal);
                runNumbers.sort(comparators.number);
                return runNumbers;
            });
        } else {
            return [];
        }
    });
};

function parseDecimal(string) {
    return parseInt(string, 10);
}

function RunLogsForRun(fs, task, runNumber) {
    this._fs = fs;
    this._task = task;
    this._runNumber = runNumber;
}

RunLogsForRun.prototype.fetch = function() {
    var runNumber = this._runNumber;
    return this._fs.readFile(this._runResultFile(this._runNumber))
        .then(JSON.parse.bind(JSON))
        .then(function(result) {
            result.runNumber = runNumber;
            return result;
        });
};

RunLogsForRun.prototype.logResult = function(runResult) {
    var fs = this._fs;
    var resultFile = this._runResultFile(this._runNumber);
    return q.ncall(mkdirp, null, path.dirname(resultFile)).then(function() {
        var fileContents = JSON.stringify(runResult, null, 4);
        return fs.writeFile(resultFile, fileContents);
    });
};

RunLogsForRun.prototype._runResultFile = function() {
    var root = runsRootForTask(this._task);
    return path.join(root, this._runNumber.toString(), "result.json");
};

function runsRootForTask(task) {
    return path.join(task.root, "runs");
}
