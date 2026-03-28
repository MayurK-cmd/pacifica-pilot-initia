const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const tradesRouter = require("./routes/trades");
const configRouter = require("./routes/config");
const agentRouter = require("./routes/agent");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/trades", tradesRouter);
app.use("/api/config", configRouter);
app.use("/api/agent", agentRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Connect MongoDB then start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("[DB] MongoDB connected");
    app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("[DB] Connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;