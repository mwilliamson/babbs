var q = require("q");

var templating = require("../lib/templating");

exports["Template without tags generates string as-is"] = function(test) {
    var template = templating.compileString("Mad man in a box");
    assertRender(test, "Mad man in a box", template.render({})).then(finish(test));
};

exports["Key tags are replaced with value from context"] = function(test) {
    var template = templating.compileString("Mad {thing} in a {transport}");
    assertRender(test,
        "Mad man in a box",
        template.render({thing: "man", transport: "box"})
    ).then(finish(test));
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
    assertRender(test, "Today is 23 August 2012", template.render({}))
        .then(finish(test));
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
    
    assertRender(test, "Today is 23 August 2012", template.render({}))
        .then(finish(test));
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
    
    assertRender(test, "Hello BOB", template.render({name: "Bob"}))
        .then(finish(test));
};

exports["Function tags can use body"] = function(test) {
    var template = templating.compileString(
        "{#if name}{name}{/if}",
        {"if": templateIf}
    );
    
    function templateIf(args, body) {
        return function(context) {
            var variableName = args[0];
            if (context[variableName]) {
                return body.render(context);
            } else {
                return "";
            }
        };
    }
    
    q.all([
        assertRender(test, "Bob", template.render({name: "Bob"})),
        assertRender(test, "", template.render({}))
    ]).then(finish(test));
};

exports["Function tags can return promise"] = function(test) {
    var template = templating.compileString(
        "{#currentUser /}",
        {"currentUser": currentUser}
    );
    
    function currentUser() {
        return function(context) {
            var deferred = q.defer();
            process.nextTick(function() {
                deferred.resolve("Bob");
            });
            return deferred.promise;
        };
    }
    
    assertRender(test, "Bob", template.render({})).then(finish(test));
};

function assertRender(test, expected, result) {
    return result.then(function(value) {
        test.equal(expected, value);
    });
}

function finish(test) {
    return function() {
        test.done();
    };
}
