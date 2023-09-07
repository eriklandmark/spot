const WebSockets = require('ws');

const ws = new WebSockets('ws:192.168.1.6:5100');

let latest_poll_time = Date.now()
const latest_poll_times = [latest_poll_time]
let avg_poll_time = 0

ws.on('open', () => {
    latest_poll_times.push(Date.now())
    console.log("Connected")
});

ws.on('message', (data) => {
    const current_time = Date.now()
    const poll_time = current_time - latest_poll_time
    latest_poll_time = current_time
    latest_poll_times.push(poll_time)

    if (latest_poll_times.length > 10) {
        latest_poll_times.splice(0, 1)
        avg_poll_time = Math.round(latest_poll_times.reduce((acc, v) => acc + v, 0) / 10)
    }

    const parsed_data = JSON.parse(data)
    const latency = Date.now() - parsed_data.time
    console.log(poll_time, avg_poll_time, latency, data);
});