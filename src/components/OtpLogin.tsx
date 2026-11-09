import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { api, ApiRequestError } from '@/api/client';
import type { Me } from '@/api/types';
import { useAuth } from '@/state/AuthContext';
import { phoneDigits } from '@/lib/format';
import { OtpInput } from './OtpInput';

const RESEND_SECONDS = 30; // matches the server's per-phone resend cooldown
const PHONE_RE = /^[6-9]\d{9}$/;

type Props = {
  title?: string;
  subtitle?: string;
  onSuccess: (me: Me, isNewUser: boolean) => void;
};

// Mobile-number login against the existing endpoints: POST /auth/send-otp, then POST /auth/verify-otp.
// The server sets the httpOnly session cookie; we then ask /auth/session who we are.
export function OtpLogin({ title = 'Sign in with your mobile number', subtitle = 'We will text you a 6-digit code. No password needed.', onSuccess }: Props) {
  const { refresh } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [shake, setShake] = useState(false);
  const submitting = useRef(false);

  const phoneValid = PHONE_RE.test(phone);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const sendCode = useCallback(async () => {
    if (!PHONE_RE.test(phone) || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await api.sendOtp(phone);
      setStep('code');
      setOtp('');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError((e as ApiRequestError).message);
      // The server tells us how long to wait; reflect an active cooldown instead of leaving a dead button
      const m = /(\d+) seconds/.exec((e as Error).message);
      if (m && (e as ApiRequestError).status === 429) setCooldown(Number(m[1]));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }, [phone]);

  const verify = useCallback(async (code: string) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await api.verifyOtp(phone, code);
      const me = await refresh();
      if (!me) throw new ApiRequestError(0, 'You are verified, but we could not start your session. Please try again.');
      onSuccess(me, res.isNewUser);
    } catch (e) {
      setError((e as ApiRequestError).message);
      setOtp('');
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }, [phone, refresh, onSuccess]);

  const showPhoneError = phoneTouched && phone.length > 0 && !phoneValid;

  if (step === 'phone') {
    return (
      <form
        className="auth-form stack"
        style={{ '--stack': '20px' } as React.CSSProperties}
        onSubmit={(e) => { e.preventDefault(); setPhoneTouched(true); void sendCode(); }}
        noValidate
      >
        <div className="stack" style={{ '--stack': '8px' } as React.CSSProperties}>
          <h2 className="auth-title">{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>

        <div className="field">
          <label htmlFor="phone">Mobile number</label>
          <div className="input-group" data-invalid={showPhoneError}>
            <span className="affix" aria-hidden="true">+91</span>
            <input
              id="phone"
              className="input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={phone}
              maxLength={14}
              autoFocus
              aria-invalid={showPhoneError}
              aria-describedby="phone-hint"
              onChange={(e) => { setPhone(phoneDigits(e.target.value)); setError(null); }}
              onBlur={() => setPhoneTouched(true)}
            />
          </div>
          {showPhoneError ? (
            <p className="field-error" id="phone-hint"><AlertCircle size={16} aria-hidden="true" /> Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.</p>
          ) : (
            <p className="field-hint" id="phone-hint">Indian mobile numbers only for now.</p>
          )}
        </div>

        {error && <div className="alert alert-error" role="alert"><AlertCircle aria-hidden="true" /> <span>{error}</span></div>}

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={!phoneValid || busy || cooldown > 0}>
          {busy ? <span className="spinner" aria-label="Sending" /> : <>Send code <ArrowRight aria-hidden="true" /></>}
        </button>
        {cooldown > 0 && <p className="field-hint center">You can ask for a new code in {cooldown}s.</p>}

        <p className="auth-assure"><ShieldCheck size={16} aria-hidden="true" /> Your number is only used to confirm bookings and reach you about your trip.</p>
      </form>
    );
  }

  return (
    <form
      className="auth-form stack"
      style={{ '--stack': '20px' } as React.CSSProperties}
      onSubmit={(e) => { e.preventDefault(); if (otp.length === 6) void verify(otp); }}
    >
      <button type="button" className="btn btn-ghost btn-sm back-link" onClick={() => { setStep('phone'); setError(null); setOtp(''); }}>
        <ArrowLeft aria-hidden="true" /> Change number
      </button>

      <div className="stack" style={{ '--stack': '8px' } as React.CSSProperties}>
        <h2 className="auth-title">Enter the 6-digit code</h2>
        <p className="muted">Sent to <strong className="nowrap">+91 {phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</strong>. It is valid for 5 minutes.</p>
      </div>

      <div className={shake ? 'shake' : undefined}>
        <OtpInput
          value={otp}
          onChange={(v) => { setOtp(v); if (error) setError(null); }}
          onComplete={(code) => void verify(code)}
          disabled={busy}
          invalid={!!error}
          autoFocus
          label="One-time code"
        />
      </div>

      <div aria-live="polite">
        {error && <div className="alert alert-error" role="alert"><AlertCircle aria-hidden="true" /> <span>{error}</span></div>}
      </div>

      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={otp.length !== 6 || busy}>
        {busy ? <span className="spinner" aria-label="Verifying" /> : 'Verify and continue'}
      </button>

      <p className="center muted">
        Did not get it?{' '}
        {cooldown > 0 ? (
          <span>Resend in {cooldown}s</span>
        ) : (
          <button type="button" className="link-btn" onClick={() => void sendCode()} disabled={busy}>Send a new code</button>
        )}
      </p>
    </form>
  );
}
