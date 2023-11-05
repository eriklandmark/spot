import Kinematics from "./kinematics.ts";
import Tensor from "nn-lib/dist/tensor.js";
import Transformations from "./transformations.ts";

export default class SpotMicroLeg {
    t01: Tensor
    t12: Tensor
    t23: Tensor
    t34: Tensor

    constructor(private q1: number,
                private q2: number,
                private q3: number,
                private l1: number,
                private l2: number,
                private l3: number,
                private ht_leg_start: Tensor,
                private leg12: boolean) {
        this.t01 = Kinematics.t_0_to_1(this.q1, this.l1)
        this.t12 = Kinematics.t_1_to_2()
        this.t23 = Kinematics.t_2_to_3(this.q2, this.l2)
        this.t34 = Kinematics.t_3_to_4(this.q3, this.l3)
    }

    set_angles(q1: number, q2: number, q3: number) {
        this.q1 = q1
        this.q2 = q2
        this.q3 = q3
        this.t01 = Kinematics.t_0_to_1(this.q1, this.l1)
        this.t23 = Kinematics.t_2_to_3(this.q2, this.l2)
        this.t34 = Kinematics.t_3_to_4(this.q3, this.l3)
    }

    set_homog_transf(ht_leg_start: Tensor) {
        this.ht_leg_start = ht_leg_start
    }

    get_homog_transf(): Tensor {
        return this.ht_leg_start
    }

    set_foot_position_in_local_coords(x4: number, y4: number, z4: number) {
        const leg_angs = Kinematics.ikine(x4, y4, z4, this.l1, this.l2, this.l3, this.leg12)
        this.set_angles(leg_angs[0], leg_angs[1], leg_angs[2])
    }

    set_foot_position_in_global_tensor(t: Tensor) {
        const ht_leg_inv = Transformations.ht_inverse(this.ht_leg_start)
        const p4_global_coord = new Tensor([t.get([0]), t.get([1]), t.get([2]), 1])
        const p4_in_leg_coords = ht_leg_inv.dot(p4_global_coord)

        this.set_foot_position_in_local_coords(p4_in_leg_coords.get([0]), p4_in_leg_coords.get([1]), p4_in_leg_coords.get([2]))
    }

    get_leg_points(): Tensor[] {
        const p1 = this.ht_leg_start.get([0, 3], [2, 3])
        let ht_buildup: Tensor = this.ht_leg_start.dot(this.t01).dot(this.t12)
        const p2 = ht_buildup.get([0, 3], [2, 3])
        ht_buildup = ht_buildup.dot(this.t23)
        const p3 = ht_buildup.get([0, 3], [2, 3])
        ht_buildup = ht_buildup.dot(this.t34)
        const p4 = ht_buildup.get([0, 3], [2, 3])

        return [p1, p2, p3, p4]
    }

    get_foot_position_in_global_coords(): Tensor {
        const ht_foot: Tensor = this.ht_leg_start.dot(this.t01).dot(this.t12).dot(this.t23).dot(this.t34)
        return ht_foot.get([0, 3], [2, 3])
    }

    get_leg_angles() {
        return [this.q1, this.q2, this.q3]
    }
}