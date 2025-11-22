import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { loginUser, verifyPhone, applyNewPassword } from '../utils/database';
import notify from '../utils/notify';

interface LoginProps {
  onBack: () => void;
  onSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onBack, onSuccess }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    phone: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const user = await loginUser(credentials.email, credentials.password);
      if (user) {
        onSuccess(user);
      } else {
        setError('Invalid email or password');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (forgotPasswordStep === 1) {
      if (!forgotPasswordData.phone) {
        setError('Please enter your phone number');
        return;
      }
      
      const phoneExists = await verifyPhone(forgotPasswordData.phone);
      if (phoneExists) {
        setForgotPasswordStep(2);
        setError('');
      } else {
        setError('Phone number not found in our records');
      }
    } else {
      if (!forgotPasswordData.newPassword || !forgotPasswordData.confirmPassword) {
        setError('Please enter both password fields');
        return;
      }
      
      if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      const hasUpperCase = /[A-Z]/.test(forgotPasswordData.newPassword);
      const hasLowerCase = /[a-z]/.test(forgotPasswordData.newPassword);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(forgotPasswordData.newPassword);
      const hasMinLength = forgotPasswordData.newPassword.length >= 8;
      
      if (!hasUpperCase || !hasLowerCase || !hasSpecialChar || !hasMinLength) {
        setError('Password must be at least 8 characters with uppercase, lowercase, and special character');
        return;
      }
      
      const success = await applyNewPassword(forgotPasswordData.phone, forgotPasswordData.newPassword);
      if (!success) {
        setError('Failed to reset password. Please try again.');
        return;
      }
      setShowForgotPassword(false);
      setForgotPasswordStep(1);
      setForgotPasswordData({ phone: '', newPassword: '', confirmPassword: '' });
      setError('');
      notify('Password reset successfully! Please login with your new password.', { variant: 'success' });
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => {
              setShowForgotPassword(false);
              setForgotPasswordStep(1);
              setError('');
            }}
            className="flex items-center text-green-600 hover:text-green-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>
            
            {forgotPasswordStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={forgotPasswordData.phone}
                    onChange={(e) => setForgotPasswordData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your registered phone number"
                  />
                </div>
                
                <button
                  onClick={handleForgotPassword}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Verify Phone Number
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={forgotPasswordData.newPassword}
                    onChange={(e) => setForgotPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={forgotPasswordData.confirmPassword}
                    onChange={(e) => setForgotPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                </div>
                
                <button
                  onClick={handleForgotPassword}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            )}
            
            {error && (
              <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={onBack}
          className="flex items-center text-green-600 hover:text-green-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => {
                  setCredentials(prev => ({ ...prev, email: e.target.value }));
                  setError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => {
                    setCredentials(prev => ({ ...prev, password: e.target.value }));
                    setError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                  placeholder="Enter your password"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            
            <button
              onClick={() => setShowForgotPassword(true)}
              className="w-full text-green-600 hover:text-green-700 transition-colors text-sm"
            >
              Forgot Password?
            </button>
            
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;