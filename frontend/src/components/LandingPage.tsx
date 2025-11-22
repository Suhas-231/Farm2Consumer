import React from 'react';
import logo from './logo.png';
import { Sprout, ShoppingCart, Truck, ArrowRight, Heart, Shield, Award, Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

interface LandingPageProps {
  onSelectFarmer: () => void;
  onSelectConsumer: () => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectFarmer, onSelectConsumer, onLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-white opacity-5 rounded-full"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-white bg-opacity-20 p-4 rounded-full mr-4 backdrop-blur-sm flex items-center justify-center">
                <img
                  src={logo}
                  alt="Farm2Consumer logo"
                  className="h-24 w-24 rounded-full object-cover"
                />
              </div>

              <h1 className="text-6xl font-bold bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">
                Farm2Consumer
              </h1>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-2 inline-block mb-6">
              <p className="text-green-100 font-semibold text-lg px-4">🌾 Connecting Farms to Your Table 🌾</p>
            </div>
            <p className="text-xl mb-8 max-w-4xl mx-auto leading-relaxed text-green-50">
              🌱 Bridging the gap between farmers and consumers for fresh, organic produce. 
              Experience farm-to-table freshness while supporting local agriculture and sustainable farming practices.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <button
                onClick={onSelectFarmer}
                className="group bg-white text-green-600 px-12 py-5 rounded-2xl font-bold hover:bg-green-50 transition-all duration-300 flex items-center space-x-3 shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 border-2 border-transparent hover:border-green-200"
              >
                <Sprout className="h-6 w-6 group-hover:scale-110 transition-transform" />
                <span className="text-xl">Join as Farmer</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onSelectConsumer}
                className="group bg-green-700 text-white px-12 py-5 rounded-2xl font-bold hover:bg-green-800 transition-all duration-300 flex items-center space-x-3 shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 border-2 border-green-600 hover:border-green-500"
              >
                <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform" />
                <span className="text-xl">Shop Fresh Produce</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <button
              onClick={onLogin}
              className="text-green-100 underline hover:text-white transition-colors text-lg font-medium"
            >
              Already have an account? Sign in here →
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Farm2Consumer?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of agriculture with our innovative platform that connects you directly to fresh, quality produce
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 border border-green-100 hover:border-green-200">
              <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Sprout className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Farm Fresh Direct</h3>
              <p className="text-gray-600 leading-relaxed">Get the freshest produce directly from verified local farmers, ensuring quality and authenticity</p>
            </div>
            
            <div className="group text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl shadow-xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 border border-blue-100 hover:border-blue-200">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Fair Trade Pricing</h3>
              <p className="text-gray-600 leading-relaxed">Transparent pricing that benefits both farmers and consumers, eliminating middleman markups</p>
            </div>
            
            <div className="group text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl shadow-xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 border border-purple-100 hover:border-purple-200">
              <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Swift Delivery</h3>
              <p className="text-gray-600 leading-relaxed">Fast and reliable delivery network ensuring your produce reaches you fresh and on time</p>
            </div>
            
            <div className="group text-center p-8 bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl shadow-xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 border border-orange-100 hover:border-orange-200">
              <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Quality Guaranteed</h3>
              <p className="text-gray-600 leading-relaxed">Rigorous quality checks and verified farmer network ensure premium produce every time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Growing Community</h2>
            <p className="text-green-100 text-lg">Join thousands of farmers and consumers in our sustainable agriculture ecosystem</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="bg-white bg-opacity-20 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-5xl font-bold mb-2">500+</h3>
                <p className="text-green-100 font-medium">Verified Farmers</p>
              </div>
            </div>
            <div>
              <div className="bg-white bg-opacity-20 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-5xl font-bold mb-2">10,000+</h3>
                <p className="text-green-100 font-medium">Happy Consumers</p>
              </div>
            </div>
            <div>
              <div className="bg-white bg-opacity-20 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-5xl font-bold mb-2">50,000+</h3>
                <p className="text-green-100 font-medium">Orders Delivered</p>
              </div>
            </div>
            <div>
              <div className="bg-white bg-opacity-20 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-5xl font-bold mb-2">98%</h3>
                <p className="text-green-100 font-medium">Satisfaction Rate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Trusted by Farmers & Consumers</h2>
            <p className="text-xl text-gray-600">Building sustainable relationships in agriculture</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-4">
                <Award className="h-8 w-8 text-yellow-500 mr-3" />
                <h3 className="text-xl font-bold">Certified Quality</h3>
              </div>
              <p className="text-gray-600">All our farmers are verified through Kisan ID and follow organic farming practices</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-4">
                <Shield className="h-8 w-8 text-blue-500 mr-3" />
                <h3 className="text-xl font-bold">Secure Transactions</h3>
              </div>
              <p className="text-gray-600">Your payments and personal information are protected with bank-level security</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-4">
                <Heart className="h-8 w-8 text-red-500 mr-3" />
                <h3 className="text-xl font-bold">Community Support</h3>
              </div>
              <p className="text-gray-600">24/7 customer support and AI chatbot assistance for all your queries</p>
            </div>
          </div>
        </div>
      </section>

      {/* 🌿 Footer Section */}
      <footer className="bg-gradient-to-r from-green-700 to-emerald-700 text-white py-12 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-4">
              <img src={logo} alt="Farm2Consumer logo" className="h-12 w-12 rounded-full mr-3" />
              <h3 className="text-2xl font-bold">Farm2Consumer</h3>
            </div>
            <p className="text-green-100">
              Empowering farmers and consumers through technology. Fresh, sustainable, and direct from farm to your doorstep.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-green-100">
              <li className="hover:text-white cursor-pointer">About Us</li>
              <li className="hover:text-white cursor-pointer">Our Farmers</li>
              <li className="hover:text-white cursor-pointer">Shop</li>
              <li className="hover:text-white cursor-pointer">Contact</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-xl font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-green-100">
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                <a href="mailto:support@farm2consumer.in" className="hover:underline focus:outline-none focus:ring-2 focus:ring-green-400">support@farm2consumer.in</a>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                <a href="tel:+919876543210" className="hover:underline focus:outline-none focus:ring-2 focus:ring-green-400">+91 98765 43210</a>
              </li>
              <li className="flex items-center"><MapPin className="h-5 w-5 mr-2" /> Bengaluru, India</li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-xl font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="#" className="bg-white bg-opacity-20 p-3 rounded-full hover:bg-opacity-40 transition">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="bg-white bg-opacity-20 p-3 rounded-full hover:bg-opacity-40 transition">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="bg-white bg-opacity-20 p-3 rounded-full hover:bg-opacity-40 transition">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-green-600 mt-10 pt-6 text-center text-green-100 text-sm">
          © {new Date().getFullYear()} Farm2Consumer. All rights reserved. | Designed with ❤️ for Farmers & Consumers.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
