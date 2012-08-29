var fs = require("fs");
var path = require("path");

var q = require("q");
var mkdirp = require("mkdirp");

var comparators = require("./comparators");

exports.create = create;

// TODO: this is really a repository for run *results*

function create() {
    return new RunRepository();
}

function RunRepository() {
    
}

RunRepository.prototype.forTask = function(task) {
    return new RunRepositoryForTask(task);
};

function RunRepositoryForTask(task) {
    this._task = task;
}

RunRepositoryForTask.prototype.runByRunNumber = function(runNumber) {
    return q.ninvoke(fs, "readFile", this._runResultFile(runNumber))
        .then(JSON.parse.bind(JSON));
};

RunRepositoryForTask.prototype.allRuns = function() {
    var task = this._task;
    return this._getRunNumbers()
        .then(this._getRunsByRunNumbers.bind(this))
        .fail(function(err) {
            console.error("Hit error, returning empty list of runs");
            console.error(err.stack);
            return [];
        });
};

RunRepositoryForTask.prototype.saveRunResult = function(runResult) {
    var resultFile = this._runResultFile(runResult.runNumber);
    return q.ncall(mkdirp, null, path.dirname(resultFile)).then(function() {
        var fileContents = JSON.stringify(runResult, null, 4);
        return q.ninvoke(fs, "writeFile", resultFile, fileContents);
    });
};

RunRepositoryForTask.prototype.nextRunNumber = function() {
    return this._getRunNumbers().then(function(runNumbers) {
        var lastRunNumber = Math.max.apply(Math, runNumbers);
        return lastRunNumber >= 0 ? lastRunNumber + 1 : 1;
    });
};

RunRepositoryForTask.prototype._getRunsByRunNumbers = function(runNumbers) {
    var descendingRunNumbers = runNumbers.slice(0);
    descendingRunNumbers.sort(comparators.reverse(comparators.number));
    return q.all(descendingRunNumbers.map(this.runByRunNumber.bind(this)));
};
RunRepositoryForTask.prototype._getRunNumbers = function() {
    return q.ninvoke(fs, "readdir", this._rootPath())
        .then(function(files) {
            var runNumbers = files.map(parseDecimal);
            runNumbers.sort(comparators.number);
            return runNumbers;
        });
};

function parseDecimal(string) {
    return parseInt(string, 10);
}

RunRepositoryForTask.prototype._rootPath = function() {
    // TODO: move generation of runsRoot into this module
    return this._task._runsRoot;
};

RunRepositoryForTask.prototype._runResultFile = function(runNumber) {
    return path.join(this._rootPath(), runNumber.toString(), "result.json");
};

