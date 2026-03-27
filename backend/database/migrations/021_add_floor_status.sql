-- Migration: Add status, status_updated_at, status_updated_by to project_floors

ALTER TABLE `project_floors`
  ADD COLUMN `status` ENUM('pending','started','paused','resumed','completed') NOT NULL DEFAULT 'pending' AFTER `site_incharge_id`,
  ADD COLUMN `status_updated_at` timestamp NULL DEFAULT NULL AFTER `status`,
  ADD COLUMN `status_updated_by` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL AFTER `status_updated_at`;

CREATE TABLE IF NOT EXISTS `project_floor_logs` (
  `id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `floor_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `project_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `status` ENUM('pending','started','paused','resumed','completed') NOT NULL,
  `note` text COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_by` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_floor_logs_floor` (`floor_id`),
  CONSTRAINT `floor_logs_ibfk_1` FOREIGN KEY (`floor_id`) REFERENCES `project_floors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `floor_logs_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
