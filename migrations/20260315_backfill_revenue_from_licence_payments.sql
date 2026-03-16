SET NOCOUNT ON;

INSERT INTO dbo.revenue (
    company_id,
    amount,
    description,
    payment_date,
    status,
    invoice_no
)
SELECT
    c.id AS company_id,
    COALESCE(a.approved_fee_usd, a.estimated_fee_usd, 0) AS amount,
    CONCAT(
        COALESCE(
            a.approved_license_type,
            a.requested_license_type,
            c.license_type,
            'Free Zone Licence'
        ),
        ' Fee'
    ) AS description,
    CAST(
        COALESCE(
            a.payment_confirmed_at,
            a.updated_at,
            a.approved_at,
            a.submitted_at,
            SYSDATETIME()
        ) AS DATE
    ) AS payment_date,
    'Paid' AS status,
    CONCAT(
        'LIC-',
        COALESCE(
            NULLIF(c.license_no, ''),
            CONCAT('APP-', a.id)
        )
    ) AS invoice_no
FROM dbo.company_applications a
INNER JOIN dbo.companies c
    ON c.approved_application_id = a.id
WHERE a.status = 'Licence Issued'
  AND a.payment_status = 'Paid'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.revenue r
      WHERE r.invoice_no = CONCAT(
          'LIC-',
          COALESCE(
              NULLIF(c.license_no, ''),
              CONCAT('APP-', a.id)
          )
      )
  );
