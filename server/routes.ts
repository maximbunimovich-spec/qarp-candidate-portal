import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage, verifyPassword } from "./storage";
import { registerSchema, loginSchema, adminLoginSchema, profileSchema, questionnaireSchema } from "@shared/schema";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

const ADMIN_PASSWORD = "qarp2026admin";
const SPREADSHEET_ID = "1NPR2NHHXHrc-YWNIZfyUfTwBdBiBNlGZG0MjGRp4BTA";
const SHEET_NAME = "Sheet1"; // Adjust if your sheet has a different name

// Notification recipients
const NOTIFY_EMAILS = [
  "maxim.bunimovich@theqarp.com",
  "valeria.sokolova@theqarp.com",
  "bd@theqarp.com"
];

// --- Google API Auth (Sheets + Drive) ---
// NOTE: No caching — always create fresh clients to avoid stale auth
let googleAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null;
let sheetsClient: ReturnType<typeof google.sheets> | null = null;
let driveClient: ReturnType<typeof google.drive> | null = null;

// Google Drive folder ID for CV uploads (set via GOOGLE_DRIVE_FOLDER_ID env var)
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "";

function getGoogleAuth() {
  if (googleAuth) return googleAuth;

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    console.log("[QARP] GOOGLE_SERVICE_ACCOUNT_KEY not set — Google APIs disabled");
    return null;
  }

  try {
    const key = JSON.parse(keyJson);
    googleAuth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });
    console.log("[QARP] Google Auth initialized (Sheets + Drive)");
    return googleAuth;
  } catch (err: any) {
    console.error("[QARP] Failed to init Google Auth:", err.message);
    return null;
  }
}

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const auth = getGoogleAuth();
  if (!auth) return null;
  sheetsClient = google.sheets({ version: "v4", auth });
  console.log("[QARP] Google Sheets API initialized");
  return sheetsClient;
}

function getDriveClient() {
  if (driveClient) return driveClient;
  const auth = getGoogleAuth();
  if (!auth) return null;
  if (!DRIVE_FOLDER_ID) {
    console.log("[QARP] GOOGLE_DRIVE_FOLDER_ID not set — Drive uploads disabled");
    return null;
  }
  driveClient = google.drive({ version: "v3", auth });
  console.log("[QARP] Google Drive API initialized");
  return driveClient;
}

// --- Nodemailer SMTP Setup ---
let emailTransporter: nodemailer.Transporter | null = null;

function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.log("[QARP] GMAIL_USER or GMAIL_APP_PASSWORD not set — email notifications disabled");
    return null;
  }

  try {
    emailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    console.log("[QARP] Nodemailer SMTP initialized for", user);
    return emailTransporter;
  } catch (err: any) {
    console.error("[QARP] Failed to init Nodemailer:", err.message);
    return null;
  }
}

// Track which spreadsheet row each candidate email maps to
const emailToSheetRow: Map<string, number> = new Map();
let nextSheetRow = 2; // Row 1 is headers

// --- Google Sheets Integration (Direct API) ---
const SHEET_COLUMNS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z",
];

function buildRowData(candidate: any): string[] {
  const q = candidate.questionnaire || {};
  return [
    candidate.registeredAt || new Date().toISOString(), // A: Timestamp
    candidate.profile?.fullName || "",                   // B: Full Name
    candidate.profile?.namePrefix || "",                 // C: Name Prefix
    candidate.email,                                      // D: Email
    candidate.profile?.phone || "",                       // E: Phone
    candidate.profile?.cityCountry || "",                 // F: City/Country
    candidate.cv ? "Yes" : "No",                          // G: CV Uploaded
    candidate.questionnaireCompleted ? "Yes" : "No",      // H: Questionnaire Complete
    (q.auditTypes || []).join("; "),                       // I: Audit Types
    (q.branchExpertise || []).join("; "),                  // J: Branch of Expertise
    q.auditsPerformed || "",                              // K: Number of Audits
    q.qualificationAuditing || "",                        // L: Certified Auditor
    q.qualificationExamDate || "",                        // M: Qualification Exam Date
    q.qualificationExamName || "",                        // N: Qualification Exam Name
    (q.languages || []).join("; "),                        // O: Languages
    q.onsiteAuditRate || "",                              // P: On-site Rate
    q.remoteAuditRate || "",                              // Q: Remote Rate
    (q.onsiteLocations || []).join("; "),                  // R: On-site Locations
    (q.professionalMembership || []).join("; "),           // S: Professional Memberships
    q.interestedConsulting || "",                          // T: Interested in Consulting
    q.consultingServices || "",                           // U: Consulting Services
    q.consultingExperience || "",                          // V: Consulting Experience
    q.consultingRate || "",                                // W: Consulting Rate
    q.trainingInterest || "",                              // X: Training Interest
    q.trainingExperience || "",                            // Y: Training Level
    q.trainingRate || "",                                  // Z: Training Rate
  ];
}

