import readline from "node:readline"
import {DelimiterParser, SerialPort} from "serialport"

const rl = readline.createInterface({
    input: process.stdin, output: process.stdout, prompt: "#> "
});

const serialport = new SerialPort({
    path: '/dev/ttyACM0',
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1
})
const data_pipe = serialport.pipe(new DelimiterParser({delimiter: '\n'}))

function out(msg: string) {
    console.log(msg)
    rl.prompt();
}

data_pipe.on("error", out)
serialport.on("error", out)
serialport.on("open", () => out("Connected!"))

data_pipe.on("data", (data) => out(data.toString()))

rl.on('line', (input) => {
    serialport.write(input + "\n")
});

rl.on('SIGINT', () => {
    rl.question('Are you sure you want to exit? ', (answer) => {
        if (answer.match(/^y(es)?$/i)) {
            if (serialport.isOpen) {
                serialport.close()
            }
            rl.close();
            out("Closed!")
            process.exit()
        }
    });
});