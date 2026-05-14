"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FcGoogle } from 'react-icons/fc';
import { FaTableTennis } from 'react-icons/fa';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user record
        await setDoc(userDocRef, {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          isApprovedToBet: false,
          role: 'user',
          points: 0,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error signing in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="animate-fade-in" style={{ fontSize: '1.5rem', fontWeight: 500 }}>
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <div className="glass-card animate-fade-in" style={{ 
        maxWidth: '400px', 
        width: '100%', 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            padding: '1rem',
            borderRadius: '50%',
            display: 'inline-flex',
            boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.39)'
          }}>
            <FaTableTennis size={40} color="white" />
          </div>
        </div>

        <div>
          <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>Mysterious Pong</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Betting & Tournament System</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <button 
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
        >
          <FcGoogle size={24} />
          <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          To participate in betting, you must log in and be approved by an administrator after payment.
        </p>
      </div>
    </main>
  );
}
