import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Health Check
app.get("/", (_, res) => {
  res.json({ message: "backend works" });
});

// Main API endpoint
app.post("/api/analyze", (req, res) => {
  // Always resolve the full absolute path based on current working directory
  // const scriptPath = path.join(process.cwd(), "QC_subroutine", "run.py");

  // Try both 'python3' and 'python' depending on your system
  console.log("[PYTHON SCRIPT PATH]", path.join(process.cwd(), "QC_subroutine", "run.py"));
  console.log("[CURRENT WORKING DIRECTORY]", process.cwd());
  const python = spawn("python3", ['QC_subroutine/run.py']);
  console.log("[PYTHON SPAWNED]", python);


  let output = "";
  let errorOutput = "";

  python.stdout.on("data", (data) => {
    console.log("[PYTHON STDOUT]", data.toString());
    output += data.toString();
  });

  python.stderr.on("data", (data) => {
    console.error("[PYTHON STDERR]", data.toString());
    errorOutput += data.toString();
  });

  python.on("close", (code) => {
    console.log(`[PYTHON PROCESS CLOSED] with code ${code}`);

    if (code !== 0) {
      return res.status(500).json({
        status: "error",
        message: "Python script failed",
        error: errorOutput,
      });
    }

    try {
      const parsedOutput = JSON.parse(output);
      res.json({
        status: "ok",
        message: "backend works",
        ...parsedOutput,
        receivedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[PARSE ERROR]", err);
      res.status(500).json({
        status: "error",
        message: "Failed to parse Python script output as JSON",
        rawOutput: output,
      });
    }
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening at http://localhost:${PORT}`);
});




// import express from "express";
// import cors from "cors";

// const app = express();

// // ────────────────────────────────
// // Middleware
// // ────────────────────────────────
// app.use(cors());
// app.use(express.json({ limit: "2mb" })); // parse JSON bodies

// // ────────────────────────────────
// // Health‑check (GET /)
// // ────────────────────────────────
// app.get("/", (_, res) => {
//   res.json({ message: "backend works" });
// });

// // ────────────────────────────────
// // Main API endpoint (POST /api/analyze)
// //   Receives an array of graph objects and returns simple metrics.
// // ────────────────────────────────
// app.post("/api/analyze", (req, res) => {
//   const { graphs = [] } = req.body;

//   // Aggregate trivial metrics – you can swap in a real model here later.
//   const metrics = graphs.reduce(
//     (acc, g) => {
//       acc.nodes += Array.isArray(g.x) ? g.x.length : 0;
//       acc.edges += Array.isArray(g.edge_attr) ? g.edge_attr.length : 0;
//       return acc;
//     },
//     { nodes: 0, edges: 0 }
//   );

//   res.json({
//     status: "ok",
//     message: "backend works",
//     graphCount: graphs.length,
//     ...metrics,
//     receivedAt: new Date().toISOString(),
//   });
// });

// // ────────────────────────────────
// // Start server
// // ────────────────────────────────
// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(`API listening on http://localhost:${PORT}`);
// });
