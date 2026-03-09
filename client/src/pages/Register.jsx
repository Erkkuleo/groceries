import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div className="App">
      <header className="App-header">
        <h1>Luo tili</h1>
        <form onSubmit={handleSubmit}>
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
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
        <p>
          <a href="/login" style={{ color: 'inherit' }}>Kirjaudu sisään</a>
        </p>
      </header>
    </div>
  );
}

export default Register;
