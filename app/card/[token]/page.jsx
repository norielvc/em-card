'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Send, MessageSquare, CheckCircle, Home, ShieldCheck, Hash, MapPin, User,
  ShoppingBag, Package, Coins, Sparkles, Pill, HeartPulse, Zap, Droplets, Gift, Clock
} from 'lucide-react';

// 8 Official Distribution Categories with Rainbow Color Code metadata
const DISTRIBUTION_CATEGORIES = [
  { id: 'groceries', name: 'Groceries', color: '#ef4444', icon: <ShoppingBag size={18} /> },
  { id: 'food_packs', name: 'Food Packs', color: '#f97316', icon: <Package size={18} /> },
  { id: 'cash_assistance', name: 'Cash Assistance', color: '#eab308', icon: <Coins size={18} /> },
  { id: 'your_em', name: 'yourEM', color: '#10b981', isYourEM: true, icon: <Sparkles size={18} /> },
  { id: 'medicines', name: 'Medicines', color: '#06b6d4', icon: <Pill size={18} /> },
  { id: 'medical_assistance', name: 'Medical Assistance', color: '#3b82f6', icon: <HeartPulse size={18} /> },
  { id: 'electric_bill', name: 'Electric Bill Assistance', color: '#6366f1', icon: <Zap size={18} /> },
  { id: 'water_bill', name: 'Water Bill Assistance', color: '#a855f7', icon: <Droplets size={18} /> },
];

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
        precinct: json.precinct || null,
        id: json.id,
        aidDistributions: json.aidDistributions || [],
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

        {/* Member Profile Card */}
        <div className="card-dash-profile">
          <div className="card-dash-photo">
            {data.photo
              ? <img src={data.photo} alt={data.name} />
              : <User size={32} />
            }
          </div>
          <div className="card-dash-info">
            <h2>{data.name}</h2>
            <p><MapPin size={13} /> {data.barangay}{data.purok && data.purok !== '-' ? ` · Purok ${data.purok}` : ''}</p>
            <span className="card-dash-badge"><CheckCircle size={13} /> EM Card Member</span>
          </div>
        </div>

        {/* Precinct Voter Card — only shown for registered voters */}
        {data.precinct && (
          <div className="card-dash-precinct-card">
            <div className="cdp-card-inner">
              <div className="cdp-left">
                <div className="cdp-label">
                  <Hash size={12} /> Precinct No.
                </div>
                <div className="cdp-number">{data.precinct}</div>
                <div className="cdp-badge">✓ Registered Voter</div>
              </div>
              <div className="cdp-divider" />
              <div className="cdp-right">
                <div className="cdp-detail-row">
                  <span className="cdp-detail-label">Barangay</span>
                  <span className="cdp-detail-value">{data.barangay}</span>
                </div>
                {data.purok && data.purok !== '-' && (
                  <div className="cdp-detail-row">
                    <span className="cdp-detail-label">Purok</span>
                    <span className="cdp-detail-value">Purok {data.purok}</span>
                  </div>
                )}
                <div className="cdp-watermark">BOTANTE</div>
              </div>
            </div>
          </div>
        )}

        {/* 8-Category Aid & Benefits Rainbow Tracker */}
        <div className="card-dash-section card-dash-aid-section">
          <div className="card-dash-aid-header">
            <div className="card-dash-aid-title-wrap">
              <div className="card-dash-aid-icon-chip">
                <Gift size={18} />
              </div>
              <div>
                <h3>Official Aid &amp; Benefits Distribution Tracker</h3>
                <span className="card-dash-aid-subtitle">Verified Citizen Assistance Records</span>
              </div>
            </div>
            {(() => {
              const claimedCount = DISTRIBUTION_CATEGORIES.filter(c => (data.aidDistributions || []).some(d => d.category === c.id)).length;
              return (
                <span className="card-dash-aid-count-badge">
                  {claimedCount} of 8 Categories
                </span>
              );
            })()}
          </div>

          <div className="card-dash-aid-grid">
            {DISTRIBUTION_CATEGORIES.map(cat => {
              const claims = (data.aidDistributions || []).filter(d => d.category === cat.id);
              const isClaimed = claims.length > 0;
              const latestClaim = isClaimed ? claims[0] : null;

              return (
                <div 
                  key={cat.id} 
                  className={`card-aid-badge-card ${isClaimed ? 'claimed' : 'unclaimed'} ${cat.isYourEM ? 'your-em-card' : ''}`}
                  style={{
                    '--cat-color': cat.color,
                  }}
                >
                  <div className="card-aid-badge-top">
                    <div className="card-aid-badge-icon" style={{ color: cat.color }}>
                      {cat.icon}
                    </div>
                    {isClaimed ? (
                      <span className="card-aid-status-pill claimed">
                        ✓ Received {claims.length > 1 ? `(${claims.length}x)` : ''}
                      </span>
                    ) : (
                      <span className="card-aid-status-pill unclaimed">
                        Not Claimed
                      </span>
                    )}
                  </div>

                  <div className="card-aid-badge-name">
                    <strong>{cat.name}</strong>
                  </div>

                  {isClaimed && latestClaim && (
                    <div className="card-aid-badge-meta">
                      <Clock size={11} />
                      <span>{new Date(latestClaim.distributed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
