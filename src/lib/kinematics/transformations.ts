import Tensor from "nn-lib/dist/tensor.js";

export default class Transformations {

    static rotx(ang: number) {
        return new Tensor(
            [[1,             0,              0],
                [0, Math.cos(ang), -Math.sin(ang)],
                [0, Math.sin(ang),  Math.cos(ang)]])
    }

    static roty(ang: number) {
        return new Tensor(
            [[ Math.cos(ang), 0, Math.sin(ang)],
            [       0,       1,              0],
            [-Math.sin(ang),      0,       Math.cos(ang)]  ])
    }

    static rotz(ang: number) {
        return new Tensor(
            [[Math.cos(ang),   -Math.sin(ang), 0],
                [Math.sin(ang),    Math.cos(ang), 0],
                [            0,                0, 1]])
    }

    static rotxyz(x_ang: number, y_ang: number, z_ang: number): Tensor {
        return Transformations.rotx(x_ang).dot(Transformations.roty(y_ang)).dot(Transformations.rotz(z_ang))
    }

    static homog_rotxyz(x_ang: number, y_ang: number, z_ang: number): Tensor {
        return Transformations.rotxyz(x_ang, y_ang, z_ang)
            .concatenate(new Tensor([[0], [0], [0]]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]), "v")
    }

    static homog_transxyz(x: number, y: number, z: number): Tensor {
        return Tensor.createIdentityMatrix(3)
            .concatenate(new Tensor([[x], [y], [z]]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]),"v")
    }

    static homog_transform(x_ang: number, y_ang: number, z_ang: number, x_t: number, y_t: number, z_t: number): Tensor {
        return this.homog_rotxyz(x_ang, y_ang, z_ang).dot(Transformations.homog_transxyz(x_t, y_t, z_t))
    }

    static ht_inverse(ht: Tensor) {
        const temp_rot = (<Tensor> ht.get([0,0], [2,2])).transpose()
        const temp_vec = (<Tensor> ht.get([0,3], [2,3])).mul(-1)
        const temp_rot_ht = temp_rot
            .concatenate(new Tensor([0, 0, 0]), "h")
            .concatenate(new Tensor([0, 0, 0, 1]), "v")

        const temp_vec_ht = Tensor.createIdentityMatrix(4)
        temp_vec_ht.set([0,3], temp_vec.get([0,0]))
        temp_vec_ht.set([1,3], temp_vec.get([1,0]))
        temp_vec_ht.set([2,3], temp_vec.get([2,0]))

        return temp_rot_ht.dot(temp_vec_ht)
    }
}