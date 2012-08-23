exports.compileString = compileString;

function compileString(source) {
    return new Template(source);
}

function Template(source) {
    this._source = source;
};

Template.prototype.render = function() {
    return this._source;
};
