import Logger from "../lib/logger.ts";
import SpotBackend from "../index.ts";
import SpotMicroFigure from "../lib/kinematics/spot_micro_figure.ts";
import Tensor from "nn-lib/dist/tensor.js";
import Transformations from "../lib/kinematics/transformations.ts";

export default class KinematicsController extends Logger {

    sm_figure_desired: SpotMicroFigure
    sm_figure_actual: SpotMicroFigure

    UPDATE_RATE = 10
    MAX_TILT = 20
    MAX_ROLL = 20
    MAX_X_LEG_DISTANCE = 0.04 // m
    MAX_Y_LEG_DISTANCE = 0.02 // m
    WALKING_SPEED = 0.8

    data = {
        "desired": {
            "rb": [],
            "rf": [],
            "lb": [],
            "lf": []
        },
        actual: {
            "rb": [],
            "rf": [],
            "lb": [],
            "lf": []
        }
    }

    look_dir_index = [
        1,-1,-1,1
    ]

    start_position_tensors: Tensor[]

    legs_moving = false

    leg_cycle_offset = [
        Math.PI / 2, -Math.PI / 2, Math.PI / 2, -Math.PI / 2
    ]

    leg_x_cycle = 0
    leg_y_cycle = 0
    leg_x_cycle_diff = 0
    leg_y_cycle_diff = 0

    leg_animation_id = null

    constructor(private backend: SpotBackend) {
        super()
        super.setLogPrefix(this)

        this.sm_figure_desired = new SpotMicroFigure(0, 0.17, 0, 0, 0)
        this.sm_figure_actual = new SpotMicroFigure(0, 0.17, 0, 0, 0)

        const l = this.sm_figure_desired.body_length
        const w = this.sm_figure_desired.body_width
        this.start_position_tensors = [
            new Tensor([-l / 2, 0, w / 2 + this.sm_figure_desired.hip_length]),
            new Tensor([l / 2, 0, w / 2 + this.sm_figure_desired.hip_length]),
            new Tensor([l / 2, 0, -w / 2 - this.sm_figure_desired.hip_length]),
            new Tensor([-l / 2, 0, -w / 2 - this.sm_figure_desired.hip_length])
        ]

        this.sm_figure_desired.set_absolute_foot_coordinates(this.start_position_tensors)
        //this.sm_figure.set_leg_angle("leg_rightfront", [Math.PI/4, 0, Math.PI/4])
        //this.sm_figure.set_leg_angle("leg_leftfront", [0, 0, Math.PI/4])
    }

