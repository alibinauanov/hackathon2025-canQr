import { useState, useRef } from 'react';
import OCL from 'openchemlib';
import { useNavigate } from 'react-router-dom';
import './App.css';
import logo from './output_images/logo.png';

const API_BASE = 'http://localhost:4000'; // import.meta.env.VITE_API_BASE ?? 

/********************
 * GRAPH UTILITIES  *
 *******************/

/** One‑hot encode a value against a permitted list */
function oneHot(x, permitted) {
  const safe = permitted.includes(x) ? x : permitted[permitted.length - 1];
  return permitted.map((v) => (v === safe ? 1 : 0));
}

// ---- Atom featurisation ----------------------------------------------

// A reduced set of elements that covers 99 % of drug‑like chemistry.
const ATOM_LIST = [
  'C',
  'N',
  'O',
  'S',
  'F',
  'P',
  'Cl',
  'Br',
  'I',
  'B',
  'Other',
];

// Simple lookup tables for radii (Å). Undefined elements fall back to mean.
const VDW_RADIUS = {
  1: 1.2,
  6: 1.7,
  7: 1.55,
  8: 1.52,
  9: 1.47,
  15: 1.8,
  16: 1.8,
  17: 1.75,
  35: 1.85,
  53: 1.98,
};
const COV_RADIUS = {
  1: 0.31,
  6: 0.76,
  7: 0.71,
  8: 0.66,
  9: 0.57,
  15: 1.07,
  16: 1.05,
  17: 1.02,
  35: 1.2,
  53: 1.39,
};

function getAtomFeatures(mol, idx, { useChirality = true, hydrogensImplicit = true } = {}) {
  const atomicNo = mol.getAtomicNo(idx);
  const symbol = OCL.Molecule.cAtomLabel[atomicNo] ?? 'Other';

  const atomType = oneHot(symbol, ATOM_LIST);

  // Degree counts heavy neighbours only
  const degree = [...Array(mol.getConnAtoms(idx)).keys()]
    .map((i) => mol.getAtomicNo(mol.getConnAtom(idx, i)))
    .filter((z) => z !== 1).length;
  const degreeEnc = oneHot(Math.min(degree, 4), [0, 1, 2, 3, 4]);

  const formalCharge = mol.getAtomCharge(idx);
  const chargeEnc = oneHot(Math.max(Math.min(formalCharge, 3), -3), [-3, -2, -1, 0, 1, 2, 3]);

  const inRing = mol.isRingAtom(idx) ? 1 : 0;
  const aromatic = mol.isAromaticAtom(idx) ? 1 : 0;

  const mass = OCL.Molecule.cRoundedMass[atomicNo] ?? 0;
  const massScaled = (mass - 10.812) / 116.092;

  const vdw = VDW_RADIUS[atomicNo] ?? 1.5;
  const vdwScaled = (vdw - 1.5) / 0.6;

  const cov = COV_RADIUS[atomicNo] ?? 0.64;
  const covScaled = (cov - 0.64) / 0.76;

  let feat = [
    ...atomType,
    ...degreeEnc,
    ...chargeEnc,
    inRing,
    aromatic,
    massScaled,
    vdwScaled,
    covScaled,
  ];

  if (useChirality) {
    const parity = mol.getAtomParity(idx);
    // 0‑3 correspond roughly to RDKit tags in the blog post
    feat = [...feat, ...oneHot(parity ?? 0, [0, 1, 2, 3])];
  }

  if (hydrogensImplicit) {
    const hCount = mol.getImplicitHydrogens(idx);
    feat = [...feat, ...oneHot(Math.min(hCount, 4), [0, 1, 2, 3, 4])];
  }
  return feat;
}

// ---- Bond featurisation ----------------------------------------------

function getBondFeatures(mol, bondIdx, { useStereo = true } = {}) {
  const order = mol.getBondOrder(bondIdx);
  const aromatic = mol.isAromaticBond(bondIdx);

  const bondTypeEnc = aromatic
    ? [0, 0, 0, 1] // aromatic one‑hot slot
    : oneHot(Math.min(order, 3), [1, 2, 3]).concat([0]);

  const conj = mol.isAromaticBond(bondIdx) ? 1 : 0; // proxy for conjugation
  const inRing = mol.isRingBond(bondIdx) ? 1 : 0;

  let feat = [...bondTypeEnc, conj, inRing];

  if (useStereo) {
    const parity = mol.getBondParity(bondIdx);
    // map undefined -> 3
    feat = [...feat, ...oneHot(parity ?? 3, [1, 2, 0, 3])];
  }
  return feat;
}

// ---- Graph builder ----------------------------------------------------

