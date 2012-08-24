var parser = require("./parser");

// TODO: Let each rendering function optionally also define a function that
// optionally defines an identifier for that section. In the browser, you
// can store the current state of the page by storing each section's identifier
// (if it supports identifiers). When loading a different page, we generate
// the identifiers for each section. If the identifier is the same, we don't
// need to re-render, if the identifier is different, then re-render (and recurse)

exports.compileString = compileString;

function compileString(source, staticContext) {
    var nodes = parser.parse(source);
    return compileNodes(nodes, staticContext);
}

function compileNodes(nodes, staticContext) {
    var parts = nodes.map(nodeToPart.bind(null, staticContext || {}));
    return new Template(parts);
}

function nodeToPart(staticContext, node) {
    return nodeToPart[node.type](staticContext, node);
}

nodeToPart.literal = function(staticContext, node) {
    return function(context) {
        return node.value;
    };
};

nodeToPart.keyTag = function(staticContext, node) {
    return function(context) {
        return context[node.value];
    };
};

nodeToPart.functionTag = function(staticContext, node) {
    var body = compileNodes(node.body || [], staticContext);
    return staticContext[node.name](node.args, body);
};

function Template(parts) {
    this._parts = parts;
};

Template.prototype.render = function(context) {
    return this._parts.map(applyPartToContext(context)).join("");
};

function applyPartToContext(context) {
    return function(part) {
        return part(context);
    };
}
