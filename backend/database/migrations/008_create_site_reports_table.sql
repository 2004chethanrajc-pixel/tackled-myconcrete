-- Migration: Create site_reports table
-- Description: Creates the site_reports table for site inspection reports

DROP TABLE IF EXISTS `site_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_reports` (
  `id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `project_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `total_floors` int DEFAULT NULL,
  `dimensions` text COLLATE utf8mb4_general_ci,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `remarks` text COLLATE utf8mb4_general_ci,
  `approval_status` enum('pending','approved') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_project` (`project_id`),
  CONSTRAINT `site_reports_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `site_reports_chk_1` CHECK (json_valid(`images`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
