// server.ts
import {Elysia} from "elysia";
import Motephoe from "@motephoe/sdk";

// Initialize the Motephoe SDK
const motephoe = new Motephoe({
  apiKey: process.env.MOTEPHOE_API_KEY || "YOUR_API_KEY",
  autoReconnect: true,
  debug: true,
});

// Set up the SDK event listeners
motephoe
  .onConnect(() => {
    console.log("🟢 Connected to Motephoe Live Events!");
  })
  .onGift((gift) => {
    console.log(`🎁 Gift received from ${gift.customerName} for ${gift.grandTotal} MMK`);
    // Example: Save to a local database or send a Discord webhook
  })
  .onLivePurchase((sale) => {
    console.log(`🛒 New Sale! ${sale.customerName} ordered ${sale.cartItems.length} items.`);
    // Example: Trigger order fulfillment pipeline
  })
  .onError((error) => {
    console.error("❌ Motephoe Error:", error.message);
  });

// Start the Elysia Server
const app = new Elysia()
  .get("/", () => {
    return {status: "running", service: "Motephoe Integration Server"};
  })
  .get("/health", () => {
    return {ok: true};
  })
  .listen(3000);

console.log(`🦊 Elysia server running at ${app.server?.hostname}:${app.server?.port}`);

// Connect the Motephoe SDK when the server starts
motephoe.connect().catch((err) => console.error("Initial connect failed:", err));
