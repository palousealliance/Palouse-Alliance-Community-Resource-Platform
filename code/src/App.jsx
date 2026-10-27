import { useCallback, useEffect, useState } from "react";
import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate, useLocation} from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { supabase } from "./lib/supabase";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Events from "./pages/Events";
import Organizations from "./pages/Organizations";
import Admin from "./pages/Admin";
import History from "./pages/History";
import {
  ADMIN_UI_STATE_KEY,
  ADMIN_ROLE_CACHE_KEY,
  readSessionCache,
  writeSessionCache,
  getSessionCacheValue,
  removeSessionCache,
} from "./lib/sessionCache";

function ProtectedRoute({ children, session, loading, sessionResolved }) {
  if (!sessionResolved || loading) {
    return (
      <div
        className="page-root"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 70px)",
        }}
      >
        <p style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children, session, loading, sessionResolved, isAdmin, onVerifyAdmin }) {
  const location = useLocation();

  useEffect(() => {
    // Whenever navigating to the admin route, verify the user is still actively an admin in the background
    if (onVerifyAdmin) {
      onVerifyAdmin();
    }
  }, [location.pathname, onVerifyAdmin]);

  // Only show loading if role is not cached/verified as admin
  if ((!sessionResolved && !isAdmin) || (loading && !isAdmin)) {
    return (
      <div
        className="admin-page page-root"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 70px)",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
          <p style={{ fontSize: "1.05rem", fontWeight: 600 }}>Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  // Only redirect once the session state has actually resolved
  if (sessionResolved && !session) {
    return <Navigate to="/login" replace />;
  }

  if (sessionResolved && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } catch {
        // Safe fallback in test environments like jsdom
      }
    }
  }, [location.pathname]);

  return null;
}

function App() {
  const cachedAdminEntry = readSessionCache(ADMIN_ROLE_CACHE_KEY);
  const cachedAdmin = getSessionCacheValue(cachedAdminEntry);
  const initialIsAdmin = Boolean(cachedAdmin?.isAdmin);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [isAdminLoading, setIsAdminLoading] = useState(!initialIsAdmin);

  const checkAdminRole = useCallback(async (currentSession, showLoading = false) => {
    const userId = currentSession?.user?.id;
    if (!userId) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      removeSessionCache(ADMIN_ROLE_CACHE_KEY);
      return false;
    }

    if (showLoading) {
      setIsAdminLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      const verifiedAdmin = !error && data?.role === "admin";
      setIsAdmin(verifiedAdmin);

      if (verifiedAdmin) {
        writeSessionCache(ADMIN_ROLE_CACHE_KEY, {
          userId,
          isAdmin: true,
        });
      } else {
        removeSessionCache(ADMIN_ROLE_CACHE_KEY);
      }

      return verifiedAdmin;
    } catch {
      return false;
    } finally {
      setIsAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await supabase.auth.getSession();
        const currentSession = response?.data?.session || null;

        if (isMounted) {
          setSession(currentSession);
          setLoading(false);
          setSessionResolved(true);

          if (!currentSession) {
            removeSessionCache(ADMIN_UI_STATE_KEY);
            removeSessionCache(ADMIN_ROLE_CACHE_KEY);
            setIsAdmin(false);
            setIsAdminLoading(false);
          } else {
            // Verify admin status in background without flashing if already cached
            checkAdminRole(currentSession, !initialIsAdmin);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("Failed to resolve auth session:", error);
          setSession(null);
          setLoading(false);
          setSessionResolved(true);
          removeSessionCache(ADMIN_UI_STATE_KEY);
          removeSessionCache(ADMIN_ROLE_CACHE_KEY);
          setIsAdmin(false);
          setIsAdminLoading(false);
        }
      }
    };

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      setSessionResolved(true);

      if (!nextSession) {
        removeSessionCache(ADMIN_UI_STATE_KEY);
        removeSessionCache(ADMIN_ROLE_CACHE_KEY);
        setIsAdmin(false);
        setIsAdminLoading(false);
      } else {
        checkAdminRole(nextSession, false);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [checkAdminRole, initialIsAdmin]);

  const handleVerifyAdminOnRoute = useCallback(() => {
    // Non-blocking background verification when navigating back to /admin
    if (session?.user?.id) {
      checkAdminRole(session, false);
    }
  }, [checkAdminRole, session]);

  const isRolePending = loading || (isAdminLoading && !isAdmin);

  return (
    <Router>
      <div className="app-layout">
        <Navbar session={session} isAdmin={isAdmin} />
        <ScrollToTop />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Landing session={session} />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/events"
              element={<Events key={session?.user?.id || "public"} session={session} />}
            />
            <Route path="/organizations" element={<Organizations session={session} />} />
            <Route path="/history" element={<History session={session} isAdmin={isAdmin} />} />
            <Route
              path="/admin"
              element={
                <AdminRoute
                  loading={isRolePending}
                  sessionResolved={sessionResolved}
                  session={session}
                  isAdmin={isAdmin}
                  onVerifyAdmin={handleVerifyAdminOnRoute}
                >
                  <Admin session={session} />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Landing session={session} />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
