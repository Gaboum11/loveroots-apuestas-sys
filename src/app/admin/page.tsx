"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, getDocs, doc, updateDoc, addDoc, where, increment, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminPortal() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [matchesList, setMatchesList] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [appUrl, setAppUrl] = useState('');

  // Form state for new match
  const [newMatch, setNewMatch] = useState({ category: '', team1: '', team2: '' });

  useEffect(() => {
    setAppUrl(window.location.origin);
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsFetching(true);
    // Fetch users
    const uQuery = query(collection(db, 'users'));
    const uSnapshot = await getDocs(uQuery);
    setUsersList(uSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Fetch matches
    const mQuery = query(collection(db, 'matches'));
    const mSnapshot = await getDocs(mQuery);
    setMatchesList(mSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    
    setIsFetching(false);
  };

  const toggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isApprovedToBet: !currentStatus });
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, isApprovedToBet: !currentStatus } : u));
    } catch (err) {
      alert('Failed to update user approval status.');
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatch.category || !newMatch.team1 || !newMatch.team2) {
      alert('Please fill all fields');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'matches'), {
        category: newMatch.category,
        team1: newMatch.team1,
        team2: newMatch.team2,
        bettingOpen: false,
        status: 'pending',
        winner: null,
      });
      setMatchesList(prev => [...prev, { id: docRef.id, category: newMatch.category, team1: newMatch.team1, team2: newMatch.team2, bettingOpen: false, status: 'pending', winner: null }]);
      setNewMatch({ category: '', team1: '', team2: '' });
    } catch (err) {
      alert('Failed to create match.');
    }
  };

  const toggleBetting = async (matchId: string, currentStatus: boolean) => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, { bettingOpen: !currentStatus });
      setMatchesList(prev => prev.map(m => m.id === matchId ? { ...m, bettingOpen: !currentStatus } : m));
    } catch (err) {
      alert('Failed to toggle betting status.');
    }
  };

  const setWinner = async (matchId: string, winnerName: string) => {
    if (!confirm(`Are you sure you want to set ${winnerName} as the winner? This will award points and close the match.`)) return;
    
    try {
      // 1. Update Match
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        winner: winnerName,
        status: 'completed',
        bettingOpen: false
      });

      // 2. Distribute Points using Batch
      const betsQuery = query(collection(db, 'bets'), where('matchId', '==', matchId));
      const betsSnapshot = await getDocs(betsQuery);
      
      const batch = writeBatch(db);
      
      betsSnapshot.forEach((betDoc) => {
        const betData = betDoc.data();
        if (betData.predictedWinner === winnerName) {
          const userRef = doc(db, 'users', betData.userId);
          batch.update(userRef, { points: increment(1) });
        }
      });
      
      await batch.commit();
      
      // Refresh to get updated points and match statuses
      fetchData();
      alert('Winner set and points distributed!');
    } catch (err) {
      console.error(err);
      alert('Failed to set winner and distribute points.');
    }
  };

  const handleSignOut = () => signOut(auth);

  if (loading || !user || user.role !== 'admin') {
    return <main style={{ padding: '2rem', textAlign: 'center' }}>Loading...</main>;
  }

  // Group matches by category
  const matchesByCategory = matchesList.reduce((acc, match) => {
    if (!acc[match.category]) acc[match.category] = [];
    acc[match.category].push(match);
    return acc;
  }, {});

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Admin Portal - Mysterious Pong</h2>
        <button className="btn-secondary" onClick={handleSignOut}>Sign Out</button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* QR Code Section */}
        <div className="glass-card animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Share App (QR Code)</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', maxWidth: '400px' }}>
              Players can scan this QR code to access the app and log in. Once deployed, the code will automatically point to your live website.
            </p>
            <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'inline-block' }}>
              {appUrl && <QRCodeSVG value={appUrl} size={150} />}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Direct Link:</p>
            <a href={appUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{appUrl}</a>
          </div>
        </div>

        {/* User Management Section */}
        <div className="glass-card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>User Management</h3>
            <button className="btn-secondary" onClick={fetchData} disabled={isFetching}>
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Points</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>{u.displayName}</td>
                    <td style={{ padding: '1rem' }}>{u.points || 0}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
                        backgroundColor: u.isApprovedToBet ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: u.isApprovedToBet ? 'var(--success)' : 'var(--warning)'
                      }}>
                        {u.isApprovedToBet ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button onClick={() => toggleApproval(u.id, u.isApprovedToBet)} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                        {u.isApprovedToBet ? 'Revoke' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Match Section */}
        <div className="glass-card animate-fade-in">
          <h3 style={{ marginBottom: '1rem' }}>Create Match</h3>
          <form onSubmit={handleCreateMatch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Category (e.g. Cuartos de final)</label>
              <input 
                type="text" 
                className="input-field" 
                value={newMatch.category} 
                onChange={e => setNewMatch({...newMatch, category: e.target.value})} 
                placeholder="Category"
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Team 1</label>
              <input 
                type="text" 
                className="input-field" 
                value={newMatch.team1} 
                onChange={e => setNewMatch({...newMatch, team1: e.target.value})} 
                placeholder="Team 1 Name"
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Team 2</label>
              <input 
                type="text" 
                className="input-field" 
                value={newMatch.team2} 
                onChange={e => setNewMatch({...newMatch, team2: e.target.value})} 
                placeholder="Team 2 Name"
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', height: 'fit-content' }}>Add Match</button>
          </form>
        </div>

        {/* Matches List */}
        <div className="glass-card animate-fade-in">
          <h3 style={{ marginBottom: '1.5rem' }}>Matches List</h3>
          
          {Object.keys(matchesByCategory).length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No matches created yet.</p>}
          
          {Object.keys(matchesByCategory).map(category => (
            <div key={category} style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--accent-secondary)' }}>{category}</h4>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {matchesByCategory[category].map((match: any) => (
                  <div key={match.id} style={{ 
                    border: '1px solid var(--glass-border)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: 'var(--radius-sm)',
                        background: match.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                        color: match.status === 'completed' ? 'var(--success)' : 'var(--accent-secondary)'
                      }}>
                        {match.status === 'completed' ? `Winner: ${match.winner}` : 'Pending'}
                      </span>
                      
                      {match.status !== 'completed' && (
                        <button 
                          onClick={() => toggleBetting(match.id, match.bettingOpen)}
                          style={{
                            fontSize: '0.75rem',
                            background: match.bettingOpen ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: match.bettingOpen ? 'var(--danger)' : 'var(--success)',
                            border: match.bettingOpen ? '1px solid var(--danger)' : '1px solid var(--success)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer'
                          }}
                        >
                          {match.bettingOpen ? 'Close Betting' : 'Open Betting'}
                        </button>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{match.team1}</div>
                      <div style={{ margin: '0 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>vs</div>
                      <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{match.team2}</div>
                    </div>

                    {match.status !== 'completed' && !match.bettingOpen && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setWinner(match.id, match.team1)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}>
                          Set {match.team1} as Winner
                        </button>
                        <button onClick={() => setWinner(match.id, match.team2)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}>
                          Set {match.team2} as Winner
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
