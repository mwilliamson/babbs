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

exports["Function tags are called during rendering"] = function(test) {
    var template = templating.compileString(
        "Today is {#formatToday /}",
        {formatToday: formatToday}
    );
    
    function formatToday() {
        return function() {
            return "23 August 2012"
        };
    }
    
    test.equal("Today is 23 August 2012", template.render({}));
    test.done();
};

exports["Function tags are called with arguments"] = function(test) {
    var template = templating.compileString(
        "Today is {#formatDate today iso8601 /}",
        {formatDate: formatDate}
    );
    
    function formatDate(args) {
        return function() {
            var date = args[0];
            var format = args[1];
            if (date === "today" && format === "iso8601") {
                return "23 August 2012";
            } else {
                return "Unrecognised parameters";
            }
        };
    }
    
    test.equal("Today is 23 August 2012", template.render({}));
    test.done();
};

exports["Function tags can use context"] = function(test) {
    var template = templating.compileString(
        "Hello {#toUpperCase name /}",
        {toUpperCase: toUpperCase}
    );
    
    function toUpperCase(args) {
        return function(context) {
            var variableName = args[0];
            return context[variableName].toUpperCase();
        };
    }
    
    test.equal("Hello BOB", template.render({name: "Bob"}));
    test.done();
};
