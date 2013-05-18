var util = require("util");

var snook = require("snook");
var dateformat = require("dateformat");
var q = require("q");

var ansiParser = require("./ansi-parser");

var currentUrlKey = "currentUrl";

exports.create = create;

function create(taskRepository) {
    var widgets = {
        "widgets/main-navigation.html": function(args) {
            return function(context) {
                return taskRepository.allTasksStatuses().then(function(taskStatuses) {
                    var links = generateLinks(taskStatuses);
                    links.forEach(function(link) {
                        if (link.url === context.get(currentUrlKey)) {
                            if (link.cssClass) {
                                link.cssClass += " active";
                            } else {
                                link.cssClass = "active";
                            }
                        }
                    });
                    return {links: links};
                });
            };
        }
    };

    function generateLinks(taskStatuses) {
        return [generateOverviewLink(), {header: "Tasks"}]
            .concat(generateTaskLinks(taskStatuses));
    }

    function generateOverviewLink() {
        return {url: "/", title: "Overview"};
    }

    function generateTaskLinks(taskStatuses) {
        return taskStatuses.map(function(taskStatus) {
            var task = taskStatus.task;
            var title = iconForStatus(taskStatus.status) + " " + task.name;
            return {
                url: "/task/" + task.id,
                title: title,
                cssClass: "status-" + taskStatus.status
            };
        });
    }
    
    function iconForStatus(status) {
        var icons = {
            success: "✔",
            failure: "✖",
            unknown: "?"
        };
        
        return util.format('<span class="status-icon status-icon-%s">%s</span>', status, icons[status]);
    }

    function getActiveTaskId(args, context) {
        if (args.task === undefined) {
            return null;
        }
        var task = context.get(args.task);
        if (task.hasOwnProperty("id")) {
            return task.id;
        } else {
            return parseInt(context.get(args.task), 10);
        }
    }

    var staticContext = copy(snook.functionTags.defaults);
    staticContext.widget = function(templates) {
        return function(args, bodies) {
            var widgetName = args[0];
            var contextBuilder = widgets[widgetName](args);
            return function(context) {
                return templates.get(widgetName).then(function(template) {
                    return q.when(contextBuilder(context)).then(function(widgetContext) {
                        return template.render(widgetContext);
                    });
                });
            };
        };
    };
    staticContext.ansiColors = function(templates) {
        return function(args, bodies) {
            return function(context) {
                var input = context.get(args[0]);
                return ansiParser.ansiToHtml(input);
            };
        };
    };

    staticContext.formatDateTime = formatter(formatDateTime);
    staticContext.formatTimeSpan = formatter(formatTimeSpan);

    function formatter(func) {
        return function(templates) {
            return function(args, bodies) {
                var variableName = args[0];
                return function(context) {
                    var value = context.get(variableName);
                    if (value) {
                        return func(value);
                    } else {
                        return "";
                    }
                };
            };
        };
    };

    function formatDateTime(value) {
        return dateformat(new Date(value), "dddd d mmmm yyyy, h:MM:ss TT");
    }

    function formatTimeSpan(value) {
        return (value / 1000) + " seconds";
    }

    var templates = createTemplates(__dirname + "/../templates");

    function createTemplates(root) {
        return new snook.Templates(
            new snook.FileTemplateReader(root),
            staticContext
        );
    }
    
    return templates;
}

function copy(obj) {
    var copy = {};
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            copy[key] = obj[key];
        }
    }
    return copy;
}

