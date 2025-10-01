import React, { useState, useEffect } from "react";

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "transport",
    date: new Date().toISOString().split("T")[0],
  });

  const categories = [
    "transport",
    "food",
    "accommodation",
    "entertainment",
    "shopping",
    "other",
  ];

  useEffect(() => {
    // Load expenses from localStorage
    const savedExpenses = localStorage.getItem("tripExpenses");
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    const expenseToAdd = {
      ...newExpense,
      id: Date.now(),
      amount: parseFloat(newExpense.amount),
    };

    const updatedExpenses = [...expenses, expenseToAdd];
    setExpenses(updatedExpenses);
    localStorage.setItem("tripExpenses", JSON.stringify(updatedExpenses));

    // Reset form
    setNewExpense({
      description: "",
      amount: "",
      category: "transport",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleDelete = (id) => {
    const updatedExpenses = expenses.filter((expense) => expense.id !== id);
    setExpenses(updatedExpenses);
    localStorage.setItem("tripExpenses", JSON.stringify(updatedExpenses));
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  return (
    <div className="expenses-container">
      <h1 className="page-title">Trip Expenses</h1>

      <div className="expense-form-container">
        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              type="text"
              id="description"
              value={newExpense.description}
              onChange={(e) =>
                setNewExpense({ ...newExpense, description: e.target.value })
              }
              placeholder="Enter expense description"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              type="number"
              id="amount"
              value={newExpense.amount}
              onChange={(e) =>
                setNewExpense({ ...newExpense, amount: e.target.value })
              }
              placeholder="Enter amount"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={newExpense.category}
              onChange={(e) =>
                setNewExpense({ ...newExpense, category: e.target.value })
              }
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              value={newExpense.date}
              onChange={(e) =>
                setNewExpense({ ...newExpense, date: e.target.value })
              }
              required
            />
          </div>

          <button type="submit" className="submit-button">
            Add Expense
          </button>
        </form>
      </div>

      <div className="expenses-summary">
        <h2>Total Expenses: ${totalExpenses.toFixed(2)}</h2>
      </div>

      <div className="expenses-list">
        {expenses.length === 0 ? (
          <p className="no-expenses">No expenses recorded yet.</p>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="expense-item">
              <div className="expense-details">
                <h3>{expense.description}</h3>
                <div className="expense-meta">
                  <span className={`category-tag ${expense.category}`}>
                    {expense.category}
                  </span>
                  <span className="expense-date">{expense.date}</span>
                </div>
              </div>
              <div className="expense-amount-section">
                <span className="expense-amount">
                  ${expense.amount.toFixed(2)}
                </span>
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="delete-expense"
                  title="Delete expense"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Expenses;
