import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIf, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialMediaService, PostResponse, CommentResponse, ProductDto } from '../services/social-media.service';
import { StoryService, Story } from '../services/story.service';
import { AuthService } from '../auth/auth.service';
import { ChatService, ChatUser } from '../services/chat.service';
import { EcommerceService, EcommerceProduct } from '../services/ecommerce.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgIf, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {

  dropdownOpen = false;
  posts: PostResponse[] = [];
  stories: Story[] = [];
  products: ProductDto[] = [];
  ecommerceProducts: EcommerceProduct[] = [];
  friends: ChatUser[] = [];
  viewerOpen: boolean = false;
  currentIndex: number = -1;
  unreadMessageCount: number = 0;

  get currentStory(): Story | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.stories.length) return this.stories[this.currentIndex];
    return null;
  }
  profileImage: string = '';
  newPostText: string = '';
  newPostImageFile: File | null = null;
  commentTexts: { [key: number]: string } = {};
  currentUser: any = null;

  constructor(
    private socialMediaService: SocialMediaService,
    private authService: AuthService,
    private router: Router,
    private storyService: StoryService,
    private chatService: ChatService,
    private ecommerceService: EcommerceService
  ) {}

  async ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadPosts();
    this.loadProfileImage();
    this.loadStories();
    this.loadProducts();
    this.loadFriends();
    this.loadEcommerceProducts();
    this.initializeChatService();
      // Listen for postDeleted event from profile page
      if (window && window.addEventListener) {
        window.addEventListener('postDeleted', (e: any) => {
          const postId = e.detail?.postId;
          if (postId) {
            this.posts = this.posts.filter(p => p.id !== postId);
          }
        });

        // Update stories in real-time when profile uploads a story
        window.addEventListener('storiesUpdated', (e: any) => {
          this.loadStories();
        });

        // Update products in real-time when profile uploads a product
        window.addEventListener('productsUpdated', (e: any) => {
          this.loadProducts();
        });
      }
  }

  loadStories() {
    this.stories = this.storyService.getStories();
  }

  loadProducts() {
    console.log('Loading products...');
    this.socialMediaService.getAllProducts().subscribe({
      next: (products) => {
        console.log('Products loaded successfully:', products);
        this.products = products.map(p => ({
          ...p,
          imagePath: p.imagePath ? `http://localhost:5036${p.imagePath}` : undefined
        }));
        console.log('Processed products:', this.products);
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.products = [];
      }
    });
  }

  loadFriends() {
    if (!this.currentUser) {
      console.error('Cannot load friends: no current user');
      return;
    }

    console.log('Loading friends for user ID:', this.currentUser.id);
    this.chatService.getChatUsers(this.currentUser.id).subscribe({
      next: (users) => {
        console.log('Friends loaded successfully:', users);
        this.friends = users.slice(0, 8); // Show only first 8 friends in sidebar
      },
      error: (error) => {
        console.error('Error loading friends:', error);
        this.friends = [];
      }
    });
  }

  loadEcommerceProducts() {
    this.ecommerceService.getProducts(8, 0).subscribe({
      next: (products) => {
        this.ecommerceProducts = products;
        console.log('Ecommerce products loaded:', this.ecommerceProducts);
      },
      error: (error) => {
        console.error('Error loading ecommerce products:', error);
        this.ecommerceProducts = [];
      }
    });
  }

  viewProduct(product: EcommerceProduct) {
    this.router.navigate(['/product', product.id]);
  }

  startChatWithFriend(friend: ChatUser) {
    this.router.navigate(['/chat'], { queryParams: { with: friend.id } });
  }

  startDeal(product: ProductDto) {
    this.router.navigate(['/chat'], { queryParams: { with: product.userId } });
  }

  deleteProduct(product: ProductDto) {
    if (product.userId !== this.currentUser?.id) return;
    
    const confirmed = window.confirm('Delete this product? This cannot be undone.');
    if (!confirmed) return;

    this.socialMediaService.deleteProduct(product.id).subscribe({
      next: () => {
        this.loadProducts();
        if (window && (window as any).dispatchEvent) {
          window.dispatchEvent(new CustomEvent('productsUpdated', { detail: { deletedId: product.id } }));
        }
      },
      error: (error) => {
        console.error('Error deleting product:', error);
      }
    });
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }

  openStoryViewer(index: number) {
    this.currentIndex = index;
    this.viewerOpen = true;
  }

  closeStoryViewer() {
    this.viewerOpen = false;
    this.currentIndex = -1;
  }

  deleteCurrentStory() {
    const story = this.currentStory;
    if (!story) return;
    // confirm before deleting
    const confirmed = window.confirm('Delete this story? This cannot be undone.');
    if (!confirmed) return;
    const ok = this.storyService.deleteStoryById(story.id);
    if (ok) {
      // Refresh stories list and close modal
      this.loadStories();
      this.closeStoryViewer();
      if (window && (window as any).dispatchEvent) {
        window.dispatchEvent(new CustomEvent('storiesUpdated', { detail: { deletedId: story.id } }));
      }
    }
  }

  nextStory(event?: Event) {
    if (event) event.stopPropagation();
    if (this.currentIndex < this.stories.length - 1) {
      this.currentIndex += 1;
    }
  }

  prevStory(event?: Event) {
    if (event) event.stopPropagation();
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
    }
  }

  loadPosts() {
    this.socialMediaService.getAllPosts().subscribe({
      next: (posts: PostResponse[]) => {
        this.posts = posts.map(post => ({
          ...post,
          showCommentBox: false,
          imageUrl: post.imagePath ? `http://localhost:5036${post.imagePath}` : undefined,
          likes: post.likesCount,
          text: post.caption,
          user: {
            id: post.userId,
            username: post.username,
            profileImageUrl: undefined
          },
          comments: [],
          createdAt: post.postedAt
        }));
      },
      error: (error: any) => {
        console.error('Error loading posts:', error);
        this.posts = [];
      }
    });
  }

  loadProfileImage() {
    this.profileImage = this.currentUser?.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg';
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onPostImageChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newPostImageFile = file;
    }
  }

  uploadPost() {
    if (!this.newPostText.trim() && !this.newPostImageFile) return;
    
    this.socialMediaService.createPost(
      this.newPostText,
      this.newPostImageFile || undefined
    ).subscribe({
      next: (post) => {
        const mappedPost = {
          ...post,
          showCommentBox: false,
          imageUrl: post.imagePath ? `http://localhost:5036${post.imagePath}` : undefined,
          likes: post.likesCount,
          text: post.caption,
          user: {
            id: post.userId,
            username: post.username,
            profileImageUrl: undefined
          },
          comments: [],
          createdAt: post.postedAt
        };
        this.posts.unshift(mappedPost);
        this.newPostText = '';
        this.newPostImageFile = null;
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (error) => {
        console.error('Error creating post:', error);
      }
    });
  }

  likePost(post: any) {
    this.socialMediaService.likePost(post.id).subscribe({
      next: (response) => {
        post.likes = response.likesCount;
        post.likesCount = response.likesCount;
      },
      error: (error: any) => {
        console.error('Error liking post:', error);
        post.likes = (post.likes || 0) + 1;
      }
    });
  }

  toggleCommentBox(post: any) {
    post.showCommentBox = !post.showCommentBox;
    
    if (post.showCommentBox && (!post.comments || post.comments.length === 0)) {
      this.loadPostComments(post.id);
    }
  }

  loadPostComments(postId: number) {
    this.socialMediaService.getPostComments(postId).subscribe({
      next: (comments: CommentResponse[]) => {
        const post = this.posts.find(p => p.id === postId);
        if (post) {
          post.comments = comments.map(comment => ({
            ...comment,
            user: {
              id: comment.userId,
              username: comment.username,
              profileImageUrl: undefined
            }
          }));
        }
      },
      error: (error: any) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  uploadComment(post: any) {
    const commentText = this.commentTexts[post.id];
    if (!commentText?.trim()) return;
    
    this.socialMediaService.createComment(post.id, commentText).subscribe({
      next: (comment: CommentResponse) => {
        if (!post.comments) {
          post.comments = [];
        }
        const mappedComment = {
          ...comment,
          user: {
            id: comment.userId,
            username: comment.username,
            profileImageUrl: undefined
          }
        };
        post.comments.push(mappedComment);
        this.commentTexts[post.id] = '';
      },
      error: (error: any) => {
        console.error('Error creating comment:', error);
      }
    });
  }

  // Initialize chat service and listen for unread message count
  async initializeChatService() {
    try {
      await this.chatService.startConnection();
      this.chatService.initializeUnreadCount();
      
      // Subscribe to unread count changes
      this.chatService.unreadCount$.subscribe(count => {
        this.unreadMessageCount = count;
      });
    } catch (error) {
      console.error('Error initializing chat service:', error);
    }
  }
}
