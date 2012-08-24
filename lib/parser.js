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
        throw new Error("Failed to parse: " + parseResult.errors().join("\n"));
    }
    return parseResult.value();
}

var partRule = rules.firstOf("part",
    keyTagRule,
    literalRule,
    selfClosingFunctionTagRule,
    functionTagRule
);
var topRule = rules.zeroOrMore(partRule);

function endRule(input) {
    var token = input.head();
    if (token.type === "end") {
        return lop.results.success(keyTag(token.value), input.tail(), token.source);
    } else {
        var error = lop.errors.error({
            expected: "end",
            actual: token.type,
            location: token.source
        });
        return lop.results.failure([error], input);
    }
}

function keyTagRule(input) {
    var token = input.head();
    if (token.type === "keyTag") {
        return lop.results.success(keyTag(token.value), input.tail(), token.source);
    } else {
        var error = lop.errors.error({
            expected: "key tag e.g. {name}",
            actual: token.type,
            location: token.source
        });
        return lop.results.failure([error], input);
    }
}

function literalRule(input) {
    var token = input.head();
    if (token.type === "literal") {
        return lop.results.success(literal(token.value), input.tail(), token.source);
    } else {
        var error = lop.errors.error({
            expected: "literal e.g. Hello!",
            actual: token.type,
            location: token.source
        });
        return lop.results.failure([error], input);
    }
}

function selfClosingFunctionTagRule(input) {
    var token = input.head();
    if (token.type === "selfClosingFunctionTag") {
        return lop.results.success(functionTag(token.name, token.args), input.tail(), token.source);
    } else {
        var error = lop.errors.error({
            expected: "self-closing function tag e.g. {#today /}",
            actual: token.type,
            location: token.source
        });
        return lop.results.failure([error], input);
    }
}

function functionTagRule(input) {
    return rules.sequence(
        rules.sequence.capture(openingFunctionTagRule),
        rules.sequence.capture(topRule),
        rules.sequence.capture(closingFunctionTagRule)
    ).map(function(openingTag, body, closingTag) {
        // TODO: check openingTag.name === closingTag.name;
        return functionTag(openingTag.name, openingTag.args, body);
    })(input);
}

function openingFunctionTagRule(input) {
    var token = input.head();
    if (token.type === "openingFunctionTag") {
        return lop.results.success(token, input.tail(), token.source);
    } else {
        var error = lop.errors.error({
            expected: "opening function tag e.g. {#if isActive}",
            actual: token.type,
            location: token.source
        });
        return lop.results.failure([error], input);
    }
}

function closingFunctionTagRule(input) {
    var token = input.head();
    if (token.type === "closingFunctionTag") {
        return lop.results.success(token, input.tail(), token.source);
    } else {
        var error = lop.errors.error({
            expected: "closing function tag e.g. {/if}",
            actual: token.type,
            location: token.source
        });
        return lop.results.failure([error], input);
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

function functionTag(name, args, body) {
    return {
        type: "functionTag",
        name: name,
        args: args,
        body: body
    };
}