async function syncCandidateToSheet(candidate: any): Promise<void> {
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    const rowData = buildRowData(candidate);
    let row = emailToSheetRow.get(candidate.email.toLowerCase());

    if (!row) {
      row = nextSheetRow;
      emailToSheetRow.set(candidate.email.toLowerCase(), row);
      nextSheetRow++;
    }

    // Use batch update to write the entire row at once (much faster than cell-by-cell)
    const range = `${SHEET_NAME}!A${row}:Z${row}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [rowData],
      },
    });

    console.log(`[QARP] Synced sheet row ${row} for ${candidate.email}`);
  } catch (err: any) {
    console.error("[QARP] Sheet sync error:", err.message);
  }
}

// On startup, read existing rows to build the emailToSheetRow map
async function initSheetRowMap(): Promise<void> {
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!D2:D500`, // Column D = Email
    });
    const rows = response.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      const email = rows[i][0];
      if (email) {
        emailToSheetRow.set(email.toLowerCase().trim(), i + 2);
        nextSheetRow = Math.max(nextSheetRow, i + 3);
      }
    }
    console.log(`[QARP] Loaded ${emailToSheetRow.size} existing rows from sheet, next row: ${nextSheetRow}`);
  } catch (err: any) {
    console.error("[QARP] Failed to init sheet row map:", err.message);
  }
}

// --- Google Drive CV Upload ---
async function uploadCVToDrive(
  candidate: any,
  cvData: { filename: string; data: string; mimetype: string }
): Promise<string | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    const candidateName = candidate.profile?.fullName || candidate.email;
    const safeName = `${candidateName}_CV_${cvData.filename}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const buffer = Buffer.from(cvData.data, 'base64');

    const { Readable } = await import('stream');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const response = await drive.files.create({
      requestBody: {
        name: safeName,
        parents: [DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: cvData.mimetype,
        body: stream,
      },
      supportsAllDrives: true,
      fields: 'id, webViewLink',
    });

    const fileId = response.data.id;
    const webLink = response.data.webViewLink;
    console.log(`[QARP] CV uploaded to Drive: ${safeName} (id: ${fileId})`);
    return webLink || `https://drive.google.com/file/d/${fileId}/view`;
  } catch (err: any) {
    console.error("[QARP] Drive upload error:", err.message, JSON.stringify(err.response?.data || {}));
    return null;
  }
}

// --- Email Notification (Nodemailer) ---
interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

