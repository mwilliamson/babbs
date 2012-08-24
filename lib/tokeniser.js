exports.tokenise = tokenise;
exports.literal = literal;
exports.keyTag = keyTag;
exports.selfClosingFunctionTag = selfClosingFunctionTag;
exports.openingFunctionTag = openingFunctionTag;
exports.closingFunctionTag = closingFunctionTag;
exports.end = end;


var StringSource = require("lop").StringSource;

function tokenise(source) {
    var tagRegex = /\{([^}]*)\}/g;
    var result;
    var start = 0;
    
    var stringSource = new StringSource(source, "raw string");
    var parts = [];
    
    while ((result = tagRegex.exec(source)) !== null) {
        parts.push(literal(
            source.substring(start, result.index),
            stringSource.range(start, result.index)
        ));
        parts.push(tag(
            result[1],
            stringSource.range(result.index, tagRegex.lastIndex)
        ));
        start = tagRegex.lastIndex;
    }
    parts.push(literal(
        source.substring(start),
        stringSource.range(start, source.length)
    ));
    parts.push(end(stringSource.range(source.length, source.length)));
    return parts.filter(function(part) {
        return part.type !== "literal" || part.value !== "";
    });
}

function literal(value, source) {
    return {
        type: "literal",
        value: value,
        source: source
    };
}

function tag(value, source) {
    var firstCharacter = value.substring(0, 1);
    if (firstCharacter === "#") {
        var parts = value.split(/\s/);
        var name = parts[0].substring(1);
        if (parts[parts.length - 1] === "/") {
            return selfClosingFunctionTag(name, parts.slice(1, parts.length - 1), source);
        } else {
            return openingFunctionTag(name, parts.slice(1), source);
        }
    } else if (firstCharacter === "/") {
        return closingFunctionTag(value.substring(1), source);
    } else {
        return keyTag(value, source);
    }
}

function keyTag(value, source) {
    return {
        type: "keyTag",
        value: value,
        source: source
    };
}

function selfClosingFunctionTag(name, args, source) {
    return {
        type: "selfClosingFunctionTag",
        name: name,
        args: args,
        source: source
    };
}

function openingFunctionTag(name, args, source) {
    return {
        type: "openingFunctionTag",
        name: name,
        args: args,
        source: source
    };
}

function closingFunctionTag(name, source) {
    return {
        type: "closingFunctionTag",
        name: name,
        source: source
    };
}

function end(source) {
    return {
        type: "end",
        source: source
    };
}
