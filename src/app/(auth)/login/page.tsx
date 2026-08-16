'use client';

// ============================================
// TrimedCast - Login Page
// Route: /login
// Switches between Login and Forgot Password forms
// ============================================

import { useState } from 'react';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

type AuthView = 'login' | 'forgot-password';

function LoginPageContent() {
  const [view, setView] = useState<AuthView>('login');

  return (
    <>
      {view === 'login' && (
        <LoginForm onForgotPassword={() => setView('forgot-password')} />
      )}
      {view === 'forgot-password' && (
        <ForgotPasswordForm onBackToLogin={() => setView('login')} />
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[200px]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
