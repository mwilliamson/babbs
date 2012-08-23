exports.tokenise = tokenise;
exports.literal = literal;
exports.tag = tag;


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
    return parts;
}

function literal(value) {
    return {
        type: "literal",
        value: value
    };
}

function tag(value) {
    return {
        type: "tag",
        value: value
    };
}
