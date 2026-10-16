import type {
  ConnectCallback,
  DisconnectCallback,
  ErrorCallback,
  GiftCallback,
  IGiftEvent,
  ILivePurchaseEvent,
  IQnAEvent,
  MotephoeOptions,
  PurchaseCallback,
  QnACallback,
} from './types';

// Re-export types so developers can import them from the root package
export * from './types';

export class Motephoe {
  private ws: WebSocket | null = null;
  private readonly apiKey: string;
  private readonly serverUrl: string;

  // Connection state
  private isManualDisconnect: boolean = false;
  private reconnectAttempts: number = 0;

  // Options
  private readonly autoReconnect: boolean;
  private readonly reconnectInterval: number;
  private readonly maxRetries: number;
  private readonly debug: boolean;

  // Subscriber Arrays
  private readonly subscribers = {
    gift: [] as GiftCallback[],
    purchase: [] as PurchaseCallback[],
    qna: [] as QnACallback[],
    connect: [] as ConnectCallback[],
    disconnect: [] as DisconnectCallback[],
    error: [] as ErrorCallback[],
  };

  /**
   * Initializes the Motephoe SDK.
   * @param options Configuration options including your API Key.
   */
  constructor(options: MotephoeOptions) {
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
  public connect(): Promise<void> {
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

      this.ws.onmessage = (messageEvent: MessageEvent) => {
        this.handleMessage(messageEvent.data);
      };

      this.ws.onerror = (errorEvent: Event) => {
        const errorMsg = 'Motephoe SDK: WebSocket connection error. Check your API key and network.';
        this.log(errorMsg, 'error');
        this.emit('error', new Error(errorMsg));
        // Reject the initial promise if it hasn't resolved yet
        reject(new Error(errorMsg));
      };

      this.ws.onclose = (event: CloseEvent) => {
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
  public disconnect(): void {
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
  public onGift(callback: GiftCallback): this {
    this.subscribers.gift.push(callback);
    return this;
  }

  /**
   * Triggers when a viewer purchases a physical or digital product from the Live Sale.
   */
  public onLivePurchase(callback: PurchaseCallback): this {
    this.subscribers.purchase.push(callback);
    return this;
  }

  /**
   * Triggers when a viewer submits a paid question or priority message.
   */
  public onQuestion(callback: QnACallback): this {
    this.subscribers.qna.push(callback);
    return this;
  }

  /**
   * Triggers when the connection successfully opens.
   */
  public onConnect(callback: ConnectCallback): this {
    this.subscribers.connect.push(callback);
    return this;
  }

  /**
   * Triggers when the connection is lost or closed.
   */
  public onDisconnect(callback: DisconnectCallback): this {
    this.subscribers.disconnect.push(callback);
    return this;
  }

  /**
   * Triggers when a connection error occurs.
   */
  public onError(callback: ErrorCallback): this {
    this.subscribers.error.push(callback);
    return this;
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  private handleMessage(data: any): void {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;

      if (!payload.event || !payload.data) return;

      switch (payload.event) {
        case 'order:gift':
          this.emit('gift', payload.data as IGiftEvent);
          break;
        case 'order:purchase':
          this.emit('purchase', payload.data as ILivePurchaseEvent);
          break;
        case 'order:question':
          this.emit('qna', payload.data as IQnAEvent);
          break;
        default:
          this.log(`Received unknown event: ${payload.event}`, 'warn');
      }
    } catch (err) {
      this.log('Error parsing incoming message payload', 'error');
    }
  }

  private attemptReconnect(): void {
    if (this.isManualDisconnect || !this.autoReconnect) return;

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

  private emit<K extends keyof typeof this.subscribers>(
    event: K,
    ...args: Parameters<(typeof this.subscribers)[K][number]>
  ): void {
    const callbacks = this.subscribers[event] as Array<(...args: any[]) => void>;
    for (const callback of callbacks) {
      callback(...args);
    }
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.debug && level === 'info') return;
    const prefix = '[Motephoe]';
    if (level === 'error') console.error(prefix, message);
    else if (level === 'warn') console.warn(prefix, message);
    else console.log(prefix, message);
  }
}

export default Motephoe;
