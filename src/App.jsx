import React, { useState, useEffect } from 'react'
import ScrollNarrative from './components/ScrollNarrative'
import AuthModal from './components/AuthModal'
import DashboardLayout from './components/DashboardLayout'
import { supabase } from './lib/supabaseClient'

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsAuthModalOpen(false); // Close modal if open
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // If user is logged in, show the authenticated layout
  if (session) {
    return <DashboardLayout session={session} />;
  }

  // If not logged in, show the landing page
  return (
    <>
      <ScrollNarrative onGetStarted={() => setIsAuthModalOpen(true)} />
      {isAuthModalOpen && (
        <AuthModal onClose={() => setIsAuthModalOpen(false)} />
      )}
    </>
  )
}

export default App
