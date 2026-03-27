ALTER TABLE orders
  ADD COLUMN driver_name VARCHAR(100) DEFAULT NULL AFTER floor,
  ADD COLUMN driver_phone VARCHAR(20) DEFAULT NULL AFTER driver_name,
  ADD COLUMN vehicle_number VARCHAR(30) DEFAULT NULL AFTER driver_phone,
  ADD COLUMN project_id CHAR(36) DEFAULT NULL AFTER vehicle_number,
  ADD CONSTRAINT fk_orders_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
