var path = require("path");

var q = require("q");

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
        return fs.mkdirp(rootForTaskRun(task, runNumber)).then(function() {
            return new RunLogsForRun(fs, task, runNumber);
        });
    });
};

RunLogsForTask.prototype._nextRunNumber = function() {
    return this._getRunNumbers().then(function(runNumbers) {
        var lastRunNumber = Math.max.apply(Math, runNumbers);
        return lastRunNumber >= 0 ? lastRunNumber + 1 : 1;
    });
};

RunLogsForTask.prototype._getRunsByRunNumbers = function(runNumbers) {
    return q.all(runNumbers.map(this._fetchLogByRunNumber.bind(this)));
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
                runNumbers.sort(comparators.reverse(comparators.number));
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
    
    return q.all([
        this._readIfExists(this._runResultFile()),
        this._readIfExists(this._outputFile())
    ]).spread(function(resultContents, output) {
        var result = resultContents === null ? {} : JSON.parse(resultContents);
        result.output = output || "";
        result.runNumber = runNumber;
        return result;
    });
};

RunLogsForRun.prototype.logResult = function(runResult) {
    var resultFile = this._runResultFile();
    var fileContents = JSON.stringify(runResult, null, 4);
    return this._fs.writeFile(resultFile, fileContents);
};

RunLogsForRun.prototype.logOutput = function(output) {
    var self = this;
    return this._fs.appendFile(this._outputFile(), output).then(function() {
        return self;
    });
};

RunLogsForRun.prototype._runResultFile = function() {
    return path.join(this._root(), "result.json");
};

RunLogsForRun.prototype._outputFile = function() {
    return path.join(this._root(), "output");
};

RunLogsForRun.prototype._root = function() {
    return rootForTaskRun(this._task, this._runNumber);
};

RunLogsForRun.prototype._readIfExists = function(filePath) {
    var fs = this._fs;
    return fs.exists(filePath).then(function(exists) {
        if (exists) {
            return fs.readFile(filePath, "utf8");
        } else {
            return null;
        }
    });
};

function runsRootForTask(task) {
    return path.join(task.root, "runs");
}

function rootForTaskRun(task, runNumber) {
    return path.join(runsRootForTask(task), runNumber.toString());
}
