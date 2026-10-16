// index.js (Arduino Version)
// Jonny Five only support cjs

const { Board, Led, Servo } = require("johnny-five");
const { Motephoe } = require("@mmpay/motephoe");
const dotenv = require("dotenv");
dotenv.config()

// Auto-detects Arduino on USB
const board = new Board();

board.on("ready", async () => {
  console.log("⚡ Arduino Ready!");

  // Setup hardware components
  const led = new Led(13); // Built-in LED on pin 13
  const servo = new Servo(9); // Servo on pin 9

  servo.to(0); // Set initial position

  // Initialize Motephoe
  const motephoe = new Motephoe({
    apiKey: process.env.MOTEPHOE_API_KEY,
  });

  motephoe
    .onConnect(() => console.log("🟢 Motephoe Connected!"))
    .onGift((gift) => {
      console.log(`🎁 Gift from ${gift.customerName}!`);

      // Hardware Action: Blink LED and Sweep Servo
      led.blink(200);
      servo.to(90);

      // Reset after 2 seconds
      setTimeout(() => {
        led.stop().off();
        servo.to(0);
      }, 2000);
    })
    .onQuestion((qna) => {
      console.log(`❓ Question: ${qna.question}`);
      // Hardware Action: Just turn the LED on solid for a question
      led.on();
      setTimeout(() => led.off(), 5000);
    });

  await motephoe.connect();
});
