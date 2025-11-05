-- Database Queries for Profile Functionality and Enhanced Features
-- Run these queries if you need to manually update the database

-- 1. Ensure image columns can store large base64 data (if migration didn't work)
-- This should already be handled by the migration script, but here are the manual queries:

ALTER TABLE products MODIFY COLUMN image LONGTEXT NOT NULL;
ALTER TABLE order_items MODIFY COLUMN image LONGTEXT NOT NULL;
ALTER TABLE cart MODIFY COLUMN image LONGTEXT NOT NULL;

-- 2. Add any missing columns to users table (if needed)
-- Check if these columns exist before running:

-- ALTER TABLE users ADD COLUMN fullName VARCHAR(255) AFTER name;
-- ALTER TABLE users ADD COLUMN whatsapp VARCHAR(20) AFTER phone;
-- ALTER TABLE users ADD COLUMN blocked BOOLEAN DEFAULT FALSE AFTER password;
-- ALTER TABLE users ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER blocked;

-- Add review-related columns to users table (if they don't exist)
-- Run these queries to add the missing underReview, reviewReason, and reviewDate columns:
ALTER TABLE users ADD COLUMN `underReview` BOOLEAN DEFAULT FALSE AFTER blocked;
ALTER TABLE users ADD COLUMN `reviewReason` TEXT NULL AFTER `underReview`;
ALTER TABLE users ADD COLUMN `reviewDate` DATETIME NULL AFTER `reviewReason`;

-- 3. Add seasonal columns to products table (if migration didn't work)
-- Check if these columns exist before running:

-- ALTER TABLE products ADD COLUMN seasonalMonths VARCHAR(50) DEFAULT '1,2,3,4,5,6,7,8,9,10,11,12';
-- ALTER TABLE products ADD COLUMN isSeasonal BOOLEAN DEFAULT TRUE;
-- ALTER TABLE products ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. Verify current table structure
DESCRIBE users;
DESCRIBE products;
DESCRIBE order_items;
DESCRIBE cart;

-- 5. Check if all required indexes exist (for performance)
SHOW INDEX FROM users;
SHOW INDEX FROM products;
SHOW INDEX FROM order_items;
SHOW INDEX FROM cart;

-- 6. Sample queries to test the functionality:

-- Get all users with their profile information
SELECT id, role, name, fullName, email, phone, whatsapp, address, blocked, createdAt 
FROM users 
ORDER BY createdAt DESC;

-- Get all products with seasonal information
SELECT id, farmerId, cropName, cropCategory, pricePerKg, availableQuantity, 
       isSeasonal, seasonalMonths, createdAt 
FROM products 
ORDER BY createdAt DESC;

-- Get farmer's products with current availability
SELECT p.id, p.cropName, p.cropCategory, p.pricePerKg, p.availableQuantity,
       p.isSeasonal, p.seasonalMonths, p.createdAt
FROM products p 
WHERE p.farmerId = 'farmer_id_here'
ORDER BY p.createdAt DESC;

-- Get orders for a specific farmer with payment calculations
SELECT o.id, o.totalAmount, o.status, o.timestamp,
       oi.productId, oi.cropName, oi.quantity, oi.pricePerKg,
       (oi.quantity * oi.pricePerKg) as total_item_amount,
       ((oi.quantity * oi.pricePerKg) * 0.02) as commission,
       ((oi.quantity * oi.pricePerKg) * 0.98) as farmer_earnings
FROM orders o
JOIN order_items oi ON o.id = oi.orderId
JOIN products p ON oi.productId = p.id
WHERE p.farmerId = 'farmer_id_here'
ORDER BY o.timestamp DESC;

-- Get notifications for a user
SELECT id, userId, message, timestamp, read
FROM notifications 
WHERE userId = 'user_id_here'
ORDER BY timestamp DESC;

-- Check products that are out of stock (quantity = 0)
SELECT id, farmerId, cropName, cropCategory, availableQuantity
FROM products 
WHERE availableQuantity <= 0;

-- 7. Cleanup queries (use with caution):

-- Remove products with zero quantity (if automatic removal didn't work)
-- DELETE FROM products WHERE availableQuantity <= 0;

-- Remove old notifications (older than 30 days)
-- DELETE FROM notifications WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Remove completed orders older than 1 year
-- DELETE FROM orders WHERE status = 'delivered' AND timestamp < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- 8. Performance optimization queries:

-- Add indexes for better performance (if they don't exist)
-- CREATE INDEX idx_products_farmer ON products(farmerId);
-- CREATE INDEX idx_products_category ON products(cropCategory);
-- CREATE INDEX idx_products_seasonal ON products(isSeasonal);
-- CREATE INDEX idx_orders_user ON orders(userId);
-- CREATE INDEX idx_orders_status ON orders(status);
-- CREATE INDEX idx_order_items_product ON order_items(productId);
-- CREATE INDEX idx_notifications_user ON notifications(userId);
-- CREATE INDEX idx_cart_user ON cart(userId);

-- 9. Data integrity checks:

-- Check for orphaned records
SELECT COUNT(*) as orphaned_order_items
FROM order_items oi
LEFT JOIN products p ON oi.productId = p.id
WHERE p.id IS NULL;

SELECT COUNT(*) as orphaned_cart_items
FROM cart c
LEFT JOIN products p ON c.productId = p.id
WHERE p.id IS NULL;

-- Check for users without proper email/phone
SELECT id, email, phone, role
FROM users
WHERE email IS NULL OR email = '' OR phone IS NULL OR phone = '';

-- 10. Sample data for testing (optional):

-- Insert test farmer
INSERT INTO users (id, role, name, fullName, email, phone, whatsapp, address, password, blocked, createdAt)
VALUES ('test-farmer-001', 'farmer', 'Test Farmer', 'Test Farmer Full Name', 'testfarmer@example.com', '9876543210', '9876543210', 'Test Farm Address, Test City', 'password123', FALSE, NOW());

-- Insert test consumer
INSERT INTO users (id, role, name, fullName, email, phone, whatsapp, address, password, blocked, createdAt)
VALUES ('test-consumer-001', 'consumer', 'Test Consumer', 'Test Consumer Full Name', 'testconsumer@example.com', '9876543211', '9876543211', 'Test Consumer Address, Test City', 'password123', FALSE, NOW());

-- Note: The migration script (migrate_database.py) should handle most of these automatically.
-- Only run these manual queries if you encounter specific issues or need to verify the database structure.
