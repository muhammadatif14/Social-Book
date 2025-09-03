import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EcommerceService, EcommerceProduct } from '../../services/ecommerce.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule]
})
export class ProductDetail implements OnInit {
  product: EcommerceProduct | null = null;
  loading: boolean = true;
  error: string = '';
  selectedImageIndex: number = 0;
  quantity: number = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ecommerceService: EcommerceService
  ) {}

  ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(parseInt(productId));
    } else {
      this.error = 'Product ID not found';
      this.loading = false;
    }
  }

  loadProduct(id: number) {
    this.loading = true;
    this.ecommerceService.getProduct(id).subscribe({
      next: (product) => {
        this.product = product;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.error = 'Failed to load product';
        this.loading = false;
      }
    });
  }

  selectImage(index: number) {
    this.selectedImageIndex = index;
  }

  increaseQuantity() {
    this.quantity++;
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart() {
    if (this.product) {
      // For demo purposes, just show an alert
      alert(`Added ${this.quantity} x ${this.product.title} to cart!`);
    }
  }

  buyNow() {
    if (this.product) {
      // Navigate to checkout with product and quantity info
      this.router.navigate(['/checkout'], {
        queryParams: {
          productId: this.product.id,
          quantity: this.quantity
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  getMainImage(): string {
    if (this.product && this.product.images && this.product.images.length > 0) {
      return this.product.images[this.selectedImageIndex] || this.product.images[0];
    }
    return 'https://via.placeholder.com/400x400?text=No+Image';
  }
}
