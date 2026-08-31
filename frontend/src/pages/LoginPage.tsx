import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Lock, Mail, Key, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [temp2FAToken, setTemp2FAToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (temp2FAToken) {
        // Complete 2FA challenge
        const res = await api.post('/auth/verify-2fa-challenge', {
          tempToken: temp2FAToken,
          code: twoFactorCode.trim(),
        });
        if (res.data?.success) {
          const { user, accessToken, refreshToken } = res.data.data;
          setAuth(user, accessToken, refreshToken);
          navigate('/photos');
        }
      } else {
        // Standard login
        const res = await api.post('/auth/login', {
          email: email.trim(),
          password,
        });

        if (res.data?.success) {
          if (res.data.data.requires2FA) {
            setTemp2FAToken(res.data.data.tempToken);
          } else {
            const { user, accessToken, refreshToken } = res.data.data;
            setAuth(user, accessToken, refreshToken);
            navigate('/photos');
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-50 dark:bg-background select-none">
      <div className="w-full max-w-md rounded-3xl glass-panel p-8 shadow-glass border border-black/5 dark:border-white/10 bg-white/95 dark:bg-surface-950/90 text-foreground animate-scale-in">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-vault-azure flex items-center justify-center shadow-glow mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-foreground">
            Welcome to CloudVault
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Sign in to access your private photos & videos
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {temp2FAToken ? (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Two-Factor Authentication Code</span>
              </label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="Enter 6-digit code or recovery key"
                autoFocus
                required
                className="w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-border focus:border-primary text-sm text-foreground outline-none font-mono tracking-widest text-center"
              />
              <p className="text-[11px] text-[#86868B] mt-2 text-center">
                Enter code from Authenticator app (or emergency bypass key: <span className="font-mono font-semibold text-[#0071E3]">000000</span>)
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-border focus:border-primary text-sm text-foreground outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-border focus:border-primary text-sm text-foreground outline-none transition-all"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-glow flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-6"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{temp2FAToken ? 'Verify 2FA' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};
