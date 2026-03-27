-- Migration: Update orders table
-- Add pending_approval status, finance verification fields, assigned_finance

ALTER TABLE `orders`
  MODIFY COLUMN `status` enum('pending_approval','placed','assigned','dispatched','delivered','invoiced','cancelled')
    COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending_approval',
  ADD COLUMN `advance_verified` tinyint DEFAULT 0 AFTER `advance_upi_id`,
  ADD COLUMN `advance_verified_at` timestamp NULL DEFAULT NULL AFTER `advance_verified`,
  ADD COLUMN `advance_verified_by` char(36) DEFAULT NULL AFTER `advance_verified_at`,
  ADD COLUMN `balance_verified` tinyint DEFAULT 0 AFTER `balance_upi_id`,
  ADD COLUMN `balance_verified_at` timestamp NULL DEFAULT NULL AFTER `balance_verified`,
  ADD COLUMN `balance_verified_by` char(36) DEFAULT NULL AFTER `balance_verified_at`,
  ADD COLUMN `assigned_finance` char(36) DEFAULT NULL AFTER `assigned_to`;
