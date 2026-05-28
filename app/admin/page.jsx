'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [totalResidents, setTotalResidents] = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  const [allResidents, setAllResidents] = useState([]);
  const [allRegs, setAllRegs] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [regsLoading, setRegsLoading] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedRegDetail, setSelectedRegDetail] = useState(null);
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

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchDashboardData = async () => {
    setDashLoading(true);
    try {
      const { count: residentsCount } = await supabase
        .from('ValidResidents').select('*', { count: 'exact', head: true });
      const { count: regCount } = await supabase
        .from('registrations').select('*', { count: 'exact', head: true });
      const { data: recentData } = await supabase
        .from('registrations')
        .select('*, ValidResidents(first_name, last_name, middle_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      setTotalResidents(residentsCount || 0);
      setTotalRegistrations(regCount || 0);
      setRecentRegistrations(recentData || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setDashLoading(false);
    }
  };

  const fetchAllResidents = async () => {
    setResidentsLoading(true);
    try {
      const { data } = await supabase
        .from('ValidResidents')
        .select('*')
        .order('last_name', { ascending: true });
      setAllResidents(data || []);
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
        .select('*, ValidResidents(first_name, last_name, middle_name)')
        .order('created_at', { ascending: false });
      setAllRegs(data || []);
    } catch (err) {
      console.error('Registrations fetch error:', err);
    } finally {
      setRegsLoading(false);
    }
  };

  const approveRegistration = async (id) => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ status: 'Approved' })
        .eq('id', id);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Registration approved successfully.', 'success');
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
    if (tab === 'residents') fetchAllResidents();
    if (tab === 'registrations') fetchAllRegistrations();
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

  const filteredResidents = allResidents.filter(r => {
    const q = residentSearch.toLowerCase();
    return (
      r.last_name?.toLowerCase().includes(q) ||
      r.first_name?.toLowerCase().includes(q) ||
      r.middle_name?.toLowerCase().includes(q) ||
      r.barangay?.toLowerCase().includes(q) ||
      r.precinct?.toLowerCase().includes(q)
    );
  });

  // NAV ITEMS
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'residents', label: 'Valid Residents', icon: '👥' },
    { id: 'registrations', label: 'Registrations', icon: '📋' },
    { id: 'network', label: 'Network', icon: '🔺' },
    { id: 'reports', label: 'Reports', icon: '📊' },
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
        <div className="admin-login-card">
          <div className="admin-brand">
            <span className="brand-mark">EM</span>
            <div><strong>EM Card</strong><small>Admin Portal</small></div>
          </div>
          <h2>Administrator Login</h2>
          <p className="login-subtitle">Secure access to the EM Card management dashboard.</p>
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="form-group">
              <label>Username / Email</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter admin username" required disabled={loginLoading} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" required disabled={loginLoading} />
            </div>
            {loginError && <p className="login-error">{loginError}</p>}
            <button type="submit" className="btn btn-admin-login" disabled={loginLoading}>
              {loginLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          <a href="/" className="back-to-home">← Back to Homepage</a>
        </div>
      </div>
    );
  }

  const getResidentName = (reg) => {
    const r = reg?.ValidResidents;
    if (!r) return reg?.resident_id?.slice(0, 8) || '-';
    return `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}`.trim();
  };

  // RENDER VIEWS
  const renderDashboard = () => (
    <>
      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-green">👥</div>
          <div className="stat-info">
            <span className="stat-value">{dashLoading ? '...' : totalResidents.toLocaleString()}</span>
            <span className="stat-label">Valid Residents</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-blue">📋</div>
          <div className="stat-info">
            <span className="stat-value">{dashLoading ? '...' : totalRegistrations.toLocaleString()}</span>
            <span className="stat-label">Total Registrations</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-amber">✓</div>
          <div className="stat-info">
            <span className="stat-value">{dashLoading ? '...' : Math.round((totalRegistrations / (totalResidents || 1)) * 100)}%</span>
            <span className="stat-label">Registration Rate</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-purple">📅</div>
          <div className="stat-info">
            <span className="stat-value">{dashLoading ? '...' : recentRegistrations.length}</span>
            <span className="stat-label">Recent Entries</span>
          </div>
        </div>
      </div>
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
      <div className="admin-actions-grid">
        <a href="/register" className="action-card"><span className="action-icon">📝</span><span className="action-label">New Registration</span></a>
        <div className="action-card" onClick={fetchDashboardData}><span className="action-icon">🔄</span><span className="action-label">Refresh Data</span></div>
      </div>
    </>
  );

  const renderResidents = () => (
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
          <h3>All Valid Residents</h3>
          <span className="panel-badge">{filteredResidents.length} Records</span>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Last Name</th><th>First Name</th><th>Middle Name</th><th>Barangay</th><th>Precinct</th><th>Status</th></tr>
            </thead>
            <tbody>
              {residentsLoading ? <tr><td colSpan={6} className="table-loading">Loading residents...</td></tr>
                : filteredResidents.length === 0 ? <tr><td colSpan={6} className="table-empty">{residentSearch ? 'No residents match your search.' : 'No residents found.'}</td></tr>
                  : filteredResidents.map(res => (
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
      </div>
    </>
  );

  const getPhotoSize = (base64) => {
    if (!base64) return '-';
    const kb = Math.round(base64.length / 1024);
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const renderRegistrations = () => {
    const pendingCount = allRegs.filter(r => r.status === 'Pending').length;
    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3>Registration Requests</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {pendingCount > 0 && <span className="panel-badge badge-warn">{pendingCount} Pending</span>}
            <span className="panel-badge">{allRegs.length} Total</span>
          </div>
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
                : allRegs.length === 0 ? <tr><td colSpan={10} className="table-empty">No registrations found.</td></tr>
                  : allRegs.map(reg => (
                    <tr key={reg.id} className="reg-row-clickable" onClick={() => setSelectedRegDetail(reg)}>
                      <td>
                        {reg.photo_base64 ? (
                          <img src={reg.photo_base64} alt="" className="reg-thumb" />
                        ) : (
                          <div className="reg-thumb-placeholder">👤</div>
                        )}
                      </td>
                      <td><strong>{getResidentName(reg)}</strong></td>
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
                          {reg.status === 'Approved' && (
                            <button className="btn-action btn-print" onClick={(e) => e.stopPropagation()} title="Print Card">🖨️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
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
          </div>
        </header>
        <div className="admin-content">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'residents' && renderResidents()}
          {activeTab === 'registrations' && renderRegistrations()}
          {activeTab === 'network' && renderNetwork()}
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
    </div>
  );
}
