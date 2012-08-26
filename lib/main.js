var connect = require("connect");
var http = require("http");
var fs = require("fs");
var path = require("path");

var q = require("q");
var snook = require("snook");

var app = connect()
    .use(connect.static("static"))
    .use(mainHandler);

http.createServer(app).listen(3000);

function mainHandler(request, response, next) {
    var urlResult;
    if (request.url === "/") {
        renderFrontPage(response);
    } else if ((urlResult = /^\/task\/([^\/])$/.exec(request.url)) !== null) {
        renderTaskPage(urlResult[1], response);
    } else {
        next();
    }
}

var allTasks = [
    {id: 1, name: "Checkout: node-option"},
    {id: 2, name: "Run tests: node-option"}
];

function renderFrontPage(response) {
    var templates = createTemplates(__dirname + "/../templates");
    templates.render("front-page.html", {}).then(function(result) {
        response.writeHead(200, {"content-type": "text/html"});
        response.end(result);
    }).fail(respond500(response));
}

function renderTaskPage(taskId, response) {
    var templates = createTemplates(__dirname + "/../templates");
    templates.render("task.html", {task: taskId}).then(function(result) {
        response.writeHead(200, {"content-type": "text/html"});
        response.end(result);
    }).fail(respond500(response));
}

function respond500(response) {
    return function(err) {
        response.writeHead(500, {"content-type": "text/plain"});
        response.end(err.stack);
    };
}

var widgets = {
    "widgets/main-navigation.html": function(args) {
        return function(context) {
            var activeTask = args.task && parseInt(context.get(args.task), 10);
            var tasks = allTasks.map(function(task) {
                var taskView = Object.create(task);
                taskView.active = task.id === activeTask;
                return taskView;
            });
            return {tasks: tasks};
        };
    }
};

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
