import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Lock, Mail, User, ArrowRight, Loader2, Check, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength calculation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isStrong = hasMinLength && hasUpper && hasLower && hasNumber;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrong) {
      setError('Please choose a password meeting all strength requirements.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/register', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });

      if (res.data?.success) {
        const { user, accessToken, refreshToken } = res.data.data;
        setAuth(user, accessToken, refreshToken);
        navigate('/photos');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
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
            Create your Vault
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Zero-knowledge, private, secure media cloud
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>First Name</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-border focus:border-primary text-sm text-foreground outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Last Name</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-border focus:border-primary text-sm text-foreground outline-none transition-all"
              />
            </div>
          </div>

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
              className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-border focus:border-primary text-sm text-foreground outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Password (Argon2id Encrypted)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-border focus:border-primary text-sm text-foreground outline-none transition-all"
            />
          </div>

          {/* Password Strength Checklist */}
          <div className="p-3 rounded-2xl bg-surface-50 dark:bg-surface-900/60 border border-border space-y-1.5 text-[11px]">
            <div className="flex items-center space-x-2 text-muted-foreground">
              {hasMinLength ? <Check className="w-3.5 h-3.5 text-vault-emerald" /> : <X className="w-3.5 h-3.5 text-destructive" />}
              <span>At least 8 characters</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              {hasUpper && hasLower ? <Check className="w-3.5 h-3.5 text-vault-emerald" /> : <X className="w-3.5 h-3.5 text-destructive" />}
              <span>Uppercase and lowercase letters</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              {hasNumber ? <Check className="w-3.5 h-3.5 text-vault-emerald" /> : <X className="w-3.5 h-3.5 text-destructive" />}
              <span>At least one number</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isStrong}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-glow flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-6"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
