/*
# Seed demo data for SPA Management System

1. Inserts
- 3 demo employees (manager, receptionist, therapist roles)
- 6 demo services
- 5 demo customers
- 6 demo products
- Demo treatments and packages
- Demo appointments
- Demo invoices
2. Notes
- Uses ON CONFLICT DO NOTHING to be idempotent
- All data is Vietnamese
*/

-- ============ EMPLOYEES ============
INSERT INTO employees (full_name, phone, email, position, specialty, working_hours, hire_date, salary, status) VALUES
('Nguyễn Thị Hương', '0901234567', 'huong@serenespa.vn', 'Kỹ thuật viên', 'Chăm sóc da chuyên sâu', '8:00 - 17:00', '2022-03-15', 12000000, 'active'),
('Trần Thu Trang', '0902345678', 'trang@serenespa.vn', 'Kỹ thuật viên', 'Massage body', '9:00 - 18:00', '2021-07-01', 11000000, 'active'),
('Lê Ngọc Anh', '0903456789', 'anh@serenespa.vn', 'Lễ tân', 'Chăm sóc khách hàng', '8:00 - 16:00', '2023-01-10', 8000000, 'active'),
('Phạm Thị Dung', '0904567890', 'dung@serenespa.vn', 'Kỹ thuật viên', 'Gội đầu dưỡng sinh', '10:00 - 19:00', '2022-11-20', 10500000, 'active'),
('Hoàng Thị Mai', '0905678901', 'mai@serenespa.vn', 'Quản lý', 'Quản lý spa', '8:00 - 18:00', '2020-05-01', 20000000, 'active')
ON CONFLICT DO NOTHING;

-- ============ SERVICES ============
INSERT INTO services (name, description, duration, price, category, status) VALUES
('Chăm sóc da cơ bản', 'Làm sạch sâu, tẩy tế bào chết và dưỡng ẩm cơ bản cho da mặt', 60, 350000, 'Chăm sóc da', 'active'),
('Massage cổ vai gáy', 'Giảm đau mỏi cổ vai gáy, thư giãn cơ bằng kỹ thuật chuyên nghiệp', 45, 300000, 'Massage', 'active'),
('Chăm sóc da chuyên sâu', 'Liệu trình chăm sóc da toàn diện với serum cao cấp và mặt nạ dưỡng', 90, 650000, 'Chăm sóc da', 'active'),
('Gội đầu dưỡng sinh', 'Gội đầu thảo dược kết hợp massage da đầu thư giãn', 60, 280000, 'Gội đầu', 'active'),
('Massage body', 'Massage toàn thân giúp thư giãn, giảm stress và cải thiện tuần hoàn máu', 75, 500000, 'Body care', 'active'),
('Chăm sóc da mặt', 'Làm sạch chuyên sâu, trị mụn và dưỡng da mặt sáng khỏe', 70, 450000, 'Chăm sóc da', 'active')
ON CONFLICT (name) DO NOTHING;

-- ============ CUSTOMERS ============
INSERT INTO customers (full_name, phone, email, dob, gender, address, notes, loyalty_points, status) VALUES
('Nguyễn Thị Lan', '0912345001', 'lan.nt@email.com', '1990-05-15', 'female', '123 Nguyễn Văn Cừ, Q.1, TP.HCM', 'Khách quen, thích dịch vụ chăm sóc da', 320, 'active'),
('Trần Thị Mai', '0912345002', 'mai.tt@email.com', '1988-09-22', 'female', '45 Lê Lợi, Q.1, TP.HCM', NULL, 180, 'active'),
('Phạm Thu Hà', '0912345003', 'ha.pt@email.com', '1995-03-10', 'female', '78 Trần Hưng Đạo, Q.5, TP.HCM', 'Dị ứng với tinh dầu sả', 450, 'active'),
('Lê Minh Anh', '0912345004', 'anh.lm@email.com', '1992-11-30', 'female', '12 Điện Biên Phủ, Q.BT, TP.HCM', NULL, 90, 'active'),
('Hoàng Ngọc Linh', '0912345005', 'linh.hn@email.com', '1998-07-18', 'female', '56 Cách Mạng Tháng 8, Q.10, TP.HCM', 'Khách VIP, thường mua gói chăm sóc', 680, 'active')
ON CONFLICT (phone) DO NOTHING;

