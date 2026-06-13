'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Pill, CheckCircle2, AlertTriangle, LogIn, UserPlus, Heart, Loader2 } from 'lucide-react';
import axios from 'axios';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';
  const { user, isAuthenticated, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    relationship: string;
    patientName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No invitation token was provided. Please check your link.');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await axios.get(`/api/caregiver/invite/verify?token=${token}`);
        setInviteInfo(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Invalid or expired invitation link.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post('/api/caregiver/invite/respond', {
        token,
        action: 'accept',
      });
      toast.success(response.data.message || 'Successfully connected as caregiver! 🎉');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchAccount = () => {
    logout();
    router.push(`/login?inviteToken=${token}&role=caregiver`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="bg-card rounded-3xl p-10 border border-border shadow-card max-w-md w-full text-center flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Verifying invitation...</h2>
          <p className="text-muted text-sm">Please wait while we validate your secure link.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="bg-card rounded-3xl p-8 sm:p-10 border border-border shadow-card max-w-md w-full text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-destructive">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Invitation Error</h2>
          <p className="text-muted mb-8">{error}</p>
          <Link
            href="/"
            className="btn-primary w-full py-3.5 rounded-2xl shadow-warm hover:shadow-elevated transition-all block text-center font-semibold text-white"
          >
            Go to Home Page
          </Link>
        </div>
      </div>
    );
  }

  const isEmailMatching =
    isAuthenticated &&
    user &&
    user.email?.toLowerCase() === inviteInfo?.email?.toLowerCase();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        {/* App Logo */}
        <div className="flex items-center space-x-3 mb-8 justify-center">
          <div className="w-10 h-10 gradient-primary rounded-2xl flex items-center justify-center shadow-warm">
            <Pill size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-foreground tracking-tight">MediSaathi</span>
        </div>

        <div className="bg-card rounded-3xl shadow-card border border-border p-8 sm:p-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
            <Heart size={32} className="fill-primary/20" />
          </div>

          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            Caregiver Invitation
          </h2>
          <p className="text-muted text-center mb-8 text-sm">
            Connect as a trusted caregiver on MediSaathi
          </p>

          <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-5 mb-8">
            <p className="text-foreground text-base leading-relaxed">
              <span className="font-bold text-primary">{inviteInfo?.patientName}</span> has invited you to connect as their caregiver (<span className="italic font-medium">{inviteInfo?.relationship}</span>).
            </p>
            <div className="mt-4 text-xs text-muted">
              Invitation sent to: <span className="font-semibold text-foreground">{inviteInfo?.email}</span>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-sm text-muted mb-4 text-center">
                Please register or sign in using the email above to accept the invite.
              </p>
              <Link
                href={`/register?inviteToken=${token}&email=${encodeURIComponent(inviteInfo?.email || '')}&role=caregiver`}
                className="w-full btn-primary flex items-center justify-center space-x-2 py-3.5 rounded-2xl shadow-warm hover:shadow-elevated transition-all font-semibold text-white"
              >
                <UserPlus size={20} />
                <span>Create Caregiver Account</span>
              </Link>
              <Link
                href={`/login?inviteToken=${token}&role=caregiver`}
                className="w-full btn-secondary flex items-center justify-center space-x-2 py-3.5 rounded-2xl border border-border hover:bg-border transition-colors font-semibold"
              >
                <LogIn size={20} />
                <span>Sign In to Accept</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {!isEmailMatching && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-2xl p-4 text-sm space-y-2">
                  <div className="flex items-center space-x-2 font-bold">
                    <AlertTriangle size={18} />
                    <span>Account Mismatch</span>
                  </div>
                  <p className="leading-relaxed">
                    You are signed in as <span className="font-bold">{user?.email}</span>, but the invitation was sent to <span className="font-bold">{inviteInfo?.email}</span>.
                  </p>
                  <p className="text-xs text-muted">
                    We recommend switching to the correct account, though you can still choose to accept and link to your current account below.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="w-full btn-primary flex items-center justify-center space-x-2 py-3.5 rounded-2xl shadow-warm hover:shadow-elevated transition-all font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Accept & Connect</span>
                    </>
                  )}
                </button>

                {!isEmailMatching && (
                  <button
                    onClick={handleSwitchAccount}
                    className="w-full text-sm font-semibold text-primary hover:text-primary-dark hover:underline transition-colors block text-center"
                  >
                    Switch to another account
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="bg-card rounded-3xl p-10 border border-border shadow-card max-w-md w-full text-center flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Loading...</h2>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
