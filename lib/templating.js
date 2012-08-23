var tokeniser = require("./tokeniser");

exports.compileString = compileString;

function compileString(source, staticContext) {
    var tokens = tokeniser.tokenise(source);
    var parts = tokens.map(tokenToPart.bind(null, staticContext || {}));
    return new Template(parts);
}

function tokenToPart(staticContext, token) {
    return tokenToPart[token.type](staticContext, token);
}

tokenToPart.literal = function(staticContext, token) {
    return function(context) {
        return token.value;
    };
};

tokenToPart.keyTag = function(staticContext, token) {
    return function(context) {
        return context[token.value];
    };
};

tokenToPart.functionTag = function(staticContext, token) {
    return staticContext[token.name](token.args);
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
