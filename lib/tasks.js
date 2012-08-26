var path = require("path");

var q = require("q");
var mkdirp = require("mkdirp");

var sourceControl = require("./source-control");

exports.checkout = checkout;

var root = "/tmp/babbs";

function checkout(options) {
    var id = options.id;
    var name = options.name;
    var uri = options.uri;
    
    var workspace = path.join(root, id.toString(), "workspace");
    
    function createDirectories() {
        return q.ncall(mkdirp, null, path.dirname(workspace));
    }
    
    function fetchRepository() {
        var deferred = q.defer();
        
        var fetcher = sourceControl.fetchRepository(uri, workspace);
        
        var output = [];
        fetcher.on("output", function(outputChunk) {
            output.push(outputChunk);
        });
        
        fetcher.on("error", function(err) {
            deferred.reject(err);
        });
        
        fetcher.on("end", function() {
            deferred.resolve({
                output: output.join("")
            });
        });
        
        return deferred.promise;
    }
    
    function run() {
        return createDirectories().then(fetchRepository);
    }
    
    return {
        id: id,
        name: "Checkout: " + name,
        description: "Checkout: " + uri,
        run: run
    };
}
