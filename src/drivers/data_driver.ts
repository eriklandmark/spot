import Logger from "../lib/logger";
import {sleep, interpolate} from "../lib/helper_functions"


export default class DataDriver extends Logger {
    i2c_adress: number = 0
    bus: any = null

    collecting_data_interval_id = null

    BEC_TEMP_KOEFFS = [ -53.108535084119779, 0.480508822322528]
    VOLTAGE_KOEFFS = [5.313720316622691, 0.020091107953905]

    sensor_data = {
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
        }
    }

    constructor(addr:number = 8) {
        super()
        super.setLogPrefix(this)
        this.i2c_adress = addr
    }

    async init() {
        if (process.env.NODE_ENV == "production") {
            console.log("he")
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
            this.log("Running in DEV-mode! All input are faked")
        }

        const collect = () => {
            const raw_voltage_data = this.readData(1)
            this.sensor_data.voltage = {
                raw: raw_voltage_data,
                calc: this.VOLTAGE_KOEFFS[0] + this.VOLTAGE_KOEFFS[1]*raw_voltage_data
            }

            const raw_current_data = this.readData(2)
            this.sensor_data.current = {
                raw: raw_current_data,
                calc: raw_current_data
            }

            const raw_bec_temp_data = this.readData(3)
            this.sensor_data.bec_temp = {
                raw: raw_bec_temp_data,
                calc: this.BEC_TEMP_KOEFFS[0] + this.BEC_TEMP_KOEFFS[1]*raw_bec_temp_data
            }

        }
        collect()
        this.collecting_data_interval_id = setInterval(collect, 100)
    }

    readData(addr: number) {
        if (process.env.NODE_ENV == "production") {
            return this.bus.readByteSync(this.i2c_adress, addr)
        } else {
            return 0
        }
    }

    clean_up() {}
}