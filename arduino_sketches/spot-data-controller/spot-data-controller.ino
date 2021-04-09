#include <Wire.h>

void setup() {
    Wire.begin(8);
    delay(1000);               
    Wire.onRequest(requestEvents);
    Wire.onReceive(receiveEvents);

    pinMode(A0, INPUT);
    pinMode(A1, INPUT);
    pinMode(A2, INPUT);
    pinMode(6, OUTPUT);
    pinMode(7, OUTPUT);
    pinMode(8, INPUT);
    pinMode(9, INPUT)
}

int cmd = 0;

// 0 = voltage, 1 = current, 2 = bec_temp
int stored_data[3] = {0,0,0,0,0};

unsigned long previousMillis = millis();
unsigned long interval = 50;

void loop(){
    unsigned long currentMillis = millis();
    if (currentMillis - previousMillis >= interval) {
        previousMillis = currentMillis;
        updateData();
    }
}

void requestEvents() {
    if (cmd > 0) {
        Wire.write(stored_data[cmd - 1]);
        cmd = 0;
    }
}

void receiveEvents(int numBytes) {
    int index = 0;
    int data[numBytes];
    while(Wire.available()) {
        data[index] = Wire.read();
        index += 1;
    }

    cmd = data[0];

    if (numBytes > 1) {
        stored_data[cmd - 1] = data[1];
    }
}

void updateData() {
    stored_data[0] = analogRead(A0);
    stored_data[1] = analogRead(A1);
    stored_data[2] = analogRead(A2);

    for (int i = 0; i < 1; i++) {
        digitalWrite(6 + i, LOW);
        delayMicroseconds(5);
        digitalWrite(6 + i, HIGH);
        delayMicroseconds(10);
        digitalWrite(6 + i, LOW);

        int duration = pulseIn(8 + i, HIGH);
        stored_data[3 + i] = (int) (duration/2) / 29.1;
    }
}