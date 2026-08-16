'use client';

// ============================================
// TrimedCast - Forgot Password Form
// OTP-based password reset flow:
// Step 1: Enter email → Send OTP
// Step 2: Enter OTP + new password
// Step 3: Success → redirect to login
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

type ResetStep = 'email' | 'otp' | 'success';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const RESEND_COOLDOWN = 60;

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [step, setStep] = useState<ResetStep>('email');

  // Email step
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // OTP step
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // --- Step 1: Send OTP to email ---
  const handleSendOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Valid email address is required');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'RATE_LIMITED') {
          setEmailError('Too many requests. Please wait before trying again.');
        } else {
          setEmailError(data.message || 'Failed to send reset code');
        }
        return;
      }

      // Move to OTP step
      setStep('otp');
      setCooldown(RESEND_COOLDOWN);

      // Dev mode: log OTP
      if (data.data?._dev_otp) {
        console.log(`[DEV] Reset OTP for ${email}: ${data.data._dev_otp}`);
      }
    } catch (err) {
      setEmailError('Network error. Please try again.');
      console.error('[ForgotPassword] Send error:', err);
    } finally {
      setIsSendingOtp(false);
    }
  }, [email]);

  // --- Step 2: Verify OTP + set new password ---
  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setPasswordError(null);

    const errors: string[] = [];
    if (otp.length !== 6) errors.push('otp');
    if (!newPassword) errors.push('password required');
    else if (newPassword.length < 8) errors.push('min 8 chars');
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) errors.push('need upper/lower/digit');

    if (otp.length !== 6) {
      setOtpError('Enter the 6-digit code');
      return;
    }
    if (errors.some(e => e.includes('password') || e.includes('min') || e.includes('need'))) {
      setPasswordError('Password must be 8+ characters with uppercase, lowercase, and number');
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'INVALID_OTP') {
          setOtpError(data.message || 'Invalid or expired code');
        } else if (data.errors && Array.isArray(data.errors)) {
          for (const err of data.errors) {
            if (err.field === 'new_password') setPasswordError(err.message);
            if (err.field === 'otp') setOtpError(err.message);
          }
        } else {
          setOtpError(data.message || 'Reset failed');
        }
        return;
      }

      // Success
      setStep('success');
    } catch (err) {
      setOtpError('Network error. Please try again.');
      console.error('[ForgotPassword] Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  }, [email, otp, newPassword]);

  // --- Resend OTP ---
  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (res.ok) {
        setCooldown(RESEND_COOLDOWN);
        setOtp('');
        setOtpError(null);
        if (data.data?._dev_otp) {
          console.log(`[DEV] New reset OTP for ${email}: ${data.data._dev_otp}`);
        }
      }
    } catch {
      // Silent fail
    }
  }, [email, cooldown]);

  // Mask email
  const maskedEmail = email.replace(
    /^(.)(.*)(@.*)$/,
    (_, first, middle, rest) => `${first}${middle.replace(/./g, '•')}${rest}`
  );

  return (
    <AnimatePresence mode="wait">
      {/* Step 1: Enter email */}
      {step === 'email' && (
        <motion.div
          key="email"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              Reset your password
            </h1>
            <p className="text-muted-foreground mt-1">
              পাসওয়ার্ড রিসেট করুন
            </p>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Enter the email associated with your account. We&apos;ll send a verification code to reset your password.
          </p>

          <form onSubmit={handleSendOtp} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium">
                Email Address <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="rahman@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  className={`pl-10 h-11 ${emailError ? 'border-rose-500 focus-visible:border-rose-500' : ''}`}
                  disabled={isSendingOtp}
                  autoComplete="email"
                />
              </div>
              {emailError && (
                <p className="text-xs text-rose-500">{emailError}</p>
              )}
            </div>

            {/* Send OTP */}
            <Button
              type="submit"
              disabled={isSendingOtp}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11 shadow-lg shadow-emerald-500/25"
              size="lg"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending code...
                </>
              ) : (
                <>
                  Send Reset Code
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Back to login */}
          <button
            onClick={onBackToLogin}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </button>
        </motion.div>
      )}

      {/* Step 2: OTP + New Password */}
      {step === 'otp' && (
        <motion.div
          key="otp"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Header */}
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Enter verification code
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              We sent a 6-digit code to <span className="font-medium text-foreground">{maskedEmail}</span>
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* OTP Input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={isResetting}
                  containerClassName="gap-2"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-12 w-12 text-lg font-semibold border-emerald-500/30 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/30" />
                    <InputOTPSlot index={1} className="h-12 w-12 text-lg font-semibold border-emerald-500/30 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/30" />
                    <InputOTPSlot index={2} className="h-12 w-12 text-lg font-semibold border-emerald-500/30 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/30" />
                  </InputOTPGroup>
                  <InputOTPSeparator className="text-emerald-500/50" />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="h-12 w-12 text-lg font-semibold border-emerald-500/30 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/30" />
                    <InputOTPSlot index={4} className="h-12 w-12 text-lg font-semibold border-emerald-500/30 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/30" />
                    <InputOTPSlot index={5} className="h-12 w-12 text-lg font-semibold border-emerald-500/30 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/30" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {otpError && (
                <p className="text-xs text-rose-500 text-center">{otpError}</p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium">
                New Password <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  className={`pl-10 pr-10 h-11 ${passwordError ? 'border-rose-500 focus-visible:border-rose-500' : ''}`}
                  disabled={isResetting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-rose-500">{passwordError}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isResetting || otp.length !== 6}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11 shadow-lg shadow-emerald-500/25"
              size="lg"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Resetting...
                </>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Resend */}
          <div className="text-center">
            {cooldown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Didn&apos;t get it? Resend in{' '}
                <span className="font-mono font-medium text-foreground">{cooldown}s</span>
              </p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Resend code
              </Button>
            )}
          </div>

          {/* Back */}
          <button
            onClick={() => { setStep('email'); setOtp(''); setOtpError(null); }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </motion.div>
      )}

      {/* Step 3: Success */}
      {step === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6 text-center"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Password reset! ✅
            </h2>
            <p className="text-muted-foreground mt-1">
              পাসওয়ার্ড রিসেট সফল
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Your password has been reset successfully. All other sessions have been logged out for security.
          </p>

          <Button
            onClick={onBackToLogin}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11 shadow-lg shadow-emerald-500/25"
            size="lg"
          >
            Back to Login
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
