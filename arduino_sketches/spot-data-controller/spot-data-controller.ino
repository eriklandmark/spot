#include <i2c_t3.h>

#define DEBUG false

#define I2C_ADDRESS 8

#define SAMPLE_RATE 20 // SAMPLES per second.
#define SAMPLE_RANGE true

void setup() {
    analogReadResolution(14);

    if (DEBUG) {
        Serial.begin(9600);
        delay(500);
    }

    Wire.setSDA(18);
    Wire.setSCL(19);
    Wire1.begin(I2C_SLAVE, I2C_ADDRESS, I2C_PINS_18_19, I2C_PULLUP_EXT, 400000);
    delay(500);
    Wire.onRequest(requestEvents);
    Wire.onReceive(receiveEvents);

    pinMode(A0, INPUT);
    pinMode(A1, INPUT);
    pinMode(A2, INPUT);
    pinMode(6, OUTPUT);
    pinMode(7, OUTPUT);
    pinMode(8, INPUT);
    pinMode(9, INPUT);
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, HIGH);
}

int cmd = 0;

// 0 = voltage, 1 = current, 2 = bec_temp
const int stored_data_length = 5;
int stored_data[stored_data_length] = {0,0,0,0,0};

unsigned long previousMillis = millis();

void loop(){
    unsigned long currentMillis = millis();
    if (currentMillis - previousMillis >= (1000/SAMPLE_RATE)) {
        previousMillis = currentMillis;
        updateData();

        if (DEBUG) {
            for(int i = 0; i < stored_data_length; i++) {
                Serial.print(stored_data[i]);
                Serial.print("\t");
            }
            Serial.println("");
        }
    }
}

void requestEvents() {
    if (cmd > 0) {
        uint8_t data_array[2];
        //Serial.print(cmd);
        //Serial.print(":");
        //Serial.println(stored_data[cmd - 1]);
        data_array[0] = (stored_data[cmd - 1] >> 8) & 0xFF;
        data_array[1] = stored_data[cmd - 1] & 0xFF;
        Wire.write(data_array, 2);
        cmd = 0;
    }
}

void receiveEvents(size_t numBytes) {
    int index = 0;
    int data[numBytes];
    while(Wire.available()) {
        data[index] = Wire.read();
        index += 1;
    }

    cmd = data[0];
}

void updateData() {
    stored_data[0] = analogRead(A0);
    stored_data[1] = analogRead(A1);
    stored_data[2] = analogRead(A2);

    if (SAMPLE_RANGE) {
        for (int i = 0; i < 1; i++) {
            digitalWrite(6 + i, LOW);
            delayMicroseconds(5);
            digitalWrite(6 + i, HIGH);
            delayMicroseconds(10);
            digitalWrite(6 + i, LOW);

            int duration = pulseIn(8 + i, HIGH);
            stored_data[3 + i] = duration;
            
            // (int) (duration/2) / 29.1;
        }
    }
}
