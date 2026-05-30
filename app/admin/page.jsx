'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, ClipboardList, CheckCircle, Calendar, LayoutDashboard, Network, MessageSquare, BarChart3, FileText, Bell, Download, ShieldCheck, Lock, User, Mail, Eye, EyeOff, HelpCircle, ArrowRight, Heart, TrendingUp, UserCheck, ScanLine, Camera, X, MapPin, Phone, AlertTriangle, Upload } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [totalResidents, setTotalResidents] = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [votersByBarangay, setVotersByBarangay] = useState([]);
  const [regsByBarangay, setRegsByBarangay] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  const [allResidents, setAllResidents] = useState([]);
  const [allRegs, setAllRegs] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [regsLoading, setRegsLoading] = useState(false);
  const [regStatusFilter, setRegStatusFilter] = useState('Pending');
  const [residentSearch, setResidentSearch] = useState('');
  const [residentsPage, setResidentsPage] = useState(1);
  const [residentsCount, setResidentsCount] = useState(0);
  const residentsPerPage = 50;

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedRegDetail, setSelectedRegDetail] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newResident, setNewResident] = useState({
    last_name: '', first_name: '', middle_name: '', barangay: 'Borol 1st', precinct: ''
  });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const [networkSearch, setNetworkSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Messages
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [msgTab, setMsgTab] = useState('compose'); // compose | history
  const [msgForm, setMsgForm] = useState({
    title: '', body: '', type: 'broadcast', targetType: 'all', targetValue: ''
  });
  const [msgSending, setMsgSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [msgRecipients, setMsgRecipients] = useState([]);
  const [msgUserSearch, setMsgUserSearch] = useState('');
  const [msgUserResults, setMsgUserResults] = useState([]);

  // Event Scanner
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [scanToken, setScanToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannerMode, setScannerMode] = useState('select'); // select | scan | result
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventForm, setNewEventForm] = useState({ event_name: '', event_date: '', location: '' });
  const [eventScans, setEventScans] = useState([]);
  const [scanStats, setScanStats] = useState({ total: 0, duplicates: 0 });
  const [scannerInputMode, setScannerInputMode] = useState('camera'); // 'camera' | 'capture' | 'manual'
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef(null);
  const scanInProgressRef = useRef(false);
  const fileInputRef = useRef(null);
  const localScanCountRef = useRef(0); // optimistic counter for mass scanning (40k+ events)

  // Background sync: reconcile true scan count every 30s during active scanning
  useEffect(() => {
    if (!selectedEvent) return;
    const interval = setInterval(() => {
      refreshScanCount(selectedEvent.id);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedEvent]);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsLoggedIn(true);
        setUsername(data.session.user.email);
      }
      setAuthLoading(false);
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      if (session) setUsername(session.user.email);
      else {
        setUsername('');
        setRecentRegistrations([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchDashboardData();
  }, [isLoggedIn]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Reset residents page and refetch when search changes
  useEffect(() => {
    setResidentsPage(1);
    if (activeTab === 'residents') {
      fetchAllResidents(1, residentSearch);
    }
  }, [residentSearch]);

  // Auto-fetch messages when switching to history tab
  useEffect(() => {
    if (activeTab === 'messages' && msgTab === 'history') {
      fetchMessages();
    }
  }, [activeTab, msgTab]);

  // ─── Continuous Live Camera Stream ───
  const stopScanner = async () => {
    const instance = scannerRef.current;
    if (instance) {
      try { await instance.stop(); } catch (_) {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  // Resize image to prevent OOM crash from high-res phone photos
  const resizeImage = (file, maxDim = 1600) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  };

  useEffect(() => {
    if (scannerInputMode !== 'camera' || !selectedEvent) {
      stopScanner();
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const qr = new Html5Qrcode('event-scanner-camera');
        scannerRef.current = qr;

        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0 },
          (decodedText) => {
            if (scanInProgressRef.current) return;
            scanInProgressRef.current = true;
            handleEventScan(decodedText);
          },
          () => {}
        );

        if (!cancelled) setCameraActive(true);
      } catch (err) {
        console.warn('Camera failed:', err);
        if (!cancelled) setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [scannerInputMode, selectedEvent]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchDashboardData = async () => {
    setDashLoading(true);
    try {
      // Fetch analytics from server-side API (uses service role key, no row limit)
      const analyticsRes = await fetch('/api/analytics');
      const analytics = await analyticsRes.json();

      if (analytics.error) throw new Error(analytics.error);

      // Recent registrations (still fetch directly — small data)
      const { data: recentData } = await supabase
        .from('registrations')
        .select('id, resident_id, house_no, purok, barangay, contact, status, sector_category, referral_name, photo_base64, birthday, created_at, qr_token, em_card_no, scan_count, last_scanned_at, ValidResidents(first_name, last_name, middle_name, barangay)')
        .order('created_at', { ascending: false })
        .limit(10);

      setTotalResidents(analytics.totalResidents || 0);
      setTotalRegistrations(analytics.totalRegistrations || 0);
      setRecentRegistrations(recentData || []);
      setVotersByBarangay(analytics.votersByBarangay || []);
      setRegsByBarangay(analytics.regsByBarangay || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setDashLoading(false);
    }
  };

  const fetchAllResidents = async (page = residentsPage, search = residentSearch) => {
    setResidentsLoading(true);
    try {
      const start = (page - 1) * residentsPerPage;
      const end = start + residentsPerPage - 1;

      let query = supabase
        .from('ValidResidents')
        .select('*', { count: 'exact' })
        .order('last_name', { ascending: true })
        .range(start, end);

      if (search.trim()) {
        const q = search.trim();
        query = query.or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%,middle_name.ilike.%${q}%,barangay.ilike.%${q}%,precinct.ilike.%${q}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setAllResidents(data || []);
      setResidentsCount(count || 0);
    } catch (err) {
      console.error('Residents fetch error:', err);
    } finally {
      setResidentsLoading(false);
    }
  };

  const fetchAllRegistrations = async () => {
    setRegsLoading(true);
    try {
      const { data } = await supabase
        .from('registrations')
        .select('id, resident_id, house_no, purok, barangay, contact, status, sector_category, referral_name, photo_base64, birthday, created_at, qr_token, em_card_no, scan_count, last_scanned_at, ValidResidents(first_name, last_name, middle_name, barangay)')
        .order('created_at', { ascending: false });
      setAllRegs(data || []);
    } catch (err) {
      console.error('Registrations fetch error:', err);
    } finally {
      setRegsLoading(false);
    }
  };

  const generateQRToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 24; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'EM' + token;
  };

  const generateEMCardNo = () => {
    // Format: EM- followed by 10 random digits (0000000000)
    let digits = '';
    for (let i = 0; i < 10; i++) digits += Math.floor(Math.random() * 10);
    return `EM-${digits}`;
  };

  const generateQRForMember = async (reg) => {
    const newCardNo = reg.em_card_no || generateEMCardNo();
    const newToken = newCardNo; // QR Token and EM Card Number are identical
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ qr_token: newToken, em_card_no: newCardNo })
        .eq('id', reg.id);
      if (error) throw error;
      showToast(`QR Card Number generated: ${newCardNo}`, 'success');
      fetchAllRegistrations();
      setSelectedMember({ ...reg, qr_token: newToken, em_card_no: newCardNo });
    } catch (err) {
      showToast('Failed to generate QR token.', 'error');
    }
  };

  const approveRegistration = async (id) => {
    try {
      const emCardNo = generateEMCardNo();
      const qrToken = emCardNo; // QR Token and EM Card Number are identical
      const { error } = await supabase
        .from('registrations')
        .update({ status: 'Approved', qr_token: qrToken, em_card_no: emCardNo })
        .eq('id', id);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast(`Approved. EM Card: ${emCardNo}`, 'success');
        fetchAllRegistrations();
      }
    } catch (err) {
      showToast('Failed to approve registration.', 'error');
    }
  };

  const rejectRegistration = async (id) => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ status: 'Rejected' })
        .eq('id', id);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Registration rejected.', 'success');
        fetchAllRegistrations();
      }
    } catch (err) {
      showToast('Failed to reject registration.', 'error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });
      if (error) {
        setLoginError(error.message === 'Invalid login credentials'
          ? 'Invalid username or password.' : error.message);
      } else {
        setPassword('');
      }
    } catch (err) {
      setLoginError('An unexpected error occurred.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPassword('');
    setLoginError('');
    setSidebarOpen(false);
  };

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    if (tab === 'residents') fetchAllResidents(residentsPage, residentSearch);
    if (tab === 'registrations') fetchAllRegistrations();
    if (tab === 'members' && allRegs.length === 0) fetchAllRegistrations();
    if (tab === 'eventScanner') fetchEvents();
  };

  // CSV Parser (handles quoted fields)
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s/g, '_'));
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      results.push(row);
    }
    return results;
  };

  const downloadSampleCSV = () => {
    const csvContent = 'last_name,first_name,middle_name,barangay,precinct\nDela Cruz,Juan,Perez,Borol 1st,0036A\nSantos,Maria,Reyes,Borol 1st,0033A\nReyes,Pedro,Gomez,Borol 1st,0028A\nGarcia,Ana,Silva,Borol 1st,0044A\nBautista,Jose,Delos Santos,Borol 1st,0026A';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'emcard_residents_sample.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Sample CSV downloaded!', 'success');
  };

  const handleCSVFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setUploadError('No valid data found. Please check your CSV format.');
        setCsvPreview([]);
        setCsvData([]);
        return;
      }
      setCsvPreview(parsed.slice(0, 5));
      setCsvData(parsed);
    };
    reader.readAsText(file);
  };

  const confirmBulkUpload = async () => {
    if (csvData.length === 0) return;
    setUploadLoading(true);
    setUploadError('');
    try {
      const formatted = csvData.map(row => ({
        last_name: row.last_name || row['last name'] || '',
        first_name: row.first_name || row['first name'] || '',
        middle_name: row.middle_name || row['middle name'] || '',
        barangay: row.barangay || 'Borol 1st',
        precinct: row.precinct || '',
        status: 'Verified'
      })).filter(r => r.last_name && r.first_name);

      if (formatted.length === 0) {
        setUploadError('No valid resident records found. Ensure last_name and first_name columns exist.');
        setUploadLoading(false);
        return;
      }

      const { error } = await supabase.from('ValidResidents').insert(formatted);
      if (error) throw error;

      showToast(`${formatted.length} residents uploaded successfully!`, 'success');
      fetchAllResidents();
      setShowBulkModal(false);
      setCsvFile(null);
      setCsvData([]);
      setCsvPreview([]);
    } catch (err) {
      const isTableMissing = err.message?.includes('404') || err.code === '42P01' || err.message?.includes('relation') || err.message?.includes('does not exist');
      const isRLS = err.message?.includes('403') || err.message?.includes('new row violates') || err.message?.includes('policy');
      if (isTableMissing) {
        setUploadError('The "ValidResidents" table does not exist in Supabase. Please run the SQL setup script first.');
      } else if (isRLS) {
        setUploadError('Permission denied. Please check Row Level Security policies in Supabase allow INSERT for the anon role.');
      } else {
        setUploadError(err.message || 'Upload failed. Please try again.');
      }
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAddResident = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      const { error } = await supabase.from('ValidResidents').insert([{
        last_name: newResident.last_name,
        first_name: newResident.first_name,
        middle_name: newResident.middle_name,
        barangay: newResident.barangay,
        precinct: newResident.precinct,
        status: 'Verified'
      }]);
      if (error) throw error;

      showToast('Resident added successfully!', 'success');
      fetchAllResidents();
      setShowAddModal(false);
      setNewResident({ last_name: '', first_name: '', middle_name: '', barangay: 'Borol 1st', precinct: '' });
    } catch (err) {
      const isTableMissing = err.message?.includes('404') || err.code === '42P01' || err.message?.includes('relation') || err.message?.includes('does not exist');
      setAddError(isTableMissing
        ? 'The "ValidResidents" table does not exist in Supabase. Please run the SQL setup script first.'
        : (err.message || 'Failed to add resident. Please try again.'));
    } finally {
      setAddLoading(false);
    }
  };

  // Server-side filtering: allResidents already contains the paginated + filtered results
  const filteredResidents = allResidents;

  // NAV ITEMS
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.8} /> },
    { id: 'residents', label: 'Registered Voters', icon: <Users size={20} strokeWidth={1.8} /> },
    { id: 'registrations', label: 'Registrations', icon: <ClipboardList size={20} strokeWidth={1.8} /> },
    { id: 'members', label: 'Members', icon: <UserCheck size={20} strokeWidth={1.8} /> },
    { id: 'eventScanner', label: 'Event Scanner', icon: <ScanLine size={20} strokeWidth={1.8} /> },
    { id: 'network', label: 'Network', icon: <Network size={20} strokeWidth={1.8} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={20} strokeWidth={1.8} /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} strokeWidth={1.8} /> },
  ];

  // LOGIN SCREEN
  if (!isLoggedIn && authLoading) {
    return (
      <div className="admin-login-page">
        <div className="admin-loading">
          <div className="admin-brand-mark pulse">EM</div>
          <p>Checking session...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="admin-login-page">
        {/* LEFT PANEL */}
        <div className="admin-login-left">
          <div className="admin-login-left-overlay" />
          <div className="admin-login-left-content">
            <a href="/" className="admin-login-brand">
              <span className="brand-mark">EM</span>
              <div>
                <strong>EM Card</strong>
                <small>Epektibong Mamamayan</small>
              </div>
            </a>

            <div className="admin-login-left-hero">
              <h1>
                <span className="login-hero-white">Empowering</span>
                <span className="login-hero-green"> Communities.</span>
                <span className="login-hero-white"> Building a</span>
                <span className="login-hero-green"> Better Tomorrow.</span>
              </h1>
              <p className="login-hero-copy">
                EM Card is dedicated to helping communities and promoting unity, support, and progress for every family in Balagtas.
              </p>
            </div>

            <div className="admin-login-features">
              <div className="admin-login-feature">
                <div className="admin-login-feature-icon"><Users size={20} strokeWidth={1.5} /></div>
                <div>
                  <h4>Stronger Communities</h4>
                  <p>Building unity and empowering every citizen.</p>
                </div>
              </div>
              <div className="admin-login-feature">
                <div className="admin-login-feature-icon"><Heart size={20} strokeWidth={1.5} /></div>
                <div>
                  <h4>Social Support</h4>
                  <p>Providing assistance and resources to those in need.</p>
                </div>
              </div>
              <div className="admin-login-feature">
                <div className="admin-login-feature-icon"><TrendingUp size={20} strokeWidth={1.5} /></div>
                <div>
                  <h4>Sustainable Progress</h4>
                  <p>Creating long-term solutions for a better tomorrow.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="admin-login-right">
          <div className="admin-login-right-top">
            <a href="/" className="admin-login-home"><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Homepage</a>
            <a href="/" className="admin-login-help"><HelpCircle size={16} /> Need help?</a>
          </div>

          <div className="admin-login-right-content">
            <h2>Welcome Back</h2>
            <p className="login-right-subtitle">Sign in to your EM Card Admin Portal</p>

            <form onSubmit={handleLogin} className="admin-login-form-right">
              <div className="form-group">
                <label>Email Address</label>
                <div className="login-input-wrap-right">
                  <Mail size={18} strokeWidth={1.5} />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your email address" required disabled={loginLoading} />
                </div>
              </div>

              <div className="form-group">
                <div className="login-label-row">
                  <label>Password</label>
                  <a href="#" className="login-forgot">Forgot Password?</a>
                </div>
                <div className="login-input-wrap-right">
                  <Lock size={18} strokeWidth={1.5} />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={loginLoading} />
                  <button type="button" className="login-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <label className="login-remember">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <span className="login-check-box"></span>
                Remember me
              </label>

              {loginError && <p className="login-error">{loginError}</p>}

              <button type="submit" className="btn btn-admin-login-right" disabled={loginLoading}>
                <Lock size={18} strokeWidth={2} /> {loginLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="login-divider"><span>or</span></div>

            <button className="btn btn-google-signin" onClick={() => alert('Google Sign In coming soon!')}>
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Sign in with Google
            </button>

            <p className="login-contact-admin">
              Don't have an account? <a href="#">Contact System Administrator</a>
            </p>
          </div>

          <p className="login-footer">© 2026 EM Card. All rights reserved.</p>
        </div>
      </div>
    );
  }

  const getResidentName = (reg) => {
    const r = reg?.ValidResidents;
    if (!r) return reg?.resident_id?.slice(0, 8) || '-';
    return `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}`.trim();
  };

  // MESSAGE HANDLERS (top-level, no hooks inside renderMessages)
  const fetchMessages = async () => {
    setMessagesLoading(true);
    try {
      const res = await fetch('/api/send-sms');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchMsgRecipients = async (msgId) => {
    try {
      const res = await fetch(`/api/send-sms?message_id=${msgId}`);
      const data = await res.json();
      setMsgRecipients(data.recipients || []);
      setSelectedMessage(msgId);
    } catch (err) {
      console.error('Fetch recipients error:', err);
    }
  };

  const searchSpecificUser = async (query) => {
    if (!query || query.length < 2) { setMsgUserResults([]); return; }
    try {
      const { data } = await supabase
        .from('registrations')
        .select('id, resident_id, contact, barangay, sector_category, referral_name, ValidResidents(first_name, last_name, middle_name)')
        .not('contact', 'is', null)
        .neq('contact', '')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`, { foreignTable: 'ValidResidents' })
        .limit(8);
      // Filter out entries without a valid name
      const valid = (data || []).filter(reg => reg.ValidResidents && (reg.ValidResidents.first_name || reg.ValidResidents.last_name));
      setMsgUserResults(valid);
    } catch (err) {
      console.error('User search error:', err);
      setMsgUserResults([]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgForm.body.trim()) { showToast('Message body is required', 'error'); return; }
    setMsgSending(true);
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: msgForm.title,
          messageBody: msgForm.body,
          type: msgForm.type,
          targetType: msgForm.targetType,
          targetValue: msgForm.targetValue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`SMS campaign sent to ${data.totalRecipients} recipients`, 'success');
        setMsgForm({ title: '', body: '', type: 'broadcast', targetType: 'all', targetValue: '' });
        fetchMessages();
      } else {
        showToast(data.error || 'Failed to send', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setMsgSending(false);
    }
  };

  // RENDER VIEWS
  const renderDashboard = () => (
    <>
      {/* KPI Stat Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon kpi-green"><Users size={20} strokeWidth={1.5} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Registered Voters</span>
            <span className="kpi-value">{dashLoading ? '...' : totalResidents.toLocaleString()}</span>
            <span className="kpi-change up">↑ 12.5% vs last month</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-blue"><ClipboardList size={20} strokeWidth={1.5} /></div>
          <div className="kpi-body">
            <span className="kpi-label">EM Card Members</span>
            <span className="kpi-value">{dashLoading ? '...' : totalRegistrations.toLocaleString()}</span>
            <span className="kpi-change down">− 0% vs last month</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-amber"><CheckCircle size={20} strokeWidth={1.5} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Registration Rate</span>
            <span className="kpi-value">{dashLoading ? '...' : Math.round((totalRegistrations / (totalResidents || 1)) * 100)}%</span>
            <span className="kpi-change down">− 0% vs last month</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-purple"><Calendar size={20} strokeWidth={1.5} /></div>
          <div className="kpi-body">
            <span className="kpi-label">New This Month</span>
            <span className="kpi-value">{dashLoading ? '...' : recentRegistrations.length}</span>
            <span className="kpi-change down">− 0% vs last month</span>
          </div>
        </div>
      </div>

      {/* Analytics 3-Column Grid */}
      <div className="dashboard-main-grid three-col">
        {/* Left: Voters by Barangay */}
        {votersByBarangay.length > 0 && (
          <div className="admin-panel dash-panel">
            <div className="panel-header">
              <div className="panel-header-left">
                <h3>Registered Voters by Barangay</h3>
                <span className="panel-subtitle">{votersByBarangay.length} barangays · {totalResidents.toLocaleString()} total</span>
              </div>
            </div>
            <div className="analytics-chart-wrap">
              {votersByBarangay.map(({ barangay, count }, index) => {
                const total = totalResidents || 1;
                const pct = ((count / total) * 100).toFixed(1);
                const barWidth = total > 0 ? Math.max((count / total) * 100, 1.5) : 0;
                const colors = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#047857', '#14b8a6', '#0d9488', '#2dd4bf'];
                const barColor = colors[index % colors.length];
                return (
                  <div key={barangay} className="analytics-bar-row">
                    <span className="analytics-bar-name">{barangay}</span>
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-fill" style={{ width: `${barWidth}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="analytics-bar-count">{count.toLocaleString()}</span>
                    <span className="analytics-bar-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Middle: EM Card Members by Barangay */}
        <div className="admin-panel dash-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <h3>EM Card Members by Barangay</h3>
              <span className="panel-subtitle">{regsByBarangay.length || votersByBarangay.length} barangays · {totalRegistrations.toLocaleString()} total</span>
            </div>
          </div>
          <div className="analytics-chart-wrap">
            {(regsByBarangay.length > 0 ? regsByBarangay : votersByBarangay.map(v => ({ barangay: v.barangay, count: 0 }))).map(({ barangay, count }, index) => {
              const total = totalRegistrations || 1;
              const pct = totalRegistrations > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
              const barWidth = totalRegistrations > 0 ? Math.max((count / total) * 100, 1.5) : 0;
              const colors = ['#3b82f6', '#2563eb', '#60a5fa', '#93c5fd', '#1d4ed8', '#0ea5e9', '#0284c7', '#38bdf8'];
              const barColor = colors[index % colors.length];
              return (
                <div key={barangay} className="analytics-bar-row">
                  <span className="analytics-bar-name">{barangay}</span>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${barWidth}%`, backgroundColor: barColor }} />
                  </div>
                  <span className="analytics-bar-count">{count}</span>
                  <span className="analytics-bar-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Member Received Aid by Barangay */}
        <div className="admin-panel dash-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <h3>Member Received Aid by Barangay</h3>
              <span className="panel-subtitle">{votersByBarangay.length} barangays · 0 total</span>
            </div>
          </div>
          <div className="analytics-chart-wrap">
            {votersByBarangay.map(({ barangay, count }, index) => {
              const total = totalResidents || 1;
              const pct = '0.0';
              const barWidth = 0;
              const colors = ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#b45309', '#f97316', '#fb923c', '#fdba74'];
              const barColor = colors[index % colors.length];
              return (
                <div key={barangay} className="analytics-bar-row">
                  <span className="analytics-bar-name">{barangay}</span>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${barWidth}%`, backgroundColor: barColor }} />
                  </div>
                  <span className="analytics-bar-count">0</span>
                  <span className="analytics-bar-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Registrations Table */}
      <div className="admin-panel">
        <div className="panel-header"><h3>Recent Registrations</h3><span className="panel-badge">Live Data</span></div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Referral</th><th>Sector</th><th>House</th><th>Purok</th><th>Brgy</th><th>Contact</th><th>Birthday</th><th>Date Registered</th></tr></thead>
            <tbody>
              {dashLoading ? <tr><td colSpan={9} className="table-loading">Loading...</td></tr>
                : recentRegistrations.length === 0 ? <tr><td colSpan={9} className="table-empty">No registrations yet.</td></tr>
                  : recentRegistrations.map(reg => (
                    <tr key={reg.id}>
                      <td><strong>{getResidentName(reg)}</strong></td>
                      <td>{reg.referral_name}</td>
                      <td><span className="sector-tag">{reg.sector_category}</span></td>
                      <td>{reg.house_no || '-'}</td>
                      <td>{reg.purok || '-'}</td>
                      <td>{reg.barangay || '-'}</td>
                      <td>{reg.contact || '-'}</td>
                      <td>{reg.birthday}</td>
                      <td>{new Date(reg.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderResidents = () => {
    const totalFiltered = residentsCount;
    const totalPages = Math.ceil(totalFiltered / residentsPerPage) || 1;
    const safePage = Math.min(residentsPage, totalPages);
    const startIndex = (safePage - 1) * residentsPerPage;
    const endIndex = Math.min(startIndex + residentsPerPage, totalFiltered);
    const pageResidents = filteredResidents;

    const goToPage = (p) => {
      const newPage = Math.max(1, Math.min(p, totalPages));
      setResidentsPage(newPage);
      fetchAllResidents(newPage, residentSearch);
    };

    return (
      <>
        {/* Action Bar */}
        <div className="residents-action-bar">
          <div className="action-bar-left">
            <div className="search-input-wrap">
              <svg className="search-icon-svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                placeholder="Search residents by name, barangay, or precinct..."
                value={residentSearch}
                onChange={(e) => setResidentSearch(e.target.value)}
                className="residents-search"
              />
            </div>
          </div>
          <div className="action-bar-right">
            <button className="btn btn-action-outline" onClick={downloadSampleCSV}>
              <span>⬇</span> Sample CSV
            </button>
            <button className="btn btn-action-outline" onClick={() => { setShowBulkModal(true); setUploadError(''); setCsvFile(null); setCsvPreview([]); }}>
              <span>📤</span> Bulk Upload
            </button>
            <button className="btn btn-action-primary" onClick={() => { setShowAddModal(true); setAddError(''); }}>
              <span>+</span> Add Resident
            </button>
          </div>
        </div>

        <div className="admin-panel">
          <div className="panel-header">
            <h3>All Registered Voters</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="panel-badge">Total: {totalResidents.toLocaleString()}</span>
              <span className="panel-badge">{totalFiltered.toLocaleString()} Records</span>
            </div>
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Last Name</th><th>First Name</th><th>Middle Name</th><th>Barangay</th><th>Precinct</th><th>Status</th></tr>
              </thead>
              <tbody>
                {residentsLoading ? <tr><td colSpan={6} className="table-loading">Loading residents...</td></tr>
                  : pageResidents.length === 0 ? <tr><td colSpan={6} className="table-empty">{residentSearch ? 'No residents match your search.' : 'No residents found.'}</td></tr>
                    : pageResidents.map(res => (
                      <tr key={res.id}>
                        <td><strong>{res.last_name}</strong></td>
                        <td>{res.first_name}</td>
                        <td>{res.middle_name || '-'}</td>
                        <td>{res.barangay}</td>
                        <td>{res.precinct}</td>
                        <td><span className={`status-tag ${res.status === 'Registered' ? 'registered' : 'verified'}`}>{res.status}</span></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalFiltered > residentsPerPage && (
            <div className="residents-pagination">
              <span className="pagination-info">Showing {startIndex + 1}–{endIndex} of {totalFiltered}</span>
              <div className="pagination-buttons">
                <button className="page-btn" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>← Prev</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) { p = i + 1; }
                  else if (safePage <= 3) { p = i + 1; }
                  else if (safePage >= totalPages - 2) { p = totalPages - 4 + i; }
                  else { p = safePage - 2 + i; }
                  return (
                    <button
                      key={p}
                      className={`page-btn ${p === safePage ? 'page-btn-active' : ''}`}
                      onClick={() => goToPage(p)}
                    >{p}</button>
                  );
                })}
                <button className="page-btn" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const getPhotoSize = (base64) => {
    if (!base64) return '-';
    const kb = Math.round(base64.length / 1024);
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const renderRegistrations = () => {
    const pendingCount = allRegs.filter(r => r.status === 'Pending').length;

    // Duplicate detection: key = name + barangay + contact
    const dupMap = new Map();
    allRegs.forEach(reg => {
      const key = `${getResidentName(reg)}|${reg.barangay || ''}|${reg.contact || ''}`;
      dupMap.set(key, (dupMap.get(key) || 0) + 1);
    });
    const dupKeys = new Set([...dupMap.entries()].filter(([, count]) => count > 1).map(([k]) => k));
    const dupCount = allRegs.filter(reg => dupKeys.has(`${getResidentName(reg)}|${reg.barangay || ''}|${reg.contact || ''}`)).length;

    const filteredRegs = allRegs.filter(r => r.status === regStatusFilter);
    const rejectedCount = allRegs.filter(r => r.status === 'Rejected').length;

    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3>Registration Requests</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {dupCount > 0 && <span className="panel-badge badge-error">{dupCount} Duplicate</span>}
            <span className="panel-badge">{allRegs.length} Total</span>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="reg-status-tabs">
          <button
            className={regStatusFilter === 'Pending' ? 'active' : ''}
            onClick={() => setRegStatusFilter('Pending')}
          >
            Pending <span className="tab-count">{pendingCount}</span>
          </button>
          <button
            className={regStatusFilter === 'Rejected' ? 'active' : ''}
            onClick={() => setRegStatusFilter('Rejected')}
          >
            Rejected <span className="tab-count">{rejectedCount}</span>
          </button>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Portrait</th>
                <th>Name</th>
                <th>Barangay</th>
                <th>Sector</th>
                <th>Referral</th>
                <th>Contact</th>
                <th>Size</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {regsLoading ? <tr><td colSpan={10} className="table-loading">Loading...</td></tr>
                : filteredRegs.length === 0 ? <tr><td colSpan={10} className="table-empty">No {regStatusFilter.toLowerCase()} registrations found.</td></tr>
                  : filteredRegs.map(reg => {
                    const isDup = dupKeys.has(`${getResidentName(reg)}|${reg.barangay || ''}|${reg.contact || ''}`);
                    return (
                      <tr key={reg.id} className={`reg-row-clickable ${isDup ? 'reg-row-duplicate' : ''}`} onClick={() => setSelectedRegDetail(reg)}>
                        <td>
                          {reg.photo_base64 ? (
                            <img src={reg.photo_base64} alt="" className="reg-thumb" />
                          ) : (
                            <div className="reg-thumb-placeholder">👤</div>
                          )}
                        </td>
                        <td>
                          <strong>{getResidentName(reg)}</strong>
                          {isDup && <span className="dup-badge-inline">DUPLICATE</span>}
                        </td>
                        <td>{reg.barangay || '-'}</td>
                        <td><span className="sector-tag">{reg.sector_category}</span></td>
                        <td>{reg.referral_name}</td>
                        <td>{reg.contact || '-'}</td>
                        <td><span className="size-tag">{getPhotoSize(reg.photo_base64)}</span></td>
                        <td>
                          <span className={`status-badge status-${(reg.status || 'pending').toLowerCase()}`}>
                            {reg.status || 'Pending'}
                          </span>
                        </td>
                        <td>{new Date(reg.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="reg-actions">
                            {reg.status === 'Pending' && (
                              <>
                                <button className="btn-action btn-approve" onClick={(e) => { e.stopPropagation(); approveRegistration(reg.id); }} title="Approve">✓</button>
                                <button className="btn-action btn-reject" onClick={(e) => { e.stopPropagation(); rejectRegistration(reg.id); }} title="Reject">✕</button>
                              </>
                            )}
                            {reg.status === 'Rejected' && (
                              <button className="btn-action btn-approve" onClick={(e) => { e.stopPropagation(); approveRegistration(reg.id); }} title="Re-approve">↻</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMembers = () => {
    const members = allRegs.filter(r => r.status === 'Approved');
    const total = members.length;
    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3>Approved Members</h3>
          <span className="panel-badge">{total} TOTAL</span>
        </div>

        {regsLoading ? (
          <div className="table-loading">Loading members...</div>
        ) : total === 0 ? (
          <div className="table-empty">No approved members yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Barangay</th>
                  <th>Purok</th>
                  <th>Sector</th>
                  <th>EM Card No</th>
                  <th>Contact</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {members.map((reg) => {
                  const r = reg.ValidResidents || {};
                  const name = `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}`.trim();
                  return (
                    <tr key={reg.id} className="member-row-clickable" onClick={() => setSelectedMember(reg)}>
                      <td><strong>{name}</strong></td>
                      <td>{r.barangay || '-'}</td>
                      <td>{reg.purok || r.purok || '-'}</td>
                      <td><span className="sector-badge">{reg.sector_category || '-'}</span></td>
                      <td>
                        {reg.em_card_no ? (
                          <code className="em-card-code">{reg.em_card_no}</code>
                        ) : (
                          <span className="qr-token-missing">Needs QR</span>
                        )}
                      </td>
                      <td>{reg.contact || '-'}</td>
                      <td>{new Date(reg.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderNetwork = () => {
    // Build children map: referral_name -> registrations[]
    const childrenMap = new Map();
    allRegs.forEach(reg => {
      const parentName = reg.referral_name || 'No Referral';
      if (!childrenMap.has(parentName)) childrenMap.set(parentName, []);
      childrenMap.get(parentName).push(reg);
    });

    const getChildren = (name) => childrenMap.get(name) || [];

    // All unique leader names (sorted by downline count desc)
    let leaders = [...childrenMap.keys()]
      .map(name => ({ name, count: childrenMap.get(name).length }))
      .sort((a, b) => b.count - a.count);

    const totalNetwork = allRegs.length;
    const top3 = leaders.slice(0, 3);

    // Filter by search
    const q = networkSearch.trim().toLowerCase();
    if (q) {
      leaders = leaders.filter(l =>
        l.name.toLowerCase().includes(q) ||
        getChildren(l.name).some(r => getResidentName(r).toLowerCase().includes(q))
      );
    }

    const toggleNode = (key) => {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };

    // Recursive tree node renderer
    const renderTreeNode = (reg, depth) => {
      const name = getResidentName(reg);
      const children = getChildren(name);
      const hasChildren = children.length > 0;
      const nodeKey = reg.id;
      const isOpen = expandedNodes.has(nodeKey);
      const levelLabel = depth === 0 ? 'L1' : depth === 1 ? 'L2' : depth === 2 ? 'L3' : `L${depth + 1}`;

      return (
        <div key={nodeKey} className="tree-branch" style={{ marginLeft: depth * 20 }}>
          <div className={`tree-node ${hasChildren ? 'has-children' : ''}`} onClick={() => { if (hasChildren) toggleNode(nodeKey); else setSelectedRegDetail(reg); }}>
            {hasChildren ? (
              <span className={`tree-chevron ${isOpen ? 'open' : ''}`}>▸</span>
            ) : (
              <span className="tree-chevron-spacer" />
            )}
            {reg.photo_base64 ? (
              <img src={reg.photo_base64} alt="" className="tree-node-photo" />
            ) : (
              <div className="tree-node-placeholder">👤</div>
            )}
            <div className="tree-node-info">
              <span className="tree-node-name">{name}</span>
              <span className="tree-node-meta">{reg.barangay || '-'} · {reg.sector_category} · <span className="tree-level-tag">{levelLabel}</span></span>
            </div>
            {hasChildren && <span className="tree-node-count">{children.length} downline</span>}
            <span className={`status-badge status-${(reg.status || 'pending').toLowerCase()}`}>{reg.status || 'Pending'}</span>
          </div>
          {isOpen && children.map(child => renderTreeNode(child, depth + 1))}
        </div>
      );
    };

    return (
      <div className="admin-panel">
        {/* Header */}
        <div className="panel-header">
          <h3>Referral Network</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="panel-badge badge-emerald">{leaders.length} Leaders</span>
            <span className="panel-badge">{totalNetwork} Members</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="network-stats-row">
          <div className="network-stat-card">
            <span className="network-stat-num">{leaders.length}</span>
            <span className="network-stat-label">Leaders</span>
          </div>
          <div className="network-stat-card">
            <span className="network-stat-num">{totalNetwork}</span>
            <span className="network-stat-label">Total Members</span>
          </div>
          <div className="network-stat-card highlight">
            <span className="network-stat-num">{top3[0]?.count || 0}</span>
            <span className="network-stat-label">Top Recruiter</span>
            <span className="network-stat-sub">{top3[0]?.name || '-'}</span>
          </div>
        </div>

        {/* Search */}
        <div className="network-search-wrap">
          <input
            type="text"
            placeholder="Search leader or member name..."
            value={networkSearch}
            onChange={(e) => setNetworkSearch(e.target.value)}
            className="network-search-input"
          />
        </div>

        {/* Top Recruiters Bar */}
        {top3.length > 0 && (
          <div className="top-recruiters-bar">
            <span className="top-recruiters-title">🏆 Top Recruiters</span>
            <div className="top-recruiters-list">
              {top3.map((l, i) => (
                <div key={l.name} className="top-recruiter-chip" style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className="top-recruiter-rank">#{i + 1}</span>
                  <span className="top-recruiter-name">{l.name}</span>
                  <span className="top-recruiter-count">{l.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recursive Tree Forest */}
        <div className="tree-forest">
          {regsLoading ? <div className="table-loading">Loading...</div>
            : allRegs.length === 0 ? <div className="table-empty">No registrations yet to build network.</div>
              : leaders.map(({ name, count }) => {
                  const rootKey = `root:${name}`;
                  const isOpen = expandedNodes.has(rootKey);
                  const members = getChildren(name);
                  return (
                    <div key={name} className="tree-root">
                      <div className="tree-root-header" onClick={() => toggleNode(rootKey)}>
                        <span className={`tree-root-chevron ${isOpen ? 'open' : ''}`}>▸</span>
                        <span className="tree-root-icon">🔺</span>
                        <span className="tree-root-name">{name}</span>
                        <span className="tree-root-badge">{count} direct · {members.reduce((sum, m) => sum + 1 + getChildren(getResidentName(m)).length, 0)} total</span>
                      </div>
                      {isOpen && (
                        <div className="tree-root-children">
                          {members.map(reg => renderTreeNode(reg, 0))}
                        </div>
                      )}
                    </div>
                  );
                })}
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    const typeLabels = { announcement: '📢 Announcement', event_reminder: '📅 Event Reminder', emergency: '🚨 Emergency', broadcast: '📣 Broadcast' };
    const typeColors = { announcement: '#3b82f6', event_reminder: '#f59e0b', emergency: '#ef4444', broadcast: '#10b981' };

    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3>SMS Messages</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`msg-tab-btn ${msgTab === 'compose' ? 'active' : ''}`} onClick={() => setMsgTab('compose')}>✏️ Compose</button>
            <button className={`msg-tab-btn ${msgTab === 'history' ? 'active' : ''}`} onClick={() => { setMsgTab('history'); fetchMessages(); }}>📜 History</button>
          </div>
        </div>

        {msgTab === 'compose' && (
          <div className="msg-compose-wrap">
            <form onSubmit={handleSendMessage} className="msg-compose-form">
              <div className="msg-type-selector">
                {Object.entries(typeLabels).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`msg-type-chip ${msgForm.type === key ? 'active' : ''}`}
                    onClick={() => setMsgForm(f => ({ ...f, type: key }))}
                    style={{ '--chip-color': typeColors[key] }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="msg-form-row">
                <label className="msg-label">Title / Subject</label>
                <input
                  type="text"
                  className="msg-input"
                  placeholder="e.g. Barangay Assembly Meeting"
                  value={msgForm.title}
                  onChange={e => setMsgForm(f => ({ ...f, title: e.target.value }))}
                  maxLength={100}
                />
              </div>

              <div className="msg-form-row">
                <label className="msg-label">Target Audience</label>
                <div className="msg-target-row">
                  <select
                    className="msg-select"
                    value={msgForm.targetType}
                    onChange={e => setMsgForm(f => ({ ...f, targetType: e.target.value, targetValue: '' }))}
                  >
                    <option value="all">All Registered Members</option>
                    <option value="sector">By Sector / Organization</option>
                    <option value="barangay">By Barangay</option>
                    <option value="leader">By Referral Leader</option>
                    <option value="specific">👤 Specific User</option>
                    <option value="test">🧪 Test: Send to me only</option>
                  </select>
                  {msgForm.targetType === 'sector' && (
                    <select className="msg-select" value={msgForm.targetValue} onChange={e => setMsgForm(f => ({ ...f, targetValue: e.target.value }))}>
                      <option value="">Select Sector...</option>
                      <option value="Senior Citizens">Senior Citizens</option>
                      <option value="PWD">PWD</option>
                      <option value="Solo Parent">Solo Parent</option>
                      <option value="Youth">Youth</option>
                      <option value="Women">Women</option>
                      <option value="Farmers">Farmers</option>
                      <option value="Fisherfolk">Fisherfolk</option>
                      <option value="Workers / Labor">Workers / Labor</option>
                      <option value="Religious">Religious</option>
                      <option value="Transport">Transport</option>
                      <option value="Indigenous People">Indigenous People</option>
                    </select>
                  )}
                  {msgForm.targetType === 'barangay' && (
                    <input type="text" className="msg-input" placeholder="Enter barangay name..." value={msgForm.targetValue} onChange={e => setMsgForm(f => ({ ...f, targetValue: e.target.value }))} />
                  )}
                  {msgForm.targetType === 'leader' && (
                    <input type="text" className="msg-input" placeholder="Enter leader name..." value={msgForm.targetValue} onChange={e => setMsgForm(f => ({ ...f, targetValue: e.target.value }))} />
                  )}
                  {msgForm.targetType === 'specific' && (
                    <div className="msg-user-search-wrap">
                      <input
                        type="text"
                        className="msg-input"
                        placeholder="Search user by name..."
                        value={msgUserSearch}
                        onChange={e => { setMsgUserSearch(e.target.value); searchSpecificUser(e.target.value); }}
                      />
                      {msgUserResults.length > 0 && (
                        <div className="msg-user-results">
                          {msgUserResults.map(reg => {
                            const name = getResidentName(reg);
                            return (
                              <div
                                key={reg.id}
                                className="msg-user-result-item"
                                onClick={() => {
                                  setMsgForm(f => ({ ...f, targetValue: reg.id }));
                                  setMsgUserSearch(name);
                                  setMsgUserResults([]);
                                }}
                              >
                                <span className="msg-user-result-name">{name}</span>
                                <span className="msg-user-result-phone">{reg.contact || 'No phone'}</span>
                                <span className="msg-user-result-meta">{reg.sector_category || '-'} · {reg.barangay || '-'}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {msgForm.targetType === 'test' && (
                    <input type="tel" className="msg-input" placeholder="Your phone number (e.g. 09171234567)" value={msgForm.targetValue} onChange={e => setMsgForm(f => ({ ...f, targetValue: e.target.value }))} maxLength={11} />
                  )}
                </div>
              </div>

              <div className="msg-form-row">
                <label className="msg-label">Message Body</label>
                <textarea
                  className="msg-textarea"
                  placeholder="Type your SMS message here..."
                  value={msgForm.body}
                  onChange={e => setMsgForm(f => ({ ...f, body: e.target.value }))}
                  maxLength={480}
                  rows={5}
                  required
                />
                <div className="msg-char-count">{msgForm.body.length}/480 characters</div>
              </div>

              <div className="msg-form-footer">
                <div className="msg-preview-box">
                  <span className="msg-preview-label">Preview:</span>
                  <p className="msg-preview-text">{msgForm.body || 'Your message will appear here...'}</p>
                </div>
                <button type="submit" className="btn btn-msg-send" disabled={msgSending || !msgForm.body.trim()}>
                  {msgSending ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
            </form>
          </div>
        )}

        {msgTab === 'history' && (
          <div className="msg-history-wrap">
            {messagesLoading ? <div className="table-loading">Loading messages...</div>
              : messages.length === 0 ? <div className="table-empty">No messages sent yet.</div>
                : (
                  <div className="msg-list">
                    {messages.map(msg => (
                      <div key={msg.id} className={`msg-card msg-status-${msg.status}`} onClick={() => fetchMsgRecipients(msg.id)}>
                        <div className="msg-card-header">
                          <span className="msg-card-type" style={{ background: typeColors[msg.type] || '#6b7280' }}>{typeLabels[msg.type]?.split(' ')[0] || msg.type}</span>
                          <span className="msg-card-date">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <h4 className="msg-card-title">{msg.title}</h4>
                        <p className="msg-card-body">{msg.body}</p>
                        <div className="msg-card-stats">
                          <span className="msg-stat"><strong>{msg.total_recipients}</strong> total</span>
                          <span className="msg-stat success"><strong>{msg.sent_count}</strong> sent</span>
                          {msg.failed_count > 0 && <span className="msg-stat error"><strong>{msg.failed_count}</strong> failed</span>}
                          <span className={`msg-status-pill status-${msg.status}`}>{msg.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

            {/* Recipients Detail Modal */}
            {selectedMessage && (
              <div className="modal-overlay" onClick={() => setSelectedMessage(null)}>
                <div className="modal-card msg-recipients-modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Delivery Status</h3>
                    <button className="modal-close-x" onClick={() => setSelectedMessage(null)}>✕</button>
                  </div>
                  <div className="modal-body">
                    <div className="msg-recipients-summary">
                      <span className="msg-recipients-count">{msgRecipients.length} recipients</span>
                      <span className="msg-recipients-sent">{msgRecipients.filter(r => r.status === 'sent').length} delivered</span>
                      <span className="msg-recipients-failed">{msgRecipients.filter(r => r.status === 'failed').length} failed</span>
                    </div>
                    <div className="msg-recipients-list">
                      {msgRecipients.map(rec => (
                        <div key={rec.id} className={`msg-recipient-row status-${rec.status}`}>
                          <span className="msg-recipient-name">{rec.resident_name || 'Unknown'}</span>
                          <span className="msg-recipient-phone">{rec.phone_number}</span>
                          <span className={`msg-recipient-badge ${rec.status}`}>{rec.status}</span>
                          {rec.error_message && <span className="msg-recipient-error" title={rec.error_message}>⚠️</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderReports = () => (
    <div className="admin-panel">
      <div className="panel-header"><h3>Reports</h3><span className="panel-badge">Coming Soon</span></div>
      <div className="table-empty" style={{ padding: '60px 24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
        <h4 style={{ color: 'var(--green-black)', marginBottom: '8px' }}>Analytics & Reports</h4>
        <p style={{ color: 'var(--muted)' }}>Advanced reporting features will be available in the next update.</p>
      </div>
    </div>
  );

  // ─── EVENT SCANNER ───
  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scan_events')
        .select('*')
        .eq('status', 'Active')
        .order('created_at', { ascending: false });
      if (!error) setEvents(data || []);
    } catch (e) { console.error(e); }
    setEventsLoading(false);
  };

  const fetchEventScans = async (eventId) => {
    try {
      // 1. Fetch latest 100 scans (stays well under Supabase 1000-row limit)
      const { data, error } = await supabase
        .from('event_scans')
        .select('*, registrations(qr_token, em_card_no, contact, purok, house_no, ValidResidents(first_name, last_name, middle_name, barangay))')
        .eq('event_id', eventId)
        .order('scanned_at', { ascending: false })
        .limit(100);

      // 2. Get accurate total count via count() (no row limit)
      const { count, error: countErr } = await supabase
        .from('event_scans')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (!error) {
        setEventScans(data || []);
        const trueCount = count || (data || []).length;
        localScanCountRef.current = trueCount; // sync optimistic counter with truth
        setScanStats({ total: trueCount, duplicates: 0 });
      }
    } catch (e) { console.error(e); }
  };

  // Lightweight count-only refresh (used after each scan during mass scanning)
  const refreshScanCount = async (eventId) => {
    try {
      const { count, error } = await supabase
        .from('event_scans')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);
      if (!error) {
        setScanStats(prev => ({ ...prev, total: count || prev.total }));
      }
    } catch (e) { console.error(e); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEventForm.event_name.trim()) return;
    try {
      const { data, error } = await supabase.from('scan_events').insert({
        event_name: newEventForm.event_name.trim(),
        event_date: newEventForm.event_date || null,
        location: newEventForm.location.trim() || null,
        status: 'Active',
        created_by: username,
      }).select().single();
      if (error) throw error;
      showToast('Event created: ' + data.event_name, 'success');
      setShowCreateEvent(false);
      setNewEventForm({ event_name: '', event_date: '', location: '' });
      setEvents(prev => [data, ...prev]);
    } catch (err) {
      showToast('Failed to create event: ' + err.message, 'error');
    }
  };

  const resetScanState = () => {
    setScanResult(null);
    scanInProgressRef.current = false;
    // NOTE: localScanCountRef is NOT reset — it persists across scans for the event
  };

  const handleEventScan = async (rawToken) => {
    if (!rawToken.trim() || !selectedEvent) return;
    scanInProgressRef.current = true;
    setScanLoading(true);
    setScanResult(null);

    try {
      let cleanToken = rawToken.trim().replace(/[\r\n\t]/g, '');

      // DEBUG: log what we got
      console.log('[Scanner] Raw decoded text:', cleanToken);

      // If the QR contains a URL, extract the token from it
      // e.g. https://www.em-card.com/card/EM-1234567890
      const urlTokenMatch = cleanToken.match(/\/card\/(EM[A-Za-z0-9-]+)/);
      if (urlTokenMatch) {
        cleanToken = urlTokenMatch[1];
        console.log('[Scanner] Extracted token from URL:', cleanToken);
      }

      // SECURITY: Strict token format validation
      // Accept either new format (EM-10digits) or old format (EM+24chars)
      const validTokenPattern = /^(EM[A-Za-z0-9]{24}|EM-\d{10})$/;
      if (!validTokenPattern.test(cleanToken)) {
        console.warn('[Scanner] Token failed validation:', cleanToken);
        setScanResult({ type: 'invalid', message: 'SECURITY ALERT: Invalid QR format. This is NOT a valid EM Card.' });
        setScanLoading(false);
        setScanToken('');
        scanInProgressRef.current = false;
        return;
      }

      // 1. Look up registration by QR token
      const { data: reg, error: regErr } = await supabase
        .from('registrations')
        .select('*, ValidResidents(first_name, last_name, middle_name, barangay)')
        .ilike('qr_token', cleanToken)
        .eq('status', 'Approved')
        .maybeSingle();

      if (regErr || !reg) {
        setScanResult({ type: 'invalid', message: 'SECURITY ALERT: Unregistered or unauthorized EM Card. This QR code is not in our system.' });
        setScanLoading(false);
        setScanToken('');
        scanInProgressRef.current = false;
        return;
      }

      const person = reg.ValidResidents || {};
      const fullName = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}`.trim();

      // 2. Check if already scanned at THIS event (cryptographic duplicate prevention)
      const { data: existingScan, error: dupErr } = await supabase
        .from('event_scans')
        .select('scanned_at, scanned_by')
        .eq('event_id', selectedEvent.id)
        .eq('registration_id', reg.id)
        .maybeSingle();

      if (dupErr) console.warn('Duplicate check error:', dupErr);

      if (existingScan) {
        // DUPLICATE — show RED warning
        setScanResult({
          type: 'duplicate',
          name: fullName,
          barangay: person.barangay || '-',
          purok: reg.purok || person.purok || '-',
          houseNo: reg.house_no || '-',
          contact: reg.contact || '-',
          photo: reg.photo_base64 || person.photo_base64,
          emCardNo: reg.em_card_no || '-',
          qrToken: reg.qr_token,
          scannedAt: existingScan.scanned_at,
          scannedBy: existingScan.scanned_by,
        });
        setScanLoading(false);
        setScanToken('');
        return;
      }

      // 3. Record the scan in event_scans (permanent lock)
      const { error: insertErr } = await supabase.from('event_scans').insert({
        event_id: selectedEvent.id,
        registration_id: reg.id,
        scanned_by: username,
      });

      if (insertErr) {
        // Could be a race condition — check again
        const { data: raceCheck } = await supabase
          .from('event_scans')
          .select('scanned_at')
          .eq('event_id', selectedEvent.id)
          .eq('registration_id', reg.id)
          .maybeSingle();
        if (raceCheck) {
          setScanResult({
            type: 'duplicate',
            name: fullName,
            barangay: person.barangay || '-',
            purok: reg.purok || person.purok || '-',
            houseNo: reg.house_no || '-',
            contact: reg.contact || '-',
            photo: reg.photo_base64 || person.photo_base64,
            emCardNo: reg.em_card_no || '-',
            qrToken: reg.qr_token,
            scannedAt: raceCheck.scanned_at,
            scannedBy: 'another staff',
          });
          setScanLoading(false);
          setScanToken('');
          scanInProgressRef.current = false;
          return;
        }
        throw insertErr;
      }

      // 4. Update registration global scan stats
      await supabase.from('registrations').update({
        last_scanned_at: new Date().toISOString(),
        scan_count: (reg.scan_count || 0) + 1,
      }).eq('id', reg.id);

      setScanResult({
        type: 'success',
        name: fullName,
        barangay: person.barangay || '-',
        purok: reg.purok || person.purok || '-',
        houseNo: reg.house_no || '-',
        contact: reg.contact || '-',
        photo: reg.photo_base64 || person.photo_base64,
        emCardNo: reg.em_card_no || '-',
        qrToken: reg.qr_token,
        scanCount: (reg.scan_count || 0) + 1,
      });

      // Optimistic local count — zero HTTP calls during mass scanning
      localScanCountRef.current += 1;
      setScanStats(prev => ({ ...prev, total: localScanCountRef.current }));
    } catch (err) {
      setScanResult({ type: 'error', message: err.message || 'Network error. Try again.' });
    } finally {
      setScanLoading(false);
      setScanToken('');
      scanInProgressRef.current = false;
    }
  };

  const renderEventScanner = () => {
    // ─── Select Event Screen ───
    if (scannerMode === 'select' || !selectedEvent) {
      return (
        <div className="admin-panel">
          <div className="panel-header">
            <h3><ScanLine size={22} /> Event Scanner</h3>
            <span className="panel-badge">Distribution Verification</span>
          </div>

          <div className="event-scanner-intro">
            <ShieldCheck size={48} />
            <h4>Select an Active Event to Begin Scanning</h4>
            <p>Scan EM Card QR codes to verify resident eligibility and prevent duplicate distribution.</p>
          </div>

          {eventsLoading ? (
            <div className="table-loading">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="table-empty">
              <p>No active events found. Create one to start scanning.</p>
            </div>
          ) : (
            <div className="event-list-grid">
              {events.map(evt => (
                <div key={evt.id} className="event-card" onClick={() => { setSelectedEvent(evt); setScannerMode('scan'); localScanCountRef.current = 0; fetchEventScans(evt.id); }}>
                  <div className="event-card-icon">📅</div>
                  <div className="event-card-body">
                    <h5>{evt.event_name}</h5>
                    <p>{evt.location || 'No location'}</p>
                    <small>{evt.event_date ? new Date(evt.event_date).toLocaleDateString() : 'No date'}</small>
                  </div>
                  <button className="btn btn-sm btn-primary">Select →</button>
                </div>
              ))}
            </div>
          )}

          <div className="event-create-section">
            {!showCreateEvent ? (
              <button className="btn btn-outline" onClick={() => setShowCreateEvent(true)}>+ Create New Event</button>
            ) : (
              <form className="event-create-form" onSubmit={handleCreateEvent}>
                <h5>Create New Event</h5>
                <input type="text" placeholder="Event Name *" required value={newEventForm.event_name} onChange={e => setNewEventForm(p => ({ ...p, event_name: e.target.value }))} />
                <input type="date" value={newEventForm.event_date} onChange={e => setNewEventForm(p => ({ ...p, event_date: e.target.value }))} />
                <input type="text" placeholder="Location" value={newEventForm.location} onChange={e => setNewEventForm(p => ({ ...p, location: e.target.value }))} />
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateEvent(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Event</button>
                </div>
              </form>
            )}
          </div>
        </div>
      );
    }

    // ─── Scanner Screen ───
    return (
      <div className="admin-panel event-scanner-panel">
        {/* Scanner Header */}
        <div className="event-scanner-header">
          <div>
            <h3><ScanLine size={22} /> {selectedEvent.event_name}</h3>
            <p>{selectedEvent.location || ''} {selectedEvent.event_date ? '• ' + new Date(selectedEvent.event_date).toLocaleDateString() : ''}</p>
          </div>
          <div className="event-scanner-actions">
            <span className="scan-stat-badge">{scanStats.total.toLocaleString()} Scanned</span>
            <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedEvent(null); setScannerMode('select'); localScanCountRef.current = 0; resetScanState(); }}>← Change Event</button>
          </div>
        </div>

        {/* Result panel — shown for capture & manual modes */}
        {scanResult && scannerInputMode !== 'camera' && (
          <div className={`scan-result-panel scan-result-${scanResult.type}`}>
            {scanResult.type === 'success' && (
              <>
                <div className="scan-result-badge success"><CheckCircle size={32} /> VERIFIED — ELIGIBLE</div>
                <div className="scan-result-profile">
                  <div className="scan-result-photo">
                    {scanResult.photo ? <img src={scanResult.photo} alt="" /> : <User size={60} />}
                  </div>
                  <div className="scan-result-info">
                    <h2>{scanResult.name}</h2>
                    <div className="scan-result-meta-grid">
                      <span><MapPin size={14} /> {scanResult.barangay}</span>
                      <span>🏠 {scanResult.houseNo}</span>
                      <span>📍 {scanResult.purok}</span>
                      <span><Phone size={14} /> {scanResult.contact}</span>
                      <span>💳 {scanResult.emCardNo}</span>
                    </div>
                  </div>
                </div>
                <div className="scan-result-footer">
                  <span>Scan #{scanResult.scanCount} recorded</span>
                  <button className="btn btn-primary" onClick={resetScanState}>Scan Next →</button>
                </div>
              </>
            )}

            {scanResult.type === 'duplicate' && (
              <>
                <div className="scan-result-badge duplicate"><AlertTriangle size={32} /> DUPLICATE — STOP DISTRIBUTION</div>
                <div className="scan-result-profile">
                  <div className="scan-result-photo">
                    {scanResult.photo ? <img src={scanResult.photo} alt="" /> : <User size={60} />}
                  </div>
                  <div className="scan-result-info">
                    <h2>{scanResult.name}</h2>
                    <div className="scan-result-meta-grid">
                      <span><MapPin size={14} /> {scanResult.barangay}</span>
                      <span>🏠 {scanResult.houseNo}</span>
                      <span>📍 {scanResult.purok}</span>
                      <span><Phone size={14} /> {scanResult.contact}</span>
                      <span>💳 {scanResult.emCardNo}</span>
                    </div>
                  </div>
                </div>
                <div className="scan-result-footer duplicate-footer">
                  <div className="duplicate-warning">
                    <strong>⚠ ALREADY SCANNED</strong>
                    <p>At <strong>{selectedEvent.event_name}</strong> on {new Date(scanResult.scannedAt).toLocaleString()}</p>
                    {scanResult.scannedBy && <p>By: {scanResult.scannedBy}</p>}
                    <p className="duplicate-stop">❌ DO NOT DISTRIBUTE — This resident has already received items.</p>
                  </div>
                  <button className="btn btn-danger" onClick={resetScanState}>Acknowledge &amp; Scan Next</button>
                </div>
              </>
            )}

            {(scanResult.type === 'invalid' || scanResult.type === 'error') && (
              <>
                <div className="scan-result-badge invalid"><X size={32} /> {scanResult.type === 'invalid' ? 'INVALID CARD' : 'ERROR'}</div>
                <p className="scan-error-message">{scanResult.message}</p>
                <button className="btn btn-secondary" onClick={resetScanState}>Try Again</button>
              </>
            )}
          </div>
        )}

        {/* Scan Input */}
        <div className="scan-input-panel">
            {/* Mode Toggle */}
            <div className="scanner-mode-toggle">
              <button
                className={scannerInputMode === 'camera' ? 'active' : ''}
                onClick={() => setScannerInputMode('camera')}
              >
                <Camera size={16} /> Camera
              </button>
              <button
                className={scannerInputMode === 'capture' ? 'active' : ''}
                onClick={() => setScannerInputMode('capture')}
              >
                <Upload size={16} /> Capture
              </button>
              <button
                className={scannerInputMode === 'manual' ? 'active' : ''}
                onClick={() => setScannerInputMode('manual')}
              >
                <ScanLine size={16} /> Manual
              </button>
            </div>

            {/* ── CAMERA MODE ── */}
            {scannerInputMode === 'camera' && (
              <>
                <div className="camera-scanner-container" style={{ position: 'relative', minHeight: 320 }}>
                  <div id="event-scanner-camera" style={{ width: '100%', height: '100%' }}></div>
                  {!cameraActive && (
                    <div className="camera-placeholder" style={{ position: 'absolute', inset: 0 }}>
                      <Camera size={48} />
                      <p>Starting camera...</p>
                      <small>If camera fails, switch to Capture or Manual mode</small>
                    </div>
                  )}

                  {/* Result overlay — covers camera without unmounting it */}
                  {scanResult && (
                    <div className="scan-result-overlay" style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      zIndex: 10,
                      background: 'rgba(255,255,255,0.98)',
                      overflowY: 'auto',
                      padding: 20,
                      borderRadius: 12
                    }}>
                      {scanResult.type === 'success' && (
                        <>
                          <div className="scan-result-badge success"><CheckCircle size={32} /> VERIFIED</div>
                          <div className="scan-result-profile">
                            <div className="scan-result-photo">
                              {scanResult.photo ? <img src={scanResult.photo} alt="" /> : <User size={60} />}
                            </div>
                            <div className="scan-result-info">
                              <h2>{scanResult.name}</h2>
                              <div className="scan-result-meta-grid">
                                <span><MapPin size={14} /> {scanResult.barangay}</span>
                                <span>🏠 {scanResult.houseNo}</span>
                                <span>📍 {scanResult.purok}</span>
                                <span><Phone size={14} /> {scanResult.contact}</span>
                                <span>💳 {scanResult.emCardNo}</span>
                              </div>
                            </div>
                          </div>
                          <div className="scan-result-footer">
                            <span>Scan #{scanResult.scanCount} recorded</span>
                            <button className="btn btn-primary" onClick={resetScanState}>Scan Next →</button>
                          </div>
                        </>
                      )}

                      {scanResult.type === 'duplicate' && (
                        <>
                          <div className="scan-result-badge duplicate"><AlertTriangle size={32} /> DUPLICATE — STOP</div>
                          <div className="scan-result-profile">
                            <div className="scan-result-photo">
                              {scanResult.photo ? <img src={scanResult.photo} alt="" /> : <User size={60} />}
                            </div>
                            <div className="scan-result-info">
                              <h2>{scanResult.name}</h2>
                              <div className="scan-result-meta-grid">
                                <span><MapPin size={14} /> {scanResult.barangay}</span>
                                <span>🏠 {scanResult.houseNo}</span>
                                <span>📍 {scanResult.purok}</span>
                                <span><Phone size={14} /> {scanResult.contact}</span>
                                <span>💳 {scanResult.emCardNo}</span>
                              </div>
                            </div>
                          </div>
                          <div className="scan-result-footer duplicate-footer">
                            <div className="duplicate-warning">
                              <strong>⚠ ALREADY SCANNED</strong>
                              <p>At <strong>{selectedEvent.event_name}</strong> on {new Date(scanResult.scannedAt).toLocaleString()}</p>
                              {scanResult.scannedBy && <p>By: {scanResult.scannedBy}</p>}
                              <p className="duplicate-stop">❌ DO NOT DISTRIBUTE</p>
                            </div>
                            <button className="btn btn-danger" onClick={resetScanState}>Acknowledge &amp; Scan Next</button>
                          </div>
                        </>
                      )}

                      {(scanResult.type === 'invalid' || scanResult.type === 'error') && (
                        <>
                          <div className="scan-result-badge invalid"><X size={32} /> {scanResult.type === 'invalid' ? 'INVALID CARD' : 'ERROR'}</div>
                          <p className="scan-error-message">{scanResult.message}</p>
                          <button className="btn btn-secondary" onClick={resetScanState}>Try Again</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="camera-hint">Point camera at the resident's EM Card QR code</p>
              </>
            )}

            {/* ── CAPTURE MODE ── */}
            {scannerInputMode === 'capture' && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setScanLoading(true);
                    try {
                      const resized = await resizeImage(file, 1600);
                      let decodedText = null;

                      // 1. Try native BarcodeDetector API
                      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
                        try {
                          const detector = new BarcodeDetector({ formats: ['qr_code'] });
                          const bitmap = await createImageBitmap(resized);
                          const codes = await detector.detect(bitmap);
                          if (codes.length > 0 && codes[0].rawValue) decodedText = codes[0].rawValue;
                        } catch (nativeErr) { console.warn('Native BarcodeDetector failed:', nativeErr); }
                      }

                      // 2. Fallback to jsQR
                      if (!decodedText) {
                        try {
                          const jsQR = (await import('jsqr')).default;
                          const img = new Image();
                          const url = URL.createObjectURL(resized);
                          decodedText = await new Promise((resolve) => {
                            img.onload = () => {
                              URL.revokeObjectURL(url);
                              const canvas = document.createElement('canvas');
                              canvas.width = img.width;
                              canvas.height = img.height;
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(img, 0, 0);
                              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                              const result = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
                              resolve(result ? result.data : null);
                            };
                            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
                            img.src = url;
                          });
                        } catch (jsqrErr) { console.warn('jsQR failed:', jsqrErr); }
                      }

                      if (decodedText) handleEventScan(decodedText);
                      else {
                        setScanResult({ type: 'invalid', message: 'Could not read QR code from image. Please ensure the QR is clearly visible and try again, or use Manual entry.' });
                        setScanLoading(false);
                      }
                    } catch (err) {
                      console.warn('QR processing error:', err);
                      setScanResult({ type: 'invalid', message: 'Could not read QR code from image. Please ensure the QR is clearly visible and try again, or use Manual entry.' });
                      setScanLoading(false);
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
                <div className="camera-scanner-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <Camera size={64} style={{ opacity: 0.5 }} />
                  <h4 style={{ margin: 0 }}>Capture QR Code</h4>
                  <p style={{ textAlign: 'center', margin: 0, color: 'var(--muted)' }}>
                    Tap the button below to open your camera, then take a photo of the EM Card QR code.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '14px 32px', fontSize: '1.1rem' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={20} style={{ marginRight: 8 }} /> Capture QR
                  </button>
                </div>
                {scanLoading && (
                  <div className="scan-spinner" style={{ marginTop: 16 }}>Analyzing image...</div>
                )}
              </>
            )}

            {/* ── MANUAL MODE ── */}
            {scannerInputMode === 'manual' && (
              <>
                <div className="scan-input-icon"><ScanLine size={40} /></div>
                <h4>Manual QR Entry</h4>
                <p>Type or paste the QR token from the EM Card</p>
                <form onSubmit={e => { e.preventDefault(); handleEventScan(scanToken); }}>
                  <input
                    type="text"
                    value={scanToken}
                    onChange={e => setScanToken(e.target.value)}
                    placeholder="Enter QR token (e.g., EM...)"
                    className="scan-token-input"
                    autoFocus
                    autoComplete="off"
                  />
                  <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }}>Verify</button>
                </form>
                {scanLoading && <div className="scan-spinner">Verifying...</div>}
              </>
            )}
          </div>

        {/* Recent Scans Table */}
        {eventScans.length > 0 && (
          <div className="event-scans-table">
            <h5>Recent Scans ({eventScans.length})</h5>
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Barangay</th><th>EM Card</th><th>Scanned At</th><th>By</th></tr>
              </thead>
              <tbody>
                {eventScans.slice(0, 20).map((s, i) => {
                  const person = s.registrations?.ValidResidents || {};
                  const name = `${person.first_name || ''} ${person.middle_name || ''} ${person.last_name || ''}`.trim();
                  return (
                    <tr key={i}>
                      <td>{name || '—'}</td>
                      <td>{person.barangay || '—'}</td>
                      <td><code>{s.registrations?.em_card_no || '—'}</code></td>
                      <td>{new Date(s.scanned_at).toLocaleString()}</td>
                      <td>{s.scanned_by || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          {toast.message}
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">EM</span>
          <div className="sidebar-brand-text"><strong>EM Card</strong><small>Admin Portal</small></div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.id} className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => handleNavClick(item.id)}>
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Promo Card */}
        <div className="sidebar-promo">
          <div className="sidebar-promo-icon"><ShieldCheck size={24} /></div>
          <h4>Building a stronger community together</h4>
          <p>Your work helps empower thousands of families.</p>
          <div className="sidebar-promo-dots">
            <span className="sidebar-promo-dot active"></span>
            <span className="sidebar-promo-dot"></span>
            <span className="sidebar-promo-dot"></span>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{username.charAt(0).toUpperCase()}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{username}</span>
              <span className="sidebar-user-role">Administrator</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}><span>⎋</span> Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="admin-topbar-title">{navItems.find(n => n.id === activeTab)?.label}</div>
          <div className="admin-topbar-right">
            <span className="topbar-date">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>

            <div className="topbar-notify">
              <Bell size={18} />
              <span className="topbar-notify-badge"></span>
            </div>

            <div className="topbar-user">
              <div className="topbar-user-info">
                <span className="topbar-user-name">{username || 'Admin'}</span>
                <span className="topbar-user-role">Administrator</span>
              </div>
              <div className="topbar-user-avatar">{(username || 'A').charAt(0).toUpperCase()}</div>
            </div>
          </div>
        </header>
        <div className="admin-content">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'residents' && renderResidents()}
          {activeTab === 'registrations' && renderRegistrations()}
          {activeTab === 'members' && renderMembers()}
          {activeTab === 'eventScanner' && renderEventScanner()}
          {activeTab === 'network' && renderNetwork()}
          {activeTab === 'messages' && renderMessages()}
          {activeTab === 'reports' && renderReports()}
        </div>
      </main>

      {/* ADD RESIDENT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Add New Resident</h3><button className="modal-close-x" onClick={() => setShowAddModal(false)}>✕</button></div>
            <form onSubmit={handleAddResident} className="modal-form">
              <div className="modal-form-grid">
                <div className="form-group"><label>Last Name <span className="req-star">*</span></label><input value={newResident.last_name} onChange={(e) => setNewResident({...newResident, last_name: e.target.value})} required /></div>
                <div className="form-group"><label>First Name <span className="req-star">*</span></label><input value={newResident.first_name} onChange={(e) => setNewResident({...newResident, first_name: e.target.value})} required /></div>
                <div className="form-group"><label>Middle Name</label><input value={newResident.middle_name} onChange={(e) => setNewResident({...newResident, middle_name: e.target.value})} /></div>
                <div className="form-group"><label>Barangay <span className="req-star">*</span></label><input value={newResident.barangay} onChange={(e) => setNewResident({...newResident, barangay: e.target.value})} required /></div>
                <div className="form-group"><label>Precinct <span className="req-star">*</span></label><input value={newResident.precinct} onChange={(e) => setNewResident({...newResident, precinct: e.target.value})} required placeholder="e.g. 0036A" /></div>
              </div>
              {addError && <p className="form-error">{addError}</p>}
              <div className="modal-footer">
                <button type="button" className="btn btn-modal-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-modal-primary" disabled={addLoading}>{addLoading ? 'Adding...' : 'Add Resident'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Bulk Upload Residents</h3><button className="modal-close-x" onClick={() => setShowBulkModal(false)}>✕</button></div>
            <div className="modal-body">
              <p className="modal-desc">Upload a CSV file with columns: <code>last_name, first_name, middle_name, barangay, precinct</code>. Download the sample format below to ensure correct formatting.</p>
              <div className="file-upload-area">
                <input type="file" accept=".csv" onChange={handleCSVFileChange} id="csv-upload" hidden />
                <label htmlFor="csv-upload" className="file-upload-label">
                  <span className="file-upload-icon">📁</span>
                  <span className="file-upload-text">{csvFile ? csvFile.name : 'Click to select CSV file'}</span>
                  <span className="file-upload-hint">{csvFile ? `${csvData.length} rows detected` : 'Supported: .csv files only'}</span>
                </label>
              </div>
              {csvPreview.length > 0 && (
                <div className="csv-preview">
                  <h4>Preview (First {csvPreview.length} rows)</h4>
                  <div className="table-wrap">
                    <table className="admin-table preview-table">
                      <thead><tr>{Object.keys(csvPreview[0]).map(key => <th key={key}>{key}</th>)}</tr></thead>
                      <tbody>{csvPreview.map((row, i) => <tr key={i}>{Object.values(row).map((val, j) => <td key={j}>{val}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}
              {uploadError && <p className="form-error">{uploadError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-modal-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button className="btn btn-modal-primary" onClick={confirmBulkUpload} disabled={csvData.length === 0 || uploadLoading}>
                {uploadLoading ? 'Uploading...' : `Upload ${csvData.length} Residents`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATION DETAIL MODAL */}
      {selectedRegDetail && (
        <div className="modal-overlay" onClick={() => setSelectedRegDetail(null)}>
          <div className="modal-card reg-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registration Details</h3>
              <button className="modal-close-x" onClick={() => setSelectedRegDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="reg-detail-photo-wrap">
                {selectedRegDetail.photo_base64 ? (
                  <img src={selectedRegDetail.photo_base64} alt="Portrait" className="reg-detail-photo" />
                ) : (
                  <div className="reg-detail-photo-placeholder">👤</div>
                )}
              </div>
              <div className="reg-detail-grid">
                <div className="reg-detail-item full">
                  <span className="reg-detail-label">Name</span>
                  <span className="reg-detail-value">{getResidentName(selectedRegDetail)}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Resident ID</span>
                  <span className="reg-detail-value">{selectedRegDetail.resident_id}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Status</span>
                  <span className={`status-badge status-${(selectedRegDetail.status || 'pending').toLowerCase()}`}>{selectedRegDetail.status || 'Pending'}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Barangay</span>
                  <span className="reg-detail-value">{selectedRegDetail.barangay || '-'}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Sector</span>
                  <span className="reg-detail-value">{selectedRegDetail.sector_category}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">House Number</span>
                  <span className="reg-detail-value">{selectedRegDetail.house_no || '-'}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Purok</span>
                  <span className="reg-detail-value">{selectedRegDetail.purok ? `Purok ${selectedRegDetail.purok}` : '-'}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Referral</span>
                  <span className="reg-detail-value">{selectedRegDetail.referral_name}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Contact</span>
                  <span className="reg-detail-value">{selectedRegDetail.contact || '-'}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Birthday</span>
                  <span className="reg-detail-value">{selectedRegDetail.birthday}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Photo Size</span>
                  <span className="reg-detail-value">{getPhotoSize(selectedRegDetail.photo_base64)}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Submitted</span>
                  <span className="reg-detail-value">{new Date(selectedRegDetail.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-modal-secondary" onClick={() => setSelectedRegDetail(null)}>Close</button>
              {selectedRegDetail.status === 'Pending' && (
                <>
                  <button type="button" className="btn btn-approve" onClick={() => { approveRegistration(selectedRegDetail.id); setSelectedRegDetail(null); }}>Approve</button>
                  <button type="button" className="btn btn-reject" onClick={() => { rejectRegistration(selectedRegDetail.id); setSelectedRegDetail(null); }}>Reject</button>
                </>
              )}
              {selectedRegDetail.status === 'Approved' && (
                <button type="button" className="btn btn-print" onClick={() => setSelectedRegDetail(null)}>🖨️ Print Card</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MEMBER DETAIL MODAL */}
      {selectedMember && (() => {
        const r = selectedMember.ValidResidents || {};
        const name = `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}`.trim();
        const hasQR = !!selectedMember.qr_token;
        const hasCardNo = !!selectedMember.em_card_no;
        const fullAddress = `${selectedMember.house_no ? `House ${selectedMember.house_no}, ` : ''}${selectedMember.purok ? `Purok ${selectedMember.purok}, ` : ''}${r.barangay || ''}`.replace(/, $/, '');
        return (
          <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
            <div className="modal-card member-detail-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Member Profile</h3>
                <button className="modal-close-x" onClick={() => setSelectedMember(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Top: Photo + Name + EM Card No */}
                <div className="member-detail-top">
                  <div className="member-detail-photo">
                    {selectedMember.photo_base64 ? <img src={selectedMember.photo_base64} alt="" /> : <span style={{fontSize:'2rem'}}>👤</span>}
                  </div>
                  <div className="member-detail-head">
                    <h2>{name}</h2>
                    <span className="member-detail-status">✓ Approved Member</span>
                    {hasCardNo && (
                      <p className="member-detail-cardno">EM Card: <strong>{selectedMember.em_card_no}</strong></p>
                    )}
                  </div>
                </div>

                {/* Full Address */}
                <div className="member-detail-address">
                  <span className="member-detail-label">📍 Full Address</span>
                  <span className="member-detail-value">{fullAddress || '—'}</span>
                </div>

                {/* QR Token Section */}
                <div className="member-detail-qr-section">
                  <span className="member-detail-label">QR Scan Token</span>
                  {hasQR ? (
                    <>
                      <code className="member-qr-big">{selectedMember.qr_token}</code>
                      <div className="member-qr-image">
                        <QRCodeSVG value={`https://www.em-card.com/card/${selectedMember.qr_token}`} size={180} level="H" includeMargin={true} />
                      </div>
                      <p className="member-qr-hint">📱 Member scans QR → <strong>https://www.em-card.com/card/{selectedMember.qr_token}</strong></p>
                    </>
                  ) : (
                    <div className="member-qr-missing">
                      <span>No QR token generated yet.</span>
                      <button className="btn btn-generate-qr" onClick={() => generateQRForMember(selectedMember)}>
                        ⚡ Generate QR & Card
                      </button>
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="member-detail-grid">
                  <div className="member-detail-item"><span className="member-detail-label">House No</span><span className="member-detail-value">{selectedMember.house_no ? selectedMember.house_no : '-'}</span></div>
                  <div className="member-detail-item"><span className="member-detail-label">Purok</span><span className="member-detail-value">{selectedMember.purok || '-'}</span></div>
                  <div className="member-detail-item"><span className="member-detail-label">Barangay</span><span className="member-detail-value">{r.barangay || '-'}</span></div>
                  <div className="member-detail-item"><span className="member-detail-label">Sector</span><span className="member-detail-value">{selectedMember.sector_category || '-'}</span></div>
                  <div className="member-detail-item"><span className="member-detail-label">Contact</span><span className="member-detail-value">{selectedMember.contact || '-'}</span></div>
                  <div className="member-detail-item"><span className="member-detail-label">Referral</span><span className="member-detail-value">{selectedMember.referral_name || '-'}</span></div>
                  <div className="member-detail-item"><span className="member-detail-label">Approved On</span><span className="member-detail-value">{new Date(selectedMember.created_at).toLocaleDateString()}</span></div>
                  <div className="member-detail-item"><span className="member-detail-label">Total Scans</span><span className="member-detail-value">{selectedMember.scan_count || 0}</span></div>
                  <div className="member-detail-item full-width"><span className="member-detail-label">Last Scanned</span><span className="member-detail-value">{selectedMember.last_scanned_at ? new Date(selectedMember.last_scanned_at).toLocaleString() : 'Never'}</span></div>
                </div>

                {/* Action Buttons */}
                {hasQR && (
                  <div className="member-detail-links">
                    <a href={`https://www.em-card.com/card/${selectedMember.qr_token}`} target="_blank" rel="noreferrer" className="btn btn-member-link">🌐 Open Citizen Dashboard</a>
                    <button className="btn btn-member-copy" onClick={() => { navigator.clipboard.writeText(`https://www.em-card.com/card/${selectedMember.qr_token}`); showToast('Card URL copied!', 'success'); }}>📋 Copy Card URL</button>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-modal-secondary" onClick={() => setSelectedMember(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
