import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 bg-card border-card-border">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold text-foreground">Page Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
          <Button className="mt-6" onClick={() => setLocation("/")}>
            Go to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
