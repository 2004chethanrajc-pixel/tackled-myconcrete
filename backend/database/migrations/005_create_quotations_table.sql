-- Migration: Create quotations table
-- Description: Creates the quotations table for project cost estimates

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotations` (
  `id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `project_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `material_cost` decimal(12,2) DEFAULT '0.00',
  `labour_cost` decimal(12,2) DEFAULT '0.00',
  `transport_cost` decimal(12,2) DEFAULT '0.00',
  `other_cost` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(12,2) NOT NULL,
  `advance_amount` decimal(12,2) DEFAULT '0.00',
  `generated_by` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `approved` tinyint DEFAULT '0',
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `generated_by` (`generated_by`),
  KEY `idx_quotation_project` (`project_id`),
  CONSTRAINT `quotations_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotations_ibfk_2` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
