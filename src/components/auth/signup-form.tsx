'use client';

// ============================================
// TrimedCast - Signup Form Component
// Multi-step signup flow:
// Step 1: Form (shop name, email, phone, division, password)
// Step 2: OTP verification
// Step 3: AC-ID display (success)
// ============================================

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OtpInput } from '@/components/auth/otp-input';
import { AcIdDisplay } from '@/components/auth/ac-id-display';
import {
  Bike,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Store,
  Mail,
  Phone,
  MapPin,
  Lock,
} from 'lucide-react';

// BD Divisions
const DIVISIONS = [
  { value: 'dhaka', label: 'Dhaka', labelBn: 'ঢাকা' },
  { value: 'chittagong', label: 'Chittagong', labelBn: 'চট্টগ্রাম' },
  { value: 'sylhet', label: 'Sylhet', labelBn: 'সিলেট' },
  { value: 'rajshahi', label: 'Rajshahi', labelBn: 'রাজশাহী' },
  { value: 'khulna', label: 'Khulna', labelBn: 'খুলনা' },
  { value: 'barishal', label: 'Barishal', labelBn: 'বরিশাল' },
  { value: 'rangpur', label: 'Rangpur', labelBn: 'রংপুর' },
  { value: 'mymensingh', label: 'Mymensingh', labelBn: 'ময়মনসিংহ' },
] as const;

type SignupStep = 'form' | 'otp' | 'success';

interface FormData {
  shopName: string;
  email: string;
  phone: string;
  division: string;
  password: string;
}

