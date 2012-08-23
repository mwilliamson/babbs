exports.tokenise = tokenise;
exports.literal = literal;
exports.keyTag = keyTag;


function tokenise(source) {
    var tagRegex = /\{([^}]*)\}/g;
    var result;
    var start = 0;
    
    var parts = [];
    
    while ((result = tagRegex.exec(source)) !== null) {
        parts.push(literal(source.substring(start, result.index)));
        parts.push(keyTag(result[1]));
        start = tagRegex.lastIndex;
    }
    parts.push(literal(source.substring(start)));
    return parts;
}

function literal(value) {
    return {
        type: "literal",
        value: value
    };
}

function keyTag(value) {
    return {
        type: "keyTag",
        value: value
    };
}
