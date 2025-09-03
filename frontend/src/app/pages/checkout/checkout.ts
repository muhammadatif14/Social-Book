import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcommerceService, EcommerceProduct } from '../../services/ecommerce.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../auth/auth.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule]
})
export class Checkout implements OnInit {
  product: EcommerceProduct | null = null;
  quantity: number = 1;
  loading: boolean = false;
  orderPlaced: boolean = false;
  orderId: number | null = null;
  currentUser: any = null;

  // Form data
  customerName: string = '';
  customerEmail: string = '';
  shippingAddress: string = '';
  phone: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ecommerceService: EcommerceService,
    private orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Pre-fill user info
    this.customerName = this.currentUser.username || '';
    this.customerEmail = this.currentUser.email || '';

    // Get product info from query params
    this.route.queryParams.subscribe(params => {
      if (params['productId'] && params['quantity']) {
        this.quantity = parseInt(params['quantity']) || 1;
        this.loadProduct(parseInt(params['productId']));
      } else {
        this.router.navigate(['/home']);
      }
    });
  }

  loadProduct(id: number) {
    this.ecommerceService.getProduct(id).subscribe({
      next: (product) => {
        this.product = product;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.router.navigate(['/home']);
      }
    });
  }

  getTotalAmount(): number {
    return this.product ? this.product.price * this.quantity : 0;
  }

  isFormValid(): boolean {
    return !!(this.customerName.trim() && 
             this.customerEmail.trim() && 
             this.shippingAddress.trim() && 
             this.product);
  }

  placeOrder() {
    if (!this.isFormValid() || !this.product || !this.currentUser) {
      return;
    }

    this.loading = true;

    const orderData = {
      userId: this.currentUser.id,
      productId: this.product.id,
      productTitle: this.product.title,
      productPrice: this.product.price,
      quantity: this.quantity,
      customerName: this.customerName.trim(),
      customerEmail: this.customerEmail.trim(),
      shippingAddress: this.shippingAddress.trim(),
      phone: this.phone.trim() || undefined
    };

    this.orderService.createOrder(orderData).subscribe({
      next: (order) => {
        this.loading = false;
        this.orderPlaced = true;
        this.orderId = order.id;
      },
      error: (error) => {
        this.loading = false;
        console.error('Error placing order:', error);
        alert('Failed to place order. Please try again.');
      }
    });
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  getMainImage(): string {
    if (this.product && this.product.images && this.product.images.length > 0) {
      return this.product.images[0];
    }
    return 'https://via.placeholder.com/200x200?text=No+Image';
  }
}
