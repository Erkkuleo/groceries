import React, { useState, useEffect } from "react";
import "./App.css";

/*
This function will remove the item from the shoppinglist.
It makes a post request to the backend where the item 
with the spesific id gets deleted.
*/
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

/*
This fiction adds the wanted products to the database by 
making a post request where the formData will be send. 
*/
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
      <button type="submit">lähetä</button>
    </form>
  );
}


function App() {
  const [tableData, setTableData] = useState(null);

  useEffect(() => {
    // fetches sql database data from backend.
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
                <th>tuote</th>
                <th>kerätty?</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.product}</td>
                  <td><button onClick={() => {taken(row.id);}}>otettu</button></td>
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
