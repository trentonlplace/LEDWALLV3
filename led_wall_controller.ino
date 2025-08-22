// ESP32 LED Wall Advanced Serial Control - Camera Calibration Ready
     // Individual LED control with coordinate mapping
     // Data pin: GPIO 4, WS2812B/WS2815 protocol

     #include <FastLED.h>

     #define DATA_PIN    4
     #define LED_COUNT   300
     #define BRIGHTNESS  128

     // ===== LED / FastLED =====
     CRGB leds[LED_COUNT];

     // ===== Command IDs =====
     enum Cmd : uint8_t {
       CMD_PATCH = 0x10,
       CMD_FRAME = 0x11,
       CMD_CLEAR = 0x12,
       CMD_BRIGHTNESS = 0x13,
       CMD_BLINK = 0x14
     };

     // ===== Message Structures =====
     struct PatchMsg {
       uint16_t count;
       static const int MAX_PATCH = 100;
       uint16_t idx[MAX_PATCH];
       CRGB col[MAX_PATCH];
     };

     struct ControlMsg {
       Cmd cmd;
       uint32_t value;
     };

     // ===== FreeRTOS Queues =====
     QueueHandle_t patchQueue;
     QueueHandle_t controlQueue;

     // ===== Shared Data =====
     volatile bool frameReady = false;
     CRGB frameBuffer[LED_COUNT];

     TaskHandle_t ledTask, serialTaskHandle;

     // ===== Utility Functions =====
     uint16_t readU16(const uint8_t* p) {
       return (p[0] << 8) | p[1];
     }

     // ===== LED Task =====
     void ledControlTask(void* param) {
       FastLED.addLeds<WS2812B, DATA_PIN, RGB>(leds, LED_COUNT);
       FastLED.setBrightness(BRIGHTNESS);

       // Startup test - quick flash
       Serial.println("Running LED test...");
       fill_solid(leds, LED_COUNT, CRGB::Red);
       FastLED.show();
       delay(300);
       fill_solid(leds, LED_COUNT, CRGB::Green);
       FastLED.show();
       delay(300);
       fill_solid(leds, LED_COUNT, CRGB::Blue);
       FastLED.show();
       delay(300);
       FastLED.clear();
       FastLED.show();
       Serial.println("LED test complete");

       PatchMsg patch;
       ControlMsg ctrl;

       while (true) {
         // Handle patches
         while (xQueueReceive(patchQueue, &patch, 0)) {
           for (int i = 0; i < patch.count; i++) {
             if (patch.idx[i] < LED_COUNT) {
               leds[patch.idx[i]] = patch.col[i];
             }
           }
         }

         // Handle full frames
         if (frameReady) {
           memcpy(leds, frameBuffer, sizeof(CRGB) * LED_COUNT);
           frameReady = false;
         }

         // Handle control commands
         if (xQueueReceive(controlQueue, &ctrl, 0)) {
           switch (ctrl.cmd) {
             case CMD_CLEAR:
               fill_solid(leds, LED_COUNT, CRGB::Black);
               break;

             case CMD_BRIGHTNESS:
               FastLED.setBrightness(ctrl.value);
               break;

             case CMD_BLINK:
               if (ctrl.value < LED_COUNT) {
                 leds[ctrl.value] = CRGB::White;
                 FastLED.show();
                 delay(200);
                 leds[ctrl.value] = CRGB::Black;
               }
               break;
           }
         }

         FastLED.show();
         delay(16); // ~60 FPS
       }
     }

     // ===== Serial Task =====
     void serialTask(void* param) {
       String command = "";

       while (true) {
         if (Serial.available()) {
           char c = Serial.read();

           if (c == '\n' || c == '\r') {
             if (command.length() > 0) {
               processSerialCommand(command);
               command = "";
             }
           } else {
             command += c;
           }
         }
         delay(10);
       }
     }

     void processSerialCommand(String cmd) {
       cmd.trim();
       cmd.toLowerCase();

       // Parse command format: CMD:payload
       int colonPos = cmd.indexOf(':');
       if (colonPos == -1) {
         Serial.println("Invalid format. Use CMD:payload");
         return;
       }

       String cmdType = cmd.substring(0, colonPos);
       String payload = cmd.substring(colonPos + 1);

       if (cmdType == "clear") {
         // CLEAR: (no payload)
         ControlMsg msg = {CMD_CLEAR, 0};
         xQueueSend(controlQueue, &msg, 0);
         Serial.println("OK:cleared");

       } else if (cmdType == "pixel") {
         // PIXEL:index,r,g,b
         int comma1 = payload.indexOf(',');
         int comma2 = payload.indexOf(',', comma1 + 1);
         int comma3 = payload.indexOf(',', comma2 + 1);

         if (comma1 > 0 && comma2 > comma1 && comma3 > comma2) {
           int index = payload.substring(0, comma1).toInt();
           int r = payload.substring(comma1 + 1, comma2).toInt();
           int g = payload.substring(comma2 + 1, comma3).toInt();
           int b = payload.substring(comma3 + 1).toInt();

           if (index >= 0 && index < LED_COUNT) {
             PatchMsg msg;
             msg.count = 1;
             msg.idx[0] = index;
             msg.col[0] = CRGB(r, g, b);
             xQueueSend(patchQueue, &msg, 0);
             Serial.println("OK:pixel_set");
           } else {
             Serial.println("ERROR:invalid_index");
           }
         } else {
           Serial.println("ERROR:invalid_format");
         }

       } else if (cmdType == "all") {
         // ALL:r,g,b
         int comma1 = payload.indexOf(',');
         int comma2 = payload.indexOf(',', comma1 + 1);

         if (comma1 > 0 && comma2 > comma1) {
           int r = payload.substring(0, comma1).toInt();
           int g = payload.substring(comma1 + 1, comma2).toInt();
           int b = payload.substring(comma2 + 1).toInt();

           // Set all LEDs to this color
           for (int i = 0; i < LED_COUNT; i++) {
             frameBuffer[i] = CRGB(r, g, b);
           }
           frameReady = true;
           Serial.println("OK:all_set");
         } else {
           Serial.println("ERROR:invalid_format");
         }

       } else if (cmdType == "blink") {
         // BLINK:index
         int index = payload.toInt();
         if (index >= 0 && index < LED_COUNT) {
           ControlMsg msg = {CMD_BLINK, (uint32_t)index};
           xQueueSend(controlQueue, &msg, 0);
           Serial.println("OK:blinked");
         } else {
           Serial.println("ERROR:invalid_index");
         }

       } else if (cmdType == "patch") {
         // PATCH:count:index,r,g,b:index,r,g,b:...
         // Parse the count first
         int firstColon = payload.indexOf(':');
         if (firstColon == -1) {
           Serial.println("ERROR:invalid_patch_format");
           return;
         }
         
         int count = payload.substring(0, firstColon).toInt();
         if (count <= 0 || count > PatchMsg::MAX_PATCH) {
           Serial.println("ERROR:invalid_patch_count");
           return;
         }
         
         PatchMsg msg;
         msg.count = count;
         
         // Parse each pixel: index,r,g,b
         String remaining = payload.substring(firstColon + 1);
         for (int i = 0; i < count; i++) {
           int nextColon = remaining.indexOf(':');
           String pixelData;
           
           if (nextColon == -1 && i == count - 1) {
             // Last pixel
             pixelData = remaining;
           } else if (nextColon > 0) {
             pixelData = remaining.substring(0, nextColon);
             remaining = remaining.substring(nextColon + 1);
           } else {
             Serial.println("ERROR:invalid_pixel_data");
             return;
           }
           
           // Parse index,r,g,b
           int comma1 = pixelData.indexOf(',');
           int comma2 = pixelData.indexOf(',', comma1 + 1);
           int comma3 = pixelData.indexOf(',', comma2 + 1);
           
           if (comma1 > 0 && comma2 > comma1 && comma3 > comma2) {
             int index = pixelData.substring(0, comma1).toInt();
             int r = pixelData.substring(comma1 + 1, comma2).toInt();
             int g = pixelData.substring(comma2 + 1, comma3).toInt();
             int b = pixelData.substring(comma3 + 1).toInt();
             
             if (index >= 0 && index < LED_COUNT) {
               msg.idx[i] = index;
               msg.col[i] = CRGB(r, g, b);
             } else {
               Serial.println("ERROR:invalid_index_in_patch");
               return;
             }
           } else {
             Serial.println("ERROR:invalid_pixel_format");
             return;
           }
         }
         
         xQueueSend(patchQueue, &msg, 0);
         Serial.println("OK:patch_applied");

       } else if (cmdType == "bright") {
         // BRIGHT:0-255
         int brightness = payload.toInt();
         if (brightness >= 0 && brightness <= 255) {
           ControlMsg msg = {CMD_BRIGHTNESS, (uint32_t)brightness};
           xQueueSend(controlQueue, &msg, 0);
           Serial.println("OK:brightness_set");
         } else {
           Serial.println("ERROR:invalid_brightness");
         }

       } else {
         Serial.println("ERROR:unknown_command");
       }
     }

     // ===== Setup =====
     void setup() {
       Serial.begin(115200);
       delay(2000);
       Serial.println("LED Wall Advanced Controller Starting...");
       Serial.println("Commands:");
       Serial.println("  CLEAR: - Clear all LEDs");
       Serial.println("  PIXEL:index,r,g,b - Set LED at index");
       Serial.println("  PATCH:count:index,r,g,b:index,r,g,b:... - Set multiple LEDs");
       Serial.println("  ALL:r,g,b - Set all LEDs");
       Serial.println("  BLINK:index - Blink LED");
       Serial.println("  BRIGHT:0-255 - Set brightness");
       Serial.println("");

       patchQueue = xQueueCreate(5, sizeof(PatchMsg));
       controlQueue = xQueueCreate(10, sizeof(ControlMsg));

       xTaskCreatePinnedToCore(ledControlTask, "leds", 4096, NULL, 2, &ledTask, 1);
       xTaskCreatePinnedToCore(serialTask, "serial", 2048, NULL, 1, &serialTaskHandle, 0);

       Serial.println("Ready!");
     }

     void loop() {
       delay(1000);
     }