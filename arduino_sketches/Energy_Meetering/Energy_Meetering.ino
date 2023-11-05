float energy = 0;
float last_current = 0;
unsigned long last_micros = 0;

int mean_buffer_size = 4000;
int mean_buffer_index = 0;

float mean_voltage_buffer = 0;
float mean_current_buffer = 0;

float mean_voltage = 0;
float mean_current = 0;
float mean_power = 0;

void setup() {
  Serial.begin(9600);
  analogReadResolution(12);
  // put your setup code here, to run once:
  pinMode(A1, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
}

void loop() {
  const unsigned long current_micros = micros();
  float voltage = analogRead(A0)*0.003388;
  float current = analogRead(A1)*0.010742;
  energy += (current_micros - last_micros)*(last_current + current)*1.38888889e-7;
  mean_current_buffer += current;
  mean_voltage_buffer += voltage;

  if (mean_buffer_index >= mean_buffer_size) {
    mean_voltage = mean_voltage_buffer/mean_buffer_size;
    mean_current = mean_current_buffer/mean_buffer_size;
    mean_power = mean_voltage * mean_current;

    Serial.print(mean_voltage);
    Serial.print("\t");
    Serial.print(mean_current);
    Serial.print("\t");
    Serial.print(mean_power);
    Serial.print("\t");
    Serial.print(energy);
    Serial.print("\t");
    Serial.println((current_micros - last_micros));
    mean_buffer_index = 0;
    mean_voltage_buffer = 0;
    mean_current_buffer = 0;
  } else {
    mean_buffer_index += 1;
  }

  last_micros = current_micros;
  last_current = current;
}