-- ============ PRODUCTS ============
INSERT INTO products (name, description, sale_price, cost_price, stock_quantity, category, supplier, status) VALUES
('Serum dưỡng da Vitamin C', 'Serum đặc trị giúp sáng da, mờ thâm nám', 450000, 280000, 25, 'Dưỡng da', 'Công ty Mỹ phẩm Hào', 'active'),
('Mặt nạ đất sét', 'Mặt nạ làm sạch sâu, kiểm soát bã nhờn', 220000, 130000, 40, 'Mỹ phẩm', 'Công ty Mỹ phẩm Hào', 'active'),
('Kem dưỡng ẩm cao cấp', 'Dưỡng ẩm sâu cho da khô và nhạy cảm', 580000, 350000, 15, 'Dưỡng da', 'Beauty Supply Co.', 'active'),
('Tinh dầu massage hoa hồng', 'Tinh dầu thiên nhiên cho massage body', 320000, 190000, 8, 'Mỹ phẩm', 'Tinh dầu Việt', 'active'),
('Sữa tắm dưỡng trắng', 'Sữa tắm dưỡng ẩm và làm sáng da', 180000, 95000, 60, 'Body care', 'Beauty Supply Co.', 'active'),
('Dầu gội thảo dược', 'Dầu gội thiên nhiên giúp giảm rụng tóc', 250000, 150000, 5, 'Mỹ phẩm', 'Tinh dầu Việt', 'active')
ON CONFLICT (name) DO NOTHING;

-- ============ TREATMENTS ============
INSERT INTO treatments (name, description, total_duration, total_price, status) VALUES
('Liệu trình chăm sóc da chuyên sâu', 'Liệu trình toàn diện cho làn da sáng khỏe, mờ thâm nám', 220, 1350000, 'active'),
('Liệu trình thư giãn toàn thân', 'Massage body và gội đầu dưỡng sinh giúp thư giãn hoàn toàn', 135, 780000, 'active')
ON CONFLICT (name) DO NOTHING;

-- Link treatment_details (services to treatments)
INSERT INTO treatment_details (treatment_id, service_id)
SELECT t.id, s.id FROM treatments t, services s
WHERE t.name = 'Liệu trình chăm sóc da chuyên sâu' AND s.name IN ('Chăm sóc da cơ bản', 'Chăm sóc da chuyên sâu', 'Chăm sóc da mặt')
ON CONFLICT DO NOTHING;

INSERT INTO treatment_details (treatment_id, service_id)
SELECT t.id, s.id FROM treatments t, services s
WHERE t.name = 'Liệu trình thư giãn toàn thân' AND s.name IN ('Massage body', 'Gội đầu dưỡng sinh', 'Massage cổ vai gáy')
ON CONFLICT DO NOTHING;

-- Update treatment totals from their services
UPDATE treatments t SET
  total_duration = COALESCE((SELECT SUM(s.duration) FROM treatment_details td JOIN services s ON s.id = td.service_id WHERE td.treatment_id = t.id), 0),
  total_price = COALESCE((SELECT SUM(s.price) FROM treatment_details td JOIN services s ON s.id = td.service_id WHERE td.treatment_id = t.id), 0);

-- ============ PACKAGES ============
INSERT INTO packages (name, description, sessions, price, expiry_days, discount_percent, status) VALUES
('Gói chăm sóc da 5 buổi', 'Gói 5 buổi chăm sóc da chuyên sâu, tiết kiệm 10%', 5, 6075000, 90, 10, 'active'),
('Gói thư giãn 3 buổi', 'Gói 3 buổi massage và gội đầu dưỡng sinh', 3, 2100000, 60, 10, 'active')
ON CONFLICT (name) DO NOTHING;

INSERT INTO package_details (package_id, treatment_id)
SELECT p.id, t.id FROM packages p, treatments t
WHERE p.name = 'Gói chăm sóc da 5 buổi' AND t.name = 'Liệu trình chăm sóc da chuyên sâu'
ON CONFLICT DO NOTHING;

INSERT INTO package_details (package_id, treatment_id)
SELECT p.id, t.id FROM packages p, treatments t
WHERE p.name = 'Gói thư giãn 3 buổi' AND t.name = 'Liệu trình thư giãn toàn thân'
ON CONFLICT DO NOTHING;

-- ============ APPOINTMENTS ============
INSERT INTO appointments (customer_id, therapist_id, appointment_date, start_time, end_time, status, notes)
SELECT c.id, e.id, CURRENT_DATE, '09:00', '10:00', 'confirmed', 'Khách đặt lịch trước 1 tuần'
FROM customers c, employees e
WHERE c.phone = '0912345001' AND e.full_name = 'Nguyễn Thị Hương'
ON CONFLICT DO NOTHING;

INSERT INTO appointments (customer_id, therapist_id, appointment_date, start_time, end_time, status, notes)
SELECT c.id, e.id, CURRENT_DATE, '10:30', '11:30', 'pending', NULL
FROM customers c, employees e
WHERE c.phone = '0912345002' AND e.full_name = 'Trần Thu Trang'
ON CONFLICT DO NOTHING;

