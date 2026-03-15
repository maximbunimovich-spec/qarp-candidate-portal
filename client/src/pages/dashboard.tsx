import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { QarpLogoFull } from "@/components/QarpLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { User, Upload, ClipboardList, CheckCircle2, Circle, LogOut, FileText, GraduationCap, Bot, Sparkles, ExternalLink, Wand2 } from "lucide-react";

export default function DashboardPage() {
  const { candidate, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (!candidate) {
    setLocation("/");
    return null;
  }

  const steps = [
    {
      key: "profile",
      title: "Profile",
      desc: "Basic information — name, contact details, location",
      icon: User,
      completed: candidate.profileCompleted,
      href: "/profile",
    },
    {
      key: "cv",
      title: "CV Upload",
      desc: "Upload your CV in PDF or DOCX format",
      icon: Upload,
      completed: !!candidate.cv,
      href: "/cv-upload",
    },
    {
      key: "questionnaire",
      title: "Questionnaire",
      desc: "33-question personnel selection survey (9 pages)",
      icon: ClipboardList,
      completed: candidate.questionnaireCompleted,
      href: "/questionnaire",
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const allComplete = completedSteps === steps.length;
  const canGenerateCV = candidate.profileCompleted && candidate.questionnaireCompleted;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <QarpLogoFull />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-user-email">
              {candidate.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation("/"); }} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome */}
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground" data-testid="text-welcome">
              {candidate.profile.fullName
                ? `Welcome, ${candidate.profile.namePrefix ? candidate.profile.namePrefix + ' ' : ''}${candidate.profile.fullName}`
                : "Welcome to your candidate portal"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete all three steps to finalize your application.
            </p>
          </div>

          {/* Completeness bar */}
          <Card className="bg-card border-card-border">
            <CardContent className="py-5 px-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Application Progress</span>
                <span className="text-sm font-semibold text-primary" data-testid="text-completeness">
                  {candidate.completenessScore}%
                </span>
              </div>
              <Progress value={candidate.completenessScore} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {completedSteps} of {steps.length} steps completed
              </p>
            </CardContent>
          </Card>

          {/* Steps */}
          <div className="grid gap-4">
            {steps.map((step, i) => (
              <Card
                key={step.key}
                className={`bg-card border-card-border cursor-pointer transition-colors hover:border-primary/30 ${step.completed ? 'border-primary/20' : ''}`}
                onClick={() => setLocation(step.href)}
                data-testid={`card-step-${step.key}`}
              >
                <CardContent className="py-5 px-6 flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${step.completed ? 'bg-primary/15' : 'bg-muted'}`}>
                    {step.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    ) : (
                      <step.icon className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Step {i + 1}
                      </span>
                      {step.completed && (
                        <span className="text-xs text-primary font-medium">Completed</span>
                      )}
                    </div>
                    <h3 className="font-display text-base font-semibold text-foreground mt-0.5">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                  <Button variant="secondary" size="sm" data-testid={`button-${step.key}`}>
                    {step.completed ? "Review" : "Start"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI QARP CV Generation card */}
          {!!candidate.cv && candidate.profileCompleted && (
            <Card className="bg-card border-primary/30">
              <CardContent className="py-5 px-6 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-foreground">AI-Powered QARP CV</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">AI</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Generate a standardized QARP CV using AI, then review and submit to our expert database.
                  </p>
                </div>
                <Button onClick={() => setLocation("/generated-cv")} data-testid="button-generate-ai-cv">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate CV
                </Button>
              </CardContent>
            </Card>
          )}

          {allComplete && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="font-display text-lg font-bold text-foreground">Application Complete!</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Thank you for submitting your application. Our team will review your information.
              </p>
            </div>
          )}

          {/* Promo: Academy + AI GxP Pro */}
          <div className="pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
              Available for QARP auditors
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href="https://theqarpacademy.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
                data-testid="link-dashboard-academy"
              >
                <Card className="bg-card border-card-border h-full transition-all hover:border-primary/40">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-3 mb-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        The QARP Academy
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      50+ GxP courses, ICH GCP E6(R3) certification, GCP Auditor School. AI-powered training platform.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["ICH GCP E6(R3)", "Auditor School", "CPD Points"].map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{t}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </a>

              <a
                href="https://theqarpacademy.pro/ai"
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
                data-testid="link-dashboard-ai-gxp"
              >
                <Card className="bg-card border-card-border h-full transition-all hover:border-emerald-500/40">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-3 mb-2">
                      <Bot className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        AI GxP Pro
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Upload your SOPs and get an AI that knows your quality system. Five compliance modules from €29/month.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["SOP Q&A", "Training Gen", "Reg. Monitor"].map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">{t}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-4 mt-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>QARP-Q-SUR-02-01-01, ver 1.0</span>
        </div>
      </footer>
    </div>
  );
}
