"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Motephoe = void 0;
// Re-export types so developers can import them from the root package
__exportStar(require("./types"), exports);
class Motephoe {
    ws = null;
    apiKey;
    serverUrl;
    // Connection state
    isManualDisconnect = false;
    reconnectAttempts = 0;
    // Options
    autoReconnect;
    reconnectInterval;
    maxRetries;
    debug;
    // Subscriber Arrays
    subscribers = {
        gift: [],
        purchase: [],
        qna: [],
        connect: [],
        disconnect: [],
        error: [],
    };
    /**
     * Initializes the Motephoe SDK.
     * @param options Configuration options including your API Key.
     */
    constructor(options) {
        if (!options.apiKey) {
            throw new Error('Motephoe SDK: apiKey is required.');
        }
        this.apiKey = options.apiKey;
        const base = options.serverUrl || 'wss://wsx.motephoe.com';
        this.serverUrl = `${base.replace('http', 'ws')}/ws/events?apiKey=${this.apiKey}`;
        this.autoReconnect = options.autoReconnect ?? true;
        this.reconnectInterval = options.reconnectInterval ?? 3000;
        this.maxRetries = options.maxRetries ?? Infinity;
        this.debug = options.debug ?? false;
    }
    /**
     * Establishes the real-time WebSocket connection to Motephoe.
     * @returns A promise that resolves when the connection is open.
     */
    connect() {
        this.isManualDisconnect = false;
        return new Promise((resolve, reject) => {
            this.log('Connecting to Motephoe Realtime Network...');
            if (typeof globalThis.WebSocket === 'undefined') {
                return reject(new Error('Motephoe SDK: WebSocket is not supported in this environment. Ensure you are using Node 21+, Bun, or a Browser.'));
            }
            this.ws = new WebSocket(this.serverUrl);
            this.ws.onopen = () => {
                this.log('Connected successfully.');
                this.reconnectAttempts = 0; // Reset retries on successful connection
                this.emit('connect');
                resolve();
            };
            this.ws.onmessage = (messageEvent) => {
                this.handleMessage(messageEvent.data);
            };
            this.ws.onerror = (errorEvent) => {
                const errorMsg = 'Motephoe SDK: WebSocket connection error. Check your API key and network.';
                this.log(errorMsg, 'error');
                this.emit('error', new Error(errorMsg));
                // Reject the initial promise if it hasn't resolved yet
                reject(new Error(errorMsg));
            };
            this.ws.onclose = (event) => {
                this.log(`Disconnected (Code: ${event.code}, Reason: ${event.reason || 'None'})`);
                this.emit('disconnect', event.reason || 'Connection closed');
                this.ws = null;
                this.attemptReconnect();
            };
        });
    }
    /**
     * Gracefully disconnects the WebSocket and halts automatic reconnections.
     */
    disconnect() {
        this.isManualDisconnect = true;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.log('Manually disconnecting...');
            this.ws.close(1000, 'Intentional disconnect by client');
        }
        this.ws = null;
    }
    // --------------------------------------------------------------------------
    // Event Listeners (Chainable)
    // --------------------------------------------------------------------------
    /**
     * Triggers when a viewer sends a virtual gift/sticker to the stream.
     */
    onGift(callback) {
        this.subscribers.gift.push(callback);
        return this;
    }
    /**
     * Triggers when a viewer purchases a physical or digital product from the Live Sale.
     */
    onLivePurchase(callback) {
        this.subscribers.purchase.push(callback);
        return this;
    }
    /**
     * Triggers when a viewer submits a paid question or priority message.
     */
    onQuestion(callback) {
        this.subscribers.qna.push(callback);
        return this;
    }
    /**
     * Triggers when the connection successfully opens.
     */
    onConnect(callback) {
        this.subscribers.connect.push(callback);
        return this;
    }
    /**
     * Triggers when the connection is lost or closed.
     */
    onDisconnect(callback) {
        this.subscribers.disconnect.push(callback);
        return this;
    }
    /**
     * Triggers when a connection error occurs.
     */
    onError(callback) {
        this.subscribers.error.push(callback);
        return this;
    }
    // --------------------------------------------------------------------------
    // Internal Helpers
    // --------------------------------------------------------------------------
    handleMessage(data) {
        try {
            const payload = typeof data === 'string' ? JSON.parse(data) : data;
            if (!payload.event || !payload.data)
                return;
            switch (payload.event) {
                case 'order:gift':
                    this.emit('gift', payload.data);
                    break;
                case 'order:purchase':
                    this.emit('purchase', payload.data);
                    break;
                case 'order:question':
                    this.emit('qna', payload.data);
                    break;
                default:
                    this.log(`Received unknown event: ${payload.event}`, 'warn');
            }
        }
        catch (err) {
            this.log('Error parsing incoming message payload', 'error');
        }
    }
    attemptReconnect() {
        if (this.isManualDisconnect || !this.autoReconnect)
            return;
        if (this.reconnectAttempts >= this.maxRetries) {
            const msg = `Motephoe SDK: Max reconnection attempts (${this.maxRetries}) reached. Giving up.`;
            this.log(msg, 'error');
            this.emit('error', new Error(msg));
            return;
        }
        this.reconnectAttempts++;
        // Exponential backoff with a max delay of 30 seconds
        const delay = Math.min(this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
        this.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxRetries} in ${Math.round(delay)}ms...`);
        setTimeout(() => {
            this.connect().catch(() => {
                // Connection error is handled by ws.onerror
            });
        }, delay);
    }
    emit(event, ...args) {
        const callbacks = this.subscribers[event];
        for (const callback of callbacks) {
            callback(...args);
        }
    }
    log(message, level = 'info') {
        if (!this.debug && level === 'info')
            return;
        const prefix = '[Motephoe]';
        if (level === 'error')
            console.error(prefix, message);
        else if (level === 'warn')
            console.warn(prefix, message);
        else
            console.log(prefix, message);
    }
}
exports.Motephoe = Motephoe;
exports.default = Motephoe;
