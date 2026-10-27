import { useEffect, useState } from "react";
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
import { ADMIN_UI_STATE_KEY, removeSessionCache } from "./lib/sessionCache";

function ProtectedRoute({ children, session, loading }) {
  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children, session, loading, isAdmin }) {
  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (isMounted) {
          setSession(currentSession);
          setLoading(false);
          setSessionResolved(true);

          if (!currentSession) {
            removeSessionCache(ADMIN_UI_STATE_KEY);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("Failed to resolve auth session:", error);
          setSession(null);
          setLoading(false);
          setSessionResolved(true);
          removeSessionCache(ADMIN_UI_STATE_KEY);
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
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAdminRole = async () => {
      if (!sessionResolved) {
        if (isMounted) {
          setIsAdminLoading(true);
        }
        return;
      }

      if (!session?.user?.id) {
        if (isMounted) {
          setIsAdmin(false);
          setIsAdminLoading(false);
        }
        return;
      }

      if (isMounted) {
        setIsAdminLoading(true);
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (!error) {
        setIsAdmin(data?.role === "admin");
      }
      setIsAdminLoading(false);
    };

    loadAdminRole();

    return () => {
      isMounted = false;
    };
  }, [session, sessionResolved]);

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
                  loading={loading || !sessionResolved || isAdminLoading}
                  session={session}
                  isAdmin={isAdmin}
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
