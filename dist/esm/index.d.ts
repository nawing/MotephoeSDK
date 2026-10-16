import type { ConnectCallback, DisconnectCallback, ErrorCallback, GiftCallback, MotephoeOptions, PurchaseCallback, QnACallback } from './types';
export * from './types';
export declare class Motephoe {
    private ws;
    private readonly apiKey;
    private readonly serverUrl;
    private isManualDisconnect;
    private reconnectAttempts;
    private readonly autoReconnect;
    private readonly reconnectInterval;
    private readonly maxRetries;
    private readonly debug;
    private readonly subscribers;
    /**
     * Initializes the Motephoe SDK.
     * @param options Configuration options including your API Key.
     */
    constructor(options: MotephoeOptions);
    /**
     * Establishes the real-time WebSocket connection to Motephoe.
     * @returns A promise that resolves when the connection is open.
     */
    connect(): Promise<void>;
    /**
     * Gracefully disconnects the WebSocket and halts automatic reconnections.
     */
    disconnect(): void;
    /**
     * Triggers when a viewer sends a virtual gift/sticker to the stream.
     */
    onGift(callback: GiftCallback): this;
    /**
     * Triggers when a viewer purchases a physical or digital product from the Live Sale.
     */
    onLivePurchase(callback: PurchaseCallback): this;
    /**
     * Triggers when a viewer submits a paid question or priority message.
     */
    onQuestion(callback: QnACallback): this;
    /**
     * Triggers when the connection successfully opens.
     */
    onConnect(callback: ConnectCallback): this;
    /**
     * Triggers when the connection is lost or closed.
     */
    onDisconnect(callback: DisconnectCallback): this;
    /**
     * Triggers when a connection error occurs.
     */
    onError(callback: ErrorCallback): this;
    private handleMessage;
    private attemptReconnect;
    private emit;
    private log;
}
export default Motephoe;
