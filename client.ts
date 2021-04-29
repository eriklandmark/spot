const WebSockets = require('ws');

const ws = new WebSockets('ws:localhost:5100');

ws.on('open', function open() {
    console.log("Connected")
});

ws.on('message', function incoming(data) {
    console.log(data);
});