interface FormErrors {
  shopName?: string;
  email?: string;
  phone?: string;
  division?: string;
  password?: string;
}

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>('form');
  const [showPassword, setShowPassword] = useState(false);

  // Form data
  const [formData, setFormData] = useState<FormData>({
    shopName: '',
    email: '',
    phone: '',
    division: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Success state
  const [acId, setAcId] = useState('');

  // --- Validation ---
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    // Shop name
    if (!formData.shopName.trim()) {
      errors.shopName = 'Shop name is required';
    } else if (formData.shopName.trim().length < 2) {
      errors.shopName = 'At least 2 characters';
    }

    // Email
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Phone (optional but validate if provided)
    if (formData.phone && !/^(\+?880|0)?1[3-9]\d{8}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'Invalid BD phone (e.g., +880 1712-345678)';
    }

    // Division
    if (!formData.division) {
      errors.division = 'Select your division';
    }

    // Password
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'At least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Must include uppercase, lowercase, and number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // --- Step 1: Submit form & send OTP ---
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_name: formData.shopName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          division: formData.division,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle API errors
        if (data.errors && Array.isArray(data.errors)) {
          const apiErrors: FormErrors = {};
          for (const err of data.errors) {
            if (err.field === 'shop_name') apiErrors.shopName = err.message;
            if (err.field === 'email') apiErrors.email = err.message;
            if (err.field === 'phone') apiErrors.phone = err.message;
            if (err.field === 'division') apiErrors.division = err.message;
            if (err.field === 'password') apiErrors.password = err.message;
          }
          setFormErrors(apiErrors);
        } else if (data.code === 'RATE_LIMITED') {
          setFormErrors({ email: data.message || 'Too many OTP requests. Please wait.' });
        } else {
          setFormErrors({ email: data.message || 'Registration failed' });
        }
        return;
      }

      // OTP sent successfully → move to OTP step
      setStep('otp');

      // In dev mode, log the OTP
      if (data.data?._dev_otp) {
        console.log(`[DEV] OTP for ${formData.email}: ${data.data._dev_otp}`);
      }
    } catch (err) {
      setFormErrors({ email: 'Network error. Please try again.' });
      console.error('[Signup] Register error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  // --- Step 2: Verify OTP ---
  const handleVerifyOtp = useCallback(async (otp: string) => {
    setIsVerifying(true);
    setOtpError(null);

    try {
      const res = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          otp,
          shop_name: formData.shopName.trim(),
          phone: formData.phone.trim() || undefined,
          division: formData.division,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'INVALID_OTP') {
          setOtpError(data.message || 'Invalid OTP. Please try again.');
        } else if (data.code === 'CONFLICT') {
          setOtpError('Email already registered. Please login instead.');
        } else {
          setOtpError(data.message || 'Verification failed');
        }
        return;
      }

      // Account created! Set session cookie
      if (data.data?.token) {
        document.cookie = `trimedcast-session=${data.data.token}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
      }

      // Show AC-ID
      setAcId(data.data?.ac_id || '');
      setStep('success');
    } catch (err) {
      setOtpError('Network error. Please try again.');
      console.error('[Signup] Verify OTP error:', err);
    } finally {
      setIsVerifying(false);
    }
  }, [formData]);

  // --- Step 2: Resend OTP ---
  const handleResendOtp = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          purpose: 'signup',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.message || 'Failed to resend OTP');
        return;
      }

      setOtpError(null);

      // In dev mode, log the OTP
      if (data.data?._dev_otp) {
        console.log(`[DEV] New OTP for ${formData.email}: ${data.data._dev_otp}`);
      }
    } catch (err) {
      setOtpError('Network error. Please try again.');
      console.error('[Signup] Resend OTP error:', err);
    }
  }, [formData.email]);

  // --- Step 3: Continue to onboarding ---
  const handleContinue = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  // --- Update form field ---
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {/* Step 1: Form */}
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                Create your account
              </h1>
              <p className="text-muted-foreground mt-1">
                আপনার অ্যাকাউন্ট তৈরি করুন
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Shop Name */}
              <div className="space-y-2">
                <Label htmlFor="shopName" className="text-sm font-medium">
                  Shop Name <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="shopName"
                    type="text"
                    placeholder="e.g., Rahman Auto Parts"
                    value={formData.shopName}
                    onChange={(e) => updateField('shopName', e.target.value)}
                    className={`pl-10 h-11 ${formErrors.shopName ? 'border-rose-500 focus-visible:border-rose-500' : ''}`}
                    disabled={isSubmitting}
                    autoComplete="organization"
                  />
                </div>
                {formErrors.shopName && (
                  <p className="text-xs text-rose-500">{formErrors.shopName}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g., rahman@gmail.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={`pl-10 h-11 ${formErrors.email ? 'border-rose-500 focus-visible:border-rose-500' : ''}`}
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>
                {formErrors.email && (
                  <p className="text-xs text-rose-500">{formErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+880 1XXX-XXXXXX"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className={`pl-10 h-11 ${formErrors.phone ? 'border-rose-500 focus-visible:border-rose-500' : ''}`}
                    disabled={isSubmitting}
                    autoComplete="tel"
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-xs text-rose-500">{formErrors.phone}</p>
                )}
              </div>

              {/* Division */}
              <div className="space-y-2">
                <Label htmlFor="division" className="text-sm font-medium">
                  Division <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Select
                    value={formData.division}
                    onValueChange={(value) => updateField('division', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className={`pl-10 h-11 w-full ${formErrors.division ? 'border-rose-500' : ''}`}>
                      <SelectValue placeholder="Select your division" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIVISIONS.map((div) => (
                        <SelectItem key={div.value} value={div.value}>
                          <span className="flex items-center gap-2">
                            {div.label}
                            <span className="text-xs text-muted-foreground">({div.labelBn})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formErrors.division && (
                  <p className="text-xs text-rose-500">{formErrors.division}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`pl-10 pr-10 h-11 ${formErrors.password ? 'border-rose-500 focus-visible:border-rose-500' : ''}`}
                    disabled={isSubmitting}
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
                {formErrors.password && (
                  <p className="text-xs text-rose-500">{formErrors.password}</p>
                )}
                {/* Password strength indicator */}
                {formData.password && !formErrors.password && (
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((level) => {
                      const strength = formData.password.length >= 8
                        ? /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(formData.password) ? 4
                        : /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password) ? 3
                        : 2
                        : 1;
                      return (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= strength
                              ? strength <= 2 ? 'bg-rose-500'
                              : strength === 3 ? 'bg-amber-500'
                              : 'bg-emerald-500'
                              : 'bg-muted'
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11 shadow-lg shadow-emerald-500/25 mt-6"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Create Account & Send OTP
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Login link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-emerald-500 hover:text-emerald-600 transition-colors"
              >
                Login
              </Link>
            </p>
          </motion.div>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Back button */}
            <button
              onClick={() => { setStep('form'); setOtpError(null); }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              ← Back to form
            </button>

            <OtpInput
              email={formData.email}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              isLoading={isVerifying}
              error={otpError}
            />
          </motion.div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <AcIdDisplay
              acId={acId}
              shopName={formData.shopName}
              division={formData.division}
              onContinue={handleContinue}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
