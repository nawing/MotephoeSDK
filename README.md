# Motephoe Developer SDK (`@motephoe/sdk`)

Official client library for connecting physical hardware, IoT microcontrollers (Arduino, ESP32, Raspberry Pi), and third-party bots directly to live **Motephoe** interactive stream events via native WebSockets.

---

## 1. Overview

Motephoe streams deliver real-time interactive events (virtual gifts, live store purchases, and paid Q&A priority questions) through high-performance Bun-powered WebSockets. `@motephoe/sdk` provides a lightweight, zero-dependency client supporting both **ESM** (`import`) and **CommonJS** (`require`) environments, complete with automatic reconnection, typed payloads, and a chainable API.

```text
       Motephoe Platform
  ┌─────────────────────────┐
  │  Viewers / Live Stream  │
  └────────────┬────────────┘
               │  Orders / Gifts / Q&A
               ▼
  ┌─────────────────────────┐
  │      NATS JetStream     │
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │ Bun Native WS Gateway   │  (wss://wsx.motephoe.com/ws/events)
  └────────────┬────────────┘
               │  Direct Native WebSocket
               ▼
  ┌─────────────────────────┐
  │     @motephoe/sdk       │  (Node.js 22+ / Bun)
  └────────────┬────────────┘
               │  Johnny-Five / Serial / GPIO
               ▼
  ┌─────────────────────────┐
  │ Arduino / Servo / LEDs  │
  └─────────────────────────┘
```

---

## 2. Installation

```bash
# npm
npm install @motephoe/sdk

# bun
bun add @motephoe/sdk

# pnpm
pnpm add @motephoe/sdk

# yarn
yarn add @motephoe/sdk
```

> **Runtime Requirement:** Node.js `>=22.0.0` or Bun `>=1.0.0` (Native `globalThis.WebSocket` support required).

---

## 3. Quick Start (Johnny-Five Hardware Integration)

Connect an Arduino servo that sweeps 90 degrees whenever a viewer sends a virtual gift on stream:

```typescript
import { Board, Servo } from "johnny-five";
import Motephoe from "@motephoe/sdk";

const board = new Board();

board.on("ready", async () => {
  console.log("⚡ Arduino hardware connected and ready.");

  const servo = new Servo(9);
  servo.to(0);

  // Initialize the SDK with your API key
  const motephoe = new Motephoe({
    apiKey: process.env.MOTEPHOE_API_KEY!,
    debug: true
  });

  // Attach event handlers
  motephoe
    .onConnect(() => {
      console.log(" Connected to Motephoe real-time event pipeline.");
    })
    .onGift((gift) => {
      console.log(`🎁 Gift received: ${gift.customerName} sent an item! Total: ${gift.grandTotal} MMK`);

      // Physical reaction: Rotate servo to 90 degrees
      servo.to(90);

      // Return servo back to 0 degrees after 500ms
      setTimeout(() => {
        servo.to(0);
      }, 500);
    })
    .onLivePurchase((sale) => {
      console.log(`🛒 Live Sale: ${sale.customerName} ordered ${sale.cartItems.length} product(s)!`);
    })
    .onQuestion((qna) => {
      console.log(`❓ Question from ${qna.customerName}: "${qna.question}"`);
    })
    .onError((error) => {
      console.error("❌ SDK Error:", error.message);
    })
    .onDisconnect((reason) => {
      console.warn("⚠️ Disconnected from Motephoe:", reason);
    });

  // Connect to the stream
  await motephoe.connect();
});
```

---

## 4. Dual Module Support (ESM & CommonJS)

### ECMAScript Modules (ESM)
```typescript
import Motephoe, { IGiftEvent, ILivePurchaseEvent, IQnAEvent } from "@motephoe/sdk";

const client = new Motephoe({ apiKey: "mph_live_..." });
```

### CommonJS (CJS)
```javascript
const { default: Motephoe } = require("@motephoe/sdk");

const client = new Motephoe({ apiKey: "mph_live_..." });
```

---

## 5. Configuration Options

Pass the `MotephoeOptions` object to the constructor:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Your secret API key generated in the Motephoe Creator Panel (`mph_live_...`). |
| `serverUrl` | `string` | `"wss://motephoe.com"` | Base URL of the Motephoe WebSocket server. |
| `autoReconnect` | `boolean` | `true` | Automatically reconnect if the socket drops unexpectedly. |
| `reconnectInterval` | `number` | `3000` | Initial retry delay in milliseconds (scales with backoff). |
| `maxRetries` | `number` | `Infinity` | Max reconnection attempts before triggering an `error` event. |
| `debug` | `boolean` | `false` | Enable verbose internal connection and debug logs in stdout. |

