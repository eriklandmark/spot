#include <Arduino_JSON.h>
#include <Vector.h>
#include <SCServo.h>

#define DEBUG false
#define MEAN_BUFFER_SIZE 512
#define NUM_DATA_VARIABLE 4

#define C_V 0.008024341496
#define C_C 0.016216216216

#define C_B_1 -0.91693
#define C_B_2 0.136255
#define C_B_3 0.078128
#define C_B_4 0.000066
#define C_B_5 -0.009801

float used_capacity = 0;
float last_current = 0;
unsigned long last_micros = 0;
unsigned long prev_millis = millis();

float mean_voltage_buffer[MEAN_BUFFER_SIZE];
float mean_current_buffer[MEAN_BUFFER_SIZE];

Vector<float> mean_voltage_vector(mean_voltage_buffer);
Vector<float> mean_current_vector(mean_current_buffer);

float stored_data[NUM_DATA_VARIABLE];

SCSCL sc1;  // Front Legs
SCSCL sc2;  // Back Legs

bool FRONT_LEGS_ACTIVE[] = { false, false, false, false, false, false };
bool BACK_LEGS_ACTIVE[] = { false, false, false, false, false, false };

bool FRONT_LEGS_ENABLED[] = { false, false, false, false, false, false };
bool BACK_LEGS_ENABLED[] = { false, false, false, false, false, false };

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

  delay(500);

  for (short i = 1; i <= 6; i++) {
    if (sc1.FeedBack(i) != -1) {
      FRONT_LEGS_ACTIVE[i - 1] = true;
    }
  }

  for (short i = 1; i <= 6; i++) {
    if (sc2.FeedBack(i) != -1) {
      BACK_LEGS_ACTIVE[i - 1] = true;
    }
  }

  digitalWrite(LED_BUILTIN, HIGH);
}

void loop() {
  unsigned long current_micros = micros();
  short raw_voltage = analogRead(A0);
  short raw_current = analogRead(A1);

  float voltage = raw_voltage * C_V; //0.0032964978;
  float current = raw_current * C_C; //C_B_1 + C_B_2 * voltage + C_B_3 * raw_current + C_B_4 * pow(raw_current, 2) + C_B_5 * voltage * raw_current;
  float power = voltage * current;
  used_capacity += (current_micros - last_micros) * (last_current + current) * 1.38888889e-7;

  last_micros = current_micros;
  last_current = current;

  mean_voltage_vector.push_back(voltage);
  mean_current_vector.push_back(current);
  if (mean_voltage_vector.size() >= MEAN_BUFFER_SIZE) {
    mean_voltage_vector.remove(0);
    mean_current_vector.remove(0);
  }

  if (Serial.available() != 0) {
    String data = Serial.readStringUntil('\n');
    JSONVar response = JSON.parse(data);

    if (response.hasPropertyEqual("action", "read")) {
      JSONVar payload;

      for (short i = 1; i <= 6; i++) {
        String key = "f_" + String(i);
        payload[key]["active"] = FRONT_LEGS_ACTIVE[i - 1];
        if (FRONT_LEGS_ACTIVE[i - 1] && sc1.FeedBack(i) != -1) {
          payload[key]["enabled"] = FRONT_LEGS_ENABLED[i - 1];
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
        payload[key]["active"] = BACK_LEGS_ACTIVE[i - 1];
        if (BACK_LEGS_ACTIVE[i - 1] && sc2.FeedBack(i) != -1) {
          payload[key]["enabled"] = BACK_LEGS_ENABLED[i - 1];
          payload[key]["pos"] = sc2.ReadPos(-1);
          payload[key]["speed"] = sc2.ReadSpeed(-1);
          payload[key]["load"] = sc2.ReadLoad(-1);
          payload[key]["voltage"] = sc2.ReadVoltage(-1) / 10.0;
          payload[key]["temp"] = sc2.ReadTemper(-1);
          payload[key]["moving"] = sc2.ReadMove(-1);
        }
      }

      if (response.hasOwnProperty("msg_id")) {
        payload["msg_id"] = (String)response["msg_id"];
      }

      float mean_voltage_calc = 0;
      float mean_current_calc = 0;
      for (int i = 0; i < MEAN_BUFFER_SIZE; i++) {
        mean_voltage_calc += mean_voltage_buffer[i];
        mean_current_calc += mean_current_buffer[i];
      }

      payload["voltage"] = mean_voltage_calc / MEAN_BUFFER_SIZE;
      payload["current"] = mean_current_calc / MEAN_BUFFER_SIZE;
      payload["used_capacity"] = used_capacity;

      Serial.println(payload);
    } else if (response.hasPropertyEqual("action", "write") && response.hasOwnProperty("data")) {
      bool has_front_actions = false;
      bool has_back_actions = false;
      for (short i = 0; i < response["data"].keys().length(); i++) {
        String key = (String)response["data"].keys()[i];
        int id = key.charAt(2) - '0';

        if (response["data"][key].hasOwnProperty("pos") && response["data"][key].hasOwnProperty("speed")) {
          if (FRONT_LEGS_ACTIVE[id - 1] && key.startsWith("f")) {
            sc1.RegWritePos(id, (int)response["data"][key]["pos"], 0, (int)response["data"][key]["speed"]);
            has_front_actions = true;
          } else if (BACK_LEGS_ACTIVE[id - 1] && key.startsWith("b")) {
            sc2.RegWritePos(id, (int)response["data"][key]["pos"], 0, (int)response["data"][key]["speed"]);
            has_back_actions = true;
          }
        } else if (response["data"][key].hasOwnProperty("enabled")) {
          if (FRONT_LEGS_ACTIVE[id - 1] && key.startsWith("f")) {
            FRONT_LEGS_ENABLED[id - 1] = (bool)response["data"][key]["enabled"];
            sc1.EnableTorque(id, (bool)response["data"][key]["enabled"]);
          } else if (BACK_LEGS_ACTIVE[id - 1] && key.startsWith("b")) {
            BACK_LEGS_ENABLED[id - 1] = (bool)response["data"][key]["enabled"];
            sc2.EnableTorque(id, (bool)response["data"][key]["enabled"]);
          }
        }
      }

      if (has_front_actions) {
        sc1.RegWriteAction();
      }

      if (has_back_actions) {
        sc2.RegWriteAction();
      }

      Serial.println(response);
    } else if (response.hasPropertyEqual("action", "calibrate")) {
      JSONVar payload;

      float mean_voltage_calc = 0;
      float mean_current_calc = 0;
      for (int i = 0; i < MEAN_BUFFER_SIZE; i++) {
        mean_voltage_calc += mean_voltage_buffer[i];
        mean_current_calc += mean_current_buffer[i];
      }

      payload["voltage"] = mean_voltage_calc / MEAN_BUFFER_SIZE;
      payload["current"] = mean_current_calc / MEAN_BUFFER_SIZE;
      payload["raw_voltage"] = (double)payload["voltage"] / C_V;
      payload["raw_current"] = (double)payload["current"] / C_C;

      payload["used_capacity"] = used_capacity;

      if (response.hasOwnProperty("msg_id")) {
        payload["msg_id"] = (String)response["msg_id"];
      }

      Serial.println(payload);
    }
  }
}