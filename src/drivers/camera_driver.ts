import sharp from "sharp"
import jpegjs from "jpeg-js"
import fs from "fs"

const gstreamer = require("gstreamer-superficial")

export default class CameraDriver {
    
    pipeline: any = null
    latest_image:any = null 
    latest_image_time: number = 0
    started: boolean = false

    fps_calcs: number[] = []
    fps_sample_rate = 10
    
    data = {
        avg_fps: 0
    }

    constructor() {
        
    }

    async init(width = 1280, height = 720, fps = 30) {
        this.pipeline = new gstreamer.Pipeline(
            "nvarguscamerasrc ! " + 
            `video/x-raw(memory:NVMM), width=${width}, height=${height}, format=NV12, framerate=${fps}/1 ! ` +
            "nvvidconv flip-method=2 ! " + 
            "video/x-raw, format=(string)RGBA ! " +
            "appsink max-buffers=1 name=sink");
    }

    start() {
        const appsink = this.pipeline.findChild('sink');
        this.pipeline.play()
        this.latest_image_time = Date.now()

        const onData = (buffer) => {
            if (buffer) {
                const current_time = Date.now()
                const fps = 10**3/(current_time - this.latest_image_time)
                this.latest_image_time = current_time
                this.fps_calcs.push(fps)

                if (this.fps_calcs.length > this.fps_sample_rate) {
                    this.fps_calcs.splice(0,1)
                    this.data.avg_fps = Math.round(this.fps_calcs.reduce((acc, v) => acc + v, 0) / this.fps_sample_rate)
                }

                appsink.pull(onData);
            }
        }

        appsink.pull(onData);
        this.started = true
    }

    stop() {
        if (this.started) {
            this.pipeline.stop()
            this.started = false
        }
    }
}