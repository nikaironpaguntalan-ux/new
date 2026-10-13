-- BARANGUIDE database setup
-- Run once in phpMyAdmin/MySQL. It creates the account/profile and map tables.

CREATE DATABASE IF NOT EXISTS auth_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS mappingproject
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE auth_db;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    identity ENUM('resident', 'government_official') NULL DEFAULT NULL,
    is_admin TINYINT(1) NOT NULL DEFAULT 0,
    official_verification ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    official_reviewed_by INT UNSIGNED NULL,
    official_reviewed_at DATETIME NULL,
    official_review_note VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- Safe for an existing MySQL 8 or MariaDB installation.
-- MySQL does not support ADD COLUMN IF NOT EXISTS on every version.
SET @has_identity = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema='auth_db' AND table_name='users' AND column_name='identity');
SET @sql = IF(@has_identity=0,
    "ALTER TABLE auth_db.users ADD COLUMN identity ENUM('resident', 'government_official') NULL DEFAULT NULL",
    "SELECT 1");
PREPARE update_users FROM @sql;
EXECUTE update_users;
DEALLOCATE PREPARE update_users;

SET @has_admin = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema='auth_db' AND table_name='users' AND column_name='is_admin');
SET @sql = IF(@has_admin=0,
    "ALTER TABLE auth_db.users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0",
    "SELECT 1");
PREPARE update_users FROM @sql;
EXECUTE update_users;
DEALLOCATE PREPARE update_users;

CREATE TABLE IF NOT EXISTS resident_profiles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    contact_number VARCHAR(30) NOT NULL,
    house_address VARCHAR(255) NOT NULL,
    barangay VARCHAR(120) NOT NULL,
    city VARCHAR(120) NOT NULL,
    province VARCHAR(120) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resident_user (user_id),
    CONSTRAINT fk_resident_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS government_profiles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    `position` VARCHAR(120) NOT NULL,
    government_office VARCHAR(180) NOT NULL,
    office_address VARCHAR(255) NOT NULL,
    barangay VARCHAR(120) NOT NULL,
    city VARCHAR(120) NOT NULL,
    province VARCHAR(120) NOT NULL,
    contact_number VARCHAR(30) NOT NULL,
    employee_id VARCHAR(100) NOT NULL,
    official_email VARCHAR(190) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_government_user (user_id),
    CONSTRAINT fk_government_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

USE mappingproject;

CREATE TABLE IF NOT EXISTS locationtagging (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    category VARCHAR(60) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_location_category (category)
) ENGINE=InnoDB;

-- BIOGUARD: Community reports. Every new report starts pending official verification.
CREATE TABLE IF NOT EXISTS community_reports (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    risk_category VARCHAR(40) NOT NULL DEFAULT 'animal_transmitted',
    risk_detail VARCHAR(100) NOT NULL DEFAULT '',
    photo_path VARCHAR(255) NULL,
    verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
    verification_note VARCHAR(1000) NULL,
    verified_by INT UNSIGNED NULL,
    verified_at DATETIME NULL,
    location_name VARCHAR(120) NOT NULL,
    severity ENUM('low', 'moderate', 'high', 'critical') NOT NULL DEFAULT 'moderate',
    description TEXT NOT NULL,
    status ENUM('pending', 'in_progress', 'resolved') NOT NULL DEFAULT 'pending',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_report_category (report_type),
    KEY idx_report_status (status)
) ENGINE=InnoDB;

-- NEW: Response actions attached to a specific report.
CREATE TABLE IF NOT EXISTS interventions (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    report_id INT UNSIGNED NOT NULL,
    agency VARCHAR(150) NOT NULL,
    action_taken TEXT NOT NULL,
    scheduled_for DATETIME NULL,
    status ENUM('planned', 'ongoing', 'completed') NOT NULL DEFAULT 'planned',
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_intervention_report (report_id),
    CONSTRAINT fk_intervention_report FOREIGN KEY (report_id)
        REFERENCES community_reports(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- IMPORTANT: If you have existing database tables, also run upgrade_bioguard.sql.
-- Initial and upgraded accounts are NOT automatically approved as government officials.
