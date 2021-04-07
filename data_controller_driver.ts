const i2c = require('i2c-bus');
import {sleep, interpolate} from "./helper_functions"

export default class DataControllerDriver {
    i2c_adress: number = 0
    bus: any = null

    collecting_data_interval_id = null

    BEC_TEMP_KOEFS = [-53.157, 0.48064]

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
        this.i2c_adress = addr
        this.bus = i2c.openSync(0);
    }

    async init() {
        const result: number[] = this.bus.scanSync();

        if (!result.includes(8)) {
            console.error("Didn't find device on specified adress!")
            return
        } else {
            console.log("Found Device!")
        }
        
        this.collecting_data_interval_id = setInterval(() => {
            const raw_voltage_data = this.readData(1)
            this.sensor_data.voltage = {
                raw: raw_voltage_data,
                calc: raw_voltage_data
            }

            const raw_current_data = this.readData(2)
            this.sensor_data.current = {
                raw: raw_current_data,
                calc: raw_current_data
            }

            const raw_bec_temp_data = this.readData(3)
            this.sensor_data.bec_temp = {
                raw: raw_bec_temp_data,
                calc: this.BEC_TEMP_KOEFS[0] + this.BEC_TEMP_KOEFS[1]*raw_bec_temp_data
            }
    
        }, 100)
    }

    readData(addr: number) {
        return this.bus.readByteSync(this.i2c_adress, addr)
    }

    clean_up() {}
}