/**
 * Core application event types mapped to Motephoe Live streams.
 */
export type LiveAppType = 'TEATIP_STREAM' | 'TEATIP_SALE' | 'TEATIP_QNA';
/**
 * Configuration options for initializing the Motephoe SDK.
 */
export interface MotephoeOptions {
    /**
     * Your secret Developer API Key generated from the Motephoe Creator Panel.
     * NEVER expose this in client-side code.
     */
    apiKey: string;
    /**
     * Optional custom server URL.
     * @default "wss://motephoe.com"
     */
    serverUrl?: string;
    /**
     * Whether to automatically attempt reconnection if the WebSocket drops.
     * @default true
     */
    autoReconnect?: boolean;
    /**
     * Base delay (in milliseconds) before attempting a reconnection.
     * @default 3000
     */
    reconnectInterval?: number;
    /**
     * Maximum number of automatic reconnection attempts before giving up.
     * Set to `Infinity` to keep trying forever.
     * @default Infinity
     */
    maxRetries?: number;
    /**
     * Enable verbose logging for debugging.
     * @default false
     */
    debug?: boolean;
}
/**
 * Stripped-down cart item data included in live events.
 */
export interface ICartItemLite {
    itemCode: string;
    itemName: string;
    price: number;
    quantity: number;
}
/**
 * Base properties shared across all live events.
 */
export interface IBaseLiveEvent {
    orderId: string;
    merchantId: string;
    customerName: string;
    grandTotal: number;
    notes?: string;
    cartItems: ICartItemLite[];
    appType: LiveAppType;
    timestamp: string | number;
}
/**
 * Emitted when a viewer sends a virtual gift/sticker to the stream.
 */
export interface IGiftEvent extends IBaseLiveEvent {
    appType: 'TEATIP_STREAM';
}
/**
 * Emitted when a viewer purchases a physical or digital product from the Live Sale inventory.
 */
export interface ILivePurchaseEvent extends IBaseLiveEvent {
    appType: 'TEATIP_SALE';
    customerPhone?: string;
    customerAddress?: string;
}
/**
 * Emitted when a viewer submits a paid question or priority message.
 */
export interface IQnAEvent extends IBaseLiveEvent {
    appType: 'TEATIP_QNA';
    question: string;
}
export type GiftCallback = (gift: IGiftEvent) => void;
export type PurchaseCallback = (purchase: ILivePurchaseEvent) => void;
export type QnACallback = (qna: IQnAEvent) => void;
export type ErrorCallback = (error: Error) => void;
export type ConnectCallback = () => void;
export type DisconnectCallback = (reason: string) => void;
