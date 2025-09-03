import { Injectable, signal } from '@angular/core';

export interface JarvisMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
  isVoice: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class JarvisService {
  // Signals for reactive state management
  public messages = signal<JarvisMessage[]>([]);
  public status = signal<'idle' | 'starting' | 'ready' | 'error' | 'stopped'>('idle');
  public isConnected = signal<boolean>(false);
  public voiceInputActive = signal<boolean>(false);

  // Private properties
  private websocket: WebSocket | null = null;
  private sessionId: string | null = null;
  private baseUrl = 'http://localhost:8000/api';
  private wsUrl = 'ws://localhost:8000/api/ws';

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  // Start Jarvis
  async startJarvis(): Promise<boolean> {
    try {
      this.status.set('starting');
      
      // First check if Jarvis API is running
      const statusResponse = await fetch(`${this.baseUrl}/status`);
      if (!statusResponse.ok) {
        throw new Error('Jarvis API server is not running. Please start it first.');
      }
      
      // Start Jarvis agent via the API
      const response = await fetch(`${this.baseUrl}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.status === 'running' || response.ok) {
        // Connect to WebSocket
        this.connectWebSocket();
        
        this.addMessage({
          content: '🤖 Jarvis AI Assistant is now ready!',
          isUser: false,
          timestamp: new Date(),
          isVoice: false
        });

        this.status.set('ready');
        return true;
      } else {
        throw new Error(result.message || 'Failed to start Jarvis');
      }
    } catch (error) {
      this.status.set('error');
      this.addMessage({
        content: `❌ Failed to start Jarvis: ${error}. Make sure to run the Jarvis API server from Jarvis_Part_3 folder.`,
        isUser: false,
        timestamp: new Date(),
        isVoice: false
      });
      return false;
    }
  }

  // Stop Jarvis
  async stopJarvis(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        this.status.set('stopped');
        this.isConnected.set(false);
        
        if (this.websocket) {
          this.websocket.close();
          this.websocket = null;
        }
        
        this.addMessage({
          content: '⏹️ Jarvis has been stopped.',
          isUser: false,
          timestamp: new Date(),
          isVoice: false
        });

        // Reset sessionId so next start will get a fresh one
        this.sessionId = this.generateSessionId();
        
        return true;
      } else {
        throw new Error(result.message || 'Failed to stop Jarvis');
      }
    } catch (error) {
      this.addMessage({
        content: `❌ Error stopping Jarvis: ${error}`,
        isUser: false,
        timestamp: new Date(),
        isVoice: false
      });
      return false;
    }
  }

  // Send message to Jarvis
  async sendMessage(message: string, isVoice: boolean = false): Promise<void> {
    if (!message.trim() || this.status() === 'starting' || this.status() === 'error') {
      return;
    }

    // Add user message
    this.addMessage({
      content: message,
      isUser: true,
      timestamp: new Date(),
      isVoice: isVoice
    });

    try {
      // Send via WebSocket if connected
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'chat',
          message: message,
          session_id: this.sessionId
        }));
      } else {
        // Fallback to HTTP API
        const response = await fetch(`${this.baseUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            session_id: this.sessionId,
            is_voice_input: isVoice
          })
        });

        const result = await response.json();
        if (result.success && result.message) {
          this.addMessage({
            content: result.message,
            isUser: false,
            timestamp: new Date(),
            isVoice: false
          });
        } else {
          throw new Error(result.error || 'Failed to get response from Jarvis');
        }
      }
    } catch (error) {
      this.addMessage({
        content: `❌ Error sending message: ${error}`,
        isUser: false,
        timestamp: new Date(),
        isVoice: false
      });
    }
  }

  // WebSocket connection
  private connectWebSocket(): void {
    try {
      this.websocket = new WebSocket(this.wsUrl);
      
      this.websocket.onopen = () => {
        console.log('Connected to Jarvis WebSocket');
        this.isConnected.set(true);
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.websocket.onclose = () => {
        console.log('Disconnected from Jarvis WebSocket');
        this.isConnected.set(false);
        
        // Attempt to reconnect if Jarvis is still supposed to be running
        if (this.status() === 'ready') {
          setTimeout(() => {
            this.connectWebSocket();
          }, 3000);
        }
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected.set(false);
      };
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnected.set(false);
    }
  }

  // Handle WebSocket messages
  private handleWebSocketMessage(data: any): void {
    console.log('Received WebSocket message:', data);
    
    switch (data.type) {
      case 'jarvis_response_partial':
        // Append partial content to the last Jarvis message in the service
        const partialText = data.content || data.message;
        if (partialText && data.sessionId === this.sessionId) {
          const current = this.messages();
          let lastIndex = -1;
          for (let i = current.length - 1; i >= 0; i--) {
            if (!current[i].isUser) { lastIndex = i; break; }
          }
          if (lastIndex === -1) {
            this.messages.set([...current, { content: partialText, isUser: false, timestamp: new Date(), isVoice: true }]);
          } else {
            const updated = [...current];
            updated[lastIndex] = { ...updated[lastIndex], content: (updated[lastIndex].content || '') + partialText };
            this.messages.set(updated);
          }
        }
        break;

      case 'jarvis_response':
        // Final response: replace or append final content
        const finalText = data.content || data.message;
        if (finalText && data.sessionId === this.sessionId) {
          const current = this.messages();
          let lastIndex = -1;
          for (let i = current.length - 1; i >= 0; i--) {
            if (!current[i].isUser) { lastIndex = i; break; }
          }
          if (lastIndex === -1) {
            this.messages.set([...current, { content: finalText, isUser: false, timestamp: new Date(), isVoice: true }]);
          } else {
            const updated = [...current];
            updated[lastIndex] = { ...updated[lastIndex], content: finalText };
            this.messages.set(updated);
          }
        }
        break;
        
      case 'jarvis_ready':
      case 'jarvis_started':
      case 'bridge_ready':
        if (data.message || data.content) {
          this.status.set('ready');
          const text = data.message || data.content;
          // Add a short system message to indicate readiness
          const current = this.messages();
          this.messages.set([...current, { content: text, isUser: false, timestamp: new Date(), isVoice: false }]);
        }
        break;
        
      case 'tool_execution':
        if (data.tool && data.sessionId === this.sessionId) {
          this.addMessage({
            content: `🔧 Executing: ${data.tool} with ${JSON.stringify(data.arguments)}`,
            isUser: false,
            timestamp: new Date(),
            isVoice: false
          });
        }
        break;
        
      case 'jarvis_output':
      case 'bridge_output':
        if ((data.content || data.message) && data.sessionId === this.sessionId) {
          const outputText = data.content || data.message;
          console.log('Jarvis output:', outputText);
          
          // Only show important outputs to user
          if (outputText.includes('ready') || outputText.includes('online') || outputText.includes('started')) {
            this.addMessage({
              content: outputText,
              isUser: false,
              timestamp: new Date(),
              isVoice: false
            });
          }
        }
        break;
        
      case 'jarvis_stopped':
      case 'bridge_stopped':
        if (data.sessionId === this.sessionId) {
          this.status.set('stopped');
          this.isConnected.set(false);
          this.addMessage({
            content: data.message || 'Jarvis has been stopped.',
            isUser: false,
            timestamp: new Date(),
            isVoice: false
          });
        }
        break;
        
      case 'jarvis_error':
      case 'bridge_error':
        if (data.error) {
          this.status.set('error');
          this.addMessage({
            content: `❌ Error: ${data.error}`,
            isUser: false,
            timestamp: new Date(),
            isVoice: false
          });
        }
        break;
        
      default:
        console.log('Unknown message type:', data.type);
        // Handle any other messages that might have content
        if ((data.content || data.message) && data.sessionId === this.sessionId) {
          this.addMessage({
            content: data.content || data.message,
            isUser: false,
            timestamp: new Date(),
            isVoice: false
          });
        }
        break;
    }
  }

  // Add message to the chat
  private addMessage(message: JarvisMessage): void {
    const currentMessages = this.messages();
    this.messages.set([...currentMessages, message]);
  }

  // Clear all messages
  clearMessages(): void {
    this.messages.set([]);
  }

  // Start voice input
  async startVoiceInput(): Promise<void> {
    try {
      // Call Jarvis API to start voice input
      const response = await fetch(`${this.baseUrl}/voice/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: this.sessionId
        })
      });

      const result = await response.json();
      if (result.success) {
        this.voiceInputActive.set(true);
      } else {
        console.error('Failed to start voice input:', result.error);
      }
    } catch (error) {
      console.error('Error starting voice input:', error);
    }
  }

  // Stop voice input
  async stopVoiceInput(): Promise<void> {
    try {
      // Call Jarvis API to stop voice input
      const response = await fetch(`${this.baseUrl}/voice/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: this.sessionId
        })
      });

      const result = await response.json();
      if (result.success) {
        this.voiceInputActive.set(false);
      } else {
        console.error('Failed to stop voice input:', result.error);
      }
    } catch (error) {
      console.error('Error stopping voice input:', error);
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return `jarvis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
