'use client';

import { useState } from 'react';
import { Search, ClipboardCheck, Clock, Printer, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function TrackPage() {
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!reference.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/track-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: reference.trim() }),
      });
      const json = await res.json();

      if (!json.found) {
        setError('No record found. Please check your reference number and try again.');
      } else {
        setResult(json.data);
      }
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status, printedAt, emCardNo) => {
    const steps = [
      { key: 'submitted', label: 'Submitted', icon: ClipboardCheck, done: true },
      { key: 'review', label: 'Under Review', icon: Clock, done: ['Approved', 'Rejected', 'Pending'].includes(status) },
      { key: 'approved', label: 'Approved', icon: CheckCircle, done: ['Approved'].includes(status) },
      { key: 'printing', label: 'Card Printing', icon: Printer, done: printedAt && emCardNo },
      { key: 'ready', label: 'Ready for Pickup', icon: CheckCircle, done: printedAt && emCardNo },
    ];

    if (status === 'Rejected') {
      return {
        statusText: 'Rejected',
        statusColor: '#ef4444',
        statusBg: 'rgba(239,68,68,0.08)',
        steps,
        rejected: true,
      };
    }

    const currentIndex = steps.filter(s => s.done).length - 1;

    return {
      statusText: status,
      statusColor: status === 'Approved' ? '#10b981' : '#f59e0b',
      statusBg: status === 'Approved' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
      steps,
      currentIndex: Math.max(0, currentIndex),
      rejected: false,
    };
  };

  const statusConfig = result ? getStatusConfig(result.status, result.printedAt, result.emCardNo) : null;

  return (
    <div className="track-page">
      <div className="track-hero">
        <a href="/" className="track-brand">
          <span className="track-brand-mark">EM</span>
          <div>
            <strong>EM Card</strong>
            <small>Epektibong Mamamayan</small>
          </div>
        </a>
        <h1>Track Your Application</h1>
        <p>Enter your reference number to check the status of your EM Card registration.</p>
      </div>

      <div className="track-card">
        <form onSubmit={handleSearch} className="track-search-form">
          <label className="track-input-label">Reference Number</label>
          <div className="track-input-row">
            <input
              type="text"
              placeholder="Paste your reference number..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="track-input"
            />
            <button type="submit" className="btn btn-track-search" disabled={loading || !reference.trim()}>
              {loading ? (
                <span className="track-spinner" />
              ) : (
                <><Search size={18} /> Search</>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="track-error">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        {result && statusConfig && (
          <div className="track-result">
            <div className="track-status-badge" style={{ color: statusConfig.statusColor, background: statusConfig.statusBg }}>
              {statusConfig.rejected ? <XCircle size={18} /> : <CheckCircle size={18} />}
              <span>{statusConfig.statusText}</span>
            </div>

            <div className="track-details">
              <div className="track-detail-row">
                <span className="track-detail-label">Name</span>
                <span className="track-detail-value">{result.name}</span>
              </div>
              <div className="track-detail-row">
                <span className="track-detail-label">Barangay</span>
                <span className="track-detail-value">{result.barangay}</span>
              </div>
              <div className="track-detail-row">
                <span className="track-detail-label">Date Submitted</span>
                <span className="track-detail-value">{new Date(result.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              {result.emCardNo && (
                <div className="track-detail-row">
                  <span className="track-detail-label">EM Card Number</span>
                  <span className="track-detail-value track-highlight">{result.emCardNo}</span>
                </div>
              )}
              {result.printedAt ? (
                <div className="track-detail-row">
                  <span className="track-detail-label">Card Printed</span>
                  <span className="track-detail-value track-highlight">{new Date(result.printedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              ) : (
                <div className="track-detail-row">
                  <span className="track-detail-label">Card Printed</span>
                  <span className="track-detail-value track-muted">Not yet printed</span>
                </div>
              )}
            </div>

            <div className="track-timeline">
              {statusConfig.steps.map((step, i) => {
                const isDone = step.done;
                const isCurrent = !statusConfig.rejected && i === statusConfig.currentIndex;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className={`track-timeline-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="track-timeline-dot">
                      {isDone ? <StepIcon size={16} /> : <div className="track-timeline-empty" />}
                    </div>
                    <span className="track-timeline-label">{step.label}</span>
                    {isCurrent && <span className="track-timeline-current">Current</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="track-footer">
        <a href="/">← Back to Home</a>
      </div>
    </div>
  );
}
