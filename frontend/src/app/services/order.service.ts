import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateOrderDto {
  userId: number;
  productId: number;
  productTitle: string;
  productPrice: number;
  quantity: number;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  phone?: string;
}

export interface OrderDto {
  id: number;
  userId: number;
  productId: number;
  productTitle: string;
  productPrice: number;
  quantity: number;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  phone?: string;
  orderStatus: string;
  createdAt: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = 'http://localhost:5036/api/orders';

  constructor(private http: HttpClient) {}

  // Helper method to get auth headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders();
    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Create a new order
  createOrder(orderData: CreateOrderDto): Observable<OrderDto> {
    return this.http.post<OrderDto>(this.baseUrl, orderData, { headers: this.getAuthHeaders() });
  }

  // Get orders for a specific user
  getUserOrders(userId: number): Observable<OrderDto[]> {
    return this.http.get<OrderDto[]>(`${this.baseUrl}/user/${userId}`, { headers: this.getAuthHeaders() });
  }

  // Get a specific order by ID
  getOrder(orderId: number): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${this.baseUrl}/${orderId}`, { headers: this.getAuthHeaders() });
  }

  // Update order status
  updateOrderStatus(orderId: number, status: string): Observable<OrderDto> {
    return this.http.put<OrderDto>(`${this.baseUrl}/${orderId}/status`, JSON.stringify(status), {
      headers: this.getAuthHeaders().set('Content-Type', 'application/json')
    });
  }
}
