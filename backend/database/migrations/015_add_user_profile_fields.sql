-- Migration: Add user profile fields
-- Description: Adds Date of Joining, Date of Birth, Current Address, Permanent Address, and City fields to users table

ALTER TABLE `users`
ADD COLUMN `date_of_joining` DATE NULL DEFAULT NULL AFTER `created_at`,
ADD COLUMN `date_of_birth` DATE NULL DEFAULT NULL AFTER `date_of_joining`,
ADD COLUMN `current_address` TEXT NULL DEFAULT NULL AFTER `date_of_birth`,
ADD COLUMN `permanent_address` TEXT NULL DEFAULT NULL AFTER `current_address`,
ADD COLUMN `city` VARCHAR(100) NULL DEFAULT NULL AFTER `permanent_address`;

-- Update existing users with sample data
UPDATE `users` SET 
  `date_of_joining` = CASE 
    WHEN `role` = 'super_admin' THEN '2024-01-01'
    WHEN `role` = 'admin' THEN '2024-02-01'
    WHEN `role` = 'project_manager' THEN '2024-03-01'
    WHEN `role` = 'site_incharge' THEN '2024-04-01'
    WHEN `role` = 'finance' THEN '2024-05-01'
    WHEN `role` = 'customer' THEN '2024-06-01'
    ELSE '2024-01-01'
  END,
  `date_of_birth` = CASE 
    WHEN `id` = 'u1' THEN '1990-01-15'
    WHEN `id` = 'u2' THEN '1991-02-20'
    WHEN `id` = 'u3' THEN '1992-03-25'
    WHEN `id` = 'u4' THEN '1993-04-30'
    WHEN `id` = 'u5' THEN '1994-05-05'
    WHEN `id` = 'u6' THEN '1995-06-10'
    WHEN `id` = 'u7' THEN '1996-07-15'
    WHEN `id` = 'u8' THEN '1997-08-20'
    WHEN `id` = 'u9' THEN '1998-09-25'
    WHEN `id` = 'u10' THEN '1999-10-30'
    WHEN `id` = 'u11' THEN '2000-11-05'
    WHEN `id` = 'u12' THEN '2001-12-10'
    ELSE '1990-01-01'
  END,
  `current_address` = CASE 
    WHEN `role` = 'super_admin' THEN '123 Admin Street, Tech Park'
    WHEN `role` = 'admin' THEN '456 Management Avenue, Business District'
    WHEN `role` = 'project_manager' THEN '789 Project Lane, Construction Zone'
    WHEN `role` = 'site_incharge' THEN '101 Site Road, Industrial Area'
    WHEN `role` = 'finance' THEN '202 Finance Boulevard, Corporate Park'
    WHEN `role` = 'customer' THEN '303 Customer Circle, Residential Area'
    ELSE 'Sample Address'
  END,
  `permanent_address` = CASE 
    WHEN `role` = 'super_admin' THEN '123 Permanent Admin Street, Hometown'
    WHEN `role` = 'admin' THEN '456 Permanent Management Avenue, Hometown'
    WHEN `role` = 'project_manager' THEN '789 Permanent Project Lane, Hometown'
    WHEN `role` = 'site_incharge' THEN '101 Permanent Site Road, Hometown'
    WHEN `role` = 'finance' THEN '202 Permanent Finance Boulevard, Hometown'
    WHEN `role` = 'customer' THEN '303 Permanent Customer Circle, Hometown'
    ELSE 'Permanent Address'
  END,
  `city` = CASE 
    WHEN `role` = 'super_admin' THEN 'Bangalore'
    WHEN `role` = 'admin' THEN 'Bangalore'
    WHEN `role` = 'project_manager' THEN 'Mumbai'
    WHEN `role` = 'site_incharge' THEN 'Delhi'
    WHEN `role` = 'finance' THEN 'Chennai'
    WHEN `role` = 'customer' THEN 'Hyderabad'
    ELSE 'Bangalore'
  END
WHERE `is_active` = 1;