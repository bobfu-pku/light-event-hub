import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import MyEvents from "./pages/MyEvents";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <Layout>
                  <Index />
                </Layout>
              } 
            />
            <Route 
              path="/events" 
              element={
                <Layout>
                  <Events />
                </Layout>
              } 
            />
            <Route 
              path="/events/create" 
              element={
                <Layout>
                  <CreateEvent />
                </Layout>
              } 
            />
            <Route 
              path="/events/:id" 
              element={
                <Layout>
                  <EventDetail />
                </Layout>
              } 
            />
            <Route 
              path="/my-events" 
              element={
                <Layout>
                  <MyEvents />
                </Layout>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <Layout>
                  <Profile />
                </Layout>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route 
              path="*" 
              element={
                <Layout>
                  <NotFound />
                </Layout>
              } 
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
