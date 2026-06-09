'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { User, MapPin, Phone, Calendar, ShieldCheck, Send, MessageSquare, Gift, CheckCircle, HeartHandshake, ClipboardList, Home } from 'lucide-react';

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
      const { data: reg, error: regErr } = await supabase
        .from('registrations')
        .select('*, ValidResidents(first_name, last_name, middle_name, suffix, barangay)')
        .ilike('qr_token', cleanToken)
        .eq('status', 'Approved')
        .maybeSingle();

      if (regErr || !reg) {
        setError('Invalid or unregistered EM Card.');
        setLoading(false);
        return;
      }

      const person = reg.ValidResidents || {};
      const fullName = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}${person.suffix ? ' ' + person.suffix : ''}`.trim();

      setData({
        name: fullName,
        barangay: person.barangay || '-',
        purok: reg.purok || '-',
        contact: reg.contact || '-',
        photo: reg.photo_url || reg.photo_base64,
        birthDate: reg.birthday,
        scanCount: reg.scan_count || 0,
        lastScanned: reg.last_scanned_at,
        id: reg.id,
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
      const { error } = await supabase.from('grievances').insert({
        registration_id: data.id,
        token: token,
        type: grievanceType,
        message: grievanceMsg.trim(),
      });
      if (error) throw error;
      setGrievanceSent(true);
      setGrievanceMsg('');
      setTimeout(() => setGrievanceSent(false), 4000);
    } catch {
      alert('Failed to submit. Please try again.');
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
          <p>Welcome to your EM Card Citizen Dashboard</p>
        </div>

        {/* Profile Card */}
        <div className="card-dash-profile">
          <div className="card-dash-photo">
            {data.photo ? <img src={data.photo} alt="" /> : <User size={48} />}
          </div>
          <div className="card-dash-info">
            <h2>{data.name}</h2>
            <p><MapPin size={14} /> {data.barangay} · Purok {data.purok}</p>
            {data.contact !== '-' && <p><Phone size={14} /> {data.contact}</p>}
            <div className="card-dash-badge"><ShieldCheck size={14} /> Verified EM Card Holder</div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="card-dash-section">
          <h3><Gift size={18} /> Active Benefits & Programs</h3>
          <div className="card-dash-benefits">
            <div className="card-dash-benefit">
              <CheckCircle size={18} />
              <div>
                <h4>Community Relief Aid</h4>
                <p>Eligible for food and medical supply distribution</p>
              </div>
            </div>
            <div className="card-dash-benefit">
              <HeartHandshake size={18} />
              <div>
                <h4>Referral Program</h4>
                <p>Earn points by referring new community members</p>
              </div>
            </div>
            <div className="card-dash-benefit">
              <ClipboardList size={18} />
              <div>
                <h4>Local Events Access</h4>
                <p>Priority access to barangay programs and seminars</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scan History */}
        <div className="card-dash-section">
          <h3><Calendar size={18} /> Scan History</h3>
          {data.lastScanned ? (
            <div className="card-dash-scan-history">
              <p><strong>Last scanned:</strong> {new Date(data.lastScanned).toLocaleString()}</p>
              <p><strong>Total scans:</strong> {data.scanCount}</p>
            </div>
          ) : (
            <p className="card-dash-empty">No scans recorded yet.</p>
          )}
        </div>

        {/* Grievance / Suggestion Box */}
        <div className="card-dash-section card-dash-grievance">
          <h3><MessageSquare size={18} /> Digital Suggestion & Grievance Box</h3>
          <p className="card-dash-grievance-desc">Your voice matters. Submit suggestions, complaints, or feedback directly to your barangay coordinator.</p>

          {grievanceSent && (
            <div className="card-dash-grievance-success">
              <CheckCircle size={20} /> Submitted successfully! Thank you for your feedback.
            </div>
          )}

          <form onSubmit={submitGrievance}>
            <div className="card-dash-grievance-type">
              {['Feedback','Suggestion','Grievance','Complaint'].map(t => (
                <button
                  key={t}
                  type="button"
                  className={grievanceType === t ? 'active' : ''}
                  onClick={() => setGrievanceType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={grievanceMsg}
              onChange={(e) => setGrievanceMsg(e.target.value)}
              placeholder={`Type your ${grievanceType.toLowerCase()} here...`}
              rows={4}
              required
            />
            <button type="submit" className="btn btn-card-submit" disabled={grievanceLoading}>
              <Send size={16} /> {grievanceLoading ? 'Sending...' : 'Submit'}
            </button>
          </form>
        </div>

        <a href="/" className="card-dash-home-link"><Home size={14} /> Back to Homepage</a>
      </div>

      <p className="card-dash-footer">© 2026 EM Card · Epektibong Mamamayan</p>
    </div>
  );
}
