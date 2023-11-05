import SpotMicroFigure from "../src/lib/kinematics/spot_micro_figure.ts";
import Tensor from "nn-lib/dist/tensor.js";
import fs from "fs";


const sm = new SpotMicroFigure(0, 0.14, 0, 0, 0)

const l = sm.body_length
const w = sm.body_width
const desired_p4_points = [
    new Tensor([-l / 2, 0, w / 2 + sm.hip_length]),
    new Tensor([l / 2, 0, w / 2 + sm.hip_length]),
    new Tensor([l / 2, 0, -w / 2 - sm.hip_length]),
    new Tensor([-l / 2, 0, -w / 2 - sm.hip_length])
]

sm.set_absolute_foot_coordinates(desired_p4_points)
sm.set_body_angles(10*Math.PI/180, 10*Math.PI/180, 0)

const leg_coords = sm.get_leg_coordinates()

function get_leg_coord(leg: Tensor[]) {
    let x: number[], y: number[], z: number[] = []
    x = leg.map((pos) => pos.get([0]))
    y = leg.map((pos) => pos.get([1]))
    z = leg.map((pos) => pos.get([2]))
    return [x, y, z]
}

fs.writeFileSync("C:/Projects/spot/scripts/legs_coord_data.json", JSON.stringify({
    "rb": get_leg_coord(leg_coords[0]),
    "rf": get_leg_coord(leg_coords[1]),
    "lb": get_leg_coord(leg_coords[2]),
    "lf": get_leg_coord(leg_coords[3])
}))
