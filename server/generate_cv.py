#!/usr/bin/env python3
"""Generate a QARP-branded CV PDF from candidate JSON data."""

import json
import sys
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas

# QARP Brand Colors
NAVY = HexColor("#0B1120")
TEAL = HexColor("#00B4D8")
WHITE = HexColor("#FFFFFF")
LIGHT_BG = HexColor("#F8FAFC")
GRAY = HexColor("#64748B")
DARK_TEXT = HexColor("#1E293B")

# Font paths
FONT_DIR = "/home/user/workspace/fonts"

def register_fonts():
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    try:
        pdfmetrics.registerFont(TTFont('DMSans', os.path.join(FONT_DIR, 'DMSans-Regular.ttf')))
        pdfmetrics.registerFont(TTFont('DMSans-Bold', os.path.join(FONT_DIR, 'DMSans-Bold.ttf')))
        pdfmetrics.registerFont(TTFont('Inter', os.path.join(FONT_DIR, 'Inter-Regular.ttf')))
        pdfmetrics.registerFont(TTFont('Inter-Bold', os.path.join(FONT_DIR, 'Inter-Bold.ttf')))
        return True
    except:
        return False

def create_styles(has_custom_fonts):
    styles = getSampleStyleSheet()
    heading_font = 'DMSans-Bold' if has_custom_fonts else 'Helvetica-Bold'
    body_font = 'Inter' if has_custom_fonts else 'Helvetica'
    body_bold = 'Inter-Bold' if has_custom_fonts else 'Helvetica-Bold'

    styles.add(ParagraphStyle(
        'CVTitle', fontName=heading_font, fontSize=22, textColor=NAVY,
        spaceAfter=4, alignment=TA_LEFT, leading=28
    ))
    styles.add(ParagraphStyle(
        'CVSubtitle', fontName=body_font, fontSize=11, textColor=TEAL,
        spaceAfter=16, alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'SectionHeader', fontName=heading_font, fontSize=13, textColor=NAVY,
        spaceBefore=14, spaceAfter=6, alignment=TA_LEFT, leading=18
    ))
    styles.add(ParagraphStyle(
        'FieldLabel', fontName=body_bold, fontSize=10, textColor=GRAY,
        spaceAfter=2, alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'FieldValue', fontName=body_font, fontSize=11, textColor=DARK_TEXT,
        spaceAfter=8, alignment=TA_LEFT, leading=15
    ))
    styles.add(ParagraphStyle(
        'Footer', fontName=body_font, fontSize=8, textColor=GRAY,
        alignment=TA_CENTER
    ))
    return styles

class CVDocTemplate(SimpleDocTemplate):
    def __init__(self, filename, candidate_name, **kw):
        super().__init__(filename, pagesize=A4,
                         leftMargin=20*mm, rightMargin=20*mm,
                         topMargin=30*mm, bottomMargin=25*mm, **kw)
        self.candidate_name = candidate_name

    def afterPage(self):
        c = self.canv
        width, height = A4

        # Header bar
        c.setFillColor(NAVY)
        c.rect(0, height - 22*mm, width, 22*mm, fill=1, stroke=0)

        # Teal accent line
        c.setFillColor(TEAL)
        c.rect(0, height - 22.8*mm, width, 0.8*mm, fill=1, stroke=0)

        # Header text
        c.setFillColor(WHITE)
        c.setFont('DMSans-Bold' if os.path.exists(os.path.join(FONT_DIR, 'DMSans-Bold.ttf')) else 'Helvetica-Bold', 14)
        c.drawString(20*mm, height - 14*mm, "The QARP CV")
        c.setFont('Inter' if os.path.exists(os.path.join(FONT_DIR, 'Inter-Regular.ttf')) else 'Helvetica', 9)
        c.drawRightString(width - 20*mm, height - 14*mm, "The QARP Academy SL")

        # Footer
        c.setFillColor(GRAY)
        c.setFont('Inter' if os.path.exists(os.path.join(FONT_DIR, 'Inter-Regular.ttf')) else 'Helvetica', 7)
        c.drawCentredString(width / 2, 12*mm,
            "The QARP Academy SL | Av. Lluis Companys 1, Castelldefels, Barcelona, Spain, 08860 | info@theqarp.com | +34 625 263 964")
        c.drawCentredString(width / 2, 8*mm,
            f"Generated from The QARP Candidate Portal | Page {c.getPageNumber()}")

