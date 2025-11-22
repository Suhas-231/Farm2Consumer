CREATE DATABASE farm2consumer;
USE farm2consumer;
SELECT DATABASE();

-- Users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    role ENUM('farmer', 'consumer', 'admin') NOT NULL,
    name VARCHAR(255),
    fullName VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    address TEXT NOT NULL,
    password VARCHAR(255) NOT NULL,
    kisanId VARCHAR(255),
    blocked BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id int NOT NULL AUTO_INCREMENT,
  farmerId varchar(255) NOT NULL,
  customerId varchar(255) NOT NULL,
  note text NOT NULL,
  createdAt datetime DEFAULT CURRENT_TIMESTAMP,
  updatedAt datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_farmer_customer_note (farmerId, customerId),
  KEY idx_farmer_id (farmerId),
  KEY idx_customer_id (customerId),
  CONSTRAINT customer_notes_ibfk_1 FOREIGN KEY (farmerId) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT customer_notes_ibfk_2 FOREIGN KEY (customerId) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Products table
CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    farmerId VARCHAR(255) NOT NULL,
    farmerName VARCHAR(255) NOT NULL,
    farmerPhone VARCHAR(20) NOT NULL,
    farmerWhatsapp VARCHAR(20),
    farmerAddress TEXT NOT NULL,
    cropCategory VARCHAR(100) NOT NULL,
    cropName VARCHAR(255) NOT NULL,
    pricePerKg DECIMAL(10,2) NOT NULL,
    availableQuantity INT NOT NULL,
    image TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmerId) REFERENCES users(id) ON DELETE CASCADE
);

-- Orders table
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    totalAmount DECIMAL(10,2) NOT NULL,
    deliveryAddress TEXT NOT NULL,
    deliveryType ENUM('self', 'partner') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'placed',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Order items table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId VARCHAR(255) NOT NULL,
    productId VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    pricePerKg DECIMAL(10,2) NOT NULL,
    cropName VARCHAR(255) NOT NULL,
    image TEXT NOT NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `read` BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Cart table
CREATE TABLE cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    productId VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    pricePerKg DECIMAL(10,2) NOT NULL,
    cropName VARCHAR(255) NOT NULL,
    image TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);

-- Search history table
CREATE TABLE search_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    searchTerm VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert admin user (password: Admin@123 - hashed with bcrypt)
INSERT INTO users (id, role, fullName, email, phone, address, password, createdAt) VALUES 
('admin-001', 'admin', 'Admin User', 'admin@farm2consumer.com', '9876543210', 'Admin Office', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uK.G', NOW());

-- Insert sample kisan data
INSERT INTO kisan_database (name, kisanId) VALUES 
('Ramesh Kumar', 'KIS001234567'),
('Suresh Patel', 'KIS001234568'),
('Mahesh Singh', 'KIS001234569'),
('Rajesh Sharma', 'KIS001234570'),
('Ganesh Yadav', 'KIS001234571'),
('Suhas', 'KIS009483272'),
('Arun Kumar', 'KIS009741103'),
('Thejesh Reddy', 'KIS6309790'),
('Rishi Majeti', 'KIS007021983');

-- Insert sample products
INSERT INTO products (id, farmerId, farmerName, farmerPhone, farmerWhatsapp, farmerAddress, cropCategory, cropName, pricePerKg, availableQuantity, image, createdAt) VALUES 
('prod-001', 'farmer-001', 'Ramesh Kumar', '9876543211', '9876543211', 'Village Rampur, District Meerut', 'vegetables', 'Tomatoes', 25.00, 100, 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=800', NOW()),
('prod-002', 'farmer-002', 'Suresh Patel', '9876543212', '9876543212', 'Village Patelnagar, District Gujrat', 'fruits', 'Mangoes', 80.00, 50, 'https://images.pexels.com/photos/1321942/pexels-photo-1321942.jpeg?auto=compress&cs=tinysrgb&w=800', NOW()),
('prod-003', 'farmer-003', 'Mahesh Singh', '9876543213', '9876543213', 'Village Singhpur, District Punjab', 'grains', 'Wheat', 22.00, 200, 'https://images.pexels.com/photos/1313434/pexels-photo-1313434.jpeg?auto=compress&cs=tinysrgb&w=800', NOW());

-- seasonalMonths
SET @missing := (
  SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'seasonalMonths'
);
SET @sql := IF(@missing, 'ALTER TABLE products ADD COLUMN seasonalMonths VARCHAR(50) NOT NULL DEFAULT ''1,2,3,4,5,6,7,8,9,10,11,12'';', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- isSeasonal
SET @missing := (
  SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'isSeasonal'
);
SET @sql := IF(@missing, 'ALTER TABLE products ADD COLUMN isSeasonal TINYINT(1) NOT NULL DEFAULT 1;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- createdAt
SET @missing := (
  SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'createdAt'
);
SET @sql := IF(@missing, 'ALTER TABLE products ADD COLUMN createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add publishDate column to products table
SET @missing := (
  SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'publishDate'
);
SET @sql := IF(@missing, 'ALTER TABLE products ADD COLUMN publishDate DATE NOT NULL DEFAULT (CURDATE());', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Update existing records to have publishDate as the same as createdAt
UPDATE products SET publishDate = DATE(createdAt) WHERE publishDate IS NULL OR publishDate = '0000-00-00';

-- Optional: Add an index for better query performance on publishDate
SET @missing := (
  SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_publishDate'
);
SET @sql := IF(@missing, 'CREATE INDEX idx_publishDate ON products(publishDate);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- Show all tables
SHOW TABLES;

-- Check table structure
DESCRIBE users;
DESCRIBE kisan_database;
DESCRIBE products;
DESCRIBE orders;
DESCRIBE order_items;
DESCRIBE notifications;
DESCRIBE cart;
DESCRIBE search_history;

select * from search_history;

-- Check sample data
SELECT * FROM users;
SELECT * FROM kisan_database;
SELECT * FROM products;

-- Check foreign key constraints
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    REFERENCED_TABLE_SCHEMA = 'farm2consumer';
    
    UPDATE users
SET password = 'Admin@123', email = LOWER(email)
WHERE email = 'admin@farm2consumer.com';

SELECT id,email,password,LENGTH(password) AS len FROM users WHERE LOWER(email)='admin@farm2consumer.com';

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_blocked ON users(blocked);

CREATE INDEX idx_products_farmerId ON products(farmerId);
CREATE INDEX idx_products_cropCategory ON products(cropCategory);
CREATE INDEX idx_products_cropName ON products(cropName);

CREATE INDEX idx_orders_userId ON orders(userId);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_timestamp ON orders(timestamp);

CREATE INDEX idx_order_items_orderId ON order_items(orderId);
CREATE INDEX idx_order_items_productId ON order_items(productId);

CREATE INDEX idx_notifications_userId ON notifications(userId);
CREATE INDEX idx_notifications_read ON notifications(`read`);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);

CREATE INDEX idx_cart_userId ON cart(userId);
CREATE INDEX idx_cart_productId ON cart(productId);

CREATE INDEX idx_search_history_userId ON search_history(userId);
CREATE INDEX idx_search_history_timestamp ON search_history(timestamp);