# CanQr


This project builds a quantum chemistry + quantum computing framework to simulate and optimize drug molecules interacting with biological targets.

It models both:
- **Good targets** (healthy tissues)
- **Bad targets** (cancer or disease-specific sites)

and **optimizes drug parameters** to maximize **binding selectivity**:  
> strong binding to bad targets, weak binding to good targets.

We combine **classical quantum chemistry (PySCF)** with **quantum algorithms (VQE using PennyLane)** to calculate binding energies and optimize drug candidates.

---