import ServoDriver from "./src/drivers/servo_driver"
import {sleep} from "./src/lib/helper_functions"
import DataDriver from "./src/drivers/data_driver";

const servo_driver = new ServoDriver()
const data_controller = new DataDriver()

process.env.NODE_ENV = process.env.NODE_ENV || "development"

process.on('SIGINT', function() {
    console.log("\nCleaning up...")
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
            servo_driver.set_output(i, 0)
        }
        console.log(data_controller.sensor_data)
        await sleep(2000)
        console.log(data_controller.sensor_data)
        for (let i = 0; i < servos; i++) {
            servo_driver.set_output(i, 1)
        }
        await sleep(2000)
    }
}

run()