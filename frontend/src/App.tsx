import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from './lib/supabaseClient';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ProcessingScreen } from './components/ProcessingScreen';
import { DashboardLayout } from './components/DashboardLayout';
import { SettingsPage } from './components/SettingsPage';
import type { Session } from '@supabase/supabase-js';
import { useOutletContext } from 'react-router-dom';
import { CoursesPage } from './pages/CoursesPage';
import { ProgressPage } from './pages/ProgressPage';
import { SchedulePage } from './pages/SchedulePage';
import { TasksPage } from './pages/TasksPage';

function RouteWrapper({ Component }: { Component: any }) {
  const context = useOutletContext<{ userId: string }>();
  return <Component userId={context?.userId} />;
}

// Loading Spinner for App Initialization
const AppLoadingSpinner = () => (
  <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-base)', gap: 20 }}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '4px solid var(--primary-container)',
        borderTopColor: 'var(--primary)',
      }}
    />
    <p style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '0.02em', opacity: 0.8 }}>Starting Engine...</p>
  </div>
);



function AnimatedRoutes({ session, userId }: any) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Landing */}
        <Route path="/" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            {!session ? <LandingPage 
              onSignup={() => window.dispatchEvent(new CustomEvent('open-auth-signup'))} 
              onLogin={() => window.dispatchEvent(new CustomEvent('open-auth-login'))} 
            /> : <Navigate to="/dashboard" />}
          </motion.div>
        } />

        {/* Onboarding */}
        <Route path="/onboarding" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            {userId ? (
              <OnboardingFlow userId={userId} onComplete={() => navigate('/processing')} />
            ) : <Navigate to="/" />}
          </motion.div>
        } />

        {/* Processing */}
        <Route path="/processing" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <ProcessingScreen />
          </motion.div>
        } />

        {/* Protected Dashboard Layout wrapping sub-routes */}
        <Route path="/dashboard" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} style={{ height: '100vh', overflow: 'hidden' }}>
            {userId ? <DashboardLayout userId={userId} /> : <Navigate to="/" />}
          </motion.div>
        }>
          <Route index element={<RouteWrapper Component={CoursesPage} />} />
          <Route path="courses" element={<RouteWrapper Component={CoursesPage} />} />
          <Route path="courses/:id" element={<RouteWrapper Component={CoursesPage} />} />
          <Route path="progress" element={<RouteWrapper Component={ProgressPage} />} />
          <Route path="schedule" element={<RouteWrapper Component={SchedulePage} />} />
          <Route path="tasks" element={<RouteWrapper Component={TasksPage} />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [showAuth, setShowAuth] = useState<'login' | 'signup' | false>(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    const openSignupListener = () => setShowAuth('signup');
    const openLoginListener = () => setShowAuth('login');
    window.addEventListener('open-auth-signup', openSignupListener);
    window.addEventListener('open-auth-login', openLoginListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('open-auth-signup', openSignupListener);
      window.removeEventListener('open-auth-login', openLoginListener);
    };
  }, []);

  const handleAuthSuccess = () => {
    setShowAuth(false);
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s) {
        setSession(s);
        // Direct routing handled via check below on load
      }
    });
  };

  const userId = session?.user?.id || '';

  if (isInitializing) {
    return <AppLoadingSpinner />;
  }

  return (
    <BrowserRouter>
      {/* We pass a checker to automatically redirect when auth changes */}
      <OnboardingRedirectGate session={session} userId={userId} />
      
      <AnimatedRoutes session={session} userId={userId} />

      <AnimatePresence>
        {showAuth && (
          <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} defaultMode={showAuth || 'signup'} />
        )}
      </AnimatePresence>
    </BrowserRouter>
  );
}

// A silent component that redirects user to appropriate screen based on profile state
function OnboardingRedirectGate({ session, userId }: { session: Session | null, userId: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkState = async () => {
      if (session && userId) {
        const { data: profile } = await supabase.from('profiles').select('onboarded').eq('id', userId).single();
        if (profile?.onboarded && location.pathname === '/') {
          navigate('/dashboard');
        } else if (!profile?.onboarded && location.pathname !== '/onboarding' && location.pathname !== '/processing') {
          navigate('/onboarding');
        }
      }
    };
    checkState();
  }, [session, userId, location.pathname, navigate]);

  return null;
}

export default App;
