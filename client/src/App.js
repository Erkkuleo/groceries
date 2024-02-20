import React, { useState, useEffect } from "react";
import "./App.css";


function taken(id) {
  fetch('/api/remove', {
    method: 'POST',
    body: JSON.stringify({data : id}),
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
    window.location.reload();
  })
  .catch(error => {
    console.error('fetch failed:', error);
  });
}

function Submit() {
  const [inputValue, setInputValue] = useState("");

  function search(formData) {
    const query = formData.get("query");

    fetch('/api/retreave', {
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
      window.location.reload();
    })
    .catch(error => {
      console.error('fetch failed:', error);
    });
;

    // Clear the input field
    setInputValue("");
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    search(formData);
  }

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  }

  

  return (
    <form onSubmit={handleSubmit}>
      <input name="query" value={inputValue} onChange={handleInputChange} />
      <button type="submit">Submit</button>
    </form>
  );
}





function App() {
  const [data, setData] = useState(null);
  const [tableData, setTableData] = useState(null);

  useEffect(() => {
    // Fetching initial data
    fetch("/api")
      .then((res) => res.json())
      .then((data) => setData(data.message))
      .catch((error) => console.error(error));

    // Fetching table data
    fetch("/tableData")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch table data");
        }
        return res.json();
      })
      .then((res) => {
        console.log("Table Data:", res);
        setTableData(res);
      })
      .catch((error) => console.error(error));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Lahnan <br></br>kauppalista</h1>
        <h1>
          <Submit/>
        </h1>
        {tableData !== null ? ( // Check for non-null or undefined
          <table>
            <thead>
              <tr>
                <th>id</th>
                <th>product</th>
                <th>check</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.product}</td>
                  <td><button onClick={() => {taken(row.id);}}>Picked</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Loading table data...</p>
        )}
      </header>
    </div>
  );
}
export default App;
