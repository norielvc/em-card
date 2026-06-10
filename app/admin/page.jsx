'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, ClipboardList, CheckCircle, Calendar, LayoutDashboard, Network, MessageSquare, BarChart3, FileText, Bell, Download, ShieldCheck, Lock, User, Mail, Eye, EyeOff, HelpCircle, ArrowRight, UserCheck, ScanLine, Camera, X, MapPin, Phone, AlertTriangle, Upload, Shield, Globe, Link2, QrCode, Zap, Clock, Home, Building, Tag, Hash, Pencil, Printer, Monitor, Database, HardDrive, Activity, Server, Folder, Search, Filter, Plus, Type, Check, CreditCard, Ban, ShieldAlert, Cake, Inbox, Megaphone, History, Info, Trash2, TrendingUp, PieChart, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const SUBDIVISION_PUROKS = ['North Ville 6', 'Balagtas Heights'];

// Helper: fetch with auth token for admin API routes
async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers });
}

export default function AdminPage() {
  const [lang, setLang] = useState('en');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState('admin'); // 'admin' | 'staff'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifOpen, setNotifOpen] = useState(false);

  // Persist / Restore admin active tab on refresh
  const ADMIN_TAB_KEY = 'emcard_admin_tab';
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(ADMIN_TAB_KEY);
      if (saved) setActiveTab(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(ADMIN_TAB_KEY, activeTab);
    } catch { /* ignore */ }
  }, [activeTab]);

  const [totalResidents, setTotalResidents] = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [totalApprovedMembers, setTotalApprovedMembers] = useState(0);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [votersByBarangay, setVotersByBarangay] = useState([]);
  const [regsByBarangay, setRegsByBarangay] = useState([]);
  const [aidByBarangay, setAidByBarangay] = useState([]);
  const [thisMonthRegs, setThisMonthRegs] = useState(0);
  const [lastMonthRegs, setLastMonthRegs] = useState(0);
  const [dashLoading, setDashLoading] = useState(true);

  // Card Production Analytics
  const [cardsPrinted, setCardsPrinted] = useState(0);
  const [cardsPending, setCardsPending] = useState(0);
  const [monthlyPrintingTrend, setMonthlyPrintingTrend] = useState([]);
  const [avgDaysToPrint, setAvgDaysToPrint] = useState(0);

  // Event Attendance Analytics
  const [eventAttendanceData, setEventAttendanceData] = useState([]);
  const [memberEngagementScore, setMemberEngagementScore] = useState(0);
  const [topEvents, setTopEvents] = useState([]);

  // Geographic Distribution Analytics
  const [geoDistributionData, setGeoDistributionData] = useState([]);
  const [highestRegistrationArea, setHighestRegistrationArea] = useState(null);
  const [lowestRegistrationArea, setLowestRegistrationArea] = useState(null);
  const [underservedCommunities, setUnderservedCommunities] = useState([]);

  // Member Growth Trends
  const [growthTrendData, setGrowthTrendData] = useState([]);
  const [growthComparison, setGrowthComparison] = useState({ current: 0, previous: 0, percentChange: 0 });
  const [projectedGrowth, setProjectedGrowth] = useState(0);
  const [growthTrendType, setGrowthTrendType] = useState('monthly');

  // Demographic Breakdown
  const [sectorBreakdown, setSectorBreakdown] = useState([]);
  const [genderBreakdown, setGenderBreakdown] = useState([]);
  const [ageDistribution, setAgeDistribution] = useState([]);

  // Referral Network Analytics
  const [topReferrers, setTopReferrers] = useState([]);
  const [referralSuccessRate, setReferralSuccessRate] = useState(0);
  const [networkGrowthData, setNetworkGrowthData] = useState([]);

  // Comparative Analytics
  const [monthComparison, setMonthComparison] = useState({ thisMonth: 0, lastMonth: 0, change: 0, percentChange: 0 });
  const [barangayComparison, setBarangayComparison] = useState([]);
  const [yearOverYearData, setYearOverYearData] = useState([]);

  const [allResidents, setAllResidents] = useState([]);
  const [allRegs, setAllRegs] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [regsLoading, setRegsLoading] = useState(false);
  const [regStatusFilter, setRegStatusFilter] = useState('Pending');
  const [regSearch, setRegSearch] = useState('');
  const [residentSearch, setResidentSearch] = useState('');
  const [residentsPage, setResidentsPage] = useState(1);
  const [residentsCount, setResidentsCount] = useState(0);
  const residentsPerPage = 50;
  const [resFilterBarangay, setResFilterBarangay] = useState('');
  const [resFilterPrecinct, setResFilterPrecinct] = useState('');
  const [resFilterStatus, setResFilterStatus] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [membersPage, setMembersPage] = useState(1);
  const membersPerPage = 50;
  const [membersTab, setMembersTab] = useState('all');
  const [filterBarangay, setFilterBarangay] = useState('');
  const [filterPurok, setFilterPurok] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterPrinted, setFilterPrinted] = useState('');

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedRegDetail, setSelectedRegDetail] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberEditMode, setMemberEditMode] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  // Resident edit / delete
  const [showEditResidentModal, setShowEditResidentModal] = useState(false);
  const [editResidentForm, setEditResidentForm] = useState({ id: null, last_name: '', first_name: '', middle_name: '', suffix: '', barangay: '', precinct: '', status: '' });
  const [editResidentLoading, setEditResidentLoading] = useState(false);
  const [editResidentError, setEditResidentError] = useState('');
  const [showDeleteResidentModal, setShowDeleteResidentModal] = useState(false);
  const [deleteResidentId, setDeleteResidentId] = useState(null);
  const [deleteResidentName, setDeleteResidentName] = useState('');
  const [deleteResidentLoading, setDeleteResidentLoading] = useState(false);
  // Member delete
  const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState(null);
  const [deleteMemberName, setDeleteMemberName] = useState('');
  const [deleteMemberLoading, setDeleteMemberLoading] = useState(false);
  const [idCardSide, setIdCardSide] = useState('front');
  const [memberScanHistory, setMemberScanHistory] = useState([]);
  const [scanQrMember, setScanQrMember] = useState(null);
  const [scanQrToken, setScanQrToken] = useState('');
  const [scanQrResult, setScanQrResult] = useState(null);
  const [scanQrLoading, setScanQrLoading] = useState(false);
  const [printScanMode, setPrintScanMode] = useState('camera'); // 'camera' | 'manual'
  const [printCameraActive, setPrintCameraActive] = useState(false);
  const printScannerRef = useRef(null);
  const printScanInProgressRef = useRef(false);

  // System Monitoring
  const [systemStats, setSystemStats] = useState(null);
  const [systemLoading, setSystemLoading] = useState(false);

  // Admin Logs
  const [allLogs, setAllLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPerPage] = useState(50);
  const [logsFilterType, setLogsFilterType] = useState('');
  const [logsFilterAdmin, setLogsFilterAdmin] = useState('');
  const [logsStartDate, setLogsStartDate] = useState('');
  const [logsEndDate, setLogsEndDate] = useState('');

  const fetchAdminLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(logsPerPage));
      params.set('offset', String((page - 1) * logsPerPage));
      if (logsFilterType) params.set('actionType', logsFilterType);
      if (logsFilterAdmin) params.set('adminEmail', logsFilterAdmin);
      if (logsStartDate) params.set('startDate', logsStartDate);
      if (logsEndDate) params.set('endDate', logsEndDate);

      const res = await authFetch(`/api/admin-logs?${params.toString()}`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setAllLogs(result.logs || []);
      setLogsTotal(result.total || 0);
    } catch (err) {
      // silent
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    setSystemLoading(true);
    try {
      const [counts, storageRes] = await Promise.all([
        Promise.all([
          supabase.from('ValidResidents').select('*', { count: 'exact', head: true }),
          supabase.from('registrations').select('*', { count: 'exact', head: true }),
          supabase.from('event_scans').select('*', { count: 'exact', head: true }),
          supabase.from('scan_events').select('*', { count: 'exact', head: true }),
          supabase.from('upcoming_events').select('*', { count: 'exact', head: true }),
          supabase.from('contact_inquiries').select('*', { count: 'exact', head: true }),
          supabase.from('admin_users').select('*', { count: 'exact', head: true }),
        ]),
        authFetch('/api/system/stats').then(r => r.json()).catch(() => ({ error: 'Failed to fetch storage stats' })),
      ]);

      const [residents, registrations, eventScans, scanEvents, upcomingEvents, inquiries, adminUsers] = counts;

      setSystemStats({
        tables: {
          validResidents: residents.count || 0,
          registrations: registrations.count || 0,
          eventScans: eventScans.count || 0,
          scanEvents: scanEvents.count || 0,
          upcomingEvents: upcomingEvents.count || 0,
          inquiries: inquiries.count || 0,
          adminUsers: adminUsers.count || 0,
        },
        errors: {
          residents: residents.error?.message || null,
          registrations: registrations.error?.message || null,
          eventScans: eventScans.error?.message || null,
          scanEvents: scanEvents.error?.message || null,
          upcomingEvents: upcomingEvents.error?.message || null,
          inquiries: inquiries.error?.message || null,
          adminUsers: adminUsers.error?.message || null,
        },
        buckets: storageRes.buckets || [],
        bucketError: storageRes.error || null,
        totalUsedBytes: storageRes.totalUsedBytes || 0,
        totalFileCount: storageRes.totalFileCount || 0,
        dbSizes: storageRes.dbSizes || [],
        dbSizeError: storageRes.dbSizeError || null,
        totalDbSize: storageRes.totalDbSize || 0,
        timestamp: new Date().toLocaleString(),
      });
    } catch (err) {
      setSystemStats({ error: err.message });
    } finally {
      setSystemLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const [memberScanHistoryLoading, setMemberScanHistoryLoading] = useState(false);
  const [showMemberNetwork, setShowMemberNetwork] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({});
  const [editMemberLoading, setEditMemberLoading] = useState(false);
  const [newResident, setNewResident] = useState({
    last_name: '', first_name: '', middle_name: '', suffix: '', barangay: 'Borol 1st', precinct: ''
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
  const [networkSearchResults, setNetworkSearchResults] = useState([]);
  const [selectedNetworkMember, setSelectedNetworkMember] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [networkViewMode, setNetworkViewMode] = useState(null); // 'all' | 'month' | 'week' | null
  const [networkMonthFilter, setNetworkMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Messages
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [msgTab, setMsgTab] = useState('compose'); // compose | history

  // Dashboard Tabs
  const [dashTab, setDashTab] = useState('overview'); // overview | trends | geography | demographics | network
  const [msgForm, setMsgForm] = useState({
    title: '', body: '', type: 'broadcast', targetType: 'all', targetValue: ''
  });
  const [msgSending, setMsgSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [msgRecipients, setMsgRecipients] = useState([]);
  const [msgUserSearch, setMsgUserSearch] = useState('');
  const [msgUserResults, setMsgUserResults] = useState([]);
  const [smsProvider, setSmsProvider] = useState(null); // { provider, configured, senderName }

  // Contact Inquiries (homepage submissions)
  const [contactInquiries, setContactInquiries] = useState([]);
  const [contactInquiriesLoading, setContactInquiriesLoading] = useState(false);

  // Birthday SMS
  const [birthdayRecipients, setBirthdayRecipients] = useState([]);
  const [birthdayLoading, setBirthdayLoading] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState('Maligayang Kaarawan {firstName}! Nawa\'y puno ng pag-ibig, saya, at biyaya ang iyong araw. Mula sa EM-CARD family.');
  const [birthdaySending, setBirthdaySending] = useState(false);

  // Event Scanner
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [scanToken, setScanToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannerMode, setScannerMode] = useState('select'); // select | scan | result
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventForm, setNewEventForm] = useState({ event_name: '', event_date: '', location: '', household_mode: false, selected_barangays: [] });
  const [allBarangays, setAllBarangays] = useState([]);
  const [eventScans, setEventScans] = useState([]);
  const [scanStats, setScanStats] = useState({ total: 0, duplicates: 0 });
  const [viewEventRecords, setViewEventRecords] = useState(null);
  const [eventRecords, setEventRecords] = useState([]);
  const [eventRecordsLoading, setEventRecordsLoading] = useState(false);

  // Reports
  const [reportsData, setReportsData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsTab, setReportsTab] = useState('overview'); // overview | events | barangays | network | messages

  // Admin Account Creation
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [createAccountForm, setCreateAccountForm] = useState({ email: '', password: '', confirmPassword: '', role: 'staff' });
  const [createAccountLoading, setCreateAccountLoading] = useState(false);

  // Accounts Management
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [editAccountForm, setEditAccountForm] = useState({ role: '', password: '', confirmPassword: '' });
  const [editAccountLoading, setEditAccountLoading] = useState(false);

  const [scannerInputMode, setScannerInputMode] = useState('camera'); // 'camera' | 'capture' | 'manual'
  const [cameraActive, setCameraActive] = useState(false);
  const [focusPoint, setFocusPoint] = useState(null);
  const scannerRef = useRef(null);
  const scanInProgressRef = useRef(false);
  const fileInputRef = useRef(null);
  const localScanCountRef = useRef(0); // optimistic counter for mass scanning (40k+ events)
  const idCardNameRef = useRef(null);

  // Auto-resize ID card name to fit container
  useEffect(() => {
    if (showPrintModal && idCardNameRef.current) {
      const el = idCardNameRef.current;
      const parent = el.parentElement;
      if (!parent) return;
      const parentWidth = parent.clientWidth;
      // Reset to base size first
      el.style.fontSize = '';
      el.style.transform = 'scale(1)';
      // Binary search for best font size
      let minSize = 10;
      let maxSize = 54; // ~3.4rem in px
      let bestSize = maxSize;
      for (let i = 0; i < 10; i++) {
        const mid = (minSize + maxSize) / 2;
        el.style.fontSize = mid + 'px';
        const textWidth = el.scrollWidth;
        if (textWidth > parentWidth) {
          maxSize = mid;
        } else {
          bestSize = mid;
          minSize = mid;
        }
      }
      el.style.fontSize = bestSize + 'px';
    }
  }, [showPrintModal, selectedMember]);

  // Upcoming Events Management
  const [upcomingEventsList, setUpcomingEventsList] = useState([]);
  const [upcomingEventsLoading, setUpcomingEventsLoading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ title: '', description: '', image_url: '', event_date: '', event_time: '', location: '' });
  const [eventFormLoading, setEventFormLoading] = useState(false);
  const [eventImageUploading, setEventImageUploading] = useState(false);

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
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsLoggedIn(true);
          setUsername(data.session.user.email);
          const role = data.session.user.user_metadata?.role || 'admin';
          setUserRole(role);
          if (role === 'staff') {
            setActiveTab('eventScanner');
          }
        }
      } catch (err) {
        // silent
      } finally {
        setAuthLoading(false);
      }
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        setUsername(session.user.email);
        const role = session.user.user_metadata?.role || 'admin';
        setUserRole(role);
        if (role === 'staff') {
          setActiveTab('eventScanner');
        }
      } else {
        setUsername('');
        setUserRole('admin');
        setRecentRegistrations([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Auto-logout after 30 minutes of inactivity ──
  useEffect(() => {
    if (!isLoggedIn) return;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        handleLogout();
      }, INACTIVITY_LIMIT);
    };
    resetTimer();
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) fetchDashboardData();
  }, [isLoggedIn]);

  // Fetch data for restored activeTab after login/refresh
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === 'registrations') fetchAllRegistrations();
    if (activeTab === 'members' && allRegs.length === 0) fetchAllRegistrations();
    if (activeTab === 'network' && allRegs.length === 0) fetchAllRegistrations();
    if (activeTab === 'residents') fetchAllResidents(residentsPage, residentSearch, resFilterBarangay, resFilterPrecinct, resFilterStatus);
    if (activeTab === 'eventScanner') fetchEvents();
    if (activeTab === 'events') fetchUpcomingEvents();
    if (activeTab === 'reports') fetchReportsData();
    if (activeTab === 'adminLogs') fetchAdminLogs();
  }, [isLoggedIn, activeTab]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Reset residents page and refetch when search or filters change (debounced)
  useEffect(() => {
    setResidentsPage(1);
    if (activeTab !== 'residents') return;
    const timer = setTimeout(() => {
      fetchAllResidents(1, residentSearch, resFilterBarangay, resFilterPrecinct, resFilterStatus);
    }, 300);
    return () => clearTimeout(timer);
  }, [residentSearch, resFilterBarangay, resFilterPrecinct, resFilterStatus]);

  // Fetch scan history when member profile is opened
  useEffect(() => {
    if (selectedMember) {
      fetchMemberScanHistory(selectedMember.id);
    }
  }, [selectedMember]);

  // Auto-fetch messages when switching to history tab
  useEffect(() => {
    if (activeTab === 'messages' && msgTab === 'history') {
      fetchMessages();
    }
  }, [activeTab, msgTab]);

  // Auto-fetch birthday celebrators when switching to birthday tab
  useEffect(() => {
    if (activeTab === 'messages' && msgTab === 'birthday') {
      fetchBirthdayCelebrators();
    }
  }, [activeTab, msgTab]);

  // Check SMS provider status when opening Messages tab
  useEffect(() => {
    if (activeTab === 'messages') {
      authFetch('/api/send-sms?status=1')
        .then(r => r.json())
        .then(data => setSmsProvider(data))
        .catch(() => setSmsProvider({ configured: false }));
    }
  }, [activeTab]);

  // Auto-fetch contact inquiries when switching to inquiries tab
  useEffect(() => {
    if (activeTab === 'messages' && msgTab === 'inquiries') {
      fetchContactInquiries();
    }
  }, [activeTab, msgTab]);

  // Auto-polling for Live Traffic Monitor
  useEffect(() => {
    let intervalId = null;
    if (activeTab === 'eventScanner' && selectedEvent && scannerInputMode === 'traffic') {
      // Fetch immediately
      fetchEventScans(selectedEvent.id);
      
      // Setup polling every 3 seconds
      intervalId = setInterval(() => {
        fetchEventScans(selectedEvent.id);
      }, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, selectedEvent, scannerInputMode]);

  // ─── Print Scanner Camera ───
  const stopPrintCamera = async () => {
    const instance = printScannerRef.current;
    if (instance) {
      try { await instance.stop(); } catch (_) {}
      printScannerRef.current = null;
    }
    setPrintCameraActive(false);
  };

  const startPrintCamera = async () => {
    if (printScannerRef.current) {
      try { await printScannerRef.current.stop(); } catch (_) {}
      printScannerRef.current = null;
    }
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const qr = new Html5Qrcode('print-scanner-camera');
      printScannerRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        { fps: 30, aspectRatio: 1.0 },
        (decodedText) => {
          if (printScanInProgressRef.current) return;
          printScanInProgressRef.current = true;
          handlePrintScan(decodedText);
        },
        () => {}
      );
      setPrintCameraActive(true);
    } catch (err) {
      setPrintScanMode('manual');
    }
  };

  const handlePrintScan = async (rawToken) => {
    if (!rawToken.trim()) { printScanInProgressRef.current = false; return; }
    setScanQrLoading(true);
    setScanQrResult(null);
    try {
      let clean = rawToken.trim().replace(/[^\x20-\x7E]/g, '').replace(/\s/g, '').replace(/^\uFEFF/, '');
      const urlMatch = clean.match(/\/card\/(EM[A-Za-z0-9-]+)/);
      if (urlMatch) clean = urlMatch[1];

      const { data: reg, error: regErr } = await supabase
        .from('registrations')
        .select('id, qr_token, em_card_no, printed_at, first_name, last_name, middle_name, suffix, purok, barangay, contact, photo_url, photo_base64, status')
        .ilike('qr_token', clean)
        .eq('status', 'Approved')
        .maybeSingle();

      if (regErr || !reg) {
        setScanQrResult({ type: 'error', message: 'QR not found. This ID is not registered or not approved.' });
        stopPrintCamera();
      } else if (reg.printed_at) {
        setScanQrResult({
          type: 'info',
          message: `Already marked as printed on ${new Date(reg.printed_at).toLocaleDateString()}`,
          member: {
            name: `${reg.first_name || ''} ${reg.middle_name ? reg.middle_name + ' ' : ''}${reg.last_name || ''}${reg.suffix ? ' ' + reg.suffix : ''}`.trim(),
            photo: reg.photo_url || reg.photo_base64,
            barangay: reg.barangay || '-',
            purok: reg.purok || '-',
            contact: reg.contact || '-',
            emCardNo: reg.em_card_no || '-',
          }
        });
        stopPrintCamera();
      } else {
        const { error } = await supabase.from('registrations').update({ printed_at: new Date().toISOString() }).eq('id', reg.id);
        if (error) throw error;
        logAdminAction('scan_event', 'registrations', reg.id, `${reg.first_name || ''} ${reg.last_name || ''}`.trim(), { action: 'mark_printed', em_card_no: reg.em_card_no });
        setScanQrResult({
          type: 'success',
          message: `ID for ${reg.first_name || ''} ${reg.last_name || ''} marked as printed!`,
          member: {
            name: `${reg.first_name || ''} ${reg.middle_name ? reg.middle_name + ' ' : ''}${reg.last_name || ''}${reg.suffix ? ' ' + reg.suffix : ''}`.trim(),
            photo: reg.photo_url || reg.photo_base64,
            barangay: reg.barangay || '-',
            purok: reg.purok || '-',
            contact: reg.contact || '-',
            emCardNo: reg.em_card_no || '-',
          }
        });
        fetchAllRegistrations();
        stopPrintCamera();
      }
    } catch (err) {
      setScanQrResult({ type: 'error', message: err.message || 'Failed to mark as printed.' });
      stopPrintCamera();
    } finally {
      setScanQrLoading(false);
      printScanInProgressRef.current = false;
      setScanQrToken('');
    }
  };

  useEffect(() => {
    if (scanQrMember && printScanMode === 'camera') {
      startPrintCamera();
    }
    return () => {
      stopPrintCamera();
    };
  }, [scanQrMember, printScanMode]);

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

  // Define startCamera at component level so resetScanState can call it
  const startCamera = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (_) {}
      scannerRef.current = null;
    }
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const qr = new Html5Qrcode('event-scanner-camera');
      scannerRef.current = qr;

      await qr.start(
        { facingMode: 'environment' },
        { fps: 30, aspectRatio: 1.0 },
        (decodedText) => {
          if (scanInProgressRef.current) return;
          scanInProgressRef.current = true;
          // Stop scanner immediately to prevent multiple detections
          try { qr.stop(); } catch (_) {}
          setCameraActive(false);
          handleEventScan(decodedText);
        },
        () => {}
      );

      setCameraActive(true);
    } catch (err) {
      setCameraActive(false);
    }
  };

  const handleTapFocus = async (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

    if (isIOS) {
      // iOS Safari doesn't support applyConstraints for focus.
      // Restart the camera stream to force fresh autofocus.
      try {
        await stopScanner();
        await new Promise(r => setTimeout(r, 150)); // let iOS release camera
        await startCamera();
      } catch (_) {}
    } else {
      // Android / Desktop: try native single-shot focus
      try {
        const video = document.querySelector('#event-scanner-camera video');
        if (video && video.srcObject) {
          const track = video.srcObject.getVideoTracks()[0];
          const caps = track.getCapabilities && track.getCapabilities();
          if (caps && caps.focusMode && caps.focusMode.includes('single-shot')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
          }
        }
      } catch (_) {}
    }

    // Clear focus reticle after 1.2s
    setTimeout(() => setFocusPoint(null), 1200);
  };

  useEffect(() => {
    if (scannerInputMode !== 'camera' || !selectedEvent) {
      stopScanner();
      return;
    }

    startCamera();

    return () => {
      stopScanner();
    };
  }, [scannerInputMode, selectedEvent]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const logAdminAction = async (action_type, target_table, target_id, target_name, details = {}) => {
    try {
      await authFetch('/api/admin-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_email: username || 'unknown',
          action_type,
          target_table: target_table || null,
          target_id: target_id || null,
          target_name: target_name || null,
          details,
        }),
      });
    } catch (err) {
      // silent
    }
  };

  const fetchCardProductionAnalytics = async () => {
    try {
      const { data: allRegs } = await supabase
        .from('registrations')
        .select('id, created_at, printed_at, status');

      if (!allRegs) return;

      // Count printed vs pending
      const printed = allRegs.filter(r => r.printed_at).length;
      const pending = allRegs.filter(r => !r.printed_at && r.status === 'Approved').length;
      setCardsPrinted(printed);
      setCardsPending(pending);

      // Calculate average days to print
      const printedRegs = allRegs.filter(r => r.printed_at && r.created_at);
      let totalDays = 0;
      printedRegs.forEach(r => {
        const created = new Date(r.created_at);
        const printed = new Date(r.printed_at);
        const days = Math.floor((printed - created) / (1000 * 60 * 60 * 24));
        totalDays += days;
      });
      const avgDays = printedRegs.length > 0 ? Math.round(totalDays / printedRegs.length) : 0;
      setAvgDaysToPrint(avgDays);

      // Monthly printing trend (last 12 months)
      const monthlyData = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        monthlyData[monthKey] = 0;
      }

      printedRegs.forEach(r => {
        const printedDate = new Date(r.printed_at);
        const monthKey = printedDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (monthlyData.hasOwnProperty(monthKey)) {
          monthlyData[monthKey]++;
        }
      });

      setMonthlyPrintingTrend(Object.entries(monthlyData).map(([month, count]) => ({ month, count })));
    } catch (err) {
      // silent
    }
  };

  const fetchEventAttendanceAnalytics = async () => {
    try {
      // Fetch all events with their scan counts
      const { data: allEvents } = await supabase
        .from('scan_events')
        .select('id, event_name, event_date, location')
        .order('created_at', { ascending: false });

      if (!allEvents || allEvents.length === 0) {
        setEventAttendanceData([]);
        setTopEvents([]);
        setMemberEngagementScore(0);
        return;
      }

      // Get scan counts for each event
      const eventData = [];
      for (const event of allEvents) {
        const { count } = await supabase
          .from('event_scans')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        eventData.push({
          id: event.id,
          event_name: event.event_name,
          event_date: event.event_date,
          location: event.location,
          attendance: count || 0,
        });
      }

      // Calculate attendance rate (attendance / total members)
      const { count: totalMembers } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved');

      const memberCount = totalMembers || 1;
      const eventDataWithRate = eventData.map(e => ({
        ...e,
        attendanceRate: Math.round((e.attendance / memberCount) * 100),
      }));

      // Get top 5 most attended events
      const top5 = eventDataWithRate
        .sort((a, b) => b.attendance - a.attendance)
        .slice(0, 5);

      // Calculate member engagement score (% of members who attended at least one event)
      const { data: memberScans } = await supabase
        .from('event_scans')
        .select('registration_id', { count: 'exact' });

      const uniqueMembers = new Set((memberScans || []).map(s => s.registration_id)).size;
      const engagementScore = Math.round((uniqueMembers / memberCount) * 100);

      setEventAttendanceData(eventDataWithRate);
      setTopEvents(top5);
      setMemberEngagementScore(engagementScore);
    } catch (err) {
      // silent
    }
  };

  const fetchGeographicDistributionAnalytics = async () => {
    try {
      // Fetch resident counts by barangay using RPC (accurate count)
      const { data: votersByBarangay, error: vErr } = await supabase
        .rpc('get_voters_by_barangay');
      if (vErr) throw vErr;

      // Fetch registration counts by barangay using RPC
      const { data: regsByBarangay, error: rErr } = await supabase
        .rpc('get_regs_by_barangay');
      if (rErr) throw rErr;

      // Create maps for easy lookup
      const residentsMap = {};
      (votersByBarangay || []).forEach(v => {
        residentsMap[v.barangay] = v.count;
      });

      const regsMap = {};
      (regsByBarangay || []).forEach(r => {
        regsMap[r.barangay] = r.count;
      });

      // Calculate registration rates
      const geoData = Object.entries(residentsMap).map(([barangay, totalResidents]) => {
        const registered = regsMap[barangay] || 0;
        const registrationRate = totalResidents > 0 ? Math.round((registered / totalResidents) * 100) : 0;
        return {
          barangay,
          registered,
          totalResidents,
          registrationRate,
        };
      });

      // Sort by registration rate (descending)
      geoData.sort((a, b) => b.registrationRate - a.registrationRate);

      // Find highest and lowest
      const highest = geoData.length > 0 ? geoData[0] : null;
      const lowest = geoData.length > 0 ? geoData[geoData.length - 1] : null;

      // Identify underserved communities (registration rate < 30%)
      const underserved = geoData.filter(g => g.registrationRate < 30);

      setGeoDistributionData(geoData);
      setHighestRegistrationArea(highest);
      setLowestRegistrationArea(lowest);
      setUnderservedCommunities(underserved);
    } catch (err) {
      // silent
    }
  };

  const fetchMemberGrowthTrends = async () => {
    try {
      // Fetch all registrations with creation dates
      const { data: allRegs } = await supabase
        .from('registrations')
        .select('id, created_at, status')
        .order('created_at', { ascending: true });

      if (!allRegs || allRegs.length === 0) {
        setGrowthTrendData([]);
        setGrowthComparison({ current: 0, previous: 0, percentChange: 0 });
        setProjectedGrowth(0);
        return;
      }

      const now = new Date();

      // Generate monthly trend data (last 12 months)
      const monthlyData = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        monthlyData[monthKey] = 0;
      }

      // Count registrations by month
      allRegs.forEach(reg => {
        const regDate = new Date(reg.created_at);
        const monthKey = regDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        if (monthlyData.hasOwnProperty(monthKey)) {
          monthlyData[monthKey]++;
        }
      });

      const trendArray = Object.entries(monthlyData).map(([month, count]) => ({ month, count }));
      setGrowthTrendData(trendArray);

      // Calculate comparison: current month vs previous month
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const currentMonthRegs = allRegs.filter(r => {
        const d = new Date(r.created_at);
        return d >= currentMonthStart && d <= now;
      }).length;

      const previousMonthRegs = allRegs.filter(r => {
        const d = new Date(r.created_at);
        return d >= previousMonthStart && d <= previousMonthEnd;
      }).length;

      const percentChange = previousMonthRegs > 0 
        ? Math.round(((currentMonthRegs - previousMonthRegs) / previousMonthRegs) * 100)
        : (currentMonthRegs > 0 ? 100 : 0);

      setGrowthComparison({
        current: currentMonthRegs,
        previous: previousMonthRegs,
        percentChange,
      });

      // Calculate projected growth (simple linear projection based on last 3 months)
      const last3Months = trendArray.slice(-3);
      if (last3Months.length >= 2) {
        const avgGrowth = last3Months.reduce((sum, m) => sum + m.count, 0) / last3Months.length;
        const projectedNextMonth = Math.round(currentMonthRegs + avgGrowth);
        setProjectedGrowth(projectedNextMonth);
      } else {
        setProjectedGrowth(currentMonthRegs);
      }
    } catch (err) {
      // silent
    }
  };

  const fetchDemographicBreakdown = async () => {
    try {
      // Fetch all approved registrations with sector and birthday data
      const { data: allRegs, error } = await supabase
        .from('registrations')
        .select('id, sector_category, status, birthday')
        .eq('status', 'Approved');

      if (error) {
        setSectorBreakdown([]);
        setGenderBreakdown([]);
        setAgeDistribution([]);
        return;
      }

      if (!allRegs || allRegs.length === 0) {
        setSectorBreakdown([]);
        setGenderBreakdown([]);
        setAgeDistribution([]);
        return;
      }

      // Count by sector
      const sectorStats = {};
      allRegs.forEach(reg => {
        const sector = reg.sector_category || 'Unspecified';
        sectorStats[sector] = (sectorStats[sector] || 0) + 1;
      });

      const sectorData = Object.entries(sectorStats)
        .map(([sector, count]) => ({
          sector,
          count,
          percentage: Math.round((count / allRegs.length) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      setSectorBreakdown(sectorData);

      // Calculate age distribution from birthdays
      const now = new Date();
      const ageGroups = {
        '13-17': 0,
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55-64': 0,
        '65+': 0,
      };

      const getBirthYear = (birthdayStr) => {
        if (!birthdayStr) return null;
        try {
          // Handle ISO format / timestamp: "1990-01-01" or "1990-01-01T00:00:00Z"
          if (/^\d{4}-\d{2}-\d{2}/.test(birthdayStr)) {
            return parseInt(birthdayStr.slice(0, 4));
          }
          // Handle "Month Day, Year" format: "January 1, 1990"
          const parts = birthdayStr.split(',');
          if (parts.length >= 2) {
            return parseInt(parts[1].trim());
          }
          // Handle Date object or other string formats
          const d = new Date(birthdayStr);
          if (!isNaN(d.getFullYear())) {
            return d.getFullYear();
          }
        } catch (e) {
          // Invalid format
        }
        return null;
      };

      allRegs.forEach(reg => {
        const birthYear = getBirthYear(reg.birthday);
        if (birthYear) {
          const age = now.getFullYear() - birthYear;
          if (age >= 13 && age <= 17) ageGroups['13-17']++;
          else if (age >= 18 && age <= 24) ageGroups['18-24']++;
          else if (age >= 25 && age <= 34) ageGroups['25-34']++;
          else if (age >= 35 && age <= 44) ageGroups['35-44']++;
          else if (age >= 45 && age <= 54) ageGroups['45-54']++;
          else if (age >= 55 && age <= 64) ageGroups['55-64']++;
          else if (age >= 65) ageGroups['65+']++;
        }
      });

      const ageData = Object.entries(ageGroups)
        .map(([group, count]) => ({
          group,
          count,
          percentage: Math.round((count / allRegs.length) * 100),
        }))
        .filter(d => d.count > 0);

      setAgeDistribution(ageData);

      // Gender breakdown (if tracked in sector_category or other field)
      // For now, we'll create a placeholder based on available data
      const genderStats = {
        'All Members': allRegs.length,
      };

      const genderData = Object.entries(genderStats).map(([gender, count]) => ({
        gender,
        count,
        percentage: 100,
      }));

      setGenderBreakdown(genderData);
    } catch (err) {
      // silent
    }
  };

  const fetchReferralNetworkAnalytics = async () => {
    try {
      // Fetch all registrations with referral data
      const { data: allRegs } = await supabase
        .from('registrations')
        .select('id, referral_name, status, created_at');

      if (!allRegs || allRegs.length === 0) {
        setTopReferrers([]);
        setReferralSuccessRate(0);
        setNetworkGrowthData([]);
        return;
      }

      // Count referrals by referrer name
      const referrerStats = {};
      allRegs.forEach(reg => {
        if (reg.referral_name && reg.referral_name.trim()) {
          const referrer = reg.referral_name.trim();
          if (!referrerStats[referrer]) {
            referrerStats[referrer] = { total: 0, approved: 0 };
          }
          referrerStats[referrer].total++;
          if (reg.status === 'Approved') referrerStats[referrer].approved++;
        }
      });

      // Calculate success rates and sort by total referrals
      const referrerData = Object.entries(referrerStats)
        .map(([name, stats]) => ({
          name,
          totalReferred: stats.total,
          approved: stats.approved,
          successRate: Math.round((stats.approved / stats.total) * 100),
        }))
        .sort((a, b) => b.totalReferred - a.totalReferred)
        .slice(0, 10); // Top 10 referrers

      setTopReferrers(referrerData);

      // Calculate overall referral success rate
      const totalReferrals = Object.values(referrerStats).reduce((sum, s) => sum + s.total, 0);
      const approvedReferrals = Object.values(referrerStats).reduce((sum, s) => sum + s.approved, 0);
      const overallSuccessRate = totalReferrals > 0 ? Math.round((approvedReferrals / totalReferrals) * 100) : 0;
      setReferralSuccessRate(overallSuccessRate);

      // Network growth visualization (referrals over time)
      const now = new Date();
      const monthlyReferrals = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        monthlyReferrals[monthKey] = 0;
      }

      allRegs.forEach(reg => {
        if (reg.referral_name && reg.referral_name.trim()) {
          const regDate = new Date(reg.created_at);
          const monthKey = regDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
          if (monthlyReferrals.hasOwnProperty(monthKey)) {
            monthlyReferrals[monthKey]++;
          }
        }
      });

      const networkData = Object.entries(monthlyReferrals)
        .map(([month, count]) => ({ month, count }));

      setNetworkGrowthData(networkData);
    } catch (err) {
      // silent
    }
  };

  const fetchComparativeAnalytics = async () => {
    try {
      // Fetch all registrations with dates and barangay
      const { data: allRegs } = await supabase
        .from('registrations')
        .select('id, created_at, barangay, status, ValidResidents(barangay)')
        .eq('status', 'Approved');

      if (!allRegs || allRegs.length === 0) {
        setMonthComparison({ thisMonth: 0, lastMonth: 0, change: 0, percentChange: 0 });
        setBarangayComparison([]);
        setYearOverYearData([]);
        return;
      }

      const now = new Date();

      // Month-to-month comparison
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthRegs = allRegs.filter(r => {
        const d = new Date(r.created_at);
        return d >= currentMonthStart && d <= now;
      }).length;

      const lastMonthRegs = allRegs.filter(r => {
        const d = new Date(r.created_at);
        return d >= previousMonthStart && d <= previousMonthEnd;
      }).length;

      const monthChange = thisMonthRegs - lastMonthRegs;
      const monthPercentChange = lastMonthRegs > 0 ? Math.round((monthChange / lastMonthRegs) * 100) : (thisMonthRegs > 0 ? 100 : 0);

      setMonthComparison({
        thisMonth: thisMonthRegs,
        lastMonth: lastMonthRegs,
        change: monthChange,
        percentChange: monthPercentChange,
      });

      // Barangay performance comparison (this month vs last month)
      const barangayMonthly = {};
      allRegs.forEach(reg => {
        const barangay = reg.barangay || reg.ValidResidents?.barangay || 'Unknown';
        const regDate = new Date(reg.created_at);
        const isThisMonth = regDate >= currentMonthStart && regDate <= now;
        const isLastMonth = regDate >= previousMonthStart && regDate <= previousMonthEnd;

        if (!barangayMonthly[barangay]) {
          barangayMonthly[barangay] = { thisMonth: 0, lastMonth: 0 };
        }
        if (isThisMonth) barangayMonthly[barangay].thisMonth++;
        if (isLastMonth) barangayMonthly[barangay].lastMonth++;
      });

      const barangayData = Object.entries(barangayMonthly)
        .map(([barangay, stats]) => ({
          barangay,
          thisMonth: stats.thisMonth,
          lastMonth: stats.lastMonth,
          change: stats.thisMonth - stats.lastMonth,
          percentChange: stats.lastMonth > 0 ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100) : (stats.thisMonth > 0 ? 100 : 0),
        }))
        .sort((a, b) => b.thisMonth - a.thisMonth)
        .slice(0, 8); // Top 8 barangays

      setBarangayComparison(barangayData);

      // Year-over-year comparison (this month vs same month last year)
      const currentYear = now.getFullYear();
      const lastYear = currentYear - 1;
      const currentMonth = now.getMonth();

      const thisYearMonthStart = new Date(currentYear, currentMonth, 1);
      const thisYearMonthEnd = new Date(currentYear, currentMonth + 1, 0);
      const lastYearMonthStart = new Date(lastYear, currentMonth, 1);
      const lastYearMonthEnd = new Date(lastYear, currentMonth + 1, 0);

      const thisYearRegs = allRegs.filter(r => {
        const d = new Date(r.created_at);
        return d >= thisYearMonthStart && d <= thisYearMonthEnd;
      }).length;

      const lastYearRegs = allRegs.filter(r => {
        const d = new Date(r.created_at);
        return d >= lastYearMonthStart && d <= lastYearMonthEnd;
      }).length;

      // Generate monthly comparison for last 12 months
      const monthlyYoY = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toLocaleString('en-US', { month: 'short' });
        monthlyYoY[monthKey] = { thisYear: 0, lastYear: 0 };
      }

      allRegs.forEach(reg => {
        const regDate = new Date(reg.created_at);
        const monthKey = regDate.toLocaleString('en-US', { month: 'short' });
        const regYear = regDate.getFullYear();

        if (monthlyYoY.hasOwnProperty(monthKey)) {
          if (regYear === currentYear) monthlyYoY[monthKey].thisYear++;
          else if (regYear === lastYear) monthlyYoY[monthKey].lastYear++;
        }
      });

      const yoyData = Object.entries(monthlyYoY)
        .map(([month, stats]) => ({
          month,
          thisYear: stats.thisYear,
          lastYear: stats.lastYear,
          change: stats.thisYear - stats.lastYear,
        }));

      setYearOverYearData(yoyData);
    } catch (err) {
      // silent
    }
  };

  const fetchDashboardData = async () => {
    setDashLoading(true);
    try {
      // Fetch analytics from server-side API (uses service role key, no row limit)
      const analyticsRes = await authFetch('/api/analytics');
      const analytics = await analyticsRes.json();

      if (analytics.error) throw new Error(analytics.error);

      // Recent registrations (still fetch directly — small data)
      const { data: recentData } = await supabase
        .from('registrations')
        .select('id, resident_id, first_name, middle_name, last_name, suffix, is_valid_resident, house_no, purok, lot, block, phase, barangay, contact, status, gender, civil_status, sector_category, referral_name, photo_url, birthday, created_at, qr_token, em_card_no, scan_count, last_scanned_at, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
        .order('created_at', { ascending: false })
        .limit(10);

      setTotalResidents(analytics.totalResidents || 0);
      setTotalRegistrations(analytics.totalRegistrations || 0);
      // Approved members count
      const { count: approvedCount } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved');
      setTotalApprovedMembers(approvedCount || 0);
      setThisMonthRegs(analytics.thisMonthRegs || 0);
      setLastMonthRegs(analytics.lastMonthRegs || 0);
      setRecentRegistrations(recentData || []);
      setVotersByBarangay(analytics.votersByBarangay || []);
      setRegsByBarangay(analytics.regsByBarangay || []);
      setAidByBarangay(analytics.aidByBarangay || []);

      // Fetch card production analytics
      await fetchCardProductionAnalytics();

      // Fetch event attendance analytics
      await fetchEventAttendanceAnalytics();

      // Fetch geographic distribution analytics
      await fetchGeographicDistributionAnalytics();

      // Fetch member growth trends
      await fetchMemberGrowthTrends();

      // Fetch demographic breakdown
      await fetchDemographicBreakdown();

      // Fetch referral network analytics
      await fetchReferralNetworkAnalytics();

      // Fetch comparative analytics
      await fetchComparativeAnalytics();
    } catch (err) {
      // silent
    } finally {
      setDashLoading(false);
    }
  };

  const smartMatchesResident = (res, queryStr) => {
    const fullName = `${res.first_name || ''} ${res.middle_name ? res.middle_name + ' ' : ''}${res.last_name || ''}${res.suffix ? ' ' + res.suffix : ''}`.trim().toLowerCase();
    const queryLower = queryStr.toLowerCase().replace(/[,.-]/g, ' ').trim();
    if (!queryLower) return true;
    if (fullName.includes(queryLower)) return true;

    const tokens = queryLower.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    const particles = new Set(['de', 'la', 'del', 'san', 'santa', 'dos', 'das', 'van', 'von', 'di', 'der', 'den']);
    const significantTokens = tokens.filter(t => t.length > 2 && !particles.has(t));
    if (significantTokens.length === 0) {
      return tokens.some(t => fullName.includes(t));
    }
    return significantTokens.every(token => fullName.includes(token));
  };

  const smartMatchesMember = (reg, queryStr) => {
    const r = reg.ValidResidents || {};
    const fullName = `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}`.trim().toLowerCase();
    const emCard = (reg.em_card_no || '').toLowerCase();
    const queryLower = queryStr.toLowerCase().replace(/[,.]/g, ' ').trim();
    if (!queryLower) return true;
    if (fullName.includes(queryLower)) return true;
    if (emCard.includes(queryLower.replace(/\s+/g, ''))) return true;

    const tokens = queryLower.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    const particles = new Set(['de', 'la', 'del', 'san', 'santa', 'dos', 'das', 'van', 'von', 'di', 'der', 'den']);
    const significantTokens = tokens.filter(t => t.length > 2 && !particles.has(t));
    if (significantTokens.length === 0) {
      return tokens.some(t => fullName.includes(t) || emCard.includes(t));
    }
    return significantTokens.every(token => fullName.includes(token) || emCard.includes(token));
  };

  const fetchAllResidents = async (page = residentsPage, search = residentSearch, barangayFilter = resFilterBarangay, precinctFilter = resFilterPrecinct, statusFilter = resFilterStatus) => {
    setResidentsLoading(true);
    try {
      const query = search.trim();

      const buildQuery = (qb) => {
        if (barangayFilter) qb = qb.eq('barangay', barangayFilter);
        if (precinctFilter) qb = qb.eq('precinct', precinctFilter);
        if (statusFilter) qb = qb.eq('status', statusFilter);
        return qb;
      };

      if (!query) {
        const start = (page - 1) * residentsPerPage;
        const end = start + residentsPerPage - 1;
        let qb = supabase
          .from('ValidResidents')
          .select('*', { count: 'exact' })
          .order('last_name', { ascending: true })
          .range(start, end);
        qb = buildQuery(qb);
        const { data, count, error } = await qb;
        if (error) throw error;
        setAllResidents(data || []);
        setResidentsCount(count || 0);
        return;
      }

      const q = query.toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      const searchTokens = tokens.filter(t => t.length >= 2);
      if (searchTokens.length === 0) searchTokens.push(tokens[0]);

      let candidates = [];

      if (searchTokens.length >= 2) {
        const first = searchTokens[0];
        const last = searchTokens[searchTokens.length - 1];

        const [andRes, orRes] = await Promise.all([
          supabase
            .from('ValidResidents')
            .select('*')
            .or(`first_name.ilike.%${first}%,middle_name.ilike.%${first}%`)
            .or(`last_name.ilike.%${last}%,middle_name.ilike.%${last}%`)
            .order('last_name', { ascending: true })
            .limit(100),
          supabase
            .from('ValidResidents')
            .select('*')
            .or(`first_name.ilike.%${first}%,last_name.ilike.%${first}%,middle_name.ilike.%${first}%`)
            .order('last_name', { ascending: true })
            .limit(100),
        ]);

        const andData = andRes.data || [];
        const orData = orRes.data || [];
        const seen = new Set();
        candidates = [];
        for (const r of andData) {
          if (!seen.has(r.id)) { seen.add(r.id); candidates.push(r); }
        }
        for (const r of orData) {
          if (!seen.has(r.id)) { seen.add(r.id); candidates.push(r); }
        }
      } else {
        const { data } = await supabase
          .from('ValidResidents')
          .select('*')
          .or(`first_name.ilike.%${searchTokens[0]}%,last_name.ilike.%${searchTokens[0]}%,middle_name.ilike.%${searchTokens[0]}%,barangay.ilike.%${searchTokens[0]}%,precinct.ilike.%${searchTokens[0]}%`)
          .order('last_name', { ascending: true })
          .limit(100);
        candidates = data || [];
      }

      // Apply column filters on search candidates
      if (barangayFilter) candidates = candidates.filter(r => r.barangay === barangayFilter);
      if (precinctFilter) candidates = candidates.filter(r => r.precinct === precinctFilter);
      if (statusFilter) candidates = candidates.filter(r => r.status === statusFilter);

      const scored = candidates.map(r => {
        const fullName = `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}`.trim().toLowerCase();
        const score = tokens.filter(t => fullName.includes(t)).length;
        return { ...r, score };
      });

      let results = scored.filter(r => smartMatchesResident(r, query));
      results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return fullNameStr(a).localeCompare(fullNameStr(b));
      });

      const start = (page - 1) * residentsPerPage;
      setAllResidents(results.slice(start, start + residentsPerPage));
      setResidentsCount(results.length);
    } catch (err) {
      // silent
    } finally {
      setResidentsLoading(false);
    }
  };

  const fullNameStr = (r) => `${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}, ${r.first_name || ''}${r.middle_name ? ' ' + r.middle_name : ''}`;

  const fetchAllRegistrations = async () => {
    setRegsLoading(true);
    try {
      const { data } = await supabase
        .from('registrations')
        .select('id, resident_id, reference_no, first_name, middle_name, last_name, suffix, is_valid_resident, house_no, purok, lot, block, phase, barangay, contact, status, gender, civil_status, sector_category, referral_name, photo_url, birthday, created_at, qr_token, em_card_no, scan_count, last_scanned_at, printed_at, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
        .order('created_at', { ascending: false });
      setAllRegs(data || []);
    } catch (err) {
      // silent
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

  const fetchMemberScanHistory = async (registrationId) => {
    if (!registrationId) return;
    setMemberScanHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_scans')
        .select('*, scan_events(event_name, event_date, location)')
        .eq('registration_id', registrationId)
        .order('scanned_at', { ascending: false })
        .limit(50);
      if (!error) setMemberScanHistory(data || []);
    } catch (e) { /* silent */ }
    setMemberScanHistoryLoading(false);
  };

  const openEditMember = (reg) => {
    const r = reg.ValidResidents || {};
    setEditMemberForm({
      first_name: r.first_name || '',
      middle_name: r.middle_name || '',
      last_name: r.last_name || '',
      suffix: r.suffix || '',
      barangay: r.barangay || '',
      house_no: reg.house_no || '',
      purok: reg.purok || '',
      contact: reg.contact || '',
      sector_category: reg.sector_category || '',
      gender: reg.gender || '',
      civil_status: reg.civil_status || '',
      lot: reg.lot || '',
      block: reg.block || '',
      phase: reg.phase || '',
      referral_name: reg.referral_name || '',
      birthday: reg.birthday || '',
    });
    setMemberEditMode(true);
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    setEditMemberLoading(true);
    try {
      // Update ValidResidents (name + barangay)
      if (selectedMember.resident_id) {
        const { error: resError } = await supabase
          .from('ValidResidents')
          .update({
            first_name: editMemberForm.first_name,
            middle_name: editMemberForm.middle_name,
            last_name: editMemberForm.last_name,
            suffix: editMemberForm.suffix,
            barangay: editMemberForm.barangay,
          })
          .eq('id', selectedMember.resident_id);
        if (resError) throw resError;
      }

      // Update registrations
      const { error: regError } = await supabase
        .from('registrations')
        .update({
          house_no: SUBDIVISION_PUROKS.includes(editMemberForm.purok) ? null : editMemberForm.house_no,
          purok: editMemberForm.purok,
          barangay: editMemberForm.barangay,
          contact: editMemberForm.contact,
          sector_category: editMemberForm.sector_category,
          gender: editMemberForm.gender,
          civil_status: editMemberForm.civil_status,
          lot: SUBDIVISION_PUROKS.includes(editMemberForm.purok) ? editMemberForm.lot : null,
          block: SUBDIVISION_PUROKS.includes(editMemberForm.purok) ? editMemberForm.block : null,
          phase: SUBDIVISION_PUROKS.includes(editMemberForm.purok) ? editMemberForm.phase : null,
          referral_name: editMemberForm.referral_name,
          birthday: editMemberForm.birthday,
        })
        .eq('id', selectedMember.id);
      if (regError) throw regError;

      showToast('Member details updated successfully', 'success');
      logAdminAction('edit_member', 'registrations', selectedMember.id, `${editMemberForm.last_name}, ${editMemberForm.first_name}`, { barangay: editMemberForm.barangay, sector: editMemberForm.sector_category });
      setMemberEditMode(false);
      fetchAllRegistrations();
      // Refresh selectedMember with new data
      const { data: fresh } = await supabase
        .from('registrations')
        .select('id, resident_id, reference_no, first_name, middle_name, last_name, suffix, is_valid_resident, house_no, purok, lot, block, phase, barangay, contact, status, gender, civil_status, sector_category, referral_name, photo_base64, photo_url, birthday, created_at, qr_token, em_card_no, scan_count, last_scanned_at, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
        .eq('id', selectedMember.id)
        .single();
      if (fresh) setSelectedMember(fresh);
    } catch (err) {
      showToast(err.message || 'Failed to update member', 'error');
    } finally {
      setEditMemberLoading(false);
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
        const { data: reg } = await supabase
          .from('registrations')
          .select('first_name, last_name')
          .eq('id', id)
          .single();
        const targetName = reg ? `${reg.last_name || ''}, ${reg.first_name || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || null : null;
        logAdminAction('approve_member', 'registrations', id, targetName, { em_card_no: emCardNo });
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
        const { data: reg } = await supabase
          .from('registrations')
          .select('first_name, last_name')
          .eq('id', id)
          .single();
        const targetName = reg ? `${reg.last_name || ''}, ${reg.first_name || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || null : null;
        logAdminAction('reject_member', 'registrations', id, targetName, {});
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
        logAdminAction('login', null, null, null, { email: username });
      }
    } catch (err) {
      setLoginError('An unexpected error occurred.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    logAdminAction('logout', null, null, null, { email: username });
    await supabase.auth.signOut();
    setPassword('');
    setLoginError('');
    setSidebarOpen(false);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (createAccountForm.password !== createAccountForm.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (createAccountForm.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setCreateAccountLoading(true);
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createAccountForm.email.trim(),
          password: createAccountForm.password,
          role: createAccountForm.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Account created for ${data.user.email} (${data.user.role})`, 'success');
        setCreateAccountForm({ email: '', password: '', confirmPassword: '', role: 'staff' });
        setShowCreateAccount(false);
        if (activeTab === 'accounts') fetchAccounts();
      } else {
        showToast(data.error || 'Failed to create account', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setCreateAccountLoading(false);
    }
  };

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    try {
      const res = await authFetch('/api/admin/users');
      const data = await res.json();
      if (data.users) setAccounts(data.users);
    } catch (e) { /* silent */ }
    setAccountsLoading(false);
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (editAccountForm.password && editAccountForm.password !== editAccountForm.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (editAccountForm.password && editAccountForm.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setEditAccountLoading(true);
    try {
      const body = { id: editAccount.id, role: editAccountForm.role };
      if (editAccountForm.password) body.password = editAccountForm.password;
      const res = await authFetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        showToast('Account updated', 'success');
        setEditAccount(null);
        fetchAccounts();
      } else {
        showToast(data.error || 'Failed to update', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setEditAccountLoading(false);
    }
  };

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    if (tab === 'residents') fetchAllResidents(residentsPage, residentSearch, resFilterBarangay, resFilterPrecinct, resFilterStatus);
    if (tab === 'registrations') fetchAllRegistrations();
    if (tab === 'members' && allRegs.length === 0) fetchAllRegistrations();
    if (tab === 'network' && allRegs.length === 0) fetchAllRegistrations();
    if (tab === 'eventScanner') fetchEvents();
    if (tab === 'events') fetchUpcomingEvents();
    if (tab === 'reports') fetchReportsData();
    if (tab === 'accounts') fetchAccounts();
    if (tab === 'adminLogs') fetchAdminLogs();
    if (tab === 'system') fetchSystemStats();
  };

  const fetchUpcomingEvents = async () => {
    setUpcomingEventsLoading(true);
    try {
      const res = await fetch('/api/upcoming-events');
      const data = await res.json();
      if (data.events) setUpcomingEventsList(data.events);
    } catch (e) {
      // silent
    } finally {
      setUpcomingEventsLoading(false);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.event_date) {
      showToast('Title and event date are required', 'error');
      return;
    }
    setEventFormLoading(true);
    try {
      const method = editingEvent ? 'PUT' : 'POST';
      const body = editingEvent ? { ...eventForm, id: editingEvent.id } : eventForm;
      const res = await authFetch('/api/upcoming-events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.event || data.success) {
        showToast(editingEvent ? 'Event updated' : 'Event created', 'success');
        logAdminAction(editingEvent ? 'edit_event' : 'add_event', 'upcoming_events', editingEvent?.id || null, eventForm.title, { location: eventForm.location, date: eventForm.event_date });
        setShowEventForm(false);
        setEditingEvent(null);
        setEventForm({ title: '', description: '', image_url: '', event_date: '', event_time: '', location: '' });
        fetchUpcomingEvents();
      } else {
        showToast(data.error || 'Failed to save event', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setEventFormLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const evt = upcomingEventsList.find(e => e.id === id);
      const targetName = evt ? evt.title : null;
      const res = await authFetch(`/api/upcoming-events?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Event deleted', 'success');
        logAdminAction('delete_event', 'upcoming_events', id, targetName, {});
        fetchUpcomingEvents();
      } else {
        showToast(data.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    }
  };

  // Compress image to max 500KB and return Blob
  const compressImageToBlob = (file, maxKb = 500) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.92;
          const maxChars = maxKb * 1024;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) return reject(new Error('Compression failed'));
                if (blob.size <= maxChars) return resolve(blob);
                quality -= 0.05;
                if (quality > 0.15) {
                  canvas.toBlob(tryCompress, 'image/jpeg', quality);
                } else {
                  // Scale down dimensions
                  width = Math.round(width * 0.85);
                  height = Math.round(height * 0.85);
                  canvas.width = width;
                  canvas.height = height;
                  ctx.drawImage(img, 0, 0, width, height);
                  quality = 0.8;
                  canvas.toBlob(tryCompress, 'image/jpeg', quality);
                }
              },
              'image/jpeg',
              quality
            );
          };
          tryCompress();
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleEventImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }
    setEventImageUploading(true);
    try {
      const compressed = await compressImageToBlob(file, 500);
      const formData = new FormData();
      formData.append('file', compressed);
      const res = await authFetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('Bucket not found') || data.error?.includes('bucket not found')) {
          showToast('Storage bucket "event-images" not found. Create it in Supabase Dashboard → Storage.', 'error');
          return;
        }
        throw new Error(data.error || 'Upload failed');
      }
      setEventForm(f => ({ ...f, image_url: data.url }));
      showToast('Image uploaded', 'success');
    } catch (err) {
      showToast(err.message || 'Image upload failed', 'error');
    } finally {
      setEventImageUploading(false);
      e.target.value = '';
    }
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
      logAdminAction('bulk_upload', 'ValidResidents', null, `${formatted.length} residents`, { count: formatted.length });
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
        suffix: newResident.suffix,
        barangay: newResident.barangay,
        precinct: newResident.precinct,
        status: 'Verified'
      }]);
      if (error) throw error;

      showToast('Resident added successfully!', 'success');
      logAdminAction('add_resident', 'ValidResidents', null, `${newResident.last_name}, ${newResident.first_name}`, { barangay: newResident.barangay, precinct: newResident.precinct });
      fetchAllResidents();
      setShowAddModal(false);
      setNewResident({ last_name: '', first_name: '', middle_name: '', suffix: '', barangay: 'Borol 1st', precinct: '' });
    } catch (err) {
      const isTableMissing = err.message?.includes('404') || err.code === '42P01' || err.message?.includes('relation') || err.message?.includes('does not exist');
      setAddError(isTableMissing
        ? 'The "ValidResidents" table does not exist in Supabase. Please run the SQL setup script first.'
        : (err.message || 'Failed to add resident. Please try again.'));
    } finally {
      setAddLoading(false);
    }
  };

  const openEditResident = (res) => {
    setEditResidentForm({
      id: res.id,
      last_name: res.last_name || '',
      first_name: res.first_name || '',
      middle_name: res.middle_name || '',
      suffix: res.suffix || '',
      barangay: res.barangay || '',
      precinct: res.precinct || '',
      status: res.status || 'Verified',
    });
    setEditResidentError('');
    setShowEditResidentModal(true);
  };

  const handleUpdateResident = async (e) => {
    e.preventDefault();
    setEditResidentError('');
    setEditResidentLoading(true);
    try {
      const { error } = await supabase
        .from('ValidResidents')
        .update({
          last_name: editResidentForm.last_name,
          first_name: editResidentForm.first_name,
          middle_name: editResidentForm.middle_name,
          suffix: editResidentForm.suffix || null,
          barangay: editResidentForm.barangay,
          precinct: editResidentForm.precinct,
          status: editResidentForm.status,
        })
        .eq('id', editResidentForm.id);
      if (error) throw error;
      showToast('Resident updated successfully!', 'success');
      logAdminAction('edit_resident', 'ValidResidents', editResidentForm.id, `${editResidentForm.last_name}, ${editResidentForm.first_name}`, { barangay: editResidentForm.barangay, precinct: editResidentForm.precinct, status: editResidentForm.status });
      fetchAllResidents();
      setShowEditResidentModal(false);
      setEditResidentForm({ id: null, last_name: '', first_name: '', middle_name: '', suffix: '', barangay: '', precinct: '', status: '' });
    } catch (err) {
      setEditResidentError(err.message || 'Failed to update resident.');
    } finally {
      setEditResidentLoading(false);
    }
  };

  const handleDeleteResident = async () => {
    if (!deleteResidentId) return;
    setDeleteResidentLoading(true);
    try {
      const { error } = await supabase.from('ValidResidents').delete().eq('id', deleteResidentId);
      if (error) throw error;
      showToast('Resident deleted successfully!', 'success');
      logAdminAction('delete_resident', 'ValidResidents', deleteResidentId, deleteResidentName, {});
      fetchAllResidents();
      setShowDeleteResidentModal(false);
      setDeleteResidentId(null);
      setDeleteResidentName('');
    } catch (err) {
      showToast(err.message || 'Failed to delete resident.', 'error');
    } finally {
      setDeleteResidentLoading(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteMemberId) return;
    setDeleteMemberLoading(true);
    try {
      const res = await authFetch('/api/registrations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteMemberId }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Delete failed');
      }
      showToast('Member deleted successfully!', 'success');
      logAdminAction('delete_member', 'registrations', deleteMemberId, deleteMemberName, {});
      await fetchAllRegistrations();
      setShowDeleteMemberModal(false);
      setDeleteMemberId(null);
      setDeleteMemberName('');
    } catch (err) {
      showToast(err.message || 'Failed to delete member.', 'error');
    } finally {
      setDeleteMemberLoading(false);
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
    { id: 'events', label: 'Upcoming Events', icon: <Calendar size={20} strokeWidth={1.8} /> },
    { id: 'network', label: 'Network', icon: <Network size={20} strokeWidth={1.8} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={20} strokeWidth={1.8} /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} strokeWidth={1.8} /> },
    { id: 'accounts', label: 'Accounts', icon: <Shield size={20} strokeWidth={1.8} /> },
    { id: 'adminLogs', label: 'Admin Logs', icon: <History size={20} strokeWidth={1.8} /> },
    { id: 'system', label: 'System', icon: <Monitor size={20} strokeWidth={1.8} /> },
  ].filter(item => userRole !== 'staff' || item.id === 'eventScanner');

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
        {/* Mobile Navbar */}
        <div className="mobile-admin-header">
          <a href="/" className="mobile-admin-brand">
            <span className="mobile-admin-mark">EM</span>
            <span className="mobile-admin-name">EM Card</span>
          </a>
          <div className="mobile-admin-lang-toggle">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'ph' ? 'active' : ''} onClick={() => setLang('ph')}>PH</button>
          </div>
        </div>

        {/* Mobile Back Button */}
        <a href="/" className="mobile-admin-back-btn">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </a>

        {/* LEFT PANEL */}
        <div className="admin-login-left">
          <div className="admin-login-left-overlay" />
          <a href="/" className="admin-login-back"><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Homepage</a>
          <div className="admin-login-left-content">
            <div className="admin-login-welcome">
              <h1>
                <span>Welcome</span>
                <span>Back!</span>
              </h1>
              <p className="login-welcome-sub">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="admin-login-right">
          <div className="admin-login-right-content">
            <form onSubmit={handleLogin} className="admin-login-form-right">
              <div className="form-group">
                <label>Email Address</label>
                <div className="login-input-wrap-right">
                  <div className="login-icon-bg"><Mail size={18} strokeWidth={1.5} /></div>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your email address" required disabled={loginLoading} />
                </div>
              </div>

              <div className="form-group">
                <div className="login-label-row">
                  <label>Password</label>
                  <a href="#" className="login-forgot">Forgot Password?</a>
                </div>
                <div className="login-input-wrap-right">
                  <div className="login-icon-bg"><Lock size={18} strokeWidth={1.5} /></div>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={loginLoading} />
                  <button type="button" className="login-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <label className="login-remember">
                <span className="login-check-wrap">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span className="login-check-box"></span>
                </span>
                <span className="login-remember-text">Remember me</span>
              </label>

              {loginError && <p className="login-error">{String(loginError)}</p>}

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
    if (reg?.first_name || reg?.last_name) {
      return `${reg.first_name || ''} ${reg.middle_name ? reg.middle_name + ' ' : ''}${reg.last_name || ''}${reg.suffix ? ' ' + reg.suffix : ''}`.trim();
    }
    const r = reg?.ValidResidents;
    if (!r) return reg?.resident_id?.slice(0, 8) || '-';
    return `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}`.trim();
  };

  // MESSAGE HANDLERS (top-level, no hooks inside renderMessages)
  const fetchMessages = async () => {
    setMessagesLoading(true);
    try {
      const res = await authFetch('/api/send-sms');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      // silent
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchMsgRecipients = async (msgId) => {
    try {
      const res = await authFetch(`/api/send-sms?message_id=${msgId}`);
      const data = await res.json();
      setMsgRecipients(data.recipients || []);
      setSelectedMessage(msgId);
    } catch (err) {
      // silent
    }
  };

  const fetchContactInquiries = async () => {
    setContactInquiriesLoading(true);
    try {
      const res = await authFetch('/api/contact');
      const data = await res.json();
      setContactInquiries(data.messages || []);
    } catch (err) {
      // silent
    } finally {
      setContactInquiriesLoading(false);
    }
  };

  const searchSpecificUser = async (query) => {
    if (!query || query.length < 2) { setMsgUserResults([]); return; }
    try {
      const { data } = await supabase
        .from('registrations')
        .select('id, resident_id, contact, barangay, sector_category, referral_name, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
        .not('contact', 'is', null)
        .neq('contact', '')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`, { foreignTable: 'ValidResidents' })
        .limit(8);
      // Filter out entries without a valid name
      const valid = (data || []).filter(reg => reg.ValidResidents && (reg.ValidResidents.first_name || reg.ValidResidents.last_name));
      setMsgUserResults(valid);
    } catch (err) {
      setMsgUserResults([]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgForm.body.trim()) { showToast('Message body is required', 'error'); return; }
    setMsgSending(true);
    try {
      const res = await authFetch('/api/send-sms', {
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

  const fetchBirthdayCelebrators = async () => {
    setBirthdayLoading(true);
    try {
      const today = new Date();
      const todayMonthDay = `${today.toLocaleString('en-US', { month: 'long' })} ${today.getDate()}`;

      const { data: regs, error } = await supabase
        .from('registrations')
        .select('id, resident_id, contact, barangay, sector_category, birthday, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
        .eq('status', 'Approved')
        .not('contact', 'is', null)
        .neq('contact', '');

      if (error) throw error;

      const celebrators = (regs || []).filter(reg => {
        if (!reg.birthday) return false;
        const parts = reg.birthday.split(',');
        if (parts.length < 2) return false;
        const monthDay = parts[0].trim();
        return monthDay === todayMonthDay;
      });

      setBirthdayRecipients(celebrators);
    } catch (err) {
      showToast('Failed to load birthday celebrators', 'error');
    } finally {
      setBirthdayLoading(false);
    }
  };

  const handleSendBirthday = async () => {
    if (!birthdayMessage.trim()) { showToast('Message is required', 'error'); return; }
    if (birthdayRecipients.length === 0) { showToast('No birthday celebrators today', 'error'); return; }

    setBirthdaySending(true);
    try {
      const ids = birthdayRecipients.map(r => r.id);
      const res = await authFetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Birthday Greeting',
          messageBody: birthdayMessage,
          type: 'broadcast',
          targetType: 'birthday',
          targetValue: ids,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Birthday SMS sent to ${data.totalRecipients} celebrators`, 'success');
        fetchMessages();
      } else {
        showToast(data.error || 'Failed to send', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setBirthdaySending(false);
    }
  };

  // RENDER VIEWS
  const renderDashboard = () => {
    const thisMonth = dashLoading ? 0 : thisMonthRegs;
    const lastMonth = dashLoading ? 0 : lastMonthRegs;
    const regChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : (thisMonth > 0 ? 100 : 0);
    const regChangeStr = `${regChange >= 0 ? '↑' : '↓'} ${Math.abs(regChange).toFixed(1)}% vs last month`;
    const regChangeClass = regChange >= 0 ? 'up' : 'down';

    const currentRate = totalRegistrations / (totalResidents || 1);
    const lastMonthRate = (totalRegistrations - thisMonth) / (totalResidents || 1);
    const rateChange = (currentRate - lastMonthRate) * 100;
    const rateChangeStr = `${rateChange >= 0 ? '↑' : '↓'} ${Math.abs(rateChange).toFixed(1)}pp vs last month`;
    const rateChangeClass = rateChange >= 0 ? 'up' : 'down';

    return (
    <>
      {/* KPI Stat Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon kpi-green"><Users size={20} strokeWidth={1.5} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Registered Voters</span>
            {dashLoading ? <span className="kpi-skeleton" style={{ width: '80px', height: '28px' }} /> : <span className="kpi-value">{totalResidents.toLocaleString()}</span>}
            <span className={`kpi-change ${regChangeClass}`}>{regChangeStr}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-blue"><ClipboardList size={20} strokeWidth={1.5} /></div>
          <div className="kpi-body">
            <span className="kpi-label">EM Card Members</span>
            {dashLoading ? <span className="kpi-skeleton" style={{ width: '80px', height: '28px' }} /> : <span className="kpi-value">{totalApprovedMembers.toLocaleString()}</span>}
            <span className={`kpi-change ${regChangeClass}`}>{regChangeStr}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-amber"><CheckCircle size={20} strokeWidth={1.5} /></div>
          <div className="kpi-body">
            <span className="kpi-label">Registration Rate</span>
            {dashLoading ? <span className="kpi-skeleton" style={{ width: '60px', height: '28px' }} /> : <span className="kpi-value">{Math.round(currentRate * 100)}%</span>}
            <span className={`kpi-change ${rateChangeClass}`}>{rateChangeStr}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-purple"><Calendar size={20} strokeWidth={1.5} /></div>
          <div className="kpi-body">
            <span className="kpi-label">New This Month</span>
            {dashLoading ? <span className="kpi-skeleton" style={{ width: '70px', height: '28px' }} /> : <span className="kpi-value">{thisMonth.toLocaleString()}</span>}
            <span className={`kpi-change ${regChangeClass}`}>{regChangeStr}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="dashboard-quick-actions">
        <button className="quick-action-btn" onClick={() => handleNavClick('registrations')}>
          <ClipboardList size={18} />
          <span>Review Registrations</span>
          {allRegs.filter(r => r.status === 'Pending').length > 0 && (
            <span className="quick-action-badge">{allRegs.filter(r => r.status === 'Pending').length}</span>
          )}
        </button>
        <button className="quick-action-btn" onClick={() => handleNavClick('members')}>
          <Users size={18} />
          <span>View Members</span>
        </button>
        <button className="quick-action-btn" onClick={() => handleNavClick('residents')}>
          <Search size={18} />
          <span>Find Resident</span>
        </button>
        <button className="quick-action-btn" onClick={() => handleNavClick('eventScanner')}>
          <ScanLine size={18} />
          <span>Scan ID</span>
        </button>
        <button className="quick-action-btn" onClick={() => { setShowAddModal(true); setAddError(''); }}>
          <Plus size={18} />
          <span>Add Resident</span>
        </button>
      </div>

      {/* Pending Alert Banner */}
      {!dashLoading && allRegs.filter(r => r.status === 'Pending').length > 0 && (
        <div className="pending-alert-banner" onClick={() => handleNavClick('registrations')}>
          <div className="pending-alert-icon"><Bell size={20} /></div>
          <div className="pending-alert-text">
            <strong>{allRegs.filter(r => r.status === 'Pending').length} registration{allRegs.filter(r => r.status === 'Pending').length !== 1 ? 's' : ''} pending approval</strong>
            <span>Click to review and approve</span>
          </div>
          <ArrowRight size={18} className="pending-alert-arrow" />
        </div>
      )}

      {/* Dashboard Section Tabs */}
      <div className="dashboard-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
          { id: 'trends', label: 'Trends', icon: <TrendingUp size={16} /> },
          { id: 'geography', label: 'Geography', icon: <MapPin size={16} /> },
          { id: 'demographics', label: 'Demographics', icon: <PieChart size={16} /> },
          { id: 'network', label: 'Network', icon: <Share2 size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            className={`dashboard-tab-btn ${dashTab === tab.id ? 'active' : ''}`}
            onClick={() => setDashTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {dashTab === 'overview' && (
        <>
          {/* Row 1: Core Metrics & Engagement (3 Columns) */}
          <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            {/* Cards Printed vs Pending */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Card Production Status</h3>
                  <span className="panel-subtitle">Printed vs Pending</span>
                </div>
              </div>
              <div className="card-production-stats">
                <div className="production-stat-item">
                  <div className="production-stat-icon printed">
                    <CheckCircle size={24} strokeWidth={1.5} />
                  </div>
                  <div className="production-stat-content">
                    <span className="production-stat-label">Cards Printed</span>
                    <span className="production-stat-value">{cardsPrinted.toLocaleString()}</span>
                  </div>
                </div>
                <div className="production-stat-divider" />
                <div className="production-stat-item">
                  <div className="production-stat-icon pending">
                    <Clock size={24} strokeWidth={1.5} />
                  </div>
                  <div className="production-stat-content">
                    <span className="production-stat-label">Pending Approval</span>
                    <span className="production-stat-value">{cardsPending.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Average Days to Print */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Production Efficiency</h3>
                  <span className="panel-subtitle">Average registration to print</span>
                </div>
              </div>
              <div className="efficiency-metric">
                <div className="efficiency-value">{avgDaysToPrint}</div>
                <div className="efficiency-label">Days Average</div>
                <div className="efficiency-description">
                  {avgDaysToPrint <= 7 ? '✓ Excellent' : avgDaysToPrint <= 14 ? '⚠ Good' : '⚠ Needs Improvement'}
                </div>
              </div>
            </div>

            {/* Member Engagement Score */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Member Engagement Score</h3>
                  <span className="panel-subtitle">% attending events</span>
                </div>
              </div>
              <div className="engagement-metric">
                <div className="engagement-circle">
                  <svg viewBox="0 0 100 100" className="engagement-svg">
                    <circle cx="50" cy="50" r="45" className="engagement-bg" />
                    <circle cx="50" cy="50" r="45" className="engagement-progress" style={{ strokeDasharray: `${memberEngagementScore * 2.827} 282.7` }} />
                  </svg>
                  <div className="engagement-value">{memberEngagementScore}%</div>
                </div>
                <div className="engagement-label">Members Engaged</div>
              </div>
            </div>
          </div>
        </>
      )}

      {dashTab === 'trends' && (
        <>
          {/* Row 2: Charts & Lists (2 Columns) */}
          <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            {/* Monthly Printing Trend */}
            <div className="admin-panel dash-panel" style={{ height: '100%' }}>
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Monthly Printing Volume Trend</h3>
                  <span className="panel-subtitle">Last 12 months</span>
                </div>
              </div>
              <div className="trend-chart-wrap">
                {monthlyPrintingTrend.length > 0 ? (
                  <div className="trend-bars">
                    {monthlyPrintingTrend.map(({ month, count }) => {
                      const maxCount = Math.max(...monthlyPrintingTrend.map(m => m.count), 1);
                      const barHeight = (count / maxCount) * 100;
                      return (
                        <div key={month} className="trend-bar-item">
                          <div className="trend-bar-container">
                            <div className="trend-bar" style={{ height: `${barHeight}%` }} />
                          </div>
                          <span className="trend-bar-label">{month}</span>
                          <span className="trend-bar-value">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="trend-empty">No printing data available</p>
                )}
              </div>
            </div>

            {/* Most Attended Events */}
            <div className="admin-panel dash-panel" style={{ height: '100%' }}>
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Top Events</h3>
                  <span className="panel-subtitle">Most attended events</span>
                </div>
              </div>
              <div className="top-events-list">
                {topEvents.length > 0 ? (
                  topEvents.map((event, idx) => (
                    <div key={event.id} className="top-event-item">
                      <div className="top-event-rank">#{idx + 1}</div>
                      <div className="top-event-info">
                        <div className="top-event-name">{event.event_name}</div>
                        <div className="top-event-meta">{event.location || 'No location'}</div>
                      </div>
                      <div className="top-event-stats">
                        <div className="top-event-attendance">{event.attendance}</div>
                        <div className="top-event-rate">{event.attendanceRate}%</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="top-events-empty">No events yet</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {dashTab === 'geography' && (
        <>
          {/* Geography Summary Cards */}
          <div className="demo-summary-grid">
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                <MapPin size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Barangays</span>
                <span className="demo-summary-value">{geoDistributionData.length}</span>
              </div>
            </div>
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                <Users size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Total Voters</span>
                <span className="demo-summary-value">{totalResidents.toLocaleString()}</span>
              </div>
            </div>
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                <Shield size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">EM Card Members</span>
                <span className="demo-summary-value">{totalApprovedMembers.toLocaleString()}</span>
              </div>
            </div>
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                <TrendingUp size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Aid Recipients</span>
                <span className="demo-summary-value">{aidByBarangay.reduce((sum, a) => sum + a.count, 0)}</span>
              </div>
            </div>
          </div>

          {/* Geographic Distribution Analytics */}
          <div className="dashboard-main-grid two-col">
            {/* Highest & Lowest Registration Areas */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Registration Coverage</h3>
                  <span className="panel-subtitle">Highest vs Lowest areas</span>
                </div>
              </div>
              <div className="geo-coverage-container">
                {highestRegistrationArea && (
                  <div className="geo-coverage-item highest">
                    <div className="geo-coverage-badge">
                      <TrendingUp size={18} />
                    </div>
                    <div className="geo-coverage-content">
                      <div className="geo-coverage-label">Highest Coverage</div>
                      <div className="geo-coverage-area">{highestRegistrationArea.barangay}</div>
                      <div className="geo-coverage-stats">
                        <span>{highestRegistrationArea.registered.toLocaleString()}/{highestRegistrationArea.totalResidents.toLocaleString()}</span>
                        <span className="geo-coverage-rate">{highestRegistrationArea.registrationRate}%</span>
                      </div>
                    </div>
                  </div>
                )}
                {lowestRegistrationArea && (
                  <div className="geo-coverage-item lowest">
                    <div className="geo-coverage-badge">
                      <TrendingUp size={18} />
                    </div>
                    <div className="geo-coverage-content">
                      <div className="geo-coverage-label">Lowest Coverage</div>
                      <div className="geo-coverage-area">{lowestRegistrationArea.barangay}</div>
                      <div className="geo-coverage-stats">
                        <span>{lowestRegistrationArea.registered.toLocaleString()}/{lowestRegistrationArea.totalResidents.toLocaleString()}</span>
                        <span className="geo-coverage-rate">{lowestRegistrationArea.registrationRate}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Underserved Communities */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Underserved Communities</h3>
                  <span className="panel-subtitle">Areas with &lt;30% registration</span>
                </div>
              </div>
              {underservedCommunities.length > 0 ? (
                <div className="demo-bar-list" style={{ paddingTop: 8 }}>
                  {underservedCommunities.map((area, idx) => {
                    const maxTotal = Math.max(...underservedCommunities.map(a => a.totalResidents), 1);
                    const pct = Math.round((area.totalResidents / maxTotal) * 100);
                    return (
                      <div key={area.barangay} className="demo-bar-item">
                        <div className="demo-bar-row">
                          <div className="net-rank">{idx + 1}</div>
                          <span className="demo-bar-name">{area.barangay}</span>
                          <span className="demo-bar-count">{area.registered}</span>
                          <span className="demo-bar-pct">{area.registrationRate}%</span>
                        </div>
                        <div className="demo-bar-track">
                          <div className="demo-bar-fill" style={{ width: `${pct}%`, background: '#ef4444' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dash-empty-state">
                  <Info size={32} />
                  <span>No underserved communities</span>
                  <span className="dash-empty-sub">All barangays have registration coverage above 30%.</span>
                </div>
              )}
            </div>
          </div>

          {/* Geographic Heatmap */}
          {geoDistributionData.length > 0 && (
            <div className="admin-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Registration Rate Heatmap</h3>
                  <span className="panel-subtitle">{geoDistributionData.length} barangays · Sorted by coverage</span>
                </div>
              </div>
              <div className="geo-heatmap">
                {geoDistributionData.map(({ barangay, registered, totalResidents, registrationRate }) => {
                  let bgColor = '#fecaca';
                  if (registrationRate >= 70) bgColor = '#bbf7d0';
                  else if (registrationRate >= 50) bgColor = '#fde68a';
                  else if (registrationRate >= 30) bgColor = '#fed7aa';

                  return (
                    <div key={barangay} className="geo-heatmap-cell" style={{ backgroundColor: bgColor }}>
                      <div className="geo-heatmap-name">{barangay}</div>
                      <div className="geo-heatmap-rate">{registrationRate}%</div>
                      <div className="geo-heatmap-count">{registered}/{totalResidents}</div>
                    </div>
                  );
                })}
              </div>
              <div className="geo-heatmap-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#bbf7d0' }}></div>
                  <span>70%+ (Excellent)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#fde68a' }}></div>
                  <span>50-69% (Good)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#fed7aa' }}></div>
                  <span>30-49% (Fair)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#fecaca' }}></div>
                  <span>&lt;30% (Needs Work)</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {dashTab === 'trends' && (
        <>
          {/* Member Growth Trends */}
          <div className="dashboard-main-grid two-col">
            {/* Growth Comparison */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Month-over-Month Growth</h3>
                  <span className="panel-subtitle">Current vs Previous month</span>
                </div>
              </div>
              <div className="growth-comparison">
                <div className="growth-metric-item">
                  <div className="growth-metric-label">This Month</div>
                  <div className="growth-metric-value current">{growthComparison.current}</div>
                  <div className="growth-metric-sub">New registrations</div>
                </div>
                <div className="growth-metric-divider" />
                <div className="growth-metric-item">
                  <div className="growth-metric-label">Last Month</div>
                  <div className="growth-metric-value previous">{growthComparison.previous}</div>
                  <div className="growth-metric-sub">New registrations</div>
                </div>
                <div className="growth-metric-change">
                  <div className={`growth-change-badge ${growthComparison.percentChange >= 0 ? 'positive' : 'negative'}`}>
                    {growthComparison.percentChange >= 0 ? '↑' : '↓'} {Math.abs(growthComparison.percentChange)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Projected Growth */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Projected Growth</h3>
                  <span className="panel-subtitle">Next month forecast</span>
                </div>
              </div>
              <div className="projected-growth">
                <div className="projected-value">{projectedGrowth}</div>
                <div className="projected-label">Estimated New Members</div>
                <div className="projected-description">
                  Based on 3-month average growth rate
                </div>
              </div>
            </div>
          </div>

          {/* Growth Trend Chart */}
          {growthTrendData.length > 0 && (
            <div className="admin-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Registration Growth Trend</h3>
                  <span className="panel-subtitle">Last 12 months · New members per month</span>
                </div>
              </div>
              <div className="growth-chart-container">
                <div className="growth-chart">
                  {growthTrendData.map(({ month, count }) => {
                    const maxCount = Math.max(...growthTrendData.map(d => d.count), 1);
                    const barHeight = (count / maxCount) * 100;
                    const isCurrentMonth = growthTrendData.indexOf(growthTrendData.find(d => d.month === month)) === growthTrendData.length - 1;
                    
                    return (
                      <div key={month} className="growth-bar-item">
                        <div className="growth-bar-container">
                          <div 
                            className={`growth-bar ${isCurrentMonth ? 'current' : ''}`}
                            style={{ height: `${barHeight}%` }}
                          />
                        </div>
                        <span className="growth-bar-label">{month}</span>
                        <span className="growth-bar-value">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="growth-chart-info">
                <div className="info-item">
                  <span className="info-label">Total Growth:</span>
                  <span className="info-value">{growthTrendData.reduce((sum, d) => sum + d.count, 0)} members</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Average/Month:</span>
                  <span className="info-value">{Math.round(growthTrendData.reduce((sum, d) => sum + d.count, 0) / growthTrendData.length)} members</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Peak Month:</span>
                  <span className="info-value">
                    {growthTrendData.reduce((max, d) => d.count > max.count ? d : max).month} 
                    ({growthTrendData.reduce((max, d) => d.count > max.count ? d : max).count})
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {dashTab === 'demographics' && (
        <>
          {/* Demographics Summary Cards */}
          <div className="demo-summary-grid">
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                <Users size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Total Members</span>
                <span className="demo-summary-value">{sectorBreakdown.reduce((sum, s) => sum + s.count, 0)}</span>
              </div>
            </div>
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                <Tag size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Top Sector</span>
                <span className="demo-summary-value">{sectorBreakdown[0]?.sector || '—'}</span>
                <span className="demo-summary-sub">{sectorBreakdown[0]?.count || 0} members</span>
              </div>
            </div>
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                <Cake size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Dominant Age Group</span>
                <span className="demo-summary-value">{ageDistribution[0]?.group ? `${ageDistribution[0].group} yrs` : '—'}</span>
                <span className="demo-summary-sub">{ageDistribution[0]?.count || 0} members</span>
              </div>
            </div>
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                <PieChart size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Sectors Represented</span>
                <span className="demo-summary-value">{sectorBreakdown.length}</span>
              </div>
            </div>
          </div>

          {/* Demographic Breakdown */}
          <div className="dashboard-main-grid two-col">
            {/* Members by Sector */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Members by Sector</h3>
                  <span className="panel-subtitle">Distribution across categories</span>
                </div>
              </div>
              {sectorBreakdown.length > 0 ? (
                <div className="demo-chart-wrap">
                  {/* Donut Chart */}
                  <div className="demo-donut-wrap">
                    <svg viewBox="0 0 140 140" className="demo-donut-svg">
                      {sectorBreakdown.map((sector, idx) => {
                        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'];
                        const total = sectorBreakdown.reduce((s, x) => s + x.count, 0);
                        const prev = sectorBreakdown.slice(0, idx).reduce((s, x) => s + x.count, 0);
                        const dash = (sector.count / total) * 339.292;
                        const offset = 339.292 - ((prev / total) * 339.292);
                        return (
                          <circle
                            key={sector.sector}
                            cx="70" cy="70" r="54"
                            fill="none"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="18"
                            strokeDasharray={`${dash} ${339.292 - dash}`}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            transform="rotate(-90 70 70)"
                          />
                        );
                      })}
                    </svg>
                    <div className="demo-donut-center">
                      <span className="demo-donut-num">{sectorBreakdown.reduce((s, x) => s + x.count, 0)}</span>
                      <span className="demo-donut-label">Members</span>
                    </div>
                  </div>
                  {/* Legend / Bars */}
                  <div className="demo-bar-list">
                    {sectorBreakdown.map((sector, idx) => {
                      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'];
                      const bg = colors[idx % colors.length];
                      return (
                        <div key={sector.sector} className="demo-bar-item">
                          <div className="demo-bar-row">
                            <div className="demo-bar-dot" style={{ background: bg }} />
                            <span className="demo-bar-name">{sector.sector}</span>
                            <span className="demo-bar-count">{sector.count}</span>
                            <span className="demo-bar-pct">{sector.percentage}%</span>
                          </div>
                          <div className="demo-bar-track">
                            <div className="demo-bar-fill" style={{ width: `${sector.percentage}%`, background: bg }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="dash-empty-state">
                  <Info size={32} />
                  <span>No sector data available.</span>
                  <span className="dash-empty-sub">Sector information will appear once members are categorized.</span>
                </div>
              )}
            </div>

            {/* Age Distribution */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Age Distribution</h3>
                  <span className="panel-subtitle">Breakdown by age group</span>
                </div>
              </div>
              {ageDistribution.length > 0 ? (
                <div className="demo-chart-wrap">
                  {/* Donut Chart */}
                  <div className="demo-donut-wrap">
                    <svg viewBox="0 0 140 140" className="demo-donut-svg">
                      {ageDistribution.map((age, idx) => {
                        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];
                        const total = ageDistribution.reduce((s, x) => s + x.count, 0);
                        const prev = ageDistribution.slice(0, idx).reduce((s, x) => s + x.count, 0);
                        const dash = (age.count / total) * 339.292;
                        const offset = 339.292 - ((prev / total) * 339.292);
                        return (
                          <circle
                            key={age.group}
                            cx="70" cy="70" r="54"
                            fill="none"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="18"
                            strokeDasharray={`${dash} ${339.292 - dash}`}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            transform="rotate(-90 70 70)"
                          />
                        );
                      })}
                    </svg>
                    <div className="demo-donut-center">
                      <span className="demo-donut-num">{ageDistribution.reduce((s, x) => s + x.count, 0)}</span>
                      <span className="demo-donut-label">Members</span>
                    </div>
                  </div>
                  {/* Legend / Bars */}
                  <div className="demo-bar-list">
                    {ageDistribution.map((age, idx) => {
                      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];
                      const bg = colors[idx % colors.length];
                      return (
                        <div key={age.group} className="demo-bar-item">
                          <div className="demo-bar-row">
                            <div className="demo-bar-dot" style={{ background: bg }} />
                            <span className="demo-bar-name">{age.group} years</span>
                            <span className="demo-bar-count">{age.count}</span>
                            <span className="demo-bar-pct">{age.percentage}%</span>
                          </div>
                          <div className="demo-bar-track">
                            <div className="demo-bar-fill" style={{ width: `${age.percentage}%`, background: bg }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="dash-empty-state">
                  <Info size={32} />
                  <span>No age data available.</span>
                  <span className="dash-empty-sub">Birthday information will appear once member birthdays are recorded.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {dashTab === 'network' && (
        <>
          {/* Network Summary Cards */}
          <div className="demo-summary-grid">
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                <Share2 size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Success Rate</span>
                <span className="demo-summary-value">{referralSuccessRate}%</span>
              </div>
            </div>
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                <Users size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Active Referrers</span>
                <span className="demo-summary-value">{topReferrers.length}</span>
              </div>
            </div>
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                <UserCheck size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Total Referred</span>
                <span className="demo-summary-value">{topReferrers.reduce((sum, r) => sum + r.totalReferred, 0)}</span>
              </div>
            </div>
            <div className="demo-summary-card">
              <div className="demo-summary-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                <CheckCircle size={20} />
              </div>
              <div className="demo-summary-info">
                <span className="demo-summary-label">Approved</span>
                <span className="demo-summary-value">{topReferrers.reduce((sum, r) => sum + r.approved, 0)}</span>
              </div>
            </div>
          </div>

          {/* Referral Network Analytics */}
          <div className="dashboard-main-grid two-col">
            {/* Referral Success Rate */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Referral Success Rate</h3>
                  <span className="panel-subtitle">Overall conversion rate</span>
                </div>
              </div>
              <div className="demo-chart-wrap">
                <div className="demo-donut-wrap">
                  <svg viewBox="0 0 140 140" className="demo-donut-svg">
                    <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="18" />
                    <circle
                      cx="70" cy="70" r="54" fill="none"
                      stroke="#3b82f6" strokeWidth="18"
                      strokeDasharray={`${(referralSuccessRate / 100) * 339.292} ${339.292 - ((referralSuccessRate / 100) * 339.292)}`}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                      transform="rotate(-90 70 70)"
                    />
                  </svg>
                  <div className="demo-donut-center">
                    <span className="demo-donut-num" style={{ color: '#3b82f6' }}>{referralSuccessRate}%</span>
                    <span className="demo-donut-label">Approved</span>
                  </div>
                </div>
                <div className="net-success-legend">
                  <div className="net-legend-item">
                    <div className="net-legend-dot" style={{ background: '#3b82f6' }} />
                    <span>Approved via referral</span>
                    <strong>{topReferrers.reduce((sum, r) => sum + r.approved, 0)}</strong>
                  </div>
                  <div className="net-legend-item">
                    <div className="net-legend-dot" style={{ background: 'rgba(59,130,246,0.15)' }} />
                    <span>Other approvals</span>
                    <strong>{Math.max(0, totalApprovedMembers - topReferrers.reduce((sum, r) => sum + r.approved, 0))}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Leaders */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Network Leaders</h3>
                  <span className="panel-subtitle">Top referrers by volume</span>
                </div>
              </div>
              {topReferrers.length > 0 ? (
                <div className="demo-bar-list" style={{ paddingTop: 8 }}>
                  {topReferrers.map((referrer, idx) => {
                    const maxRef = Math.max(...topReferrers.map(r => r.totalReferred), 1);
                    const pct = Math.round((referrer.totalReferred / maxRef) * 100);
                    return (
                      <div key={referrer.name} className="demo-bar-item">
                        <div className="demo-bar-row">
                          <div className="net-rank">{idx + 1}</div>
                          <span className="demo-bar-name">{referrer.name}</span>
                          <span className="demo-bar-count">{referrer.totalReferred}</span>
                          <span className="demo-bar-pct">{referrer.successRate}%</span>
                        </div>
                        <div className="demo-bar-track">
                          <div className="demo-bar-fill" style={{ width: `${pct}%`, background: '#3b82f6' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dash-empty-state">
                  <Info size={32} />
                  <span>No referrer data yet.</span>
                  <span className="dash-empty-sub">Referral leaders will appear once members start referring others.</span>
                </div>
              )}
            </div>
          </div>

          {/* Network Growth Chart */}
          {networkGrowthData.length > 0 && (
            <div className="admin-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Network Growth Trend</h3>
                  <span className="panel-subtitle">Referral registrations over time</span>
                </div>
              </div>
              <div className="net-growth-wrap">
                <div className="net-growth-chart">
                  {networkGrowthData.map(({ month, count }) => {
                    const maxCount = Math.max(...networkGrowthData.map(d => d.count), 1);
                    const barHeight = (count / maxCount) * 100;
                    return (
                      <div key={month} className="net-growth-item">
                        <div className="net-growth-bar-wrap">
                          <div className="net-growth-bar" style={{ height: `${barHeight}%` }} />
                        </div>
                        <span className="net-growth-month">{month}</span>
                        <span className="net-growth-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {dashTab === 'trends' && (
        <>
          {/* Year-over-Year Trends */}
          {yearOverYearData.length > 0 && (
            <div className="admin-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Year-over-Year Trends</h3>
                  <span className="panel-subtitle">Monthly comparison: This year vs last year</span>
                </div>
              </div>
              <div className="yoy-chart-container">
                <div className="yoy-chart">
                  {yearOverYearData.map(({ month, thisYear, lastYear }) => {
                    const maxValue = Math.max(...yearOverYearData.map(d => Math.max(d.thisYear, d.lastYear)), 1);
                    const thisYearHeight = (thisYear / maxValue) * 100;
                    const lastYearHeight = (lastYear / maxValue) * 100;
                    
                    return (
                      <div key={month} className="yoy-bar-group">
                        <div className="yoy-bars">
                          <div className="yoy-bar-item">
                            <div className="yoy-bar-container">
                              <div className="yoy-bar last-year" style={{ height: `${lastYearHeight}%` }} />
                            </div>
                            <span className="yoy-bar-value">{lastYear}</span>
                          </div>
                          <div className="yoy-bar-item">
                            <div className="yoy-bar-container">
                              <div className="yoy-bar this-year" style={{ height: `${thisYearHeight}%` }} />
                            </div>
                            <span className="yoy-bar-value">{thisYear}</span>
                          </div>
                        </div>
                        <span className="yoy-month-label">{month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="yoy-legend">
                <div className="legend-item">
                  <div className="legend-color last-year-color"></div>
                  <span>Last Year</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color this-year-color"></div>
                  <span>This Year</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {dashTab === 'geography' && (
        <>
          {/* Barangay Analytics */}
          <div className="dashboard-main-grid three-col">
            {/* Left: Voters by Barangay */}
            {votersByBarangay.length > 0 && (
              <div className="admin-panel dash-panel">
                <div className="panel-header">
                  <div className="panel-header-left">
                    <h3>Registered Voters</h3>
                    <span className="panel-subtitle">{votersByBarangay.length} barangays · {totalResidents.toLocaleString()} total</span>
                  </div>
                </div>
                <div className="demo-bar-list" style={{ paddingTop: 8 }}>
                  {votersByBarangay.map(({ barangay, count }) => {
                    const total = totalResidents || 1;
                    const pct = ((count / total) * 100).toFixed(1);
                    const barWidth = total > 0 ? Math.max((count / total) * 100, 1.5) : 0;
                    const maxCount = Math.max(...votersByBarangay.map(v => v.count), 1);
                    const relWidth = Math.max((count / maxCount) * 100, 1.5);
                    return (
                      <div key={barangay} className="demo-bar-item">
                        <div className="demo-bar-row">
                          <span className="demo-bar-name">{barangay}</span>
                          <span className="demo-bar-count">{count.toLocaleString()}</span>
                          <span className="demo-bar-pct">{pct}%</span>
                        </div>
                        <div className="demo-bar-track">
                          <div className="demo-bar-fill" style={{ width: `${relWidth}%`, background: '#10b981' }} />
                        </div>
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
                  <h3>EM Card Members</h3>
                  <span className="panel-subtitle">{regsByBarangay.length || votersByBarangay.length} barangays · % vs own voters</span>
                </div>
              </div>
              <div className="demo-bar-list" style={{ paddingTop: 8 }}>
                {(regsByBarangay.length > 0 ? regsByBarangay : votersByBarangay.map(v => ({ barangay: v.barangay, count: 0 }))).map(({ barangay, count }) => {
                  const voterEntry = votersByBarangay.find(v => v.barangay === barangay);
                  const voterCount = voterEntry ? voterEntry.count : 0;
                  const pct = voterCount > 0 ? ((count / voterCount) * 100).toFixed(1) : '0.0';
                  const maxReg = Math.max(...regsByBarangay.map(r => r.count), 1);
                  const barWidth = Math.max((count / maxReg) * 100, 1.5);
                  return (
                    <div key={barangay} className="demo-bar-item">
                      <div className="demo-bar-row">
                        <span className="demo-bar-name">{barangay}</span>
                        <span className="demo-bar-count">{count}</span>
                        <span className="demo-bar-pct">{pct}%</span>
                      </div>
                      <div className="demo-bar-track">
                        <div className="demo-bar-fill" style={{ width: `${barWidth}%`, background: '#3b82f6' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Aid by Barangay */}
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left">
                  <h3>Aid Recipients</h3>
                  <span className="panel-subtitle">{votersByBarangay.length} barangays · {aidByBarangay.reduce((sum, a) => sum + a.count, 0)} total</span>
                </div>
              </div>
              <div className="demo-bar-list" style={{ paddingTop: 8 }}>
                {(aidByBarangay.length > 0 ? aidByBarangay : votersByBarangay.map(v => ({ barangay: v.barangay, count: 0 }))).map(({ barangay, count }) => {
                  const voterEntry = votersByBarangay.find(v => v.barangay === barangay);
                  const voterCount = voterEntry ? voterEntry.count : 0;
                  const pct = voterCount > 0 ? ((count / voterCount) * 100).toFixed(1) : '0.0';
                  const maxAid = Math.max(...aidByBarangay.map(a => a.count), 1);
                  const barWidth = Math.max((count / maxAid) * 100, 1.5);
                  return (
                    <div key={barangay} className="demo-bar-item">
                      <div className="demo-bar-row">
                        <span className="demo-bar-name">{barangay}</span>
                        <span className="demo-bar-count">{count}</span>
                        <span className="demo-bar-pct">{pct}%</span>
                      </div>
                      <div className="demo-bar-track">
                        <div className="demo-bar-fill" style={{ width: `${barWidth}%`, background: '#f59e0b' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {dashTab === 'overview' && (
        <>
          {/* Recent Registrations Table */}
      <div className="admin-panel">
        <div className="panel-header">
          <h3>Recent Registrations</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="panel-badge">Live Data</span>
            <button className="view-all-link" onClick={() => handleNavClick('registrations')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Referral</th><th>Sector</th><th>House</th><th>Purok</th><th>Brgy</th><th>Contact</th><th>Birthday</th><th>Date Registered</th></tr></thead>
            <tbody>
              {dashLoading ? <tr><td colSpan={9} className="table-loading"><div className="table-loading-flex"><div className="spinner" /><span>Loading recent registrations...</span></div></td></tr>
                : recentRegistrations.length === 0 ? <tr><td colSpan={9} className="table-empty"><div className="table-empty-flex"><ClipboardList size={32} /><span>No registrations yet.</span><button className="btn btn-action-primary" onClick={() => handleNavClick('registrations')} style={{ marginTop: '8px' }}>Go to Registrations</button></div></td></tr>
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
  )}
  </>
  );
  };

  const renderResidents = () => {
    const totalFiltered = residentsCount;
    const totalPages = Math.ceil(totalFiltered / residentsPerPage) || 1;
    const safePage = Math.min(residentsPage, totalPages);
    const startIndex = (safePage - 1) * residentsPerPage;
    const endIndex = Math.min(startIndex + residentsPerPage, totalFiltered);
    const pageResidents = filteredResidents;

    // Derive unique filter options from loaded residents
    const resBarangayOptions = [...new Set(allResidents.map(r => r.barangay).filter(Boolean))].sort();
    const resPrecinctOptions = [...new Set(allResidents.map(r => r.precinct).filter(Boolean))].sort();
    const resStatusOptions = [...new Set(allResidents.map(r => r.status).filter(Boolean))].sort();

    const goToPage = (p) => {
      const newPage = Math.max(1, Math.min(p, totalPages));
      setResidentsPage(newPage);
      fetchAllResidents(newPage, residentSearch, resFilterBarangay, resFilterPrecinct, resFilterStatus);
    };

    return (
      <>
        {/* Action Bar */}
        <div className="residents-action-bar">
          <div className="action-bar-left">
            <div className="search-input-wrap">
              <input
                type="text"
                placeholder="Search residents by name, barangay, or precinct..."
                value={residentSearch}
                onChange={(e) => setResidentSearch(e.target.value)}
                className="residents-search"
              />
            </div>
            <div className="filter-selects-wrap">
              <select
                className="filter-select"
                value={resFilterBarangay}
                onChange={(e) => { setResFilterBarangay(e.target.value); setResidentsPage(1); }}
              >
                <option value="">All Barangays</option>
                {resBarangayOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                className="filter-select"
                value={resFilterPrecinct}
                onChange={(e) => { setResFilterPrecinct(e.target.value); setResidentsPage(1); }}
              >
                <option value="">All Precincts</option>
                {resPrecinctOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                className="filter-select"
                value={resFilterStatus}
                onChange={(e) => { setResFilterStatus(e.target.value); setResidentsPage(1); }}
              >
                <option value="">All Statuses</option>
                {resStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="action-bar-right">
            <button className="btn btn-action-outline" onClick={() => downloadResidentsCSV(allResidents)}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-action-outline" onClick={downloadSampleCSV}>
              <FileText size={14} /> Sample CSV
            </button>
            <button className="btn btn-action-outline" onClick={() => { setShowBulkModal(true); setUploadError(''); setCsvFile(null); setCsvPreview([]); }}>
              <Upload size={14} /> Bulk Upload
            </button>
            <button className="btn btn-action-primary" onClick={() => { setShowAddModal(true); setAddError(''); }}>
              <Plus size={14} /> Add Resident
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
          <div className="table-wrap residents-table-wrap">
            <table className="admin-table residents-table">
              <thead>
                <tr><th>Last Name</th><th>First Name</th><th>Middle Name</th><th>Barangay</th><th>Precinct</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {residentsLoading ? <tr><td colSpan={7} className="table-loading">Loading residents...</td></tr>
                  : pageResidents.length === 0 ? <tr><td colSpan={7} className="table-empty">{residentSearch ? 'No residents match your search.' : 'No residents found.'}</td></tr>
                    : pageResidents.map(res => (
                      <tr key={res.id}>
                        <td><strong>{res.last_name}{res.suffix ? ` ${res.suffix}` : ''}</strong></td>
                        <td>{res.first_name}</td>
                        <td>{res.middle_name || '-'}{res.suffix ? ` / ${res.suffix}` : ''}</td>
                        <td>{res.barangay}</td>
                        <td>{res.precinct}</td>
                        <td><span className={`status-tag ${res.status === 'Registered' ? 'registered' : 'verified'}`}>{res.status}</span></td>
                        <td>
                          <div className="resident-actions">
                            <button className="action-btn action-edit" onClick={() => openEditResident(res)} title="Edit resident">
                              <Pencil size={14} />
                            </button>
                            <button className="action-btn action-delete" onClick={() => { setDeleteResidentId(res.id); setDeleteResidentName(`${res.first_name} ${res.last_name}`); setShowDeleteResidentModal(true); }} title="Delete resident">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
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

  const getPhotoSize = (photoData) => {
    if (!photoData) return '-';
    // If it's a URL (new storage uploads), we don't know the file size from the string
    if (photoData.startsWith('http')) return 'Storage';
    const kb = Math.round(photoData.length / 1024);
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

    let filteredRegs = allRegs.filter(r => r.status === regStatusFilter);

    // Registration search
    const regQuery = regSearch.trim().toLowerCase();
    if (regQuery) {
      filteredRegs = filteredRegs.filter(reg => {
        const name = getResidentName(reg).toLowerCase();
        const barangay = (reg.barangay || '').toLowerCase();
        const contact = (reg.contact || '').toLowerCase();
        return name.includes(regQuery) || barangay.includes(regQuery) || contact.includes(regQuery);
      });
    }

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

        {/* Search + Export */}
        <div className="residents-action-bar" style={{ marginTop: 14 }}>
          <div className="action-bar-left">
            <div className="search-input-wrap">
              <input
                type="text"
                placeholder="Search registrations by name, barangay, or contact..."
                value={regSearch}
                onChange={(e) => setRegSearch(e.target.value)}
                className="residents-search"
              />
            </div>
          </div>
          <div className="action-bar-right">
            <button className="btn btn-action-outline" onClick={() => downloadRegistrationsCSV(filteredRegs)}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Portrait</th>
                <th>Name</th>
                <th>Residency</th>
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
              {regsLoading ? <tr><td colSpan={11} className="table-loading">Loading...</td></tr>
                : filteredRegs.length === 0 ? <tr><td colSpan={11} className="table-empty">{regSearch ? 'No registrations match your search.' : `No ${regStatusFilter.toLowerCase()} registrations found.`}</td></tr>
                  : filteredRegs.map(reg => {
                    const isDup = dupKeys.has(`${getResidentName(reg)}|${reg.barangay || ''}|${reg.contact || ''}`);
                    return (
                      <tr key={reg.id} className={`reg-row-clickable ${isDup ? 'reg-row-duplicate' : ''}`} onClick={() => setSelectedRegDetail(reg)}>
                        <td>
                          {(reg.photo_url || reg.photo_base64) ? (
                            <img src={reg.photo_url || reg.photo_base64} alt="" className="reg-thumb" />
                          ) : (
                            <div className="reg-thumb-placeholder">👤</div>
                          )}
                        </td>
                        <td>
                          <strong>{getResidentName(reg)}</strong>
                          {isDup && <span className="dup-badge-inline">DUPLICATE</span>}
                        </td>
                        <td>
                          {reg.is_valid_resident !== false ? (
                            <span className="badge badge-success" style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', background: '#e6fdf5', color: '#10b981' }}>✓ Registered Voter</span>
                          ) : (
                            <span className="badge badge-warning" style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fffbeb', color: '#f59e0b' }}>⚠ Non-Valid Resident</span>
                          )}
                        </td>
                        <td>{reg.barangay || '-'}</td>
                        <td><span className="sector-tag">{reg.sector_category}</span></td>
                        <td>{reg.referral_name}</td>
                        <td>{reg.contact || '-'}</td>
                        <td><span className="size-tag">{getPhotoSize(reg.photo_url || reg.photo_base64)}</span></td>
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
    let members = allRegs.filter(r => r.status === 'Approved');
    const query = memberSearch.trim().toLowerCase();

    if (query) {
      const tokens = query.split(/\s+/).filter(Boolean);
      const scored = members.map(reg => {
        const r = reg.ValidResidents || {};
        const fullName = `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}`.trim().toLowerCase();
        const emCard = (reg.em_card_no || '').toLowerCase();
        const nameScore = tokens.filter(t => fullName.includes(t)).length;
        const cardScore = tokens.filter(t => emCard.includes(t)).length;
        const score = nameScore + cardScore * 2;
        return { ...reg, score, fullName };
      });
      members = scored.filter(reg => smartMatchesMember(reg, query));
      members.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.fullName || '').localeCompare(b.fullName || '');
      });
    }

    // Column filters
    if (filterBarangay) {
      members = members.filter(reg => {
        const r = reg.ValidResidents || {};
        return (reg.barangay || r.barangay || '').toString().toLowerCase() === filterBarangay.toLowerCase();
      });
    }
    if (filterPurok) {
      members = members.filter(reg => {
        const r = reg.ValidResidents || {};
        return (reg.purok || r.purok || '').toString().toLowerCase() === filterPurok.toLowerCase();
      });
    }
    if (filterSector) {
      members = members.filter(reg => (reg.sector_category || '').toLowerCase() === filterSector.toLowerCase());
    }
    if (filterPrinted) {
      members = members.filter(reg => {
        const isPrinted = !!reg.printed_at;
        return filterPrinted === 'printed' ? isPrinted : !isPrinted;
      });
    }

    const totalFiltered = members.length;
    const totalPages = Math.ceil(totalFiltered / membersPerPage) || 1;
    const safePage = Math.min(membersPage, totalPages);
    const startIndex = (safePage - 1) * membersPerPage;
    const pageMembers = members.slice(startIndex, startIndex + membersPerPage);

    const goToPage = (p) => {
      const newPage = Math.max(1, Math.min(p, totalPages));
      setMembersPage(newPage);
    };

    const memberFullName = (reg) => {
      const r = reg.ValidResidents || {};
      return `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}`.trim();
    };

    // Build household groups for the household tab
    const householdGroups = (() => {
      const groups = {};
      members.forEach(reg => {
        const r = reg.ValidResidents || {};
        const house = (reg.house_no || '').trim() || (r.house_no || '').trim() || '—';
        const purok = (reg.purok || r.purok || '—').toString().trim();
        const barangay = (reg.barangay || r.barangay || '—').toString().trim();
        const key = `${barangay}|${purok}|${house}`;
        if (!groups[key]) groups[key] = { barangay, purok, house, members: [] };
        groups[key].members.push(reg);
      });
      return Object.values(groups).sort((a, b) => {
        if (a.barangay !== b.barangay) return a.barangay.localeCompare(b.barangay);
        const pA = parseInt(a.purok) || 0;
        const pB = parseInt(b.purok) || 0;
        if (pA !== pB) return pA - pB;
        const hA = parseInt(a.house) || 0;
        const hB = parseInt(b.house) || 0;
        if (hA !== hB) return hA - hB;
        return a.house.localeCompare(b.house);
      });
    })();

    // Unique filter options from base data
    const baseMembers = allRegs.filter(r => r.status === 'Approved');
    const barangayOptions = [...new Set(baseMembers.map(reg => {
      const r = reg.ValidResidents || {};
      return (reg.barangay || r.barangay || '').toString().trim();
    }).filter(Boolean))].sort();
    const purokOptions = [...new Set(baseMembers.map(reg => {
      const r = reg.ValidResidents || {};
      return (reg.purok || r.purok || '').toString().trim();
    }).filter(Boolean))].sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
    const sectorOptions = [...new Set(baseMembers.map(reg => (reg.sector_category || '').toString().trim()).filter(Boolean))].sort();

    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3>Approved Members</h3>
          <span className="panel-badge">{totalFiltered} TOTAL</span>
        </div>

        {/* Tabs */}
        <div className="members-tabs" style={{ display: 'flex', gap: 8, marginBottom: 14, borderBottom: '1px solid #e5e7eb', paddingBottom: 10 }}>
          <button
            className={`msg-tab-btn ${membersTab === 'all' ? 'active' : ''}`}
            onClick={() => setMembersTab('all')}
          >
            <Users size={14} /> All Members
          </button>
          <button
            className={`msg-tab-btn ${membersTab === 'household' ? 'active' : ''}`}
            onClick={() => setMembersTab('household')}
          >
            <Home size={14} /> By Household
          </button>
        </div>

        {/* Search + Filters + Download */}
        <div className="residents-action-bar">
          <div className="action-bar-left">
            <div className="search-input-wrap">
              <input
                type="text"
                placeholder="Search members by name or EM card no..."
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setMembersPage(1); }}
                className="residents-search"
              />
            </div>
            <div className="filter-selects-wrap">
              <select
                className="filter-select"
                value={filterBarangay}
                onChange={(e) => { setFilterBarangay(e.target.value); setMembersPage(1); }}
              >
                <option value="">All Barangays</option>
                {barangayOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                className="filter-select"
                value={filterPurok}
                onChange={(e) => { setFilterPurok(e.target.value); setMembersPage(1); }}
              >
                <option value="">All Puroks</option>
                {purokOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                className="filter-select"
                value={filterSector}
                onChange={(e) => { setFilterSector(e.target.value); setMembersPage(1); }}
              >
                <option value="">All Sectors</option>
                {sectorOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className="filter-select"
                value={filterPrinted}
                onChange={(e) => { setFilterPrinted(e.target.value); setMembersPage(1); }}
              >
                <option value="">All Print Status</option>
                <option value="printed">Printed</option>
                <option value="not-printed">Not Printed</option>
              </select>
            </div>
          </div>
          <div className="action-bar-right">
            <button className="btn btn-scan-start" onClick={() => { setScanQrMember({ open: true }); setScanQrToken(''); setScanQrResult(null); }}>
              <ScanLine size={14} /> Scan ID
            </button>
            <button className="btn btn-action-outline" onClick={() => downloadMembersCSV(members)}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {regsLoading ? (
          <div className="table-loading">Loading members...</div>
        ) : totalFiltered === 0 ? (
          <div className="table-empty">{memberSearch ? 'No members match your search.' : 'No approved members yet.'}</div>
        ) : membersTab === 'all' ? (
          <>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Barangay</th>
                    <th>Purok</th>
                    <th>Sector</th>
                    <th>EM Card No</th>
                    <th>Print Status</th>
                    <th>Contact</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageMembers.map((reg) => {
                    const r = reg.ValidResidents || {};
                    const name = memberFullName(reg);
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
                        <td>
                          {reg.printed_at ? (
                            <span className="print-status printed" title={`Printed on ${new Date(reg.printed_at).toLocaleDateString()}`}><Printer size={13} /> Printed</span>
                          ) : (
                            <span className="print-status not-printed">Not printed</span>
                          )}
                        </td>
                        <td>{reg.contact || '-'}</td>
                        <td>{new Date(reg.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="resident-actions">
                            <button className="action-btn action-edit" onClick={(e) => { e.stopPropagation(); setSelectedMember(reg); openEditMember(reg); }} title="Edit member">
                              <Pencil size={14} />
                            </button>
                            <button className="action-btn action-delete" onClick={(e) => { e.stopPropagation(); setDeleteMemberId(reg.id); setDeleteMemberName(name); setShowDeleteMemberModal(true); }} title="Delete member">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-row" style={{ marginTop: 14 }}>
                <span className="pagination-info">Showing {startIndex + 1}–{Math.min(startIndex + membersPerPage, totalFiltered)} of {totalFiltered}</span>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1}>Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`pagination-btn ${p === safePage ? 'active' : ''}`} onClick={() => goToPage(p)}>{p}</button>
                  ))}
                  <button className="pagination-btn" onClick={() => goToPage(safePage + 1)} disabled={safePage >= totalPages}>Next</button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* By Household View */
          <div className="household-grid">
            {householdGroups.map((group, idx) => (
              <div key={idx} className="household-card">
                <div className="household-header">
                  <div className="household-address">
                    <Home size={16} />
                    <span>{group.barangay} · Purok {group.purok}{group.house !== '—' ? ` · House #${group.house}` : ''}</span>
                  </div>
                  <span className="household-count">{group.members.length} member{group.members.length > 1 ? 's' : ''}</span>
                </div>
                <div className="household-members">
                  {group.members.map(reg => {
                    const name = memberFullName(reg);
                    return (
                      <div key={reg.id} className="household-member-row" onClick={() => setSelectedMember(reg)}>
                        <span className="household-member-name">{name}</span>
                        {reg.em_card_no ? (
                          <code className="em-card-code" style={{ fontSize: '0.68rem' }}>{reg.em_card_no}</code>
                        ) : (
                          <span className="qr-token-missing" style={{ fontSize: '0.68rem' }}>Needs QR</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const markAsPrinted = async (regId) => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ printed_at: new Date().toISOString() })
        .eq('id', regId);
      if (error) throw error;
      await fetchAllRegistrations();
      if (selectedMember && selectedMember.id === regId) {
        setSelectedMember(prev => prev ? { ...prev, printed_at: new Date().toISOString() } : null);
      }
    } catch (err) {
      // silent
    }
  };

  const downloadIdCardJPG = async () => {
    try {
      const cardId = idCardSide === 'front' ? 'id-card-print' : 'id-card-print-back';
      const element = document.getElementById(cardId);
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement('a');
      const sideLabel = idCardSide === 'front' ? 'front' : 'back';
      const fileName = `${selectedMember?.em_card_no || selectedMember?.qr_token || 'id-card'}_${sideLabel}.jpg`;
      link.download = fileName;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      showToast('ID Card downloaded as JPG!', 'success');
    } catch (err) {
      showToast('Failed to download JPG. Try using Print instead.', 'error');
    }
  };

  const exportMemberExcel = (member) => {
    if (!member) return;
    const r = member.ValidResidents || {};
    const name = `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}`.trim();
    const purokLabel = member.purok ? (SUBDIVISION_PUROKS.includes(member.purok) ? member.purok : `Purok ${member.purok}`) : '';
    const lotBlockPhase = SUBDIVISION_PUROKS.includes(member.purok) ? `Lot ${member.lot || ''} Block ${member.block || ''} Phase ${member.phase || ''}` : '';
    const barangay = r.barangay ? `${r.barangay}, ` : '';
    const address = SUBDIVISION_PUROKS.includes(member.purok)
      ? `${lotBlockPhase ? `${lotBlockPhase}, ` : ''}${purokLabel ? `${purokLabel}, ` : ''}${barangay}BALAGTAS, BULACAN`
      : `${member.house_no ? `#${member.house_no} ` : ''}${purokLabel ? `${purokLabel}, ` : ''}${barangay}BALAGTAS, BULACAN`;
    const contact = member.contact || '';
    const birthday = member.birthday || '';
    const qrUrl = member.qr_token ? `https://www.em-card.com/card/${member.qr_token}` : '';
    const emNo = member.em_card_no || '';
    const dateIssued = member.created_at ? new Date(member.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';

    const data = [
      ['Name', 'Address', 'Contact', 'Birthday', 'QR URL', 'EM Card No', 'Date Issued'],
      [name, address, contact, birthday, qrUrl, emNo, dateIssued],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profile');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${emNo || member.qr_token || 'member'}_profile.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Profile exported to Excel!', 'success');
  };

  const downloadMembersCSV = (members) => {
    const headers = ['Name', 'Barangay', 'Purok', 'Sector', 'EM Card No', 'Print Status', 'Contact', 'Date'];
    const rows = members.map(reg => {
      const r = reg.ValidResidents || {};
      const name = `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}`.trim();
      return [
        name,
        r.barangay || '',
        reg.purok || r.purok || '',
        reg.sector_category || '',
        reg.em_card_no || '',
        reg.printed_at ? 'Printed' : 'Not Printed',
        reg.contact || '',
        new Date(reg.created_at).toLocaleDateString(),
      ];
    });
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `members_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadResidentsCSV = (residents) => {
    const headers = ['Last Name', 'First Name', 'Middle Name', 'Suffix', 'Barangay', 'Precinct', 'Status'];
    const rows = residents.map(res => [
      res.last_name || '',
      res.first_name || '',
      res.middle_name || '',
      res.suffix || '',
      res.barangay || '',
      res.precinct || '',
      res.status || '',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registered_voters_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadRegistrationsCSV = (regs) => {
    const headers = ['Name', 'Residency', 'Barangay', 'Sector', 'Referral', 'Contact', 'Size', 'Status', 'Date'];
    const rows = regs.map(reg => {
      return [
        getResidentName(reg),
        reg.is_valid_resident !== false ? 'Registered Voter' : 'Non-Valid Resident',
        reg.barangay || '',
        reg.sector_category || '',
        reg.referral_name || '',
        reg.contact || '',
        getPhotoSize(reg.photo_url || reg.photo_base64),
        reg.status || 'Pending',
        new Date(reg.created_at).toLocaleDateString(),
      ];
    });
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registrations_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderNetwork = () => {
    // Helper: build children map and compute leaders from any set of registrations
    const computeLeadersFromRegs = (regs) => {
      const map = new Map();
      regs.forEach(reg => {
        const parentName = reg.referral_name || 'No Referral';
        if (!map.has(parentName)) map.set(parentName, []);
        map.get(parentName).push(reg);
      });
      const getCh = (name) => map.get(name) || [];

      const getCounts = (leaderName) => {
        let l1 = 0, l2 = 0, l3 = 0, l4plus = 0;
        const queue = [{ name: leaderName, depth: 0 }];
        const visited = new Set();
        while (queue.length > 0) {
          const { name, depth } = queue.shift();
          if (visited.has(name)) continue;
          visited.add(name);
          const children = getCh(name);
          for (const child of children) {
            const childName = getResidentName(child);
            if (depth === 0) l1++;
            else if (depth === 1) l2++;
            else if (depth === 2) l3++;
            else l4plus++;
            queue.push({ name: childName, depth: depth + 1 });
          }
        }
        return { l1, l2, l3, l4plus, total: l1 + l2 + l3 + l4plus };
      };

      return [...map.keys()]
        .map(name => ({ name, ...getCounts(name) }))
        .sort((a, b) => b.total - a.total);
    };

    const now = new Date();
    const [filterYear, filterMonth] = networkMonthFilter.split('-').map(Number);
    // Week: Sunday = start of week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const monthRegs = allRegs.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === filterMonth - 1 && d.getFullYear() === filterYear;
    });
    const weekRegs = allRegs.filter(r => {
      const d = new Date(r.created_at);
      return d >= startOfWeek && d <= endOfWeek;
    });

    const allTimeLeaders = computeLeadersFromRegs(allRegs);
    const monthLeaders = computeLeadersFromRegs(monthRegs);
    const weekLeaders = computeLeadersFromRegs(weekRegs);

    // Generate last 24 month options for dropdown
    const monthOptions = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      monthOptions.push({ value: val, label });
    }

    // For the tree forest, use all-time
    const allTimeMap = new Map();
    allRegs.forEach(reg => {
      const parentName = reg.referral_name || 'No Referral';
      if (!allTimeMap.has(parentName)) allTimeMap.set(parentName, []);
      allTimeMap.get(parentName).push(reg);
    });
    const getChildren = (name) => allTimeMap.get(name) || [];

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
            {(reg.photo_url || reg.photo_base64) ? (
              <img src={reg.photo_url || reg.photo_base64} alt="" className="tree-node-photo" />
            ) : (
              <div className="tree-node-placeholder" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>NP</div>
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

    const renderLeaderList = (leaders, limit = 10) => {
      const display = leaders.slice(0, limit);
      return (
        <div className="leader-mini-list">
          {display.map((l, i) => (
            <div key={l.name} className="leader-mini-row">
              <span className="leader-mini-rank">{i + 1}</span>
              <span className="leader-mini-name">{l.name}</span>
              <span className="leader-mini-badges">
                <span className="lm-badge l1">L1 {l.l1}</span>
                {l.l2 > 0 && <span className="lm-badge l2">L2 {l.l2}</span>}
                {l.l3 > 0 && <span className="lm-badge l3">L3 {l.l3}</span>}
                {l.l4plus > 0 && <span className="lm-badge l4">L4+ {l.l4plus}</span>}
                <span className="lm-badge total">{l.total}</span>
              </span>
            </div>
          ))}
        </div>
      );
    };

    const renderExpandedList = (leaders, title) => (
      <div className="leader-expanded-panel">
        <div className="leader-expanded-header">
          <h4>{title}</h4>
          <button className="btn btn-sm btn-secondary" onClick={() => setNetworkViewMode(null)}>Close</button>
        </div>
        {renderLeaderList(leaders, leaders.length)}
      </div>
    );

    return (
      <div className="admin-panel">
        {/* Header */}
        <div className="panel-header" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '16px', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>Referral Network</h3>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.875rem' }}>Track recruitment performance and organizational structure</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 20px', textAlign: 'center', minWidth: '90px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{allTimeLeaders.length}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginTop: '2px' }}>Leaders</div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 20px', textAlign: 'center', minWidth: '90px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{allRegs.length}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginTop: '2px' }}>Members</div>
              </div>
            </div>
          </div>
        </div>

        {/* Leader Cards */}
        {networkViewMode === null ? (
          <div className="leader-cards-row">
            {/* All Time */}
            <div className="leader-card">
              <div className="leader-card-header">
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>All-Time Leaders</h4>
                <span className="leader-card-sub" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Top recruiters overall</span>
              </div>
              {allTimeLeaders.length === 0 ? (
                <div className="leader-card-empty">No leaders yet</div>
              ) : (
                <>
                  {renderLeaderList(allTimeLeaders, 10)}
                  {allTimeLeaders.length > 10 && (
                    <button className="btn btn-view-all" onClick={() => setNetworkViewMode('all')}>View All ({allTimeLeaders.length})</button>
                  )}
                </>
              )}
            </div>

            {/* This Month */}
            <div className="leader-card">
              <div className="leader-card-header">
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>This Month</h4>
                <select
                  className="leader-month-picker"
                  value={networkMonthFilter}
                  onChange={e => setNetworkMonthFilter(e.target.value)}
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {monthLeaders.length === 0 ? (
                <div className="leader-card-empty">No new recruits this month</div>
              ) : (
                <>
                  {renderLeaderList(monthLeaders, 10)}
                  {monthLeaders.length > 10 && (
                    <button className="btn btn-view-all" onClick={() => setNetworkViewMode('month')}>View All ({monthLeaders.length})</button>
                  )}
                </>
              )}
            </div>

            {/* This Week */}
            <div className="leader-card">
              <div className="leader-card-header">
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>This Week</h4>
                <span className="leader-card-sub">{startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              {weekLeaders.length === 0 ? (
                <div className="leader-card-empty">No new recruits this week</div>
              ) : (
                <>
                  {renderLeaderList(weekLeaders, 10)}
                  {weekLeaders.length > 10 && (
                    <button className="btn btn-view-all" onClick={() => setNetworkViewMode('week')}>View All ({weekLeaders.length})</button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {networkViewMode === 'all' && renderExpandedList(allTimeLeaders, 'All Time Leaders')}
            {networkViewMode === 'month' && renderExpandedList(monthLeaders, `This Month Leaders — ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`)}
            {networkViewMode === 'week' && renderExpandedList(weekLeaders, `This Week Leaders — ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)}
          </>
        )}

        {/* Search with dropdown */}
        <div className="network-search-wrap">
          <div className="network-search-dropdown">
            <input
              type="text"
              placeholder="Search member name to see full network history..."
              value={networkSearch}
              onChange={(e) => {
                const q = e.target.value;
                setNetworkSearch(q);
                setSelectedNetworkMember(null);
                if (q.trim().length < 2) { setNetworkSearchResults([]); return; }
                const matches = allRegs.filter(r => getResidentName(r).toLowerCase().includes(q.toLowerCase()));
                setNetworkSearchResults(matches.slice(0, 8));
              }}
              className="network-search-input"
            />
            {networkSearchResults.length > 0 && (
              <div className="network-search-results">
                {networkSearchResults.map(reg => {
                  const name = getResidentName(reg);
                  return (
                    <div
                      key={reg.id}
                      className="network-search-result-item"
                      onClick={() => {
                        setSelectedNetworkMember(reg);
                        setNetworkSearch(name);
                        setNetworkSearchResults([]);
                        // Auto-expand all nodes for this member's tree
                        const newExpanded = new Set();
                        // Build upline keys
                        let curr = reg;
                        while (curr) {
                          newExpanded.add(curr.id);
                          const parentName = curr.referral_name;
                          if (!parentName) break;
                          const parent = allRegs.find(r => getResidentName(r) === parentName);
                          if (!parent || newExpanded.has(parent.id)) break;
                          curr = parent;
                        }
                        setExpandedNodes(newExpanded);
                      }}
                    >
                      <span className="nsr-name">{name}</span>
                      <span className="nsr-meta">{reg.barangay || '-'} · {reg.sector_category || '-'} · {reg.contact || 'No phone'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {selectedNetworkMember && (
            <button className="btn btn-sm btn-network-clear" onClick={() => { setSelectedNetworkMember(null); setNetworkSearch(''); }}>Clear</button>
          )}
        </div>

        {/* Member Network History View */}
        {selectedNetworkMember && (() => {
          const reg = selectedNetworkMember;
          const name = getResidentName(reg);

          // Build upline chain (ancestors)
          const upline = [];
          let currReg = reg;
          const visitedUpline = new Set();
          while (currReg) {
            const parentName = currReg.referral_name;
            if (!parentName || parentName === 'No Referral') break;
            const parent = allRegs.find(r => getResidentName(r) === parentName);
            if (!parent || visitedUpline.has(parent.id)) break;
            visitedUpline.add(parent.id);
            upline.unshift(parent);
            currReg = parent;
          }

          // Build downline tree starting from selected member
          const renderDownline = (member, depth) => {
            const mName = getResidentName(member);
            const children = getChildren(mName);
            const hasChildren = children.length > 0;
            const nodeKey = member.id;
            const isOpen = expandedNodes.has(nodeKey);
            const levelLabel = depth === 0 ? 'Direct' : `L${depth + 1}`;
            return (
              <div key={nodeKey} className="tree-branch" style={{ marginLeft: depth * 20 }}>
                <div className={`tree-node ${hasChildren ? 'has-children' : ''}`} onClick={() => { if (hasChildren) toggleNode(nodeKey); }}>
                  {hasChildren ? (
                    <span className={`tree-chevron ${isOpen ? 'open' : ''}`}>▸</span>
                  ) : (
                    <span className="tree-chevron-spacer" />
                  )}
                  {(member.photo_url || member.photo_base64) ? (
                    <img src={member.photo_url || member.photo_base64} alt="" className="tree-node-photo" />
                  ) : (
                    <div className="tree-node-placeholder" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>NP</div>
                  )}
                  <div className="tree-node-info">
                    <span className="tree-node-name">{mName}</span>
                    <span className="tree-node-meta">{member.barangay || '-'} · {member.sector_category} · <span className="tree-level-tag">{levelLabel}</span></span>
                  </div>
                  {hasChildren && <span className="tree-node-count">{children.length} downline</span>}
                  <span className={`status-badge status-${(member.status || 'pending').toLowerCase()}`}>{member.status || 'Pending'}</span>
                </div>
                {isOpen && children.map(child => renderDownline(child, depth + 1))}
              </div>
            );
          };

          return (
            <div className="network-history-view">
              {/* Upline */}
              {upline.length > 0 && (
                <div className="network-history-section">
                  <h4 className="network-history-title" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upline ({upline.length})</h4>
                  <div className="network-upline-chain">
                    {upline.map((ancestor, i) => (
                      <div key={ancestor.id} className="network-upline-item" style={{ marginLeft: i * 20 }}>
                        <span className="nu-connector">{i > 0 ? '└─ ' : ''}</span>
                        {(ancestor.photo_url || ancestor.photo_base64) ? (
                          <img src={ancestor.photo_url || ancestor.photo_base64} alt="" className="nu-photo" />
                        ) : (
                          <div className="nu-photo-placeholder" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>NP</div>
                        )}
                        <div className="nu-info">
                          <span className="nu-name">{getResidentName(ancestor)}</span>
                          <span className="nu-meta">{ancestor.barangay || '-'} · {ancestor.sector_category || '-'} · {ancestor.contact || '-'}</span>
                        </div>
                        <span className="nu-badge">L{i + 1} Up</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Member (Center) */}
              <div className="network-history-section highlight">
                <h4 className="network-history-title" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selected Member</h4>
                <div className="network-selected-card">
                  {(reg.photo_url || reg.photo_base64) ? (
                    <img src={reg.photo_url || reg.photo_base64} alt="" className="ns-photo" />
                  ) : (
                    <div className="ns-photo-placeholder" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No Photo</div>
                  )}
                  <div className="ns-info">
                    <span className="ns-name">{name}</span>
                    <span className="ns-meta">{reg.barangay || '-'} · {reg.sector_category || '-'} · {reg.contact || '-'}</span>
                    {reg.referral_name && <span className="ns-referral">Referred by: {reg.referral_name}</span>}
                  </div>
                  <span className="ns-badge">Selected</span>
                </div>
              </div>

              {/* Downline */}
              <div className="network-history-section">
                <h4 className="network-history-title" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Downline</h4>
                <div className="network-downline-tree">
                  {getChildren(name).length === 0 ? (
                    <div className="leader-card-empty">No downline referrals</div>
                  ) : (
                    getChildren(name).map(child => renderDownline(child, 0))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Recursive Tree Forest (default view when no member selected) */}
        {!selectedNetworkMember && (
          <div className="tree-forest">
            {regsLoading ? <div className="table-loading">Loading...</div>
              : allRegs.length === 0 ? <div className="table-empty">No registrations yet to build network.</div>
                : allTimeLeaders.map(({ name, l1, l2, l3, l4plus, total }) => {
                    const rootKey = `root:${name}`;
                    const isOpen = expandedNodes.has(rootKey);
                    const members = getChildren(name);
                    return (
                      <div key={name} className="tree-root">
                        <div className="tree-root-header" onClick={() => toggleNode(rootKey)}>
                          <span className={`tree-root-chevron ${isOpen ? 'open' : ''}`}>▸</span>
                          <span className="tree-root-icon" style={{ color: '#3b82f6', fontSize: '0.8rem', fontWeight: 700 }}>ROOT</span>
                          <span className="tree-root-name">{name}</span>
                          <span className="tree-root-badges">
                            <span className="level-badge l1">L1 {l1}</span>
                            {l2 > 0 && <span className="level-badge l2">L2 {l2}</span>}
                            {l3 > 0 && <span className="level-badge l3">L3 {l3}</span>}
                            {l4plus > 0 && <span className="level-badge l4">L4+ {l4plus}</span>}
                            <span className="level-badge total">Total {total}</span>
                          </span>
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
        )}
      </div>
    );
  };

  const renderMessages = () => {
    const typeIcons = {
      announcement: <Bell size={14} />,
      event_reminder: <Calendar size={14} />,
      emergency: <AlertTriangle size={14} />,
      broadcast: <Megaphone size={14} />
    };
    const typeNames = {
      announcement: 'Announcement',
      event_reminder: 'Event Reminder',
      emergency: 'Emergency',
      broadcast: 'Broadcast'
    };
    const typeColors = { announcement: '#3b82f6', event_reminder: '#f59e0b', emergency: '#ef4444', broadcast: '#10b981' };

    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3>Messages</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`msg-tab-btn ${msgTab === 'compose' ? 'active' : ''}`} onClick={() => setMsgTab('compose')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Pencil size={14} /> Compose
            </button>
            <button className={`msg-tab-btn ${msgTab === 'birthday' ? 'active' : ''}`} onClick={() => setMsgTab('birthday')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Cake size={14} /> Birthdays
            </button>
            <button className={`msg-tab-btn ${msgTab === 'inquiries' ? 'active' : ''}`} onClick={() => { setMsgTab('inquiries'); fetchContactInquiries(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Inbox size={14} /> Inquiries
            </button>
            <button className={`msg-tab-btn ${msgTab === 'history' ? 'active' : ''}`} onClick={() => { setMsgTab('history'); fetchMessages(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <History size={14} /> History
            </button>
          </div>
        </div>

        {msgTab === 'compose' && (
          <div className="msg-compose-wrap">
            {/* SMS Provider Status Banner */}
            {smsProvider && (
              <div className={`sms-provider-banner ${smsProvider.configured ? 'ok' : 'warn'}`}>
                {smsProvider.configured ? (
                  <>
                    <span className="sms-provider-dot ok" />
                    <strong>Provider: {smsProvider.provider?.toUpperCase()}</strong>
                    {smsProvider.senderName && <span> · Sender: {smsProvider.senderName}</span>}
                  </>
                ) : (
                  <>
                    <span className="sms-provider-dot warn" />
                    <strong>SMS not configured</strong>
                    <span> · Add SEMAPHORE_API_KEY to Vercel env vars</span>
                  </>
                )}
              </div>
            )}
            <form onSubmit={handleSendMessage} className="msg-compose-form">
              <div className="msg-type-selector">
                {Object.entries(typeNames).map(([key, name]) => (
                  <button
                    key={key}
                    type="button"
                    className={`msg-type-chip ${msgForm.type === key ? 'active' : ''}`}
                    onClick={() => setMsgForm(f => ({ ...f, type: key }))}
                    style={{ 
                      '--chip-color': typeColors[key],
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {typeIcons[key]}
                    <span>{name}</span>
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
                    <option value="specific">Specific User</option>
                    <option value="test">Test: Send to me only</option>
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

        {msgTab === 'birthday' && (
          <div className="msg-birthday-wrap">
            <div className="msg-birthday-header">
              <h4 style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Cake size={18} style={{ color: '#fbbf24' }} /> Today's Birthday Celebrators
              </h4>
              <span className="msg-birthday-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            {birthdayLoading ? (
              <div className="table-loading">Loading birthday celebrators...</div>
            ) : birthdayRecipients.length === 0 ? (
              <div className="msg-birthday-empty">
                <span className="msg-birthday-empty-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', width: '48px', height: '48px', background: '#fef3c7', borderRadius: '50%', color: '#d97706' }}>
                  <Cake size={24} />
                </span>
                <p>No birthday celebrators today.</p>
                <button className="btn btn-sm btn-secondary" onClick={fetchBirthdayCelebrators}>Refresh</button>
              </div>
            ) : (
              <>
                <div className="msg-birthday-list">
                  {birthdayRecipients.map(reg => {
                    const name = getResidentName(reg);
                    return (
                      <div key={reg.id} className="msg-birthday-item">
                        <div className="msg-birthday-avatar" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', color: '#d97706', borderRadius: '50%', width: '36px', height: '36px', flexShrink: 0 }}>
                          <Cake size={16} />
                        </div>
                        <div className="msg-birthday-info">
                          <span className="msg-birthday-name">{name}</span>
                          <span className="msg-birthday-meta">{reg.barangay || '-'} · {reg.sector_category || '-'} · {reg.contact}</span>
                        </div>
                        <span className="msg-birthday-badge">{reg.birthday}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="msg-birthday-compose">
                  <label className="msg-label">Birthday Message</label>
                  <p className="msg-birthday-hint">Use <code>{`{firstName}`}</code> to automatically insert each celebrator's first name.</p>
                  <textarea
                    className="msg-textarea"
                    placeholder="Type your birthday greeting..."
                    value={birthdayMessage}
                    onChange={e => setBirthdayMessage(e.target.value)}
                    maxLength={480}
                    rows={4}
                  />
                  <div className="msg-char-count">{birthdayMessage.length}/480 characters</div>

                  <div className="msg-birthday-preview-section">
                    <span className="msg-preview-label">What each celebrator will receive:</span>
                    <div className="msg-birthday-preview-list">
                      {birthdayRecipients.map(reg => {
                        const firstName = reg?.ValidResidents?.first_name || '';
                        const preview = birthdayMessage.replace(/\{firstName\}/g, firstName);
                        return (
                          <div key={reg.id} className="msg-birthday-preview-item">
                            <span className="msg-birthday-preview-name">{firstName || 'Unknown'}:</span>
                            <p className="msg-birthday-preview-text">{preview}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="msg-form-footer" style={{ marginTop: '16px' }}>
                    <button
                      className="btn btn-msg-send"
                      onClick={handleSendBirthday}
                      disabled={birthdaySending || !birthdayMessage.trim()}
                    >
                      {birthdaySending ? 'Sending...' : `Send to ${birthdayRecipients.length} celebrator${birthdayRecipients.length > 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {msgTab === 'inquiries' && (
          <div className="msg-history-wrap">
            {contactInquiriesLoading ? <div className="table-loading">Loading inquiries...</div>
              : contactInquiries.length === 0 ? <div className="table-empty">No contact inquiries yet.</div>
                : (
                  <div className="msg-list">
                    {contactInquiries.map(msg => (
                      <div key={msg.id} className="msg-card">
                        <div className="msg-card-header">
                          <span className="msg-card-type" style={{ background: '#3b82f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '4px' }}>
                            <Inbox size={14} style={{ color: '#fff' }} />
                          </span>
                          <span className="msg-card-date">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <h4 className="msg-card-title">{msg.name} — {msg.email}</h4>
                        <p className="msg-card-body">{msg.message}</p>
                        <div className="msg-card-stats">
                          <span className="msg-status-pill" style={{ background: msg.status === 'unread' ? '#fbbf24' : '#e5e7eb', color: msg.status === 'unread' ? '#92400e' : '#374151' }}>{msg.status}</span>
                          <span className="msg-stat">Type: {msg.inquiry_type || 'General'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                          <span className="msg-card-type" style={{ background: typeColors[msg.type] || '#6b7280', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '4px', color: '#fff' }}>
                            {typeIcons[msg.type] || <MessageSquare size={14} />}
                          </span>
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

  const renderReports = () => {
    const d = reportsData;
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'events', label: 'Events' },
      { id: 'barangays', label: 'Barangays' },
      { id: 'network', label: 'Network' },
      { id: 'messages', label: 'Messages' },
    ];

    const maxMonthly = Math.max(...(d?.monthlyTrend || []).map(m => m.count), 1);
    const maxSector = Math.max(...(d?.sectorBreakdown || []).map(s => s.count), 1);
    const maxReferrer = Math.max(...(d?.topReferrers || []).map(r => r.count), 1);
    const maxEventScans = Math.max(...(d?.events || []).map(e => e.scanCount), 1);
    const maxBrgyAid = Math.max(...(d?.barangays || []).map(b => b.aid), 1);

    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3>📊 Analytics & Reports</h3>
          {reportsLoading && <span className="panel-badge">Loading...</span>}
        </div>

        {/* Report Tabs */}
        <div className="report-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`report-tab ${reportsTab === t.id ? 'active' : ''}`} onClick={() => setReportsTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {!d && !reportsLoading && (
          <div className="table-empty" style={{ padding: '60px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
            <button className="btn btn-primary" onClick={fetchReportsData}>Load Analytics</button>
          </div>
        )}

        {reportsLoading && (
          <div className="table-loading" style={{ padding: '60px 24px' }}>Loading analytics...</div>
        )}

        {d && reportsTab === 'overview' && (
          <>
            {/* KPI Row */}
            <div className="kpi-grid four-col" style={{ marginBottom: 24 }}>
              <div className="kpi-card">
                <div className="kpi-icon kpi-green"><Users size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">Registered Voters</span>
                  <span className="kpi-value">{d.totals.totalResidents.toLocaleString()}</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon kpi-blue"><ClipboardList size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">EM Card Members</span>
                  <span className="kpi-value">{d.totals.totalRegistrations.toLocaleString()}</span>
                  <span className="kpi-change">{((d.totals.totalRegistrations / (d.totals.totalResidents || 1)) * 100).toFixed(1)}% penetration</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon kpi-amber"><CheckCircle size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">Aid Distributed</span>
                  <span className="kpi-value">{d.totals.totalAid.toLocaleString()}</span>
                  <span className="kpi-change">{d.events.length} event{d.events.length !== 1 ? 's' : ''} held</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon kpi-purple"><MessageSquare size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">SMS Delivery</span>
                  <span className="kpi-value">{d.sms.totalRecipients > 0 ? Math.round((d.sms.deliveredRecipients / d.sms.totalRecipients) * 100) : 0}%</span>
                  <span className="kpi-change">{d.sms.deliveredRecipients.toLocaleString()} / {d.sms.totalRecipients.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="dashboard-main-grid two-col">
              {/* Monthly Trend */}
              <div className="admin-panel dash-panel">
                <div className="panel-header">
                  <div className="panel-header-left"><h3>Registration Trend (6 Months)</h3></div>
                </div>
                <div className="analytics-chart-wrap">
                  {d.monthlyTrend.map(({ label, count }, i) => {
                    const barWidth = Math.max((count / maxMonthly) * 100, 1.5);
                    const colors = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857', '#a7f3d0'];
                    return (
                      <div key={label} className="analytics-bar-row">
                        <span className="analytics-bar-name">{label}</span>
                        <div className="analytics-bar-track">
                          <div className="analytics-bar-fill" style={{ width: `${barWidth}%`, backgroundColor: colors[i % colors.length] }} />
                        </div>
                        <span className="analytics-bar-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sector Breakdown */}
              <div className="admin-panel dash-panel">
                <div className="panel-header">
                  <div className="panel-header-left"><h3>Sector Breakdown</h3></div>
                </div>
                <div className="analytics-chart-wrap">
                  {d.sectorBreakdown.map(({ name, count }, i) => {
                    const pct = d.totals.totalRegistrations > 0 ? ((count / d.totals.totalRegistrations) * 100).toFixed(1) : '0.0';
                    const barWidth = Math.max((count / maxSector) * 100, 1.5);
                    const colors = ['#3b82f6', '#2563eb', '#60a5fa', '#93c5fd', '#1d4ed8', '#0ea5e9', '#0284c7', '#38bdf8'];
                    return (
                      <div key={name} className="analytics-bar-row">
                        <span className="analytics-bar-name">{name}</span>
                        <div className="analytics-bar-track">
                          <div className="analytics-bar-fill" style={{ width: `${barWidth}%`, backgroundColor: colors[i % colors.length] }} />
                        </div>
                        <span className="analytics-bar-count">{count}</span>
                        <span className="analytics-bar-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {d && reportsTab === 'events' && (
          <div className="admin-panel dash-panel">
            <div className="panel-header">
              <div className="panel-header-left"><h3>Event Performance</h3><span className="panel-subtitle">{d.events.length} events · {d.totals.totalAid.toLocaleString()} total scans</span></div>
            </div>
            <div className="analytics-chart-wrap">
              {d.events.map((evt, i) => {
                const barWidth = Math.max((evt.scanCount / maxEventScans) * 100, 1.5);
                const colors = ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#b45309', '#f97316'];
                return (
                  <div key={evt.id} className="analytics-bar-row">
                    <span className="analytics-bar-name">{evt.event_name} {evt.household_mode && <span className="event-badge-hh">🏠</span>}</span>
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-fill" style={{ width: `${barWidth}%`, backgroundColor: colors[i % colors.length] }} />
                    </div>
                    <span className="analytics-bar-count">{evt.scanCount.toLocaleString()}</span>
                    <span className="analytics-bar-pct">{evt.event_date ? new Date(evt.event_date).toLocaleDateString() : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {d && reportsTab === 'barangays' && (
          <div className="admin-panel dash-panel">
            <div className="panel-header">
              <div className="panel-header-left"><h3>Barangay Performance</h3><span className="panel-subtitle">{d.barangays.length} barangays · sorted by voters</span></div>
            </div>
            <div className="analytics-chart-wrap" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {d.barangays.map((b, i) => {
                const barWidth = Math.max((b.aid / maxBrgyAid) * 100, 1.5);
                const colors = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857', '#a7f3d0', '#6b7280', '#9ca3af'];
                return (
                  <div key={b.barangay} className="analytics-bar-row">
                    <span className="analytics-bar-name">{b.barangay}</span>
                    <div className="analytics-bar-track">
                      <div className="analytics-bar-fill" style={{ width: `${barWidth}%`, backgroundColor: colors[i % colors.length] }} />
                    </div>
                    <span className="analytics-bar-count" title={`${b.members} members / ${b.voters} voters`}>{b.aid} aid</span>
                    <span className="analytics-bar-pct">{b.regRate}% reg</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {d && reportsTab === 'network' && (
          <div className="dashboard-main-grid two-col">
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left"><h3>Top Referrers</h3><span className="panel-subtitle">{d.topReferrers.length} leaders</span></div>
              </div>
              <div className="analytics-chart-wrap">
                {d.topReferrers.map((r, i) => {
                  const barWidth = Math.max((r.count / maxReferrer) * 100, 1.5);
                  const colors = ['#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd', '#6d28d9', '#5b21b9'];
                  return (
                    <div key={r.name} className="analytics-bar-row">
                      <span className="analytics-bar-name">{r.name}</span>
                      <div className="analytics-bar-track">
                        <div className="analytics-bar-fill" style={{ width: `${barWidth}%`, backgroundColor: colors[i % colors.length] }} />
                      </div>
                      <span className="analytics-bar-count">{r.count}</span>
                      <span className="analytics-bar-pct">referrals</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left"><h3>Network Summary</h3></div>
              </div>
              <div className="analytics-chart-wrap">
                <div className="analytics-bar-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                  <span className="analytics-bar-name">Total Referral Links</span>
                  <span className="analytics-bar-count" style={{ marginLeft: 'auto' }}>{d.topReferrers.reduce((sum, r) => sum + r.count, 0).toLocaleString()}</span>
                </div>
                <div className="analytics-bar-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                  <span className="analytics-bar-name">Unique Referrers</span>
                  <span className="analytics-bar-count" style={{ marginLeft: 'auto' }}>{d.topReferrers.length.toLocaleString()}</span>
                </div>
                <div className="analytics-bar-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                  <span className="analytics-bar-name">Avg Referrals per Leader</span>
                  <span className="analytics-bar-count" style={{ marginLeft: 'auto' }}>{d.topReferrers.length > 0 ? (d.topReferrers.reduce((sum, r) => sum + r.count, 0) / d.topReferrers.length).toFixed(1) : '0.0'}</span>
                </div>
                <div className="analytics-bar-row">
                  <span className="analytics-bar-name">Top Performer</span>
                  <span className="analytics-bar-count" style={{ marginLeft: 'auto' }}>{d.topReferrers[0]?.name || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {d && reportsTab === 'messages' && (
          <div className="dashboard-main-grid two-col">
            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left"><h3>SMS Campaign Overview</h3></div>
              </div>
              <div className="analytics-chart-wrap">
                <div className="analytics-bar-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                  <span className="analytics-bar-name">Total Campaigns</span>
                  <span className="analytics-bar-count" style={{ marginLeft: 'auto' }}>{d.sms.totalMessages.toLocaleString()}</span>
                </div>
                <div className="analytics-bar-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                  <span className="analytics-bar-name">Sent Successfully</span>
                  <span className="analytics-bar-count" style={{ marginLeft: 'auto', color: 'var(--emerald)' }}>{d.sms.sentMessages.toLocaleString()}</span>
                </div>
                <div className="analytics-bar-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                  <span className="analytics-bar-name">Total Recipients</span>
                  <span className="analytics-bar-count" style={{ marginLeft: 'auto' }}>{d.sms.totalRecipients.toLocaleString()}</span>
                </div>
                <div className="analytics-bar-row">
                  <span className="analytics-bar-name">Delivered</span>
                  <span className="analytics-bar-count" style={{ marginLeft: 'auto', color: 'var(--emerald)' }}>{d.sms.deliveredRecipients.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="admin-panel dash-panel">
              <div className="panel-header">
                <div className="panel-header-left"><h3>Delivery Rate</h3></div>
              </div>
              <div className="analytics-chart-wrap" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--emerald)' }}>
                    {d.sms.totalRecipients > 0 ? Math.round((d.sms.deliveredRecipients / d.sms.totalRecipients) * 100) : 0}%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: 8 }}>
                    {d.sms.deliveredRecipients.toLocaleString()} of {d.sms.totalRecipients.toLocaleString()} messages delivered
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAccounts = () => (
    <div className="admin-panel">
      <div className="panel-header">
        <h3><Shield size={22} /> Accounts Management</h3>
        <button className="btn btn-sm btn-primary" onClick={() => setShowCreateAccount(true)}>+ Create Account</button>
      </div>

      {accountsLoading ? (
        <div className="table-loading">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="table-empty">
          <p>No accounts found.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateAccount(true)}>Create First Account</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Created</th><th>Last Sign In</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id}>
                  <td>{acc.email}</td>
                  <td><span className={`role-badge role-${acc.role}`}>{acc.role}</span></td>
                  <td>{acc.created_at ? new Date(acc.created_at).toLocaleDateString() : '—'}</td>
                  <td>{acc.last_sign_in_at ? new Date(acc.last_sign_in_at).toLocaleString() : 'Never'}</td>
                  <td>
                    <button className="btn btn-xs btn-outline" onClick={() => { setEditAccount(acc); setEditAccountForm({ role: acc.role, password: '', confirmPassword: '' }); }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Account Modal */}
      {editAccount && (
        <div className="modal-overlay" onClick={() => setEditAccount(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Account — {editAccount.email}</h3>
              <button className="modal-close-x" onClick={() => setEditAccount(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateAccount} className="modal-form">
              <div className="form-group">
                <label>Role</label>
                <select value={editAccountForm.role} onChange={e => setEditAccountForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input type="password" value={editAccountForm.password} onChange={e => setEditAccountForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={editAccountForm.confirmPassword} onChange={e => setEditAccountForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-modal-secondary" onClick={() => setEditAccount(null)}>Cancel</button>
                <button type="submit" className="btn btn-modal-primary" disabled={editAccountLoading}>
                  {editAccountLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderSystem = () => {
    const STORAGE_LIMIT = 100 * 1024 * 1024 * 1024;
    const DB_LIMIT = 8 * 1024 * 1024 * 1024;
    const filePct = systemStats ? Math.min(100, ((systemStats.totalUsedBytes || 0) / STORAGE_LIMIT) * 100) : 0;
    const dbPct = systemStats ? Math.min(100, ((systemStats.totalDbSize || 0) / DB_LIMIT) * 100) : 0;
    const totalRecords = systemStats ? (
      systemStats.tables.validResidents +
      systemStats.tables.registrations +
      systemStats.tables.eventScans +
      systemStats.tables.scanEvents
    ) : 0;
    const largestTable = systemStats?.dbSizes?.[0];
    const maxTableSize = largestTable?.size_bytes || 1;

    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3><Monitor size={22} /> System Monitoring</h3>
          <button className="btn btn-sm btn-primary" onClick={fetchSystemStats} disabled={systemLoading}>
            <Activity size={14} /> {systemLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {systemStats?.error && (
          <div className="table-empty" style={{ color: '#ef4444' }}>
            <AlertTriangle size={24} />
            <p>Error loading stats: {systemStats.error}</p>
          </div>
        )}

        {systemLoading && !systemStats && (
          <div className="table-loading">Loading system stats...</div>
        )}

        {systemStats && !systemStats.error && (
          <>
            {/* Timestamp */}
            <div className="system-timestamp">Last updated: {systemStats.timestamp}</div>

            {/* Overview Cards */}
            {(() => {
              const domainExpiry = new Date('2027-05-27');
              const daysLeft = Math.ceil((domainExpiry - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div className="system-overview-grid">
                  <div className="system-overview-card">
                    <div className="system-overview-icon green"><Users size={22} /></div>
                    <div className="system-overview-content">
                      <span className="system-overview-label">Total Records</span>
                      <span className="system-overview-value">{totalRecords.toLocaleString()}</span>
                      <span className="system-overview-sub">Across all tables</span>
                    </div>
                  </div>
                  <div className="system-overview-card">
                    <div className="system-overview-icon blue"><Folder size={22} /></div>
                    <div className="system-overview-content">
                      <span className="system-overview-label">File Storage</span>
                      <span className="system-overview-value">{formatBytes(systemStats.totalUsedBytes || 0)}</span>
                      <span className="system-overview-sub">{systemStats.totalFileCount?.toLocaleString() || 0} files in {systemStats.buckets.length} buckets</span>
                    </div>
                  </div>
                  <div className="system-overview-card">
                    <div className="system-overview-icon purple"><Database size={22} /></div>
                    <div className="system-overview-content">
                      <span className="system-overview-label">Database Size</span>
                      <span className="system-overview-value">{formatBytes(systemStats.totalDbSize || 0)}</span>
                      <span className="system-overview-sub">{systemStats.dbSizes?.length || 0} tables</span>
                    </div>
                  </div>
                  <div className="system-overview-card">
                    <div className="system-overview-icon orange"><BarChart3 size={22} /></div>
                    <div className="system-overview-content">
                      <span className="system-overview-label">Storage Usage</span>
                      <span className="system-overview-value">{((systemStats.totalUsedBytes + systemStats.totalDbSize) / (STORAGE_LIMIT + DB_LIMIT) * 100).toFixed(2)}%</span>
                      <span className="system-overview-sub">of total plan capacity</span>
                    </div>
                  </div>
                  <div className="system-overview-card">
                    <div className="system-overview-icon teal"><Globe size={22} /></div>
                    <div className="system-overview-content">
                      <span className="system-overview-label">Domain</span>
                      <span className="system-overview-value">em-card.com</span>
                      <span className="system-overview-sub">Expires May 27, 2027 · {daysLeft} days left</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, marginBottom: 28 }}>
              {/* Left: Database Tables */}
              <div className="system-section" style={{ marginBottom: 0 }}>
                <h4><Database size={18} /> Database Tables</h4>
                <div className="system-grid">
                  <div className="system-card">
                    <span className="system-card-label">Valid Residents</span>
                    <span className="system-card-value">{systemStats.tables.validResidents.toLocaleString()}</span>
                    {systemStats.errors.residents && <span className="system-card-error">{systemStats.errors.residents}</span>}
                  </div>
                  <div className="system-card">
                    <span className="system-card-label">Registrations</span>
                    <span className="system-card-value">{systemStats.tables.registrations.toLocaleString()}</span>
                    {systemStats.errors.registrations && <span className="system-card-error">{systemStats.errors.registrations}</span>}
                  </div>
                  <div className="system-card">
                    <span className="system-card-label">Event Scans</span>
                    <span className="system-card-value">{systemStats.tables.eventScans.toLocaleString()}</span>
                    {systemStats.errors.eventScans && <span className="system-card-error">{systemStats.errors.eventScans}</span>}
                  </div>
                  <div className="system-card">
                    <span className="system-card-label">Scan Events</span>
                    <span className="system-card-value">{systemStats.tables.scanEvents.toLocaleString()}</span>
                    {systemStats.errors.scanEvents && <span className="system-card-error">{systemStats.errors.scanEvents}</span>}
                  </div>
                  <div className="system-card">
                    <span className="system-card-label">Upcoming Events</span>
                    <span className="system-card-value">{systemStats.tables.upcomingEvents.toLocaleString()}</span>
                    {systemStats.errors.upcomingEvents && <span className="system-card-error">{systemStats.errors.upcomingEvents}</span>}
                  </div>
                  <div className="system-card">
                    <span className="system-card-label">Contact Inquiries</span>
                    <span className="system-card-value">{systemStats.tables.inquiries.toLocaleString()}</span>
                    {systemStats.errors.inquiries && <span className="system-card-error">{systemStats.errors.inquiries}</span>}
                  </div>
                  <div className="system-card">
                    <span className="system-card-label">Admin Users</span>
                    <span className="system-card-value">{systemStats.tables.adminUsers.toLocaleString()}</span>
                    {systemStats.errors.adminUsers && <span className="system-card-error">{systemStats.errors.adminUsers}</span>}
                  </div>
                </div>
              </div>

              {/* Right: Storage Progress */}
              <div className="system-section" style={{ marginBottom: 0 }}>
                <h4><HardDrive size={18} /> Storage Capacity</h4>

                {/* File Storage */}
                <div className="system-storage-card">
                  <div className="system-storage-header">
                    <span className="system-storage-label"><Folder size={14} /> File Storage</span>
                    <span className="system-storage-numbers">{formatBytes(systemStats.totalUsedBytes || 0)} / 100 GB</span>
                  </div>
                  <div className="system-storage-bar">
                    <div className="system-storage-bar-fill" style={{
                      width: `${filePct}%`,
                      background: filePct > 90 ? '#ef4444' : filePct > 70 ? '#f59e0b' : 'linear-gradient(90deg, #10b981, #059669)',
                    }} />
                  </div>
                  <div className="system-storage-remaining">{filePct.toFixed(1)}% used · {formatBytes(STORAGE_LIMIT - (systemStats.totalUsedBytes || 0))} remaining</div>
                </div>

                {/* Database Storage */}
                <div className="system-storage-card">
                  <div className="system-storage-header">
                    <span className="system-storage-label"><Database size={14} /> Database Storage</span>
                    <span className="system-storage-numbers">{formatBytes(systemStats.totalDbSize || 0)} / 8 GB</span>
                  </div>
                  <div className="system-storage-bar">
                    <div className="system-storage-bar-fill" style={{
                      width: `${dbPct}%`,
                      background: dbPct > 90 ? '#ef4444' : dbPct > 70 ? '#f59e0b' : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                    }} />
                  </div>
                  <div className="system-storage-remaining">{dbPct.toFixed(1)}% used · {formatBytes(DB_LIMIT - (systemStats.totalDbSize || 0))} remaining</div>
                </div>

                {/* Bucket List */}
                <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '16px 0 10px' }}>Storage Buckets</h5>
                {systemStats.bucketError ? (
                  <div style={{ fontSize: '0.78rem', color: '#ef4444' }}>Storage error: {systemStats.bucketError}</div>
                ) : systemStats.buckets.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No storage buckets found.</div>
                ) : (
                  <div className="system-bucket-list">
                    {systemStats.buckets.map(bucket => (
                      <div key={bucket.id}>
                        <div className="system-bucket-item">
                          <div className="system-bucket-info">
                            <span className="system-bucket-name">{bucket.name}</span>
                            <span className="system-bucket-meta">{bucket.fileCount} files · {formatBytes(bucket.size || 0)}</span>
                          </div>
                          <span className={`system-bucket-status ${bucket.public ? 'public' : 'private'}`}>
                            {bucket.public ? 'Public' : 'Private'}
                          </span>
                        </div>
                        {bucket.listError && (
                          <div style={{ fontSize: '0.7rem', color: '#ef4444', padding: '4px 16px' }}>{bucket.listError}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table Sizes Grid */}
            <div className="system-section">
              <h4><Server size={18} /> Table Storage Sizes</h4>
              {systemStats.dbSizeError ? (
                <div style={{ fontSize: '0.78rem', color: '#ef4444', padding: '6px 0' }}>{systemStats.dbSizeError}</div>
              ) : systemStats.dbSizes.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '6px 0' }}>No table size data available.</div>
              ) : (
                <div className="system-tablesize-grid">
                  {systemStats.dbSizes.map((t) => {
                    const pct = Math.min(100, ((t.size_bytes || 0) / maxTableSize) * 100);
                    return (
                      <div className="system-tablesize-card" key={t.table_name}>
                        <div className="system-tablesize-top">
                          <span className="system-tablesize-name">{t.table_name}</span>
                          <span className="system-tablesize-value">{t.size_pretty}</span>
                        </div>
                        <div className="system-tablesize-bar-bg">
                          <div className="system-tablesize-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Connection Health */}
            <div className="system-section">
              <h4><Activity size={18} /> Connection Health</h4>
              <div className="system-health-grid">
                <div className="system-health-item">
                  <span className="system-health-dot green" />
                  <span>Supabase API</span>
                </div>
                <div className="system-health-item">
                  <span className="system-health-dot green" />
                  <span>Database</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderAdminLogs = () => {
    const totalPages = Math.ceil(logsTotal / logsPerPage) || 1;
    const goToPage = (p) => {
      const newPage = Math.max(1, Math.min(p, totalPages));
      setLogsPage(newPage);
      fetchAdminLogs(newPage);
    };

    const actionTypeLabel = (type) => {
      const labels = {
        login: 'Login',
        logout: 'Logout',
        add_resident: 'Add Resident',
        edit_resident: 'Edit Resident',
        delete_resident: 'Delete Resident',
        approve_member: 'Approve Member',
        reject_member: 'Reject Member',
        edit_member: 'Edit Member',
        delete_member: 'Delete Member',
        add_event: 'Add Event',
        edit_event: 'Edit Event',
        delete_event: 'Delete Event',
        scan_event: 'Scan Event',
        bulk_upload: 'Bulk Upload',
      };
      return labels[type] || type;
    };

    const actionTypeColor = (type) => {
      if (type.includes('delete')) return '#ef4444';
      if (type.includes('edit')) return '#f59e0b';
      if (type.includes('add') || type.includes('approve')) return '#10b981';
      if (type.includes('login') || type.includes('logout')) return '#3b82f6';
      if (type.includes('scan')) return '#8b5cf6';
      return '#64748b';
    };

    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3><History size={22} /> Admin Activity Logs</h3>
          <span className="panel-badge">{logsTotal} ENTRIES</span>
        </div>

        {/* Filters */}
        <div className="residents-action-bar" style={{ marginBottom: 14 }}>
          <div className="action-bar-left" style={{ flexWrap: 'wrap', gap: 8 }}>
            <select
              className="filter-select"
              value={logsFilterType}
              onChange={(e) => { setLogsFilterType(e.target.value); setLogsPage(1); fetchAdminLogs(1); }}
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="add_resident">Add Resident</option>
              <option value="edit_resident">Edit Resident</option>
              <option value="delete_resident">Delete Resident</option>
              <option value="approve_member">Approve Member</option>
              <option value="reject_member">Reject Member</option>
              <option value="edit_member">Edit Member</option>
              <option value="delete_member">Delete Member</option>
              <option value="add_event">Add Event</option>
              <option value="edit_event">Edit Event</option>
              <option value="delete_event">Delete Event</option>
              <option value="scan_event">Scan Event</option>
              <option value="bulk_upload">Bulk Upload</option>
            </select>
            <input
              type="date"
              className="filter-select"
              value={logsStartDate}
              onChange={(e) => { setLogsStartDate(e.target.value); setLogsPage(1); }}
              placeholder="Start Date"
            />
            <input
              type="date"
              className="filter-select"
              value={logsEndDate}
              onChange={(e) => { setLogsEndDate(e.target.value); setLogsPage(1); }}
              placeholder="End Date"
            />
            <button className="btn btn-action-outline" onClick={() => fetchAdminLogs(logsPage)}>
              <Filter size={14} /> Apply Filters
            </button>
            <button className="btn btn-action-outline" onClick={() => {
              setLogsFilterType(''); setLogsFilterAdmin(''); setLogsStartDate(''); setLogsEndDate(''); setLogsPage(1); fetchAdminLogs(1);
            }}>
              <X size={14} /> Clear
            </button>
          </div>
        </div>

        {logsLoading ? (
          <div className="table-loading">Loading logs...</div>
        ) : allLogs.length === 0 ? (
          <div className="table-empty">No activity logs found.</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {allLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{log.admin_email}</span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: `${actionTypeColor(log.action_type)}15`,
                          color: actionTypeColor(log.action_type),
                        }}>
                          {actionTypeLabel(log.action_type)}
                        </span>
                      </td>
                      <td>
                        {log.target_name ? (
                          <span style={{ fontSize: '0.82rem' }}>{log.target_name}</span>
                        ) : log.target_id ? (
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{log.target_id.slice(0, 8)}...</span>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <pre style={{ fontSize: '0.72rem', margin: 0, background: '#f8fafc', padding: '4px 8px', borderRadius: 6, overflow: 'auto', maxHeight: 60 }}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-row" style={{ marginTop: 14 }}>
                <span className="pagination-info">Page {logsPage} of {totalPages} · {logsTotal} total</span>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => goToPage(logsPage - 1)} disabled={logsPage <= 1}>Prev</button>
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} className={`pagination-btn ${p === logsPage ? 'active' : ''}`} onClick={() => goToPage(p)}>{p}</button>
                    );
                  })}
                  <button className="pagination-btn" onClick={() => goToPage(logsPage + 1)} disabled={logsPage >= totalPages}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderUpcomingEvents = () => (
    <div className="admin-panel">
      <div className="panel-header">
        <h3><Calendar size={22} /> Upcoming Events</h3>
        <button className="btn btn-sm btn-primary" onClick={() => { setShowEventForm(true); setEditingEvent(null); setEventForm({ title: '', description: '', image_url: '', event_date: '', event_time: '', location: '' }); }}>+ Add Event</button>
      </div>

      {upcomingEventsLoading ? (
        <div className="table-loading">Loading events...</div>
      ) : upcomingEventsList.length === 0 ? (
        <div className="table-empty">No upcoming events yet. Click "Add Event" to create one.</div>
      ) : (
        <div className="event-list-grid" style={{ marginBottom: 0 }}>
          {upcomingEventsList.map(evt => (
            <div className="event-card" key={evt.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: 12 }}>
              {evt.image_url && (
                <img src={evt.image_url} alt={evt.title} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
              )}
              <div className="event-card-body" style={{ textAlign: 'left' }}>
                <h5 style={{ marginBottom: 4 }}>{evt.title}</h5>
                <p style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35, marginBottom: 6 }}>{evt.description || 'No description'}</p>
                <small style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📅 {new Date(evt.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</small>
                {evt.event_time && <small style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🕐 {evt.event_time}</small>}
                {evt.location && <small style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📍 {evt.location}</small>}
              </div>
              <div className="event-card-actions" style={{ flexDirection: 'row', marginTop: 'auto', gap: 8 }}>
                <button className="btn btn-sm btn-secondary" onClick={() => {
                  setEditingEvent(evt);
                  setEventForm({
                    title: evt.title,
                    description: evt.description || '',
                    image_url: evt.image_url || '',
                    event_date: evt.event_date,
                    event_time: evt.event_time || '',
                    location: evt.location || ''
                  });
                  setShowEventForm(true);
                }}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteEvent(evt.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="modal-overlay" onClick={() => { setShowEventForm(false); setEditingEvent(null); }}>
          <div className="modal-card event-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
              <button className="modal-close-x" onClick={() => { setShowEventForm(false); setEditingEvent(null); }}>✕</button>
            </div>
            <form onSubmit={handleSaveEvent} className="modal-form">
              <div className="event-form-grid">
                <div className="form-group">
                  <label>Event Title <span className="req-star">*</span></label>
                  <input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Community Assembly" />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Community Center" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description of the event" />
              </div>
              <div className="event-form-grid">
                <div className="form-group">
                  <label>Event Date <span className="req-star">*</span></label>
                  <input type="date" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Event Time</label>
                  <input value={eventForm.event_time} onChange={e => setEventForm(f => ({ ...f, event_time: e.target.value }))} placeholder="e.g. 10 AM to 3 PM" />
                </div>
              </div>
              <div className="form-group">
                <label>Event Image</label>
                <div className="event-upload-wrap">
                  <input
                    type="file"
                    accept="image/*"
                    id="event-image-upload"
                    onChange={handleEventImageUpload}
                    hidden
                  />
                  <label htmlFor="event-image-upload" className="btn btn-sm btn-secondary event-upload-btn">
                    {eventImageUploading ? 'Compressing & Uploading...' : eventForm.image_url ? 'Change Image' : 'Upload Image'}
                  </label>
                  {eventForm.image_url && (
                    <span className="event-upload-filename">Image uploaded</span>
                  )}
                </div>
              </div>
              {eventForm.image_url && (
                <div className="event-image-preview">
                  <img src={eventForm.image_url} alt="Preview" onError={e => { e.target.style.display = 'none'; }} />
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-modal-secondary" onClick={() => { setShowEventForm(false); setEditingEvent(null); }}>Cancel</button>
                <button type="submit" className="btn btn-modal-primary" disabled={eventFormLoading}>
                  {eventFormLoading ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    } catch (e) { /* silent */ }
    setEventsLoading(false);
  };

  const fetchEventScans = async (eventId) => {
    try {
      // 1. Fetch latest 100 scans (stays well under Supabase 1000-row limit)
      const { data, error } = await supabase
        .from('event_scans')
        .select('*, registrations(qr_token, em_card_no, contact, purok, lot, block, phase, house_no, gender, civil_status, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct))')
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
    } catch (e) { /* silent */ }
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
    } catch (e) { /* silent */ }
  };

  const openEventRecords = async (evt) => {
    setViewEventRecords(evt);
    setEventRecordsLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_scans')
        .select('*, registrations(qr_token, em_card_no, contact, purok, lot, block, phase, house_no, gender, civil_status, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct))')
        .eq('event_id', evt.id)
        .order('scanned_at', { ascending: false });
      if (!error) setEventRecords(data || []);
    } catch (e) { /* silent */ }
    setEventRecordsLoading(false);
  };

  const fetchReportsData = async () => {
    setReportsLoading(true);
    try {
      // 1. All events with scan counts
      const { data: allEvents } = await supabase.from('scan_events').select('*').order('created_at', { ascending: false });
      const eventIds = (allEvents || []).map(e => e.id);
      let eventScanCounts = {};
      if (eventIds.length > 0) {
        const { data: scanCounts } = await supabase.rpc('get_event_scan_counts');
        (scanCounts || []).forEach(r => { eventScanCounts[r.event_id] = r.count; });
      }
      const eventsWithCounts = (allEvents || []).map(e => ({ ...e, scanCount: eventScanCounts[e.id] || 0 }));

      // 2. Monthly registration trend (last 6 months)
      const now = new Date();
      const monthLabels = [];
      const monthQueries = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthLabels.push(label);
        const start = d.toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        monthQueries.push(
          supabase.from('registrations').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end)
        );
      }
      const monthlyCounts = await Promise.all(monthQueries);
      const monthlyTrend = monthLabels.map((label, i) => ({ label, count: monthlyCounts[i].count || 0 }));

      // 3. Sector breakdown
      const { data: sectorData } = await supabase.from('registrations').select('sector_category');
      const sectorMap = {};
      (sectorData || []).forEach(r => {
        const s = r.sector_category || 'Unspecified';
        sectorMap[s] = (sectorMap[s] || 0) + 1;
      });
      const sectorBreakdown = Object.entries(sectorMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

      // 4. Top referrers
      const { data: allRegistrations } = await supabase.from('registrations').select('referral_name');
      const refMap = {};
      (allRegistrations || []).forEach(r => {
        if (r.referral_name) {
          refMap[r.referral_name] = (refMap[r.referral_name] || 0) + 1;
        }
      });
      const topReferrers = Object.entries(refMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);

      // 5. SMS stats
      const { count: totalMessages } = await supabase.from('messages').select('*', { count: 'exact', head: true });
      const { count: sentMessages } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'sent');
      const { count: totalRecipients } = await supabase.from('message_recipients').select('*', { count: 'exact', head: true });
      const { count: deliveredRecipients } = await supabase.from('message_recipients').select('*', { count: 'exact', head: true }).eq('status', 'sent');

      // 6. Barangay combined (voters + members + aid)
      const { data: votersByBrgy } = await supabase.rpc('get_voters_by_barangay');
      const { data: regsByBrgy } = await supabase.rpc('get_regs_by_barangay');
      const { data: aidData } = await supabase.from('registrations').select('barangay').gt('scan_count', 0);
      const aidMap = {};
      (aidData || []).forEach(r => {
        const b = (r.barangay || 'Unknown').trim();
        aidMap[b] = (aidMap[b] || 0) + 1;
      });
      const brgyPerformance = (votersByBrgy || []).map(v => {
        const regEntry = (regsByBrgy || []).find(r => r.barangay === v.barangay);
        const regCount = regEntry ? regEntry.count : 0;
        const aidCount = aidMap[v.barangay] || 0;
        return {
          barangay: v.barangay,
          voters: v.count,
          members: regCount,
          aid: aidCount,
          regRate: v.count > 0 ? ((regCount / v.count) * 100).toFixed(1) : '0.0',
          aidRate: v.count > 0 ? ((aidCount / v.count) * 100).toFixed(1) : '0.0',
        };
      }).sort((a, b) => b.voters - a.voters);

      setReportsData({
        events: eventsWithCounts,
        monthlyTrend,
        sectorBreakdown,
        topReferrers,
        sms: { totalMessages: totalMessages || 0, sentMessages: sentMessages || 0, totalRecipients: totalRecipients || 0, deliveredRecipients: deliveredRecipients || 0 },
        barangays: brgyPerformance,
        totals: { totalResidents, totalRegistrations, totalAid: (aidData || []).length },
      });
    } catch (err) {
      // silent
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchBarangays = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_voters_by_barangay');
      if (error) throw error;
      const barangayList = (data || []).map(v => v.barangay).sort();
      setAllBarangays(barangayList);
    } catch (err) {
      // silent
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEventForm.event_name.trim()) return;
    try {
      const { data, error } = await supabase.from('scan_events').insert({
        event_name: newEventForm.event_name.trim(),
        event_date: newEventForm.event_date || null,
        location: newEventForm.location.trim() || null,
        household_mode: newEventForm.household_mode || false,
        selected_barangays: newEventForm.selected_barangays.length > 0 ? newEventForm.selected_barangays : null,
        status: 'Active',
        created_by: username,
      }).select().single();
      if (error) throw error;
      showToast('Event created: ' + data.event_name, 'success');
      setShowCreateEvent(false);
      setNewEventForm({ event_name: '', event_date: '', location: '', household_mode: false, selected_barangays: [] });
      setEvents(prev => [data, ...prev]);
    } catch (err) {
      showToast('Failed to create event: ' + err.message, 'error');
    }
  };

  const resetScanState = () => {
    setScanResult(null);
    setFocusPoint(null);
    scanInProgressRef.current = false;
    // NOTE: localScanCountRef is NOT reset — it persists across scans for the event
    // Restart camera scanner if in camera mode
    if (scannerInputMode === 'camera') {
      setTimeout(() => startCamera(), 300);
    }
  };

  const handleEventScan = async (rawToken) => {
    if (!rawToken.trim() || !selectedEvent) return;
    scanInProgressRef.current = true;
    setScanLoading(true);
    setScanResult(null);

    try {
      // Aggressive cleaning for phone camera input
      let cleanToken = rawToken
        .trim()
        .replace(/[^\x20-\x7E]/g, '') // Remove non-printable chars
        .replace(/\s/g, '')             // Remove all whitespace
        .replace(/^[\uFEFF]/, '');      // Remove BOM

      // If the QR contains a URL, extract the token from it
      // e.g. https://www.em-card.com/card/EM-1234567890
      const urlTokenMatch = cleanToken.match(/\/card\/(EM[A-Za-z0-9-]+)/);
      if (urlTokenMatch) {
        cleanToken = urlTokenMatch[1];
      }

      // SECURITY: Strict token format validation
      // Accept either new format (EM-10digits) or old format (EM+24chars)
      const validTokenPattern = /^(EM[A-Za-z0-9]{24}|EM-\d{10})$/;
      if (!validTokenPattern.test(cleanToken)) {
        setScanResult({ type: 'invalid', message: 'SECURITY ALERT: Invalid QR format. This is NOT a valid EM Card.', rawText: cleanToken });
        setScanLoading(false);
        setScanToken('');
        scanInProgressRef.current = false;
        return;
      }

      // 1. Look up registration by QR token
      const { data: reg, error: regErr } = await supabase
        .from('registrations')
        .select('*, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
        .ilike('qr_token', cleanToken)
        .eq('status', 'Approved')
        .maybeSingle();

      if (regErr || !reg) {
        setScanResult({ type: 'invalid', message: 'SECURITY ALERT: Unregistered or unauthorized EM Card. This QR code is not in our system.', rawText: cleanToken });
        setScanLoading(false);
        setScanToken('');
        scanInProgressRef.current = false;
        return;
      }

      const person = reg.ValidResidents || {};
      const fullName = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}${person.suffix ? ' ' + person.suffix : ''}`.trim();

      // 1b. Check if event is restricted to specific barangays
      const allowedBarangays = selectedEvent.selected_barangays || [];
      if (Array.isArray(allowedBarangays) && allowedBarangays.length > 0) {
        const memberBarangay = reg.barangay || person.barangay || '';
        // Normalize barangay names for comparison (trim whitespace, case-insensitive)
        const normalizedMemberBarangay = memberBarangay.trim().toUpperCase();
        const normalizedAllowed = allowedBarangays.map(b => (typeof b === 'string' ? b.trim().toUpperCase() : ''));
        
        if (!normalizedAllowed.includes(normalizedMemberBarangay)) {
          setScanResult({
            type: 'barangay_restricted',
            name: fullName,
            barangay: memberBarangay || '-',
            purok: reg.purok || person.purok || '-',
            houseNo: reg.house_no || '-',
            contact: reg.contact || '-',
            photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
            emCardNo: reg.em_card_no || '-',
            qrToken: reg.qr_token,
            allowedBarangays: allowedBarangays.join(', '),
          });
          setScanLoading(false);
          setScanToken('');
          scanInProgressRef.current = false;
          return;
        }
      }

      // 2. Check if already scanned at THIS event (cryptographic duplicate prevention)
      const { data: existingScan, error: dupErr } = await supabase
        .from('event_scans')
        .select('scanned_at, scanned_by')
        .eq('event_id', selectedEvent.id)
        .eq('registration_id', reg.id)
        .maybeSingle();

      if (dupErr) {
        // silent
      }

      if (existingScan) {
        // DUPLICATE — show RED warning
        setScanResult({
          type: 'duplicate',
          name: fullName,
          barangay: person.barangay || '-',
          purok: reg.purok || person.purok || '-',
          houseNo: reg.house_no || '-',
          contact: reg.contact || '-',
          photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
          emCardNo: reg.em_card_no || '-',
          qrToken: reg.qr_token,
          scannedAt: existingScan.scanned_at,
          scannedBy: existingScan.scanned_by,
        });
        setScanLoading(false);
        setScanToken('');
        return;
      }

      // 2b. HOUSEHOLD duplicate check — only for events in household mode (same address only)
      if (selectedEvent.household_mode) {
        let householdQuery = supabase
          .from('registrations')
          .select('id, house_no, purok, lot, block, phase, barangay, gender, civil_status, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
          .eq('barangay', reg.barangay || '');
        if (reg.house_no) householdQuery = householdQuery.eq('house_no', reg.house_no);
        if (reg.purok) householdQuery = householdQuery.eq('purok', reg.purok);
        householdQuery = householdQuery.not('id', 'eq', reg.id);

        const { data: householdMembers } = await householdQuery;
        const householdIds = (householdMembers || []).map(m => m.id);

        if (householdIds.length > 0) {
          const { data: householdScan, error: hhErr } = await supabase
            .from('event_scans')
            .select('scanned_at, scanned_by, registration_id')
            .eq('event_id', selectedEvent.id)
            .in('registration_id', householdIds)
            .order('scanned_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (hhErr) {
            // silent
          }

          if (householdScan) {
            const hhReg = householdMembers.find(m => m.id === householdScan.registration_id);
            const hhPerson = hhReg?.ValidResidents || {};
            const hhName = `${hhPerson.first_name || ''} ${hhPerson.middle_name ? hhPerson.middle_name + ' ' : ''}${hhPerson.last_name || ''}${hhPerson.suffix ? ' ' + hhPerson.suffix : ''}`.trim() || 'Family member';

            setScanResult({
              type: 'household_duplicate',
              name: fullName,
              barangay: person.barangay || '-',
              purok: reg.purok || person.purok || '-',
              houseNo: reg.house_no || '-',
              contact: reg.contact || '-',
              photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
              emCardNo: reg.em_card_no || '-',
              qrToken: reg.qr_token,
              scannedAt: householdScan.scanned_at,
              scannedBy: householdScan.scanned_by,
              claimedBy: hhName,
            });
            setScanLoading(false);
            setScanToken('');
            return;
          }
        }
      }

      // 3. Record the scan in event_scans (permanent lock)
      const { error: insertErr } = await supabase.from('event_scans').insert({
        event_id: selectedEvent.id,
        registration_id: reg.id,
        scanned_by: username,
      });
      logAdminAction('scan_event', 'event_scans', reg.id, fullName, { event: selectedEvent.title, em_card_no: reg.em_card_no });

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
            photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
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

      // 4. Update registration global scan stats + mark printed if first scan
      await supabase.from('registrations').update({
        last_scanned_at: new Date().toISOString(),
        scan_count: (reg.scan_count || 0) + 1,
        printed_at: reg.printed_at || new Date().toISOString(),
      }).eq('id', reg.id);

      setScanResult({
        type: 'success',
        name: fullName,
        barangay: person.barangay || '-',
        purok: reg.purok || person.purok || '-',
        houseNo: reg.house_no || '-',
        contact: reg.contact || '-',
        photo: reg.photo_url || reg.photo_base64 || person.photo_base64,
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
                <div key={evt.id} className="event-card">
                  <div className="event-card-header">
                    <div className="event-card-icon"><Calendar size={24} /></div>
                    <div className="event-card-badges">
                      {evt.household_mode && <span className="event-badge-hh"><Home size={14} /> HH Mode</span>}
                      {evt.selected_barangays && evt.selected_barangays.length > 0 && <span className="event-badge-restricted"><MapPin size={14} /> {evt.selected_barangays.length} Brgy</span>}
                    </div>
                  </div>
                  <div className="event-card-body">
                    <h5>{evt.event_name}</h5>
                    <div className="event-card-details">
                      <span className="event-detail"><MapPin size={16} /> {evt.location || 'No location'}</span>
                      <span className="event-detail"><Clock size={16} /> {evt.event_date ? new Date(evt.event_date).toLocaleDateString() : 'No date'}</span>
                    </div>
                  </div>
                  <div className="event-card-actions">
                    <button className="btn btn-sm btn-primary" onClick={() => { setSelectedEvent(evt); setScannerMode('scan'); localScanCountRef.current = 0; fetchEventScans(evt.id); }}><Zap size={16} /> Select</button>
                    <button className="btn btn-sm btn-outline" onClick={() => openEventRecords(evt)}><FileText size={16} /> Records</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="event-create-section">
            {!showCreateEvent ? (
              <button className="btn btn-outline" onClick={() => { setShowCreateEvent(true); fetchBarangays(); }}><Plus size={18} /> Create New Event</button>
            ) : (
              <form className="event-create-form" onSubmit={handleCreateEvent}>
                <h5><Calendar size={20} /> Create New Event</h5>
                <div className="event-form-input-group">
                  <span className="event-form-icon"><Type size={18} /></span>
                  <input type="text" placeholder="Event Name *" required value={newEventForm.event_name} onChange={e => setNewEventForm(p => ({ ...p, event_name: e.target.value }))} />
                </div>
                <div className="event-form-input-group">
                  <span className="event-form-icon"><Clock size={18} /></span>
                  <input type="date" value={newEventForm.event_date} onChange={e => setNewEventForm(p => ({ ...p, event_date: e.target.value }))} />
                </div>
                <div className="event-form-input-group">
                  <span className="event-form-icon"><MapPin size={18} /></span>
                  <input type="text" placeholder="Location" value={newEventForm.location} onChange={e => setNewEventForm(p => ({ ...p, location: e.target.value }))} />
                </div>
                
                <div className="event-barangay-section">
                  <div className="event-barangay-header">
                    <label className="event-form-label">
                      <span>Restrict to Barangays (Optional)</span>
                      <small>Leave empty to allow all barangays</small>
                    </label>
                    <div className="event-barangay-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          if (newEventForm.selected_barangays.length === allBarangays.length) {
                            setNewEventForm(p => ({ ...p, selected_barangays: [] }));
                          } else {
                            setNewEventForm(p => ({ ...p, selected_barangays: [...allBarangays] }));
                          }
                        }}
                      >
                        {newEventForm.selected_barangays.length === allBarangays.length && allBarangays.length > 0 ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                  <div className="event-barangay-grid">
                    {allBarangays.length === 0 ? (
                      <p className="event-barangay-loading">Loading barangays...</p>
                    ) : (
                      allBarangays.map(brgy => (
                        <label key={brgy} className="event-barangay-checkbox">
                          <input
                            type="checkbox"
                            checked={newEventForm.selected_barangays.includes(brgy)}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewEventForm(p => ({ ...p, selected_barangays: [...p.selected_barangays, brgy] }));
                              } else {
                                setNewEventForm(p => ({ ...p, selected_barangays: p.selected_barangays.filter(b => b !== brgy) }));
                              }
                            }}
                          />
                          <span>{brgy}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {newEventForm.selected_barangays.length > 0 && (
                    <div className="event-selected-barangays">
                      <strong>Selected ({newEventForm.selected_barangays.length}/{allBarangays.length}):</strong> {newEventForm.selected_barangays.join(', ')}
                    </div>
                  )}
                </div>

                <label className="event-form-toggle">
                  <input
                    type="checkbox"
                    checked={newEventForm.household_mode}
                    onChange={e => setNewEventForm(p => ({ ...p, household_mode: e.target.checked }))}
                  />
                  <span className="toggle-label"><Home size={16} /> Household Mode — One aid per household (same address only)</span>
                </label>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateEvent(false); setNewEventForm({ event_name: '', event_date: '', location: '', household_mode: false, selected_barangays: [] }); }}><X size={16} /> Cancel</button>
                  <button type="submit" className="btn btn-primary"><Check size={16} /> Create Event</button>
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
            <h3><ScanLine size={22} /> {selectedEvent.event_name} {selectedEvent.household_mode && <span className="event-badge-hh">🏠 Household</span>}</h3>
            <p>{selectedEvent.location || ''} {selectedEvent.event_date ? '• ' + new Date(selectedEvent.event_date).toLocaleDateString() : ''}</p>
          </div>
          <div className="event-scanner-actions">
            <span className="scan-stat-badge">{scanStats.total.toLocaleString()} Scanned</span>
            <button className="btn-change-event" onClick={() => { setSelectedEvent(null); setScannerMode('select'); localScanCountRef.current = 0; resetScanState(); }}>Back to Events</button>
          </div>
        </div>

        {/* Result modal — shown for capture & manual modes */}
        {scanResult && scannerInputMode !== 'camera' && (
          <div className="modal-overlay scan-result-overlay" onClick={resetScanState}>
            <div className={`modal-card scan-result-modal scan-result-${scanResult.type}`} onClick={e => e.stopPropagation()}>
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
                        <span><Home size={14} /> {scanResult.houseNo}</span>
                        <span><MapPin size={14} /> {scanResult.purok}</span>
                        <span><Phone size={14} /> {scanResult.contact}</span>
                        <span><CreditCard size={14} /> {scanResult.emCardNo}</span>
                      </div>
                    </div>
                  </div>
                  <div className="scan-result-footer">
                    <span>Scan #{scanResult.scanCount} recorded</span>
                    <button className="btn btn-primary" onClick={resetScanState}>Scan Next</button>
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
                        <span><Home size={14} /> {scanResult.houseNo}</span>
                        <span><MapPin size={14} /> {scanResult.purok}</span>
                        <span><Phone size={14} /> {scanResult.contact}</span>
                        <span><CreditCard size={14} /> {scanResult.emCardNo}</span>
                      </div>
                    </div>
                  </div>
                  <div className="scan-result-footer duplicate-footer">
                    <div className="duplicate-warning">
                      <strong><AlertTriangle size={14} /> ALREADY SCANNED</strong>
                      <p>At <strong>{selectedEvent.event_name}</strong> on {new Date(scanResult.scannedAt).toLocaleString()}</p>
                      {scanResult.scannedBy && <p>By: {scanResult.scannedBy}</p>}
                      <p className="duplicate-stop"><Ban size={14} /> DO NOT DISTRIBUTE — This resident has already received items.</p>
                    </div>
                    <button className="btn btn-danger" onClick={resetScanState}>Acknowledge &amp; Scan Next</button>
                  </div>
                </>
              )}

              {scanResult.type === 'household_duplicate' && (
                <>
                  <div className="scan-result-badge household-duplicate"><AlertTriangle size={32} /> HOUSEHOLD ALREADY CLAIMED — STOP</div>
                  <div className="scan-result-profile">
                    <div className="scan-result-photo">
                      {scanResult.photo ? <img src={scanResult.photo} alt="" /> : <User size={60} />}
                    </div>
                    <div className="scan-result-info">
                      <h2>{scanResult.name}</h2>
                      <div className="scan-result-meta-grid">
                        <span><MapPin size={14} /> {scanResult.barangay}</span>
                        <span><Home size={14} /> {scanResult.houseNo}</span>
                        <span><MapPin size={14} /> {scanResult.purok}</span>
                        <span><Phone size={14} /> {scanResult.contact}</span>
                        <span><CreditCard size={14} /> {scanResult.emCardNo}</span>
                      </div>
                    </div>
                  </div>
                  <div className="scan-result-footer duplicate-footer">
                    <div className="duplicate-warning">
                      <strong><Home size={14} /> HOUSEHOLD AID ALREADY CLAIMED</strong>
                      <p>Claimed by <strong>{scanResult.claimedBy}</strong> at <strong>{selectedEvent.event_name}</strong> on {new Date(scanResult.scannedAt).toLocaleString()}</p>
                      {scanResult.scannedBy && <p>By: {scanResult.scannedBy}</p>}
                      <p className="duplicate-stop"><Ban size={14} /> DO NOT DISTRIBUTE — Another household member already received items.</p>
                    </div>
                    <button className="btn btn-danger" onClick={resetScanState}>Acknowledge &amp; Scan Next</button>
                  </div>
                </>
              )}

              {scanResult.type === 'barangay_restricted' && (
                <>
                  <div className="scan-result-badge barangay-restricted"><AlertTriangle size={32} /> NOT ELIGIBLE — BARANGAY RESTRICTED</div>
                  <div className="scan-result-profile">
                    <div className="scan-result-photo">
                      {scanResult.photo ? <img src={scanResult.photo} alt="" /> : <User size={60} />}
                    </div>
                    <div className="scan-result-info">
                      <h2>{scanResult.name}</h2>
                      <div className="scan-result-meta-grid">
                        <span><MapPin size={14} /> {scanResult.barangay}</span>
                        <span><Home size={14} /> {scanResult.houseNo}</span>
                        <span><MapPin size={14} /> {scanResult.purok}</span>
                        <span><Phone size={14} /> {scanResult.contact}</span>
                        <span><CreditCard size={14} /> {scanResult.emCardNo}</span>
                      </div>
                    </div>
                  </div>
                <div className="scan-result-footer barangay-restricted-footer">
                  <div className="barangay-restriction-warning">
                    <strong><ShieldAlert size={32} /> NOT ELIGIBLE FOR THIS EVENT</strong>
                    <p>Member's Barangay: <strong>{scanResult.barangay}</strong></p>
                    <p>Event Restricted To: <strong>{scanResult.allowedBarangays}</strong></p>
                    <p className="restriction-stop"><Ban size={14} /> DO NOT DISTRIBUTE — This member is from a barangay not selected for this event.</p>
                  </div>
                  <button className="btn btn-secondary" onClick={resetScanState}>Acknowledge &amp; Scan Next</button>
                </div>
              </>
            )}

            {(scanResult.type === 'invalid' || scanResult.type === 'error') && (
              <>
                <div className="scan-result-badge invalid"><X size={32} /> {scanResult.type === 'invalid' ? 'INVALID CARD' : 'ERROR'}</div>
                <p className="scan-error-message">{scanResult.message}</p>
                {scanResult.rawText && <code style={{fontSize:'0.75rem',background:'#f3f4f6',padding:'4px 8px',borderRadius:4,marginTop:8,display:'block',wordBreak:'break-all'}}>Decoded: {scanResult.rawText}</code>}
                <button className="btn btn-secondary" onClick={resetScanState}>Try Again</button>
              </>
            )}
            </div>
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

            {/* Monitor Traffic — separate admin action */}
            <div className="scanner-admin-actions">
              <button
                className={scannerInputMode === 'traffic' ? 'active' : ''}
                onClick={() => setScannerInputMode('traffic')}
              >
                <Activity size={16} /> Monitor Traffic
              </button>
            </div>

            {/* ── CAMERA MODE ── */}
            {scannerInputMode === 'camera' && (
              <>
                <div className="camera-scanner-container camera-fullscreen">
                  <div id="event-scanner-camera" className="camera-fullscreen-video"></div>
                  {!cameraActive && (
                    <div className="camera-placeholder camera-fullscreen-placeholder">
                      <Camera size={48} />
                      <p>Starting camera...</p>
                      <small>If camera fails, switch to Capture or Manual mode</small>
                    </div>
                  )}

                  {/* Tap-to-focus overlay */}
                  {cameraActive && !scanResult && (
                    <div className="camera-tap-overlay" onClick={handleTapFocus}>
                      {focusPoint && (
                        <div
                          className="focus-reticle"
                          style={{ left: focusPoint.x, top: focusPoint.y }}
                        />
                      )}
                    </div>
                  )}

                  {/* Result overlay — covers camera without unmounting it */}
                  {scanResult && (
                    <div className="scan-result-overlay camera-fullscreen-overlay">
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
                                <span><Home size={14} /> {scanResult.houseNo}</span>
                                <span><MapPin size={14} /> {scanResult.purok}</span>
                                <span><Phone size={14} /> {scanResult.contact}</span>
                                <span><CreditCard size={14} /> {scanResult.emCardNo}</span>
                              </div>
                            </div>
                          </div>
                          <div className="scan-result-footer">
                            <span>Scan #{scanResult.scanCount} recorded</span>
                            <button className="btn btn-primary" onClick={resetScanState}>Scan Next</button>
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
                                <span><Home size={14} /> {scanResult.houseNo}</span>
                                <span><MapPin size={14} /> {scanResult.purok}</span>
                                <span><Phone size={14} /> {scanResult.contact}</span>
                                <span><CreditCard size={14} /> {scanResult.emCardNo}</span>
                              </div>
                            </div>
                          </div>
                          <div className="scan-result-footer duplicate-footer">
                            <div className="duplicate-warning">
                              <strong><AlertTriangle size={14} /> ALREADY SCANNED</strong>
                              <p>At <strong>{selectedEvent.event_name}</strong> on {new Date(scanResult.scannedAt).toLocaleString()}</p>
                              {scanResult.scannedBy && <p>By: {scanResult.scannedBy}</p>}
                              <p className="duplicate-stop"><Ban size={14} /> DO NOT DISTRIBUTE</p>
                            </div>
                            <button className="btn btn-danger" onClick={resetScanState}>Acknowledge &amp; Scan Next</button>
                          </div>
                        </>
                      )}

                      {scanResult.type === 'household_duplicate' && (
                        <>
                          <div className="scan-result-badge household-duplicate"><AlertTriangle size={32} /> HOUSEHOLD CLAIMED — STOP</div>
                          <div className="scan-result-profile">
                            <div className="scan-result-photo">
                              {scanResult.photo ? <img src={scanResult.photo} alt="" /> : <User size={60} />}
                            </div>
                            <div className="scan-result-info">
                              <h2>{scanResult.name}</h2>
                              <div className="scan-result-meta-grid">
                                <span><MapPin size={14} /> {scanResult.barangay}</span>
                                <span><Home size={14} /> {scanResult.houseNo}</span>
                                <span><MapPin size={14} /> {scanResult.purok}</span>
                                <span><Phone size={14} /> {scanResult.contact}</span>
                                <span><CreditCard size={14} /> {scanResult.emCardNo}</span>
                              </div>
                            </div>
                          </div>
                          <div className="scan-result-footer duplicate-footer">
                            <div className="duplicate-warning">
                              <strong><Home size={14} /> HOUSEHOLD AID ALREADY CLAIMED</strong>
                              <p>Claimed by <strong>{scanResult.claimedBy}</strong> at <strong>{selectedEvent.event_name}</strong> on {new Date(scanResult.scannedAt).toLocaleString()}</p>
                              {scanResult.scannedBy && <p>By: {scanResult.scannedBy}</p>}
                              <p className="duplicate-stop"><Ban size={14} /> DO NOT DISTRIBUTE — Another household member already received items.</p>
                            </div>
                            <button className="btn btn-danger" onClick={resetScanState}>Acknowledge &amp; Scan Next</button>
                          </div>
                        </>
                      )}

                      {scanResult.type === 'barangay_restricted' && (
                        <>
                          <div className="scan-result-badge barangay-restricted"><AlertTriangle size={32} /> NOT ELIGIBLE — BARANGAY RESTRICTED</div>
                          <div className="scan-result-profile">
                            <div className="scan-result-photo">
                              {scanResult.photo ? <img src={scanResult.photo} alt="" /> : <User size={60} />}
                            </div>
                            <div className="scan-result-info">
                              <h2>{scanResult.name}</h2>
                              <div className="scan-result-meta-grid">
                                <span><MapPin size={14} /> {scanResult.barangay}</span>
                                <span><Home size={14} /> {scanResult.houseNo}</span>
                                <span><MapPin size={14} /> {scanResult.purok}</span>
                                <span><Phone size={14} /> {scanResult.contact}</span>
                                <span><CreditCard size={14} /> {scanResult.emCardNo}</span>
                              </div>
                            </div>
                          </div>
                          <div className="scan-result-footer barangay-restricted-footer">
                            <div className="barangay-restriction-warning">
                              <strong><AlertTriangle size={14} /> NOT ELIGIBLE FOR THIS EVENT</strong>
                              <p>Member's Barangay: <strong>{scanResult.barangay}</strong></p>
                              <p>Event Restricted To: <strong>{scanResult.allowedBarangays}</strong></p>
                              <p className="restriction-stop"><Ban size={14} /> DO NOT DISTRIBUTE — This member is from a barangay not selected for this event.</p>
                            </div>
                            <button className="btn btn-danger" onClick={resetScanState}>Acknowledge &amp; Scan Next</button>
                          </div>
                        </>
                      )}

                      {(scanResult.type === 'invalid' || scanResult.type === 'error') && (
                        <>
                          <div className="scan-result-badge invalid"><X size={32} /> {scanResult.type === 'invalid' ? 'INVALID CARD' : 'ERROR'}</div>
                          <p className="scan-error-message">{scanResult.message}</p>
                          {scanResult.rawText && <code style={{fontSize:'0.75rem',background:'#f3f4f6',padding:'4px 8px',borderRadius:4,marginTop:8,display:'block',wordBreak:'break-all'}}>Decoded: {scanResult.rawText}</code>}
                          <button className="btn btn-secondary" onClick={resetScanState}>Try Again</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="camera-hint camera-fullscreen-hint">Point camera at the resident's EM Card QR code — Tap screen to exit</p>
                <button type="button" className="camera-exit-btn" onClick={() => setScannerInputMode('manual')}>Exit Scanner</button>
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
                    setScanResult(null);
                    setScanLoading(true);
                    let decodedText = null;
                    let methodUsed = 'none';
                    try {
                      // ── 1. FAST PATH: Native BarcodeDetector (hardware-accelerated on iOS/Android)
                      if (!decodedText && typeof window !== 'undefined' && 'BarcodeDetector' in window) {
                        try {
                          // Wrap entire BarcodeDetector operation in 3s timeout to prevent iOS hangs
                          const codes = await Promise.race([
                            (async () => {
                              const detector = new BarcodeDetector({ formats: ['qr_code'] });
                              const bitmap = await createImageBitmap(file);
                              return await detector.detect(bitmap);
                            })(),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('BarcodeDetector timeout')), 3000)),
                          ]);
                          if (codes.length > 0 && codes[0].rawValue) {
                            decodedText = codes[0].rawValue;
                            methodUsed = 'BarcodeDetector';
                          }
                        } catch (bdErr) { /* silent */ }
                      }

                      // ── 2. FALLBACK: jsQR with grayscale + threshold preprocessing
                      if (!decodedText) {
                        const jsQR = (await import('jsqr')).default;
                        const img = new Image();
                        const url = URL.createObjectURL(file);
                        decodedText = await new Promise((resolve) => {
                          img.onload = () => {
                            URL.revokeObjectURL(url);
                            // Draw oriented image to a reasonably-sized canvas
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const maxSize = 1200;
                            let { width, height } = img;
                            if (width > maxSize || height > maxSize) {
                              const ratio = Math.min(maxSize / width, maxSize / height);
                              width = Math.floor(width * ratio);
                              height = Math.floor(height * ratio);
                            }
                            canvas.width = width;
                            canvas.height = height;
                            ctx.drawImage(img, 0, 0, width, height);

                            // Helper: convert imageData to grayscale / thresholded
                            const preprocess = (imageData, mode) => {
                              const d = new Uint8ClampedArray(imageData.data);
                              for (let i = 0; i < d.length; i += 4) {
                                const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
                                if (mode === 'gray') {
                                  d[i] = d[i + 1] = d[i + 2] = avg;
                                } else if (mode === 'thresh') {
                                  const v = avg > 128 ? 255 : 0;
                                  d[i] = d[i + 1] = d[i + 2] = v;
                                }
                              }
                              return new ImageData(d, imageData.width, imageData.height);
                            };

                            const inversionOptions = [
                              { inversionAttempts: 'dontInvert' },
                              { inversionAttempts: 'onlyInvert' },
                              { inversionAttempts: 'attemptBoth' },
                            ];

                            // Try: original color image
                            const colorData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            for (const opts of inversionOptions) {
                              const result = jsQR(colorData.data, colorData.width, colorData.height, opts);
                              if (result && result.data) {
                                return resolve(result.data);
                              }
                            }

                            // Try: grayscale (helps with poor lighting)
                            const grayData = preprocess(colorData, 'gray');
                            for (const opts of inversionOptions) {
                              const result = jsQR(grayData.data, grayData.width, grayData.height, opts);
                              if (result && result.data) {
                                return resolve(result.data);
                              }
                            }

                            // Try: black & white threshold (helps with glare/shadows)
                            const threshData = preprocess(colorData, 'thresh');
                            for (const opts of inversionOptions) {
                              const result = jsQR(threshData.data, threshData.width, threshData.height, opts);
                              if (result && result.data) {
                                return resolve(result.data);
                              }
                            }

                            resolve(null);
                          };
                          img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
                          img.src = url;
                        });
                        if (decodedText) methodUsed = 'jsQR';
                      }

                      if (decodedText) {
                        handleEventScan(decodedText);
                      } else {
                        setScanResult({ type: 'invalid', message: 'Could not read QR code from image. Please ensure the QR is clearly visible and try again, or use Manual entry.' });
                        setScanLoading(false);
                      }
                    } catch (err) {
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

            {/* ── LIVE TRAFFIC MONITOR MODE ── */}
            {scannerInputMode === 'traffic' && (
              <div className="live-traffic-container" style={{ width: '100%', padding: '24px 0', background: 'transparent' }}>
                <div className="live-traffic-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="live-indicator-pulse" style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)', animation: 'pulse-live 1.5s infinite' }} />
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>LIVE TRAFFIC MONITOR</h4>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> Auto-refreshing every 3s
                  </span>
                </div>

                <div className="live-traffic-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div className="live-stat-card" style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Total Verified Scans</span>
                    <h2 style={{ fontSize: '2.5rem', color: '#10b981', margin: '8px 0 0', fontWeight: '800' }}>{scanStats.total.toLocaleString()}</h2>
                  </div>

                  <div className="live-stat-card" style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Barangays Active</span>
                    <h2 style={{ fontSize: '2.5rem', color: '#3b82f6', margin: '8px 0 0', fontWeight: '800' }}>
                      {new Set(eventScans.map(s => s.registrations?.ValidResidents?.barangay).filter(Boolean)).size}
                    </h2>
                  </div>

                  <div className="live-stat-card" style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Latest Scan Pace</span>
                    <h2 style={{ fontSize: '1.2rem', color: '#1e293b', margin: '16px 0 0', fontWeight: '700', textTransform: 'uppercase' }}>
                      {eventScans.length > 0 ? (
                        <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Zap size={16} /> Active
                        </span>
                      ) : 'Waiting...'}
                    </h2>
                  </div>
                </div>

                <div className="live-traffic-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  {/* Real-time Ticker of scans */}
                  <div className="live-ticker-wrap">
                    <h5 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase' }}>Real-time Scans Feed</h5>
                    <div className="live-ticker-list" style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                      {eventScans.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No scans recorded yet. Live feed will stream check-ins here.</div>
                      ) : (
                        eventScans.slice(0, 10).map((s, idx) => {
                          const person = s.registrations?.ValidResidents || {};
                          const name = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}${person.suffix ? ' ' + person.suffix : ''}`.trim();
                          const isJustScanned = idx === 0;
                          return (
                            <div 
                              key={s.id || idx} 
                              className="live-ticker-item" 
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '12px 16px', 
                                background: isJustScanned ? '#f0fdf4' : '#f8fafc', 
                                border: isJustScanned ? '1px solid #34d399' : '1px solid #e2e8f0',
                                borderRadius: '8px',
                                animation: isJustScanned ? 'pulse-green-highlight 2s ease-out' : 'none',
                                transition: 'all 0.3s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isJustScanned ? '#10b981' : '#e2e8f0', color: isJustScanned ? '#fff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                  {person.first_name ? person.first_name[0] : 'U'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{name || 'Unknown'}</strong>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{person.barangay || 'No Barangay'} · {s.registrations?.em_card_no}</span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#047857' }}>✓ VERIFIED</span>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(s.scanned_at).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Barangay distribution */}
                  <div className="live-barangay-wrap">
                    <h5 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase' }}>Barangay Attendance Share</h5>
                    <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                      {Object.entries(
                        eventScans.reduce((acc, s) => {
                          const b = s.registrations?.ValidResidents?.barangay || 'Unknown';
                          acc[b] = (acc[b] || 0) + 1;
                          return acc;
                        }, {})
                      )
                        .sort((a, b) => b[1] - a[1])
                        .map(([brgy, count]) => {
                          const pct = eventScans.length > 0 ? (count / eventScans.length) * 100 : 0;
                          return (
                            <div key={brgy} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                                <span>{brgy}</span>
                                <span>{count} scans ({pct.toFixed(0)}%)</span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: '4px', transition: 'width 0.5s' }} />
                              </div>
                            </div>
                          );
                        })}
                      {eventScans.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Awaiting scans to build distribution chart.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
                  const name = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}${person.suffix ? ' ' + person.suffix : ''}`.trim();
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

        {/* Event Records Modal */}
        {viewEventRecords && (
          <div className="modal-overlay" onClick={() => setViewEventRecords(null)}>
            <div className="modal-card modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📋 {viewEventRecords.event_name} — Event Records</h3>
                <button className="modal-close-x" onClick={() => setViewEventRecords(null)}>✕</button>
              </div>
              <div className="modal-body">
                {eventRecordsLoading ? (
                  <div className="table-loading">Loading records...</div>
                ) : eventRecords.length === 0 ? (
                  <div className="table-empty">No scan records for this event.</div>
                ) : (
                  <>
                    <div className="records-summary">
                      <span className="records-count">{eventRecords.length} member{eventRecords.length !== 1 ? 's' : ''} scanned</span>
                      {viewEventRecords.household_mode && <span className="records-badge-hh">🏠 Household Mode</span>}
                    </div>
                    <div className="records-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Barangay</th>
                            <th>House / Purok</th>
                            <th>EM Card</th>
                            <th>Contact</th>
                            <th>Scanned At</th>
                            <th>By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventRecords.map((s, i) => {
                            const person = s.registrations?.ValidResidents || {};
                            const reg = s.registrations || {};
                            const name = `${person.first_name || ''} ${person.middle_name ? person.middle_name + ' ' : ''}${person.last_name || ''}${person.suffix ? ' ' + person.suffix : ''}`.trim();
                            return (
                              <tr key={s.id || i}>
                                <td>{i + 1}</td>
                                <td>{name || '—'}</td>
                                <td>{person.barangay || '—'}</td>
                                <td>{SUBDIVISION_PUROKS.includes(reg.purok) ? `Lot ${reg.lot || ''} Block ${reg.block || ''} Phase ${reg.phase || ''}` : (reg.house_no || '')} {reg.purok ? (SUBDIVISION_PUROKS.includes(reg.purok) ? '/ ' + reg.purok : '/ Purok ' + reg.purok) : ''}</td>
                                <td><code>{reg.em_card_no || '—'}</code></td>
                                <td>{reg.contact || '—'}</td>
                                <td>{new Date(s.scanned_at).toLocaleString()}</td>
                                <td>{s.scanned_by || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
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

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{username.charAt(0).toUpperCase()}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{username}</span>
              <span className="sidebar-user-role" style={{ textTransform: 'capitalize' }}>{userRole}</span>
            </div>
          </div>
          {userRole !== 'staff' && (
            <button className="sidebar-logout" onClick={() => setShowCreateAccount(true)}><span>👤</span> Create Account</button>
          )}
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

            <div className="topbar-notify-wrap">
              <div className="topbar-notify" onClick={() => setNotifOpen(!notifOpen)}>
                <Bell size={18} />
                {allRegs.filter(r => r.status === 'Pending').length > 0 && (
                  <span className="topbar-notify-count">{allRegs.filter(r => r.status === 'Pending').length}</span>
                )}
              </div>
              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-header">
                    <h4>Notifications</h4>
                    {allRegs.filter(r => r.status === 'Pending').length > 0 && (
                      <span className="notif-badge">{allRegs.filter(r => r.status === 'Pending').length} new</span>
                    )}
                  </div>
                  <div className="notif-dropdown-body">
                    {allRegs.filter(r => r.status === 'Pending').length > 0 ? (
                      allRegs.filter(r => r.status === 'Pending').slice(0, 5).map(reg => (
                        <div key={reg.id} className="notif-item" onClick={() => { setNotifOpen(false); setActiveTab('registrations'); }}>
                          <div className="notif-icon"><UserCheck size={16} /></div>
                          <div className="notif-content">
                            <p className="notif-title">New registration pending approval</p>
                            <p className="notif-desc">{getResidentName(reg)} — {reg.barangay || 'No barangay'}</p>
                            <span className="notif-time">{new Date(reg.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="notif-empty">
                        <Info size={24} />
                        <span>No new notifications</span>
                      </div>
                    )}
                  </div>
                  {allRegs.filter(r => r.status === 'Pending').length > 0 && (
                    <div className="notif-dropdown-footer">
                      <button onClick={() => { setNotifOpen(false); setActiveTab('registrations'); }}>
                        View all registrations
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="topbar-user">
              <div className="topbar-user-info">
                <span className="topbar-user-name">{username || 'Admin'}</span>
                <span className="topbar-user-role" style={{ textTransform: 'capitalize' }}>{userRole}</span>
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
          {activeTab === 'events' && renderUpcomingEvents()}
          {activeTab === 'network' && renderNetwork()}
          {activeTab === 'messages' && renderMessages()}
          {activeTab === 'reports' && renderReports()}
          {activeTab === 'accounts' && renderAccounts()}
          {activeTab === 'adminLogs' && renderAdminLogs()}
          {activeTab === 'system' && renderSystem()}
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
                <div className="form-group"><label>Suffix</label>
                  <select value={newResident.suffix || ''} onChange={(e) => setNewResident({...newResident, suffix: e.target.value})}>
                    <option value="">None</option>
                    <option value="JR">JR</option>
                    <option value="JR.">JR.</option>
                    <option value="SR">SR</option>
                    <option value="SR.">SR.</option>
                    <option value="III">III</option>
                    <option value="III.">III.</option>
                    <option value="IV">IV</option>
                    <option value="IV.">IV.</option>
                    <option value="V">V</option>
                    <option value="V.">V.</option>
                    <option value="II">II</option>
                    <option value="II.">II.</option>
                  </select>
                </div>
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

      {/* EDIT RESIDENT MODAL */}
      {showEditResidentModal && (
        <div className="modal-overlay" onClick={() => setShowEditResidentModal(false)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Edit Resident</h3><button className="modal-close-x" onClick={() => setShowEditResidentModal(false)}>✕</button></div>
            <form onSubmit={handleUpdateResident} className="modal-form">
              <div className="modal-form-grid">
                <div className="form-group"><label>Last Name <span className="req-star">*</span></label><input value={editResidentForm.last_name} onChange={(e) => setEditResidentForm({...editResidentForm, last_name: e.target.value})} required /></div>
                <div className="form-group"><label>First Name <span className="req-star">*</span></label><input value={editResidentForm.first_name} onChange={(e) => setEditResidentForm({...editResidentForm, first_name: e.target.value})} required /></div>
                <div className="form-group"><label>Middle Name</label><input value={editResidentForm.middle_name} onChange={(e) => setEditResidentForm({...editResidentForm, middle_name: e.target.value})} /></div>
                <div className="form-group"><label>Suffix</label>
                  <select value={editResidentForm.suffix || ''} onChange={(e) => setEditResidentForm({...editResidentForm, suffix: e.target.value})}>
                    <option value="">None</option>
                    <option value="JR">JR</option>
                    <option value="JR.">JR.</option>
                    <option value="SR">SR</option>
                    <option value="SR.">SR.</option>
                    <option value="III">III</option>
                    <option value="III.">III.</option>
                    <option value="IV">IV</option>
                    <option value="IV.">IV.</option>
                    <option value="V">V</option>
                    <option value="V.">V.</option>
                    <option value="II">II</option>
                    <option value="II.">II.</option>
                  </select>
                </div>
                <div className="form-group"><label>Barangay <span className="req-star">*</span></label><input value={editResidentForm.barangay} onChange={(e) => setEditResidentForm({...editResidentForm, barangay: e.target.value})} required /></div>
                <div className="form-group"><label>Precinct <span className="req-star">*</span></label><input value={editResidentForm.precinct} onChange={(e) => setEditResidentForm({...editResidentForm, precinct: e.target.value})} required placeholder="e.g. 0036A" /></div>
                <div className="form-group"><label>Status <span className="req-star">*</span></label>
                  <select value={editResidentForm.status} onChange={(e) => setEditResidentForm({...editResidentForm, status: e.target.value})} required>
                    <option value="Verified">Verified</option>
                    <option value="Registered">Registered</option>
                  </select>
                </div>
              </div>
              {editResidentError && <p className="form-error">{editResidentError}</p>}
              <div className="modal-footer">
                <button type="button" className="btn btn-modal-secondary" onClick={() => setShowEditResidentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-modal-primary" disabled={editResidentLoading}>{editResidentLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE RESIDENT CONFIRMATION MODAL */}
      {showDeleteResidentModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteResidentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <AlertTriangle size={22} /> Delete Resident
              </h3>
              <button className="modal-close-x" onClick={() => setShowDeleteResidentModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ paddingTop: '0' }}>
              <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
                Are you sure you want to delete <strong>{deleteResidentName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-modal-secondary" onClick={() => setShowDeleteResidentModal(false)}>Cancel</button>
              <button type="button" className="btn btn-modal-danger" onClick={handleDeleteResident} disabled={deleteResidentLoading}>
                {deleteResidentLoading ? 'Deleting...' : 'Delete Resident'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MEMBER CONFIRMATION MODAL */}
      {showDeleteMemberModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteMemberModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <AlertTriangle size={22} /> Delete Member
              </h3>
              <button className="modal-close-x" onClick={() => setShowDeleteMemberModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ paddingTop: '0' }}>
              <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
                Are you sure you want to delete <strong>{deleteMemberName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-modal-secondary" onClick={() => setShowDeleteMemberModal(false)}>Cancel</button>
              <button type="button" className="btn btn-modal-danger" onClick={handleDeleteMember} disabled={deleteMemberLoading}>
                {deleteMemberLoading ? 'Deleting...' : 'Delete Member'}
              </button>
            </div>
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
                {(selectedRegDetail.photo_url || selectedRegDetail.photo_base64) ? (
                  <img src={selectedRegDetail.photo_url || selectedRegDetail.photo_base64} alt="Portrait" className="reg-detail-photo" />
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
                  <span className="reg-detail-value">{selectedRegDetail.resident_id || 'NON-VALID'}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Reference No</span>
                  <span className="reg-detail-value">{selectedRegDetail.reference_no || '-'}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Residency Type</span>
                  <span className="reg-detail-value" style={{ fontWeight: 'bold', color: selectedRegDetail.is_valid_resident !== false ? '#10b981' : '#f59e0b' }}>
                    {selectedRegDetail.is_valid_resident !== false ? 'Registered Voter' : 'Non-Valid Resident'}
                  </span>
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
                  <span className="reg-detail-label">Gender</span>
                  <span className="reg-detail-value">{selectedRegDetail.gender || '-'}</span>
                </div>
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Civil Status</span>
                  <span className="reg-detail-value">{selectedRegDetail.civil_status || '-'}</span>
                </div>
                {!SUBDIVISION_PUROKS.includes(selectedRegDetail.purok) && (
                  <div className="reg-detail-item">
                    <span className="reg-detail-label">House Number</span>
                    <span className="reg-detail-value">{selectedRegDetail.house_no || '-'}</span>
                  </div>
                )}
                <div className="reg-detail-item">
                  <span className="reg-detail-label">Purok</span>
                  <span className="reg-detail-value">{selectedRegDetail.purok ? (SUBDIVISION_PUROKS.includes(selectedRegDetail.purok) ? selectedRegDetail.purok : `Purok ${selectedRegDetail.purok}`) : '-'}</span>
                </div>
                {SUBDIVISION_PUROKS.includes(selectedRegDetail.purok) && (
                  <>
                    <div className="reg-detail-item">
                      <span className="reg-detail-label">Lot</span>
                      <span className="reg-detail-value">{selectedRegDetail.lot || '-'}</span>
                    </div>
                    <div className="reg-detail-item">
                      <span className="reg-detail-label">Block</span>
                      <span className="reg-detail-value">{selectedRegDetail.block || '-'}</span>
                    </div>
                    <div className="reg-detail-item">
                      <span className="reg-detail-label">Phase</span>
                      <span className="reg-detail-value">{selectedRegDetail.phase || '-'}</span>
                    </div>
                  </>
                )}
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
                  <span className="reg-detail-value">{getPhotoSize(selectedRegDetail.photo_url || selectedRegDetail.photo_base64)}</span>
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
        const name = `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}`.trim();
        const hasQR = !!selectedMember.qr_token;
        const hasCardNo = !!selectedMember.em_card_no;
        const sectorOptions = ['Senior Citizens','PWD','Solo Parent','Youth','Women','Farmers','Fisherfolk','Workers / Labor','Religious','Transport','Indigenous People','Education','Business / Entrepreneurs','Health','Other'];
        return (
          <div className="modal-overlay" onClick={() => { setSelectedMember(null); setMemberEditMode(false); }}>
            <div className={`modal-card member-detail-card${showMemberNetwork ? ' network-open' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{memberEditMode ? 'Edit Member' : (showMemberNetwork ? 'Member Network' : 'Member Profile')}</h3>
                <button className="modal-close-x" onClick={() => { setSelectedMember(null); setMemberEditMode(false); setMemberScanHistory([]); setShowMemberNetwork(false); }}>✕</button>
              </div>
              {!memberEditMode && (
                <div className="member-modal-tabs">
                  <button className={`member-modal-tab ${!showMemberNetwork ? 'active' : ''}`} onClick={() => setShowMemberNetwork(false)}>Profile</button>
                  <button className={`member-modal-tab ${showMemberNetwork ? 'active' : ''}`} onClick={() => setShowMemberNetwork(true)}>Network</button>
                </div>
              )}
              <div className="modal-body">
                {memberEditMode ? (
                  <div className="member-edit-form">
                    <div className="member-edit-section">
                      <h4 className="member-edit-section-title">Personal Information</h4>
                      <div className="member-edit-grid">
                        <div className="member-edit-field">
                          <label>First Name</label>
                          <input type="text" value={editMemberForm.first_name} onChange={e => setEditMemberForm(f => ({ ...f, first_name: e.target.value }))} />
                        </div>
                        <div className="member-edit-field">
                          <label>Middle Name</label>
                          <input type="text" value={editMemberForm.middle_name} onChange={e => setEditMemberForm(f => ({ ...f, middle_name: e.target.value }))} />
                        </div>
                        <div className="member-edit-field">
                          <label>Last Name</label>
                          <input type="text" value={editMemberForm.last_name} onChange={e => setEditMemberForm(f => ({ ...f, last_name: e.target.value }))} />
                        </div>
                        <div className="member-edit-field">
                          <label>Suffix</label>
                          <select value={editMemberForm.suffix || ''} onChange={e => setEditMemberForm(f => ({ ...f, suffix: e.target.value }))}>
                            <option value="">None</option>
                            <option value="JR">JR</option>
                            <option value="JR.">JR.</option>
                            <option value="SR">SR</option>
                            <option value="SR.">SR.</option>
                            <option value="III">III</option>
                            <option value="III.">III.</option>
                            <option value="IV">IV</option>
                            <option value="IV.">IV.</option>
                            <option value="V">V</option>
                            <option value="V.">V.</option>
                            <option value="II">II</option>
                            <option value="II.">II.</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="member-edit-section">
                      <h4 className="member-edit-section-title">Address & Contact</h4>
                      <div className="member-edit-grid">
                        {!SUBDIVISION_PUROKS.includes(editMemberForm.purok) && (
                          <div className="member-edit-field">
                            <label>House No</label>
                            <input type="text" value={editMemberForm.house_no} onChange={e => setEditMemberForm(f => ({ ...f, house_no: e.target.value }))} />
                          </div>
                        )}
                        <div className="member-edit-field">
                          <label>Purok</label>
                          <select value={editMemberForm.purok || ''} onChange={e => setEditMemberForm(f => ({ ...f, purok: e.target.value, house_no: SUBDIVISION_PUROKS.includes(e.target.value) ? '' : f.house_no, lot: !SUBDIVISION_PUROKS.includes(e.target.value) ? '' : f.lot, block: !SUBDIVISION_PUROKS.includes(e.target.value) ? '' : f.block, phase: !SUBDIVISION_PUROKS.includes(e.target.value) ? '' : f.phase }))}>
                            <option value="">Select purok...</option>
                            {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>Purok {n}</option>)}
                            {editMemberForm.barangay?.toUpperCase() === 'SANTOL' && (
                              <>
                                <option value="North Ville 6">North Ville 6</option>
                                <option value="Balagtas Heights">Balagtas Heights</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="member-edit-field">
                          <label>Barangay</label>
                          <input type="text" value={editMemberForm.barangay} onChange={e => setEditMemberForm(f => ({ ...f, barangay: e.target.value }))} />
                        </div>
                        {SUBDIVISION_PUROKS.includes(editMemberForm.purok) && (
                          <>
                            <div className="member-edit-field">
                              <label>Lot</label>
                              <input type="text" value={editMemberForm.lot} onChange={e => setEditMemberForm(f => ({ ...f, lot: e.target.value }))} />
                            </div>
                            <div className="member-edit-field">
                              <label>Block</label>
                              <input type="text" value={editMemberForm.block} onChange={e => setEditMemberForm(f => ({ ...f, block: e.target.value }))} />
                            </div>
                            <div className="member-edit-field">
                              <label>Phase</label>
                              <input type="text" value={editMemberForm.phase} onChange={e => setEditMemberForm(f => ({ ...f, phase: e.target.value }))} />
                            </div>
                          </>
                        )}
                        <div className="member-edit-field">
                          <label>Contact Number</label>
                          <input type="tel" value={editMemberForm.contact} onChange={e => setEditMemberForm(f => ({ ...f, contact: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    <div className="member-edit-section">
                      <h4 className="member-edit-section-title">Other Details</h4>
                      <div className="member-edit-grid">
                        <div className="member-edit-field">
                          <label>Sector Category</label>
                          <select value={editMemberForm.sector_category} onChange={e => setEditMemberForm(f => ({ ...f, sector_category: e.target.value }))}>
                            <option value="">Select Sector...</option>
                            {sectorOptions.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="member-edit-field">
                          <label>Gender</label>
                          <select value={editMemberForm.gender || ''} onChange={e => setEditMemberForm(f => ({ ...f, gender: e.target.value }))}>
                            <option value="">Select Gender...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div className="member-edit-field">
                          <label>Civil Status</label>
                          <select value={editMemberForm.civil_status || ''} onChange={e => setEditMemberForm(f => ({ ...f, civil_status: e.target.value }))}>
                            <option value="">Select Status...</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Widowed">Widowed</option>
                          </select>
                        </div>
                        <div className="member-edit-field">
                          <label>Referral Name</label>
                          <input type="text" value={editMemberForm.referral_name} onChange={e => setEditMemberForm(f => ({ ...f, referral_name: e.target.value }))} />
                        </div>
                        <div className="member-edit-field">
                          <label>Birthday</label>
                          <input type="text" value={editMemberForm.birthday} onChange={e => setEditMemberForm(f => ({ ...f, birthday: e.target.value }))} placeholder="e.g. January 15, 1990" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : showMemberNetwork ? (
                  <>
                    {/* === NETWORK VIEW === */}
                    {(() => {
                      const memberName = getResidentName(selectedMember);
                      // Build referral map
                      const refMap = new Map();
                      allRegs.forEach(reg => {
                        const ref = (reg.referral_name || '').trim();
                        if (!ref) return;
                        if (!refMap.has(ref)) refMap.set(ref, []);
                        refMap.get(ref).push(reg);
                      });
                      const getDownline = (name) => refMap.get(name) || [];

                      // Count levels
                      let l1 = 0, l2 = 0, l3 = 0, l4plus = 0;
                      const countLevels = (regs, level) => {
                        regs.forEach(reg => {
                          const dName = getResidentName(reg);
                          const children = getDownline(dName);
                          if (level === 1) l1++;
                          else if (level === 2) l2++;
                          else if (level === 3) l3++;
                          else if (level >= 4) l4plus++;
                          if (children.length > 0) countLevels(children, level + 1);
                        });
                      };
                      countLevels(getDownline(memberName), 1);

                      // Build upline chain
                      const upline = [];
                      let currentRef = selectedMember.referral_name;
                      const visited = new Set();
                      while (currentRef && !visited.has(currentRef)) {
                        visited.add(currentRef);
                        const parent = allRegs.find(r => getResidentName(r) === currentRef);
                        if (parent) {
                          upline.push(parent);
                          currentRef = parent.referral_name;
                        } else {
                          upline.push({ id: currentRef, _isNameOnly: true, ValidResidents: { first_name: currentRef, last_name: '' } });
                          break;
                        }
                      }

                      // Render downline recursively
                      const switchToMember = (m) => {
                        if (!m || m._isNameOnly) return;
                        setSelectedMember(m);
                        setShowMemberNetwork(false);
                        setMemberScanHistory([]);
                        setExpandedNodes(new Set());
                      };

                      const renderDownline = (reg, depth) => {
                        const dName = getResidentName(reg);
                        const children = getDownline(dName);
                        const isOpen = expandedNodes.has(reg.id);
                        return (
                          <div key={reg.id} className="member-network-node" style={{ marginLeft: depth * 20 }}>
                            <div className="member-network-node-row">
                              {children.length > 0 && (
                                <span className="member-network-toggle" onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedNodes(prev => {
                                    const next = new Set(prev);
                                    if (next.has(reg.id)) next.delete(reg.id); else next.add(reg.id);
                                    return next;
                                  });
                                }}>{isOpen ? '▼' : '▶'}</span>
                              )}
                              <span className="member-network-name" onClick={() => switchToMember(reg)}>{dName}</span>
                              <span className={`status-badge status-${(reg.status || 'pending').toLowerCase()}`}>{reg.status || 'Pending'}</span>
                              {children.length > 0 && <span className="member-network-count">{children.length}</span>}
                            </div>
                            {isOpen && children.map(child => renderDownline(child, depth + 1))}
                          </div>
                        );
                      };

                      return (
                        <div className="member-network-full">
                          {/* Level Summary */}
                          <div className="member-network-summary">
                            <div className="network-level-card l1"><span className="network-level-label">L1 Direct</span><span className="network-level-value">{l1}</span></div>
                            <div className="network-level-card l2"><span className="network-level-label">L2</span><span className="network-level-value">{l2}</span></div>
                            <div className="network-level-card l3"><span className="network-level-label">L3</span><span className="network-level-value">{l3}</span></div>
                            <div className="network-level-card l4"><span className="network-level-label">L4+</span><span className="network-level-value">{l4plus}</span></div>
                            <div className="network-level-card total"><span className="network-level-label">Total Network</span><span className="network-level-value">{l1 + l2 + l3 + l4plus}</span></div>
                          </div>

                          {/* Upline */}
                          {upline.length > 0 && (
                            <div className="member-network-block">
                              <h5 className="member-network-subtitle">⬆️ Upline</h5>
                              <div className="member-network-upline">
                                {upline.map((p, i) => (
                                  <div key={p.id || i} className={`member-network-upline-item${p._isNameOnly ? ' disabled' : ''}`} style={{ marginLeft: i * 16 }} onClick={() => switchToMember(p)}>
                                    <span>{getResidentName(p)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full Downline Tree */}
                          <div className="member-network-block">
                            <h5 className="member-network-subtitle">⬇️ Full Downline Tree</h5>
                            <div className="member-network-downline">
                              {getDownline(memberName).length === 0 ? (
                                <p className="member-network-empty">No downline referrals yet.</p>
                              ) : (
                                getDownline(memberName).map(child => renderDownline(child, 0))
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {/* === PROFILE VIEW === */}
                    {/* Top: Photo + Name + EM Card No + Actions */}
                    <div className="member-detail-top">
                      <div className="member-detail-photo">
                        {(selectedMember.photo_url || selectedMember.photo_base64) ? <img src={selectedMember.photo_url || selectedMember.photo_base64} alt="" /> : <User size={40} color="#94a3b8" />}
                      </div>
                      <div className="member-detail-head">
                        <h2>{name}</h2>
                        <span className="member-detail-status"><CheckCircle size={14} /> Approved Member</span>
                        {selectedMember.printed_at ? (
                          <span className="member-detail-printed printed" title={`Printed on ${new Date(selectedMember.printed_at).toLocaleDateString()}`}><Printer size={13} /> ID Printed · {new Date(selectedMember.printed_at).toLocaleDateString()}</span>
                        ) : (
                          <span className="member-detail-printed not-printed">ID Not Printed</span>
                        )}
                        {hasCardNo && (
                          <p className="member-detail-cardno">EM Card: <strong>{selectedMember.em_card_no}</strong></p>
                        )}
                        {selectedMember.reference_no && (
                          <p className="member-detail-cardno" style={{ marginTop: 2 }}>Ref No: <strong>{selectedMember.reference_no}</strong></p>
                        )}
                        <div className="member-detail-quick-actions">
                          <button className="btn btn-sm btn-edit" onClick={() => openEditMember(selectedMember)}><Pencil size={14} strokeWidth={2.5} /> Edit</button>
                          <button className="btn btn-sm btn-export" onClick={() => exportMemberExcel(selectedMember)}><Download size={14} strokeWidth={2.5} /> Export</button>
                          <button className="btn btn-sm btn-print" onClick={() => { setShowPrintModal(true); setIdCardSide('front'); }}><Printer size={14} strokeWidth={2.5} /> Print ID</button>
                        </div>
                      </div>
                    </div>

                    {/* QR Section */}
                    <div className="member-detail-qr-section">
                      <span className="member-detail-label"><QrCode size={14} style={{marginRight:4, verticalAlign:'text-bottom'}} /> QR Scan Token</span>
                      {hasQR ? (
                        <>
                          <code className="member-qr-big">{selectedMember.qr_token}</code>
                          <div className="member-qr-image">
                            <QRCodeSVG value={`https://www.em-card.com/card/${selectedMember.qr_token}`} size={160} level="H" includeMargin={true} />
                          </div>
                          <p className="member-qr-hint"><ScanLine size={14} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Member scans QR → <strong>https://www.em-card.com/card/{selectedMember.qr_token}</strong></p>
                        </>
                      ) : (
                        <div className="member-qr-missing">
                          <span>No QR token generated yet.</span>
                          <button className="btn btn-generate-qr" onClick={() => generateQRForMember(selectedMember)}>
                            <Zap size={18} /> Generate QR & Card
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Details Grid */}
                    <div className="member-detail-grid">
                      {!SUBDIVISION_PUROKS.includes(selectedMember.purok) && (
                        <div className="member-detail-item"><span className="member-detail-label"><Home size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> House No</span><span className="member-detail-value">{selectedMember.house_no ? selectedMember.house_no : '-'}</span></div>
                      )}
                      <div className="member-detail-item"><span className="member-detail-label"><Building size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Purok</span><span className="member-detail-value">{selectedMember.purok ? (SUBDIVISION_PUROKS.includes(selectedMember.purok) ? selectedMember.purok : `Purok ${selectedMember.purok}`) : '-'}</span></div>
                      {SUBDIVISION_PUROKS.includes(selectedMember.purok) && (
                        <>
                          <div className="member-detail-item"><span className="member-detail-label">Lot</span><span className="member-detail-value">{selectedMember.lot || '-'}</span></div>
                          <div className="member-detail-item"><span className="member-detail-label">Block</span><span className="member-detail-value">{selectedMember.block || '-'}</span></div>
                          <div className="member-detail-item"><span className="member-detail-label">Phase</span><span className="member-detail-value">{selectedMember.phase || '-'}</span></div>
                        </>
                      )}
                      <div className="member-detail-item"><span className="member-detail-label"><MapPin size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Barangay</span><span className="member-detail-value">{r.barangay || '-'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><Hash size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Precinct</span><span className="member-detail-value">{r.precinct || '-'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><Tag size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Sector</span><span className="member-detail-value">{selectedMember.sector_category || '-'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><Phone size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Contact</span><span className="member-detail-value">{selectedMember.contact || '-'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><Shield size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Suffix</span><span className="member-detail-value">{r.suffix || '-'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><UserCheck size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Referral</span>
                        {selectedMember.referral_name ? (
                          <span className="member-detail-value member-detail-link" onClick={() => {
                            const refMember = allRegs.find(reg => getResidentName(reg) === selectedMember.referral_name.trim());
                            if (refMember) {
                              setSelectedMember(refMember);
                              setShowMemberNetwork(false);
                              setMemberScanHistory([]);
                              setExpandedNodes(new Set());
                            } else {
                              showToast('Referrer not found in members list', 'error');
                            }
                          }}>{selectedMember.referral_name}</span>
                        ) : (
                          <span className="member-detail-value">-</span>
                        )}
                      </div>
                      <div className="member-detail-item"><span className="member-detail-label"><Calendar size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Approved On</span><span className="member-detail-value">{new Date(selectedMember.created_at).toLocaleDateString()}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><Printer size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Print Status</span><span className="member-detail-value" style={{ color: selectedMember.printed_at ? '#059669' : '#dc2626', fontWeight: 600 }}>{selectedMember.printed_at ? `ID Printed · ${new Date(selectedMember.printed_at).toLocaleDateString()}` : 'ID Not Printed'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><ScanLine size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Total Scans</span><span className="member-detail-value">{selectedMember.scan_count || 0}</span></div>
                      <div className="member-detail-item full-width"><span className="member-detail-label"><Clock size={12} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Last Scanned</span><span className="member-detail-value">{selectedMember.last_scanned_at ? new Date(selectedMember.last_scanned_at).toLocaleString() : 'Never'}</span></div>
                    </div>

                    {/* Action Buttons */}
                    {hasQR && (
                      <div className="member-detail-links">
                        <a href={`https://www.em-card.com/card/${selectedMember.qr_token}`} target="_blank" rel="noreferrer" className="btn btn-member-link"><Globe size={18} /> Open Citizen Dashboard</a>
                        <button className="btn btn-member-copy" onClick={() => { navigator.clipboard.writeText(`https://www.em-card.com/card/${selectedMember.qr_token}`); showToast('Card URL copied!', 'success'); }}><Link2 size={18} /> Copy Card URL</button>
                      </div>
                    )}

                    {/* Scan History */}
                    <div className="member-scan-history">
                      <h4 className="member-scan-history-title"><ScanLine size={14} style={{marginRight:6, verticalAlign:'text-bottom'}} /> Scan History</h4>
                      {memberScanHistoryLoading ? (
                        <p className="member-scan-loading">Loading scan history...</p>
                      ) : memberScanHistory.length === 0 ? (
                        <p className="member-scan-empty">No event scans recorded yet.</p>
                      ) : (
                        <div className="member-scan-list">
                          {memberScanHistory.map((scan, i) => (
                            <div key={scan.id || i} className="member-scan-item">
                              <div className="member-scan-event">{scan.scan_events?.event_name || 'Unknown Event'}</div>
                              <div className="member-scan-meta">
                                <span>{scan.scan_events?.location || '-'}</span>
                                <span>{new Date(scan.scanned_at).toLocaleDateString()} {new Date(scan.scanned_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span>By: {scan.scanned_by || 'System'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                {memberEditMode ? (
                  <>
                    <button type="button" className="btn btn-modal-secondary" onClick={() => setMemberEditMode(false)}>Cancel</button>
                    <button type="button" className="btn btn-modal-primary" onClick={handleUpdateMember} disabled={editMemberLoading}>
                      {editMemberLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-modal-secondary" onClick={() => setSelectedMember(null)}>Close</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* PRINT ID CARD MODAL */}
      {showPrintModal && selectedMember && (() => {
        const r = selectedMember.ValidResidents || {};
        const name = `${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name || ''}${r.suffix ? ' ' + r.suffix : ''}`.trim().toUpperCase();
        const purokLabel = selectedMember.purok ? (SUBDIVISION_PUROKS.includes(selectedMember.purok) ? selectedMember.purok.toUpperCase() : `PUROK ${selectedMember.purok}`) : '';
        const lotBlockPhase = SUBDIVISION_PUROKS.includes(selectedMember.purok) ? `Lot ${selectedMember.lot || ''} Block ${selectedMember.block || ''} Phase ${selectedMember.phase || ''}` : '';
        const barangay = r.barangay ? `${r.barangay.toUpperCase()}, ` : '';
        const address = SUBDIVISION_PUROKS.includes(selectedMember.purok)
          ? `${lotBlockPhase ? `${lotBlockPhase}, ` : ''}${purokLabel ? `${purokLabel}, ` : ''}${barangay}BALAGTAS, BULACAN`
          : `${selectedMember.house_no ? `#${selectedMember.house_no} ` : ''}${purokLabel ? `${purokLabel}, ` : ''}${barangay}BALAGTAS, BULACAN`;
        const contact = selectedMember.contact || '';
        const birthday = selectedMember.birthday || '';
        const dateIssued = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        return (
          <div className="modal-overlay print-modal-overlay" onClick={() => setShowPrintModal(false)}>
            <div className="modal-card print-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Print ID Card</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="id-card-side-toggle">
                    <button className={`id-card-side-btn ${idCardSide === 'front' ? 'active' : ''}`} onClick={() => setIdCardSide('front')}>Front</button>
                    <button className={`id-card-side-btn ${idCardSide === 'back' ? 'active' : ''}`} onClick={() => setIdCardSide('back')}>Back</button>
                  </div>
                  <button className="btn btn-sm btn-print" onClick={() => { window.print(); if (selectedMember) markAsPrinted(selectedMember.id); }}><Printer size={14} strokeWidth={2.5} /> Print</button>
                  <button className="btn btn-sm btn-download-jpg" onClick={downloadIdCardJPG}><Download size={14} strokeWidth={2.5} /> JPG</button>
                  <button className="modal-close-x" onClick={() => setShowPrintModal(false)}>✕</button>
                </div>
              </div>
              <div className="modal-body print-modal-body">
                <div className="id-card-wrapper">
                  {/* FRONT */}
                  <div className={`id-card id-card-front${idCardSide === 'front' ? ' active' : ''}`} id="id-card-print">
                    <img src="/id-bg.png" alt="ID Background" className="id-card-bg" />
                    <div className="id-card-content">
                      <div className="id-card-name-container">
                        <div className="id-card-name" ref={idCardNameRef}>{name}</div>
                      </div>
                      <div className="id-card-address-label">LUGAR NG TIRAHAN</div>
                      <div className="id-card-address">{address}</div>
                      <div className="id-card-bottom">
                        <div className="id-card-contact">
                          <span className="id-card-label">KONTAK NG NUMERO</span>
                          <span className="id-card-value">{contact}</span>
                        </div>
                        <div className="id-card-birthday">
                          <span className="id-card-label">PETSA NG KAPANGANAKAN:</span>
                          <span className="id-card-value">{birthday.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="id-card-issued">DATE ISSUED: {dateIssued}</div>
                    </div>
                  </div>
                  {/* BACK */}
                  <div className={`id-card id-card-back${idCardSide === 'back' ? ' active' : ''}`} id="id-card-print-back">
                    <img src="/id-back.png" alt="ID Back" className="id-card-bg" />
                    <div className="id-card-back-content">
                      <div className="id-card-qr-wrapper">
                        {selectedMember.qr_token && (
                          <QRCodeSVG
                            value={`https://www.em-card.com/card/${selectedMember.qr_token}`}
                            size={190}
                            level="M"
                            bgColor="transparent"
                            fgColor="#000000"
                          />
                        )}
                      </div>
                      <div className="id-card-number-bar">
                        <span className="id-card-number-label">ID NUMBER:</span>
                        <span className="id-card-number-value">{selectedMember.em_card_no || selectedMember.qr_token?.slice(0, 8).toUpperCase() || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CREATE ACCOUNT MODAL */}
      {showCreateAccount && (
        <div className="modal-overlay" onClick={() => setShowCreateAccount(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 Create Admin Account</h3>
              <button className="modal-close-x" onClick={() => setShowCreateAccount(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAccount} className="modal-form">
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" required value={createAccountForm.email} onChange={e => setCreateAccountForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={createAccountForm.role} onChange={e => setCreateAccountForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" required value={createAccountForm.password} onChange={e => setCreateAccountForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" required value={createAccountForm.confirmPassword} onChange={e => setCreateAccountForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat password" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-modal-secondary" onClick={() => setShowCreateAccount(false)}>Cancel</button>
                <button type="submit" className="btn btn-modal-primary" disabled={createAccountLoading}>
                  {createAccountLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ID Print Scanner Modal — camera + manual scanner */}
      {scanQrMember && (
        <div className="modal-overlay" onClick={() => { setScanQrMember(null); setScanQrResult(null); setScanQrToken(''); setPrintScanMode('camera'); stopPrintCamera(); }}>
          <div className="modal-card qr-scan-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
              <h3><ScanLine size={18} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> Scan Printed ID</h3>
              <button className="modal-close-x" style={{ position: 'absolute', right: 16 }} onClick={() => { setScanQrMember(null); setScanQrResult(null); setScanQrToken(''); setPrintScanMode('camera'); stopPrintCamera(); }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              {/* Mode Toggle */}
              <div className="scanner-mode-toggle" style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <button className={printScanMode === 'camera' ? 'active' : ''} onClick={() => { setScanQrResult(null); setPrintScanMode('camera'); }}>
                  <Camera size={16} /> Camera
                </button>
                <button className={printScanMode === 'manual' ? 'active' : ''} onClick={() => { setScanQrResult(null); setPrintScanMode('manual'); stopPrintCamera(); }}>
                  <ScanLine size={16} /> Manual
                </button>
              </div>

              {/* CAMERA MODE */}
              {printScanMode === 'camera' && (
                <div style={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '1 / 1', margin: '0 auto', background: '#0f172a', overflow: 'hidden', borderRadius: 8 }}>
                  <div id="print-scanner-camera" style={{ width: '100%', height: '100%' }}></div>
                  {!printCameraActive && !scanQrResult && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 8 }}>
                      <Camera size={36} />
                      <p style={{ margin: 0, fontSize: 14 }}>Starting camera…</p>
                      <small>If camera fails, switch to Manual mode</small>
                    </div>
                  )}
                  {/* Result overlay */}
                  {scanQrResult && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: scanQrResult.type === 'success' ? 'rgba(6,78,59,0.95)' : scanQrResult.type === 'info' ? 'rgba(30,58,138,0.95)' : 'rgba(127,29,29,0.95)', color: '#fff', padding: 24, gap: 14, overflowY: 'auto' }}>
                      {scanQrResult.type === 'success' ? <CheckCircle size={32} /> : scanQrResult.type === 'info' ? <Info size={32} /> : <AlertTriangle size={32} />}
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>
                        {scanQrResult.type === 'success' ? '✓ ID Marked as Printed' : scanQrResult.type === 'info' ? 'ℹ Already Printed' : 'Error'}
                      </p>

                      {/* Member Details */}
                      {scanQrResult.member && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.1)', padding: '14px 18px', borderRadius: 12, width: '100%', maxWidth: 340 }}>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: '#1e293b', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {scanQrResult.member.photo ? <img src={scanQrResult.member.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={28} />}
                          </div>
                          <div style={{ textAlign: 'left', minWidth: 0 }}>
                            <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scanQrResult.member.name}</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12, opacity: 0.85 }}>
                              <span><MapPin size={12} style={{ verticalAlign: 'text-bottom', marginRight: 3 }} />{scanQrResult.member.barangay}</span>
                              <span><Home size={12} style={{ verticalAlign: 'text-bottom', marginRight: 3 }} />{scanQrResult.member.purok}</span>
                              <span><Phone size={12} style={{ verticalAlign: 'text-bottom', marginRight: 3 }} />{scanQrResult.member.contact}</span>
                              <span><CreditCard size={12} style={{ verticalAlign: 'text-bottom', marginRight: 3 }} />{scanQrResult.member.emCardNo}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <p style={{ margin: 0, fontSize: 13, textAlign: 'center', opacity: 0.9 }}>{scanQrResult.message}</p>
                      <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={() => { setScanQrResult(null); setScanQrToken(''); if (printScanMode === 'camera') startPrintCamera(); }}>
                        Scan Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MANUAL MODE */}
              {printScanMode === 'manual' && (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div className="scan-input-icon"><ScanLine size={32} color="#059669" /></div>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0, textAlign: 'center' }}>
                    Type or paste the QR token from the printed ID card
                  </p>
                  <form
                    onSubmit={(e) => { e.preventDefault(); handlePrintScan(scanQrToken); }}
                    style={{ width: '100%' }}
                  >
                    <input
                      type="text"
                      value={scanQrToken}
                      onChange={e => setScanQrToken(e.target.value)}
                      placeholder="Enter QR token (e.g., EM-...)"
                      className="scan-token-input"
                      autoFocus
                      style={{ width: '100%', marginBottom: 10 }}
                    />
                    <button type="submit" className="btn btn-scan-start" disabled={scanQrLoading || !scanQrToken.trim()} style={{ width: '100%' }}>
                      {scanQrLoading ? 'Processing…' : 'Mark as Printed'}
                    </button>
                  </form>
                  {scanQrResult && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: scanQrResult.type === 'success' ? '#059669' : scanQrResult.type === 'info' ? '#2563eb' : '#dc2626' }}>
                        {scanQrResult.type === 'success' ? <><CheckCircle size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} /> ID Marked as Printed</> : scanQrResult.type === 'info' ? <><Info size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} /> Already Printed</> : <><AlertTriangle size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} /> Error</>}
                      </p>

                      {/* Member Details Card */}
                      {scanQrResult.member && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px 18px', borderRadius: 12, width: '100%' }}>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {scanQrResult.member.photo ? <img src={scanQrResult.member.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={28} color="#64748b" />}
                          </div>
                          <div style={{ textAlign: 'left', minWidth: 0 }}>
                            <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scanQrResult.member.name}</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12, color: '#64748b' }}>
                              <span><MapPin size={12} style={{ verticalAlign: 'text-bottom', marginRight: 3 }} />{scanQrResult.member.barangay}</span>
                              <span><Home size={12} style={{ verticalAlign: 'text-bottom', marginRight: 3 }} />{scanQrResult.member.purok}</span>
                              <span><Phone size={12} style={{ verticalAlign: 'text-bottom', marginRight: 3 }} />{scanQrResult.member.contact}</span>
                              <span><CreditCard size={12} style={{ verticalAlign: 'text-bottom', marginRight: 3 }} />{scanQrResult.member.emCardNo}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <p style={{ margin: 0, fontSize: 12, color: '#64748b', textAlign: 'center' }}>{scanQrResult.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
