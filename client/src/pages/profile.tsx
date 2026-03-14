import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { QarpLogoFull } from "@/components/QarpLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { candidate, refreshCandidate } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    namePrefix: "",
    email: "",
    phone: "",
    cityCountry: "",
  });

  useEffect(() => {
    if (candidate?.profile) {
      setForm({
        fullName: candidate.profile.fullName || "",
        namePrefix: candidate.profile.namePrefix || "",
        email: candidate.profile.email || candidate.email || "",
        phone: candidate.profile.phone || "",
        cityCountry: candidate.profile.cityCountry || "",
      });
    }
  }, [candidate]);

  if (!candidate) { setLocation("/"); return null; }

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      toast({ title: "Validation Error", description: "Full name is required", variant: "destructive" });
      return;
    }
    if (!form.email.trim()) {
      toast({ title: "Validation Error", description: "Email is required", variant: "destructive" });
      return;
    }
    if (!form.phone.trim()) {
      toast({ title: "Validation Error", description: "Phone number is required", variant: "destructive" });
      return;
    }
    if (!form.cityCountry.trim()) {
      toast({ title: "Validation Error", description: "City and country is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/candidates/${candidate.id}/profile`, form);
      await refreshCandidate();
      toast({ title: "Profile saved", description: "Your profile has been updated successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <QarpLogoFull />
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="font-display text-xl">Your Profile</CardTitle>
              <CardDescription>Basic personal and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={form.fullName}
                  onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                  placeholder="John Doe"
                  className="bg-background"
                  data-testid="input-fullname"
                />
              </div>

              <div className="space-y-2">
                <Label>Name Prefix</Label>
                <RadioGroup
                  value={form.namePrefix}
                  onValueChange={v => setForm(p => ({ ...p, namePrefix: v }))}
                  className="flex flex-wrap gap-4"
                  data-testid="radio-prefix"
                >
                  {["Dr.", "Prof.", "Mr.", "Mrs.", "Ms."].map(prefix => (
                    <div key={prefix} className="flex items-center gap-2">
                      <RadioGroupItem value={prefix} id={`prefix-${prefix}`} />
                      <Label htmlFor={`prefix-${prefix}`} className="cursor-pointer text-sm">{prefix}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="bg-background"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                  className="bg-background"
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-2">
                <Label>City and Country of Residence *</Label>
                <Input
                  value={form.cityCountry}
                  onChange={e => setForm(p => ({ ...p, cityCountry: e.target.value }))}
                  placeholder="Amsterdam, Netherlands"
                  className="bg-background"
                  data-testid="input-city-country"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving} data-testid="button-save">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
                <Button variant="secondary" onClick={() => setLocation("/dashboard")} data-testid="button-cancel">
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
