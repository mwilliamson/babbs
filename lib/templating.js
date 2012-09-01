var util = require("util");

var snook = require("snook");
var dateformat = require("dateformat");
var q = require("q");

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
                            link.active = true;
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
            return {url: "/task/" + task.id, title: title};
        });
    }
    
    function iconForStatus(status) {
        var icons = {
            success: "✔",
            failure: "✖",
            unknown: "?"
        };
        
        return util.format('<span class="status status-%s">%s</span>', status, icons[status]);
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
                var output = [];
                var result;
                var ansiState = {};
                var regex = /\033\[(\d+)m/g;
                var position = 0;
                while ((result = regex.exec(input)) !== null) {
                    output.push(ansiText(input.substring(position, result.index), ansiState));
                    position = regex.lastIndex;
                    updateAnsiState(ansiState, result[1]);
                }
                output.push(ansiText(input.substring(position), ansiState));
                return output.join("");
            };
        };
    };

    function ansiText(text, ansiState) {
        if (text) {
            var color = ansiState.color;
            return addBold(addColors(text, ansiState.color), ansiState.bold);
        } else {
            return text;
        }
    }

    function addColors(text, color) {
        var colors = {
            30: "rgb(0, 0, 0)", //black
            31: "rgb(205, 0, 0)", // red
            32: "rgb(0, 205, 0)", // green
            33: "rgb(205, 205, 0)", // yellow
            34: "rgb(0, 0, 238)", // blue
            35: "rgb(205, 0, 205)", // magenta
            36: "rgb(0, 205, 205)", // cyan
            37: "rgb(229, 229, 229)" // white
        };
        if (!color || !colors[color]) {
            return text;
        } else {
            return '<span style="color:' + colors[color] + '">' + text + '</span>'
        }
    }

    function addBold(text, bold) {
        if (bold) {
            return '<b>' + text + '</b>'
        } else {
            return text;
        }
    }

    function updateAnsiState(state, code) {
        code = parseInt(code, 10);
        if (code === 1) {
            state.bold = true;
        } else if (code === 22) {
            state.bold = false;
        } else if (code >= 30 && code <= 37) {
            state.color = code;
        } else if (code === 39) {
            state.color = null;
        } else {
            console.log(code);
        }
    }

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

