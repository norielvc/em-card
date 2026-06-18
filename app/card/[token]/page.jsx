'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Send, MessageSquare, CheckCircle, Home, ShieldCheck } from 'lucide-react';

export default function CardDashboardPage() {
  const params = useParams();
  const token = params?.token;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grievanceType, setGrievanceType] = useState('Feedback');
  const [grievanceMsg, setGrievanceMsg] = useState('');
  const [grievanceSent, setGrievanceSent] = useState(false);
  const [grievanceLoading, setGrievanceLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, title: '', message: '' });

  useEffect(() => {
    if (!token) return;
    fetchCardData();
  }, [token]);

  const fetchCardData = async () => {
    setLoading(true);
    try {
      if (!token) {
        setError('Invalid or unregistered EM Card.');
        setLoading(false);
        return;
      }

      const cleanToken = token.trim().replace(/[\r\n\t]/g, '');
      const res = await fetch(`/api/card-lookup?token=${encodeURIComponent(cleanToken)}`);
      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error || 'Invalid or unregistered EM Card.');
        setLoading(false);
        return;
      }

      setData({
        name: json.name,
        barangay: json.barangay,
        purok: json.purok,
        contact: json.contact,
        photo: json.photo,
        birthDate: json.birthDate,
        scanCount: json.scanCount,
        lastScanned: json.lastScanned,
        id: json.id,
      });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitGrievance = async (e) => {
    e.preventDefault();
    if (!grievanceMsg.trim() || !data?.id) return;

    setGrievanceLoading(true);
    try {
      const res = await fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: data.id,
          token: token,
          type: grievanceType,
          message: grievanceMsg.trim(),
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to submit');
      setGrievanceSent(true);
      setGrievanceMsg('');
      setTimeout(() => setGrievanceSent(false), 4000);
    } catch (err) {
      console.error('Grievance submit error:', err);
      setModal({
        open: true,
        title: 'Failed to Submit',
        message: err?.message || 'Please try again.',
      });
    } finally {
      setGrievanceLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Magandang umaga';
    if (hour < 18) return 'Magandang hapon';
    return 'Magandang gabi';
  };

  if (loading) {
    return (
      <div className="card-dash-page">
        <div className="card-dash-loading">
          <ShieldCheck size={40} className="card-pulse" />
          <p>Loading your EM Card...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-dash-page">
        <div className="card-dash-error">
          <ShieldCheck size={40} />
          <h2>Card Not Found</h2>
          <p>{error}</p>
          <a href="/" className="card-dash-home-btn"><Home size={16} /> Back to Homepage</a>
        </div>
      </div>
    );
  }

  return (
    <div className="card-dash-page">
      {/* Top bar */}
      <div className="card-dash-top">
        <a href="/" className="card-dash-brand">
          <span className="brand-mark">EM</span>
          <div><strong>EM Card</strong><small>Epektibong Mamamayan</small></div>
        </a>
      </div>

      <div className="card-dash-content">
        {/* Greeting */}
        <div className="card-dash-greeting">
          <h1>{greeting()}, <span>{data.name.split(' ')[0]}!</span></h1>
        </div>

        {/* Feedback / Suggestion Box - Tagalog */}
        <div className="card-dash-section card-dash-grievance">
          <h3><MessageSquare size={18} /> Suhestyon at Reklamo</h3>
          <p className="card-dash-grievance-desc">Mahalaga ang iyong boses. Maaari kang magbigay ng suhestyon, reklamo, o feedback direkta sa iyong barangay coordinator.</p>

          {grievanceSent && (
            <div className="card-dash-grievance-success">
              <CheckCircle size={20} /> Natapos na! Salamat sa iyong feedback.
            </div>
          )}

          <form onSubmit={submitGrievance}>
            <div className="card-dash-grievance-type">
              {[
                { key: 'Feedback', label: 'Feedback' },
                { key: 'Suggestion', label: 'Suhestyon' },
                { key: 'Grievance', label: 'Reklamo' },
                { key: 'Complaint', label: 'Sumamo' }
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={grievanceType === t.key ? 'active' : ''}
                  onClick={() => setGrievanceType(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={grievanceMsg}
              onChange={(e) => setGrievanceMsg(e.target.value)}
              placeholder={`Ilagay ang iyong ${grievanceType === 'Suggestion' ? 'suhestyon' : grievanceType === 'Grievance' ? 'reklamo' : grievanceType === 'Complaint' ? 'sumamo' : 'feedback'} dito...`}
              rows={4}
              required
            />
            <button type="submit" className="btn btn-card-submit" disabled={grievanceLoading}>
              <Send size={16} /> {grievanceLoading ? 'Nagpapadala...' : 'Ipadala'}
            </button>
          </form>
        </div>

        <a href="/" className="card-dash-home-link"><Home size={14} /> Bumalik sa Homepage</a>
      </div>

      <p className="card-dash-footer">© 2026 EM Card · Epektibong Mamamayan</p>

      {/* Error Modal */}
      {modal.open && (
        <div className="card-modal-overlay" onClick={() => setModal({ ...modal, open: false })}>
          <div className="card-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-modal-header">
              <ShieldCheck size={28} />
              <h3>{modal.title}</h3>
            </div>
            <p className="card-modal-body">{modal.message}</p>
            <button className="btn btn-card-submit" onClick={() => setModal({ ...modal, open: false })}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
