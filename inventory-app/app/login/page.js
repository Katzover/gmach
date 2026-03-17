'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'שגיאה בכניסה')
      }
    } catch {
      setError('שגיאת רשת, נסו שוב')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: #0c0e14;
          position: relative;
          z-index: 1;
        }
        .login-wrap::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }
        .login-card {
          background: #13161f;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 2.5rem 2rem;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08);
          position: relative;
          z-index: 1;
          direction: rtl;
        }
        .login-logo {
          text-align: center;
          margin-bottom: 1.75rem;
        }
        .login-logo .emoji { font-size: 2.5rem; }
        .login-logo h1 {
          margin: 0.5rem 0 0.25rem;
          font-size: 1.35rem;
          font-weight: 700;
          color: #eef0f6;
        }
        .login-logo p {
          margin: 0;
          font-size: 0.82rem;
          color: #555d72;
        }
        .login-label {
          display: block;
          font-size: 0.82rem;
          color: #8b92a8;
          margin-bottom: 0.4rem;
          margin-top: 1rem;
        }
        .login-input {
          width: 100%;
          background: #0f1119;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 0.65rem 0.9rem;
          font-size: 1rem;
          color: #eef0f6;
          outline: none;
          transition: border-color 0.18s;
          direction: rtl;
          box-sizing: border-box;
          font-family: inherit;
        }
        .login-input:focus { border-color: rgba(99,179,237,0.5); }
        .login-error {
          background: rgba(248,113,113,0.1);
          border: 1px solid rgba(248,113,113,0.3);
          border-radius: 10px;
          padding: 0.6rem 0.9rem;
          font-size: 0.85rem;
          color: #f87171;
          margin-top: 1rem;
          text-align: center;
        }
        .login-btn {
          width: 100%;
          margin-top: 1.5rem;
          padding: 0.75rem;
          background: #4f8ef7;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.18s, opacity 0.18s;
          font-family: inherit;
        }
        .login-btn:hover:not(:disabled) { background: #3a79e0; }
        .login-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>

      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">
            <div className="emoji">🏛️</div>
            <h1>גמ״ח עיר דוד</h1>
            <p>נא להתחבר כדי להמשיך</p>
          </div>

          <form onSubmit={handleLogin}>
            <label className="login-label" htmlFor="email">אימייל</label>
            <input
              id="email"
              className="login-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
            />

            <label className="login-label" htmlFor="password">סיסמה</label>
            <input
              id="password"
              className="login-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
            />

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'מתחבר...' : 'כניסה'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}