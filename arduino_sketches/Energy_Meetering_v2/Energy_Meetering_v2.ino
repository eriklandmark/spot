#include <Vector.h>
#include <Wire.h>
#include <SCServo.h>

SCSCL sc1;
SCSCL sc2;

#define I2C_ADDRESS 0x16

#define MEAN_BUFFER_SIZE 512
#define NUM_DATA_VARIABLE 4 + 6

#define DEBUG true

#define C_B_1 -0.91693
#define C_B_2 0.136255
#define C_B_3 0.078128
#define C_B_4 0.000066
#define C_B_5 -0.009801

float last_power = 0;
unsigned long last_micros = 0;
unsigned long last_update = 0;

float mean_voltage_buffer[MEAN_BUFFER_SIZE];
float mean_current_buffer[MEAN_BUFFER_SIZE];

Vector<float> mean_voltage_vector(mean_voltage_buffer);
Vector<float> mean_current_vector(mean_current_buffer);

float stored_data[NUM_DATA_VARIABLE];

byte i2c_cmd = 0;

void setup() {
  Serial.begin(9600);
  analogReadResolution(12);
  pinMode(A0, INPUT);
  pinMode(A1, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);

  Serial1.begin(1000000);
  sc1.pSerial = &Serial1;
  Serial2.begin(1000000);
  sc2.pSerial = &Serial2;

  Wire.setSDA(4);
  Wire.setSCL(5);
  Wire.begin(I2C_ADDRESS);
  Wire.onRequest(requestEvents);
  Wire.onReceive(receiveEvents);
  delay(500);

  digitalWrite(LED_BUILTIN, HIGH);
}

void loop() {
  unsigned long current_micros = micros();
  short raw_voltage = analogRead(A0);
  float voltage = raw_voltage * 0.0032964978;
  short raw_current = analogRead(A1);
  //float current = raw_current;
  //float current = pow(raw_current,2)*1.049511192710550e-04 + raw_current*-6.924347060562008e-04 -0.023241517643439;
  float current = C_B_1 + C_B_2 * voltage + C_B_3 * raw_current + C_B_4 * pow(raw_current, 2) + C_B_5 * voltage * raw_current;
  float power = voltage * current;

  // stored_data[3] += (current_micros - last_micros)*(last_current + current)*1.38888889e-7;
  stored_data[3] += (current_micros - last_micros) * (last_power + power) * 1.38888889e-10;

  last_micros = current_micros;
  last_power = power;

  mean_voltage_vector.push_back(voltage);
  mean_current_vector.push_back(current);
  if (mean_voltage_vector.size() >= MEAN_BUFFER_SIZE) {
    mean_voltage_vector.remove(0);
    mean_current_vector.remove(0);
  }

  float mean_voltage_calc = 0;
  float mean_current_calc = 0;
  for (int i = 0; i < MEAN_BUFFER_SIZE; i++) {
    mean_voltage_calc += mean_voltage_buffer[i];
    mean_current_calc += mean_current_buffer[i];
  }

  stored_data[0] = mean_voltage_calc / MEAN_BUFFER_SIZE;
  stored_data[1] = mean_current_calc / MEAN_BUFFER_SIZE;
  stored_data[2] = stored_data[0] * stored_data[1];

  if (sc1.FeedBack(1) != -1) {
    stored_data[4] = sc1.ReadPos(-1);
    stored_data[5] = sc1.ReadSpeed(-1);
    stored_data[6] = sc1.ReadLoad(-1);
    stored_data[7] = sc1.ReadVoltage(-1) / 10.0;
    stored_data[8] = sc1.ReadTemper(-1);
    stored_data[9] = sc1.ReadMove(-1);
  }

  current_micros = micros();
  if (current_micros - last_update >= 10e4 && DEBUG) {
    last_update = current_micros;
    for (int i = 0; i < NUM_DATA_VARIABLE; i++) {
      Serial.print(stored_data[i]);
      Serial.print("\t");
    }
    Serial.println();
  }
}


void requestEvents() {
  uint8_t data_array[2];

  if (i2c_cmd > 0) {
    data_array[0] = (short(round(stored_data[i2c_cmd - 1] * 100)) >> 8) & 0xFF;
    data_array[1] = short(round(stored_data[i2c_cmd - 1] * 100)) & 0xFF;
    i2c_cmd = 0;
  }

  Wire.write(data_array, 2);
}

void receiveEvents(int numBytes) {
  int index = 0;
  int data[numBytes];
  while (Wire.available()) {
    data[index] = Wire.read();
    index += 1;
  }

  i2c_cmd = data[0];
}