export function graphFromSmiles(smiles, label = 0) {
  const mol = OCL.Molecule.fromSmiles(smiles);
  mol.addImplicitHydrogens();
  mol.ensureHelperArrays(
    OCL.Molecule.cHelperNeighbours |
      OCL.Molecule.cHelperRings |
      OCL.Molecule.cHelperAromaticBonds,
  );

  const nAtoms = mol.getAllAtoms();
  const nodeFeat = [];
  for (let i = 0; i < nAtoms; i++) {
    nodeFeat.push(getAtomFeatures(mol, i));
  }

  const edgeIndex = [[], []];
  const edgeFeat = [];
  const nBonds = mol.getAllBonds();
  for (let b = 0; b < nBonds; b++) {
    const a = mol.getBondAtom(0, b);
    const c = mol.getBondAtom(1, b);
    // undirected -> add both directions
    edgeIndex[0].push(a, c);
    edgeIndex[1].push(c, a);

    const feat = getBondFeatures(mol, b);
    edgeFeat.push(feat, feat);
  }

  return {
    x: nodeFeat, // (nAtoms, nNodeFeatures)
    edge_index: edgeIndex, // [2, nEdges]
    edge_attr: edgeFeat, // (nEdges, nEdgeFeatures)
    y: label,
  };
}

/********************
 * REACT COMPONENT  *
 *******************/



// function App() {
//   const [goodMolecule, setGoodMolecule] = useState('');
//   const [badMolecule, setBadMolecule] = useState('');
//   const [drug, setDrug] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [errors, setErrors] = useState({ good: '', bad: '', drug: '' });

//   // Canvas refs
//   const goodCanvasRef = useRef(null);
//   const badCanvasRef = useRef(null);
//   const drugCanvasRef = useRef(null);

//   /** Draw a 2‑D depiction of a SMILES on a canvas */
//   const draw = (smiles, canvasRef, key) => {
//     if (!canvasRef.current) return;
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext('2d');
//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     if (!smiles.trim()) {
//       setErrors((e) => ({ ...e, [key]: '' }));
//       return;
//     }

//     try {
//       console.log(`Depict ${key}:`, smiles);
//       const mol = OCL.Molecule.fromSmiles(smiles);
//       mol.addImplicitHydrogens();
//       mol.inventCoordinates();
//       const svg = mol.toSVG(canvas.width, canvas.height, undefined, { autoCrop: true });
//       const img = new Image();
//       img.onload = () => ctx.drawImage(img, 0, 0);
//       img.onerror = () => setErrors((e) => ({ ...e, [key]: 'Render error' }));
//       img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
//       setErrors((e) => ({ ...e, [key]: '' }));
//     } catch (_) {
//       setErrors((e) => ({ ...e, [key]: 'Invalid SMILES' }));
//     }
//   };

//   const handleGenerate = (smiles, ref, key) => {
//     setIsLoading(true);
//     requestAnimationFrame(() => {
//       draw(smiles, ref, key);
//       setIsLoading(false);
//     });
//   };

//   const navigate = useNavigate();

//   const handleSubmit = async () => {
//     const graphs = [];
//     if (goodMolecule) graphs.push(graphFromSmiles(goodMolecule, 1));
//     if (badMolecule)  graphs.push(graphFromSmiles(badMolecule, 0));
//     if (drug)         graphs.push(graphFromSmiles(drug, 2));

//     console.log('%cGraphs ready for POST:', 'color:#0aad28', graphs);

//     try {
//       setIsLoading(true);

//       console.log('POST →', `${API_BASE}/api/analyze`);
//       const res = await fetch(`${API_BASE}/api/analyze`, {
//         method : 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body   : JSON.stringify({ graphs }),
//       });
//       if (!res.ok) throw new Error(`Server replied ${res.status}`);

//       const metrics = await res.json();
//       console.log('%cMetrics received:', 'color:#0aad28', metrics);

//       await new Promise(resolve => setTimeout(resolve, 3000));

//       // 👉 jump to /result and hand over the data
//       navigate('/result', { state: { metrics } });
//     } catch (err) {
//       console.error(err);
//       alert(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="App">
//       {isLoading ? (
//         <div className="loading-overlay">
//           <div className="spinner"></div>
//           <div className="molecule-loader">
//             ⚛️
//           </div>
//           <p>Analyzing molecules, please wait...</p>
//         </div>
//       ) : (
//         <>
//           <header className="app-header flex items-center gap-4 mb-8">
//             <img src={logo} alt="Logo" className="logo" />
//             <h1 className="team-title">Team 5 - canQr</h1>
//           </header>

//           <h1 className="text-2xl font-semibold mb-4">Molecule Analyzer</h1>

