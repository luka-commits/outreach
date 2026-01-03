import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Modal, ModalBody } from './ui/Modal';
import { Input, FormField } from './ui/Input';
import { Button } from './ui/Button';
import { useAuth } from '../hooks/useAuth';

type AuthMode = 'sign_in' | 'sign_up' | 'reset_password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'sign_in',
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signInWithEmail(email, password);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      // Make Supabase errors more user-friendly
      if (message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (message.includes('Email not confirmed')) {
        setError('Please verify your email before signing in');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { needsEmailVerification } = await signUpWithEmail(email, password);

      if (needsEmailVerification) {
        setSuccessMessage('Check your email to verify your account');
      } else {
        // Email verification disabled - user is signed in
        onClose();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign up';
      if (message.includes('already registered')) {
        setError('An account with this email already exists');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await resetPassword(email);
      setSuccessMessage('Check your email for a password reset link');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'sign_in':
        return 'Welcome back';
      case 'sign_up':
        return 'Create your account';
      case 'reset_password':
        return 'Reset your password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'sign_in':
        return 'Sign in to continue to Outbound Pilot';
      case 'sign_up':
        return 'Start your free trial today';
      case 'reset_password':
        return "Enter your email and we'll send you a reset link";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={true}>
      <ModalBody className="pt-2">
        {/* Header */}
        <div className="text-center mb-6">
          {mode === 'reset_password' && (
            <button
              onClick={() => switchMode('sign_in')}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>
          )}
          <h2 className="text-2xl font-bold text-slate-900">{getTitle()}</h2>
          <p className="text-slate-500 mt-1">{getSubtitle()}</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-emerald-800 font-medium">{successMessage}</p>
              <p className="text-emerald-600 text-sm mt-1">
                {mode === 'sign_up'
                  ? 'Click the link in your email to activate your account.'
                  : 'Follow the instructions in the email to reset your password.'}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-rose-700 text-sm">{error}</p>
          </div>
        )}

        {/* Forms */}
        {!successMessage && (
          <>
            {mode === 'sign_in' && (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <FormField label="Email">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail size={18} />}
                    autoComplete="email"
                    disabled={loading}
                  />
                </FormField>

                <FormField label="Password">
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock size={18} />}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </FormField>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('reset_password')}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" fullWidth loading={loading}>
                  Sign in
                </Button>
              </form>
            )}

            {mode === 'sign_up' && (
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <FormField label="Email">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail size={18} />}
                    autoComplete="email"
                    disabled={loading}
                  />
                </FormField>

                <FormField label="Password" hint="At least 6 characters">
                  <Input
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock size={18} />}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </FormField>

                <FormField label="Confirm Password">
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={<Lock size={18} />}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </FormField>

                <Button type="submit" fullWidth loading={loading}>
                  Create account
                </Button>
              </form>
            )}

            {mode === 'reset_password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <FormField label="Email">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail size={18} />}
                    autoComplete="email"
                    disabled={loading}
                  />
                </FormField>

                <Button type="submit" fullWidth loading={loading}>
                  Send reset link
                </Button>
              </form>
            )}

            {/* Divider */}
            {mode !== 'reset_password' && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-slate-400">or continue with</span>
                </div>
              </div>
            )}

            {/* Google Button */}
            {mode !== 'reset_password' && (
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
            )}

            {/* Toggle between sign in and sign up */}
            {mode !== 'reset_password' && (
              <p className="text-center text-sm text-slate-500 mt-6">
                {mode === 'sign_in' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('sign_up')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('sign_in')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
          </>
        )}

        {/* After success - show sign in option */}
        {successMessage && mode === 'sign_up' && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => switchMode('sign_in')}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Back to sign in
            </button>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};
