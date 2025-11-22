// MySQL database integration using API calls
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface User {
  id: string;
  role: 'farmer' | 'consumer' | 'admin';
  name?: string;
  fullName?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  address: string;
  password: string;
  isBlocked?: boolean;
  createdAt?: string;
}

interface Product {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmerWhatsapp?: string;
  farmerAddress: string;
  cropName: string;
  cropCategory: string;
  pricePerKg: number;
  availableQuantity: number;
  image: string;
  // Enhanced recommendation fields
  isSeasonal?: boolean;
  seasonalMonths?: string;
  inSeason?: boolean;
  recommendationScore?: number;
  createdAt?: string;
}

interface CartItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  quantity: number;
  pricePerKg: number;
}

interface Order {
  id: string;
  userId: string;
  consumerName: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt?: string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt?: string;
}

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Helper function for authenticated API calls
async function authenticatedApiCall(endpoint: string, token: string, options: RequestInit = {}) {
  return apiCall(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}

// Authentication Functions
export async function loginUser(email: string, password: string): Promise<User | null> {
  try {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.user) {
      // Store token in localStorage
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      return response.user;
    }
    return null;
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
}

export async function registerUser(userData: Partial<User>): Promise<User | null> {
  try {
    const response = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.user) {
      return response.user;
    }
    return null;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

export async function resetPassword(phone: string): Promise<boolean> {
  try {
    const response = await apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });

    return response.success;
  } catch (error) {
    console.error('Password reset failed:', error);
    return false;
  }
}

// Forgot password helpers (backend-driven)
export async function verifyPhone(phone: string): Promise<boolean> {
  try {
    const response = await apiCall('/auth/forgot/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return !!response.exists;
  } catch (error) {
    console.error('Verify phone failed:', error);
    return false;
  }
}

export async function applyNewPassword(phone: string, newPassword: string): Promise<boolean> {
  try {
    const response = await apiCall('/auth/forgot/reset', {
      method: 'POST',
      body: JSON.stringify({ phone, newPassword }),
    });
    return !!response.success;
  } catch (error) {
    console.error('Apply new password failed:', error);
    return false;
  }
}


// Product Functions
export async function getProducts(): Promise<Product[]> {
  try {
    const response = await apiCall('/products');
    const products = response.products || [];

    // Filter out and handle zero-price products
    return products.filter((product: Product) => {
      const { price } = calculateEffectivePrice(product);
      if (price <= 0) {
        // Trigger removal in background
        handleZeroPriceProduct(product).catch(console.error);
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return [];
  }
}

export async function addProduct(productData: Partial<Product>): Promise<Product | null> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    console.log('Adding product with data:', productData);
    console.log('Token:', token ? 'Present' : 'Missing');

    const response = await authenticatedApiCall('/products', token, {
      method: 'POST',
      body: JSON.stringify(productData),
    });

    console.log('Add product response:', response);
    return response.product;
  } catch (error) {
    console.error('Failed to add product:', error);
    throw error;
  }
}

export async function updateProduct(productId: string, productData: Partial<Product>): Promise<Product | null> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/products/${productId}`, token, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });

    return response.product;
  } catch (error) {
    console.error('Failed to update product:', error);
    throw error;
  }
}

export async function deleteProduct(productId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/products/${productId}`, token, {
      method: 'DELETE',
    });

    return response.success;
  } catch (error) {
    console.error('Failed to delete product:', error);
    return false;
  }
}

// Cart Functions
export async function getCart(userId: string): Promise<CartItem[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/cart/${userId}`, token);
    return response.cart || [];
  } catch (error) {
    console.error('Failed to fetch cart:', error);
    return [];
  }
}

export async function addToCart(userId: string, productId: string, quantity: number): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const requestData = { userId, productId, quantity };
    console.log('Sending cart add request:', requestData);
    console.log('Token present:', !!token);

    const response = await authenticatedApiCall('/cart/add', token, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    console.log('Cart add response:', response);
    return response.success;
  } catch (error) {
    console.error('Failed to add to cart:', error);
    return false;
  }
}

export async function updateCartItem(userId: string, productId: string, quantity: number): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/cart/update`, token, {
      method: 'PUT',
      body: JSON.stringify({ userId, productId, quantity }),
    });

    return response.success;
  } catch (error) {
    console.error('Failed to update cart item:', error);
    return false;
  }
}

