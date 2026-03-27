-- Migration: Create visits table
-- Description: Creates the visits table for scheduling and tracking site visits

DROP TABLE IF EXISTS `visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visits` (
  `id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `project_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `site_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `visit_date` date NOT NULL,
  `visit_time` time NOT NULL,
  `status` enum('scheduled','completed','rejected') COLLATE utf8mb4_general_ci DEFAULT 'scheduled',
  `rejection_reason` text COLLATE utf8mb4_general_ci,
  `rejection_description` text COLLATE utf8mb4_general_ci,
  `rejected_by` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_site_schedule` (`site_id`,`visit_date`,`visit_time`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `visits_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `visits_ibfk_2` FOREIGN KEY (`site_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