    on_update() {
        if (this.backend.input_controller.current_button_state[5] == 1) {
            const tilt = this.backend.input_controller.current_axis_state[3] * this.MAX_TILT
            const roll = this.backend.input_controller.current_axis_state[2] * this.MAX_ROLL
            this.sm_figure_desired.set_body_angles(roll * Math.PI / 180, tilt * Math.PI / 180)
        }

        const clear_walking_cycle = () => {
            this.legs_moving = false
            this.leg_x_cycle = 0
            this.leg_y_cycle = 0
            clearInterval(this.leg_animation_id)
            this.sm_figure_desired.set_absolute_foot_coordinates(this.start_position_tensors)
            this.update_leg_coords()
        }

        if (this.backend.input_controller.current_axis_state[0] != 0 || this.backend.input_controller.current_axis_state[1] != 0) {
            const speed_proportional_const = Math.sqrt(this.backend.input_controller.current_axis_state[1] ** 2 + this.backend.input_controller.current_axis_state[0] ** 2)
            this.leg_x_cycle_diff = this.WALKING_SPEED * speed_proportional_const
            this.leg_y_cycle_diff = this.WALKING_SPEED * speed_proportional_const

            if (!this.legs_moving) {
                this.legs_moving = true
                this.leg_animation_id = setInterval(() => {
                    if (this.legs_moving) {
                        const rot_dir = Math.atan2(this.backend.input_controller.current_axis_state[0], this.backend.input_controller.current_axis_state[1])
                        const look_dir = Math.sign(this.backend.input_controller.current_axis_state[1])*this.backend.input_controller.current_axis_state[2] * Math.PI / 4
                        this.sm_figure_desired.set_absolute_foot_coordinates(this.start_position_tensors.map((t, index) => {
                            const tot_dir = rot_dir + look_dir * this.look_dir_index[index]
                            return t.copy().add(Transformations.roty(tot_dir).dot(new Tensor([
                                Math.cos(-(this.leg_x_cycle + this.leg_cycle_offset[index])) * (this.MAX_X_LEG_DISTANCE - Math.abs(this.backend.input_controller.current_axis_state[0]) * 0.02),
                                Math.max(Math.sin(this.leg_y_cycle + this.leg_cycle_offset[index]) * this.MAX_Y_LEG_DISTANCE, 0),
                                0
                            ])))
                        }))

                        this.update_leg_coords()
                        this.leg_x_cycle += this.leg_x_cycle_diff
                        this.leg_y_cycle += this.leg_y_cycle_diff
                    } else {
                        clear_walking_cycle()
                    }
                }, 1000 / this.UPDATE_RATE)
            }
        } else if (this.backend.input_controller.current_axis_state[0] == 0 && this.backend.input_controller.current_axis_state[1] == 0) {
            clear_walking_cycle()
        } else {
            this.update_leg_coords()
        }
    }

    on_measured() {
        const angles = this.backend.servo_driver.SERVOS.map(servo => {
            let servo_pos = this.backend.servo_driver.data[servo].enabled? this.backend.servo_driver.data[servo].pos : 500

            //f_1_pos*1000/Math.PI*this.servo_data.f_1.dir + this.servo_data.f_1.offset
            return (servo_pos - this.backend.servo_driver.servo_data[servo].offset) * Math.PI / (this.backend.servo_driver.servo_data[servo].dir * 1000)
        })

        const angles_tensor = new Tensor(angles).reshape([4, 3])
        this.sm_figure_actual.set_leg_angles(angles_tensor)

        const coords = this.sm_figure_actual.get_leg_coordinates().map(t => t[2])

        const mean_height = coords.reduce((acc, t) => acc + t.get([1]), 0) / coords.length
        coords.forEach(t => t.set([1], mean_height))
        //this.sm_figure_actual.set_absolute_foot_coordinates(coords)

        this.update_leg_coords(false)
    }

    raise_body(d_h: number) {
        this.sm_figure_desired.set_body_translation(
            this.sm_figure_desired.x,
            this.sm_figure_desired.y + d_h,
            this.sm_figure_desired.z)

        this.update_leg_coords(true)
    }

    update_leg_coords(update_servos = true) {
        const desired_leg_coords = this.sm_figure_desired.get_leg_coordinates()
        const actual_leg_coords = this.sm_figure_actual.get_leg_coordinates()

        this.data = {
            desired: {
                "rb": this.get_leg_coord(desired_leg_coords[0]),
                "rf": this.get_leg_coord(desired_leg_coords[1]),
                "lb": this.get_leg_coord(desired_leg_coords[2]),
                "lf": this.get_leg_coord(desired_leg_coords[3])
            },
            actual: {
                "rb": this.get_leg_coord(actual_leg_coords[0]),
                "rf": this.get_leg_coord(actual_leg_coords[1]),
                "lb": this.get_leg_coord(actual_leg_coords[2]),
                "lf": this.get_leg_coord(actual_leg_coords[3])
            }
        }

        if (update_servos) {
            this.backend.servo_driver.update_servo_positions()
        }
    }

    private get_leg_coord(leg: Tensor[]) {
        let x: number[], y: number[], z: number[]
        x = leg.map((pos) => pos.get([0]))
        y = leg.map((pos) => pos.get([1]))
        z = leg.map((pos) => pos.get([2]))
        return [x, y, z]
    }
}