import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const { token } = await res.json();
      localStorage.setItem('token', token);
      navigate('/');
    } else {
      setError('Väärä käyttäjänimi tai salasana');
    }
  };

  return (
    <div className="app">
      <nav className="app-navbar">
        <h1 className="app-title">Lahnan kauppalista</h1>
      </nav>
      <main className="app-content">
        <h2>Kirjaudu sisään</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="käyttäjänimi"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="salasana"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Kirjaudu</button>
        </form>
        {error && <p className="auth-error">{error}</p>}
        <a href="/register" className="auth-link">Luo tili</a>
      </main>
    </div>
  );
}

export default Login;
