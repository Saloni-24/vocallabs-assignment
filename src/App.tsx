import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { nhost } from './lib/nhost'
import './App.css'

type AuthMode = 'login' | 'signup'
type Session = NonNullable<ReturnType<typeof nhost.getUserSession>>

function App() {
  const [session, setSession] = useState<Session | null>(() => nhost.getUserSession())

  useEffect(() => {
    const sync = window.setInterval(() => {
      setSession(nhost.getUserSession())
    }, 500)

    return () => window.clearInterval(sync)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage onAuthed={setSession} />} />
        <Route
          path="/dashboard"
          element={session ? <DashboardPage session={session} onSignOut={() => setSession(null)} /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function AuthPage({ onAuthed }: { onAuthed: (session: Session | null) => void }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [verificationEmailSent, setVerificationEmailSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const verificationRedirectTo = `${window.location.origin}/login`

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setVerificationEmailSent(false)

    try {
      if (mode === 'login') {
        await nhost.auth.signInEmailPassword({ email, password })
      } else {
        await nhost.auth.signUpEmailPassword({ email, password })
      }

      const nextSession = nhost.getUserSession()
      onAuthed(nextSession ?? null)

      if (nextSession) {
        navigate('/dashboard', { replace: true })
      } else {
        await nhost.auth.sendVerificationEmail({
          email,
          options: { redirectTo: verificationRedirectTo },
        })
        setVerificationEmailSent(true)
        setMessage('Account created. If email verification is enabled, check your inbox and then log in.')
        setMode('login')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed.'

      if (/verify|verified/i.test(errorMessage)) {
        setMessage(
          'This account needs email verification before it can log in. Use resend verification below, then click the link in your inbox.',
        )
      } else {
        setMessage(errorMessage)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleResendVerification() {
    if (!email) {
      setMessage('Enter the email address first.')
      return
    }

    setBusy(true)
    setMessage('')

    try {
      await nhost.auth.sendVerificationEmail({
        email,
        options: { redirectTo: verificationRedirectTo },
      })
      setVerificationEmailSent(true)
      setMessage('Verification email sent. Check your inbox and spam folder.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send verification email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="shell auth-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">Nhost + Deepgram</p>
        <h1>Log in, then speak.</h1>
        <p className="lede">
          This demo keeps auth simple and functional: email/password with Nhost, a protected dashboard, and live mic
          transcription through Deepgram.
        </p>
        <div className="callouts">
          <div>
            <span>1</span>
            <strong>Auth</strong>
            <p>Persistent Nhost session.</p>
          </div>
          <div>
            <span>2</span>
            <strong>Stream</strong>
            <p>Browser audio to Deepgram.</p>
          </div>
          <div>
            <span>3</span>
            <strong>Render</strong>
            <p>Real-time transcript output.</p>
          </div>
        </div>
      </section>

      <section className="panel form-panel">
        <div className="mode-switch">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Log in
          </button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={3}
            />
          </label>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Working...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="status">{message || 'Use your Nhost project credentials to continue.'}</p>
        {verificationEmailSent || /verify|verified/i.test(message) ? (
          <button type="button" className="secondary" onClick={() => void handleResendVerification()} disabled={busy}>
            Resend verification email
          </button>
        ) : null}
      </section>
    </main>
  )
}

function DashboardPage({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [status, setStatus] = useState('Idle')
  const [finalLines, setFinalLines] = useState<string[]>([])
  const [partialLine, setPartialLine] = useState('')
  const [listening, setListening] = useState(false)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  async function stopStreaming() {
    setListening(false)
    recorderRef.current?.stop()
    recorderRef.current = null
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
    socketRef.current?.close()
    socketRef.current = null
    setStatus('Idle')
  }

  async function startStreaming() {
    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY

    if (!apiKey) {
      setStatus('Missing VITE_DEEPGRAM_API_KEY')
      return
    }

    try {
      setStatus('Requesting microphone...')
      setFinalLines([])
      setPartialLine('')
      setListening(true)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const url = new URL('wss://api.deepgram.com/v1/listen')
      url.searchParams.set('model', import.meta.env.VITE_DEEPGRAM_MODEL?.trim() || 'nova-3')
      url.searchParams.set('language', import.meta.env.VITE_DEEPGRAM_LANGUAGE?.trim() || 'en')
      url.searchParams.set('punctuate', 'true')
      url.searchParams.set('smart_format', 'true')
      url.searchParams.set('interim_results', 'true')
      url.searchParams.set('endpointing', '200')

      const socket = new WebSocket(url.toString(), ['token', apiKey])
      socketRef.current = socket

      socket.onopen = () => {
        setStatus('Live transcription running')
        const mimeType =
          ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((candidate) =>
            MediaRecorder.isTypeSupported(candidate),
          ) ?? ''

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        recorderRef.current = recorder

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            void event.data.arrayBuffer().then((buffer) => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(buffer)
              }
            })
          }
        }

        recorder.start(250)
      }

      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          return
        }

        try {
          const payload = JSON.parse(event.data) as {
            channel?: { alternatives?: Array<{ transcript?: string }> }
            is_final?: boolean
            speech_final?: boolean
          }

          const transcript = payload.channel?.alternatives?.[0]?.transcript?.trim() ?? ''
          if (!transcript) {
            return
          }

          if (payload.is_final || payload.speech_final) {
            setFinalLines((current) => [...current, transcript])
            setPartialLine('')
          } else {
            setPartialLine(transcript)
          }
        } catch {
          // Ignore non-JSON control messages.
        }
      }

      socket.onerror = () => {
        setStatus('Deepgram socket error')
      }

      socket.onclose = () => {
        recorderRef.current?.stop()
        recorderRef.current = null
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
        socketRef.current = null
        setListening(false)
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not start microphone.')
      await stopStreaming()
    }
  }

  async function handleSignOut() {
    try {
      await nhost.auth.signOut({ refreshToken: session.refreshToken })
    } catch {
      // fall through and clear the local session
    } finally {
      nhost.clearSession()
      onSignOut()
    }
  }

  useEffect(() => {
    return () => {
      recorderRef.current?.stop()
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      socketRef.current?.close()
    }
  }, [])

  return (
    <main className="shell dashboard-shell">
      <header className="topbar panel">
        <div>
          <p className="eyebrow">Protected dashboard</p>
          <h1>Welcome, {session.user?.email ?? 'guest'}</h1>
        </div>
        <button type="button" className="secondary" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <section className="panel controls-panel">
        <div>
          <p className="muted">Status</p>
          <strong>{status}</strong>
        </div>
        <div className="controls">
          {!listening ? (
            <button type="button" className="primary" onClick={() => void startStreaming()}>
              Start mic
            </button>
          ) : (
            <button type="button" className="secondary" onClick={() => void stopStreaming()}>
              Stop mic
            </button>
          )}
        </div>
      </section>

      <section className="panel transcript-panel">
        <div className="transcript-head">
          <p className="eyebrow">Live transcript</p>
          <span>{listening ? 'Streaming' : 'Ready'}</span>
        </div>
        <div className="transcript-box">
          {finalLines.length > 0 ? finalLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>) : <p className="placeholder">Your words will appear here once you start speaking.</p>}
          {partialLine ? <p className="live">{partialLine}</p> : null}
        </div>
      </section>
    </main>
  )
}

export default App
