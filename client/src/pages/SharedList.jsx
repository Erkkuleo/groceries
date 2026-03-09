import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import socketIO from 'socket.io-client';
import '../App.css';

const socket = socketIO.connect('/');

function SharedList() {
  const { token } = useParams();
  const [tableData, setTableData] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const fetchData = async () => {
    const res = await fetch(`/api/list/${token}`);
    if (res.ok) setTableData(await res.json());
  };

  useEffect(() => {
    fetchData();
    socket.on('update', fetchData);
    return () => { socket.off('update'); };
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch(`/api/list/${token}/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: inputValue }),
    });
    setInputValue('');
    fetchData();
    socket.emit('aProductWasTakenOrAdded');
  };

  const handleRemove = async (id) => {
    await fetch(`/api/list/${token}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: id }),
    });
    fetchData();
    socket.emit('aProductWasTakenOrAdded');
  };

  return (
    <div className="app">
      <nav className="app-navbar">
        <h1 className="app-title">Lahnan kauppalista</h1>
      </nav>
      <main className="app-content">
        <form className="add-form" onSubmit={handleAdd}>
          <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="lisää tuote..." required />
          <button type="submit">lähetä</button>
        </form>
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
                  <td><button onClick={() => handleRemove(row.id)}>otettu</button></td>
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

export default SharedList;
