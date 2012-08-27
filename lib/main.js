var connect = require("connect");
var http = require("http");
var fs = require("fs");
var path = require("path");

var q = require("q");
var snook = require("snook");
var dateformat = require("dateformat");

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

var allTasks = tasks.readConfigs(templates, taskConfigs);

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
staticContext.ansiColors = function(templates) {
    return function(args, bodies) {
        return function(context) {
            var input = context.get(args[0]);
            var output = [];
            var result;
            var ansiState = {};
            var regex = /\033\[(\d+)m/g;
            var position = 0;
            while ((result = regex.exec(input)) !== null) {
                output.push(ansiText(input.substring(position, result.index), ansiState));
                position = regex.lastIndex;
                updateAnsiState(ansiState, result[1]);
            }
            output.push(ansiText(input.substring(position), ansiState));
            return output.join("");
        };
    };
};

function ansiText(text, ansiState) {
    if (text) {
        var color = ansiState.color;
        return addBold(addColors(text, ansiState.color), ansiState.bold);
    } else {
        return text;
    }
}

function addColors(text, color) {
    var colors = {
        30: "rgb(0, 0, 0)", //black
        31: "rgb(205, 0, 0)", // red
        32: "rgb(0, 205, 0)", // green
        33: "rgb(205, 205, 0)", // yellow
        34: "rgb(0, 0, 238)", // blue
        35: "rgb(205, 0, 205)", // magenta
        36: "rgb(0, 205, 205)", // cyan
        37: "rgb(229, 229, 229)" // white
    };
    if (!color || !colors[color]) {
        return text;
    } else {
        return '<span style="color:' + colors[color] + '">' + text + '</span>'
    }
}

function addBold(text, bold) {
    if (bold) {
        return '<b>' + text + '</b>'
    } else {
        return text;
    }
}

function updateAnsiState(state, code) {
    code = parseInt(code, 10);
    if (code === 1) {
        state.bold = true;
    } else if (code === 22) {
        state.bold = false;
    } else if (code >= 30 && code <= 37) {
        state.color = code;
    } else if (code === 39) {
        state.color = null;
    } else {
        console.log(code);
    }
}

staticContext.formatDateTime = function(templates) {
    return function(args, bodies) {
        var variableName = args[0];
        return function(context) {
            var value = context.get(variableName);
            if (value) {
                return formatDateTime(value);
            } else {
                return "";
            }
        };
    };
};

function formatDateTime(value) {
    return dateformat(new Date(value), "dddd d mmmm yyyy, h:MM:ss TT");
}

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
