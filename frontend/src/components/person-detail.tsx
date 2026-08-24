import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import type { Person } from "../types";
import api from "../api"

function PersonDetail() {
  const { id } = useParams();
  const [person, setPerson] = useState<Person | null>(null);

  useEffect(() => {
    api
      .get(`/persons/${id}/`)
      .then((res) => setPerson(res.data))
      .catch((err) => console.log(err));
  }, [id]);

  if (!person) {
    return <p>Loading...</p>;
  }

  const hobbyLabels: Record<string, string> = {
    sports: "Sports",
    dancing: "Dancing",
    playing: "Playing",
    others: "Others",
  };

  return (
    <main className="app">
      <div className="card detail-card">
        <h1 className="detail-name">
          {person.first_name} {person.last_name}
        </h1>
        <p className="detail-email">{person.email}</p>
        <div className="detail-meta">
          <p className="detail-row">
            <span className="detail-label">Gender</span>
            <span className="detail-value">{person.gender ? person.gender.charAt(0).toUpperCase() + person.gender.slice(1) : "—"}</span>
          </p>
          <p className="detail-row">
            <span className="detail-label">Hobbies</span>
            <span className="detail-value">
              {person.hobbies && person.hobbies.length > 0
                ? person.hobbies.map((h) => hobbyLabels[h] || h).join(", ")
                : "—"}
            </span>
          </p>
        </div>
        <Link to="/" className="btn btn-back">
          Back to list
        </Link>
      </div>
    </main>
  );
}

export default PersonDetail;