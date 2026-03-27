-- Migration: Create projects table
-- Description: Creates the projects table with status tracking and assignments

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `customer_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `pm_id` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `site_id` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `finance_id` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `location` text COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('CREATED','PM_ASSIGNED','VISIT_DONE','REPORT_SUBMITTED','QUOTATION_GENERATED','CUSTOMER_APPROVED','ADVANCE_PENDING','ADVANCE_PAID','WORK_STARTED','COMPLETED','FINAL_PAID','CLOSED') COLLATE utf8mb4_general_ci DEFAULT 'CREATED',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_projects_customer` (`customer_id`),
  KEY `idx_projects_pm` (`pm_id`),
  KEY `idx_projects_site` (`site_id`),
  KEY `idx_projects_finance` (`finance_id`),
  KEY `idx_projects_status` (`status`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `projects_ibfk_2` FOREIGN KEY (`pm_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `projects_ibfk_3` FOREIGN KEY (`site_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `projects_ibfk_4` FOREIGN KEY (`finance_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
