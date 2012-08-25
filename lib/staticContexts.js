exports.create = createStaticContext;

function createStaticContext(templates) {
    var holesKey = "__holes";
    
    return {
        extend: function(args, bodies) {
            var baseName = args[0];
            return function(context) {
                return templates.get(baseName).then(function(template) {
                    var contextForBase = objectMapValues(bodies, function(key, body) {
                        return body.render(context);
                    });
                    return template.render(contextForBase);
                });
            };
        },
        
        hole: function(args, bodies) {
            var holeName = args[0];
            return function(context) {
                return (context[holesKey] || {})[holeName];
            }
        },
        
        include: function(args, bodies) {
            var includeName = args[0]
            return function(context) {
                return templates.get(includeName).then(function(template) {
                    var includeContext = args.context ? context[args.context] : {};
                    includeContext[holesKey] = objectMapValues(bodies, function(key, body) {
                        return body.render(context);
                    });
                    return template.render(includeContext);
                });
            };
        }
    };
}

function objectMapValues(obj, func) {
    var result = {};
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = func(key, obj[key]);
        }
    }
    return result;
};
