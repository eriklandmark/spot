import util from "util"
import {exec, spawn} from "child_process"
const prom_exec = util.promisify(exec);
import fs from "fs"
import Logger from "../lib/logger";

export default class HardwareDriver extends Logger {
    data = {
        fan_speed: 0,
        ram: {
            max: 3964,
            used: 0
        },
        cpu: {
            avg_usage: 0,
            temp: 0,
            core_1: {
                usage: 0,
                freq: 0
            },
            core_2: {
                usage: 0,
                freq: 0
            },
            core_3: {
                usage: 0,
                freq: 0
            },
            core_4: {
                usage: 0,
                freq: 0
            },
        },
        gpu: {
            temp: 0,
            usage: 0,
            freq: 0
        }
    }

    polling_rate = 100

    constructor() {
        super()
        super.setLogPrefix(this)
    }

    async init() {
        if (process.env.NODE_ENV == "production") {
            const collect_fan_speed = async () => {
                const data = fs.readFileSync("/sys/devices/pwm-fan/cur_pwm", {encoding: "utf-8"})
                this.data.fan_speed = parseInt(data)
            }
            setInterval(collect_fan_speed, this.polling_rate)

            const proc = spawn("./src/lib/start_log.sh");
            const onErr = (err: any)  => {this.error("ERROR IN LOG PROCESS: " + (err.message | err))}
            proc.stderr.on("data", onErr);
            proc.on("error", onErr);

            proc.stdout.on("data", (data) => {
                const data_split = data.toString().split(" ")

                const cpu_data = data_split[data_split.indexOf("CPU") + 1].split(",")
                let avg_usage = 0
                cpu_data.forEach((core_data, i) => {
                    let [usage, freq] = core_data.split("%@")
                    if (usage.startsWith("[")) {
                        usage = usage.substr(1)
                    }
                    if (freq.endsWith("]")) {
                        freq = freq.substr(0, core_data.length - 1)
                    }

                    this.data.cpu["core_" + (i + 1)] = {
                        usage: parseInt(usage),
                        freq: parseInt(freq)
                    }
                    avg_usage += parseInt(usage)
                })

                this.data.cpu.avg_usage = avg_usage / 4

                data_split.forEach((data_val, index) => {
                    if (data_val.startsWith("RAM")) {
                        this.data.ram.used = parseInt(data_split[data_split.indexOf("RAM") + 1].split("/")[0])
                    } else if (data_val.startsWith("GR3D_FREQ")) {
                        const [gpu_usage, gpu_freq] = data_split[index + 1].split("%@")
                        this.data.gpu.freq = parseInt(gpu_freq)
                        this.data.gpu.usage = parseInt(gpu_usage)
                    } else if (data_val.startsWith("GPU")) {
                        const gpu_temp_string = data_val.split("@")[1]
                        this.data.gpu.temp = parseFloat(gpu_temp_string.substr(0, gpu_temp_string.length))
                    } else if (data_val.startsWith("CPU@")) {
                        const cpu_temp_string = data_val.split("@")[1]
                        this.data.cpu.temp = parseFloat(cpu_temp_string.substr(0, cpu_temp_string.length))
                    }
                })
            });
        } else {
            this.log("Running in DEV-mode! All inputs are faked")
        }
    }

    async setFanSpeed(v: number) {
        if (process.env.NODE_ENV == "production") {
            try {
                await prom_exec(`echo ${process.env.USER_PASS} | sudo -S sh -c 'echo ${v} > /sys/devices/pwm-fan/target_pwm'`);
            } catch (e) {
                console.error(e)
            }
        }
    }

    clean_up() {

    }
}