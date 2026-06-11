'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Shield, LogIn } from 'lucide-react';
import RegisterForm from '../components/RegisterForm';

export default function RegisterPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [sessionCheckDone, setSessionCheckDone] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsAdminLoggedIn(!!data.session);
      } catch {
        setIsAdminLoggedIn(false);
      } finally {
        setSessionCheckDone(true);
      }
    };
    checkSession();
  }, []);

  if (!sessionCheckDone) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f1f8f4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#5d756d', fontSize: '0.9rem' }}>Checking access credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f1f8f4', padding: '2rem' }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', background: '#fff', borderRadius: 20, padding: '3rem 2rem', boxShadow: '0 16px 48px rgba(2, 44, 34, 0.1)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Shield size={32} style={{ color: '#10b981' }} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1a3a30', marginBottom: 8 }}>Public Registration Suspended</h2>
          <p style={{ color: '#5d756d', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Citizen self-registration is temporarily closed. All new member registrations are now handled exclusively by authorized EM Card staff through the Admin Portal.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/" style={{ padding: '12px 20px', borderRadius: 12, background: '#f1f8f4', color: '#1a3a30', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', transition: 'background 0.2s' }}>&#8592; Return to Homepage</a>
            <a href="/admin" style={{ padding: '12px 20px', borderRadius: 12, background: '#10b981', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
              <LogIn size={18} /> Staff Portal Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <RegisterForm />;
}
