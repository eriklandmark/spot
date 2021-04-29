import ServoDriver from "./src/drivers/servo_driver"
import {sleep} from "./src/lib/helper_functions"
import DataDriver from "./src/drivers/data_driver";
import CameraDriver from "./src/drivers/camera_driver";
import HardwareDriver from "./src/drivers/hardware_driver";
import ws from "ws"

const servo_driver = new ServoDriver()
const data_driver = new DataDriver()
const camera_driver = new CameraDriver()
const hardware_driver = new HardwareDriver()

process.env.NODE_ENV = process.env.NODE_ENV || "development"

process.on('SIGINT', function() {
    console.log("\nCleaning up...")
    camera_driver.stop()
    servo_driver.clean_up()
    data_driver.clean_up()
    hardware_driver.clean_up()
    console.log("Exiting!")
    process.exit()
});

const server = new ws.Server({
    port: 5100
})


async function run() {
    await servo_driver.init()
    await data_driver.init()
    await camera_driver.init()
    await hardware_driver.init()
    //camera_driver.start()

    console.log("Started")

    server.on('connection', (ws) => {
        console.log("New Connection")
        setInterval(() => {
            try {
                ws.send(JSON.stringify({data_driver: data_driver.data, camera_driver: camera_driver.data, hardware_driver: hardware_driver.data}))
            } catch(e) {

            }
        }, 200)
    });


    /*const servos = 2
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
    }*/
}

run()