from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash
from jwt import encode as jwt_encode, decode as jwt_decode
import time
import random
import datetime
import os
import threading
from dotenv import load_dotenv
from functools import wraps

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL') or (
    f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
)
# Fix for Render's postgres:// starting with postgres:// instead of postgresql://
if app.config['SQLALCHEMY_DATABASE_URI'] and app.config['SQLALCHEMY_DATABASE_URI'].startswith("postgres://"):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'your-secret-key')

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(255), primary_key=True)
    role = db.Column(db.Enum('farmer', 'consumer', 'admin', name='user_role'), nullable=False)
    name = db.Column(db.String(255))
    fullName = db.Column(db.String(255))
    email = db.Column(db.String(255), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    whatsapp = db.Column(db.String(20))
    address = db.Column(db.Text, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    blocked = db.Column(db.Boolean, default=False)
    underReview = db.Column(db.Boolean, default=False)
    reviewReason = db.Column(db.Text)
    reviewDate = db.Column(db.DateTime)
    createdAt = db.Column(db.DateTime, default=datetime.datetime.utcnow)


class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.String(255), primary_key=True)
    farmerId = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    farmerName = db.Column(db.String(255), nullable=False)
    farmerPhone = db.Column(db.String(20), nullable=False)
    farmerWhatsapp = db.Column(db.String(20))
    farmerAddress = db.Column(db.Text, nullable=False)
    cropCategory = db.Column(db.String(100), nullable=False)
    cropName = db.Column(db.String(255), nullable=False)
    pricePerKg = db.Column(db.Numeric(10, 2), nullable=False)
    availableQuantity = db.Column(db.Integer, nullable=False)
    image = db.Column(db.Text(length=4294967295), nullable=False)
    # Seasonal availability fields
    seasonalMonths = db.Column(db.String(50), nullable=True)  # e.g., "1,2,3,4" for Jan-Apr
    isSeasonal = db.Column(db.Boolean, default=True)
    createdAt = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.String(255), primary_key=True)
    userId = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    totalAmount = db.Column(db.Numeric(10, 2), nullable=False)
    deliveryAddress = db.Column(db.Text, nullable=False)
    deliveryType = db.Column(db.Enum('self', 'partner', name='delivery_type'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    status = db.Column(db.String(50), default='placed')

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    orderId = db.Column(db.String(255), db.ForeignKey('orders.id'), nullable=False)
    productId = db.Column(db.String(255), db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    pricePerKg = db.Column(db.Numeric(10, 2), nullable=False)
    cropName = db.Column(db.String(255), nullable=False)
    image = db.Column(db.Text(length=4294967295), nullable=False)

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.String(255), primary_key=True)
    userId = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    read = db.Column(db.Boolean, default=False)

class Cart(db.Model):
    __tablename__ = 'cart'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    userId = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    productId = db.Column(db.String(255), db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    pricePerKg = db.Column(db.Numeric(10, 2), nullable=False)
    cropName = db.Column(db.String(255), nullable=False)
    image = db.Column(db.Text(length=4294967295), nullable=False)

class SearchHistory(db.Model):
    __tablename__ = 'search_history'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    userId = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    searchTerm = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class PurchaseHistory(db.Model):
    __tablename__ = 'purchase_history'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    userId = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    productId = db.Column(db.String(255), db.ForeignKey('products.id'), nullable=False)
    cropName = db.Column(db.String(255), nullable=False)
    cropCategory = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    pricePerKg = db.Column(db.Numeric(10, 2), nullable=False)
    totalAmount = db.Column(db.Numeric(10, 2), nullable=False)
    purchaseDate = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    orderId = db.Column(db.String(255), db.ForeignKey('orders.id'), nullable=False)

class CustomerNote(db.Model):
    __tablename__ = 'customer_notes'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    farmerId = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    customerId = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    note = db.Column(db.Text, nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Ensure one note per farmer-customer pair
    __table_args__ = (db.UniqueConstraint('farmerId', 'customerId', name='unique_farmer_customer_note'),)

# Helper Functions
def calculate_effective_price(product):
    """Calculate effective price with 20% discount every 20 hours"""
    if not product or not product.createdAt:
        return (float(product.pricePerKg) * 1.02 if product else 0, 0)
    
    # Calculate time since product was created
    created_time = product.createdAt
    if isinstance(created_time, str):
        try:
            created_time = datetime.datetime.fromisoformat(created_time.replace('Z', '+00:00'))
        except:
            created_time = datetime.datetime.utcnow()
    
    current_time = datetime.datetime.utcnow()
    if isinstance(created_time, datetime.datetime):
        time_diff = current_time - created_time
        hours_since = time_diff.total_seconds() / 3600
    else:
        hours_since = 0
    
    # Calculate discount: 20% off every 20 hours
    intervals = max(0, int(hours_since / 20))
    multiplier = (0.8 ** intervals)  # 20% off per 20h interval
    
    # Base price with 2% commission
    base_with_commission = float(product.pricePerKg) * 1.02
    effective_price = max(0, round(base_with_commission * multiplier, 2))
    
    return effective_price, intervals

def check_and_remove_expired_products():
    """Check for products with zero or negative effective price and remove them"""
    try:
        products = Product.query.filter(Product.availableQuantity > 0).all()
        removed_count = 0
        notifications_added = False

        for product in products:
            # Low-stock notification (<= 3kg)
            try:
                if product.availableQuantity <= 3:
                    # Avoid duplicate low-stock notifications in a short window (24h)
                    twenty_four_hours_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
                    existing = Notification.query.filter(
                        Notification.userId == product.farmerId,
                        Notification.message.contains('Low stock'),
                        Notification.message.contains(product.cropName),
                        Notification.timestamp > twenty_four_hours_ago
                    ).first()
                    if not existing:
                        notification_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
                        low_stock_notification = Notification(
                            id=notification_id,
                            userId=product.farmerId,
                            message=f"⚠️ Low stock alert! You only have {product.availableQuantity}kg of {product.cropName} remaining. Update your stock if more is available."
                        )
                        db.session.add(low_stock_notification)
                        notifications_added = True
            except Exception:
                # If the notification check fails for a product, continue
                pass

            effective_price, intervals = calculate_effective_price(product)

            # If price is zero or negative, remove the product
            if effective_price <= 0:
                crop_name = product.cropName
                farmer_id = product.farmerId

                # Notify farmer about auto-removal
                notification_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
                removal_notification = Notification(
                    id=notification_id,
                    userId=farmer_id,
                    message=f"🗑️ Your {crop_name} has been automatically removed because the price decreased to zero after {intervals * 20} hours. Please add a new listing if you still have stock available."
                )
                db.session.add(removal_notification)

                # Mark product as unavailable (set quantity to 0)
                product.availableQuantity = 0
                removed_count += 1

        # Commit if we removed expired products or added notifications
        if removed_count > 0 or notifications_added:
            db.session.commit()
            if removed_count > 0:
                print(f"Removed {removed_count} expired products")
            if notifications_added:
                print("Low-stock notifications created for products with low quantity")

        return removed_count
    except Exception as e:
        print(f"Error in check_and_remove_expired_products: {e}")
        db.session.rollback()
        return 0

def generate_token(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt_encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def is_seasonal_product(product, current_month=None):
    """Check if a product is in season"""
    if not product.isSeasonal or not product.seasonalMonths:
        return True  # Non-seasonal products are always available
    
    if current_month is None:
        current_month = datetime.datetime.now().month
    
    seasonal_months = [int(x.strip()) for x in product.seasonalMonths.split(',')]
    return current_month in seasonal_months

def get_seasonal_boost(product, current_month=None):
    """Get seasonal boost score for recommendations"""
    if not product.isSeasonal:
        return 1.0  # No boost for non-seasonal products
    
    if is_seasonal_product(product, current_month):
        return 1.5  # 50% boost for in-season products
    else:
        return 0.3  # 70% penalty for out-of-season products

def get_purchase_preference_score(user_id, crop_name, crop_category):
    """Calculate purchase preference score based on user's purchase history"""
    # Get user's purchase history for this crop
    purchases = PurchaseHistory.query.filter_by(
        userId=user_id,
        cropName=crop_name
    ).all()
    
    if not purchases:
        return 1.0  # No preference data
    
    # Calculate frequency and recency
    total_quantity = sum(p.quantity for p in purchases)
    recent_purchases = [p for p in purchases if p.purchaseDate > datetime.datetime.utcnow() - datetime.timedelta(days=90)]
    
    # Base score on quantity purchased
    quantity_score = min(total_quantity / 10, 2.0)  # Cap at 2x boost
    
    # Recency boost
    recency_score = 1.0 + (len(recent_purchases) * 0.2)  # 20% boost per recent purchase
    
    return min(quantity_score * recency_score, 3.0)  # Cap at 3x boost

def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]
            data = jwt_decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'Invalid token'}), 401
            
            return f(current_user, *args, **kwargs)
        except:
            return jsonify({'message': 'Invalid token'}), 401
        
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]
            data = jwt_decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            if data['role'] != 'admin':
                return jsonify({'message': 'Admin access required'}), 403
        except:
            return jsonify({'message': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'message': 'Flask server is running'})

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        # Normalize/trim inputs
        email = (data.get('email') or '').strip().lower()
        phone = (data.get('phone') or '').strip()
        role = (data.get('role') or '').strip()
        
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'User already exists'}), 400
        
        # Normalize password (trim) and store as plain text
        raw_password = (data.get('password') or '').strip()
        if not raw_password:
            return jsonify({'success': False, 'message': 'Password is required'}), 400

        new_user = User(
            id=f"user-{int(datetime.datetime.utcnow().timestamp())}",
            role=role,
            name=data.get('name'),
            fullName=data.get('fullName'),
            email=email,
            phone=phone,
            whatsapp=data.get('whatsapp'),
            address=data['address'],
            password=raw_password
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        user_response = {
            'id': new_user.id,
            'role': new_user.role,
            'name': new_user.name,
            'fullName': new_user.fullName,
            'email': new_user.email,
            'phone': new_user.phone,
            'whatsapp': new_user.whatsapp,
            'address': new_user.address,
            'createdAt': new_user.createdAt.isoformat()
        }
        
        return jsonify({
            'success': True, 
            'message': 'User registered successfully',
            'user': user_response
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        # Normalize inputs
        email = (data.get('email') or '').strip().lower()
        password = (data.get('password') or '').strip()

        # Case-insensitive email match
        from sqlalchemy import func
        user = User.query.filter(func.lower(User.email) == email).first()

        # Password verification - handles both plain text and legacy hashed passwords
        def verify_password(stored_password: str, input_password: str) -> bool:
            if not stored_password or not input_password:
                return False
            
            # First try direct comparison for plain text passwords
            if stored_password.strip() == input_password.strip():
                return True
            
            # If that fails, try checking if it's a hashed password (legacy support)
            try:
                if check_password_hash(stored_password, input_password):
                    return True
            except Exception:
                pass
            
            return False
        
        if not user or not verify_password(user.password, password):
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        if user.blocked:
            return jsonify({'success': False, 'message': 'Account is blocked'}), 403
        
        token = generate_token(user.id, user.role)
        
        user_dict = {
            'id': user.id,
            'role': user.role,
            'name': user.name,
            'fullName': user.fullName,
            'email': user.email,
            'phone': user.phone,
            'whatsapp': user.whatsapp,
            'address': user.address,
            'blocked': user.blocked,
            'createdAt': user.createdAt.isoformat()
        }
        
        return jsonify({'success': True, 'user': user_dict, 'token': token})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# Forgot password endpoints
@app.route('/api/auth/forgot/verify-phone', methods=['POST'])
def forgot_verify_phone():
    try:
        data = request.get_json() or {}
        phone = (data.get('phone') or '').strip()
        if not phone:
            return jsonify({'success': False, 'message': 'Phone is required'}), 400

        user = User.query.filter_by(phone=phone).first()
        return jsonify({'success': True, 'exists': user is not None})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/auth/forgot/reset', methods=['POST'])
def forgot_reset_password():
    try:
        data = request.get_json() or {}
        phone = (data.get('phone') or '').strip()
        new_password = (data.get('newPassword') or '').strip()
        if not phone or not new_password:
            return jsonify({'success': False, 'message': 'Phone and newPassword are required'}), 400

        user = User.query.filter_by(phone=phone).first()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        user.password = generate_password_hash(new_password) # type: ignore
        db.session.commit()
        return jsonify({'success': True, 'message': 'Password updated'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# User Profile Update Route
@app.route('/api/users/<user_id>', methods=['PUT'])
@token_required
def update_user_profile(current_user, user_id):
    try:
        data = request.get_json() or {}
        
        # Check if user is updating their own profile or admin is updating
        if current_user.id != user_id and current_user.role != 'admin':
            return jsonify({'success': False, 'message': 'Forbidden'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Update allowed fields
        if 'fullName' in data:
            user.fullName = data['fullName'].strip()
        if 'name' in data:
            user.name = data['name'].strip()
        if 'email' in data:
            email = data['email'].strip().lower()
            # Check if email is already taken by another user
            existing_user = User.query.filter(User.email == email, User.id != user_id).first()
            if existing_user:
                return jsonify({'success': False, 'message': 'Email already exists'}), 400
            user.email = email
        if 'phone' in data:
            phone = data['phone'].strip()
            # Check if phone is already taken by another user
            existing_user = User.query.filter(User.phone == phone, User.id != user_id).first()
            if existing_user:
                return jsonify({'success': False, 'message': 'Phone number already exists'}), 400
            user.phone = phone
        if 'whatsapp' in data:
            user.whatsapp = data['whatsapp'].strip()
        if 'address' in data:
            user.address = data['address'].strip()
        
        db.session.commit()
        
        # Return updated user data
        user_response = {
            'id': user.id,
            'role': user.role,
            'name': user.name,
            'fullName': user.fullName,
            'email': user.email,
            'phone': user.phone,
            'whatsapp': user.whatsapp,
            'address': user.address,
            'blocked': user.blocked,
            'createdAt': user.createdAt.isoformat()
        }
        
        return jsonify({'success': True, 'message': 'Profile updated successfully', 'user': user_response})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Product Routes
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        # Check and remove expired products first
        check_and_remove_expired_products()
        
        # Only return products that are still available (quantity > 0 and price > 0)
        products = Product.query.filter(Product.availableQuantity > 0).order_by(Product.createdAt.desc()).all()
        products_list = []
        
        for product in products:
            # Check effective price - exclude products with zero price
            effective_price, intervals = calculate_effective_price(product)
            if effective_price <= 0:
                continue  # Skip products with zero price
            
            products_list.append({
                'id': product.id,
                'farmerId': product.farmerId,
                'farmerName': product.farmerName,
                'farmerPhone': product.farmerPhone,
                'farmerWhatsapp': product.farmerWhatsapp,
                'farmerAddress': product.farmerAddress,
                'cropCategory': product.cropCategory,
                'cropName': product.cropName,
                'pricePerKg': float(product.pricePerKg),
                'consumerPricePerKg': round(float(product.pricePerKg) * 1.02, 2),
                'effectivePrice': effective_price,  # Add effective price for frontend
                'availableQuantity': product.availableQuantity,
                'image': product.image,
                'isSeasonal': product.isSeasonal,
                'seasonalMonths': product.seasonalMonths,
                'inSeason': is_seasonal_product(product),
                'createdAt': product.createdAt.isoformat()
            })
        
        return jsonify({'success': True, 'products': products_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# New endpoint to update product quantity
@app.route('/api/products/<product_id>/quantity', methods=['PUT'])
@token_required
def update_product_quantity(current_user, product_id):
    try:
        data = request.get_json()
        if 'quantity' not in data:
            return jsonify({'success': False, 'message': 'Quantity is required'}), 400
        
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        # Verify owner
        if current_user.role != 'admin' and product.farmerId != current_user.id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Update quantity
        old_quantity = product.availableQuantity
        product.availableQuantity = int(data['quantity'])
        
        # If stock was low and is now updated to a higher value
        if old_quantity <= 3 and product.availableQuantity > 3:
            notification_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
            stock_update_notification = Notification(
                id=notification_id,
                userId=product.farmerId,
                message=f"✅ Stock updated! Your {product.cropName} quantity has been updated from {old_quantity}kg to {product.availableQuantity}kg."
            )
            db.session.add(stock_update_notification)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product quantity updated successfully',
            'quantity': product.availableQuantity
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/products', methods=['POST'])
@token_required
def add_product(current_user):
    try:
        print(f"Content-Type: {request.content_type}")
        print(f"Request data: {request.get_data()}")
        data = request.get_json()
        print(f"Parsed JSON data: {data}")
        
        new_product = Product(
            id=f"prod-{int(datetime.datetime.utcnow().timestamp())}",
            farmerId=data['farmerId'],
            farmerName=data['farmerName'],
            farmerPhone=data['farmerPhone'],
            farmerWhatsapp=data.get('farmerWhatsapp'),
            farmerAddress=data['farmerAddress'],
            cropCategory=data['cropCategory'],
            cropName=data['cropName'],
            pricePerKg=data['pricePerKg'],
            availableQuantity=data['availableQuantity'],
            image=data['image'],
            seasonalMonths=data.get('seasonalMonths', '1,2,3,4,5,6,7,8,9,10,11,12'),  # Default to year-round
            isSeasonal=data.get('isSeasonal', True)  # Default to seasonal
        )
        
        db.session.add(new_product)
        db.session.commit()
        
        product_response = {
            'id': new_product.id,
            'farmerId': new_product.farmerId,
            'farmerName': new_product.farmerName,
            'farmerPhone': new_product.farmerPhone,
            'farmerWhatsapp': new_product.farmerWhatsapp,
            'farmerAddress': new_product.farmerAddress,
            'cropCategory': new_product.cropCategory,
            'cropName': new_product.cropName,
            'pricePerKg': new_product.pricePerKg,
            'availableQuantity': new_product.availableQuantity,
            'image': new_product.image,
            'isSeasonal': new_product.isSeasonal,
            'seasonalMonths': new_product.seasonalMonths,
            'inSeason': is_seasonal_product(new_product),
            'createdAt': new_product.createdAt.isoformat()
        }
        
        return jsonify({
            'success': True, 
            'message': 'Product added successfully',
            'product': product_response
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Delete a product (farmer-owned)
@app.route('/api/products/<product_id>', methods=['DELETE'])
@token_required
def delete_product(current_user, product_id):
    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        # Only owner farmer or admin can delete
        if current_user.role != 'admin' and product.farmerId != current_user.id:
            return jsonify({'success': False, 'message': 'Forbidden'}), 403
        # Remove related records to avoid foreign key constraint errors
        # Delete cart items
        Cart.query.filter_by(productId=product_id).delete()
        # Delete order items
        OrderItem.query.filter_by(productId=product_id).delete()
        # Delete purchase history
        PurchaseHistory.query.filter_by(productId=product_id).delete()
        # Now delete the product
        db.session.delete(product)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Product deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Cart Routes
@app.route('/api/cart/<user_id>', methods=['GET'])
def get_cart(user_id):
    try:
        cart_items = Cart.query.filter_by(userId=user_id).all()
        cart_list = []
        
        for item in cart_items:
            cart_list.append({
                'id': item.id,
                'productId': item.productId,
                'quantity': item.quantity,
                'pricePerKg': float(item.pricePerKg),
                'cropName': item.cropName,
                'image': item.image
            })
        
        return jsonify({'success': True, 'cart': cart_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/cart/add', methods=['POST'])
@token_required
def add_to_cart(current_user):
    try:
        print(f"Cart add - Content-Type: {request.content_type}")
        print(f"Cart add - Request data: {request.get_data()}")
        data = request.get_json()
        print(f"Cart add - Parsed data: {data}")
        
        # Get product details
        product = Product.query.filter_by(id=data['productId']).first()
        if not product:
            print(f"Product not found: {data['productId']}")
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        # Check if product is still available (quantity > 0 and price > 0)
        effective_price, intervals = calculate_effective_price(product)
        if effective_price <= 0:
            return jsonify({'success': False, 'message': 'This product is no longer available (price expired)'}), 400
        
        if product.availableQuantity <= 0:
            return jsonify({'success': False, 'message': 'Product is out of stock'}), 400
        
        # Use effective (discounted) price
        existing_item = Cart.query.filter_by(
            userId=data['userId'],
            productId=data['productId']
        ).first()
        
        if existing_item:
            existing_item.quantity += data['quantity']
            # Update price to current effective price
            existing_item.pricePerKg = effective_price
        else:
            new_cart_item = Cart(
                userId=data['userId'],
                productId=data['productId'],
                quantity=data['quantity'],
                pricePerKg=effective_price,  # Use discounted price
                cropName=product.cropName,
                image=product.image
            )
            db.session.add(new_cart_item)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Item added to cart'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/cart/update', methods=['PUT'])
@token_required
def update_cart(current_user):
    try:
        data = request.get_json()
        cart_item = Cart.query.filter_by(userId=data['userId'], productId=data['productId']).first()
        
        if cart_item:
            cart_item.quantity = data['quantity']
            db.session.commit()
            return jsonify({'success': True, 'message': 'Cart updated'})
        else:
            return jsonify({'success': False, 'message': 'Cart item not found'}), 404
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/cart/remove', methods=['DELETE'])
@token_required
def remove_from_cart(current_user):
    try:
        data = request.get_json()
        cart_item = Cart.query.filter_by(userId=data['userId'], productId=data['productId']).first()
        
        if cart_item:
            db.session.delete(cart_item)
            db.session.commit()
            return jsonify({'success': True, 'message': 'Item removed from cart'})
        else:
            return jsonify({'success': False, 'message': 'Cart item not found'}), 404
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Helper function to check if next order would trigger review
def check_if_next_order_triggers_review(user_id, current_order_quantity):
    """Check if placing this order would trigger review (3 consecutive large orders)"""
    try:
        # Get user's recent orders (last 10 orders)
        recent_orders = (
            Order.query
            .filter_by(userId=user_id, status='delivered')
            .order_by(Order.timestamp.desc())
            .limit(10)
            .all()
        )
        
        # Check if current order quantity is 15kg+
        if current_order_quantity < 15:
            return False, "Order quantity is not large enough to trigger review"
        
        # Count consecutive large orders
        consecutive_large_orders = 0
        for order in recent_orders:
            # Calculate total quantity for this order
            order_items = OrderItem.query.filter_by(orderId=order.id).all()
            total_quantity = sum(item.quantity for item in order_items)
            
            if total_quantity >= 15:
                consecutive_large_orders += 1
            else:
                break  # Reset counter if order is not large
        
        # If this would be the 3rd consecutive large order, block it
        if consecutive_large_orders >= 2:  # 2 previous + 1 current = 3 total
            return True, f"You have made {consecutive_large_orders} consecutive large purchases (15kg+ each). Your account will be marked for review if you place another large order. Please contact support for assistance."
        
        return False, "Order can be placed"
        
    except Exception as e:
        print(f"Error in check_if_next_order_triggers_review: {e}")
        return False, "Error checking order history"


# Order Routes
@app.route('/api/orders', methods=['POST'])
@token_required
def place_order(current_user):
    try:
        print(f"Place order - Content-Type: {request.content_type}")
        print(f"Place order - Request data: {request.get_data()}")
        data = request.get_json()
        print(f"Place order - Parsed data: {data}")
        
        # Calculate total quantity for this order
        total_quantity = sum(item['quantity'] for item in data['items'])
        
        # Check if this order would trigger review (block 4th consecutive large order)
        would_trigger_review, review_message = check_if_next_order_triggers_review(data['userId'], total_quantity)
        
        if would_trigger_review:
            return jsonify({
                'success': False, 
                'message': review_message,
                'blocked': True,
                'redirect_to_login': True
            }), 403
        
        # Check and remove expired products before processing order
        check_and_remove_expired_products()
        
        # Recalculate total amount using discounted prices from items
        # Items already have discounted prices from cart
        calculated_total = sum(item['pricePerKg'] * item['quantity'] for item in data['items'])
        
        new_order = Order(
            id=f"order-{int(datetime.datetime.utcnow().timestamp())}",
            userId=data['userId'],
            totalAmount=calculated_total,  # Use recalculated total with discounted prices
            deliveryAddress=data['deliveryAddress'],
            deliveryType=data['deliveryType']
        )
        
        db.session.add(new_order)
        db.session.flush()
        
        for item in data['items']:
            # Get product to verify it exists and check price
            product = Product.query.get(item['productId'])
            if not product:
                continue  # Skip if product doesn't exist
            
            # Verify the product is still available and price is valid
            effective_price, intervals = calculate_effective_price(product)
            if effective_price <= 0:
                # Product expired - skip this item and notify
                notification_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
                user_notification = Notification(
                    id=notification_id,
                    userId=data['userId'],
                    message=f"⚠️ {product.cropName} was removed from your order because the price expired. It has been removed from the marketplace."
                )
                db.session.add(user_notification)
                continue
            
            if product.availableQuantity <= 0:
                continue  # Skip out of stock items
            
            # Use the discounted price from cart (which should match effective price)
            # The cart already has the discounted price, so use item['pricePerKg'] directly
            discounted_price = item['pricePerKg']
            
            order_item = OrderItem(
                orderId=new_order.id,
                productId=item['productId'],
                quantity=item['quantity'],
                pricePerKg=discounted_price,  # Use discounted price from cart
                cropName=item['cropName'],
                image=item['image']
            )
            db.session.add(order_item)
            
            # Store product data before potential deletion
            crop_name = product.cropName
            crop_category = product.cropCategory
            farmer_id = product.farmerId
            
            # Reduce available quantity
            product.availableQuantity = max(0, product.availableQuantity - item['quantity'])
            
            # Track purchase history with discounted price
            purchase_history = PurchaseHistory(
                userId=data['userId'],
                productId=item['productId'],
                cropName=crop_name,
                cropCategory=crop_category,
                quantity=item['quantity'],
                pricePerKg=discounted_price,  # Use discounted price
                totalAmount=discounted_price * item['quantity'],  # Use discounted price
                orderId=new_order.id
            )
            db.session.add(purchase_history)
                
            # If quantity reaches 0, notify farmer and mark product as sold out
            if product.availableQuantity <= 0:
                # Notify farmer about product being sold out
                notification_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
                removal_notification = Notification(
                    id=notification_id,
                    userId=farmer_id,
                    message=f"📦 Your {crop_name} has been sold out! All available quantity has been ordered by customers."
                )
                db.session.add(removal_notification)
                
                # Mark product as sold out instead of deleting it to preserve purchase history
                # We'll keep the product in the database for historical purposes
                # The product will be filtered out from active listings by checking availableQuantity > 0
            
            # Check if product price expired during order processing
            if effective_price <= 0:
                # Additional check: if price becomes zero, set quantity to 0
                product.availableQuantity = 0
                notification_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
                price_expiry_notification = Notification(
                    id=notification_id,
                    userId=farmer_id,
                    message=f"🗑️ Your {crop_name} has been automatically removed because the price decreased to zero after {intervals * 20} hours."
                )
                db.session.add(price_expiry_notification)
        
        Cart.query.filter_by(userId=data['userId']).delete()
        
        # Send notifications to farmers for new orders (only for products that still exist)
        for item in data['items']:
            product = Product.query.get(item['productId'])
            if product:
                # Generate unique notification ID using timestamp + random number
                notification_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
                notification = Notification(
                    id=notification_id,
                    userId=product.farmerId,
                    message=f"Your {item['cropName']} has been ordered. Quantity: {item['quantity']}kg"
                )
                db.session.add(notification)
        
        
        db.session.commit()
        
        order_response = {
            'id': new_order.id,
            'userId': new_order.userId,
            'totalAmount': float(new_order.totalAmount),
            'deliveryAddress': new_order.deliveryAddress,
            'deliveryType': new_order.deliveryType,
            'status': new_order.status,
            'createdAt': new_order.timestamp.isoformat()
        }
        
        return jsonify({
            'success': True, 
            'message': 'Order placed successfully', 
            'order': order_response
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/orders/<user_id>', methods=['GET'])
def get_user_orders(user_id):
    try:
        orders = Order.query.filter_by(userId=user_id).order_by(Order.timestamp.desc()).all()
        orders_list = []
        
        for order in orders:
            order_dict = {
                'id': order.id,
                'userId': order.userId,
                'totalAmount': float(order.totalAmount),
                'deliveryAddress': order.deliveryAddress,
                'deliveryType': order.deliveryType,
                'timestamp': order.timestamp.isoformat(),
                'status': order.status,
                'items': []
            }
            
            order_items = OrderItem.query.filter_by(orderId=order.id).all()
            for item in order_items:
                order_dict['items'].append({
                    'id': item.id,
                    'productId': item.productId,
                    'quantity': item.quantity,
                    'pricePerKg': float(item.pricePerKg),
                    'cropName': item.cropName,
                    'image': item.image
                })
            
            orders_list.append(order_dict)
        
        return jsonify({'success': True, 'orders': orders_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/orders/status/<order_id>', methods=['GET'])
def get_order_status(order_id):
    try:
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        return jsonify({'success': True, 'status': order.status})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/orders/status/<order_id>', methods=['PUT'])
@token_required
def update_order_status(current_user, order_id):
    try:
        data = request.get_json() or {}
        new_status = data.get('status')
        if new_status not in ['placed', 'processing', 'shipped', 'delivered', 'cancelled']:
            return jsonify({'success': False, 'message': 'Invalid status'}), 400

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        order.status = new_status
        db.session.commit()

        # Send notifications for different status changes
        if new_status == 'processing':
            # Notify farmers when order is being processed
            order_items = OrderItem.query.filter_by(orderId=order.id).all()
            product_ids = [item.productId for item in order_items]
            products = Product.query.filter(Product.id.in_(product_ids)).all()
            
            for item in order_items:
                product = next((p for p in products if p.id == item.productId), None)
                if product:
                    notif_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
                    message = f"⚙️ NEW ORDER! Please prepare {item.quantity}kg of {item.cropName} for delivery"
                    db.session.add(Notification(id=notif_id, userId=product.farmerId, message=message))
            db.session.commit()
            
        elif new_status == 'shipped':
            # Notify farmers when order is shipped
            order_items = OrderItem.query.filter_by(orderId=order.id).all()
            product_ids = [item.productId for item in order_items]
            products = Product.query.filter(Product.id.in_(product_ids)).all()
            
            for item in order_items:
                product = next((p for p in products if p.id == item.productId), None)
                if product:
                    notif_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
                    message = f"🚚 ORDER SHIPPED! Your {item.cropName} is on the way to the customer"
                    db.session.add(Notification(id=notif_id, userId=product.farmerId, message=message))
            db.session.commit()
            
        elif new_status == 'delivered':
            # Notify all farmers involved in this order with detailed information
            order_items = OrderItem.query.filter_by(orderId=order.id).all()
            product_ids = [item.productId for item in order_items]
            products = Product.query.filter(Product.id.in_(product_ids)).all()
            
            # Get order details for better notification
            order_user = User.query.get(order.userId)
            consumer_name = order_user.name if order_user else "Customer"
            
            for item in order_items:
                product = next((p for p in products if p.id == item.productId), None)
                if product:
                    notif_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
                    # Use the original product price without commission
                    original_price = float(product.pricePerKg)
                    total_amount = original_price * item.quantity
                    message = f"🎉 DELIVERY SUCCESS! Your {item.cropName} has been delivered to {consumer_name}. Quantity: {item.quantity}kg, Amount: ₹{total_amount:.2f}"
                    db.session.add(Notification(id=notif_id, userId=product.farmerId, message=message))
            
            # Also send a general delivery notification
            notif_id = f"notif-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"
            general_message = f"📦 Order #{order.id[-8:]} has been successfully delivered to {consumer_name}!"
            # Send to all farmers involved
            farmer_ids = list(set([p.farmerId for p in products]))
            for farmer_id in farmer_ids:
                db.session.add(Notification(id=f"{notif_id}-{farmer_id}", userId=farmer_id, message=general_message))
            
            db.session.commit()

        return jsonify({'success': True, 'message': 'Order status updated', 'status': order.status})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/orders/farmer/<farmer_id>', methods=['GET'])
def get_farmer_orders(farmer_id):
    try:
        # Get all products by this farmer
        farmer_products = Product.query.filter_by(farmerId=farmer_id).all()
        farmer_product_ids = [p.id for p in farmer_products]
        
        if not farmer_product_ids:
            return jsonify({'success': True, 'orders': []})
        
        # Get all order items for this farmer's products
        order_items = OrderItem.query.filter(OrderItem.productId.in_(farmer_product_ids)).all()
        
        # Group by order ID
        orders_dict = {}
        for item in order_items:
            order_id = item.orderId
            if order_id not in orders_dict:
                # Get order details
                order = Order.query.get(order_id)
                if order:
                    orders_dict[order_id] = {
                        'id': order.id,
                        'userId': order.userId,
                        'totalAmount': float(order.totalAmount),
                        'deliveryAddress': order.deliveryAddress,
                        'deliveryType': order.deliveryType,
                        'timestamp': order.timestamp.isoformat(),
                        'status': order.status,
                        'items': [],
                        'farmerOrders': []
                    }
            
            # Add this item to the order
            orders_dict[order_id]['items'].append({
                'id': item.id,
                'productId': item.productId,
                'quantity': item.quantity,
                'pricePerKg': float(item.pricePerKg),
                'cropName': item.cropName,
                'image': item.image
            })
        
        # Create farmer-specific order data
        orders_list = []
        for order_data in orders_dict.values():
            # Calculate farmer's portion of the order
            farmer_items = []
            farmer_total = 0
            
            for item in order_data['items']:
                if item['productId'] in farmer_product_ids:
                    farmer_items.append(item)
                    farmer_total += item['pricePerKg'] * item['quantity']
            
            if farmer_items:  # Only include orders that have items from this farmer
                order_data['farmerOrders'] = [{
                    'farmerId': farmer_id,
                    'farmerName': farmer_products[0].farmerName if farmer_products else 'Unknown',
                    'farmerPhone': farmer_products[0].farmerPhone if farmer_products else '',
                    'farmerWhatsapp': farmer_products[0].farmerWhatsapp if farmer_products else '',
                    'items': farmer_items,
                    'totalAmount': farmer_total
                }]
                orders_list.append(order_data)
        
        return jsonify({'success': True, 'orders': orders_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Customer Contact Center Routes
@app.route('/api/farmer/<farmer_id>/customers', methods=['GET'])
@token_required
def get_farmer_customers(current_user, farmer_id):
    """Get all customers who have purchased from this farmer"""
    try:
        # Verify farmer owns this endpoint
        if current_user.id != farmer_id and current_user.role != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get all products by this farmer
        farmer_products = Product.query.filter_by(farmerId=farmer_id).all()
        farmer_product_ids = [p.id for p in farmer_products]
        
        if not farmer_product_ids:
            return jsonify({'success': True, 'customers': []})
        
        # Get all order items for this farmer's products
        order_items = OrderItem.query.filter(OrderItem.productId.in_(farmer_product_ids)).all()
        
        # Get unique customer IDs from orders
        order_ids = list(set([item.orderId for item in order_items]))
        orders = Order.query.filter(Order.id.in_(order_ids)).all()
        customer_ids = list(set([order.userId for order in orders]))
        
        # Build customer list with order statistics
        customers_list = []
        for customer_id in customer_ids:
            customer = User.query.get(customer_id)
            if not customer:
                continue
            
            # Get customer's orders from this farmer
            customer_order_ids = [o.id for o in orders if o.userId == customer_id]
            customer_order_items = [item for item in order_items if item.orderId in customer_order_ids]
            
            # Calculate statistics
            total_orders = len(set([item.orderId for item in customer_order_items]))
            total_spent = sum([float(item.pricePerKg) * item.quantity for item in customer_order_items])
            total_quantity = sum([item.quantity for item in customer_order_items])
            last_order_date = None
            if customer_order_ids:
                last_order = Order.query.filter(Order.id.in_(customer_order_ids)).order_by(Order.timestamp.desc()).first()
                if last_order:
                    last_order_date = last_order.timestamp.isoformat()
            
            # Check if repeat customer (more than 1 order)
            is_repeat_customer = total_orders > 1
            
            # Get customer note if exists
            customer_note = CustomerNote.query.filter_by(farmerId=farmer_id, customerId=customer_id).first()
            
            customers_list.append({
                'id': customer.id,
                'name': customer.name or customer.fullName or 'Unknown',
                'fullName': customer.fullName,
                'email': customer.email,
                'phone': customer.phone,
                'whatsapp': customer.whatsapp,
                'address': customer.address,
                'totalOrders': total_orders,
                'totalSpent': round(total_spent, 2),
                'totalQuantity': total_quantity,
                'lastOrderDate': last_order_date,
                'isRepeatCustomer': is_repeat_customer,
                'note': customer_note.note if customer_note else None,
                'noteUpdatedAt': customer_note.updatedAt.isoformat() if customer_note else None
            })
        
        # Sort by last order date (most recent first)
        customers_list.sort(key=lambda x: x['lastOrderDate'] or '', reverse=True)
        
        return jsonify({'success': True, 'customers': customers_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/farmer/<farmer_id>/customers/<customer_id>/orders', methods=['GET'])
@token_required
def get_customer_orders(current_user, farmer_id, customer_id):
    """Get order history for a specific customer from this farmer"""
    try:
        # Verify farmer owns this endpoint
        if current_user.id != farmer_id and current_user.role != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get all products by this farmer
        farmer_products = Product.query.filter_by(farmerId=farmer_id).all()
        farmer_product_ids = [p.id for p in farmer_products]
        
        if not farmer_product_ids:
            return jsonify({'success': True, 'orders': []})
        
        # Get customer's orders
        customer_orders = Order.query.filter_by(userId=customer_id).order_by(Order.timestamp.desc()).all()
        
        # Filter orders that include this farmer's products
        orders_list = []
        for order in customer_orders:
            order_items = OrderItem.query.filter_by(orderId=order.id).all()
            farmer_items = [item for item in order_items if item.productId in farmer_product_ids]
            
            if farmer_items:  # Only include orders with this farmer's products
                farmer_total = sum([float(item.pricePerKg) * item.quantity for item in farmer_items])
                orders_list.append({
                    'id': order.id,
                    'totalAmount': round(farmer_total, 2),
                    'deliveryAddress': order.deliveryAddress,
                    'deliveryType': order.deliveryType,
                    'status': order.status,
                    'timestamp': order.timestamp.isoformat(),
                    'items': [{
                        'id': item.id,
                        'productId': item.productId,
                        'quantity': item.quantity,
                        'pricePerKg': float(item.pricePerKg),
                        'cropName': item.cropName,
                        'image': item.image
                    } for item in farmer_items]
                })
        
        return jsonify({'success': True, 'orders': orders_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/farmer/<farmer_id>/customers/<customer_id>/notes', methods=['POST', 'PUT'])
@token_required
def save_customer_note(current_user, farmer_id, customer_id):
    """Save or update a note for a customer"""
    try:
        # Verify farmer owns this endpoint
        if current_user.id != farmer_id and current_user.role != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        data = request.get_json() or {}
        note_text = data.get('note', '').strip()
        
        if not note_text:
            return jsonify({'success': False, 'message': 'Note cannot be empty'}), 400
        
        # Check if note exists
        existing_note = CustomerNote.query.filter_by(farmerId=farmer_id, customerId=customer_id).first()
        
        if existing_note:
            # Update existing note
            existing_note.note = note_text
            existing_note.updatedAt = datetime.datetime.utcnow()
        else:
            # Create new note
            new_note = CustomerNote(
                farmerId=farmer_id,
                customerId=customer_id,
                note=note_text
            )
            db.session.add(new_note)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Note saved successfully'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/farmer/<farmer_id>/customers/<customer_id>/notes', methods=['DELETE'])
@token_required
def delete_customer_note(current_user, farmer_id, customer_id):
    """Delete a customer note"""
    try:
        # Verify farmer owns this endpoint
        if current_user.id != farmer_id and current_user.role != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        note = CustomerNote.query.filter_by(farmerId=farmer_id, customerId=customer_id).first()
        if note:
            db.session.delete(note)
            db.session.commit()
        
        return jsonify({'success': True, 'message': 'Note deleted successfully'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Notification Routes
@app.route('/api/notifications/<user_id>', methods=['GET'])
def get_notifications(user_id):
    try:
        notifications = Notification.query.filter_by(userId=user_id).order_by(Notification.timestamp.desc()).all()
        notifications_list = []
        
        for notification in notifications:
            notifications_list.append({
                'id': notification.id,
                'userId': notification.userId,
                'message': notification.message,
                'timestamp': notification.timestamp.isoformat(),
                'read': notification.read
            })
        
        return jsonify({'success': True, 'notifications': notifications_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/notifications/<notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    try:
        notification = Notification.query.get(notification_id)
        if notification:
            notification.read = True
            db.session.commit()
            return jsonify({'success': True, 'message': 'Notification marked as read'})
        else:
            return jsonify({'success': False, 'message': 'Notification not found'}), 404
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Search history (used by recommendations)
@app.route('/api/search-history', methods=['POST'])
@token_required
def add_search_history(current_user):
    try:
        data = request.get_json() or {}
        search_term = data.get('searchTerm', '').strip()
        if not search_term:
            return jsonify({'success': False, 'message': 'searchTerm is required'}), 400

        entry = SearchHistory(userId=current_user.id, searchTerm=search_term)
        db.session.add(entry)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/recommendations/<user_id>', methods=['GET'])
@token_required
def get_recommendations(current_user, user_id):
    try:
        if current_user.id != user_id and current_user.role != 'admin':
            return jsonify({'success': False, 'message': 'Forbidden'}), 403

        current_month = datetime.datetime.now().month
        
        # Get user's search history
        recent_terms = (
            SearchHistory.query
            .filter_by(userId=user_id)
            .order_by(SearchHistory.timestamp.desc())
            .limit(10)
            .all()
        )
        terms = [t.searchTerm.lower() for t in recent_terms]

        # Get user's purchase history for preference scoring
        purchase_history = (
            PurchaseHistory.query
            .filter_by(userId=user_id)
            .order_by(PurchaseHistory.purchaseDate.desc())
            .limit(50)
            .all()
        )

        # Get all available products (exclude sold-out products)
        all_products = Product.query.filter(Product.availableQuantity > 0).order_by(Product.createdAt.desc()).all()
        
        # Score products based on multiple factors
        scored_products = []
        
        for product in all_products:
            score = 1.0  # Base score
            
            # 1. Search-based scoring (existing logic)
            if terms:
                crop = (product.cropName or '').lower()
                cat = (product.cropCategory or '').lower()
                if any(term in crop or term in cat for term in terms):
                    score *= 2.0  # 2x boost for search matches
            
            # 2. Purchase history-based scoring
            purchase_score = get_purchase_preference_score(
                user_id, 
                product.cropName, 
                product.cropCategory
            )
            score *= purchase_score
            
            # 3. Seasonal availability scoring
            seasonal_score = get_seasonal_boost(product, current_month)
            score *= seasonal_score
            
            # 4. Recency boost (newer products get slight boost)
            days_old = (datetime.datetime.utcnow() - product.createdAt).days
            recency_boost = max(0.8, 1.0 - (days_old / 365.0))  # Decay over a year
            score *= recency_boost
            
            # 5. Availability boost (products with more stock get slight boost)
            availability_boost = min(1.2, 1.0 + (product.availableQuantity / 100.0))
            score *= availability_boost
            
            scored_products.append((product, score))
        
        # Sort by score and take top 12
        scored_products.sort(key=lambda x: x[1], reverse=True)
        top_products = scored_products[:12]

        recs = []
        for product, score in top_products:
            recs.append({
                'id': product.id,
                'farmerId': product.farmerId,
                'farmerName': product.farmerName,
                'farmerPhone': product.farmerPhone,
                'farmerWhatsapp': product.farmerWhatsapp,
                'farmerAddress': product.farmerAddress,
                'cropCategory': product.cropCategory,
                'cropName': product.cropName,
                'pricePerKg': float(product.pricePerKg),
                'availableQuantity': product.availableQuantity,
                'image': product.image,
                'isSeasonal': product.isSeasonal,
                'seasonalMonths': product.seasonalMonths,
                'inSeason': is_seasonal_product(product, current_month),
                'recommendationScore': round(score, 2),
                'createdAt': product.createdAt.isoformat()
            })

        return jsonify({'success': True, 'recommendations': recs})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Admin Routes
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    try:
        users = User.query.order_by(User.createdAt.desc()).all()
        users_list = []
        
        for user in users:
            users_list.append({
                'id': user.id,
                'role': user.role,
                'name': user.name,
                'fullName': user.fullName,
                'email': user.email,
                'phone': user.phone,
                'whatsapp': user.whatsapp,
                'address': user.address,
                'blocked': user.blocked,
                'createdAt': user.createdAt.isoformat()
            })
        
        return jsonify({'success': True, 'users': users_list})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/users/<user_id>/block', methods=['PUT'])
@admin_required
def block_user(user_id):
    try:
        user = User.query.get(user_id)
        if user:
            user.blocked = True
            db.session.commit()
            return jsonify({'success': True, 'message': 'User blocked successfully'})
        else:
            return jsonify({'success': False, 'message': 'User not found'}), 404
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/users/<user_id>/unblock', methods=['PUT'])
@admin_required
def unblock_user(user_id):
    try:
        user = User.query.get(user_id)
        if user:
            user.blocked = False
            db.session.commit()
            return jsonify({'success': True, 'message': 'User unblocked successfully'})
        else:
            return jsonify({'success': False, 'message': 'User not found'}), 404
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/blocked-users', methods=['GET'])
@admin_required
def get_blocked_users():
    try:
        blocked_users = User.query.filter_by(blocked=True).all()
        users_data = []
        for user in blocked_users:
            users_data.append({
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'phone': user.phone,
                'role': user.role,
                'blocked': user.blocked,
                'createdAt': user.createdAt.isoformat() if user.createdAt else None
            })
        
        return jsonify({
            'success': True,
            'users': users_data
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/products', methods=['GET'])
@admin_required
def get_all_products_admin():
    try:
        products = Product.query.order_by(Product.createdAt.desc()).all()
        products_list = []
        
        for product in products:
            # Get farmer information
            farmer = User.query.get(product.farmerId)
            if farmer:
                farmer_name = farmer.name or farmer.fullName or 'Unknown Farmer'
            else:
                farmer_name = 'Unknown Farmer'
            
            products_list.append({
                'id': product.id,
                'name': product.cropName,
                'description': product.cropName,  # Use cropName as description since description field doesn't exist
                'category': product.cropCategory,
                'price': product.pricePerKg,
                'stock': product.availableQuantity,
                'image': product.image,
                'location': product.farmerAddress,  # Use farmerAddress as location
                'farmerId': product.farmerId,
                'farmerName': farmer_name,
                'rating': 0,  # Default rating since rating field doesn't exist
                'createdAt': product.createdAt.isoformat() if product.createdAt else None
            })
        
        return jsonify({
            'success': True,
            'products': products_list
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/orders', methods=['GET'])
@admin_required
def get_all_orders_admin():
    try:
        orders = Order.query.order_by(Order.timestamp.desc()).all()
        orders_list = []
        
        for order in orders:
            # Get consumer information
            consumer = User.query.get(order.userId)
            if consumer:
                consumer_name = consumer.name or consumer.fullName or 'Unknown Consumer'
            else:
                consumer_name = 'Unknown Consumer'
            
            # Count products in the order by querying OrderItem table
            order_items = OrderItem.query.filter_by(orderId=order.id).all()
            product_count = len(order_items)
            
            # Get order items details
            items_data = []
            for item in order_items:
                items_data.append({
                    'id': item.id,
                    'productId': item.productId,
                    'quantity': item.quantity,
                    'pricePerKg': float(item.pricePerKg),
                    'cropName': item.cropName,
                    'image': item.image
                })
            
            orders_list.append({
                'id': order.id,
                'userId': order.userId,
                'consumerName': consumer_name,
                'items': items_data,
                'total': float(order.totalAmount),  # Use totalAmount from Order model
                'status': order.status,
                'deliveryType': order.deliveryType,
                'deliveryAddress': order.deliveryAddress,
                'productCount': product_count,
                'timestamp': order.timestamp.isoformat() if order.timestamp else None
            })
        
        return jsonify({
            'success': True,
            'orders': orders_list
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Initialize database and insert sample data
@app.route('/api/init-db', methods=['POST'])
def initialize_database():
    try:
        db.create_all()
        
        if User.query.first():
            return jsonify({'message': 'Database already initialized'})
        
        admin_user = User(
            id='admin-001',
            role='admin',
            fullName='Admin User',
            email='admin@farm2consumer.com',
            phone='9876543210',
            address='Admin Office',
            password='Admin@123'
        )
        db.session.add(admin_user)
        
        
        # No sample data - farmers will add their own products with seasonal information
        
        db.session.commit()
        return jsonify({'message': 'Database initialized successfully - ready for real-time data'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Run initial check for expired products
        check_and_remove_expired_products()
    
    # Schedule periodic check for expired products (every 1 hour)
    def periodic_cleanup():
        while True:
            time.sleep(3600)  # Check every hour
            with app.app_context():
                try:
                    check_and_remove_expired_products()
                except Exception as e:
                    print(f"Error in periodic cleanup: {e}")
    
    cleanup_thread = threading.Thread(target=periodic_cleanup, daemon=True)
    cleanup_thread.start()
    
    app.run(debug=True, host='0.0.0.0', port=5000)
