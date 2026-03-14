import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { QarpLogoFull } from "@/components/QarpLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QuestionnaireData } from "@shared/schema";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const TOTAL_PAGES = 9;

// Checkbox group helper
function CheckboxGroup({
  options,
  selected,
  onChange,
  testId,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  testId: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid={testId}>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
          <Checkbox
            checked={selected.includes(opt)}
            onCheckedChange={(checked) => {
              if (checked) onChange([...selected, opt]);
              else onChange(selected.filter((s) => s !== opt));
            }}
          />
          <span className="text-sm text-foreground">{opt}</span>
        </label>
      ))}
    </div>
  );
}

// Radio group helper
function RadioField({
  options,
  value,
  onChange,
  testId,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  testId: string;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-2" data-testid={testId}>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
          <RadioGroupItem value={opt} />
          <span className="text-sm text-foreground">{opt}</span>
        </label>
      ))}
    </RadioGroup>
  );
}

export default function QuestionnairePage() {
  const { candidate, refreshCandidate } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<QuestionnaireData>({});

  useEffect(() => {
    if (candidate?.questionnaire) {
      setData(candidate.questionnaire);
      if (candidate.questionnaire.currentPage) {
        setPage(candidate.questionnaire.currentPage);
      }
    }
  }, [candidate]);

  if (!candidate) { setLocation("/"); return null; }

  const update = (field: keyof QuestionnaireData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const autoSave = useCallback(async (d: QuestionnaireData, p: number) => {
    try {
      await apiRequest("PATCH", `/api/candidates/${candidate.id}/questionnaire`, {
        ...d,
        currentPage: p,
      });
      await refreshCandidate();
    } catch {}
  }, [candidate.id, refreshCandidate]);

  const validatePage = (): string | null => {
    switch (page) {
      case 1:
        if (!data.privacyConsent) return "You must agree to the Privacy Policy";
        if (!data.fullName?.trim()) return "Full name is required";
        if (!data.email?.trim()) return "Email is required";
        if (!data.phone?.trim()) return "Phone number is required";
        if (!data.cityCountry?.trim()) return "City and country is required";
        return null;
      case 2:
        if (!data.auditTypes?.length) return "Select at least one audit type";
        if (!data.branchExpertise?.length) return "Select at least one branch of expertise";
        if (!data.auditsPerformed) return "Select the number of audits performed";
        if (!data.qualificationAuditing) return "Indicate your qualification status";
        return null;
      case 3:
        return null; // optional page
      case 4:
        if (!data.languages?.length) return "Select at least one language";
        if (!data.onsiteAuditRate) return "Select your on-site audit rate";
        if (!data.remoteAuditRate) return "Select your remote audit rate";
        if (!data.onsiteLocations?.length) return "Select at least one on-site location";
        return null;
      case 5:
        if (!data.interestedConsulting) return "Please indicate your consulting interest";
        return null;
      case 6:
        return null; // optional page
      case 7:
        if (!data.trainingInterest) return "Please indicate your training interest";
        return null;
      case 8:
        return null; // optional page
      case 9:
        return null;
      default:
        return null;
    }
  };

  const goNext = async () => {
    const err = validatePage();
    if (err) {
      toast({ title: "Required Fields", description: err, variant: "destructive" });
      return;
    }
    if (page < TOTAL_PAGES) {
      const nextPage = page + 1;
      setPage(nextPage);
      await autoSave(data, nextPage);
    }
  };

  const goPrev = () => {
    if (page > 1) {
      setPage(page - 1);
      autoSave(data, page - 1);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/candidates/${candidate.id}/questionnaire`, {
        ...data,
        completed: true,
        currentPage: TOTAL_PAGES,
      });
      await refreshCandidate();
      toast({ title: "Questionnaire submitted!", description: "Thank you for completing the questionnaire." });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderPage = () => {
    switch (page) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <CardTitle className="font-display text-lg mb-1">Personal Information</CardTitle>
              <CardDescription>Please provide your basic contact details</CardDescription>
            </div>
            {/* Privacy Policy Consent */}
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background cursor-pointer">
                <Checkbox
                  checked={!!data.privacyConsent}
                  onCheckedChange={(v) => update("privacyConsent", !!v)}
                  className="mt-0.5"
                  data-testid="checkbox-privacy"
                />
                <div className="text-sm">
                  <span className="text-foreground font-medium">I agree to The QARP Privacy Policy *</span>
                  <p className="text-muted-foreground text-xs mt-1">
                    Please click{" "}
                    <a href="https://theqarp.com/privacy_policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      this link
                    </a>{" "}
                    to see The QARP Privacy Policy, so that you know how we will operate with your data and protect them.
                  </p>
                </div>
              </label>
            </div>
            {/* Full Name */}
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input value={data.fullName || ""} onChange={(e) => update("fullName", e.target.value)}
                placeholder="Please indicate your full name" className="bg-background" data-testid="input-fullname" />
            </div>
            {/* Name prefix */}
            <div className="space-y-2">
              <Label>Name prefix</Label>
              <p className="text-xs text-muted-foreground">Please choose the preferred one</p>
              <RadioField options={["Dr.", "Prof.", "Mr.", "Mrs.", "Ms."]} value={data.namePrefix || ""}
                onChange={(v) => update("namePrefix", v)} testId="radio-prefix" />
            </div>
            {/* Email */}
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={data.email || ""} onChange={(e) => update("email", e.target.value)}
                placeholder="your@email.com" className="bg-background" data-testid="input-email" />
            </div>
            {/* Phone */}
            <div className="space-y-2">
              <Label>Phone number *</Label>
              <Input value={data.phone || ""} onChange={(e) => update("phone", e.target.value)}
                placeholder="+1 234 567 8900" className="bg-background" data-testid="input-phone" />
            </div>
            {/* City & Country */}
            <div className="space-y-2">
              <Label>City and country of residence *</Label>
              <Input value={data.cityCountry || ""} onChange={(e) => update("cityCountry", e.target.value)}
                placeholder="Amsterdam, Netherlands" className="bg-background" data-testid="input-city" />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <CardTitle className="font-display text-lg mb-1">Details of Audits Experience</CardTitle>
              <CardDescription>Tell us about your auditing background</CardDescription>
            </div>
            {/* Audit Types */}
            <div className="space-y-2">
              <Label>Audits & Inspections type experience *</Label>
              <p className="text-xs text-muted-foreground">Please select all the types of audits you have ever conducted</p>
              <CheckboxGroup
                options={[
                  "GCP QMS", "GCP early phases", "GCP late phases", "GCP BE studies",
                  "GCP EDC", "GCP ISA", "GCP Lab", "GCP TMF/eTMF", "GCP CSV",
                  "GCP CRO", "GCP other vendors", "GDP", "GMP", "GPVP", "GLP",
                  "FDA inspections", "EMA inspections", "Other regulatory inspections",
                  "Mock inspections",
                ]}
                selected={data.auditTypes || []}
                onChange={(v) => update("auditTypes", v)}
                testId="checkbox-audit-types"
              />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  checked={(data.auditTypes || []).includes("Other")}
                  onCheckedChange={(checked) => {
                    const current = data.auditTypes || [];
                    if (checked) update("auditTypes", [...current, "Other"]);
                    else update("auditTypes", current.filter(s => s !== "Other"));
                  }}
                />
                <span className="text-sm text-foreground">Other:</span>
                <Input
                  value={data.auditTypesOther || ""}
                  onChange={(e) => update("auditTypesOther", e.target.value)}
                  placeholder="Specify other"
                  className="bg-background max-w-xs h-8 text-sm"
                  data-testid="input-audit-other"
                />
              </div>
            </div>
            {/* Branch of expertise */}
            <div className="space-y-2">
              <Label>Branch of expertise *</Label>
              <p className="text-xs text-muted-foreground">Please select your audits expertise branch</p>
              <CheckboxGroup
                options={["Medicines", "Medical devices (in vitro)", "Medical devices (non in vitro)", "IT systems"]}
                selected={data.branchExpertise || []}
                onChange={(v) => update("branchExpertise", v)}
                testId="checkbox-branch"
              />
            </div>
            {/* Number of audits */}
            <div className="space-y-2">
              <Label>General number of audits performed *</Label>
              <p className="text-xs text-muted-foreground">Please select a range</p>
              <RadioField
                options={["0-10", "11-50", "51-100", "more than 100"]}
                value={data.auditsPerformed || ""}
                onChange={(v) => update("auditsPerformed", v)}
                testId="radio-audits-count"
              />
            </div>
            {/* Qualification */}
            <div className="space-y-2">
              <Label>Qualification in the field of auditing *</Label>
              <p className="text-xs text-muted-foreground">Please indicate, if you are a certified auditor</p>
              <RadioField
                options={["Yes", "No"]}
                value={data.qualificationAuditing || ""}
                onChange={(v) => update("qualificationAuditing", v)}
                testId="radio-qualification"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <CardTitle className="font-display text-lg mb-1">Qualification Details</CardTitle>
              <CardDescription>Qualification exam details (optional)</CardDescription>
            </div>
            <div className="space-y-2">
              <Label>Qualification exam date</Label>
              <Input
                type="date"
                value={data.qualificationExamDate || ""}
                onChange={(e) => update("qualificationExamDate", e.target.value)}
                className="bg-background max-w-xs"
                data-testid="input-exam-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Qualification exam name</Label>
              <Input
                value={data.qualificationExamName || ""}
                onChange={(e) => update("qualificationExamName", e.target.value)}
                placeholder="Name of the qualification exam"
                className="bg-background"
                data-testid="input-exam-name"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <CardTitle className="font-display text-lg mb-1">Audits Potential</CardTitle>
              <CardDescription>Languages, rates, and availability</CardDescription>
            </div>
            {/* Languages */}
            <div className="space-y-2">
              <Label>Languages fluency *</Label>
              <p className="text-xs text-muted-foreground">Please select all the languages you know well enough to be able to use during an audit</p>
              <CheckboxGroup
                options={[
                  "Arabic", "Bengali", "Bulgarian", "Czech", "Chinese (Mandarin)",
                  "Croatian", "Dutch", "English", "Estonian", "Finnish", "French",
                  "German", "Hebrew", "Hindi", "Indonesian", "Italian", "Japanese",
                  "Latvian", "Lithuanian", "Polish", "Portuguese", "Romanian",
                  "Russian", "Serbian", "Spanish", "Swedish", "Turkish", "Ukrainian",
                ]}
                selected={data.languages || []}
                onChange={(v) => update("languages", v)}
                testId="checkbox-languages"
              />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  checked={(data.languages || []).includes("Other")}
                  onCheckedChange={(checked) => {
                    const current = data.languages || [];
                    if (checked) update("languages", [...current, "Other"]);
                    else update("languages", current.filter(s => s !== "Other"));
                  }}
                />
                <span className="text-sm text-foreground">Other:</span>
                <Input
                  value={data.languagesOther || ""}
                  onChange={(e) => update("languagesOther", e.target.value)}
                  placeholder="Specify other"
                  className="bg-background max-w-xs h-8 text-sm"
                  data-testid="input-lang-other"
                />
              </div>
            </div>
            {/* On-site rate */}
            <div className="space-y-2">
              <Label>Your regular on-site audit rate *</Label>
              <p className="text-xs text-muted-foreground">Please select a range</p>
              <RadioField
                options={[
                  "0-90 EUR per hour", "91-150 EUR per hour",
                  "151-190 EUR per hour", "more than 190 EUR per hour",
                  "not interested in on-site audits",
                ]}
                value={data.onsiteAuditRate || ""}
                onChange={(v) => update("onsiteAuditRate", v)}
                testId="radio-onsite-rate"
              />
            </div>
            {/* Remote rate */}
            <div className="space-y-2">
              <Label>Your regular remote audit rate *</Label>
              <p className="text-xs text-muted-foreground">Please select a range</p>
              <RadioField
                options={[
                  "0-90 EUR per hour", "91-150 EUR per hour",
                  "151-190 EUR per hour", "more then 190 per hour",
                  "not interested in remote audits",
                ]}
                value={data.remoteAuditRate || ""}
                onChange={(v) => update("remoteAuditRate", v)}
                testId="radio-remote-rate"
              />
            </div>
            {/* On-site locations */}
            <div className="space-y-2">
              <Label>Possible on-site audits location *</Label>
              <p className="text-xs text-muted-foreground">Please select regions where you are ready and have the right to visit facilities for regular audits</p>
              <CheckboxGroup
                options={[
                  "1 - North America", "2 - Latin America", "3 - Europe",
                  "4 - Russia and CIS", "5 - Sub-Saharan Africa",
                  "6 - North Africa and Southwest Asia", "7 - East Asia",
                  "8 - South Asia", "9 - Southeast Asia", "10 - Australia and Oceania",
                ]}
                selected={data.onsiteLocations || []}
                onChange={(v) => update("onsiteLocations", v)}
                testId="checkbox-locations"
              />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  checked={(data.onsiteLocations || []).includes("Other")}
                  onCheckedChange={(checked) => {
                    const current = data.onsiteLocations || [];
                    if (checked) update("onsiteLocations", [...current, "Other"]);
                    else update("onsiteLocations", current.filter(s => s !== "Other"));
                  }}
                />
                <span className="text-sm text-foreground">Other:</span>
                <Input
                  value={data.onsiteLocationsOther || ""}
                  onChange={(e) => update("onsiteLocationsOther", e.target.value)}
                  placeholder="Specify other"
                  className="bg-background max-w-xs h-8 text-sm"
                  data-testid="input-location-other"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <CardTitle className="font-display text-lg mb-1">Additional Details</CardTitle>
              <CardDescription>And few more details... We have almost finished!</CardDescription>
            </div>
            {/* Professional membership */}
            <div className="space-y-2">
              <Label>Professional membership</Label>
              <CheckboxGroup
                options={[
                  "ACRP", "CCRA", "CQA", "FPIPA", "ISPE", "MCC", "MSQA",
                  "RAC", "RFS", "RQA", "RQAP", "SOCRA", "SQA",
                ]}
                selected={data.professionalMembership || []}
                onChange={(v) => update("professionalMembership", v)}
                testId="checkbox-membership"
              />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  checked={(data.professionalMembership || []).includes("Other")}
                  onCheckedChange={(checked) => {
                    const current = data.professionalMembership || [];
                    if (checked) update("professionalMembership", [...current, "Other"]);
                    else update("professionalMembership", current.filter(s => s !== "Other"));
                  }}
                />
                <span className="text-sm text-foreground">Other:</span>
                <Input
                  value={data.professionalMembershipOther || ""}
                  onChange={(e) => update("professionalMembershipOther", e.target.value)}
                  placeholder="Specify other"
                  className="bg-background max-w-xs h-8 text-sm"
                  data-testid="input-membership-other"
                />
              </div>
            </div>
            {/* Consulting interest */}
            <div className="space-y-2">
              <Label>Are you interested in providing consulting services? *</Label>
              <Select value={data.interestedConsulting || ""} onValueChange={(v) => update("interestedConsulting", v)}>
                <SelectTrigger className="bg-background max-w-xs" data-testid="select-consulting">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <CardTitle className="font-display text-lg mb-1">Experience in Consulting Activities</CardTitle>
              <CardDescription>Tell us about your consulting background</CardDescription>
            </div>
            <div className="space-y-2">
              <Label>What consulting services are you interested in providing?</Label>
              <Textarea
                value={data.consultingServices || ""}
                onChange={(e) => update("consultingServices", e.target.value)}
                placeholder="Describe your consulting services..."
                className="bg-background min-h-[100px]"
                data-testid="textarea-consulting-services"
              />
            </div>
            <div className="space-y-2">
              <Label>How long experience in providing consulting services do you have?</Label>
              <Textarea
                value={data.consultingExperience || ""}
                onChange={(e) => update("consultingExperience", e.target.value)}
                placeholder="Describe your experience..."
                className="bg-background min-h-[100px]"
                data-testid="textarea-consulting-experience"
              />
            </div>
            <div className="space-y-2">
              <Label>Your consulting rate</Label>
              <p className="text-xs text-muted-foreground">Please select a range</p>
              <RadioField
                options={[
                  "0-90 EUR per hour", "91-150 EUR per hour", "151-190 EUR per hour",
                  "191-250 EUR per hour", "251-290 EUR per hour", "more then 290 per hour",
                  "not interested in consulting",
                ]}
                value={data.consultingRate || ""}
                onChange={(v) => update("consultingRate", v)}
                testId="radio-consulting-rate"
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <CardTitle className="font-display text-lg mb-1">Experience in Training Activities</CardTitle>
              <CardDescription>Share your interest in training activities</CardDescription>
            </div>
            <div className="space-y-2">
              <Label>Would you like to share your expertise in training activities via the QARP interactive platform? *</Label>
              <RadioField
                options={["Yes, of course", "No, never", "Not now, maybe in future..."]}
                value={data.trainingInterest || ""}
                onChange={(v) => update("trainingInterest", v)}
                testId="radio-training-interest"
              />
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <CardTitle className="font-display text-lg mb-1">Experience in Training Activities</CardTitle>
              <CardDescription>Your training experience details</CardDescription>
            </div>
            <div className="space-y-2">
              <Label>What experience in training activities do you possess?</Label>
              <RadioField
                options={["Regular lecturer", "Occasional lecturer", "Starting lecturer"]}
                value={data.trainingExperience || ""}
                onChange={(v) => update("trainingExperience", v)}
                testId="radio-training-experience"
              />
            </div>
            <div className="space-y-2">
              <Label>Your training rate</Label>
              <p className="text-xs text-muted-foreground">Please select a range</p>
              <RadioField
                options={[
                  "0-90 EUR per hour", "91-150 EUR per hour", "151-190 EUR per hour",
                  "191-250 EUR per hour", "251-290 EUR per hour", "more then 290 per hour",
                  "not interested in training",
                ]}
                value={data.trainingRate || ""}
                onChange={(v) => update("trainingRate", v)}
                testId="radio-training-rate"
              />
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6 text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <div>
              <CardTitle className="font-display text-xl mb-2">Thank you for your patience and personal details!</CardTitle>
              <CardDescription className="text-base">
                Your questionnaire responses have been recorded.
              </CardDescription>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-border max-w-md mx-auto text-left">
              <p className="text-sm font-medium text-foreground mb-1">The QARP</p>
              <p className="text-xs text-muted-foreground">Quality Assurance Research Professionals</p>
              <p className="text-xs text-muted-foreground mt-2">Confidential. All rights reserved.</p>
              <div className="border-t border-border mt-3 pt-3">
                <p className="text-xs text-muted-foreground font-mono">QARP-Q-SUR-02-01-01, ver 1.0</p>
                <p className="text-xs text-muted-foreground">Survey "The QARP Personnel Selection Questionnaire", version 1.0</p>
                <p className="text-xs text-muted-foreground">Effective date: 16-Jan-2025</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <QarpLogoFull />
          <Button variant="ghost" size="sm" onClick={() => { autoSave(data, page); setLocation("/dashboard"); }} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Save & Exit
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="border-b border-border/30 px-6 py-3 bg-card/50">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Page {page} of {TOTAL_PAGES}
            </span>
            <span className="text-xs text-primary font-semibold">
              {Math.round((page / TOTAL_PAGES) * 100)}%
            </span>
          </div>
          <Progress value={(page / TOTAL_PAGES) * 100} className="h-1.5" />
          <div className="flex gap-1 mt-2">
            {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i + 1 <= page ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-card border-card-border">
            <CardContent className="pt-6 pb-4 px-6">
              {renderPage()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="secondary"
              onClick={goPrev}
              disabled={page === 1}
              data-testid="button-prev"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Previous
            </Button>

            <span className="text-xs text-muted-foreground">
              Page {page} of {TOTAL_PAGES}
            </span>

            {page < TOTAL_PAGES ? (
              <Button onClick={goNext} data-testid="button-next">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving} data-testid="button-submit">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {saving ? "Submitting..." : "Submit Questionnaire"}
              </Button>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 px-6 py-4 mt-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>QARP-Q-SUR-02-01-01, ver 1.0</span>
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}
