import type {
    CompanyApplicationDetail,
    CompanyApplicationEvent,
    CompanyApplicationDocument,
    CompanyDetail,
    ComplianceCaseDetail,
    ComplianceCaseEvent,
    IncidentDetail,
    IncidentEvent,
    TradeOperationDocument,
    TradeOperationEvent,
    TradeOperationRequestDetail,
} from '@/middleware/types.middleware';
import {
    companyApplicationDocumentCatalog,
    getCompanyApplicationDocumentRequirements,
} from '@/src/constants/companyApplication';
import {
    getTradeOperationDocumentRequirements,
    getTradeOperationService,
    tradeOperationDocumentCatalog,
} from '@/src/constants/tradeOperations';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

export type PrintBadge = {
    label: string;
    tone?: BadgeTone;
};

export type PrintField = {
    label: string;
    value?: string | number | null;
    fullWidth?: boolean;
    mono?: boolean;
};

export type PrintReportSection =
    | {
        title: string;
        kind: 'fields';
        columns?: 2 | 3;
        fields: Array<PrintField | null | false | undefined>;
    }
    | {
        title: string;
        kind: 'text';
        value?: string | number | null;
    }
    | {
        title: string;
        kind: 'table';
        headers: string[];
        rows: Array<Array<string | number | null | undefined>>;
    };

type LicenceCertificateRecord = {
    companyName: string;
    licenseNo?: string | null;
    licenseType?: string | null;
    freeZoneLocation?: string | null;
    issuedOn?: string | null;
    approvedBy?: string | null;
    applicationReference?: string | null;
};

type LicencePaymentReceiptRecord = {
    companyName: string;
    applicationReference?: string | null;
    licenseNo?: string | null;
    licenseType?: string | null;
    amountPaid?: string | number | null;
    paymentReference?: string | null;
    paymentStatus?: string | null;
    paymentSubmittedOn?: string | null;
    paymentSubmittedBy?: string | null;
    paymentConfirmedOn?: string | null;
    paymentConfirmedBy?: string | null;
};

const printStyles = `
    @page {
        size: A4;
        margin: 12mm;
    }

    :root {
        color-scheme: light;
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        padding: 32px;
        font-family: "Georgia", "Times New Roman", serif;
        color: #101010;
        background: #faf8f3;
    }

    .print-shell {
        max-width: 980px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #d9d6ce;
        padding: 32px;
    }

    .header {
        border-bottom: 1px solid #d9d6ce;
        padding-bottom: 20px;
        margin-bottom: 24px;
    }

    .kicker {
        margin: 0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.35em;
        color: #707070;
    }

    .title {
        margin: 12px 0 0;
        font-size: 32px;
        line-height: 1.1;
        font-style: italic;
        font-weight: 600;
    }

    .subtitle {
        margin: 12px 0 0;
        font-size: 15px;
        line-height: 1.6;
        color: #3b3b3b;
    }

    .meta-row,
    .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
    }

    .meta-pill,
    .badge {
        display: inline-flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        border: 1px solid #d9d6ce;
        background: #f4f1eb;
        color: #313131;
    }

    .badge.success {
        background: #e8f8ef;
        border-color: #bfe4cf;
        color: #16643d;
    }

    .badge.warning {
        background: #fff5df;
        border-color: #f2d49a;
        color: #8a5a00;
    }

    .badge.danger {
        background: #fdeaea;
        border-color: #f1c0c0;
        color: #a22323;
    }

    .section {
        margin-top: 24px;
        break-inside: auto;
        page-break-inside: auto;
    }

    .section-title {
        margin: 0 0 12px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.26em;
        color: #666666;
    }

    .section-copy {
        margin: 0;
        font-size: 14px;
        line-height: 1.8;
        color: #1c1c1c;
        white-space: pre-wrap;
    }

    .statement {
        margin: 0;
        font-size: 18px;
        line-height: 1.8;
        color: #1c1c1c;
    }

    .statement strong {
        font-weight: 700;
    }

    .field-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: start;
        grid-auto-rows: min-content;
    }

    .field-grid.grid-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .field-card {
        border: 1px solid #d9d6ce;
        padding: 10px 12px;
        background: #ffffff;
        min-height: 0;
        height: auto;
        break-inside: avoid;
        page-break-inside: avoid;
        align-self: start;
    }

    .field-card.full-width {
        grid-column: 1 / -1;
    }

    .field-label {
        margin: 0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: #777777;
    }

    .field-value {
        margin: 8px 0 0;
        font-size: 13px;
        line-height: 1.5;
        color: #1d1d1d;
        white-space: pre-wrap;
        word-break: break-word;
    }

    .field-value.mono {
        font-family: "Courier New", monospace;
        font-size: 13px;
    }

    .two-column {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: start;
    }

    .panel {
        border: 1px solid #d9d6ce;
        padding: 16px;
        background: #ffffff;
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .panel-title {
        margin: 0 0 12px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: #777777;
    }

    .table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
    }

    .table th,
    .table td {
        border: 1px solid #d9d6ce;
        padding: 10px 12px;
        vertical-align: top;
        text-align: left;
        font-size: 13px;
        line-height: 1.6;
    }

    .table th {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: #666666;
        background: #f7f4ee;
    }

    .table tr {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .timeline {
        display: grid;
        gap: 12px;
        page-break-inside: auto;
    }

    .timeline-card {
        border: 1px solid #d9d6ce;
        padding: 14px;
        background: #ffffff;
        page-break-inside: avoid;
    }

    .timeline-top {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 8px;
        align-items: flex-start;
    }

    .timeline-title {
        margin: 0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: #666666;
    }

    .timeline-time {
        margin: 0;
        font-family: "Courier New", monospace;
        font-size: 10px;
        color: #777777;
    }

    .timeline-actor {
        margin: 10px 0 0;
        font-size: 14px;
        font-weight: 700;
    }

    .timeline-transition {
        margin: 8px 0 0;
        font-size: 12px;
        color: #555555;
    }

    .timeline-note {
        margin: 10px 0 0;
        font-size: 13px;
        line-height: 1.7;
        white-space: pre-wrap;
    }

    .footer-note {
        margin-top: 28px;
        padding-top: 16px;
        border-top: 1px solid #d9d6ce;
        font-size: 12px;
        line-height: 1.7;
        color: #555555;
    }

    .empty-state {
        border: 1px dashed #d9d6ce;
        padding: 18px;
        font-size: 13px;
        color: #666666;
        background: #fbfaf8;
    }

    @media print {
        body {
            padding: 0;
            background: #ffffff;
        }

        .print-shell {
            max-width: none;
            border: 0;
            padding: 0;
        }

        .header {
            padding-bottom: 16px;
            margin-bottom: 18px;
        }

        .title {
            font-size: 28px;
        }

        .subtitle {
            font-size: 13px;
            line-height: 1.45;
        }

        .meta-row,
        .badge-row {
            gap: 6px;
            margin-top: 10px;
        }

        .meta-pill,
        .badge {
            padding: 6px 10px;
            font-size: 9px;
        }

        .section {
            margin-top: 16px;
        }

        .section-title {
            margin-bottom: 8px;
            font-size: 10px;
        }

        .section-copy,
        .statement {
            font-size: 12px;
            line-height: 1.5;
        }

        .field-grid.grid-3 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .field-card {
            padding: 8px 10px;
        }

        .field-label {
            font-size: 9px;
        }

        .field-value {
            margin-top: 6px;
            font-size: 11px;
            line-height: 1.4;
        }

        .field-value.mono {
            font-size: 10px;
        }

        .two-column {
            grid-template-columns: 1fr;
            gap: 10px;
        }

        .panel {
            padding: 10px;
        }

        .panel-title {
            margin-bottom: 8px;
            font-size: 9px;
        }

        .table th,
        .table td {
            padding: 6px 8px;
            font-size: 10px;
            line-height: 1.35;
        }

        .table th {
            font-size: 8px;
        }

        .timeline {
            gap: 8px;
        }

        .timeline-card {
            padding: 10px;
        }

        .timeline-actor,
        .timeline-note,
        .timeline-transition {
            font-size: 11px;
            line-height: 1.4;
        }

        .footer-note {
            margin-top: 16px;
            padding-top: 12px;
            font-size: 10px;
            line-height: 1.45;
        }
    }
`;

const badgeToneClasses: Record<BadgeTone, string> = {
    neutral: 'neutral',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
};

const escapeHtml = (value: string) => (
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

const toDisplayValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') {
        return '--';
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toLocaleString() : '--';
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '--';
};

const formatDate = (value?: string | null) => {
    if (!value) return '--';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
};

const formatDateTime = (value?: string | null) => {
    if (!value) return '--';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(parsed);
};

const formatUsd = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return '--';

    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) return '--';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericValue);
};

const renderBadges = (badges: PrintBadge[]) => {
    if (!badges.length) return '';

    return `
        <div class="badge-row">
            ${badges.map((badge) => (
                `<span class="badge ${badgeToneClasses[badge.tone || 'neutral']}">${escapeHtml(badge.label)}</span>`
            )).join('')}
        </div>
    `;
};

const renderFieldGrid = (
    fields: Array<PrintField | null | false | undefined>,
    columns: 2 | 3 = 2
) => {
    const validFields = fields.filter(Boolean) as PrintField[];

    if (!validFields.length) {
        return '<div class="empty-state">No record details were available for this section.</div>';
    }

    return `
        <div class="field-grid grid-${columns}">
            ${validFields.map((field) => (
                `<div class="field-card ${field.fullWidth ? 'full-width' : ''}">
                    <p class="field-label">${escapeHtml(field.label)}</p>
                    <p class="field-value ${field.mono ? 'mono' : ''}">${escapeHtml(toDisplayValue(field.value))}</p>
                </div>`
            )).join('')}
        </div>
    `;
};

const renderSection = (title: string, content: string) => `
    <section class="section">
        <h2 class="section-title">${escapeHtml(title)}</h2>
        ${content}
    </section>
`;

const renderTextSection = (title: string, value?: string | number | null) => renderSection(
    title,
    `<p class="section-copy">${escapeHtml(toDisplayValue(value))}</p>`
);

const renderTwoPanelSection = (
    title: string,
    leftTitle: string,
    leftFields: Array<PrintField | null | false | undefined>,
    rightTitle: string,
    rightFields: Array<PrintField | null | false | undefined>,
) => renderSection(
    title,
    `<div class="two-column">
        <div class="panel">
            <h3 class="panel-title">${escapeHtml(leftTitle)}</h3>
            ${renderFieldGrid(leftFields, 2)}
        </div>
        <div class="panel">
            <h3 class="panel-title">${escapeHtml(rightTitle)}</h3>
            ${renderFieldGrid(rightFields, 2)}
        </div>
    </div>`
);

const renderTable = (headers: string[], rows: string[][]) => {
    if (!rows.length) {
        return '<div class="empty-state">No records were provided.</div>';
    }

    return `
        <table class="table">
            <thead>
                <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${rows.map((row) => (
                    `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
                )).join('')}
            </tbody>
        </table>
    `;
};

type TimelineEntry = {
    title: string;
    actor?: string | null;
    timestamp?: string | null;
    transition?: string | null;
    note?: string | null;
};

const renderTimeline = (entries: TimelineEntry[]) => {
    if (!entries.length) {
        return '<div class="empty-state">No workflow activity has been recorded for this record yet.</div>';
    }

    return `
        <div class="timeline">
            ${entries.map((entry) => `
                <article class="timeline-card">
                    <div class="timeline-top">
                        <p class="timeline-title">${escapeHtml(entry.title)}</p>
                        <p class="timeline-time">${escapeHtml(formatDateTime(entry.timestamp))}</p>
                    </div>
                    <p class="timeline-actor">${escapeHtml(toDisplayValue(entry.actor))}</p>
                    ${entry.transition ? `<p class="timeline-transition">${escapeHtml(entry.transition)}</p>` : ''}
                    ${entry.note ? `<p class="timeline-note">${escapeHtml(toDisplayValue(entry.note))}</p>` : ''}
                </article>
            `).join('')}
        </div>
    `;
};

const openPrintDocument = ({
    documentTitle,
    kicker,
    title,
    subtitle,
    reference,
    badges = [],
    body,
    footerNote,
}: {
    documentTitle: string;
    kicker: string;
    title: string;
    subtitle?: string;
    reference?: string;
    badges?: PrintBadge[];
    body: string;
    footerNote?: string;
}) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    const printDocument = printWindow?.document;

    if (!printWindow || !printDocument) {
        iframe.remove();
        window.alert('Printing is not available in this browser session right now.');
        return;
    }

    const html = `
        <!doctype html>
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>${escapeHtml(documentTitle)}</title>
                <style>${printStyles}</style>
            </head>
            <body>
                <main class="print-shell">
                    <header class="header">
                        <p class="kicker">${escapeHtml(kicker)}</p>
                        <h1 class="title">${escapeHtml(title)}</h1>
                        ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
                        <div class="meta-row">
                            ${reference ? `<span class="meta-pill">${escapeHtml(reference)}</span>` : ''}
                            <span class="meta-pill">Generated ${escapeHtml(formatDateTime(new Date().toISOString()))}</span>
                        </div>
                        ${renderBadges(badges)}
                    </header>

                    ${body}

                    ${footerNote ? `<p class="footer-note">${escapeHtml(footerNote)}</p>` : ''}
                </main>
            </body>
        </html>
    `;

    const cleanup = () => {
        window.setTimeout(() => {
            iframe.remove();
        }, 500);
    };

    printWindow.onafterprint = cleanup;

    printDocument.open();
    printDocument.write(html);
    printDocument.close();

    window.setTimeout(() => {
        try {
            printWindow.focus();
            printWindow.print();
        } finally {
            cleanup();
        }
    }, 400);
};

export const printStructuredReport = ({
    documentTitle,
    kicker,
    title,
    subtitle,
    reference,
    badges = [],
    sections,
    footerNote,
}: {
    documentTitle: string;
    kicker: string;
    title: string;
    subtitle?: string;
    reference?: string;
    badges?: PrintBadge[];
    sections: PrintReportSection[];
    footerNote?: string;
}) => {
    const body = sections.map((section) => {
        if (section.kind === 'fields') {
            return renderSection(
                section.title,
                renderFieldGrid(section.fields, section.columns || 2)
            );
        }

        if (section.kind === 'text') {
            return renderTextSection(section.title, section.value);
        }

        return renderSection(
            section.title,
            renderTable(
                section.headers,
                section.rows.map((row) => row.map((cell) => toDisplayValue(cell)))
            )
        );
    }).join('');

    openPrintDocument({
        documentTitle,
        kicker,
        title,
        subtitle,
        reference,
        badges,
        body,
        footerNote,
    });
};

const formatCompanyApplicationStatus = (value?: string | null) => {
    if (!value) return '--';
    if (value === 'Returned') return 'Queried';
    if (value === 'Awaiting Admin Approval') return 'Awaiting MD Approval';
    if (value === 'Approved Pending Payment') return 'Awaiting Contractor Payment';
    if (value === 'Payment Submitted') return 'Awaiting Payment Confirmation';
    if (value === 'Licence Issued') return 'Licence Issued';
    if (value === 'Approved') return 'Approved by MD';
    if (value === 'Submitted' || value === 'Under Review' || value === 'Draft') {
        return 'Awaiting Compliance Review';
    }

    return value;
};

const getCompanyApplicationEventLabel = (eventType: string) => {
    if (eventType === 'Submitted') return 'Application Submitted';
    if (eventType === 'Resubmitted') return 'Application Resubmitted';
    if (eventType === 'ForwardedToAdmin') return 'Forwarded to MD';
    if (eventType === 'PaymentSubmitted') return 'Payment Submitted';
    if (eventType === 'ReturnedForRevision') return 'Queried by Compliance';
    if (eventType === 'RejectedByCompliance') return 'Rejected by Compliance';
    if (eventType === 'RejectedByAdmin') return 'Rejected by MD';
    if (eventType === 'ApprovedByAdmin') return 'Approved by MD';
    if (eventType === 'LicenseIssued') return 'Licence Issued';

    return eventType;
};

const renderCompanyApplicationDocuments = (
    incorporationType?: string | null,
    documents?: CompanyApplicationDocument[],
) => {
    const requirements = getCompanyApplicationDocumentRequirements(incorporationType);
    const fileNameByType = new Map(
        (documents || []).map((document) => [document.document_type, document.file_name])
    );

    return renderTable(
        ['Requirement', 'Status', 'Reference'],
        requirements.map((requirement) => {
            const definition = companyApplicationDocumentCatalog[requirement.documentType];
            const fileName = fileNameByType.get(requirement.documentType) || '';
            const isDerived = definition.inputKind === 'derived';
            const isProvided = isDerived || fileName.trim().length > 0;
            const status = isDerived
                ? 'Included in Form'
                : isProvided
                    ? 'Provided'
                    : definition.required === false
                        ? 'Optional'
                        : 'Missing';

            return [
                definition.label,
                status,
                isDerived ? 'Captured within the application form' : fileName || '--',
            ];
        })
    );
};

const mapCompanyApplicationEvents = (events?: CompanyApplicationEvent[]) => (
    (events || []).map((event) => ({
        title: getCompanyApplicationEventLabel(event.event_type),
        actor: `${toDisplayValue(event.actor_name)}${event.actor_role ? ` · ${event.actor_role}` : ''}`,
        timestamp: event.created_at,
        transition: event.from_status || event.to_status
            ? `${formatCompanyApplicationStatus(event.from_status)} -> ${formatCompanyApplicationStatus(event.to_status)}`
            : null,
        note: event.note,
    }))
);

export const printCompanyApplicationSummary = (detail: CompanyApplicationDetail) => {
    openPrintDocument({
        documentTitle: `Company Application Summary - ${detail.company_name}`,
        kicker: 'OGFZA Company Licensing',
        title: detail.company_name,
        subtitle: 'Company application summary for internal review, follow-up, and filing.',
        reference: detail.application_reference,
        badges: [
            { label: formatCompanyApplicationStatus(detail.status), tone: detail.status === 'Rejected' ? 'danger' : detail.status === 'Licence Issued' ? 'success' : 'warning' },
            detail.requested_license_type ? { label: detail.requested_license_type, tone: 'neutral' } : null,
        ].filter(Boolean) as PrintBadge[],
        body: [
            renderSection('Application Overview', renderFieldGrid([
                { label: 'Application Reference', value: detail.application_reference, mono: true },
                { label: 'Company Name', value: detail.company_name },
                { label: 'Status', value: formatCompanyApplicationStatus(detail.status) },
                { label: 'Incorporation Type', value: detail.incorporation_type },
                { label: 'Free Zone Location', value: detail.free_zone_location },
                { label: 'Requested Licence Type', value: detail.requested_license_type },
                { label: 'Approved Licence Type', value: detail.approved_license_type },
                { label: 'Estimated Fees (USD)', value: formatUsd(detail.estimated_fee_usd) },
                { label: 'Final Fees (USD)', value: formatUsd(detail.approved_fee_usd) },
                { label: 'Payment Status', value: detail.payment_status },
                { label: 'Payment Reference', value: detail.payment_reference },
                { label: 'Issued Licence No.', value: detail.linked_company_license_no, mono: true },
                { label: 'Submitted By', value: detail.submitted_by_name },
                { label: 'Reviewed By', value: detail.reviewed_by_name },
                { label: 'Returned By', value: detail.returned_by_name },
                { label: 'Approved By', value: detail.approved_by_name },
                { label: 'Submitted At', value: formatDateTime(detail.submitted_at) },
                { label: 'Payment Submitted At', value: formatDateTime(detail.payment_submitted_at) },
                { label: 'Payment Confirmed At', value: formatDateTime(detail.payment_confirmed_at) },
                { label: 'Latest Query Note', value: detail.query_note, fullWidth: true },
                { label: 'Rejection Reason', value: detail.rejection_reason, fullWidth: true },
            ], 3)),
            renderSection('Office Details', renderFieldGrid([
                { label: 'Global Head Office Address', value: detail.global_head_office_address, fullWidth: true },
                { label: 'Office Address in Nigeria', value: detail.nigeria_office_address, fullWidth: true },
                { label: 'Global Telephone 1', value: detail.global_phone_1 },
                { label: 'Global Telephone 2', value: detail.global_phone_2 },
                { label: 'Global Email', value: detail.global_email },
                { label: 'Global Website', value: detail.global_website },
                { label: 'Nigeria Telephone 1', value: detail.nigeria_phone_1 },
                { label: 'Nigeria Telephone 2', value: detail.nigeria_phone_2 },
                { label: 'Nigeria Email', value: detail.nigeria_email },
                { label: 'Nigeria Website', value: detail.nigeria_website },
            ])),
            renderTwoPanelSection(
                'Contact Information',
                'Primary Contact',
                [
                    { label: 'Name', value: detail.primary_contact_name },
                    { label: 'Designation', value: detail.primary_contact_designation },
                    { label: 'Telephone', value: detail.primary_contact_phone },
                    { label: 'Email', value: detail.primary_contact_email },
                ],
                'Secondary Contact',
                [
                    { label: 'Name', value: detail.secondary_contact_name },
                    { label: 'Designation', value: detail.secondary_contact_designation },
                    { label: 'Telephone', value: detail.secondary_contact_phone },
                    { label: 'Email', value: detail.secondary_contact_email },
                ],
            ),
            renderSection('Operations and Proposal', renderFieldGrid([
                { label: 'Present Business Operations', value: detail.present_business_operations, fullWidth: true },
                { label: 'Countries of Operation in West Africa', value: detail.countries_of_operation_west_africa, fullWidth: true },
                { label: 'D.P.R Registration No.', value: detail.dpr_registration_number },
                { label: 'Description of Activity', value: detail.activity_description },
                { label: 'Proposed Business Activity in the Free Zone', value: detail.proposed_business_activity, fullWidth: true },
                { label: 'Proposed Commencement Date', value: formatDate(detail.proposed_commencement_date) },
            ])),
            renderSection('Required Facilities and Cargo', renderFieldGrid([
                { label: 'Undeveloped Land (m2)', value: detail.undeveloped_land_sqm },
                { label: 'Developed Land (m2)', value: detail.developed_land_sqm },
                { label: 'Concrete Stacking Area (m2)', value: detail.concrete_stacking_area_sqm },
                { label: 'Warehouse Space (m2)', value: detail.warehouse_space_sqm },
                { label: 'Factory Premises (m2)', value: detail.factory_premises_sqm },
                { label: 'Office Accommodation (m2)', value: detail.office_accommodation_sqm },
                { label: 'Equipment Requirement', value: detail.equipment_requirement, fullWidth: true },
                { label: 'Residential Accommodation Personnel', value: detail.residential_accommodation_personnel_count },
                { label: 'Estimate of Imports', value: detail.imports_summary, fullWidth: true },
                { label: 'Estimate of Exports', value: detail.exports_summary, fullWidth: true },
            ], 3)),
            renderSection('Declaration', renderFieldGrid([
                { label: 'Name', value: detail.declaration_name },
                { label: 'Designation', value: detail.declaration_designation },
                { label: 'Signature Date', value: formatDate(detail.declaration_signature_date) },
            ], 3)),
            renderSection(
                'Supporting Documents',
                renderCompanyApplicationDocuments(detail.incorporation_type, detail.documents)
            ),
            renderSection(
                'Workflow Log',
                renderTimeline(mapCompanyApplicationEvents(detail.events))
            ),
        ].join(''),
        footerNote: 'Generated from the OGFZA Digital Automation prototype. This printout reflects the latest application detail currently available in the system.',
    });
};

export const printCompanyRecord = (detail: CompanyDetail) => {
    openPrintDocument({
        documentTitle: `Registered Company Record - ${detail.name}`,
        kicker: 'OGFZA Company Registry',
        title: detail.name,
        subtitle: 'Registered company record showing licence, payment, contact, and supporting application details.',
        reference: detail.license_no || detail.application_reference || 'Registered Company',
        badges: [
            { label: detail.status || 'Registered', tone: detail.status === 'Active' ? 'success' : 'neutral' },
            detail.license_type ? { label: detail.license_type, tone: 'neutral' } : null,
        ].filter(Boolean) as PrintBadge[],
        body: [
            renderSection('Company Record', renderFieldGrid([
                { label: 'Company Name', value: detail.name },
                { label: 'Licence No.', value: detail.license_no, mono: true },
                { label: 'Licence Type', value: detail.license_type },
                { label: 'Status', value: detail.status },
                { label: 'Incorporation Type', value: detail.incorporation_type },
                { label: 'Free Zone Location', value: detail.free_zone_location },
                { label: 'Representative Email', value: detail.representative_email },
                { label: 'Approved Date', value: formatDate(detail.approved_date) },
            ], 3)),
            renderSection('Application Workflow', renderFieldGrid([
                { label: 'Application Reference', value: detail.application_reference, mono: true },
                { label: 'Application Status', value: formatCompanyApplicationStatus(detail.application_status) },
                { label: 'Requested Licence Type', value: detail.requested_license_type },
                { label: 'Approved Licence Type', value: detail.approved_license_type },
                { label: 'Estimated Fees (USD)', value: formatUsd(detail.estimated_fee_usd) },
                { label: 'Final Fees (USD)', value: formatUsd(detail.approved_fee_usd) },
                { label: 'Payment Status', value: detail.payment_status },
                { label: 'Payment Reference', value: detail.payment_reference },
                { label: 'Payment Submitted By', value: detail.payment_submitted_by_name },
                { label: 'Payment Submitted At', value: formatDateTime(detail.payment_submitted_at) },
                { label: 'Payment Confirmed By', value: detail.payment_confirmed_by_name },
                { label: 'Payment Confirmed At', value: formatDateTime(detail.payment_confirmed_at) },
                { label: 'Submitted By', value: detail.submitted_by_name },
                { label: 'Reviewed By', value: detail.reviewed_by_name },
                { label: 'Approved By', value: detail.approved_by_name },
                { label: 'Rejection Reason', value: detail.rejection_reason, fullWidth: true },
            ], 3)),
            renderSection('Office Details', renderFieldGrid([
                { label: 'Global Head Office Address', value: detail.global_head_office_address, fullWidth: true },
                { label: 'Office Address in Nigeria', value: detail.nigeria_office_address, fullWidth: true },
                { label: 'Global Telephone 1', value: detail.global_phone_1 },
                { label: 'Global Telephone 2', value: detail.global_phone_2 },
                { label: 'Global Email', value: detail.global_email },
                { label: 'Global Website', value: detail.global_website },
                { label: 'Nigeria Telephone 1', value: detail.nigeria_phone_1 },
                { label: 'Nigeria Telephone 2', value: detail.nigeria_phone_2 },
                { label: 'Nigeria Email', value: detail.nigeria_email },
                { label: 'Nigeria Website', value: detail.nigeria_website },
            ])),
            renderTwoPanelSection(
                'Contact Information',
                'Primary Contact',
                [
                    { label: 'Name', value: detail.primary_contact_name },
                    { label: 'Designation', value: detail.primary_contact_designation },
                    { label: 'Telephone', value: detail.primary_contact_phone },
                    { label: 'Email', value: detail.primary_contact_email },
                ],
                'Secondary Contact',
                [
                    { label: 'Name', value: detail.secondary_contact_name },
                    { label: 'Designation', value: detail.secondary_contact_designation },
                    { label: 'Telephone', value: detail.secondary_contact_phone },
                    { label: 'Email', value: detail.secondary_contact_email },
                ],
            ),
            renderSection('Operations and Proposal', renderFieldGrid([
                { label: 'Present Business Operations', value: detail.present_business_operations, fullWidth: true },
                { label: 'Countries of Operation in West Africa', value: detail.countries_of_operation_west_africa, fullWidth: true },
                { label: 'D.P.R Registration No.', value: detail.dpr_registration_number },
                { label: 'Description of Activity', value: detail.activity_description },
                { label: 'Proposed Business Activity in the Free Zone', value: detail.proposed_business_activity, fullWidth: true },
                { label: 'Proposed Commencement Date', value: formatDate(detail.proposed_commencement_date) },
            ])),
            renderSection('Required Facilities and Cargo', renderFieldGrid([
                { label: 'Undeveloped Land (m2)', value: detail.undeveloped_land_sqm },
                { label: 'Developed Land (m2)', value: detail.developed_land_sqm },
                { label: 'Concrete Stacking Area (m2)', value: detail.concrete_stacking_area_sqm },
                { label: 'Warehouse Space (m2)', value: detail.warehouse_space_sqm },
                { label: 'Factory Premises (m2)', value: detail.factory_premises_sqm },
                { label: 'Office Accommodation (m2)', value: detail.office_accommodation_sqm },
                { label: 'Equipment Requirement', value: detail.equipment_requirement, fullWidth: true },
                { label: 'Residential Accommodation Personnel', value: detail.residential_accommodation_personnel_count },
                { label: 'Estimate of Imports', value: detail.imports_summary, fullWidth: true },
                { label: 'Estimate of Exports', value: detail.exports_summary, fullWidth: true },
            ], 3)),
            renderSection(
                'Supporting Documents',
                renderCompanyApplicationDocuments(detail.incorporation_type, detail.documents)
            ),
        ].join(''),
        footerNote: 'Generated from the registered company profile currently stored in the OGFZA Digital Automation prototype.',
    });
};

export const printLicenceCertificate = (record: LicenceCertificateRecord) => {
    openPrintDocument({
        documentTitle: `Licence Certificate - ${record.companyName}`,
        kicker: 'OGFZA Licence Certificate',
        title: record.companyName,
        subtitle: 'Official prototype printout of an issued company licence.',
        reference: record.licenseNo || record.applicationReference || 'Licence Certificate',
        badges: [
            { label: record.licenseType || 'Licence Type Pending', tone: 'neutral' },
            { label: 'Licence Issued', tone: 'success' },
        ],
        body: [
            renderSection(
                'Certificate Statement',
                `<p class="statement">This is to certify that <strong>${escapeHtml(record.companyName)}</strong> has been issued a <strong>${escapeHtml(toDisplayValue(record.licenseType))}</strong> under the licence number <strong>${escapeHtml(toDisplayValue(record.licenseNo))}</strong> for operations within <strong>${escapeHtml(toDisplayValue(record.freeZoneLocation))}</strong>.</p>`
            ),
            renderSection('Licence Details', renderFieldGrid([
                { label: 'Company Name', value: record.companyName },
                { label: 'Licence No.', value: record.licenseNo, mono: true },
                { label: 'Licence Type', value: record.licenseType },
                { label: 'Free Zone Location', value: record.freeZoneLocation },
                { label: 'Issued On', value: formatDate(record.issuedOn) },
                { label: 'Approved By', value: record.approvedBy },
                { label: 'Application Reference', value: record.applicationReference, mono: true },
            ], 3)),
        ].join(''),
        footerNote: 'This certificate is a prototype-generated print view from OGFZA Digital Automation and should be treated as a demonstration output unless otherwise validated.',
    });
};

export const printLicencePaymentReceipt = (record: LicencePaymentReceiptRecord) => {
    openPrintDocument({
        documentTitle: `Licence Payment Receipt - ${record.companyName}`,
        kicker: 'OGFZA Revenue & Finance',
        title: record.companyName,
        subtitle: 'Payment receipt for company licence processing and issuance.',
        reference: record.paymentReference || record.applicationReference || 'Licence Payment Receipt',
        badges: [
            { label: record.paymentStatus || 'Payment Pending', tone: record.paymentStatus === 'Paid' ? 'success' : 'warning' },
            record.licenseType ? { label: record.licenseType, tone: 'neutral' } : null,
        ].filter(Boolean) as PrintBadge[],
        body: [
            renderSection('Receipt Details', renderFieldGrid([
                { label: 'Company Name', value: record.companyName },
                { label: 'Application Reference', value: record.applicationReference, mono: true },
                { label: 'Licence No.', value: record.licenseNo, mono: true },
                { label: 'Licence Type', value: record.licenseType },
                { label: 'Amount Paid', value: formatUsd(record.amountPaid) },
                { label: 'Payment Reference', value: record.paymentReference, mono: true },
                { label: 'Payment Status', value: record.paymentStatus },
                { label: 'Payment Submitted On', value: formatDateTime(record.paymentSubmittedOn) },
                { label: 'Payment Submitted By', value: record.paymentSubmittedBy },
                { label: 'Payment Confirmed On', value: formatDateTime(record.paymentConfirmedOn) },
                { label: 'Payment Confirmed By', value: record.paymentConfirmedBy },
            ], 3)),
            renderTextSection(
                'Receipt Note',
                'This printout confirms the payment stage captured in the OGFZA Digital Automation prototype at the time the document was generated.'
            ),
        ].join(''),
        footerNote: 'Generated from the payment confirmation data currently stored in the licence workflow. For production use, connect this receipt to a formal finance numbering sequence.',
    });
};

const getTradeOperationEventLabel = (eventType: string) => (
    eventType.replace(/([A-Z])/g, ' $1').trim()
);

const mapTradeOperationEvents = (events?: TradeOperationEvent[]) => (
    (events || []).map((event) => ({
        title: getTradeOperationEventLabel(event.event_type),
        actor: `${toDisplayValue(event.actor_name)}${event.actor_role ? ` · ${event.actor_role}` : ''}`,
        timestamp: event.created_at,
        transition: event.from_status || event.to_status
            ? `${toDisplayValue(event.from_status)} -> ${toDisplayValue(event.to_status)}`
            : null,
        note: event.note,
    }))
);

const renderTradeOperationDocuments = (
    serviceType?: string | null,
    documents?: TradeOperationDocument[],
) => {
    const requirements = getTradeOperationDocumentRequirements(serviceType);
    const fileNameByType = new Map(
        (documents || []).map((document) => [document.document_type, document.file_name])
    );

    return renderTable(
        ['Requirement', 'Status', 'Reference'],
        requirements.map((requirement) => {
            const definition = tradeOperationDocumentCatalog[requirement.documentType];
            const fileName = fileNameByType.get(requirement.documentType) || '';

            return [
                definition.label,
                fileName.trim().length > 0 ? 'Provided' : 'Missing',
                fileName || '--',
            ];
        })
    );
};

export const printTradeOperationSummary = (detail: TradeOperationRequestDetail) => {
    const serviceDefinition = getTradeOperationService(detail.service_type);

    openPrintDocument({
        documentTitle: `Trade Request Summary - ${detail.request_reference}`,
        kicker: 'OGFZA Trade Operations',
        title: detail.company_name,
        subtitle: 'Trade operation request summary for service review, coordination, and filing.',
        reference: detail.request_reference,
        badges: [
            { label: serviceDefinition?.label || detail.service_type, tone: 'neutral' },
            { label: detail.status === 'Approved' ? 'Approved by Compliance' : detail.status === 'Returned' ? 'Queried by Compliance' : detail.status, tone: detail.status === 'Approved' ? 'success' : detail.status === 'Rejected' ? 'danger' : 'warning' },
        ],
        body: [
            renderSection('Request Overview', renderFieldGrid([
                { label: 'Reference', value: detail.request_reference, mono: true },
                { label: 'Company', value: detail.company_name },
                { label: 'Status', value: detail.status },
                { label: 'Service', value: serviceDefinition?.label || detail.service_type },
                { label: 'Workflow Family', value: serviceDefinition?.familyLabel || detail.service_family },
                { label: 'Company Licence No.', value: detail.company_license_no, mono: true },
                { label: 'Submitted By', value: detail.submitted_by_name },
                { label: 'Submitted At', value: formatDateTime(detail.submitted_at) },
                { label: 'Requested Completion Date', value: formatDate(detail.requested_completion_date) },
                { label: 'Latest Query Note', value: detail.query_note, fullWidth: true },
                { label: 'Rejection Reason', value: detail.rejection_reason, fullWidth: true },
            ], 3)),
            renderTextSection(
                'Cover Request / Summary',
                detail.operation_summary || detail.goods_description
            ),
            renderSection(
                'Supporting Documents',
                renderTradeOperationDocuments(detail.service_type, detail.documents)
            ),
            renderSection(
                'Workflow Log',
                renderTimeline(mapTradeOperationEvents(detail.events))
            ),
        ].join(''),
        footerNote: 'Generated from the trade request currently stored in OGFZA Digital Automation. Use this printout for review packs, logistics coordination, or stakeholder circulation.',
    });
};

const getIncidentEventLabel = (eventType: string) => (
    eventType.replace(/([A-Z])/g, ' $1').trim()
);

const mapIncidentEvents = (events?: IncidentEvent[]) => (
    (events || []).map((event) => ({
        title: getIncidentEventLabel(event.event_type),
        actor: `${toDisplayValue(event.actor_name)}${event.actor_role ? ` · ${event.actor_role}` : ''}`,
        timestamp: event.created_at,
        transition: event.from_status || event.to_status
            ? `${toDisplayValue(event.from_status)} -> ${toDisplayValue(event.to_status)}`
            : null,
        note: event.note,
    }))
);

export const printIncidentReport = (detail: IncidentDetail) => {
    openPrintDocument({
        documentTitle: `Incident Report - ${detail.company_name}`,
        kicker: 'OGFZA Safety & Incident Logs',
        title: detail.company_name,
        subtitle: 'Incident report, contractor follow-up, and compliance resolution summary.',
        reference: `Incident #${detail.id.toString().padStart(4, '0')}`,
        badges: [
            { label: detail.status, tone: detail.status === 'Resolved' ? 'success' : detail.status === 'Closed' ? 'neutral' : 'danger' },
            { label: detail.severity, tone: detail.severity === 'Critical' || detail.severity === 'High' ? 'danger' : detail.severity === 'Medium' ? 'warning' : 'success' },
        ],
        body: [
            renderSection('Incident Overview', renderFieldGrid([
                { label: 'Incident Type', value: detail.incident_type },
                { label: 'Affected Asset', value: detail.asset_name },
                { label: 'Severity', value: detail.severity },
                { label: 'Reported By', value: detail.reported_by_name || detail.reported_by },
                { label: 'Reported On', value: formatDateTime(detail.reported_date) },
                { label: 'Status', value: detail.status },
                { label: 'Last Contractor Follow-up', value: formatDateTime(detail.follow_up_submitted_at) },
                { label: 'Follow-up Submitted By', value: detail.follow_up_submitted_by_name },
                { label: 'Resolved By', value: detail.resolved_by_name },
                { label: 'Resolved At', value: formatDateTime(detail.resolved_at) },
                { label: 'Closed By', value: detail.closed_by_name },
                { label: 'Closed At', value: formatDateTime(detail.closed_at) },
            ], 3)),
            renderTextSection('Incident Description', detail.description),
            renderTextSection('Contractor Follow-up', detail.follow_up_note),
            renderSection(
                'Workflow Log',
                renderTimeline(mapIncidentEvents(detail.events))
            ),
        ].join(''),
        footerNote: 'Generated from the compliance-led incident workflow currently held in OGFZA Digital Automation.',
    });
};

const getComplianceCaseTypeLabel = (caseType: string) => {
    if (caseType === 'DocumentUpdate') return 'Document Update';
    if (caseType === 'AuditFinding') return 'Audit Finding';
    return caseType;
};

const getComplianceEventLabel = (eventType: string) => {
    if (eventType === 'CaseCreated') return 'Case Created';
    if (eventType === 'ContractorResponseSubmitted') return 'Contractor Response Submitted';
    if (eventType === 'CaseReturned') return 'Returned to Contractor';
    if (eventType === 'CaseResolved') return 'Case Resolved';
    if (eventType === 'CaseClosed') return 'Case Closed';
    if (eventType === 'LegacyImported') return 'Legacy Case Imported';
    if (eventType === 'LegacyResolved') return 'Legacy Case Resolved';
    return eventType;
};

const mapComplianceEvents = (events?: ComplianceCaseEvent[]) => (
    (events || []).map((event) => ({
        title: getComplianceEventLabel(event.event_type),
        actor: `${toDisplayValue(event.actor_name)}${event.actor_role ? ` · ${event.actor_role}` : ''}`,
        timestamp: event.created_at,
        transition: event.from_status || event.to_status
            ? `${toDisplayValue(event.from_status)} -> ${toDisplayValue(event.to_status)}`
            : null,
        note: event.note,
    }))
);

