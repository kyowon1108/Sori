import { useStore } from '@/store/useStore';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

type MessageHandler = (message: WebSocketMessage) => void;

// Generate unique message IDs for deduplication
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private callId: string | number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // 1 second
  private isExplicitlyDisconnected = false;
  private messageListeners: Set<MessageHandler> = new Set();
  private statusListeners: Set<(status: 'connecting' | 'connected' | 'disconnected') => void> = new Set();

  // Streaming state
  private currentStreamContent: Map<string, string> = new Map();

  // Pending acknowledgments
  private pendingAcks: Map<string, { resolve: () => void; timeout: NodeJS.Timeout }> = new Map();

  constructor() {
    // Bind methods to ensure correct 'this' context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
  }

  public connect(callId: string | number) {
    if (this.ws?.readyState === WebSocket.OPEN && this.callId === callId) {
      console.log('[WebSocketService] Already connected to call:', callId);
      return;
    }

    this.callId = callId;
    this.isExplicitlyDisconnected = false;
    this.reconnectAttempts = 0;
    this.currentStreamContent.clear();
    this._initiateConnection();
  }

  private _initiateConnection() {
    if (this.isExplicitlyDisconnected || !this.callId) return;

    this._notifyStatus('connecting');
    const store = useStore.getState();
    const token = store.accessToken;

    if (!token) {
      console.error('[WebSocketService] No access token available');
      this._notifyStatus('disconnected');
      return;
    }

    const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    // Handle potential trailing slash in env var
    const cleanBaseUrl = wsBaseUrl.replace(/\/$/, '');
    this.url = `${cleanBaseUrl}/ws/${this.callId}?token=${token}`;

    console.log(`[WebSocketService] Connecting to ${this.url}`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this._onOpen.bind(this);
      this.ws.onmessage = this._onMessage.bind(this);
      this.ws.onerror = this._onError.bind(this);
      this.ws.onclose = this._onClose.bind(this);
    } catch (error) {
      console.error('[WebSocketService] Connection creation failed:', error);
      this._handleReconnection();
    }
  }

  private _onOpen() {
    console.log('[WebSocketService] Connected');
    this.reconnectAttempts = 0;
    this._notifyStatus('connected');
  }

  private _onMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      // Handle ping/pong internally
      if (data.type === 'ping') {
        this._sendRaw({ type: 'pong', timestamp: new Date().toISOString() });
        return;
      }

      // Handle ack for pending messages
      if (data.type === 'ack' && data.message_id) {
        const pending = this.pendingAcks.get(data.message_id);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve();
          this.pendingAcks.delete(data.message_id);
        }
        return;
      }

      // Handle streaming chunks - accumulate content
      if (data.type === 'stream_chunk' && data.response_id) {
        const current = this.currentStreamContent.get(data.response_id) || '';
        this.currentStreamContent.set(data.response_id, current + data.content);

        // Notify listeners with accumulated content for real-time display
        this.messageListeners.forEach(listener => listener({
          type: 'message',
          role: data.role,
          content: current + data.content,
          is_streaming: true,
        }));
        return;
      }

      // Handle stream end - final content (for TTS)
      if (data.type === 'stream_end' && data.response_id) {
        this.currentStreamContent.delete(data.response_id);

        // Notify listeners with final content
        this.messageListeners.forEach(listener => listener({
          type: 'message',
          role: data.role,
          content: data.content,
          is_streaming: false,
        }));
        return;
      }

      // Pass other messages to listeners
      this.messageListeners.forEach(listener => listener(data));
    } catch (error) {
      console.error('[WebSocketService] Failed to parse message:', error);
    }
  }

  private _onError(event: Event) {
    console.error('[WebSocketService] Error observed:', event);
    // Error usually precedes close, so we handle logic in close or try to reconnect if not closed yet
  }

  private _onClose(event: CloseEvent) {
    console.log(`[WebSocketService] Disconnected. Code: ${event.code}, Reason: ${event.reason}`);
    this._notifyStatus('disconnected');

    // Clear pending acks
    this.pendingAcks.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingAcks.clear();
    this.currentStreamContent.clear();

    if (!this.isExplicitlyDisconnected) {
      this._handleReconnection();
    }
  }

  private _handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocketService] Max reconnect attempts reached');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`[WebSocketService] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
        this._initiateConnection();
    }, delay);
  }

  public disconnect() {
    console.log('[WebSocketService] Explicit disconnect requested');
    this.isExplicitlyDisconnected = true;

    // Clear pending acks
    this.pendingAcks.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingAcks.clear();
    this.currentStreamContent.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callId = null;
    this._notifyStatus('disconnected');
  }

  private _sendRaw(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
    }
  }

  public send(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.warn('[WebSocketService] Cannot send, socket not open');
        reject(new Error('Socket not open'));
        return;
      }

      // Add message_id for deduplication
      const messageId = generateMessageId();
      const messageWithId = {
        ...data,
        message_id: messageId,
      };

      const message = JSON.stringify(messageWithId);
      this.ws.send(message);

      // Set up ack timeout (5 seconds)
      const timeout = setTimeout(() => {
        this.pendingAcks.delete(messageId);
        // Don't reject - message may still be processed, just no ack received
        resolve();
      }, 5000);

      this.pendingAcks.set(messageId, { resolve, timeout });
    });
  }

  public sendEndCall(): void {
    this._sendRaw({ type: 'end_call' });
  }

  // --- Listener Management ---

  public addMessageListener(listener: MessageHandler) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public addStatusListener(listener: (status: 'connecting' | 'connected' | 'disconnected') => void) {
    this.statusListeners.add(listener);
    // Immediately notify current status
    listener(this.ws?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected');
    return () => this.statusListeners.delete(listener);
  }

  private _notifyStatus(status: 'connecting' | 'connected' | 'disconnected') {
    this.statusListeners.forEach(listener => listener(status));
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
