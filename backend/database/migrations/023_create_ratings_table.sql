-- Migration: Create ratings table
-- Description: Allows customers to submit a star rating and feedback text for a closed project

CREATE TABLE IF NOT EXISTS `ratings` (
  `id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `project_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `customer_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `rating` tinyint(1) NOT NULL COMMENT '1 to 5 stars',
  `feedback` varchar(1500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Optional feedback text, max 300 words',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rating_project_customer` (`project_id`, `customer_id`),
  KEY `idx_ratings_project` (`project_id`),
  KEY `idx_ratings_customer` (`customer_id`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
