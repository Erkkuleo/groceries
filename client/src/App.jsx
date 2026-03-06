import React, { useState, useEffect } from "react";
import "./App.css";
import socketIO from 'socket.io-client';

const socket = socketIO.connect('/');

socket.on("connect", () => {
  console.log(socket.id);
});

const fetchTableData = async (setTableData) => {
  const result = await fetch("/tableData");
  if (!result.ok) {
    throw new Error("failed to fetch data");
  }
  const data = await result.json();
  setTableData(data);
};

function taken(id, setTableData) {
  fetch('/api/remove', {
    method: 'POST',
    body: JSON.stringify({ data: id }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network error');
    }
    return response.json();
  })
  .then(() => {
    fetchTableData(setTableData);
  })
  .then(() => {
    socket.emit("aProductWasTakenOrAdded");
  })
  .catch(error => {
    console.error('fetch failed:', error);
  });
}

function Submit({ setTableData }) {
  const [inputValue, setInputValue] = useState("");

  function search(formData) {
    const query = formData.get("query");

    fetch('/api/retrieve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: query }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network error');
      }
      return response.json();
    })
    .then(() => {
      fetchTableData(setTableData);
    })
    .then(() => {
      socket.emit("aProductWasTakenOrAdded");
    })
    .catch(error => {
      console.error('fetch failed:', error);
    });
    setInputValue("");
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    search(formData);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="query" value={inputValue} onChange={handleInputChange} required />
      <button type="submit">lähetä</button>
    </form>
  );
}

function App() {
  const [tableData, setTableData] = useState(null);

  useEffect(() => {
    fetchTableData(setTableData);

    socket.on("update", () => {
      fetchTableData(setTableData);
    });

    return () => {
      socket.off("update");
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Lahnan <br />kauppalista</h1>
        <h1>
          <Submit setTableData={setTableData} />
        </h1>
        {tableData !== null ? (
          <table>
            <thead>
              <tr>
                <th>id</th>
                <th>tuote</th>
                <th>kerätty?</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.product}</td>
                  <td><button onClick={() => { taken(row.id, setTableData); }}>otettu</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>ladataan dataa...</p>
        )}
      </header>
    </div>
  );
}

export default App;
