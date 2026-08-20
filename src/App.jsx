import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastProvider, useToast } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SecurityProvider } from "./context/SecurityContext";
import { CommandProvider } from "./context/CommandContext";
import { useInit } from "./hooks/useInit";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Invoices from "./pages/Invoices";
import Slots from "./pages/Slots";
import Leads from "./pages/Leads";
import Waitlist from "./pages/Waitlist";
import Chats from "./pages/Chats";
import AuditLog from "./pages/AuditLog";
import Analytics from "./pages/Analytics";
import CashLedger from "./pages/CashLedger";
import Security from "./pages/Security";
import Settings from "./pages/Settings";
import OwnerBot from "./components/OwnerBot";
import PublicBooking from "./pages/PublicBooking";
import PublicVerify from "./pages/PublicVerify";
import ClientDemo from "./pages/ClientDemo";
import CaseStudy from "./pages/CaseStudy";
import DesignSystemTest from "./pages/DesignSystemTest";
import PartsScan from "./pages/PartsScan";
import { canAccessPath, loadSession } from "./constants/permissions";

function PrivateRoute({ children }) {
  return localStorage.getItem("auth") ? children : <Navigate to="/login" />;
}

function firstAllowedPath(session) {
  const order = [
    "/",
    "/bookings",
    "/slots",
    "/leads",
    "/waitlist",
    "/chats",
    "/invoices",
    "/cash",
    "/analytics",
    "/settings",
  ];
  for (const p of order) {
    if (canAccessPath(p, session)) return p;
  }
  return "/settings";
}

function PermissionRoute({ children }) {
  const { pathname } = useLocation();
  const { showToast } = useToast();
  const session = loadSession();
  const allowed = canAccessPath(pathname, session);
  const fallback = firstAllowedPath(session);
  const warned = useRef(false);

  useEffect(() => {
    if (!allowed && !warned.current) {
      warned.current = true;
      showToast?.("You don't have access to that page.", "error");
    }
  }, [allowed, showToast, pathname]);

  if (!allowed) {
    if (pathname === fallback) return children;
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function AppInit({ children }) {
  useInit();
  return children;
}

function OwnerBotGate() {
  const { pathname } = useLocation();
  if (
    pathname === "/login" ||
    pathname === "/book" ||
    pathname === "/demo" ||
    pathname === "/case-study" ||
    pathname === "/ds-tokens" ||
    pathname.startsWith("/verify")
  ) {
    return null;
  }
  return <OwnerBot />;
}

function Guarded({ children }) {
  return <PermissionRoute>{children}</PermissionRoute>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <SecurityProvider>
            <CommandProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/book" element={<PublicBooking />} />
                <Route path="/verify/:batchNumber" element={<PublicVerify />} />
                <Route path="/demo" element={<ClientDemo />} />
                <Route path="/case-study" element={<CaseStudy />} />
                <Route path="/ds-tokens" element={<DesignSystemTest />} />
                <Route
                  path="/*"
                  element={
                    <PrivateRoute>
                      <AppInit>
                        <Layout>
                          <Routes>
                            <Route path="/" element={<Guarded><Dashboard /></Guarded>} />
                            <Route path="/bookings" element={<Guarded><Bookings /></Guarded>} />
                            <Route path="/invoices" element={<Guarded><Invoices /></Guarded>} />
                            <Route path="/cash" element={<Guarded><CashLedger /></Guarded>} />
                            <Route path="/slots" element={<Guarded><Slots /></Guarded>} />
                            <Route path="/parts/scan" element={<Guarded><PartsScan /></Guarded>} />
                            <Route path="/leads" element={<Guarded><Leads /></Guarded>} />
                            <Route path="/waitlist" element={<Guarded><Waitlist /></Guarded>} />
                            <Route path="/chats" element={<Guarded><Chats /></Guarded>} />
                            <Route path="/analytics" element={<Guarded><Analytics /></Guarded>} />
                            <Route path="/audit" element={<Guarded><AuditLog /></Guarded>} />
                            <Route path="/security" element={<Guarded><Security /></Guarded>} />
                            <Route path="/settings" element={<Guarded><Settings /></Guarded>} />
                          </Routes>
                        </Layout>
                      </AppInit>
                    </PrivateRoute>
                  }
                />
              </Routes>
              <OwnerBotGate />
            </CommandProvider>
          </SecurityProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