async function sendNotificationEmail(
  subject: string,
  body: string,
  attachments?: EmailAttachment[]
): Promise<void> {
  const transporter = getEmailTransporter();
  if (!transporter) return;

  try {
    const fromUser = process.env.GMAIL_USER;
    await transporter.sendMail({
      from: `"QARP Candidate Portal" <${fromUser}>`,
      to: NOTIFY_EMAILS.join(", "),
      subject,
      text: body,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    console.log(`[QARP] Notification email sent: ${subject}`);
  } catch (err: any) {
    console.error("[QARP] Email notification error:", err.message);
  }
}

async function notifyNewCandidate(email: string): Promise<void> {
  await sendNotificationEmail(
    `[QARP Portal] New Candidate Registration: ${email}`,
    `A new candidate has registered on The QARP Candidate Portal.\n\nEmail: ${email}\nRegistered: ${new Date().toISOString()}\n\nPlease log into the admin panel to view their profile once they complete their submission.\n\nPortal Admin Panel: Use password qarp2026admin to access.`
  );
}

// Welcome email to the candidate upon registration
async function sendWelcomeEmail(candidateEmail: string): Promise<void> {
  const transporter = getEmailTransporter();
  if (!transporter) return;

  try {
    const fromUser = process.env.GMAIL_USER;
    await transporter.sendMail({
      from: `"The QARP" <${fromUser}>`,
      to: candidateEmail,
      subject: "Welcome to The QARP Expert Network",
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <!-- Header -->
          <div style="background: #0B1120; padding: 28px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 0.5px;">The QARP</h1>
            <p style="color: #00B4D8; font-size: 12px; margin: 6px 0 0; letter-spacing: 0.3px;">Quality Assurance Research Professionals</p>
          </div>

          <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #ffffff;">
            <!-- Welcome -->
            <h2 style="font-size: 20px; color: #0B1120; margin-top: 0;">Welcome to the Expert Network!</h2>
            <p>Thank you for registering on The QARP Candidate Portal. Your account has been successfully created.</p>

            <!-- Next Steps -->
            <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="font-weight: 600; color: #0B1120; margin-top: 0; font-size: 14px;">Complete your application in 3 steps:</p>
              <ol style="line-height: 2; margin-bottom: 0; padding-left: 20px;">
                <li>Fill in your <strong>profile</strong> information</li>
                <li>Upload your <strong>CV</strong></li>
                <li>Complete the <strong>questionnaire</strong></li>
              </ol>
            </div>

            <div style="text-align: center; margin: 28px 0;">
              <a href="https://qarp-candidate-portal.onrender.com" style="background: #00B4D8; color: #ffffff; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 15px;">Go to Portal</a>
            </div>

            <!-- About The QARP -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
            <h3 style="font-size: 16px; color: #0B1120; margin-bottom: 8px;">About The QARP</h3>
            <p style="font-size: 13px; color: #4b5563;">The QARP is a global network of independent GxP auditors, QA consultants, and trainers. We help life sciences organisations build inspection-ready quality systems and deliver GxP compliance at scale.</p>
            <p style="font-size: 13px; color: #4b5563;">Our expert network spans <strong>Europe, North America, Latin America, Asia, Africa, and Australia</strong>, covering GCP, GLP, GMP, GDP, GVP, CSV, and Data Integrity.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 12px; font-size: 13px; color: #0B1120; font-weight: 600; border-bottom: 1px solid #f3f4f6;">1,400+</td>
                <td style="padding: 8px 12px; font-size: 13px; color: #4b5563; border-bottom: 1px solid #f3f4f6;">Training sessions delivered</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-size: 13px; color: #0B1120; font-weight: 600; border-bottom: 1px solid #f3f4f6;">2,000+</td>
                <td style="padding: 8px 12px; font-size: 13px; color: #4b5563; border-bottom: 1px solid #f3f4f6;">Audits completed worldwide</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-size: 13px; color: #0B1120; font-weight: 600;">100+</td>
                <td style="padding: 8px 12px; font-size: 13px; color: #4b5563;">Experts in the global network</td>
              </tr>
            </table>

            <!-- Academy -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
            <h3 style="font-size: 16px; color: #0B1120; margin-bottom: 8px;">The QARP Academy</h3>
            <p style="font-size: 13px; color: #4b5563;">Our digital learning platform <strong>theqarpacademy.pro</strong> offers self-paced and live training programmes for GxP professionals:</p>
            <ul style="font-size: 13px; color: #4b5563; line-height: 2; padding-left: 20px;">
              <li><strong>GCP Auditor School</strong> &mdash; 10-week certification programme with practical simulations and CPD accreditation</li>
              <li><strong>ICH GCP E6(R3) courses</strong> &mdash; role-based training for CRAs, QA managers, investigators, and sponsors</li>
              <li><strong>GxP Compliance modules</strong> &mdash; CAPA, RCA, risk management, data integrity, and more</li>
              <li><strong>Corporate portals</strong> &mdash; branded training environments with admin dashboards and reporting</li>
            </ul>
            <div style="text-align: center; margin: 16px 0;">
              <a href="https://theqarpacademy.pro" style="color: #00B4D8; font-weight: 600; text-decoration: none; font-size: 13px;">Explore The QARP Academy &rarr;</a>
            </div>

            <!-- AI -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
            <h3 style="font-size: 16px; color: #0B1120; margin-bottom: 8px;">AI-Powered GxP Assistant</h3>
            <p style="font-size: 13px; color: #4b5563;">The QARP Academy integrates a <strong>validated AI GxP Assistant</strong> designed specifically for quality and clinical operations professionals:</p>
            <ul style="font-size: 13px; color: #4b5563; line-height: 2; padding-left: 20px;">
              <li>40+ GxP regulatory documents in the knowledge base (ICH E6(R2/R3), FDA 21 CFR, EMA Guidelines)</li>
              <li>AI-assisted CAPA drafting, Root Cause Analysis, audit checklists, and risk assessments</li>
              <li>Compliance-first design: 21 CFR Part 11, Annex 11, GDPR</li>
              <li>Human-in-the-loop approach &mdash; AI supports, experts decide</li>
              <li>Traceable, auditable reasoning aligned with QMS requirements</li>
            </ul>
            <div style="text-align: center; margin: 16px 0;">
              <a href="https://theqarpacademy.pro/ai" style="color: #00B4D8; font-weight: 600; text-decoration: none; font-size: 13px;">Learn about QARP AI &rarr;</a>
            </div>

            <!-- Contact -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
            <p style="font-size: 13px; color: #4b5563;">Questions? Reach out to us:</p>
            <p style="font-size: 13px; color: #4b5563; margin: 4px 0;">Email: <a href="mailto:info@theqarp.com" style="color: #00B4D8;">info@theqarp.com</a></p>
            <p style="font-size: 13px; color: #4b5563; margin: 4px 0;">Phone: <a href="tel:+34625263964" style="color: #00B4D8;">+34 625 263 964</a></p>
            <p style="font-size: 13px; color: #4b5563; margin: 4px 0;">Website: <a href="https://theqarp.com" style="color: #00B4D8;">theqarp.com</a></p>

            <!-- Footer -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 16px;" />
            <p style="color: #9ca3af; font-size: 11px; margin-bottom: 0; text-align: center;">The QARP &mdash; Quality Assurance Research Professionals<br/>Global GxP Quality &amp; Compliance: Training &bull; Audits &bull; Expert Network &bull; Technology<br/><br/>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      `,
    });
    console.log(`[QARP] Welcome email sent to ${candidateEmail}`);
  } catch (err: any) {
    console.error("[QARP] Welcome email error:", err.message);
  }
}

async function notifyProfileComplete(candidate: any): Promise<void> {
  const p = candidate.profile || {};
  await sendNotificationEmail(
    `[QARP Portal] Profile Completed: ${p.fullName || candidate.email}`,
    `A candidate has completed their profile on The QARP Candidate Portal.\n\nName: ${p.namePrefix || ''} ${p.fullName || ''}\nEmail: ${candidate.email}\nPhone: ${p.phone || 'N/A'}\nLocation: ${p.cityCountry || 'N/A'}\n\nCompleteness: ${candidate.completenessScore}%`
  );
}

async function notifyCVUploaded(
  candidate: any,
  filename: string,
  cvBuffer: Buffer,
  mimetype: string,
  driveLink: string | null
): Promise<void> {
  const driveLine = driveLink ? `\nGoogle Drive: ${driveLink}` : '';
  await sendNotificationEmail(
    `[QARP Portal] CV Uploaded: ${candidate.profile?.fullName || candidate.email}`,
    `A candidate has uploaded their CV on The QARP Candidate Portal.\n\nName: ${candidate.profile?.fullName || candidate.email}\nEmail: ${candidate.email}\nFile: ${filename}${driveLine}`,
    [{ filename, content: cvBuffer, contentType: mimetype }]
  );
}

async function notifyQuestionnaireComplete(candidate: any): Promise<void> {
  const q = candidate.questionnaire || {};
  await sendNotificationEmail(
    `[QARP Portal] Questionnaire Completed: ${candidate.profile?.fullName || candidate.email}`,
    `A candidate has completed their questionnaire on The QARP Candidate Portal.\n\nName: ${candidate.profile?.fullName || candidate.email}\nEmail: ${candidate.email}\nCompleteness: ${candidate.completenessScore}%\n\nAudit Types: ${(q.auditTypes || []).join(', ')}\nBranch Expertise: ${(q.branchExpertise || []).join(', ')}\nLanguages: ${(q.languages || []).join(', ')}\nInterested in Consulting: ${q.interestedConsulting || 'N/A'}\nTraining Interest: ${q.trainingInterest || 'N/A'}\n\nFull data is available in the Google Spreadsheet and admin panel.`
  );
}

// --- Gemini AI CV Generation ---
function getGeminiClient(): InstanceType<typeof GoogleGenAI> | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("[QARP] GEMINI_API_KEY not set — AI CV generation disabled");
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

async function extractCVText(cvData: { data: string; mimetype: string; filename: string }): Promise<string> {
  const buffer = Buffer.from(cvData.data, 'base64');

  if (cvData.mimetype === 'application/pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const result = await pdfParse(buffer);
      return result.text || '';
    } catch (err: any) {
      console.error('[QARP] PDF parse error:', err.message);
      return '';
    }
  }

  if (cvData.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      cvData.mimetype === 'application/msword') {
    try {
      // For DOCX, extract raw text from XML
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(buffer);
      const doc = zip.getEntry('word/document.xml');
      if (doc) {
        const xml = doc.getData().toString('utf-8');
        // Strip XML tags to get plain text
        return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } catch (err: any) {
      console.error('[QARP] DOCX parse error:', err.message);
    }
    return '';
  }

  return '';
}

const QARP_CV_PROMPT = `You are an expert CV formatter for The QARP (Quality Assurance Research Professionals), a global GxP auditing and consulting company.

You will receive:
1. The candidate's uploaded CV (raw text)
2. The candidate's questionnaire data from our portal
3. The candidate's profile information

Your task is to generate a structured QARP-format CV in JSON format with these exact sections:

{
  "fullName": "Name with credentials (e.g. Dr. John Smith, PhD, CQA)",
  "location": "City, Country",
  "languages": "English (fluent), German (native), etc.",
  "memberships": "RQA, MSQA, etc.",
  "email": "candidate email",
  "phone": "phone number",
  "summary": "2-3 sentence professional summary highlighting GxP/QA expertise, years of experience, key specializations",
  "areasOfExpertise": ["Area 1", "Area 2", ...],
  "majorStrengths": {
    "knowledgeAndExperience": "Paragraph about regulatory knowledge and GxP understanding",
    "qualityAssurance": "Paragraph about QA audit experience, types of audits, inspections supported",
    "training": "Paragraph about training experience (if applicable, otherwise null)",
    "medicalDevices": "Paragraph about medical device experience (if applicable, otherwise null)",
    "consulting": "Paragraph about consulting experience (if applicable, otherwise null)"
  },
  "auditSummary": [
    {"activity": "Type of audit/activity", "number": "count or range", "details": "locations, types"}
  ],
  "education": [
    {"institution": "University", "period": "2000-2005", "degree": "MD / PhD / etc."}
  ],
  "employmentHistory": [
    {"employer": "Company, Role, Location", "period": "Jan 2020 - Present", "responsibilities": "Key responsibilities"}
  ],
  "trainingsAndCourses": [
    {"period": "Date", "subject": "Training name"}
  ],
  "systemsExperience": ["System 1", "System 2", ...],
  "otherDetails": ["Detail 1", "Detail 2", ...]
}

IMPORTANT RULES:
- Extract ALL relevant information from both the uploaded CV and the questionnaire data
- Use professional, formal English language
- For the summary, emphasize GxP auditing and quality assurance expertise
- Map questionnaire audit types to areas of expertise
- Include questionnaire data (audit counts, rates, locations, languages) in appropriate sections
- If information is missing, omit the field rather than making things up
- Keep the tone professional and aligned with pharmaceutical industry standards
- Return ONLY valid JSON, no markdown formatting`;

// Repair common JSON issues produced by LLMs
function repairJSON(str: string): string {
  // Remove BOM and zero-width characters
  str = str.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Remove trailing commas before } or ]
  str = str.replace(/,\s*([}\]])/g, '$1');
  // Fix unescaped newlines inside string values
  str = str.replace(/(["'])([^"']*?)\n([^"']*?)\1/g, (match, q, before, after) => {
    return q + before + '\\n' + after + q;
  });
  // Remove control characters that break JSON (except \n \r \t)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return str;
}

async function generateQARPCV(candidate: any): Promise<any> {
  const ai = getGeminiClient();
  if (!ai) throw new Error('AI service not available');

  // Extract text from uploaded CV
  let cvText = '';
  if (candidate.cv) {
    cvText = await extractCVText(candidate.cv);
  }

  const profile = candidate.profile || {};
  const questionnaire = candidate.questionnaire || {};

  const userMessage = `
=== CANDIDATE PROFILE ===
Full Name: ${profile.fullName || 'N/A'}
Name Prefix: ${profile.namePrefix || 'N/A'}
Email: ${candidate.email}
Phone: ${profile.phone || 'N/A'}
Location: ${profile.cityCountry || 'N/A'}

=== QUESTIONNAIRE DATA ===
Audit Types: ${(questionnaire.auditTypes || []).join(', ') || 'N/A'}
Branch of Expertise: ${(questionnaire.branchExpertise || []).join(', ') || 'N/A'}
Number of Audits Performed: ${questionnaire.auditsPerformed || 'N/A'}
Certified Auditor: ${questionnaire.qualificationAuditing || 'N/A'}
Qualification Exam Date: ${questionnaire.qualificationExamDate || 'N/A'}
Qualification Exam Name: ${questionnaire.qualificationExamName || 'N/A'}
Languages: ${(questionnaire.languages || []).join(', ') || 'N/A'}
On-site Audit Rate: ${questionnaire.onsiteAuditRate || 'N/A'}
Remote Audit Rate: ${questionnaire.remoteAuditRate || 'N/A'}
On-site Locations: ${(questionnaire.onsiteLocations || []).join(', ') || 'N/A'}
Professional Memberships: ${(questionnaire.professionalMembership || []).join(', ') || 'N/A'}
Interested in Consulting: ${questionnaire.interestedConsulting || 'N/A'}
Consulting Services: ${questionnaire.consultingServices || 'N/A'}
Consulting Experience: ${questionnaire.consultingExperience || 'N/A'}
Consulting Rate: ${questionnaire.consultingRate || 'N/A'}
Training Interest: ${questionnaire.trainingInterest || 'N/A'}
Training Experience: ${questionnaire.trainingExperience || 'N/A'}
Training Rate: ${questionnaire.trainingRate || 'N/A'}

=== UPLOADED CV TEXT ===
${cvText || '(No CV text available)'}
`;

  // Try models in order of preference (2.5 Flash has free tier quota, 2.0 Flash may not)
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
  let lastError: Error | null = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[QARP] Trying model ${modelName} for ${candidate.email}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: QARP_CV_PROMPT + '\n\n' + userMessage }] }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 8000,
        },
      });

      const text = response.text || '';
      // Extract JSON from response (may be wrapped in ```json ... ```)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI did not return valid JSON');

      let jsonStr = jsonMatch[0];
      // Repair common JSON issues from LLMs
      jsonStr = repairJSON(jsonStr);

      const cvData = JSON.parse(jsonStr);
      console.log(`[QARP] AI generated QARP CV for ${candidate.email} using ${modelName}`);
      return cvData;
    } catch (err: any) {
      console.error(`[QARP] Gemini ${modelName} error:`, err.message);
      lastError = err;
      // If rate limited (429), try next model
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('quota')) {
        console.log(`[QARP] Rate limited on ${modelName}, trying next model...`);
        continue;
      }
      // If JSON parse error, retry with same model once
      if (err.message?.includes('JSON') || err.message?.includes('position') || err.message?.includes('Unexpected')) {
        console.log(`[QARP] JSON parse error on ${modelName}, retrying...`);
        try {
          const retryResponse = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: QARP_CV_PROMPT + '\n\nIMPORTANT: Return ONLY a single valid JSON object. No trailing commas. No comments. Ensure all strings are properly escaped.\n\n' + userMessage }] }],
            config: { temperature: 0.1, maxOutputTokens: 8000 },
          });
          const retryText = retryResponse.text || '';
          const retryMatch = retryText.match(/\{[\s\S]*\}/);
          if (retryMatch) {
            const cvData = JSON.parse(repairJSON(retryMatch[0]));
            console.log(`[QARP] AI generated QARP CV for ${candidate.email} using ${modelName} (retry)`);
            return cvData;
          }
        } catch (retryErr: any) {
          console.error(`[QARP] Retry also failed:`, retryErr.message);
        }
        continue;
      }
      // For other errors, throw immediately
      throw new Error('Failed to generate CV: ' + err.message);
    }
  }

  throw new Error('Failed to generate CV: All AI models exhausted. ' + (lastError?.message || 'Please try again later or enable billing on the Google Cloud project.'));
}

// Store generated CVs in memory (keyed by candidate ID)
const generatedCVs: Map<string, any> = new Map();

// Format QARP CV data as structured plain text (for Google Docs upload)
function formatQARPCVAsText(cv: any): string {
  const lines: string[] = [];
  lines.push('CURRICULUM VITAE');
  lines.push('');
  lines.push(cv.fullName || '');
  lines.push('');
  if (cv.location) lines.push(`Location: ${cv.location}`);
  if (cv.languages) lines.push(`Languages: ${cv.languages}`);
  if (cv.memberships) lines.push(`Memberships: ${cv.memberships}`);
  if (cv.email) lines.push(`Email: ${cv.email}`);
  if (cv.phone) lines.push(`Phone: ${cv.phone}`);
  lines.push('');
  if (cv.summary) {
    lines.push(cv.summary);
    lines.push('');
  }

  if (cv.areasOfExpertise?.length) {
    lines.push('AREAS OF EXPERTISE');
    lines.push('');
    cv.areasOfExpertise.forEach((a: string) => lines.push(`- ${a}`));
    lines.push('');
  }

  if (cv.majorStrengths) {
    lines.push('MAJOR STRENGTHS AND ACHIEVEMENTS');
    lines.push('');
    const s = cv.majorStrengths;
    if (s.knowledgeAndExperience) {
      lines.push('Knowledge and Experience:');
      lines.push(s.knowledgeAndExperience);
      lines.push('');
    }
    if (s.qualityAssurance) {
      lines.push('Quality Assurance:');
      lines.push(s.qualityAssurance);
      lines.push('');
    }
    if (s.training) {
      lines.push('GxP Training:');
      lines.push(s.training);
      lines.push('');
    }
    if (s.medicalDevices) {
      lines.push('Medical Device Experience:');
      lines.push(s.medicalDevices);
      lines.push('');
    }
    if (s.consulting) {
      lines.push('Consulting:');
      lines.push(s.consulting);
      lines.push('');
    }
  }

  if (cv.auditSummary?.length) {
    lines.push('SUMMARY OF AUDITS AND TRAINING');
    lines.push('');
    cv.auditSummary.forEach((a: any, i: number) => {
      lines.push(`${i + 1}. ${a.activity} | Count: ${a.number} | ${a.details}`);
    });
    lines.push('');
  }

  if (cv.education?.length) {
    lines.push('EDUCATION / QUALIFICATIONS');
    lines.push('');
    cv.education.forEach((e: any) => {
      lines.push(`${e.period} - ${e.institution} - ${e.degree}`);
    });
    lines.push('');
  }

  if (cv.employmentHistory?.length) {
    lines.push('EMPLOYMENT HISTORY');
    lines.push('');
    cv.employmentHistory.forEach((e: any) => {
      lines.push(`${e.period} | ${e.employer}`);
      lines.push(e.responsibilities);
      lines.push('');
    });
  }

  if (cv.trainingsAndCourses?.length) {
    lines.push('PASSED TRAINING & COURSES');
    lines.push('');
    cv.trainingsAndCourses.forEach((t: any) => {
      lines.push(`${t.period} - ${t.subject}`);
    });
    lines.push('');
  }

  if (cv.systemsExperience?.length) {
    lines.push('SYSTEMS EXPERIENCE / IT SKILLS');
    lines.push('');
    cv.systemsExperience.forEach((s: string) => lines.push(`- ${s}`));
    lines.push('');
  }

  if (cv.otherDetails?.length) {
    lines.push('OTHER RELEVANT DETAILS');
    lines.push('');
    cv.otherDetails.forEach((d: string) => lines.push(`- ${d}`));
    lines.push('');
  }

  lines.push('');
  lines.push('If you have any questions concerning this Curriculum Vitae, contact info@theqarp.com');
  lines.push('Generated by The QARP Candidate Portal');

  return lines.join('\n');
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // Initialize sheet row map on startup
  initSheetRowMap().catch(err => console.error("[QARP] initSheetRowMap error:", err.message));

  // Helper to strip password hash from candidate before sending to client
  function safeCandidate(c: any) {
    const { passwordHash, ...rest } = c;
    return rest;
  }

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    const sheetsOk = !!getSheetsClient();
    const emailOk = !!getEmailTransporter();
    const driveOk = !!getDriveClient();
    return res.json({
      status: "ok",
      integrations: {
        googleSheets: sheetsOk ? "connected" : "disabled (no credentials)",
        googleDrive: driveOk ? "connected" : "disabled (no GOOGLE_DRIVE_FOLDER_ID)",
        email: emailOk ? "connected" : "disabled (no credentials)",
      },
      driveFolderId: DRIVE_FOLDER_ID || "not set",
    });
  });


  // Register new candidate
  app.post("/api/candidates/register", (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { email, password } = parsed.data;
      const existing = storage.getCandidateByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
      }
      const candidate = storage.createCandidate(email, password);
      console.log(`[QARP] New candidate registered: ${email}`);

      // Fire-and-forget: sync to sheet + send notifications (non-blocking)
      (async () => {
        try {
          await syncCandidateToSheet(candidate);
          await notifyNewCandidate(email);
          await sendWelcomeEmail(email);
        } catch (e: any) {
          console.error('[QARP] Background sync error:', e.message);
        }
      })();

      return res.status(201).json(safeCandidate(candidate));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Login existing candidate
  app.post("/api/candidates/login", (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { email, password } = parsed.data;
      const candidate = storage.getCandidateByEmail(email);
      if (!candidate) {
        return res.status(401).json({ error: "No account found with this email. Please register first." });
      }
      if (!verifyPassword(password, candidate.passwordHash)) {
        return res.status(401).json({ error: "Incorrect password. Please try again." });
      }
      return res.json(safeCandidate(candidate));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Legacy endpoint for backward compatibility
  app.post("/api/candidates", (req: Request, res: Response) => {
    return res.status(400).json({ error: "Please use /api/candidates/register or /api/candidates/login" });
  });

  // Get candidate data
  app.get("/api/candidates/:id", (req: Request, res: Response) => {
    const candidate = storage.getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    return res.json(safeCandidate(candidate));
  });

  // Update profile
  app.patch("/api/candidates/:id/profile", (req: Request, res: Response) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const candidate = storage.updateProfile(req.params.id, parsed.data);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    // Fire-and-forget: sync to sheet (non-blocking)
    (async () => {
      try {
        await syncCandidateToSheet(candidate);
        if (candidate.profileCompleted) {
          await notifyProfileComplete(candidate);
        }
      } catch (e: any) {
        console.error('[QARP] Background sync error:', e.message);
      }
    })();

    return res.json(safeCandidate(candidate));
  });

  // Upload CV
  app.post("/api/candidates/:id/cv", upload.single('cv'), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const cvData = {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      data: req.file.buffer.toString('base64'),
      uploadedAt: new Date().toISOString(),
    };
    const candidate = storage.uploadCV(req.params.id, cvData);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    // Fire-and-forget: upload to Drive + sync sheet + notify with attachment (non-blocking)
    (async () => {
      try {
        const driveLink = await uploadCVToDrive(candidate, cvData);
        await syncCandidateToSheet(candidate);
        const cvBuffer = Buffer.from(cvData.data, 'base64');
        await notifyCVUploaded(candidate, cvData.filename, cvBuffer, cvData.mimetype, driveLink);
      } catch (e: any) {
        console.error('[QARP] Background sync error:', e.message);
      }
    })();

    return res.json(safeCandidate(candidate));
  });

  // Save questionnaire progress
  app.patch("/api/candidates/:id/questionnaire", (req: Request, res: Response) => {
    const parsed = questionnaireSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const candidate = storage.updateQuestionnaire(req.params.id, parsed.data);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    // Fire-and-forget: sync to sheet + notify if completed (non-blocking)
    (async () => {
      try {
        await syncCandidateToSheet(candidate);
        if (candidate.questionnaireCompleted && parsed.data.completed) {
          await notifyQuestionnaireComplete(candidate);
        }
      } catch (e: any) {
        console.error('[QARP] Background sync error:', e.message);
      }
    })();

    return res.json(safeCandidate(candidate));
  });

  // --- AI QARP CV Generation ---

  // Generate QARP CV using AI (Gemini)
  app.post("/api/candidates/:id/generate-qarp-cv", async (req: Request, res: Response) => {
    try {
      const candidate = storage.getCandidateById(req.params.id);
      if (!candidate) return res.status(404).json({ error: "Candidate not found" });

      if (!candidate.cv) {
        return res.status(400).json({ error: "Please upload your CV first" });
      }

      console.log(`[QARP] Generating AI CV for ${candidate.email}...`);
      const qarpCV = await generateQARPCV(candidate);

      // Store in memory for later submission
      generatedCVs.set(candidate.id, qarpCV);

      return res.json({ success: true, qarpCV });
    } catch (err: any) {
      console.error('[QARP] Generate QARP CV error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Get previously generated QARP CV
  app.get("/api/candidates/:id/qarp-cv", (req: Request, res: Response) => {
    const qarpCV = generatedCVs.get(req.params.id);
    if (!qarpCV) return res.status(404).json({ error: "No generated CV found. Please generate first." });
    return res.json({ qarpCV });
  });

  // Submit generated QARP CV to QARP (upload PDF to Drive + notify)
  app.post("/api/candidates/:id/submit-qarp-cv", async (req: Request, res: Response) => {
    try {
      const candidate = storage.getCandidateById(req.params.id);
      if (!candidate) return res.status(404).json({ error: "Candidate not found" });

      const qarpCV = generatedCVs.get(candidate.id);
      if (!qarpCV) return res.status(400).json({ error: "No generated CV found. Please generate first." });

      // Generate a simple HTML -> text representation for the PDF
      const candidateName = qarpCV.fullName || candidate.profile?.fullName || candidate.email;
      const safeName = candidateName.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Upload the QARP CV JSON data to Drive as a formatted text file
      const drive = getDriveClient();
      let driveLink: string | null = null;

      if (drive) {
        try {
          const cvContent = formatQARPCVAsText(qarpCV);
          const { Readable } = await import('stream');
          const stream = new Readable();
          stream.push(Buffer.from(cvContent, 'utf-8'));
          stream.push(null);

          const response = await drive.files.create({
            requestBody: {
              name: `QARP_CV_${safeName}_${new Date().toISOString().slice(0,10)}.txt`,
              parents: [DRIVE_FOLDER_ID],
              mimeType: 'application/vnd.google-apps.document', // Convert to Google Doc
            },
            media: {
              mimeType: 'text/plain',
              body: stream,
            },
            supportsAllDrives: true,
            fields: 'id, webViewLink',
          });

          driveLink = response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`;
          console.log(`[QARP] QARP CV uploaded to Drive for ${candidate.email}: ${driveLink}`);
        } catch (err: any) {
          console.error('[QARP] Drive upload error for QARP CV:', err.message);
        }
      }

      // Send notification email
      const driveLine = driveLink ? `\nQARP CV (Google Drive): ${driveLink}` : '';
      await sendNotificationEmail(
        `[QARP Portal] QARP CV Submitted: ${candidateName}`,
        `A candidate has approved and submitted their AI-generated QARP CV.\n\nName: ${candidateName}\nEmail: ${candidate.email}\nLocation: ${qarpCV.location || 'N/A'}\nLanguages: ${qarpCV.languages || 'N/A'}\nMemberships: ${qarpCV.memberships || 'N/A'}${driveLine}\n\nSummary: ${qarpCV.summary || 'N/A'}\n\nAreas of Expertise: ${(qarpCV.areasOfExpertise || []).join(', ')}\n\nFull QARP CV is available in the Google Drive folder.`
      );

      return res.json({ success: true, driveLink });
    } catch (err: any) {
      console.error('[QARP] Submit QARP CV error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin login
  app.post("/api/admin/login", (req: Request, res: Response) => {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Password is required" });
    }
    if (parsed.data.password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid password" });
    }
    return res.json({ success: true });
  });

  // Admin: list all candidates
  app.get("/api/admin/candidates", (req: Request, res: Response) => {
    const candidates = storage.getAllCandidates();
    return res.json(candidates.map(safeCandidate));
  });

  // Admin: download candidate CV
  app.get("/api/admin/candidates/:id/cv", (req: Request, res: Response) => {
    const cv = storage.getCandidateCV(req.params.id);
    if (!cv) return res.status(404).json({ error: "No CV found" });
    const buffer = Buffer.from(cv.data, 'base64');
    res.setHeader('Content-Type', cv.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${cv.filename}"`);
    return res.send(buffer);
  });

  // Generate QARP CV PDF for a candidate
  app.get("/api/candidates/:id/generate-cv", (req: Request, res: Response) => {
    const candidate = storage.getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    try {
      const safeName = (candidate.profile?.fullName || candidate.email).replace(/[^a-zA-Z0-9]/g, '_');
      const inputPath = `/tmp/cv_input_${candidate.id}.json`;
      const outputPath = `/tmp/QARP_CV_${safeName}.pdf`;

      fs.writeFileSync(inputPath, JSON.stringify(candidate));

      // Try multiple paths for the CV generation script
      const possiblePaths = [
        path.resolve(process.cwd(), 'server', 'generate_cv.py'),
        '/home/user/workspace/qarp-portal/server/generate_cv.py',
      ];
      let actualPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

      execSync(`python3 "${actualPath}" "${inputPath}" "${outputPath}"`, {
        timeout: 30000,
        encoding: "utf-8",
      });

      const pdfBuffer = fs.readFileSync(outputPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="QARP_CV_${safeName}.pdf"`);

      setTimeout(() => {
        try { fs.unlinkSync(inputPath); } catch {}
        try { fs.unlinkSync(outputPath); } catch {}
      }, 5000);

      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error('[QARP] CV generation error:', err.message);
      return res.status(500).json({ error: 'Failed to generate CV PDF' });
    }
  });

  // Admin: generate CV for any candidate
  app.get("/api/admin/candidates/:id/generate-cv", (req: Request, res: Response) => {
    const candidate = storage.getCandidateById(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    try {
      const safeName = (candidate.profile?.fullName || candidate.email).replace(/[^a-zA-Z0-9]/g, '_');
      const inputPath = `/tmp/cv_input_${candidate.id}.json`;
      const outputPath = `/tmp/QARP_CV_${safeName}.pdf`;

      fs.writeFileSync(inputPath, JSON.stringify(candidate));
      const possiblePaths = [
        path.resolve(process.cwd(), 'server', 'generate_cv.py'),
        '/home/user/workspace/qarp-portal/server/generate_cv.py',
      ];
      let actualPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

      execSync(`python3 "${actualPath}" "${inputPath}" "${outputPath}"`, {
        timeout: 30000,
        encoding: "utf-8",
      });

      const pdfBuffer = fs.readFileSync(outputPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="QARP_CV_${safeName}.pdf"`);

      setTimeout(() => {
        try { fs.unlinkSync(inputPath); } catch {}
        try { fs.unlinkSync(outputPath); } catch {}
      }, 5000);

      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error('[QARP] CV generation error:', err.message);
      return res.status(500).json({ error: 'Failed to generate CV PDF' });
    }
  });

  // Admin: export CSV
  app.get("/api/admin/export", (_req: Request, res: Response) => {
    const candidates = storage.getAllCandidates();
    const headers = [
      'ID', 'Email', 'Full Name', 'Prefix', 'Phone', 'City/Country',
      'Registered', 'Profile Complete', 'CV Uploaded', 'Questionnaire Complete',
      'Completeness %', 'Audit Types', 'Branch Expertise', 'Audits Performed',
      'Qualification', 'Languages', 'On-site Rate', 'Remote Rate',
      'Locations', 'Professional Memberships', 'Consulting Interest',
      'Training Interest'
    ];
    const rows = candidates.map(c => [
      c.id,
      c.email,
      c.profile.fullName || '',
      c.profile.namePrefix || '',
      c.profile.phone || '',
      c.profile.cityCountry || '',
      c.registeredAt,
      c.profileCompleted ? 'Yes' : 'No',
      c.cv ? 'Yes' : 'No',
      c.questionnaireCompleted ? 'Yes' : 'No',
      c.completenessScore.toString(),
      (c.questionnaire.auditTypes || []).join('; '),
      (c.questionnaire.branchExpertise || []).join('; '),
      c.questionnaire.auditsPerformed || '',
      c.questionnaire.qualificationAuditing || '',
      (c.questionnaire.languages || []).join('; '),
      c.questionnaire.onsiteAuditRate || '',
      c.questionnaire.remoteAuditRate || '',
      (c.questionnaire.onsiteLocations || []).join('; '),
      (c.questionnaire.professionalMembership || []).join('; '),
      c.questionnaire.interestedConsulting || '',
      c.questionnaire.trainingInterest || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="qarp_candidates_export.csv"');
    return res.send(csv);
  });
}
