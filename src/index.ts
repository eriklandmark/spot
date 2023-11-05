import WebSocket, {WebSocketServer} from "ws"
import ServoDriver from "./drivers/servo_driver.ts";
import HardwareDriver from "./drivers/hardware_driver.ts";
import Logger from "./lib/logger.ts";
import KinematicsController from "./controllers/kinematics_controller.ts";
import InputController from "./controllers/input_controller.ts";

process.env.NODE_ENV = process.env.NODE_ENV || "development"

export default class SpotBackend extends Logger {

    servo_driver: ServoDriver
    hardware_driver: HardwareDriver
    kinematics_controller: KinematicsController
    input_controller: InputController
    server = new WebSocketServer({port: 5100, host: "0.0.0.0"})

    armed: boolean = false

    constructor() {
        super()
        super.setLogPrefix("MAIN")
        this.kinematics_controller = new KinematicsController(this)
        this.servo_driver = new ServoDriver(this)
        this.hardware_driver = new HardwareDriver()
        this.input_controller = new InputController(this)
    }

    async run() {
        await this.servo_driver.init()
        await this.hardware_driver.init()

        process.on('SIGINT', () => {
            this.log("Cleaning up...")
            this.hardware_driver.clean_up()
            this.servo_driver.clean_up()
            this.log("Exiting!")
            process.exit()
        });

        this.server.on('connection', (client) => {
            this.log("New Connection")

            client.on("message", (data) => {
                this.input_controller.handle_input(JSON.parse(data.toString()))
            })
            client.send(JSON.stringify({
                time: Date.now(),
                armed: this.armed
            }))

            const id = setInterval(() => {
                try {
                    client.send(JSON.stringify({
                        time: Date.now(),
                        servo_data: this.servo_driver.data,
                        hardware_data: this.hardware_driver.data,
                        kinematics_data: this.kinematics_controller.data
                    }))
                } catch (e) {
                    this.log("Lost connection! Closing stream.")
                    clearInterval(id)
                }
            }, 100)
        });

        this.log("Started")
    }

    send_to_clients(data: any) {
        this.server.clients.forEach(
            (client: WebSocket) => client.send(JSON.stringify({time: Date.now(), ...data})))
    }
}

new SpotBackend().run().catch(console.error)