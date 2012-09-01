var fs = require("fs");

var q = require("q");

exports.readFile = convertAsyncMethod(fs, "readFile");
exports.readdir = convertAsyncMethod(fs, "readdir");
exports.writeFile = convertAsyncMethod(fs, "writeFile");
exports.exists = convertBooleanAsyncMethod(fs, "exists");

function convertAsyncMethod(obj, methodName) {
    return function() {
        var deferred = q.defer();
        
        var args = Array.prototype.slice.call(arguments, 0);
        args.push(callback);
        obj[methodName].apply(obj, args);
        
        function callback(err, value) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(value);
            }
        }
        return deferred.promise;
    };
}

function convertBooleanAsyncMethod(obj, methodName) {
    return function() {
        var deferred = q.defer();
        
        var args = Array.prototype.slice.call(arguments, 0);
        args.push(callback);
        obj[methodName].apply(obj, args);
        
        function callback(value) {
            deferred.resolve(value);
        }
        return deferred.promise;
    };
}