def add_field(elements, styles, label, value):
    if value and str(value).strip():
        elements.append(Paragraph(label, styles['FieldLabel']))
        elements.append(Paragraph(str(value), styles['FieldValue']))

def add_section(elements, styles, title):
    elements.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2))
    elements.append(Paragraph(title, styles['SectionHeader']))

def generate_cv(data, output_path):
    has_fonts = register_fonts()
    styles = create_styles(has_fonts)

    profile = data.get('profile', {})
    q = data.get('questionnaire', {})
    candidate_name = profile.get('fullName', data.get('email', 'Candidate'))

    doc = CVDocTemplate(output_path, candidate_name)
    elements = []

    # Title
    prefix = profile.get('namePrefix', '')
    full_name = f"{prefix} {candidate_name}".strip() if prefix else candidate_name
    elements.append(Paragraph(full_name, styles['CVTitle']))
    elements.append(Paragraph("QARP Certified Professional Profile", styles['CVSubtitle']))

    # Personal Information
    add_section(elements, styles, "PERSONAL INFORMATION")
    add_field(elements, styles, "Email", data.get('email'))
    add_field(elements, styles, "Phone", profile.get('phone'))
    add_field(elements, styles, "Location", profile.get('cityCountry'))

    # Audit Qualifications
    add_section(elements, styles, "AUDIT QUALIFICATIONS")
    if q.get('auditTypes'):
        add_field(elements, styles, "Audit Types", "; ".join(q['auditTypes']) if isinstance(q['auditTypes'], list) else q['auditTypes'])
    if q.get('branchExpertise'):
        add_field(elements, styles, "Branch of Expertise", "; ".join(q['branchExpertise']) if isinstance(q['branchExpertise'], list) else q['branchExpertise'])
    add_field(elements, styles, "Number of Audits Performed", q.get('auditsPerformed'))
    add_field(elements, styles, "Certified Auditor", q.get('qualificationAuditing'))
    add_field(elements, styles, "Qualification Exam Date", q.get('qualificationExamDate'))
    add_field(elements, styles, "Qualification Exam Name", q.get('qualificationExamName'))

    # Languages & Availability
    add_section(elements, styles, "LANGUAGES & AVAILABILITY")
    if q.get('languages'):
        add_field(elements, styles, "Languages", "; ".join(q['languages']) if isinstance(q['languages'], list) else q['languages'])
    add_field(elements, styles, "On-site Audit Rate", q.get('onsiteAuditRate'))
    add_field(elements, styles, "Remote Audit Rate", q.get('remoteAuditRate'))
    if q.get('onsiteLocations'):
        add_field(elements, styles, "On-site Locations", "; ".join(q['onsiteLocations']) if isinstance(q['onsiteLocations'], list) else q['onsiteLocations'])

    # Professional Memberships
    if q.get('professionalMembership') and len(q['professionalMembership']) > 0:
        add_section(elements, styles, "PROFESSIONAL MEMBERSHIPS")
        add_field(elements, styles, "Memberships", "; ".join(q['professionalMembership']) if isinstance(q['professionalMembership'], list) else q['professionalMembership'])

    # Consulting
    if q.get('interestedConsulting') == 'Yes':
        add_section(elements, styles, "CONSULTING")
        add_field(elements, styles, "Interest", "Yes")
        add_field(elements, styles, "Services", q.get('consultingServices'))
        add_field(elements, styles, "Experience", q.get('consultingExperience'))
        add_field(elements, styles, "Rate", q.get('consultingRate'))

    # Training
    if q.get('trainingInterest') == 'Yes':
        add_section(elements, styles, "TRAINING")
        add_field(elements, styles, "Interest", "Yes")
        add_field(elements, styles, "Experience", q.get('trainingExperience'))
        add_field(elements, styles, "Rate", q.get('trainingRate'))

    # Completeness
    elements.append(Spacer(1, 10*mm))
    score = data.get('completenessScore', 0)
    elements.append(HRFlowable(width="100%", thickness=0.5, color=NAVY, spaceAfter=4))
    elements.append(Paragraph(
        f"Profile Completeness: {score}% | CV Uploaded: {'Yes' if data.get('cv') else 'No'} | Questionnaire: {'Complete' if data.get('questionnaireCompleted') else 'In Progress'}",
        styles['Footer']
    ))

    doc.build(elements)
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_cv.py <input_json> <output_pdf>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    with open(input_path, 'r') as f:
        data = json.load(f)

    result = generate_cv(data, output_path)
    print(json.dumps({"success": True, "path": result}))
