exports.tokenise = tokenise;
exports.literal = literal;
exports.keyTag = keyTag;
exports.functionTag = functionTag;


function tokenise(source) {
    var tagRegex = /\{([^}]*)\}/g;
    var result;
    var start = 0;
    
    var parts = [];
    
    while ((result = tagRegex.exec(source)) !== null) {
        parts.push(literal(source.substring(start, result.index)));
        parts.push(tag(result[1]));
        start = tagRegex.lastIndex;
    }
    parts.push(literal(source.substring(start)));
    return parts.filter(function(part) {
        return part.type !== "literal" || part.value !== "";
    });
}

function literal(value) {
    return {
        type: "literal",
        value: value
    };
}

function tag(value) {
    if (value.substring(0, 1) === "#") {
        var parts = value.split(/\s/);
        return functionTag(parts[0].substring(1), parts.slice(1, parts.length - 1));
    } else {
        return keyTag(value);
    }
}

function keyTag(value) {
    return {
        type: "keyTag",
        value: value
    };
}

function functionTag(name, args) {
    return {
        type: "functionTag",
        name: name,
        args: args
    };
}
