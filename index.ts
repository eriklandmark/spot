import ServoDriver from "./servo_driver"
import DataControllerDriver from "./data_controller_driver"
import {sleep} from "./helper_functions"

const servo_driver = new ServoDriver()
const data_controller = new DataControllerDriver()

process.on('SIGINT', function() {
    console.log("Cleaning up...")
    servo_driver.clean_up()
    data_controller.clean_up()
    console.log("Exiting!")
    process.exit()
});

async function run() {
    await servo_driver.init()
    await data_controller.init()
    const servos = 6
    while (true) {
        for (let i = 0; i < servos; i++) {
            servo_driver.set_ouput(i, 0)
        }
        console.log(data_controller.sensor_data)
        await sleep(2000)
        console.log(data_controller.sensor_data)
        for (let i = 0; i < servos; i++) {
            servo_driver.set_ouput(i, 1)
        }
        await sleep(2000)
    }
}

run()