import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projets from "./pages/Projets";
import ProjetForm from "./pages/ProjetForm";
import ProjetDetail from "./pages/ProjetDetail";
import Paiements from "./pages/Paiements";
import PaiementForm from "./pages/PaiementForm";
import PaiementDetail from "./pages/PaiementDetail";
import Comptabilite from "./pages/Comptabilite";
import Parametres from "./pages/Parametres";
import SignaturePage from "./pages/SignaturePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/signer/:token" element={<SignaturePage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/projets" element={<ProtectedRoute><Projets /></ProtectedRoute>} />
            <Route path="/projets/nouveau" element={<ProtectedRoute><ProjetForm /></ProtectedRoute>} />
            <Route path="/projets/:id" element={<ProtectedRoute><ProjetDetail /></ProtectedRoute>} />
            <Route path="/projets/:id/modifier" element={<ProtectedRoute><ProjetForm /></ProtectedRoute>} />
            <Route path="/paiements" element={<ProtectedRoute><Paiements /></ProtectedRoute>} />
            <Route path="/paiements/nouveau" element={<ProtectedRoute><PaiementForm /></ProtectedRoute>} />
            <Route path="/paiements/:id" element={<ProtectedRoute><PaiementDetail /></ProtectedRoute>} />
            <Route path="/paiements/:id/modifier" element={<ProtectedRoute><PaiementForm /></ProtectedRoute>} />
            <Route path="/comptabilite" element={<ProtectedRoute><Comptabilite /></ProtectedRoute>} />
            <Route path="/parametres" element={<ProtectedRoute><Parametres /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
