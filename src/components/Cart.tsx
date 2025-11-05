import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, CreditCard, Smartphone, Building } from 'lucide-react';
import { getCart, updateCartItem, removeFromCart, placeOrder, getProducts } from '../utils/database';
import notify from '../utils/notify';

interface CartProps {
  userId: string;
  onClose: () => void;
  onCartUpdate: () => void;
}

const Cart: React.FC<CartProps> = ({ userId, onClose, onCartUpdate }) => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    bankName: ''
  });

  useEffect(() => {
    const loadCart = async () => {
      try {
        const items = await getCart(userId);
        setCartItems(items);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    };
    
    loadCart();
  }, [userId]);

  const updateQuantity = async (productId: string, newQuantity: number) => {
    try {
      // Check stock availability
      const products = await getProducts();
      const product = products.find(p => p.id === productId);
      
      if (product && newQuantity > product.availableQuantity) {
        notify(`Selected quantity is beyond the stock. Available: ${product.availableQuantity} kg`, { variant: 'warning' });
        return;
      }
      
      if (newQuantity === 0) {
        await removeFromCart(userId, productId);
      } else {
        await updateCartItem(userId, productId, newQuantity);
      }
      const updatedItems = await getCart(userId);
      setCartItems(updatedItems);
      onCartUpdate();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + (item.pricePerKg * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      notify('Please select a payment method', { variant: 'warning' });
      return;
    }
    
    try {
      // Group items by farmer for split payment
      const products = await getProducts();
      const farmerOrders = cartItems.reduce((orders, item) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const farmerKey = product.farmerId;
          if (!orders[farmerKey]) {
            orders[farmerKey] = {
              farmerId: product.farmerId,
              farmerName: product.farmerName,
              farmerPhone: product.farmerPhone,
              farmerWhatsapp: product.farmerWhatsapp,
              items: [],
              totalAmount: 0
            };
          }
          orders[farmerKey].items.push(item);
          orders[farmerKey].totalAmount += item.pricePerKg * item.quantity;
        }
        return orders;
      }, {});
      
      const orderData = {
        userId,
        items: cartItems,
        totalAmount: getTotalAmount(),
        farmerOrders: Object.values(farmerOrders),
        deliveryAddress,
        deliveryType,
        paymentMethod,
        timestamp: new Date().toISOString()
      };
      
      const order = await placeOrder(userId, cartItems, deliveryAddress, deliveryType);
      if (order) {
        setOrderPlaced(true);
        onCartUpdate();
      }
    } catch (error) {
      console.error('Error placing order:', error);
      
      // Check if this is a review blocking error
      if (error.message && error.message.includes('consecutive large purchases')) {
        notify(error.message, { variant: 'error' });
        // Close cart and redirect to login page
        onClose();
        // Trigger page reload to redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        notify('Failed to place order. Please try again.', { variant: 'error' });
      }
    }
  };

  const renderCart = () => (
    <div>
      <h3 className="text-xl font-semibold mb-4">Shopping Cart</h3>
      {cartItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Your cart is empty</p>
          <button
            onClick={onClose}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div>
          <div className="space-y-4 mb-6">
            {cartItems.map((item, index) => (
              <div key={`cart-item-${item.productId}-${index}`} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <img 
                  src={item.image} 
                  alt={item.cropName}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-semibold">{item.cropName}</h4>
                  <p className="text-gray-600">₹{item.pricePerKg}/kg</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{(item.pricePerKg * item.quantity).toFixed(2)}</p>
                  <button
                    onClick={async () => {
                      try {
                        await removeFromCart(userId, item.productId);
                        const updatedItems = await getCart(userId);
                        setCartItems(updatedItems);
                        onCartUpdate();
                      } catch (error) {
                        console.error('Error removing item:', error);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-xs mt-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold mb-4">
              <span>Total: ₹{getTotalAmount().toFixed(2)}</span>
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold shadow-lg"
            >
              Proceed to Delivery
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderDelivery = () => (
    <div>
      <h3 className="text-xl font-semibold mb-4">Delivery Details</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Address
          </label>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter your delivery address"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="self"
                checked={deliveryType === 'self'}
                onChange={(e) => setDeliveryType(e.target.value)}
                className="mr-2"
              />
              Self Pickup
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="partner"
                checked={deliveryType === 'partner'}
                onChange={(e) => setDeliveryType(e.target.value)}
                className="mr-2"
              />
              Delivery Partner
            </label>
          </div>
        </div>
        
        {deliveryType === 'partner' && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 mb-2">You will be redirected to our logistics partner</p>
            <button
              onClick={() => window.open('https://example-logistics.com', '_blank')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Open Logistics App
            </button>
          </div>
        )}
        
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentStep(1)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
          >
            Back to Cart
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            disabled={!deliveryAddress || !deliveryType}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div>
      <h3 className="text-2xl font-bold mb-6">Choose Payment Method</h3>
      
      {/* Payment Methods */}
      <div className="space-y-4 mb-6">
        <div 
          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'upi-app' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
          }`}
          onClick={() => setPaymentMethod('upi-app')}
        >
          <div className="flex items-center space-x-3">
            <Smartphone className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-semibold">Pay by UPI App</h4>
              <p className="text-sm text-gray-600">PhonePe, Google Pay, Paytm, etc.</p>
            </div>
          </div>
        </div>
        
        <div 
          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'upi-id' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
          }`}
          onClick={() => setPaymentMethod('upi-id')}
        >
          <div className="flex items-center space-x-3">
            <Smartphone className="h-6 w-6 text-green-600" />
            <div>
              <h4 className="font-semibold">Pay by UPI ID</h4>
              <p className="text-sm text-gray-600">Enter your UPI ID</p>
            </div>
          </div>
        </div>
        
        <div 
          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'card' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
          }`}
          onClick={() => setPaymentMethod('card')}
        >
          <div className="flex items-center space-x-3">
            <CreditCard className="h-6 w-6 text-purple-600" />
            <div>
              <h4 className="font-semibold">Credit/Debit Card</h4>
              <p className="text-sm text-gray-600">Visa, Mastercard, RuPay</p>
            </div>
          </div>
        </div>
        
        <div 
          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'netbanking' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
          }`}
          onClick={() => setPaymentMethod('netbanking')}
        >
          <div className="flex items-center space-x-3">
            <Building className="h-6 w-6 text-orange-600" />
            <div>
              <h4 className="font-semibold">Net Banking</h4>
              <p className="text-sm text-gray-600">All major banks supported</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Details Form */}
      {paymentMethod === 'upi-id' && (
        <div className="bg-gray-50 p-4 rounded-xl mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            UPI ID
          </label>
          <input
            type="text"
            placeholder="yourname@paytm"
            value={paymentDetails.upiId}
            onChange={(e) => setPaymentDetails(prev => ({ ...prev, upiId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      )}
      
      {paymentMethod === 'card' && (
        <div className="bg-gray-50 p-4 rounded-xl mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              placeholder="Name on card"
              value={paymentDetails.cardholderName}
              onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardholderName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Number
            </label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={paymentDetails.cardNumber}
              onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                value={paymentDetails.expiryDate}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CVV
              </label>
              <input
                type="text"
                placeholder="123"
                value={paymentDetails.cvv}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, cvv: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
      
      {paymentMethod === 'netbanking' && (
        <div className="bg-gray-50 p-4 rounded-xl mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Bank
          </label>
          <select
            value={paymentDetails.bankName}
            onChange={(e) => setPaymentDetails(prev => ({ ...prev, bankName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Choose your bank</option>
            <option value="sbi">State Bank of India</option>
            <option value="hdfc">HDFC Bank</option>
            <option value="icici">ICICI Bank</option>
            <option value="axis">Axis Bank</option>
            <option value="pnb">Punjab National Bank</option>
            <option value="bob">Bank of Baroda</option>
          </select>
        </div>
      )}
      
      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded-xl mb-6">
        <h4 className="font-semibold mb-2">Order Summary</h4>
        {/* Group items by farmer */}
        {cartItems.length > 0 && (() => {
          // This will be populated when products are loaded
          const farmerGroups = cartItems.reduce((groups, item) => {
            // Use the product data from the cart item if available
            const farmerKey = item.farmerId || 'unknown';
            if (!groups[farmerKey]) {
              groups[farmerKey] = {
                farmerName: item.farmerName || 'Unknown Farmer',
                items: [],
                total: 0
              };
            }
            groups[farmerKey].items.push(item);
            groups[farmerKey].total += item.pricePerKg * item.quantity;
            return groups;
          }, {});
          
          return Object.entries(farmerGroups).map(([farmerId, group]) => (
            <div key={farmerId} className="mb-4 p-3 bg-white rounded-lg border">
              <h5 className="font-semibold text-green-700 mb-2">From {group.farmerName}</h5>
              {group.items.map((item, itemIndex) => (
                <div key={`farmer-item-${farmerId}-${item.productId}-${itemIndex}`} className="flex justify-between text-sm mb-1">
                  <span>{item.cropName} x {item.quantity}</span>
                  <span>₹{(item.pricePerKg * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-1 mt-1 text-sm font-semibold text-green-600">
                <div className="flex justify-between">
                  <span>Farmer Total:</span>
                  <span>₹{group.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ));
        })()}
        
        <div className="border-t-2 mt-2 pt-2 font-bold text-lg">
          <div className="flex justify-between text-green-700">
            <span>Grand Total:</span>
            <span>₹{getTotalAmount().toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800">Secure Payment</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            🔒 Your payment will be automatically split between farmers. All transactions are encrypted and secure with 256-bit SSL.
          </p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setCurrentStep(2)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
          >
            Back
          </button>
          <button
            onClick={handlePlaceOrder}
            disabled={!paymentMethod}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg"
          >
            Complete Payment
          </button>
        </div>
      </div>
    </div>
  );

  const renderOrderConfirmation = () => (
    <div className="text-center py-8">
      <div className="text-green-600 mb-6">
        <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-3xl font-bold mb-4 text-gray-900">Order Placed Successfully! 🎉</h3>
      <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
        Your order has been confirmed and payments have been split between farmers. You will receive updates via phone and WhatsApp.
      </p>
      <div className="bg-green-50 p-6 rounded-2xl mb-8 max-w-md mx-auto">
        <h4 className="font-semibold text-green-800 mb-2">What's Next?</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✓ All farmers will be notified</li>
          <li>✓ Payments split automatically</li>
          <li>✓ Order will be prepared</li>
          <li>✓ Delivery will be arranged</li>
          <li>✓ You'll receive tracking updates</li>
        </ul>
      </div>
      <button
        onClick={onClose}
        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold shadow-lg"
      >
        Continue Shopping
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Secure Checkout</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {!orderPlaced && (
            <div className="flex items-center space-x-4 mb-8">
              {[
                { num: 1, label: 'Cart' },
                { num: 2, label: 'Delivery' },
                { num: 3, label: 'Payment' }
              ].map(step => (
                <div key={step.num} className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep >= step.num ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.num}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep >= step.num ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  {step.num < 3 && <div className={`w-16 h-1 mx-4 rounded ${currentStep > step.num ? 'bg-green-600' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          )}
          
          {orderPlaced ? renderOrderConfirmation() :
           currentStep === 1 ? renderCart() :
           currentStep === 2 ? renderDelivery() :
           renderPayment()}
        </div>
      </div>
    </div>
  );
};

export default Cart;