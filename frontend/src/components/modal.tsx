import { useState } from "react";
import "../index.css";
import type { Person } from "../types";

interface CustomModalProps {
  activeItem: Person;
  toggle: () => void;
  onSave: (item: Person) => void;
}

function CustomModal({ activeItem: initialItem, toggle, onSave }: CustomModalProps) {
  const [activeItem, setActiveItem] = useState<Person>(initialItem);

  // changes handler for text/email inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setActiveItem({ ...activeItem, [name]: value });
  };

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
          <form>
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                name="first_name"
                value={activeItem.first_name}
                onChange={handleChange}
                placeholder="Enter First Name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={activeItem.last_name}
                onChange={handleChange}
                placeholder="Enter Last Name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                name="email"
                value={activeItem.email}
                onChange={handleChange}
                placeholder="Enter Email"
              />
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn-save" onClick={() => onSave(activeItem)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomModal;