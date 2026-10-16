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
  │     @motephoe/sdk       │  (Node.js 26+ / Bun 1.4.3+)
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

> **Runtime Requirement:** Node.js `>=26.0.0` or Bun `>=1.4.3` (Native `globalThis.WebSocket` support required).

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
      console.log("🟢 Connected to Motephoe real-time event pipeline.");
    })
    .onGift((gift) => {
      console.log(`🎁 Gift received: ${gift.customerName} sent sticker [${gift.stickerId}]! Amount: ${gift.amount} MMK`);

      // Physical reaction: Rotate servo to 90 degrees
      servo.to(90);

      // Return servo back to 0 degrees after 500ms
      setTimeout(() => {
        servo.to(0);
      }, 500);
    })
    .onLivePurchase((sale) => {
      console.log(`🛒 Live Sale: ${sale.customerName} (${sale.customerEmail}) ordered ${sale.cartItems.length} product(s)! Total: ${sale.amount} MMK`);
    })
    .onQuestion((qna) => {
      console.log(`❓ Question from ${qna.customerName}: "${qna.question}" (Bounty: ${qna.amount} MMK)`);
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
const { Motephoe } = require("@motephoe/sdk");

const client = new Motephoe({ apiKey: "mph_live_..." });
```

---

## 5. Configuration Options

Pass the `MotephoeOptions` object to the constructor:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Secret API key generated in the Motephoe Creator Panel (`mph_live_...`). |
| `serverUrl` | `string` | `"wss://wsx.motephoe.com"` | Base URL of the Motephoe WebSocket server. |
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

## 6. Event Models & Data Payloads

All live stream events extend `IBaseLiveEvent`:

```typescript
export type LiveAppType = 'TEATIP_STREAM' | 'TEATIP_SALE' | 'TEATIP_QNA';

export interface ICartItemLite {
  itemCode: string;
  itemName: string;
  price: number;
  quantity: number;
}

export interface IBaseLiveEvent {
  orderId: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  amount: number;
  cartItems: ICartItemLite[];
  appType: LiveAppType;
  timestamp: string | number;
}
```

---

## 7. Event API Reference

### 1. `onGift(callback: (gift: IGiftEvent) => void): this`
Fires whenever a viewer sends a virtual tipping sticker or gift.

```typescript
motephoe.onGift((gift) => {
  console.log("Order ID:", gift.orderId);
  console.log("Sender:", gift.customerName);
  console.log("Customer ID:", gift.customerId);
  console.log("Sticker ID:", gift.stickerId);
  console.log("Amount (MMK):", gift.amount);
  console.log("Note:", gift.notes);
  console.log("Gift Items:", gift.cartItems);
});
```

#### `IGiftEvent` Interface
```typescript
interface IGiftEvent extends IBaseLiveEvent {
  appType: 'TEATIP_STREAM';
  notes?: string;
  stickerId: string;
}
```

---

### 2. `onLivePurchase(callback: (sale: ILivePurchaseEvent) => void): this`
Fires when a viewer purchases physical or digital products via the **Live Sale** inventory tab.

```typescript
motephoe.onLivePurchase((sale) => {
  console.log(`Order #${sale.orderId} placed by ${sale.customerName}`);
  console.log("Customer ID:", sale.customerId);
  console.log("Email:", sale.customerEmail);
  console.log("Phone:", sale.customerPhone);
  console.log("Delivery Address:", sale.customerAddress);
  console.log("Total Amount:", sale.amount);
  console.log("Cart Items:", sale.cartItems);
});
```

#### `ILivePurchaseEvent` Interface
```typescript
interface ILivePurchaseEvent extends IBaseLiveEvent {
  appType: 'TEATIP_SALE';
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
}
```

---

### 3. `onQuestion(callback: (qna: IQnAEvent) => void): this`
Fires when a viewer submits a paid question or priority message to the stream.

```typescript
motephoe.onQuestion((qna) => {
  console.log(`Question from ${qna.customerName} (${qna.customerId}):`);
  console.log(`"${qna.question}"`);
  console.log("Bounty Amount:", qna.amount);
  console.log("Optional Note:", qna.notes);
});
```

#### `IQnAEvent` Interface
```typescript
interface IQnAEvent extends IBaseLiveEvent {
  appType: 'TEATIP_QNA';
  notes?: string;
  question: string;
}
```

---

### Lifecycle Listeners

* **`onConnect(callback: () => void): this`**
  Emitted when the WebSocket connection is open and authenticated.
* **`onDisconnect(callback: (reason: string) => void): this`**
  Emitted when the connection is terminated.
* **`onError(callback: (error: Error) => void): this`**
  Emitted when authentication fails, socket errors trigger, or max retries are exceeded.
* **`disconnect(): void`**
  Closes the connection intentionally and halts the reconnection loop.

---

## 8. Security Best Practices

1. **Environment Variables**: Never commit API keys to version control or expose them in client-side bundles. Use `.env` or system environment variables:
   ```bash
   MOTEPHOE_API_KEY="mph_live_..."
   ```
2. **Key Rotation**: If an API key is leaked on stream, go immediately to **Motephoe Creator Panel > Integrations > Developer API Key** and click **Rotate Key**. The old key will be revoked across NATS KV immediately.
3. **Read-Only Subscriber**: The SDK WebSocket client is strictly a downstream listener. Inbound client frames are ignored by the server.

---

## 9. License

MIT © [Motephoe](https://motephoe.com)