//           <div className="input-group">
//             <MoleculeInput label="Healthy Molecule" smiles={goodMolecule} onChange={setGoodMolecule} onGenerate={() => handleGenerate(goodMolecule, goodCanvasRef, 'good')} canvasRef={goodCanvasRef} error={errors.good} />
//             <MoleculeInput label="Cancer Molecule" smiles={badMolecule} onChange={setBadMolecule} onGenerate={() => handleGenerate(badMolecule, badCanvasRef, 'bad')} canvasRef={badCanvasRef} error={errors.bad} />
//             <MoleculeInput label="Drug Molecule" smiles={drug} onChange={setDrug} onGenerate={() => handleGenerate(drug, drugCanvasRef, 'drug')} canvasRef={drugCanvasRef} error={errors.drug} />
//           </div>

//           <button className={`submit-btn ${isLoading ? 'loading' : ''}`} onClick={handleSubmit} disabled={isLoading}>
//             {isLoading ? 'Processing…' : 'Analyze Molecules'}
//           </button>
//         </>
//       )}
//     </div>
//   );
// }
function App() {
  const [goodMolecule, setGoodMolecule] = useState('');
  const [badMolecule, setBadMolecule] = useState('');
  const [drug, setDrug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ good: '', bad: '', drug: '' });

  // Canvas refs
  const goodCanvasRef = useRef(null);
  const badCanvasRef = useRef(null);
  const drugCanvasRef = useRef(null);

  /** Draw a 2‑D depiction of a SMILES on a canvas */
  const draw = (smiles, canvasRef, key) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!smiles.trim()) {
      setErrors((e) => ({ ...e, [key]: '' }));
      return;
    }

    try {
      console.log(`Depict ${key}:`, smiles);
      const mol = OCL.Molecule.fromSmiles(smiles);
      mol.addImplicitHydrogens();
      mol.inventCoordinates();
      const svg = mol.toSVG(canvas.width, canvas.height, undefined, { autoCrop: true });
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.onerror = () => setErrors((e) => ({ ...e, [key]: 'Render error' }));
      img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      setErrors((e) => ({ ...e, [key]: '' }));
    } catch (_) {
      setErrors((e) => ({ ...e, [key]: 'Invalid SMILES' }));
    }
  };

  const handleGenerate = (smiles, ref, key) => {
    setIsLoading(true);
    requestAnimationFrame(() => {
      draw(smiles, ref, key);
      setIsLoading(false);
    });
  };

  const navigate = useNavigate();

  const handleSubmit = async () => {
    const graphs = [];
    if (goodMolecule) graphs.push(graphFromSmiles(goodMolecule, 1));
    if (badMolecule)  graphs.push(graphFromSmiles(badMolecule, 0));
    if (drug)         graphs.push(graphFromSmiles(drug, 2));

    console.log('%cGraphs ready for POST:', 'color:#0aad28', graphs);

    try {
      setIsLoading(true);

      console.log('POST →', `${API_BASE}/api/analyze`);
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ graphs }),
      });
      if (!res.ok) throw new Error(`Server replied ${res.status}`);

      const metrics = await res.json();
      console.log('%cMetrics received:', 'color:#0aad28', metrics);

      // 👉 jump to /result and hand over the data
      navigate('/result', { state: { metrics } });
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <h1 className="text-2xl font-semibold mb-4">Molecule Analyzer</h1>

      <div className="input-group grid gap-6 md:grid-cols-3">
        {/* Good molecule */}
        <MoleculeInput
          label="Good Molecule"
          smiles={goodMolecule}
          onChange={setGoodMolecule}
          onGenerate={() => handleGenerate(goodMolecule, goodCanvasRef, 'good')}
          canvasRef={goodCanvasRef}
          error={errors.good}
        />

        {/* Bad molecule */}
        <MoleculeInput
          label="Bad Molecule"
          smiles={badMolecule}
          onChange={setBadMolecule}
          onGenerate={() => handleGenerate(badMolecule, badCanvasRef, 'bad')}
          canvasRef={badCanvasRef}
          error={errors.bad}
        />

        {/* Drug molecule */}
        <MoleculeInput
          label="Drug Molecule"
          smiles={drug}
          onChange={setDrug}
          onGenerate={() => handleGenerate(drug, drugCanvasRef, 'drug')}
          canvasRef={drugCanvasRef}
          error={errors.drug}
        />
      </div>

      <button
        className={`submit-btn ${isLoading ? 'loading' : ''}`}
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? 'Processing…' : 'Analyze Molecules'}
      </button>
    </div>
  );
}


/********************
 * SUB‑COMPONENTS   *
 *******************/

function MoleculeInput({ label, smiles, onChange, onGenerate, canvasRef, error }) {
  return (
    <div className="molecule-input flex flex-col gap-2">
      <label>{label} SMILES:</label>
      <input
        type="text"
        value={smiles}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste SMILES here…"
        className="border rounded px-2 py-1"
      />
      <button className="generate-btn" onClick={onGenerate}>
        Generate Molecule
      </button>
      <canvas ref={canvasRef} width={250} height={200} className="canvas-container border" />
      {error && <div className="error text-red-600 text-sm">{error}</div>}
    </div>
  );
}

export default App;
