var path = require("path");
var fs = require("fs");
var child_process = require("child_process");
var util = require("util");
var events = require("events");

var mkdirp = require("mkdirp");

var gitUriPrefix = "git+";

exports.handlesUri = function(uri) {
    return uri.indexOf(gitUriPrefix) === 0;
};

exports.fetchRepository = fetchRepository;

function fetchRepository(uri, checkoutPath) {
    var eventEmitter = new events.EventEmitter();
    uri = uri.substring(gitUriPrefix.length);
    process.nextTick(function() {
        eventEmitter.emit("output", "# Checking if " + checkoutPath + " exists... ");
        fs.exists(checkoutPath, function(exists) {
            eventEmitter.emit("output", exists.toString() + "\n");
            if (exists) {
                updateExistingClone(checkoutPath, eventEmitter);
            } else {
                clone(uri, checkoutPath, eventEmitter);
            }
        });
    });
    return eventEmitter;
}

function updateExistingClone(checkoutPath, eventEmitter) {
    // TODO: should check it's a git repo (and the right git repo at that)
    gitRevision(eventEmitter, checkoutPath, function(err, originalRevision) {
        eventEmitter.emit("output", "# Current revision: " + originalRevision + "\n");
        verboseExec(eventEmitter, "git pull", {cwd: checkoutPath}, function(err, stdout, stderr) {
            gitRevision(eventEmitter, checkoutPath, function(err, currentRevision) {
                eventEmitter.emit("output", "# Current revision: " + originalRevision + "\n");
                eventEmitter.emit("end", {updated: originalRevision !== currentRevision});
            });
        });
    });
}

function clone(uri, checkoutPath, eventEmitter) {
    mkdirp(path.dirname(checkoutPath), function(err) {
        // TODO: handle err
        verboseExec(eventEmitter, util.format("git clone %s %s", uri, checkoutPath), function(err) {
            eventEmitter.emit("end", true);
        });
    });
}

function gitRevision(eventEmitter, path, callback) {
    verboseExec(eventEmitter, "git rev-parse HEAD", {cwd: path}, function(err, stdout, stderr) {
        var revision = trim(stdout);
        callback(err, revision);
    });
}

function verboseExec(eventEmitter, command) {
    eventEmitter.emit("output", "$ " + command + "\n");
    var process = child_process.exec.apply(child_process, Array.prototype.slice.call(arguments, 1));
    process.stdout.on("data", function(data) {
        eventEmitter.emit("output", data);
    });
    process.stderr.on("data", function(data) {
        eventEmitter.emit("output", data);
    });
    return process;
}

function trim(str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}
