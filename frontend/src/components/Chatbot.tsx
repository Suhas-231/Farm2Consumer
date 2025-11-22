import React, { useState } from 'react';
import { X, Send, User, Bot, Minimize2, Maximize2 } from 'lucide-react';

interface ChatbotProps {
  userType: 'farmer' | 'consumer';
  onClose: () => void;
}

const commonResponses = {
  farmer: {
    'add product': '🌾 To add a new product:\n1. Go to "My Products" tab\n2. Click "Add Product" button\n3. Fill in crop category, name, price, quantity\n4. Upload a clear image of your produce\n5. Click "Add Product" to list it\n\nTip: Use high-quality images to attract more customers! 📸',
    'adding and managing products': '🧑‍🌾 Adding & Managing Products (Step-by-step):\n\nAdd a product:\n1) Open the "My Products" tab\n2) Click "Add Product"\n3) Enter crop category, name, price/kg, and available quantity\n4) Upload a clear, geotagged image (required)\n5) Save by clicking "Add Product"\n\nManage products:\n1) In "My Products", find your product card\n2) Update price or available quantity as needed\n3) Replace the image if quality is low\n4) Remove listings that are out of stock\n\nPro tip: Keep details accurate to improve buyer trust and sales. ✅',
    'manage products': '🧑‍🌾 Managing Products:\n1) Go to "My Products"\n2) Edit price, quantity, or image on the product card\n3) Remove items that are out of season or unavailable\n4) Keep information updated for better buyer trust ✅',
    'adding products': '🌾 To add a new product:\n1. Go to "My Products" tab\n2. Click "Add Product"\n3. Fill details and upload image (required)\n4. Click "Add Product" to publish ✅',
    'delete product': '🗑 To delete a product:\n\nSingle Product:\n1) Go to "My Products" tab\n2) Find the product you want to remove\n3) Click the trash icon (🗑) on the product card\n4) Confirm deletion in the popup\n\nMultiple Products:\n1) Go to "My Products" tab\n2) Click "Edit Mode" button\n3) Select products you want to delete\n4) Click "Delete Selected" button\n5) Confirm deletion\n\n⚠ Warning: Deleted products cannot be recovered! Make sure you want to remove them permanently.',
    'remove product': '🗑 To remove a product:\n\nSingle Product:\n1) Go to "My Products" tab\n2) Find the product you want to remove\n3) Click the trash icon (🗑) on the product card\n4) Confirm deletion in the popup\n\nMultiple Products:\n1) Go to "My Products" tab\n2) Click "Edit Mode" button\n3) Select products you want to delete\n4) Click "Delete Selected" button\n5) Confirm deletion\n\n⚠ Warning: Deleted products cannot be recovered! Make sure you want to remove them permanently.',
    'product deletion': '🗑 Product Deletion Guide:\n\nWhy delete products?\n• Out of season crops\n• Poor quality produce\n• No longer available\n• Price changes\n\nHow to delete:\n1) My Products → Find product\n2) Click trash icon → Confirm\n3) Or use Edit Mode for bulk deletion\n\n💡 Tip: Consider updating quantity to 0 instead of deleting if you might restock soon!',
    'delete': '🗑 Product Deletion Options:\n\nQuick Delete (Single Product):\n• Go to "My Products" tab\n• Find your product card\n• Click the red trash icon (🗑)\n• Confirm in the popup dialog\n\nBulk Delete (Multiple Products):\n• Go to "My Products" tab\n• Click "Edit Mode" button\n• Select products with checkboxes\n• Click "Delete Selected" button\n• Confirm bulk deletion\n\n⚠ Important Notes:\n• Deleted products are permanently removed\n• All order history is preserved\n• Consider setting quantity to 0 instead\n• Contact support if you need help',
    'remove': '🗑 Removing Products:\n\nWhen to Remove:\n• Out of season\n• Poor quality\n• No longer growing\n• Price changes needed\n\nHow to Remove:\n1) My Products → Select product\n2) Click trash icon → Confirm\n3) Or use Edit Mode for multiple\n\n💡 Pro Tips:\n• Set quantity to 0 instead of deleting\n• Keep for next season\n• Update prices instead of removing\n• Contact support for help',
    'orders': '📦 You can view your orders in the Dashboard tab under "Recent Orders". You\'ll receive notifications when customers purchase your products. Each order shows customer details and delivery preferences.',
    'pricing': '💰 Pricing tips:\n• Research market rates in your area\n• Consider production costs + 20-30% profit\n• Factor in seasonal demand\n• Check competitor prices\n• Remember: Platform adds 2% commission for consumers',
    'quality': '⭐ Quality tips:\n• Harvest at optimal ripeness\n• Store in proper conditions\n• Handle with care during packaging\n• Take clear, attractive photos\n• Maintain consistent quality standards',
    'profile': '👤 To edit your profile:\n1. Go to "Profile" tab\n2. Click "Edit Profile"\n3. Update your information\n4. Click "Save"\n\nKeep your contact details updated for better customer communication!',
    'payment': '💳 Payments are disbursed by admin directly to you. You\'ll be notified once your payout is processed.',
    'default': '🤖 I can help you with:\n• Adding and managing products\n• Understanding orders and notifications\n• Pricing strategies\n• Quality maintenance tips\n• Profile management\n• Payment information\n\nWhat would you like to know more about?'
  },
  consumer: {
    'search': '🔍 Finding Products Made Easy:\n\n🔎 Search Options:\n• Type crop name in search bar\n• Use filters: vegetables, fruits, grains, pulses\n• Sort by location (find nearby farmers)\n• Sort by price (low to high or high to low)\n• Check personalized recommendations',
    'order': '🛒 Complete Ordering Guide:\n\n📝 Step-by-Step Process:\n1) Browse products and add to cart\n2) Check stock availability and limits\n3) Click "My Cart" to review items\n4) Enter accurate delivery address\n5) Choose delivery method (pickup/delivery)\n6) Select secure payment option\n7) Complete payment and confirm\n\n✅ After Ordering:\n• Get instant order confirmation\n• Receive tracking updates\n• Contact farmer for delivery details\n• Track order status in real-time\n\n💡 Order Tips:\n• Check minimum order quantities\n• Verify delivery address\n• Keep payment receipt\n• Contact farmer for any changes',
    'quality': '✅ Quality Guarantee System:\n\n🌱 Freshness Assurance:\n• Direct from verified farmers\n• Harvest-to-delivery tracking\n• Quality checks at every step\n• Fresh produce guarantee\n\n👨‍🌾 Farmer Verification:\n• Quality ratings and reviews\n• Direct WhatsApp communication\n• Farm visit verification\n\n📞 Quality Issues?\n• Contact farmer immediately\n• Report to customer support\n• Get refund or replacement\n• Rate your experience\n\n💡 Quality Tips:\n• Check farmer ratings before ordering\n• Ask about harvest date\n• Inspect produce on delivery\n• Store properly after receiving',
    'delivery': '🚚 Delivery Options Explained:\n\n🏠 Self Pickup:\n• Collect directly from farmer\n• Arrange timing with farmer\n• No delivery charges\n• Freshest produce guarantee\n\n🚛 Delivery Partner:\n• We arrange delivery for you\n• 1-3 business days delivery\n• Delivery charges may apply\n• Track delivery in real-time\n\n📍 Location Services:\n• Find nearby farmers\n• Check delivery coverage\n• Estimate delivery time\n• Track delivery status\n\n💡 Delivery Tips:\n• Provide accurate address\n• Be available for delivery\n• Check delivery timing\n• Contact farmer for updates',
    'payment': '💳 Secure Payment Options:\n\n📱 UPI Payments:\n• PhonePe, Google Pay, Paytm\n• UPI ID transfers\n• Instant payment confirmation\n• Secure and fast\n\n💳 Card Payments:\n• Credit/Debit cards accepted\n• Secure SSL encryption\n• PCI DSS compliant\n• Fraud protection\n\n🏦 Net Banking:\n• All major banks supported\n• Secure gateway\n• Instant confirmation\n• Easy refunds\n\n🔒 Security Features:\n• Bank-level encryption\n• Secure payment gateway\n• No card details stored\n• Fraud monitoring\n\n💡 Payment Tips:\n• Keep payment receipts\n• Use UPI for faster processing\n• Check payment confirmation\n• Contact support for issues',
    'profile': '👤 Profile Management:\n\n✏ Update Information:\n1) Go to "My Profile" tab\n2) Click "Edit Profile" button\n3) Update your details\n4) Save changes\n\n📍 Important Details:\n• Keep address updated for delivery\n• Verify phone number for contact\n• Add WhatsApp for farmer communication\n• Update email for notifications\n\n🔔 Notification Settings:\n• Order status updates\n• Price alerts\n• New product notifications\n• Farmer messages\n\n💡 Profile Tips:\n• Use clear, accurate information\n• Keep contact details current\n• Enable notifications\n• Add delivery preferences',
    'farmer contact details': '👨‍🌾 Farmer Contact Details:\n\n• Click on any product to view the farmer\'s name, phone number, and WhatsApp contact.\n• You can chat directly with farmers for queries, bulk orders, or delivery arrangements.\n• Verified farmers have ratings and reviews for trust and transparency.\n• Use the "Contact Farmer" button in your order history for quick access.',
    'order history': '📋 Order History & Status:\n\n• Access your complete order history in the "Order History" tab.\n• View order numbers, dates, payment methods, and delivery addresses.\n• Track status: Placed, Processing, Shipped, Delivered, or Cancelled.\n• Click any order to see product details, farmer info, and delivery updates.\n• Use filters to search by date or status.',
    'order status': '📊 Order Status Tracking:\n\n• Each order shows its current status: Placed, Processing, Shipped, Delivered, or Cancelled.\n• Real-time updates are available in the "Order History" tab.\n• You\'ll receive notifications for status changes and delivery progress.\n• Contact the farmer for delivery details or issues.',
    'reordering favorite items': '🔄 Reordering Favorites:\n\n• Save favorite products and farmers for quick access.\n• Use the "Reorder" button in your order history to repeat previous purchases.\n• Modify quantities and delivery preferences before checkout.\n• Compare prices and availability before reordering.',
    'bulk ordering and discounts': '📦 Bulk Ordering & Discounts:\n\n• Contact farmers directly for bulk orders using WhatsApp or phone.\n• Discuss quantity requirements and negotiate bulk prices.\n• Bulk orders may qualify for special discounts and custom delivery schedules.\n• Use the "Bulk Order" option on product pages for large purchases.',
    'seasonal produce information': '🌱 Seasonal Produce Info:\n\n• Check the "Seasonal" tab for current and upcoming produce.\n• Farmers list seasonal crops with availability and pricing.\n• Get notifications for new seasonal arrivals and best deals.\n• Ask farmers about harvest dates and freshness.',
    'refunds and returns': '💰 Refunds & Returns:\n\n• If you receive poor quality or wrong items, contact the farmer immediately.\n• Use the "Report Issue" button in your order history for support.\n• Refunds are processed via your original payment method.\n• Returns and replacements are handled directly with the farmer or support team.\n• Keep order receipts and take photos for faster resolution.',
    'shopping cart management': '🛒 Shopping Cart Management:\n\n• Add products to your cart from any product page.\n• Review and update quantities, remove items, or clear the cart before checkout.\n• Cart shows total price, delivery options, and farmer details.\n• Save items for later or proceed to checkout when ready.',
    'checkout process': '💳 Checkout Process:\n\n• Review cart items and quantities before checkout.\n• Enter or confirm your delivery address and contact details.\n• Choose delivery method (pickup or delivery partner) and payment option (UPI, card, net banking).\n• Complete payment securely and receive instant confirmation.\n• Track your order status and delivery updates in real time.',
    'help and support': '🆘 Help & Support:\n\n• Use the chatbot for instant answers to common questions.\n• Access the "Help & Support" tab for FAQs and troubleshooting.\n• Contact customer support via WhatsApp, email, or phone for unresolved issues.\n• Farmers and support team are available for order, payment, and delivery queries.\n• Report issues directly from your order history for quick resolution.',
    'default': '🤖 I can help you with:\n• Searching and filtering products\n• Placing orders and payments\n• Quality assurance information\n• Delivery options and tracking\n• Profile management\n• Order history and status\n• Farmer contact details\n• Reordering favorite items\n• Bulk ordering and discounts\n• Seasonal produce information\n• Refunds and returns\n• Shopping cart management\n• Checkout process\n• Help and support\n\nWhat would you like to know more about?'
  }
};

