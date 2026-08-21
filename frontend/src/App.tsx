import { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router";
import Modal from "./components/modal";
import PersonDetail from "./components/person-detail";
import "./index.css";
import axios from "axios";
import type { Person } from "./types";

function PersonList() {
  const [activeItem, setActiveItem] = useState<Person>({
    first_name: "",
    last_name: "",
    email: ""
  });

  const [personList, setPersonList] = useState<Person[]>([]);
  const [modal, setModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortOption, setSortOption] = useState("");
  const PER_PAGE = 5;

  const refreshList = () => {
    axios
      .get("http://localhost:8000/api/persons/", {
        params: {
          page: currentPage,
          search: debouncedSearch || undefined,
          ordering: sortOption || undefined,
        },
      })
      .then((res) => {
        if (res.data.results.length === 0 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
          return;
        }
        setPersonList(res.data.results);
        setTotalCount(res.data.count);
        setTotalPages(Math.max(1, Math.ceil(res.data.count / PER_PAGE)));
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    refreshList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, sortOption]);

  const renderItems = () => {
    return personList.map((item) => (
      <li key={item.id} className="person-item">
        <Link to={`/persons/${item.id}`} className="person-name" title={item.email}>
          {item.first_name} {item.last_name}
        </Link>
        <span className="person-actions">
          <button
            onClick={() => editItem(item)}
            className="btn btn-edit"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="btn btn-delete"
          >
            Delete
          </button>
        </span>
      </li>
    ));
  };

  const toggle = () => {
    setModal(!modal);
  };

  const handleSubmit = (item: Person) => {
    if (item.id) {
      axios
        .put(`http://localhost:8000/api/persons/${item.id}/`, item)
        .then(() => {
          refreshList();
          toggle();
          alert("Person updated: " + JSON.stringify(item));
        })
        .catch((err) => {
          const msg = err.response?.data
            ? JSON.stringify(err.response.data)
            : err.message;
          alert("Failed to update person: " + msg);
        });
      return;
    }
    axios
      .post("http://localhost:8000/api/persons/", item)
      .then(() => {
        if (!debouncedSearch) {
          const newCount = totalCount + 1;
          const lastPage = Math.max(1, Math.ceil(newCount / PER_PAGE));
          if (lastPage !== currentPage) {
            setCurrentPage(lastPage);
            toggle();
            alert("Person added: " + JSON.stringify(item));
            return;
          }
        }
        refreshList();
        toggle();
        alert("Person added: " + JSON.stringify(item));
      })
      .catch((err) => {
        const msg = err.response?.data
          ? JSON.stringify(err.response.data)
          : err.message;
        alert("Failed to add person: " + msg);
      });
  };

  const handleDelete = (item: Person) => {
    if (window.confirm("Are you sure you want to delete this person?")) {
      axios
        .delete(`http://localhost:8000/api/persons/${item.id}/`)
        .then(refreshList)
        .catch((err) => {
          const msg = err.response?.data
            ? JSON.stringify(err.response.data)
            : err.message;
          alert("Failed to delete person: " + msg);
        });
    }
  };

  const createItem = () => {
    const item = { first_name: "", last_name: "", email: "" };
    setActiveItem(item);
    setModal(!modal);
  };

  const editItem = (item: Person) => {
    setActiveItem(item);
    setModal(!modal);
  };

  const handleSortChange = (value: string) => {
    setSortOption(value);
    setCurrentPage(1);
  };

  return (
    <main className="app">
      <header className="app-header">
        <p className="eyebrow">
          {totalCount} {totalCount === 1 ? "person" : "people"} · page {currentPage} of {totalPages}
        </p>
        <h1 className="app-title">People</h1>
      </header>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search persons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="sort-select"
          value={sortOption}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          <option value="">Default</option>
          <option value="first_name">First Name</option>
          <option value="last_name">Last Name</option>
        </select>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <span className="card-meta">
            {debouncedSearch ? `Filtered · ${totalCount} matches` : `${totalCount} total`}
            {sortOption ? ` · sorted by ${sortOption.replace("-", "")}` : ""}
          </span>
          <button onClick={createItem} className="btn btn-add">
            Add person
          </button>
        </div>
        {personList.length === 0 ? (
          <div className="empty-state">No people found.</div>
        ) : (
          <ul className="person-list">{renderItems()}</ul>
        )}
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              className={`page-btn${num === currentPage ? " active" : ""}`}
              onClick={() => setCurrentPage(num)}
            >
              {num}
            </button>
          ))}
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
      {modal ? (
        <Modal activeItem={activeItem} toggle={toggle} onSave={handleSubmit} />
      ) : null}
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<PersonList />} />
      <Route path="/persons/:id" element={<PersonDetail />} />
    </Routes>
  );
}

export default App;
