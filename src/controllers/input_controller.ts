import Logger from "../lib/logger.ts";
import SpotBackend from "../index.ts";

export default class InputController extends Logger {

    constructor(private backend: SpotBackend) {
        super()
        super.setLogPrefix(this)
    }

    armed_fn_timeout: any

    current_button_state = {}
    current_axis_state = {}

    handle_input({axis_data, buttons_data}: {axis_data?: number[], buttons_data?:{index: number, value: number}}) {
        if (axis_data) {
            Object.keys(axis_data).forEach((index) => this.current_axis_state[index] = axis_data[index])
            this.backend.kinematics_controller.on_update()
        }
        if (buttons_data) {
            Object.keys(buttons_data).forEach((index) => this.current_button_state[index] = buttons_data[index])

            if (this.current_button_state[6] == 1 && this.current_button_state[7] == 1) {
                this.armed_fn_timeout = setTimeout( ()=> {
                    this.backend.armed = !this.backend.armed
                    this.backend.send_to_clients({armed: this.backend.armed})

                    if (this.backend.armed) {
                        this.backend.servo_driver.enable_servos(true)
                            .then(() => this.log("Armed!"))
                    } else {
                        this.backend.servo_driver.enable_servos(false)
                            .then(() => this.log("Disarmed!"))
                    }
                }, 2000)
            }
            if (this.current_button_state[6] < 1 || this.current_button_state[7] < 0 && this.armed_fn_timeout) {
                clearTimeout(this.armed_fn_timeout)
            }
            if (this.current_button_state[12] == 1) {
                this.backend.kinematics_controller.raise_body(0.005)
            }
            if (this.current_button_state[13] == 1) {
                this.backend.kinematics_controller.raise_body(-0.005)
            }
        }
    }

    update_button_state(data: {index: number, value: number}) {

    }
}