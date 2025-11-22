import React, { useState, useEffect } from 'react';
import { Plus, Package, Bell, TrendingUp, IndianRupee, Upload, ShoppingBag, MessageCircle, AlertCircle, Trash2, Edit3, XCircle, User, Save, X, Phone, Users, FileText, History } from 'lucide-react';
import { addProduct, getProducts, getNotifications, markNotificationRead, getFarmerOrders, updateUserProfile, getFarmerCustomers, getCustomerOrders, saveCustomerNote, deleteCustomerNote, Customer } from '../utils/database';
import EXIF from 'exif-js';
import Chatbot from './Chatbot';
import notify from '../utils/notify';

interface APINotification {
  id: string;
  userId: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface UserNotification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface FarmerDashboardProps {
  user: any;
}

// Check if image contains geotag data (strict verification)
const checkImageGeoTag = (file: File): Promise<{ hasGeoTag: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.src = reader.result as string;
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn('EXIF reading timeout');
        resolve({ 
          hasGeoTag: false, 
          error: 'Geotag verification timeout. Please ensure your image contains GPS location data.' 
        });
      }, 8000);
      
      img.onload = () => {
        try {
          EXIF.getData(img as any, function(this: any) {
            clearTimeout(timeout);
            try {
              // Get GPS coordinates - these are the primary indicators
              const gpsLatitude = EXIF.getTag(this, 'GPSLatitude');
              const gpsLatitudeRef = EXIF.getTag(this, 'GPSLatitudeRef');
              const gpsLongitude = EXIF.getTag(this, 'GPSLongitude');
              const gpsLongitudeRef = EXIF.getTag(this, 'GPSLongitudeRef');
              
              // Get all EXIF data for comprehensive checking
              const allExifData = EXIF.getAllTags(this);
              const gpsInfo = EXIF.getTag(this, 'GPS');
              
              // Debug logging
              console.log('EXIF GPSLatitude:', gpsLatitude);
              console.log('EXIF GPSLongitude:', gpsLongitude);
              console.log('EXIF GPSLatitudeRef:', gpsLatitudeRef);
              console.log('EXIF GPSLongitudeRef:', gpsLongitudeRef);
              console.log('EXIF GPS Info:', gpsInfo);
              
              // Strict check: Must have actual GPS coordinates
              let hasGeoTag = false;
              
              // Primary check: Valid GPS coordinates exist
              if (gpsLatitude && gpsLongitude) {
                // Verify coordinates are in valid format (array with numbers)
                if (Array.isArray(gpsLatitude) && Array.isArray(gpsLongitude)) {
                  // Check if arrays contain valid numeric values
                  const latValid = gpsLatitude.length > 0 && gpsLatitude.some(v => typeof v === 'number');
                  const longValid = gpsLongitude.length > 0 && gpsLongitude.some(v => typeof v === 'number');
                  
                  if (latValid && longValid) {
                    hasGeoTag = true;
                    console.log('✅ Valid GPS coordinates found');
                  }
                } else if (typeof gpsLatitude === 'number' && typeof gpsLongitude === 'number') {
                  // Sometimes coordinates are direct numbers
                  hasGeoTag = true;
                  console.log('✅ Valid GPS coordinates found (numeric format)');
                }
              }
              
              // Secondary check: GPS info object exists with location data
              if (!hasGeoTag && gpsInfo && typeof gpsInfo === 'object') {
                // Check if GPS object has coordinate-related properties
                const gpsKeys = Object.keys(gpsInfo);
                const hasCoordinateKeys = gpsKeys.some(key => 
                  key.includes('Latitude') || key.includes('Longitude') || key.includes('GPS')
                );
                if (hasCoordinateKeys) {
                  hasGeoTag = true;
                  console.log('✅ GPS location data found in GPS object');
                }
              }
              
              // Tertiary check: Look for GPS Map Camera metadata patterns
              // GPS Map Camera apps often embed location in custom EXIF tags
              if (!hasGeoTag && allExifData) {
                const exifKeys = Object.keys(allExifData);
                // Check for location-related tags
                const locationIndicators = exifKeys.filter(key => 
                  key.toLowerCase().includes('gps') || 
                  key.toLowerCase().includes('location') ||
                  key.toLowerCase().includes('latitude') ||
                  key.toLowerCase().includes('longitude') ||
                  key.toLowerCase().includes('coordinate')
                );
                
                if (locationIndicators.length > 0) {
                  // Verify that these tags actually contain meaningful data
                  const hasValidLocationData = locationIndicators.some(key => {
                    const value = allExifData[key];
                    // Check if value is not null/undefined and has meaningful content
                    return value !== null && value !== undefined && 
                           (typeof value === 'number' || 
                            (Array.isArray(value) && value.length > 0) ||
                            (typeof value === 'string' && value.length > 0));
                  });
                  
                  if (hasValidLocationData) {
                    hasGeoTag = true;
                    console.log('✅ Location metadata found in EXIF tags:', locationIndicators);
                  }
                }
                
                // Also check raw EXIF data for GPS IFD (Image File Directory)
                // Some cameras store GPS data in a separate IFD
                try {
                  // Try to access GPS IFD directly if available
                  const gpsIfd = (this as any).exifdata?.GPS;
                  if (gpsIfd && typeof gpsIfd === 'object') {
                    const gpsKeys = Object.keys(gpsIfd);
                    if (gpsKeys.length > 0) {
                      // Check for coordinate data in GPS IFD
                      const hasCoordData = gpsKeys.some(key => {
                        const val = gpsIfd[key];
                        return val !== null && val !== undefined && 
                               (Array.isArray(val) || typeof val === 'number' || typeof val === 'string');
                      });
                      if (hasCoordData) {
                        hasGeoTag = true;
                        console.log('✅ GPS IFD data found:', gpsKeys);
                      }
                    }
                  }
                } catch (e) {
                  // Ignore errors accessing GPS IFD
                }
              }
              
              // Visual check: Try to detect GPS Map Camera overlay
              // Strong visual overlay detection (high confidence) indicates GPS Map Camera overlay
              // This helps identify GPS-geotagged images even when file content is binary/unreadable
              let hasVisualOverlay = false;
              let visualOverlayConfidence = 0;
              
              if (!hasGeoTag) {
                try {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    // Focus ONLY on bottom 15% where GPS Map Camera overlays are placed
                    // GPS Map Camera overlays are typically:
                    // 1. Horizontal dark bands/boxes at the very bottom
                    // 2. Contain text (coordinates, location names)
                    // 3. Have consistent dark background with lighter text
                    const bottomRegionHeight = Math.floor(img.height * 0.15); // Bottom 15% only
                    const bottomRegion = {
                      x: 0,
                      y: img.height - bottomRegionHeight,
                      width: img.width,
                      height: bottomRegionHeight
                    };
                    
                    const imageData = ctx.getImageData(bottomRegion.x, bottomRegion.y, bottomRegion.width, bottomRegion.height);
                    const totalPixels = imageData.data.length / 4;
                    
                    // Analyze bottom region for GPS overlay characteristics
                    let veryDarkPixelCount = 0; // Very dark background pixels
                    let darkPixelCount = 0;
                    let lightPixelCount = 0; // Light text pixels
                    let horizontalBandCount = 0; // Horizontal dark bands (typical of GPS overlays)
                    
                    // Check for horizontal bands (GPS overlays have horizontal dark bands)
                    const rowHeight = Math.floor(bottomRegion.height / 10); // Divide into 10 horizontal bands
                    const darkBandThreshold = 0.4; // 40% of row must be dark
                    
                    for (let band = 0; band < 10; band++) {
                      let bandDarkCount = 0;
                      const bandStartY = band * rowHeight;
                      const bandEndY = Math.min((band + 1) * rowHeight, bottomRegion.height);
                      
                      for (let y = bandStartY; y < bandEndY; y++) {
                        for (let x = 0; x < bottomRegion.width; x++) {
                          const pixelIndex = (y * bottomRegion.width + x) * 4;
                          const r = imageData.data[pixelIndex];
                          const g = imageData.data[pixelIndex + 1];
                          const b = imageData.data[pixelIndex + 2];
                          const brightness = (r + g + b) / 3;
                          
                          if (brightness < 50) {
                            bandDarkCount++;
                          }
                        }
                      }
                      
                      const bandDarkRatio = bandDarkCount / (bottomRegion.width * (bandEndY - bandStartY));
                      if (bandDarkRatio > darkBandThreshold) {
                        horizontalBandCount++;
                      }
                    }
                    
                    // Analyze all pixels in bottom region
                    for (let i = 0; i < imageData.data.length; i += 4) {
                      const r = imageData.data[i];
                      const g = imageData.data[i + 1];
                      const b = imageData.data[i + 2];
                      const brightness = (r + g + b) / 3;
                      
                      // Very dark pixels (overlay background)
                      if (brightness < 30) {
                        veryDarkPixelCount++;
                        darkPixelCount++;
                      } else if (brightness < 60) {
                        darkPixelCount++;
                      } else if (brightness > 180) {
                        lightPixelCount++; // Light text on dark background
                      }
                    }
                    
                    const veryDarkRatio = veryDarkPixelCount / totalPixels;
                    const darkRatio = darkPixelCount / totalPixels;
                    const lightRatio = lightPixelCount / totalPixels;
                    const contrastRatio = lightRatio > 0 && darkRatio > 0 ? (lightRatio + darkRatio) : 0;
                    
                    // STRICT criteria for GPS overlay detection:
                    // 1. Must have significant very dark regions (overlay background)
                    // 2. Must have horizontal band patterns (typical of GPS overlays)
                    // 3. Must have contrast (dark background + light text)
                    // 4. High threshold to avoid false positives from regular image content
                    
                    // More balanced thresholds - strict enough to reject false positives but lenient for real GPS overlays
                    const hasStrongDarkBackground = veryDarkRatio > 0.10 && darkRatio > 0.20; // Lowered from 0.15/0.25
                    const hasModerateDarkBackground = veryDarkRatio > 0.05 || darkRatio > 0.15; // Moderate dark region
                    const hasHorizontalBands = horizontalBandCount >= 1; // At least 1 dark horizontal band (lowered from 2)
                    const hasTextContrast = contrastRatio > 0.08 && lightRatio > 0.03; // Lowered thresholds
                    
                    // Calculate confidence score with more flexible criteria
                    if (hasStrongDarkBackground) visualOverlayConfidence += 3;
                    else if (hasModerateDarkBackground) visualOverlayConfidence += 1; // Partial credit for moderate dark
                    
                    if (hasHorizontalBands) {
                      visualOverlayConfidence += 2;
                      if (horizontalBandCount >= 2) visualOverlayConfidence += 1; // Bonus for multiple bands
                    }
                    
                    if (hasTextContrast) visualOverlayConfidence += 2;
                    if (veryDarkRatio > 0.20) visualOverlayConfidence += 1; // Extra dark background (lowered from 0.25)
                    
                    // Lowered threshold from 5 to 3 - accept if we have reasonable indicators
                    // This allows GPS Map Camera images with overlays to pass while still rejecting false positives
                    if (visualOverlayConfidence >= 3) {
                      hasVisualOverlay = true;
                      console.log(`📸 GPS overlay indicators detected in bottom region:`);
                      console.log(`   Very dark ratio: ${(veryDarkRatio * 100).toFixed(1)}%, Dark ratio: ${(darkRatio * 100).toFixed(1)}%`);
                      console.log(`   Horizontal bands: ${horizontalBandCount}, Text contrast: ${(contrastRatio * 100).toFixed(1)}%`);
                      console.log(`   Confidence score: ${visualOverlayConfidence}`);
                    } else {
                      console.log(`⚠️ Weak visual indicators (confidence: ${visualOverlayConfidence})`);
                      console.log(`   Very dark: ${(veryDarkRatio * 100).toFixed(1)}%, Bands: ${horizontalBandCount}, Contrast: ${(contrastRatio * 100).toFixed(1)}%`);
                    }
                  }
                } catch (canvasError) {
                  console.warn('Canvas detection error:', canvasError);
                }
              }
              
              // Final resolution: Check file content for GPS data
              // Accept if we find GPS indicators in file content (whether visual overlay detected or not)
              if (hasGeoTag) {
                // Standard EXIF GPS data found - accept immediately
                resolve({ hasGeoTag: true });
              } else {
                // Check file content for GPS data (whether visual overlay detected or not)
                console.log(`🔍 Checking file content for GPS location data... (Visual overlay: ${hasVisualOverlay ? 'detected' : 'not detected'})`);
                file.arrayBuffer().then(arrayBuffer => {
                  try {
                    const uint8Array = new Uint8Array(arrayBuffer);
                    // Read larger portions of the file - check start, middle, and end
                    // GPS Map Camera data can be embedded anywhere in the file
                    const fileSize = uint8Array.length;
                    const checkSize = Math.min(fileSize, 500000); // Check up to 500KB
                    
                    // Read from multiple sections: start, middle sections, and end
                    const sections: string[] = [];
                    const numSections = 5;
                    for (let i = 0; i < numSections; i++) {
                      const start = Math.floor((fileSize / numSections) * i);
                      const end = Math.min(start + (checkSize / numSections), fileSize);
                      const section = Array.from(uint8Array.slice(start, end))
                        .map(byte => {
                          // Keep printable ASCII and common whitespace, convert others to space
                          if (byte >= 32 && byte <= 126) return String.fromCharCode(byte);
                          if (byte === 9 || byte === 10 || byte === 13) return ' '; // Tab, LF, CR -> space
                          return ' '; // Other non-printable -> space
                        })
                        .join('');
                      sections.push(section);
                    }
                    const fileString = sections.join(' ');
                    
                    // Debug: Log a sample of what we found
                    const sample = fileString.substring(0, 500).replace(/\s+/g, ' ');
                    console.log('📄 File content sample (first 500 chars):', sample);
                    
                    // Very flexible location patterns - look for GPS data in many formats
                    const locationPatterns = [
                      /GPS\s*Map\s*Camera/i, // GPS Map Camera app signature (strongest indicator)
                      /GPS.*Camera/i, // Any GPS Camera reference
                      /Lat\s*[:\s]*[\d]+\.[\d]+/i, // "Lat 13.05" or "Lat 13.053006"
                      /Long\s*[:\s]*[\d]+\.[\d]+/i, // "Long 77.71" or "Long 77.718094"
                      /Latitude\s*[:\s]*[\d]+\.[\d]+/i,
                      /Longitude\s*[:\s]*[\d]+\.[\d]+/i,
                      /Coordinates?\s*[:\s]*[\d]+\.[\d]+/i,
                      /Location\s*[:\s]*[A-Z][a-z]+/i, // "Location: City"
                      /[\d]+\.[\d]+\s*[°]?\s*Long/i, // "13.0530° Long"
                      /[\d]+\.[\d]+\s*[°]?\s*Lat/i, // "77.7180° Lat"
                      /Bengaluru|Karnataka|India/i, // Location names from the apple image
                      /Plus\s*Code/i, // "Plus Code" from GPS Map Camera
                      /GMT\s*\+/i, // Timezone indicator
                    ];
                    
                    const matches = locationPatterns.filter(pattern => pattern.test(fileString));
                    const hasGPSMapCamera = /GPS\s*Map\s*Camera/i.test(fileString);
                    
                    // Look for coordinate patterns - very flexible
                    // Find decimal numbers that look like coordinates
                    // Pattern: 1-3 digits, decimal point, 1-8 digits (e.g., "13.053006", "77.718094")
                    const coordinatePattern = /[\d]{1,3}\.[\d]{1,8}/g;
                    const allNumbers = fileString.match(coordinatePattern) || [];
                    
                    // Also look for coordinates without word boundaries (might be embedded in text)
                    const allNumbers2 = fileString.match(/[\d]+\.[\d]+/g) || [];
                    const combinedNumbers = [...new Set([...allNumbers, ...allNumbers2])]; // Remove duplicates
                    
                    // Filter to likely coordinates - be very lenient
                    // Accept any decimal number that could be a coordinate (0-180 range)
                    const likelyCoordinates = combinedNumbers.filter(num => {
                      try {
                        const value = parseFloat(num);
                        // Latitude: -90 to 90, Longitude: -180 to 180
                        // Accept any value in this range, or close to it
                        // Also accept if it has at least 2 decimal places (more likely to be a coordinate)
                        const hasDecimal = num.includes('.');
                        const decimalPlaces = hasDecimal ? num.split('.')[1].length : 0;
                        return (value >= 0 && value <= 200) && (hasDecimal && decimalPlaces >= 1);
                      } catch (e) {
                        return false;
                      }
                    });
                    
                    // Check for Lat/Long labels
                    const hasLat = /Lat/i.test(fileString);
                    const hasLong = /Long/i.test(fileString);
                    const hasLatLongLabels = hasLat && hasLong;
                    
                    // Check if we have coordinates near Lat/Long text
                    // Look for patterns like "Lat 13.0530" or "13.0530 Long"
                    const hasCoordinatePattern = (hasLat || hasLong) && likelyCoordinates.length >= 1;
                    const hasTwoCoordinates = likelyCoordinates.length >= 2;
                    
                    const hasLocationText = /Location\s*[:\s]*[A-Z][a-z]+/i.test(fileString);
                    const hasLocationName = /Bengaluru|Karnataka|India|City|State|Country/i.test(fileString);
                    
                    // Debug logging
                    console.log('🔍 GPS Detection Results:');
                    console.log(`   GPS Map Camera: ${hasGPSMapCamera}`);
                    console.log(`   Pattern matches: ${matches.length}`);
                    console.log(`   All numbers found: ${allNumbers.length}`);
                    console.log(`   Likely coordinates: ${likelyCoordinates.length} (${likelyCoordinates.slice(0, 5).join(', ')})`);
                    console.log(`   Has Lat: ${hasLat}, Has Long: ${hasLong}`);
                    console.log(`   Has location text: ${hasLocationText || hasLocationName}`);
                    console.log(`   Matched patterns:`, matches.map(m => m.toString()).slice(0, 5));
                    
                    // Very lenient matching - accept if we find ANY GPS indicators:
                    // Option 1: Strong visual overlay detected (confidence >= 5) - GPS Map Camera overlays are visible
                    // Option 2: GPS Map Camera signature in file (strongest - accept immediately)
                    // Option 3: Any location name (Bengaluru, India, etc.) - strong indicator
                    // Option 4: Coordinates (2+ decimal numbers) with Lat/Long labels
                    // Option 5: Any coordinate + location text/name
                    // Option 6: Multiple pattern matches (2+)
                    // Option 7: Single coordinate with Lat or Long label
                    // Option 8: Plus Code or GMT indicators (GPS Map Camera features)
                    const hasPlusCode = /Plus\s*Code/i.test(fileString);
                    const hasGMT = /GMT\s*\+/i.test(fileString);
                    
                    // If visual overlay was detected, accept it
                    // GPS Map Camera apps add visible overlays with location data - if we can see it, it's geotagged
                    // We set hasVisualOverlay = true when confidence >= 3, so if it's true, we should accept it
                    // High confidence (>= 5) is even stronger evidence
                    const strongVisualOverlay = hasVisualOverlay; // Accept if visual overlay was detected (confidence >= 3)
                    const veryStrongVisualOverlay = hasVisualOverlay && visualOverlayConfidence >= 5; // Extra confidence for high scores
                    
                    // Debug: Log visual overlay status
                    console.log(`🔍 Visual Overlay Check: hasVisualOverlay=${hasVisualOverlay}, confidence=${visualOverlayConfidence}`);
                    console.log(`🔍 Visual Overlay Decision: strongVisualOverlay=${strongVisualOverlay}, veryStrongVisualOverlay=${veryStrongVisualOverlay}`);
                    
                    const shouldAccept = strongVisualOverlay || // Strong visual overlay = GPS Map Camera image
                                       hasGPSMapCamera || 
                                       hasLocationName || // Location names are strong indicators
                                       hasPlusCode || // Plus Code is GPS Map Camera feature
                                       (hasTwoCoordinates && hasLatLongLabels) ||
                                       (hasCoordinatePattern && (hasLocationText || hasLocationName)) ||
                                       (likelyCoordinates.length >= 1 && (hasLocationText || hasLocationName)) ||
                                       (likelyCoordinates.length >= 1 && (hasLat || hasLong)) ||
                                       matches.length >= 2 ||
                                       (hasGMT && (hasLat || hasLong || likelyCoordinates.length >= 1));
                    
                    console.log(`🔍 Acceptance Check: shouldAccept=${shouldAccept}, strongVisualOverlay=${strongVisualOverlay}, fileContentMatches=${matches.length}`);
                    
                    if (shouldAccept) {
                      console.log('✅ GPS location data FOUND');
                      const reason = strongVisualOverlay ? `Visual overlay detected (confidence: ${visualOverlayConfidence}) - GPS Map Camera overlay visible` :
                                    hasGPSMapCamera ? 'GPS Map Camera signature' : 
                                    hasLocationName ? 'Location name found' :
                                    hasPlusCode ? 'Plus Code found' :
                                    hasTwoCoordinates && hasLatLongLabels ? 'Coordinates with Lat/Long labels' :
                                    hasCoordinatePattern && (hasLocationText || hasLocationName) ? 'Coordinate pattern + location' :
                                    likelyCoordinates.length >= 1 && (hasLocationText || hasLocationName) ? 'Coordinate + location text' :
                                    likelyCoordinates.length >= 1 && (hasLat || hasLong) ? 'Coordinate + Lat/Long label' :
                                    matches.length >= 2 ? 'Multiple pattern matches' :
                                    hasGMT && (hasLat || hasLong || likelyCoordinates.length >= 1) ? 'GMT + GPS indicators' :
                                    'GPS indicators found';
                      console.log(`   Reason: ${reason}`);
                      resolve({ hasGeoTag: true });
                    } else {
                      console.log('❌ No GPS location data found');
                      console.log(`   Visual overlay: ${hasVisualOverlay ? `detected (confidence: ${visualOverlayConfidence})` : 'not detected'}`);
                      console.log(`   File content - GPS Map Camera=${hasGPSMapCamera}, Location Name=${hasLocationName}, Plus Code=${hasPlusCode}`);
                      console.log(`   File content - Coordinates=${likelyCoordinates.length}, Lat=${hasLat}, Long=${hasLong}, Matches=${matches.length}`);
                      if (hasVisualOverlay && visualOverlayConfidence < 5) {
                        console.log(`   ⚠️ Visual overlay detected but confidence too low (${visualOverlayConfidence} < 5)`);
                      }
                      resolve({ 
                        hasGeoTag: false, 
                        error: 'No GPS location data found in image. Please upload an image taken with GPS-enabled camera or GPS Map Camera app that includes location metadata.' 
                      });
                    }
                  } catch (fileReadError) {
                    console.warn('File string search error:', fileReadError);
                    resolve({ 
                      hasGeoTag: false, 
                      error: 'No GPS location data found in image. Please upload an image taken with GPS-enabled camera or GPS Map Camera app that includes location metadata.' 
                    });
                  }
                }).catch(() => {
                  resolve({ 
                    hasGeoTag: false, 
                    error: 'No GPS location data found in image. Please upload an image taken with GPS-enabled camera or GPS Map Camera app that includes location metadata.' 
                  });
                });
              }
            } catch (error) {
              clearTimeout(timeout);
              console.error('Error reading EXIF tags:', error);
              resolve({ 
                hasGeoTag: false, 
                error: 'Error reading image metadata. Please ensure your image contains GPS location data.' 
              });
            }
          });
        } catch (error) {
          clearTimeout(timeout);
          console.error('Error getting EXIF data:', error);
          resolve({ 
            hasGeoTag: false, 
            error: 'Failed to read image metadata. Please upload a geotagged image with GPS location data.' 
          });
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.error('Error loading image');
        resolve({ 
          hasGeoTag: false, 
          error: 'Failed to load image. Please try a different image file.' 
        });
      };
    };
    
    reader.onerror = () => {
      console.error('Error reading file');
      resolve({ 
        hasGeoTag: false, 
        error: 'Error reading image file. Please try again.' 
      });
    };
    
    reader.readAsDataURL(file);
  });
};