const Chatbot: React.FC<ChatbotProps> = ({ userType, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `Hello! 👋 I'm your Farm2Consumer AI assistant. I'm here to help you with any questions about ${userType === 'farmer' ? 'selling your crops and managing your farm business' : 'finding fresh produce and placing orders'}. How can I assist you today?`,
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const getBotResponse = (input: string) => {
    const lowerInput = input.toLowerCase().trim();
    const responses = commonResponses[userType];
    for (const [key, response] of Object.entries(responses)) {
      if (key !== 'default' && lowerInput.includes(key)) {
        return response;
      }
    }
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
      return `Hello there! 😊 Great to see you on Farm2Consumer! I'm your AI assistant here to help you ${userType === 'farmer' ? 'grow your farming business and connect with customers' : 'find the freshest produce and support local farmers'}. What can I assist you with today? 🌱`;
    }
    if (lowerInput.includes('thank') || lowerInput.includes('thanks')) {
      return `You're very welcome! 😊 I'm always here to help. Feel free to ask me anything about Farm2Consumer - whether it's about ${userType === 'farmer' ? 'managing your products, orders, or growing your business' : 'finding products, placing orders, or tracking deliveries'}. Have a great day! 🌱`;
    }
    return responses.default;
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: getBotResponse(inputText),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 800);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border-2 border-green-200 z-50 transition-all duration-500 ease-in-out transform ${
      isMinimized ? 'w-80 h-16 hover:scale-105' : 'w-96 h-[500px] hover:shadow-3xl'
    } animate-slideInUp`}>
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-2xl">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center animate-pulse">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg">Farm2Consumer AI</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-100">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-300 hover:scale-110"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-300 hover:scale-110 hover:rotate-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!isMinimized && (
        <div className="flex flex-col h-[436px] animate-fadeIn">
          <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
            <div className="space-y-3">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slideInMessage`}
                >
                  <div
                    className={`max-w-sm p-4 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {message.sender === 'bot' && (
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-3 w-3 text-green-600" />
                        </div>
                      )}
                      {message.sender === 'user' && (
                        <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                        <p className={`text-xs mt-2 ${
                          message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t bg-gray-50">
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about Farm2Consumer..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all duration-300 focus:scale-105"
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="p-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