```typescript
const motephoe = new Motephoe({
  apiKey: "mph_live_a1b2c3d4e5...",
  autoReconnect: true,
  reconnectInterval: 2000,
  maxRetries: 10,
  debug: false
});
```

---

## 6. Event API Reference

The SDK categorizes platform transactions into three clean, dedicated event listeners:

### 1. `onGift(callback: (gift: IGiftEvent) => void): this`
Fires whenever a viewer sends a virtual tipping sticker/gift.

```typescript
motephoe.onGift((gift) => {
  console.log("Order ID:", gift.orderId);
  console.log("Sender:", gift.customerName);
  console.log("Amount (MMK):", gift.grandTotal);
  console.log("Notes/Message:", gift.notes);
  console.log("Items:", gift.cartItems);
});
```

#### `IGiftEvent` Payload Structure
```typescript
interface IGiftEvent {
  orderId: string;
  merchantId: string;
  customerName: string;
  grandTotal: number;
  notes?: string;
  cartItems: {
    itemCode: string;
    itemName: string;
    price: number;
    quantity: number;
  }[];
  appType: 'TEATIP_STREAM';
  timestamp: string | number;
}
```

---

### 2. `onLivePurchase(callback: (sale: ILivePurchaseEvent) => void): this`
Fires when an order is placed through the **Live Sale** inventory tab.

```typescript
motephoe.onLivePurchase((sale) => {
  console.log(`Order #${sale.orderId} placed by ${sale.customerName}`);
  console.log("Delivery Phone:", sale.customerPhone);
  console.log("Delivery Address:", sale.customerAddress);
  console.log("Purchased Items:", sale.cartItems);
});
```

#### `ILivePurchaseEvent` Payload Structure
```typescript
interface ILivePurchaseEvent {
  orderId: string;
  merchantId: string;
  customerName: string;
  grandTotal: number;
  notes?: string;
  cartItems: {
    itemCode: string;
    itemName: string;
    price: number;
    quantity: number;
  }[];
  appType: 'TEATIP_SALE';
  customerPhone?: string;
  customerAddress?: string;
  timestamp: string | number;
}
```

---

### 3. `onQuestion(callback: (qna: IQnAEvent) => void): this`
Fires when a viewer sends a paid question or priority prompt.

```typescript
motephoe.onQuestion((qna) => {
  console.log(`Question from ${qna.customerName}: "${qna.question}"`);
  console.log("Bounty/Paid Amount:", qna.grandTotal);
});
```

#### `IQnAEvent` Payload Structure
```typescript
interface IQnAEvent {
  orderId: string;
  merchantId: string;
  customerName: string;
  grandTotal: number;
  question: string;
  notes?: string;
  cartItems: ICartItemLite[];
  appType: 'TEATIP_QNA';
  timestamp: string | number;
}
```

---

### Lifecycle Listeners

* **`onConnect(callback: () => void): this`**
  Emitted when the WebSocket connection is open and authenticated.
* **`onDisconnect(callback: (reason: string) => void): this`**
  Emitted when the connection is terminated.
* **`onError(callback: (error: Error) => void): this`**
  Emitted when authentication fails, socket error triggers, or max retries are exceeded.
* **`disconnect(): void`**
  Closes the connection intentionally and permanently disables the reconnection loop for that instance.

---

## 7. Security Best Practices

1. **Environment Variables**: Never hardcode API keys in Git repositories or client-facing scripts. Use `.env` or system environment variables:
   ```bash
   MOTEPHOE_API_KEY="mph_live_..."
   ```
2. **Key Rotation**: If an API key is leaked during a livestream (e.g., exposed on OBS desktop capture), go immediately to the **Motephoe Creator Panel > Integrations > Developer API Key** and click **Rotate Key**. The old key is invalidated across the entire cluster instantly.
3. **Read-Only Enforced**: Client SDK WebSocket connections are strictly read-only subscribers. Inbound client frames are ignored by the server pub/sub engine.

---

## 8. License

MIT © [Motephoe](https://motephoe.com)
