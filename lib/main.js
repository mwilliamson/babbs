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
    return new snook.Templates(new snook.FileTemplateReader(root), snook.createStaticContext);
}
