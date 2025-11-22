#!/usr/bin/env python3
"""
Database Migration Script
Adds missing columns to existing database tables
"""

import os
import sys
from dotenv import load_dotenv
import pymysql

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection"""
    try:
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'farm2consumer'),
            charset='utf8mb4'
        )
        return connection
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    try:
        cursor.execute(f"""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = '{table_name}' 
            AND COLUMN_NAME = '{column_name}'
        """)
        result = cursor.fetchone()
        return result[0] > 0
    except Exception as e:
        print(f"Error checking column {column_name} in {table_name}: {e}")
        return False

def add_missing_columns():
    """Add missing columns to database tables"""
    connection = get_db_connection()
    if not connection:
        print("Failed to connect to database")
        return False
    
    try:
        cursor = connection.cursor()
        
        # Check and add seasonalMonths column to products table
        if not check_column_exists(cursor, 'products', 'seasonalMonths'):
            print("Adding seasonalMonths column to products table...")
            cursor.execute("""
                ALTER TABLE products 
                ADD COLUMN seasonalMonths VARCHAR(50) DEFAULT '1,2,3,4,5,6,7,8,9,10,11,12'
            """)
            print("✅ Added seasonalMonths column")
        else:
            print("✅ seasonalMonths column already exists")
        
        # Check and add isSeasonal column to products table
        if not check_column_exists(cursor, 'products', 'isSeasonal'):
            print("Adding isSeasonal column to products table...")
            cursor.execute("""
                ALTER TABLE products 
                ADD COLUMN isSeasonal BOOLEAN DEFAULT TRUE
            """)
            print("✅ Added isSeasonal column")
        else:
            print("✅ isSeasonal column already exists")
        
        # Check and add createdAt column to products table
        if not check_column_exists(cursor, 'products', 'createdAt'):
            print("Adding createdAt column to products table...")
            cursor.execute("""
                ALTER TABLE products 
                ADD COLUMN createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """)
            print("✅ Added createdAt column")
        else:
            print("✅ createdAt column already exists")
        
        # Check and add underReview column to users table
        if not check_column_exists(cursor, 'users', 'underReview'):
            print("Adding underReview column to users table...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN `underReview` BOOLEAN DEFAULT FALSE AFTER `blocked`
            """)
            print("✅ Added underReview column")
        else:
            print("✅ underReview column already exists")
        
        # Check and add reviewReason column to users table
        if not check_column_exists(cursor, 'users', 'reviewReason'):
            print("Adding reviewReason column to users table...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN `reviewReason` TEXT NULL AFTER `underReview`
            """)
            print("✅ Added reviewReason column")
        else:
            print("✅ reviewReason column already exists")
        
        # Check and add reviewDate column to users table
        if not check_column_exists(cursor, 'users', 'reviewDate'):
            print("Adding reviewDate column to users table...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN `reviewDate` DATETIME NULL AFTER `reviewReason`
            """)
            print("✅ Added reviewDate column")
        else:
            print("✅ reviewDate column already exists")
        
        # Ensure large image columns can store base64 data URLs
        try:
            print("Checking and altering image columns to LONGTEXT if needed...")
            cursor.execute("""
                ALTER TABLE products 
                MODIFY COLUMN image LONGTEXT NOT NULL
            """)
            print("✅ Updated products.image to LONGTEXT")
        except Exception as e:
            print(f"ℹ️ Skipped updating products.image: {e}")

        try:
            cursor.execute("""
                ALTER TABLE order_items 
                MODIFY COLUMN image LONGTEXT NOT NULL
            """)
            print("✅ Updated order_items.image to LONGTEXT")
        except Exception as e:
            print(f"ℹ️ Skipped updating order_items.image: {e}")

        try:
            cursor.execute("""
                ALTER TABLE cart 
                MODIFY COLUMN image LONGTEXT NOT NULL
            """)
            print("✅ Updated cart.image to LONGTEXT")
        except Exception as e:
            print(f"ℹ️ Skipped updating cart.image: {e}")

        # Commit changes
        connection.commit()
        print("\n🎉 Database migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        connection.rollback()
        return False
    finally:
        connection.close()

def main():
    """Main migration function"""
    print("🔄 Starting database migration...")
    print("=" * 50)
    
    if add_missing_columns():
        print("\n✅ Migration completed successfully!")
        print("You can now restart your Flask application.")
    else:
        print("\n❌ Migration failed!")
        print("Please check the error messages above and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()




