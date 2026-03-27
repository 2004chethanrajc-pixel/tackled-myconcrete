-- Migration: Create project_floors table
-- Description: Allows admin to define floors for a project, PM assigns site incharge per floor

CREATE TABLE IF NOT EXISTS `project_floors` (
  `id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `project_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `floor_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `site_incharge_id` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_by` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_floors_project` (`project_id`),
  KEY `idx_floors_site` (`site_incharge_id`),
  CONSTRAINT `project_floors_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_floors_ibfk_2` FOREIGN KEY (`site_incharge_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `project_floors_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
