const Transaction = require("../models/Transaction");

const addTransaction = async (req, res) => {
  try {
    const { type, amount, category, note } = req.body;

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amount,
      category,
      note,
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getSummary = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id });

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t) => {
      if (t.type === "income") {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    res.status(200).json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getAlerts = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user._id,
      type: "expense",
    });

    const now = new Date();

    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    let thisWeekTotal = 0;
    let lastWeekTotal = 0;

    transactions.forEach((t) => {
      const tDate = new Date(t.date);

      if (tDate >= startOfThisWeek) {
        thisWeekTotal += t.amount;
      } else if (tDate >= startOfLastWeek && tDate < startOfThisWeek) {
        lastWeekTotal += t.amount;
      }
    });

    let alertMessage = "Your spending is under control";

    if (thisWeekTotal > lastWeekTotal) {
      alertMessage = "You overspent this week";
    }

    res.status(200).json({
      thisWeekTotal,
      lastWeekTotal,
      alert: alertMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getPrediction = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user._id,
      type: "expense",
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const last3MonthsTotals = [0, 0, 0];

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      const monthDiff =
        (currentYear - tDate.getFullYear()) * 12 +
        (currentMonth - tDate.getMonth());

      if (monthDiff >= 1 && monthDiff <= 3) {
        last3MonthsTotals[monthDiff - 1] += t.amount;
      }
    });

    const total = last3MonthsTotals.reduce((sum, value) => sum + value, 0);
    const prediction = total / 3;

    res.status(200).json({
      last3MonthsTotals,
      predictedSpending: prediction,
      message: `Expected spending this month: Rs. ${prediction.toFixed(2)}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addTransaction,
  getTransactions,
  deleteTransaction,
  getSummary,
  getAlerts,
  getPrediction,
};
 
 
 