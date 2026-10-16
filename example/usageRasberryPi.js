// index.js (Raspberry Pi Version)
// Jonny Five only support cjs

const { Board, Led, Servo } = require("johnny-five");
const Raspi = require("raspi-io").RaspiIO; // Requires the raspi-io plugin
const { Motephoe } = require("@motephoe/sdk");
const dotenv = require("dotenv");
dotenv.config()


// Initialize Board with Raspberry Pi IO plugin
const board = new Board({
  io: new Raspi()
});

board.on("ready", async () => {
  console.log("⚡ Raspberry Pi GPIO Ready!");

  // Setup hardware using Raspberry Pi pin notation (e.g., 'P1-13' or 'GPIO18')
  // Make sure you check the Raspberry Pi pinout diagram!
  const led = new Led("P1-13");
  const servo = new Servo("P1-12"); // Needs a PWM capable pin

  servo.to(0);

  const motephoe = new Motephoe({
    apiKey: process.env.MOTEPHOE_API_KEY,
  });

  motephoe
    .onConnect(() => console.log("🟢 Motephoe Connected!"))
    .onGift((gift) => {
      console.log(`🎁 Gift from ${gift.customerName}!`);

      // Hardware Action
      led.blink(200);
      servo.to(90);

      setTimeout(() => {
        led.stop().off();
        servo.to(0);
      }, 2000);
    });

  await motephoe.connect();
});
