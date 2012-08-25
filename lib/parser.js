var lop = require("lop");
var rules = lop.rules;

var tokeniser = require("./tokeniser");

exports.parse = parse;
exports.keyTag = keyTag;
exports.literal = literal;
exports.functionTag = functionTag;

function parse(source) {
    var tokens = tokeniser.tokenise(source);
    var parseResult = new lop.Parser().parseTokens(topRule, tokens);
    if (!parseResult.isSuccess()) {
        throw new Error("Failed to parse: " + parseResult.errors().map(describeError).join("\n"));
    }
    return parseResult.value();
}

function describeError(error) {
    return error.describe();
}

var partRule = rules.firstOf("part",
    keyTagRule,
    literalRule,
    selfClosingFunctionTagRule,
    functionTagRule
);
var topRule = rules.zeroOrMore(partRule);

function keyTagRule(input) {
    return singleTokenRule("keyTag", "key tag e.g. {name}", function(token) {
        return keyTag(token.value);
    })(input);
}

function literalRule(input) {
    return singleTokenRule("literal", "literal e.g. Hello!", function(token) {
        return literal(token.value);
    })(input);
}

function selfClosingFunctionTagRule(input) {
    return singleTokenRule("selfClosingFunctionTag", "self-closing function tag e.g. {#today /}", function(token) {
        return functionTag(token.name, readArgs(token.args));
    })(input);
}

function functionTagRule(input) {
    return rules.sequence(
        rules.sequence.capture(openingFunctionTagRule),
        rules.sequence.cut(),
        rules.sequence.capture(topRule),
        rules.sequence.capture(namedBodiesRule),
        rules.sequence.capture(closingFunctionTagRule)
    ).map(function(openingTag, body, namedBodies, closingTag) {
        // TODO: check openingTag.name === closingTag.name;
        var bodies = {};
        namedBodies.forEach(function(namedBody) {
            bodies[namedBody.name] = namedBody.body;
        });
        bodies["block"] = body;
        return functionTag(openingTag.name, openingTag.args, bodies);
    })(input);
}

function openingFunctionTagRule(input) {
    return singleTokenRule("openingFunctionTag", "opening function tag e.g. {#if isActive}", function(token) {
        return token;
    })(input);
}

function closingFunctionTagRule(input) {
    return singleTokenRule("closingFunctionTag", "closing function tag e.g. {/if}", function(token) {
        return token;
    })(input);
}

function namedBodiesRule(input) {
    return rules.zeroOrMore(namedBodyRule)(input);
}

function namedBodyRule(input) {
    return rules.sequence(
        rules.sequence.capture(namedBodyTagRule),
        rules.sequence.capture(topRule)
    ).map(function(name, body) {
        return {name: name, body: body};
    })(input);
}

function namedBodyTagRule(input) {
    return singleTokenRule("namedBodyTag", "named body tag e.g. {:else}", function(token) {
        return token.name;
    })(input);
};
    
function singleTokenRule(type, description, func) {
    return function(input) {
        var token = input.head();
        if (token.type === type) {
            return lop.results.success(func(token), input.tail(), token.source);
        } else {
            var error = lop.errors.error({
                expected: description,
                actual: token.type,
                location: token.source
            });
            return lop.results.failure([error], input);
        }
    }
}

function keyTag(value) {
    return {
        type: "keyTag",
        value: value
    };
}

function literal(value) {
    return {
        type: "literal",
        value: value
    };
}

function functionTag(name, args, bodies) {
    return {
        type: "functionTag",
        name: name,
        args: args,
        bodies: bodies
    };
}

function readArgs(args) {
    var result = [];
    args.forEach(function(arg) {
        var equalsIndex = arg.indexOf("=");
        if (equalsIndex === -1) {
            result.push(arg);
        } else {
            result[arg.substring(0, equalsIndex)] = arg.substring(equalsIndex + 1);
        }
    });
    return result;
}
