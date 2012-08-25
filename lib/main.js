var connect = require("connect");
var http = require("http");
var fs = require("fs");
var path = require("path");

var q = require("q");

var templating = require("./templating");
var staticContexts = require("./staticContexts");

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

function createTemplates(root) {
    return new templating.Templates(new FileTemplateReader(root), staticContexts.create);
}

function FileTemplateReader(root) {
    this._root = root;
}

FileTemplateReader.prototype.read = function(name) {
    var templatePath = path.join(this._root, name);
    return q.ninvoke(fs, "readFile", templatePath, "utf8");
};
