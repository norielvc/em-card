'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
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
        .eq('qr_token', cleanToken)
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
      alert('Failed to submit: ' + (err?.message || 'Please try again.'));
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
    </div>
  );
}
