#include <Arduino_JSON.h>
#include <Vector.h>
#include <SCServo.h>

#define DEBUG false
#define SAMPLE_RATE 20  // SAMPLES per second
#define MEAN_BUFFER_SIZE 512
#define NUM_DATA_VARIABLE 4

#define C_B_1 -0.91693
#define C_B_2 0.136255
#define C_B_3 0.078128
#define C_B_4 0.000066
#define C_B_5 -0.009801

float accumulated_energy = 0;
float last_power = 0;
unsigned long last_micros = 0;
unsigned long prev_millis = millis();

float mean_voltage_buffer[MEAN_BUFFER_SIZE];
float mean_current_buffer[MEAN_BUFFER_SIZE];

Vector<float> mean_voltage_vector(mean_voltage_buffer);
Vector<float> mean_current_vector(mean_current_buffer);

float stored_data[NUM_DATA_VARIABLE];

SCSCL sc1;  // Front Legs
SCSCL sc2;  // Back Legs

bool FRONT_LEGS_ENABLED[] = { true, true, true, true, true, true };
bool BACK_LEGS_ENABLED[] = { true, true, true, true, true, true };

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  pinMode(A0, INPUT);
  pinMode(A1, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);

  Serial1.begin(1000000);
  sc1.pSerial = &Serial1;
  Serial2.begin(1000000);
  sc2.pSerial = &Serial2;

  for (short i = 1; i <= 6; i++) {
    if (sc1.FeedBack(i) == -1) {
      FRONT_LEGS_ENABLED[i-1] = false;
    } else if (FRONT_LEGS_ENABLED[i-1]) {
      sc1.EnableTorque(i, true);
    }
  }

  for (short i = 1; i <= 6; i++) {
    if (sc2.FeedBack(i) == -1) {
      BACK_LEGS_ENABLED[i-1] = false;
    } else if (BACK_LEGS_ENABLED[i-1]) {
      sc2.EnableTorque(i, true);
    }
  }

  digitalWrite(LED_BUILTIN, HIGH);
}

void loop() {
  unsigned long current_micros = micros();
  short raw_voltage = analogRead(A0);
  float voltage = raw_voltage * 0.0032964978;
  short raw_current = analogRead(A1);
  float current = C_B_1 + C_B_2 * voltage + C_B_3 * raw_current + C_B_4 * pow(raw_current, 2) + C_B_5 * voltage * raw_current;
  float power = voltage * current;
  accumulated_energy += (current_micros - last_micros) * (last_power + power) * 1.38888889e-10;

  last_micros = current_micros;
  last_power = power;

  mean_voltage_vector.push_back(voltage);
  mean_current_vector.push_back(current);
  if (mean_voltage_vector.size() >= MEAN_BUFFER_SIZE) {
    mean_voltage_vector.remove(0);
    mean_current_vector.remove(0);
  }

  if (Serial.available() != 0) {
    String data = Serial.readStringUntil('\n');
    JSONVar response = JSON.parse(data);

    for (short i = 0; i < response.keys().length(); i++) {
      String key = (String)response.keys()[i];

      if (key.startsWith("f")) {
        sc1.RegWritePos(int(key.charAt(2)), (int)response[key]["pos"], 0, response[key]["speed"]);
      } else if (key.startsWith("b")) {
        sc2.RegWritePos(int(key.charAt(2)), (int)response[key]["pos"], 0, response[key]["speed"]);
      }
    }

    sc1.RegWriteAction();
    sc2.RegWriteAction();
  }

  unsigned long current_millis = millis();
  if (current_millis - prev_millis >= (1000 / SAMPLE_RATE)) {
    prev_millis = current_millis;
    JSONVar payload;

    float mean_voltage_calc = 0;
    float mean_current_calc = 0;
    for (int i = 0; i < MEAN_BUFFER_SIZE; i++) {
      mean_voltage_calc += mean_voltage_buffer[i];
      mean_current_calc += mean_current_buffer[i];
    }

    payload["voltage"] = mean_voltage_calc / MEAN_BUFFER_SIZE;
    payload["current"] = mean_current_calc / MEAN_BUFFER_SIZE;
    payload["energy"] = accumulated_energy;

    for (short i = 1; i <= 6; i++) {
      String key = "f_" + String(i);
      payload[key]["enabled"] = FRONT_LEGS_ENABLED[i-1];
      if (FRONT_LEGS_ENABLED[i-1] && sc1.FeedBack(i) != -1) {
        payload[key]["pos"] = sc1.ReadPos(-1);
        payload[key]["speed"] = sc1.ReadSpeed(-1);
        payload[key]["load"] = sc1.ReadLoad(-1);
        payload[key]["voltage"] = sc1.ReadVoltage(-1) / 10.0;
        payload[key]["temp"] = sc1.ReadTemper(-1);
        payload[key]["moving"] = sc1.ReadMove(-1);
      }
    }

    for (short i = 1; i <= 6; i++) {
      String key = "b_" + String(i);
      payload[key]["enabled"] = BACK_LEGS_ENABLED[i-1];
      if (BACK_LEGS_ENABLED[i-1] && sc2.FeedBack(i) != -1) {
        payload[key]["pos"] = sc2.ReadPos(-1);
        payload[key]["speed"] = sc2.ReadSpeed(-1);
        payload[key]["load"] = sc2.ReadLoad(-1);
        payload[key]["voltage"] = sc2.ReadVoltage(-1) / 10.0;
        payload[key]["temp"] = sc2.ReadTemper(-1);
        payload[key]["moving"] = sc2.ReadMove(-1);
      }
    }

    Serial.println(payload);
  }
}