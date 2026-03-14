import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { QarpLogoFull } from "@/components/QarpLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Send, CheckCircle2, Loader2, AlertCircle, FileText, MapPin, Globe, Award, Briefcase, GraduationCap, Wrench, BookOpen } from "lucide-react";
import { useState, useCallback } from "react";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

// Types for the QARP CV structure
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

type PageState = "initial" | "generating" | "preview" | "submitting" | "submitted" | "error";

export default function GeneratedCVPage() {
  const { candidate } = useAuth();
  const [, setLocation] = useLocation();
  const [state, setState] = useState<PageState>("initial");
  const [cvData, setCvData] = useState<QARPCVData | null>(null);
  const [driveLink, setDriveLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!candidate) { setLocation("/"); return null; }

  const canGenerate = candidate.profileCompleted && !!candidate.cv;

  const handleGenerate = useCallback(async () => {
    if (!candidate) return;
    setState("generating");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidate.id}/generate-qarp-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate CV");
      setCvData(data.qarpCV);
      setState("preview");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate CV. Please try again.");
      setState("error");
    }
  }, [candidate]);

  const handleSubmit = useCallback(async () => {
    if (!candidate) return;
    setState("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidate.id}/submit-qarp-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit CV");
      setDriveLink(data.driveLink || null);
      setState("submitted");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit CV. Please try again.");
      setState("error");
    }
  }, [candidate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <QarpLogoFull />
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* === INITIAL STATE — Generate button === */}
          {state === "initial" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-xl font-bold text-foreground" data-testid="text-page-title">
                  AI-Powered QARP CV Generation
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Our AI will analyze your uploaded CV and questionnaire responses to create a standardized QARP CV formatted for our expert database.
                </p>
              </div>

              {!canGenerate ? (
                <Card className="bg-card border-card-border">
                  <CardContent className="py-8 text-center">
                    <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                    <h3 className="font-display font-semibold text-foreground mb-1">Requirements Not Met</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {!candidate.profileCompleted && "Please complete your profile. "}
                      {!candidate.cv && "Please upload your CV. "}
                      {!candidate.questionnaireCompleted && "Completing the questionnaire is recommended for best results."}
                    </p>
                    <Button variant="secondary" size="sm" className="mt-4" onClick={() => setLocation("/dashboard")} data-testid="button-go-dashboard">
                      Go to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-primary/20">
                  <CardContent className="py-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-2">Ready to Generate</h3>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
                      The AI will combine your uploaded CV with your questionnaire data to produce a comprehensive QARP-format CV. You will be able to review the result before submitting.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      {[
                        { icon: FileText, label: "CV Uploaded", ok: !!candidate.cv },
                        { icon: Briefcase, label: "Profile Complete", ok: candidate.profileCompleted },
                        { icon: BookOpen, label: "Questionnaire", ok: candidate.questionnaireCompleted },
                      ].map(item => (
                        <span key={item.label} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${item.ok ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {item.ok ? <CheckCircle2 className="w-3 h-3" /> : <item.icon className="w-3 h-3" />}
                          {item.label}
                        </span>
                      ))}
                    </div>
                    <Button size="lg" onClick={handleGenerate} data-testid="button-generate-cv">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate QARP CV
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* === GENERATING STATE === */}
          {state === "generating" && (
            <Card className="bg-card border-card-border">
              <CardContent className="py-16 text-center">
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">Generating Your QARP CV</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Our AI is analyzing your CV and questionnaire data to create a standardized QARP-format CV. This usually takes 15-30 seconds.
                </p>
              </CardContent>
            </Card>
          )}

          {/* === ERROR STATE === */}
          {state === "error" && (
            <Card className="bg-card border-destructive/30">
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                <h3 className="font-display font-semibold text-foreground mb-1">Generation Failed</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">{errorMsg}</p>
                <div className="flex justify-center gap-3">
                  <Button variant="secondary" onClick={() => setState("initial")} data-testid="button-retry">
                    Try Again
                  </Button>
                  <Button variant="ghost" onClick={() => setLocation("/dashboard")} data-testid="button-back-error">
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* === PREVIEW STATE — Show generated CV === */}
          {(state === "preview" || state === "submitting") && cvData && (
            <div className="space-y-6">
              {/* Action bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="font-display text-xl font-bold text-foreground">Your QARP CV Preview</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Review the generated CV below, then submit to QARP.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setState("initial"); setCvData(null); }} data-testid="button-regenerate">
                    <Sparkles className="w-4 h-4 mr-1" /> Regenerate
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={state === "submitting"}
                    data-testid="button-submit-cv"
                  >
                    {state === "submitting" ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-1" /> Submit to QARP</>
                    )}
                  </Button>
                </div>
              </div>

              {/* CV Card */}
              <Card className="bg-white text-gray-900 border-card-border">
                <CardContent className="p-8">
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #00B4D8", paddingBottom: "20px", marginBottom: "30px" }}>
                    <div>
                      <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "24px", color: "#0B1120", fontWeight: 700 }}>
                        The QARP
                      </h1>
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                        Quality Assurance Research Professionals
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", color: "#00B4D8", fontWeight: 600 }}>
                        Curriculum Vitae
                      </h2>
                      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                        Generated {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Name & Contact */}
                  <div style={{ marginBottom: "24px" }}>
                    <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", color: "#0B1120", fontWeight: 700, marginBottom: "8px" }}>
                      {cvData.fullName || "—"}
                    </h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "#374151" }}>
                      {cvData.location && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <MapPin style={{ width: "14px", height: "14px", color: "#00B4D8" }} /> {cvData.location}
                        </span>
                      )}
                      {cvData.email && (
                        <span>{cvData.email}</span>
                      )}
                      {cvData.phone && (
                        <span>{cvData.phone}</span>
                      )}
                    </div>
                    {cvData.languages && (
                      <div style={{ marginTop: "8px", fontSize: "13px", color: "#374151" }}>
                        <Globe style={{ width: "14px", height: "14px", display: "inline", verticalAlign: "middle", color: "#00B4D8", marginRight: "4px" }} />
                        {cvData.languages}
                      </div>
                    )}
                    {cvData.memberships && (
                      <div style={{ marginTop: "4px", fontSize: "13px", color: "#374151" }}>
                        <Award style={{ width: "14px", height: "14px", display: "inline", verticalAlign: "middle", color: "#00B4D8", marginRight: "4px" }} />
                        {cvData.memberships}
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {cvData.summary && (
                    <CVSection title="Professional Summary">
                      <p style={{ fontSize: "13px", color: "#1f2937", lineHeight: "1.6" }}>{cvData.summary}</p>
                    </CVSection>
                  )}

                  {/* Areas of Expertise */}
                  {cvData.areasOfExpertise && cvData.areasOfExpertise.length > 0 && (
                    <CVSection title="Areas of Expertise">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {cvData.areasOfExpertise.map((area, i) => (
                          <span key={i} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "4px", padding: "3px 10px", fontSize: "12px", color: "#0369a1" }}>
                            {area}
                          </span>
                        ))}
                      </div>
                    </CVSection>
                  )}

                  {/* Major Strengths */}
                  {cvData.majorStrengths && (
                    <CVSection title="Major Strengths and Achievements">
                      {cvData.majorStrengths.knowledgeAndExperience && (
                        <StrengthBlock label="Knowledge and Experience" text={cvData.majorStrengths.knowledgeAndExperience} />
                      )}
                      {cvData.majorStrengths.qualityAssurance && (
                        <StrengthBlock label="Quality Assurance" text={cvData.majorStrengths.qualityAssurance} />
                      )}
                      {cvData.majorStrengths.training && (
                        <StrengthBlock label="GxP Training" text={cvData.majorStrengths.training} />
                      )}
                      {cvData.majorStrengths.medicalDevices && (
                        <StrengthBlock label="Medical Devices" text={cvData.majorStrengths.medicalDevices} />
                      )}
                      {cvData.majorStrengths.consulting && (
                        <StrengthBlock label="Consulting" text={cvData.majorStrengths.consulting} />
                      )}
                    </CVSection>
                  )}

                  {/* Audit Summary */}
                  {cvData.auditSummary && cvData.auditSummary.length > 0 && (
                    <CVSection title="Summary of Audits and Training">
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#374151" }}>Activity</th>
                            <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 600, color: "#374151", width: "80px" }}>Count</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#374151" }}>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cvData.auditSummary.map((audit, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "6px 8px", color: "#1f2937" }}>{audit.activity}</td>
                              <td style={{ padding: "6px 8px", textAlign: "center", color: "#1f2937", fontWeight: 500 }}>{audit.number}</td>
                              <td style={{ padding: "6px 8px", color: "#6b7280" }}>{audit.details}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CVSection>
                  )}

                  {/* Education */}
                  {cvData.education && cvData.education.length > 0 && (
                    <CVSection title="Education / Qualifications" icon={GraduationCap}>
                      {cvData.education.map((edu, i) => (
                        <div key={i} style={{ marginBottom: "10px", paddingLeft: "12px", borderLeft: "2px solid #e5e7eb" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>{edu.degree}</div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>{edu.institution} | {edu.period}</div>
                        </div>
                      ))}
                    </CVSection>
                  )}

                  {/* Employment History */}
                  {cvData.employmentHistory && cvData.employmentHistory.length > 0 && (
                    <CVSection title="Employment History" icon={Briefcase}>
                      {cvData.employmentHistory.map((job, i) => (
                        <div key={i} style={{ marginBottom: "14px", paddingLeft: "12px", borderLeft: "2px solid #e5e7eb" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>{job.employer}</div>
                          <div style={{ fontSize: "12px", color: "#00B4D8", fontWeight: 500, marginBottom: "4px" }}>{job.period}</div>
                          <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>{job.responsibilities}</div>
                        </div>
                      ))}
                    </CVSection>
                  )}

                  {/* Trainings & Courses */}
                  {cvData.trainingsAndCourses && cvData.trainingsAndCourses.length > 0 && (
                    <CVSection title="Passed Training and Courses">
                      {cvData.trainingsAndCourses.map((training, i) => (
                        <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "6px", fontSize: "12px" }}>
                          <span style={{ color: "#6b7280", minWidth: "100px" }}>{training.period}</span>
                          <span style={{ color: "#1f2937" }}>{training.subject}</span>
                        </div>
                      ))}
                    </CVSection>
                  )}

                  {/* Systems Experience */}
                  {cvData.systemsExperience && cvData.systemsExperience.length > 0 && (
                    <CVSection title="Systems Experience / IT Skills" icon={Wrench}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {cvData.systemsExperience.map((sys, i) => (
                          <span key={i} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: "#374151" }}>
                            {sys}
                          </span>
                        ))}
                      </div>
                    </CVSection>
                  )}

                  {/* Other Details */}
                  {cvData.otherDetails && cvData.otherDetails.length > 0 && (
                    <CVSection title="Other Relevant Details">
                      <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#1f2937", lineHeight: "1.7" }}>
                        {cvData.otherDetails.map((detail, i) => (
                          <li key={i}>{detail}</li>
                        ))}
                      </ul>
                    </CVSection>
                  )}

                  {/* Footer */}
                  <div style={{ marginTop: "40px", borderTop: "2px solid #00B4D8", paddingTop: "16px" }}>
                    <p style={{ fontSize: "11px", color: "#9ca3af" }}>
                      The QARP — Quality Assurance Research Professionals
                    </p>
                    <p style={{ fontSize: "11px", color: "#9ca3af" }}>
                      If you have any questions concerning this CV, contact info@theqarp.com
                    </p>
                    <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px", fontFamily: "monospace" }}>
                      QARP-Q-SUR-02-01-01, ver 1.0
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Bottom action bar (for long CVs) */}
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => { setState("initial"); setCvData(null); }} data-testid="button-regenerate-bottom">
                  <Sparkles className="w-4 h-4 mr-1" /> Regenerate
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={state === "submitting"}
                  data-testid="button-submit-cv-bottom"
                >
                  {state === "submitting" ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-1" /> Submit to QARP</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* === SUBMITTED STATE === */}
          {state === "submitted" && (
            <Card className="bg-card border-primary/30">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-foreground mb-2">QARP CV Submitted Successfully</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                  Your AI-generated QARP CV has been submitted to our team and uploaded to the QARP expert database. You will receive a confirmation email shortly.
                </p>
                {driveLink && (
                  <a
                    href={driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6"
                    data-testid="link-drive-cv"
                  >
                    <FileText className="w-4 h-4" />
                    View your QARP CV in Google Drive
                  </a>
                )}
                <div className="flex justify-center gap-3 mt-2">
                  <Button variant="secondary" onClick={() => setLocation("/dashboard")} data-testid="button-back-to-dashboard">
                    Back to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => { setState("initial"); setCvData(null); }} data-testid="button-generate-new">
                    Generate New CV
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}

// --- Helper Components ---

function CVSection({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: any }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h2 style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "14px",
        textTransform: "uppercase",
        letterSpacing: "1px",
        color: "#00B4D8",
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: "8px",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function StrengthBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>{label}</div>
      <p style={{ fontSize: "12px", color: "#1f2937", lineHeight: "1.6", margin: 0 }}>{text}</p>
    </div>
  );
}
