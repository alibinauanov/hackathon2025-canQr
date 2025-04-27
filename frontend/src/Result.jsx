import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ArrowLeft, X } from 'lucide-react';
import './Result.css';

import selectiveScore from './output_images/pic1.png';
import bindingEnergies from './output_images/pic2.png';
import stepResults from './output_images/results.json';

export default function Result() {
  const { state } = useLocation();
  const data = state?.metrics;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState('');

  const openModal = (imgSrc) => {
    setModalOpen(true);
    setModalImage(imgSrc);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImage('');
  };

  if (!data) {
    return (
      <div className="no-data-page">
        <div className="no-data-card">
          <AlertTriangle className="no-data-icon" />
          <h1 className="no-data-title">No result data</h1>
          <Link to="/" className="no-data-link">
            <ArrowLeft size={16} /> Back to analyzer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="result-page">

      <div className="result-container">

        {/* Header */}
        <header className="result-header">
          <div className="header-icon">
            <CheckCircle className="h-7 w-7" />
          </div>
          <div>
            <h1 className="header-title">Analysis Result</h1>
            <p className="header-subtitle">Detailed molecular binding analysis</p>
          </div>
        </header>

        {/* Split layout */}
        <div className="split-layout">

          {/* Left column - metrics and table */}
          <div className="left-column">
            {!Array.isArray(data) && (
              <div className="metrics-card p-5">
                <h2 className="metrics-header">Key Metrics</h2>
                <div className="space-y-3">
                  {Object.entries(data).map(([k, v]) => (
                    <div key={k} className="metric-item">
                      <span className="metric-key">{k}:</span>
                      <span className="metric-value">
                        {k.toLowerCase().includes('time')
                          ? new Date(v).toLocaleString()
                          : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="table-card overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="table-header">Optimization Steps</h2>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      {Object.keys(stepResults[0]).map((h) => (
                        <th key={h} className="table-head-cell">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stepResults.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                        {Object.keys(stepResults[0]).map((h) => (
                          <td key={h} className="table-cell">
                            {typeof row[h] === 'number' ? row[h].toFixed(4) : row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column - graphs */}
          <div className="right-column">
            <div className="graphs-grid">
              <div className="graph-card">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Selective Score</h2>
                <img
                  src={selectiveScore}
                  alt="Selective Score"
                  className="graph-image clickable"
                  onClick={() => openModal(selectiveScore)}
                />
                <p className="graph-description">Selective score throughout optimization(lower is better)</p>
              </div>

              <div className="graph-card">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Binding Energies</h2>
                <img
                  src={bindingEnergies}
                  alt="Binding energies"
                  className="graph-image clickable"
                  onClick={() => openModal(bindingEnergies)}
                />
                <p className="graph-description">Binding energies throughout optimization</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="back-button-container">
          <Link to="/" className="back-button">
            <ArrowLeft size={18} />
            <span className="font-medium">Analyze another molecule</span>
          </Link>
        </div>

      </div>

      {/* Modal for full image view */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <X size={24} />
            </button>
            <img src={modalImage} alt="Full view" className="modal-image" />
          </div>
        </div>
      )}
    </div>
  );
}
