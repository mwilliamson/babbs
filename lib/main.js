var connect = require("connect");
var http = require("http");
var fs = require("fs");
var path = require("path");

var q = require("q");

var templating = require("./templating");
var taskRepositories = require("./taskRepositories");

var app = connect()
    .use(connect.static("static"))
    .use(mainHandler);

http.createServer(app).listen(3000);

function mainHandler(request, response, next) {
    var controller = getController(request);
    if (controller) {
        controller.then(function(controller) {
            return controller(response);
        }).fail(respond500(response));
    } else {
        next();
    }
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

function getController(request) {
    var urlResult;
    if (request.url === "/") {
        return renderFrontPage(request.url);
    } else if ((urlResult = /^\/task\/([^\/])$/.exec(request.url)) !== null) {
        return renderTaskPage(urlResult[1], request.url);
    } else if ((urlResult = /^\/task\/([^\/])\/runs\/([0-9]+)$/.exec(request.url)) !== null) {
        return renderTaskRunPage(urlResult[1], urlResult[2], request.url);
    } else if ((urlResult = /^\/task\/([^\/])\/force-run$/.exec(request.url)) !== null) {
        return renderRunTaskPage(urlResult[1], request.url);
    } else {
        return null;
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

var taskRepository = taskRepositories.fromJson(taskConfigs);
var templates = templating.create(taskRepository);

function renderFrontPage(url, response) {
    var context = {currentUrl: url};
    return renderTemplate("front-page.html", context);
}

function renderTaskPage(taskId, url, response) {
    var task = taskRepository.findTaskById(parseInt(taskId, 10));
    return task.runs().then(function(runs) {
        var context = {currentUrl: url, task: task, runs: runs};
        return renderTemplate("task-index.html", context);
    });
}

function renderTaskRunPage(taskId, runNumber, url, response) {
    var task = taskRepository.findTaskById(parseInt(taskId, 10));
    return task.getRun(runNumber).then(function(run) {
        var context = {currentUrl: url, task: task, run: run};
        return renderTemplate("task-run.html", context);
    });
}

function renderRunTaskPage(taskId, url, response) {
    var task = taskRepository.findTaskById(parseInt(taskId, 10));
    return task.startRun().then(function(taskResult) {
        var context = {currentUrl: url, task: task, taskResult: taskResult};
        return renderTemplate("task-force-run.html", context);
    });
}

function respond500(response) {
    return function(err) {
        response.writeHead(500, {"content-type": "text/plain;charset=utf-8"});
        response.end(err.stack);
    };
}

function renderTemplate(templateName, context) {
    return templates.render(templateName, context).then(function(result) {
        return function(response) {
            response.writeHead(200, {"content-type": "text/html;charset=utf-8"});
            response.end(result);
        };
    });
}

var shuttingDown = false;
process.on('SIGINT', function() {
    if (!shuttingDown) {
        shuttingDown = true;
        console.log("Shutting down...");
        process.exit();
    }
});
