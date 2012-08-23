var tokeniser = require("./tokeniser");

exports.compileString = compileString;

function compileString(source) {
    var tokens = tokeniser.tokenise(source);
    var parts = tokens.map(tokenToPart);
    return new Template(parts);
}

function tokenToPart(token) {
    return tokenToPart[token.type](token);
}

tokenToPart.literal = function(token) {
    return function(context) {
        return token.value;
    };
};

tokenToPart.tag = function(token) {
    return function(context) {
        return context[token.value];
    };
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
