
import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgFor, NgIf, NgClass, NgStyle, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ChatService, ChatUser, ChatMessage, Conversation } from '../../services/chat.service';
import { AuthService } from '../../auth/auth.service';
import { SocialMediaService } from '../../services/social-media.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, NgStyle, FormsModule, RouterLink, CommonModule]
})
export class Chat implements OnInit, OnDestroy {
  currentUser: any = null;
  chatUsers: ChatUser[] = [];
  conversations: Conversation[] = [];
  selectedUser: ChatUser | null = null;
  messages: ChatMessage[] = [];
  messageText = '';
  isLoading = false;

  private messagesSubscription?: Subscription;
  private conversationsSubscription?: Subscription;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private socialMediaService: SocialMediaService
  ) { }

  async ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    console.log('Chat ngOnInit - Current user:', this.currentUser);

    if (!this.currentUser) {
      console.error('No current user found in chat component');
      return;
    }

    try {
      // Initialize SignalR connection
      await this.chatService.startConnection();

      // Load chat users and conversations
      this.loadChatUsers();
      this.loadConversations();

      // Subscribe to real-time updates
      this.messagesSubscription = this.chatService.messages$.subscribe(messages => {
        if (this.selectedUser) {
          // Filter messages for current conversation
          this.messages = messages.filter(msg =>
            (msg.senderId === this.currentUser.id && msg.receiverId === this.selectedUser!.id) ||
            (msg.senderId === this.selectedUser!.id && msg.receiverId === this.currentUser.id)
          );
          this.scrollToBottom();
        }
      });

      this.conversationsSubscription = this.chatService.conversations$.subscribe(conversations => {
        this.conversations = conversations;
      });
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  }

  ngOnDestroy() {
    this.messagesSubscription?.unsubscribe();
    this.conversationsSubscription?.unsubscribe();
    this.chatService.stopConnection();
  }

  loadChatUsers() {
    if (!this.currentUser) {
      console.error('Cannot load chat users: no current user');
      return;
    }

    this.isLoading = true;
    console.log('Loading chat users for user ID:', this.currentUser.id);

    this.chatService.getChatUsers(this.currentUser.id).subscribe({
      next: (users) => {
        console.log('Chat users loaded successfully:', users);
        this.chatUsers = users;
        this.isLoading = false;
        
        // Check for 'with' query parameter to auto-select user
        this.route.queryParams.subscribe(params => {
          const withUserId = params['with'];
          if (withUserId) {
            console.log('Auto-selecting user with ID:', withUserId);
            // Find the user in the chat users list
            const targetUser = this.chatUsers.find(user => user.id == withUserId);
            if (targetUser) {
              this.selectUser(targetUser);
            } else {
              // If user not in chat list, we need to get user info and add them
              this.createNewChatWithUser(parseInt(withUserId));
            }
          }
        });
      },
      error: (error) => {
        console.error('Error loading chat users:', error);
        this.isLoading = false;
        // Don't logout on API errors, just log them
      }
    });
  }

  loadConversations() {
    this.chatService.getConversations(this.currentUser.id).subscribe({
      next: (conversations) => {
        this.conversations = conversations;
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
      }
    });
  }

  selectUser(user: ChatUser) {
    console.log('Selecting user:', user);
    console.log('Current user in selectUser:', this.currentUser);

    if (!this.currentUser) {
      console.error('No current user found when selecting chat user');
      return;
    }

    this.selectedUser = user;
    this.loadChatHistory();

    // Mark messages as read
    this.chatService.markMessagesAsRead(user.id);
    
    // Update unread count after marking messages as read
    setTimeout(() => {
      this.chatService.initializeUnreadCount();
    }, 500);
  }

  loadChatHistory() {
    if (!this.selectedUser) return;

    this.chatService.getChatHistory(this.currentUser.id, this.selectedUser.id).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.chatService.updateMessages(messages);
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Error loading chat history:', error);
      }
    });
  }

  async sendMessage() {
    if (!this.messageText.trim() || !this.selectedUser) return;

    const message = this.messageText;
    this.messageText = '';

    console.log('Sending message:', { selectedUser: this.selectedUser, message });

    // Send via SignalR - don't add locally, wait for SignalR confirmation
    try {
      await this.chatService.sendMessage(this.selectedUser.id, message);
      console.log('Message sent successfully via SignalR');
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error to user
      alert('Failed to send message. Please try again.');
      // Restore the message text
      this.messageText = message;
    }
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(date: Date): string {
    const today = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return messageDate.toLocaleDateString();
  }

  createNewChatWithUser(userId: number) {
    console.log('Creating new chat with user ID:', userId);
    // Get user information
    this.socialMediaService.getUser(userId).subscribe({
      next: (userResponse) => {
        console.log('User found:', userResponse);
        // Create a ChatUser object from the user response
        const chatUser: ChatUser = {
          id: userResponse.id,
          username: userResponse.username,
          profileImage: userResponse.profileImageUrl || `https://randomuser.me/api/portraits/men/${userId % 99}.jpg`
        };
        
        // Add to chat users list if not already present
        const existingUser = this.chatUsers.find(user => user.id === userId);
        if (!existingUser) {
          this.chatUsers.unshift(chatUser); // Add to beginning of list
        }
        
        // Select the user
        this.selectUser(chatUser);
      },
      error: (error) => {
        console.error('Error fetching user for chat:', error);
        // Could show a toast or error message here
      }
    });
  }
}
