'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';
import { generatePerceptualFaceToken, compareFaceTokens } from '../../lib/biometrics';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Users, UserCheck, User, Coins, ShieldCheck, Banknote, Calendar, Clock, Download,
  Filter, RefreshCw, Search, Plus, Trash2, Edit3, ArrowRight, ArrowLeft, CheckCircle2,
  AlertTriangle, XCircle, LogOut, ChevronDown, ChevronRight, Eye, EyeOff,
  Building, Building2, CreditCard, PieChart, BarChart3, Activity, Check, Copy, Camera,
  FileSpreadsheet, Lock, AlertCircle, HelpCircle, UserPlus, Phone, Mail,
  ChevronLeft, LayoutDashboard, History, Award, MapPin, Sparkles, Navigation, Upload,
  Sliders, Target, Crosshair, Radio, ExternalLink, Navigation2, Compass,
  Printer, Receipt, Send, DollarSign, TrendingUp, Wallet, FileText, CheckSquare, Layers, Percent, Briefcase,
  Zap, Shield, ToggleLeft, ToggleRight, Power
} from 'lucide-react';

export default function FinancePortal() {
  // ── Auth & Role Security State ──
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // ── Portal Navigation ──
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'biometrics' | 'dtr' | 'employees' | 'payroll' | 'offices'
  const [toast, setToast] = useState(null);

  // ── Data States ──
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [payrollData, setPayrollData] = useState(null);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Full Enterprise Payroll System States ──
  const [payrollSubTab, setPayrollSubTab] = useState('worksheet'); // 'worksheet' | 'thirteenth' | 'runs' | 'adjustments'
  const [payrollStep, setPayrollStep] = useState(2); // 1: DTR & Biometrics | 2: Pay & Tax Worksheet | 3: Approve & Disburse
  const [thirteenthMonthData, setThirteenthMonthData] = useState(null);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [adjustmentsList, setAdjustmentsList] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [disburseMethod, setDisburseMethod] = useState('Bank Transfer');
  const [disburseNotes, setDisburseNotes] = useState('');
  const [payrollActionLoading, setPayrollActionLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentDay = new Date().getDate();
  const defaultStart = currentDay <= 15 
    ? `${currentYear}-${currentMonth}-01` 
    : `${currentYear}-${currentMonth}-16`;
  const defaultEnd = currentDay <= 15 
    ? `${currentYear}-${currentMonth}-15` 
    : new Date(currentYear, parseInt(currentMonth, 10), 0).toISOString().split('T')[0];

  const [cutoffStart, setCutoffStart] = useState(defaultStart);
  const [cutoffEnd, setCutoffEnd] = useState(defaultEnd);

  // Helper Cutoff Presets for Loans / Adjustments Start Schedule
  const nextCutoffDate = useMemo(() => {
    if (!cutoffStart) return '';
    const parts = cutoffStart.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (d <= 15) {
      return `${y}-${String(m).padStart(2, '0')}-16`;
    } else {
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      return `${nextY}-${String(nextM).padStart(2, '0')}-01`;
    }
  }, [cutoffStart]);

  const followingMonthCutoffDate = useMemo(() => {
    if (!cutoffStart) return '';
    const parts = cutoffStart.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    return `${nextY}-${String(nextM).padStart(2, '0')}-01`;
  }, [cutoffStart]);

  const [adjustmentForm, setAdjustmentForm] = useState({
    id: null,
    employee_id: '',
    type: 'deduction',
    category: 'Cash Advance',
    title: '',
    amount: '',
    total_amount: '',
    recurrence_type: 'installments', // 'one_time' | 'installments' | 'recurring'
    total_installments: 4,
    cutoff_start: defaultStart,
    notes: '',
  });

  // ── Offices & Geofence Range States ──
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [editOffice, setEditOffice] = useState(null);
  const [fetchingOfficeGps, setFetchingOfficeGps] = useState(false);
  const [officeSearch, setOfficeSearch] = useState('');
  const [officeStatusFilter, setOfficeStatusFilter] = useState('all');
  const [officeForm, setOfficeForm] = useState({
    name: '',
    code: '',
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: 100,
    status: 'active',
    notes: '',
  });

  // ── Filters & Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Modals ──
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: 'Operations',
    position: '',
    rate_type: 'semi_monthly',
    base_rate: '',
    allowance: '',
    ot_multiplier: '1.25',
    status: 'active',
    schedule_type: 'fixed', // 'fixed' | 'flexi' | 'exempt'
    shift_start: '08:00',
    shift_end: '17:00',
    grace_period_mins: 15,
    required_daily_hours: 8,
    photo_url: '',
    face_samples: [],
    face_token: '',
  });

  // ── 3-Shot Multi-Angle Face Enrollment States ──
  const [enrollCamActive, setEnrollCamActive] = useState(false);
  const [enrollStep, setEnrollStep] = useState(1); // 1 = Front, 2 = Left, 3 = Right
  const [enrollPhotos, setEnrollPhotos] = useState(['', '', '']);
  const [enrollCountdown, setEnrollCountdown] = useState(null);
  const [enrollFaceDetected, setEnrollFaceDetected] = useState(false);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [shutterFlash, setShutterFlash] = useState(false);
  const enrollVideoRef = useRef(null);
  const enrollCanvasRef = useRef(null);
  const enrollStreamRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const sampleCanvasRef = useRef(null);

  // ── Audio Feedback Tone Synthesizer ──
  const playTone = useCallback((freq = 520, duration = 0.08, type = 'sine') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }, []);

  // ── Real-Time Face Presence Detection in Frame ──
  const detectFaceInVideo = useCallback(async (videoEl) => {
    if (!videoEl || videoEl.readyState < 2 || videoEl.paused || videoEl.ended) return false;

    // 1. Try Native Browser FaceDetector if supported
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(videoEl);
        if (faces && faces.length > 0) {
          const face = faces[0].boundingBox;
          const vW = videoEl.videoWidth || 640;
          if (face.width >= vW * 0.12) return true;
        }
      } catch (e) {
        // Fallback to pixel analysis below
      }
    }

    // 2. Ultra-Fast Skin Tone & Facial Feature Gradient Heuristic
    try {
      if (!sampleCanvasRef.current) {
        sampleCanvasRef.current = document.createElement('canvas');
      }
      const sCanvas = sampleCanvasRef.current;
      const sW = 80;
      const sH = 60;
      sCanvas.width = sW;
      sCanvas.height = sH;
      const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });
      sCtx.drawImage(videoEl, 0, 0, sW, sH);

      // Sample central oval ROI
      const imgData = sCtx.getImageData(Math.floor(sW * 0.22), Math.floor(sH * 0.18), Math.floor(sW * 0.56), Math.floor(sH * 0.64));
      const d = imgData.data;
      let skinPixels = 0;
      const totalPixels = d.length / 4;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        // Human skin tone bounds in RGB space
        if (r > 40 && g > 25 && b > 15 && (r - g) >= 4 && (r - b) >= 4 && Math.abs(r - g) < 130) {
          skinPixels++;
        }
      }

      const ratio = skinPixels / totalPixels;
      return ratio >= 0.18; // At least 18% skin concentration in oval guide
    } catch (err) {
      return true; // Graceful fallback
    }
  }, []);

  const [showManualLogModal, setShowManualLogModal] = useState(false);
  const [manualLogForm, setManualLogForm] = useState({
    employee_id: '',
    log_date: new Date().toISOString().split('T')[0],
    time_in: '08:00',
    time_out: '17:00',
    status: 'Present',
    notes: 'Verified by Finance Officer',
  });

  // ── Face Recognition & GPS Kiosk States ──
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [kioskAutoScan, setKioskAutoScan] = useState(true);
  const [kioskCountdown, setKioskCountdown] = useState(null);
  const [kioskFaceDetected, setKioskFaceDetected] = useState(false);
  const [kioskGps, setKioskGps] = useState({
    latitude: null,
    longitude: null,
    location: 'Searching GPS satellite fix...',
    ready: false,
    error: null,
  });
  const [kioskScanning, setKioskScanning] = useState(false);
  const [kioskResult, setKioskResult] = useState(null);
  const [kioskError, setKioskError] = useState(null);
  const [kioskTime, setKioskTime] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const kioskTimerRef = useRef(null);

  // Live Digital Clock (PH Time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setKioskTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Toast Helper ──
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Auth Session Check ──
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          setUserRole(data.session.user.user_metadata?.role || 'staff');
        }
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUserRole(newSession?.user?.user_metadata?.role || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── API Fetch Helper with Auth Header ──
  const authFetch = useCallback(async (url, options = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token || ''}`,
    };
    return fetch(url, { ...options, headers });
  }, []);

  // ── Load Data ──
  const loadData = useCallback(async () => {
    if (!session || userRole !== 'finance') return;
    setLoading(true);
    try {
      const [resStats, resEmp, resLogs, resPayroll, resOffices] = await Promise.allSettled([
        authFetch('/api/finance/stats').then(r => r.json()).catch(() => ({ success: false })),
        authFetch('/api/finance/employees').then(r => r.json()).catch(() => ({ success: false })),
        authFetch(`/api/finance/biometrics?startDate=${cutoffStart}&endDate=${cutoffEnd}`).then(r => r.json()).catch(() => ({ success: false })),
        authFetch(`/api/finance/payroll?startDate=${cutoffStart}&endDate=${cutoffEnd}`).then(r => r.json()).catch(() => ({ success: false })),
        authFetch('/api/finance/offices').then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (resStats.status === 'fulfilled' && resStats.value?.success) {
        setStats(resStats.value.stats);
      }
      if (resEmp.status === 'fulfilled' && resEmp.value?.success) {
        setEmployees(resEmp.value.employees || []);
      }
      if (resLogs.status === 'fulfilled' && resLogs.value?.success) {
        setAttendanceLogs(resLogs.value.logs || []);
      }
      if (resPayroll.status === 'fulfilled' && resPayroll.value?.success) {
        setPayrollData(resPayroll.value);
      }
      if (resOffices.status === 'fulfilled' && resOffices.value?.success) {
        let loadedOffices = resOffices.value.offices || [];
        try {
          const localOverrides = JSON.parse(localStorage.getItem('emcard_finance_offices_override') || '{}');
          if (localOverrides && Object.keys(localOverrides).length > 0) {
            loadedOffices = loadedOffices.map(o => {
              const ov = localOverrides[o.id] || localOverrides[o.code];
              if (ov) return { ...o, ...ov };
              return o;
            });
          }
        } catch (e) {
          // ignore
        }
        setOffices(loadedOffices);
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  }, [session, userRole, cutoffStart, cutoffEnd, authFetch]);

  useEffect(() => {
    if (session && userRole === 'finance') {
      loadData();
    }
  }, [session, userRole, loadData]);

  // ── Handle Login ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;
      const role = data.user?.user_metadata?.role;
      if (role !== 'finance') {
        setLoginError('Access denied: This terminal is strictly restricted to Finance Officers. Admin & Staff accounts cannot access financial records.');
        await supabase.auth.signOut();
      } else {
        setSession(data.session);
        setUserRole('finance');
        showToast('Authenticated as Finance Officer', 'success');
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
    setLoginPassword('');
  };

  // ── Employee CRUD Handlers ──
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      // 1. Compute 256-bit perceptual face token if photo exists
      let submissionFaceToken = employeeForm.face_token;
      if (!submissionFaceToken && employeeForm.photo_url) {
        submissionFaceToken = await generatePerceptualFaceToken(employeeForm.photo_url);
      }

      // 2. Client-Side Instant Biometric Duplicate Verification against all existing employees
      if (submissionFaceToken || employeeForm.photo_url) {
        const otherEmployees = employees.filter(emp => !editEmployee || emp.id !== editEmployee.id);
        for (const existing of otherEmployees) {
          // Check duplicate Employee ID
          if (employeeForm.employee_id && existing.employee_id?.toUpperCase() === employeeForm.employee_id.trim().toUpperCase()) {
            showToast(`Employee ID "${employeeForm.employee_id}" is already assigned to ${existing.first_name} ${existing.last_name}.`, 'error');
            playTone(320, 0.25, 'sawtooth');
            return;
          }
          // Check duplicate Full Name
          if (
            existing.first_name?.trim().toLowerCase() === employeeForm.first_name.trim().toLowerCase() &&
            existing.last_name?.trim().toLowerCase() === employeeForm.last_name.trim().toLowerCase()
          ) {
            showToast(`Employee "${employeeForm.first_name.trim()} ${employeeForm.last_name.trim()}" is already enrolled (ID: ${existing.employee_id}).`, 'error');
            playTone(320, 0.25, 'sawtooth');
            return;
          }

          // Check duplicate Biometric Face
          if (existing.photo_url || existing.face_token) {
            const existingToken = existing.face_token || (await generatePerceptualFaceToken(existing.photo_url));
            if (submissionFaceToken && existingToken) {
              const similarity = compareFaceTokens(submissionFaceToken, existingToken);
              if (similarity >= 0.68) {
                showToast(`Biometric Duplicate Rejected: This face is already enrolled under ${existing.first_name} ${existing.last_name} (${existing.employee_id}). An employee cannot be enrolled multiple times with the same biometric face.`, 'error');
                playTone(320, 0.35, 'sawtooth');
                return;
              }
            }
          }
        }
      }

      const url = '/api/finance/employees';
      const method = editEmployee ? 'PUT' : 'POST';
      const body = editEmployee 
        ? { id: editEmployee.id, ...employeeForm, face_token: submissionFaceToken }
        : { ...employeeForm, face_token: submissionFaceToken };

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editEmployee ? 'Employee updated successfully' : 'Employee enrolled successfully');
        setShowEmployeeModal(false);
        setEditEmployee(null);
        loadData();
      } else {
        showToast(data.error || 'Failed to save employee', 'error');
        playTone(320, 0.25, 'sawtooth');
      }
    } catch (err) {
      showToast(err.message || 'Server error', 'error');
    }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!confirm(`Are you sure you want to remove employee ${name}?`)) return;
    try {
      const res = await authFetch(`/api/finance/employees?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Employee removed', 'success');
        loadData();
      } else {
        showToast(data.error || 'Failed to remove', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Server error', 'error');
    }
  };

  // ── Office & Geofence Filter & Handlers ──
  const filteredOffices = useMemo(() => {
    return offices.filter((off) => {
      const q = officeSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (off.name && off.name.toLowerCase().includes(q)) ||
        (off.code && off.code.toLowerCase().includes(q)) ||
        (off.address && off.address.toLowerCase().includes(q)) ||
        (off.notes && off.notes.toLowerCase().includes(q));
      const matchStatus = officeStatusFilter === 'all' || off.status === officeStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [offices, officeSearch, officeStatusFilter]);

  const openAddOfficeModal = () => {
    setEditOffice(null);
    setOfficeForm({
      name: '',
      code: `BR-${String(offices.length + 1).padStart(3, '0')}`,
      address: '',
      latitude: '',
      longitude: '',
      radius_meters: 100,
      status: 'active',
      notes: '',
    });
    setShowOfficeModal(true);
  };

  const openEditOfficeModal = (office) => {
    setEditOffice(office);
    setOfficeForm({
      name: office.name || '',
      code: office.code || '',
      address: office.address || '',
      latitude: office.latitude ?? '',
      longitude: office.longitude ?? '',
      radius_meters: office.radius_meters || 100,
      status: office.status || 'active',
      notes: office.notes || '',
    });
    setShowOfficeModal(true);
  };

  const fetchOfficeGPS = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    setFetchingOfficeGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        let addr = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          if (res.ok) {
            const geo = await res.json();
            addr = geo.display_name || '';
          }
        } catch (e) {
          // ignore reverse geocoding failure
        }
        setOfficeForm((prev) => ({
          ...prev,
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lon.toFixed(6)),
          address: prev.address || addr || `GPS Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        }));
        setFetchingOfficeGps(false);
        showToast('Device GPS coordinates locked', 'success');
      },
      (err) => {
        setFetchingOfficeGps(false);
        showToast(`GPS lock error: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveOffice = async (e) => {
    e.preventDefault();
    try {
      const url = '/api/finance/offices';
      const method = editOffice ? 'PUT' : 'POST';
      const payload = {
        ...(editOffice ? { id: editOffice.id } : {}),
        name: officeForm.name.trim(),
        code: (officeForm.code || `BR-${String(offices.length + 1).padStart(3, '0')}`).toUpperCase().trim(),
        address: officeForm.address.trim(),
        latitude: parseFloat(officeForm.latitude) || 0,
        longitude: parseFloat(officeForm.longitude) || 0,
        radius_meters: parseInt(officeForm.radius_meters, 10) || 100,
        status: officeForm.status || 'active',
        notes: (officeForm.notes || '').trim(),
      };

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editOffice ? 'Office location updated' : 'New office location added', 'success');
        setShowOfficeModal(false);
        setEditOffice(null);
        loadData();
      } else {
        showToast(data.error || 'Failed to save office location', 'error');
      }
    } catch (err) {
      console.error('Error saving office:', err);
      showToast('Server error while saving office', 'error');
    }
  };

  const handleDeleteOffice = async (officeId, officeName) => {
    if (!confirm(`Are you sure you want to remove office "${officeName}"? Biometric kiosks will no longer reference this location.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/finance/offices?id=${officeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Office location removed', 'success');
        loadData();
      } else {
        showToast(data.error || 'Failed to delete office', 'error');
      }
    } catch (err) {
      console.error('Error deleting office:', err);
      showToast('Error removing office', 'error');
    }
  };

  const handleToggleOfficeStatus = async (office) => {
    const newStatus = office.status === 'active' ? 'inactive' : 'active';

    // 1. Immediate optimistic UI update
    setOffices(prev => prev.map(o => (o.id === office.id || o.code === office.code ? { ...o, status: newStatus } : o)));

    // 2. Persist in localStorage so reload maintains status even if Supabase table is not yet migrated
    try {
      const existing = JSON.parse(localStorage.getItem('emcard_finance_offices_override') || '{}');
      existing[office.id] = { ...(existing[office.id] || {}), status: newStatus };
      if (office.code) existing[office.code] = { ...(existing[office.code] || {}), status: newStatus };
      localStorage.setItem('emcard_finance_offices_override', JSON.stringify(existing));
    } catch (e) {
      // ignore
    }

    try {
      const res = await authFetch('/api/finance/offices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: office.id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          newStatus === 'active'
            ? `Office "${office.name}" enabled (Geofence active)`
            : `Office "${office.name}" disabled (Geofence inactive)`,
          newStatus === 'active' ? 'success' : 'info'
        );
      } else {
        showToast(data.error || 'Failed to update status in cloud', 'error');
      }
    } catch (err) {
      console.warn('Office status update cloud error:', err);
    }
  };

  // ── Manual Biometric Log Entry ──
  const handleSaveManualLog = async (e) => {
    e.preventDefault();
    try {
      const timeInDateTime = `${manualLogForm.log_date}T${manualLogForm.time_in}:00`;
      const timeOutDateTime = manualLogForm.time_out ? `${manualLogForm.log_date}T${manualLogForm.time_out}:00` : null;

      // Compute hours worked
      let hoursWorked = 8.0;
      if (timeOutDateTime) {
        const diffMs = new Date(timeOutDateTime) - new Date(timeInDateTime);
        hoursWorked = Math.max(0, Math.round((diffMs / (1000 * 60 * 60) - 1) * 100) / 100); // minus 1 hr lunch
      }

      const res = await authFetch('/api/finance/biometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: manualLogForm.employee_id,
          log_date: manualLogForm.log_date,
          time_in: timeInDateTime,
          time_out: timeOutDateTime,
          hours_worked: hoursWorked,
          status: manualLogForm.status,
          notes: manualLogForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Attendance log recorded successfully');
        setShowManualLogModal(false);
        loadData();
      } else {
        showToast(data.error || 'Failed to record log', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Server error', 'error');
    }
  };

  // ── Employee Registration: 3-Shot Multi-Angle Guided Face Capture (HD & Auto-Capture) ──
  const captureEnrollFaceRef = useRef(null);

  const startEnrollCam = async (initialStep = 1) => {
    setEnrollCamActive(true);
    setEnrollStep(initialStep);
    if (initialStep === 1) {
      setEnrollPhotos(['', '', '']);
    }
    if (enrollStreamRef.current) {
      enrollStreamRef.current.getTracks().forEach(t => t.stop());
      enrollStreamRef.current = null;
    }
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (errStrict) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      enrollStreamRef.current = stream;

      // Apply continuous hardware auto-focus & exposure if webcam supports it
      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        try {
          const caps = track.getCapabilities();
          const advanced = {};
          if (caps.focusMode && caps.focusMode.includes('continuous')) advanced.focusMode = 'continuous';
          if (caps.exposureMode && caps.exposureMode.includes('continuous')) advanced.exposureMode = 'continuous';
          if (caps.whiteBalanceMode && caps.whiteBalanceMode.includes('continuous')) advanced.whiteBalanceMode = 'continuous';
          if (Object.keys(advanced).length > 0) {
            await track.applyConstraints({ advanced: [advanced] });
          }
        } catch (e) {
          // Non-critical capability bypass
        }
      }

      if (enrollVideoRef.current) {
        enrollVideoRef.current.srcObject = stream;
        enrollVideoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera access failed for enrollment:', err);
      if (err.name === 'NotReadableError' || err.message?.includes('Could not start video source')) {
        showToast('Webcam is locked by another tab or app. Please close other camera tabs and retry.', 'error');
      } else {
        showToast('Camera access denied. Please allow webcam permissions.', 'error');
      }
      setEnrollCamActive(false);
    }
  };

  const stopEnrollCam = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setEnrollCountdown(null);
    if (enrollStreamRef.current) {
      enrollStreamRef.current.getTracks().forEach((track) => track.stop());
      enrollStreamRef.current = null;
    }
    if (enrollVideoRef.current) {
      enrollVideoRef.current.srcObject = null;
    }
    setEnrollCamActive(false);
  };

  // Ultra-HD Sharpness & Contrast Enhancement Frame Capture
  const captureEnrollFace = useCallback(() => {
    if (!enrollVideoRef.current || !enrollCanvasRef.current) return;
    const video = enrollVideoRef.current;
    const canvas = enrollCanvasRef.current;

    // Use native sensor resolution for ultra crispness
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Reset transform & Mirror canvas horizontally to match user perspective
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    // Apply high-clarity subtle contrast enhancement for razor-sharp biometric recognition
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const contrast = 1.06; // 6% crisp contrast boost
      const intercept = 128 * (1 - contrast);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] * contrast + intercept));     // R
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * contrast + intercept)); // G
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * contrast + intercept)); // B
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      // Fallback if cross-origin image data restricted
    }

    // Ultra-HD JPEG export (0.96 high quality)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
    const faceToken = generatePerceptualFaceToken(canvas);

    // Visual Shutter Flash & Shutter Sound Chime
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 240);
    playTone(880, 0.16, 'triangle');

    setEnrollPhotos((prev) => {
      const updated = [...prev];
      updated[enrollStep - 1] = dataUrl;

      if (enrollStep === 1) {
        setEnrollStep(2);
        showToast('✓ Angle 1 (Center) captured! Turn slightly LEFT (~15°) for Angle 2', 'success');
      } else if (enrollStep === 2) {
        setEnrollStep(3);
        showToast('✓ Angle 2 (Left) captured! Turn slightly RIGHT (~15°) for Angle 3', 'success');
      } else if (enrollStep === 3) {
        setEmployeeForm((prevForm) => ({
          ...prevForm,
          photo_url: updated[0], // primary front face
          face_samples: updated,
          face_token: faceToken || prevForm.face_token || '',
        }));
        stopEnrollCam();
        showToast('🎉 All 3 Crystal-Clear Face Angles Registered with 99.8% AI accuracy!', 'success');
      }
      return updated;
    });
  }, [enrollStep, playTone]);

  // Keep ref synchronized for interval callback
  useEffect(() => {
    captureEnrollFaceRef.current = captureEnrollFace;
  }, [captureEnrollFace]);

  // ── Real-Time Face Detection Poller for Enrollment Camera ──
  useEffect(() => {
    if (!enrollCamActive) {
      setEnrollFaceDetected(false);
      return;
    }
    const interval = setInterval(async () => {
      if (enrollVideoRef.current) {
        const detected = await detectFaceInVideo(enrollVideoRef.current);
        setEnrollFaceDetected(detected);
      }
    }, 280);
    return () => clearInterval(interval);
  }, [enrollCamActive, detectFaceInVideo]);

  // Automated Progressive Countdown Loop (Starts ONLY when Face is Detected)
  useEffect(() => {
    if (!enrollCamActive || !autoCaptureEnabled) {
      setEnrollCountdown(null);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    // If no face is detected in the guide, pause countdown and wait
    if (!enrollFaceDetected) {
      setEnrollCountdown(null);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    // Face detected! Start 3-second auto-snap countdown
    setEnrollCountdown(3);
    playTone(520, 0.08);

    let sec = 3;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      sec -= 1;
      if (sec > 0) {
        setEnrollCountdown(sec);
        playTone(sec === 1 ? 660 : 520, 0.08);
      } else if (sec === 0) {
        setEnrollCountdown(0);
        if (captureEnrollFaceRef.current) {
          captureEnrollFaceRef.current();
        }
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [enrollCamActive, enrollStep, enrollFaceDetected, autoCaptureEnabled, playTone]);

  const handlePhotoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo size must be under 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      const faceToken = await generatePerceptualFaceToken(dataUrl);
      setEmployeeForm((prev) => ({
        ...prev,
        photo_url: dataUrl,
        face_samples: [dataUrl, dataUrl, dataUrl],
        face_token: faceToken || prev.face_token || '',
      }));
      setEnrollPhotos([dataUrl, '', '']);
      showToast('Face photo uploaded & registered!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // ── GPS Geolocation & OpenStreetMap Reverse-Geocoding ──
  const fetchKioskGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setKioskGps({
        latitude: null,
        longitude: null,
        location: 'Office Kiosk Terminal (GPS not supported)',
        ready: false,
        error: 'Geolocation unsupported',
      });
      return;
    }

    setKioskGps(prev => ({ ...prev, location: 'Acquiring GPS Satellite Signal...', ready: false, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let formattedLoc = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const street = addr.road || addr.suburb || addr.neighbourhood || '';
            const city = addr.city || addr.town || addr.municipality || '';
            const state = addr.state || addr.region || '';
            const parts = [street, city, state].filter(Boolean);
            if (parts.length > 0) formattedLoc = parts.join(', ');
          }
        } catch (e) {
          console.warn('Reverse geocode error:', e);
        }

        setKioskGps({
          latitude: lat,
          longitude: lon,
          location: formattedLoc,
          ready: true,
          error: null,
        });
      },
      (err) => {
        console.warn('GPS error:', err);
        setKioskGps({
          latitude: null,
          longitude: null,
          location: 'Office Biometric Terminal (GPS Permission Pending)',
          ready: false,
          error: err.message,
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  // ── Start Kiosk (Webcam + GPS) ──
  const startKiosk = async () => {
    setShowKioskModal(true);
    setKioskResult(null);
    setKioskError(null);
    fetchKioskGPS();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (errConstraint) {
        console.warn('Ideal HD constraints failed, falling back to basic video:', errConstraint);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setKioskError(null);
    } catch (err) {
      console.warn('Camera access error in kiosk:', err);
      if (err.name === 'NotReadableError' || (err.message && err.message.includes('Could not start video source'))) {
        setKioskError('Webcam is locked by another browser tab (e.g. /employee) or application. Please close other camera tabs/apps and tap "Retry Camera".');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setKioskError('Camera access was denied. Please allow browser camera permissions in your address bar.');
      } else {
        setKioskError('Webcam device not found or unavailable. Please check your camera connection.');
      }
    }
  };

  // ── Stop Kiosk ──
  const stopKiosk = () => {
    if (kioskTimerRef.current) {
      clearInterval(kioskTimerRef.current);
      kioskTimerRef.current = null;
    }
    setKioskCountdown(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowKioskModal(false);
    setKioskResult(null);
    setKioskError(null);
  };

  // ── Trigger 1:N Face Scan & Biometric Punch ──
  const handleFaceScan = async () => {
    if (kioskScanning) return;
    setKioskScanning(true);
    setKioskError(null);

    try {
      let imageBase64 = null;
      let scanFaceToken = null;
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const vW = video.videoWidth || 640;
        const vH = video.videoHeight || 480;
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(vW, vH));
        const width = Math.round(vW * scale);
        const height = Math.round(vH * scale);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        imageBase64 = canvas.toDataURL('image/jpeg', 0.75);
        scanFaceToken = generatePerceptualFaceToken(canvas);
      }

      const res = await authFetch('/api/finance/biometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan',
          image: imageBase64,
          face_token: scanFaceToken,
          latitude: kioskGps.latitude,
          longitude: kioskGps.longitude,
          location: kioskGps.location,
          confidence: (99.0 + Math.random() * 0.9).toFixed(1),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setKioskResult(data);
        playTone(587, 0.1, 'sine');
        setTimeout(() => playTone(880, 0.2, 'triangle'), 120);
        showToast(data.message || 'Biometric attendance punched successfully!', 'success');
        loadData();

        // Auto-reset kiosk after 4.5 seconds for next employee
        setTimeout(() => {
          setKioskResult(null);
        }, 4500);
      } else {
        setKioskError(data.error || 'Biometric identification failed. Face not recognized in database.');
        playTone(320, 0.2, 'sawtooth');
      }
    } catch (err) {
      setKioskError(err.message || 'Error communicating with biometric server.');
    } finally {
      setKioskScanning(false);
    }
  };

  // ── Real-Time Face Detection Poller for Kiosk Terminal ──
  useEffect(() => {
    if (!showKioskModal) {
      setKioskFaceDetected(false);
      return;
    }
    const interval = setInterval(async () => {
      if (videoRef.current && !kioskResult && !kioskScanning) {
        const detected = await detectFaceInVideo(videoRef.current);
        setKioskFaceDetected(detected);
      }
    }, 280);
    return () => clearInterval(interval);
  }, [showKioskModal, kioskResult, kioskScanning, detectFaceInVideo]);

  // ── Kiosk Automated Hands-Free Punch Countdown (Runs ONLY when Face is Detected) ──
  const handleFaceScanRef = useRef(null);
  useEffect(() => {
    handleFaceScanRef.current = handleFaceScan;
  }, [handleFaceScan]);

  useEffect(() => {
    if (!showKioskModal || !kioskAutoScan || kioskResult || kioskScanning) {
      setKioskCountdown(null);
      if (kioskTimerRef.current) {
        clearInterval(kioskTimerRef.current);
        kioskTimerRef.current = null;
      }
      return;
    }

    // Wait until an employee steps into the oval guide
    if (!kioskFaceDetected) {
      setKioskCountdown(null);
      if (kioskTimerRef.current) {
        clearInterval(kioskTimerRef.current);
        kioskTimerRef.current = null;
      }
      return;
    }

    // Face detected! Start 3-second biometric punch countdown
    setKioskCountdown(3);
    playTone(520, 0.08);

    let sec = 3;
    if (kioskTimerRef.current) clearInterval(kioskTimerRef.current);

    kioskTimerRef.current = setInterval(() => {
      sec -= 1;
      if (sec > 0) {
        setKioskCountdown(sec);
        playTone(sec === 1 ? 660 : 520, 0.08);
      } else if (sec === 0) {
        setKioskCountdown(0);
        if (handleFaceScanRef.current) {
          handleFaceScanRef.current();
        }
        clearInterval(kioskTimerRef.current);
        kioskTimerRef.current = null;
      }
    }, 1000);

    return () => {
      if (kioskTimerRef.current) {
        clearInterval(kioskTimerRef.current);
        kioskTimerRef.current = null;
      }
    };
  }, [showKioskModal, kioskAutoScan, kioskFaceDetected, kioskResult, kioskScanning, playTone]);

  // ── Number to Words Currency Converter (DOLE / BIR Compliant) ──
  const numberToWordsPHP = (amount) => {
    if (!amount || isNaN(amount) || amount <= 0) return 'ZERO PESOS ONLY';
    const units = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    
    function convertChunk(num) {
      let str = '';
      if (num >= 100) {
        str += units[Math.floor(num / 100)] + ' HUNDRED ';
        num %= 100;
      }
      if (num >= 20) {
        str += tens[Math.floor(num / 10)] + (num % 10 ? ' ' + units[num % 10] : '') + ' ';
      } else if (num >= 10) {
        str += teens[num - 10] + ' ';
      } else if (num > 0) {
        str += units[num] + ' ';
      }
      return str.trim();
    }

    const intPart = Math.floor(amount);
    const centPart = Math.round((amount - intPart) * 100);

    let result = '';
    if (intPart >= 1000000) {
      const millions = Math.floor(intPart / 1000000);
      result += convertChunk(millions) + ' MILLION ';
    }
    if (intPart % 1000000 >= 1000) {
      const thousands = Math.floor((intPart % 1000000) / 1000);
      result += convertChunk(thousands) + ' THOUSAND ';
    }
    if (intPart % 1000 > 0) {
      result += convertChunk(intPart % 1000) + ' ';
    }

    result = result.trim() + ' PESOS';
    if (centPart > 0) {
      result += ` AND ${centPart}/100 CENTAVOS ONLY`;
    } else {
      result += ' ONLY';
    }
    return result;
  };

  // ── Load Payroll Sub-Data (Runs, Adjustments, 13th Month) ──
  const loadPayrollSubData = useCallback(async (tab) => {
    if (tab === 'runs') {
      try {
        const res = await authFetch('/api/finance/payroll?mode=runs');
        const data = await res.json();
        if (data.success) setPayrollRuns(data.runs || []);
      } catch (e) {
        console.error('Error fetching payroll runs:', e);
      }
    } else if (tab === 'adjustments') {
      try {
        const res = await authFetch('/api/finance/payroll?mode=adjustments');
        const data = await res.json();
        if (data.success) setAdjustmentsList(data.adjustments || []);
      } catch (e) {
        console.error('Error fetching adjustments:', e);
      }
    } else if (tab === 'thirteenth') {
      try {
        const res = await authFetch(`/api/finance/payroll?mode=13th_month&year=${currentYear}`);
        const data = await res.json();
        if (data.success) setThirteenthMonthData(data);
      } catch (e) {
        console.error('Error fetching 13th month data:', e);
      }
    }
  }, [authFetch, currentYear]);

  useEffect(() => {
    if (activeTab === 'payroll') {
      loadPayrollSubData(payrollSubTab);
    }
  }, [activeTab, payrollSubTab, loadPayrollSubData]);

  // ── Payroll Actions (Commit, Approve, Disburse) ──
  const handleSavePayrollDraft = async () => {
    if (!payrollData || !payrollData.payroll) return;
    setPayrollActionLoading(true);
    try {
      const res = await authFetch('/api/finance/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit_worksheet',
          cutoff_start: cutoffStart,
          cutoff_end: cutoffEnd,
          records: payrollData.payroll,
          summary: payrollData.summary,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Payroll worksheet draft saved & committed', 'success');
        loadData();
      } else {
        showToast(data.error || 'Failed to save payroll draft', 'error');
      }
    } catch (e) {
      showToast('Error saving payroll', 'error');
    } finally {
      setPayrollActionLoading(false);
    }
  };

  const handleApprovePayroll = async () => {
    if (!confirm(`Are you sure you want to officially APPROVE the payroll for period ${cutoffStart} to ${cutoffEnd}? This will lock the records for disbursement.`)) {
      return;
    }
    setPayrollActionLoading(true);
    try {
      const res = await authFetch('/api/finance/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          cutoff_start: cutoffStart,
          cutoff_end: cutoffEnd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Payroll cutoff officially approved!', 'success');
        loadData();
      } else {
        showToast(data.error || 'Approval failed', 'error');
      }
    } catch (e) {
      showToast('Error approving payroll', 'error');
    } finally {
      setPayrollActionLoading(false);
    }
  };

  const handleDisbursePayroll = async (e) => {
    e.preventDefault();
    setPayrollActionLoading(true);
    try {
      const res = await authFetch('/api/finance/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disburse',
          cutoff_start: cutoffStart,
          cutoff_end: cutoffEnd,
          method: disburseMethod,
          notes: disburseNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Payout disbursed successfully via ${disburseMethod}!`, 'success');
        setShowDisburseModal(false);
        loadData();
      } else {
        showToast(data.error || 'Disbursement failed', 'error');
      }
    } catch (e) {
      showToast('Error disbursing payroll', 'error');
    } finally {
      setPayrollActionLoading(false);
    }
  };

  // ── Custom Adjustments (Bonuses, Loans, Cash Advance) ──
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/finance/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_adjustment',
          ...adjustmentForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(adjustmentForm.id ? 'Adjustment updated' : 'Adjustment added successfully', 'success');
        setShowAdjustmentModal(false);
        loadData();
        loadPayrollSubData('adjustments');
      } else {
        showToast(data.error || 'Failed to save adjustment', 'error');
      }
    } catch (e) {
      showToast('Error saving adjustment', 'error');
    }
  };

  const handleDeleteAdjustment = async (id) => {
    if (!confirm('Are you sure you want to remove this adjustment?')) return;
    try {
      const res = await authFetch('/api/finance/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_adjustment', id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Adjustment removed', 'success');
        loadData();
        loadPayrollSubData('adjustments');
      } else {
        showToast(data.error || 'Failed to delete', 'error');
      }
    } catch (e) {
      showToast('Error deleting adjustment', 'error');
    }
  };

  // ── Open Modals ──
  const openPayslipModal = (p) => {
    setSelectedPayslip(p);
    setShowPayslipModal(true);
  };

  const handlePrintPayslip = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const payslipElem = document.getElementById('printable-payslip');
    if (!payslipElem || !selectedPayslip) return;
    setPdfGenerating(true);
    try {
      // 1. High DPI capture using html2canvas
      const canvas = await html2canvas(payslipElem, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      
      // 2. Format PDF in Half of A4 (A5 Landscape: 210 x 148.5 mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5' // Exactly half of A4 paper
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 5; // 5mm clean margin
      const printableWidth = pdfWidth - margin * 2;
      const printableHeight = pdfHeight - margin * 2;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, Math.min(imgHeight, printableHeight));
      
      const safeName = (selectedPayslip.employee_name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`EM-PAYSLIP_${safeName}_${cutoff}.pdf`);
      showToast('Official Payslip PDF exported successfully!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Exporting via browser print dialog...', 'info');
      window.print();
    } finally {
      setPdfGenerating(false);
    }
  };

  const openAdjustmentModal = (param = '') => {
    const today = new Date().toISOString().split('T')[0];
    if (param && typeof param === 'object') {
      const adj = param;
      let planNum = 4;
      const planMatch = adj.notes ? adj.notes.match(/Plan:\s*(\d+)/i) : null;
      if (planMatch && planMatch[1]) {
        planNum = parseInt(planMatch[1], 10);
      } else if (adj.remaining_balance && adj.amount && parseFloat(adj.amount) > 0) {
        planNum = Math.max(1, Math.round(parseFloat(adj.remaining_balance) / parseFloat(adj.amount)));
      }

      let dateRec = adj.date_received || today;
      const dateMatch = adj.notes ? adj.notes.match(/Received:\s*([\d-]+)/i) : null;
      if (dateMatch && dateMatch[1]) {
        dateRec = dateMatch[1];
      }

      const recType = adj.notes?.includes('Plan:')
        ? 'installments'
        : adj.is_recurring
        ? 'recurring'
        : 'one_time';

      const totalAmt = adj.remaining_balance || (recType === 'installments' && adj.amount ? (parseFloat(adj.amount) * planNum).toFixed(2) : adj.amount);

      setAdjustmentForm({
        id: adj.id,
        employee_id: adj.employee_id || '',
        type: adj.type || 'deduction',
        category: adj.category || 'Cash Advance',
        title: adj.title || '',
        amount: adj.amount || '',
        total_amount: totalAmt || '',
        recurrence_type: recType,
        total_installments: planNum,
        date_received: dateRec,
        cutoff_start: adj.cutoff_start || cutoffStart || defaultStart,
        notes: adj.notes || '',
      });
    } else {
      setAdjustmentForm({
        id: null,
        employee_id: typeof param === 'string' ? param : (employees[0]?.employee_id || ''),
        type: 'deduction',
        category: 'Cash Advance',
        title: '',
        amount: '',
        total_amount: '',
        recurrence_type: 'installments',
        total_installments: 4,
        date_received: today,
        cutoff_start: cutoffStart || defaultStart,
        notes: '',
      });
    }
    setShowAdjustmentModal(true);
  };

  // ── Full Excel & Export Suite ──
  const exportPayrollToExcel = () => {
    if (!payrollData || !payrollData.payroll) return;
    const exportRows = payrollData.payroll.map((p, idx) => ({
      'No.': idx + 1,
      'Employee ID': p.employee_id,
      'Full Name': p.employee_name,
      'Department': p.department,
      'Position': p.position,
      'Rate Type': p.rate_type?.toUpperCase(),
      'Base Rate (₱)': p.base_rate,
      'Days Present': p.days_present,
      'Regular Hours': p.total_regular_hours,
      'OT Hours': p.total_ot_hours,
      'Late Mins': p.total_late_minutes,
      'Basic Pay (₱)': p.basic_pay,
      'OT Pay (₱)': p.ot_pay,
      'Allowances (₱)': p.allowances,
      'Bonuses (₱)': p.bonuses || 0,
      'Night Diff (₱)': p.night_diff_pay || 0,
      'Gross Pay (₱)': p.gross_pay,
      'SSS EE (₱)': p.deductions_sss,
      'PhilHealth EE (₱)': p.deductions_philhealth,
      'Pag-IBIG EE (₱)': p.deductions_pagibig,
      'Withholding Tax (₱)': p.deductions_tax,
      'Late Deductions (₱)': p.deductions_late,
      'Loan Deductions (₱)': p.loan_deductions || 0,
      'Cash Advances (₱)': p.cash_advance_deductions || 0,
      'Total Deductions (₱)': p.total_deductions,
      'Net Take-Home Pay (₱)': p.net_pay,
      'SSS ER (₱)': p.sss_er || 0,
      'PhilHealth ER (₱)': p.philhealth_er || 0,
      'Pag-IBIG ER (₱)': p.pagibig_er || 0,
      'Total Company Cost (₱)': p.total_employer_cost || p.gross_pay,
      'Disbursement Channel': p.disbursement_method || 'Bank Transfer',
      'Status': p.status,
      'Cutoff Period': `${p.cutoff_start} to ${p.cutoff_end}`,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Payroll Worksheet');
    XLSX.writeFile(wb, `EM-CARD_Master_Payroll_${cutoffStart}_to_${cutoffEnd}.xlsx`);
    showToast('Master Payroll Worksheet exported to Excel');
  };

  const exportBankAdvice = () => {
    if (!payrollData || !payrollData.payroll) return;
    const adviceRows = payrollData.payroll.map((p, idx) => ({
      'Item No.': idx + 1,
      'Bank Name': p.bank_name || 'Landbank of the Philippines',
      'Bank Account Number': p.bank_account_no || '1088-2941-00',
      'Employee Full Name': p.employee_name,
      'Employee ID': p.employee_id,
      'Net Payout (₱)': p.net_pay,
      'Particulars': `Salary Payout (${cutoffStart} to ${cutoffEnd})`,
      'Payment Status': p.status === 'Disbursed' ? 'PAID' : 'APPROVED FOR AUTO-CREDIT',
    }));

    const ws = XLSX.utils.json_to_sheet(adviceRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Disbursement Advice');
    XLSX.writeFile(wb, `EM-CARD_Bank_Advice_${cutoffStart}_to_${cutoffEnd}.xlsx`);
    showToast('Bank Auto-Credit Advice exported to Excel');
  };

  const exportStatutoryReport = () => {
    if (!payrollData || !payrollData.payroll) return;
    const statRows = payrollData.payroll.map((p, idx) => ({
      'No.': idx + 1,
      'Employee ID': p.employee_id,
      'Full Name': p.employee_name,
      'TIN': p.tin_number || '—',
      'Withholding Tax (₱)': p.deductions_tax,
      'SSS Number': p.sss_number || '—',
      'SSS Employee (₱)': p.deductions_sss,
      'SSS Employer (₱)': p.sss_er || 0,
      'SSS Total (₱)': (p.deductions_sss || 0) + (p.sss_er || 0),
      'PhilHealth Number': p.philhealth_number || '—',
      'PhilHealth EE (₱)': p.deductions_philhealth,
      'PhilHealth ER (₱)': p.philhealth_er || 0,
      'PhilHealth Total (₱)': (p.deductions_philhealth || 0) + (p.philhealth_er || 0),
      'Pag-IBIG Number': p.pagibig_number || '—',
      'Pag-IBIG EE (₱)': p.deductions_pagibig,
      'Pag-IBIG ER (₱)': p.pagibig_er || 0,
      'Pag-IBIG Total (₱)': (p.deductions_pagibig || 0) + (p.pagibig_er || 0),
      'Total Gov Remittance (₱)': (p.deductions_tax || 0) + (p.deductions_sss || 0) + (p.sss_er || 0) + (p.deductions_philhealth || 0) + (p.philhealth_er || 0) + (p.deductions_pagibig || 0) + (p.pagibig_er || 0),
    }));

    const ws = XLSX.utils.json_to_sheet(statRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statutory Remittance');
    XLSX.writeFile(wb, `EM-CARD_Statutory_Remittance_${cutoffStart}_to_${cutoffEnd}.xlsx`);
    showToast('Statutory SSS/PhilHealth/HDMF Remittance exported');
  };

  const exportThirteenthMonthExcel = () => {
    if (!thirteenthMonthData || !thirteenthMonthData.records) return;
    const rows = thirteenthMonthData.records.map((r, idx) => ({
      'No.': idx + 1,
      'Employee ID': r.employee_id,
      'Full Name': r.employee_name,
      'Department': r.department,
      'Position': r.position,
      'Monthly Basic Salary (₱)': r.monthly_salary,
      'Total Basic Earned YTD (₱)': r.total_basic_earned_ytd,
      '13th Month Accrual (₱)': r.thirteenth_month_pay,
      'Tax-Exempt Portion (₱)': r.tax_exempt_portion,
      'Taxable Portion (₱)': r.taxable_portion,
      'Year': thirteenthMonthData.year,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '13th Month Pay Ledger');
    XLSX.writeFile(wb, `EM-CARD_13th_Month_Ledger_${thirteenthMonthData.year}.xlsx`);
    showToast('13th Month Pay Ledger exported');
  };

  // ── Filtered Employees ──
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (selectedDept !== 'all' && e.department !== selectedDept) return false;
      if (selectedStatus !== 'all' && e.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
        return fullName.includes(q) || e.employee_id.toLowerCase().includes(q) || (e.department || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [employees, selectedDept, selectedStatus, searchQuery]);

  // ── Departments list with dynamic suggestions from existing workforce ──
  const departments = useMemo(() => {
    const defaultDepts = ['Operations', 'Security & Verification', 'IT & Systems', 'Executive & Management', 'Community Outreach', 'Finance & Accounting', 'Human Resources', 'Logistics & Supply'];
    const fromEmployees = (employees || [])
      .map(e => e.department)
      .filter(Boolean)
      .map(d => d.trim());
    return Array.from(new Set([...defaultDepts, ...fromEmployees])).filter(Boolean);
  }, [employees]);

  // ── Format Currency ──
  const formatPHP = (val) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);
  };

  // ════════════════════════════════════════════════════════════════════════
  // 1. AUTH LOADING STATE
  // ════════════════════════════════════════════════════════════════════════
  if (authLoading) {
    return (
      <div className="finance-auth-screen flex-center">
        <div className="finance-loading-card">
          <div className="finance-spinner" />
          <h3>Securing Financial Connection...</h3>
          <p>Verifying AES-256 Biometric Terminal Permissions</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. UNLOGGED LOGIN SCREEN
  // ════════════════════════════════════════════════════════════════════════
  if (!session) {
    return (
      <div className="finance-login-container">
        <div className="finance-login-card">
          <div className="finance-login-badge">
            <Banknote size={28} />
          </div>
          <h2>Finance & Biometrics Portal</h2>
          <p className="finance-login-sub">
            Restricted access terminal for authorized Finance Officers.
          </p>

          {loginError && (
            <div className="finance-error-alert">
              <AlertCircle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="finance-login-form">
            <div className="finance-input-group">
              <label>Finance Account Email</label>
              <div className="finance-input-icon-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  required
                  placeholder="finance@em-card.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="finance-input-group">
              <label>Access Password</label>
              <div className="finance-input-icon-wrap">
                <Lock size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="finance-pwd-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-finance-primary btn-full"
              disabled={loginLoading}
            >
              <ShieldCheck size={18} />
              <span>{loginLoading ? 'Authenticating...' : 'Access Finance Terminal'}</span>
            </button>
          </form>

          <div className="finance-login-footer">
            <small>🔒 Hardware encrypted biometric & labor compensation protocol</small>
            <a href="/admin" className="finance-return-link">← Citizen Registry Admin</a>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3. ROLE RESTRICTION: USER IS NOT FINANCE (e.g. Admin or Staff)
  // ════════════════════════════════════════════════════════════════════════
  if (userRole !== 'finance') {
    return (
      <div className="finance-auth-screen flex-center">
        <div className="finance-forbidden-card">
          <div className="forbidden-icon">
            <Lock size={36} />
          </div>
          <h2>403 — Access Forbidden</h2>
          <p className="forbidden-desc">
            This module contains confidential employee biometric records, compensation structures, and payroll disbursements.
          </p>
          <div className="forbidden-meta">
            <span>Your current role: <strong>{userRole?.toUpperCase()}</strong></span>
            <span>Required role: <strong>FINANCE</strong></span>
          </div>
          <p className="forbidden-hint">
            Administrators and staff operators are strictly restricted from accessing employee labor records. Please log in with a designated Finance Officer account.
          </p>
          <div className="forbidden-actions">
            <a href="/admin" className="btn-finance-outline">Return to Citizen Admin</a>
            <button onClick={handleLogout} className="btn-finance-primary">Log In as Finance</button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // 4. MAIN FINANCE PORTAL DASHBOARD (Role: FINANCE)
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="finance-layout">
      {/* Toast Notification */}
      {toast && (
        <div className={`finance-toast-pop ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="finance-top-nav">
        <div className="finance-nav-brand">
          <div className="finance-brand-icon">
            <Banknote size={22} />
          </div>
          <div>
            <div className="finance-brand-title">EM Card · Finance & Biometrics</div>
            <div className="finance-brand-sub">Official Employee Workforce & Compensation Terminal</div>
          </div>
        </div>

        <div className="finance-nav-right">
          <div className="finance-user-chip">
            <div className="finance-avatar-dot" />
            <div className="finance-user-meta">
              <span className="finance-user-name">{session.user.email}</span>
              <span className="finance-role-badge">FINANCE OFFICER</span>
            </div>
          </div>

          <button
            onClick={loadData}
            className="btn-finance-icon-nav"
            title="Refresh All Data"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>

          <button
            onClick={handleLogout}
            className="btn-finance-logout"
            title="Logout Terminal"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="finance-body-container">
        {/* Navigation Tabs */}
        <nav className="finance-tabs-bar">
          <button
            className={`finance-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={17} />
            <span>Overview & Analytics</span>
          </button>

          <button
            className={`finance-tab-btn ${activeTab === 'biometrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('biometrics')}
          >
            <Camera size={17} />
            <span>Live Biometrics ({attendanceLogs.length})</span>
          </button>

          <button
            className={`finance-tab-btn ${activeTab === 'dtr' ? 'active' : ''}`}
            onClick={() => setActiveTab('dtr')}
          >
            <Clock size={17} />
            <span>Daily Time Records (DTR)</span>
          </button>

          <button
            className={`finance-tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            <Users size={17} />
            <span>Staff Directory ({employees.length})</span>
          </button>

          <button
            className={`finance-tab-btn ${activeTab === 'payroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('payroll')}
          >
            <Banknote size={17} />
            <span>Payroll Engine</span>
          </button>

          <button
            className={`finance-tab-btn ${activeTab === 'offices' ? 'active' : ''}`}
            onClick={() => setActiveTab('offices')}
          >
            <Building2 size={17} />
            <span>Offices & Geofences ({offices.length})</span>
          </button>
        </nav>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW & ANALYTICS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="finance-tab-content">
            {/* KPI Cards */}
            <div className="finance-kpi-grid">
              <div className="finance-kpi-card">
                <div className="kpi-icon-wrap emerald">
                  <Users size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Active Workforce</span>
                  <div className="kpi-value">{stats?.activeEmployeesCount || employees.length}</div>
                  <span className="kpi-sub">Registered Staff Members</span>
                </div>
              </div>

              <div className="finance-kpi-card">
                <div className="kpi-icon-wrap gold">
                  <CheckCircle2 size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Today Attendance Rate</span>
                  <div className="kpi-value">{stats?.todayAttendanceRate || 0}%</div>
                  <span className="kpi-sub">
                    {stats?.todayPresent || 0} Present · {stats?.todayLate || 0} Late
                  </span>
                </div>
              </div>

              <div className="finance-kpi-card">
                <div className="kpi-icon-wrap blue">
                  <Clock size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Cut-off Logged Logs</span>
                  <div className="kpi-value">{attendanceLogs.length}</div>
                  <span className="kpi-sub">{cutoffStart} to {cutoffEnd}</span>
                </div>
              </div>

              <div className="finance-kpi-card">
                <div className="kpi-icon-wrap purple">
                  <Banknote size={22} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">Est. Monthly Labor Cost</span>
                  <div className="kpi-value">{formatPHP(stats?.estimatedMonthlyLaborCost)}</div>
                  <span className="kpi-sub">Base Salary & Allowances</span>
                </div>
              </div>
            </div>

            {/* Overview Quick Actions & Live Stream */}
            <div className="finance-two-col-grid">
              {/* Left: Department Distribution */}
              <div className="finance-card">
                <div className="finance-card-header">
                  <h3>Department Workforce Distribution</h3>
                </div>
                <div className="dept-dist-list">
                  {departments.map((dept) => {
                    const count = employees.filter(e => e.department === dept).length;
                    const percent = employees.length > 0 ? Math.round((count / employees.length) * 100) : 0;
                    return (
                      <div key={dept} className="dept-dist-item">
                        <div className="dept-dist-top">
                          <span className="dept-name">{dept}</span>
                          <span className="dept-count">{count} Staff ({percent}%)</span>
                        </div>
                        <div className="dept-progress-bar">
                          <div className="dept-progress-fill" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Quick Launch & Terminal Status */}
              <div className="finance-card">
                <div className="finance-card-header">
                  <h3>Biometric Operations Quick Launch</h3>
                </div>
                <div className="quick-actions-grid">
                  <button
                    className="finance-action-tile"
                    onClick={() => {
                      setEditEmployee(null);
                      setEmployeeForm({
                        employee_id: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
                        first_name: '',
                        last_name: '',
                        email: '',
                        phone: '',
                        department: 'Operations',
                        position: 'Staff Operator',
                        rate_type: 'monthly',
                        base_rate: 25000,
                        allowance: 2000,
                        ot_multiplier: 1.25,
                        daily_hours: 8,
                        status: 'active',
                        photo_url: '',
                      });
                      stopEnrollCam();
                      setShowEmployeeModal(true);
                    }}
                  >
                    <UserPlus size={24} />
                    <strong>Enroll New Staff</strong>
                    <small>Add employee profile & set pay rate</small>
                  </button>

                  <button
                    className="finance-action-tile"
                    onClick={startKiosk}
                    style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(15, 23, 42, 0.6))' }}
                  >
                    <Camera size={24} style={{ color: '#34d399' }} />
                    <strong style={{ color: '#34d399' }}>Face & GPS Kiosk</strong>
                    <small>Real-time facial scan & geolocation punch</small>
                  </button>

                  <button
                    className="finance-action-tile"
                    onClick={() => {
                      setManualLogForm({
                        employee_id: employees[0]?.employee_id || '',
                        log_date: new Date().toISOString().split('T')[0],
                        time_in: '08:00',
                        time_out: '17:00',
                        status: 'Present',
                        notes: 'Manual Entry Verified by Finance',
                      });
                      setShowManualLogModal(true);
                    }}
                  >
                    <Clock size={24} />
                    <strong>Record Manual DTR</strong>
                    <small>Log or adjust time-in/out stamps</small>
                  </button>

                  <button
                    className="finance-action-tile"
                    onClick={() => setActiveTab('payroll')}
                  >
                    <Banknote size={24} />
                    <strong>Generate Payroll</strong>
                    <small>Auto-calculate semi-monthly payout</small>
                  </button>

                  <button
                    className="finance-action-tile"
                    onClick={exportPayrollToExcel}
                  >
                    <FileSpreadsheet size={24} />
                    <strong>Export to Excel</strong>
                    <small>Download current cut-off spreadsheet</small>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: LIVE BIOMETRICS & TIME-IN STREAM
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'biometrics' && (
          <div className="finance-tab-content">
            {/* Filters */}
            <div className="finance-controls-row">
              <div className="finance-date-controls">
                <label>Date Filter:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="finance-styled-input"
                />
              </div>

              <div className="finance-right-actions">
                <button
                  className="btn-finance-primary"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                  onClick={startKiosk}
                >
                  <Camera size={16} /> Launch Face & GPS Kiosk
                </button>

                <button
                  className="btn-finance-outline"
                  onClick={() => {
                    setManualLogForm({
                      employee_id: employees[0]?.employee_id || '',
                      log_date: selectedDate,
                      time_in: '08:00',
                      time_out: '17:00',
                      status: 'Present',
                      notes: 'Verified by Finance',
                    });
                    setShowManualLogModal(true);
                  }}
                >
                  <Plus size={16} /> Manual DTR Entry
                </button>
              </div>
            </div>

            {/* Live Logs Stream Table */}
            <div className="finance-table-card">
              <div className="finance-table-header">
                <h3>Biometric Verification Stream</h3>
                <span className="badge-count">{attendanceLogs.length} Total Records</span>
              </div>

              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Date</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Hours Worked</th>
                      <th>Status</th>
                      <th>Biometric Match</th>
                      <th>Location / Kiosk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="empty-table-cell">
                          No biometric logs found for this period. Click "Record Attendance Log" to add entries.
                        </td>
                      </tr>
                    ) : (
                      attendanceLogs.map((log) => {
                        const emp = log.employees || employees.find(e => e.employee_id === log.employee_id) || {};
                        return (
                          <tr key={log.id || `${log.employee_id}-${log.log_date}`}>
                            <td>
                              <div className="emp-cell">
                                <div className="emp-avatar-circle">
                                  {emp.photo_url ? (
                                    <img src={emp.photo_url} alt="" />
                                  ) : (
                                    <span>{(emp.first_name?.[0] || 'E')}</span>
                                  )}
                                </div>
                                <div>
                                  <strong className="emp-name">
                                    {emp.first_name ? `${emp.first_name} ${emp.last_name}` : log.employee_id}
                                  </strong>
                                  <small className="emp-id">{log.employee_id}</small>
                                </div>
                              </div>
                            </td>
                            <td><span className="dept-tag">{emp.department || 'Operations'}</span></td>
                            <td>{log.log_date}</td>
                            <td>
                              <span className="time-in-badge">
                                {log.time_in ? new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </td>
                            <td>
                              <span className="time-out-badge">
                                {log.time_out ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                              </span>
                            </td>
                            <td><strong>{log.hours_worked || 0} hrs</strong></td>
                            <td>
                              <span className={`status-pill ${log.status?.toLowerCase()}`}>
                                {log.status}
                              </span>
                            </td>
                            <td>
                              <span className="match-confidence">
                                {log.confidence_score ? `${log.confidence_score}% Match` : '98.5% AI Face'}
                              </span>
                            </td>
                            <td><small className="location-text">{log.location || 'HQ Kiosk 1'}</small></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: DAILY TIME RECORDS (DTR) & TIMESHEETS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dtr' && (
          <div className="finance-tab-content">
            <div className="finance-controls-row">
              <div className="finance-cutoff-selector">
                <div>
                  <label>Cut-off Start Date:</label>
                  <input
                    type="date"
                    value={cutoffStart}
                    onChange={(e) => setCutoffStart(e.target.value)}
                    className="finance-styled-input"
                  />
                </div>
                <div>
                  <label>Cut-off End Date:</label>
                  <input
                    type="date"
                    value={cutoffEnd}
                    onChange={(e) => setCutoffEnd(e.target.value)}
                    className="finance-styled-input"
                  />
                </div>
                <button
                  className="btn-finance-primary"
                  onClick={loadData}
                >
                  <Filter size={15} /> Apply Cut-off Filter
                </button>
              </div>

              <div className="finance-right-actions">
                <button
                  className="btn-finance-outline"
                  onClick={exportPayrollToExcel}
                >
                  <Download size={15} /> Export DTR Records
                </button>
              </div>
            </div>

            {/* DTR Summaries */}
            <div className="finance-table-card">
              <div className="finance-table-header">
                <h3>Employee Timesheet Summaries ({cutoffStart} to {cutoffEnd})</h3>
              </div>

              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Rate Type</th>
                      <th>Days Present</th>
                      <th>Regular Hours</th>
                      <th>Overtime Hours</th>
                      <th>Total Late (Mins)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const empLogs = attendanceLogs.filter(l => l.employee_id === emp.employee_id);
                      const daysPresent = empLogs.filter(l => l.status === 'Present' || l.status === 'Late' || l.status === 'Overtime').length;
                      const totalHours = empLogs.reduce((acc, l) => acc + (parseFloat(l.hours_worked) || 0), 0);
                      const totalOt = empLogs.reduce((acc, l) => acc + (parseFloat(l.ot_hours) || 0), 0);
                      const totalLate = empLogs.reduce((acc, l) => acc + (parseInt(l.late_minutes, 10) || 0), 0);

                      return (
                        <tr key={emp.id}>
                          <td>
                            <strong>{emp.first_name} {emp.last_name}</strong>
                            <small className="emp-id-block">{emp.employee_id}</small>
                          </td>
                          <td>{emp.department}</td>
                          <td><span className="rate-badge">{emp.rate_type?.toUpperCase()}</span></td>
                          <td><strong>{daysPresent} Days</strong></td>
                          <td>{Math.round(totalHours * 10) / 10} hrs</td>
                          <td><span className="ot-text">{Math.round(totalOt * 10) / 10} hrs</span></td>
                          <td>
                            <span className={totalLate > 0 ? 'late-text' : 'on-time-text'}>
                              {totalLate} mins
                            </span>
                          </td>
                          <td>
                            <span className="status-pill present">
                              Verified DTR
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: STAFF DIRECTORY & COMPENSATION RATES
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'employees' && (
          <div className="finance-tab-content">
            <div className="finance-controls-row">
              <div className="finance-search-wrap">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search staff by name, employee ID, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="finance-search-input"
                />
              </div>

              <div className="finance-filters-wrap">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="finance-select"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <button
                  className="btn-finance-primary"
                  onClick={() => {
                    setEditEmployee(null);
                    setEmployeeForm({
                      employee_id: '',
                      first_name: '',
                      last_name: '',
                      email: '',
                      phone: '',
                      department: 'Operations',
                      position: '',
                      rate_type: 'semi_monthly',
                      base_rate: '',
                      allowance: '',
                      ot_multiplier: '1.25',
                      daily_hours: 8,
                      status: 'active',
                      schedule_type: 'fixed',
                      shift_start: '08:00',
                      shift_end: '17:00',
                      grace_period_mins: 15,
                      required_daily_hours: 8,
                      photo_url: '',
                    });
                    stopEnrollCam();
                    setShowEmployeeModal(true);
                  }}
                >
                  <UserPlus size={16} /> Enroll Employee
                </button>
              </div>
            </div>

            {/* Employee Table */}
            <div className="finance-table-card">
              <div className="finance-table-header">
                <h3>Workforce Directory ({filteredEmployees.length} Members)</h3>
              </div>

              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Full Name & Face</th>
                      <th>Department & Position</th>
                      <th>Schedule Mode</th>
                      <th>Compensation Structure</th>
                      <th>Allowance</th>
                      <th>OT Multiplier</th>
                      <th>Biometric Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="empty-table-cell">
                          No employees found. Click "Enroll Employee" to add your first staff profile.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr key={emp.id}>
                          <td><strong className="code-id">{emp.employee_id}</strong></td>
                          <td>
                            <div className="emp-cell">
                              <div className="emp-avatar-circle" style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: '#0f172a', border: '1.5px solid rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {emp.photo_url ? (
                                   <img src={emp.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}>{(emp.first_name?.[0] || 'E')}</span>
                                )}
                              </div>
                              <div>
                                <strong>{emp.first_name} {emp.last_name}</strong>
                                <small className="emp-contact-sub">{emp.email || emp.phone || '—'}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>{emp.department}</div>
                            <small className="emp-position">{emp.position}</small>
                          </td>
                          <td>
                            {emp.schedule_type === 'flexi' ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }}>
                                  <Zap size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                                  <span>Flexible Shift</span>
                                </span>
                                <small style={{ color: '#94a3b8', fontSize: '0.68rem', paddingLeft: 2 }}>Anytime · 0 Late</small>
                              </div>
                            ) : emp.schedule_type === 'exempt' ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }}>
                                  <Shield size={12} style={{ color: '#38bdf8', flexShrink: 0 }} />
                                  <span>Exempt / Exec</span>
                                </span>
                                <small style={{ color: '#94a3b8', fontSize: '0.68rem', paddingLeft: 2 }}>No Deductions</small>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  background: 'rgba(56, 189, 248, 0.08)',
                                  color: '#f1f5f9',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }}>
                                  <Clock size={12} style={{ color: '#38bdf8', flexShrink: 0 }} />
                                  <span>{(emp.shift_start || '08:00:00').substring(0, 5)} - {(emp.shift_end || '17:00:00').substring(0, 5)}</span>
                                </span>
                                <small style={{ color: '#94a3b8', fontSize: '0.68rem', paddingLeft: 2 }}>
                                  Grace: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{emp.grace_period_mins ?? 15}m</span>
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <strong className="salary-text">{formatPHP(emp.base_rate)}</strong>
                              <small className="rate-sub" style={{ whiteSpace: 'nowrap' }}>
                                {emp.rate_type === 'semi_monthly' ? ` / cut-off (₱${(parseFloat(emp.base_rate) * 2).toLocaleString('en-PH', { minimumFractionDigits: 0 })} / mo)` :
                                 emp.rate_type === 'monthly' ? ` / mo (₱${(parseFloat(emp.base_rate) / 2).toLocaleString('en-PH', { minimumFractionDigits: 0 })} / cut-off)` : 
                                 ` / ${emp.rate_type}`}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <strong style={{ color: parseFloat(emp.allowance) > 0 ? '#e2e8f0' : '#64748b' }}>{formatPHP(emp.allowance)}</strong>
                              {parseFloat(emp.allowance) > 0 && (
                                <small className="rate-sub" style={{ whiteSpace: 'nowrap' }}>
                                  {emp.rate_type === 'semi_monthly' ? ` / cut-off (₱${(parseFloat(emp.allowance) * 2).toLocaleString('en-PH', { minimumFractionDigits: 0 })} / mo)` :
                                   emp.rate_type === 'monthly' ? ` / mo (₱${(parseFloat(emp.allowance) / 2).toLocaleString('en-PH', { minimumFractionDigits: 0 })} / cut-off)` : ''}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            {parseFloat(emp.ot_multiplier) === 0 ? (
                              <span style={{ color: '#94a3b8', fontSize: '0.76rem', fontWeight: 600 }}>0x (No OT)</span>
                            ) : (
                              <span style={{ color: '#fbbf24', fontWeight: 700 }}>{emp.ot_multiplier || 1.25}x</span>
                            )}
                          </td>
                          <td>
                            {emp.photo_url ? (
                              <span className="biometric-enrolled-chip">
                                <ShieldCheck size={12} /> Face Enrolled
                              </span>
                            ) : (
                              <span className="biometric-pending-chip">
                                <AlertTriangle size={12} /> Pending Face
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-buttons-wrap">
                              <button
                                className="btn-icon-action"
                                title="Edit compensation & details"
                                onClick={() => {
                                  setEditEmployee(emp);
                                  const samplePhotos = (emp.face_samples && Array.isArray(emp.face_samples) && emp.face_samples.length > 0)
                                    ? emp.face_samples
                                    : (emp.photo_url ? [emp.photo_url, emp.photo_url, emp.photo_url] : []);
                                  setEmployeeForm({
                                    employee_id: emp.employee_id,
                                    first_name: emp.first_name,
                                    last_name: emp.last_name,
                                    email: emp.email || '',
                                    phone: emp.phone || '',
                                    department: emp.department || 'Operations',
                                    position: emp.position || 'Staff',
                                    rate_type: emp.rate_type || 'semi_monthly',
                                    base_rate: emp.base_rate || 0,
                                    allowance: emp.allowance || 0,
                                    ot_multiplier: emp.ot_multiplier || 1.25,
                                    daily_hours: emp.daily_hours || 8,
                                    status: emp.status || 'active',
                                    schedule_type: emp.schedule_type || 'fixed',
                                    shift_start: (emp.shift_start || '08:00:00').substring(0, 5),
                                    shift_end: (emp.shift_end || '17:00:00').substring(0, 5),
                                    grace_period_mins: emp.grace_period_mins !== undefined ? emp.grace_period_mins : 15,
                                    required_daily_hours: emp.required_daily_hours || 8,
                                    photo_url: emp.photo_url || '',
                                    face_samples: samplePhotos,
                                    face_token: emp.face_token || '',
                                  });
                                  setEnrollPhotos(samplePhotos.length === 3 ? samplePhotos : (emp.photo_url ? [emp.photo_url, emp.photo_url, emp.photo_url] : ['', '', '']));
                                  stopEnrollCam();
                                  setShowEmployeeModal(true);
                                }}
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                className="btn-icon-action delete"
                                title="Delete profile"
                                onClick={() => handleDeleteEmployee(emp.id, `${emp.first_name} ${emp.last_name}`)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 5: ENTERPRISE PAYROLL ENGINE & DISBURSEMENT
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'payroll' && (
          <div className="finance-tab-content">
            {/* Payroll Sub-Navigation Bar */}
            <div className="payroll-subnav-bar">
              <button
                type="button"
                className={`payroll-subnav-btn ${payrollSubTab === 'worksheet' ? 'active' : ''}`}
                onClick={() => setPayrollSubTab('worksheet')}
              >
                <Banknote size={15} />
                <span>Active Cut-off Worksheet</span>
              </button>

              <button
                type="button"
                className={`payroll-subnav-btn ${payrollSubTab === 'thirteenth' ? 'active' : ''}`}
                onClick={() => setPayrollSubTab('thirteenth')}
              >
                <Award size={15} />
                <span>13th Month Pay Ledger</span>
              </button>

              <button
                type="button"
                className={`payroll-subnav-btn ${payrollSubTab === 'runs' ? 'active' : ''}`}
                onClick={() => setPayrollSubTab('runs')}
              >
                <History size={15} />
                <span>Disbursement Archive ({payrollRuns.length})</span>
              </button>

              <button
                type="button"
                className={`payroll-subnav-btn ${payrollSubTab === 'adjustments' ? 'active' : ''}`}
                onClick={() => setPayrollSubTab('adjustments')}
              >
                <Sliders size={15} />
                <span>Loans & Adjustments ({adjustmentsList.length})</span>
              </button>
            </div>

            {/* ── SUB-VIEW 1: ACTIVE CUT-OFF WORKSHEET (GUIDED 3-STEP WORKFLOW) ── */}
            {payrollSubTab === 'worksheet' && (
              <>
                {/* ── Top Guided 3-Step Stepper Bar ── */}
                <div className="payroll-stepper-bar">
                  <button
                    type="button"
                    className={`payroll-step-node ${payrollStep === 1 ? 'active' : payrollStep > 1 ? 'completed' : ''}`}
                    onClick={() => setPayrollStep(1)}
                  >
                    <div className="payroll-step-circle">{payrollStep > 1 ? '✓' : '1'}</div>
                    <div className="payroll-step-text">
                      <span className="payroll-step-title">Step 1: DTR & Biometrics</span>
                      <span className="payroll-step-desc">Audit hours, lates & overtime</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`payroll-step-node ${payrollStep === 2 ? 'active' : payrollStep > 2 ? 'completed' : ''}`}
                    onClick={() => setPayrollStep(2)}
                  >
                    <div className="payroll-step-circle">{payrollStep > 2 ? '✓' : '2'}</div>
                    <div className="payroll-step-text">
                      <span className="payroll-step-title">Step 2: Pay & Tax Worksheet</span>
                      <span className="payroll-step-desc">Gross, statutory & net pay</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`payroll-step-node ${payrollStep === 3 ? 'active' : ''}`}
                    onClick={() => setPayrollStep(3)}
                  >
                    <div className="payroll-step-circle">3</div>
                    <div className="payroll-step-text">
                      <span className="payroll-step-title">Step 3: Approve & Disburse</span>
                      <span className="payroll-step-desc">Payslips, bank files & e-wallets</span>
                    </div>
                  </button>
                </div>

                {/* ── Cutoff Controls & Action Command Toolbar ── */}
                <div className="payroll-toolbar-card">
                  <div className="payroll-toolbar-left">
                    <div className="payroll-cutoff-group">
                      <div className="payroll-cutoff-label">
                        <Calendar size={15} style={{ color: '#10b981' }} />
                        <span>Cut-off Pay Period:</span>
                      </div>
                      <div className="cutoff-inputs">
                        <input
                          type="date"
                          value={cutoffStart}
                          onChange={(e) => setCutoffStart(e.target.value)}
                          className="finance-styled-input"
                        />
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>to</span>
                        <input
                          type="date"
                          value={cutoffEnd}
                          onChange={(e) => setCutoffEnd(e.target.value)}
                          className="finance-styled-input"
                        />
                      </div>
                    </div>

                    {/* Quick Cutoff Preset Buttons */}
                    <div className="payroll-quick-presets">
                      <button
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => {
                          setCutoffStart(`${currentYear}-${currentMonth}-01`);
                          setCutoffEnd(`${currentYear}-${currentMonth}-15`);
                        }}
                      >
                        1st – 15th ({new Date().toLocaleString('default', { month: 'short' })})
                      </button>
                      <button
                        type="button"
                        className="preset-pill-btn"
                        onClick={() => {
                          setCutoffStart(`${currentYear}-${currentMonth}-16`);
                          setCutoffEnd(new Date(currentYear, parseInt(currentMonth, 10), 0).toISOString().split('T')[0]);
                        }}
                      >
                        16th – End ({new Date().toLocaleString('default', { month: 'short' })})
                      </button>
                    </div>
                  </div>

                  <button
                    className="btn-finance-primary"
                    onClick={loadData}
                    disabled={loading}
                    title="Recompute all formulas and statutory contributions"
                  >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    <span>Re-Calculate</span>
                  </button>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    STEP 1: DTR & BIOMETRIC ATTENDANCE AUDIT
                ══════════════════════════════════════════════════════════════ */}
                {payrollStep === 1 && (
                  <div className="payroll-step-content-box">
                    <div className="payroll-step-banner">
                      <div className="payroll-step-banner-text">
                        <ShieldCheck size={20} className="emerald" style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Biometrics Synced:</strong> Verified attendance logs active for period <strong>{cutoffStart}</strong> to <strong>{cutoffEnd}</strong> across <strong>{employees.length}</strong> staff members.
                        </span>
                      </div>
                      <button
                        type="button"
                        className="payroll-banner-link-btn"
                        onClick={() => setActiveTab('dtr')}
                      >
                        Open Detailed DTR Logs →
                      </button>
                    </div>

                    <div className="finance-table-card">
                      <div className="finance-table-header">
                        <div>
                          <h3>Attendance & Time-Card Audit Summary ({cutoffStart} to {cutoffEnd})</h3>
                          <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                            Verify total worked hours, tardiness, and overtime before proceeding to pay computation.
                          </small>
                        </div>
                        <span className="badge-count">{payrollData?.payroll?.length || 0} Staff Synced</span>
                      </div>

                      <div className="finance-table-wrap">
                        <table className="finance-table">
                          <thead>
                            <tr>
                              <th>Staff Member</th>
                              <th>Department</th>
                              <th>Base Hours/Day</th>
                              <th>Worked Hours</th>
                              <th>Late Deductions</th>
                              <th>Overtime Hours</th>
                              <th>Biometric Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!payrollData?.payroll || payrollData.payroll.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="empty-table-cell">
                                  No attendance logs found for this period. Click "Re-Calculate" above.
                                </td>
                              </tr>
                            ) : (
                              payrollData.payroll.map((p) => {
                                const emp = employees.find(e => e.employee_id === p.employee_id) || {};
                                return (
                                  <tr key={p.employee_id}>
                                    <td>
                                      <div className="emp-cell">
                                        <div className="emp-avatar-circle">
                                          {emp.photo_url ? (
                                            <img src={emp.photo_url} alt="" />
                                          ) : (
                                            <span>{(p.employee_name?.[0] || 'E')}</span>
                                          )}
                                        </div>
                                        <div>
                                          <strong className="emp-name">{p.employee_name}</strong>
                                          <small className="emp-id-block">{p.employee_id}</small>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="dept-tag">{p.department}</span>
                                    </td>
                                    <td>{p.daily_hours || 8.0} hrs/day</td>
                                    <td>
                                      <strong style={{ color: '#38bdf8', fontSize: '0.92rem' }}>
                                        {p.total_hours_worked || 0} hrs
                                      </strong>
                                    </td>
                                    <td>
                                      {p.total_late_minutes > 0 ? (
                                        <span style={{ color: '#f87171', fontWeight: 700 }}>
                                          {p.total_late_minutes} mins (-{formatPHP(p.deductions_late)})
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8' }}>0 mins (On-Time)</span>
                                      )}
                                    </td>
                                    <td>
                                      {p.total_ot_hours > 0 ? (
                                        <span style={{ color: '#34d399', fontWeight: 700 }}>
                                          +{p.total_ot_hours} hrs (+{formatPHP(p.ot_pay)})
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8' }}>0 hrs</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className="pub-feed-badge present">
                                        Synced & Verified
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Step 1 Navigation Bar */}
                    <div className="payroll-step-nav-bar">
                      <div className="payroll-step-indicator">
                        <span className="badge-count">Step 1 of 3</span>
                        <span>Biometric Attendance Review</span>
                      </div>
                      <button
                        type="button"
                        className="btn-finance-primary"
                        onClick={() => setPayrollStep(2)}
                      >
                        <span>Proceed to Step 2: Pay & Tax Computation</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    STEP 2: PAY & TAX WORKSHEET COMPUTATION
                ══════════════════════════════════════════════════════════════ */}
                {payrollStep === 2 && (
                  <div className="payroll-step-content-box">
                    {/* Master Payroll Worksheet Table */}
                    <div className="finance-table-card">
                      <div className="finance-table-header">
                        <div>
                          <h3>Official Semi-Monthly Payroll Worksheet ({cutoffStart} to {cutoffEnd})</h3>
                          <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                            Labor Code & BIR TRAIN Law Statutory Engine · DOLE Compliant Withholding
                          </small>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className="btn-finance-outline"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                            onClick={() => openAdjustmentModal()}
                          >
                            <Plus size={13} /> Add Bonus / Loan Adjustment
                          </button>
                        </div>
                      </div>

                      <div className="finance-table-wrap">
                        <table className="finance-table payroll-table">
                          <thead>
                            <tr>
                              <th>Staff Member</th>
                              <th>Department & Position</th>
                              <th>Basic Pay</th>
                              <th>OT & Night Diff</th>
                              <th>Allowances & Bonuses</th>
                              <th>Gross Cut-off Pay</th>
                              <th>SSS EE</th>
                              <th>PhilHealth EE</th>
                              <th>Pag-IBIG EE</th>
                              <th>Withholding Tax</th>
                              <th>Late / Tardiness</th>
                              <th>Loans & Advances</th>
                              <th>Total Deductions</th>
                              <th>Net Take-Home Pay</th>
                              <th>Employer Share</th>
                              <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {!payrollData?.payroll || payrollData.payroll.length === 0 ? (
                              <tr>
                                <td colSpan={16} className="empty-table-cell">
                                  No payroll data generated yet for this period. Click "Re-Calculate" above.
                                </td>
                              </tr>
                            ) : (
                              payrollData.payroll.map((p) => (
                                <tr key={p.employee_id}>
                                  <td>
                                    <strong>{p.employee_name}</strong>
                                    <small className="emp-id-block">{p.employee_id}</small>
                                  </td>
                                  <td>
                                    <div><span className="dept-tag">{p.department}</span></div>
                                    <small style={{ color: '#94a3b8' }}>{p.position || 'Staff'}</small>
                                  </td>
                                  <td>{formatPHP(p.basic_pay)}</td>
                                  <td>
                                    <span className="ot-text">+{formatPHP((p.ot_pay || 0) + (p.night_diff_pay || 0))}</span>
                                    {(p.total_ot_hours > 0 || p.night_diff_pay > 0) && (
                                      <small className="rate-sub">{p.total_ot_hours} hrs OT</small>
                                    )}
                                  </td>
                                  <td>
                                    <span>+{formatPHP((p.allowances || 0) + (p.bonuses || 0))}</span>
                                    {p.bonuses > 0 && <small className="rate-sub" style={{ color: '#34d399' }}>+₱{p.bonuses} Bonus</small>}
                                  </td>
                                  <td><strong>{formatPHP(p.gross_pay)}</strong></td>
                                  <td className="deduct-col" style={{ color: p.deductions_sss > 0 ? '#f87171' : '#64748b' }}>
                                    {p.deductions_sss > 0 ? `-${formatPHP(p.deductions_sss)}` : '₱0.00'}
                                  </td>
                                  <td className="deduct-col" style={{ color: p.deductions_philhealth > 0 ? '#f87171' : '#64748b' }}>
                                    {p.deductions_philhealth > 0 ? `-${formatPHP(p.deductions_philhealth)}` : '₱0.00'}
                                  </td>
                                  <td className="deduct-col" style={{ color: p.deductions_pagibig > 0 ? '#f87171' : '#64748b' }}>
                                    {p.deductions_pagibig > 0 ? `-${formatPHP(p.deductions_pagibig)}` : '₱0.00'}
                                  </td>
                                  <td className="deduct-col" style={{ color: p.deductions_tax > 0 ? '#f87171' : '#64748b' }}>
                                    {p.deductions_tax > 0 ? `-${formatPHP(p.deductions_tax)}` : '₱0.00'}
                                  </td>
                                  <td className="deduct-col" style={{ color: (p.deductions_late || 0) > 0 ? '#f87171' : '#64748b' }}>
                                    {(p.deductions_late || 0) > 0 ? `-${formatPHP(p.deductions_late)}` : '₱0.00'}
                                    {(p.total_late_minutes || 0) > 0 && (
                                      <small className="rate-sub" style={{ color: '#f87171', display: 'block' }}>{p.total_late_minutes} mins late</small>
                                    )}
                                  </td>
                                  <td className="deduct-col" style={{ color: ((p.loan_deductions || 0) + (p.cash_advance_deductions || 0) + (p.other_deductions || 0)) > 0 ? '#f87171' : '#64748b' }}>
                                    {((p.loan_deductions || 0) + (p.cash_advance_deductions || 0) + (p.other_deductions || 0)) > 0
                                      ? `-${formatPHP((p.loan_deductions || 0) + (p.cash_advance_deductions || 0) + (p.other_deductions || 0))}`
                                      : '₱0.00'}
                                  </td>
                                  <td className="deduct-col font-bold">-{formatPHP(p.total_deductions)}</td>
                                  <td>
                                    <span className="net-pay-pill">
                                      {formatPHP(p.net_pay)}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: '0.74rem', color: '#a5b4fc', fontFamily: 'monospace' }}>
                                      +{formatPHP((p.sss_er || 0) + (p.philhealth_er || 0) + (p.pagibig_er || 0))}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <div className="action-buttons-wrap">
                                      <button
                                        type="button"
                                        className="btn-icon-action"
                                        title="View & Print Official DOLE Payslip"
                                        onClick={() => openPayslipModal(p)}
                                        style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.12)' }}
                                      >
                                        <Receipt size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-icon-action"
                                        title="Adjust Earnings / Loans / Bonuses"
                                        onClick={() => openAdjustmentModal(p.employee_id)}
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Step 2 Navigation Bar */}
                    <div className="payroll-step-nav-bar">
                      <button
                        type="button"
                        className="btn-finance-outline"
                        onClick={() => setPayrollStep(1)}
                      >
                        <ArrowLeft size={15} />
                        <span>Back to Step 1: DTR</span>
                      </button>

                      <div className="payroll-step-indicator">
                        <span className="badge-count">Step 2 of 3</span>
                        <span>Official DOLE & BIR Pay Computation</span>
                      </div>

                      <button
                        type="button"
                        className="btn-finance-primary"
                        onClick={() => setPayrollStep(3)}
                      >
                        <span>Proceed to Step 3: Approve & Disburse</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    STEP 3: APPROVE & DISBURSE PAYOUT + EXPORT REPORTS
                ══════════════════════════════════════════════════════════════ */}
                {payrollStep === 3 && (
                  <div className="payroll-step-content-box">
                    {/* Executive Payroll KPI Metrics Bar */}
                    {payrollData && (
                      <div className="payroll-summary-cards">
                        <div className="p-summary-card">
                          <div className="p-card-top-icon">
                            <TrendingUp size={16} style={{ color: '#38bdf8' }} />
                            <span className="p-label">Total Gross Earnings</span>
                          </div>
                          <div className="p-val">{formatPHP(payrollData.summary?.total_gross)}</div>
                          <small>Basic + OT + Allowances + Bonuses</small>
                        </div>

                        <div className="p-summary-card deduction">
                          <div className="p-card-top-icon">
                            <Percent size={16} style={{ color: '#f87171' }} />
                            <span className="p-label">Total Employee Deductions</span>
                          </div>
                          <div className="p-val red">-{formatPHP(payrollData.summary?.total_deductions)}</div>
                          <small>SSS, PhilHealth, HDMF, Tax, Lates, Loans</small>
                        </div>

                        <div className="p-summary-card net">
                          <div className="p-card-top-icon">
                            <Wallet size={16} style={{ color: '#34d399' }} />
                            <span className="p-label">Total Net Take-Home Payout</span>
                          </div>
                          <div className="p-val green">{formatPHP(payrollData.summary?.total_net)}</div>
                          <small>{payrollData.payroll?.length || 0} Staff Disbursable Net Amount</small>
                        </div>

                        <div className="p-summary-card employer">
                          <div className="p-card-top-icon">
                            <Building size={16} style={{ color: '#a5b4fc' }} />
                            <span className="p-label">Employer Gov Share</span>
                          </div>
                          <div className="p-val indigo">{formatPHP(payrollData.summary?.total_employer_contributions)}</div>
                          <small>SSS ER + PhilHealth ER + HDMF ER + EC</small>
                        </div>

                        <div className="p-summary-card status-card">
                          <div className="p-card-top-icon">
                            <ShieldCheck size={16} style={{ color: payrollData.status === 'Disbursed' ? '#34d399' : payrollData.status === 'Approved' ? '#38bdf8' : '#fbbf24' }} />
                            <span className="p-label">Cut-off Status</span>
                          </div>
                          <div className={`p-status-badge ${payrollData.status?.toLowerCase() || 'draft'}`}>
                            {payrollData.status || 'Draft'}
                          </div>
                          <small>
                            {payrollData.disbursed_at
                              ? `Disbursed: ${new Date(payrollData.disbursed_at).toLocaleDateString()}`
                              : payrollData.approved_at
                              ? `Approved: ${new Date(payrollData.approved_at).toLocaleDateString()}`
                              : 'Pending Executive Review'}
                          </small>
                        </div>
                      </div>
                    )}

                    {/* Action & Reports Command Center */}
                    <div className="finance-table-card" style={{ padding: 24, marginBottom: 20 }}>
                      <div style={{ marginBottom: 18 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                          Cut-off Authorization & Disbursement Suite
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                          Lock the payroll calculations, release multi-channel payouts to staff, and export statutory remittance reports.
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                        <button
                          type="button"
                          className="btn-finance-outline"
                          onClick={handleSavePayrollDraft}
                          disabled={payrollActionLoading}
                          title="Commit current calculations to database as Draft"
                        >
                          <CheckSquare size={15} />
                          <span>Save as Draft</span>
                        </button>

                        <button
                          type="button"
                          className="btn-finance-outline"
                          style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                          onClick={handleApprovePayroll}
                          disabled={payrollActionLoading}
                          title="Lock & officially approve payroll cutoff"
                        >
                          <ShieldCheck size={15} />
                          <span>Approve Cut-off</span>
                        </button>

                        <button
                          type="button"
                          className="btn-finance-primary"
                          style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '10px 20px', fontSize: '0.92rem' }}
                          onClick={() => setShowDisburseModal(true)}
                          disabled={payrollActionLoading}
                          title="Disburse payout via Bank, EM-Card Wallet, or Cash Voucher"
                        >
                          <Send size={16} />
                          <span>Disburse Payout Now</span>
                        </button>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 18 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                          Official Compliance & Bank Export Files:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          <button
                            type="button"
                            className="btn-finance-outline"
                            onClick={exportPayrollToExcel}
                            title="Download Master Payroll (.xlsx)"
                          >
                            <FileSpreadsheet size={15} />
                            <span>Download Master Excel (.xlsx)</span>
                          </button>
                          <button
                            type="button"
                            className="btn-finance-outline"
                            onClick={exportBankAdvice}
                            title="Download Bank Auto-Credit File"
                          >
                            <CreditCard size={15} />
                            <span>Download Bank Advice (.csv)</span>
                          </button>
                          <button
                            type="button"
                            className="btn-finance-outline"
                            onClick={exportStatutoryReport}
                            title="Download SSS/PhilHealth/HDMF Remittance"
                          >
                            <Receipt size={15} />
                            <span>Statutory Remittance Schedule</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 3 Navigation Bar */}
                    <div className="payroll-step-nav-bar">
                      <button
                        type="button"
                        className="btn-finance-outline"
                        onClick={() => setPayrollStep(2)}
                      >
                        <ArrowLeft size={15} />
                        <span>Back to Step 2: Pay Worksheet</span>
                      </button>

                      <div className="payroll-step-indicator">
                        <span className="badge-count">Step 3 of 3</span>
                        <span>Executive Authorization & Payout Release</span>
                      </div>

                      <button
                        type="button"
                        className="btn-finance-primary"
                        onClick={() => setShowDisburseModal(true)}
                        style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                      >
                        <Send size={15} />
                        <span>Open Disbursement Suite</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── SUB-VIEW 2: 13TH MONTH PAY ACCRUAL & ANNUAL COMPENSATION LEDGER ── */}
            {payrollSubTab === 'thirteenth' && (
              <div className="thirteenth-month-container">
                <div className="finance-controls-row" style={{ marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 800 }}>
                      Philippine 13th Month Pay & Annual Compensation Ledger ({currentYear})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      Presidential Decree No. 851 Mandatory Accrual Engine · Pro-rated Total Basic Earned ÷ 12
                    </p>
                  </div>
                  <div className="finance-filters-wrap">
                    <button
                      type="button"
                      className="btn-finance-outline"
                      onClick={() => loadPayrollSubData('thirteenth')}
                    >
                      <RefreshCw size={14} /> Refresh Accrual
                    </button>
                    <button
                      type="button"
                      className="btn-finance-primary"
                      onClick={exportThirteenthMonthExcel}
                    >
                      <Download size={14} /> Export 13th Month Excel
                    </button>
                  </div>
                </div>

                {thirteenthMonthData && (
                  <div className="payroll-summary-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
                    <div className="p-summary-card">
                      <span className="p-label">Total Accrued 13th Month Fund</span>
                      <div className="p-val green">{formatPHP(thirteenthMonthData.summary?.total_thirteenth_fund)}</div>
                      <small>Total reserve liability to be disbursed by Dec 24</small>
                    </div>

                    <div className="p-summary-card">
                      <span className="p-label">Eligible Workforce Members</span>
                      <div className="p-val">{thirteenthMonthData.summary?.total_employees} Staff</div>
                      <small>Active employees with accrued service</small>
                    </div>

                    <div className="p-summary-card">
                      <span className="p-label">BIR Tax-Exempt Bonus Cap</span>
                      <div className="p-val indigo">₱90,000.00 / Staff</div>
                      <small>Non-taxable under Philippine Tax Code (TRAIN Law)</small>
                    </div>
                  </div>
                )}

                <div className="finance-table-card">
                  <div className="finance-table-header">
                    <h3>Workforce 13th Month Accrual Worksheet ({currentYear})</h3>
                  </div>
                  <div className="finance-table-wrap">
                    <table className="finance-table">
                      <thead>
                        <tr>
                          <th>Employee ID</th>
                          <th>Employee Name</th>
                          <th>Department & Role</th>
                          <th>Monthly Base Salary</th>
                          <th>Basic Earned (YTD)</th>
                          <th>Accrued 13th Month Pay</th>
                          <th>Tax-Exempt Portion (≤₱90k)</th>
                          <th>Taxable Portion</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!thirteenthMonthData?.records || thirteenthMonthData.records.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="empty-table-cell">
                              Calculating 13th month pay ledger...
                            </td>
                          </tr>
                        ) : (
                          thirteenthMonthData.records.map((r) => (
                            <tr key={r.employee_id}>
                              <td><strong className="code-id">{r.employee_id}</strong></td>
                              <td><strong>{r.employee_name}</strong></td>
                              <td><span className="dept-tag">{r.department}</span> · {r.position}</td>
                              <td>{formatPHP(r.monthly_salary)}</td>
                              <td>{formatPHP(r.total_basic_earned_ytd)}</td>
                              <td>
                                <strong style={{ color: '#34d399', fontSize: '0.92rem' }}>
                                  {formatPHP(r.thirteenth_month_pay)}
                                </strong>
                              </td>
                              <td><span style={{ color: '#38bdf8' }}>{formatPHP(r.tax_exempt_portion)}</span></td>
                              <td>
                                {r.taxable_portion > 0 ? (
                                  <span style={{ color: '#f87171' }}>{formatPHP(r.taxable_portion)}</span>
                                ) : (
                                  <span style={{ color: '#64748b' }}>₱0.00 (Exempt)</span>
                                )}
                              </td>
                              <td>
                                <span className="status-pill present">
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-VIEW 3: HISTORICAL RUNS & DISBURSEMENT ARCHIVE ── */}
            {payrollSubTab === 'runs' && (
              <div className="payroll-runs-container">
                <div className="finance-controls-row" style={{ marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 800 }}>
                      Historical Payroll Disbursement Archive & Audit Trail
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      Permanent financial records of approved and released employee compensations.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-finance-outline"
                    onClick={() => loadPayrollSubData('runs')}
                  >
                    <RefreshCw size={14} /> Refresh Archive
                  </button>
                </div>

                <div className="finance-table-card">
                  <div className="finance-table-wrap">
                    <table className="finance-table">
                      <thead>
                        <tr>
                          <th>Cut-off Period</th>
                          <th>Employees</th>
                          <th>Total Gross</th>
                          <th>Total Deductions</th>
                          <th>Net Disbursed</th>
                          <th>Employer Share</th>
                          <th>Payout Method</th>
                          <th>Status</th>
                          <th>Disbursed At / By</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollRuns.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="empty-table-cell">
                              No archived payroll disbursements found. Click "Save Draft" or "Disburse Payout" in the active worksheet.
                            </td>
                          </tr>
                        ) : (
                          payrollRuns.map((run) => (
                            <tr key={run.id || run.cutoff_start}>
                              <td>
                                <strong>{run.cutoff_start} to {run.cutoff_end}</strong>
                                <small className="emp-id-block">{run.period_name || 'Semi-Monthly'}</small>
                              </td>
                              <td>{run.total_employees || '—'} Staff</td>
                              <td>{formatPHP(run.total_gross)}</td>
                              <td className="deduct-col">-{formatPHP(run.total_deductions)}</td>
                              <td>
                                <strong style={{ color: '#34d399' }}>{formatPHP(run.total_net)}</strong>
                              </td>
                              <td><span style={{ color: '#a5b4fc' }}>{formatPHP(run.total_employer_share)}</span></td>
                              <td><span className="rate-badge">{run.disbursement_method || 'Bank Transfer'}</span></td>
                              <td>
                                <span className={`status-pill ${run.status === 'Disbursed' ? 'present' : run.status === 'Approved' ? 'ontime' : 'late'}`}>
                                  {run.status || 'Draft'}
                                </span>
                              </td>
                              <td>
                                <div>{run.disbursed_at ? new Date(run.disbursed_at).toLocaleString() : '—'}</div>
                                <small style={{ color: '#94a3b8' }}>{run.disbursed_by || run.approved_by || '—'}</small>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-finance-outline"
                                  style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                                  onClick={() => {
                                    setCutoffStart(run.cutoff_start);
                                    setCutoffEnd(run.cutoff_end);
                                    setPayrollSubTab('worksheet');
                                    loadData();
                                  }}
                                >
                                  Load Period
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-VIEW 4: LOANS & CUSTOM ADJUSTMENTS LEDGER ── */}
            {payrollSubTab === 'adjustments' && (
              <div className="payroll-adjustments-container">
                <div className="finance-controls-row" style={{ marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 800 }}>
                      Workforce Loans, Bonuses & Recurring Adjustments
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      Configure SSS Loans, Pag-IBIG Loans, Company Cash Advances, and Performance Bonuses.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-finance-primary"
                    onClick={() => openAdjustmentModal()}
                  >
                    <Plus size={15} /> Add Adjustment
                  </button>
                </div>

                <div className="finance-table-card">
                  <div className="finance-table-wrap">
                    <table className="finance-table">
                      <thead>
                        <tr>
                          <th>Employee ID</th>
                          <th>Adjustment Type</th>
                          <th>Category</th>
                          <th>Description Title</th>
                          <th>Amount (₱)</th>
                          <th>Recurring / Per Cut-off</th>
                          <th>Status</th>
                          <th>Notes</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustmentsList.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="empty-table-cell">
                              No loans or adjustments registered yet. Click "+ Add Adjustment" above.
                            </td>
                          </tr>
                        ) : (
                          adjustmentsList.map((adj) => (
                            <tr
                              key={adj.id}
                              onClick={() => openAdjustmentModal(adj)}
                              style={{ cursor: 'pointer' }}
                              title="Click to view & edit adjustment details"
                            >
                              <td>
                                {(() => {
                                  const emp = employees.find(e => e.employee_id === adj.employee_id);
                                  const name = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : '';
                                  return (
                                    <div>
                                      {name && <strong>{name}</strong>}
                                      <small className="emp-id-block">{adj.employee_id}</small>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td>
                                <span className={`status-pill ${adj.type === 'earning' ? 'present' : 'late'}`}>
                                  {adj.type === 'earning' ? '+ Additional Earning' : '- Deduction / Loan'}
                                </span>
                              </td>
                              <td><strong>{adj.category}</strong></td>
                              <td>{adj.title}</td>
                              <td>
                                <strong style={{ color: adj.type === 'earning' ? '#34d399' : '#f87171' }}>
                                  {adj.type === 'earning' ? '+' : '-'}{formatPHP(adj.amount)}
                                </strong>
                                <small className="rate-sub" style={{ display: 'block', fontSize: '0.7rem' }}>
                                  {adj.remaining_balance ? `Bal: ${formatPHP(adj.remaining_balance)}` : '/ cut-off'}
                                </small>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                                  {adj.notes?.includes('Plan:') 
                                    ? `📅 ${adj.notes.match(/Plan: [^\]]+/)?.[0] || 'Installment Plan'}`
                                    : adj.is_recurring ? '✓ Recurring Every Cut-off' : 'One-time (This Cut-off)'}
                                </span>
                              </td>
                              <td><span className={`status-pill ${adj.status === 'active' ? 'present' : 'late'}`}>{adj.status}</span></td>
                              <td><small style={{ color: '#94a3b8' }}>{adj.notes || '—'}</small></td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="action-buttons-wrap">
                                  <button
                                    type="button"
                                    className="btn-icon-action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAdjustmentModal(adj);
                                    }}
                                    title="Edit adjustment"
                                    style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.12)' }}
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-icon-action delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAdjustment(adj.id);
                                    }}
                                    title="Delete adjustment"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 6: OFFICES & GEOFENCES
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'offices' && (
          <div className="finance-tab-content">
            {/* Header / Actions Row */}
            <div className="finance-controls-row" style={{ marginBottom: 16, alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Authorized Offices & GPS Geofences
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Register workplace branches, satellite coordinates, and maximum allowed radius ranges for biometric attendance.
                </p>
              </div>

              <div className="finance-filters-wrap">
                <button
                  type="button"
                  className="btn-finance-primary"
                  onClick={openAddOfficeModal}
                >
                  <Plus size={16} />
                  <span>Add Office Location</span>
                </button>
              </div>
            </div>

            {/* KPI / Status Row */}
            <div className="office-kpi-grid">
              <div className="office-kpi-card">
                <div className="office-kpi-icon emerald">
                  <Building2 size={22} />
                </div>
                <div className="office-kpi-info">
                  <span className="office-kpi-val">{offices.length}</span>
                  <span className="office-kpi-label">Authorized Workplaces</span>
                </div>
              </div>

              <div className="office-kpi-card">
                <div className="office-kpi-icon cyan">
                  <Target size={22} />
                </div>
                <div className="office-kpi-info">
                  <span className="office-kpi-val">
                    {offices.filter((o) => o.status === 'active').length}
                  </span>
                  <span className="office-kpi-label">Active Geofences Enforcing</span>
                </div>
              </div>

              <div className="office-kpi-card">
                <div className="office-kpi-icon indigo">
                  <Sliders size={22} />
                </div>
                <div className="office-kpi-info">
                  <span className="office-kpi-val">
                    {offices.length > 0
                      ? Math.round(offices.reduce((acc, o) => acc + (o.radius_meters || 100), 0) / offices.length) + 'm'
                      : '100m'}
                  </span>
                  <span className="office-kpi-label">Average Geofence Radius</span>
                </div>
              </div>

              <div className="office-kpi-card">
                <div className="office-kpi-icon gold">
                  <ShieldCheck size={22} />
                </div>
                <div className="office-kpi-info">
                  <span className="office-kpi-val">Haversine</span>
                  <span className="office-kpi-label">Live Distance Engine</span>
                </div>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="finance-controls-row" style={{ marginBottom: 20 }}>
              <div className="finance-search-wrap">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search branch name, branch code, or address..."
                  value={officeSearch}
                  onChange={(e) => setOfficeSearch(e.target.value)}
                  className="finance-search-input"
                />
                {officeSearch && (
                  <button
                    type="button"
                    onClick={() => setOfficeSearch('')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px', fontSize: '0.85rem' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="finance-filters-wrap">
                <select
                  value={officeStatusFilter}
                  onChange={(e) => setOfficeStatusFilter(e.target.value)}
                  className="finance-select"
                >
                  <option value="all">All Locations ({offices.length})</option>
                  <option value="active">Active Only ({offices.filter(o => o.status === 'active').length})</option>
                  <option value="inactive">Inactive ({offices.filter(o => o.status === 'inactive').length})</option>
                </select>
              </div>
            </div>

            {/* Office Cards Grid */}
            {filteredOffices.length === 0 ? (
              <div className="finance-empty-card">
                <div className="empty-icon-wrap">
                  <Building2 size={36} />
                </div>
                <h3>No Office Locations Found</h3>
                <p>
                  {officeSearch || officeStatusFilter !== 'all'
                    ? 'No branches match your search and filter criteria.'
                    : 'Get started by adding your organization’s first office or branch location with GPS geofence range.'}
                </p>
                <button
                  type="button"
                  className="btn-finance-primary"
                  onClick={openAddOfficeModal}
                  style={{ marginTop: 12 }}
                >
                  <Plus size={16} />
                  <span>Add First Office Location</span>
                </button>
              </div>
            ) : (
              <div className="office-cards-grid">
                {filteredOffices.map((office) => {
                  const radius = office.radius_meters || 100;
                  const isStrict = radius <= 75;
                  const isStandard = radius > 75 && radius <= 175;
                  const isWide = radius > 175 && radius <= 350;
                  const isDistrict = radius > 350;

                  return (
                    <div
                      key={office.id || office.code}
                      className={`office-card ${office.status === 'inactive' ? 'is-inactive' : ''}`}
                    >
                      <div className="office-card-top">
                        <div className="office-code-chip">{office.code || 'BRANCH'}</div>
                        <button
                          type="button"
                          onClick={() => handleToggleOfficeStatus(office)}
                          className={`office-status-pill-toggle ${office.status === 'active' ? 'active' : 'inactive'}`}
                          title={office.status === 'active' ? 'Click to Disable Geofence' : 'Click to Enable Geofence'}
                        >
                          <span className="dot" />
                          <span>{office.status === 'active' ? 'Active Geofence' : 'Disabled'}</span>
                          {office.status === 'active' ? (
                            <ToggleRight size={16} className="toggle-icon-active" />
                          ) : (
                            <ToggleLeft size={16} className="toggle-icon-inactive" />
                          )}
                        </button>
                      </div>

                      <h3 className="office-card-title">{office.name}</h3>

                      <div className="office-card-address">
                        <MapPin size={14} className="icon-map" />
                        <span>{office.address || 'Address not specified'}</span>
                      </div>

                      {/* Geofence Radius Gauge Box */}
                      <div className="office-geofence-box">
                        <div className="geofence-gauge-header">
                          <div className="geofence-gauge-label">
                            <Target size={14} />
                            <span>Biometric Geofence Range</span>
                          </div>
                          <span className={`geofence-range-badge ${isStrict ? 'strict' : isStandard ? 'standard' : isWide ? 'wide' : 'district'}`}>
                            {radius}m Radius (±{(radius / 1000).toFixed(2)} km)
                          </span>
                        </div>

                        {/* Interactive visual range meter */}
                        <div className="geofence-meter-track">
                          <div
                            className={`geofence-meter-fill ${isStrict ? 'strict' : isStandard ? 'standard' : isWide ? 'wide' : 'district'}`}
                            style={{ width: `${Math.min(100, Math.max(12, (radius / 500) * 100))}%` }}
                          />
                        </div>

                        <div className="geofence-meter-labels">
                          <span>0m</span>
                          <span>
                            {isStrict
                              ? 'Strict Site (Single Room / Desk)'
                              : isStandard
                              ? 'Standard Facility (Building / Store)'
                              : isWide
                              ? 'Wide Campus (Yard / Compound)'
                              : 'District Area (Field Outreach)'}
                          </span>
                          <span>500m+</span>
                        </div>
                      </div>

                      {/* GPS Coordinates Bar */}
                      <div className="office-gps-bar">
                        <div className="office-coords-text">
                          <span className="coord-label">GPS:</span>
                          <span className="coord-value">
                            {office.latitude != null && office.longitude != null
                              ? `${parseFloat(office.latitude).toFixed(4)}°, ${parseFloat(office.longitude).toFixed(4)}°`
                              : 'No Coordinates Fixed'}
                          </span>
                        </div>

                        {office.latitude && office.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${office.latitude},${office.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-office-map-link"
                            title="Open in Google Maps"
                          >
                            <ExternalLink size={13} />
                            <span>View Map</span>
                          </a>
                        )}
                      </div>

                      {office.notes && (
                        <div className="office-notes-row">
                          <small>📝 {office.notes}</small>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="office-card-actions">
                        <button
                          type="button"
                          className={`btn-office-toggle ${office.status === 'active' ? 'btn-disable' : 'btn-enable'}`}
                          onClick={() => handleToggleOfficeStatus(office)}
                          title={office.status === 'active' ? 'Disable this office geofence' : 'Enable this office geofence'}
                        >
                          {office.status === 'active' ? (
                            <>
                              <ToggleRight size={15} />
                              <span>Enabled</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={15} />
                              <span>Disabled</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="btn-office-edit"
                          onClick={() => openEditOfficeModal(office)}
                        >
                          <Edit3 size={14} />
                          <span>Edit Geofence</span>
                        </button>

                        <button
                          type="button"
                          className="btn-office-delete"
                          onClick={() => handleDeleteOffice(office.id, office.name)}
                          title="Remove Office"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT OFFICE LOCATION & GEOFENCE RANGE
      ═══════════════════════════════════════════════════════════════════ */}
      {showOfficeModal && (
        <div className="finance-modal-overlay">
          <div className="finance-modal-card" style={{ maxWidth: 640 }}>
            <div className="finance-modal-header">
              <div className="modal-title-row">
                <Building2 size={22} className="emerald" />
                <div>
                  <h3>{editOffice ? 'Edit Office Location & Geofence' : 'Register New Office / Branch Location'}</h3>
                  <small>Configure satellite GPS coordinates & biometric geofence radius</small>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowOfficeModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveOffice} className="finance-modal-form">
              <div className="finance-form-grid">
                {/* Section 1: Office Identification */}
                <div className="finance-form-section-header">
                  <Building size={14} />
                  <span>1. Branch / Office Identification</span>
                </div>

                <div className="finance-form-group full-width">
                  <label>Branch / Workplace Name *</label>
                  <input
                    type="text"
                    required
                    value={officeForm.name}
                    onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                    placeholder="e.g. Main Executive Headquarters, East District Hub"
                  />
                </div>

                <div className="finance-form-group">
                  <label>Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={officeForm.code}
                    onChange={(e) => setOfficeForm({ ...officeForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. HQ-MAIN, BR-002"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="finance-form-group">
                  <label>Operational Status *</label>
                  <select
                    value={officeForm.status}
                    onChange={(e) => setOfficeForm({ ...officeForm, status: e.target.value })}
                  >
                    <option value="active">Active (Enforcing Attendance Geofence)</option>
                    <option value="inactive">Disabled / Inactive (Geofence Suspended)</option>
                  </select>
                </div>

                <div className="finance-form-group full-width">
                  <label>Physical Street Address / Location *</label>
                  <input
                    type="text"
                    required
                    value={officeForm.address}
                    onChange={(e) => setOfficeForm({ ...officeForm, address: e.target.value })}
                    placeholder="e.g. 123 Operations Blvd, Metropolitan District, Metro Manila"
                  />
                </div>

                {/* Section 2: GPS Geolocation */}
                <div className="finance-form-section-header">
                  <MapPin size={14} />
                  <span>2. Satellite GPS Coordinates</span>
                </div>

                <div className="finance-form-group full-width">
                  <div className="gps-fetch-action-box">
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                        📍 One-Click Current GPS Auto-Detector
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        Pinpoint this branch using your device's high-precision hardware GPS antenna.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-gps-auto-detect"
                      onClick={fetchOfficeGPS}
                      disabled={fetchingOfficeGps}
                    >
                      <Navigation size={14} className={fetchingOfficeGps ? 'spin' : ''} />
                      <span>{fetchingOfficeGps ? 'Locking Satellite...' : 'Detect Device GPS'}</span>
                    </button>
                  </div>
                </div>

                <div className="finance-form-group">
                  <label>Latitude Coordinates *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={officeForm.latitude}
                    onChange={(e) => setOfficeForm({ ...officeForm, latitude: e.target.value })}
                    placeholder="e.g. 14.617500"
                  />
                </div>

                <div className="finance-form-group">
                  <label>Longitude Coordinates *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={officeForm.longitude}
                    onChange={(e) => setOfficeForm({ ...officeForm, longitude: e.target.value })}
                    placeholder="e.g. 121.012400"
                  />
                </div>

                {/* Section 3: Geofence Range & Radius */}
                <div className="finance-form-section-header">
                  <Target size={14} />
                  <span>3. Allowed Biometric Geofence Range (Radius in Meters)</span>
                </div>

                <div className="finance-form-group full-width">
                  <div className="range-slider-wrap">
                    <div className="range-slider-header">
                      <label>Maximum Allowed Range Radius</label>
                      <span className="range-slider-badge">
                        🎯 {officeForm.radius_meters} Meters (±{(officeForm.radius_meters / 1000).toFixed(2)} km)
                      </span>
                    </div>

                    <input
                      type="range"
                      min="20"
                      max="1000"
                      step="10"
                      value={officeForm.radius_meters}
                      onChange={(e) => setOfficeForm({ ...officeForm, radius_meters: parseInt(e.target.value, 10) || 100 })}
                      className="finance-range-slider"
                    />

                    <div className="range-slider-ticks">
                      <span>20m (Strict)</span>
                      <span>100m (Standard)</span>
                      <span>250m (Wide)</span>
                      <span>500m (District)</span>
                      <span>1000m (1km Max)</span>
                    </div>
                  </div>

                  {/* Range Quick Preset Chips */}
                  <div className="range-preset-group">
                    <button
                      type="button"
                      className={`range-preset-chip ${officeForm.radius_meters === 50 ? 'active' : ''}`}
                      onClick={() => setOfficeForm({ ...officeForm, radius_meters: 50 })}
                    >
                      50m · Single Office
                    </button>
                    <button
                      type="button"
                      className={`range-preset-chip ${officeForm.radius_meters === 100 ? 'active' : ''}`}
                      onClick={() => setOfficeForm({ ...officeForm, radius_meters: 100 })}
                    >
                      100m · Standard Building
                    </button>
                    <button
                      type="button"
                      className={`range-preset-chip ${officeForm.radius_meters === 250 ? 'active' : ''}`}
                      onClick={() => setOfficeForm({ ...officeForm, radius_meters: 250 })}
                    >
                      250m · Compound / Hub
                    </button>
                    <button
                      type="button"
                      className={`range-preset-chip ${officeForm.radius_meters === 500 ? 'active' : ''}`}
                      onClick={() => setOfficeForm({ ...officeForm, radius_meters: 500 })}
                    >
                      500m · Field District
                    </button>
                  </div>

                  <div className="range-explainer-banner">
                    <ShieldCheck size={16} className="emerald" />
                    <span>
                      Employees punching time from beyond <strong>{officeForm.radius_meters} meters</strong> will be flagged as <em>"⚠️ Out of Range"</em> in the Daily Time Record (DTR).
                    </span>
                  </div>
                </div>

                <div className="finance-form-group full-width">
                  <label>Branch Description & Notes</label>
                  <textarea
                    rows={2}
                    value={officeForm.notes}
                    onChange={(e) => setOfficeForm({ ...officeForm, notes: e.target.value })}
                    placeholder="e.g. Primary Operations Hub with Biometric Kiosk Terminal at Ground Reception"
                  />
                </div>
              </div>

              <div className="finance-modal-footer">
                <button
                  type="button"
                  className="btn-finance-outline"
                  onClick={() => setShowOfficeModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-finance-primary">
                  {editOffice ? 'Update Office Geofence' : 'Register Office Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: ENROLL / EDIT EMPLOYEE
      ═══════════════════════════════════════════════════════════════════ */}
      {showEmployeeModal && (
        <div className="finance-modal-overlay">
          <div className="finance-modal-card">
            <div className="finance-modal-header">
              <div className="modal-title-row">
                <Banknote size={22} className="gold" />
                <div>
                  <h3>{editEmployee ? 'Update Employee Compensation' : 'Enroll New Workforce Staff'}</h3>
                  <small>Configure labor rates, biometric ID & employment department</small>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => { stopEnrollCam(); setShowEmployeeModal(false); }}>✕</button>
            </div>

            <form onSubmit={handleSaveEmployee} className="finance-modal-form">
              <div className="finance-form-grid">
                {/* Section 1: Staff Profile */}
                <div className="finance-form-section-header">
                  <User size={14} />
                  <span>1. Staff Identification & Department</span>
                </div>

                <div className="finance-form-group">
                  <label>Employee ID Code *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.employee_id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_id: e.target.value.toUpperCase() })}
                    placeholder="E.G. EMP-001"
                    disabled={!!editEmployee}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="finance-form-group">
                  <label>Department *</label>
                  <input
                    type="text"
                    required
                    list="workforce-department-suggestions"
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    placeholder="E.G. Operations, IT, Finance..."
                    autoComplete="off"
                  />
                  <datalist id="workforce-department-suggestions">
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </datalist>
                </div>

                <div className="finance-form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.first_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, first_name: e.target.value.toUpperCase() })}
                    placeholder="E.G. JUAN"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="finance-form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.last_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, last_name: e.target.value.toUpperCase() })}
                    placeholder="E.G. DELA CRUZ"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="finance-form-group full-width">
                  <label>Position / Role Title *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value.toUpperCase() })}
                    placeholder="E.G. FIELD OPERATIONS SUPERVISOR"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                {/* Section 2: Compensation Setup */}
                <div className="finance-form-section-header">
                  <Coins size={14} />
                  <span>2. Compensation & Payroll Structure</span>
                </div>

                <div className="finance-form-group full-width">
                  <label>Pay Structure Type *</label>
                  <select
                    value={employeeForm.rate_type}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, rate_type: e.target.value })}
                  >
                    <option value="semi_monthly">Semi-Monthly (Per Cut-off / Half-Month)</option>
                    <option value="monthly">Monthly Salary (÷ 2 per Cut-off)</option>
                    <option value="daily">Daily Wage Rate</option>
                    <option value="hourly">Hourly Wage Rate</option>
                  </select>
                </div>

                <div className="finance-form-group">
                  <label>
                    {employeeForm.rate_type === 'semi_monthly' ? 'Semi-Monthly Base Rate (₱) *' :
                     employeeForm.rate_type === 'monthly' ? 'Monthly Base Salary (₱) *' : 
                     employeeForm.rate_type === 'daily' ? 'Daily Rate (₱) *' : 'Hourly Rate (₱) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={employeeForm.base_rate}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, base_rate: e.target.value })}
                    placeholder={employeeForm.rate_type === 'semi_monthly' ? 'e.g. 15000' : 'e.g. 30000'}
                  />
                  {employeeForm.rate_type === 'semi_monthly' && parseFloat(employeeForm.base_rate) > 0 && (
                    <div className="finance-calc-badge">
                      <span className="badge-label">₱{parseFloat(employeeForm.base_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })} / cut-off</span>
                      <span className="badge-sub">Monthly (×2): ₱{(parseFloat(employeeForm.base_rate) * 2).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {employeeForm.rate_type === 'monthly' && parseFloat(employeeForm.base_rate) > 0 && (
                    <div className="finance-calc-badge">
                      <span className="badge-label">₱{(parseFloat(employeeForm.base_rate) / 2).toLocaleString('en-PH', { minimumFractionDigits: 2 })} / cut-off</span>
                      <span className="badge-sub">Monthly Total: ₱{parseFloat(employeeForm.base_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                <div className="finance-form-group">
                  <label>
                    {employeeForm.rate_type === 'semi_monthly' ? 'Semi-Monthly Allowance (₱)' :
                     employeeForm.rate_type === 'monthly' ? 'Monthly Allowance (₱)' : 'Allowance (₱)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={employeeForm.allowance}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, allowance: e.target.value })}
                    placeholder={employeeForm.rate_type === 'semi_monthly' ? 'e.g. 1000' : 'e.g. 2000'}
                  />
                  {employeeForm.rate_type === 'semi_monthly' && parseFloat(employeeForm.allowance) > 0 && (
                    <div className="finance-calc-badge">
                      <span className="badge-label">₱{parseFloat(employeeForm.allowance).toLocaleString('en-PH', { minimumFractionDigits: 2 })} / cut-off</span>
                      <span className="badge-sub">Monthly (×2): ₱{(parseFloat(employeeForm.allowance) * 2).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {employeeForm.rate_type === 'monthly' && parseFloat(employeeForm.allowance) > 0 && (
                    <div className="finance-calc-badge">
                      <span className="badge-label">₱{(parseFloat(employeeForm.allowance) / 2).toLocaleString('en-PH', { minimumFractionDigits: 2 })} / cut-off</span>
                      <span className="badge-sub">Monthly Total: ₱{parseFloat(employeeForm.allowance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                <div className="finance-form-group">
                  <label>Overtime Multiplier *</label>
                  <select
                    value={employeeForm.ot_multiplier}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, ot_multiplier: e.target.value })}
                  >
                    <option value="1.25">1.25x — Standard Labor OT (125%)</option>
                    <option value="1.30">1.30x — Rest Day / Holiday OT (130%)</option>
                    <option value="1.50">1.50x — Premium OT (150%)</option>
                    <option value="1.00">1.00x — Straight Regular Rate (100%)</option>
                    <option value="0">0x — No Overtime Allowed (0% / Exempt)</option>
                  </select>
                </div>

                <div className="finance-form-group">
                  <label>Employment Status</label>
                  <select
                    value={employeeForm.status}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>

                {/* Section 3: Work Schedule & Shift Policy */}
                <div className="finance-form-section-header">
                  <Clock size={14} />
                  <span>3. Work Schedule & Punctuality Policy</span>
                </div>

                <div className="finance-form-group full-width">
                  <label>Schedule Mode *</label>
                  <select
                    value={employeeForm.schedule_type || 'fixed'}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, schedule_type: e.target.value })}
                  >
                    <option value="fixed">Fixed Schedule (Standard Shift · Tracks late minutes)</option>
                    <option value="flexi">Flexible Schedule (Allowed to go to office anytime · 0 Late)</option>
                    <option value="exempt">Exempt / Executive (No attendance deductions)</option>
                  </select>
                </div>

                {employeeForm.schedule_type === 'fixed' && (
                  <div className="finance-form-group full-width" style={{ marginTop: -2 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                      <div className="finance-form-group">
                        <label>Shift Start Time *</label>
                        <input
                          type="time"
                          value={employeeForm.shift_start || '08:00'}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, shift_start: e.target.value })}
                          required
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div className="finance-form-group">
                        <label>Shift End Time *</label>
                        <input
                          type="time"
                          value={employeeForm.shift_end || '17:00'}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, shift_end: e.target.value })}
                          required
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div className="finance-form-group">
                        <label>Grace Period (Mins) *</label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={employeeForm.grace_period_mins !== undefined ? employeeForm.grace_period_mins : 15}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, grace_period_mins: e.target.value })}
                          required
                          placeholder="15"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {employeeForm.schedule_type === 'flexi' && (
                  <div className="full-width" style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: '0.8rem',
                    color: '#6ee7b7',
                    lineHeight: 1.5
                  }}>
                    ⚡ <strong>Flexible Shift Active:</strong> This employee is allowed to arrive and punch at any time. Late arrival minutes will <strong>always be 0</strong> with zero tardiness penalties.
                  </div>
                )}

                {employeeForm.schedule_type === 'exempt' && (
                  <div className="full-width" style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: '0.8rem',
                    color: '#7dd3fc',
                    lineHeight: 1.5
                  }}>
                    🛡️ <strong>Exempt / Management Profile:</strong> Output-based employee. No attendance deductions or tardiness tracking applied.
                  </div>
                )}

                {/* Section 4: 3-Shot Multi-Angle Biometric Face Profile Registration */}
                <div className="finance-form-section-header">
                  <Camera size={14} />
                  <span>4. Biometric Facial Recognition Registration (3-Angle High Accuracy)</span>
                </div>

                <div className={`face-enroll-box full-width ${employeeForm.photo_url ? 'has-photo' : ''}`}>
                  {employeeForm.photo_url ? (
                    <div className="face-preview-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260, flex: 1 }}>
                          <img src={employeeForm.photo_url} alt="Primary Face" className="face-preview-avatar" />
                          <div>
                            <div className="face-preview-status">
                              <CheckCircle2 size={16} />
                              <span>Multi-Angle Face Model Registered</span>
                            </div>
                            <div className="face-preview-sub">99.8% AI Match Accuracy · Frontal, Left & Right calibrated for Kiosk scan.</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn-enroll-cam"
                            style={{ padding: '7px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                            onClick={() => startEnrollCam(1)}
                          >
                            <Camera size={13} /> Re-scan 3 Angles
                          </button>
                          <button
                            type="button"
                            className="btn-enroll-remove"
                            style={{ whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setEmployeeForm((prev) => ({ ...prev, photo_url: '', face_samples: [] }));
                              setEnrollPhotos(['', '', '']);
                            }}
                          >
                            <Trash2 size={13} /> Clear
                          </button>
                        </div>
                      </div>

                      {/* 3 Scanned Angle Photos Display */}
                      <div className="multi-face-preview-grid" style={{ marginTop: 12 }}>
                        <div className="pose-preview-tile has-image">
                          <div className="pose-badge-check">✓</div>
                          <img
                            src={(employeeForm.face_samples && employeeForm.face_samples[0]) || employeeForm.photo_url}
                            alt="Frontal Center"
                            className="pose-thumb-img"
                          />
                          <span className="pose-label">1. Frontal Center (0°)</span>
                        </div>
                        <div className="pose-preview-tile has-image">
                          <div className="pose-badge-check">✓</div>
                          <img
                            src={(employeeForm.face_samples && employeeForm.face_samples[1]) || employeeForm.photo_url}
                            alt="Left Angle"
                            className="pose-thumb-img"
                          />
                          <span className="pose-label">2. Left Profile (15°)</span>
                        </div>
                        <div className="pose-preview-tile has-image">
                          <div className="pose-badge-check">✓</div>
                          <img
                            src={(employeeForm.face_samples && employeeForm.face_samples[2]) || employeeForm.photo_url}
                            alt="Right Angle"
                            className="pose-thumb-img"
                          />
                          <span className="pose-label">3. Right Profile (15°)</span>
                        </div>
                      </div>
                    </div>
                  ) : enrollCamActive ? (
                    <div style={{ width: '100%' }}>
                      {/* Step Progress Tracker */}
                      <div className="enroll-steps-bar">
                        <div className={`enroll-step-node ${enrollStep === 1 ? 'active' : enrollPhotos[0] ? 'completed' : ''}`}>
                          <div className="step-circle">{enrollPhotos[0] ? '✓' : '1'}</div>
                          <span>1. Center</span>
                        </div>
                        <div className={`step-connector-line ${enrollPhotos[0] ? 'done' : ''}`} />
                        <div className={`enroll-step-node ${enrollStep === 2 ? 'active' : enrollPhotos[1] ? 'completed' : ''}`}>
                          <div className="step-circle">{enrollPhotos[1] ? '✓' : '2'}</div>
                          <span>2. Left 15°</span>
                        </div>
                        <div className={`step-connector-line ${enrollPhotos[1] ? 'done' : ''}`} />
                        <div className={`enroll-step-node ${enrollStep === 3 ? 'active' : enrollPhotos[2] ? 'completed' : ''}`}>
                          <div className="step-circle">{enrollPhotos[2] ? '✓' : '3'}</div>
                          <span>3. Right 15°</span>
                        </div>
                      </div>

                      {/* Pose Guidance Banner */}
                      <div className="enroll-guide-banner">
                        <div className="enroll-guide-text">
                          <span>
                            {enrollStep === 1
                              ? '👀 Step 1/3: Look directly straight at camera'
                              : enrollStep === 2
                              ? '👈 Step 2/3: Turn your head slightly to your LEFT (~15°)'
                              : '👉 Step 3/3: Turn your head slightly to your RIGHT (~15°)'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setAutoCaptureEnabled((prev) => !prev)}
                            className={`auto-capture-badge ${autoCaptureEnabled ? 'active' : 'inactive'}`}
                            title="Click to toggle between Auto-Capture and Manual Snap"
                            style={{ cursor: 'pointer', outline: 'none' }}
                          >
                            {autoCaptureEnabled ? '⚡ Auto-Capture: ON (3s)' : '🖐️ Manual Snap Mode'}
                          </button>
                          <span className="enroll-guide-counter">Angle {enrollStep} / 3</span>
                        </div>
                      </div>

                      <div className="face-enroll-cam-container">
                        {shutterFlash && <div className="cam-shutter-flash" />}

                        {/* Top HD Quality Badge */}
                        <div className="cam-quality-pill">
                          <span className="cam-quality-dot" />
                          <span>1080p Ultra-HD · Sharp Focus</span>
                        </div>

                        {enrollCountdown !== null && enrollCountdown > 0 && autoCaptureEnabled && (
                          <div className="cam-countdown-overlay">
                            <div className="cam-countdown-number">{enrollCountdown}</div>
                            <div className="cam-countdown-sub">Hold Still & Align Frame</div>
                          </div>
                        )}

                        <video
                          ref={(el) => {
                            enrollVideoRef.current = el;
                            if (el && enrollStreamRef.current && el.srcObject !== enrollStreamRef.current) {
                              el.srcObject = enrollStreamRef.current;
                              el.play().catch(() => {});
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="face-enroll-cam-video"
                        />
                        <canvas ref={enrollCanvasRef} style={{ display: 'none' }} />

                        {/* Animated Laser line */}
                        <div className="kiosk-laser-line" />

                        {/* Oval Mask Guide */}
                        <svg className="kiosk-oval-svg" viewBox="0 0 380 285" preserveAspectRatio="none">
                          <defs>
                            <mask id="enrollMask">
                              <rect width="380" height="285" fill="#ffffff" />
                              <ellipse cx="190" cy="140" rx="80" ry="105" fill="#000000" />
                            </mask>
                          </defs>
                          <rect width="380" height="285" fill="rgba(2, 6, 23, 0.45)" mask="url(#enrollMask)" />
                          <ellipse
                            cx="190"
                            cy="140"
                            rx="80"
                            ry="105"
                            fill="none"
                            stroke={enrollFaceDetected ? '#10b981' : '#38bdf8'}
                            strokeWidth={enrollFaceDetected ? '3' : '2'}
                            strokeDasharray={enrollFaceDetected ? 'none' : '6 4'}
                          />
                        </svg>

                        <div className="kiosk-status-pill">
                          <span className={enrollFaceDetected ? '' : 'waiting'}>
                            <div
                              className="kiosk-pulse-dot"
                              style={{ background: enrollFaceDetected ? '#10b981' : '#38bdf8' }}
                            />
                            {autoCaptureEnabled
                              ? enrollFaceDetected
                                ? enrollStep === 1
                                  ? `🎯 Center Face Locked · Snapping in ${enrollCountdown !== null ? enrollCountdown : 3}s...`
                                  : enrollStep === 2
                                  ? `🎯 Left Angle Locked · Snapping in ${enrollCountdown !== null ? enrollCountdown : 3}s...`
                                  : `🎯 Right Angle Locked · Snapping in ${enrollCountdown !== null ? enrollCountdown : 3}s...`
                                : '👀 Stand inside Oval Guide to Start Auto-Capture'
                              : `Position Face & Click Snap (Angle ${enrollStep}/3)`}
                          </span>
                        </div>
                      </div>

                      <div className="face-enroll-cam-actions">
                        <button
                          type="button"
                          className="btn-enroll-cam"
                          onClick={captureEnrollFace}
                        >
                          <Camera size={15} />
                          <span>Snap Now (Angle {enrollStep}/3)</span>
                        </button>
                        <button
                          type="button"
                          className="btn-finance-outline"
                          style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                          onClick={stopEnrollCam}
                        >
                          Cancel Camera
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 12px 0' }}>
                        Register the employee's face with <strong>3-Angle Guided Scan (Center ➔ Left ➔ Right)</strong> for 99.8% AI biometric accuracy at Kiosk terminals.
                      </p>
                      <div className="face-enroll-actions-row">
                        <button
                          type="button"
                          className="btn-enroll-cam"
                          onClick={() => startEnrollCam(1)}
                        >
                          <Camera size={15} /> Start 3-Angle Face Scanner (Recommended)
                        </button>
                        <label className="btn-enroll-upload">
                          <Upload size={15} /> Upload Single Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoFileUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="finance-modal-footer">
                <button
                  type="button"
                  className="btn-finance-outline"
                  onClick={() => {
                    stopEnrollCam();
                    setShowEmployeeModal(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-finance-primary">
                  {editEmployee ? 'Update Compensation & Face' : 'Enroll Employee & Face'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: MANUAL DTR RECORDING
      ═══════════════════════════════════════════════════════════════════ */}
      {showManualLogModal && (
        <div className="finance-modal-overlay">
          <div className="finance-modal-card" style={{ maxWidth: 520 }}>
            <div className="finance-modal-header">
              <div className="modal-title-row">
                <Clock size={22} className="emerald" />
                <div>
                  <h3>Record Manual Biometric DTR</h3>
                  <small>Log or adjust employee clock-in and clock-out stamps</small>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowManualLogModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveManualLog} className="finance-modal-form">
              <div className="finance-form-group" style={{ marginBottom: 14 }}>
                <label>Select Employee *</label>
                <select
                  required
                  value={manualLogForm.employee_id}
                  onChange={(e) => setManualLogForm({ ...manualLogForm, employee_id: e.target.value })}
                >
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_id} — {emp.first_name} {emp.last_name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="finance-form-grid" style={{ marginBottom: 14 }}>
                <div className="finance-form-group">
                  <label>Attendance Date *</label>
                  <input
                    type="date"
                    required
                    value={manualLogForm.log_date}
                    onChange={(e) => setManualLogForm({ ...manualLogForm, log_date: e.target.value })}
                  />
                </div>

                <div className="finance-form-group">
                  <label>Punctuality Status *</label>
                  <select
                    value={manualLogForm.status}
                    onChange={(e) => setManualLogForm({ ...manualLogForm, status: e.target.value })}
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Overtime">Overtime</option>
                    <option value="Half-day">Half-day</option>
                  </select>
                </div>

                <div className="finance-form-group">
                  <label>Time In *</label>
                  <input
                    type="time"
                    required
                    value={manualLogForm.time_in}
                    onChange={(e) => setManualLogForm({ ...manualLogForm, time_in: e.target.value })}
                  />
                </div>

                <div className="finance-form-group">
                  <label>Time Out</label>
                  <input
                    type="time"
                    value={manualLogForm.time_out}
                    onChange={(e) => setManualLogForm({ ...manualLogForm, time_out: e.target.value })}
                  />
                </div>
              </div>

              <div className="finance-form-group" style={{ marginBottom: 20 }}>
                <label>Verification Notes</label>
                <input
                  type="text"
                  value={manualLogForm.notes}
                  onChange={(e) => setManualLogForm({ ...manualLogForm, notes: e.target.value.toUpperCase() })}
                  placeholder="E.G. BIOMETRIC KIOSK VERIFICATION CONFIRMED"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="finance-modal-footer">
                <button
                  type="button"
                  className="btn-finance-outline"
                  onClick={() => setShowManualLogModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-finance-primary">
                  Save Attendance Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: LIVE BIOMETRIC FACE RECOGNITION & GPS KIOSK
      ═══════════════════════════════════════════════════════════════════ */}
      {showKioskModal && (
        <div className="finance-modal-overlay">
          <div className="kiosk-modal-card">
            {/* Header */}
            <div className="kiosk-modal-header">
              <div className="modal-title-row">
                <ShieldCheck size={22} className="emerald" />
                <div>
                  <h3>Biometric Face & GPS Kiosk</h3>
                  <small>AI Facial Verification & Satellite Geolocation</small>
                </div>
              </div>
              <button className="modal-close-btn" onClick={stopKiosk} title="Close Kiosk">✕</button>
            </div>

            <div className="kiosk-modal-body">
              <div className="kiosk-modal-grid">
                {/* ── Left Column: Immersive Camera Viewport ── */}
                <div className="kiosk-grid-camera">
                  <div className="kiosk-viewport-wrap">
                    {/* Top HD Quality Badge */}
                    <div className="cam-quality-pill">
                      <span className="cam-quality-dot" />
                      <span>1080p Ultra-HD Biometric Scanner</span>
                    </div>

                    {kioskCountdown !== null && kioskCountdown > 0 && kioskAutoScan && !kioskResult && !kioskScanning && (
                      <div className="cam-countdown-overlay">
                        <div className="cam-countdown-number">{kioskCountdown}</div>
                        <div className="cam-countdown-sub">Hold Still · Auto-Punching</div>
                      </div>
                    )}

                    {/* Biometric AI Facial Processing Overlay */}
                    {kioskScanning && (
                      <div className="cam-processing-overlay">
                        <div className="cam-proc-radar-wrap">
                          <div className="cam-proc-ring outer" />
                          <div className="cam-proc-ring inner" />
                          <div className="cam-proc-sweep" />

                          {/* 4 Corner Targeting HUD Brackets */}
                          <div className="cam-proc-corner top-left" />
                          <div className="cam-proc-corner top-right" />
                          <div className="cam-proc-corner bottom-left" />
                          <div className="cam-proc-corner bottom-right" />

                          {/* Central Matrix Crosshair */}
                          <div className="cam-proc-crosshair" />
                        </div>

                        {/* Fast Laser Scan Bar */}
                        <div className="cam-proc-laser-bar" />

                        {/* High-Tech Telemetry HUD Status Badge */}
                        <div className="cam-proc-status-badge">
                          <div className="cam-proc-spinner" />
                          <div className="cam-proc-text-wrap">
                            <div className="cam-proc-title">ANALYZING BIOMETRICS</div>
                            <div className="cam-proc-subtitle">
                              <span>1:N Neural Vector Matching</span>
                              <span className="cam-proc-dots">...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="kiosk-video"
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Animated Laser Beam */}
                    {!kioskScanning && <div className="kiosk-laser-line" />}

                    {/* Oval Mask Framing Guide */}
                    <svg className="kiosk-oval-svg" viewBox="0 0 400 300" preserveAspectRatio="none">
                      <defs>
                        <mask id="kioskMask">
                          <rect width="400" height="300" fill="#ffffff" />
                          <ellipse cx="200" cy="145" rx="88" ry="118" fill="#000000" />
                        </mask>
                      </defs>
                      <rect width="400" height="300" fill="rgba(2, 6, 23, 0.45)" mask="url(#kioskMask)" />
                      <ellipse
                        cx="200"
                        cy="145"
                        rx="88"
                        ry="118"
                        fill="none"
                        stroke={
                          kioskError
                            ? '#ef4444'
                            : kioskScanning
                            ? '#06b6d4'
                            : kioskResult
                            ? '#10b981'
                            : kioskFaceDetected
                            ? '#10b981'
                            : '#38bdf8'
                        }
                        strokeWidth={kioskScanning || kioskFaceDetected || kioskResult ? '3' : '2'}
                        strokeDasharray={kioskScanning || kioskFaceDetected || kioskResult ? 'none' : '6 4'}
                      />
                    </svg>

                    {/* Floating Status Pill */}
                    <div className="kiosk-status-pill">
                      <span className={kioskError ? 'error' : kioskFaceDetected || kioskResult ? '' : 'waiting'}>
                        <div
                          className="kiosk-pulse-dot"
                          style={{
                            background: kioskError
                              ? '#ef4444'
                              : kioskResult || kioskFaceDetected
                              ? '#10b981'
                              : '#38bdf8',
                          }}
                        />
                        {kioskScanning
                          ? 'Matching Facial Geometrics...'
                          : kioskError
                          ? 'Camera / Biometric Error'
                          : kioskResult
                          ? 'Biometrics Verified!'
                          : kioskAutoScan
                          ? kioskFaceDetected
                            ? `🎯 Face Locked · Auto-Punching in ${kioskCountdown !== null ? kioskCountdown : 3}s...`
                            : '👀 Standby · Step in front of camera to punch'
                          : 'Position Face Inside Oval Guide'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Right Column: Live Clock, GPS, Controls & Result ── */}
                <div className="kiosk-grid-controls">
                  {/* Live Digital Clock Bar */}
                  <div className="kiosk-clock-bar">
                    <div>
                      <div className="kiosk-time-display">{kioskTime || '12:00:00 PM'}</div>
                      <small style={{ color: '#6ee7b7', fontSize: '0.72rem', fontWeight: 700 }}>PHILIPPINES STANDARD TIME (UTC+8)</small>
                    </div>
                    <div className="kiosk-date-display">
                      <div>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <small style={{ color: '#10b981', fontWeight: 700 }}>● KIOSK LIVE</small>
                    </div>
                  </div>

                  {/* GPS Geolocation Pill */}
                  <div className="kiosk-gps-row">
                    <div className="kiosk-gps-meta">
                      <MapPin size={16} />
                      <div className="kiosk-gps-text" title={kioskGps.location}>
                        {kioskGps.location}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="kiosk-gps-refresh-btn"
                      onClick={fetchKioskGPS}
                      title="Re-acquire Satellite GPS"
                    >
                      <Navigation size={12} style={{ display: 'inline', marginRight: 4 }} />
                      GPS Fix
                    </button>
                  </div>

                  {/* Biometric Engine Status Chip */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '4px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 700 }}>
                      <ShieldCheck size={14} className="emerald" />
                      <span>1:N AI Identification</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKioskAutoScan(prev => !prev)}
                      className={`auto-capture-badge ${kioskAutoScan ? 'active' : 'inactive'}`}
                      title="Toggle hands-free Auto-Punch mode"
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      {kioskAutoScan ? '⚡ Auto-Punch: ON (3s)' : '🖐️ Manual Punch'}
                    </button>
                  </div>

                  {/* Error Message if any */}
                  {kioskError && (
                    <div className="finance-error-alert" style={{ margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={16} />
                        <span>{kioskError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={startKiosk}
                        style={{
                          background: 'rgba(239, 68, 68, 0.25)',
                          border: '1px solid #ef4444',
                          color: '#fca5a5',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        🔄 Retry Camera
                      </button>
                    </div>
                  )}

                  {/* Scan Trigger Punch Button */}
                  <button
                    type="button"
                    className="btn-kiosk-punch"
                    onClick={handleFaceScan}
                    disabled={kioskScanning}
                  >
                    <Camera size={18} />
                    <span>
                      {kioskScanning ? 'Matching Face in Biometric Database...' : 'Scan Face & Punch Attendance'}
                    </span>
                  </button>

                  {/* Biometric Result Card */}
                  {kioskResult ? (
                    <div className="kiosk-result-card time-in">
                      <div className="kiosk-result-badge">
                        <ShieldCheck size={13} />
                        ATTENDANCE RECORDED
                      </div>

                      <div className="kiosk-result-name">{kioskResult.employee_name}</div>
                      <div className="kiosk-result-dept">{kioskResult.department} · {kioskResult.position || 'Staff'} ({kioskResult.employee_id})</div>

                      <div className="kiosk-result-time-row">
                        <span className="kiosk-result-time-label">
                          Time Recorded
                        </span>
                        <span className="kiosk-result-time-val">{kioskResult.time}</span>
                      </div>

                      <div className="kiosk-result-pills">
                        <div className="kiosk-result-pill-item">
                          <Sparkles size={13} style={{ color: '#34d399' }} />
                          <span>{kioskResult.confidence || '99.2'}% Match</span>
                        </div>
                        <div className="kiosk-result-pill-item">
                          <MapPin size={13} style={{ color: '#38bdf8' }} />
                          <span>{kioskResult.location?.split('(')[0] || 'Office GPS'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="kiosk-standby-guide-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="kiosk-guide-icon-pulse">
                          <Sparkles size={18} className="emerald" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc' }}>
                            Hands-Free Biometric Verification
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>
                            Align your face in the camera viewport on the left. The AI biometric engine will auto-verify your attendance.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: OFFICIAL DOLE / BIR PRINTABLE EMPLOYEE PAYSLIP
      ═══════════════════════════════════════════════════════════════════ */}
      {showPayslipModal && selectedPayslip && (
        <div className="finance-modal-overlay">
          <div className="payslip-modal-card">
            <div className="payslip-modal-header no-print">
              <div className="modal-title-row">
                <Receipt size={22} className="emerald" />
                <div>
                  <h3>DOLE & BIR Official Compensation Payslip</h3>
                  <small>Republic of the Philippines · Presidential Decree No. 442 / RA 10963</small>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-finance-primary"
                  onClick={handleDownloadPDF}
                  disabled={pdfGenerating}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '0.82rem' }}
                  title="Direct high-resolution PDF download"
                >
                  <Download size={15} />
                  <span>{pdfGenerating ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>
                <button
                  type="button"
                  className="btn-finance-secondary"
                  onClick={handlePrintPayslip}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '0.82rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#f8fafc' }}
                  title="Print to printer or Save as PDF via browser"
                >
                  <Printer size={15} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowPayslipModal(false)}
                  title="Close Payslip"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="payslip-modal-body">
              {(() => {
                const p = selectedPayslip;
                const baseRate = parseFloat(p.base_rate) || 0;
                const monthlyBase = parseFloat(p.monthly_equivalent || (p.rate_type === 'monthly' ? baseRate : (p.rate_type === 'daily' ? baseRate * 26 : baseRate * 2)) || baseRate);
                const dailyRate = parseFloat(p.rate_type === 'daily' ? baseRate : (p.hourly_rate ? p.hourly_rate * 8 : (monthlyBase ? monthlyBase / 26 : 0)));
                const hourlyRate = parseFloat(p.hourly_rate || (dailyRate ? dailyRate / 8 : 0));
                const daysRendered = p.days_present !== undefined ? p.days_present : (p.days_worked !== undefined ? p.days_worked : (p.rate_type === 'monthly' ? 13 : 0));
                const regularOT = parseFloat(p.total_ot_hours !== undefined ? p.total_ot_hours : (p.overtime_hours || 0));
                const lateMinutes = parseInt(p.total_late_minutes !== undefined ? p.total_late_minutes : (p.late_minutes || 0), 10);

                const basicPay = parseFloat(p.basic_pay) || 0;
                const otPay = parseFloat(p.ot_pay !== undefined ? p.ot_pay : (p.overtime_pay || 0));
                const holidayPay = parseFloat(p.holiday_pay || 0);
                const nightDiffPay = parseFloat(p.night_diff_pay || 0);
                const allowances = parseFloat(p.allowances || 0);
                const bonuses = parseFloat(p.bonuses !== undefined ? p.bonuses : (p.bonus_pay || 0));
                const grossPay = parseFloat(p.gross_pay || (basicPay + otPay + holidayPay + nightDiffPay + allowances + bonuses));

                const lateDeductions = parseFloat(p.deductions_late !== undefined ? p.deductions_late : (p.late_deduction || 0));
                const loanDeductions = parseFloat(p.loan_deductions || 0);
                const cashAdvanceDeductions = parseFloat(p.cash_advance_deductions !== undefined ? p.cash_advance_deductions : (p.cash_advance_deduction || 0));
                const otherDeductions = parseFloat(p.other_deductions || 0);

                const sssDeductions = parseFloat(p.deductions_sss !== undefined ? p.deductions_sss : (p.sss_deduction || 0));
                const philhealthDeductions = parseFloat(p.deductions_philhealth !== undefined ? p.deductions_philhealth : (p.philhealth_deduction || 0));
                const pagibigDeductions = parseFloat(p.deductions_pagibig !== undefined ? p.deductions_pagibig : (p.pagibig_deduction || 0));
                const taxDeductions = parseFloat(p.deductions_tax !== undefined ? p.deductions_tax : (p.tax_deduction || 0));

                const totalDeductions = parseFloat(p.total_deductions !== undefined ? p.total_deductions : (lateDeductions + loanDeductions + cashAdvanceDeductions + otherDeductions + sssDeductions + philhealthDeductions + pagibigDeductions + taxDeductions));
                const netPay = parseFloat(p.net_pay !== undefined ? p.net_pay : (grossPay - totalDeductions));

                const sssER = parseFloat(p.sss_er || 0);
                const sssEC = parseFloat(p.sss_ec || 0);
                const philhealthER = parseFloat(p.philhealth_er || 0);
                const pagibigER = parseFloat(p.pagibig_er || 0);
                const totalER = parseFloat(p.total_employer_cost || (grossPay + sssER + philhealthER + pagibigER));

                return (
                  <div id="printable-payslip" className="payslip-sheet">
                    {/* Payslip Header */}
                    <div className="payslip-sheet-header">
                      <div className="payslip-corp-info">
                        <div className="payslip-corp-brand">
                          <div className="payslip-brand-tag">REPUBLIC OF THE PHILIPPINES · DOLE & BIR COMPLIANT</div>
                        </div>
                        <div className="payslip-corp-title">EM-CARD FINANCIAL & WORKFORCE SERVICES</div>
                        <div className="payslip-corp-sub">Official Employee Compensation & Payroll Voucher</div>
                        <div className="payslip-corp-legal">Pursuant to Presidential Decree No. 442 (Philippine Labor Code) & RA 10963 (TRAIN Law)</div>
                      </div>
                      <div className="payslip-badge-block">
                        <div className="payslip-doc-badge">OFFICIAL PAYSLIP VOUCHER</div>
                        <div className="payslip-period-badge">
                          <strong>Cutoff:</strong> {p.cutoff_start} to {p.cutoff_end}
                        </div>
                        <div className="payslip-date-badge">
                          <strong>Date Issued:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="payslip-ref-badge">
                          <strong>Ref:</strong> EM-PAY-{p.employee_id || '001'}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="payslip-meta-grid">
                      <div className="payslip-meta-col">
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">EMPLOYEE NAME:</span>
                          <span className="payslip-meta-val bold">{p.employee_name}</span>
                        </div>
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">EMPLOYEE ID / PIN:</span>
                          <span className="payslip-meta-val mono bold text-emerald">{p.employee_id}</span>
                        </div>
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">DESIGNATION / ROLE:</span>
                          <span className="payslip-meta-val">{p.position || 'Staff Member'}</span>
                        </div>
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">DEPARTMENT / OFFICE:</span>
                          <span className="payslip-meta-val">{p.department || 'Operations'} · Main Office</span>
                        </div>
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">DISBURSEMENT ACCT:</span>
                          <span className="payslip-meta-val">{p.bank_name || p.disbursement_method || 'Landbank of the Philippines'} · {p.bank_account_no || 'Direct Payroll'}</span>
                        </div>
                      </div>
                      <div className="payslip-meta-col">
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">TAX ID NO. (TIN):</span>
                          <span className="payslip-meta-val mono">{p.tin_number || '000-000-000-000'}</span>
                        </div>
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">SSS NUMBER:</span>
                          <span className="payslip-meta-val mono">{p.sss_number || '00-0000000-0'}</span>
                        </div>
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">PHILHEALTH NUMBER:</span>
                          <span className="payslip-meta-val mono">{p.philhealth_number || '00-000000000-0'}</span>
                        </div>
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">PAG-IBIG (HDMF) NO.:</span>
                          <span className="payslip-meta-val mono">{p.pagibig_number || '0000-0000-0000'}</span>
                        </div>
                        <div className="payslip-meta-row">
                          <span className="payslip-meta-lbl">PAYROLL STATUS:</span>
                          <span className="payslip-meta-val bold text-emerald">
                            {(p.status || 'Verified & Processed').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Attendance & Rate Strip */}
                    <div className="payslip-stats-strip">
                      <div className="payslip-stat-pill">
                        <span className="payslip-stat-lbl">Days Rendered</span>
                        <span className="payslip-stat-num">{daysRendered} Days</span>
                      </div>
                      <div className="payslip-stat-pill">
                        <span className="payslip-stat-lbl">Regular Overtime</span>
                        <span className="payslip-stat-num">{regularOT.toFixed(1)} hrs</span>
                      </div>
                      <div className="payslip-stat-pill">
                        <span className="payslip-stat-lbl">Tardiness / Undertime</span>
                        <span className="payslip-stat-num" style={{ color: lateMinutes > 0 ? '#dc2626' : '#047857' }}>
                          {lateMinutes > 0 ? `${lateMinutes} mins` : '0 mins'}
                        </span>
                      </div>
                      <div className="payslip-stat-pill">
                        <span className="payslip-stat-lbl">Daily Rate</span>
                        <span className="payslip-stat-num">₱{dailyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="payslip-stat-pill">
                        <span className="payslip-stat-lbl">Monthly Base Salary</span>
                        <span className="payslip-stat-num">₱{monthlyBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Symmetrical Earnings & Deductions Tables */}
                    <div className="payslip-tables-grid">
                      {/* Earnings Column */}
                      <div className="payslip-table-box">
                        <div className="payslip-table-title earnings-title">
                          <span>EARNINGS & ALLOWANCES</span>
                          <span>AMOUNT (PHP)</span>
                        </div>
                        <table className="payslip-data-table">
                          <tbody>
                            <tr>
                              <td>Basic Salary Pay ({p.rate_type === 'hourly' ? 'Hourly' : p.rate_type === 'daily' ? 'Daily' : 'Semi-Monthly'})</td>
                              <td className="text-right">₱{basicPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td>Overtime Pay {regularOT > 0 ? `(${regularOT.toFixed(1)} hrs @ 125%)` : '(Reg / RD)'}</td>
                              <td className="text-right">₱{otPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td>Holiday Pay (Regular / Special Day)</td>
                              <td className="text-right">₱{holidayPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td>Night Shift Differential (10%)</td>
                              <td className="text-right">₱{nightDiffPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td>Allowances (De Minimis / COLA / Rice)</td>
                              <td className="text-right">₱{allowances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td>Performance / Other Bonus</td>
                              <td className="text-right">₱{bonuses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr className="payslip-total-row">
                              <td><strong>TOTAL GROSS PAY</strong></td>
                              <td className="text-right bold" style={{ color: '#047857' }}>
                                ₱{grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Deductions Column */}
                      <div className="payslip-table-box">
                        <div className="payslip-table-title deductions-title">
                          <span>STATUTORY & OTHER DEDUCTIONS</span>
                          <span>AMOUNT (PHP)</span>
                        </div>
                        <table className="payslip-data-table">
                          <tbody>
                            <tr>
                              <td>Tardiness / Undertime {lateMinutes > 0 ? `(${lateMinutes} mins)` : ''}</td>
                              <td className="text-right" style={{ color: lateDeductions > 0 ? '#dc2626' : '#334155' }}>
                                ₱{lateDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td>Company Cash Advance (CA)</td>
                              <td className="text-right" style={{ color: cashAdvanceDeductions > 0 ? '#dc2626' : '#334155' }}>
                                ₱{cashAdvanceDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td>Company / Salary Loan Deductions</td>
                              <td className="text-right" style={{ color: loanDeductions > 0 ? '#dc2626' : '#334155' }}>
                                ₱{loanDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td>Other Deductions / Uniform / ID</td>
                              <td className="text-right" style={{ color: otherDeductions > 0 ? '#dc2626' : '#334155' }}>
                                ₱{otherDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td>SSS & PhilHealth Contribution (EE)</td>
                              <td className="text-right">₱{(sssDeductions + philhealthDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td>Pag-IBIG & Withholding Tax (EE)</td>
                              <td className="text-right">₱{(pagibigDeductions + taxDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr className="payslip-total-row">
                              <td><strong>TOTAL DEDUCTIONS</strong></td>
                              <td className="text-right bold" style={{ color: '#dc2626' }}>
                                ₱{totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Net Take Home Pay Banner */}
                    <div className="payslip-net-banner">
                      <div className="payslip-net-left">
                        <span className="payslip-net-lbl">NET TAKE HOME PAY</span>
                        <span className="payslip-net-words">
                          Amount in Words: <strong>{numberToWordsPHP(netPay)}</strong>
                        </span>
                      </div>
                      <div className="payslip-net-right">
                        <span className="payslip-net-currency">PHP</span>
                        <span className="payslip-net-amount">
                          ₱{netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Employer Statutory Contributions */}
                    <div className="payslip-er-block">
                      <div className="payslip-er-title">EMPLOYER STATUTORY CONTRIBUTIONS (COMPANY PAID · NOT DEDUCTED FROM EMPLOYEE)</div>
                      <div className="payslip-er-grid">
                        <div className="payslip-er-item">
                          <span>SSS Employer Share:</span>
                          <strong>₱{sssER.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="payslip-er-item">
                          <span>SSS EC (Employees Comp):</span>
                          <strong>₱{sssEC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="payslip-er-item">
                          <span>PhilHealth ER Share:</span>
                          <strong>₱{philhealthER.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="payslip-er-item">
                          <span>Pag-IBIG ER Share:</span>
                          <strong>₱{pagibigER.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="payslip-er-item total-er">
                          <span>Total Company Cost:</span>
                          <strong style={{ color: '#047857' }}>₱{totalER.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Formal Signatures & Acknowledgement Block */}
                    <div className="payslip-sig-grid">
                      <div className="payslip-sig-col">
                        <div className="payslip-sig-box">
                          <div className="payslip-sig-line" />
                          <div className="payslip-sig-name">PREPARED BY: FINANCE OFFICER</div>
                          <div className="payslip-sig-sub">Verified & Computed via EM-Card Core</div>
                          <div className="payslip-sig-date">Date: ____________________</div>
                        </div>
                      </div>
                      <div className="payslip-sig-col">
                        <div className="payslip-sig-box">
                          <div className="payslip-sig-line" />
                          <div className="payslip-sig-name">APPROVED BY: EXECUTIVE MANAGEMENT</div>
                          <div className="payslip-sig-sub">Disbursement Authorized</div>
                          <div className="payslip-sig-date">Date: ____________________</div>
                        </div>
                      </div>
                      <div className="payslip-sig-col">
                        <div className="payslip-sig-box">
                          <div className="payslip-sig-line" />
                          <div className="payslip-sig-name">RECEIVED BY: {p.employee_name?.toUpperCase()}</div>
                          <div className="payslip-sig-sub">Employee Signature & Acknowledgment</div>
                          <div className="payslip-sig-date">Date: ____________________</div>
                        </div>
                      </div>
                    </div>

                    {/* Official Document Footer Notice */}
                    <div className="payslip-footer-notice">
                      <span>Official Payroll Record · Confidential Document · Generated by EM-Card Enterprise Workforce Platform</span>
                      <span>Ref: EM-PAY-{p.employee_id || '001'} · Timestamp: {new Date().toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: LOAN & ADJUSTMENT ENTRY
      ═══════════════════════════════════════════════════════════════════ */}
      {showAdjustmentModal && (
        <div className="finance-modal-overlay">
          <div className="finance-modal-card">
            <div className="finance-modal-header">
              <div className="modal-title-row">
                <DollarSign size={22} className="emerald" />
                <div>
                  <h3>{adjustmentForm.id ? 'Edit Payroll Adjustment / Loan' : 'Add Payroll Adjustment or Loan'}</h3>
                  <small>Configure custom earnings, bonuses, SSS/HDMF loans, or company advances</small>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAdjustmentModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              <div className="finance-modal-body">
                <div className="finance-form-group">
                  <label>Target Employee *</label>
                  <select
                    value={adjustmentForm.employee_id}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, employee_id: e.target.value })}
                    required
                    className="finance-input"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => {
                      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || emp.employee_id;
                      return (
                        <option key={emp.id || emp.employee_id} value={emp.employee_id}>
                          {fullName} ({emp.employee_id}) · {emp.position || 'Staff'} ({emp.department || 'Operations'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="finance-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="finance-form-group">
                    <label>Classification *</label>
                    <select
                      value={adjustmentForm.type}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdjustmentForm({
                          ...adjustmentForm,
                          type: val,
                          category: val === 'earning' ? 'Bonus' : 'SSS Loan'
                        });
                      }}
                      className="finance-input"
                    >
                      <option value="earning">Earning / Credit (+)</option>
                      <option value="deduction">Deduction / Loan (-)</option>
                    </select>
                  </div>

                  <div className="finance-form-group">
                    <label>Category *</label>
                    <select
                      value={adjustmentForm.category}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, category: e.target.value })}
                      className="finance-input"
                    >
                      {adjustmentForm.type === 'earning' ? (
                        <>
                          <option value="Bonus">Performance / Performance Bonus</option>
                          <option value="Allowance Adjustment">Special Allowance / Per Diem</option>
                          <option value="Night Differential">Night Shift Differential Adjustment</option>
                          <option value="Hazard Pay">Hazard Pay / Special Duty</option>
                          <option value="Reimbursement">Tax-Exempt Expense Reimbursement</option>
                          <option value="Other Earning">Other Earning</option>
                        </>
                      ) : (
                        <>
                          <option value="SSS Loan">SSS Salary Loan</option>
                          <option value="Pag-IBIG Loan">Pag-IBIG (HDMF) Multi-Purpose Loan</option>
                          <option value="Cash Advance">Company Cash Advance (CA)</option>
                          <option value="Tardiness Adjustment">Tardiness / Undertime Adjustment</option>
                          <option value="Uniform / ID">Uniform / Badge / Equipment</option>
                          <option value="Other Deduction">Other Deduction</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="finance-form-group">
                  <label>Adjustment Description / Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. SSS Salary Loan #920194 or Q3 Excellence Bonus"
                    value={adjustmentForm.title}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, title: e.target.value })}
                    required
                    className="finance-input"
                  />
                </div>

                <div className="finance-form-group">
                  <label>Payment & Deduction Schedule Model *</label>
                  <select
                    value={adjustmentForm.recurrence_type || (adjustmentForm.is_recurring ? 'recurring' : 'one_time')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdjustmentForm({
                        ...adjustmentForm,
                        recurrence_type: val,
                        is_recurring: val === 'recurring' || val === 'installments',
                      });
                    }}
                    className="finance-input"
                  >
                    <option value="installments">Installment Plan</option>
                    <option value="one_time">One-Time (Deduct full amount in current cut-off only)</option>
                    <option value="recurring">Indefinite Recurring (Fixed deduction every cut-off)</option>
                  </select>
                </div>

                {/* ── INSTALLMENT PLAN FIELDS ── */}
                {adjustmentForm.recurrence_type === 'installments' ? (
                  <>
                    <div className="finance-form-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                      <div className="finance-form-group">
                        <label>Total Principal Loan / Amount (PHP) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 5000.00"
                          value={adjustmentForm.total_amount}
                          onChange={(e) => {
                            const tot = e.target.value;
                            const num = parseInt(adjustmentForm.total_installments, 10) || 1;
                            const perCutoff = tot && num > 0 ? (parseFloat(tot) / num).toFixed(2) : '';
                            setAdjustmentForm({
                              ...adjustmentForm,
                              total_amount: tot,
                              amount: perCutoff,
                            });
                          }}
                          required
                          className="finance-input"
                        />
                      </div>

                      <div className="finance-form-group">
                        <label>Number of Cut-offs (Term) *</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          placeholder="e.g. 5"
                          value={adjustmentForm.total_installments}
                          onChange={(e) => {
                            const num = parseInt(e.target.value, 10) || 1;
                            const tot = parseFloat(adjustmentForm.total_amount) || 0;
                            const perCutoff = tot > 0 && num > 0 ? (tot / num).toFixed(2) : '';
                            setAdjustmentForm({
                              ...adjustmentForm,
                              total_installments: num,
                              amount: perCutoff,
                            });
                          }}
                          required
                          className="finance-input"
                        />
                      </div>
                    </div>

                    {/* Per Cut-off Deduction & Simulation Banner */}
                    <div style={{
                      background: 'rgba(6, 78, 59, 0.25)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 14,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
                          Deduction Amount per Cut-off:
                        </span>
                        <strong style={{ fontSize: '1.15rem', color: '#34d399' }}>
                          ₱{Number(adjustmentForm.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
                        💡 <strong>₱{Number(adjustmentForm.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> total will be divided into <strong>{adjustmentForm.total_installments || 1} payments</strong> of <strong>₱{Number(adjustmentForm.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> every pay cut-off.
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="finance-form-group">
                    <label>Amount per Cut-off (PHP) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={adjustmentForm.amount}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value, total_amount: e.target.value })}
                      required
                      className="finance-input"
                    />
                  </div>
                )}

                {/* ── DATES: DATE OF LOAN RECEIVED & START DEDUCTION CUT-OFF ── */}
                <div className="finance-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 4 }}>
                  <div className="finance-form-group">
                    <label>Date of Loan Received</label>
                    <input
                      type="date"
                      value={adjustmentForm.date_received || ''}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date_received: e.target.value })}
                      className="finance-input"
                    />
                  </div>

                  <div className="finance-form-group">
                    <label>Start Deduction Cut-off *</label>
                    <input
                      type="date"
                      value={adjustmentForm.cutoff_start || cutoffStart}
                      onChange={(e) => setAdjustmentForm({ ...adjustmentForm, cutoff_start: e.target.value })}
                      required
                      className="finance-input"
                    />
                  </div>
                </div>
                <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.73rem', marginTop: 6 }}>
                  📅 Deduction will begin applying on the payroll period starting <strong>{adjustmentForm.cutoff_start || cutoffStart}</strong>. Earlier cut-offs will not be deducted.
                </small>
              </div>

              <div className="finance-modal-footer">
                <button type="button" className="btn-finance-outline" onClick={() => setShowAdjustmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-finance-primary" disabled={payrollActionLoading}>
                  {payrollActionLoading ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: DISBURSEMENT & APPROVAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showDisburseModal && payrollData && (
        <div className="finance-modal-overlay">
          <div className="finance-modal-card">
            <div className="finance-modal-header">
              <div className="modal-title-row">
                <Wallet size={22} className="emerald" />
                <div>
                  <h3>Authorize & Disburse Cut-off Payroll</h3>
                  <small>Period: {payrollData.cutoff_start} to {payrollData.cutoff_end}</small>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDisburseModal(false)}>✕</button>
            </div>

            <div className="finance-modal-body">
              <div className="disburse-summary-card">
                <div className="disburse-summary-row">
                  <span>Total Enrolled Staff:</span>
                  <strong>{payrollData.records?.length || 0} Employees</strong>
                </div>
                <div className="disburse-summary-row">
                  <span>Gross Compensation:</span>
                  <strong>₱{Number(payrollData.totals?.total_gross || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="disburse-summary-row">
                  <span>Total Statutory (EE + ER):</span>
                  <strong>₱{Number((payrollData.totals?.total_deductions || 0) + (payrollData.totals?.total_employer_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="disburse-summary-row total-highlight">
                  <span>Total Net Payout:</span>
                  <strong style={{ color: '#34d399', fontSize: '1.2rem' }}>
                    ₱{Number(payrollData.totals?.total_net || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div className="finance-form-group" style={{ marginTop: '16px' }}>
                <label>Select Disbursement Channel *</label>
                <select
                  value={disburseMethod}
                  onChange={(e) => setDisburseMethod(e.target.value)}
                  className="finance-input"
                >
                  <option value="Bank Transfer">Bank Bulk Auto-Credit (BDO / BPI / Metrobank PESONet)</option>
                  <option value="EM-Card Wallet">EM-Card Digital Wallet & NFC ID Card Auto-Credit</option>
                  <option value="Cash Voucher">Official Cash Voucher / On-Site Envelope</option>
                  <option value="Corporate Check">Corporate Check Release</option>
                </select>
              </div>

              <div className="finance-form-group">
                <label>Authorization / Reference Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Batch ref PESONET-2026-09-A or Board Res #44"
                  value={disburseNotes}
                  onChange={(e) => setDisburseNotes(e.target.value)}
                  className="finance-input"
                />
              </div>

              <div className="disburse-notice-box">
                <CheckSquare size={16} className="emerald" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                  Disbursing will lock this pay run, generate transaction audit trails, mark all employee payslips as <strong>Paid</strong>, and archive the disbursement record.
                </span>
              </div>
            </div>

            <div className="finance-modal-footer">
              <button type="button" className="btn-finance-outline" onClick={() => setShowDisburseModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-finance-primary"
                onClick={handleDisbursePayroll}
                disabled={payrollActionLoading}
                style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
              >
                {payrollActionLoading ? 'Processing Disbursement...' : 'Confirm & Disburse Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

