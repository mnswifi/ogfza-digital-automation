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
  license_no NVARCHAR(255) NULL,
  license_type NVARCHAR(100) NULL,
  tin NVARCHAR(255) NULL,
  sector NVARCHAR(255) NULL,
  type NVARCHAR(255) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Active',
  joined_date DATE NULL,
  lease_info NVARCHAR(MAX) NULL,
  representative_email NVARCHAR(255) NULL
);

CREATE UNIQUE INDEX UX_companies_license_no_non_null
  ON companies(license_no)
  WHERE license_no IS NOT NULL;

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

CREATE TABLE company_compliance_cases (
  id INT IDENTITY(1,1) PRIMARY KEY,
  company_id INT NOT NULL,
  case_type NVARCHAR(50) NOT NULL,
  title NVARCHAR(255) NOT NULL,
  document_type NVARCHAR(255) NULL,
  severity NVARCHAR(100) NULL,
  request_note NVARCHAR(MAX) NOT NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Open',
  due_date DATE NULL,
  requested_by_user_id INT NULL,
  requested_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  contractor_response_note NVARCHAR(MAX) NULL,
  contractor_response_file_name NVARCHAR(255) NULL,
  contractor_response_submitted_at DATETIME2 NULL,
  contractor_response_submitted_by_user_id INT NULL,
  review_note NVARCHAR(MAX) NULL,
  returned_at DATETIME2 NULL,
  returned_by_user_id INT NULL,
  resolved_at DATETIME2 NULL,
  resolved_by_user_id INT NULL,
  closed_at DATETIME2 NULL,
  closed_by_user_id INT NULL,
  updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  legacy_compliance_id INT NULL,
  CONSTRAINT FK_company_compliance_cases_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT FK_company_compliance_cases_requested_by FOREIGN KEY (requested_by_user_id) REFERENCES users(id),
  CONSTRAINT FK_company_compliance_cases_contractor_response_by FOREIGN KEY (contractor_response_submitted_by_user_id) REFERENCES users(id),
  CONSTRAINT FK_company_compliance_cases_returned_by FOREIGN KEY (returned_by_user_id) REFERENCES users(id),
  CONSTRAINT FK_company_compliance_cases_resolved_by FOREIGN KEY (resolved_by_user_id) REFERENCES users(id),
  CONSTRAINT FK_company_compliance_cases_closed_by FOREIGN KEY (closed_by_user_id) REFERENCES users(id),
  CONSTRAINT CK_company_compliance_cases_type CHECK (case_type IN ('DocumentUpdate', 'AuditFinding')),
  CONSTRAINT CK_company_compliance_cases_status CHECK (status IN ('Open', 'Response Submitted', 'Returned', 'Resolved', 'Closed'))
);

CREATE INDEX IX_company_compliance_cases_company_status
  ON company_compliance_cases(company_id, status);

CREATE INDEX IX_company_compliance_cases_due_date
  ON company_compliance_cases(due_date);

CREATE UNIQUE INDEX UX_company_compliance_cases_legacy_compliance_id
  ON company_compliance_cases(legacy_compliance_id)
  WHERE legacy_compliance_id IS NOT NULL;

CREATE TABLE company_compliance_case_events (
  id INT IDENTITY(1,1) PRIMARY KEY,
  case_id INT NOT NULL,
  event_type NVARCHAR(100) NOT NULL,
  actor_user_id INT NULL,
  actor_name NVARCHAR(255) NULL,
  actor_role NVARCHAR(100) NULL,
  from_status NVARCHAR(100) NULL,
  to_status NVARCHAR(100) NULL,
  note NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_company_compliance_case_events_case FOREIGN KEY (case_id) REFERENCES company_compliance_cases(id),
  CONSTRAINT FK_company_compliance_case_events_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IX_company_compliance_case_events_case_id
  ON company_compliance_case_events(case_id, created_at);

CREATE TABLE assets (
  id INT IDENTITY(1,1) PRIMARY KEY,
  company_id INT NULL,
  asset_name NVARCHAR(255) NULL,
  type NVARCHAR(100) NULL,
  location_coordinates NVARCHAR(255) NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Operational',
  maintenance_date DATE NULL,
  CONSTRAINT FK_assets_company FOREIGN KEY (company_id) REFERENCES companies(id)
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
  asset_id INT NULL,
  field_name NVARCHAR(255) NOT NULL,
  production_volume DECIMAL(18,2) NOT NULL DEFAULT 0,
  downtime_hours DECIMAL(18,2) NOT NULL DEFAULT 0,
  report_date DATE NULL,
  notes NVARCHAR(MAX) NULL,
  CONSTRAINT FK_operations_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE TABLE incidents (
  id INT IDENTITY(1,1) PRIMARY KEY,
  company_id INT NULL,
  asset_id INT NULL,
  company_name NVARCHAR(255) NULL,
  incident_type NVARCHAR(255) NULL,
  severity NVARCHAR(100) NULL,
  description NVARCHAR(MAX) NULL,
  reported_by NVARCHAR(255) NULL,
  reported_by_user_id INT NULL,
  status NVARCHAR(100) NOT NULL DEFAULT 'Open',
  reported_date DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  follow_up_note NVARCHAR(MAX) NULL,
  follow_up_submitted_at DATETIME2 NULL,
  follow_up_submitted_by_user_id INT NULL,
  resolved_at DATETIME2 NULL,
  resolved_by_user_id INT NULL,
  closed_at DATETIME2 NULL,
  closed_by_user_id INT NULL,
  updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_incidents_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT FK_incidents_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
  CONSTRAINT FK_incidents_reported_by FOREIGN KEY (reported_by_user_id) REFERENCES users(id),
  CONSTRAINT FK_incidents_follow_up_by FOREIGN KEY (follow_up_submitted_by_user_id) REFERENCES users(id),
  CONSTRAINT FK_incidents_resolved_by FOREIGN KEY (resolved_by_user_id) REFERENCES users(id),
  CONSTRAINT FK_incidents_closed_by FOREIGN KEY (closed_by_user_id) REFERENCES users(id)
);

CREATE TABLE incident_events (
  id INT IDENTITY(1,1) PRIMARY KEY,
  incident_id INT NOT NULL,
  event_type NVARCHAR(100) NOT NULL,
  actor_user_id INT NULL,
  actor_name NVARCHAR(255) NULL,
  actor_role NVARCHAR(100) NULL,
  from_status NVARCHAR(100) NULL,
  to_status NVARCHAR(100) NULL,
  note NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT FK_incident_events_incident FOREIGN KEY (incident_id) REFERENCES incidents(id),
  CONSTRAINT FK_incident_events_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
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
