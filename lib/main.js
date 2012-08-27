var connect = require("connect");
var http = require("http");
var fs = require("fs");
var path = require("path");

var q = require("q");
var snook = require("snook");

var tasks = require("./tasks");
var templates = require("./templates");

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
    } else {
        next();
    }
}

var taskConfigs = [
    {
        id: 1,
        name: "Checkout: node-option",
        template: "checkout",
        uri: "git+file:///home/mick/Programming/Shed/js/options"
    },
    {
        id: 2,
        name: "Run tests: node-option",
        dependencies: [{
            taskId: 3
        }],
        template: "exec",
        command: "npm install; make test"
    },
    {
        id: 3,
        name: "Checkout: node-option",
        template: "execTask",
        command: "checkout",
        env: {
            uri: "git+file:///home/mick/Programming/Shed/js/options"
        }
    }
];

var allTasks = taskConfigs.map(tasks.readConfig.bind(tasks, templates));

function renderFrontPage(url, response) {
    var context = {currentUrl: url};
    templates.render("front-page.html", context).then(function(result) {
        response.writeHead(200, {"content-type": "text/html"});
        response.end(result);
    }).fail(respond500(response));
}

function renderTaskPage(taskId, url, response) {
    var task = findTaskById(parseInt(taskId, 10));
    task.run().then(function(taskResult) {
        var context = {currentUrl: url, task: task, taskResult: taskResult};
        templates.render("task.html", context).then(function(result) {
            response.writeHead(200, {"content-type": "text/html"});
            response.end(result);
        });
        return null;
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
        response.writeHead(500, {"content-type": "text/plain"});
        response.end(err.stack);
    };
}

var currentUrlKey = "currentUrl";

var widgets = {
    "widgets/main-navigation.html": function(args) {
        return function(context) {
            var links = generateLinks();
            links.forEach(function(link) {
                if (link.url === context.get(currentUrlKey)) {
                    link.active = true;
                }
            });
            return {links: links};
        };
    }
};

function generateLinks() {
    return [generateOverviewLink(), {header: "Tasks"}].concat(generateTaskLinks());
}

function generateOverviewLink() {
    return {url: "/", title: "Overview"};
}

function generateTaskLinks() {
    return allTasks.map(function(task) {
        return {url: "/task/" + task.id, title: task.name};
    });
}

function getActiveTaskId(args, context) {
    if (args.task === undefined) {
        return null;
    }
    var task = context.get(args.task);
    if (task.hasOwnProperty("id")) {
        return task.id;
    } else {
        return parseInt(context.get(args.task), 10);
    }
}

var staticContext = copy(snook.functionTags.defaults);
staticContext.widget = function(templates) {
    return function(args, bodies) {
        var widgetName = args[0];
        var contextBuilder = widgets[widgetName](args);
        return function(context) {
            return templates.get(widgetName).then(function(template) {
                var widgetContext = contextBuilder(context);
                return template.render(widgetContext);
            });
        };
    };
};

var templates = createTemplates(__dirname + "/../templates");

function createTemplates(root) {
    return new snook.Templates(
        new snook.FileTemplateReader(root),
        staticContext
    );
}

function copy(obj) {
    var copy = {};
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            copy[key] = obj[key];
        }
    }
    return copy;
}
