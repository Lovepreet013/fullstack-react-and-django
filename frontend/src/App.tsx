/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router";
import Modal from "./components/modal";
import PersonDetail from "./components/person-detail";
import "./index.css";
import type { Person } from "./types";
import api from "./api"
import Register from "./components/register";
import Login from "./components/login";
import PrivateRoute from "./components/private-route";
import Profile from "./components/profile";
import { logout } from "./auth";
import { useIsAuthenticated } from "./useAuth";
import type { User } from "./types";


function PersonList() {
  const [activeItem, setActiveItem] = useState<Person>({
    first_name: "",
    last_name: "",
    email: "",
    gender: "other",
    hobbies: [],
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
    api
      .get("/persons/", {
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
        <Link to={`/dashboard/persons/${item.id}`} className="person-name" title={item.email}>
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
      api
        .put(`/persons/${item.id}/`, item)
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
    api
      .post("/persons/", item)
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
      api
        .delete(`/persons/${item.id}/`)
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
    const item: Person = { first_name: "", last_name: "", email: "", gender: "other", hobbies: [] };
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


function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const [me, setMe] = useState<User | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setMe(null);
      return;
    }
    let cancelled = false;
    const fetchMe = () => {
      api
        .get("profile/")
        .then((res) => {
          if (!cancelled) setMe(res.data);
        })
        .catch(() => {
          if (!cancelled) setMe(null);
        });
    };
    fetchMe();
    const onAuthChange = () => fetchMe();
    window.addEventListener("auth-change", onAuthChange);
    return () => {
      cancelled = true;
      window.removeEventListener("auth-change", onAuthChange);
    };
  }, [isAuthenticated]);

  const avatarSrc = me?.avatar_url || me?.avatar || null;
  const displayAvatar = avatarSrc
    ? avatarSrc.startsWith("http") || avatarSrc.startsWith("blob:")
      ? avatarSrc
      : `http://localhost:8000${avatarSrc}`
    : null;

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="nav-brand">
          People
        </Link>
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="nav-avatar-link" title="Profile">
                {displayAvatar ? (
                  <img src={displayAvatar} alt={me?.username || "avatar"} className="nav-avatar" />
                ) : (
                  <span className="nav-avatar nav-avatar-fallback" aria-hidden>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                )}
              </Link>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`nav-link ${location.pathname === "/login" ? "nav-link-active" : ""}`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={`nav-link ${location.pathname === "/register" ? "nav-link-active" : ""}`}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <PersonList />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/persons/:id"
          element={
            <PrivateRoute>
              <PersonDetail />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
