import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { QarpLogoFull } from "@/components/QarpLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export default function GeneratedCVPage() {
  const { candidate } = useAuth();
  const [, setLocation] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);

  if (!candidate) { setLocation("/"); return null; }
  if (!candidate.profileCompleted || !candidate.questionnaireCompleted) {
    setLocation("/dashboard");
    return null;
  }

  const q = candidate.questionnaire;
  const p = candidate.profile;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>QARP CV - ${p.fullName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1, h2, h3 { font-family: 'DM Sans', sans-serif; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #00B4D8; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 24px; color: #0B1120; }
        .header p { font-size: 12px; color: #666; }
        .header .right { text-align: right; }
        .section { margin-bottom: 24px; }
        .section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #00B4D8; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
        .field { margin-bottom: 8px; display: flex; gap: 8px; }
        .field .label { font-weight: 600; font-size: 13px; min-width: 180px; color: #374151; }
        .field .value { font-size: 13px; color: #1f2937; }
        .tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 8px; font-size: 11px; color: #374151; }
        .footer { margin-top: 40px; border-top: 2px solid #00B4D8; padding-top: 16px; font-size: 11px; color: #9ca3af; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body>${printRef.current.innerHTML}
      <script>window.print(); window.close();</script>
    </body></html>`);
    printWindow.document.close();
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!candidate) return;
    setDownloading(true);
    try {
      const response = await fetch(`${API_BASE}/api/candidates/${candidate.id}/generate-cv`);
      if (!response.ok) throw new Error('Failed to generate CV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (p.fullName || candidate.email).replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `QARP_CV_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('CV download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <QarpLogoFull />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} data-testid="button-print">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} disabled={downloading} data-testid="button-download-pdf">
              <Download className="w-4 h-4 mr-2" /> {downloading ? 'Generating...' : 'Download QARP CV'}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white text-gray-900 border-card-border">
            <CardContent className="p-8" ref={printRef}>
              {/* CV Header */}
              <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #00B4D8", paddingBottom: "20px", marginBottom: "30px" }}>
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
                    Auditor / Consultant CV
                  </h2>
                  <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                    Generated {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Personal Info */}
              <div className="section" style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "#00B4D8", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "12px" }}>
                  Personal Information
                </h2>
                {[
                  ["Full Name", `${p.namePrefix || ""} ${p.fullName || ""}`.trim()],
                  ["Email", p.email],
                  ["Phone", p.phone],
                  ["Location", p.cityCountry],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px", minWidth: "180px", color: "#374151" }}>{label}</span>
                    <span style={{ fontSize: "13px", color: "#1f2937" }}>{(value as string) || "—"}</span>
                  </div>
                ))}
              </div>

              {/* Audit Experience */}
              <div className="section" style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "#00B4D8", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "12px" }}>
                  Audit Experience
                </h2>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", minWidth: "180px", color: "#374151" }}>Audit Types</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {(q.auditTypes || []).map(t => (
                      <span key={t} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: "#374151" }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px", minWidth: "180px", color: "#374151" }}>Branch of Expertise</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {(q.branchExpertise || []).map(t => (
                      <span key={t} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: "#374151" }}>{t}</span>
                    ))}
                  </div>
                </div>
                {[
                  ["Audits Performed", q.auditsPerformed],
                  ["Certified Auditor", q.qualificationAuditing],
                  ["Exam Date", q.qualificationExamDate],
                  ["Exam Name", q.qualificationExamName],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px", minWidth: "180px", color: "#374151" }}>{label}</span>
                    <span style={{ fontSize: "13px", color: "#1f2937" }}>{(value as string) || "—"}</span>
                  </div>
                ))}
              </div>

              {/* Languages */}
              <div className="section" style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "#00B4D8", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "12px" }}>
                  Languages
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {(q.languages || []).map(l => (
                    <span key={l} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: "#374151" }}>{l}</span>
                  ))}
                </div>
              </div>

              {/* Rates */}
              <div className="section" style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "#00B4D8", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "12px" }}>
                  Rates
                </h2>
                {[
                  ["On-site Audit Rate", q.onsiteAuditRate],
                  ["Remote Audit Rate", q.remoteAuditRate],
                  ["Consulting Rate", q.consultingRate],
                  ["Training Rate", q.trainingRate],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px", minWidth: "180px", color: "#374151" }}>{label}</span>
                    <span style={{ fontSize: "13px", color: "#1f2937" }}>{(value as string) || "—"}</span>
                  </div>
                ))}
              </div>

              {/* Regional Coverage */}
              <div className="section" style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "#00B4D8", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "12px" }}>
                  Regional Coverage
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {(q.onsiteLocations || []).map(l => (
                    <span key={l} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: "#374151" }}>{l}</span>
                  ))}
                </div>
              </div>

              {/* Consulting & Training */}
              <div className="section" style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "#00B4D8", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "12px" }}>
                  Consulting & Training
                </h2>
                {[
                  ["Consulting Interest", q.interestedConsulting],
                  ["Consulting Services", q.consultingServices],
                  ["Consulting Experience", q.consultingExperience],
                  ["Training Interest", q.trainingInterest],
                  ["Training Experience", q.trainingExperience],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px", minWidth: "180px", color: "#374151" }}>{label}</span>
                    <span style={{ fontSize: "13px", color: "#1f2937" }}>{(value as string) || "—"}</span>
                  </div>
                ))}
              </div>

              {/* Professional Memberships */}
              {(q.professionalMembership || []).length > 0 && (
                <div className="section" style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "#00B4D8", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "12px" }}>
                    Professional Memberships
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {(q.professionalMembership || []).map(m => (
                      <span key={m} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", color: "#374151" }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: "40px", borderTop: "2px solid #00B4D8", paddingTop: "16px" }}>
                <p style={{ fontSize: "11px", color: "#9ca3af" }}>
                  The QARP — Quality Assurance Research Professionals
                </p>
                <p style={{ fontSize: "11px", color: "#9ca3af" }}>
                  Confidential. All rights reserved.
                </p>
                <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px", fontFamily: "monospace" }}>
                  QARP-Q-SUR-02-01-01, ver 1.0
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
