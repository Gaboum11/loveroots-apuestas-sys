import toast from 'react-hot-toast';

export const confirmAction = (message: string, onConfirm: () => void) => {
  toast.custom((t) => (
    <div 
      className={`${t.visible ? 'animate-fade-in' : ''} glass-card`}
      style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--accent-primary)',
        boxShadow: '0 10px 40px -10px rgba(139, 92, 246, 0.5)',
        minWidth: '300px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        zIndex: 9999
      }}
    >
      <p style={{ fontWeight: 500, margin: 0 }}>{message}</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button 
          className="btn-secondary" 
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => toast.dismiss(t.id)}
        >
          Cancelar
        </button>
        <button 
          className="btn-primary" 
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => { 
            toast.dismiss(t.id);
            onConfirm(); 
          }}
        >
          Confirmar
        </button>
      </div>
    </div>
  ), {
    duration: Infinity,
    position: 'top-center'
  });
};