INSERT INTO appointments (customer_id, therapist_id, appointment_date, start_time, end_time, status, notes)
SELECT c.id, e.id, CURRENT_DATE, '14:00', '15:30', 'completed', 'Khách hài lòng với dịch vụ'
FROM customers c, employees e
WHERE c.phone = '0912345005' AND e.full_name = 'Nguyễn Thị Hương'
ON CONFLICT DO NOTHING;

INSERT INTO appointments (customer_id, therapist_id, appointment_date, start_time, end_time, status, notes)
SELECT c.id, e.id, CURRENT_DATE - INTERVAL '1 day', '09:30', '10:30', 'completed', NULL
FROM customers c, employees e
WHERE c.phone = '0912345003' AND e.full_name = 'Phạm Thị Dung'
ON CONFLICT DO NOTHING;

INSERT INTO appointments (customer_id, therapist_id, appointment_date, start_time, end_time, status, notes)
SELECT c.id, e.id, CURRENT_DATE - INTERVAL '2 days', '13:00', '14:00', 'completed', NULL
FROM customers c, employees e
WHERE c.phone = '0912345004' AND e.full_name = 'Trần Thu Trang'
ON CONFLICT DO NOTHING;

-- Link appointment_details (services to appointments)
INSERT INTO appointment_details (appointment_id, service_id)
SELECT a.id, s.id FROM appointments a, services s, customers c
WHERE a.customer_id = c.id AND c.phone = '0912345001' AND s.name = 'Chăm sóc da cơ bản'
ON CONFLICT DO NOTHING;

INSERT INTO appointment_details (appointment_id, service_id)
SELECT a.id, s.id FROM appointments a, services s, customers c
WHERE a.customer_id = c.id AND c.phone = '0912345002' AND s.name = 'Massage cổ vai gáy'
ON CONFLICT DO NOTHING;

INSERT INTO appointment_details (appointment_id, service_id)
SELECT a.id, s.id FROM appointments a, services s, customers c
WHERE a.customer_id = c.id AND c.phone = '0912345005' AND s.name = 'Chăm sóc da chuyên sâu'
ON CONFLICT DO NOTHING;

INSERT INTO appointment_details (appointment_id, service_id)
SELECT a.id, s.id FROM appointments a, services s, customers c
WHERE a.customer_id = c.id AND c.phone = '0912345003' AND s.name = 'Gội đầu dưỡng sinh'
ON CONFLICT DO NOTHING;

INSERT INTO appointment_details (appointment_id, service_id)
SELECT a.id, s.id FROM appointments a, services s, customers c
WHERE a.customer_id = c.id AND c.phone = '0912345004' AND s.name = 'Massage body'
ON CONFLICT DO NOTHING;

-- ============ INVOICES ============
INSERT INTO invoices (customer_id, appointment_id, total_amount, paid_amount, payment_method, payment_status, notes)
SELECT c.id, a.id, 650000, 650000, 'cash', 'paid', NULL
FROM customers c, appointments a
WHERE c.phone = '0912345005' AND a.customer_id = c.id AND a.status = 'completed'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (customer_id, appointment_id, total_amount, paid_amount, payment_method, payment_status, notes)
SELECT c.id, a.id, 280000, 280000, 'transfer', 'paid', NULL
FROM customers c, appointments a
WHERE c.phone = '0912345003' AND a.customer_id = c.id AND a.status = 'completed'
ON CONFLICT DO NOTHING;

INSERT INTO invoices (customer_id, appointment_id, total_amount, paid_amount, payment_method, payment_status, notes)
SELECT c.id, a.id, 500000, 500000, 'card', 'paid', NULL
FROM customers c, appointments a
WHERE c.phone = '0912345004' AND a.customer_id = c.id AND a.status = 'completed'
ON CONFLICT DO NOTHING;

INSERT INTO invoice_details (invoice_id, item_type, item_id, item_name, quantity, unit_price)
SELECT i.id, 'service', s.id, s.name, 1, s.price
FROM invoices i, services s, customers c
WHERE i.customer_id = c.id AND c.phone = '0912345005' AND s.name = 'Chăm sóc da chuyên sâu'
ON CONFLICT DO NOTHING;

INSERT INTO invoice_details (invoice_id, item_type, item_id, item_name, quantity, unit_price)
SELECT i.id, 'service', s.id, s.name, 1, s.price
FROM invoices i, services s, customers c
WHERE i.customer_id = c.id AND c.phone = '0912345003' AND s.name = 'Gội đầu dưỡng sinh'
ON CONFLICT DO NOTHING;

INSERT INTO invoice_details (invoice_id, item_type, item_id, item_name, quantity, unit_price)
SELECT i.id, 'service', s.id, s.name, 1, s.price
FROM invoices i, services s, customers c
WHERE i.customer_id = c.id AND c.phone = '0912345004' AND s.name = 'Massage body'
ON CONFLICT DO NOTHING;
