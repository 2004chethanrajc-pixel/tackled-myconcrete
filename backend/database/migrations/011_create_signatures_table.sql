-- Migration: Create signatures table
-- Description: Creates the signatures table for customer project signatures

DROP TABLE IF EXISTS `signatures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `signatures` (
  `id` varchar(36) COLLATE utf8mb4_general_ci NOT NULL,
  `project_id` varchar(36) COLLATE utf8mb4_general_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_general_ci NOT NULL,
  `signature_path` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `signature_type` enum('drawn','uploaded') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'uploaded',
  `signed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_project_signature` (`project_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `signatures_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `signatures_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
