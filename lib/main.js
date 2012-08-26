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
    if (request.url === "/") {
        renderFrontPage(response);
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
    }).fail(function(err) {
        response.writeHead(500, {"content-type": "text/plain"});
        response.end(err.stack);
    });
}

var widgets = {
    "main-navigation": function() {
        return {tasks: allTasks};
    }
};

var staticContext = copy(snook.functionTags.defaults);
staticContext.widget = function(templates) {
    return function(args, bodies) {
        var widgetName = args[0];
        var widgetTemplateName = "widgets/" + widgetName + ".html";
        return function(context) {
            return templates.get(widgetTemplateName).then(function(template) {
                return template.render(widgets[widgetName]());
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
