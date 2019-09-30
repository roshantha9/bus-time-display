/*
 * main.cpp
 *
 *  Created on: Sep 14, 2019
 *      Author: Rosh
 *
 *  Description:
 *  - Fetch bus time from backend (AWS)
 *  - parse JSON
 *  - display bus times
 */


#define ENABLE_GxEPD2_GFX 0
#define ESP32 1

#include <Arduino.h>


#include <GxEPD2_BW.h>
#include <Fonts/FreeMonoBold9pt7b.h>
//#include <Fonts/Tiny3x3a2pt7b.h>
#include "WiFi.h" // ESP32 WiFi include
#include <HTTPClient.h>



// local imports
#include "secret.h"
#include "debug.h"



// constants
#define uS_TO_S_FACTOR 1000000  /* Conversion factor for micro seconds to seconds */
#define TIME_TO_SLEEP  10        /* Time ESP32 will go to sleep (in seconds) */

RTC_DATA_ATTR int bootCount = 0;




// EPD global init
GxEPD2_BW<GxEPD2_154, GxEPD2_154::HEIGHT> display(GxEPD2_154(/*CS=5*/ SS, /*DC=*/ 22, /*RST=*/ 21, /*BUSY=*/ 4));


const char HelloWorld[] = "Time: xx:xx\n\
5040: 20m,20m,20m\n\
5041: 20m,20m,20m\n\
5042: 20m,20m,20m\n\
5043: 20m,20m,20m\n\
5044: 20m,20m,20m\n\
5045: 20m,20m,20m\n\
5046: 20m,20m,20m\n\
5047: 20m,20m,20m\n\
5048: 20m,20m,20m\n\
5049: 20m,20m,20m";


char textBuff[512] = "";






/* function prototypes */
void displayBusData(void);
void wifiConnect(void);
void wifiDisconnect(void);
void httpGetBusData(void);
void print_wakeup_reason(void);


/****************** setup *****************/
void setup()
{
  
  // setup serial debug
  Serial.begin(115200);
  Serial.println();
  Serial.println("SETUP:: starting ...");
  
  // print boot count and wakeup reason  
  ++bootCount;
  Serial.println("Boot number: " + String(bootCount));  
  print_wakeup_reason();

  // wifi connect and retrieve bus data
  wifiConnect();
  delay(200);
  httpGetBusData();
  delay(100);
  wifiDisconnect();

  // display on EPD (full refresh)
  Serial.println("EPD initialize");
  display.init();   
  Serial.println("EPD show bus data");
  displayBusData();  
  delay(100);  
  display.powerOff();
    
  // init deep sleep timer
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
  Serial.println("SETUP:: sleep for every " + String(TIME_TO_SLEEP) + " Seconds");
  Serial.println("SETUP:: going to sleep now");
  delay(1000);
  Serial.flush(); 
  esp_deep_sleep_start();
  
  
}




/****************** loop *****************/
void loop()
{  
  //This is not going to be called
}






/***********************************************************************************************
 * DS/WAKEUP related
 ***********************************************************************************************/

void print_wakeup_reason(){
  esp_sleep_wakeup_cause_t wakeup_reason;

  wakeup_reason = esp_sleep_get_wakeup_cause();

  switch(wakeup_reason)
  {
    case ESP_SLEEP_WAKEUP_EXT0 : Serial.println("Wakeup caused by external signal using RTC_IO"); break;
    case ESP_SLEEP_WAKEUP_EXT1 : Serial.println("Wakeup caused by external signal using RTC_CNTL"); break;
    case ESP_SLEEP_WAKEUP_TIMER : Serial.println("Wakeup caused by timer"); break;
    case ESP_SLEEP_WAKEUP_TOUCHPAD : Serial.println("Wakeup caused by touchpad"); break;
    case ESP_SLEEP_WAKEUP_ULP : Serial.println("Wakeup caused by ULP program"); break;
    default : Serial.printf("Wakeup was not caused by deep sleep: %d\n",wakeup_reason); break;
  }
}





/***********************************************************************************************
 * HTTP RELATED
 ***********************************************************************************************/
void httpGetBusData(){

  Serial.println("httpGetBusData::Enter");
    
  HTTPClient http;
  http.begin(TYBUS_DATA_URL, root_ca); //Specify the URL and certificate

  int httpCode = http.GET();

  if (httpCode > 0) { //Check for the returning code
 
   String payload = http.getString();
   Serial.println(httpCode);
   Serial.println(payload);

   // add new lines approperiately
   payload.replace("\"", "");
   payload.replace("**", "\n");

   //Serial.println("before conversion");
   payload.toCharArray(textBuff, 512);   
   //Serial.println("after conversion");
   Serial.println(textBuff);

  } 
  else {
    Serial.println("Error on HTTP request");
  }
}



/***********************************************************************************************
 * WIFI RELATED
 ***********************************************************************************************/

// conect
void wifiConnect(){
  Serial.println("wifiConnect::Enter");
  if (WiFi.status() != WL_CONNECTED){
    Serial.println("wifiConnect:: going to begin");
    WiFi.mode(WIFI_STA);
    WiFi.begin(SSID, WIFIPASS);
    Serial.print("Connecting to "); Serial.println(SSID);
  
    uint8_t i = 0;
    while (WiFi.status() != WL_CONNECTED)
    {
      Serial.print('.');
      delay(500);
  
      if ((++i % 16) == 0)
      {
        Serial.println(F(" still trying to connect"));
      }
    }
  
    Serial.print(F("Connected. My IP address is: "));
    Serial.println(WiFi.localIP());
    }  
}

// disconnect
void wifiDisconnect(){
  Serial.println("wifiDisconnect::Enter");
  if (WiFi.status() != WL_DISCONNECTED){
    Serial.println("DISCONNECTING...");
    //esp_wifi_disconnect();                     // This works
    WiFi.disconnect();                           // This doesnt
    while (WiFi.status() == WL_CONNECTED) {
      delay(500);
    }
    Serial.println(WiFi.status() != WL_CONNECTED ? "DISCONNECTED" : "FAILED");
  }
  
}



/***********************************************************************************************
 * DISPLAY RELATED
 ***********************************************************************************************/

void displayBusData()
{
  Serial.println("displayBusData::Enter");
  display.setRotation(1);
  display.setFont(&FreeMonoBold9pt7b);
  display.setTextColor(GxEPD_BLACK);
  int16_t tbx, tby; uint16_t tbw, tbh;
  display.getTextBounds(textBuff, 0, 0, &tbx, &tby, &tbw, &tbh);
  // center bounding box by transposition of origin:
  //uint16_t x = ((display.width() - tbw) / 2) - tbx;
  //uint16_t y = ((display.height() - tbh) / 2) - tby;

  uint16_t x = 0;
  uint16_t y = 10;

  display.setFullWindow();
  display.firstPage();
  do
  {
    display.fillScreen(GxEPD_WHITE);
    display.setCursor(x, y);
    Serial.println("going to print");
    display.print(textBuff);
    Serial.println("after print");
  }
  while (display.nextPage());
  Serial.println("printin done");
}

/***********************************************************************************************
 * HELPERS
 ***********************************************************************************************/
