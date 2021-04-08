import Logger from "../lib/logger";
import {sleep, interpolate} from "../lib/helper_functions"

export default class ServoDriver extends Logger {
    
    i2c_address: number = 0
    bus: any = null

    SERVO_MIN = 150
    SERVO_MAX = 600

    MODE1              = 0x00
    MODE2              = 0x01
    PRESCALE           = 0xFE
    LED0_ON_L          = 0x06
    LED0_ON_H          = 0x07
    LED0_OFF_L         = 0x08
    LED0_OFF_H         = 0x09
    ALL_LED_ON_L       = 0xFA
    ALL_LED_ON_H       = 0xFB
    ALL_LED_OFF_L      = 0xFC
    ALL_LED_OFF_H      = 0xFD
    RESTART            = 0x80
    SLEEP              = 0x10
    ALLCALL            = 0x01
    OUTDRV             = 0x04

    constructor(addr:number = 64) {
        super()
        super.setLogPrefix(this)
        this.i2c_address = addr
    }

    async init() {
        if (process.env.NODE_ENV == "production") {
            const i2c = require('i2c-bus');
            this.bus = i2c.openSync(1);

            this.set_all_pwm(0,0)
            this.write(this.MODE2, this.OUTDRV)
            this.write(this.MODE1, this.ALLCALL)
            await sleep(5) // wait for oscillator
            let mode1 = this.read(this.MODE1)
            mode1 = mode1 & ~this.SLEEP // # wake up (reset sleep)
            this.write(this.MODE1, mode1)
            await sleep(5) // wait for oscillator
            const old_mode = this.read(this.MODE1);
            this.write(this.MODE1, (old_mode & 0x7F) | 0x10)
            this.write(this.PRESCALE, 101)
            this.write(this.MODE1, old_mode)
            await sleep(5)
            this.write(this.MODE1, old_mode | this.RESTART)
        } else {
            this.log("Running in DEV-mode! All outputs are faked.")
        }
    }

    set_output(channel: number, angle: number) {
        if (process.env.NODE_ENV == "production") {
            this.set_pwm(channel, 0, Math.round(interpolate(angle, 0,1, this.SERVO_MIN, this.SERVO_MAX)))
        }
    }

    private write(cmd: number, data: number) {
        this.bus.writeByteSync(this.i2c_address, cmd, data)
    }

    private read(cmd: number) {
        return this.bus.readByteSync(this.i2c_address, cmd)
    }

    private set_pwm(channel: number, on: number, off: number) {
        // Sets a single PWM channel
        this.write(this.LED0_ON_L+4*channel, on & 0xFF)
        this.write(this.LED0_ON_H+4*channel, on >> 8)
        this.write(this.LED0_OFF_L+4*channel, off & 0xFF)
        this.write(this.LED0_OFF_H+4*channel, off >> 8)
    }

    private set_all_pwm(on: 0 | 1, off: 0 | 1){
        //Sets all PWM channels
        this.write(this.ALL_LED_ON_L, on & 0xFF)
        this.write(this.ALL_LED_ON_H, on >> 8)
        this.write(this.ALL_LED_OFF_L, off & 0xFF)
        this.write(this.ALL_LED_OFF_H, off >> 8)
    }

    clean_up() {
        
    }
}