import Logger from "../lib/logger.ts";
import {SerialPort} from "serialport";
import {DelimiterParser} from "@serialport/parser-delimiter";
import {genRandomHash} from "../lib/helper_functions.ts";
import SpotBackend from "../index.ts";

export default class ServoDriver extends Logger {

    data: any = {}
    serialport: SerialPort
    data_pipe: any
    msg_timeout_cache: any = {}

    SERVOS = ["f_1", "f_2", "f_3", "f_4", "f_5", "f_6", "b_1", "b_2", "b_3", "b_4", "b_5", "b_6"]

    servo_data = {
        f_1: { min: 400, max: 860, offset: 486, dir: -1 },
        f_2: { min: 0, max: 1000, offset: 654, dir: -1 },
        f_3: { min: 250, max: 1000, offset: 950, dir: 1 },
        f_4: { min: 80, max: 580, offset: 473, dir: 1 },
        f_5: { min: 0, max: 1000, offset: 197, dir: -1 },
        f_6: { min: 0, max: 767, offset: 83, dir: 1 },
        b_1: { min: 400, max: 860, offset: 516, dir: 1 },
        b_2: { min: 0, max: 1000, offset: 774, dir: -1 },
        b_3: { min: 220, max: 1000, offset: 895, dir: 1 },
        b_4: { min: 80, max: 580, offset: 483, dir: -1 },
        b_5: { min: 0, max: 1000, offset: 256, dir: -1 },
        b_6: { min: 0, max: 780, offset: 60, dir: 1 }
    }

    constructor(private backend: SpotBackend) {
        super()
        super.setLogPrefix(this)

        if (process.env.NODE_ENV == "production") {
            this.serialport = new SerialPort({
                path: '/dev/ttyACM0',
                baudRate: 115200,
                dataBits: 8,
                parity: 'none',
                stopBits: 1
            })
            this.data_pipe = this.serialport.pipe(new DelimiterParser({delimiter: '\n'}))
        }
    }

    async init() {
        if (process.env.NODE_ENV == "production") {

            this.data_pipe.on("error", console.log)
            this.serialport.on("error", console.log)
        }

        setInterval(async () => {
            if (process.env.NODE_ENV == "production") {
                try {
                    this.data = await this.send_with_response({"action": "read"})
                    this.backend.kinematics_controller.on_measured()
                } catch (e) {
                    this.error(e)
                }
            }
        }, 100)

        this.backend.kinematics_controller.update_leg_coords()
    }

    async update_servo_positions() {
        try {
            if (this.backend.armed && this.backend.armed) {
                const [
                    [b_4_pos, b_5_pos, b_6_pos],
                    [f_4_pos, f_5_pos, f_6_pos],
                    [f_1_pos, f_2_pos, f_3_pos],
                    [b_1_pos, b_2_pos, b_3_pos]
                ] = this.backend.kinematics_controller.sm_figure_desired.get_leg_angles()

                const speed = 500
                const data = {
                    f_1: {
                        pos: f_1_pos*1000/Math.PI*this.servo_data.f_1.dir + this.servo_data.f_1.offset,
                        speed
                    },
                    f_2: {
                        pos: (f_2_pos*1000/Math.PI*this.servo_data.f_2.dir + this.servo_data.f_2.offset),
                        speed
                    },
                    f_3: {
                        pos: (f_3_pos*1000/Math.PI*this.servo_data.f_3.dir + this.servo_data.f_3.offset),
                        speed
                    },
                    f_4: {
                        pos: f_4_pos*1000/Math.PI*this.servo_data.f_4.dir + this.servo_data.f_4.offset,
                        speed
                    },
                    f_5: {
                        pos: f_5_pos*1000/Math.PI*this.servo_data.f_5.dir + this.servo_data.f_5.offset,
                        speed
                    },
                    f_6: {
                        pos: f_6_pos*1000/Math.PI*this.servo_data.f_6.dir + this.servo_data.f_6.offset,
                        speed
                    },
                    b_1: {
                        pos: b_1_pos*1000/Math.PI*this.servo_data.b_1.dir + this.servo_data.b_1.offset,
                        speed
                    },
                    b_2: {
                        pos: b_2_pos*1000/Math.PI*this.servo_data.b_2.dir + this.servo_data.b_2.offset,
                        speed
                    },
                    b_3: {
                        pos: b_3_pos*1000/Math.PI*this.servo_data.b_3.dir + this.servo_data.b_3.offset,
                        speed
                    },
                    b_4: {
                        pos: b_4_pos*1000/Math.PI*this.servo_data.b_4.dir + this.servo_data.b_4.offset,
                        speed
                    },
                    b_5: {
                        pos: b_5_pos*1000/Math.PI*this.servo_data.b_5.dir + this.servo_data.b_5.offset,
                        speed
                    },
                    b_6: {
                        pos: b_6_pos*1000/Math.PI*this.servo_data.b_6.dir + this.servo_data.b_6.offset,
                        speed
                    },
                }

                Object.keys(data).forEach((servo: string) => {
                    data[servo].pos = Math.round(Math.min(this.servo_data[servo].max, Math.max(this.servo_data[servo].min, data[servo].pos)))
                }, {})

                await this.send_with_response({"action": "write", data})
            }
        } catch (e) {
            this.error(e)
        }
    }

    async enable_servos(enable: boolean) {
        try {
            if (this.backend.armed) {
                const data = this.SERVOS.reduce((acc, servo) => {
                    acc[servo] = {"enabled": enable}
                    return acc
                }, {})

                await this.send_with_response({"action": "write", data})
            }
        } catch (e) {
            this.error(e)
        }
    }

    async send_with_response(payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const msg_id = genRandomHash(10)
                if (this.serialport.write(JSON.stringify({...payload, msg_id}) + "\n")) {
                    let got_event = false;
                    const listener = (data: Buffer) => {
                        const parsed_data = JSON.parse(data.toString())
                        if (parsed_data.msg_id == msg_id) {
                            got_event = true
                            clearTimeout(this.msg_timeout_cache[msg_id])
                            delete this.msg_timeout_cache[msg_id]
                            resolve(parsed_data)
                        } else {
                            this.data_pipe.once("data", listener)
                        }
                    }

                    this.msg_timeout_cache[msg_id] = setTimeout(() => {
                        if (!got_event) {
                            this.data_pipe.removeListener("data", listener)
                            this.error("Message Timeout!")
                            clearTimeout(this.msg_timeout_cache[msg_id])
                            delete this.msg_timeout_cache[msg_id]
                            reject({})
                        }
                    }, 2000)

                    this.data_pipe.once("data", listener)
                } else {
                    this.error("Error sending to controller!")
                    reject({})
                }
            } catch (e) {
                this.error("Error sending to controller!")
                reject({})
            }
        })
    }

    clean_up() {
        this.serialport.close()
    }
}