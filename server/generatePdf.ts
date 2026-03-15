/**
 * Generate a QARP-branded CV PDF from AI-structured JSON using PDFKit.
 * This runs in Node.js — no Python dependency needed.
 */
import PDFDocument from 'pdfkit';
import * as fs from 'fs';

// QARP Brand Colors
const NAVY = '#0B1120';
const TEAL = '#00B4D8';
const WHITE = '#FFFFFF';
const GRAY = '#64748B';
const DARK_TEXT = '#1E293B';
const LIGHT_BG = '#F0FDFA';
const BORDER = '#E2E8F0';
const TEAL_LIGHT = '#99F6E4';

interface QARPCVData {
  fullName?: string;
  location?: string;
  languages?: string;
  memberships?: string;
  email?: string;
  phone?: string;
  summary?: string;
  areasOfExpertise?: string[];
  majorStrengths?: {
    knowledgeAndExperience?: string;
    qualityAssurance?: string;
    training?: string;
    medicalDevices?: string;
    consulting?: string;
  };
  auditSummary?: Array<{ activity: string; number: string; details: string }>;
  education?: Array<{ institution: string; period: string; degree: string }>;
  employmentHistory?: Array<{ employer: string; period: string; responsibilities: string }>;
  trainingsAndCourses?: Array<{ period: string; subject: string }>;
  systemsExperience?: string[];
  otherDetails?: string[];
}

