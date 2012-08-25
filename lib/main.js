var connect = require("connect");
var http = require("http");
var fs = require("fs");
var path = require("path");

var q = require("q");

var templating = require("./templating");

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
    var templates = new Templates(__dirname + "/../templates");
    templates.render("front-page.html", {}).then(function(result) {
        response.writeHead(200, {"content-type": "text/html"});
        response.end(result);
    }).fail(function(err) {
        response.writeHead(500, {"content-type": "text/plain"});
        response.end(err.stack);
    });
}

function Templates(root) {
    this._root = root;
}

Templates.prototype.get = function(name) {
    var templatePath = path.join(this._root, name);
    var staticContext = createStaticContext(this);
    return q.ninvoke(fs, "readFile", templatePath, "utf8")
        .then(function(templateSource) {
            return templating.compileString(templateSource, staticContext);
        })
};

Templates.prototype.render = function(name, context, callback) {
    return this.get(name).then(function(template) {
        return template.render(context);
    });
}

function createStaticContext(templates) {
    return {
        extend: function(args, bodies) {
            var baseName = args[0];
            return function(context) {
                return templates.get(baseName).then(function(template) {
                    var contextForBase = objectMapValues(bodies, function(key, body) {
                        return body.render(context);
                    });
                    return template.render(contextForBase);
                });
            };
        },
        
        hole: function(args, bodies) {
            var holeName = args[0];
            return function(context) {
                return context[holeName];
            }
        },
        
        include: function(args, bodies) {
            var includeName = args[0]
            return function(context) {
                return templates.get(includeName).then(function(template) {
                    return template.render(context);
                });
            };
        }
    };
}

function objectMapValues(obj, func) {
    var result = {};
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = func(key, obj[key]);
        }
    }
    return result;
};
