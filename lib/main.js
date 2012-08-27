var connect = require("connect");
var http = require("http");
var fs = require("fs");
var path = require("path");

var q = require("q");

var tasks = require("./tasks");
var actions = require("./actions");
var templating = require("./templating");

var app = connect()
    .use(connect.static("static"))
    .use(mainHandler);

http.createServer(app).listen(3000);

function mainHandler(request, response, next) {
    var urlResult;
    if (request.url === "/") {
        renderFrontPage(request.url, response);
    } else if ((urlResult = /^\/task\/([^\/])$/.exec(request.url)) !== null) {
        renderTaskPage(urlResult[1], request.url, response);
    } else if ((urlResult = /^\/task\/([^\/])\/runs\/([0-9]+)$/.exec(request.url)) !== null) {
        renderTaskRunPage(urlResult[1], urlResult[2], request.url, response);
    } else if ((urlResult = /^\/task\/([^\/])\/force-run$/.exec(request.url)) !== null) {
        renderRunTaskPage(urlResult[1], request.url, response);
    } else {
        next();
    }
}

var taskConfigs = [
    {
        id: 1,
        name: "Checkout: node-option",
        action: {
            name: "checkout",
            uri: "git+file:///home/mick/Programming/Shed/js/options"
        }
    },
    {
        id: 2,
        name: "Run tests: node-option",
        dependencies: [{
            taskId: 1
        }],
        action: {
            name: "exec",
            command: "npm install; make test"
        }
    },
    {
        id: 3,
        name: "Checkout: node-option",
        action: {
            name: "execTask",
            command: "checkout",
            env: {
                uri: "git+file:///home/mick/Programming/Shed/js/options"
            }
        }
    }
];

var allTasks = tasks.readConfigs(actions, taskConfigs);
var templates = templating.create(allTasks);

function renderFrontPage(url, response) {
    var context = {currentUrl: url};
    templates.render("front-page.html", context).then(function(result) {
        response.writeHead(200, {"content-type": "text/html;charset=utf-8"});
        response.end(result);
    }).fail(respond500(response));
}

function renderTaskPage(taskId, url, response) {
    var task = findTaskById(parseInt(taskId, 10));
    return task.runs().then(function(runs) {
        var context = {currentUrl: url, task: task, runs: runs};
        return templates.render("task-index.html", context).then(function(result) {
            response.writeHead(200, {"content-type": "text/html;charset=utf-8"});
            response.end(result);
        });
    }).fail(respond500(response));
}

function renderTaskRunPage(taskId, runNumber, url, response) {
    var task = findTaskById(parseInt(taskId, 10));
    return task.getRun(runNumber).then(function(run) {
        var context = {currentUrl: url, task: task, run: run};
        return templates.render("task-run.html", context).then(function(result) {
            response.writeHead(200, {"content-type": "text/html;charset=utf-8"});
            response.end(result);
        });
    }).fail(respond500(response));
}

function renderRunTaskPage(taskId, url, response) {
    var task = findTaskById(parseInt(taskId, 10));
    task.startRun().then(function(taskResult) {
        var context = {currentUrl: url, task: task, taskResult: taskResult};
        return templates.render("task-force-run.html", context).then(function(result) {
            response.writeHead(200, {"content-type": "text/html;charset=utf-8"});
            response.end(result);
        });
    }).fail(respond500(response));
}

function findTaskById(taskId) {
    for (var i = 0; i < allTasks.length; i += 1) {
        if (allTasks[i].id === taskId) {
            return allTasks[i];
        }
    }
}

function respond500(response) {
    return function(err) {
        response.writeHead(500, {"content-type": "text/plain;charset=utf-8"});
        response.end(err.stack);
    };
}
