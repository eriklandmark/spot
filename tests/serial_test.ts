import {SerialPort} from "serialport";
import {DelimiterParser} from "@serialport/parser-delimiter";

const serialport = new SerialPort({
    path: '/dev/ttyACM0',
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1
})
const data_pipe = serialport.pipe(new DelimiterParser({delimiter: '\n'}))

const before = Date.now()
console.log(serialport.write("{\"action\": \"read\", \"msg_id\": \"hehehekj\"}\n"))
data_pipe.once("data", (data) => {
    const diff = Date.now() - before
    console.log(diff / 1000, "seconds")
    console.log(data.toString())
    serialport.close()
})
