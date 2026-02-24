import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy-loaded pages — each becomes its own chunk
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Finance = lazy(() => import("./pages/Finance"));
const AiInsights = lazy(() => import("./pages/AiInsights"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Alerts = lazy(() => import("./pages/Alerts"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AutomationPage = lazy(() => import("./pages/AutomationPage"));
const FixedCosts = lazy(() => import("./pages/FixedCosts"));
const CustomAlerts = lazy(() => import("./pages/CustomAlerts"));
const COGS = lazy(() => import("./pages/COGS"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <PageLoader />;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <PageLoader />;
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary fallbackTitle="Σφάλμα εφαρμογής" fallbackDescription="Η εφαρμογή αντιμετώπισε ένα σοβαρό σφάλμα. Παρακαλώ ανανεώστε τη σελίδα.">
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/" element={<ProtectedRoute><ErrorBoundary><Index /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><ErrorBoundary><Invoices /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/invoices/:id" element={<ProtectedRoute><ErrorBoundary><InvoiceDetail /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/finance" element={<ProtectedRoute><ErrorBoundary><Finance /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/ai-insights" element={<ProtectedRoute><ErrorBoundary><AiInsights /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><ErrorBoundary><Analytics /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/alerts" element={<ProtectedRoute><ErrorBoundary><Alerts /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><ErrorBoundary><NotificationsPage /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><ErrorBoundary><SettingsPage /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/automation" element={<ProtectedRoute><ErrorBoundary><AutomationPage /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/fixed-costs" element={<ProtectedRoute><ErrorBoundary><FixedCosts /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/alert-rules" element={<ProtectedRoute><ErrorBoundary><CustomAlerts /></ErrorBoundary></ProtectedRoute>} />
                <Route path="/cogs" element={<ProtectedRoute><ErrorBoundary><COGS /></ErrorBoundary></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
