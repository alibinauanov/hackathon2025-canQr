import express from "express";
import cors from "cors";

const app = express();

// ────────────────────────────────
// Middleware
// ────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "2mb" })); // parse JSON bodies

// ────────────────────────────────
// Health‑check (GET /)
// ────────────────────────────────
app.get("/", (_, res) => {
  res.json({ message: "backend works" });
});

// ────────────────────────────────
// Main API endpoint (POST /api/analyze)
//   Receives an array of graph objects and returns simple metrics.
// ────────────────────────────────
app.post("/api/analyze", (req, res) => {
  const { graphs = [] } = req.body;

  // Aggregate trivial metrics – you can swap in a real model here later.
  const metrics = graphs.reduce(
    (acc, g) => {
      acc.nodes += Array.isArray(g.x) ? g.x.length : 0;
      acc.edges += Array.isArray(g.edge_attr) ? g.edge_attr.length : 0;
      return acc;
    },
    { nodes: 0, edges: 0 }
  );

  res.json({
    status: "ok",
    message: "backend works",
    graphCount: graphs.length,
    ...metrics,
    receivedAt: new Date().toISOString(),
  });
});

// ────────────────────────────────
// Start server
// ────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
