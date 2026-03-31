from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from io import BytesIO
import datetime

def generate_audit_pdf(audit_data: dict) -> BytesIO:
    buffer = BytesIO()
    
    # We use A4 setup and margins
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    elements = []
    
    styles = getSampleStyleSheet()
    
    # Create custom styles
    title_style = ParagraphStyle(
        name='CustomTitle', 
        parent=styles['Heading1'],
        fontSize=18, 
        spaceAfter=14,
        textColor=colors.HexColor('#1E3A8A'),
        alignment=1 # Center
    )
    
    subtitle_style = ParagraphStyle(
        name='Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.gray,
        alignment=1,
        spaceAfter=20
    )

    info_style = ParagraphStyle(
        name='Info',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )

    # 1. HEADER
    elements.append(Paragraph(f"Acta de Auditoría Físico Nº {audit_data['audit_id']}", title_style))
    elements.append(Paragraph("Reporte consolidado de existencias, mermas y sobrantes.", subtitle_style))
    elements.append(Spacer(1, 0.5*cm))

    # 2. METADATA SECTION
    end_date_str = ""
    if audit_data.get('end_date'):
        # Just ensure it looks good if it is an ISO string vs datetime
        if isinstance(audit_data['end_date'], str):
            end_date_str = audit_data['end_date'][:19].replace("T", " ")
        else:
            end_date_str = audit_data['end_date'].strftime("%Y-%m-%d %H:%M:%S")

    info_data = [
        ["FECHA DE CIERRE", "SEDE / ALMACÉN", "RESPONSABLE", "ITEMS REVISADOS"],
        [end_date_str, f"Tienda (ID: {audit_data['store_id']})", f"UID: {audit_data['user_id']}", f"{len(audit_data['items'])} SKUs"]
    ]
    
    info_table = Table(info_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#6B7280')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 2),
        ('FONTSIZE', (0,1), (-1,1), 10),
        ('TEXTCOLOR', (0,1), (-1,1), colors.black),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F9FAFB')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E5E7EB')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 1*cm))

    # 3. RESULTS TABLE
    table_data = [["Producto", "Sistema Creía", "Tú Contaste", "Diferencia"]]
    
    for item in audit_data['items']:
        product_name = item.get('product_name', f"ID {item['product_id']}")
        expected = item['expected_quantity']
        counted = item['counted_quantity']
        difference = item['difference']
        
        diff_str = f"+{difference}" if difference > 0 else str(difference)
        
        table_data.append([
            Paragraph(product_name, styles['Normal']), 
            str(expected), 
            str(counted), 
            diff_str
        ])
    
    # Calculate widths based on A4 width minus margins (approx 17cm)
    res_table = Table(table_data, colWidths=[7*cm, 3.5*cm, 3.5*cm, 3*cm])
    
    # Default style for table
    t_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('ALIGN', (0,0), (0,-1), 'LEFT'), # Product left aligned
        ('ALIGN', (1,0), (-1,-1), 'CENTER'), # Numbers center aligned
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ])
    
    # Conditional coloring for 'Difference' column
    for row_idx, row in enumerate(table_data[1:], start=1):
        diff_val = int(row[3].replace("+", ""))
        if diff_val == 0:
            color = colors.HexColor('#10B981') # Green
        else:
            color = colors.HexColor('#EF4444') # Red
            
        t_style.add('TEXTCOLOR', (3, row_idx), (3, row_idx), color)
        t_style.add('FONTNAME', (3, row_idx), (3, row_idx), 'Helvetica-Bold')

    res_table.setStyle(t_style)
    elements.append(res_table)
    
    elements.append(Spacer(1, 2*cm))
    
    # 4. SIGNATURES
    sig_data = [
        ["_________________________", "_________________________"],
        ["Firma Responsable", "Firma Supervisor"]
    ]
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,1), (-1,1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,1), 8),
        ('TEXTCOLOR', (0,1), (-1,1), colors.gray),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    
    elements.append(sig_table)

    # Build PDF
    doc.build(elements)
    
    buffer.seek(0)
    return buffer
