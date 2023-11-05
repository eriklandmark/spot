import Transformations from "./transformations.ts";
import SpotMicroLeg from "./spot_micro_leg.ts";
import Tensor from "nn-lib/dist/tensor.js";
import Kinematics from "./kinematics.ts";

export default class SpotMicroFigure {

    hip_length: number = 0.057103236299
    upper_leg_length: number = Math.sqrt(0.081375068019**2 + 0.070869769723 ** 2)
    lower_leg_length: number = Math.sqrt(0.036638374506**2 + 0.116741885720 ** 2)
    body_width: number = 0.0743
    body_length: number = 0.251

    ht_body: Tensor

    rb_leg_angles: number[]
    rf_leg_angles: number[]
    lf_leg_angles: number[]
    lb_leg_angles: number[]

    legs:{[propName: string]: SpotMicroLeg} = {}

    constructor(public x: number = 0,
                public y: number = .18,
                public z: number = 0,
                public phi: number = 0,
                public theta: number = 0,
                public psi: number = 0) {

        this.ht_body = Transformations.homog_transxyz(this.x, this.y, this.z).dot(Transformations.homog_rotxyz(this.phi, this.psi, this.theta))
        this.rb_leg_angles = [0, -30 * Math.PI / 180, 60 * Math.PI / 180]
        this.rf_leg_angles = [0, -30 * Math.PI / 180, 60 * Math.PI / 180]
        this.lf_leg_angles = [0, 30 * Math.PI / 180, -60 * Math.PI / 180]
        this.lb_leg_angles = [0, 30 * Math.PI / 180, -60 * Math.PI / 180]

        this.legs['leg_rightback'] = new SpotMicroLeg(this.rb_leg_angles[0], this.rb_leg_angles[1], this.rb_leg_angles[2],
            this.hip_length, this.upper_leg_length, this.lower_leg_length,
            Kinematics.t_rightback(this.ht_body, this.body_length, this.body_width), true)

        this.legs['leg_rightfront'] = new SpotMicroLeg(this.rf_leg_angles[0], this.rf_leg_angles[1], this.rf_leg_angles[2],
            this.hip_length, this.upper_leg_length, this.lower_leg_length,
            Kinematics.t_rightfront(this.ht_body, this.body_length, this.body_width), true)

        this.legs['leg_leftfront'] = new SpotMicroLeg(this.lf_leg_angles[0], this.lf_leg_angles[1], this.lf_leg_angles[2],
            this.hip_length, this.upper_leg_length, this.lower_leg_length,
            Kinematics.t_leftfront(this.ht_body, this.body_length, this.body_width), false)

        this.legs['leg_leftback'] = new SpotMicroLeg(this.lb_leg_angles[0], this.lb_leg_angles[1], this.lb_leg_angles[2],
            this.hip_length, this.upper_leg_length, this.lower_leg_length,
            Kinematics.t_leftback(this.ht_body, this.body_length, this.body_width), false)
    }

    get_leg_coordinates(): Tensor[][] {
        return [
            this.legs['leg_rightback'].get_leg_points(),
            this.legs['leg_rightfront'].get_leg_points(),
            this.legs['leg_leftfront'].get_leg_points(),
            this.legs['leg_leftback'].get_leg_points()
        ]
    }

    get_leg_angles(): number[][] {
        return [
            this.legs['leg_rightback'].get_leg_angles(),
            this.legs['leg_rightfront'].get_leg_angles(),
            this.legs['leg_leftfront'].get_leg_angles(),
            this.legs['leg_leftback'].get_leg_angles()
        ]
    }

    set_leg_angle(leg, leg_angles: number[]) {
        this.legs[leg].set_angles(leg_angles[0], leg_angles[1], leg_angles[2])
    }

    set_leg_angles(leg_angles: Tensor) {
        this.legs['leg_leftfront'].set_angles(leg_angles.get([0,0]), leg_angles.get([0,1]), leg_angles.get([0,2]))
        this.legs['leg_rightfront'].set_angles(leg_angles.get([1,0]), leg_angles.get([1,1]), leg_angles.get([1,2]))
        this.legs['leg_leftback'].set_angles(leg_angles.get([2,0]), leg_angles.get([2,1]), leg_angles.get([2,2]))
        this.legs['leg_rightback'].set_angles(leg_angles.get([3,0]), leg_angles.get([3,1]), leg_angles.get([3,2]))
    }

    set_absolute_foot_coordinates([leg_rightback, leg_rightfront, leg_leftfront, leg_leftback]: Tensor[]) {
        this.legs['leg_rightback'].set_foot_position_in_global_tensor(leg_rightback)
        this.legs['leg_rightfront'].set_foot_position_in_global_tensor(leg_rightfront)
        this.legs['leg_leftfront'].set_foot_position_in_global_tensor(leg_leftfront)
        this.legs['leg_leftback'].set_foot_position_in_global_tensor(leg_leftback)
    }

    set_absolute_body_pose(ht_body: Tensor) {
        this.ht_body = ht_body

        const foot_coords: { [propName: string]: Tensor } = {}

        for (const leg_name of Object.keys(this.legs)) {
            foot_coords[leg_name] = this.legs[leg_name].get_foot_position_in_global_coords()
        }

        this.legs['leg_rightback'].set_homog_transf(Kinematics.t_rightback(this.ht_body, this.body_length, this.body_width))
        this.legs['leg_rightfront'].set_homog_transf(Kinematics.t_rightfront(this.ht_body, this.body_length, this.body_width))
        this.legs['leg_leftfront'].set_homog_transf(Kinematics.t_leftfront(this.ht_body, this.body_length, this.body_width))
        this.legs['leg_leftback'].set_homog_transf(Kinematics.t_leftback(this.ht_body, this.body_length, this.body_width))

        this.set_absolute_foot_coordinates(Object.values(foot_coords))
    }

    set_body_translation(x: number, y: number, z: number) {
        this.x = x
        this.y = y
        this.z = z
        this.ht_body = Transformations.homog_transxyz(this.x, this.y, this.z).dot(Transformations.homog_rotxyz(this.phi, this.psi, this.theta))
        this.set_absolute_body_pose(this.ht_body)
    }

    set_body_angles(phi: number = 0, theta: number = 0, psi: number = 0) {
        const r_xyz: Tensor = Transformations.rotxyz(phi, psi, theta)
        const ht_body_c: Tensor = this.ht_body

        r_xyz.iterate((pos: number[]) => {
            ht_body_c.set(pos, r_xyz.get(pos))
        }, true)

        this.set_absolute_body_pose(ht_body_c)
    }
}