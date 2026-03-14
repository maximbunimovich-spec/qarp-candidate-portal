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
      subject: "Welcome to The QARP Candidate Portal",
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: #0B1120; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; font-size: 20px; margin: 0;">The QARP</h1>
            <p style="color: #00B4D8; font-size: 12px; margin: 4px 0 0;">Quality Assurance Research Professionals</p>
          </div>
          <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="font-size: 18px; color: #0B1120; margin-top: 0;">Welcome!</h2>
            <p>Thank you for registering on The QARP Candidate Portal.</p>
            <p>Your account has been successfully created. To complete your application, please:</p>
            <ol style="line-height: 1.8;">
              <li>Fill in your <strong>profile</strong> information</li>
              <li>Upload your <strong>CV</strong></li>
              <li>Complete the <strong>questionnaire</strong></li>
            </ol>
            <p>You can log in anytime using your registered email and password:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://qarp-candidate-portal.onrender.com" style="background: #00B4D8; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Go to Portal</a>
            </div>
            <p style="color: #6b7280; font-size: 13px;">If you have any questions, please contact us at <a href="mailto:info@theqarp.com" style="color: #00B4D8;">info@theqarp.com</a></p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 11px; margin-bottom: 0;">The QARP — Quality Assurance Research Professionals<br/>This is an automated message. Please do not reply directly to this email.</p>
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
