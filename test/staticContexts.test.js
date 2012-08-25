var q = require("q");

var staticContexts = require("../lib/staticContexts");
var templating = require("../lib/templating");

exports["include function renders referenced template"] = function(test) {
    var reader = createReader({
        page: "{#include nav /} <h1>Store</h1>",
        nav: '<a href="/">Home</a>'
    });
    
    var templates = new templating.Templates(reader, staticContexts.create);
    templates.render("page", {})
        .then(function(output) {
            test.equal('<a href="/">Home</a> <h1>Store</h1>', output);
            test.done();
        }).end();
};

exports["include function creates empty context for included template"] = function(test) {
    var reader = createReader({
        page: "{#include nav /} <h1>Store</h1>",
        nav: '<a href="/">{name}</a>'
    });
    
    var templates = new templating.Templates(reader, staticContexts.create);
    templates.render("page", {name: "Home"})
        .then(function(output) {
            test.equal('<a href="/"></a> <h1>Store</h1>', output);
            test.done();
        }).end();
};

exports["include function can use context set by named argument"] = function(test) {
    var reader = createReader({
        page: "{#include nav context=project /} <h1>Store</h1>",
        nav: '<a href="/">{name}</a>'
    });
    
    var templates = new templating.Templates(reader, staticContexts.create);
    templates.render("page", {project: {name: "Home"}})
        .then(function(output) {
            test.equal('<a href="/">Home</a> <h1>Store</h1>', output);
            test.done();
        }).end();
};
function createReader(templates) {
    return {
        read: function(name) {
            return q.when(templates[name]);
        }
    };
}
