const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  addTransaction,
  getTransactions,
  deleteTransaction,
  getSummary,
  getAlerts,
  getPrediction
} = require("../controllers/transactionController");

router.get("/summary", protect, getSummary);
router.get("/alerts", protect, getAlerts);
router.get("/prediction", protect, getPrediction);
router.post("/", protect, addTransaction);
router.get("/", protect, getTransactions);
router.delete("/:id", protect, deleteTransaction);
module.exports = router;