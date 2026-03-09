import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      setSuccess('Tili luotu! Voit nyt kirjautua sisään.');
      setTimeout(() => navigate('/login'), 1500);
    } else {
      const body = await res.json();
      setError(body.error || 'Rekisteröinti epäonnistui');
    }
  };

  return (
    <div className="app">
      <nav className="app-navbar">
        <h1 className="app-title">Lahnan kauppalista</h1>
      </nav>
      <main className="app-content">
        <h2>Luo tili</h2>
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
            placeholder="salasana (min. 8 merkkiä)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Rekisteröidy</button>
        </form>
        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}
        <a href="/login" className="auth-link">Kirjaudu sisään</a>
      </main>
    </div>
  );
}

export default Register;
