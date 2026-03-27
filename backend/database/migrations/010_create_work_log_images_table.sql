-- Migration: Create work_log_images table
-- Description: Creates the work_log_images table for storing work log images

DROP TABLE IF EXISTS `work_log_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_log_images` (
  `id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `work_log_id` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `image_path` text COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `work_log_id` (`work_log_id`),
  CONSTRAINT `work_log_images_ibfk_1` FOREIGN KEY (`work_log_id`) REFERENCES `work_logs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
