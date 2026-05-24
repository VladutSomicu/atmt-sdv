from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from datetime import datetime, timezone
import hashlib
import io


class ReportGenerator:
    """
    Generates a structured TARA report in PDF format
    following ISO 21434 documentation requirements.
    """

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Define custom paragraph styles for the report."""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Title'],
            fontSize=22,
            spaceAfter=20,
            textColor=colors.HexColor('#1F4E79')
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading1'],
            fontSize=14,
            spaceBefore=16,
            spaceAfter=8,
            textColor=colors.HexColor('#2E75B6')
        ))
        self.styles.add(ParagraphStyle(
            name='SubHeader',
            parent=self.styles['Heading2'],
            fontSize=11,
            spaceBefore=10,
            spaceAfter=6,
            textColor=colors.HexColor('#1F4E79')
        ))
        self.styles.add(ParagraphStyle(
            name='BodyText2',
            parent=self.styles['Normal'],
            fontSize=9,
            spaceAfter=4,
            leading=12
        ))

    def generate(self, project, threats, compliance_checks, members) -> bytes:
        """
        Generate a complete TARA report as PDF bytes.
        Returns the raw PDF bytes that can be saved or sent as response.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=20*mm
        )

        elements = []

        # Title page
        elements.extend(self._build_title_page(project, members))
        elements.append(PageBreak())

        # Risk summary
        elements.extend(self._build_risk_summary(threats))

        # Threat details
        elements.extend(self._build_threat_details(threats))
        elements.append(PageBreak())

        # Compliance results
        elements.extend(self._build_compliance_section(compliance_checks))

        # Footer with hash
        elements.extend(self._build_footer(project))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def _build_title_page(self, project, members):
        """Build the report title page with project metadata."""
        elements = []

        elements.append(Paragraph("TARA Report", self.styles['ReportTitle']))
        elements.append(Paragraph(
            "Threat Analysis and Risk Assessment",
            self.styles['SubHeader']
        ))
        elements.append(Spacer(1, 10*mm))

        # Project info table
        vehicle = project.vehicle_profile or {}
        info_data = [
            ["Project Name", project.name],
            ["Description", project.description or "N/A"],
            ["Status", project.status.upper()],
            ["Propulsion", vehicle.get('propulsion', 'N/A')],
            ["Architecture", vehicle.get('architecture', 'N/A')],
            ["SAE Level", str(vehicle.get('sae_level', 'N/A'))],
            ["OTA Support", "Yes" if vehicle.get('ota_support') else "No"],
            ["External Interfaces", ", ".join(vehicle.get('external_interfaces', []))],
            ["Generated", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")],
        ]

        info_table = Table(info_data, colWidths=[45*mm, 120*mm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#1F4E79')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 8*mm))

        # Business objectives
        if project.business_objectives:
            elements.append(Paragraph("Business Objectives", self.styles['SubHeader']))
            for obj in project.business_objectives:
                elements.append(Paragraph(f"• {obj}", self.styles['BodyText2']))

        elements.append(Spacer(1, 8*mm))

        # Team members
        if members:
            elements.append(Paragraph("Project Team", self.styles['SubHeader']))
            team_data = [["Name", "Email", "Role"]]
            for m in members:
                team_data.append([
                    m.get('full_name', 'N/A'),
                    m.get('email', 'N/A'),
                    m.get('role', 'N/A').capitalize()
                ])

            team_table = Table(team_data, colWidths=[50*mm, 70*mm, 45*mm])
            team_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E75B6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(team_table)

        return elements

    def _build_risk_summary(self, threats):
        """Build the risk summary section with counts per level."""
        elements = []
        elements.append(Paragraph("Risk Summary", self.styles['SectionHeader']))

        critical = sum(1 for t in threats if t.risk_score >= 16)
        high = sum(1 for t in threats if 12 <= t.risk_score <= 15)
        medium = sum(1 for t in threats if 8 <= t.risk_score <= 11)
        low = sum(1 for t in threats if 4 <= t.risk_score <= 7)
        negligible = sum(1 for t in threats if t.risk_score <= 3)
        mitigated = sum(1 for t in threats if t.status == 'mitigated')
        accepted = sum(1 for t in threats if t.status == 'accepted')
        open_count = sum(1 for t in threats if t.status == 'open')

        summary_data = [
            ["Risk Level", "Count", "Status", "Count"],
            ["Critical (16-20)", str(critical), "Open", str(open_count)],
            ["High (12-15)", str(high), "Mitigated", str(mitigated)],
            ["Medium (8-11)", str(medium), "Accepted", str(accepted)],
            ["Low (4-7)", str(low), "", ""],
            ["Negligible (1-3)", str(negligible), "Total", str(len(threats))],
        ]

        summary_table = Table(summary_data, colWidths=[45*mm, 25*mm, 45*mm, 25*mm])

        # Color the risk level cells
        risk_colors = [
            colors.HexColor('#FF4444'),  # Critical - red
            colors.HexColor('#FF8C00'),  # High - orange
            colors.HexColor('#FFD700'),  # Medium - yellow
            colors.HexColor('#90EE90'),  # Low - light green
            colors.HexColor('#32CD32'),  # Negligible - green
        ]

        style_commands = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (3, 0), (3, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]

        for i, color in enumerate(risk_colors):
            style_commands.append(('BACKGROUND', (0, i+1), (0, i+1), color))

        summary_table.setStyle(TableStyle(style_commands))
        elements.append(summary_table)
        elements.append(Spacer(1, 8*mm))

        return elements

    def _build_threat_details(self, threats):
        """Build detailed threat listing sorted by risk score."""
        elements = []
        elements.append(Paragraph("Identified Threats", self.styles['SectionHeader']))

        # Sort by risk score descending
        sorted_threats = sorted(threats, key=lambda t: t.risk_score, reverse=True)

        for t in sorted_threats:
            # Threat header with risk badge
            risk_label = self._risk_label(t.risk_score)
            elements.append(Paragraph(
                f"<b>{t.title}</b> — Risk: {t.risk_score} ({risk_label})",
                self.styles['SubHeader']
            ))

            detail_data = [
                ["Asset", getattr(t, 'asset_name', None) or t.asset_id, "STRIDE", t.stride_category],
                ["Source", f"{t.source or 'N/A'} ({t.source_ref or 'N/A'})",
                 "Status", t.status.capitalize()],
                ["Safety", str(t.impact_safety), "Financial", str(t.impact_financial)],
                ["Operational", str(t.impact_operational), "Privacy", str(t.impact_privacy)],
                ["Feasibility", str(t.feasibility), "Treatment",
                 (t.treatment or "None").capitalize()],
            ]

            if t.justification:
                detail_data.append(["Justification", t.justification, "", ""])

            detail_table = Table(detail_data, colWidths=[30*mm, 55*mm, 30*mm, 50*mm])
            detail_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ('SPAN', (1, -1), (3, -1)) if t.justification else ('', (0, 0), (0, 0)),
            ]))
            elements.append(detail_table)
            elements.append(Spacer(1, 4*mm))

        return elements

    def _build_compliance_section(self, compliance_checks):
        """Build the compliance results section."""
        elements = []
        elements.append(Paragraph("Compliance Assessment", self.styles['SectionHeader']))

        checks = compliance_checks.get('checks', [])

        for check in checks:
            status_color = (
                colors.HexColor('#32CD32') if check['status'] == 'pass'
                else colors.HexColor('#FF4444') if check['status'] == 'fail'
                else colors.grey
            )

            check_data = [[
                check['id'],
                check['regulation'],
                check['title'],
                check['status'].upper(),
            ]]

            check_table = Table(check_data, colWidths=[20*mm, 30*mm, 85*mm, 20*mm])
            check_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (3, 0), (3, 0), status_color),
                ('TEXTCOLOR', (3, 0), (3, 0), colors.white),
                ('ALIGN', (3, 0), (3, 0), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(check_table)

            # Details below each check
            elements.append(Paragraph(
                f"<i>{check['details']}</i> (Ref: {check['reference']})",
                self.styles['BodyText2']
            ))
            elements.append(Spacer(1, 2*mm))

        return elements

    def _build_footer(self, project):
        """Build report footer with integrity hash."""
        elements = []
        elements.append(Spacer(1, 10*mm))

        # Generate integrity hash
        hash_input = f"{project.id}{project.name}{datetime.now(timezone.utc).isoformat()}"
        integrity_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]

        elements.append(Paragraph(
            f"<i>Report generated by ATMT — Automotive Threat Modeling Tool</i>",
            self.styles['BodyText2']
        ))
        elements.append(Paragraph(
            f"<i>Integrity hash: {integrity_hash}</i>",
            self.styles['BodyText2']
        ))

        return elements

    def _risk_label(self, score):
        """Convert risk score to human-readable label."""
        if score >= 16:
            return "Critical"
        elif score >= 12:
            return "High"
        elif score >= 8:
            return "Medium"
        elif score >= 4:
            return "Low"
        return "Negligible"