export function generateQARPCVPdf(cvData: QARPCVData, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 80, bottom: 60, left: 50, right: 50 },
        info: {
          Title: `QARP-Q-TEM-02-00-01_The QARP Curriculum Vitae (CV)_v 3.0 - ${cvData.fullName || 'Candidate'}`,
          Author: 'The QARP Academy SL',
          Subject: 'QARP Certified Professional Profile',
          Creator: 'The QARP Candidate Portal',
        },
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const pageW = doc.page.width;
      const contentW = pageW - 100; // 50mm margins
      let currentY = 80;

      // Helper: draw header on each page
      function drawHeader() {
        doc.save();
        // Navy header bar
        doc.rect(0, 0, pageW, 56).fill(NAVY);
        // Teal accent line
        doc.rect(0, 56, pageW, 2).fill(TEAL);
        // Header text
        doc.font('Helvetica-Bold').fontSize(14).fillColor(WHITE);
        doc.text('The QARP', 50, 18, { width: 200 });
        doc.font('Helvetica').fontSize(7.5).fillColor(TEAL_LIGHT);
        doc.text('Quality Assurance Research Professionals', 50, 36, { width: 250 });
        doc.font('Helvetica').fontSize(8).fillColor(WHITE);
        doc.text('CURRICULUM VITAE', pageW - 180, 14, { width: 130, align: 'right' });
        doc.font('Helvetica').fontSize(6.5).fillColor(TEAL_LIGHT);
        doc.text('QARP-Q-TEM-02-00-01 | v 3.0', pageW - 180, 28, { width: 130, align: 'right' });
        doc.font('Helvetica').fontSize(7).fillColor(TEAL_LIGHT);
        doc.text('theqarp.com', pageW - 180, 40, { width: 130, align: 'right' });
        doc.restore();
      }

      // Helper: draw footer on each page
      function drawFooter() {
        doc.save();
        doc.font('Helvetica').fontSize(6).fillColor(GRAY);
        doc.text(
          'QARP-Q-TEM-02-00-01_The QARP Curriculum Vitae (CV)_v 3.0',
          50, doc.page.height - 48, { width: contentW, align: 'center' }
        );
        doc.text(
          'The QARP Academy SL | Av. Lluis Companys 1, Castelldefels, Barcelona, Spain, 08860 | info@theqarp.com | +34 625 263 964',
          50, doc.page.height - 36, { width: contentW, align: 'center' }
        );
        doc.restore();
      }

      // Helper: check if we need a new page
      function ensureSpace(needed: number) {
        if (currentY + needed > doc.page.height - 70) {
          drawFooter();
          doc.addPage();
          drawHeader();
          currentY = 80;
        }
      }

      // Helper: section header with teal line
      function sectionHeader(title: string) {
        ensureSpace(30);
        currentY += 8;
        doc.save();
        doc.moveTo(50, currentY).lineTo(50 + contentW, currentY).strokeColor(TEAL).lineWidth(0.5).stroke();
        doc.restore();
        currentY += 8;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY);
        doc.text(title.toUpperCase(), 50, currentY, { width: contentW });
        currentY += 18;
      }

      // Helper: body text
      function bodyText(text: string, indent = 0) {
        ensureSpace(20);
        doc.font('Helvetica').fontSize(9).fillColor(DARK_TEXT);
        const opts = { width: contentW - indent, lineGap: 3 };
        const height = doc.heightOfString(text, opts);
        ensureSpace(height + 4);
        doc.text(text, 50 + indent, currentY, opts);
        currentY += height + 6;
      }

      // Helper: bold label + value
      function labelValue(label: string, value: string) {
        ensureSpace(16);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GRAY);
        doc.text(label, 50, currentY, { width: contentW });
        currentY += 12;
        doc.font('Helvetica').fontSize(9).fillColor(DARK_TEXT);
        const h = doc.heightOfString(value, { width: contentW, lineGap: 2 });
        ensureSpace(h + 4);
        doc.text(value, 50, currentY, { width: contentW, lineGap: 2 });
        currentY += h + 6;
      }

      // Helper: subsection title
      function subHeader(title: string) {
        ensureSpace(18);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK_TEXT);
        doc.text(title, 50, currentY, { width: contentW });
        currentY += 14;
      }

      // ============ BUILD THE CV ============

      // Draw header
      drawHeader();
      currentY = 80;

      // === NAME ===
      doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY);
      doc.text(cvData.fullName || 'Candidate', 50, currentY, { width: contentW });
      currentY += 26;

      doc.font('Helvetica').fontSize(9).fillColor(TEAL);
      doc.text('QARP Certified Professional Profile', 50, currentY, { width: contentW });
      currentY += 16;

      // === CONTACT INFO LINE ===
      const contactParts: string[] = [];
      if (cvData.location) contactParts.push(cvData.location);
      if (cvData.email) contactParts.push(cvData.email);
      if (cvData.phone) contactParts.push(cvData.phone);
      if (contactParts.length) {
        doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
        doc.text(contactParts.join('  |  '), 50, currentY, { width: contentW });
        currentY += 12;
      }

      if (cvData.languages) {
        doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
        doc.text(`Languages: ${cvData.languages}`, 50, currentY, { width: contentW });
        currentY += 12;
      }

      if (cvData.memberships) {
        doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
        doc.text(`Professional Memberships: ${cvData.memberships}`, 50, currentY, { width: contentW });
        currentY += 12;
      }

      currentY += 4;

      // === PROFESSIONAL SUMMARY ===
      if (cvData.summary) {
        sectionHeader('Professional Summary');
        bodyText(cvData.summary);
      }

      // === AREAS OF EXPERTISE ===
      const areas = cvData.areasOfExpertise || [];
      if (areas.length) {
        sectionHeader('Areas of Expertise');
        // Two-column layout
        const colW = contentW / 2;
        for (let i = 0; i < areas.length; i += 2) {
          ensureSpace(14);
          doc.font('Helvetica').fontSize(9).fillColor(DARK_TEXT);
          doc.text(`•  ${areas[i]}`, 50, currentY, { width: colW - 10 });
          if (i + 1 < areas.length) {
            doc.text(`•  ${areas[i + 1]}`, 50 + colW, currentY, { width: colW - 10 });
          }
          currentY += 14;
        }
      }

      // === MAJOR STRENGTHS ===
      const strengths = cvData.majorStrengths;
      if (strengths) {
        const strengthEntries: [string, string | undefined][] = [
          ['Knowledge and Experience', strengths.knowledgeAndExperience],
          ['Quality Assurance', strengths.qualityAssurance],
          ['GxP Training', strengths.training],
          ['Medical Device Experience', strengths.medicalDevices],
          ['Consulting', strengths.consulting],
        ];
        const validEntries = strengthEntries.filter(([, v]) => v && v !== 'null' && String(v).trim());
        if (validEntries.length) {
          sectionHeader('Major Strengths and Achievements');
          for (const [label, value] of validEntries) {
            subHeader(label);
            bodyText(String(value));
          }
        }
      }

      // === AUDIT SUMMARY ===
      const audits = cvData.auditSummary || [];
      if (audits.length) {
        sectionHeader('Summary of Audits and Activities');
        // Table header
        ensureSpace(20);
        doc.save();
        doc.rect(50, currentY, contentW, 16).fill(LIGHT_BG);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY);
        doc.text('Activity', 54, currentY + 4, { width: contentW * 0.35 });
        doc.text('Count', 54 + contentW * 0.35, currentY + 4, { width: contentW * 0.15 });
        doc.text('Details', 54 + contentW * 0.50, currentY + 4, { width: contentW * 0.48 });
        doc.restore();
        currentY += 18;

        for (const audit of audits) {
          const rowText = `${audit.activity || ''} | ${audit.number || ''} | ${audit.details || ''}`;
          const rowH = Math.max(14, doc.heightOfString(audit.details || '', { width: contentW * 0.48, fontSize: 8.5 }) + 8);
          ensureSpace(rowH);
          doc.font('Helvetica').fontSize(8.5).fillColor(DARK_TEXT);
          doc.text(audit.activity || '', 54, currentY + 2, { width: contentW * 0.33 });
          doc.text(String(audit.number || ''), 54 + contentW * 0.35, currentY + 2, { width: contentW * 0.13 });
          doc.text(audit.details || '', 54 + contentW * 0.50, currentY + 2, { width: contentW * 0.48 });
          // Row border
          doc.save();
          doc.moveTo(50, currentY + rowH).lineTo(50 + contentW, currentY + rowH).strokeColor(BORDER).lineWidth(0.3).stroke();
          doc.restore();
          currentY += rowH;
        }
        currentY += 4;
      }

      // === EDUCATION ===
      const education = cvData.education || [];
      if (education.length) {
        sectionHeader('Education / Qualifications');
        for (const edu of education) {
          ensureSpace(24);
          if (edu.period) {
            doc.font('Helvetica').fontSize(8.5).fillColor(TEAL);
            doc.text(edu.period, 50, currentY, { width: contentW });
            currentY += 12;
          }
          const parts = [edu.institution, edu.degree].filter(Boolean).join(' — ');
          if (parts) {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_TEXT);
            doc.text(parts, 50, currentY, { width: contentW });
            currentY += 14;
          }
          currentY += 2;
        }
      }

      // === EMPLOYMENT HISTORY ===
      const jobs = cvData.employmentHistory || [];
      if (jobs.length) {
        sectionHeader('Employment History');
        for (const job of jobs) {
          ensureSpace(30);
          if (job.period) {
            doc.font('Helvetica').fontSize(8.5).fillColor(TEAL);
            doc.text(job.period, 50, currentY, { width: contentW });
            currentY += 12;
          }
          if (job.employer) {
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK_TEXT);
            doc.text(job.employer, 50, currentY, { width: contentW });
            currentY += 14;
          }
          if (job.responsibilities) {
            bodyText(job.responsibilities, 0);
          }
          currentY += 2;
        }
      }

      // === TRAININGS & COURSES ===
      const trainings = cvData.trainingsAndCourses || [];
      if (trainings.length) {
        sectionHeader('Trainings and Courses');
        for (const tr of trainings) {
          ensureSpace(14);
          const line = tr.period ? `${tr.period} — ${tr.subject || ''}` : (tr.subject || '');
          doc.font('Helvetica').fontSize(9).fillColor(DARK_TEXT);
          doc.text(`•  ${line}`, 50, currentY, { width: contentW });
          currentY += 14;
        }
      }

      // === SYSTEMS EXPERIENCE ===
      const systems = cvData.systemsExperience || [];
      if (systems.length) {
        sectionHeader('Systems Experience');
        bodyText(systems.join(', '));
      }

      // === OTHER DETAILS ===
      const other = cvData.otherDetails || [];
      if (other.length) {
        sectionHeader('Additional Information');
        for (const item of other) {
          ensureSpace(14);
          doc.font('Helvetica').fontSize(9).fillColor(DARK_TEXT);
          doc.text(`•  ${item}`, 50, currentY, { width: contentW });
          currentY += 14;
        }
      }

      // Draw footer on last page
      drawFooter();

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