export async function removeFromCart(userId: string, productId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/cart/remove`, token, {
      method: 'DELETE',
      body: JSON.stringify({ userId, productId }),
    });

    return response.success;
  } catch (error) {
    console.error('Failed to remove from cart:', error);
    return false;
  }
}

// Order Functions
export async function placeOrder(userId: string, items: CartItem[], deliveryAddress?: string, deliveryType?: string): Promise<Order | null> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    // Calculate total amount
    const totalAmount = items.reduce((total, item) => total + (item.pricePerKg * item.quantity), 0);

    const orderData = {
      userId,
      items,
      totalAmount,
      deliveryAddress: deliveryAddress || 'Default Address',
      deliveryType: deliveryType || 'self'
    };

    console.log('Placing order with data:', orderData);

    const response = await authenticatedApiCall('/orders', token, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });

    console.log('Place order response:', response);

    // Check if order was blocked due to review trigger
    if (response.blocked && response.redirect_to_login) {
      // Clear user session and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Show the blocking message
      throw new Error(response.message);
    }

    return response.order;
  } catch (error) {
    console.error('Failed to place order:', error);
    throw error;
  }
}

export async function getOrders(userId: string): Promise<Order[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    return await authenticatedApiCall(`/orders/${userId}`, token);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return [];
  }
}

// Notification Functions
export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/notifications/${userId}`, token);
    return response.notifications || [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/notifications/${notificationId}/read`, token, {
      method: 'PUT',
    });

    return response.success;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

// Helper function to calculate effective price
export function calculateEffectivePrice(product: Product): { price: number; intervals: number } {
  const createdAt = product.createdAt ? new Date(product.createdAt).getTime() : Date.now();
  const hoursSince = (Date.now() - createdAt) / (1000 * 60 * 60);
  const intervals = Math.floor(hoursSince / 20); // 20% off every 20 hours
  const multiplier = Math.pow(0.8, intervals);
  const basePrice = product.pricePerKg * 1.02; // Add 2% commission
  const effectivePrice = Math.max(0, Math.round(basePrice * multiplier));
  return { price: effectivePrice, intervals };
}

// Function to handle automatic removal of zero-price products
export async function handleZeroPriceProduct(product: Product): Promise<void> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    // Delete the product
    await deleteProduct(product.id);

    // Create a notification for the farmer
    await authenticatedApiCall('/notifications', token, {
      method: 'POST',
      body: JSON.stringify({
        userId: product.farmerId,
        title: 'Product Automatically Removed',
        message: `Your product "${product.cropName}" has been automatically removed as its price reached zero due to time-based reduction.`,
        type: 'warning',
      }),
    });

    // Remove from recommendations (backend will handle this automatically when product is deleted)
    await authenticatedApiCall(`/recommendations/remove/${product.id}`, token, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to handle zero-price product:', error);
  }
}

// Recommendation Functions
export async function getRecommendations(userId: string): Promise<Product[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/recommendations/${userId}`, token);
    const recommendations = response.recommendations || [];

    // Filter out any products with zero effective price
    return recommendations.filter((product: Product) => {
      const { price } = calculateEffectivePrice(product);
      if (price <= 0) {
        // Trigger removal in background
        handleZeroPriceProduct(product).catch(console.error);
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    return [];
  }
}

export async function updateSearchHistory(userId: string, searchTerm: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall('/search-history', token, {
      method: 'POST',
      body: JSON.stringify({ userId, searchTerm }),
    });

    return response.success;
  } catch (error) {
    console.error('Failed to update search history:', error);
    return false;
  }
}

// Admin Functions
export async function getAllUsers(): Promise<User[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall('/admin/users', token);
    return response.users || [];
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall('/admin/products', token);
    return response.products || [];
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return [];
  }
}

export async function getAllOrders(): Promise<Order[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall('/admin/orders', token);
    return response.orders || [];
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return [];
  }
}

export async function getBlockedUsers(): Promise<User[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall('/admin/blocked-users', token);
    return response.users || [];
  } catch (error) {
    console.error('Failed to fetch blocked users:', error);
    return [];
  }
}


// Customer Contact Center Functions
export interface Customer {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  totalQuantity: number;
  lastOrderDate?: string;
  isRepeatCustomer: boolean;
  note?: string;
  noteUpdatedAt?: string;
}

export async function getFarmerCustomers(farmerId: string): Promise<Customer[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/farmer/${farmerId}/customers`, token);
    return response.customers || [];
  } catch (error) {
    console.error('Failed to fetch farmer customers:', error);
    return [];
  }
}

export async function getCustomerOrders(farmerId: string, customerId: string): Promise<any[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/farmer/${farmerId}/customers/${customerId}/orders`, token);
    return response.orders || [];
  } catch (error) {
    console.error('Failed to fetch customer orders:', error);
    return [];
  }
}

export async function saveCustomerNote(farmerId: string, customerId: string, note: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/farmer/${farmerId}/customers/${customerId}/notes`, token, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });

    return response.success;
  } catch (error) {
    console.error('Failed to save customer note:', error);
    return false;
  }
}

export async function deleteCustomerNote(farmerId: string, customerId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/farmer/${farmerId}/customers/${customerId}/notes`, token, {
      method: 'DELETE',
    });

    return response.success;
  } catch (error) {
    console.error('Failed to delete customer note:', error);
    return false;
  }
}

export async function blockUser(userId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/admin/users/${userId}/block`, token, {
      method: 'PUT',
    });

    return response.success;
  } catch (error) {
    console.error('Failed to block user:', error);
    return false;
  }
}

export async function unblockUser(userId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/admin/users/${userId}/unblock`, token, {
      method: 'PUT',
    });

    return response.success;
  } catch (error) {
    console.error('Failed to unblock user:', error);
    return false;
  }
}

// Utility Functions
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  }
  return null;
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('authToken') !== null;
}

export function logout(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// Additional functions needed for the updated components
export async function getFarmerOrders(farmerId: string): Promise<Order[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/orders/farmer/${farmerId}`, token);
    return response.orders || [];
  } catch (error) {
    console.error('Failed to fetch farmer orders:', error);
    return [];
  }
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/orders/${userId}`, token);
    return response.orders || [];
  } catch (error) {
    console.error('Failed to fetch user orders:', error);
    return [];
  }
}

export async function getOrderStatus(orderId: string): Promise<string | null> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');
    const response = await authenticatedApiCall(`/orders/status/${orderId}`, token);
    return response.status || null;
  } catch (error) {
    console.error('Failed to fetch order status:', error);
    return null;
  }
}

export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');
    const response = await authenticatedApiCall(`/orders/status/${orderId}`, token, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    return !!response.success;
  } catch (error) {
    console.error('Failed to update order status:', error);
    return false;
  }
}

export async function updateUserProfile(userId: string, profileData: Partial<User>): Promise<{ success: boolean; user?: User }> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Authentication required');

    const response = await authenticatedApiCall(`/users/${userId}`, token, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });

    return { success: response.success, user: response.user };
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return { success: false };
  }
}
