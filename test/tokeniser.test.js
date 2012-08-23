var tokeniser = require("../lib/tokeniser");

exports["Tags are wrapped in curly braces"] = function(test) {
    var tokens = tokeniser.tokenise("Mad {thing} in a {transport}...");
    test.deepEqual([
        tokeniser.literal("Mad "),
        tokeniser.tag("thing"),
        tokeniser.literal(" in a "),
        tokeniser.tag("transport"),
        tokeniser.literal("...")
    ], tokens);
    test.done();
};
