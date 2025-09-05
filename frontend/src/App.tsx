import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import UserDashboard from "./pages/UserDashboard";
import CreatorDashboard from "./pages/CreatorDashboard";
import SubscriptionPage from "./pages/SubscriptionPage";
import SubscriptionTest from "./pages/SubscriptionTest";
import NotFound from "./pages/NotFound";
import { StarknetProvider } from "./components/StarkProvider";
import { SubraProvider } from "./providers/SubraProvider";

const App = () => (
  <StarknetProvider>
    <SubraProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner richColors />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/creator" element={<CreatorDashboard />} />
              <Route path="/subscribe/:planId" element={<SubscriptionPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </SubraProvider>
  </StarknetProvider>
);

export default App;
