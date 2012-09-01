var fs = require("fs");

var q = require("q");
var mkdirp = require("mkdirp");

exports.readFile = convertAsyncMethod(fs, "readFile");
exports.readdir = convertAsyncMethod(fs, "readdir");
exports.writeFile = convertAsyncMethod(fs, "writeFile");
exports.exists = convertBooleanAsyncMethod(fs, "exists");
exports.mkdirp = convertAsyncFunction(mkdirp);
exports.appendFile = convertAsyncMethod(fs, "appendFile");

function convertAsyncMethod(obj, methodName) {
    return convertAsyncFunction(obj[methodName].bind(obj));
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

function convertAsyncFunction(func) {
    return function() {
        var deferred = q.defer();
        
        var args = Array.prototype.slice.call(arguments, 0);
        args.push(callback);
        func.apply(this, args);
        
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
