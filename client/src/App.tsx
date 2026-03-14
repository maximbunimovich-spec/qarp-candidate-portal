import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import CVUploadPage from "@/pages/cv-upload";
import QuestionnairePage from "@/pages/questionnaire";
import GeneratedCVPage from "@/pages/generated-cv";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/cv-upload" component={CVUploadPage} />
      <Route path="/questionnaire" component={QuestionnairePage} />
      <Route path="/generated-cv" component={GeneratedCVPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <AppRoutes />
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
