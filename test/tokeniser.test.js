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
