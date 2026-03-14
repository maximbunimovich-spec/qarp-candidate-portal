import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { QarpLogoFull } from "@/components/QarpLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Upload, FileText, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export default function CVUploadPage() {
  const { candidate, refreshCandidate } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!candidate) { setLocation("/"); return null; }

  const handleFile = async (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a PDF or DOCX file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cv', file);
      const res = await fetch(`${API_BASE}/api/candidates/${candidate.id}/cv`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      await refreshCandidate();
      toast({ title: "CV uploaded", description: `${file.name} has been uploaded successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
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
              <CardTitle className="font-display text-xl">Upload Your CV</CardTitle>
              <CardDescription>Upload your curriculum vitae in PDF or DOCX format (max 10MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current CV info */}
              {candidate.cv && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground" data-testid="text-cv-name">{candidate.cv.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(candidate.cv.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Drop zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
                data-testid="dropzone-cv"
              >
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {uploading ? "Uploading..." : "Drop your CV here or click to browse"}
                </p>
                <p className="text-xs text-muted-foreground">PDF or DOCX, max 10MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                  data-testid="input-cv-file"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setLocation("/dashboard")} data-testid="button-back-bottom">
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
