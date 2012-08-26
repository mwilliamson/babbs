var events = require("events");

var systems = [
    require("./git")
];

exports.fetchRepository = fetchRepository;

function fetchRepository(uri, checkoutPath) {
    var system = find(systems, function(system) {
        return system.handlesUri(uri);
    });
    
    if (system === null) {
        var eventEmitter = new events.EventEmitter();
        
        process.nextTick(function() {
            eventEmitter.emit("error", new Error("Unrecognised source control URI: " + uri));
        });
        
        return eventEmitter;
    } else {
        return system.fetchRepository(uri, checkoutPath);
    }
}

function find(iterable, predicate) {
    var result = iterable.filter(predicate);
    if (result.length === 0) {
        return null;
    } else {
        return result[0];
    }
}
