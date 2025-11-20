import { useState } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [rules, setRules] = useState(['', '', '']);
  const [results, setResults] = useState([]);
  const [pages, setPages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRuleChange = (index, value) => {
    const updated = [...rules];
    updated[index] = value;
    setRules(updated);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResults([]);
    setPages(null);

    if (!pdfFile) {
      setError('Upload a PDF before running checks.');
      return;
    }

    const cleanedRules = rules.map((rule) => rule.trim()).filter(Boolean);
    if (cleanedRules.length === 0) {
      setError('Please enter at least one rule.');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('rules', JSON.stringify(cleanedRules));

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/check`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(message.error || 'Failed to analyze document');
      }

      const payload = await response.json();
      setResults(payload.results || []);
      setPages(payload.pages || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header>
        <h1>NIYAMR AI – Document Rule Checker</h1>
        <p>Upload a PDF, enter up to three rules, and let the AI-inspired checker evaluate your document.</p>
      </header>

      <main>
        <form className="checker-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="pdf-upload">PDF File</label>
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
            />
            {pdfFile && <span className="file-indicator">Selected: {pdfFile.name}</span>}
          </div>

          <div className="rules-grid">
            {rules.map((rule, index) => (
              <div className="input-group" key={`rule-${index}`}>
                <label htmlFor={`rule-${index}`}>Rule {index + 1}</label>
                <input
                  id={`rule-${index}`}
                  type="text"
                  placeholder="e.g. The document must mention a date."
                  value={rule}
                  onChange={(event) => handleRuleChange(index, event.target.value)}
                />
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Analyzing…' : 'Check Document'}
          </button>
        </form>

        {error && <div className="alert error">{error}</div>}
        {!error && pages && <div className="alert success">Detected {pages} page(s) in the uploaded PDF.</div>}

        {results.length > 0 && (
          <section className="results-section">
            <h2>Results</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Status</th>
                    <th>Evidence</th>
                    <th>Reasoning</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={`result-${index}`} className={result.status === 'pass' ? 'pass' : 'fail'}>
                      <td>{result.rule}</td>
                      <td>
                        <span className={`status-chip ${result.status}`}>{result.status.toUpperCase()}</span>
                      </td>
                      <td>{result.evidence}</td>
                      <td>{result.reasoning}</td>
                      <td>{result.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
