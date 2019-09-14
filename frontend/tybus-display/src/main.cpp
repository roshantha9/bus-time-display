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
//#include <GxEPD2_3C.h>
#include <Fonts/FreeMonoBold9pt7b.h>
//#include <Fonts/Tiny3x3a2pt7b.h>

//#include <ArduinoHttpClient.h>
#include "WiFi.h" // ESP32 WiFi include
#include "secret.h"
#include <HTTPClient.h>


GxEPD2_BW<GxEPD2_154, GxEPD2_154::HEIGHT> display(GxEPD2_154(/*CS=5*/ SS, /*DC=*/ 22, /*RST=*/ 21, /*BUSY=*/ 4));

//#include "bitmaps/Bitmaps200x200.h" // 1.54" b/w

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


/****************** setup *****************/
void setup()
{
  Serial.begin(115200);
  Serial.println();
  Serial.println("setup");
  delay(100);  

  wifiConnect();
  
  Serial.println("setup done");
}

/****************** loop *****************/
void loop()
{
  // first update should be full refresh
  wifiConnect();
  delay(2000);
  httpGetBusData();
  delay(1000);
  Serial.println("going to display init");
  display.init(); 
  Serial.println("after display init");
  displayBusData();
  Serial.println("after display bus data");
  delay(1000);  
  display.powerOff();
  Serial.println("after display power off");
  wifiDisconnect();
  delay(10000);  // 10 seconds
  

}


/***********************************************************************************************
 * HTTP RELATED
 ***********************************************************************************************/
void httpGetBusData(){

  Serial.println("httpGetBusData::Exit");
  //HttpClient htclient = HttpClient(configEthClient, configServer, 80);

  //HttpClient http;
  //http.begin(url);


  HTTPClient http;
  http.begin(TYBUS_DATA_URL, root_ca); //Specify the URL and certificate

  int httpCode = http.GET();

  if (httpCode > 0) { //Check for the returning code
 
   String payload = http.getString();
   Serial.println(httpCode);
   Serial.println(payload);

   payload.replace("\"", "");
   payload.replace("**", "\n");

   Serial.println("before conversion");
   payload.toCharArray(textBuff, 512);   
   Serial.println("after conversion");
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
