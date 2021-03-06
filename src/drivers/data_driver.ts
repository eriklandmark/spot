import Logger from "../lib/logger";
import {sleep, interpolate} from "../lib/helper_functions"

export default class DataDriver extends Logger {
    i2c_address: number = 0
    bus: any = null

    collecting_data_interval_id = null

    BEC_TEMP_KOEFFS = [ -53.108535084119779, 0.480508822322528]
    VOLTAGE_KOEFFS = [0.036824517639494, 0.020426317305139]

    data = {
        "voltage": {
            calc: 0,
            raw: 0
        },
        "current": {
            calc: 0,
            raw: 0
        },
        "bec_temp": {
            calc: 0,
            raw: 0
        },
        "distance_sensor_0": {
            calc: 0,
            raw: 0
        },
        "distance_sensor_1": {
            calc: 0,
            raw: 0
        }
    }

    constructor(addr:number = 8) {
        super()
        super.setLogPrefix(this)
        this.i2c_address = addr
    }

    async init() {
        if (process.env.NODE_ENV == "production") {
            const i2c = require('i2c-bus');
            this.bus = i2c.openSync(0);

            const result: number[] = this.bus.scanSync();

            if (!result.includes(8)) {
                this.error("Didn't find device on specified adress!")
                return
            } else {
                this.log("Found Device!")
            }
        } else {
            this.log("Running in DEV-mode! All inputs are faked")
        }

        const collect = async () => {
            const raw_voltage_data = this.readData(1)
            this.data.voltage = {
                raw: raw_voltage_data,
                calc: this.VOLTAGE_KOEFFS[0] + this.VOLTAGE_KOEFFS[1]*raw_voltage_data
            }

            sleep(10)

            const raw_current_data = this.readData(2)
            this.data.current = {
                raw: raw_current_data,
                calc: raw_current_data
            }

            sleep(10)

            const raw_bec_temp_data = this.readData(3)
            this.data.bec_temp = {
                raw: raw_bec_temp_data,
                calc: this.BEC_TEMP_KOEFFS[0] + this.BEC_TEMP_KOEFFS[1]*raw_bec_temp_data
            }

            sleep(10)

            const raw_distance_sensor_0_data = this.readData(4)
            this.data.distance_sensor_0 = {
                raw: raw_distance_sensor_0_data,
                calc: (raw_distance_sensor_0_data/2) / 29.1
            }

            sleep(10)

            const raw_distance_sensor_1_data = this.readData(5)
            this.data.distance_sensor_1 = {
                raw: raw_distance_sensor_1_data,
                calc: (raw_distance_sensor_1_data/2) / 29.1
            }
        }

        collect()
        this.collecting_data_interval_id = setInterval(collect, 100)
    }

    readData(addr: number) {
        if (process.env.NODE_ENV == "production") {
            const buffer = Buffer.alloc(2)
            this.bus.readI2cBlockSync(this.i2c_address, addr, 2, buffer)
            const number = buffer.readUInt16BE()
            return number
        } else {
            return 0
        }
    }

    clean_up() {}
}