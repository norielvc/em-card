'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { QrCode, CheckCircle, AlertTriangle, Camera, RefreshCw, ShieldCheck, X, User, MapPin, Calendar } from 'lucide-react';

export default function ScanPage() {
  const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
  const [eventName, setEventName] = useState('');
  const [eventNameSet, setEventNameSet] = useState(false);
  const [token, setToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [recentScans, setRecentScans] = useState([]);
  const [debugToken, setDebugToken] = useState('');
  const inputRef = useRef(null);

  // Focus input on mount for quick scanning
  useEffect(() => {
    if (eventNameSet && inputRef.current) {
      inputRef.current.focus();
    }
  }, [eventNameSet]);

  // Auto-clear result after 4 seconds for fresh scan
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        setResult(null);
        setToken('');
        if (inputRef.current) inputRef.current.focus();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const handleScan = async (scannedToken) => {
    if (!scannedToken.trim()) return;
    setScanning(true);
    setError('');
    setResult(null);

    try {
      // Aggressive cleaning for phone camera input
      let cleanToken = scannedToken
        .trim()
        .replace(/[^\x20-\x7E]/g, '') // Remove non-printable chars
        .replace(/\s/g, '')             // Remove all whitespace
        .replace(/^[\uFEFF]/, '');      // Remove BOM
      
      // If QR contains a URL, extract the token from it
      const urlTokenMatch = cleanToken.match(/\/card\/(EM[A-Za-z0-9-]+)/);
      if (urlTokenMatch) cleanToken = urlTokenMatch[1];
      
      // Show debug info
      setDebugToken(`Raw: ${scannedToken.length} chars | Cleaned: ${cleanToken}`);
      
      // Look up the card by QR token
      const { data: reg, error: regErr } = await supabase
        .from('registrations')
        .select('*, ValidResidents(first_name, last_name, middle_name, suffix, barangay)')
        .ilike('qr_token', cleanToken)
        .eq('status', 'Approved')
        .maybeSingle();

      if (regErr || !reg) {
        setError('Invalid or unregistered EM Card. QR token not recognized.');
        setScanning(false);
        return;
      }

      const person = reg.ValidResidents || {};
      const fullName = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}${person.suffix ? ' ' + person.suffix : ''}`.trim();

      // Check for duplicate scan at same event (within 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const isDuplicate = reg.last_scanned_at && reg.last_scanned_at > twoHoursAgo && reg.scan_event === eventName;

      if (isDuplicate) {
        setResult({
          type: 'duplicate',
          name: fullName,
          barangay: person.barangay || '-',
          purok: person.purok || '-',
          photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
          scannedAt: reg.last_scanned_at,
          event: reg.scan_event,
        });
        setScanning(false);
        return;
      }

      // Record the scan
      const { error: updateErr } = await supabase
        .from('registrations')
        .update({
          last_scanned_at: new Date().toISOString(),
          scan_count: (reg.scan_count || 0) + 1,
          scan_event: eventName,
          printed_at: reg.printed_at || new Date().toISOString(),
        })
        .eq('id', reg.id);

      if (updateErr) {
        // silent
      }

      setResult({
        type: 'success',
        name: fullName,
        barangay: person.barangay || '-',
        purok: person.purok || '-',
        photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
        scanCount: (reg.scan_count || 0) + 1,
      });

      // Add to recent scans
      setRecentScans(prev => [{ name: fullName, barangay: person.barangay, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setScanning(false);
      setToken('');
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleScan(token);
  };

  // Event name entry screen
  if (!eventNameSet) {
    return (
      <div className="scan-page">
        <div className="scan-event-card">
          <div className="scan-event-icon"><QrCode size={40} /></div>
          <h1>Volunteer QR Scanner</h1>
          <p className="scan-event-desc">Enter the event name to begin scanning EM Cards for distribution verification.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (eventName.trim()) setEventNameSet(true); }}>
            <input
              type="text"
              placeholder="e.g., Relief Distribution - Brgy. Borol 1st"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="scan-event-input"
              autoFocus
              required
            />
            <button type="submit" className="btn btn-scan-start">Start Scanning →</button>
          </form>
          <a href="/" className="scan-back">← Back to Homepage</a>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-page">
      {/* Header */}
      <div className="scan-header">
        <div className="scan-header-left">
          <ShieldCheck size={22} />
          <div>
            <strong>EM Card Scanner</strong>
            <small>{eventName}</small>
          </div>
        </div>
        <button className="scan-header-btn" onClick={() => { setEventNameSet(false); setResult(null); }}>
          <RefreshCw size={16} /> Change Event
        </button>
      </div>

      {/* Main content */}
      <div className="scan-main">
        {/* Result Card */}
        {result && (
          <div className={`scan-result-card scan-result-${result.type}`}>
            {result.type === 'success' ? (
              <>
                <div className="scan-result-icon"><CheckCircle size={48} /></div>
                <h2>✓ Identity Verified</h2>
                <div className="scan-result-photo">
                  {result.photo ? <img src={result.photo} alt="" /> : <User size={40} />}
                </div>
                <p className="scan-result-name">{result.name}</p>
                <div className="scan-result-meta">
                  <span><MapPin size={14} /> {result.barangay}</span>
                  <span><Calendar size={14} /> {result.purok}</span>
                </div>
                <p className="scan-result-status">Eligible for Distribution</p>
                <p className="scan-result-count">Scan #{result.scanCount}</p>
              </>
            ) : (
              <>
                <div className="scan-result-icon"><AlertTriangle size={48} /></div>
                <h2>⚠ DUPLICATE SCAN</h2>
                <div className="scan-result-photo">
                  {result.photo ? <img src={result.photo} alt="" /> : <User size={40} />}
                </div>
                <p className="scan-result-name">{result.name}</p>
                <div className="scan-result-meta">
                  <span><MapPin size={14} /> {result.barangay}</span>
                </div>
                <p className="scan-result-duplicate">
                  Already scanned at <strong>{result.event}</strong> on {new Date(result.scannedAt).toLocaleString()}
                </p>
                <p className="scan-result-stop">❌ STOP — Do Not Distribute</p>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="scan-error-card">
            <X size={24} />
            <p>{error}</p>
            {debugToken && <small style={{color:'#666',fontSize:'0.7rem',marginTop:4,display:'block'}}>{debugToken}</small>}
            <button onClick={() => { setError(''); setToken(''); setDebugToken(''); if (inputRef.current) inputRef.current.focus(); }}>Dismiss</button>
          </div>
        )}

        {/* Input Area */}
        {!result && !error && (
          <form onSubmit={handleSubmit} className="scan-input-area">
            <div className="scan-input-icon"><Camera size={28} /></div>
            <p className="scan-input-label">Scan EM Card QR Code</p>
            <input
              ref={inputRef}
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Tap here and scan QR code..."
              className="scan-token-input"
              autoFocus
              autoComplete="off"
            />
            <p className="scan-input-hint">Point camera at the QR code on the EM Card</p>
            {scanning && <div className="scan-spinner">Verifying...</div>}
          </form>
        )}
      </div>

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <div className="scan-recent">
          <h4>Recent Scans</h4>
          <ul>
            {recentScans.map((s, i) => (
              <li key={i}><CheckCircle size={12} /> {s.name} — {s.barangay} <small>{s.time}</small></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
