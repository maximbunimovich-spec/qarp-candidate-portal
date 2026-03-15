import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { QarpLogoFull } from "@/components/QarpLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Send, CheckCircle2, Loader2, AlertCircle, FileText, MapPin, Globe, Award, Briefcase, GraduationCap, Wrench, BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

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
  const { candidate, refreshCandidate } = useAuth();
  const [, setLocation] = useLocation();
  const [state, setState] = useState<PageState>("initial");
  const [cvData, setCvData] = useState<QARPCVData | null>(null);
  const [driveLink, setDriveLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [editing, setEditing] = useState(false);

  // Refresh candidate data from server on mount to ensure up-to-date state
  useEffect(() => {
    refreshCandidate();
  }, []);

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
      setEditing(false);
      setState("preview");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate CV. Please try again.");
      setState("error");
    }
  }, [candidate]);

  const handleSubmit = useCallback(async () => {
    if (!candidate || !cvData) return;
    setState("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidate.id}/submit-qarp-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedCV: cvData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit CV");
      setDriveLink(data.driveLink || null);
      setState("submitted");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit CV. Please try again.");
      setState("error");
    }
  }, [candidate, cvData]);

  // --- Updater helpers ---
  const updateField = (field: keyof QARPCVData, value: any) => {
    if (!cvData) return;
    setCvData({ ...cvData, [field]: value });
  };

  const updateStrength = (key: string, value: string) => {
    if (!cvData) return;
    setCvData({
      ...cvData,
      majorStrengths: { ...cvData.majorStrengths, [key]: value },
    });
  };

  const updateArrayItem = <T extends Record<string, any>>(field: keyof QARPCVData, index: number, key: string, value: string) => {
    if (!cvData) return;
    const arr = [...((cvData[field] as T[]) || [])];
    arr[index] = { ...arr[index], [key]: value };
    setCvData({ ...cvData, [field]: arr });
  };

  const addArrayItem = (field: keyof QARPCVData, template: any) => {
    if (!cvData) return;
    const arr = [...((cvData[field] as any[]) || []), template];
    setCvData({ ...cvData, [field]: arr });
  };

  const removeArrayItem = (field: keyof QARPCVData, index: number) => {
    if (!cvData) return;
    const arr = [...((cvData[field] as any[]) || [])];
    arr.splice(index, 1);
    setCvData({ ...cvData, [field]: arr });
  };

  const updateStringArrayItem = (field: keyof QARPCVData, index: number, value: string) => {
    if (!cvData) return;
    const arr = [...((cvData[field] as string[]) || [])];
    arr[index] = value;
    setCvData({ ...cvData, [field]: arr });
  };

  const addStringArrayItem = (field: keyof QARPCVData) => {
    if (!cvData) return;
    const arr = [...((cvData[field] as string[]) || []), ""];
    setCvData({ ...cvData, [field]: arr });
  };

  const removeStringArrayItem = (field: keyof QARPCVData, index: number) => {
    if (!cvData) return;
    const arr = [...((cvData[field] as string[]) || [])];
    arr.splice(index, 1);
    setCvData({ ...cvData, [field]: arr });
  };

  // Style helpers for editable fields
  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #d1d5db", borderRadius: "6px",
    padding: "6px 10px", fontSize: "13px", color: "#1f2937",
    background: "#fafafa", outline: "none",
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle, minHeight: "60px", resize: "vertical", lineHeight: "1.5",
  };
  const smallInputStyle: React.CSSProperties = {
    ...inputStyle, fontSize: "12px", padding: "4px 8px",
  };

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
                      The AI will combine your uploaded CV with your questionnaire data to produce a comprehensive QARP-format CV. You will be able to review and edit the result before submitting.
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

          {/* === PREVIEW STATE — Show generated CV (editable) === */}
          {(state === "preview" || state === "submitting") && cvData && (
            <div className="space-y-6">
              {/* Action bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="font-display text-xl font-bold text-foreground">Your QARP CV Preview</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {editing
                      ? "Edit any field below. Click 'Done Editing' when finished, then submit."
                      : "Review the generated CV below. Click 'Edit' to make changes before submitting."
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setState("initial"); setCvData(null); setEditing(false); }} data-testid="button-regenerate">
                    <Sparkles className="w-4 h-4 mr-1" /> Regenerate
                  </Button>
                  <Button
                    variant={editing ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditing(!editing)}
                    data-testid="button-toggle-edit"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    {editing ? "Done Editing" : "Edit"}
                  </Button>
                  {!editing && (
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
                  )}
                </div>
              </div>

              {/* Editing banner */}
              {editing && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center gap-3">
                  <Pencil className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    Editing mode — click on any field to modify it. Use + to add items and the trash icon to remove them.
                  </p>
                </div>
              )}

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
                      <p style={{ fontSize: "10px", color: "#9ca3af", marginTop: "4px" }}>
                        QARP-Q-TEM-02-00-01 | v 3.0
                      </p>
                      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                        Generated {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Name & Contact */}
                  <div style={{ marginBottom: "24px" }}>
                    {editing ? (
                      <input style={{ ...inputStyle, fontSize: "20px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", marginBottom: "8px" }}
                        value={cvData.fullName || ""} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Full Name" data-testid="input-fullname" />
                    ) : (
                      <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", color: "#0B1120", fontWeight: 700, marginBottom: "8px" }}>
                        {cvData.fullName || "—"}
                      </h2>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: editing ? "8px" : "16px", fontSize: "13px", color: "#374151" }}>
                      {editing ? (
                        <>
                          <input style={{ ...smallInputStyle, flex: "1", minWidth: "180px" }} value={cvData.location || ""} onChange={(e) => updateField("location", e.target.value)} placeholder="Location" data-testid="input-location" />
                          <input style={{ ...smallInputStyle, flex: "1", minWidth: "180px" }} value={cvData.email || ""} onChange={(e) => updateField("email", e.target.value)} placeholder="Email" data-testid="input-email" />
                          <input style={{ ...smallInputStyle, flex: "1", minWidth: "150px" }} value={cvData.phone || ""} onChange={(e) => updateField("phone", e.target.value)} placeholder="Phone" data-testid="input-phone" />
                        </>
                      ) : (
                        <>
                          {cvData.location && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <MapPin style={{ width: "14px", height: "14px", color: "#00B4D8" }} /> {cvData.location}
                            </span>
                          )}
                          {cvData.email && <span>{cvData.email}</span>}
                          {cvData.phone && <span>{cvData.phone}</span>}
                        </>
                      )}
                    </div>
                    {editing ? (
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <input style={{ ...smallInputStyle, flex: "1" }} value={cvData.languages || ""} onChange={(e) => updateField("languages", e.target.value)} placeholder="Languages" data-testid="input-languages" />
                        <input style={{ ...smallInputStyle, flex: "1" }} value={cvData.memberships || ""} onChange={(e) => updateField("memberships", e.target.value)} placeholder="Professional Memberships" data-testid="input-memberships" />
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>

                  {/* Summary */}
                  {(cvData.summary || editing) && (
                    <CVSection title="Professional Summary">
                      {editing ? (
                        <textarea style={textareaStyle} value={cvData.summary || ""} onChange={(e) => updateField("summary", e.target.value)} placeholder="Professional summary..." data-testid="input-summary" />
                      ) : (
                        <p style={{ fontSize: "13px", color: "#1f2937", lineHeight: "1.6" }}>{cvData.summary}</p>
                      )}
                    </CVSection>
                  )}

                  {/* Areas of Expertise */}
                  {((cvData.areasOfExpertise && cvData.areasOfExpertise.length > 0) || editing) && (
                    <CVSection title="Areas of Expertise">
                      {editing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {(cvData.areasOfExpertise || []).map((area, i) => (
                            <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <input style={{ ...smallInputStyle, flex: "1" }} value={area} onChange={(e) => updateStringArrayItem("areasOfExpertise", i, e.target.value)} data-testid={`input-expertise-${i}`} />
                              <button onClick={() => removeStringArrayItem("areasOfExpertise", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px" }} data-testid={`button-remove-expertise-${i}`}>
                                <Trash2 style={{ width: "14px", height: "14px" }} />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addStringArrayItem("areasOfExpertise")} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "1px dashed #d1d5db", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", color: "#6b7280", fontSize: "12px" }} data-testid="button-add-expertise">
                            <Plus style={{ width: "14px", height: "14px" }} /> Add area of expertise
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {(cvData.areasOfExpertise || []).map((area, i) => (
                            <span key={i} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "4px", padding: "3px 10px", fontSize: "12px", color: "#0369a1" }}>
                              {area}
                            </span>
                          ))}
                        </div>
                      )}
                    </CVSection>
                  )}

                  {/* Major Strengths */}
                  {(cvData.majorStrengths || editing) && (
                    <CVSection title="Major Strengths and Achievements">
                      {([
                        { key: "knowledgeAndExperience", label: "Knowledge and Experience" },
                        { key: "qualityAssurance", label: "Quality Assurance" },
                        { key: "training", label: "GxP Training" },
                        { key: "medicalDevices", label: "Medical Devices" },
                        { key: "consulting", label: "Consulting" },
                      ] as const).map(({ key, label }) => {
                        const val = (cvData.majorStrengths as any)?.[key];
                        if (!val && !editing) return null;
                        return editing ? (
                          <div key={key} style={{ marginBottom: "12px" }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>{label}</div>
                            <textarea style={{ ...textareaStyle, minHeight: "50px" }} value={val || ""} onChange={(e) => updateStrength(key, e.target.value)} placeholder={`${label}...`} data-testid={`input-strength-${key}`} />
                          </div>
                        ) : (
                          <StrengthBlock key={key} label={label} text={val} />
                        );
                      })}
                    </CVSection>
                  )}

                  {/* Audit Summary */}
                  {((cvData.auditSummary && cvData.auditSummary.length > 0) || editing) && (
                    <CVSection title="Summary of Audits and Training">
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#374151" }}>Activity</th>
                            <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 600, color: "#374151", width: "80px" }}>Count</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#374151" }}>Details</th>
                            {editing && <th style={{ width: "36px" }}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {(cvData.auditSummary || []).map((audit, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "6px 8px" }}>
                                {editing ? (
                                  <input style={smallInputStyle} value={audit.activity} onChange={(e) => updateArrayItem("auditSummary", i, "activity", e.target.value)} data-testid={`input-audit-activity-${i}`} />
                                ) : (
                                  <span style={{ color: "#1f2937" }}>{audit.activity}</span>
                                )}
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                {editing ? (
                                  <input style={{ ...smallInputStyle, textAlign: "center" }} value={audit.number} onChange={(e) => updateArrayItem("auditSummary", i, "number", e.target.value)} data-testid={`input-audit-number-${i}`} />
                                ) : (
                                  <span style={{ color: "#1f2937", fontWeight: 500 }}>{audit.number}</span>
                                )}
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                {editing ? (
                                  <input style={smallInputStyle} value={audit.details} onChange={(e) => updateArrayItem("auditSummary", i, "details", e.target.value)} data-testid={`input-audit-details-${i}`} />
                                ) : (
                                  <span style={{ color: "#6b7280" }}>{audit.details}</span>
                                )}
                              </td>
                              {editing && (
                                <td style={{ padding: "4px" }}>
                                  <button onClick={() => removeArrayItem("auditSummary", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} data-testid={`button-remove-audit-${i}`}>
                                    <Trash2 style={{ width: "14px", height: "14px" }} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {editing && (
                        <button onClick={() => addArrayItem("auditSummary", { activity: "", number: "", details: "" })} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "1px dashed #d1d5db", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", color: "#6b7280", fontSize: "12px", marginTop: "8px" }} data-testid="button-add-audit">
                          <Plus style={{ width: "14px", height: "14px" }} /> Add audit/activity row
                        </button>
                      )}
                    </CVSection>
                  )}

                  {/* Education */}
                  {((cvData.education && cvData.education.length > 0) || editing) && (
                    <CVSection title="Education / Qualifications" icon={GraduationCap}>
                      {(cvData.education || []).map((edu, i) => (
                        <div key={i} style={{ marginBottom: "10px", paddingLeft: "12px", borderLeft: "2px solid #e5e7eb", position: "relative" }}>
                          {editing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <input style={smallInputStyle} value={edu.degree} onChange={(e) => updateArrayItem("education", i, "degree", e.target.value)} placeholder="Degree / Qualification" data-testid={`input-edu-degree-${i}`} />
                              <div style={{ display: "flex", gap: "6px" }}>
                                <input style={{ ...smallInputStyle, flex: "1" }} value={edu.institution} onChange={(e) => updateArrayItem("education", i, "institution", e.target.value)} placeholder="Institution" data-testid={`input-edu-institution-${i}`} />
                                <input style={{ ...smallInputStyle, width: "130px" }} value={edu.period} onChange={(e) => updateArrayItem("education", i, "period", e.target.value)} placeholder="Period" data-testid={`input-edu-period-${i}`} />
                                <button onClick={() => removeArrayItem("education", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} data-testid={`button-remove-edu-${i}`}>
                                  <Trash2 style={{ width: "14px", height: "14px" }} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>{edu.degree}</div>
                              <div style={{ fontSize: "12px", color: "#6b7280" }}>{edu.institution} | {edu.period}</div>
                            </>
                          )}
                        </div>
                      ))}
                      {editing && (
                        <button onClick={() => addArrayItem("education", { institution: "", period: "", degree: "" })} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "1px dashed #d1d5db", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", color: "#6b7280", fontSize: "12px" }} data-testid="button-add-education">
                          <Plus style={{ width: "14px", height: "14px" }} /> Add education
                        </button>
                      )}
                    </CVSection>
                  )}

                  {/* Employment History */}
                  {((cvData.employmentHistory && cvData.employmentHistory.length > 0) || editing) && (
                    <CVSection title="Employment History" icon={Briefcase}>
                      {(cvData.employmentHistory || []).map((job, i) => (
                        <div key={i} style={{ marginBottom: "14px", paddingLeft: "12px", borderLeft: "2px solid #e5e7eb" }}>
                          {editing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <input style={{ ...smallInputStyle, flex: "1" }} value={job.employer} onChange={(e) => updateArrayItem("employmentHistory", i, "employer", e.target.value)} placeholder="Employer" data-testid={`input-job-employer-${i}`} />
                                <input style={{ ...smallInputStyle, width: "130px" }} value={job.period} onChange={(e) => updateArrayItem("employmentHistory", i, "period", e.target.value)} placeholder="Period" data-testid={`input-job-period-${i}`} />
                                <button onClick={() => removeArrayItem("employmentHistory", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} data-testid={`button-remove-job-${i}`}>
                                  <Trash2 style={{ width: "14px", height: "14px" }} />
                                </button>
                              </div>
                              <textarea style={{ ...textareaStyle, minHeight: "45px" }} value={job.responsibilities} onChange={(e) => updateArrayItem("employmentHistory", i, "responsibilities", e.target.value)} placeholder="Responsibilities" data-testid={`input-job-resp-${i}`} />
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1f2937" }}>{job.employer}</div>
                              <div style={{ fontSize: "12px", color: "#00B4D8", fontWeight: 500, marginBottom: "4px" }}>{job.period}</div>
                              <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>{job.responsibilities}</div>
                            </>
                          )}
                        </div>
                      ))}
                      {editing && (
                        <button onClick={() => addArrayItem("employmentHistory", { employer: "", period: "", responsibilities: "" })} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "1px dashed #d1d5db", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", color: "#6b7280", fontSize: "12px" }} data-testid="button-add-job">
                          <Plus style={{ width: "14px", height: "14px" }} /> Add employment
                        </button>
                      )}
                    </CVSection>
                  )}

                  {/* Trainings & Courses */}
                  {((cvData.trainingsAndCourses && cvData.trainingsAndCourses.length > 0) || editing) && (
                    <CVSection title="Passed Training and Courses">
                      {(cvData.trainingsAndCourses || []).map((training, i) => (
                        <div key={i} style={{ display: "flex", gap: editing ? "6px" : "12px", marginBottom: "6px", fontSize: "12px", alignItems: "center" }}>
                          {editing ? (
                            <>
                              <input style={{ ...smallInputStyle, width: "120px" }} value={training.period} onChange={(e) => updateArrayItem("trainingsAndCourses", i, "period", e.target.value)} placeholder="Period" data-testid={`input-training-period-${i}`} />
                              <input style={{ ...smallInputStyle, flex: "1" }} value={training.subject} onChange={(e) => updateArrayItem("trainingsAndCourses", i, "subject", e.target.value)} placeholder="Subject" data-testid={`input-training-subject-${i}`} />
                              <button onClick={() => removeArrayItem("trainingsAndCourses", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} data-testid={`button-remove-training-${i}`}>
                                <Trash2 style={{ width: "14px", height: "14px" }} />
                              </button>
                            </>
                          ) : (
                            <>
                              <span style={{ color: "#6b7280", minWidth: "100px" }}>{training.period}</span>
                              <span style={{ color: "#1f2937" }}>{training.subject}</span>
                            </>
                          )}
                        </div>
                      ))}
                      {editing && (
                        <button onClick={() => addArrayItem("trainingsAndCourses", { period: "", subject: "" })} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "1px dashed #d1d5db", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", color: "#6b7280", fontSize: "12px", marginTop: "4px" }} data-testid="button-add-training">
                          <Plus style={{ width: "14px", height: "14px" }} /> Add training
                        </button>
                      )}
                    </CVSection>
                  )}

                  {/* Systems Experience */}
                  {((cvData.systemsExperience && cvData.systemsExperience.length > 0) || editing) && (
                    <CVSection title="Systems Experience / IT Skills" icon={Wrench}>
                      {editing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {(cvData.systemsExperience || []).map((sys, i) => (
                            <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <input style={{ ...smallInputStyle, flex: "1" }} value={sys} onChange={(e) => updateStringArrayItem("systemsExperience", i, e.target.value)} data-testid={`input-system-${i}`} />
                              <button onClick={() => removeStringArrayItem("systemsExperience", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} data-testid={`button-remove-system-${i}`}>
                                <Trash2 style={{ width: "14px", height: "14px" }} />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addStringArrayItem("systemsExperience")} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "1px dashed #d1d5db", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", color: "#6b7280", fontSize: "12px" }} data-testid="button-add-system">
                            <Plus style={{ width: "14px", height: "14px" }} /> Add system
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {(cvData.systemsExperience || []).map((sys, i) => (
                            <span key={i} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: "#374151" }}>
                              {sys}
                            </span>
                          ))}
                        </div>
                      )}
                    </CVSection>
                  )}

                  {/* Other Details */}
                  {((cvData.otherDetails && cvData.otherDetails.length > 0) || editing) && (
                    <CVSection title="Other Relevant Details">
                      {editing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {(cvData.otherDetails || []).map((detail, i) => (
                            <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <input style={{ ...smallInputStyle, flex: "1" }} value={detail} onChange={(e) => updateStringArrayItem("otherDetails", i, e.target.value)} data-testid={`input-other-${i}`} />
                              <button onClick={() => removeStringArrayItem("otherDetails", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} data-testid={`button-remove-other-${i}`}>
                                <Trash2 style={{ width: "14px", height: "14px" }} />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addStringArrayItem("otherDetails")} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "1px dashed #d1d5db", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", color: "#6b7280", fontSize: "12px" }} data-testid="button-add-other">
                            <Plus style={{ width: "14px", height: "14px" }} /> Add detail
                          </button>
                        </div>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#1f2937", lineHeight: "1.7" }}>
                          {(cvData.otherDetails || []).map((detail, i) => (
                            <li key={i}>{detail}</li>
                          ))}
                        </ul>
                      )}
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
                    <p style={{ fontSize: "10px", color: "#9ca3af", marginTop: "4px", fontFamily: "monospace" }}>
                      QARP-Q-TEM-02-00-01_The QARP Curriculum Vitae (CV)_v 3.0
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Bottom action bar (for long CVs) */}
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => { setState("initial"); setCvData(null); setEditing(false); }} data-testid="button-regenerate-bottom">
                  <Sparkles className="w-4 h-4 mr-1" /> Regenerate
                </Button>
                <div className="flex gap-2">
                  {editing && (
                    <Button variant="default" size="sm" onClick={() => setEditing(false)} data-testid="button-done-editing-bottom">
                      <Pencil className="w-4 h-4 mr-1" /> Done Editing
                    </Button>
                  )}
                  {!editing && (
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
                  )}
                </div>
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
                  Your QARP CV has been submitted to our team and uploaded to the QARP expert database. You will receive a confirmation email shortly.
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
                  <Button variant="outline" onClick={() => { setState("initial"); setCvData(null); setEditing(false); }} data-testid="button-generate-new">
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
