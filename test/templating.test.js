var templating = require("../lib/templating");

exports["Template without tags generates string as-is"] = function(test) {
    var template = templating.compileString("Mad man in a box");
    test.equal("Mad man in a box", template.render({}));
    test.done();
};

exports["Key tags are replaced with value from context"] = function(test) {
    var template = templating.compileString("Mad {thing} in a {transport}");
    test.equal("Mad man in a box", template.render({thing: "man", transport: "box"}));
    test.done();
};
