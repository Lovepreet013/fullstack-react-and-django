import { useState, useEffect } from "react";
import "../index.css";
import type { Person, Gender, Hobby } from "../types";

interface CustomModalProps {
  activeItem: Person;
  toggle: () => void;
  onSave: (item: Person) => void;
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const HOBBIES: { value: Hobby; label: string }[] = [
  { value: "sports", label: "Sports" },
  { value: "dancing", label: "Dancing" },
  { value: "playing", label: "Playing" },
  { value: "others", label: "Others" },
];

function CustomModal({ activeItem: initialItem, toggle, onSave }: CustomModalProps) {
  const normalize = (item: Person): Person => ({
    ...item,
    gender: (item.gender as Gender) || "other",
    hobbies: Array.isArray(item.hobbies) ? item.hobbies : [],
  });

  const [activeItem, setActiveItem] = useState<Person>(() => normalize(initialItem));
  const [triedSubmit, setTriedSubmit] = useState(false);

  useEffect(() => {
    (() => {
      setActiveItem(normalize(initialItem));
    })()
    
  }, [initialItem]);

  // changes handler for text/email/radio inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setActiveItem({ ...activeItem, [name]: value });
  };

  const handleHobbyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const hobby = value as Hobby;
    setActiveItem((prev) => ({
      ...prev,
      hobbies: checked ? [...prev.hobbies, hobby] : prev.hobbies.filter((h) => h !== hobby),
    }));
  };

  const handleSave = () => {
    setTriedSubmit(true);
    if (!activeItem.gender) return;
    if (!activeItem.hobbies || activeItem.hobbies.length === 0) return;
    if (!activeItem.first_name.trim() || !activeItem.last_name.trim() || !activeItem.email.trim()) return;
    onSave(activeItem);
  };

  const genderError = triedSubmit && !activeItem.gender ? "Gender is required" : "";
  const hobbiesError = triedSubmit && (!activeItem.hobbies || activeItem.hobbies.length === 0) ? "Select at least one hobby" : "";

  return (
    // overlay closes the modal when clicking outside the box
    <div className="modal-overlay" onClick={toggle}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h5>Person Item</h5>
          <button className="modal-close" onClick={toggle}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                name="first_name"
                value={activeItem.first_name}
                onChange={handleChange}
                placeholder="Enter First Name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                name="last_name"
                value={activeItem.last_name}
                onChange={handleChange}
                placeholder="Enter Last Name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                name="email"
                value={activeItem.email}
                onChange={handleChange}
                placeholder="Enter Email"
                required
              />
            </div>

            <div className="form-group">
              <label>Gender *</label>
              <div className="radio-group">
                {GENDERS.map((g) => (
                  <div key={g.value} className="radio-item">
                    <input
                      type="radio"
                      id={`gender-${g.value}`}
                      name="gender"
                      value={g.value}
                      checked={activeItem.gender === g.value}
                      onChange={handleChange}
                      required
                    />
                    <label htmlFor={`gender-${g.value}`} className='radio-label'>
                      {g.label}
                    </label>
                  </div>
                ))}
              </div>
              {genderError ? <span className="field-error">{genderError}</span> : null}
            </div>

            <div className="form-group">
              <label>Hobbies *</label>
              <div className="checkbox-group">
                {HOBBIES.map((h) => (
                  <div key={h.value} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`hobby-${h.value}`}
                      name="hobbies"
                      value={h.value}
                      checked={activeItem.hobbies.includes(h.value)}
                      onChange={handleHobbyChange}
                    />
                    <label htmlFor={`hobby-${h.value}`} className="checkbox-label">
                      {h.label}
                    </label>
                  </div>
                ))}
              </div>
              {hobbiesError ? <span className="field-error">{hobbiesError}</span> : null}
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomModal;
