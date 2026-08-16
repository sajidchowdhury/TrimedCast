'use client';

// ============================================
// TrimedCast - OTP Input Component
// 6-digit OTP input with emerald styling
// Auto-focus, paste support, countdown timer
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';

interface OtpInputProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const RESEND_COOLDOWN = 60; // seconds

export function OtpInput({
  email,
  onVerify,
  onResend,
  isLoading = false,
  error = null,
}: OtpInputProps) {
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resendLoading, setResendLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for resend
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otp.length === 6) {
      onVerify(otp);
    }
  }, [otp, onVerify]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      await onResend();
      setCooldown(RESEND_COOLDOWN);
      setOtp('');
    } finally {
      setResendLoading(false);
    }
  }, [cooldown, resendLoading, onResend]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Mask email for privacy
  const maskedEmail = email.replace(
    /^(.)(.*)(@.*)$/,
    (_, first, middle, rest) => `${first}${middle.replace(/./g, '•')}${rest}`
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground">Check your email</h3>
        <p className="text-muted-foreground">আপনার ইমেইল চেক করুন</p>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{maskedEmail}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          disabled={isLoading}
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

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-rose-500 font-medium"
        >
          {error}
        </motion.p>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-sm text-emerald-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying...</span>
          </div>
        </div>
      )}

      {/* Resend */}
      <div className="text-center space-y-2">
        {cooldown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Didn&apos;t get it? Resend in{' '}
            <span className="font-mono font-medium text-foreground">{formatTime(cooldown)}</span>
          </p>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
          >
            {resendLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-1" />
            )}
            Resend OTP
          </Button>
        )}
      </div>

      {/* OTP expiry notice */}
      <p className="text-xs text-center text-muted-foreground">
        Code expires in 5 minutes. Max 3 attempts.
      </p>
    </motion.div>
  );
}
