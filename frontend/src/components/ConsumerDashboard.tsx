import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, MessageCircle, MapPin, Truck, Clock, User, CreditCard as Edit, Save, X, History, Bell, Star } from 'lucide-react';
import { getProducts, addToCart, getCart, getRecommendations, updateSearchHistory, getUserOrders, updateUserProfile, getOrderStatus } from '../utils/database';
import Cart from './Cart';
import Chatbot from './Chatbot';
import notify from '../utils/notify';

interface ConsumerDashboardProps {
  user: any;
}

const ConsumerDashboard: React.FC<ConsumerDashboardProps> = ({ user }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [orderNotifications, setOrderNotifications] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState(user);
  const [locations, setLocations] = useState<string[]>([]);
  const [trackingStatuses, setTrackingStatuses] = useState<{ [orderId: string]: string }>({});

  const categories = ['vegetables', 'fruits', 'grains', 'pulses'];

  // Calculate consumer-facing effective price:
  // 1) 2% admin commission added to base price (backend also returns this for convenience)
  // 2) Freshness discount applied over time
  const getEffectivePrice = (product: any): { price: number; intervals: number } => {
    const createdAt = product.createdAt || product.timestamp || product.listedAt;
    const createdMs = createdAt ? new Date(createdAt).getTime() : Date.now();
    const hoursSince = (Date.now() - createdMs) / (1000 * 60 * 60);
    const intervals = Math.max(0, Math.floor(hoursSince / 20)); // 20% off every 20 hours
    const multiplier = Math.pow(0.8, intervals); // 20% off per 20h interval
    const baseWithCommission = Number(product.consumerPricePerKg ?? (Number(product.pricePerKg) * 1.02)) || 0;
    const effective = Math.max(0, Math.round(baseWithCommission * multiplier)); // Can go to zero
    return { price: effective, intervals };
  };
  const sortOptions = [
    { value: '', label: 'Default' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'name', label: 'Name: A to Z' },
    { value: 'location', label: 'Location: A to Z' }
  ];

  useEffect(() => {
    // Check if user is still authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Redirect to login if no token
      window.location.href = '/login';
      return;
    }
    
    const loadData = async () => {
      try {
        const allProducts = await getProducts();
        // Filter out products with zero price
        const availableProducts = allProducts.filter(product => {
          const { price } = getEffectivePrice(product);
          return price > 0;
        });
        setProducts(availableProducts);
        setFilteredProducts(availableProducts);
        
        const userCart = await getCart(user.id);
        setCart(userCart);
        
        const userRecommendations = await getRecommendations(user.id);
        setRecommendations(userRecommendations);
        
        const userOrders = await getUserOrders(user.id);
        setOrders(userOrders);
      } catch (error) {
        console.error('Error loading consumer data:', error);
        // If there's an authentication error, redirect to login
        if (error.message && error.message.includes('Authentication')) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    };
    
    loadData();
    const interval = setInterval(async () => {
      try {
        const currentOrders = await getUserOrders(user.id);
        const statusUpdates: { [key: string]: string } = {};
        await Promise.all(currentOrders.map(async (o) => {
          const status = await getOrderStatus(o.id);
          if (status) statusUpdates[o.id] = status;
        }));
        if (Object.keys(statusUpdates).length > 0) {
          setTrackingStatuses(prev => ({ ...prev, ...statusUpdates }));
          setOrders(currentOrders.map(o => ({ ...o, status: statusUpdates[o.id] || o.status })));
          
          // Check for status changes and show notifications
          Object.entries(statusUpdates).forEach(([orderId, newStatus]) => {
            const order = currentOrders.find(o => o.id === orderId);
            if (order && order.status !== newStatus) {
              let notificationMessage = '';
              let notificationType = 'info';
              switch (newStatus) {
                case 'processing':
                  notificationMessage = `⚙️ Your order #${orderId.slice(-8)} is being prepared by the farmer`;
                  notificationType = 'processing';
                  break;
                case 'shipped':
                  notificationMessage = `🚚 Your order #${orderId.slice(-8)} is on the way!`;
                  notificationType = 'shipped';
                  break;
                case 'delivered':
                  notificationMessage = `🎉 Your order #${orderId.slice(-8)} has been delivered!`;
                  notificationType = 'delivered';
                  break;
                default:
                  notificationMessage = `📦 Order #${orderId.slice(-8)} status updated to ${newStatus}`;
                  notificationType = 'info';
              }
              showNotification(notificationMessage);
              
              // Add to order notifications
              setOrderNotifications(prev => [...prev, {
                id: `${orderId}-${newStatus}-${Date.now()}`,
                orderId,
                message: notificationMessage,
                type: notificationType,
                timestamp: new Date()
              }]);
            }
          });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
    const filterProducts = async () => {
      try {
        // Get unique locations from farmer addresses
        const allProducts = await getProducts();
        // Filter out products with zero price
        const availableProducts = allProducts.filter(product => {
          const { price } = getEffectivePrice(product);
          return price > 0;
        });
        const uniqueLocations = [...new Set(availableProducts.map(product => {
          // Extract city/location from farmer address
          const addressParts = product.farmerAddress.split(',');
          return addressParts[addressParts.length - 1].trim();
        }))].sort();
        setLocations(uniqueLocations);
        
        let filtered = products;

        if (searchTerm) {
          filtered = filtered.filter(product =>
            product.cropName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.cropCategory.toLowerCase().includes(searchTerm.toLowerCase())
          );
          await updateSearchHistory(user.id, searchTerm);
        }

        if (selectedCategory) {
          filtered = filtered.filter(product => product.cropCategory === selectedCategory);
        }

        if (selectedLocation) {
          filtered = filtered.filter(product => 
            product.farmerAddress.toLowerCase().includes(selectedLocation.toLowerCase())
          );
        }

        if (sortBy) {
          switch (sortBy) {
            case 'price-low':
              filtered.sort((a, b) => getEffectivePrice(a).price - getEffectivePrice(b).price);
              break;
            case 'price-high':
              filtered.sort((a, b) => getEffectivePrice(b).price - getEffectivePrice(a).price);
              break;
            case 'name':
              filtered.sort((a, b) => a.cropName.localeCompare(b.cropName));
              break;
            case 'location':
              filtered.sort((a, b) => a.farmerAddress.localeCompare(b.farmerAddress));
              break;
          }
        }

        setFilteredProducts(filtered);
      } catch (error) {
        console.error('Error filtering products:', error);
      }
    };
    
    filterProducts();
  }, [searchTerm, selectedCategory, selectedLocation, sortBy, products, user.id]);

  const showNotification = (message: string) => {
    setPopupMessage(message);
    setShowPopup(true);
    setTimeout(() => {
      setShowPopup(false);
    }, 3000); // Hide after 3 seconds
  };

  const handleAddToCart = async (product: any) => {
    try {
      const success = await addToCart(user.id, product.id, 1);
      if (success) {
        const updatedCart = await getCart(user.id);
        setCart(updatedCart);
        showNotification(`✅ ${product.cropName} added to cart!`);
      }
    } catch (error) {
      showNotification(`❌ Failed to add ${product.cropName} to cart`);
    }
  };

  const openWhatsApp = (phoneNumber: string) => {
    window.open(`https://wa.me/91${phoneNumber}`, '_blank');
  };

  const handleProfileUpdate = async () => {
    try {
      const result = await updateUserProfile(user.id, profileData);
      if (result.success) {
        setEditingProfile(false);
        notify('Profile updated successfully!', { variant: 'success' });
        // Update the user data in localStorage with the updated data from backend
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
          // Update the profileData state with the fresh data from backend
          setProfileData(result.user);
        } else {
          localStorage.setItem('user', JSON.stringify(profileData));
        }
        // Update the parent component's user data
        window.location.reload(); // Simple refresh for now
      } else {
        notify('Failed to update profile. Please try again.', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      notify('Failed to update profile. Please try again.', { variant: 'error' });
    }
  };

  const renderProductCard = (product: any) => (
    <div key={product.id} className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      <img 
        src={product.image} 
        alt={product.cropName}
        className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full capitalize">
            {product.cropCategory}
          </span>
        </div>
        
        <h4 className="font-bold text-xl mb-2 text-gray-900">{product.cropName}</h4>
        
        <div className="flex items-center space-x-2 mb-4">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600 font-medium">By {product.farmerName}</span>
        </div>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-xs text-green-600 font-medium">Fresh Today</span>
          </div>
          <div className="flex items-center space-x-1">
            <Truck className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-blue-600 font-medium">Fast Delivery</span>
          </div>
        </div>

        <div className="mb-3">
          <span className="text-xs text-gray-500">Listed on: {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}</span>
        </div>
        
        {/* Seasonal Indicator */}
        {product.isSeasonal && (
          <div className="flex items-center space-x-1 mb-3">
            <span className={`h-2 w-2 rounded-full ${product.inSeason ? 'bg-green-500' : 'bg-orange-500'}`}></span>
            <span className={`text-xs font-medium ${product.inSeason ? 'text-green-600' : 'text-orange-600'}`}>
              {product.inSeason ? 'In Season' : 'Off Season'}
            </span>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-4">
          <div>
            {(() => {
              const { price, intervals } = getEffectivePrice(product);
              const hasDiscount = intervals > 0;
              return (
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-green-600">₹{price}</span>
                  <span className="text-gray-500 text-sm">/kg</span>
                  {hasDiscount && (
                    <span className="text-sm text-gray-400 line-through">₹{Math.round((product.consumerPricePerKg ?? (product.pricePerKg * 1.02)))}</span>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {product.availableQuantity} kg available
            </span>
            {(() => {
              const { intervals } = getEffectivePrice(product);
              if (intervals > 0) {
                return (
                  <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-full" title="Freshness discount applies">
                    -20% × {intervals}
                  </span>
                );
              }
              return null;
            })()}
          </div>
        </div>
        
        {(() => {
          const { price } = getEffectivePrice(product);
          if (price <= 0) {
            return (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700 font-medium">
                  This product is no longer available (price expired)
                </p>
              </div>
            );
          }
          return (
        <div className="flex space-x-3">
          <button
            onClick={() => handleAddToCart(product)}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Add to Cart</span>
          </button>
          <button
            onClick={() => openWhatsApp(product.farmerWhatsapp)}
            className="bg-green-500 text-white p-3 rounded-xl hover:bg-green-600 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
          );
        })()}
      </div>
    </div>
  );

  const renderProducts = () => (
    <div>
      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for crops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              />
            </div>
          </div>
          
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Floating Chatbot Button */}
      <button
        onClick={() => setShowChatbot(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 z-40"
      >
        <MessageCircle className="h-6 w-6" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
      </button>

      {/* Order Status Notification Bell */}
      {orderNotifications.length > 0 && (
        <button
          onClick={() => {
            setOrderNotifications([]);
            setActiveTab('orders');
          }}
          className="fixed bottom-6 right-20 bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 z-40"
        >
          <Bell className="h-6 w-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {orderNotifications.length}
          </span>
        </button>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-8">
            <Star className="h-8 w-8 text-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-900">Recommended for You</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {recommendations.slice(0, 4).map(renderProductCard)}
          </div>
        </div>
      )}
            
      {/* Products Grid */}
      <div>
        <h2 className="text-3xl font-bold mb-8 text-gray-900">
          {searchTerm || selectedCategory || selectedLocation ? 'Search Results' : 'All Products'} 
          <span className="text-green-600">({filteredProducts.length})</span>
        </h2>
        
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(renderProductCard)}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md mx-auto">
              <Search className="h-20 w-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No products found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your search terms or filters to find what you're looking for</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedLocation('');
                  setSortBy('');
                }}
                className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors font-semibold"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed': return '📋';
      case 'processing': return '⚙️';
      case 'shipped': return '🚚';
      case 'delivered': return '✅';
      case 'cancelled': return '❌';
      default: return '📦';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'placed': return 'Order confirmed and received';
      case 'processing': return 'Farmer is preparing your order';
      case 'shipped': return 'Your order is on the way';
      case 'delivered': return 'Order successfully delivered';
      case 'cancelled': return 'Order has been cancelled';
      default: return 'Order status unknown';
    }
  };

  const renderOrderHistory = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Order History & Tracking</h2>
      {orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Order #{order.id.slice(-8)}</h3>
                  <p className="text-gray-600">{new Date(order.timestamp).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">₹{order.totalAmount?.toFixed(2)}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-2xl">{getStatusIcon(trackingStatuses[order.id] || order.status)}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trackingStatuses[order.id] || order.status)}`}>
                      {trackingStatuses[order.id] || order.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                    <img 
                      src={item.image} 
                      alt={item.cropName}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.cropName}</h4>
                      <p className="text-gray-600">{item.quantity} kg × ₹{item.pricePerKg}</p>
                      <p className="font-semibold text-green-600">₹{(item.quantity * item.pricePerKg).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-blue-800"><strong>📍 Delivery Address:</strong> {order.deliveryAddress}</p>
                    <p className="text-sm text-blue-800"><strong>🚚 Delivery Type:</strong> {order.deliveryType === 'self' ? 'Self Pickup' : 'Delivery Partner'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800"><strong>📞 Status:</strong> {getStatusDescription(trackingStatuses[order.id] || order.status)}</p>
                    <p className="text-sm text-blue-800"><strong>⏰ Last Updated:</strong> {new Date().toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm font-semibold text-blue-900 mb-3">📦 Order Tracking Progress</p>
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          (trackingStatuses[order.id] || order.status) === 'placed' ? 'bg-blue-500 w-1/4' :
                          (trackingStatuses[order.id] || order.status) === 'processing' ? 'bg-yellow-500 w-2/4' :
                          (trackingStatuses[order.id] || order.status) === 'shipped' ? 'bg-purple-500 w-3/4' :
                          (trackingStatuses[order.id] || order.status) === 'delivered' ? 'bg-green-600 w-full' :
                          'bg-gray-400 w-1/4'
                        }`}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-2">
                      <span className="flex items-center space-x-1">
                        <span>📋</span>
                        <span>Placed</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>⚙️</span>
                        <span>Processing</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>🚚</span>
                        <span>Shipped</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>✅</span>
                        <span>Delivered</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {(trackingStatuses[order.id] || order.status) === 'delivered' && (
                  <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">🎉 Your order has been delivered! Thank you for choosing Farm2Consumer.</p>
                  </div>
                )}
                
                {order.farmerOrders && order.farmerOrders.length > 1 && (
                  <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-800"><strong>💰 Payment Split:</strong> Distributed among {order.farmerOrders.length} farmers</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md mx-auto">
            <History className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No orders yet</h3>
            <p className="text-gray-600 mb-6">Start shopping to see your order history here</p>
            <button
              onClick={() => setActiveTab('products')}
              className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors font-semibold"
            >
              Start Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900">My Profile</h3>
        {!editingProfile ? (
          <button
            onClick={() => setEditingProfile(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleProfileUpdate}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
            <button
              onClick={() => {
                setEditingProfile(false);
                setProfileData(user);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">
              {((profileData.name || profileData.fullName) || 'C').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            {editingProfile ? (
              <input
                type="text"
                value={profileData.name || ''}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                className="font-bold text-2xl text-gray-900 border-b-2 border-gray-300 focus:border-blue-500 outline-none bg-transparent"
              />
            ) : (
              <h4 className="font-bold text-2xl text-gray-900">{profileData.name || profileData.fullName}</h4>
            )}
            <p className="text-blue-600 font-semibold">Verified Consumer</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="bg-blue-100 p-3 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Email Address</p>
              {editingProfile ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  className="font-semibold text-gray-900 border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent w-full"
                />
              ) : (
                <p className="font-semibold text-gray-900">{profileData.email}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="bg-green-100 p-3 rounded-lg">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Phone Number</p>
              {editingProfile ? (
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="font-semibold text-gray-900 border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent w-full"
                />
              ) : (
                <p className="font-semibold text-gray-900">{profileData.phone}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl md:col-span-2">
            <div className="bg-red-100 p-3 rounded-lg">
              <MapPin className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Address</p>
              {editingProfile ? (
                <textarea
                  value={profileData.address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  className="font-semibold text-gray-900 border border-gray-300 focus:border-blue-500 outline-none bg-transparent w-full rounded p-2"
                  rows={2}
                />
              ) : (
                <p className="font-semibold text-gray-900">{profileData.address}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-12 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back, <span className="text-green-600">{user.name || user.fullName}!</span>
            </h1>
            <p className="text-gray-600 text-lg">Discover fresh, organic produce from verified local farmers</p>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-2xl hover:from-green-700 hover:to-green-800 transition-all duration-300 flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105"
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="font-semibold text-lg">My Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-3 -right-3 bg-red-500 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center animate-pulse">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-white p-2 rounded-2xl shadow-lg mb-8">
          {[
            { id: 'products', label: 'Shop Products', icon: ShoppingCart },
            { id: 'orders', label: 'Order History', icon: History },
            { id: 'profile', label: 'My Profile', icon: User }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 font-semibold ${
                activeTab === tab.id
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'orders' && renderOrderHistory()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {showCart && (
        <Cart
          userId={user.id}
          onClose={() => setShowCart(false)}
          onCartUpdate={() => {
            const updatedCart = getCart(user.id);
            setCart(updatedCart);
          }}
        />
      )}
      
      {showChatbot && (
        <Chatbot
          userType="consumer"
          onClose={() => setShowChatbot(false)}
        />
      )}

      {/* Popup Notification */}
      {showPopup && (
        <div 
          className="fixed top-4 right-4 z-50 bg-white rounded-xl shadow-2xl border-l-4 border-green-500 p-4 max-w-sm animate-slide-in transform transition-all duration-300 hover:scale-105 cursor-pointer"
          onClick={() => {
            setShowPopup(false);
            setShowCart(true);
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{popupMessage}</p>
              <p className="text-xs text-gray-500 mt-1">Click to view cart</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPopup(false);
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Progress bar for auto-hide */}
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <div className="bg-green-500 h-1 rounded-full animate-progress-bar"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumerDashboard;