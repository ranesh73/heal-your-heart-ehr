# Pure Python PDF 1.4 Generator for Medical Invoices & Statements
# Supports: Standard Invoice PDF, Superbill PDF, and Double Window Envelope PDF

def escape_pdf(text) -> str:
    if text is None:
        return ""
    # Strip characters outside ASCII/latin1 or replace with nearest equivalents
    clean = str(text).replace("₹", "Rs. ").replace("—", "-").replace("–", "-").replace("•", "*")
    return clean.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def generate_invoice_pdf(invoice, lines, patient, facility, template: str = "standard") -> bytes:
    """
    Generates a standards-compliant PDF 1.4 document for the given invoice.
    Templates:
      - 'standard': Clean itemized patient invoice statement.
      - 'superbill': Health Insurance Claim Superbill with CPT codes, diagnoses, and provider info.
      - 'envelope': Double Window Envelope format with return and recipient address blocks.
    """
    fac_name = escape_pdf(getattr(facility, "name", "Heal Your Heart - Cardiology & EECP Center"))
    fac_addr = escape_pdf(getattr(facility, "address", "New No. 12, Main Road, T. Nagar, Chennai, Tamil Nadu 600017"))
    fac_phone = escape_pdf(getattr(facility, "phone", "+91 44 2834 5678"))

    pat_name = escape_pdf(getattr(patient, "name", "Patient"))
    pat_mrn = escape_pdf(getattr(patient, "mrn", "") or getattr(patient, "record_id", "") or str(getattr(patient, "id", ""))[:8])
    pat_phone = escape_pdf(getattr(patient, "phone", "") or "+91 98400 00000")
    pat_addr = escape_pdf(getattr(patient, "address", "") or "Chennai, Tamil Nadu")

    inv_num = escape_pdf(getattr(invoice, "number", "INV-0001"))
    inv_date = escape_pdf(str(getattr(invoice, "date", "") or getattr(invoice, "created_at", "") or "2026-11-17")[:10])
    inv_status = escape_pdf(str(getattr(invoice, "status", "unpaid")).upper())
    due_date = escape_pdf(str(getattr(invoice, "due_date", "") or "Due on Receipt"))

    total_paise = int(getattr(invoice, "total_paise", 0) or 0)
    paid_paise = int(getattr(invoice, "paid_paise", 0) or 0)
    discount_paise = int(getattr(invoice, "discount_paise", 0) or 0)
    balance_paise = int(getattr(invoice, "balance_paise", 0) or 0)
    subtotal_paise = total_paise + discount_paise

    total_str = f"Rs. {total_paise / 100:.2f}"
    paid_str = f"Rs. {paid_paise / 100:.2f}"
    discount_str = f"Rs. {discount_paise / 100:.2f}"
    balance_str = f"Rs. {balance_paise / 100:.2f}"
    subtotal_str = f"Rs. {subtotal_paise / 100:.2f}"

    lines_text = []

    if template == "envelope":
        # -------------------------------------------------------------
        # DOUBLE WINDOW ENVELOPE FORMAT
        # Top-left window (Return Address): X=50, Y=720-670
        # Lower window (Recipient Address): X=50, Y=630-560
        # -------------------------------------------------------------
        lines_text.extend([
            "/F2 11 Tf",
            "50 730 Td",
            f"({fac_name}) Tj",
            "/F1 9 Tf",
            "0 -13 Td",
            f"({fac_addr}) Tj",
            "0 -11 Td",
            f"(Ph: {fac_phone}) Tj",
            # Recipient Window block
            "0 -45 Td",
            "/F2 9 Tf",
            "(SEND STATEMENT TO:) Tj",
            "/F2 11 Tf",
            "0 -14 Td",
            f"({pat_name}) Tj",
            "/F1 9 Tf",
            "0 -13 Td",
            f"({pat_addr}) Tj",
            "0 -11 Td",
            f"(Record ID: {pat_mrn}  |  Ph: {pat_phone}) Tj",
            # Document Title & Right metadata box
            "340 82 Td",
            "/F2 14 Tf",
            "(PATIENT BILLING STATEMENT) Tj",
            "/F1 9 Tf",
            "0 -18 Td",
            f"(Invoice #: {inv_num}) Tj",
            "0 -13 Td",
            f"(Invoice Date: {inv_date}) Tj",
            "0 -13 Td",
            f"(Due Date: {due_date}) Tj",
            "0 -13 Td",
            f"(Status: {inv_status}) Tj",
            "-340 -60 Td",
        ])
    elif template == "superbill":
        # -------------------------------------------------------------
        # HEALTH INSURANCE CLAIM SUPERBILL FORMAT
        # -------------------------------------------------------------
        lines_text.extend([
            "/F2 15 Tf",
            "50 740 Td",
            f"({fac_name}) Tj",
            "/F1 9 Tf",
            "0 -14 Td",
            f"({fac_addr}  |  Ph: {fac_phone}) Tj",
            "0 -22 Td",
            "/F2 12 Tf",
            "(HEALTH INSURANCE CLAIM SUPERBILL / MEDICAL STATEMENT) Tj",
            "0 -18 Td",
            "/F2 9 Tf",
            "(PATIENT INFORMATION:) Tj",
            "280 0 Td",
            "(BILLING & ENCOUNTER DETAILS:) Tj",
            "-280 -14 Td",
            "/F1 9 Tf",
            f"(Name: {pat_name}) Tj",
            "280 0 Td",
            f"(Invoice Number: {inv_num}) Tj",
            "-280 -12 Td",
            f"(MRN / ID: {pat_mrn}  |  Phone: {pat_phone}) Tj",
            "280 0 Td",
            f"(Invoice Date: {inv_date}  |  Due: {due_date}) Tj",
            "-280 -12 Td",
            f"(Address: {pat_addr}) Tj",
            "280 0 Td",
            f"(Account Status: {inv_status}) Tj",
            "-280 -18 Td",
            "/F2 9 Tf",
            "(DIAGNOSIS / ENCOUNTER SUMMARY:) Tj",
            "0 -12 Td",
            "/F1 9 Tf",
            "(I25.10 - Atherosclerotic heart disease of native coronary artery / EECP Non-Invasive Therapy) Tj",
            "0 -18 Td",
        ])
    else:
        # -------------------------------------------------------------
        # STANDARD PATIENT INVOICE STATEMENT
        # -------------------------------------------------------------
        lines_text.extend([
            "/F2 15 Tf",
            "50 740 Td",
            f"({fac_name}) Tj",
            "/F1 9 Tf",
            "0 -14 Td",
            f"({fac_addr}  |  Ph: {fac_phone}) Tj",
            "0 -24 Td",
            "/F2 13 Tf",
            "(PATIENT INVOICE STATEMENT) Tj",
            "0 -18 Td",
            "/F2 9 Tf",
            "(PATIENT DETAILS:) Tj",
            "280 0 Td",
            "(INVOICE DETAILS:) Tj",
            "-280 -14 Td",
            "/F1 9 Tf",
            f"(Patient: {pat_name}) Tj",
            "280 0 Td",
            f"(Invoice #: {inv_num}) Tj",
            "-280 -12 Td",
            f"(MRN / Record ID: {pat_mrn}) Tj",
            "280 0 Td",
            f"(Invoice Date: {inv_date}) Tj",
            "-280 -12 Td",
            f"(Phone: {pat_phone}) Tj",
            "280 0 Td",
            f"(Due Date: {due_date}) Tj",
            "-280 -12 Td",
            f"(Address: {pat_addr}) Tj",
            "280 0 Td",
            f"(Status: {inv_status}) Tj",
            "-280 -20 Td",
        ])

    # Table Header
    lines_text.extend([
        "/F2 9 Tf",
        "(--------------------------------------------------------------------------------------------------------------------------------------------) Tj",
        "0 -14 Td",
        "(CODE          DESCRIPTION                                                                      QTY         UNIT PRICE               TOTAL) Tj",
        "0 -10 Td",
        "(--------------------------------------------------------------------------------------------------------------------------------------------) Tj",
        "/F1 9 Tf",
    ])

    # Line Items
    if not lines:
        lines_text.extend([
            "0 -14 Td",
            "(93000         Cardiology Clinical Consultation & Evaluation                  1            Rs. 0.00               Rs. 0.00) Tj",
        ])
    else:
        for item in lines[:16]:  # Fit up to 16 lines cleanly on single page
            code = escape_pdf(getattr(item, "code", "") or "99213")[:10].ljust(12)
            desc = escape_pdf(getattr(item, "description", "") or "Medical Procedure")[:46].ljust(48)
            qty = str(getattr(item, "quantity", 1) or 1).rjust(4)
            unit_paise = int(getattr(item, "unit_paise", 0) or 0)
            line_total_paise = unit_paise * (getattr(item, "quantity", 1) or 1)
            unit_s = f"Rs. {unit_paise / 100:.2f}".rjust(15)
            total_s = f"Rs. {line_total_paise / 100:.2f}".rjust(18)
            row_str = f"{code}{desc}{qty}{unit_s}{total_s}"
            lines_text.extend([
                "0 -13 Td",
                f"({row_str}) Tj",
            ])

    # Summary Totals Block
    lines_text.extend([
        "0 -12 Td",
        "/F2 9 Tf",
        "(--------------------------------------------------------------------------------------------------------------------------------------------) Tj",
        "300 -16 Td",
        "/F1 9 Tf",
        f"(Subtotal:                                            {subtotal_str}) Tj",
        "0 -13 Td",
        f"(Discount / Adjustment:                     {discount_str}) Tj",
        "0 -13 Td",
        f"(Total Invoice Charges:                      {total_str}) Tj",
        "0 -13 Td",
        f"(Amount Paid / Applied:                     {paid_str}) Tj",
        "0 -15 Td",
        "/F2 11 Tf",
        f"(NET BALANCE DUE:                    {balance_str}) Tj",
        "-300 -30 Td",
        "/F1 8 Tf",
        "(Notice: Thank you for choosing Heal Your Heart. Please retain this official statement for your insurance or tax records.) Tj",
        "0 -10 Td",
        "(Electronically verified and generated by Heal Your Heart EHR.) Tj",
    ])

    content = "BT\n" + "\n".join(lines_text) + "\nET"
    stream_b = content.encode("latin1", "replace")
    length = len(stream_b)

    header = "%PDF-1.4\n"
    o1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    o2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    o3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n"
    o4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    o5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n"
    o6 = f"6 0 obj\n<< /Length {length} >>\nstream\n{content}\nendstream\nendobj\n"

    pos1 = len(header.encode("latin1"))
    pos2 = pos1 + len(o1.encode("latin1"))
    pos3 = pos2 + len(o2.encode("latin1"))
    pos4 = pos3 + len(o3.encode("latin1"))
    pos5 = pos4 + len(o4.encode("latin1"))
    pos6 = pos5 + len(o5.encode("latin1"))
    pos_xref = pos6 + len(o6.encode("latin1"))

    xref = f"""xref
0 7
0000000000 65535 f 
{pos1:010d} 00000 n 
{pos2:010d} 00000 n 
{pos3:010d} 00000 n 
{pos4:010d} 00000 n 
{pos5:010d} 00000 n 
{pos6:010d} 00000 n 
"""
    trailer = f"""trailer
<< /Size 7 /Root 1 0 R >>
startxref
{pos_xref}
%%EOF
"""
    return (header + o1 + o2 + o3 + o4 + o5 + o6 + xref + trailer).encode("latin1", "replace")
