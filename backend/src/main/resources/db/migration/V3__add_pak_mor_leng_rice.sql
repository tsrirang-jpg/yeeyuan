-- Add the three requested menu items without changing existing products or orders.
INSERT INTO category (id, store_id, name, sort_order)
VALUES ('05e09043-39d8-571b-8d2c-af6141647f98', '8cd892b7-b97e-3948-9ae4-479d3f4ef0fc', 'ข้าวและกับข้าว', 2);
UPDATE category SET sort_order = 3
WHERE id = 'b7713562-6742-3b69-9707-b9e3149dd155' AND sort_order = 2;

INSERT INTO product (id, category_id, name, description, price_satang, station)
VALUES ('c510d5a3-50db-58d0-ac42-6dbdddb3d87e', 'f1cf6551-4c70-3b0b-b59b-d2cdfc2d0a76', 'ปากหม้อญวน', '', 4000, 'FOOD');
INSERT INTO inventory_stock (product_id) VALUES ('c510d5a3-50db-58d0-ac42-6dbdddb3d87e');

INSERT INTO product (id, category_id, name, description, price_satang, station)
VALUES ('20467428-51c0-5cdc-b344-bdbc6eaf7ee8', '05e09043-39d8-571b-8d2c-af6141647f98', 'เล้งแซ่บ', '', 6000, 'FOOD');
INSERT INTO inventory_stock (product_id) VALUES ('20467428-51c0-5cdc-b344-bdbc6eaf7ee8');

INSERT INTO product (id, category_id, name, description, price_satang, station)
VALUES ('49d8cef3-5853-540a-9257-80cc5b93c1b6', '05e09043-39d8-571b-8d2c-af6141647f98', 'ข้าวสวย', '', 1000, 'FOOD');
INSERT INTO inventory_stock (product_id) VALUES ('49d8cef3-5853-540a-9257-80cc5b93c1b6');

UPDATE store SET catalog_version = catalog_version + 1 WHERE id = '8cd892b7-b97e-3948-9ae4-479d3f4ef0fc';
