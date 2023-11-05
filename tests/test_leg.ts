import Transformations from "../src/lib/kinematics/transformations.ts";
import Kinematics from "../src/lib/kinematics/kinematics.ts";
import SpotMicroLeg from "../src/lib/kinematics/spot_micro_leg.ts";
import Tensor from "nn-lib/dist/tensor.js";


const q1 = 0
const q2 = 0
const q3 = 30 * Math.PI / 180
const l1 = 1
const l2 = 2
const l3 = 3

Transformations.rotxyz(0, 0, 0)
    .concatenate(new Tensor([[0], [0], [0]]), "h")
    .concatenate(new Tensor([0, 0, 0, 1]),"v").print()

// Body coordinate system homogeneous transformation. Center at 0, no rotations
const body_ht = Transformations.homog_transform(0, 0, 0, 0, 0, 0)

// Right front leg homogeneous transform. For test, create with 0 width and length, so
// leg start position should be at origin aligned with global coordinate frame
const ht_rf = Kinematics.t_rightfront(body_ht, 0, 0)

const leg = new SpotMicroLeg(q1, q2, q3, l1, l2, l3, ht_rf, true)

const [p1, p2, p3, p4] = leg.get_leg_points()

const known_true_p1 = new Tensor([0, 0, 0])
const known_true_p2 = new Tensor([0, 0, 1])
const known_true_p3 = new Tensor([0, -2, 1])
const known_true_p4 = new Tensor([l3 * Math.sin(q3), -l3 * Math.cos(q3) - 2, 1])

console.log(p1.equal(known_true_p1, 1e-10))
console.log(p2.equal(known_true_p2, 1e-10))
console.log(p3.equal(known_true_p3, 1e-10))
console.log(p4.equal(known_true_p4, 1e-10))
