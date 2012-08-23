var tokeniser = require("../lib/tokeniser");

exports["Key tags are wrapped in curly braces"] = function(test) {
    var tokens = tokeniser.tokenise("Mad {thing} in a {transport}...");
    test.deepEqual([
        tokeniser.literal("Mad "),
        tokeniser.keyTag("thing"),
        tokeniser.literal(" in a "),
        tokeniser.keyTag("transport"),
        tokeniser.literal("...")
    ], tokens);
    test.done();
};

exports["Function tags are wrapped in curly braces and start with hash"] = function(test) {
    var tokens = tokeniser.tokenise("{#formatToday}");
    test.deepEqual([
        tokeniser.functionTag("formatToday", [])
    ], tokens);
    test.done();
};

exports["Function tags can take arguments"] = function(test) {
    var tokens = tokeniser.tokenise("{#formatDate today iso8601}");
    test.deepEqual([
        tokeniser.functionTag("formatDate", ["today", "iso8601"])
    ], tokens);
    test.done();
};
