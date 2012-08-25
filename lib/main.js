var connect = require("connect");
var http = require("http");

var app = connect()
    .use(connect.static("static"));

http.createServer(app).listen(3000);
