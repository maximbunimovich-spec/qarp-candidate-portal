import { useState } from "react";
import { useLocation } from "wouter";
import { QarpLogoFull } from "@/components/QarpLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { Shield, ClipboardList, Upload, FileText, GraduationCap, Bot, Sparkles, ExternalLink, Lock, Mail, Eye, EyeOff } from "lucide-react";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!resetEmail || !resetEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/candidates/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Please enter a password");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        await register(email, password);
      } else {
        await login(email, password);
      }
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <QarpLogoFull />
          <a
            href="https://theqarp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
            data-testid="link-main-site"
          >
            theqarp.com
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Info */}
          <div className="space-y-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-3">
                Candidate Portal
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-md">
                Welcome to The QARP application process. Complete your profile, upload your CV, and fill out our personnel selection questionnaire to join our network of quality assurance professionals.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Shield, title: "Create Your Profile", desc: "Personal and professional details" },
                { icon: Upload, title: "Upload Your CV", desc: "PDF or DOCX format accepted" },
                { icon: ClipboardList, title: "Complete Questionnaire", desc: "33-question personnel selection survey" },
                { icon: FileText, title: "Get Your QARP CV", desc: "Auto-generated standardized CV" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Auth Card */}
          <Card className="bg-card border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-xl">
                {resetMode ? "Reset Password" : mode === "register" ? "Create Account" : "Welcome Back"}
              </CardTitle>
              <CardDescription>
                {resetMode
                  ? "Enter your email and we'll send you a temporary password."
                  : mode === "register"
                  ? "Register with your email and a password to start your application."
                  : "Sign in with your email and password to continue your application."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetMode ? (
                resetSent ? (
                  <div className="space-y-4 text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">Check your email</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        If an account exists for <span className="font-medium text-foreground">{resetEmail}</span>, we've sent a temporary password.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => { setResetMode(false); setResetSent(false); setResetEmail(""); setMode("login"); setError(""); }}
                      data-testid="button-back-to-login"
                    >
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="bg-background border-border pl-10"
                        data-testid="input-reset-email"
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-destructive" data-testid="text-error">{error}</p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={resetLoading}
                      data-testid="button-reset-submit"
                    >
                      {resetLoading ? "Sending..." : "Send Temporary Password"}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => { setResetMode(false); setError(""); }}
                        className="text-sm text-primary hover:underline"
                        data-testid="button-cancel-reset"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-border pl-10"
                      data-testid="input-email"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={mode === "register" ? "Create a password (min. 6 chars)" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background border-border pl-10 pr-10"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === "login" && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => { setResetMode(true); setResetEmail(email); setError(""); }}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        data-testid="button-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                  {error && (
                    <p className="text-sm text-destructive" data-testid="text-error">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                    data-testid="button-submit"
                  >
                    {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Sign In"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}
                      className="text-sm text-primary hover:underline"
                      data-testid="button-toggle-mode"
                    >
                      {mode === "register"
                        ? "Already have an account? Sign in"
                        : "Don't have an account? Register"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    By continuing, you agree to The QARP{" "}
                    <a
                      href="https://theqarpacademy.pro/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Promo Section */}
      <section className="px-4 py-12 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-xl font-bold text-foreground text-center mb-2">
            Join The QARP Network — Get More Than Just Audits
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
            Every auditor in our network gets access to The QARP Academy training platform and AI GxP Pro — our enterprise AI compliance assistant.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Academy Card */}
            <a
              href="https://theqarpacademy.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
              data-testid="link-academy-promo"
            >
              <Card className="bg-card border-card-border h-full transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                        The QARP Academy
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </h3>
                      <p className="text-xs text-primary">theqarpacademy.pro</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Our AI-powered training platform for clinical research professionals. 50+ GxP courses including ICH GCP E6(R3) certification, GCP Auditor School, and protocol-specific programmes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["ICH GCP E6(R3)", "GCP Auditor School", "CPD Certificates", "AI Study Companion"].map(tag => (
                      <span key={tag} className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium">{tag}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </a>

            {/* AI GxP Pro Card */}
            <a
              href="https://theqarpacademy.pro/ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
              data-testid="link-ai-gxp-promo"
            >
              <Card className="bg-card border-card-border h-full transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                        AI GxP Pro
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      </h3>
                      <p className="text-xs text-emerald-400">theqarpacademy.pro/ai</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Upload your SOPs and get an AI that knows your quality system. Five modules purpose-built for GxP teams — available to every auditor in The QARP network.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["SOP Q&A", "Training Generator", "Regulatory Monitor", "SOP Writer", "Onboarding"].map(tag => (
                      <span key={tag} className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-medium">{tag}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </a>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            From €29/month · Available 24/7 · Trusted by pharmaceutical & biotech professionals worldwide
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} The QARP — Quality Assurance Research Professionals</span>
        </div>
      </footer>
    </div>
  );
}
