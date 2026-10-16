
const { Motephoe } = require("../dist/cjs");
const dotenv = require("dotenv");
dotenv.config()

const motephoe = new Motephoe({
  apiKey: process.env.MOTEPHOE_API_KEY || "YOUR_API_KEY",
  autoReconnect: true,
  debug: true,
});


console.log(process.env.MOTEPHOE_API_KEY)

// Set up the SDK event listeners
motephoe
  .onConnect(() => {
    console.log("🟢 Connected to Motephoe Live Events!");
  })
  .onGift((gift) => {

    console.log(`🎁 Gift received from ${gift.customerName} for ${gift.grandTotal} MMK`);

    console.log(gift)

    // Example: Save to a local database or send a Discord webhook
  })
  .onLivePurchase((sale) => {
    console.log(`🛒 New Sale! ${sale.customerName} ordered ${sale.cartItems.length} items.`);
    // Example: Trigger order fulfillment pipeline
  })
  .onError((error) => {
    console.error("❌ Motephoe Error:", error.message);
  });

motephoe.connect();
