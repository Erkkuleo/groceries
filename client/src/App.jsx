import { useState, useEffect } from "react";
import "./App.css";
import { useNavigate } from 'react-router-dom';
import socketIO from 'socket.io-client';

const socket = socketIO.connect('/');
socket.on("connect", () => { console.log(socket.id); });

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

const fetchTableData = async (setTableData, navigate) => {
  const result = await fetch("/tableData", { headers: authHeaders() });
  if (result.status === 401) { navigate('/login'); return; }
  if (!result.ok) throw new Error("failed to fetch data");
  setTableData(await result.json());
};

function taken(id, setTableData, navigate) {
  fetch('/api/remove', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ data: id }),
  })
  .then(res => { if (!res.ok) throw new Error('Network error'); return res.json(); })
  .then(() => fetchTableData(setTableData, navigate))
  .then(() => socket.emit("aProductWasTakenOrAdded"))
  .catch(err => console.error('fetch failed:', err));
}

function Submit({ setTableData, navigate }) {
  const [inputValue, setInputValue] = useState("");

  function search(formData) {
    const query = formData.get("query");
    fetch('/api/retrieve', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ data: query }),
    })
    .then(res => { if (!res.ok) throw new Error('Network error'); return res.json(); })
    .then(() => fetchTableData(setTableData, navigate))
    .then(() => socket.emit("aProductWasTakenOrAdded"))
    .catch(err => console.error('fetch failed:', err));
    setInputValue("");
  }

  return (
    <form className="add-form" onSubmit={(e) => { e.preventDefault(); search(new FormData(e.target)); }}>
      <input name="query" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="lisää tuote..." required />
      <button type="submit">lähetä</button>
    </form>
  );
}

function App() {
  const [tableData, setTableData] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return; }
    fetchTableData(setTableData, navigate);
    socket.on("update", () => fetchTableData(setTableData, navigate));
    return () => { socket.off("update"); };
  }, [navigate]);

  const handleShare = async () => {
    const res = await fetch('/api/list/share', { method: 'POST', headers: authHeaders() });
    if (res.ok) {
      const { token } = await res.json();
      const url = `${window.location.origin}/list/${token}`;
      setShareUrl(url);
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="app">
      <nav className="app-navbar">
        <h1 className="app-title">Kauppalista</h1>
        <div className="app-navbar-actions">
          <button onClick={handleShare}>Jaa lista</button>
          <button onClick={handleLogout}>Kirjaudu ulos</button>
        </div>
      </nav>
      {shareUrl && (
        <div className="share-banner">
          Linkki kopioitu: <span>{shareUrl}</span>
        </div>
      )}
      <main className="app-content">
        <Submit setTableData={setTableData} navigate={navigate} />
        {tableData !== null ? (
          <table>
            <thead>
              <tr><th>id</th><th>tuote</th><th>kerätty?</th></tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.product}</td>
                  <td><button onClick={() => taken(row.id, setTableData, navigate)}>otettu</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>ladataan dataa...</p>
        )}
      </main>
    </div>
  );
}

export default App;
