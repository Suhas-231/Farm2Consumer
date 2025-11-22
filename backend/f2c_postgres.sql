-- Database: farm2consumer

-- Users table
CREATE TYPE user_role AS ENUM ('farmer', 'consumer', 'admin');

CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    role user_role NOT NULL,
    name VARCHAR(255),
    "fullName" VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    address TEXT NOT NULL,
    password VARCHAR(255) NOT NULL,
    "kisanId" VARCHAR(255),
    blocked BOOLEAN DEFAULT FALSE,
    "underReview" BOOLEAN DEFAULT FALSE,
    "reviewReason" TEXT,
    "reviewDate" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_notes (
  id SERIAL PRIMARY KEY,
  "farmerId" VARCHAR(255) NOT NULL,
  "customerId" VARCHAR(255) NOT NULL,
  note TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_farmer_customer_note UNIQUE ("farmerId", "customerId"),
  FOREIGN KEY ("farmerId") REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY ("customerId") REFERENCES users (id) ON DELETE CASCADE
);

-- Products table
CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    "farmerId" VARCHAR(255) NOT NULL,
    "farmerName" VARCHAR(255) NOT NULL,
    "farmerPhone" VARCHAR(20) NOT NULL,
    "farmerWhatsapp" VARCHAR(20),
    "farmerAddress" TEXT NOT NULL,
    "cropCategory" VARCHAR(100) NOT NULL,
    "cropName" VARCHAR(255) NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "availableQuantity" INT NOT NULL,
    image TEXT NOT NULL,
    "seasonalMonths" VARCHAR(50) DEFAULT '1,2,3,4,5,6,7,8,9,10,11,12',
    "isSeasonal" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "publishDate" DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY ("farmerId") REFERENCES users(id) ON DELETE CASCADE
);

-- Orders table
CREATE TYPE delivery_type AS ENUM ('self', 'partner');

CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryType" delivery_type NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'placed',
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    "orderId" VARCHAR(255) NOT NULL,
    "productId" VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "cropName" VARCHAR(255) NOT NULL,
    image TEXT NOT NULL,
    FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
    id VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Cart table
CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "productId" VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "cropName" VARCHAR(255) NOT NULL,
    image TEXT NOT NULL,
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE
);

-- Search history table
CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "searchTerm" VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Purchase history table
CREATE TABLE purchase_history (
    id SERIAL PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "productId" VARCHAR(255) NOT NULL,
    "cropName" VARCHAR(255) NOT NULL,
    "cropCategory" VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "purchaseDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "orderId" VARCHAR(255) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_blocked ON users(blocked);

CREATE INDEX idx_products_farmerId ON products("farmerId");
CREATE INDEX idx_products_cropCategory ON products("cropCategory");
CREATE INDEX idx_products_cropName ON products("cropName");
CREATE INDEX idx_products_publishDate ON products("publishDate");

CREATE INDEX idx_orders_userId ON orders("userId");
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_timestamp ON orders(timestamp);

CREATE INDEX idx_order_items_orderId ON order_items("orderId");
CREATE INDEX idx_order_items_productId ON order_items("productId");

CREATE INDEX idx_notifications_userId ON notifications("userId");
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);

CREATE INDEX idx_cart_userId ON cart("userId");
CREATE INDEX idx_cart_productId ON cart("productId");

CREATE INDEX idx_search_history_userId ON search_history("userId");
CREATE INDEX idx_search_history_timestamp ON search_history(timestamp);

-- Insert admin user (password: Admin@123 - hashed with bcrypt)
INSERT INTO users (id, role, "fullName", email, phone, address, password, "createdAt") VALUES 
('admin-001', 'admin', 'Admin User', 'admin@farm2consumer.com', '9876543210', 'Admin Office', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uK.G', NOW());
