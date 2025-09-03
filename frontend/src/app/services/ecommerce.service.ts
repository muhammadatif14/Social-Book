import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EcommerceProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: {
    id: number;
    name: string;
    image: string;
  };
  creationAt: string;
  updatedAt: string;
}

export interface EcommerceCategory {
  id: number;
  name: string;
  image: string;
  creationAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class EcommerceService {
  private baseUrl = 'https://api.escuelajs.co/api/v1';

  constructor(private http: HttpClient) {}

  // Get all products with optional limit and offset
  getProducts(limit: number = 10, offset: number = 0): Observable<EcommerceProduct[]> {
    return this.http.get<EcommerceProduct[]>(`${this.baseUrl}/products?limit=${limit}&offset=${offset}`);
  }

  // Get single product by ID
  getProduct(id: number): Observable<EcommerceProduct> {
    return this.http.get<EcommerceProduct>(`${this.baseUrl}/products/${id}`);
  }

  // Get all categories
  getCategories(): Observable<EcommerceCategory[]> {
    return this.http.get<EcommerceCategory[]>(`${this.baseUrl}/categories`);
  }

  // Get products by category
  getProductsByCategory(categoryId: number, limit: number = 10, offset: number = 0): Observable<EcommerceProduct[]> {
    return this.http.get<EcommerceProduct[]>(`${this.baseUrl}/categories/${categoryId}/products?limit=${limit}&offset=${offset}`);
  }

  // Search products by title
  searchProducts(query: string): Observable<EcommerceProduct[]> {
    return this.http.get<EcommerceProduct[]>(`${this.baseUrl}/products/?title=${encodeURIComponent(query)}`);
  }

  // Filter products by price range
  getProductsByPriceRange(minPrice: number, maxPrice: number): Observable<EcommerceProduct[]> {
    return this.http.get<EcommerceProduct[]>(`${this.baseUrl}/products/?price_min=${minPrice}&price_max=${maxPrice}`);
  }
}
