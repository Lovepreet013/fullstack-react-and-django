import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import axios from "axios";
import type { Person } from "../types";

function PersonDetail() {
  const { id } = useParams();
  const [person, setPerson] = useState<Person | null>(null);

  useEffect(() => {
    axios
      .get(`http://localhost:8000/api/persons/${id}/`)
      .then((res) => setPerson(res.data))
      .catch((err) => console.log(err));
  }, [id]);

  if (!person) {
    return <p>Loading...</p>;
  }

  return (
    <main className="app">
      <div className="card detail-card">
        <h1 className="detail-name">
          {person.first_name} {person.last_name}
        </h1>
        <p className="detail-email">{person.email}</p>
        <Link to="/" className="btn btn-back">
          Back to list
        </Link>
      </div>
    </main>
  );
}

export default PersonDetail;