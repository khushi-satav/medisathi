'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Pill, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

function RejectInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    relationship: string;
    patientName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

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

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post('/api/caregiver/invite/respond', {
        token,
        action: 'reject',
      });
      toast.success(response.data.message || 'Invitation declined successfully.');
      setDeclined(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to decline invitation');
    } finally {
      setSubmitting(false);
    }
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

  if (declined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="bg-card rounded-3xl p-8 sm:p-10 border border-border shadow-card max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
            <XCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Invitation Declined</h2>
          <p className="text-muted mb-8">
            You have successfully declined the caregiver invitation from <span className="font-semibold">{inviteInfo?.patientName}</span>. You can now close this tab.
          </p>
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
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-destructive">
            <XCircle size={32} />
          </div>

          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            Decline Invitation
          </h2>
          <p className="text-muted text-center mb-8 text-sm">
            Decline caregiver invitation from {inviteInfo?.patientName}
          </p>

          <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-5 mb-8">
            <p className="text-foreground text-base leading-relaxed text-center">
              Are you sure you want to decline the invitation to become a caregiver for <span className="font-bold text-primary">{inviteInfo?.patientName}</span>?
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDecline}
              disabled={submitting}
              className="w-full btn-primary bg-destructive hover:bg-destructive-dark flex items-center justify-center space-x-2 py-3.5 rounded-2xl shadow-warm hover:shadow-elevated transition-all font-semibold text-white disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Yes, Decline Invitation</span>
              )}
            </button>

            <Link
              href="/"
              className="w-full btn-secondary flex items-center justify-center space-x-2 py-3.5 rounded-2xl border border-border hover:bg-border transition-colors font-semibold block text-center"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RejectInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="bg-card rounded-3xl p-10 border border-border shadow-card max-w-md w-full text-center flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Loading...</h2>
        </div>
      </div>
    }>
      <RejectInviteContent />
    </Suspense>
  );
}
