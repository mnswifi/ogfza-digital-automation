CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  email NVARCHAR(255) NOT NULL UNIQUE,
  password NVARCHAR(255) NOT NULL,
  full_name NVARCHAR(255) NOT NULL,
  role NVARCHAR(100) NOT NULL,
  operational_unit NVARCHAR(255) NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  must_change_password BIT NOT NULL DEFAULT 0,
  otp_code NVARCHAR(50) NULL
);

CREATE TABLE companies (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  license_no NVARCHAR(255) UNIQUE NULL,
  tin NVARCHAR(255) NULL,
  sector NVARCHAR(255) NULL,
  type NVARCHAR(255) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Active',
  joined_date DATE NULL,
  lease_info NVARCHAR(MAX) NULL,
  representative_email NVARCHAR(255) NULL
);

CREATE TABLE permits (
  id INT IDENTITY(1,1) PRIMARY KEY,
  company_id INT NULL,
  permit_type NVARCHAR(255) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Pending',
  applied_date DATE NULL,
  expiry_date DATE NULL,
  document_url NVARCHAR(MAX) NULL,
  CONSTRAINT FK_permits_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE compliance (
  id INT IDENTITY(1,1) PRIMARY KEY,
  company_id INT NULL,
  audit_date DATE NULL,
  inspector NVARCHAR(255) NULL,
  findings NVARCHAR(MAX) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Scheduled',
  penalty_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  CONSTRAINT FK_compliance_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE assets (
  id INT IDENTITY(1,1) PRIMARY KEY,
  asset_name NVARCHAR(255) NULL,
  type NVARCHAR(100) NULL,
  location_coordinates NVARCHAR(255) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Operational',
  maintenance_date DATE NULL
);

CREATE TABLE revenue (
  id INT IDENTITY(1,1) PRIMARY KEY,
  company_id INT NULL,
  amount DECIMAL(18,2) NULL,
  description NVARCHAR(MAX) NULL,
  payment_date DATE NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Paid',
  invoice_no NVARCHAR(255) NULL,
  CONSTRAINT FK_revenue_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE operations (
  id INT IDENTITY(1,1) PRIMARY KEY,
  field_name NVARCHAR(255) NOT NULL,
  production_volume DECIMAL(18,2) NOT NULL DEFAULT 0,
  downtime_hours DECIMAL(18,2) NOT NULL DEFAULT 0,
  report_date DATE NULL
);

CREATE TABLE incidents (
  id INT IDENTITY(1,1) PRIMARY KEY,
  company_name NVARCHAR(255) NULL,
  incident_type NVARCHAR(255) NULL,
  severity NVARCHAR(100) NULL,
  description NVARCHAR(MAX) NULL,
  reported_by NVARCHAR(255) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Open',
  reported_date DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE employees (
  id INT IDENTITY(1,1) PRIMARY KEY,
  full_name NVARCHAR(255) NOT NULL,
  department NVARCHAR(255) NULL,
  position NVARCHAR(255) NULL,
  zone NVARCHAR(255) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Active',
  hire_date DATE NULL,
  email NVARCHAR(255) NULL,
  phone NVARCHAR(50) NULL,
  company NVARCHAR(255) NULL
);

CREATE TABLE attendance (
  id INT IDENTITY(1,1) PRIMARY KEY,
  employee_id INT NULL,
  [date] DATE NULL,
  shift NVARCHAR(100) NULL,
  check_in NVARCHAR(50) NULL,
  check_out NVARCHAR(50) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Present',
  CONSTRAINT FK_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE certifications (
  id INT IDENTITY(1,1) PRIMARY KEY,
  employee_id INT NULL,
  cert_name NVARCHAR(255) NOT NULL,
  issued_date DATE NULL,
  expiry_date DATE NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Valid',
  CONSTRAINT FK_certifications_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE shifts (
  id INT IDENTITY(1,1) PRIMARY KEY,
  shift_name NVARCHAR(255) NULL,
  zone NVARCHAR(255) NULL,
  start_time NVARCHAR(50) NULL,
  end_time NVARCHAR(50) NULL,
  capacity INT NOT NULL DEFAULT 20,
  assigned INT NOT NULL DEFAULT 0
);

CREATE TABLE contractors (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  category NVARCHAR(100) NULL,
  representative NVARCHAR(255) NULL,
  email NVARCHAR(255) NULL UNIQUE,
  phone NVARCHAR(50) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Active',
  joined_date DATE NULL
);

CREATE TABLE contractor_documents (
  id INT IDENTITY(1,1) PRIMARY KEY,
  contractor_id INT NULL,
  doc_type NVARCHAR(255) NULL,
  file_name NVARCHAR(255) NULL,
  upload_date DATE NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Uploaded',
  CONSTRAINT FK_contractor_documents_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id)
);

CREATE TABLE work_orders (
  id INT IDENTITY(1,1) PRIMARY KEY,
  contractor_id INT NULL,
  title NVARCHAR(255) NULL,
  description NVARCHAR(MAX) NULL,
  location NVARCHAR(255) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Assigned',
  CONSTRAINT FK_work_orders_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id)
);

CREATE TABLE equipment_maintenance (
  id INT IDENTITY(1,1) PRIMARY KEY,
  asset_id INT NULL,
  maintenance_type NVARCHAR(255) NULL,
  description NVARCHAR(MAX) NULL,
  technician NVARCHAR(255) NULL,
  cost DECIMAL(18,2) NOT NULL DEFAULT 0,
  maintenance_date DATE NULL,
  next_due_date DATE NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Completed',
  CONSTRAINT FK_equipment_maintenance_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE TABLE team_members (
  id INT IDENTITY(1,1) PRIMARY KEY,
  full_name NVARCHAR(255) NOT NULL,
  role NVARCHAR(255) NULL,
  responsibilities NVARCHAR(MAX) NULL,
  department NVARCHAR(255) NOT NULL DEFAULT 'Change Management',
  status NVARCHAR(100) NOT NULL DEFAULT 'Active'
);