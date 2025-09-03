import { Component, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JarvisService } from '../services/jarvis.service';

@Component({
  selector: 'app-my-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-assistant.component.html',
  styleUrls: ['./my-assistant.component.css']
})
export class MyAssistantComponent implements OnInit, OnDestroy {
  currentMessage = '';
  isLoading = false;

  constructor(private jarvisService: JarvisService) {}

  // Computed properties for reactive UI
  status = computed(() => this.jarvisService.status());
  messages = computed(() => this.jarvisService.messages());
  isConnected = computed(() => this.jarvisService.isConnected());
  voiceInputActive = computed(() => this.jarvisService.voiceInputActive());

  ngOnInit() {
    // Initialize Jarvis when component loads
    this.initializeJarvis();
  }

  ngOnDestroy() {
    // Clean up when component is destroyed
    this.jarvisService.stopJarvis();
  }

  async initializeJarvis() {
    this.isLoading = true;
    try {
      await this.jarvisService.startJarvis();
    } catch (error) {
      console.error('Failed to start Jarvis:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async sendMessage() {
    if (!this.currentMessage.trim() || this.status() !== 'ready') {
      return;
    }

    const message = this.currentMessage.trim();
    this.currentMessage = '';
    
    try {
      await this.jarvisService.sendMessage(message, false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  async toggleVoiceInput() {
    if (this.voiceInputActive()) {
      await this.jarvisService.stopVoiceInput();
    } else {
      await this.jarvisService.startVoiceInput();
    }
  }

  async restartJarvis() {
    this.isLoading = true;
    try {
      await this.jarvisService.stopJarvis();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      await this.jarvisService.startJarvis();
    } catch (error) {
      console.error('Failed to restart Jarvis:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async stopJarvis() {
    this.isLoading = true;
    try {
      await this.jarvisService.stopJarvis();
    } catch (error) {
      console.error('Failed to stop Jarvis:', error);
    } finally {
      this.isLoading = false;
    }
  }

  clearChat() {
    this.jarvisService.clearMessages();
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  trackByMessage(index: number, message: any): any {
    return message.timestamp;
  }

  formatMessage(content: string): string {
    // Basic formatting for Jarvis messages
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }
}