// Calculate effective price with 20% discount every 20 hours
const getEffectivePrice = (product: any) => {
  if (!product || !product.createdAt) {
    return { price: 0, intervals: 0 };
  }

  // Calculate time since product was created
  const created = new Date(product.createdAt);
  const now = new Date();
  const hoursSince = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  
  // Calculate discount: 20% off every 20 hours
  const intervals = Math.max(0, Math.floor(hoursSince / 20));
  const multiplier = Math.pow(0.8, intervals); // 20% off per 20h interval
  
  // Base price with 2% commission
  const baseWithCommission = Number(product.pricePerKg) * 1.02;
  const effectivePrice = Math.max(0, Math.round(baseWithCommission * multiplier));
  
  return { price: effectivePrice, intervals };
};

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showPriceInfo, setShowPriceInfo] = useState(false);
  const [productForm, setProductForm] = useState({
    cropCategory: '',
    cropName: '',
    pricePerKg: '',
    availableQuantity: '',
    image: '',
    isSeasonal: true,
    seasonalMonths: '1,2,3,4,5,6,7,8,9,10,11,12' // Default to year-round
  });
  const [imageError, setImageError] = useState('');
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [editMode, setEditMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState(user);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [editingNote, setEditingNote] = useState<string>('');
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{id: string, name: string, quantity: number} | null>(null);

  const cropCategories = ['vegetables', 'fruits', 'grains', 'pulses'];
  
  const seasonalOptions = [
    { value: '1,2,3,4,5,6,7,8,9,10,11,12', label: 'Year-round (All months)' },
    { value: '12,1,2', label: 'Winter (Dec-Feb)' },
    { value: '2,3', label: 'Spring (Feb-March)' },
    { value: '3,4,5', label: 'Summer (March-May)' },
    { value: '10,11', label: 'Autumn (Oct-Nov)' },
    { value: '6,7,8,9', label: 'Monsoon (Jun-Sep)' }
  ];

  // Load customers when switching to customers tab
  useEffect(() => {
    if (activeTab === 'customers') {
      loadCustomers();
    }
  }, [activeTab, user.id]);

  const loadCustomers = async () => {
    try {
      const customersData = await getFarmerCustomers(user.id);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load customers:', error);
      notify('Failed to load customers', { variant: 'error' });
    }
  };

  const handleViewCustomerDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditingNote(customer.note || '');
    setShowCustomerDetails(true);
    try {
      const ordersData = await getCustomerOrders(user.id, customer.id);
      setCustomerOrders(ordersData);
    } catch (error) {
      console.error('Failed to load customer orders:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedCustomer) return;
    
    try {
      const success = await saveCustomerNote(user.id, selectedCustomer.id, editingNote);
      if (success) {
        notify('Note saved successfully', { variant: 'success' });
        // Update customer in list
        setCustomers(customers.map(c => 
          c.id === selectedCustomer.id 
            ? { ...c, note: editingNote } 
            : c
        ));
        setSelectedCustomer({ ...selectedCustomer, note: editingNote });
      } else {
        notify('Failed to save note', { variant: 'error' });
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      notify('Failed to save note', { variant: 'error' });
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedCustomer) return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        const success = await deleteCustomerNote(user.id, selectedCustomer.id);
        if (success) {
          notify('Note deleted successfully', { variant: 'success' });
          setEditingNote('');
          // Update customer in list
          setCustomers(customers.map(c => 
            c.id === selectedCustomer.id 
              ? { ...c, note: undefined } 
              : c
          ));
          setSelectedCustomer({ ...selectedCustomer, note: undefined });
        } else {
          notify('Failed to delete note', { variant: 'error' });
        }
      } catch (error) {
        console.error('Failed to delete note:', error);
        notify('Failed to delete note', { variant: 'error' });
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load products with error handling
        try {
          const allProducts = await getProducts();
          // Filter products that belong to this farmer and are still available
          const farmerProducts = allProducts.filter(p => p.farmerId === user.id && p.availableQuantity > 0);
          setProducts(farmerProducts);
        } catch (error) {
          console.warn('Failed to load products (backend may be down):', error);
          setProducts([]); // Set empty array as fallback
        }
        
        // Try to load notifications with error handling
        try {
          const response = await getNotifications(user.id);
          const farmerNotifications = (response as unknown as APINotification[]);
          setNotifications(farmerNotifications.map(n => ({
            id: n.id,
            message: n.message,
            timestamp: n.timestamp,
            read: n.read
          })));
        } catch (error) {
          console.warn('Failed to load notifications (backend may be down):', error);
          setNotifications([]); // Set empty array as fallback
        }
        
        // Try to load orders with error handling
        try {
          const farmerOrders: any[] = await getFarmerOrders(user.id);
          setOrders(farmerOrders);
          // Use correct status values
          const activeCount = farmerOrders.filter(order => order.status === 'pending' || order.status === 'confirmed').length;
          setActiveOrdersCount(activeCount);
          // Calculate total earnings from completed orders (farmer's actual earnings after commission)
          const completedOrders = farmerOrders.filter(order => order.status === 'delivered');
          const revenue = completedOrders.reduce((total: number, order: any) => {
            // If order.farmerOrders exists and is array, use it; else fallback
            if (Array.isArray(order.farmerOrders)) {
              const farmerOrder = order.farmerOrders.find((fo: any) => fo.farmerId === user.id);
              if (farmerOrder && typeof farmerOrder.totalAmount === 'number') {
                const farmerEarnings = farmerOrder.totalAmount / 1.02;
                return total + farmerEarnings;
              }
            }
            // Fallback calculation if farmerOrders structure is different
            const farmerAmount = order.items?.reduce((itemTotal: number, item: any) => {
              const product = products.find((p: any) => p.id === item.productId && p.farmerId === user.id);
              if (product) {
                const consumerPriceTotal = item.pricePerKg * item.quantity;
                const farmerEarnings = consumerPriceTotal / 1.02;
                return itemTotal + farmerEarnings;
              }
              return itemTotal;
            }, 0) || 0;
            return total + farmerAmount;
          }, 0);
          setTotalEarnings(revenue);
        } catch (error) {
          console.warn('Failed to load orders (backend may be down):', error);
          setOrders([]); // Set empty array as fallback
          setActiveOrdersCount(0);
          setTotalEarnings(0);
        }
      } catch (error) {
        console.error('Error loading farmer data:', error);
      }
    };
    
    loadData();
    checkBackendStatus();
  }, [user.id]);

  // Add effect to refresh orders periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const farmerOrders = await getFarmerOrders(user.id);
        setOrders(farmerOrders);
        const activeCount = farmerOrders.filter(order => order.status === 'pending' || order.status === 'confirmed').length;
        setActiveOrdersCount(activeCount);
        // Refresh notifications to include delivery updates
        const response = await getNotifications(user.id);
        const farmerNotifications = (response as unknown as APINotification[]);
        setNotifications(farmerNotifications.map(n => ({
          id: n.id,
          message: n.message,
          timestamp: n.timestamp,
          read: n.read
        })));
        // Refresh products to remove expired ones (price = 0)
        const allProducts = await getProducts();
        const farmerProducts = allProducts.filter(p => {
          const { price } = getEffectivePrice(p);
          return p.farmerId === user.id && p.availableQuantity > 0 && price > 0;
        });
        setProducts(farmerProducts);
        // If products count has decreased, check notifications for zero-price removals
        if (farmerProducts.length < products.length) {
          const newNotifs = farmerNotifications.filter(n => 
            n.message.includes('automatically removed') && 
            !n.read &&
            new Date(n.timestamp) > new Date(Date.now() - 5000) // Only show notifications from last 5 seconds
          );
          newNotifs.forEach(notification => {
            notify(notification.message, { variant: 'warning' });
          });
        }
      } catch (error) {
        console.warn('Error refreshing orders (backend may be down):', error);
        // Don't clear existing data, just skip this refresh
      }
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [user.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError('');
    
    // Clear any previously selected image
    setProductForm(prev => ({ ...prev, image: '' }));
    
    if (file) {
      // Basic file validations
      if (file.size > 5 * 1024 * 1024) {
        setImageError('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setImageError('Please select a valid image file');
        return;
      }
      
      // Check if image has geotag - STRICT VERIFICATION
      try {
        const result = await checkImageGeoTag(file);
        
        if (!result.hasGeoTag) {
          // Reject image - no GPS data found
          setImageError(result.error || 'Image does not contain GPS location data. Please upload a geotagged image taken with GPS-enabled camera or GPS Map Camera app.');
          notify(result.error || 'Geotag verification failed. Please upload an image with GPS location data.', { variant: 'error' });
          return; // Don't proceed with image upload
        } else {
          // GPS data found - proceed with image upload
          console.log('✅ GPS location verified in image');
          setImageError(''); // Clear any previous errors
          
          // Save image if it passes all checks
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64String = event.target?.result as string;
            setProductForm(prev => ({ ...prev, image: base64String }));
            notify('Image uploaded successfully! GPS location verified.', { variant: 'success' });
          };
          reader.onerror = () => {
            setImageError('Failed to read image file. Please try again.');
            notify('Failed to read image file', { variant: 'error' });
          };
          reader.readAsDataURL(file);
        }
      } catch (error) {
        console.error('Error checking geotag:', error);
        setImageError('Error verifying geotag. Please ensure your image contains GPS location data.');
        notify('Geotag verification error. Please upload a geotagged image.', { variant: 'error' });
      }
    }
  };

  const handleCropNameChange = (cropName: string) => {
    setProductForm(prev => ({ ...prev, cropName }));
  };


  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        setBackendStatus('connected');
        console.log('✅ Backend is connected');
      } else {
        setBackendStatus('disconnected');
        console.log('❌ Backend returned error:', response.status);
      }
    } catch (error) {
      setBackendStatus('disconnected');
      console.log('❌ Backend is not reachable:', error);
    }
  };

  const handleAddProduct = async () => {
    if (!productForm.cropCategory || !productForm.cropName || !productForm.pricePerKg || !productForm.availableQuantity) {
      notify('Please fill all required fields', { variant: 'warning' });
      return;
    }
    
    if (!productForm.image) {
      notify('Please upload a product image. Image upload is mandatory.', { variant: 'warning' });
      return;
    }
    
    if (imageError) {
      notify('Please fix the image error before proceeding. Image must contain GPS location data (geotagged).', { variant: 'error' });
      return;
    }

    const newProduct = {
      ...productForm,
      farmerId: user.id,
      farmerName: user.name || user.fullName,
      farmerPhone: user.phone,
      farmerWhatsapp: user.whatsapp,
      farmerAddress: user.address,
      pricePerKg: parseFloat(productForm.pricePerKg),
      availableQuantity: parseInt(productForm.availableQuantity),
      isSeasonal: productForm.isSeasonal,
      seasonalMonths: productForm.seasonalMonths
    };

    try {
      const addedProduct = await addProduct(newProduct);
      if (addedProduct) {
        setProducts(prev => [...prev, addedProduct]);
        setProductForm({
          cropCategory: '',
          cropName: '',
          pricePerKg: '',
          availableQuantity: '',
          image: '',
          isSeasonal: true,
          seasonalMonths: '1,2,3,4,5,6,7,8,9,10,11,12'
        });
        setImageError('');
        setShowAddProduct(false);
      }
    } catch (error) {
      notify('Failed to add product. Please try again or contact support.', { variant: 'error' });
      console.error('Error adding product:', error);
    }
  };

  const handleNotificationClick = (notificationId: string) => {
    markNotificationRead(notificationId);
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
  };

  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectedProductIds(new Set());
    setEditMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) return;
    const confirmDelete = window.confirm(`Delete ${selectedProductIds.size} selected product(s)? This cannot be undone.`);
    if (!confirmDelete) return;
    try {
      const ids = Array.from(selectedProductIds);
      // delete sequentially to keep it simple
      for (const id of ids) {
        const ok = await (await import('../utils/database')).deleteProduct(id);
        if (!ok) {
          notify(`Failed to delete product ${id}`, { variant: 'error' });
        }
      }
      setProducts(prev => prev.filter(p => !selectedProductIds.has(p.id)));
      setSelectedProductIds(new Set());
      setEditMode(false);
      notify('Selected products deleted', { variant: 'success' });
    } catch (e) {
      notify('Failed to delete selected products', { variant: 'error' });
    }
  };

  const handleIndividualDelete = async (productId: string, productName: string) => {
    const confirmDelete = window.confirm(`Delete "${productName}"? This cannot be undone.`);
    if (!confirmDelete) return;
    try {
      const ok = await (await import('../utils/database')).deleteProduct(productId);
      if (ok) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        notify(`"${productName}" deleted successfully`, { variant: 'success' });
      } else {
        notify(`Failed to delete "${productName}"`, { variant: 'error' });
      }
    } catch (e) {
      notify(`Failed to delete "${productName}"`, { variant: 'error' });
    }
  };

  const handleUpdateQuantity = async () => {
    if (!editingProduct) return;
    try {
      const response = await fetch(`http://localhost:5000/api/products/${editingProduct.id}/quantity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          quantity: editingProduct.quantity
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProducts(prev => prev.map(p => 
            p.id === editingProduct.id 
            ? { ...p, availableQuantity: editingProduct.quantity }
            : p
          ));
          setEditingProduct(null);
          notify('Quantity updated successfully', { variant: 'success' });
        } else {
          notify(data.message || 'Failed to update quantity', { variant: 'error' });
        }
      } else {
        notify('Failed to update quantity', { variant: 'error' });
      }
    } catch (error) {
      notify('Error updating quantity', { variant: 'error' });
      console.error('Error updating quantity:', error);
    }
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


  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Products</p>
              <p className="text-4xl font-bold">{products.length}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
              <Package className="h-8 w-8" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Active Orders</p>
              <p className="text-4xl font-bold">{activeOrdersCount}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
              <ShoppingBag className="h-8 w-8" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Earnings</p>
              <p className="text-4xl font-bold">₹{totalEarnings.toFixed(0)}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
              <IndianRupee className="h-8 w-8" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Completed Orders</p>
              <p className="text-4xl font-bold">{orders.filter(order => order.status === 'delivered').length}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
              <ShoppingBag className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="h-6 w-6 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {notifications.slice(0, 5).map(notification => {
            const isDeliveryNotification = notification.message.includes('delivered');
            const isNewOrderNotification = notification.message.includes('new order');
            
            return (
              <div
                key={notification.id}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                  notification.read 
                    ? 'bg-gray-50 hover:bg-gray-100' 
                    : isDeliveryNotification 
                      ? 'bg-green-50 border-l-4 border-green-500 hover:bg-green-100' 
                      : isNewOrderNotification
                        ? 'bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100'
                        : 'bg-yellow-50 border-l-4 border-yellow-500 hover:bg-yellow-100'
                }`}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {isDeliveryNotification ? (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-lg">✅</span>
                      </div>
                    ) : isNewOrderNotification ? (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-lg">🛒</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 text-lg">📦</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{notification.message}</p>
                    <p className="text-sm text-gray-500 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                    {isDeliveryNotification && (
                      <div className="mt-2 p-2 bg-green-100 rounded-lg">
                        <p className="text-xs text-green-800 font-medium">🎉 Congratulations! Your product has been successfully delivered to the customer.</p>
                      </div>
                    )}
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            );
          })}
          {notifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No notifications yet</p>
              <p className="text-gray-400 text-sm">You'll see order updates and messages here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">My Products</h3>
          <p className="text-gray-600">Manage your crop listings and inventory</p>
        </div>
        <div className="flex items-center space-x-2">
          {editMode ? (
            <>
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-5 py-3 rounded-xl hover:bg-red-700 transition-all duration-300 flex items-center space-x-2 font-semibold shadow-lg"
                disabled={selectedProductIds.size === 0}
                title={selectedProductIds.size === 0 ? 'Select items to delete' : ''}
              >
                <Trash2 className="h-5 w-5" />
                <span>Delete Selected</span>
              </button>
              <button
                onClick={cancelSelection}
                className="px-5 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold flex items-center space-x-2"
              >
                <XCircle className="h-5 w-5" />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="px-5 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold flex items-center space-x-2"
              >
                <Edit3 className="h-5 w-5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setShowPriceInfo(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Plus className="h-5 w-5" />
                <span>Add Product</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {showAddProduct && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h4 className="text-xl font-bold mb-6 text-gray-900">Add New Product</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crop Category
              </label>
              <select
                value={productForm.cropCategory}
                onChange={(e) => setProductForm(prev => ({ ...prev, cropCategory: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {cropCategories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crop Name
              </label>
              <input
                type="text"
                value={productForm.cropName}
                onChange={(e) => handleCropNameChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter crop name (e.g., tomato, wheat, rice)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price per KG (₹)
              </label>
              <input
                type="number"
                value={productForm.pricePerKg}
                onChange={(e) => setProductForm(prev => ({ ...prev, pricePerKg: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter price"
              />
            </div>
            
            <div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    required
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-green-600 transition-all duration-300 bg-gray-50 hover:bg-green-50 rounded-lg shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <Upload className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-700">Upload Image (Required)</span>
                  </label>
                  {productForm.image && (
                    <img 
                      src={productForm.image} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                  )}
                </div>
                {imageError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 font-medium">{imageError}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Required:</strong> Upload a clear photo of your crop with GPS location data (geotagged). 
                  Use a GPS-enabled camera or GPS Map Camera app to capture images with location metadata. 
                  Maximum file size: 5MB.
                </p>
                {!imageError && productForm.image && (
                  <p className="text-xs text-green-600 mt-1 font-medium flex items-center space-x-1">
                    <span>✓</span>
                    <span>GPS location verified - Image ready to upload</span>
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Quantity (KG)
              </label>
              <input
                type="number"
                value={productForm.availableQuantity}
                onChange={(e) => setProductForm(prev => ({ ...prev, availableQuantity: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter quantity"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seasonal Product
              </label>
              <select
                value={productForm.isSeasonal ? 'true' : 'false'}
                onChange={(e) => setProductForm(prev => ({ ...prev, isSeasonal: e.target.value === 'true' }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="true">Yes - Seasonal</option>
                <option value="false">No - Year-round</option>
              </select>
            </div>
            
            {productForm.isSeasonal && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seasonal Months
                </label>
                <select
                  value={productForm.seasonalMonths}
                  onChange={(e) => setProductForm(prev => ({ ...prev, seasonalMonths: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {seasonalOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={() => setShowAddProduct(false)}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleAddProduct}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold shadow-lg"
            >
              Add Product
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map(product => (
          <div key={product.id} className={`group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform ${editMode ? '' : 'hover:-translate-y-2'}`}>
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
                <div className="flex items-center space-x-2">
                  {editMode && (
                    <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => toggleSelectProduct(product.id)}
                        className="h-4 w-4 text-green-600 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-600">Select</span>
                    </label>
                  )}
                  {!editMode && (
                    <button
                      onClick={() => handleIndividualDelete(product.id, product.cropName)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title={`Delete ${product.cropName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <span className="text-xs text-gray-500">Listed today</span>
                </div>
              </div>
              
              <h4 className="font-bold text-xl mb-2 text-gray-900">{product.cropName}</h4>
              
              <div className="flex justify-between items-center mt-4">
                <div>
                  <span className="text-2xl font-bold text-green-600">₹{product.pricePerKg}</span>
                  <span className="text-gray-500 text-sm">/kg</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {product.availableQuantity} kg stock
                  </span>
                  <button
                    onClick={() => setEditingProduct({
                      id: product.id,
                      name: product.cropName,
                      quantity: product.availableQuantity
                    })}
                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    title="Edit quantity"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quantity Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-96">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Update Quantity</h3>
            <p className="text-gray-600 mb-4">Editing quantity for: {editingProduct.name}</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Quantity (KG)
              </label>
              <input
                type="number"
                min="0"
                value={editingProduct.quantity}
                onChange={(e) => setEditingProduct(prev => 
                  prev ? { ...prev, quantity: parseInt(e.target.value) || 0 } : prev
                )}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateQuantity}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      
      {products.length === 0 && !showAddProduct && (
        <div className="text-center py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md mx-auto">
            <Package className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No products yet</h3>
            <p className="text-gray-600 mb-8">Start selling your fresh produce by adding your first product</p>
          <button
            onClick={() => setShowPriceInfo(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold shadow-lg"
          >
            Add Your First Product
          </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Customer Contact Center</h3>
          <p className="text-gray-600">Manage relationships with your customers</p>
        </div>
        <button
          onClick={loadCustomers}
          className="px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 font-semibold shadow-lg"
        >
          Refresh
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
          <Users className="h-20 w-20 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">No customers yet</h3>
          <p className="text-gray-600">Customers who purchase from you will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{customer.name}</h4>
                    {customer.isRepeatCustomer && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 mt-1">
                        ⭐ Repeat Customer
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <a href={`tel:${customer.phone}`} className="hover:text-green-600">{customer.phone}</a>
                </div>
                {customer.whatsapp && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    <a
                      href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-green-600"
                    >
                      WhatsApp
                    </a>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Orders:</span> {customer.totalOrders}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Spent:</span> ₹{customer.totalSpent}
                </div>
                {customer.lastOrderDate && (
                  <div className="text-sm text-gray-500">
                    Last order: {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              {customer.note && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700 line-clamp-2">{customer.note}</p>
                </div>
              )}

              <button
                onClick={() => handleViewCustomerDetails(customer)}
                className="w-full py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-sm"
              >
                View Details
              </button>
            </div>
          ))}
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
            <Edit3 className="h-4 w-4" />
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
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">
              {((profileData.name || profileData.fullName) || 'F').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            {editingProfile ? (
              <input
                type="text"
                value={profileData.name || ''}
                onChange={(e) => setProfileData((prev: any) => ({ ...prev, name: e.target.value }))}
                className="font-bold text-2xl text-gray-900 border-b-2 border-gray-300 focus:border-green-500 outline-none bg-transparent"
                placeholder="Enter your name"
              />
            ) : (
              <h4 className="font-bold text-2xl text-gray-900">{profileData.name || profileData.fullName}</h4>
            )}
            <p className="text-green-600 font-semibold">Verified Farmer</p>
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
                  onChange={(e) => setProfileData((prev: any) => ({ ...prev, email: e.target.value }))}
                  className="font-semibold text-gray-900 border-b border-gray-300 focus:border-green-500 outline-none bg-transparent w-full"
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
                  onChange={(e) => setProfileData((prev: any) => ({ ...prev, phone: e.target.value }))}
                  className="font-semibold text-gray-900 border-b border-gray-300 focus:border-green-500 outline-none bg-transparent w-full"
                />
              ) : (
                <p className="font-semibold text-gray-900">{profileData.phone}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="bg-green-100 p-3 rounded-lg">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">WhatsApp Number</p>
              {editingProfile ? (
                <input
                  type="tel"
                  value={profileData.whatsapp || ''}
                  onChange={(e) => setProfileData((prev: any) => ({ ...prev, whatsapp: e.target.value }))}
                  className="font-semibold text-gray-900 border-b border-gray-300 focus:border-green-500 outline-none bg-transparent w-full"
                />
              ) : (
                <p className="font-semibold text-gray-900">{profileData.whatsapp || 'Not provided'}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl md:col-span-2">
            <div className="bg-red-100 p-3 rounded-lg">
              <User className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Farm Address</p>
              {editingProfile ? (
                <textarea
                  value={profileData.address}
                  onChange={(e) => setProfileData((prev: any) => ({ ...prev, address: e.target.value }))}
                  className="font-semibold text-gray-900 border border-gray-300 focus:border-green-500 outline-none bg-transparent w-full rounded p-2"
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

  const renderOrders = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Order Management</h2>
        <div className="text-sm text-gray-600">
          Total Orders: <span className="font-semibold text-green-600">{orders.length}</span>
        </div>
      </div>
      
      {orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Order #{order.id.slice(-8)}</h3>
                  <p className="text-gray-600">{new Date(order.timestamp).toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Customer: {order.customerName || 'Unknown'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">₹{order.totalAmount?.toFixed(2)}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'placed' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
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
              
              <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-green-800"><strong>📍 Delivery Address:</strong> {order.deliveryAddress}</p>
                    <p className="text-sm text-green-800"><strong>🚚 Delivery Type:</strong> {order.deliveryType === 'self' ? 'Self Pickup' : 'Delivery Partner'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-800"><strong>📞 Status:</strong> {
                      order.status === 'placed' ? 'Order confirmed and received' :
                      order.status === 'processing' ? 'Preparing your order' :
                      order.status === 'shipped' ? 'Order is on the way' :
                      order.status === 'delivered' ? 'Order successfully delivered' :
                      order.status === 'cancelled' ? 'Order has been cancelled' :
                      'Order status unknown'
                    }</p>
                    <p className="text-sm text-green-800"><strong>⏰ Last Updated:</strong> {new Date().toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm font-semibold text-green-900 mb-3">📦 Order Progress</p>
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          order.status === 'placed' ? 'bg-blue-500 w-1/4' :
                          order.status === 'processing' ? 'bg-yellow-500 w-2/4' :
                          order.status === 'shipped' ? 'bg-purple-500 w-3/4' :
                          order.status === 'delivered' ? 'bg-green-600 w-full' :
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
                
                {order.status === 'delivered' && (
                  <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">🎉 Order delivered successfully! Payment will be processed within 7 days.</p>
                  </div>
                )}
                
                {order.farmerOrders && order.farmerOrders.length > 1 && (
                  <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-800"><strong>💰 Payment Split:</strong> This order includes products from {order.farmerOrders.length} farmers</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md mx-auto">
            <ShoppingBag className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No orders yet</h3>
            <p className="text-gray-600 mb-6">Orders from customers will appear here</p>
            <button
              onClick={() => setActiveTab('products')}
              className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors font-semibold"
            >
              Add Products
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Welcome back, <span className="text-green-600">{user.name || user.fullName}!</span>
              </h1>
              <p className="text-gray-600 text-lg">Manage your farm products, track orders, and grow your business</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                backendStatus === 'connected' ? 'bg-green-500' : 
                backendStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                Backend: {backendStatus === 'connected' ? 'Connected' : 
                         backendStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
              </span>
              <button
                onClick={checkBackendStatus}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                title="Check backend status"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 bg-white p-2 rounded-2xl shadow-lg mb-8">
          {[
            { id: 'overview', label: 'Dashboard', icon: TrendingUp },
            { id: 'products', label: 'My Products', icon: Package },
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
            { id: 'customers', label: 'Customers', icon: Users },
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
        
        {/* Floating Chatbot Button */}
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 z-40"
        >
          <MessageCircle className="h-6 w-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </button>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {/* Customer Details Modal */}
      {showCustomerDetails && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setShowCustomerDetails(false)}></div>
          <div className="relative z-10 bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">Customer Details</h3>
              <button
                onClick={() => setShowCustomerDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Customer Info */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-bold mb-2">{selectedCustomer.name}</h4>
                    {selectedCustomer.isRepeatCustomer && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white bg-opacity-20">
                        ⭐ Repeat Customer ({selectedCustomer.totalOrders} orders)
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-100">Total Spent</div>
                    <div className="text-3xl font-bold">₹{selectedCustomer.totalSpent}</div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Phone className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-gray-700">Phone</span>
                  </div>
                  <a href={`tel:${selectedCustomer.phone}`} className="text-green-600 hover:underline">
                    {selectedCustomer.phone}
                  </a>
                </div>
                {selectedCustomer.whatsapp && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-gray-700">WhatsApp</span>
                    </div>
                    <a
                      href={`https://wa.me/${selectedCustomer.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline"
                    >
                      {selectedCustomer.whatsapp}
                    </a>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-gray-700">Email</span>
                  </div>
                  <a href={`mailto:${selectedCustomer.email}`} className="text-green-600 hover:underline">
                    {selectedCustomer.email}
                  </a>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <History className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-gray-700">Total Orders</span>
                  </div>
                  <div className="text-gray-900">{selectedCustomer.totalOrders} orders</div>
                </div>
              </div>

              {/* Customer Notes */}
              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <h5 className="font-bold text-gray-900 mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Customer Notes
                </h5>
                <textarea
                  value={editingNote}
                  onChange={(e) => setEditingNote(e.target.value)}
                  placeholder="Add notes about this customer (e.g., prefers early delivery, bulk orders, etc.)"
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={handleSaveNote}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Save Note
                  </button>
                  {selectedCustomer.note && (
                    <button
                      onClick={handleDeleteNote}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                      Delete Note
                    </button>
                  )}
                </div>
              </div>

              {/* Order History */}
              <div>
                <h5 className="font-bold text-gray-900 mb-4 flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Order History ({customerOrders.length})
                </h5>
                {customerOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No order history available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">Order #{order.id.slice(-8)}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(order.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">₹{order.totalAmount}</div>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                          {order.items.map((item: any) => (
                            <div key={item.id} className="flex items-center space-x-2 text-sm">
                              <img src={item.image} alt={item.cropName} className="w-8 h-8 rounded object-cover" />
                              <span className="text-gray-700">{item.cropName} ({item.quantity}kg)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
    {showPriceInfo && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setShowPriceInfo(false)}></div>
        <div className="relative z-10 bg-white w-11/12 max-w-xl rounded-2xl shadow-2xl p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900 mb-2">Important pricing information</h4>
              <p className="text-gray-700 leading-relaxed">
                To encourage quick sales and reflect freshness, the listed price of your product will automatically be reduced by <span className="font-semibold">20%</span> every <span className="font-semibold">24 hours</span> after listing.
              </p>
              <ul className="mt-3 text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>This applies until the item is sold or you update/remove the listing.</li>
                <li>Please set an initial price accordingly.</li>
                <li>Your revenue from completed orders will be credited to your account on a <span className="font-semibold">weekly basis</span>.</li>
              </ul>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPriceInfo(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowPriceInfo(false); setShowAddProduct(true); }}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-semibold shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {showChatbot && (
        <Chatbot
          userType="farmer"
          onClose={() => setShowChatbot(false)}
        />
      )}
    </div>
  );
};

export default FarmerDashboard;