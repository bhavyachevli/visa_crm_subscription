from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import io

def format_date(dt):
    if not dt:
        return ""
    if isinstance(dt, datetime):
        return dt.strftime("%d-%m-%Y")
    if isinstance(dt, str):
        # Handle ISO format string like "2026-05-21T09:13:41.740Z"
        try:
            if 'T' in dt:
                date_part = dt.split('T')[0]
                parts = date_part.split('-')
                if len(parts) == 3:
                    return f"{parts[2]}-{parts[1]}-{parts[0]}"
            elif '-' in dt:
                parts = dt.split('-')
                if len(parts) == 3 and len(parts[0]) == 4:
                    return f"{parts[2]}-{parts[1]}-{parts[0]}"
        except Exception:
            pass
        return dt
    return str(dt)

def generate_invoice_pdf(invoice_data, lead_data, lines_data):
    buffer = io.BytesIO()
    # A4 printable area width is 595.27 points. With 36pt (0.5 inch) margins on left & right, 
    # the printable width is 523.27 points.
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=36, 
        leftMargin=36, 
        topMargin=36, 
        bottomMargin=36
    )
    styles = getSampleStyleSheet()
    elements = []
    
    # 1. Header Banner ("TAX INVOICE")
    header_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        alignment=TA_CENTER,
        fontSize=12,
        leading=14,
        textColor=colors.HexColor('#6D28D9'), # Dark Purple
        fontName='Helvetica-Bold'
    )
    header_p = Paragraph("TAX INVOICE", header_style)
    header_table = Table([[header_p]], colWidths=[523.27])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F5F3FF')), # Light Lavender background
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    
    # 2. Metadata Section (Invoice No & Date)
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#1E293B')
    )
    invoice_no = invoice_data.get('number', '')
    invoice_date = format_date(invoice_data.get('createdAt'))
    meta_text = f"Invoice No : <b>{invoice_no}</b><br/>Invoice Date : <b>{invoice_date}</b>"
    meta_p = Paragraph(meta_text, meta_style)
    
    meta_table = Table([["", meta_p]], colWidths=[300, 223.27])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 8))
    
    # Divider helper
    def create_divider_line():
        divider = Table([[""]], colWidths=[523.27], rowHeights=[1])
        divider.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        return divider
        
    elements.append(create_divider_line())
    elements.append(Spacer(1, 15))
    
    # 3. Bill To / Seller details
    left_normal_style = ParagraphStyle(
        'LeftNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )
    
    client_name = lead_data.get('fullName', '')
    client_phone = lead_data.get('phone', '') or ''
    client_email = lead_data.get('email', '') or ''
    
    left_html = f"""<font color="#6D28D9"><b>Bill To :</b></font><br/>
{client_name}<br/>
<br/>
<b>Contact No :</b> {client_phone}<br/>
<b>Email :</b> {client_email}"""
    
    right_html = """<b>Pangaea Pathways</b><br/>
<br/>
Office No 156 Opera Bussiness Hub,<br/>
Lajamni Chowk, Mota Varachha,<br/>
Surat-394101,<br/>
GUJARAT,<br/>
INDIA"""
    
    address_data = [
        [Paragraph(left_html, left_normal_style), Paragraph(right_html, left_normal_style)]
    ]
    address_table = Table(address_data, colWidths=[280, 243.27])
    address_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    elements.append(address_table)
    elements.append(Spacer(1, 15))
    elements.append(create_divider_line())
    elements.append(Spacer(1, 20))
    
    # 4. Main Items Table
    th_style_left = ParagraphStyle(
        'TableHeaderLeft',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        alignment=TA_LEFT
    )
    th_style_center = ParagraphStyle(
        'TableHeaderCenter',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        alignment=TA_CENTER
    )
    th_style_right = ParagraphStyle(
        'TableHeaderRight',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        alignment=TA_RIGHT
    )

    td_style_left = ParagraphStyle(
        'TableCellLeft',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155'),
        alignment=TA_LEFT
    )
    td_style_center = ParagraphStyle(
        'TableCellCenter',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155'),
        alignment=TA_CENTER
    )
    td_style_right = ParagraphStyle(
        'TableCellRight',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155'),
        alignment=TA_RIGHT
    )

    currency = invoice_data.get('currency', 'INR')

    def format_curr(val):
        return f"{currency} {val:.2f}"

    table_data = [
        [
            Paragraph("Services", th_style_left),
            Paragraph("Price", th_style_right),
            Paragraph("Taxable Amount", th_style_right),
            Paragraph("Tax", th_style_center),
            Paragraph("Tax Amount", th_style_right),
            Paragraph("Net Amount", th_style_right)
        ]
    ]

    taxable_total = 0.0
    tax_total = 0.0
    net_total = 0.0

    for line in lines_data:
        qty = line.get("quantity", 1)
        unit_price = line.get("unitExGst", 0.0)
        tax_rate = line.get("gstRatePct", 0.0)
        
        line_taxable = qty * unit_price
        line_tax_amount = line_taxable * (tax_rate / 100.0)
        line_net = line_taxable + line_tax_amount
        
        taxable_total += line_taxable
        tax_total += line_tax_amount
        net_total += line_net
        
        desc = line.get("description", "")
        if qty > 1:
            desc = f"{desc} (Qty: {qty})"
            
        tax_label = f"{tax_rate:.0f}%" if tax_rate > 0 else "-"
        tax_amt_label = format_curr(line_tax_amount) if tax_rate > 0 else "-"
        
        table_data.append([
            Paragraph(desc, td_style_left),
            Paragraph(format_curr(unit_price), td_style_right),
            Paragraph(format_curr(line_taxable), td_style_right),
            Paragraph(tax_label, td_style_center),
            Paragraph(tax_amt_label, td_style_right),
            Paragraph(format_curr(line_net), td_style_right)
        ])

    items_table = Table(table_data, colWidths=[203.27, 64, 80, 40, 68, 68])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F3FF')), # Lavender header background
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')), # Slate grey grid line
    ]))
    
    elements.append(items_table)
    elements.append(Spacer(1, 10))
    
    # 5. Bottom Right Summary Box
    total_label_style = ParagraphStyle(
        'TotalLabel',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155'),
        alignment=TA_LEFT
    )
    total_label_bold_style = ParagraphStyle(
        'TotalLabelBold',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        alignment=TA_LEFT
    )
    total_val_style = ParagraphStyle(
        'TotalVal',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155'),
        alignment=TA_RIGHT
    )
    total_val_bold_style = ParagraphStyle(
        'TotalValBold',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
        alignment=TA_RIGHT
    )

    receive_amount = invoice_data.get('paidAmount', 0.0)
    due_amount = max(0.0, net_total - receive_amount)

    summary_data = [
        [
            Paragraph("Taxable Total", total_label_style),
            Paragraph(format_curr(taxable_total), total_val_style)
        ],
        [
            Paragraph("<b>Net Amount</b>", total_label_bold_style),
            Paragraph(f"<b>{format_curr(net_total)}</b>", total_val_bold_style)
        ],
        [
            Paragraph("Receive Amount", total_label_style),
            Paragraph(format_curr(receive_amount), total_val_style)
        ],
        [
            Paragraph("<b>Due Amount</b>", total_label_bold_style),
            Paragraph(f"<b>{format_curr(due_amount)}</b>", total_val_bold_style)
        ]
    ]

    summary_table = Table(summary_data, colWidths=[120, 103], hAlign='RIGHT')
    summary_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#F5F3FF')), # Net Amount background
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#F5F3FF')), # Due Amount background
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    elements.append(create_divider_line())
    elements.append(Spacer(1, 80)) # Bottom empty spacing to match screenshot bottom layout
    elements.append(create_divider_line())
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
