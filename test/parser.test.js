var parser = require("../lib/parser");

exports["Key tags are wrapped in curly braces"] = function(test) {
    var nodes = parser.parse("Mad {thing} in a {transport}...");
    test.deepEqual([
        parser.literal("Mad "),
        parser.keyTag("thing"),
        parser.literal(" in a "),
        parser.keyTag("transport"),
        parser.literal("...")
    ], nodes);
    test.done();
};

exports["Function tags are wrapped in curly braces and start with hash and can self-close"] = function(test) {
    var nodes = parser.parse("{#formatToday /}");
    test.deepEqual([
        parser.functionTag("formatToday", [])
    ], nodes);
    test.done();
};

exports["Function tags can take arguments"] = function(test) {
    var nodes = parser.parse("{#formatDate today iso8601 /}");
    test.deepEqual([
        parser.functionTag("formatDate", ["today", "iso8601"])
    ], nodes);
    test.done();
};

exports["Function tags can have body"] = function(test) {
    var nodes = parser.parse("{#if loggedIn}Logged in{/if}");
    test.deepEqual([
        parser.functionTag("if", ["loggedIn"], {
            block: [parser.literal("Logged in")]
        })
    ], nodes);
    test.done();
};

exports["Function tags can have named body"] = function(test) {
    var nodes = parser.parse("{#if loggedIn}Logged in{:else}Who are you?{/if}");
    test.deepEqual([
        parser.functionTag("if", ["loggedIn"], {
            block: [parser.literal("Logged in")],
            "else": [parser.literal("Who are you?")]
        })
    ], nodes);
    test.done();
};
