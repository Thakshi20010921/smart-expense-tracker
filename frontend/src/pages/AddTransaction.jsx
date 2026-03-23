import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function AddTransaction() {
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    category: "",
    note: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await API.post("/transactions", {
        ...formData,
        amount: Number(formData.amount),
      });

      alert("Transaction added successfully");
      navigate("/dashboard");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add transaction");
    }
  };

  return (
    <div className="page-center">
      <div className="form-card">
        <h1>Add Transaction</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <select name="type" value={formData.type} onChange={handleChange}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="form-group">
            <input
              type="number"
              name="amount"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              name="category"
              placeholder="Enter category"
              value={formData.category}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              name="note"
              placeholder="Enter note"
              value={formData.note}
              onChange={handleChange}
            />
          </div>

          <button type="submit" style={{ width: "100%" }}>
            Save Transaction
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddTransaction;