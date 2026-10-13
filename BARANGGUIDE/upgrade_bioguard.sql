-- BIOGUARD upgrade for existing BARANGGUIDE users and reports.
-- Import database_setup.sql FIRST if databases/tables do not exist.
-- This upgrade keeps all existing reports and accounts.
-- Tested syntax: MySQL 8 / MariaDB (dynamic ALTER instead of ADD COLUMN IF NOT EXISTS).

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='auth_db' AND table_name='users' AND column_name='official_verification');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `auth_db`.`users` ADD COLUMN `official_verification` ENUM(''pending'',''verified'',''rejected'') NOT NULL DEFAULT ''pending''', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='auth_db' AND table_name='users' AND column_name='official_reviewed_by');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `auth_db`.`users` ADD COLUMN `official_reviewed_by` INT UNSIGNED NULL', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='auth_db' AND table_name='users' AND column_name='official_reviewed_at');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `auth_db`.`users` ADD COLUMN `official_reviewed_at` DATETIME NULL', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='mappingproject' AND table_name='community_reports' AND column_name='risk_category');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `mappingproject`.`community_reports` ADD COLUMN `risk_category` VARCHAR(40) NOT NULL DEFAULT ''animal_transmitted''', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='mappingproject' AND table_name='community_reports' AND column_name='risk_detail');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `mappingproject`.`community_reports` ADD COLUMN `risk_detail` VARCHAR(100) NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='mappingproject' AND table_name='community_reports' AND column_name='photo_path');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `mappingproject`.`community_reports` ADD COLUMN `photo_path` VARCHAR(255) NULL', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='mappingproject' AND table_name='community_reports' AND column_name='verification_status');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `mappingproject`.`community_reports` ADD COLUMN `verification_status` ENUM(''pending'',''verified'',''rejected'') NOT NULL DEFAULT ''pending''', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='mappingproject' AND table_name='community_reports' AND column_name='verification_note');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `mappingproject`.`community_reports` ADD COLUMN `verification_note` VARCHAR(1000) NULL', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='mappingproject' AND table_name='community_reports' AND column_name='verified_by');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `mappingproject`.`community_reports` ADD COLUMN `verified_by` INT UNSIGNED NULL', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='mappingproject' AND table_name='community_reports' AND column_name='verified_at');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `mappingproject`.`community_reports` ADD COLUMN `verified_at` DATETIME NULL', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='mappingproject' AND table_name='interventions' AND column_name='scheduled_for');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `mappingproject`.`interventions` ADD COLUMN `scheduled_for` DATETIME NULL', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

SET @bg_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='auth_db' AND table_name='users' AND column_name='official_review_note');
SET @bg_sql = IF(@bg_exists=0, 'ALTER TABLE `auth_db`.`users` ADD COLUMN `official_review_note` VARCHAR(1000) NULL', 'SELECT 1');
PREPARE bg_change FROM @bg_sql;
EXECUTE bg_change;
DEALLOCATE PREPARE bg_change;

-- Legacy records are preserved but remain UNVERIFIED until reviewed.
UPDATE mappingproject.community_reports SET risk_detail=report_type WHERE risk_detail='';
UPDATE mappingproject.community_reports SET risk_category=CASE
 WHEN report_type IN ('Animal illness') THEN 'animal_disease'
 WHEN report_type IN ('Flooding','Stagnant water','Mosquito breeding','Waste / sanitation') THEN 'habitat_risk'
 ELSE 'animal_transmitted' END WHERE risk_category='animal_transmitted';
-- Existing report_type values longer than 60 characters would fail under the old column.
ALTER TABLE mappingproject.community_reports MODIFY COLUMN report_type VARCHAR(100) NOT NULL;