export const printComplianceCaseSummary = (detail: ComplianceCaseDetail) => {
    openPrintDocument({
        documentTitle: `Compliance Case Summary - ${detail.title}`,
        kicker: 'OGFZA Compliance & Audit',
        title: detail.title,
        subtitle: 'Compliance case summary for follow-up, audit review, and contractor correspondence.',
        reference: `Case #${detail.id.toString().padStart(4, '0')}`,
        badges: [
            { label: getComplianceCaseTypeLabel(detail.case_type), tone: 'neutral' },
            { label: detail.status, tone: detail.status === 'Resolved' ? 'success' : detail.status === 'Closed' ? 'neutral' : detail.status === 'Returned' ? 'warning' : 'danger' },
        ],
        body: [
            renderSection('Case Overview', renderFieldGrid([
                { label: 'Company', value: detail.company_name },
                { label: 'Case Type', value: getComplianceCaseTypeLabel(detail.case_type) },
                { label: 'Status', value: detail.status },
                { label: 'Licence Number', value: detail.company_license_no, mono: true },
                { label: 'Due Date', value: formatDate(detail.due_date) },
                { label: 'Requested At', value: formatDateTime(detail.requested_at) },
                detail.case_type === 'DocumentUpdate'
                    ? { label: 'Document Type', value: detail.document_type }
                    : null,
                detail.case_type === 'AuditFinding'
                    ? { label: 'Severity', value: detail.severity }
                    : null,
                { label: 'Requested By', value: detail.requested_by_name },
                { label: 'Response Submitted At', value: formatDateTime(detail.contractor_response_submitted_at) },
                { label: 'Response Submitted By', value: detail.contractor_response_submitted_by_name },
                { label: 'Supporting Document', value: detail.contractor_response_file_name },
                { label: 'Compliance Note', value: detail.review_note, fullWidth: true },
            ], 3)),
            renderTextSection('Request Note', detail.request_note),
            renderTextSection('Contractor Response', detail.contractor_response_note),
            renderSection(
                'Workflow Log',
                renderTimeline(mapComplianceEvents(detail.events))
            ),
        ].join(''),
        footerNote: 'Generated from the post-licensing compliance workflow currently recorded in OGFZA Digital Automation.',
    });
};
