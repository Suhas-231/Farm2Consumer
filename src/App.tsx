import { useState, useEffect } from 'react';
import { LogOut, MessageCircle } from 'lucide-react';
import LandingPage from './components/LandingPage';
import Registration from './components/Registration';
import Login from './components/Login';
import FarmerDashboard from './components/FarmerDashboard';
import ConsumerDashboard from './components/ConsumerDashboard';
import AdminConsole from './components/AdminConsole';
import Chatbot from './components/Chatbot';
import OtpVerification from './components/OtpVerification';
import { getCurrentUser, logout, isAuthenticated } from './utils/database';

type CurrentView = 
  | 'landing' 
  | 'register-farmer' 
  | 'register-consumer' 
  | 'login' 
  | 'otp-verification' 
  | 'farmer-dashboard' 
  | 'consumer-dashboard' 
  | 'admin-console';

function App() {
  const [currentView, setCurrentView] = useState<CurrentView>('landing');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [loading, setLoading] = useState(true);

  // Store data needed for OTP verification (e.g., phone or email)
  const [otpVerificationData, setOtpVerificationData] = useState<{ phone?: string, email?: string } | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    if (isAuthenticated()) {
      const user = getCurrentUser();
      if (user) {
        setCurrentUser(user);
        if (user.role === 'farmer') {
          setCurrentView('farmer-dashboard');
        } else if (user.role === 'consumer') {
          setCurrentView('consumer-dashboard');
        } else if (user.role === 'admin') {
          setCurrentView('admin-console');
        }
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setCurrentView('landing');
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    if (user.role === 'farmer') {
      setCurrentView('farmer-dashboard');
    } else if (user.role === 'consumer') {
      setCurrentView('consumer-dashboard');
    } else if (user.role === 'admin') {
      setCurrentView('admin-console');
    }
  };

  // Handler when registration completes: show OTP verification page with relevant data
  const handleRegistrationSuccess = (userData: any) => {
    console.log('Registration successful, user data:', userData);
    // Pass phone/email to OTP verification for display or verification
    setOtpVerificationData({ 
      phone: userData.phone, 
      email: userData.email 
    });
    setCurrentView('otp-verification');
  };

  // Handler when OTP verification succeeds: redirect to login page
  const handleOtpVerified = () => {
    setOtpVerificationData(null);
    setCurrentView('login');
  };

  const renderHeader = () => {
    if (currentView === 'landing') return null;

    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-green-600">Farm2Consumer</h1>
            </div>

            {currentUser && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, {currentUser.name || currentUser.fullName}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowChatbot(!showChatbot)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Chat Support"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'landing':
        return (
          <LandingPage
            onSelectFarmer={() => setCurrentView('register-farmer')}
            onSelectConsumer={() => setCurrentView('register-consumer')}
            onLogin={() => setCurrentView('login')}
          />
        );

      case 'register-farmer':
        return (
          <Registration
            userType="farmer"
            onBack={() => setCurrentView('landing')}
            onSuccess={handleRegistrationSuccess}
          />
        );

      case 'register-consumer':
        return (
          <Registration
            userType="consumer"
            onBack={() => setCurrentView('landing')}
            onSuccess={handleRegistrationSuccess}
          />
        );

      case 'login':
        return (
          <Login
            onBack={() => setCurrentView('landing')}
            onSuccess={handleLoginSuccess}
          />
        );

      case 'otp-verification':
        return (
          <OtpVerification
            phone={otpVerificationData?.phone}
            email={otpVerificationData?.email}
            onVerified={handleOtpVerified}
          />
        );

      case 'farmer-dashboard':
        return currentUser ? (
          <FarmerDashboard user={currentUser} />
        ) : (
          <div>Loading...</div>
        );

      case 'consumer-dashboard':
        return currentUser ? (
          <ConsumerDashboard user={currentUser} />
        ) : (
          <div>Loading...</div>
        );

      case 'admin-console':
        return currentUser ? (
          <AdminConsole />
        ) : (
          <div>Loading...</div>
        );

      default:
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Page Not Found</h1>
              <button
                onClick={() => setCurrentView('landing')}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderHeader()}
      <main>{renderContent()}</main>
      
      {showChatbot && (
        <Chatbot userType={(currentUser && currentUser.role === 'farmer') ? 'farmer' : 'consumer'} onClose={() => setShowChatbot(false)} />
      )}
    </div>
  );
}

export default App;