var StringSource = require("lop").StringSource;

var tokeniser = require("../lib/tokeniser");

exports["Key tags are wrapped in curly braces"] = function(test) {
    var source = createSource("Mad {thing} in a {transport}...");
    var tokens = tokeniser.tokenise(source.string);
    test.deepEqual([
        tokeniser.literal("Mad ", source.range(0, 4)),
        tokeniser.keyTag("thing", source.range(4, 11)),
        tokeniser.literal(" in a ", source.range(11, 17)),
        tokeniser.keyTag("transport", source.range(17, 28)),
        tokeniser.literal("...", source.range(28, 31)),
        tokeniser.end(source.range(31, 31))
    ], tokens);
    test.done();
};

exports["Function tags are wrapped in curly braces and start with hash and can self-close"] = function(test) {
    var source = createSource("{#formatToday /}");
    var tokens = tokeniser.tokenise(source.string);
    test.deepEqual([
        tokeniser.selfClosingFunctionTag("formatToday", [], source.range(0, 16)),
        tokeniser.end(source.range(16, 16))
    ], tokens);
    test.done();
};

exports["Function tags can take arguments"] = function(test) {
    var source = createSource("{#formatDate today iso8601 /}");
    var tokens = tokeniser.tokenise(source.string);
    test.deepEqual([
        tokeniser.selfClosingFunctionTag("formatDate", ["today", "iso8601"], source.range(0, 29)),
        tokeniser.end(source.range(29, 29))
    ], tokens);
    test.done();
};

exports["Function tags can have body"] = function(test) {
    var source = createSource("{#if loggedIn}Logged in{/if}");
    var tokens = tokeniser.tokenise(source.string);
    test.deepEqual([
        tokeniser.openingFunctionTag("if", ["loggedIn"], source.range(0, 14)),
        tokeniser.literal("Logged in", source.range(14, 23)),
        tokeniser.closingFunctionTag("if", source.range(23, 28)),
        tokeniser.end(source.range(28, 28))
    ], tokens);
    test.done();
};

function createSource(string) {
    var stringSource = new StringSource(string, "raw string");
    return {
        string: string,
        range: function(start, end) {
            return stringSource.range(start, end);
        }
    };
}
