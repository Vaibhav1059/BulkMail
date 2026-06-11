import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Mail, ShieldAlert, ArrowRight } from 'lucide-react';

export const Login = () => {
  const { login, token } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // If already logged in, redirect to Dashboard
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setError('');
  };

  return (
    <div style={styles.container}>
      {/* Background blobs for premium glassmorphism layout */}
      <div style={{ ...styles.blob, ...styles.blobLeft }} />
      <div style={{ ...styles.blob, ...styles.blobRight }} />

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>A</div>
          <h1 style={styles.title}>AeroSend</h1>
          <p style={styles.subtitle}>Campaign Delivery Management System</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBanner}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Corporate Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vaibhavsoni1059@gmail.com"
                style={styles.input}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={16} style={{ marginLeft: 8 }} />}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>Demo Access Accounts</span>
        </div>

        <div style={styles.demoContainer}>
          <p style={styles.demoHelp}>Click to quick login with a demo account:</p>
          <div style={styles.demoButtons}>
            <button
              onClick={() => handleQuickLogin('vaibhavsoni1059@gmail.com')}
              style={{
                ...styles.demoBtn,
                ...(email === 'vaibhavsoni1059@gmail.com' ? styles.demoBtnActive : {}),
              }}
            >
              Vaibhav Soni (vaibhavsoni1059@gmail.com)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    zIndex: 9999,
    overflow: 'hidden',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(100px)',
    opacity: 0.35,
    pointerEvents: 'none',
  },
  blobLeft: {
    width: '350px',
    height: '350px',
    background: '#4f46e5',
    top: '15%',
    left: '10%',
  },
  blobRight: {
    width: '400px',
    height: '400px',
    background: '#8b5cf6',
    bottom: '15%',
    right: '10%',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(255, 255, 255, 0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    margin: '16px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 'bold',
    margin: '0 auto 16px auto',
    boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
  },
  title: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '800',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '13px',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    color: '#fca5a5',
    fontSize: '12px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#94a3b8',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#64748b',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '12px 14px 12px 40px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  button: {
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
  },
  dividerText: {
    color: '#475569',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '0 8px',
    width: '100%',
    textAlign: 'center',
  },
  demoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  demoHelp: {
    color: '#64748b',
    fontSize: '11px',
    margin: '0 0 4px 0',
    textAlign: 'center',
  },
  demoButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  demoBtn: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#94a3b8',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
  },
  demoBtnActive: {
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    color: '#ffffff',
  },
  demoRole: {
    fontSize: '9px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#cbd5e1',
  },
};

export default Login;
