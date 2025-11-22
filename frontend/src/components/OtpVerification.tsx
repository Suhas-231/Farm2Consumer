import React, { useState, useEffect, useRef } from 'react';
import emailjs from '@emailjs/browser';

interface OtpVerificationProps {
  phone?: string;
  email?: string;
  onVerified: () => void;
}

const EMAILJS_SERVICE_ID = 'service_hz2byds';       // Your EmailJS service ID
const EMAILJS_TEMPLATE_ID = 'template_v34kmyj';     // Your EmailJS template ID
const EMAILJS_PUBLIC_KEY = 'CHTzsJ4ncgvmkGyV6';     // Your EmailJS public key

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const OtpVerification: React.FC<OtpVerificationProps> = ({ phone, email, onVerified }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [verifiedMessage, setVerifiedMessage] = useState('');
  const [resendClicked, setResendClicked] = useState(false);
  const sendOtpCalled = useRef(false);

  const sendOtpEmail = (newOtp: string) => {
    emailjs
      .send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          passcode: newOtp,
          time: new Date(Date.now() + 15 * 60000).toLocaleTimeString(),
          to_email: email,
        },
        EMAILJS_PUBLIC_KEY
      )
      .then(() => {
        setInfo('OTP sent! Please check your email.');
        setError('');
      })
      .catch(() => {
        setError('Failed to send OTP. Please try again.');
        setInfo('');
      });
  };

  const handleSendOtp = () => {
    const newOtp = generateOTP();
    setSentOtp(newOtp);
    sendOtpEmail(newOtp);
  };

  useEffect(() => {
    if (!sendOtpCalled.current) {
      handleSendOtp();
      sendOtpCalled.current = true;
    }
  }, []);

  const handleVerify = () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6‑digit OTP');
      setInfo('');
      setVerifiedMessage('');
      return;
    }
    if (otp === sentOtp) {
      setError('');
      setInfo('');
      setVerifiedMessage('OTP Verified Successfully ✅');
      // Delay calling onVerified to allow user to see message
      setTimeout(() => {
        onVerified();
      }, 1500);
    } else {
      setError('Invalid OTP, please try again');
      setInfo('');
      setVerifiedMessage('');
    }
  };

  const handleResend = () => {
    setResendClicked(true);
    handleSendOtp();

    // Reset animation state after animation duration (e.g., 300ms)
    setTimeout(() => {
      setResendClicked(false);
    }, 300);
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">OTP Verification</h2>
        <p className="text-gray-600 text-center mb-4">
          We’ve sent an OTP to <strong>{email || phone || 'your registered email'}</strong>
        </p>
        <input
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value);
            setError('');
            setInfo('');
            setVerifiedMessage('');
          }}
          placeholder="Enter 6‑digit OTP"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        {info && <p className="text-green-600 text-sm mt-2 text-center">{info}</p>}
        {verifiedMessage && <p className="text-blue-600 text-sm mt-2 text-center font-semibold">{verifiedMessage}</p>}
        <button
          onClick={handleVerify}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors mt-4 font-semibold"
        >
          Verify OTP
        </button>
        <p className="text-sm text-gray-500 text-center mt-4">
          Didn’t get OTP?{' '}
          <button
            type="button"
            onClick={handleResend}
            className={`text-green-600 font-medium transition-transform duration-150 ease-in-out ${
              resendClicked ? 'scale-90' : 'scale-100'
            }`}
          >
            Resend
          </button>
        </p>
      </div>
    </div>
  );
};

export default OtpVerification;
