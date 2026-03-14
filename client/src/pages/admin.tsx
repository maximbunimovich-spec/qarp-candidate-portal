import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { QarpLogoFull } from "@/components/QarpLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lock, Download, ArrowLeft, CheckCircle2, XCircle, Eye, FileDown, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Candidate } from "@shared/schema";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loadCandidates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/candidates`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch {}
  };

  useEffect(() => {
    if (authenticated) loadCandidates();
  }, [authenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await apiRequest("POST", "/api/admin/login", { password });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        const data = await res.json();
        setLoginError(data.error || "Invalid password");
      }
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qarp_candidates_export.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "CSV file downloaded." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadCV = async (candidateId: string, filename: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/candidates/${candidateId}/cv`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="bg-card border-card-border w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <QarpLogoFull />
            </div>
            <CardTitle className="font-display text-xl">Admin Access</CardTitle>
            <CardDescription>Enter the admin password to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-background pl-10"
                  data-testid="input-admin-password"
                />
              </div>
              {loginError && <p className="text-sm text-destructive">{loginError}</p>}
              <Button type="submit" className="w-full" data-testid="button-admin-login">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredCandidates = candidates.filter((c) => {
    if (filter === "complete") return c.profileCompleted && c.questionnaireCompleted && !!c.cv;
    if (filter === "incomplete") return !c.profileCompleted || !c.questionnaireCompleted || !c.cv;
    return true;
  });

  const selectedCandidate = selectedId ? candidates.find((c) => c.id === selectedId) : null;

  const StatusBadge = ({ ok }: { ok: boolean }) => (
    <Badge variant={ok ? "default" : "secondary"} className={ok ? "bg-primary/15 text-primary border-primary/20" : "bg-muted text-muted-foreground"}>
      {ok ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
      {ok ? "Done" : "Pending"}
    </Badge>
  );

  if (selectedCandidate) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/50 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <QarpLogoFull />
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} data-testid="button-back-list">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-foreground" data-testid="text-candidate-name">
                  {selectedCandidate.profile.namePrefix} {selectedCandidate.profile.fullName || selectedCandidate.email}
                </h1>
                <p className="text-sm text-muted-foreground">{selectedCandidate.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Completeness:</span>
                <span className="text-sm font-bold text-primary">{selectedCandidate.completenessScore}%</span>
              </div>
            </div>

            {/* Status overview */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Profile", ok: selectedCandidate.profileCompleted },
                { label: "CV", ok: !!selectedCandidate.cv },
                { label: "Questionnaire", ok: selectedCandidate.questionnaireCompleted },
              ].map(s => (
                <Card key={s.label} className="bg-card border-card-border">
                  <CardContent className="py-4 px-4 flex items-center justify-between">
                    <span className="text-sm font-medium">{s.label}</span>
                    <StatusBadge ok={s.ok} />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Profile info */}
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["Full Name", selectedCandidate.profile.fullName],
                    ["Prefix", selectedCandidate.profile.namePrefix],
                    ["Email", selectedCandidate.profile.email],
                    ["Phone", selectedCandidate.profile.phone],
                    ["City/Country", selectedCandidate.profile.cityCountry],
                    ["Registered", new Date(selectedCandidate.registeredAt).toLocaleDateString()],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <span className="text-muted-foreground">{label}</span>
                      <p className="font-medium text-foreground">{(value as string) || "—"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CV */}
            {selectedCandidate.cv && (
              <Card className="bg-card border-card-border">
                <CardContent className="py-4 px-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedCandidate.cv.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(selectedCandidate.cv.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownloadCV(selectedCandidate.id, selectedCandidate.cv!.filename)}
                    data-testid="button-download-cv"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Generate QARP CV */}
            {selectedCandidate.profileCompleted && selectedCandidate.questionnaireCompleted && (
              <Card className="bg-card border-primary/30">
                <CardContent className="py-4 px-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">QARP Standardized CV</p>
                    <p className="text-xs text-muted-foreground">
                      Auto-generated from profile and questionnaire data
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const safeName = (selectedCandidate.profile?.fullName || selectedCandidate.email).replace(/[^a-zA-Z0-9]/g, '_');
                      fetch(`${API_BASE}/api/admin/candidates/${selectedCandidate.id}/generate-cv`)
                        .then(res => res.blob())
                        .then(blob => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `QARP_CV_${safeName}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        });
                    }}
                    data-testid="button-generate-cv"
                  >
                    <Download className="w-4 h-4 mr-2" /> Generate QARP CV
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Questionnaire answers */}
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">Questionnaire Answers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  {Object.entries({
                    "Privacy Consent": selectedCandidate.questionnaire.privacyConsent ? "Yes" : "No",
                    "Full Name": selectedCandidate.questionnaire.fullName,
                    "Name Prefix": selectedCandidate.questionnaire.namePrefix,
                    "Email": selectedCandidate.questionnaire.email,
                    "Phone": selectedCandidate.questionnaire.phone,
                    "City/Country": selectedCandidate.questionnaire.cityCountry,
                    "Audit Types": (selectedCandidate.questionnaire.auditTypes || []).join(", "),
                    "Branch Expertise": (selectedCandidate.questionnaire.branchExpertise || []).join(", "),
                    "Audits Performed": selectedCandidate.questionnaire.auditsPerformed,
                    "Qualification": selectedCandidate.questionnaire.qualificationAuditing,
                    "Exam Date": selectedCandidate.questionnaire.qualificationExamDate,
                    "Exam Name": selectedCandidate.questionnaire.qualificationExamName,
                    "Languages": (selectedCandidate.questionnaire.languages || []).join(", "),
                    "On-site Rate": selectedCandidate.questionnaire.onsiteAuditRate,
                    "Remote Rate": selectedCandidate.questionnaire.remoteAuditRate,
                    "Locations": (selectedCandidate.questionnaire.onsiteLocations || []).join(", "),
                    "Memberships": (selectedCandidate.questionnaire.professionalMembership || []).join(", "),
                    "Consulting Interest": selectedCandidate.questionnaire.interestedConsulting,
                    "Consulting Services": selectedCandidate.questionnaire.consultingServices,
                    "Consulting Experience": selectedCandidate.questionnaire.consultingExperience,
                    "Consulting Rate": selectedCandidate.questionnaire.consultingRate,
                    "Training Interest": selectedCandidate.questionnaire.trainingInterest,
                    "Training Experience": selectedCandidate.questionnaire.trainingExperience,
                    "Training Rate": selectedCandidate.questionnaire.trainingRate,
                  }).map(([label, value]) => (
                    <div key={label} className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground min-w-[180px] flex-shrink-0">{label}</span>
                      <p className="font-medium text-foreground">{(value as string) || "—"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <QarpLogoFull />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} data-testid="button-home">
              <ArrowLeft className="w-4 h-4 mr-2" /> Portal Home
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-6 h-6" /> Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} registered
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[160px] bg-background" data-testid="select-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Candidates</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="secondary" onClick={handleExportCSV} data-testid="button-export">
                <FileDown className="w-4 h-4 mr-2" /> Export CSV
              </Button>
              <Button variant="secondary" onClick={loadCandidates} data-testid="button-refresh">
                Refresh
              </Button>
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <Card className="bg-card border-card-border">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No candidates found</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-card-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>CV</TableHead>
                      <TableHead>Questionnaire</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((c) => (
                      <TableRow
                        key={c.id}
                        className="border-border/30 cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedId(c.id)}
                        data-testid={`row-candidate-${c.id}`}
                      >
                        <TableCell className="font-medium">
                          {c.profile.fullName || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{c.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(c.registeredAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell><StatusBadge ok={c.profileCompleted} /></TableCell>
                        <TableCell><StatusBadge ok={!!c.cv} /></TableCell>
                        <TableCell><StatusBadge ok={c.questionnaireCompleted} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={c.completenessScore} className="h-1.5 w-16" />
                            <span className="text-xs font-medium text-primary">{c.completenessScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" data-testid={`button-view-${c.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t border-border/50 px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>QARP Admin Panel — Confidential</span>
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}
