import React, { useState, useEffect } from "react";
//import { BrowserRouter as Router, Routes, Route, Link } from "react-router";

import "./App.css";
import login from "./pages/login";

import socketIO from 'socket.io-client';


const socket = socketIO.connect('http://localhost:3001');

//this function fetches the table data from the database
const fetchTableData = async(setTableData) => {
  const result = await fetch("/tableData");
  if (!result.ok) {
    throw new Error("failed to fetch data");
  }
  const data = await result.json();
  setTableData(data);
};


/*
This function will remove the item from the shoppinglist.
It makes a post request to the backend where the item 
with the spesific id gets deleted.
*/
function taken(id, setTableData) {
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
    fetchTableData(setTableData);
  })
  .then(() => {
    socket.emit("aProductWasTakenOrAdded");
  })
  .catch(error => {
    console.error('fetch failed:', error);
  });
}

/*
This fiction adds the wanted products to the database by 
making a post request where the formData will be send. 
*/
function Submit({setTableData}) {
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
      socket.emit('hello', 'world');
    })
    .then(() => {
      fetchTableData(setTableData);
    })
    .then(() => {
      socket.emit("aProductWasTakenOrAdded")
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
  socket.on("connect", () => {
    console.log(socket.id);
  });  

  const [tableData, setTableData] = useState(null);



  useEffect(() => {
    // fetches sql database data from backend.
      fetchTableData(setTableData);

      socket.on("update", () => {
        fetchTableData(setTableData);
      });

  }, []);

  return (
    //<Router>
    <div className="App">
      <header className="App-header">
        <h1>Lahnan <br></br>kauppalista</h1>
        <h1>
          <Submit setTableData={setTableData}/>
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
                  <td><button onClick={() => {taken(row.id, setTableData);}}>otettu</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>ladataan dataa...</p>
        )}
      </header>

    </div>
    //</Router>
  );
}
export default App;
