import Transformations from "./transformations.ts";
import Tensor from "nn-lib/dist/tensor.js";

export default class Kinematics {

    static t_rightback(t_m: Tensor, l: number, w: number): Tensor {
        return t_m.dot(Transformations.roty(Math.PI / 2)
            .concatenate(new Tensor([[-l / 2], [0], [w / 2]]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]), "v"))
    }

    static t_rightfront(t_m: Tensor, l: number, w: number): Tensor {
        return t_m.dot(Transformations.roty(Math.PI / 2)
            .concatenate(new Tensor([[l / 2], [0], [w / 2]]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]), "v"))
    }

    static t_leftfront(t_m: Tensor, l: number, w: number): Tensor {
        return t_m.dot(Transformations.roty(-Math.PI / 2)
            .concatenate(new Tensor([[l / 2], [0], [-w / 2]]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]), "v"))
    }

    static t_leftback(t_m: Tensor, l: number, w: number): Tensor {
        return t_m.dot(Transformations.roty(-Math.PI / 2)
            .concatenate(new Tensor([[-l / 2], [0], [-w / 2]]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]), "v"))
    }

    static t_0_to_1(theta1: number, l1: number) {
        return Transformations.rotz(theta1)
            .concatenate(new Tensor([[-l1 * Math.cos(theta1)], [-l1 * Math.sin(theta1)], [0]]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]), "v")
    }

    static t_1_to_2() {
        return new Tensor(
            [[0, 0, -1, 0],
                [-1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 0, 1]])
    }

    static t_2_to_3(theta2: number, l2: number) {
        return Transformations.rotz(theta2)
            .concatenate(new Tensor([[l2 * Math.cos(theta2)], [l2 * Math.sin(theta2)], [0]]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]), "v")
    }

    static t_3_to_4(theta3: number, l3: number) {
        return Transformations.rotz(theta3)
            .concatenate(new Tensor([[l3 * Math.cos(theta3)], [l3 * Math.sin(theta3)], [0]]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]), "v")
    }

    static t_0_to_4(theta1: number, theta2: number, theta3: number, l1: number, l2: number, l3: number) {
        return Kinematics.t_0_to_1(theta1, l1)
            .dot(Kinematics.t_1_to_2())
            .dot(Kinematics.t_2_to_3(theta2, l2))
            .dot(Kinematics.t_3_to_4(theta3, l3))
    }

    static ikine(x4: number, y4: number, z4: number, l1: number, l2: number, l3: number, legs12: boolean = true) {
        const D: number = (x4 ** 2 + y4 ** 2 + z4 ** 2 - l1 ** 2 - l2 ** 2 - l3 ** 2) / (2 * l2 * l3)
        let q3: number

        if (legs12) {
            q3 = Math.atan2(Math.sqrt(1 - D ** 2), D)
        } else {
            q3 = Math.atan2(-Math.sqrt(1 - D ** 2), D)
        }

        const q2: number = Math.atan2(z4, Math.sqrt(x4 ** 2 + y4 ** 2 - l1 ** 2)) - Math.atan2(l3 * Math.sin(q3), l2 + l3 * Math.cos(q3))
        const q1: number = Math.atan2(y4, x4) + Math.atan2(Math.sqrt(x4 ** 2 + y4 ** 2 - l1 ** 2), -l1)
        return [q1, q2, q3]
    }
}