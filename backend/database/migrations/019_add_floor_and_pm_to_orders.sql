-- Migration: Add floor and assigned_pm fields to orders table

ALTER TABLE `orders`
  ADD COLUMN `floor` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL AFTER `delivery_address`,
  ADD COLUMN `assigned_pm` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL AFTER `assigned_finance`;
