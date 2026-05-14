"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, getDocs, orderBy, addDoc, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [matchesList, setMatchesList] = useState<any[]>([]);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isApprovedToBet) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsFetching(true);
    // Fetch Leaderboard
    const lQuery = query(collection(db, 'users'), orderBy('points', 'desc'));
    const lSnapshot = await getDocs(lQuery);
    setLeaderboard(lSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch Matches
    const mQuery = query(collection(db, 'matches'));
    const mSnapshot = await getDocs(mQuery);
    setMatchesList(mSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch My Bets
    const bQuery = query(collection(db, 'bets'), where('userId', '==', user?.uid));
    const bSnapshot = await getDocs(bQuery);
    setMyBets(bSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    setIsFetching(false);
  };

  const handlePredict = async (matchId: string, predictedWinner: string) => {
    if (!confirm(`Are you sure you want to predict ${predictedWinner} to win? You cannot change this later.`)) return;
    
    try {
      const docRef = await addDoc(collection(db, 'bets'), {
        userId: user!.uid,
        matchId,
        predictedWinner
      });
      setMyBets(prev => [...prev, { id: docRef.id, matchId, predictedWinner, userId: user!.uid }]);
      alert('Prediction saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save prediction.');
    }
  };

  if (loading || !user) {
    return <main style={{ padding: '2rem', textAlign: 'center' }}>Loading...</main>;
  }

  const handleSignOut = () => signOut(auth);

  // Group matches by category
  const matchesByCategory = matchesList.reduce((acc, match) => {
    if (!acc[match.category]) acc[match.category] = [];
    acc[match.category].push(match);
    return acc;
  }, {});

  const getMyPredictionForMatch = (matchId: string) => {
    return myBets.find(b => b.matchId === matchId);
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Welcome, {user.displayName}</h2>
        <button className="btn-secondary" onClick={handleSignOut}>Sign Out</button>
      </header>

      {!user.isApprovedToBet ? (
        <div className="glass-card animate-fade-in" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2 style={{ color: 'var(--warning)', marginBottom: '1rem' }}>Account Pending Approval</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            You have successfully created an account. An administrator must approve your account after verifying your payment before you can start predicting matches.
          </p>
          <button className="btn-secondary" onClick={fetchData} style={{ marginTop: '2rem' }}>Refresh Status</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          {/* Main Dashboard Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Matches & Predictions</h3>
                <button className="btn-secondary" onClick={fetchData} disabled={isFetching}>
                  {isFetching ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Select a match where betting is open to predict the winner. Each correct prediction earns you 1 point.
              </p>
              
              {Object.keys(matchesByCategory).length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No matches created yet.</p>}
              
              {Object.keys(matchesByCategory).map(category => (
                <div key={category} style={{ marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--accent-secondary)' }}>{category}</h4>
                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {matchesByCategory[category].map((match: any) => {
                      const myPrediction = getMyPredictionForMatch(match.id);
                      
                      return (
                        <div key={match.id} style={{ 
                          border: '1px solid var(--glass-border)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '1rem',
                          background: 'rgba(255,255,255,0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ 
                              fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)',
                              background: match.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                              color: match.status === 'completed' ? 'var(--success)' : 'var(--accent-secondary)'
                            }}>
                              {match.status === 'completed' ? `Winner: ${match.winner}` : 'Pending'}
                            </span>
                            {match.bettingOpen && !myPrediction && (
                              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                                Betting Open
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{match.team1}</div>
                            <div style={{ margin: '0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>vs</div>
                            <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{match.team2}</div>
                          </div>

                          {/* Prediction Logic */}
                          {myPrediction ? (
                            <div style={{ 
                              padding: '0.75rem', 
                              borderRadius: 'var(--radius-sm)',
                              background: match.status === 'completed' 
                                ? (match.winner === myPrediction.predictedWinner ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') 
                                : 'rgba(255, 255, 255, 0.05)',
                              border: match.status === 'completed'
                                ? (match.winner === myPrediction.predictedWinner ? '1px solid var(--success)' : '1px solid var(--danger)')
                                : '1px solid var(--glass-border)',
                              textAlign: 'center',
                              fontSize: '0.875rem'
                            }}>
                              Your prediction: <strong>{myPrediction.predictedWinner}</strong>
                              {match.status === 'completed' && (
                                <div style={{ marginTop: '0.25rem', fontWeight: 600, color: match.winner === myPrediction.predictedWinner ? 'var(--success)' : 'var(--danger)' }}>
                                  {match.winner === myPrediction.predictedWinner ? '+1 Point!' : 'Incorrect'}
                                </div>
                              )}
                            </div>
                          ) : (
                            match.bettingOpen ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handlePredict(match.id, match.team1)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}>
                                  Predict {match.team1}
                                </button>
                                <button onClick={() => handlePredict(match.id, match.team2)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}>
                                  Predict {match.team2}
                                </button>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0.5rem' }}>
                                {match.status === 'completed' ? 'Match Over' : 'Betting Closed'}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar / Leaderboard */}
          <div className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
            <div>
              <h3 style={{ marginBottom: '0.5rem' }}>Your Points</h3>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {user.points || 0}
              </div>
            </div>

            <div>
              <h3 style={{ marginBottom: '1rem' }}>Leaderboard</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {leaderboard.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading...</p>}
                {leaderboard.map((u, index) => (
                  <div key={u.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '0.5rem',
                    background: u.uid === user.uid ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <span>{index + 1}. {u.displayName}</span>
                    <span style={{ fontWeight: 600 }}>{u.points || 0} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
