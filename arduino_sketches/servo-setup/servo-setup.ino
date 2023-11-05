#include <SCServo.h>

SCSCL sc;

int ID_ChangeFrom = 1;
int ID_Changeto   = 5;

void setup()
{
  Serial.begin(9600);
  Serial.println("Setup started...");

  delay(5000);

  Serial1.begin(1000000);
  sc.pSerial = &Serial1;
  delay(1000);
  Serial.println("Initialized!");

  if (sc.FeedBack(ID_ChangeFrom) != -1) {
    Serial.println("Moving to midle position..");
    sc.WritePos(ID_ChangeFrom, 500, 0, 500);
    delay(1000);

    if (ID_ChangeFrom != ID_Changeto) {
      Serial.print("Changing id ");
      Serial.print(ID_ChangeFrom);
      Serial.print(" to ");
      Serial.println(ID_Changeto);

      sc.unLockEprom(ID_ChangeFrom);//unlock EPROM-SAFE
      sc.writeByte(ID_ChangeFrom, SCSCL_ID, ID_Changeto);//ID
      sc.LockEprom(ID_Changeto);// EPROM-SAFE locked

      Serial.print("Setup done! Testing if successfull... ");
      if (sc.FeedBack(ID_Changeto) != -1) {
        Serial.println("Success!");
      } else {
        Serial.println("Failed!");
      }
    } else {
      Serial.println("Skipping changing ids..");
    }

    Serial.println("Done!");
  } else {
    Serial.println("Couldn't find servo, wrong ID?");
  }
}

void loop() {}
