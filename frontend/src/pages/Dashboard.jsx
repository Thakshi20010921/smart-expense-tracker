import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

function Dashboard() {
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });
  const [alerts, setAlerts] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedType, setSelectedType] = useState("all");

  // for now hardcoded budget goal
  const monthlyBudgetGoal = 5000;

  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/");
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [summaryRes, alertsRes, predictionRes, transactionsRes] =
        await Promise.all([
          API.get("/transactions/summary"),
          API.get("/transactions/alerts"),
          API.get("/transactions/prediction"),
          API.get("/transactions"),
        ]);

      setSummary(summaryRes.data);
      setAlerts(alertsRes.data);
      setPrediction(predictionRes.data);
      setTransactions(transactionsRes.data || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load dashboard data");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const filteredTransactions = useMemo(() => {
    if (selectedType === "all") return transactions;
    return transactions.filter((t) => t.type === selectedType);
  }, [transactions, selectedType]);

  const budgetUsage = useMemo(() => {
    if (summary.totalIncome <= 0) return 0;
    return ((summary.totalExpense / summary.totalIncome) * 100).toFixed(1);
  }, [summary]);

  const budgetGoalUsage = useMemo(() => {
    if (monthlyBudgetGoal <= 0) return 0;
    return ((summary.totalExpense / monthlyBudgetGoal) * 100).toFixed(1);
  }, [summary.totalExpense]);

  const remainingBudgetGoal = useMemo(() => {
    return Math.max(0, monthlyBudgetGoal - summary.totalExpense);
  }, [summary.totalExpense]);

  const healthScore = useMemo(() => {
    if (summary.totalIncome <= 0) return 35;

    const expenseRatio = summary.totalExpense / summary.totalIncome;
    let score = 100;

    if (expenseRatio > 1) score -= 40;
    else if (expenseRatio > 0.8) score -= 25;
    else if (expenseRatio > 0.6) score -= 10;

    if (alerts?.alert === "You overspent this week") score -= 15;
    if (
      (prediction?.predictedSpending || 0) > summary.totalExpense &&
      summary.totalExpense > 0
    ) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [summary, alerts, prediction]);

  const pieData = useMemo(() => {
    return [
      { name: "Funds", value: summary.totalIncome },
      { name: "Expense", value: summary.totalExpense },
    ];
  }, [summary]);

  const categoryData = useMemo(() => {
    const map = {};

    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });

    return Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [filteredTransactions]);

  const dailyTrendData = useMemo(() => {
    const dayMap = {};

    transactions.forEach((t) => {
      const date = new Date(t.date);
      const key = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });

      if (!dayMap[key]) {
        dayMap[key] = { date: key, funds: 0, expense: 0 };
      }

      if (t.type === "income") {
        dayMap[key].funds += Number(t.amount);
      } else {
        dayMap[key].expense += Number(t.amount);
      }
    });

    const data = Object.values(dayMap);

    let cumulativeExpense = 0;
    return data.map((item) => {
      cumulativeExpense += item.expense;
      return {
        ...item,
        cumulativeExpense,
      };
    });
  }, [transactions]);

  const highestCategory = useMemo(() => {
    if (categoryData.length === 0) return "N/A";
    return categoryData.reduce((max, item) =>
      item.amount > max.amount ? item : max
    ).category;
  }, [categoryData]);

  const unusualTransaction = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    if (expenses.length === 0) return null;

    const avg =
      expenses.reduce((sum, t) => sum + Number(t.amount), 0) / expenses.length;

    return expenses.find((t) => Number(t.amount) > avg * 2) || null;
  }, [transactions]);

  const daysLeft = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");

    if (expenses.length === 0) return "N/A";

    const total = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const days = new Set(
      expenses.map((t) => new Date(t.date).toDateString())
    ).size;

    const dailyAvg = total / days;

    if (dailyAvg === 0 || summary.balance <= 0) return 0;

    return Math.floor(summary.balance / dailyAvg);
  }, [transactions, summary.balance]);

  const weeklyIncrease = useMemo(() => {
    if (!alerts || !alerts.lastWeekTotal || alerts.lastWeekTotal === 0) return null;
    if (alerts.thisWeekTotal <= alerts.lastWeekTotal) return null;

    return (
      ((alerts.thisWeekTotal - alerts.lastWeekTotal) / alerts.lastWeekTotal) *
      100
    ).toFixed(1);
  }, [alerts]);

  const smartInsights = useMemo(() => {
    const insights = [];

    if (highestCategory && highestCategory !== "N/A") {
      insights.push(`Your highest spending category is ${highestCategory}.`);
    }

    if (weeklyIncrease) {
      insights.push(
        `Your spending increased by ${weeklyIncrease}% compared to last week.`
      );
    } else if (alerts?.alert) {
      insights.push(alerts.alert);
    }

    if (summary.balance < 0) {
      insights.push("Your expenses are higher than your available funds.");
    } else if (summary.balance === 0) {
      insights.push("You have fully used your available funds.");
    } else {
      insights.push(`You still have Rs. ${summary.balance} remaining.`);
    }

    if (summary.totalExpense > 0 && summary.totalIncome > 0) {
      if (Number(budgetUsage) >= 90) {
        insights.push(
          `You have already used ${budgetUsage}% of your available funds.`
        );
      } else if (Number(budgetUsage) >= 70) {
        insights.push(
          `You have used ${budgetUsage}% of your available funds. Spend carefully.`
        );
      } else {
        insights.push(`You have used ${budgetUsage}% of your available funds.`);
      }
    }

    if (Number(budgetGoalUsage) >= 100) {
      insights.push("You have exceeded your monthly budget goal.");
    } else if (Number(budgetGoalUsage) >= 80) {
      insights.push("You are close to reaching your monthly budget limit.");
    }

    if (
      (prediction?.predictedSpending || 0) > summary.totalExpense &&
      summary.totalExpense > 0
    ) {
      insights.push("Your forecast suggests your spending may increase this month.");
    }

    if (unusualTransaction) {
      insights.push(
        `An unusual expense of Rs. ${unusualTransaction.amount} was detected in ${unusualTransaction.category}.`
      );
    }

    if (daysLeft !== "N/A") {
      insights.push(`At your current spending rate, your money may last about ${daysLeft} more days.`);
    }

    return insights;
  }, [
    highestCategory,
    weeklyIncrease,
    alerts,
    summary,
    prediction,
    unusualTransaction,
    budgetUsage,
    budgetGoalUsage,
    daysLeft,
  ]);

  const COLORS = ["#22c55e", "#ef4444"];

  return (
  <div className="bi-container">
    <div className="bi-topbar">
      <div>
        <p className="bi-eyebrow">Student Finance Intelligence Dashboard</p>
        <h1>Smart Expense Tracker</h1>
      </div>

      <div className="bi-topbar-actions">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bi-select"
        >
          <option value="all">All Transactions</option>
          <option value="income">Funds Only</option>
          <option value="expense">Expenses Only</option>
        </select>

        <Link to="/add-transaction">
          <button>Add Transaction</button>
        </Link>

        <button onClick={handleLogout} className="secondary-btn">
          Logout
        </button>
      </div>
    </div>

    <div className="kpi-grid">
      <div className="kpi-card">
        <span>Total Allowance / Funds</span>
        <h2>Rs. {summary.totalIncome}</h2>
      </div>

      <div className="kpi-card">
        <span>Total Expense</span>
        <h2>Rs. {summary.totalExpense}</h2>
      </div>

      <div className={`kpi-card ${summary.balance < 0 ? "kpi-danger" : "kpi-good"}`}>
        <span>Remaining Balance</span>
        <h2>Rs. {summary.balance}</h2>
      </div>

      <div
        className={`kpi-card ${
          Number(budgetUsage) >= 90
            ? "kpi-danger"
            : Number(budgetUsage) >= 70
            ? "kpi-warning"
            : "kpi-good"
        }`}
      >
        <span>Budget Usage</span>
        <h2>{summary.totalIncome > 0 ? `${budgetUsage}%` : "0%"}</h2>
      </div>

      <div
        className={`kpi-card ${
          healthScore >= 80 ? "kpi-good" : healthScore >= 60 ? "kpi-warning" : "kpi-danger"
        }`}
      >
        <span>Financial Health Score</span>
        <h2>{healthScore}/100</h2>
      </div>

      <div className="kpi-card">
        <span>Days Left</span>
        <h2>{daysLeft === "N/A" ? "N/A" : `${daysLeft} days`}</h2>
      </div>
    </div>

    <div className="dashboard-shell">
      <div className="content-column">
        <div className="panel">
          <div className="panel-header">
            <h3>Daily Trend</h3>
            <p>Funds, expenses, and cumulative spending over time</p>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="funds"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeExpense"
                  stroke="#facc15"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-bottom-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Funds vs Expense Share</h3>
              <p>High-level distribution</p>
            </div>

            <div className="chart-wrap donut-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    innerRadius={65}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="donut-center-text">
                <span>Total Funds</span>
                <strong>Rs. {summary.totalIncome}</strong>
                <small>Used {summary.totalIncome > 0 ? `${budgetUsage}%` : "0%"}</small>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Category Spending</h3>
              <p>Expense breakdown by category</p>
            </div>

            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="category" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Recent Transactions</h3>
            <p>Operational transaction view</p>
          </div>

          {filteredTransactions.length === 0 ? (
            <p className="muted">No transactions found</p>
          ) : (
            <div className="table-wrap">
              <table className="bi-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Note</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions
                    .slice()
                    .reverse()
                    .map((t) => (
                      <tr key={t._id}>
                        <td>
                          <span className={`pill ${t.type}`}>{t.type}</span>
                        </td>
                        <td>Rs. {t.amount}</td>
                        <td>{t.category}</td>
                        <td>{t.note || "-"}</td>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-column">
        <div className="panel insight-card">
          <h3>Overspending Alert</h3>
          <p>{alerts?.alert || "No alert available"}</p>
          <span>This Week: Rs. {alerts?.thisWeekTotal ?? 0}</span>
          <span>Last Week: Rs. {alerts?.lastWeekTotal ?? 0}</span>
        </div>

        <div className="panel insight-card">
          <h3>Forecast</h3>
          <p>{prediction?.message || "No prediction available"}</p>
        </div>

        <div className="panel insight-card">
          <h3>Top Expense Category</h3>
          <p>{highestCategory}</p>
        </div>

        <div className="panel insight-card">
          <h3>Anomaly Watch</h3>
          <p>
            {unusualTransaction
              ? `Unusual expense: Rs. ${unusualTransaction.amount} in ${unusualTransaction.category}`
              : "No unusual transaction detected"}
          </p>
        </div>

        <div className="panel insight-card">
          <h3>Budget Goal</h3>
          <p>Monthly Goal: Rs. {monthlyBudgetGoal}</p>
          <p>Used: {budgetGoalUsage}%</p>
          <p>Remaining: Rs. {remainingBudgetGoal}</p>

          <div className="budget-progress">
            <div
              className="budget-progress-fill"
              style={{ width: `${Math.min(Number(budgetGoalUsage), 100)}%` }}
            />
          </div>
        </div>

        <div className="panel insight-card">
          <h3>Smart Insights</h3>
          {smartInsights.length === 0 ? (
            <p>No insights available</p>
          ) : (
            <ul className="insight-list">
              {smartInsights.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  </div>
);
  
}

export default Dashboard;