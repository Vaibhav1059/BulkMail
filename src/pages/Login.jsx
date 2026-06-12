import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Mail, ShieldAlert, ArrowRight, Lock, Eye, EyeOff, User, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const { login, register, token } = useContext(AppContext);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();

  // If already logged in, redirect to Dashboard
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!name || !email || !password || !confirmPassword) {
        setError('Please fill in all fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        const res = await register(name, email, password);
        setSuccessMessage(res.message || 'Registration submitted successfully. Awaiting administrator approval.');
        setRegisteredSuccess(true);
        // Clear registration fields
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } catch (err) {
        setError(err.message || 'Registration failed. Please verify the information and try again.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !password) {
        setError('Please enter both your email and password.');
        return;
      }
      setLoading(true);
      try {
        await login(email, password);
        navigate('/');
      } catch (err) {
        setError(err.message || 'Login failed. Please verify your credentials.');
      } finally {
        setLoading(false);
      }
    }
  };


  if (registeredSuccess) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.blob, ...styles.blobLeft }} />
        <div style={{ ...styles.blob, ...styles.blobRight }} />
        <div style={styles.card}>
          <div style={styles.successHeader}>
            <div style={styles.successIconWrapper}>
              <CheckCircle2 size={32} style={{ color: '#10b981' }} />
            </div>
            <h2 style={styles.successTitle}>Request Submitted</h2>
            <p style={styles.successMessage}>{successMessage}</p>
          </div>
          <button 
            onClick={() => {
              setRegisteredSuccess(false);
              setIsRegister(false);
              setError('');
            }} 
            style={styles.button}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

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

          {isRegister && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrapper}>
                <User size={16} style={styles.inputIcon} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  style={styles.input}
                  disabled={loading}
                  required
                />
              </div>
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

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={16} style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={styles.input}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          )}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading 
              ? (isRegister ? 'Creating Account...' : 'Authenticating...') 
              : (isRegister ? 'Create Account' : 'Sign In')
            }
            {!loading && <ArrowRight size={16} style={{ marginLeft: 8 }} />}
          </button>
        </form>

        <div style={styles.toggleText}>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                }}
                style={styles.toggleLink}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                }}
                style={styles.toggleLink}
              >
                Create Account
              </button>
            </>
          )}
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
    padding: '32px 40px',
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
    marginBottom: '24px',
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
    margin: '0 auto 12px auto',
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
    gap: '16px',
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
    padding: '12px 36px 12px 40px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  eyeBtn: {
    position: 'absolute',
    right: '14px',
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: '8px',
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '20px',
  },
  toggleLink: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: 0,
    fontSize: '13px',
    marginLeft: '4px',
    textDecoration: 'underline',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '20px 0',
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
  successHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  successIconWrapper: {
    width: '64px',
    height: '64px',
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
  },
  successTitle: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  },
  successMessage: {
    color: '#94a3b8',
    fontSize: '13px',
    lineHeight: '1.6',
    margin: 0,
  },
};

export default Login;
