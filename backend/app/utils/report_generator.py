"""
ATMT — Automotive Threat Modeling Tool
Enterprise TARA Report Generator (ISO/SAE 21434 Compliant)

Generates a complete Cybersecurity Threat Analysis and Risk Assessment report
suitable for UNECE R155 type approval submission.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from datetime import datetime, timezone
import hashlib
import io


# ──────────────────────────────────────────────────────────────
# Color Palette — Minimal, professional, enterprise
# ──────────────────────────────────────────────────────────────
_NAVY      = colors.HexColor('#1F4E79')
_CHARCOAL  = colors.HexColor('#1f2937')
_SLATE     = colors.HexColor('#374151')
_GRAY500   = colors.HexColor('#6b7280')
_GRAY200   = colors.HexColor('#e5e7eb')
_GRAY50    = colors.HexColor('#f8fafc')
_WHITE     = colors.white
_BLACK     = colors.black

# Functional risk colors
_CRITICAL  = colors.HexColor('#dc2626')
_HIGH      = colors.HexColor('#ea580c')
_MEDIUM    = colors.HexColor('#ca8a04')
_LOW       = colors.HexColor('#2563eb')
_NEGLIG    = colors.HexColor('#16a34a')

_PASS      = colors.HexColor('#16a34a')
_FAIL      = colors.HexColor('#dc2626')
_NA        = colors.HexColor('#6b7280')

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

# SAE Level descriptions per J3016
SAE_DESCRIPTIONS = {
    0: "No Driving Automation",
    1: "Driver Assistance",
    2: "Partial Driving Automation",
    3: "Conditional Driving Automation",
    4: "High Driving Automation",
    5: "Full Driving Automation",
}


class ReportGenerator:
    """
    Generates a structured TARA report in PDF format
    following ISO/SAE 21434 documentation requirements,
    suitable for UNECE R155 type approval submission.
    """

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_styles()
        self._gen_time = datetime.now(timezone.utc)
        self._integrity_hash = ""

    # ──────────────────────────────────────────────────────────
    # Styles
    # ──────────────────────────────────────────────────────────
    def _setup_styles(self):
        """Define custom paragraph styles for the report."""
        add = self.styles.add

        add(ParagraphStyle(
            'CoverTitle', parent=self.styles['Title'],
            fontSize=22, leading=26, spaceAfter=6,
            textColor=_CHARCOAL, alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        add(ParagraphStyle(
            'CoverSubtitle', parent=self.styles['Normal'],
            fontSize=12, leading=16, spaceAfter=4,
            textColor=_SLATE, alignment=TA_CENTER
        ))
        add(ParagraphStyle(
            'SectionHeader', parent=self.styles['Heading1'],
            fontSize=14, spaceBefore=18, spaceAfter=8,
            textColor=_CHARCOAL, fontName='Helvetica-Bold'
        ))
        add(ParagraphStyle(
            'SubHeader', parent=self.styles['Heading2'],
            fontSize=11, spaceBefore=12, spaceAfter=6,
            textColor=_SLATE, fontName='Helvetica-Bold'
        ))
        add(ParagraphStyle(
            'Body', parent=self.styles['Normal'],
            fontSize=9, leading=13, spaceAfter=4,
            textColor=_BLACK, alignment=TA_JUSTIFY
        ))
        add(ParagraphStyle(
            'BodySmall', parent=self.styles['Normal'],
            fontSize=8, leading=11, spaceAfter=2,
            textColor=_BLACK
        ))
        add(ParagraphStyle(
            'CellText', parent=self.styles['Normal'],
            fontSize=7.5, leading=10, spaceAfter=0,
            textColor=_BLACK
        ))
        add(ParagraphStyle(
            'CellBold', parent=self.styles['Normal'],
            fontSize=7.5, leading=10, spaceAfter=0,
            textColor=_BLACK, fontName='Helvetica-Bold'
        ))
        add(ParagraphStyle(
            'CellWhite', parent=self.styles['Normal'],
            fontSize=7.5, leading=10, spaceAfter=0,
            textColor=_WHITE, fontName='Helvetica-Bold'
        ))
        add(ParagraphStyle(
            'Disclaimer', parent=self.styles['Normal'],
            fontSize=8, leading=11, spaceAfter=4,
            textColor=_BLACK, alignment=TA_JUSTIFY
        ))
        add(ParagraphStyle(
            'DisclaimerBold', parent=self.styles['Normal'],
            fontSize=9, leading=12, spaceAfter=6,
            textColor=_BLACK, fontName='Helvetica-Bold'
        ))
        add(ParagraphStyle(
            'TOCEntry', parent=self.styles['Normal'],
            fontSize=10, leading=18, spaceAfter=0,
            textColor=_CHARCOAL
        ))
        add(ParagraphStyle(
            'BannerText', parent=self.styles['Normal'],
            fontSize=9, leading=12, spaceAfter=0,
            textColor=_WHITE, fontName='Helvetica-Bold',
            alignment=TA_CENTER
        ))
        add(ParagraphStyle(
            'FooterText', parent=self.styles['Normal'],
            fontSize=7, leading=9, spaceAfter=0,
            textColor=_GRAY500
        ))

    # ──────────────────────────────────────────────────────────
    # Utility helpers
    # ──────────────────────────────────────────────────────────
    def _c(self, text, bold=False, white=False):
        """Create a Paragraph for table cells with proper wrapping."""
        if white:
            style = self.styles['CellWhite']
        elif bold:
            style = self.styles['CellBold']
        else:
            style = self.styles['CellText']
        return Paragraph(str(text), style)

    def _risk_label(self, score):
        if score >= 16: return "Critical"
        if score >= 12: return "High"
        if score >= 8:  return "Medium"
        if score >= 4:  return "Low"
        return "Negligible"

    def _risk_color(self, score):
        if score >= 16: return _CRITICAL
        if score >= 12: return _HIGH
        if score >= 8:  return _MEDIUM
        if score >= 4:  return _LOW
        return _NEGLIG

    def _status_color(self, status):
        s = status.lower()
        if s == 'pass': return _PASS
        if s == 'fail': return _FAIL
        return _NA

    def _base_table_style(self):
        """Common table style commands."""
        return [
            ('FONTSIZE', (0, 0), (-1, -1), 7.5),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.4, _GRAY200),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]

    def _header_row_style(self):
        """Style for table header rows."""
        return [
            ('BACKGROUND', (0, 0), (-1, 0), _NAVY),
            ('TEXTCOLOR', (0, 0), (-1, 0), _WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ]

    def _alternating_rows(self, num_rows):
        """Alternating row background for data rows (skip header)."""
        cmds = []
        for i in range(1, num_rows):
            if i % 2 == 0:
                cmds.append(('BACKGROUND', (0, i), (-1, i), _GRAY50))
        return cmds

    def _make_table(self, data, col_widths, extra_style=None):
        """Create a consistently-styled table."""
        t = Table(data, colWidths=col_widths, repeatRows=1)
        cmds = self._base_table_style() + self._header_row_style()
        cmds += self._alternating_rows(len(data))
        if extra_style:
            cmds += extra_style
        t.setStyle(TableStyle(cmds))
        return t

    # ──────────────────────────────────────────────────────────
    # Page callbacks — header, footer, watermark
    # ──────────────────────────────────────────────────────────
    def _on_page(self, canvas, doc):
        """Draw header, footer, and watermark on every page."""
        canvas.saveState()

        # Watermark
        canvas.setFont('Helvetica-Bold', 64)
        canvas.setFillColorRGB(0.85, 0.15, 0.15, alpha=0.08)
        canvas.translate(PAGE_W / 2, PAGE_H / 2)
        canvas.rotate(45)
        canvas.drawCentredString(0, 0, "CONFIDENTIAL")
        canvas.restoreState()

        canvas.saveState()
        # Header line
        y_header = PAGE_H - 12 * mm
        canvas.setStrokeColor(_GRAY200)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, y_header, PAGE_W - MARGIN, y_header)

        canvas.setFont('Helvetica', 6.5)
        canvas.setFillColor(_GRAY500)
        canvas.drawString(MARGIN, y_header + 2, self._header_left)
        canvas.drawRightString(PAGE_W - MARGIN, y_header + 2, "CONFIDENTIAL")

        # Footer
        y_footer = 10 * mm
        canvas.setStrokeColor(_GRAY200)
        canvas.line(MARGIN, y_footer + 4, PAGE_W - MARGIN, y_footer + 4)

        canvas.setFont('Helvetica', 6.5)
        canvas.setFillColor(_GRAY500)
        canvas.drawString(MARGIN, y_footer - 2,
                          f"Generated: {self._gen_time.strftime('%Y-%m-%d %H:%M UTC')}")
        canvas.drawCentredString(PAGE_W / 2, y_footer - 2,
                                 f"Page {doc.page}")
        canvas.drawRightString(PAGE_W - MARGIN, y_footer - 2,
                               f"SHA-256: {self._integrity_hash}")
        canvas.restoreState()

    # ──────────────────────────────────────────────────────────
    # Main entry point
    # ──────────────────────────────────────────────────────────
    def generate(self, project, threats, compliance_checks, members,
                 audit_logs, diagram_nodes=None) -> bytes:
        """
        Generate a complete TARA report as PDF bytes.
        """
        # Compute integrity hash
        hash_input = f"{project.id}{project.name}{self._gen_time.isoformat()}"
        self._integrity_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]

        vehicle = project.vehicle_profile or {}
        doc_id = f"TARA-{str(project.id)[:8].upper()}-v1.0"

        self._header_left = f"{project.name} — TARA Report {doc_id}"

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            rightMargin=MARGIN, leftMargin=MARGIN,
            topMargin=22 * mm, bottomMargin=18 * mm
        )

        elements = []

        # 0. Cover Page
        elements += self._cover_page(project, vehicle, members, doc_id)
        elements.append(PageBreak())

        # 1. Confidentiality Notice
        elements += self._confidentiality_notice()
        elements.append(PageBreak())

        # 2. Table of Contents
        elements += self._table_of_contents()
        elements.append(PageBreak())

        # 3. Executive Summary
        elements += self._executive_summary(project, vehicle, threats, compliance_checks)
        elements.append(PageBreak())

        # 4. Item Definition (ISO 21434 §15.3)
        elements += self._item_definition(project, vehicle)
        elements.append(PageBreak())

        # 5. Asset Identification (ISO 21434 §15.4)
        elements += self._asset_identification(diagram_nodes)
        elements.append(PageBreak())

        # 6. Threat Scenarios (ISO 21434 §15.5)
        elements += self._threat_scenarios(threats)
        elements.append(PageBreak())

        # 7. Impact Assessment (ISO 21434 §15.6)
        elements += self._impact_assessment(threats)
        elements.append(PageBreak())

        # 8. Attack Feasibility (ISO 21434 §15.7)
        elements += self._attack_feasibility(threats)
        elements.append(PageBreak())

        # 9. Risk Assessment (ISO 21434 §15.8)
        elements += self._risk_assessment(threats)
        elements.append(PageBreak())

        # 10. Risk Treatment (ISO 21434 §15.9)
        elements += self._risk_treatment(threats)
        elements.append(PageBreak())

        # 11. Compliance Assessment (R155/R156)
        elements += self._compliance_section(compliance_checks)
        elements.append(PageBreak())

        # 12. Residual Risk Statement
        elements += self._residual_risk(project, threats)
        elements.append(PageBreak())

        # 13. Assumptions and Limitations
        elements += self._assumptions_limitations(vehicle)
        elements.append(PageBreak())

        # 14. Audit Trail
        elements += self._audit_trail(audit_logs)
        elements.append(PageBreak())

        # 15. Version History
        elements += self._version_history(project, members, threats)

        # 16. References
        elements += self._references()

        # 17. Glossary
        elements += self._glossary()

        doc.build(elements, onFirstPage=self._on_page, onLaterPages=self._on_page)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    # ══════════════════════════════════════════════════════════
    # SECTION BUILDERS
    # ══════════════════════════════════════════════════════════

    def _cover_page(self, project, vehicle, members, doc_id):
        els = []
        els.append(Spacer(1, 25 * mm))

        # ATMT Logo (text-based)
        els.append(Paragraph(
            '<font color="#1F4E79" size="28"><b>ATMT</b></font>',
            self.styles['CoverTitle']
        ))
        els.append(Paragraph(
            "Automotive Threat Modeling Tool",
            self.styles['CoverSubtitle']
        ))
        els.append(Spacer(1, 15 * mm))

        # Document Title
        els.append(Paragraph(
            "Cybersecurity Threat Analysis and<br/>Risk Assessment Report",
            self.styles['CoverTitle']
        ))
        els.append(Spacer(1, 6 * mm))

        # Project name
        els.append(Paragraph(
            f'<font size="14"><b>{project.name}</b></font>',
            ParagraphStyle('tmp', parent=self.styles['Normal'],
                           alignment=TA_CENTER, textColor=_SLATE, fontSize=14)
        ))
        els.append(Spacer(1, 4 * mm))

        # Vehicle summary line
        sae = vehicle.get('sae_level', 'N/A')
        sae_desc = SAE_DESCRIPTIONS.get(int(sae) if str(sae).isdigit() else -1, '')
        ota_text = "OTA Enabled" if vehicle.get('ota_support') else "No OTA"
        summary_line = (
            f"{vehicle.get('propulsion', 'N/A')} · "
            f"{vehicle.get('architecture', 'N/A')} · "
            f"SAE Level {sae} · {ota_text}"
        )
        els.append(Paragraph(summary_line,
            ParagraphStyle('tmp2', parent=self.styles['Normal'],
                           alignment=TA_CENTER, textColor=_GRAY500, fontSize=9)
        ))
        els.append(Spacer(1, 8 * mm))

        # Classification banner
        banner_data = [[Paragraph(
            "CONFIDENTIAL — RESTRICTED DISTRIBUTION",
            self.styles['BannerText']
        )]]
        banner = Table(banner_data, colWidths=[CONTENT_W])
        banner.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), _CRITICAL),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        els.append(banner)
        els.append(Spacer(1, 8 * mm))

        # Document metadata
        meta_data = [
            [self._c("Document ID", True), self._c(doc_id)],
            [self._c("Version", True), self._c("1.0")],
            [self._c("Date", True), self._c(self._gen_time.strftime("%Y-%m-%d"))],
            [self._c("Classification", True), self._c("Confidential — Restricted Distribution")],
        ]
        meta_t = Table(meta_data, colWidths=[40 * mm, CONTENT_W - 40 * mm])
        meta_t.setStyle(TableStyle(
            self._base_table_style() + [
                ('BACKGROUND', (0, 0), (0, -1), _NAVY),
                ('TEXTCOLOR', (0, 0), (0, -1), _WHITE),
            ]
        ))
        els.append(meta_t)
        els.append(Spacer(1, 10 * mm))

        # Approval block
        els.append(Paragraph("<b>Document Approval</b>", self.styles['SubHeader']))

        role_map = {
            'engineer': 'Cybersecurity Engineer',
            'manager': 'Compliance Manager',
            'viewer': 'External Auditor',
        }
        approval_data = [
            [self._c("Role", True, white=True),
             self._c("Full Name", True, white=True),
             self._c("Signature", True, white=True),
             self._c("Date", True, white=True)]
        ]
        used_roles = set()
        for m in members:
            mapped = role_map.get(m.get('role', ''), m.get('role', '').capitalize())
            if mapped not in used_roles:
                used_roles.add(mapped)
                approval_data.append([
                    self._c(mapped),
                    self._c(m.get('full_name', 'N/A')),
                    self._c("_______________________"),
                    self._c("____/____/________")
                ])

        # Fill missing roles
        for role_label in ['Cybersecurity Engineer', 'System Architect',
                           'Compliance Manager', 'External Auditor']:
            if role_label not in used_roles:
                approval_data.append([
                    self._c(role_label),
                    self._c("_______________________"),
                    self._c("_______________________"),
                    self._c("____/____/________")
                ])

        approval_t = self._make_table(
            approval_data,
            [40 * mm, 45 * mm, 42 * mm, 35 * mm]
        )
        els.append(approval_t)

        return els

    # ──────────────────────────────────────────────────────────
    def _confidentiality_notice(self):
        els = []
        els.append(Spacer(1, 20 * mm))
        els.append(Paragraph(
            "CONFIDENTIALITY NOTICE AND LEGAL DISCLAIMER",
            ParagraphStyle('ConfTitle', parent=self.styles['CoverTitle'],
                           fontSize=16, textColor=_CHARCOAL)
        ))
        els.append(Spacer(1, 10 * mm))

        sections = [
            ("", "This document contains proprietary and confidential information relating to the "
             "cybersecurity architecture and risk posture of the vehicle system identified herein. "
             "It is prepared exclusively for internal use and authorized recipients involved in "
             "the type approval process under UNECE Regulation No. 155."),

            ("UNAUTHORIZED DISCLOSURE PROHIBITED",
             "Any unauthorized review, copying, reproduction, transmission, or distribution of "
             "this document or its contents, in whole or in part, is strictly prohibited and may "
             "constitute a violation of applicable trade secret, intellectual property, and "
             "data protection laws, including but not limited to the General Data Protection "
             "Regulation (GDPR) — Regulation (EU) 2016/679."),

            ("CYBERSECURITY SENSITIVITY",
             "This document contains detailed information about potential vulnerabilities, "
             "attack vectors, and security weaknesses of a vehicle system. Unauthorized "
             "disclosure may compromise vehicle safety and endanger human life. Recipients "
             "are required to handle this document in accordance with the organization's "
             "Information Security Policy and applicable Non-Disclosure Agreements."),

            ("VALIDITY AND SCOPE",
             "This TARA report reflects the cybersecurity risk assessment valid at the time "
             "of generation. The analysis is based on the vehicle architecture, threat landscape, "
             "and mitigation controls available at the document generation date. The assessment "
             "is subject to review and update upon any significant change to the vehicle "
             "architecture, operating environment, or emergence of new threat intelligence."),

            ("COMPLIANCE BASIS",
             "This report has been prepared in accordance with:\n"
             "• ISO/SAE 21434:2021 — Road Vehicles: Cybersecurity Engineering\n"
             "• UNECE Regulation No. 155 — Cyber Security and Cyber Security Management System\n"
             "• UNECE Regulation No. 156 — Software Update and Software Update Management System\n"
             "• MITRE CAPEC — Common Attack Pattern Enumeration and Classification\n"
             "• LINDDUN — Privacy Threat Modeling Methodology"),
        ]

        for title, body in sections:
            if title:
                els.append(Paragraph(f"<b>{title}</b>", self.styles['DisclaimerBold']))
            # Replace newlines with <br/> for proper rendering
            body_html = body.replace("\n", "<br/>")
            els.append(Paragraph(body_html, self.styles['Disclaimer']))
            els.append(Spacer(1, 3 * mm))

        els.append(Spacer(1, 10 * mm))
        els.append(Paragraph(
            f"© {self._gen_time.year} ATMT Platform. All rights reserved.",
            ParagraphStyle('copy', parent=self.styles['Normal'],
                           fontSize=8, textColor=_GRAY500, alignment=TA_CENTER)
        ))
        return els

    # ──────────────────────────────────────────────────────────
    def _table_of_contents(self):
        els = []
        els.append(Paragraph("Table of Contents", self.styles['SectionHeader']))
        els.append(Spacer(1, 6 * mm))

        toc_entries = [
            "1. Executive Summary",
            "2. Item Definition (ISO 21434 §15.3)",
            "3. Asset Identification (ISO 21434 §15.4)",
            "4. Threat Scenarios (ISO 21434 §15.5)",
            "5. Impact Assessment (ISO 21434 §15.6)",
            "6. Attack Feasibility (ISO 21434 §15.7)",
            "7. Risk Assessment (ISO 21434 §15.8)",
            "8. Risk Treatment (ISO 21434 §15.9)",
            "9. Compliance Assessment (R155/R156)",
            "10. Residual Risk Statement",
            "11. Assumptions and Limitations",
            "12. Audit Trail",
            "13. Version History",
            "14. References",
            "15. Glossary",
        ]
        for entry in toc_entries:
            els.append(Paragraph(entry, self.styles['TOCEntry']))
        return els

    # ──────────────────────────────────────────────────────────
    def _executive_summary(self, project, vehicle, threats, compliance):
        els = []
        els.append(Paragraph("1. Executive Summary", self.styles['SectionHeader']))

        total = len(threats)
        critical = sum(1 for t in threats if t.risk_score >= 16)
        high = sum(1 for t in threats if 12 <= t.risk_score <= 15)
        mitigated = sum(1 for t in threats if t.status == 'mitigated')
        accepted = sum(1 for t in threats if t.status == 'accepted')
        open_count = sum(1 for t in threats if t.status == 'open')
        resolved = mitigated + accepted
        closure_rate = round(resolved / total * 100) if total > 0 else 0

        checks = compliance.get('checks', [])
        passed = sum(1 for c in checks if c['status'] == 'pass')
        applicable = sum(1 for c in checks if c['status'] != 'n/a')
        comp_pct = round(passed / applicable * 100) if applicable > 0 else 0

        # Propulsion and architecture
        prop = vehicle.get('propulsion', 'N/A')
        arch = vehicle.get('architecture', 'N/A')
        sae = vehicle.get('sae_level', 'N/A')
        ota = vehicle.get('ota_support', False)
        ota_text = ", with OTA software update support (UNECE R156 applicable)" if ota else ""

        intro = (
            f"This report documents the Cybersecurity Threat Analysis and Risk Assessment (TARA) "
            f"conducted for <b>{project.name}</b>, a {prop} vehicle featuring {arch} "
            f"architecture with SAE Level {sae} automation capability{ota_text}."
            f"<br/><br/>"
            f"The analysis was performed in accordance with ISO/SAE 21434:2021, Clauses 15.3 "
            f"through 15.9, and produces evidence required for type approval under UNECE "
            f"Regulation No. 155."
        )
        els.append(Paragraph(intro, self.styles['Body']))
        els.append(Spacer(1, 4 * mm))

        els.append(Paragraph("<b>ANALYSIS SUMMARY</b>", self.styles['SubHeader']))

        summary_data = [
            [self._c("Metric", True, white=True), self._c("Value", True, white=True)],
            [self._c("Total threats identified"), self._c(str(total))],
            [self._c("Critical risks (score 16-20)"), self._c(str(critical))],
            [self._c("High risks (score 12-15)"), self._c(str(high))],
            [self._c("Threats mitigated"), self._c(f"{mitigated}")],
            [self._c("Threats accepted"), self._c(f"{accepted}")],
            [self._c("Open threats"), self._c(str(open_count))],
            [self._c("Closure rate"), self._c(f"{closure_rate}%")],
            [self._c("Compliance score"), self._c(f"{comp_pct}% ({passed}/{applicable} checks)")],
        ]
        els.append(self._make_table(summary_data, [80 * mm, 80 * mm]))
        els.append(Spacer(1, 6 * mm))

        els.append(Paragraph("<b>OVERALL ASSESSMENT</b>", self.styles['SubHeader']))

        open_critical = sum(1 for t in threats if t.risk_score >= 16 and t.status == 'open')
        if open_critical == 0:
            assessment = (
                "The cybersecurity risk posture of this item has been assessed as "
                "<b>ACCEPTABLE</b>. All critical and high risks have been addressed with "
                "appropriate technical controls. The residual risk level is within the defined "
                "acceptance criteria."
            )
        else:
            assessment = (
                f"The cybersecurity risk posture of this item requires further attention. "
                f"<b>{open_critical} critical risk(s)</b> remain open and must be addressed "
                f"prior to type approval submission."
            )
        els.append(Paragraph(assessment, self.styles['Body']))
        return els

    # ──────────────────────────────────────────────────────────
    def _item_definition(self, project, vehicle):
        els = []
        els.append(Paragraph("2. Item Definition (ISO 21434 §15.3)", self.styles['SectionHeader']))

        # 2.1
        els.append(Paragraph("2.1 Item Description", self.styles['SubHeader']))
        desc = project.description or "No description provided."
        els.append(Paragraph(desc, self.styles['Body']))

        # 2.2
        els.append(Paragraph("2.2 Operational Context", self.styles['SubHeader']))
        sae = vehicle.get('sae_level', 'N/A')
        sae_desc = SAE_DESCRIPTIONS.get(int(sae) if str(sae).isdigit() else -1, '')
        ota = vehicle.get('ota_support', False)
        interfaces = vehicle.get('external_interfaces', [])

        ctx_data = [
            [self._c("Parameter", True, white=True), self._c("Value", True, white=True)],
            [self._c("Propulsion system"), self._c(vehicle.get('propulsion', 'N/A'))],
            [self._c("Vehicle architecture"), self._c(vehicle.get('architecture', 'N/A'))],
            [self._c("Automation level"), self._c(f"SAE Level {sae} — {sae_desc}")],
            [self._c("OTA capability"), self._c(
                f"{'Yes — R156 applicable' if ota else 'No — R156 not applicable'}")],
            [self._c("External interfaces"), self._c(", ".join(interfaces) if interfaces else "None declared")],
        ]
        els.append(self._make_table(ctx_data, [50 * mm, CONTENT_W - 50 * mm]))
        els.append(Spacer(1, 4 * mm))

        # 2.3
        els.append(Paragraph("2.3 Business Objectives (ISO 21434 §15.3)", self.styles['SubHeader']))
        objectives = project.business_objectives or []
        if objectives:
            els.append(Paragraph(
                "The following cybersecurity objectives have been defined for this item:",
                self.styles['Body']
            ))
            for i, obj in enumerate(objectives, 1):
                els.append(Paragraph(f"<b>OBJ-{i:02d}:</b> {obj}", self.styles['Body']))
        else:
            els.append(Paragraph("No formal business objectives have been recorded for this project.",
                                 self.styles['Body']))

        # 2.4
        els.append(Paragraph("2.4 Scope and Boundaries", self.styles['SubHeader']))
        scope_text = (
            "<b>IN SCOPE:</b> All electronic control units, communication interfaces, and data flows "
            "represented in the DFD Level 1 diagram attached to this project."
            "<br/><br/>"
            "<b>OUT OF SCOPE:</b> Software component internals (DFD Level 2), supplier-internal "
            "ECU architectures where cybersecurity responsibility is contractually delegated "
            "to the Tier-1 supplier, and post-production field security monitoring."
        )
        els.append(Paragraph(scope_text, self.styles['Body']))
        return els

    # ──────────────────────────────────────────────────────────
    def _asset_identification(self, diagram_nodes):
        els = []
        els.append(Paragraph("3. Asset Identification (ISO 21434 §15.4)", self.styles['SectionHeader']))

        els.append(Paragraph(
            "The following assets have been identified from the system Data Flow Diagram (DFD Level 1). "
            "Each asset represents a component, interface, or data store that may be subject to "
            "cybersecurity threats as defined in ISO 21434 §15.4.",
            self.styles['Body']
        ))
        els.append(Spacer(1, 3 * mm))

        if not diagram_nodes:
            els.append(Paragraph(
                "<i>No diagram nodes available. Asset identification is based on the DFD "
                "attached to this project.</i>",
                self.styles['Body']
            ))
            return els

        asset_data = [
            [self._c("ID", True, white=True),
             self._c("Name", True, white=True),
             self._c("Category", True, white=True),
             self._c("Interfaces", True, white=True)]
        ]
        for i, node in enumerate(diagram_nodes, 1):
            data = node.get('data', {})
            if data.get('is_trust_boundary'):
                continue
            label = data.get('label', node.get('attrs', {}).get('label', {}).get('text', 'Unknown'))
            category = data.get('category', 'N/A')
            ifaces = data.get('interfaces', [])
            ifaces_str = ", ".join(ifaces) if isinstance(ifaces, list) and ifaces else "—"
            asset_data.append([
                self._c(f"A-{i:02d}"),
                self._c(label),
                self._c(category),
                self._c(ifaces_str),
            ])

        if len(asset_data) > 1:
            els.append(self._make_table(
                asset_data, [15 * mm, 50 * mm, 40 * mm, CONTENT_W - 105 * mm]
            ))
        else:
            els.append(Paragraph("<i>No component assets found in diagram.</i>", self.styles['Body']))

        return els

    # ──────────────────────────────────────────────────────────
    def _threat_scenarios(self, threats):
        els = []
        els.append(Paragraph("4. Threat Scenarios (ISO 21434 §15.5)", self.styles['SectionHeader']))

        els.append(Paragraph(
            "The following threat scenarios have been identified through automated analysis "
            "using STRIDE-per-element decomposition, CAPEC automotive patterns, and LINDDUN "
            "privacy threat methodology. Each scenario is mapped to the relevant asset and "
            "classified by attack category.",
            self.styles['Body']
        ))
        els.append(Spacer(1, 3 * mm))

        sorted_threats = sorted(threats, key=lambda t: t.risk_score, reverse=True)

        t_data = [
            [self._c("ID", True, white=True),
             self._c("Title", True, white=True),
             self._c("STRIDE", True, white=True),
             self._c("Source", True, white=True),
             self._c("Asset", True, white=True)]
        ]
        for i, t in enumerate(sorted_threats, 1):
            asset = getattr(t, 'asset_name', None) or t.asset_id
            source = f"{t.source or ''} {t.source_ref or ''}".strip() or "N/A"
            t_data.append([
                self._c(f"T-{i:02d}"),
                self._c(t.title),
                self._c(t.stride_category),
                self._c(source),
                self._c(asset),
            ])

        els.append(self._make_table(
            t_data, [12 * mm, 55 * mm, 22 * mm, 32 * mm, 40 * mm]
        ))
        return els

    # ──────────────────────────────────────────────────────────
    def _impact_assessment(self, threats):
        els = []
        els.append(Paragraph("5. Impact Assessment (ISO 21434 §15.6)", self.styles['SectionHeader']))

        els.append(Paragraph("5.1 Impact Assessment Methodology", self.styles['SubHeader']))
        method_text = (
            "Impact has been evaluated across four dimensions as defined in ISO 21434 §15.6:"
            "<br/><br/>"
            "• <b>Safety (S):</b> Potential for physical harm to persons<br/>"
            "• <b>Financial (F):</b> Economic losses to users or manufacturers<br/>"
            "• <b>Operational (O):</b> Degradation of vehicle functionality<br/>"
            "• <b>Privacy (P):</b> Unauthorized processing of personal data (GDPR/LINDDUN)"
            "<br/><br/>"
            "Impact scale: 1 = Negligible, 2 = Minor, 3 = Major, 4 = Severe<br/>"
            "The aggregated impact value is calculated as: <b>Impact = max(S, F, O, P)</b>"
        )
        els.append(Paragraph(method_text, self.styles['Body']))
        els.append(Spacer(1, 4 * mm))

        els.append(Paragraph("5.2 Impact Scores", self.styles['SubHeader']))

        sorted_threats = sorted(threats, key=lambda t: t.risk_score, reverse=True)
        i_data = [
            [self._c("ID", True, white=True),
             self._c("Threat", True, white=True),
             self._c("S", True, white=True),
             self._c("F", True, white=True),
             self._c("O", True, white=True),
             self._c("P", True, white=True),
             self._c("Aggregated", True, white=True)]
        ]
        for i, t in enumerate(sorted_threats, 1):
            agg = max(t.impact_safety, t.impact_financial,
                      t.impact_operational, t.impact_privacy)
            i_data.append([
                self._c(f"T-{i:02d}"),
                self._c(t.title),
                self._c(str(t.impact_safety)),
                self._c(str(t.impact_financial)),
                self._c(str(t.impact_operational)),
                self._c(str(t.impact_privacy)),
                self._c(str(agg)),
            ])

        els.append(self._make_table(
            i_data, [12 * mm, 65 * mm, 12 * mm, 12 * mm, 12 * mm, 12 * mm, 20 * mm]
        ))
        return els

    # ──────────────────────────────────────────────────────────
    def _attack_feasibility(self, threats):
        els = []
        els.append(Paragraph("6. Attack Feasibility (ISO 21434 §15.7)", self.styles['SectionHeader']))

        els.append(Paragraph("6.1 Feasibility Assessment Methodology", self.styles['SubHeader']))
        method_text = (
            "Attack feasibility has been evaluated using the Attack Vector methodology "
            "adapted from CVSS v3.1, calibrated for the automotive attack surface:"
            "<br/><br/>"
            "<b>Score 1</b> — Very High Difficulty: Physical access + specialized laboratory equipment required<br/>"
            "<b>Score 2</b> — High Difficulty: Physical access to vehicle required (e.g., OBD-II port)<br/>"
            "<b>Score 3</b> — Moderate: Adjacent network access required (Bluetooth/Wi-Fi proximity)<br/>"
            "<b>Score 4</b> — Low Difficulty: Network access to OEM infrastructure required<br/>"
            "<b>Score 5</b> — Trivial: Remote attack via public internet, no authentication required"
        )
        els.append(Paragraph(method_text, self.styles['Body']))
        els.append(Spacer(1, 4 * mm))

        els.append(Paragraph("6.2 Feasibility Scores", self.styles['SubHeader']))

        sorted_threats = sorted(threats, key=lambda t: t.risk_score, reverse=True)
        f_data = [
            [self._c("ID", True, white=True),
             self._c("Threat", True, white=True),
             self._c("Asset", True, white=True),
             self._c("Feasibility", True, white=True)]
        ]
        for i, t in enumerate(sorted_threats, 1):
            asset = getattr(t, 'asset_name', None) or t.asset_id
            f_data.append([
                self._c(f"T-{i:02d}"),
                self._c(t.title),
                self._c(asset),
                self._c(str(t.feasibility)),
            ])
        els.append(self._make_table(
            f_data, [12 * mm, 60 * mm, 50 * mm, 25 * mm]
        ))
        return els

    # ──────────────────────────────────────────────────────────
    def _risk_assessment(self, threats):
        els = []
        els.append(Paragraph("7. Risk Assessment (ISO 21434 §15.8)", self.styles['SectionHeader']))

        els.append(Paragraph("7.1 Risk Calculation Methodology", self.styles['SubHeader']))
        method_text = (
            "Risk Value = Impact × Feasibility"
            "<br/><br/>"
            "<b>Risk Level Classification:</b><br/>"
            "• 16–20: <b>CRITICAL</b> — Immediate treatment required, blocks type approval<br/>"
            "• 12–15: <b>HIGH</b> — Treatment required before production release<br/>"
            "• 8–11: <b>MEDIUM</b> — Treatment required with documented timeline<br/>"
            "• 4–7: <b>LOW</b> — Treatment recommended, may be accepted with justification<br/>"
            "• 1–3: <b>NEGLIGIBLE</b> — May be accepted without additional treatment"
        )
        els.append(Paragraph(method_text, self.styles['Body']))
        els.append(Spacer(1, 4 * mm))

        # Risk Matrix
        els.append(Paragraph("7.2 Risk Matrix", self.styles['SubHeader']))
        matrix_header = [
            self._c("Impact \\ Feasibility", True, white=True),
            self._c("1", True, white=True),
            self._c("2", True, white=True),
            self._c("3", True, white=True),
            self._c("4", True, white=True),
            self._c("5", True, white=True),
        ]
        matrix_data = [matrix_header]
        for impact in [4, 3, 2, 1]:
            row = [self._c(str(impact), True)]
            for feas in range(1, 6):
                score = impact * feas
                label = self._risk_label(score)
                row.append(self._c(f"{score}\n{label}"))
            matrix_data.append(row)

        matrix_t = Table(matrix_data, colWidths=[35 * mm] + [26 * mm] * 5)
        m_style = self._base_table_style() + self._header_row_style()
        # Color each cell by risk level
        for ri, impact in enumerate([4, 3, 2, 1], 1):
            for ci, feas in enumerate(range(1, 6), 1):
                score = impact * feas
                m_style.append(('BACKGROUND', (ci, ri), (ci, ri), self._risk_color(score)))
                m_style.append(('TEXTCOLOR', (ci, ri), (ci, ri), _WHITE))
                m_style.append(('ALIGN', (ci, ri), (ci, ri), 'CENTER'))
        matrix_t.setStyle(TableStyle(m_style))
        els.append(matrix_t)
        els.append(Spacer(1, 6 * mm))

        # Risk scores table
        els.append(Paragraph("7.3 Risk Scores", self.styles['SubHeader']))
        sorted_threats = sorted(threats, key=lambda t: t.risk_score, reverse=True)
        r_data = [
            [self._c("ID", True, white=True),
             self._c("Threat", True, white=True),
             self._c("Impact", True, white=True),
             self._c("Feas.", True, white=True),
             self._c("Risk", True, white=True),
             self._c("Level", True, white=True),
             self._c("Status", True, white=True)]
        ]
        extra = []
        for i, t in enumerate(sorted_threats, 1):
            agg = max(t.impact_safety, t.impact_financial,
                      t.impact_operational, t.impact_privacy)
            r_data.append([
                self._c(f"T-{i:02d}"),
                self._c(t.title),
                self._c(str(agg)),
                self._c(str(t.feasibility)),
                self._c(str(t.risk_score)),
                self._c(self._risk_label(t.risk_score)),
                self._c(t.status.capitalize()),
            ])
            # Color the risk level cell
            row_idx = i
            rc = self._risk_color(t.risk_score)
            extra.append(('BACKGROUND', (5, row_idx), (5, row_idx), rc))
            extra.append(('TEXTCOLOR', (5, row_idx), (5, row_idx), _WHITE))

        els.append(self._make_table(
            r_data, [12 * mm, 52 * mm, 16 * mm, 14 * mm, 14 * mm, 22 * mm, 22 * mm],
            extra_style=extra
        ))
        return els

    # ──────────────────────────────────────────────────────────
    def _risk_treatment(self, threats):
        els = []
        els.append(Paragraph("8. Risk Treatment (ISO 21434 §15.9)", self.styles['SectionHeader']))

        els.append(Paragraph("8.1 Treatment Strategy", self.styles['SubHeader']))
        strategy_text = (
            "For each identified risk, one of the following treatment options has been applied "
            "in accordance with ISO 21434 §15.9:"
            "<br/><br/>"
            "<b>AVOID:</b> The feature or component introducing the risk has been removed from scope.<br/>"
            "<b>MITIGATE:</b> Technical or organizational controls have been implemented to reduce "
            "the risk to an acceptable level.<br/>"
            "<b>TRANSFER:</b> Cybersecurity responsibility has been contractually transferred to a "
            "qualified third party (e.g., certified Tier-1 supplier).<br/>"
            "<b>ACCEPT:</b> The residual risk has been formally accepted by the responsible "
            "Cybersecurity Manager with documented justification."
        )
        els.append(Paragraph(strategy_text, self.styles['Body']))
        els.append(Spacer(1, 4 * mm))

        els.append(Paragraph("8.2 Treatment Decisions", self.styles['SubHeader']))

        sorted_threats = sorted(threats, key=lambda t: t.risk_score, reverse=True)
        tr_data = [
            [self._c("ID", True, white=True),
             self._c("Threat", True, white=True),
             self._c("Risk", True, white=True),
             self._c("Treatment", True, white=True),
             self._c("Status", True, white=True),
             self._c("Justification", True, white=True)]
        ]
        for i, t in enumerate(sorted_threats, 1):
            treatment = (t.treatment or "None").capitalize()
            justification = t.justification or "—"
            tr_data.append([
                self._c(f"T-{i:02d}"),
                self._c(t.title),
                self._c(str(t.risk_score)),
                self._c(treatment),
                self._c(t.status.capitalize()),
                self._c(justification),
            ])
        els.append(self._make_table(
            tr_data, [12 * mm, 40 * mm, 14 * mm, 20 * mm, 18 * mm, CONTENT_W - 104 * mm]
        ))
        return els

    # ──────────────────────────────────────────────────────────
    def _compliance_section(self, compliance_checks):
        els = []
        els.append(Paragraph("9. Compliance Assessment (R155/R156)", self.styles['SectionHeader']))

        els.append(Paragraph(
            "The following compliance checks have been evaluated against the applicable "
            "regulatory requirements. Each check is mapped to the specific regulation "
            "article and clause.",
            self.styles['Body']
        ))
        els.append(Spacer(1, 3 * mm))

        checks = compliance_checks.get('checks', [])

        c_data = [
            [self._c("ID", True, white=True),
             self._c("Regulation", True, white=True),
             self._c("Requirement", True, white=True),
             self._c("Reference", True, white=True),
             self._c("Status", True, white=True)]
        ]
        extra = []
        for i, check in enumerate(checks):
            sc = self._status_color(check['status'])
            c_data.append([
                self._c(check['id']),
                self._c(check['regulation']),
                self._c(check['title']),
                self._c(check.get('reference', '')),
                self._c(check['status'].upper(), bold=True, white=True),
            ])
            row_idx = i + 1
            extra.append(('BACKGROUND', (4, row_idx), (4, row_idx), sc))
            extra.append(('ALIGN', (4, row_idx), (4, row_idx), 'CENTER'))

        els.append(self._make_table(
            c_data, [16 * mm, 22 * mm, 55 * mm, 32 * mm, 16 * mm],
            extra_style=extra
        ))

        # Summary
        els.append(Spacer(1, 4 * mm))
        passed = sum(1 for c in checks if c['status'] == 'pass')
        failed = sum(1 for c in checks if c['status'] == 'fail')
        na = sum(1 for c in checks if c['status'] == 'n/a')
        applicable = passed + failed
        pct = round(passed / applicable * 100) if applicable > 0 else 0

        summary = (
            f"<b>Compliance Summary:</b> {passed} passed, {failed} failed, "
            f"{na} not applicable. Overall compliance rate: <b>{pct}%</b>."
        )
        els.append(Paragraph(summary, self.styles['Body']))

        return els

    # ──────────────────────────────────────────────────────────
    def _residual_risk(self, project, threats):
        els = []
        els.append(Paragraph("10. Residual Risk Statement", self.styles['SectionHeader']))

        els.append(Paragraph(
            "<b>RESIDUAL RISK ACCEPTANCE STATEMENT</b>",
            self.styles['SubHeader']
        ))

        total = len(threats)
        critical = sum(1 for t in threats if t.risk_score >= 16)
        open_critical = sum(1 for t in threats if t.risk_score >= 16 and t.status == 'open')
        open_all = sum(1 for t in threats if t.status == 'open')
        resolved_critical = critical - open_critical

        is_acceptable = open_critical == 0

        text = (
            f"Having completed the Threat Analysis and Risk Assessment for "
            f"<b>{project.name}</b> in accordance with ISO/SAE 21434:2021, the following "
            f"residual risk statement is hereby issued:"
            f"<br/><br/>"
            f"All identified cybersecurity risks have been evaluated, and appropriate "
            f"treatment measures have been applied. The residual risks remaining after "
            f"treatment are assessed as "
        )

        if is_acceptable:
            text += (
                f"<b>ACCEPTABLE</b> based on the risk acceptance criteria defined "
                f"for this project."
                f"<br/><br/>"
                f"The cybersecurity risk posture of this item is deemed acceptable for "
                f"progression to the next development phase / type approval submission."
            )
        else:
            open_titles = [t.title for t in threats if t.risk_score >= 16 and t.status == 'open']
            text += (
                f"<b>REQUIRING FURTHER ACTION</b>."
                f"<br/><br/>"
                f"The following critical risks remain unresolved:<br/>"
                + "<br/>".join(f"• {title}" for title in open_titles)
            )

        els.append(Paragraph(text, self.styles['Body']))
        els.append(Spacer(1, 4 * mm))

        # Stats
        stats_data = [
            [self._c("Metric", True, white=True), self._c("Value", True, white=True)],
            [self._c("Critical risks resolved"), self._c(f"{resolved_critical}/{critical}")],
            [self._c("Unresolved open risks"), self._c(str(open_all))],
            [self._c("Assessment date"), self._c(self._gen_time.strftime("%Y-%m-%d %H:%M UTC"))],
        ]
        els.append(self._make_table(stats_data, [60 * mm, 60 * mm]))
        els.append(Spacer(1, 10 * mm))

        # Signature block
        sig_data = [
            ["Responsible Cybersecurity Engineer: _______________________", ""],
            ["Date: _______________________", ""],
        ]
        sig_t = Table(sig_data, colWidths=[100 * mm, 60 * mm])
        sig_t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        els.append(sig_t)

        return els

    # ──────────────────────────────────────────────────────────
    def _assumptions_limitations(self, vehicle):
        els = []
        els.append(Paragraph("11. Assumptions and Limitations", self.styles['SectionHeader']))

        els.append(Paragraph("<b>ASSUMPTIONS</b>", self.styles['SubHeader']))
        els.append(Paragraph(
            "The following assumptions were made during this analysis:",
            self.styles['Body']
        ))

        assumptions = [
            ("A-01", "Physical access to the vehicle interior is restricted to authorized "
             "personnel. Tamper-evident seals are assumed to be in place on all "
             "diagnostic interfaces."),
            ("A-02", "The OEM backend infrastructure is assumed to implement industry-standard "
             "security controls including TLS 1.3, certificate-based authentication, "
             "and intrusion detection systems."),
            ("A-03", "All Tier-1 suppliers have implemented cybersecurity measures compliant "
             "with ISO/SAE 21434 for their respective ECU deliverables."),
            ("A-04", "The vehicle operates in the threat environment defined by UNECE R155 "
             "Annex 5, Table A1."),
        ]

        if vehicle.get('ota_support'):
            assumptions.append(
                ("A-05", "OTA update infrastructure implements digital signature "
                 "verification and rollback protection as required by UNECE R156.")
            )

        a_data = [[self._c("ID", True, white=True), self._c("Assumption", True, white=True)]]
        for aid, text in assumptions:
            a_data.append([self._c(aid, True), self._c(text)])

        els.append(self._make_table(a_data, [18 * mm, CONTENT_W - 18 * mm]))
        els.append(Spacer(1, 6 * mm))

        els.append(Paragraph("<b>LIMITATIONS</b>", self.styles['SubHeader']))

        limitations = [
            ("L-01", "This analysis is limited to DFD Level 1 (system-level) decomposition. "
             "Component-level analysis (DFD Level 2) is outside the scope of this "
             "document and is the responsibility of individual ECU suppliers."),
            ("L-02", "The threat library used reflects the state of automotive cybersecurity "
             "knowledge as of the analysis date. Emerging threats identified after "
             "this date require a delta analysis."),
            ("L-03", "Quantitative probability assessments are not included in this TARA, "
             "consistent with ISO 21434 §15.8 which does not mandate probabilistic "
             "risk assessment."),
        ]

        l_data = [[self._c("ID", True, white=True), self._c("Limitation", True, white=True)]]
        for lid, text in limitations:
            l_data.append([self._c(lid, True), self._c(text)])

        els.append(self._make_table(l_data, [18 * mm, CONTENT_W - 18 * mm]))
        return els

    # ──────────────────────────────────────────────────────────
    def _audit_trail(self, audit_logs):
        els = []
        els.append(Paragraph("12. Audit Trail", self.styles['SectionHeader']))

        els.append(Paragraph(
            "The following table documents all significant actions performed on this project, "
            "providing the traceability required by ISO 21434 §5.4.3 and UNECE R155 Article 7.2.2.5.",
            self.styles['Body']
        ))
        els.append(Spacer(1, 3 * mm))

        if not audit_logs:
            els.append(Paragraph(
                "<i>No audit log entries found for this project.</i>",
                self.styles['Body']
            ))
            return els

        au_data = [
            [self._c("Timestamp", True, white=True),
             self._c("User", True, white=True),
             self._c("Action", True, white=True),
             self._c("Justification", True, white=True)]
        ]
        for log in audit_logs:
            justif = log.get('justification') or "—"
            action = log.get('action', '').replace('_', ' ').capitalize()
            au_data.append([
                self._c(log.get('date', '')),
                self._c(log.get('user', 'System')),
                self._c(action),
                self._c(justif),
            ])

        els.append(self._make_table(
            au_data, [28 * mm, 38 * mm, 35 * mm, CONTENT_W - 101 * mm]
        ))
        return els

    # ──────────────────────────────────────────────────────────
    def _version_history(self, project, members, threats):
        els = []
        els.append(Paragraph("13. Version History", self.styles['SectionHeader']))

        # Find engineer name
        engineer_name = "System"
        for m in members:
            if m.get('role') == 'engineer':
                engineer_name = m.get('full_name', m.get('email', 'System'))
                break

        mitigated = sum(1 for t in threats if t.status == 'mitigated')

        v_data = [
            [self._c("Version", True, white=True),
             self._c("Date", True, white=True),
             self._c("Author", True, white=True),
             self._c("Changes", True, white=True)],
            [self._c("0.1"),
             self._c(project.created_at.strftime("%Y-%m-%d") if project.created_at else "N/A"),
             self._c(engineer_name),
             self._c("Initial threat identification and project setup")],
            [self._c("1.0"),
             self._c(self._gen_time.strftime("%Y-%m-%d")),
             self._c(engineer_name),
             self._c(f"Final report — {len(threats)} threats identified, {mitigated} mitigated")],
        ]
        els.append(self._make_table(
            v_data, [20 * mm, 25 * mm, 40 * mm, CONTENT_W - 85 * mm]
        ))
        return els

    # ──────────────────────────────────────────────────────────
    def _references(self):
        els = []
        els.append(Paragraph("14. References", self.styles['SectionHeader']))

        refs = [
            ("[1]", "ISO/SAE 21434:2021 — Road Vehicles: Cybersecurity Engineering. "
             "International Organization for Standardization, 2021."),
            ("[2]", "UNECE Regulation No. 155 — Uniform provisions concerning the approval "
             "of vehicles with regards to cyber security and cyber security management "
             "system. United Nations Economic Commission for Europe, 2021."),
            ("[3]", "UNECE Regulation No. 156 — Uniform provisions concerning the approval "
             "of vehicles with regards to software update and software update management "
             "system. United Nations Economic Commission for Europe, 2021."),
            ("[4]", "MITRE CAPEC — Common Attack Pattern Enumeration and Classification. "
             "The MITRE Corporation. Available: https://capec.mitre.org"),
            ("[5]", "LINDDUN Privacy Threat Modeling. KU Leuven DistriNet Research Group. "
             "Available: https://linddun.org"),
            ("[6]", "SAE J3016 — Taxonomy and Definitions for Terms Related to Driving "
             "Automation Systems for On-Road Motor Vehicles. SAE International, 2021."),
            ("[7]", "NIST SP 800-53 Rev. 5 — Security and Privacy Controls for Information "
             "Systems and Organizations. NIST, 2020."),
        ]

        for ref_id, text in refs:
            els.append(Paragraph(f"<b>{ref_id}</b> {text}", self.styles['Body']))
        return els

    # ──────────────────────────────────────────────────────────
    def _glossary(self):
        els = []
        els.append(Paragraph("15. Glossary", self.styles['SectionHeader']))

        terms = [
            ("ASIL", "Automotive Safety Integrity Level (ISO 26262)"),
            ("CAPEC", "Common Attack Pattern Enumeration and Classification"),
            ("CSMS", "Cybersecurity Management System (UNECE R155)"),
            ("DFD", "Data Flow Diagram"),
            ("ECU", "Electronic Control Unit"),
            ("GDPR", "General Data Protection Regulation (EU) 2016/679"),
            ("HSM", "Hardware Security Module"),
            ("IDS", "Intrusion Detection System"),
            ("ISO 21434", "ISO/SAE 21434:2021 — Road Vehicles Cybersecurity Engineering"),
            ("LINDDUN", "Linkability, Identifiability, Non-repudiation, Detectability, "
             "Disclosure of information, Unawareness, Non-compliance"),
            ("OBD-II", "On-Board Diagnostics II"),
            ("OEM", "Original Equipment Manufacturer"),
            ("OTA", "Over-the-Air (software update)"),
            ("RBAC", "Role-Based Access Control"),
            ("SAE", "Society of Automotive Engineers"),
            ("SecOC", "Secure Onboard Communication (AUTOSAR)"),
            ("SFOP", "Safety, Financial, Operational, Privacy (impact dimensions)"),
            ("STRIDE", "Spoofing, Tampering, Repudiation, Information Disclosure, "
             "Denial of Service, Elevation of Privilege"),
            ("SUMS", "Software Update Management System (UNECE R156)"),
            ("TARA", "Threat Analysis and Risk Assessment"),
            ("TCU", "Telematics Control Unit"),
            ("TLS", "Transport Layer Security"),
            ("UNECE", "United Nations Economic Commission for Europe"),
            ("V2X", "Vehicle-to-Everything"),
        ]

        g_data = [[self._c("Abbreviation", True, white=True),
                    self._c("Definition", True, white=True)]]
        for abbr, defn in terms:
            g_data.append([self._c(abbr, True), self._c(defn)])

        els.append(self._make_table(g_data, [28 * mm, CONTENT_W - 28 * mm]))
        return els