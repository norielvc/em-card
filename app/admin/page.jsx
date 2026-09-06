'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import RegisterForm from '../components/RegisterForm';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, UserCheck, UserPlus, Trash2, Search, Download, QrCode, X, CheckCircle, Link2, 
  AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Edit3, BarChart3, PieChart, TrendingUp, 
  Filter, RefreshCw, Printer, ScanLine, MessageSquare, Send, Calendar, Home, 
  Smartphone, Pencil, Settings, LogOut, Menu, Bell, MapPin, ChevronDown, Eye, 
  EyeOff, FileText, Activity, Clock, ShieldCheck, Info, Check, Copy, Upload,
  HeartHandshake, GraduationCap, Landmark, HeartPulse, Sprout, Telescope,
  PlayCircle, Sprout as PlantIcon, Gift, Facebook, Twitter, Instagram, Share2,
  Camera, RefreshCw as RotateCw, User, ArrowLeft, LayoutDashboard, ClipboardList, Network, Shield,
  ArrowRight, Ban, Building, Cake, CreditCard, Database, Folder, Globe, HardDrive, Hash,
  History, Inbox, Lock, Mail, Megaphone, Monitor, Phone, Plus, Server, ShieldAlert,
  ShieldCheck as ShieldCheckIcon, Tag, Zap, Edit, Trash, Award, XCircle
} from 'lucide-react';


// Subdivision puroks that use Lot/Block/Phase instead of House Number
const SUBDIVISION_PUROKS = ['North Ville 6', 'Balagtas Heights', 'Milaflor Subdivision', 'Divine Grace Village', 'Sta. Cruz Village', 'Mariano Village', 'Zone 1 St. Francis Subdivision', 'Zone 1 Sta. Elene Subdivision', 'Zone 5 Villa Juliana Subdivision', 'Zone 4 Virgen Milagrosa Homes', 'Jomaville Subdivision', 'Cresta Verde', 'Villa Castro', 'Divine Grace II', 'Villa Victoria St.', 'Villa Lourdes', 'Ma. Magdalena Subdivision', 'Ma. Corazon Subdivision', 'RMB Subdivision', 'Jordan Valley Subdivision'];

let _on429Handler = null;
async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 429) _on429Handler?.();
  return res;
}

// Helper for smart pagination (always shows first & last pages, plus window around active page)
function getPaginationItems(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
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
  const [lastNotifSeen, setLastNotifSeen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('emcard_last_notif_seen') || null;
    }
    return null;
  });
  const [unreadInquiries, setUnreadInquiries] = useState([]);
  const [unreadFeedback, setUnreadFeedback] = useState([]);

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

  // Member Source Analytics
  const [validResidentMembers, setValidResidentMembers] = useState(0);
  const [nonValidResidentMembers, setNonValidResidentMembers] = useState(0);

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
  const [regFilterBarangay, setRegFilterBarangay] = useState('');
  const [regFilterSector, setRegFilterSector] = useState('');
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
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [filterBarangay, setFilterBarangay] = useState('');
  const [filterPurok, setFilterPurok] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterOrganization, setFilterOrganization] = useState('');
  const [filterPrinted, setFilterPrinted] = useState('');
  const [filterVoterSource, setFilterVoterSource] = useState(''); // 'voter' | 'non-voter'

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedRegDetail, setSelectedRegDetail] = useState(null);
  const [regEditMode, setRegEditMode] = useState(false);
  const [regEditForm, setRegEditForm] = useState({});
  const [regEditLoading, setRegEditLoading] = useState(false);
  const [adminReferral, setAdminReferral] = useState('');
  const [adminReferralQuery, setAdminReferralQuery] = useState('');
  const [adminReferralResults, setAdminReferralResults] = useState([]);
  const [adminReferralValid, setAdminReferralValid] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberEditMode, setMemberEditMode] = useState(false);
  const [editReferralQuery, setEditReferralQuery] = useState('');
  const [editReferralResults, setEditReferralResults] = useState([]);
  const [editReferralValid, setEditReferralValid] = useState(false);
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
  // Registration delete
  const [showDeleteRegModal, setShowDeleteRegModal] = useState(false);
  const [deleteRegId, setDeleteRegId] = useState(null);
  const [deleteRegName, setDeleteRegName] = useState('');
  const [deleteRegLoading, setDeleteRegLoading] = useState(false);
  // Promote to registered voter
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteReg, setPromoteReg] = useState(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
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
  const adminReferralDebounceRef = useRef(null);
  const editReferralDebounceRef = useRef(null);

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
  const [editCameraActive, setEditCameraActive] = useState(false);
  const editVideoRef = useRef(null);
  const editCanvasRef = useRef(null);
  const editCameraStreamRef = useRef(null);

  // Re-attach camera stream to video element whenever it mounts
  useEffect(() => {
    if (editCameraActive && editVideoRef.current && editCameraStreamRef.current && !editVideoRef.current.srcObject) {
      editVideoRef.current.srcObject = editCameraStreamRef.current;
      editVideoRef.current.play().catch(() => {});
    }
  });

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
  const [sendProgress, setSendProgress] = useState({ stage: '', message: '', percent: 0 });
  const [msgRecipientPreview, setMsgRecipientPreview] = useState({ count: 0, loading: false });
  const previewRequestIdRef = useRef(0);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [msgRecipients, setMsgRecipients] = useState([]);
  const [msgUserSearch, setMsgUserSearch] = useState('');
  const [msgUserResults, setMsgUserResults] = useState([]);
  const [smsProvider, setSmsProvider] = useState(null); // { provider, configured, senderName }

  // Contact Inquiries (homepage submissions)
  const [contactInquiries, setContactInquiries] = useState([]);
  const [contactInquiriesLoading, setContactInquiriesLoading] = useState(false);

  // Citizen Feedback / Grievances
  const [grievances, setGrievances] = useState([]);
  const [grievancesLoading, setGrievancesLoading] = useState(false);

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
  const [editingScanEvent, setEditingScanEvent] = useState(null);
  const [newEventForm, setNewEventForm] = useState({ event_name: '', event_date: '', location: '', household_mode: false, selected_barangays: [] });
  const [allBarangays, setAllBarangays] = useState([]);
  const [eventScans, setEventScans] = useState([]);
  const [scanStats, setScanStats] = useState({ total: 0, duplicates: 0 });
  const [viewEventRecords, setViewEventRecords] = useState(null);
  const [eventRecords, setEventRecords] = useState([]);
  const [eventRecordsLoading, setEventRecordsLoading] = useState(false);
  // Scan event delete
  const [showDeleteScanEventModal, setShowDeleteScanEventModal] = useState(false);
  const [deleteScanEventData, setDeleteScanEventData] = useState(null);
  const [deleteScanEventLoading, setDeleteScanEventLoading] = useState(false);

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
  const recentScanCacheRef = useRef(new Set()); // client-side dedup cache for speed (last ~500 scans)
  const idCardNameRef = useRef(null);
  const handleLogoutRef = useRef(null); // avoids TDZ: useEffect reads this ref instead of the function directly

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
  // Organizations Management
  // Organizations Management
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [showOrgDetailsModal, setShowOrgDetailsModal] = useState(null);
  const [showAddOrgMemberModal, setShowAddOrgMemberModal] = useState(null);
  const [orgMemberSearch, setOrgMemberSearch] = useState('');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [createOrgName, setCreateOrgName] = useState('');
  const [showEditOrgModal, setShowEditOrgModal] = useState(null);
  const [editOrgName, setEditOrgName] = useState('');
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(null);

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

  // ── Auto-logout after 30 minutes of inactivity (mobile-safe) ──
  useEffect(() => {
    if (!isLoggedIn) return;
    const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000; // 2 hours
    let timer;
    let lastActivity = Date.now();

    const checkInactive = () => {
      if (Date.now() - lastActivity > INACTIVITY_LIMIT) {
        handleLogoutRef.current?.();
      }
    };

    const reset = () => {
      lastActivity = Date.now();
      clearTimeout(timer);
      timer = setTimeout(checkInactive, INACTIVITY_LIMIT);
    };

    reset();

    // Standard interaction events (passive for mobile perf)
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'touchmove', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));

    // CRITICAL for mobile: check inactivity when tab becomes visible again
    // because setTimeout is heavily throttled in background tabs
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkInactive();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Fallback interval check (10s) for browsers that throttle timers
    const interval = setInterval(checkInactive, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      events.forEach(e => window.removeEventListener(e, reset));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && userRole === 'admin') fetchDashboardData();
  }, [isLoggedIn, userRole]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchContactInquiries();
      fetchGrievances();
      fetchAllRegistrations();
      fetchOrganizations();
    }
  }, [isLoggedIn]);

  // Fetch data for restored activeTab after login/refresh
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === 'registrations') fetchAllRegistrations();
    if (activeTab === 'organizations' && organizations.length === 0) fetchOrganizations();
    if (activeTab === 'members' && allRegs.length === 0) fetchAllRegistrations();
    if (activeTab === 'network' && allRegs.length === 0) fetchAllRegistrations();
    if (activeTab === 'residents') fetchAllResidents(residentsPage, residentSearch, resFilterBarangay, resFilterPrecinct, resFilterStatus);
    if (activeTab === 'eventScanner') fetchEvents();
    if (activeTab === 'events') fetchUpcomingEvents();
    if (activeTab === 'adminLogs') { fetchAdminLogs(); if (accounts.length === 0) fetchAccounts(); }
  }, [isLoggedIn, activeTab]);

  useEffect(() => {
    if (toast && !toast.sticky) {
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

  // Sync admin referral search state when opening/changing registration details modal
  useEffect(() => {
    if (selectedRegDetail) {
      setAdminReferral(selectedRegDetail.referral_name || '');
      setAdminReferralQuery(selectedRegDetail.referral_name || '');
      setAdminReferralValid(!!selectedRegDetail.referral_name);
      setAdminReferralResults([]);
    } else {
      setAdminReferral('');
      setAdminReferralQuery('');
      setAdminReferralValid(false);
      setAdminReferralResults([]);
    }
  }, [selectedRegDetail]);

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

  // Fetch barangays list and allRegs when Messages tab is opened (for dropdown and search)
  useEffect(() => {
    if (activeTab === 'messages') {
      // Fetch barangays
      if (allBarangays.length === 0) {
        (async () => {
          try {
            const { data, error } = await supabase.rpc('get_voters_by_barangay');
            if (error) throw error;
            const barangayList = (data || []).map(v => v.barangay).sort();
            setAllBarangays(barangayList);
          } catch (err) {
            // silent
          }
        })();
      }
      // Fetch all registrations for specific user search (same as members page)
      if (allRegs.length === 0) {
        fetchAllRegistrations();
      }
    }
  }, [activeTab]);

  // Auto-fetch contact inquiries when switching to inquiries tab
  useEffect(() => {
    if (activeTab === 'messages' && msgTab === 'inquiries') {
      fetchContactInquiries();
    }
  }, [activeTab, msgTab]);

  // Auto-fetch grievances when switching to feedback tab
  useEffect(() => {
    if (activeTab === 'messages' && msgTab === 'feedback') {
      fetchGrievances();
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
        .select('id, qr_token, em_card_no, printed_at, first_name, last_name, middle_name, suffix, purok, barangay, contact, photo_url, photo_base64, status, ValidResidents(first_name, last_name, middle_name, suffix, barangay)')
        .ilike('qr_token', clean)
        .eq('status', 'Approved')
        .maybeSingle();

      const vr = reg?.ValidResidents || {};
      const scanFirstName = reg?.first_name || vr.first_name || '';
      const scanLastName = reg?.last_name || vr.last_name || '';
      const scanMiddleName = reg?.middle_name || vr.middle_name || '';
      const scanSuffix = reg?.suffix || vr.suffix || '';
      const scanFullName = `${scanLastName}${scanSuffix ? ' ' + scanSuffix : ''}, ${scanFirstName}${scanMiddleName ? ' ' + scanMiddleName : ''}`.trim();

      if (regErr || !reg) {
        setScanQrResult({ type: 'error', message: 'QR not found. This ID is not registered or not approved.' });
        stopPrintCamera();
      } else if (reg.printed_at) {
        setScanQrResult({
          type: 'info',
          message: `Already marked as printed on ${new Date(reg.printed_at).toLocaleDateString()}`,
          member: {
            name: scanFullName,
            photo: reg.photo_url || reg.photo_base64,
            barangay: reg.barangay || vr.barangay || '-',
            purok: reg.purok || '-',
            contact: reg.contact || '-',
            emCardNo: reg.em_card_no || '-',
          }
        });
        stopPrintCamera();
      } else {
        const { error } = await supabase.from('registrations').update({ printed_at: new Date().toISOString() }).eq('id', reg.id);
        if (error) throw error;
        logAdminAction('scan_event', 'registrations', reg.id, scanFullName, { action: 'mark_printed', em_card_no: reg.em_card_no });
        setScanQrResult({
          type: 'success',
          message: `ID for ${scanFirstName} ${scanLastName} marked as printed!`,
          member: {
            name: scanFullName,
            photo: reg.photo_url || reg.photo_base64,
            barangay: reg.barangay || vr.barangay || '-',
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

  // Wire global 429 handler to show toast
  useEffect(() => {
    _on429Handler = () => setToast({ message: '⚠️ Too many requests. Please refresh the page and try again.', type: 'error', sticky: true });
    return () => { _on429Handler = null; };
  }, []);

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

  const fetchMemberSourceAnalytics = async () => {
    try {
      const { count: validCount } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved')
        .not('resident_id', 'is', null);

      const { count: nonValidCount } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved')
        .is('resident_id', null);

      setValidResidentMembers(validCount || 0);
      setNonValidResidentMembers(nonValidCount || 0);
    } catch (err) {
      showToast('Member source error: ' + err.message, 'error');
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

      // Fetch approved registration counts by barangay
      const { data: regsRaw, error: rErr } = await supabase
        .from('registrations')
        .select('barangay')
        .eq('status', 'Approved');
      if (rErr) throw rErr;
      const regMap = {};
      (regsRaw || []).forEach(r => {
        const b = (r.barangay || 'Unknown').trim();
        regMap[b] = (regMap[b] || 0) + 1;
      });
      const regsByBarangay = Object.entries(regMap)
        .map(([barangay, count]) => ({ barangay, count: Number(count) }))
        .sort((a, b) => b.count - a.count);

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

      // Fetch member source analytics
      await fetchMemberSourceAnalytics();

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
      showToast('Dashboard error: ' + err.message, 'error');
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
    // Use ValidResidents fields if available, otherwise fall back to registration fields
    const firstName = r.first_name || reg.first_name || '';
    const middleName = r.middle_name || reg.middle_name || '';
    const lastName = r.last_name || reg.last_name || '';
    const suffix = r.suffix || reg.suffix || '';
    const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim().toLowerCase();
    const emCard = (reg.em_card_no || '').toLowerCase();
    const precinct = (r.precinct || reg.precinct || '').toLowerCase();
    const queryLower = queryStr.toLowerCase().replace(/[,.]/g, ' ').trim();
    if (!queryLower) return true;
    if (fullName.includes(queryLower)) return true;
    if (emCard.includes(queryLower.replace(/\s+/g, ''))) return true;
    if (precinct && (precinct.includes(queryLower) || queryLower.includes(precinct))) return true;

    // Voter status keyword matching
    const isVoter = reg.is_valid_resident === true;
    const voterKeywords = ['voter', 'registered', 'registered voter'];
    const nonVoterKeywords = ['non-registered', 'non voter', 'nonregistered', 'nonvoter'];
    const matchesVoter = voterKeywords.some(k => queryLower.includes(k));
    const matchesNonVoter = nonVoterKeywords.some(k => queryLower.includes(k));
    if (matchesVoter && isVoter) return true;
    if (matchesNonVoter && !isVoter) return true;

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

  const fetchOrganizations = async () => {
    setOrganizationsLoading(true);
    try {
      const { data } = await supabase.from('organizations').select('*').order('name');
      setOrganizations(data || []);
    } catch (err) {
      // silent
    } finally {
      setOrganizationsLoading(false);
    }
  };

  const fetchAllRegistrations = async () => {
    setRegsLoading(true);
    try {
      const { data } = await supabase
        .from('registrations')
        .select('id, resident_id, reference_no, first_name, middle_name, last_name, suffix, is_valid_resident, house_no, purok, lot, block, phase, barangay, contact, status, gender, civil_status, sector_category, referral_name, organization, photo_url, birthday, created_at, qr_token, em_card_no, scan_count, last_scanned_at, printed_at, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
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
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    let token = '';
    for (let i = 0; i < 24; i++) token += chars[arr[i] % chars.length];
    return 'EM' + token;
  };

  const generateEMCardNo = () => {
    // Format: EM- followed by 10 random digits (0000000000)
    const arr = new Uint8Array(10);
    crypto.getRandomValues(arr);
    let digits = '';
    for (let i = 0; i < 10; i++) digits += arr[i] % 10;
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
      first_name: r.first_name || reg.first_name || '',
      middle_name: r.middle_name || reg.middle_name || '',
      last_name: r.last_name || reg.last_name || '',
      suffix: r.suffix || reg.suffix || '',
      barangay: r.barangay || reg.barangay || '',
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
      birthday: (() => {
        if (!reg.birthday) return '';
        const raw = reg.birthday.trim();
        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
        // Text format like "June 27, 1971" or "1997-06-19"
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          const d = String(parsed.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        return '';
      })(),
      photo_url: reg.photo_url || reg.photo_base64 || '',
    });
    setEditReferralQuery(reg.referral_name || '');
    setEditReferralValid(!!reg.referral_name);
    setEditReferralResults([]);
    setMemberEditMode(true);
  };

  const moveToRegisteredVoters = async () => {
    if (!promoteReg) return;
    const name = getResidentName(promoteReg);
    setPromoteLoading(true);
    try {
      // 1. Create ValidResidents record
      const { data: newResident, error: insertErr } = await supabase
        .from('ValidResidents')
        .insert([{
          last_name: promoteReg.last_name || '',
          first_name: promoteReg.first_name || '',
          middle_name: promoteReg.middle_name || '',
          suffix: promoteReg.suffix || '',
          barangay: promoteReg.barangay || '',
          precinct: '',
          status: 'Registered'
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 2. Update registration to link to new ValidResidents record
      const { error: updateErr } = await supabase
        .from('registrations')
        .update({
          resident_id: newResident.id,
          is_valid_resident: true
        })
        .eq('id', promoteReg.id);

      if (updateErr) throw updateErr;

      showToast(`"${name}" moved to Registered Voters`, 'success');
      logAdminAction('approve_member', 'ValidResidents', newResident.id, name, { from_member_id: promoteReg.id });
      setShowPromoteModal(false);
      setPromoteReg(null);
      await fetchAllRegistrations();
    } catch (err) {
      showToast(err.message || 'Failed to move member', 'error');
    } finally {
      setPromoteLoading(false);
    }
  };

  const compressEditPhoto = (dataUrl, maxKb = 500) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Start with original dimensions, cap at 1200px on longest side
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

        // Iteratively reduce quality until under max size
        let quality = 0.92;
        let result = canvas.toDataURL('image/jpeg', quality);
        const maxChars = maxKb * 1024;

        while (result.length > maxChars && quality > 0.15) {
          quality -= 0.05;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        // If still too large, scale down dimensions further
        while (result.length > maxChars && (width > 200 || height > 200)) {
          width = Math.round(width * 0.85);
          height = Math.round(height * 0.85);
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          quality = 0.8;
          result = canvas.toDataURL('image/jpeg', quality);
          while (result.length > maxChars && quality > 0.15) {
            quality -= 0.05;
            result = canvas.toDataURL('image/jpeg', quality);
          }
        }

        resolve(result);
      };
      img.src = dataUrl;
    });
  };

  const handleEditPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressEditPhoto(ev.target.result);
      setEditMemberForm(f => ({ ...f, photo_url: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const startEditCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      editCameraStreamRef.current = stream;
      if (editVideoRef.current) {
        editVideoRef.current.srcObject = stream;
        await editVideoRef.current.play();
      }
      setEditCameraActive(true);
    } catch (err) {
      showToast('Camera not available: ' + err.message, 'error');
      setEditCameraActive(false);
    }
  };

  const stopEditCamera = () => {
    if (editCameraStreamRef.current) {
      editCameraStreamRef.current.getTracks().forEach(track => track.stop());
      editCameraStreamRef.current = null;
    }
    setEditCameraActive(false);
  };

  const captureEditPhoto = async () => {
    const video = editVideoRef.current;
    const canvas = editCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopEditCamera();
    const compressed = await compressEditPhoto(dataUrl);
    setEditMemberForm(f => ({ ...f, photo_url: compressed }));
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

      // Upload photo to storage if it's a base64 data URL (avoid PG index row size limit)
      let photoUrl = editMemberForm.photo_url || null;
      if (photoUrl && photoUrl.startsWith('data:image')) {
        try {
          const uploadRes = await fetch('/api/upload-member-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: photoUrl, residentId: selectedMember.id }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData.url) photoUrl = uploadData.url;
        } catch (uploadErr) {
          // silent: keep base64 as fallback
        }
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
          organization: editMemberForm.organization,
          birthday: editMemberForm.birthday,
          photo_url: photoUrl,
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
        .select('id, resident_id, reference_no, first_name, middle_name, last_name, suffix, is_valid_resident, house_no, purok, lot, block, phase, barangay, contact, status, gender, civil_status, sector_category, referral_name, organization, photo_base64, photo_url, birthday, created_at, qr_token, em_card_no, scan_count, last_scanned_at, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
        .eq('id', selectedMember.id)
        .single();
      if (fresh) setSelectedMember(fresh);
    } catch (err) {
      showToast(err.message || 'Failed to update member', 'error');
    } finally {
      setEditMemberLoading(false);
    }
  };

  const handleSaveRegEdit = async () => {
    if (!selectedRegDetail) return;
    setRegEditLoading(true);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          house_no: regEditForm.house_no,
          purok: regEditForm.purok,
          barangay: regEditForm.barangay,
          contact: regEditForm.contact,
          sector_category: regEditForm.sector_category,
          gender: regEditForm.gender,
          civil_status: regEditForm.civil_status,
          birthday: regEditForm.birthday,
          lot: regEditForm.lot,
          block: regEditForm.block,
          phase: regEditForm.phase,
        })
        .eq('id', selectedRegDetail.id);

      if (error) throw error;

      showToast('Registration updated', 'success');
      logAdminAction('edit_resident', 'registrations', selectedRegDetail.id, getResidentName(selectedRegDetail), {});
      setRegEditMode(false);
      // Refresh local state
      const updated = { ...selectedRegDetail, ...regEditForm };
      setSelectedRegDetail(updated);
      await fetchAllRegistrations();
    } catch (err) {
      showToast(err.message || 'Failed to update registration', 'error');
    } finally {
      setRegEditLoading(false);
    }
  };

  const approveRegistration = async (id, assignedReferral) => {
    let finalReferral = assignedReferral;

    // Fetch the registration details if not passed to verify referral_name exists
    if (!finalReferral) {
      const { data: currentReg } = await supabase
        .from('registrations')
        .select('referral_name')
        .eq('id', id)
        .single();
      if (currentReg && currentReg.referral_name) {
        finalReferral = currentReg.referral_name;
      }
    }

    if (!finalReferral || !finalReferral.trim()) {
      showToast('Referral Node is required. Please review registration details to assign a referral.', 'error');
      const targetReg = allRegs.find(r => r.id === id);
      if (targetReg) {
        setSelectedRegDetail(targetReg);
      }
      return false;
    }

    try {
      const emCardNo = generateEMCardNo();
      const qrToken = emCardNo; // QR Token and EM Card Number are identical
      const { error } = await supabase
        .from('registrations')
        .update({ 
          status: 'Approved', 
          qr_token: qrToken, 
          em_card_no: emCardNo,
          referral_name: finalReferral.trim()
        })
        .eq('id', id);
      if (error) {
        showToast(error.message, 'error');
        return false;
      } else {
        showToast(`Approved. EM Card: ${emCardNo}`, 'success');
        const { data: reg } = await supabase
          .from('registrations')
          .select('first_name, last_name')
          .eq('id', id)
          .single();
        const targetName = reg ? `${reg.last_name || ''}, ${reg.first_name || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || null : null;
        logAdminAction('approve_member', 'registrations', id, targetName, { em_card_no: emCardNo, referral_name: finalReferral.trim() });
        fetchAllRegistrations();
        return true;
      }
    } catch (err) {
      showToast('Failed to approve registration.', 'error');
      return false;
    }
  };

  const handleDeleteRegistration = async () => {
    setDeleteRegLoading(true);
    try {
      const res = await authFetch('/api/registrations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteRegId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Registration deleted.`, 'success');
        logAdminAction('delete_registration', 'registrations', deleteRegId, deleteRegName, {});
        setShowDeleteRegModal(false);
        setSelectedRegDetail(null);
        fetchAllRegistrations();
      } else {
        showToast(data.error || 'Failed to delete registration.', 'error');
      }
    } catch (err) {
      showToast('Failed to delete registration.', 'error');
    } finally {
      setDeleteRegLoading(false);
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

  const handleLogout = useCallback(async () => {
    logAdminAction('logout', null, null, null, { email: username });
    await supabase.auth.signOut();
    setPassword('');
    setLoginError('');
    setSidebarOpen(false);
  }, [username]);

  // Sync ref so auto-logout useEffect can call it without TDZ issues
  handleLogoutRef.current = handleLogout;

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
    if (tab === 'accounts') fetchAccounts();
    if (tab === 'adminLogs') { fetchAdminLogs(); if (accounts.length === 0) fetchAccounts(); }
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
    { id: 'registerMember', label: 'Register Member', icon: <UserPlus size={20} strokeWidth={1.8} /> },
    { id: 'members', label: 'Members', icon: <UserCheck size={20} strokeWidth={1.8} /> },
    { id: 'organizations', label: 'Organizations', icon: <Building size={20} strokeWidth={1.8} /> },
    { id: 'eventScanner', label: 'Event Scanner', icon: <ScanLine size={20} strokeWidth={1.8} /> },
    { id: 'events', label: 'Upcoming Events', icon: <Calendar size={20} strokeWidth={1.8} /> },
    { id: 'network', label: 'Network', icon: <Network size={20} strokeWidth={1.8} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={20} strokeWidth={1.8} /> },
    { id: 'accounts', label: 'Accounts', icon: <Shield size={20} strokeWidth={1.8} /> },
    { id: 'adminLogs', label: 'Admin Logs', icon: <History size={20} strokeWidth={1.8} /> },
    { id: 'system', label: 'System', icon: <Monitor size={20} strokeWidth={1.8} /> },
  ].filter(item => {
    if (userRole !== 'staff') return true;
    // Staff sees: Event Scanner + Register Member (assist residents to register)
    const staffTabs = new Set(['eventScanner', 'registerMember']);
    return staffTabs.has(item.id);
  });

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

  const fetchGrievances = async () => {
    setGrievancesLoading(true);
    try {
      const res = await authFetch('/api/grievances');
      const data = await res.json();
      const list = data.grievances || [];
      setGrievances(list);
      setUnreadFeedback(list.filter(g => !['resolved', 'closed', 'done'].includes((g.status || '').toLowerCase())));
    } catch (err) {
      // silent
    } finally {
      setGrievancesLoading(false);
    }
  };

  const fetchContactInquiries = async () => {
    setContactInquiriesLoading(true);
    try {
      const res = await authFetch('/api/contact');
      const data = await res.json();
      const list = data.messages || [];
      setContactInquiries(list);
      setUnreadInquiries(list.filter(m => m.status === 'unread'));
    } catch (err) {
      // silent
    } finally {
      setContactInquiriesLoading(false);
    }
  };

  const searchSpecificUser = (query) => {
    if (!query || query.length < 2) { setMsgUserResults([]); return; }
    
    // Filter from allRegs - only approved members with valid names
    const lowerQuery = query.toLowerCase();
    const filtered = allRegs.filter(reg => {
      if (reg.status !== 'Approved') return false;
      const vr = reg.ValidResidents;
      if (!vr) return false;
      const firstName = (vr.first_name || '').toLowerCase();
      const lastName = (vr.last_name || '').toLowerCase();
      const middleName = (vr.middle_name || '').toLowerCase();
      const emCardNo = (reg.em_card_no || '').toLowerCase();
      return firstName.includes(lowerQuery) || 
             lastName.includes(lowerQuery) || 
             middleName.includes(lowerQuery) ||
             emCardNo.includes(lowerQuery);
    }).slice(0, 8);
    
    setMsgUserResults(filtered);
  };

  // Calculate recipient count preview for SMS
  const calculateRecipientPreview = async (targetType, targetValue) => {
    // Use passed values or fall back to current state
    targetType = targetType || msgForm.targetType;
    targetValue = targetValue || msgForm.targetValue;
    
    // Increment request ID - only latest request updates state
    const currentRequestId = ++previewRequestIdRef.current;
    
    if (targetType === 'test') {
      setMsgRecipientPreview({ count: targetValue ? 1 : 0, loading: false });
      return;
    }
    if (targetType === 'specific') {
      setMsgRecipientPreview({ count: targetValue ? 1 : 0, loading: false });
      return;
    }
    
    setMsgRecipientPreview(prev => ({ ...prev, loading: true }));
    
    try {
      let query = supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'Approved');
      
      if (targetType === 'sector' && targetValue) {
        query = query.eq('sector_category', targetValue);
      } else if (targetType === 'barangay' && targetValue) {
        query = query.eq('barangay', targetValue);
      } else if (targetType === 'leader' && targetValue) {
        query = query.ilike('referral_name', `%${targetValue}%`);
      }
      
      const { count, error } = await query.not('contact', 'is', null).neq('contact', '');
      
      // Only update if this is still the latest request
      if (currentRequestId !== previewRequestIdRef.current) return;
      
      if (error) throw error;
      setMsgRecipientPreview({ count: count || 0, loading: false });
    } catch (err) {
      // Only update if this is still the latest request
      if (currentRequestId !== previewRequestIdRef.current) return;
      setMsgRecipientPreview({ count: 0, loading: false });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgForm.body.trim()) { showToast('Message body is required', 'error'); return; }
    setMsgSending(true);
    setSendProgress({ stage: 'preparing', message: 'Preparing recipient list...', percent: 10 });
    
    try {
      setSendProgress({ stage: 'sending', message: `Sending SMS to ${msgRecipientPreview.count} recipients...`, percent: 40 });
      
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
      setSendProgress({ stage: 'finalizing', message: 'Finalizing...', percent: 80 });
      
      const data = await res.json();
      if (data.success) {
        setSendProgress({ stage: 'complete', message: 'Complete!', percent: 100 });
        showToast(`SMS campaign sent to ${data.totalRecipients} recipients`, 'success');
        setMsgForm({ title: '', body: '', type: 'broadcast', targetType: 'all', targetValue: '' });
        fetchMessages();
      } else {
        showToast(data.error || 'Failed to send', 'error');
      }
    } catch (err) {
      setSendProgress({ stage: 'error', message: 'Failed to send', percent: 0 });
      showToast(err.message || 'Network error', 'error');
    } finally {
      setTimeout(() => {
        setMsgSending(false);
        setSendProgress({ stage: '', message: '', percent: 0 });
      }, 500);
    }
  };

  const getResidentFirstName = (reg) => {
    const raw = reg?.first_name || reg?.ValidResidents?.first_name || '';
    if (!raw) return 'Ka-Barangay';
    return raw.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const fetchBirthdayCelebrators = async () => {
    setBirthdayLoading(true);
    try {
      const today = new Date();
      const todayMonthDay = `${today.toLocaleString('en-US', { month: 'long' })} ${today.getDate()}`;

      const { data: regs, error } = await supabase
        .from('registrations')
        .select('id, resident_id, contact, barangay, sector_category, birthday, first_name, last_name, middle_name, suffix, ValidResidents(first_name, last_name, middle_name, suffix, barangay, precinct)')
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

    const currentRate = totalApprovedMembers / (totalResidents || 1);
    const lastMonthRate = (totalApprovedMembers - thisMonth) / (totalResidents || 1);
    const rateChange = (currentRate - lastMonthRate) * 100;
    const rateChangeStr = `${rateChange >= 0 ? '↑' : '↓'} ${Math.abs(rateChange).toFixed(1)}pp vs last month`;
    const rateChangeClass = rateChange >= 0 ? 'up' : 'down';

    return (
    <>
      {/* Dashboard Welcome Header & Section Tabs Navbar */}
      <div className="dash-welcome" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
            Welcome back, <strong style={{ color: '#0f172a' }}>{username || 'Admin'}</strong>! Here&apos;s what&apos;s happening with your EM Card system.
          </p>
        </div>

        {/* Dashboard Section Tabs */}
        <div className="dashboard-tabs">
          {[
            { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} strokeWidth={1.8} /> },
            { id: 'trends', label: 'Trends', icon: <TrendingUp size={15} strokeWidth={1.8} /> },
            { id: 'geography', label: 'Geography', icon: <MapPin size={15} strokeWidth={1.8} /> },
            { id: 'demographics', label: 'Demographics', icon: <PieChart size={15} strokeWidth={1.8} /> },
            { id: 'network', label: 'Network', icon: <Share2 size={15} strokeWidth={1.8} /> },
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
      </div>

      {dashTab === 'overview' && (() => {
        // Compute birthday celebrators count
        const today = new Date();
        const todayM = today.getMonth() + 1;
        const todayD = today.getDate();
        const celebratorsCount = allRegs.filter(r => {
          if (!r.birthday) return false;
          const [, mo, da] = r.birthday.split('-');
          return parseInt(mo) === todayM && parseInt(da) === todayD;
        }).length;
        const hasCelebrators = celebratorsCount > 0;
        const pendingCount = allRegs.filter(r => r.status === 'Pending').length;
        const printTotal = cardsPrinted + cardsPending;
        const printPct = printTotal > 0 ? Math.round((cardsPrinted / printTotal) * 100) : 100;
        const srcTotal = validResidentMembers + nonValidResidentMembers;
        const srcPct = srcTotal > 0 ? Math.round((validResidentMembers / srcTotal) * 100) : 0;

        return (
          <>
            {/* KPI Stat Cards */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon"><Users size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">Registered Voters</span>
                  {dashLoading ? <span className="kpi-skeleton" style={{ width: '80px', height: '28px' }} /> : <span className="kpi-value">{totalResidents.toLocaleString()}</span>}
                  <span className={`kpi-change ${regChangeClass}`}>{regChangeStr}</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><ClipboardList size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">EM Card Members</span>
                  {dashLoading ? <span className="kpi-skeleton" style={{ width: '80px', height: '28px' }} /> : <span className="kpi-value">{totalApprovedMembers.toLocaleString()}</span>}
                  <span className={`kpi-change ${regChangeClass}`}>{regChangeStr}</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><CheckCircle size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">Registration Rate</span>
                  {dashLoading ? <span className="kpi-skeleton" style={{ width: '60px', height: '28px' }} /> : <span className="kpi-value">{Math.round(currentRate * 100)}%</span>}
                  <span className={`kpi-change ${rateChangeClass}`}>{rateChangeStr}</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Calendar size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">New This Month</span>
                  {dashLoading ? <span className="kpi-skeleton" style={{ width: '70px', height: '28px' }} /> : <span className="kpi-value">{thisMonth.toLocaleString()}</span>}
                  <span className={`kpi-change ${regChangeClass}`}>{regChangeStr}</span>
                </div>
              </div>
            </div>

            {/* === COMPACT NOTIFICATION ROW === */}
            <div className="dash-notif-row">
              {/* Pending Approvals */}
              <div className="dash-notif-card" onClick={() => handleNavClick('registrations')}>
                <div className="dash-notif-icon"><Bell size={15} /></div>
                <div className="dash-notif-body">
                  <strong>Pending Approvals</strong>
                  <span>{pendingCount > 0 ? `${pendingCount} registration${pendingCount !== 1 ? 's' : ''} awaiting review` : 'No pending registrations'}</span>
                </div>
                {pendingCount > 0 && <span className="dash-notif-count">{pendingCount}</span>}
                <ArrowRight size={14} className="dash-notif-arrow" />
              </div>

              {/* Birthday */}
              <div className={`dash-notif-card${hasCelebrators ? ' active-birthday' : ''}`} onClick={() => {
                setActiveTab('messages');
                setMsgTab('birthday');
                fetchBirthdayCelebrators();
              }}>
                <div className="dash-notif-icon"><Cake size={15} /></div>
                <div className="dash-notif-body">
                  <strong>{hasCelebrators ? `${celebratorsCount} Birthday${celebratorsCount !== 1 ? 's' : ''} Today` : 'No Birthdays Today'}</strong>
                  <span>{hasCelebrators ? 'View celebrators & send greetings' : 'Manage birthday SMS settings'}</span>
                </div>
                {hasCelebrators && <span className="dash-notif-count">{celebratorsCount}</span>}
                <ArrowRight size={14} className="dash-notif-arrow" />
              </div>
            </div>

            {/* === MAIN ANALYTICS: 2x2 Equal Grid === */}
            <div className="dash-overview-grid-2x2">

              {/* Card 1: Card Production Status */}
              <div className="dash-panel-v2">
                <div className="dash-panel-v2-header">
                  <div>
                    <p className="dash-panel-v2-title">Card Production Status</p>
                    <p className="dash-panel-v2-sub">Printed vs Not Printed</p>
                  </div>
                  <div className="dash-panel-v2-icon">
                    <CreditCard size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="dash-panel-v2-body">
                  <div className="dash-stat-pair">
                    <div className="dash-stat-item">
                      <div className="dash-stat-label">
                        <span className="dash-dot green" /> Printed
                      </div>
                      <div className="dash-stat-value">{cardsPrinted.toLocaleString()}</div>
                    </div>
                    <div className="dash-stat-item">
                      <div className="dash-stat-label">
                        <span className="dash-dot muted" /> Pending
                      </div>
                      <div className="dash-stat-value">{cardsPending.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="dash-progress-wrap">
                    <div className="dash-progress-row">
                      <span>Print completion rate</span>
                      <strong>{printPct}%</strong>
                    </div>
                    <div className="dash-progress-track">
                      <div className="dash-progress-fill" style={{ width: `${printPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Production Efficiency */}
              <div className="dash-panel-v2">
                <div className="dash-panel-v2-header">
                  <div>
                    <p className="dash-panel-v2-title">Production Efficiency</p>
                    <p className="dash-panel-v2-sub">Average registration to print</p>
                  </div>
                  <div className="dash-panel-v2-icon">
                    <TrendingUp size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="dash-panel-v2-body">
                  <div className="dash-eff-inner">
                    <div className="dash-eff-number">{avgDaysToPrint}</div>
                    <div className="dash-eff-right">
                      <div className="dash-eff-label">Days Average</div>
                      <div className="dash-eff-badge">
                        {avgDaysToPrint <= 7 ? '✓ On Schedule' : '⚠ Action Needed'}
                      </div>
                      <div className="dash-eff-desc">Average turnaround time from application to card issuance</div>
                    </div>
                  </div>
                  <div className="dash-progress-wrap" style={{ marginTop: 14 }}>
                    <div className="dash-progress-row">
                      <span>Target turnaround SLA</span>
                      <strong>7 Days</strong>
                    </div>
                    <div className="dash-progress-track">
                      <div className="dash-progress-fill" style={{ width: `${Math.min(100, Math.round((7 / (avgDaysToPrint || 1)) * 100))}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Member Source Breakdown */}
              <div className="dash-panel-v2">
                <div className="dash-panel-v2-header">
                  <div>
                    <p className="dash-panel-v2-title">Member Source Breakdown</p>
                    <p className="dash-panel-v2-sub">Registered voters vs non-registered</p>
                  </div>
                  <div className="dash-panel-v2-icon">
                    <Users size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="dash-panel-v2-body">
                  <div className="dash-stat-pair">
                    <div className="dash-stat-item">
                      <div className="dash-stat-label">
                        <span className="dash-dot green" /> Registered
                      </div>
                      <div className="dash-stat-value">{validResidentMembers.toLocaleString()}</div>
                    </div>
                    <div className="dash-stat-item">
                      <div className="dash-stat-label">
                        <span className="dash-dot muted" /> Non-Registered
                      </div>
                      <div className="dash-stat-value">{nonValidResidentMembers.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="dash-progress-wrap">
                    <div className="dash-progress-row">
                      <span>Registered voter ratio</span>
                      <strong>{srcPct}%</strong>
                    </div>
                    <div className="dash-progress-track">
                      <div className="dash-progress-fill" style={{ width: `${srcPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Member Engagement Score */}
              <div className="dash-panel-v2">
                <div className="dash-panel-v2-header">
                  <div>
                    <p className="dash-panel-v2-title">Member Engagement Score</p>
                    <p className="dash-panel-v2-sub">% of members attending events</p>
                  </div>
                  <div className="dash-panel-v2-icon">
                    <Award size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="dash-panel-v2-body">
                  <div className="dash-donut-wrap">
                    <div className="dash-donut-svg-wrap">
                      <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#059669" strokeWidth="10"
                          strokeDasharray={`${memberEngagementScore * 2.638} 263.8`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="dash-donut-center">
                        <span className="dash-donut-pct">{memberEngagementScore}%</span>
                      </div>
                    </div>
                    <div className="dash-donut-right">
                      <div className="dash-donut-main">Members Engaged</div>
                      <div className="dash-donut-sub">Events participation rate</div>
                      <div style={{ marginTop: 8, fontSize: '0.74rem', color: '#64748b' }}>
                        Total approved members: <strong style={{ color: '#0f172a' }}>{totalApprovedMembers.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="dash-progress-wrap" style={{ marginTop: 10 }}>
                    <div className="dash-progress-row">
                      <span>Overall engagement index</span>
                      <strong>{memberEngagementScore}%</strong>
                    </div>
                    <div className="dash-progress-track">
                      <div className="dash-progress-fill" style={{ width: `${memberEngagementScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        );
      })()}


      {dashTab === 'trends' && (
        <div className="dash-overview-grid-2x2">
          {/* Monthly Printing Volume Trend */}
          <div className="dash-panel-v2">
            <div className="dash-panel-v2-header">
              <div>
                <p className="dash-panel-v2-title">Monthly Printing Volume Trend</p>
                <p className="dash-panel-v2-sub">Card production history over the last 12 months</p>
              </div>
              <div className="dash-panel-v2-icon">
                <BarChart3 size={15} strokeWidth={1.8} />
              </div>
            </div>
            <div className="dash-panel-v2-body">
              <div className="trend-chart-wrap">
                {monthlyPrintingTrend.length > 0 ? (
                  <div className="trend-bars">
                    {monthlyPrintingTrend.map(({ month, count }) => {
                      const maxCount = Math.max(...monthlyPrintingTrend.map(m => m.count), 1);
                      const barHeight = Math.max(4, Math.round((count / maxCount) * 100));
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
          </div>

          {/* Top Events */}
          <div className="dash-panel-v2">
            <div className="dash-panel-v2-header">
              <div>
                <p className="dash-panel-v2-title">Top Events</p>
                <p className="dash-panel-v2-sub">Most attended events & attendance rate</p>
              </div>
              <div className="dash-panel-v2-icon">
                <Award size={15} strokeWidth={1.8} />
              </div>
            </div>
            <div className="dash-panel-v2-body">
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
        </div>
      )}

      {dashTab === 'geography' && (
        <>
          {/* Geography KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon"><MapPin size={20} strokeWidth={1.5} /></div>
              <div className="kpi-body">
                <span className="kpi-label">Barangays</span>
                <span className="kpi-value">{geoDistributionData.length}</span>
                <span className="kpi-change up">Coverage areas</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><Users size={20} strokeWidth={1.5} /></div>
              <div className="kpi-body">
                <span className="kpi-label">Total Voters</span>
                <span className="kpi-value">{totalResidents.toLocaleString()}</span>
                <span className="kpi-change up">Official COMELEC</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><ClipboardList size={20} strokeWidth={1.5} /></div>
              <div className="kpi-body">
                <span className="kpi-label">EM Card Members</span>
                <span className="kpi-value">{totalApprovedMembers.toLocaleString()}</span>
                <span className="kpi-change up">{totalResidents > 0 ? ((totalApprovedMembers / totalResidents) * 100).toFixed(1) : 0}% total reach</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><TrendingUp size={20} strokeWidth={1.5} /></div>
              <div className="kpi-body">
                <span className="kpi-label">Aid Recipients</span>
                <span className="kpi-value">{aidByBarangay.reduce((sum, a) => sum + a.count, 0).toLocaleString()}</span>
                <span className="kpi-change up">Beneficiary services</span>
              </div>
            </div>
          </div>

          {/* Barangay Analytics 3-Column Grid */}
          <div className="dash-overview-grid-3">
            {/* Left: Voters by Barangay */}
            <div className="dash-panel-v2">
              <div className="dash-panel-v2-header">
                <div>
                  <p className="dash-panel-v2-title">Registered Voters</p>
                  <p className="dash-panel-v2-sub">{votersByBarangay.length} barangays · {totalResidents.toLocaleString()} total</p>
                </div>
                <div className="dash-panel-v2-icon">
                  <Users size={15} strokeWidth={1.8} />
                </div>
              </div>
              <div className="dash-panel-v2-body">
                {votersByBarangay.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {votersByBarangay.map(({ barangay, count }, idx) => {
                      const total = totalResidents || 1;
                      const pct = ((count / total) * 100).toFixed(1);
                      const maxCount = Math.max(...votersByBarangay.map(v => v.count), 1);
                      const relWidth = Math.max((count / maxCount) * 100, 1.5);
                      return (
                        <div key={barangay} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 6, borderBottom: idx < votersByBarangay.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{barangay}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{count.toLocaleString()}</span>
                              <span style={{ color: '#64748b', fontSize: '0.74rem', minWidth: 38, textAlign: 'right' }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="dash-progress-track" style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div className="dash-progress-fill" style={{ width: `${relWidth}%`, background: '#059669', height: '100%', borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '0.82rem' }}>No voter records found</div>
                )}
              </div>
            </div>

            {/* Middle: EM Card Members by Barangay */}
            <div className="dash-panel-v2">
              <div className="dash-panel-v2-header">
                <div>
                  <p className="dash-panel-v2-title">EM Card Members</p>
                  <p className="dash-panel-v2-sub">{regsByBarangay.length || votersByBarangay.length} barangays · % reach vs voters</p>
                </div>
                <div className="dash-panel-v2-icon">
                  <ClipboardList size={15} strokeWidth={1.8} />
                </div>
              </div>
              <div className="dash-panel-v2-body">
                {(regsByBarangay.length > 0 ? regsByBarangay : votersByBarangay.map(v => ({ barangay: v.barangay, count: 0 }))).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(regsByBarangay.length > 0 ? regsByBarangay : votersByBarangay.map(v => ({ barangay: v.barangay, count: 0 }))).map(({ barangay, count }, idx, arr) => {
                      const voterEntry = votersByBarangay.find(v => v.barangay === barangay);
                      const voterCount = voterEntry ? voterEntry.count : 0;
                      const pct = voterCount > 0 ? ((count / voterCount) * 100).toFixed(1) : '0.0';
                      const maxReg = Math.max(...regsByBarangay.map(r => r.count), 1);
                      const barWidth = Math.max((count / maxReg) * 100, 1.5);
                      return (
                        <div key={barangay} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 6, borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{barangay}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{count.toLocaleString()}</span>
                              <span style={{ color: '#64748b', fontSize: '0.74rem', minWidth: 38, textAlign: 'right' }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="dash-progress-track" style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div className="dash-progress-fill" style={{ width: `${barWidth}%`, background: '#059669', height: '100%', borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '0.82rem' }}>No member records found</div>
                )}
              </div>
            </div>

            {/* Right: Aid by Barangay */}
            <div className="dash-panel-v2">
              <div className="dash-panel-v2-header">
                <div>
                  <p className="dash-panel-v2-title">Aid Recipients</p>
                  <p className="dash-panel-v2-sub">{votersByBarangay.length} barangays · {aidByBarangay.reduce((sum, a) => sum + a.count, 0)} total</p>
                </div>
                <div className="dash-panel-v2-icon">
                  <TrendingUp size={15} strokeWidth={1.8} />
                </div>
              </div>
              <div className="dash-panel-v2-body">
                {(aidByBarangay.length > 0 ? aidByBarangay : votersByBarangay.map(v => ({ barangay: v.barangay, count: 0 }))).filter(a => a.count > 0).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(aidByBarangay.length > 0 ? aidByBarangay : votersByBarangay.map(v => ({ barangay: v.barangay, count: 0 }))).filter(a => a.count > 0).map(({ barangay, count }, idx, arr) => {
                      const voterEntry = votersByBarangay.find(v => v.barangay === barangay);
                      const voterCount = voterEntry ? voterEntry.count : 0;
                      const pct = voterCount > 0 ? ((count / voterCount) * 100).toFixed(1) : '0.0';
                      const maxAid = Math.max(...aidByBarangay.map(a => a.count), 1);
                      const barWidth = Math.max((count / maxAid) * 100, 1.5);
                      return (
                        <div key={barangay} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 6, borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{barangay}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{count.toLocaleString()}</span>
                              <span style={{ color: '#64748b', fontSize: '0.74rem', minWidth: 38, textAlign: 'right' }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="dash-progress-track" style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div className="dash-progress-fill" style={{ width: `${barWidth}%`, background: '#059669', height: '100%', borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <TrendingUp size={24} style={{ color: '#cbd5e1', margin: '0 auto 6px', display: 'block' }} />
                    <span style={{ fontWeight: 600, color: '#64748b', display: 'block' }}>No Aid Records</span>
                    <span>No beneficiary distributions logged for this area.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Geographic Distribution 2x2 Grid */}
          <div className="dash-overview-grid-2x2">
            {/* Highest & Lowest Registration Areas */}
            <div className="dash-panel-v2">
              <div className="dash-panel-v2-header">
                <div>
                  <p className="dash-panel-v2-title">Registration Coverage</p>
                  <p className="dash-panel-v2-sub">Highest vs Lowest coverage areas</p>
                </div>
                <div className="dash-panel-v2-icon">
                  <MapPin size={15} strokeWidth={1.8} />
                </div>
              </div>
              <div className="dash-panel-v2-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {highestRegistrationArea && (
                    <div className="dash-stat-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                      <div>
                        <div className="dash-stat-label">
                          <span className="dash-dot green" /> Highest Coverage
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>
                          {highestRegistrationArea.barangay}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {highestRegistrationArea.registered.toLocaleString()} of {highestRegistrationArea.totalResidents.toLocaleString()} registered
                        </div>
                      </div>
                      <span className="dash-eff-badge" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '4px 10px', background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}>
                        {highestRegistrationArea.registrationRate}%
                      </span>
                    </div>
                  )}

                  {lowestRegistrationArea && (
                    <div className="dash-stat-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                      <div>
                        <div className="dash-stat-label">
                          <span className="dash-dot muted" /> Lowest Coverage
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>
                          {lowestRegistrationArea.barangay}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {lowestRegistrationArea.registered.toLocaleString()} of {lowestRegistrationArea.totalResidents.toLocaleString()} registered
                        </div>
                      </div>
                      <span className="dash-eff-badge" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '4px 10px', background: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' }}>
                        {lowestRegistrationArea.registrationRate}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Underserved Communities */}
            <div className="dash-panel-v2">
              <div className="dash-panel-v2-header">
                <div>
                  <p className="dash-panel-v2-title">Underserved Communities</p>
                  <p className="dash-panel-v2-sub">Areas with under 30% registration coverage</p>
                </div>
                <div className="dash-panel-v2-icon">
                  <ShieldAlert size={15} strokeWidth={1.8} />
                </div>
              </div>
              <div className="dash-panel-v2-body">
                {underservedCommunities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {underservedCommunities.slice(0, 7).map((area, idx) => {
                      const maxTotal = Math.max(...underservedCommunities.map(a => a.totalResidents), 1);
                      const pct = Math.round((area.totalResidents / maxTotal) * 100);
                      return (
                        <div key={area.barangay} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 0', borderBottom: idx < 6 ? '1px solid #f8fafc' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', width: 16 }}>{idx + 1}</span>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{area.barangay}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ color: '#64748b' }}>{area.registered} registered</span>
                              <strong style={{ color: '#0f172a', minWidth: 32, textAlign: 'right' }}>{area.registrationRate}%</strong>
                            </div>
                          </div>
                          <div className="dash-progress-track" style={{ height: 4 }}>
                            <div className="dash-progress-fill" style={{ width: `${pct}%`, background: '#94a3b8' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 12px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    <CheckCircle size={28} style={{ color: '#059669', margin: '0 auto 8px', display: 'block' }} />
                    <strong style={{ color: '#0f172a', display: 'block', marginBottom: 2 }}>High Coverage Across All Barangays</strong>
                    <span>All barangays have registration coverage above 30%.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Geographic Heatmap */}
          {geoDistributionData.length > 0 && (
            <div className="dash-panel-v2" style={{ marginTop: 16 }}>
              <div className="dash-panel-v2-header">
                <div>
                  <p className="dash-panel-v2-title">Registration Rate Heatmap</p>
                  <p className="dash-panel-v2-sub">{geoDistributionData.length} barangays · Sorted by coverage</p>
                </div>
                <div className="dash-panel-v2-icon">
                  <Activity size={15} strokeWidth={1.8} />
                </div>
              </div>
              <div className="dash-panel-v2-body">
                <div className="geo-heatmap">
                  {geoDistributionData.map(({ barangay, registered, totalResidents, registrationRate }) => {
                    let bg = '#f8fafc';
                    let textCol = '#334155';
                    let borderCol = '#e2e8f0';
                    if (registrationRate >= 70) { bg = '#ecfdf5'; textCol = '#065f46'; borderCol = '#a7f3d0'; }
                    else if (registrationRate >= 50) { bg = '#f0fdf4'; textCol = '#166534'; borderCol = '#bbf7d0'; }
                    else if (registrationRate >= 30) { bg = '#fefce8'; textCol = '#854d0e'; borderCol = '#fef08a'; }
                    else { bg = '#f8fafc'; textCol = '#64748b'; borderCol = '#e2e8f0'; }

                    return (
                      <div key={barangay} className="geo-heatmap-cell" style={{ backgroundColor: bg, borderColor: borderCol, color: textCol }}>
                        <div className="geo-heatmap-name">{barangay}</div>
                        <div className="geo-heatmap-rate">{registrationRate}%</div>
                        <div className="geo-heatmap-count">{registered}/{totalResidents}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="geo-heatmap-legend">
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}></div>
                    <span>70%+ (High)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}></div>
                    <span>50-69% (Good)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a' }}></div>
                    <span>30-49% (Moderate)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}></div>
                    <span>&lt;30% (Low)</span>
                  </div>
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

      {dashTab === 'demographics' && (() => {
        const sectorColors = ['#059669', '#0d9488', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];
        const ageColors = ['#059669', '#10b981', '#34d399', '#0d9488', '#334155', '#475569', '#64748b', '#94a3b8'];
        const totalSectorMembers = sectorBreakdown.reduce((sum, s) => sum + s.count, 0);
        const totalAgeMembers = ageDistribution.reduce((sum, a) => sum + a.count, 0);

        return (
          <>
            {/* Demographics KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon"><Users size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">Total Members</span>
                  <span className="kpi-value">{totalSectorMembers.toLocaleString()}</span>
                  <span className="kpi-change up">Verified records</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Tag size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">Top Sector</span>
                  <span className="kpi-value">{sectorBreakdown[0]?.sector || '—'}</span>
                  <span className="kpi-change up">{sectorBreakdown[0]?.count || 0} members</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Cake size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">Dominant Age Group</span>
                  <span className="kpi-value">{ageDistribution[0]?.group ? `${ageDistribution[0].group} yrs` : '—'}</span>
                  <span className="kpi-change up">{ageDistribution[0]?.count || 0} members</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><PieChart size={20} strokeWidth={1.5} /></div>
                <div className="kpi-body">
                  <span className="kpi-label">Sectors Represented</span>
                  <span className="kpi-value">{sectorBreakdown.length}</span>
                  <span className="kpi-change up">Active categories</span>
                </div>
              </div>
            </div>

            {/* Demographic Breakdown 2x2 Grid */}
            <div className="dash-overview-grid-2x2">
              {/* Members by Sector */}
              <div className="dash-panel-v2">
                <div className="dash-panel-v2-header">
                  <div>
                    <p className="dash-panel-v2-title">Members by Sector</p>
                    <p className="dash-panel-v2-sub">Distribution across categories</p>
                  </div>
                  <div className="dash-panel-v2-icon">
                    <Tag size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="dash-panel-v2-body">
                  {sectorBreakdown.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Donut Chart */}
                      <div className="demo-donut-wrap" style={{ margin: '8px auto 4px' }}>
                        <svg viewBox="0 0 140 140" className="demo-donut-svg">
                          {sectorBreakdown.map((sector, idx) => {
                            const total = totalSectorMembers || 1;
                            const prev = sectorBreakdown.slice(0, idx).reduce((s, x) => s + x.count, 0);
                            const dash = (sector.count / total) * 339.292;
                            const offset = 339.292 - ((prev / total) * 339.292);
                            return (
                              <circle
                                key={sector.sector}
                                cx="70" cy="70" r="54"
                                fill="none"
                                stroke={sectorColors[idx % sectorColors.length]}
                                strokeWidth="16"
                                strokeDasharray={`${dash} ${339.292 - dash}`}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                transform="rotate(-90 70 70)"
                              />
                            );
                          })}
                        </svg>
                        <div className="demo-donut-center">
                          <span className="demo-donut-num" style={{ color: '#0f172a' }}>{totalSectorMembers}</span>
                          <span className="demo-donut-label">Members</span>
                        </div>
                      </div>

                      {/* Legend / Bars */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {sectorBreakdown.map((sector, idx) => {
                          const col = sectorColors[idx % sectorColors.length];
                          return (
                            <div key={sector.sector} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 6, borderBottom: idx < sectorBreakdown.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{sector.sector}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{sector.count}</span>
                                  <span style={{ color: '#64748b', fontSize: '0.74rem', minWidth: 36, textAlign: 'right' }}>{sector.percentage}%</span>
                                </div>
                              </div>
                              <div className="dash-progress-track" style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                <div className="dash-progress-fill" style={{ width: `${sector.percentage}%`, background: col, height: '100%', borderRadius: 3 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8', fontSize: '0.82rem' }}>
                      <Tag size={24} style={{ color: '#cbd5e1', margin: '0 auto 6px', display: 'block' }} />
                      <span style={{ fontWeight: 600, color: '#64748b', display: 'block' }}>No Sector Data</span>
                      <span>Sector records will appear once members are categorized.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Age Distribution */}
              <div className="dash-panel-v2">
                <div className="dash-panel-v2-header">
                  <div>
                    <p className="dash-panel-v2-title">Age Distribution</p>
                    <p className="dash-panel-v2-sub">Breakdown by age group</p>
                  </div>
                  <div className="dash-panel-v2-icon">
                    <Users size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="dash-panel-v2-body">
                  {ageDistribution.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Donut Chart */}
                      <div className="demo-donut-wrap" style={{ margin: '8px auto 4px' }}>
                        <svg viewBox="0 0 140 140" className="demo-donut-svg">
                          {ageDistribution.map((age, idx) => {
                            const total = totalAgeMembers || 1;
                            const prev = ageDistribution.slice(0, idx).reduce((s, x) => s + x.count, 0);
                            const dash = (age.count / total) * 339.292;
                            const offset = 339.292 - ((prev / total) * 339.292);
                            return (
                              <circle
                                key={age.group}
                                cx="70" cy="70" r="54"
                                fill="none"
                                stroke={ageColors[idx % ageColors.length]}
                                strokeWidth="16"
                                strokeDasharray={`${dash} ${339.292 - dash}`}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                transform="rotate(-90 70 70)"
                              />
                            );
                          })}
                        </svg>
                        <div className="demo-donut-center">
                          <span className="demo-donut-num" style={{ color: '#0f172a' }}>{totalAgeMembers}</span>
                          <span className="demo-donut-label">Members</span>
                        </div>
                      </div>

                      {/* Legend / Bars */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {ageDistribution.map((age, idx) => {
                          const col = ageColors[idx % ageColors.length];
                          return (
                            <div key={age.group} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 6, borderBottom: idx < ageDistribution.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{age.group} years</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{age.count}</span>
                                  <span style={{ color: '#64748b', fontSize: '0.74rem', minWidth: 36, textAlign: 'right' }}>{age.percentage}%</span>
                                </div>
                              </div>
                              <div className="dash-progress-track" style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                <div className="dash-progress-fill" style={{ width: `${age.percentage}%`, background: col, height: '100%', borderRadius: 3 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8', fontSize: '0.82rem' }}>
                      <Cake size={24} style={{ color: '#cbd5e1', margin: '0 auto 6px', display: 'block' }} />
                      <span style={{ fontWeight: 600, color: '#64748b', display: 'block' }}>No Age Data</span>
                      <span>Birthday information will appear once member birthdays are recorded.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {dashTab === 'network' && (
        <>
          {/* Network KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon"><Share2 size={20} strokeWidth={1.5} /></div>
              <div className="kpi-body">
                <span className="kpi-label">Success Rate</span>
                <span className="kpi-value">{referralSuccessRate}%</span>
                <span className="kpi-change up">Conversion rate</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><Users size={20} strokeWidth={1.5} /></div>
              <div className="kpi-body">
                <span className="kpi-label">Active Referrers</span>
                <span className="kpi-value">{topReferrers.length}</span>
                <span className="kpi-change up">Community advocates</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><UserCheck size={20} strokeWidth={1.5} /></div>
              <div className="kpi-body">
                <span className="kpi-label">Total Referred</span>
                <span className="kpi-value">{topReferrers.reduce((sum, r) => sum + r.totalReferred, 0).toLocaleString()}</span>
                <span className="kpi-change up">Network invites</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><CheckCircle size={20} strokeWidth={1.5} /></div>
              <div className="kpi-body">
                <span className="kpi-label">Approved Members</span>
                <span className="kpi-value">{topReferrers.reduce((sum, r) => sum + r.approved, 0).toLocaleString()}</span>
                <span className="kpi-change up">Verified referrals</span>
              </div>
            </div>
          </div>

          {/* Referral Network Analytics 2x2 Grid */}
          <div className="dash-overview-grid-2x2">
            {/* Referral Success Rate */}
            <div className="dash-panel-v2">
              <div className="dash-panel-v2-header">
                <div>
                  <p className="dash-panel-v2-title">Referral Success Rate</p>
                  <p className="dash-panel-v2-sub">Overall conversion rate</p>
                </div>
                <div className="dash-panel-v2-icon">
                  <Share2 size={15} strokeWidth={1.8} />
                </div>
              </div>
              <div className="dash-panel-v2-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="demo-donut-wrap" style={{ margin: '8px auto 4px' }}>
                    <svg viewBox="0 0 140 140" className="demo-donut-svg">
                      <circle cx="70" cy="70" r="54" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                      <circle
                        cx="70" cy="70" r="54" fill="none"
                        stroke="#059669" strokeWidth="16"
                        strokeDasharray={`${(referralSuccessRate / 100) * 339.292} ${339.292 - ((referralSuccessRate / 100) * 339.292)}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        transform="rotate(-90 70 70)"
                      />
                    </svg>
                    <div className="demo-donut-center">
                      <span className="demo-donut-num" style={{ color: '#0f172a' }}>{referralSuccessRate}%</span>
                      <span className="demo-donut-label">Approved</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="dash-stat-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                      <div className="dash-stat-label">
                        <span className="dash-dot green" /> Approved via referral
                      </div>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                        {topReferrers.reduce((sum, r) => sum + r.approved, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="dash-stat-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                      <div className="dash-stat-label">
                        <span className="dash-dot muted" /> Other approvals
                      </div>
                      <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.9rem' }}>
                        {Math.max(0, totalApprovedMembers - topReferrers.reduce((sum, r) => sum + r.approved, 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Leaders */}
            <div className="dash-panel-v2">
              <div className="dash-panel-v2-header">
                <div>
                  <p className="dash-panel-v2-title">Network Leaders</p>
                  <p className="dash-panel-v2-sub">Top referrers by volume</p>
                </div>
                <div className="dash-panel-v2-icon">
                  <Users size={15} strokeWidth={1.8} />
                </div>
              </div>
              <div className="dash-panel-v2-body">
                {topReferrers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topReferrers.map((referrer, idx) => {
                      const maxRef = Math.max(...topReferrers.map(r => r.totalReferred), 1);
                      const pct = Math.round((referrer.totalReferred / maxRef) * 100);
                      return (
                        <div key={referrer.name} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 6, borderBottom: idx < topReferrers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', width: 16 }}>{idx + 1}</span>
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{referrer.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{referrer.totalReferred}</span>
                              <span style={{ color: '#64748b', fontSize: '0.74rem', minWidth: 36, textAlign: 'right' }}>{referrer.successRate}%</span>
                            </div>
                          </div>
                          <div className="dash-progress-track" style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div className="dash-progress-fill" style={{ width: `${pct}%`, background: '#059669', height: '100%', borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <Users size={24} style={{ color: '#cbd5e1', margin: '0 auto 6px', display: 'block' }} />
                    <span style={{ fontWeight: 600, color: '#64748b', display: 'block' }}>No Referrer Data</span>
                    <span>Referral leaders will appear once members start referring others.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Network Growth Chart */}
          {networkGrowthData.length > 0 && (
            <div className="dash-panel-v2" style={{ marginTop: 16 }}>
              <div className="dash-panel-v2-header">
                <div>
                  <p className="dash-panel-v2-title">Network Growth Trend</p>
                  <p className="dash-panel-v2-sub">Referral registrations over time</p>
                </div>
                <div className="dash-panel-v2-icon">
                  <Activity size={15} strokeWidth={1.8} />
                </div>
              </div>
              <div className="dash-panel-v2-body">
                <div className="growth-chart-container">
                  <div className="growth-chart">
                    {networkGrowthData.map(({ month, count }) => {
                      const maxCount = Math.max(...networkGrowthData.map(d => d.count), 1);
                      const barHeight = (count / maxCount) * 100;
                      return (
                        <div key={month} className="growth-bar-item">
                          <div className="growth-bar-container">
                            <div className="growth-bar current" style={{ height: `${barHeight}%`, background: '#059669' }} />
                          </div>
                          <span className="growth-bar-label">{month}</span>
                          <span className="growth-bar-value">{count}</span>
                        </div>
                      );
                    })}
                  </div>
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
              <span className="pagination-info">Showing <strong>{startIndex + 1}–{endIndex}</strong> of <strong>{totalFiltered}</strong> residents</span>
              <div className="pagination-buttons">
                <button
                  className="page-btn page-btn-nav"
                  onClick={() => goToPage(1)}
                  disabled={safePage <= 1}
                  title="First Page (1)"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  className="page-btn page-btn-nav"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage <= 1}
                  title="Previous Page"
                >
                  <ChevronLeft size={14} /> <span>Prev</span>
                </button>
                {getPaginationItems(safePage, totalPages).map((item, idx) => {
                  if (item === '...') {
                    return <span key={`dots-${idx}`} className="pagination-ellipsis">…</span>;
                  }
                  return (
                    <button
                      key={item}
                      className={`page-btn ${item === safePage ? 'page-btn-active' : ''}`}
                      onClick={() => goToPage(item)}
                      title={`Page ${item}`}
                    >
                      {item}
                    </button>
                  );
                })}
                <button
                  className="page-btn page-btn-nav"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  title="Next Page"
                >
                  <span>Next</span> <ChevronRight size={14} />
                </button>
                <button
                  className="page-btn page-btn-nav"
                  onClick={() => goToPage(totalPages)}
                  disabled={safePage >= totalPages}
                  title={`Last Page (${totalPages})`}
                >
                  <ChevronsRight size={14} />
                </button>
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
    const rejectedCount = allRegs.filter(r => r.status === 'Rejected').length;

    // Duplicate detection: key = name + barangay + contact
    const dupMap = new Map();
    allRegs.forEach(reg => {
      const key = `${getResidentName(reg)}|${reg.barangay || ''}|${reg.contact || ''}`;
      dupMap.set(key, (dupMap.get(key) || 0) + 1);
    });
    const dupKeys = new Set([...dupMap.entries()].filter(([, count]) => count > 1).map(([k]) => k));
    const dupCount = allRegs.filter(reg => dupKeys.has(`${getResidentName(reg)}|${reg.barangay || ''}|${reg.contact || ''}`)).length;

    let filteredRegs = allRegs.filter(r => r.status === regStatusFilter);

    // Filter by Barangay
    if (regFilterBarangay) {
      filteredRegs = filteredRegs.filter(r => (r.barangay || '').toLowerCase() === regFilterBarangay.toLowerCase());
    }

    // Filter by Sector
    if (regFilterSector) {
      filteredRegs = filteredRegs.filter(r => (r.sector_category || '').toLowerCase() === regFilterSector.toLowerCase());
    }

    // Registration search
    const regQuery = regSearch.trim().toLowerCase();
    if (regQuery) {
      filteredRegs = filteredRegs.filter(reg => {
        const name = getResidentName(reg).toLowerCase();
        const barangay = (reg.barangay || '').toLowerCase();
        const contact = (reg.contact || '').toLowerCase();
        const refNo = (reg.reference_no || '').toLowerCase();
        const refNode = (reg.referral_name || '').toLowerCase();
        return name.includes(regQuery) || barangay.includes(regQuery) || contact.includes(regQuery) || refNo.includes(regQuery) || refNode.includes(regQuery);
      });
    }

    // Unique barangays & sectors for filters
    const regBarangays = Array.from(new Set(allRegs.map(r => r.barangay).filter(Boolean))).sort();
    const regSectors = Array.from(new Set(allRegs.map(r => r.sector_category).filter(Boolean))).sort();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header & Subtabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 4 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Registration Requests</h2>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                {allRegs.length} Total Applications
              </span>
              {dupCount > 0 && (
                <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                  {dupCount} Duplicate Flagged
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Review, verify referral nodes, and approve incoming citizen applications.
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="dashboard-tabs" style={{ margin: 0 }}>
            <button
              className={`dashboard-tab-btn ${regStatusFilter === 'Pending' ? 'active' : ''}`}
              onClick={() => setRegStatusFilter('Pending')}
            >
              <UserCheck size={14} strokeWidth={1.8} />
              <span>Pending</span>
              <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 999, fontSize: '0.72rem', background: regStatusFilter === 'Pending' ? '#ecfdf5' : '#f1f5f9', color: regStatusFilter === 'Pending' ? '#065f46' : '#64748b', fontWeight: 700 }}>
                {pendingCount}
              </span>
            </button>
            <button
              className={`dashboard-tab-btn ${regStatusFilter === 'Rejected' ? 'active' : ''}`}
              onClick={() => setRegStatusFilter('Rejected')}
            >
              <XCircle size={14} strokeWidth={1.8} />
              <span>Rejected</span>
              <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 999, fontSize: '0.72rem', background: regStatusFilter === 'Rejected' ? '#fee2e2' : '#f1f5f9', color: regStatusFilter === 'Rejected' ? '#991b1b' : '#64748b', fontWeight: 700 }}>
                {rejectedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Action Bar / Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: '#ffffff', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 320px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by name, barangay, referral, or contact..."
                value={regSearch}
                onChange={(e) => setRegSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.84rem', outline: 'none', background: '#ffffff', color: '#0f172a' }}
              />
            </div>
            <select
              value={regFilterBarangay}
              onChange={(e) => setRegFilterBarangay(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff', color: '#334155', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Barangays</option>
              {regBarangays.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              value={regFilterSector}
              onChange={(e) => setRegFilterSector(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff', color: '#334155', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">All Sectors</option>
              {regSectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(regSearch || regFilterBarangay || regFilterSector) && (
              <button
                onClick={() => { setRegSearch(''); setRegFilterBarangay(''); setRegFilterSector(''); }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', padding: '4px 6px' }}
              >
                Clear Filters
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => downloadRegistrationsCSV(filteredRegs)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', fontWeight: 600, color: '#334155', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Main Panel & Table */}
        <div className="dash-panel-v2" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap" style={{ margin: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>Photo</th>
                  <th>Applicant Name</th>
                  <th>Residency</th>
                  <th>Barangay & Purok</th>
                  <th>Sector</th>
                  <th>Referral Node</th>
                  <th>Contact</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {regsLoading ? (
                  <tr><td colSpan={10} className="table-loading" style={{ padding: '40px 0', textAlign: 'center' }}>Loading registrations...</td></tr>
                ) : filteredRegs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-empty" style={{ padding: '48px 0', textAlign: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#64748b' }}>
                        <UserCheck size={18} />
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>
                        {regSearch || regFilterBarangay || regFilterSector ? 'No registrations match the selected filters.' : `No ${regStatusFilter.toLowerCase()} applications found.`}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRegs.map(reg => {
                    const isDup = dupKeys.has(`${getResidentName(reg)}|${reg.barangay || ''}|${reg.contact || ''}`);
                    return (
                      <tr
                        key={reg.id}
                        className="reg-row-clickable"
                        onClick={() => setSelectedRegDetail(reg)}
                        style={{ cursor: 'pointer', background: isDup ? '#fffbeb' : undefined }}
                      >
                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 8px' }}>
                          {(reg.photo_url || reg.photo_base64) ? (
                            <img
                              src={reg.photo_url || reg.photo_base64}
                              alt=""
                              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0', display: 'inline-block', verticalAlign: 'middle' }}
                            />
                          ) : (
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', border: '1.5px solid #e2e8f0' }}>
                              👤
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <strong style={{ color: '#0f172a', fontSize: '0.86rem' }}>{getResidentName(reg)}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {reg.reference_no && <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>Ref: {reg.reference_no}</span>}
                              {isDup && (
                                <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                                  DUPLICATE
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {reg.is_valid_resident !== false ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 700, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                              ✓ Registered Voter
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                              Non-Valid Resident
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 600 }}>{reg.barangay || '-'}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{reg.purok ? `Purok ${reg.purok}` : (reg.house_no || '-')}</div>
                        </td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 600, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' }}>
                            {reg.sector_category || '-'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: reg.referral_name ? '#0f172a' : '#94a3b8', fontWeight: reg.referral_name ? 600 : 400 }}>
                            {reg.referral_name || 'No referral node'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: '#0f172a', fontFamily: 'monospace' }}>
                            {reg.contact || '-'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            {new Date(reg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${(reg.status || 'pending').toLowerCase()}`}>
                            {reg.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                            {reg.status === 'Pending' && (
                              <>
                                <button
                                  className="action-btn"
                                  onClick={() => approveRegistration(reg.id)}
                                  title="Approve registration"
                                  style={{ color: '#059669', background: '#ecfdf5', borderColor: '#a7f3d0' }}
                                >
                                  ✓
                                </button>
                                <button
                                  className="action-btn action-delete"
                                  onClick={() => rejectRegistration(reg.id)}
                                  title="Reject registration"
                                  style={{ color: '#e11d48', background: '#fff1f2', borderColor: '#fecdd3' }}
                                >
                                  ✕
                                </button>
                              </>
                            )}
                            {reg.status === 'Rejected' && (
                              <button
                                className="action-btn"
                                onClick={() => approveRegistration(reg.id)}
                                title="Re-approve registration"
                                style={{ color: '#059669', background: '#ecfdf5', borderColor: '#a7f3d0' }}
                              >
                                ↻
                              </button>
                            )}
                            <button
                              className="action-btn action-delete"
                              onClick={() => { setDeleteRegId(reg.id); setDeleteRegName(getResidentName(reg)); setShowDeleteRegModal(true); }}
                              title="Delete application"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
        // Use ValidResidents fields if available, otherwise fall back to registration fields
        const firstName = r.first_name || reg.first_name || '';
        const middleName = r.middle_name || reg.middle_name || '';
        const lastName = r.last_name || reg.last_name || '';
        const suffix = r.suffix || reg.suffix || '';
        const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim().toLowerCase();
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
    if (filterOrganization) {
      members = members.filter(reg => (reg.organization || '').toLowerCase() === filterOrganization.toLowerCase());
    }
    if (filterPrinted) {
      members = members.filter(reg => {
        const isPrinted = !!reg.printed_at;
        return filterPrinted === 'printed' ? isPrinted : !isPrinted;
      });
    }
    if (filterVoterSource) {
      members = members.filter(reg => {
        const isVoter = reg.is_valid_resident === true;
        return filterVoterSource === 'voter' ? isVoter : !isVoter;
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
      const firstName = reg.first_name || r.first_name || '';
      const middleName = reg.middle_name || r.middle_name || '';
      const lastName = reg.last_name || r.last_name || '';
      const suffix = reg.suffix || r.suffix || '';
      return `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim();
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
    const orgOptions = organizations.map(o => o.name);

    return (
      <div className="admin-panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3>Approved Members</h3>
            {selectedMemberIds.length > 0 && (
              <span className="panel-badge" style={{ background: '#10b981', color: '#fff' }}>
                {selectedMemberIds.length} SELECTED
              </span>
            )}
          </div>
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

        {/* Search + Filters + Download Toolbar */}
        <div className="members-toolbar">
          <div className="members-toolbar-top">
            <div className="members-search-wrap">
              <input
                type="text"
                placeholder="Search by name, EM card no, or precinct..."
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setMembersPage(1); }}
                className="members-search-input"
              />
              {memberSearch && (
                <button 
                  className="members-search-clear" 
                  onClick={() => { setMemberSearch(''); setMembersPage(1); }} 
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="members-toolbar-actions">
              <button className="btn btn-scan-start" onClick={() => { setScanQrMember({ open: true }); setScanQrToken(''); setScanQrResult(null); }}>
                <ScanLine size={14} /> Scan ID
              </button>
              <button 
                className="btn btn-action-outline" 
                onClick={() => {
                  const membersToExport = selectedMemberIds.length > 0 
                    ? members.filter(m => selectedMemberIds.includes(m.id))
                    : members;
                  downloadMembersExcel(membersToExport);
                }}
                title={selectedMemberIds.length > 0 ? `Export ${selectedMemberIds.length} selected members` : 'Export all members'}
              >
                <Download size={14} /> {selectedMemberIds.length > 0 ? `Export Selected (${selectedMemberIds.length})` : 'Export Excel'}
              </button>
            </div>
          </div>

          <div className="members-toolbar-filters">
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 2 }}>
              <Filter size={12} /> Filters:
            </span>
            <select
              className="members-filter-select"
              value={filterBarangay}
              onChange={(e) => { setFilterBarangay(e.target.value); setMembersPage(1); }}
            >
              <option value="">All Barangays</option>
              {barangayOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              className="members-filter-select"
              value={filterPurok}
              onChange={(e) => { setFilterPurok(e.target.value); setMembersPage(1); }}
            >
              <option value="">All Puroks</option>
              {purokOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              className="members-filter-select"
              value={filterSector}
              onChange={(e) => { setFilterSector(e.target.value); setMembersPage(1); }}
            >
              <option value="">All Sectors</option>
              {sectorOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              className="members-filter-select"
              value={filterOrganization}
              onChange={(e) => { setFilterOrganization(e.target.value); setMembersPage(1); }}
            >
              <option value="">All Organizations</option>
              {orgOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select
              className="members-filter-select"
              value={filterPrinted}
              onChange={(e) => { setFilterPrinted(e.target.value); setMembersPage(1); }}
            >
              <option value="">All Print Status</option>
              <option value="printed">Printed</option>
              <option value="not-printed">Not Printed</option>
            </select>
            <select
              className="members-filter-select"
              value={filterVoterSource}
              onChange={(e) => { setFilterVoterSource(e.target.value); setMembersPage(1); }}
            >
              <option value="">All Sources</option>
              <option value="voter">Registered Voter</option>
              <option value="non-voter">Non-registered Voter</option>
            </select>
            {(memberSearch || filterBarangay || filterPurok || filterSector || filterPrinted || filterVoterSource) && (
              <button 
                className="members-filter-reset" 
                onClick={() => {
                  setMemberSearch('');
                  setFilterBarangay('');
                  setFilterPurok('');
                  setFilterSector('');
                  setFilterOrganization('');
                  setFilterPrinted('');
                  setFilterVoterSource('');
                  setMembersPage(1);
                }} 
                title="Reset all filters"
              >
                <RotateCw size={11} /> Reset
              </button>
            )}
          </div>
        </div>

        {regsLoading ? (
          <div className="table-loading">Loading members...</div>
        ) : totalFiltered === 0 ? (
          <div className="table-empty">{memberSearch ? 'No members match your search.' : 'No approved members yet.'}</div>
        ) : membersTab === 'all' ? (
          <>
            <div className="members-table-wrap">
              <div className="members-table-container">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th className="col-chk">
                        <input
                          type="checkbox"
                          checked={selectedMemberIds.length === pageMembers.length && pageMembers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMemberIds(pageMembers.map(m => m.id));
                            } else {
                              setSelectedMemberIds([]);
                            }
                          }}
                          title="Select all on this page"
                        />
                      </th>
                      <th className="col-name">Name</th>
                      <th className="col-barangay">Barangay</th>
                      <th className="col-voter">Voter Status</th>
                      <th className="col-precinct">Precinct</th>
                      <th className="col-org">Organization</th>
                      <th className="col-emcard">EM Card No</th>
                      <th className="col-print">Print</th>
                      <th className="col-date">Date</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageMembers.map((reg) => {
                      const r = reg.ValidResidents || {};
                      const name = memberFullName(reg);
                      const isSelected = selectedMemberIds.includes(reg.id);
                      const precinct = r.precinct || reg.precinct;
                      return (
                        <tr 
                          key={reg.id} 
                          className="member-row-clickable" 
                          style={{ background: isSelected ? 'rgba(16, 185, 129, 0.08)' : undefined }}
                        >
                          <td className="col-chk" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMemberIds(prev => [...prev, reg.id]);
                                } else {
                                  setSelectedMemberIds(prev => prev.filter(id => id !== reg.id));
                                }
                              }}
                            />
                          </td>
                          <td className="col-name member-cell-name" onClick={() => setSelectedMember(reg)} title={name}>
                            <strong>{name}</strong>
                          </td>
                          <td className="col-barangay member-cell-barangay" onClick={() => setSelectedMember(reg)}>
                            {reg.barangay || r.barangay || '-'}
                          </td>
                          <td className="col-voter member-cell-voter" onClick={() => setSelectedMember(reg)}>
                            {reg.is_valid_resident ? (
                              <span className="status-badge status-approved">Registered</span>
                            ) : (
                              <span className="status-badge status-pending">Non-registered</span>
                            )}
                          </td>
                          <td className="col-precinct member-cell-precinct" onClick={() => setSelectedMember(reg)}>
                            {precinct ? (
                              <span className="member-precinct-tag">
                                {precinct}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 11 }}>-</span>
                            )}
                          </td>
                          <td className="col-org member-cell-org" onClick={() => setSelectedMember(reg)}>
                            {reg.organization ? <span className="member-org-tag" style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#475569' }}>{reg.organization}</span> : <span style={{ color: '#94a3b8', fontSize: 11 }}>-</span>}
                          </td>
                          <td className="col-emcard member-cell-emcard" onClick={() => setSelectedMember(reg)}>
                            {reg.em_card_no ? (
                              <code className="member-emcard-code">{reg.em_card_no}</code>
                            ) : (
                              <span className="qr-token-missing" style={{ fontSize: 9.5 }}>Needs QR</span>
                            )}
                          </td>
                          <td className="col-print member-cell-print" onClick={() => setSelectedMember(reg)}>
                            {reg.printed_at ? (
                              <span className="print-status printed" title={`Printed on ${new Date(reg.printed_at).toLocaleDateString()}`}>
                                <Printer size={10} /> Printed
                              </span>
                            ) : (
                              <span className="print-status not-printed">Unprinted</span>
                            )}
                          </td>
                          <td className="col-date member-cell-date" onClick={() => setSelectedMember(reg)}>
                            {new Date(reg.created_at).toLocaleDateString()}
                          </td>
                          <td className="col-actions member-cell-actions">
                            <div className="resident-actions-compact">
                              {!reg.is_valid_resident && (
                                <button className="action-btn action-promote" onClick={(e) => { e.stopPropagation(); setPromoteReg(reg); setShowPromoteModal(true); }} title="Move to Registered Voters">
                                  <ArrowRight size={11} />
                                </button>
                              )}
                              <button className="action-btn action-edit" onClick={(e) => { e.stopPropagation(); setSelectedMember(reg); openEditMember(reg); }} title="Edit member">
                                <Pencil size={11} />
                              </button>
                              <button className="action-btn action-delete" onClick={(e) => { e.stopPropagation(); setDeleteMemberId(reg.id); setDeleteMemberName(name); setShowDeleteMemberModal(true); }} title="Delete member">
                                <Trash2 size={11} />
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
                <div className="residents-pagination">
                  <span className="pagination-info">
                    Showing <strong>{startIndex + 1}–{Math.min(startIndex + membersPerPage, totalFiltered)}</strong> of <strong>{totalFiltered}</strong> members
                  </span>
                  <div className="pagination-buttons">
                    <button
                      className="page-btn page-btn-nav"
                      onClick={() => goToPage(1)}
                      disabled={safePage <= 1}
                      title="First Page (1)"
                    >
                      <ChevronsLeft size={14} />
                    </button>
                    <button
                      className="page-btn page-btn-nav"
                      onClick={() => goToPage(safePage - 1)}
                      disabled={safePage <= 1}
                      title="Previous Page"
                    >
                      <ChevronLeft size={14} /> <span>Prev</span>
                    </button>
                    {getPaginationItems(safePage, totalPages).map((item, idx) => {
                      if (item === '...') {
                        return <span key={`dots-${idx}`} className="pagination-ellipsis">…</span>;
                      }
                      return (
                        <button
                          key={item}
                          className={`page-btn ${item === safePage ? 'page-btn-active' : ''}`}
                          onClick={() => goToPage(item)}
                          title={`Page ${item}`}
                        >
                          {item}
                        </button>
                      );
                    })}
                    <button
                      className="page-btn page-btn-nav"
                      onClick={() => goToPage(safePage + 1)}
                      disabled={safePage >= totalPages}
                      title="Next Page"
                    >
                      <span>Next</span> <ChevronRight size={14} />
                    </button>
                    <button
                      className="page-btn page-btn-nav"
                      onClick={() => goToPage(totalPages)}
                      disabled={safePage >= totalPages}
                      title={`Last Page (${totalPages})`}
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                    const r = reg.ValidResidents || {};
                    const name = memberFullName(reg);
                    const precinct = r.precinct || reg.precinct;
                    return (
                      <div key={reg.id} className="household-member-row" onClick={() => setSelectedMember(reg)}>
                        <span className="household-member-name">
                          {name}
                          {reg.is_valid_resident && precinct && (
                            <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600, marginLeft: 6 }}>
                              (Precinct {precinct})
                            </span>
                          )}
                        </span>
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

  const downloadMembersExcel = (members) => {
    const headers = ['FULL NAME', 'FULL ADDRESS', 'VOTER STATUS', 'PRECINCT', 'CONTACT NUMBER', 'BIRTHDAY', 'DATE ISSUED', 'QR CODE', 'EM NUMBER'];
    const rows = members.map(reg => {
      const r = reg.ValidResidents || {};
      const firstName = reg.first_name || r.first_name || '';
      const middleName = reg.middle_name || r.middle_name || '';
      const lastName = reg.last_name || r.last_name || '';
      const suffix = reg.suffix || r.suffix || '';
      const fullName = `${lastName}${suffix ? ' ' + suffix : ''}, ${firstName}${middleName ? ' ' + middleName : ''}`.trim();

      const houseNo = reg.house_no || '';
      const purok = reg.purok || '';
      const lot = reg.lot || '';
      const block = reg.block || '';
      const phase = reg.phase || '';
      const barangay = reg.barangay || r.barangay || '';

      const purokLabel = purok ? (SUBDIVISION_PUROKS.includes(purok) ? purok.toUpperCase() : `PUROK ${purok}`) : '';
      const lotBlockPhase = SUBDIVISION_PUROKS.includes(purok) ? `Lot ${lot} Block ${block} Phase ${phase}` : '';
      const barangayUpper = barangay ? `${barangay.toUpperCase()}, ` : '';
      const fullAddress = SUBDIVISION_PUROKS.includes(purok)
        ? `${lotBlockPhase ? `${lotBlockPhase}, ` : ''}${purokLabel ? `${purokLabel}, ` : ''}${barangayUpper}BALAGTAS, BULACAN`
        : `${houseNo ? `#${houseNo} ` : ''}${purokLabel ? `${purokLabel}, ` : ''}${barangayUpper}BALAGTAS, BULACAN`;

      const birthday = reg.birthday || '';
      const dateIssued = reg.created_at ? new Date(reg.created_at).toLocaleDateString() : '';

      return [
        fullName,
        fullAddress,
        reg.is_valid_resident ? 'Registered Voter' : 'Non-registered',
        (r.precinct || reg.precinct) || '',
        reg.contact || '',
        birthday,
        dateIssued,
        reg.qr_token ? `https://www.em-card.com/card/${reg.qr_token}` : '',
        reg.em_card_no || '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, `members_export_${new Date().toISOString().slice(0,10)}.xlsx`);
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
    // Only use approved members for the referral network
    const approvedRegs = allRegs.filter(r => r.status === 'Approved');

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

    const monthRegs = approvedRegs.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === filterMonth - 1 && d.getFullYear() === filterYear;
    });
    const weekRegs = approvedRegs.filter(r => {
      const d = new Date(r.created_at);
      return d >= startOfWeek && d <= endOfWeek;
    });

    const allTimeLeaders = computeLeadersFromRegs(approvedRegs);
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

    // For the tree forest, use only approved members
    const allTimeMap = new Map();
    approvedRegs.forEach(reg => {
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
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{approvedRegs.length}</div>
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
                const matches = approvedRegs.filter(r => getResidentName(r).toLowerCase().includes(q.toLowerCase()));
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
              : approvedRegs.length === 0 ? <div className="table-empty">No approved members yet to build network.</div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Messages Header & Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Messages</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Broadcast SMS notifications, automated birthday greetings, and citizen inquiries.
            </p>
          </div>

          {/* Messages Sub-tabs */}
          <div className="dashboard-tabs" style={{ margin: 0 }}>
            {[
              { id: 'compose', label: 'Compose', icon: <Pencil size={14} strokeWidth={1.8} /> },
              { id: 'birthday', label: 'Birthdays', icon: <Cake size={14} strokeWidth={1.8} /> },
              { id: 'inquiries', label: 'Inquiries', icon: <Inbox size={14} strokeWidth={1.8} /> },
              { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={14} strokeWidth={1.8} /> },
              { id: 'history', label: 'History', icon: <History size={14} strokeWidth={1.8} /> },
            ].map(tab => (
              <button
                key={tab.id}
                className={`dashboard-tab-btn ${msgTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setMsgTab(tab.id);
                  if (tab.id === 'inquiries') fetchContactInquiries();
                  if (tab.id === 'feedback') fetchGrievances();
                  if (tab.id === 'history') fetchMessages();
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SMS Provider Status Banner */}
        {smsProvider && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.82rem', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`sms-provider-dot ${smsProvider.configured ? 'ok' : 'warn'}`} style={{ width: 8, height: 8, borderRadius: '50%', background: smsProvider.configured ? '#059669' : '#f59e0b', flexShrink: 0 }} />
              <span style={{ color: '#0f172a', fontWeight: 600 }}>
                {smsProvider.configured ? `Gateway: ${smsProvider.provider?.toUpperCase()} Active` : 'SMS Gateway Not Configured'}
              </span>
              {smsProvider.senderName && (
                <span style={{ color: '#64748b' }}>· Sender ID: <strong style={{ color: '#0f172a' }}>{smsProvider.senderName}</strong></span>
              )}
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: smsProvider.configured ? '#ecfdf5' : '#fef3c7', color: smsProvider.configured ? '#065f46' : '#92400e', border: smsProvider.configured ? '1px solid #a7f3d0' : '1px solid #fde68a' }}>
              {smsProvider.configured ? 'Online & Ready' : 'Config Required'}
            </span>
          </div>
        )}

        {msgTab === 'compose' && (
          <form onSubmit={handleSendMessage}>
            <div className="dash-overview-grid-2x2" style={{ alignItems: 'flex-start' }}>
              {/* Left Column: Compose Editor */}
              <div className="dash-panel-v2">
                <div className="dash-panel-v2-header">
                  <div>
                    <p className="dash-panel-v2-title">Compose SMS Broadcast</p>
                    <p className="dash-panel-v2-sub">Configure target recipients and message text</p>
                  </div>
                  <div className="dash-panel-v2-icon">
                    <Pencil size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="dash-panel-v2-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Title / Subject */}
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

                    {/* Target Audience */}
                    <div className="msg-form-row">
                      <label className="msg-label">Target Audience</label>
                      <div className="msg-target-row">
                        <select
                          className="msg-select"
                          value={msgForm.targetType}
                          onChange={e => { const type = e.target.value; setMsgForm(f => ({ ...f, targetType: type, targetValue: '' })); if (type === 'all') calculateRecipientPreview(type, ''); }}
                        >
                          <option value="all">All Registered Members</option>
                          <option value="sector">By Sector / Organization</option>
                          <option value="barangay">By Barangay</option>
                          <option value="leader">By Referral Leader</option>
                          <option value="specific">Specific User</option>
                          <option value="test">Test: Send to me only</option>
                        </select>
                        {msgForm.targetType === 'sector' && (
                          <select className="msg-select" value={msgForm.targetValue} onChange={e => { const val = e.target.value; setMsgForm(f => ({ ...f, targetValue: val })); calculateRecipientPreview('sector', val); }}>
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
                          <select className="msg-select" value={msgForm.targetValue} onChange={e => { const val = e.target.value; setMsgForm(f => ({ ...f, targetValue: val })); calculateRecipientPreview('barangay', val); }}>
                            <option value="">Select Barangay...</option>
                            {allBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        )}
                        {msgForm.targetType === 'leader' && (
                          <input type="text" className="msg-input" placeholder="Enter leader name..." value={msgForm.targetValue} onChange={e => { const val = e.target.value; setMsgForm(f => ({ ...f, targetValue: val })); if (val.length > 2) calculateRecipientPreview('leader', val); }} />
                        )}
                        {msgForm.targetType === 'specific' && (
                          <div className="msg-user-search-wrap">
                            <input
                              type="text"
                              className="msg-input"
                              placeholder="Search by name or EM card no..."
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
                                        calculateRecipientPreview('specific', reg.id);
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
                          <input type="tel" className="msg-input" placeholder="Your phone number (e.g. 09171234567)" value={msgForm.targetValue} onChange={e => { const val = e.target.value; setMsgForm(f => ({ ...f, targetValue: val })); calculateRecipientPreview('test', val); }} maxLength={11} />
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="msg-form-row">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="msg-label" style={{ margin: 0 }}>Message Body</label>
                        <span className="msg-char-count" style={{ margin: 0 }}>
                          {msgForm.body.length}/160 chars · {Math.ceil(msgForm.body.length / 160) || 1} Credit/SMS
                        </span>
                      </div>
                      <textarea
                        className="msg-textarea"
                        placeholder="Type your SMS message here..."
                        value={msgForm.body}
                        onChange={e => setMsgForm(f => ({ ...f, body: e.target.value }))}
                        maxLength={480}
                        rows={6}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Mobile Simulation & Campaign Summary */}
              <div className="dash-panel-v2">
                <div className="dash-panel-v2-header">
                  <div>
                    <p className="dash-panel-v2-title">Live SMS Preview</p>
                    <p className="dash-panel-v2-sub">Handset simulation and campaign totals</p>
                  </div>
                  <div className="dash-panel-v2-icon">
                    <Send size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="dash-panel-v2-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Phone Preview Mockup */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 14px', position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>EMcard (SMS)</span>
                        <span>Today</span>
                      </div>
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px 12px 12px 2px', padding: '12px 14px', color: '#065f46', fontSize: '0.84rem', lineHeight: 1.45, wordBreak: 'break-word', minHeight: 70 }}>
                        {msgForm.body || 'Type your message on the left to see live preview...'}
                      </div>
                    </div>

                    {/* Campaign Summary Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="dash-stat-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                        <div className="dash-stat-label">
                          <span className="dash-dot green" /> Estimated Recipients
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                          {msgRecipientPreview.loading ? 'Calculating...' : msgRecipientPreview.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="dash-stat-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                        <div className="dash-stat-label">
                          <span className="dash-dot muted" /> Total Credits Required
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                          {msgRecipientPreview.loading ? '-' : (msgRecipientPreview.count * (Math.ceil(msgForm.body.length / 160) || 1)).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn btn-msg-send"
                      style={{ width: '100%', padding: '12px 20px', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', background: '#059669', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      disabled={msgSending || !msgForm.body.trim() || msgRecipientPreview.count === 0}
                    >
                      {msgSending ? (
                        <span className="btn-sending-content">
                          <span className="sending-spinner"></span>
                          {sendProgress.message || 'Sending Broadcast...'}
                        </span>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Send SMS{msgRecipientPreview.count > 0 ? ` (${msgRecipientPreview.count.toLocaleString()})` : ''}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Overlay */}
            {msgSending && (
              <div className="msg-sending-overlay">
                <div className="msg-progress-card">
                  <div className="msg-progress-header">
                    <span className="msg-progress-icon">
                      {sendProgress.stage === 'complete' ? '✓' : sendProgress.stage === 'error' ? '✗' : '⏳'}
                    </span>
                    <h4>Sending SMS Campaign</h4>
                  </div>
                  <div className="msg-progress-bar-wrap">
                    <div 
                      className="msg-progress-bar" 
                      style={{ width: `${sendProgress.percent}%`, backgroundColor: sendProgress.stage === 'error' ? '#ef4444' : sendProgress.stage === 'complete' ? '#10b981' : '#059669' }}
                    ></div>
                  </div>
                  <p className="msg-progress-message">{sendProgress.message}</p>
                  <div className="msg-progress-steps">
                    <div className={`msg-step ${['preparing', 'sending', 'finalizing', 'complete'].includes(sendProgress.stage) ? 'active' : ''} ${sendProgress.stage === 'preparing' ? 'current' : ''}`}>
                      <span className="msg-step-dot">1</span>
                      <span className="msg-step-label">Prepare</span>
                    </div>
                    <div className="msg-step-connector"></div>
                    <div className={`msg-step ${['sending', 'finalizing', 'complete'].includes(sendProgress.stage) ? 'active' : ''} ${sendProgress.stage === 'sending' ? 'current' : ''}`}>
                      <span className="msg-step-dot">2</span>
                      <span className="msg-step-label">Send</span>
                    </div>
                    <div className="msg-step-connector"></div>
                    <div className={`msg-step ${['finalizing', 'complete'].includes(sendProgress.stage) ? 'active' : ''} ${sendProgress.stage === 'finalizing' ? 'current' : ''}`}>
                      <span className="msg-step-dot">3</span>
                      <span className="msg-step-label">Finalize</span>
                    </div>
                    <div className="msg-step-connector"></div>
                    <div className={`msg-step ${sendProgress.stage === 'complete' ? 'active' : ''} ${sendProgress.stage === 'complete' ? 'current' : ''}`}>
                      <span className="msg-step-dot">4</span>
                      <span className="msg-step-label">Done</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}

        {msgTab === 'birthday' && (
          <div className="dash-panel-v2">
            <div className="dash-panel-v2-header">
              <div>
                <p className="dash-panel-v2-title">Today's Birthday Celebrators</p>
                <p className="dash-panel-v2-sub">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="dash-panel-v2-icon">
                <Cake size={15} strokeWidth={1.8} />
              </div>
            </div>
            <div className="dash-panel-v2-body">
              {birthdayLoading ? (
                <div className="table-loading" style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>Loading birthday celebrators...</div>
              ) : birthdayRecipients.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: 12 }}>
                    <Cake size={20} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>No birthday celebrators today</p>
                  <p style={{ margin: '4px 0 16px', color: '#64748b', fontSize: '0.82rem' }}>Registered members with birthdays today will show up here.</p>
                  <button className="btn btn-sm btn-secondary" onClick={fetchBirthdayCelebrators} style={{ padding: '6px 14px', borderRadius: 6, fontSize: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', cursor: 'pointer', fontWeight: 600 }}>Refresh</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                    {birthdayRecipients.map(reg => {
                      const name = getResidentName(reg);
                      return (
                        <div key={reg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Cake size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>{reg.barangay || '-'} · {reg.contact || 'No phone'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label className="msg-label" style={{ margin: 0 }}>Birthday Message</label>
                      <span className="msg-char-count" style={{ margin: 0 }}>
                        {birthdayMessage.length}/160 chars · {Math.ceil(birthdayMessage.length / 160) || 1} Credit/SMS
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px' }}>
                      Use <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 600, color: '#0f172a' }}>{'{firstName}'}</code> to automatically insert each celebrator's first name.
                    </p>
                    <textarea
                      className="msg-textarea"
                      placeholder="Type your birthday greeting..."
                      value={birthdayMessage}
                      onChange={e => setBirthdayMessage(e.target.value)}
                      maxLength={480}
                      rows={4}
                    />

                    <div style={{ marginTop: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Sample Personalized Preview ({birthdayRecipients.length} Celebrator{birthdayRecipients.length > 1 ? 's' : ''}):
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                        {birthdayRecipients.slice(0, 5).map(reg => {
                          const firstName = getResidentFirstName(reg);
                          const previewText = birthdayMessage
                            .replace(/\{firstName\}/gi, firstName)
                            .replace(/\{first_name\}/gi, firstName)
                            .replace(/\{name\}/gi, firstName);
                          return (
                            <div key={reg.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem' }}>
                              <strong style={{ color: '#059669', marginRight: 6 }}>{firstName}:</strong>
                              <span style={{ color: '#334155' }}>{previewText || '(empty greeting)'}</span>
                            </div>
                          );
                        })}
                        {birthdayRecipients.length > 5 && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', textAlign: 'center', padding: '4px 0' }}>
                            + {birthdayRecipients.length - 5} more celebrators with personalized names
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-msg-send"
                        onClick={handleSendBirthday}
                        disabled={birthdaySending || !birthdayMessage.trim()}
                        style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', background: '#059669', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <Send size={14} />
                        <span>{birthdaySending ? 'Sending Greetings...' : `Send to ${birthdayRecipients.length} Celebrator${birthdayRecipients.length > 1 ? 's' : ''}`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {msgTab === 'inquiries' && (
          <div className="dash-panel-v2">
            <div className="dash-panel-v2-header">
              <div>
                <p className="dash-panel-v2-title">Citizen Inquiries</p>
                <p className="dash-panel-v2-sub">Direct inquiries and requests received from the public portal</p>
              </div>
              <div className="dash-panel-v2-icon">
                <Inbox size={15} strokeWidth={1.8} />
              </div>
            </div>
            <div className="dash-panel-v2-body">
              {contactInquiriesLoading ? (
                <div className="table-loading" style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>Loading inquiries...</div>
              ) : contactInquiries.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: 12 }}>
                    <Inbox size={20} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>No contact inquiries yet</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>Messages submitted via contact forms will appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {contactInquiries.map(msg => (
                    <div key={msg.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{msg.name}</span>
                          <span style={{ color: '#64748b', fontSize: '0.78rem' }}>· {msg.email}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: msg.status === 'unread' ? '#fef3c7' : '#f1f5f9', color: msg.status === 'unread' ? '#92400e' : '#475569' }}>
                            {msg.status}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {msgTab === 'feedback' && (
          <div className="dash-panel-v2">
            <div className="dash-panel-v2-header">
              <div>
                <p className="dash-panel-v2-title">Citizen Feedback & Grievances</p>
                <p className="dash-panel-v2-sub">Community concerns and feedback submissions</p>
              </div>
              <div className="dash-panel-v2-icon">
                <MessageSquare size={15} strokeWidth={1.8} />
              </div>
            </div>
            <div className="dash-panel-v2-body">
              {grievancesLoading ? (
                <div className="table-loading" style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>Loading feedback...</div>
              ) : grievances.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: 12 }}>
                    <MessageSquare size={20} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>No citizen feedback yet</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>Feedback and concerns submitted by citizens will appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {grievances.map(g => {
                    const r = g.registrations;
                    const vr = r?.ValidResidents;
                    const firstName = vr?.first_name || r?.first_name;
                    const lastName = vr?.last_name || r?.last_name;
                    const barangay = vr?.barangay || r?.barangay;
                    return (
                      <div key={g.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{g.type || 'Feedback'}</span>
                            {(firstName || lastName) && (
                              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                                · {firstName} {lastName} {barangay ? `(${barangay})` : ''}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(g.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>{g.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {msgTab === 'history' && (
          <div className="dash-panel-v2">
            <div className="dash-panel-v2-header">
              <div>
                <p className="dash-panel-v2-title">Broadcast History</p>
                <p className="dash-panel-v2-sub">Previous SMS broadcasts and delivery analytics</p>
              </div>
              <div className="dash-panel-v2-icon">
                <History size={15} strokeWidth={1.8} />
              </div>
            </div>
            <div className="dash-panel-v2-body">
              {messagesLoading ? (
                <div className="table-loading" style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: 12 }}>
                    <History size={20} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>No messages sent yet</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>Past SMS campaigns will show delivery logs here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      onClick={() => fetchMsgRecipients(msg.id)}
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 22, height: 22, borderRadius: 6, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {typeIcons[msg.type] || <MessageSquare size={13} />}
                          </span>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{msg.title || 'Untitled Broadcast'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: msg.status === 'completed' || msg.status === 'sent' ? '#ecfdf5' : '#f1f5f9', color: msg.status === 'completed' || msg.status === 'sent' ? '#065f46' : '#475569' }}>
                            {msg.status}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '0.84rem', color: '#475569', lineHeight: 1.45 }}>{msg.body}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #edf2f7', paddingTop: 8 }}>
                        <span>Total: <strong style={{ color: '#0f172a' }}>{msg.total_recipients || 0}</strong></span>
                        <span>Delivered: <strong style={{ color: '#059669' }}>{msg.sent_count || 0}</strong></span>
                        {msg.failed_count > 0 && <span>Failed: <strong style={{ color: '#ef4444' }}>{msg.failed_count}</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recipients Detail Modal */}
              {selectedMessage && createPortal(
                <div className="modal-overlay" onClick={() => setSelectedMessage(null)}>
                  <div className="modal-card msg-recipients-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, borderRadius: 12 }}>
                    <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Delivery Status</h3>
                      <button className="modal-close-x" onClick={() => setSelectedMessage(null)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
                    </div>
                    <div className="modal-body" style={{ padding: '16px 20px' }}>
                      <div className="msg-recipients-summary" style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                        <span className="msg-recipients-count" style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>{msgRecipients.length} recipients</span>
                        <span className="msg-recipients-sent" style={{ padding: '4px 10px', background: '#ecfdf5', color: '#065f46', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>{msgRecipients.filter(r => r.status === 'sent').length} delivered</span>
                        <span className="msg-recipients-failed" style={{ padding: '4px 10px', background: '#fef2f2', color: '#991b1b', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>{msgRecipients.filter(r => r.status === 'failed').length} failed</span>
                      </div>
                      <div className="msg-recipients-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {msgRecipients.map(rec => (
                          <div key={rec.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{rec.resident_name || 'Unknown'}</span>
                            <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{rec.phone_number}</span>
                            <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: 4, background: rec.status === 'sent' ? '#ecfdf5' : '#fee2e2', color: rec.status === 'sent' ? '#065f46' : '#991b1b' }}>{rec.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>,
                document.body
              )}
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
            <select
              className="filter-select"
              value={logsFilterAdmin}
              onChange={(e) => { setLogsFilterAdmin(e.target.value); setLogsPage(1); fetchAdminLogs(1); }}
              style={{ minWidth: 180 }}
            >
              <option value="">All Users</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.email}>{acc.email}</option>
              ))}
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
              <div className="residents-pagination" style={{ marginTop: 14 }}>
                <span className="pagination-info">Page <strong>{logsPage}</strong> of <strong>{totalPages}</strong> · <strong>{logsTotal}</strong> total</span>
                <div className="pagination-buttons">
                  <button
                    className="page-btn page-btn-nav"
                    onClick={() => goToPage(1)}
                    disabled={logsPage <= 1}
                    title="First Page (1)"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    className="page-btn page-btn-nav"
                    onClick={() => goToPage(logsPage - 1)}
                    disabled={logsPage <= 1}
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} /> <span>Prev</span>
                  </button>
                  {getPaginationItems(logsPage, totalPages).map((item, idx) => {
                    if (item === '...') {
                      return <span key={`dots-${idx}`} className="pagination-ellipsis">…</span>;
                    }
                    return (
                      <button
                        key={item}
                        className={`page-btn ${item === logsPage ? 'page-btn-active' : ''}`}
                        onClick={() => goToPage(item)}
                        title={`Page ${item}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                  <button
                    className="page-btn page-btn-nav"
                    onClick={() => goToPage(logsPage + 1)}
                    disabled={logsPage >= totalPages}
                    title="Next Page"
                  >
                    <span>Next</span> <ChevronRight size={14} />
                  </button>
                  <button
                    className="page-btn page-btn-nav"
                    onClick={() => goToPage(totalPages)}
                    disabled={logsPage >= totalPages}
                    title={`Last Page (${totalPages})`}
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderOrganizations = () => {
    return (
      <div className="admin-panel">
        <div className="panel-header">
          <h3><Building size={22} /> Organizations</h3>
          <button className="btn btn-sm btn-primary" onClick={() => setShowCreateOrgModal(true)}>+ Create Organization</button>
        </div>
        <div className="members-table-wrap" style={{ marginTop: 20 }}>
          {organizationsLoading ? (
            <div className="table-loading">Loading organizations...</div>
          ) : organizations.length === 0 ? (
            <div className="table-empty">No organizations found. Click "Create Organization" to add one.</div>
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Organization Name</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Members</th>
                    <th style={{ width: '40%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map(org => {
                    const memberCount = allRegs.filter(r => r.organization === org.name).length;
                    return (
                      <tr 
                        key={org.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setShowOrgDetailsModal(org.name);
                        }}
                      >
                        <td><strong style={{ color: '#0f172a', fontSize: '1rem' }}>{org.name}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="status-badge status-approved" style={{ fontSize: '0.8rem' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-sm btn-primary" style={{ marginRight: 8 }} onClick={(e) => {
                            e.stopPropagation();
                            setShowAddOrgMemberModal(org.name);
                            setOrgMemberSearch('');
                          }}><UserPlus size={14} style={{ marginRight: 4 }} /> Add Member</button>
                          <button className="btn btn-sm btn-secondary" style={{ marginRight: 8, padding: '6px 8px' }} onClick={(e) => {
                            e.stopPropagation();
                            setShowEditOrgModal(org);
                            setEditOrgName(org.name);
                          }}><Edit size={14} /></button>
                          <button className="btn btn-sm btn-danger" style={{ padding: '6px 8px' }} onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteOrgModal(org);
                          }}><Trash size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
      {showEventForm && typeof document !== 'undefined' && createPortal(
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
        </div>,
        document.body
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

  const handleUpdateScanEvent = async (e) => {
    e.preventDefault();
    if (!editingScanEvent || !newEventForm.event_name.trim()) return;
    try {
      const { data, error } = await supabase.from('scan_events').update({
        event_name: newEventForm.event_name.trim(),
        event_date: newEventForm.event_date || null,
        location: newEventForm.location.trim() || null,
        household_mode: newEventForm.household_mode || false,
        selected_barangays: newEventForm.selected_barangays.length > 0 ? newEventForm.selected_barangays : null,
      }).eq('id', editingScanEvent.id).select().single();
      if (error) throw error;
      showToast('Event updated: ' + data.event_name, 'success');
      setShowCreateEvent(false);
      setEditingScanEvent(null);
      setNewEventForm({ event_name: '', event_date: '', location: '', household_mode: false, selected_barangays: [] });
      setEvents(prev => prev.map(evt => evt.id === data.id ? data : evt));
    } catch (err) {
      showToast('Failed to update event: ' + err.message, 'error');
    }
  };

  const openDeleteScanEventModal = (evt) => {
    setDeleteScanEventData(evt);
    setShowDeleteScanEventModal(true);
  };

  const executeDeleteScanEvent = async () => {
    if (!deleteScanEventData) return;
    setDeleteScanEventLoading(true);
    try {
      const { error: scansError } = await supabase.from('event_scans').delete().eq('event_id', deleteScanEventData.id);
      if (scansError) throw scansError;
      const { error } = await supabase.from('scan_events').delete().eq('id', deleteScanEventData.id);
      if (error) throw error;
      showToast('Event deleted: ' + deleteScanEventData.event_name, 'success');
      logAdminAction('delete_event', 'scan_events', deleteScanEventData.id, deleteScanEventData.event_name, {});
      setEvents(prev => prev.filter(e => e.id !== deleteScanEventData.id));
      if (selectedEvent?.id === deleteScanEventData.id) {
        setSelectedEvent(null);
        setScannerMode('select');
      }
      setShowDeleteScanEventModal(false);
      setDeleteScanEventData(null);
    } catch (err) {
      showToast('Failed to delete event: ' + err.message, 'error');
    } finally {
      setDeleteScanEventLoading(false);
    }
  };

  const openEditScanEvent = async (evt) => {
    try {
      setEditingScanEvent(evt);
      setNewEventForm({
        event_name: evt.event_name || '',
        event_date: evt.event_date || '',
        location: evt.location || '',
        household_mode: evt.household_mode || false,
        selected_barangays: evt.selected_barangays || [],
      });
      setShowCreateEvent(true);
      await fetchBarangays();
    } catch (err) {
      showToast('Failed to open edit form: ' + err.message, 'error');
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

  const detectQRSimple = async (file) => {
    const debug = [];
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = async () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const maxSize = 600;
          let { width, height } = img;

          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const imageData = ctx.getImageData(0, 0, width, height);
          debug.push(`img:${width}x${height}`);

          // ── EXACT pattern from working mobile-qr-scanner.js project ──
          try {
            let jsQR;
            try {
              const jsQRModule = await import('jsqr');
              jsQR = jsQRModule.default;
              debug.push('dyn:ok');
            } catch (importError) {
              debug.push('dyn:fail');
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
              document.head.appendChild(script);
              await new Promise((res, rej) => {
                script.onload = () => res();
                script.onerror = () => rej(new Error('CDN load failed'));
              });
              jsQR = window.jsQR;
              debug.push('cdn:ok');
            }

            if (typeof jsQR === 'function') {
              debug.push('jsQR:func');
              const detectionOptions = [
                { inversionAttempts: 'dontInvert' },
                { inversionAttempts: 'onlyInvert' },
                { inversionAttempts: 'attemptBoth' },
              ];

              for (const options of detectionOptions) {
                const code = jsQR(
                  imageData.data,
                  imageData.width,
                  imageData.height,
                  options,
                );
                if (code && code.data) {
                  debug.push(`found:${code.data.substring(0, 20)}...`);
                  resolve({ data: code.data, debug: debug.join(' | ') });
                  return;
                }
              }
              debug.push('found:none');
            } else {
              debug.push(`jsQR:${typeof jsQR}`);
            }
          } catch (jsqrError) {
            debug.push(`jsQR-err:${jsqrError.message}`);
          }

          resolve({ data: null, debug: debug.join(' | ') });
        } catch (err) {
          debug.push(`err:${err.message}`);
          resolve({ data: null, debug: debug.join(' | ') });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ data: null, debug: 'img:error' });
      };

      img.src = url;
    });
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
        .replace(/^\uFEFF/, '');      // Remove BOM

      // If the QR contains a URL, extract the token from it
      const urlTokenMatch = cleanToken.match(/\/card\/(EM[A-Za-z0-9-]+)/);
      if (urlTokenMatch) cleanToken = urlTokenMatch[1];

      // SECURITY: Strict token format validation
      const validTokenPattern = /^(EM[A-Za-z0-9]{24}|EM-\d{10})$/;
      if (!validTokenPattern.test(cleanToken)) {
        setScanResult({ type: 'invalid', message: 'SECURITY ALERT: Invalid QR format. This is NOT a valid EM Card.', rawText: cleanToken });
        setScanLoading(false);
        setScanToken('');
        scanInProgressRef.current = false;
        return;
      }

      // FAST-PATH: client-side duplicate cache (zero HTTP call for recent re-scans)
      const cacheKey = `${selectedEvent.id}:${cleanToken}`;
      if (recentScanCacheRef.current.has(cacheKey)) {
        setScanResult({
          type: 'duplicate',
          name: 'Recently Scanned',
          barangay: 'N/A',
          purok: 'N/A',
          houseNo: 'N/A',
          contact: 'N/A',
          photo: null,
          emCardNo: '-',
          qrToken: cleanToken,
          scannedAt: new Date().toISOString(),
          scannedBy: 'this device (cached)',
        });
        setScanLoading(false);
        setScanToken('');
        return;
      }

      // Single server-side API call replaces 6+ client-side DB round-trips
      const res = await authFetch('/api/event-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawToken: cleanToken,
          event_id: selectedEvent.id,
          scanned_by: username,
          household_mode: selectedEvent.household_mode,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setScanResult({ type: 'error', message: result.message || result.error || 'Network error. Try again.' });
        return;
      }

      setScanResult(result);

      if (result.type === 'success') {
        // Add to client-side cache for fast duplicate detection
        recentScanCacheRef.current.add(cacheKey);
        if (recentScanCacheRef.current.size > 500) {
          const first = recentScanCacheRef.current.values().next().value;
          recentScanCacheRef.current.delete(first);
        }
        // Optimistic local count — zero HTTP calls during mass scanning
        localScanCountRef.current += 1;
        setScanStats(prev => ({ ...prev, total: localScanCountRef.current }));
      }
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
        <div className="admin-panel event-select-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0 }}><ScanLine size={22} /> Event Scanner</h3>
                <span className="panel-badge">Distribution Verification</span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--muted, #64748b)' }}>
                Select an active event to scan QR codes and verify resident eligibility.
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '9px 16px', borderRadius: 10 }}
              onClick={() => { setShowCreateEvent(true); fetchBarangays(); }}
            >
              <Plus size={18} /> Create New Event
            </button>
          </div>

          <div className="event-scanner-hero">
            <div className="esh-left">
              <div className="esh-icon">
                <ShieldCheck size={24} />
              </div>
              <div className="esh-text">
                <h4>Select an Active Event to Begin Scanning</h4>
                <p>Verify resident EM Card QR codes, enforce barangay restrictions, and prevent duplicate distribution in real-time.</p>
              </div>
            </div>
            <div className="esh-stats">
              <div className="esh-stat-chip">
                <span className="esh-stat-val">{events.length}</span>
                <span className="esh-stat-lbl">Active Event{events.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>

          {eventsLoading ? (
            <div className="table-loading">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="table-empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Calendar size={28} />
              </div>
              <h4 style={{ margin: '0 0 8px', color: '#1e293b', fontWeight: 700 }}>No active events found</h4>
              <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.88rem' }}>Create your first distribution event to start scanning EM Cards.</p>
              <button
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => { setShowCreateEvent(true); fetchBarangays(); }}
              >
                <Plus size={16} /> Create First Event
              </button>
            </div>
          ) : (
            <div className="event-list-grid">
              {events.map(evt => (
                <div key={evt.id} className="event-card">
                  <div>
                    <div className="event-card-header">
                      <div className="event-card-icon"><Calendar size={20} /></div>
                      <div className="event-card-badges">
                        {evt.household_mode && (
                          <span className="event-badge-hh" title="One aid per household">
                            <Home size={11} /> HH Mode
                          </span>
                        )}
                        {evt.selected_barangays && evt.selected_barangays.length > 0 ? (
                          <span className="event-badge-restricted" title={`${evt.selected_barangays.length} barangays allowed`}>
                            <MapPin size={11} /> {evt.selected_barangays.length} Brgy
                          </span>
                        ) : (
                          <span className="event-badge-all" title="Available to all barangays">
                            <CheckCircle size={11} /> All Barangays
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="event-card-body" style={{ marginTop: 12 }}>
                      <h5>{evt.event_name}</h5>
                      <div className="event-card-details">
                        <span className="event-detail">
                          <MapPin size={14} /> <span>{evt.location || 'No location set'}</span>
                        </span>
                        <span className="event-detail">
                          <Clock size={14} /> <span>{evt.event_date ? new Date(evt.event_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'No date set'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="event-card-actions">
                    <button
                      className="btn-event-launch"
                      onClick={() => {
                        setSelectedEvent(evt);
                        setScannerMode('scan');
                        localScanCountRef.current = 0;
                        recentScanCacheRef.current.clear();
                        fetchEventScans(evt.id);
                      }}
                    >
                      <Zap size={16} /> Start Scanning
                    </button>
                    <div className="event-card-sub-actions">
                      <button
                        className="btn-event-sub btn-event-records"
                        onClick={() => openEventRecords(evt)}
                        title="View event scan logs & stats"
                      >
                        <FileText size={13} /> Records
                      </button>
                      <button
                        className="btn-event-sub btn-event-edit"
                        onClick={() => openEditScanEvent(evt)}
                        title="Edit event details"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        className="btn-event-sub btn-event-delete"
                        onClick={() => openDeleteScanEventModal(evt)}
                        title="Delete this event"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CREATE/EDIT EVENT MODAL */}
          {showCreateEvent && typeof document !== 'undefined' && createPortal(
            <div className="modal-overlay" onClick={() => { setShowCreateEvent(false); setEditingScanEvent(null); setNewEventForm({ event_name: '', event_date: '', location: '', household_mode: false, selected_barangays: [] }); }}>
              <div className="modal-card event-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{editingScanEvent ? 'Edit Event' : 'Create New Event'}</h3>
                  <button className="modal-close-x" onClick={() => { setShowCreateEvent(false); setEditingScanEvent(null); setNewEventForm({ event_name: '', event_date: '', location: '', household_mode: false, selected_barangays: [] }); }}>✕</button>
                </div>
                <form className="modal-form" onSubmit={editingScanEvent ? handleUpdateScanEvent : handleCreateEvent}>
                  <div className="form-group">
                    <label>Event Name <span className="req-star">*</span></label>
                    <input type="text" placeholder="Enter event name" required value={newEventForm.event_name} onChange={e => setNewEventForm(p => ({ ...p, event_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Event Date</label>
                    <input type="date" value={newEventForm.event_date} onChange={e => setNewEventForm(p => ({ ...p, event_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" placeholder="Enter location" value={newEventForm.location} onChange={e => setNewEventForm(p => ({ ...p, location: e.target.value }))} />
                  </div>
                  
                  <div className="form-group">
                    <div className="event-barangay-header" style={{ marginBottom: 8 }}>
                      <label style={{ margin: 0 }}>
                        <span>Restrict to Barangays (Optional)</span>
                        <small style={{ display: 'block', color: '#6b7280', fontWeight: 400 }}>Leave empty to allow all barangays</small>
                      </label>
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
                    <div className="event-barangay-grid" style={{ maxHeight: 240, overflowY: 'auto', padding: '4px 0', marginTop: 8 }}>
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
                      <div className="event-selected-barangays" style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>
                        <strong>Selected ({newEventForm.selected_barangays.length}/{allBarangays.length}):</strong> {newEventForm.selected_barangays.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="event-form-toggle" style={{ margin: 0, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <input
                        type="checkbox"
                        checked={newEventForm.household_mode}
                        onChange={e => setNewEventForm(p => ({ ...p, household_mode: e.target.checked }))}
                      />
                      <span className="toggle-label"><Home size={16} /> Household Mode — One aid per household (same address only)</span>
                    </label>
                  </div>
                  
                  <div className="modal-footer">
                    <button type="button" className="btn btn-modal-secondary" onClick={() => { setShowCreateEvent(false); setEditingScanEvent(null); setNewEventForm({ event_name: '', event_date: '', location: '', household_mode: false, selected_barangays: [] }); }}>Cancel</button>
                    <button type="submit" className="btn btn-modal-primary">{editingScanEvent ? 'Save Changes' : 'Create Event'}</button>
                  </div>
                </form>
              </div>
            </div>
          , document.body)}
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
            <button className="btn-change-event" onClick={() => { setSelectedEvent(null); setScannerMode('select'); localScanCountRef.current = 0; recentScanCacheRef.current.clear(); resetScanState(); }}>Back to Events</button>
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

                    try {
                      const { data: decodedText, debug } = await detectQRSimple(file);

                      if (decodedText) {
                        if (scanInProgressRef.current) {
                          setScanResult({ type: 'invalid', message: 'A scan is already in progress. Please wait.' });
                        } else {
                          await handleEventScan(decodedText);
                        }
                      } else {
                        setScanResult({
                          type: 'invalid',
                          message: 'Could not read QR code from image. Please ensure the QR is clearly visible and try again, or use Manual entry.',
                          rawText: debug,
                        });
                      }
                    } catch (err) {
                      setScanResult({ type: 'invalid', message: 'Could not read QR code from image. Please ensure the QR is clearly visible and try again, or use Manual entry.' });
                    } finally {
                      setScanLoading(false);
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
        <div className={`admin-toast ${toast.type}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          {toast.sticky && (
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
            >🔄 Refresh</button>
          )}
          <button
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700, fontSize: '14px', lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Image src="/em-main-logo.png" alt="Epektibong Mamamayan Logo" width={44} height={44} className="sidebar-brand-mark-img" />
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
            <button className="sidebar-logout" onClick={() => setShowCreateAccount(true)}>
              <User size={15} /><span>Create Account</span>
            </button>
          )}
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={15} /><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="admin-topbar-title">{navItems.find(n => n.id === activeTab)?.label}</div>

          {/* Global Search */}
          <div className="topbar-search">
            <Search size={14} />
            <input type="text" placeholder="Search members, registrations..." readOnly />
          </div>

          <div className="admin-topbar-right">
            <span className="topbar-date">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>

            <div className="topbar-notify-wrap">
              <div className="topbar-notify" onClick={() => {
                const newOpenState = !notifOpen;
                setNotifOpen(newOpenState);
                if (newOpenState) {
                  // Mark notifications as seen when opening
                  const now = new Date().toISOString();
                  setLastNotifSeen(now);
                  localStorage.setItem('emcard_last_notif_seen', now);
                }
              }}>
                <Bell size={18} />
                {(() => {
                  const pendingRegs = allRegs.filter(r => r.status === 'Pending');
                  const newCount = lastNotifSeen 
                    ? pendingRegs.filter(r => new Date(r.created_at) > new Date(lastNotifSeen)).length
                    : pendingRegs.length;
                  const total = newCount + unreadInquiries.length + unreadFeedback.length;
                  return total > 0 ? (
                    <span className="topbar-notify-count">{total}</span>
                  ) : null;
                })()}
              </div>
              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-header">
                    <h4>Notifications</h4>
                    {(allRegs.filter(r => r.status === 'Pending').length + unreadInquiries.length + unreadFeedback.length) > 0 && (
                      <span className="notif-badge">{allRegs.filter(r => r.status === 'Pending').length + unreadInquiries.length + unreadFeedback.length} new</span>
                    )}
                  </div>
                  <div className="notif-dropdown-body">
                    {(allRegs.filter(r => r.status === 'Pending').length + unreadInquiries.length + unreadFeedback.length) === 0 ? (
                      <div className="notif-empty">
                        <Info size={24} />
                        <span>No new notifications</span>
                      </div>
                    ) : (
                      <>
                        {[
                          ...allRegs.filter(r => r.status === 'Pending').map(reg => ({ _type: 'reg', _date: reg.created_at, reg })),
                          ...unreadInquiries.map(msg => ({ _type: 'inquiry', _date: msg.created_at, msg })),
                          ...unreadFeedback.map(g => ({ _type: 'feedback', _date: g.created_at, g })),
                        ]
                          .sort((a, b) => new Date(b._date) - new Date(a._date))
                          .slice(0, 8)
                          .map((item, idx) => {
                            if (item._type === 'reg') {
                              const { reg } = item;
                              const fullName = getResidentName(reg);
                              const shortName = fullName.length > 25 ? fullName.slice(0, 22) + '...' : fullName;
                              const barangay = reg.barangay || 'No barangay';
                              const shortBarangay = barangay.length > 15 ? barangay.slice(0, 12) + '...' : barangay;
                              return (
                                <div key={`reg-${reg.id}`} className="notif-item" onClick={() => { setNotifOpen(false); setActiveTab('registrations'); }}>
                                  <div className="notif-icon"><UserCheck size={16} /></div>
                                  <div className="notif-content">
                                    <p className="notif-title">New registration</p>
                                    <p className="notif-desc" title={`${fullName} — ${barangay}`}>{shortName} — {shortBarangay}</p>
                                    <span className="notif-time">{new Date(reg.created_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              );
                            }
                            if (item._type === 'inquiry') {
                              const { msg } = item;
                              return (
                                <div key={`inq-${msg.id}`} className="notif-item" onClick={() => { setNotifOpen(false); setActiveTab('messages'); setMsgTab('inquiries'); fetchContactInquiries(); }}>
                                  <div className="notif-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Inbox size={16} /></div>
                                  <div className="notif-content">
                                    <p className="notif-title">New inquiry</p>
                                    <p className="notif-desc">{msg.name || 'Anonymous'} — {msg.inquiry_type || 'General'}</p>
                                    <span className="notif-time">{new Date(msg.created_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              );
                            }
                            if (item._type === 'feedback') {
                              const { g } = item;
                              return (
                                <div key={`fb-${g.id}`} className="notif-item" onClick={() => { setNotifOpen(false); setActiveTab('messages'); setMsgTab('feedback'); fetchGrievances(); }}>
                                  <div className="notif-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><MessageSquare size={16} /></div>
                                  <div className="notif-content">
                                    <p className="notif-title">New feedback</p>
                                    <p className="notif-desc">{g.type || 'Feedback'} — {g.status || 'open'}</p>
                                    <span className="notif-time">{new Date(g.created_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })
                        }
                      </>
                    )}
                  </div>
                  {(allRegs.filter(r => r.status === 'Pending').length + unreadInquiries.length + unreadFeedback.length) > 0 && (
                    <div className="notif-dropdown-footer" style={{ display: 'flex', gap: 8 }}>
                      {allRegs.filter(r => r.status === 'Pending').length > 0 && (
                        <button onClick={() => { setNotifOpen(false); setActiveTab('registrations'); }}>Registrations</button>
                      )}
                      {unreadInquiries.length > 0 && (
                        <button onClick={() => { setNotifOpen(false); setActiveTab('messages'); setMsgTab('inquiries'); fetchContactInquiries(); }}>Inquiries</button>
                      )}
                      {unreadFeedback.length > 0 && (
                        <button onClick={() => { setNotifOpen(false); setActiveTab('messages'); setMsgTab('feedback'); fetchGrievances(); }}>Feedback</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="topbar-user">
              <div className="topbar-user-avatar">{(username || 'A').charAt(0).toUpperCase()}</div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">{username || 'Admin'}</span>
                <span className="topbar-user-role" style={{ textTransform: 'capitalize' }}>{userRole}</span>
              </div>
            </div>
          </div>
        </header>
        <div className="admin-content">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'residents' && renderResidents()}
          {activeTab === 'registrations' && renderRegistrations()}
          {activeTab === 'registerMember' && <RegisterForm embedded={true} />}
          {activeTab === 'members' && renderMembers()}
          {activeTab === 'organizations' && renderOrganizations()}
          {activeTab === 'eventScanner' && renderEventScanner()}
          {activeTab === 'events' && renderUpcomingEvents()}
          {activeTab === 'network' && renderNetwork()}
          {activeTab === 'messages' && renderMessages()}
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

      {/* PROMOTE TO REGISTERED VOTER MODAL */}
      {showPromoteModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => { setShowPromoteModal(false); setPromoteReg(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                <UserCheck size={22} /> Move to Registered Voters
              </h3>
              <button className="modal-close-x" onClick={() => { setShowPromoteModal(false); setPromoteReg(null); }}>✕</button>
            </div>
            <div className="modal-body" style={{ paddingTop: '0' }}>
              <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
                Move <strong>{promoteReg ? getResidentName(promoteReg) : ''}</strong> to Registered Voters?
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '8px' }}>
                This will create a ValidResidents record and link this member to it. Their voter status will change to <strong>Registered Voter</strong>.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-modal-secondary" onClick={() => { setShowPromoteModal(false); setPromoteReg(null); }}>Cancel</button>
              <button type="button" className="btn btn-modal-primary" onClick={moveToRegisteredVoters} disabled={promoteLoading}>
                {promoteLoading ? 'Moving...' : 'Move to Registered Voters'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE REGISTRATION CONFIRMATION MODAL */}
      {showDeleteRegModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteRegModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <AlertTriangle size={22} /> Delete Registration
              </h3>
              <button className="modal-close-x" onClick={() => setShowDeleteRegModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ paddingTop: '0' }}>
              <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
                Are you sure you want to permanently delete the registration for <strong>{deleteRegName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-modal-secondary" onClick={() => setShowDeleteRegModal(false)}>Cancel</button>
              <button type="button" className="btn btn-modal-danger" onClick={handleDeleteRegistration} disabled={deleteRegLoading}>
                {deleteRegLoading ? 'Deleting...' : 'Delete Registration'}
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

      {/* DELETE SCAN EVENT CONFIRMATION MODAL */}
      {showDeleteScanEventModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteScanEventModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '8px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <AlertTriangle size={22} /> Delete Event
              </h3>
              <button className="modal-close-x" onClick={() => setShowDeleteScanEventModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ paddingTop: '0' }}>
              <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
                Are you sure you want to delete <strong>{deleteScanEventData?.event_name}</strong>?<br /><br />
                <span style={{ color: '#dc2626', fontWeight: 500 }}>This will also delete all scan records for this event.</span>
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-modal-secondary" onClick={() => setShowDeleteScanEventModal(false)}>Cancel</button>
              <button type="button" className="btn btn-modal-danger" onClick={executeDeleteScanEvent} disabled={deleteScanEventLoading}>
                {deleteScanEventLoading ? 'Deleting...' : 'Delete Event'}
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
      {/* REGISTRATION DETAIL MODAL */}
      {selectedRegDetail && (
        <div className="modal-overlay" onClick={() => { setSelectedRegDetail(null); setRegEditMode(false); }}>
          <div className="modal-card reg-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Registration Details</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Member application review and verification
                </p>
              </div>
              <button className="modal-close-x" onClick={() => { setSelectedRegDetail(null); setRegEditMode(false); }}>✕</button>
            </div>

            <div className="modal-body">
              {/* Profile Hero Header */}
              <div className="reg-detail-profile-hero">
                {(selectedRegDetail.photo_url || selectedRegDetail.photo_base64) ? (
                  <img src={selectedRegDetail.photo_url || selectedRegDetail.photo_base64} alt="Portrait" className="reg-detail-avatar" />
                ) : (
                  <div className="reg-detail-avatar-placeholder">👤</div>
                )}
                <div className="reg-detail-hero-info">
                  <h4 className="reg-detail-hero-name">{getResidentName(selectedRegDetail)}</h4>
                  <div className="reg-detail-badges-row">
                    <span className={`status-badge status-${(selectedRegDetail.status || 'pending').toLowerCase()}`}>
                      {selectedRegDetail.status || 'Pending'}
                    </span>
                    <span className={`reg-detail-badge ${selectedRegDetail.is_valid_resident !== false ? 'badge-voter' : 'badge-nonvoter'}`}>
                      {selectedRegDetail.is_valid_resident !== false ? '✓ Registered Voter' : 'Non-Valid Resident'}
                    </span>
                    {selectedRegDetail.reference_no && (
                      <span className="reg-detail-badge badge-ref">
                        Ref: {selectedRegDetail.reference_no}
                      </span>
                    )}
                    {selectedRegDetail.resident_id && (
                      <span className="reg-detail-badge badge-ref">
                        ID: {selectedRegDetail.resident_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Demographics Section */}
              <div className="reg-detail-section">
                <p className="reg-detail-section-title">Personal Information</p>
                <div className="reg-detail-grid-v2">
                  <div className="reg-detail-item-v2">
                    <span className="reg-detail-label">Sector / Category</span>
                    {regEditMode ? (
                      <select className="reg-edit-input" value={regEditForm.sector_category} onChange={e => setRegEditForm(f => ({...f, sector_category: e.target.value}))}>
                        {['Senior Citizens','PWD','Solo Parents','Farmers / Fisherfolk','Workers / Labor','Youth','Indigenous People','Women','Others'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <span className="reg-detail-value">{selectedRegDetail.sector_category || '-'}</span>}
                  </div>
                  <div className="reg-detail-item-v2">
                    <span className="reg-detail-label">Contact Number</span>
                    {regEditMode ? <input className="reg-edit-input" value={regEditForm.contact} onChange={e => setRegEditForm(f => ({...f, contact: e.target.value}))} /> : <span className="reg-detail-value" style={{ fontFamily: 'monospace' }}>{selectedRegDetail.contact || '-'}</span>}
                  </div>
                  <div className="reg-detail-item-v2">
                    <span className="reg-detail-label">Gender</span>
                    {regEditMode ? (
                      <select className="reg-edit-input" value={regEditForm.gender} onChange={e => setRegEditForm(f => ({...f, gender: e.target.value}))}>
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : <span className="reg-detail-value">{selectedRegDetail.gender || '-'}</span>}
                  </div>
                  <div className="reg-detail-item-v2">
                    <span className="reg-detail-label">Civil Status</span>
                    {regEditMode ? (
                      <select className="reg-edit-input" value={regEditForm.civil_status} onChange={e => setRegEditForm(f => ({...f, civil_status: e.target.value}))}>
                        <option value="">Select...</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </select>
                    ) : <span className="reg-detail-value">{selectedRegDetail.civil_status || '-'}</span>}
                  </div>
                  <div className="reg-detail-item-v2 full">
                    <span className="reg-detail-label">Birthday</span>
                    {regEditMode ? <input type="date" className="reg-edit-input" value={regEditForm.birthday} onChange={e => setRegEditForm(f => ({...f, birthday: e.target.value}))} /> : <span className="reg-detail-value">{selectedRegDetail.birthday || '-'}</span>}
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="reg-detail-section">
                <p className="reg-detail-section-title">Residential Address</p>
                <div className="reg-detail-grid-v2">
                  <div className="reg-detail-item-v2">
                    <span className="reg-detail-label">Barangay</span>
                    {regEditMode ? <input className="reg-edit-input" value={regEditForm.barangay} onChange={e => setRegEditForm(f => ({...f, barangay: e.target.value}))} /> : <span className="reg-detail-value">{selectedRegDetail.barangay || '-'}</span>}
                  </div>
                  <div className="reg-detail-item-v2">
                    <span className="reg-detail-label">Purok / Zone</span>
                    {regEditMode ? (
                      <select className="reg-edit-input" value={regEditForm.purok} onChange={e => setRegEditForm(f => ({...f, purok: e.target.value}))}>
                        <option value="">Select purok...</option>
                        {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>Purok {n}</option>)}
                        {regEditForm.purok && ![1,2,3,4,5,6,7].map(String).includes(String(regEditForm.purok)) && regEditForm.purok !== '' && <option value={regEditForm.purok}>{regEditForm.purok}</option>}
                      </select>
                    ) : <span className="reg-detail-value">{selectedRegDetail.purok ? (SUBDIVISION_PUROKS.includes(selectedRegDetail.purok) ? selectedRegDetail.purok : `Purok ${selectedRegDetail.purok}`) : '-'}</span>}
                  </div>
                  {!SUBDIVISION_PUROKS.includes(regEditMode ? regEditForm.purok : selectedRegDetail.purok) && (
                    <div className="reg-detail-item-v2 full">
                      <span className="reg-detail-label">House Number / Street</span>
                      {regEditMode ? <input className="reg-edit-input" value={regEditForm.house_no} onChange={e => setRegEditForm(f => ({...f, house_no: e.target.value}))} /> : <span className="reg-detail-value">{selectedRegDetail.house_no || '-'}</span>}
                    </div>
                  )}
                  {SUBDIVISION_PUROKS.includes(selectedRegDetail.purok) && (
                    <>
                      <div className="reg-detail-item-v2">
                        <span className="reg-detail-label">Lot</span>
                        <span className="reg-detail-value">{selectedRegDetail.lot || '-'}</span>
                      </div>
                      <div className="reg-detail-item-v2">
                        <span className="reg-detail-label">Block</span>
                        <span className="reg-detail-value">{selectedRegDetail.block || '-'}</span>
                      </div>
                      <div className="reg-detail-item-v2 full">
                        <span className="reg-detail-label">Phase</span>
                        <span className="reg-detail-value">{selectedRegDetail.phase || '-'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Referral Node Section */}
              <div className="reg-detail-section">
                <p className="reg-detail-section-title">Authorized Referral Node <span style={{ color: '#ef4444' }}>*</span></p>
                {selectedRegDetail.status === 'Pending' ? (
                  <div className="reg-detail-referral-box">
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        placeholder="Start typing community referral name..."
                        value={adminReferralQuery}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setAdminReferralQuery(val);
                          setAdminReferralValid(false);
                          setAdminReferral('');
                          clearTimeout(adminReferralDebounceRef.current);
                          const trimmedVal = val.trim();
                          if (trimmedVal.length >= 2) {
                            adminReferralDebounceRef.current = setTimeout(async () => {
                              try {
                                const excludeParam = selectedRegDetail.resident_id ? `&excludeId=${selectedRegDetail.resident_id}` : '';
                                const apiUrl = `/api/search-residents?q=${encodeURIComponent(trimmedVal)}${excludeParam}`;
                                const res = await fetch(apiUrl);
                                if (res.status === 429) { _on429Handler?.(); return; }
                                const json = await res.json();
                                const data = json.data || [];
                                const mapped = data.map(p => ({
                                  ...p,
                                  name: `${p.first_name || ''} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name || ''}${p.suffix ? ' ' + p.suffix : ''}`.trim()
                                }));
                                setAdminReferralResults(mapped);
                              } catch (err) {
                                setAdminReferralResults([]);
                              }
                            }, 250);
                          } else {
                            setAdminReferralResults([]);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: adminReferralValid ? '1.5px solid #059669' : '1.5px solid #cbd5e1',
                          outline: 'none',
                          fontSize: '0.88rem',
                          background: adminReferralValid ? '#ecfdf5' : '#ffffff',
                          transition: 'all 0.2s',
                          color: '#0f172a'
                        }}
                        required
                      />
                      {adminReferralValid && (
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          top: '10px',
                          color: '#059669',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          ✓ Node Verified
                        </span>
                      )}
                      {!adminReferralValid && adminReferralResults.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                          maxHeight: '180px',
                          overflowY: 'auto',
                          zIndex: 1000,
                          marginTop: '4px'
                        }}>
                          {adminReferralResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setAdminReferral(p.name);
                                setAdminReferralQuery(p.name);
                                setAdminReferralValid(true);
                                setAdminReferralResults([]);
                              }}
                              style={{
                                width: '100%',
                                padding: '9px 12px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ecfdf5'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{p.name}</strong>
                              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.barangay}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {!adminReferralValid && adminReferralQuery.length >= 2 && adminReferralResults.length === 0 && (
                        <p style={{ margin: '6px 0 0', color: '#ef4444', fontSize: '0.78rem' }}>
                          Zero records found matching this node string in our directory.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="reg-detail-item-v2 full">
                    <span className="reg-detail-value">{selectedRegDetail.referral_name || 'No referral node assigned'}</span>
                  </div>
                )}
              </div>

              {/* Submission Meta Section */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: '0.74rem', color: '#64748b' }}>
                <span>Photo: <strong>{getPhotoSize(selectedRegDetail.photo_url || selectedRegDetail.photo_base64)}</strong></span>
                <span>Submitted: <strong>{new Date(selectedRegDetail.created_at).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" className="btn btn-modal-secondary" onClick={() => { setSelectedRegDetail(null); setRegEditMode(false); }}>Close</button>
                {!regEditMode ? (
                  <button type="button" className="btn btn-modal-primary" style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }} onClick={() => {
                    setRegEditForm({
                      house_no: selectedRegDetail.house_no || '',
                      purok: selectedRegDetail.purok || '',
                      barangay: selectedRegDetail.barangay || '',
                      contact: selectedRegDetail.contact || '',
                      sector_category: selectedRegDetail.sector_category || '',
                      gender: selectedRegDetail.gender || '',
                      civil_status: selectedRegDetail.civil_status || '',
                      birthday: selectedRegDetail.birthday ? (() => { const d = new Date(selectedRegDetail.birthday); return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : '',
                      lot: selectedRegDetail.lot || '',
                      block: selectedRegDetail.block || '',
                      phase: selectedRegDetail.phase || '',
                    });
                    setRegEditMode(true);
                  }}>Edit Details</button>
                ) : (
                  <>
                    <button type="button" className="btn btn-modal-secondary" onClick={() => setRegEditMode(false)}>Cancel</button>
                    <button type="button" className="btn btn-modal-primary" onClick={handleSaveRegEdit} disabled={regEditLoading} style={{ background: '#059669', color: '#ffffff' }}>
                      {regEditLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
                {!regEditMode && (
                  <button type="button" className="btn-delete-ghost" onClick={() => { setDeleteRegId(selectedRegDetail.id); setDeleteRegName(getResidentName(selectedRegDetail)); setShowDeleteRegModal(true); }} title="Delete registration">
                    Delete
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!regEditMode && selectedRegDetail.status === 'Pending' && (
                  <>
                    <button type="button" className="btn btn-reject" onClick={() => { rejectRegistration(selectedRegDetail.id); setSelectedRegDetail(null); }}>
                      Reject
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-approve" 
                      onClick={async () => {
                        const success = await approveRegistration(selectedRegDetail.id, adminReferral);
                        if (success) setSelectedRegDetail(null);
                      }}
                      disabled={!adminReferralValid}
                      style={{ opacity: adminReferralValid ? 1 : 0.5, cursor: adminReferralValid ? 'pointer' : 'not-allowed' }}
                      title={!adminReferralValid ? "Please verify an Authorized Referral Node before approving" : "Approve registration"}
                    >
                      ✓ Approve Registration
                    </button>
                  </>
                )}
                {!regEditMode && selectedRegDetail.status === 'Approved' && (
                  <button type="button" className="btn btn-print" onClick={() => setSelectedRegDetail(null)} style={{ background: '#059669', color: '#ffffff' }}>
                    🖨️ Print Card
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER DETAIL MODAL */}
      {selectedMember && (() => {
        const r = selectedMember.ValidResidents || {};
        const firstName = selectedMember.first_name || r.first_name || '';
        const middleName = selectedMember.middle_name || r.middle_name || '';
        const lastName = selectedMember.last_name || r.last_name || '';
        const suffix = selectedMember.suffix || r.suffix || '';
        const name = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim();
        const hasQR = !!selectedMember.qr_token;
        const hasCardNo = !!selectedMember.em_card_no;
        const sectorOptions = ['Senior Citizens','PWD','Solo Parent','Youth','Women','Farmers','Fisherfolk','Workers / Labor','Religious','Transport','Indigenous People','Education','Business / Entrepreneurs','Health','Other'];
        return (
          <div className="modal-overlay" onClick={() => { setSelectedMember(null); setMemberEditMode(false); }}>
            <div className={`modal-card member-detail-card${showMemberNetwork ? ' network-open' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{memberEditMode ? 'Edit Member' : (showMemberNetwork ? 'Member Network' : 'Member Profile')}</h3>
                <button className="modal-close-x" onClick={() => { setSelectedMember(null); setMemberEditMode(false); setMemberScanHistory([]); setShowMemberNetwork(false); stopEditCamera(); }}>✕</button>
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
                      <h4 className="member-edit-section-title">Photo</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid #cbd5e1' }}>
                          {editMemberForm.photo_url ? (
                            <img key={editMemberForm.photo_url} src={editMemberForm.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <User size={40} color="#94a3b8" />
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                          {!editCameraActive && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              <label className="btn btn-sm btn-edit" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, flex: '1 1 auto', justifyContent: 'center', minWidth: 120 }}>
                                <Upload size={14} /> Upload New Photo
                                <input type="file" accept="image/*" onChange={handleEditPhotoUpload} style={{ display: 'none' }} />
                              </label>
                              <button type="button" className="btn btn-sm btn-edit" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', flex: '1 1 auto', justifyContent: 'center', minWidth: 120 }} onClick={startEditCamera}>
                                <Camera size={14} /> Capture Photo
                              </button>
                              {editMemberForm.photo_url && (
                                <button type="button" className="btn btn-sm" style={{ color: '#dc2626', fontSize: 12, padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, flex: '1 1 auto', justifyContent: 'center', minWidth: 100 }} onClick={() => setEditMemberForm(f => ({ ...f, photo_url: '' }))}>
                                  <Trash2 size={12} /> Remove Photo
                                </button>
                              )}
                            </div>
                          )}
                          {editCameraActive && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                              <div style={{ width: 240, height: 180, background: '#0f172a', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                                <video ref={editVideoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay playsInline muted />
                              </div>
                              <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" className="btn btn-sm" style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 16px' }} onClick={captureEditPhoto}>
                                  <Camera size={14} /> Take Photo
                                </button>
                                <button type="button" className="btn btn-sm" style={{ background: '#e2e8f0', color: '#475569', padding: '8px 16px' }} onClick={stopEditCamera}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <canvas ref={editCanvasRef} style={{ display: 'none' }} />
                    </div>

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
                                <option value="St. James">St. James</option>
                                <option value="St. Vincent">St. Vincent</option>
                                <option value="Nia Road 1">Nia Road 1</option>
                                <option value="Nia Road 2">Nia Road 2</option>
                                <option value="St. Jude">St. Jude</option>
                                <option value="St. Michael">St. Michael</option>
                                <option value="Sto. Niño">Sto. Niño</option>
                                <option value="St. Joseph">St. Joseph</option>
                                <option value="St. Matthew">St. Matthew</option>
                                <option value="Sitio Sapa">Sitio Sapa</option>
                                <option value="Jordan Valley Subdivision">Jordan Valley Subdivision</option>
                                <option value="North Ville 6">North Ville 6</option>
                                <option value="Balagtas Heights">Balagtas Heights</option>
                              </>
                            )}
                            {editMemberForm.purok && ![1,2,3,4,5,6,7].map(String).includes(String(editMemberForm.purok)) && !['North Ville 6','Balagtas Heights',''].includes(editMemberForm.purok) && (
                              <option value={editMemberForm.purok}>{editMemberForm.purok}</option>
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
                          <label>Organization</label>
                          <select value={editMemberForm.organization || ''} onChange={e => setEditMemberForm(f => ({ ...f, organization: e.target.value }))}>
                            <option value="">No Organization</option>
                            {organizations.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
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
                        <div className="member-edit-field" style={{ position: 'relative' }}>
                          <label>Referral Name</label>
                          <input
                            type="text"
                            placeholder="Start typing referral name..."
                            value={editReferralQuery}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditReferralQuery(val);
                              setEditReferralValid(false);
                              clearTimeout(editReferralDebounceRef.current);
                              const trimmedVal = val.trim();
                              if (trimmedVal.length >= 2) {
                                editReferralDebounceRef.current = setTimeout(async () => { // 250ms debounce
                                  try {
                                    // Search approved members
                                    const { data: members } = await supabase
                                      .from('registrations')
                                      .select('id, first_name, middle_name, last_name, suffix')
                                      .eq('status', 'Approved')
                                      .or(`first_name.ilike.%${trimmedVal}%,last_name.ilike.%${trimmedVal}%`)
                                      .limit(10);
                                    // Search registered voters
                                    const { data: voters } = await supabase
                                      .from('ValidResidents')
                                      .select('id, first_name, middle_name, last_name, suffix')
                                      .or(`first_name.ilike.%${trimmedVal}%,last_name.ilike.%${trimmedVal}%`)
                                      .limit(10);
                                    const memberNames = (members || []).map(p => ({
                                      id: `m-${p.id}`,
                                      name: `${p.first_name || ''} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name || ''}${p.suffix ? ' ' + p.suffix : ''}`.trim()
                                    }));
                                    const voterNames = (voters || []).map(p => ({
                                      id: `v-${p.id}`,
                                      name: `${p.first_name || ''} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name || ''}${p.suffix ? ' ' + p.suffix : ''}`.trim()
                                    }));
                                    // Merge and deduplicate by name
                                    const all = [...memberNames, ...voterNames];
                                    const seen = new Set();
                                    const unique = all.filter(item => {
                                      if (seen.has(item.name)) return false;
                                      seen.add(item.name);
                                      return true;
                                    });
                                    setEditReferralResults(unique.slice(0, 10));
                                  } catch (err) {
                                    setEditReferralResults([]);
                                  }
                                }, 250);
                              } else {
                                setEditReferralResults([]);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: editReferralValid ? '2px solid #10b981' : '1px solid rgba(6, 78, 59, 0.15)',
                              outline: 'none',
                              fontSize: '0.92rem',
                              background: editReferralValid ? '#f0fdf4' : '#fff',
                              transition: 'all 0.2s'
                            }}
                          />
                          {editReferralValid && (
                            <span style={{
                              position: 'absolute',
                              right: '12px',
                              top: '38px',
                              color: '#10b981',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              ✓ Verified
                            </span>
                          )}
                          {!editReferralValid && editReferralResults.length > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '10px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              zIndex: 1000,
                              marginTop: '4px'
                            }}>
                              {editReferralResults.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setEditReferralQuery(p.name);
                                    setEditReferralValid(true);
                                    setEditReferralResults([]);
                                    setEditMemberForm(f => ({ ...f, referral_name: p.name }));
                                  }}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '10px 14px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    borderBottom: '1px solid #f3f4f6',
                                    color: '#111'
                                  }}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                          {!editReferralValid && editReferralQuery.length >= 2 && editReferralResults.length === 0 && (
                            <p style={{ margin: '4px 0 0', color: '#ef4444', fontSize: '0.8rem' }}>
                              No matching referrals found.
                            </p>
                          )}
                        </div>
                        <div className="member-edit-field">
                          <label>Birthday</label>
                          <input type="date" value={editMemberForm.birthday} onChange={e => setEditMemberForm(f => ({ ...f, birthday: e.target.value }))} />
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

                    {/* Top: Photo + Name + Badges */}
                    <div className="member-detail-top">
                      <div className="member-detail-photo">
                        {(selectedMember.photo_url || selectedMember.photo_base64) ? <img src={selectedMember.photo_url || selectedMember.photo_base64} alt="" /> : <User size={40} color="#94a3b8" />}
                      </div>
                      <div className="member-detail-head">
                        <h2>{name}</h2>
                        <div className="member-detail-badges">
                          <span className="member-detail-status"><CheckCircle size={12} /> Approved Member</span>
                          {selectedMember.printed_at ? (
                            <span className="member-detail-printed printed"><Printer size={12} /> ID Printed · {new Date(selectedMember.printed_at).toLocaleDateString()}</span>
                          ) : (
                            <span className="member-detail-printed not-printed">ID Not Printed</span>
                          )}
                        </div>
                        <div className="member-detail-ids">
                          {hasCardNo && (
                            <span className="member-id-chip"><CreditCard size={11} /> {selectedMember.em_card_no}</span>
                          )}
                          {selectedMember.reference_no && (
                            <span className="member-id-chip ref"><Hash size={11} /> {selectedMember.reference_no}</span>
                          )}
                        </div>
                        <div className="member-detail-quick-actions">
                          <button className="btn btn-sm btn-edit" onClick={() => openEditMember(selectedMember)}><Pencil size={13} strokeWidth={2.5} /> Edit</button>
                          <button className="btn btn-sm btn-export" onClick={() => exportMemberExcel(selectedMember)}><Download size={13} strokeWidth={2.5} /> Export</button>
                          <button className="btn btn-sm btn-print" onClick={() => { setShowPrintModal(true); setIdCardSide('front'); }}><Printer size={13} strokeWidth={2.5} /> Print ID</button>
                        </div>
                      </div>
                    </div>

                    {/* Precinct Hero Box */}
                    {(r.precinct || selectedMember.precinct) && (
                      <div className="member-precinct-hero">
                        <div className="member-precinct-hero-inner">
                          <div className="member-precinct-hero-label">
                            <Hash size={13} /> Precinct No.
                          </div>
                          <div className="member-precinct-hero-number">
                            {r.precinct || selectedMember.precinct}
                          </div>
                          <div className="member-precinct-hero-sub">Registered Voter</div>
                        </div>
                        <div className="member-precinct-hero-divider" />
                        <div className="member-precinct-hero-extra">
                          <div className="member-precinct-hero-stat">
                            <span className="mph-stat-label"><ScanLine size={11} /> Total Scans</span>
                            <span className="mph-stat-value">{selectedMember.scan_count || 0}</span>
                          </div>
                          <div className="member-precinct-hero-stat">
                            <span className="mph-stat-label"><Calendar size={11} /> Joined</span>
                            <span className="mph-stat-value">{new Date(selectedMember.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Key Info Strip */}
                    <div className="member-info-strip">
                      <div className="member-info-strip-item">
                        <span className="mis-label"><Tag size={10} /> Sector</span>
                        <span className="mis-value">{selectedMember.sector_category || '-'}</span>
                      </div>
                      <div className="member-info-strip-sep" />
                      <div className="member-info-strip-item">
                        <span className="mis-label"><Phone size={10} /> Contact</span>
                        <span className="mis-value">{selectedMember.contact || '-'}</span>
                      </div>
                      <div className="member-info-strip-sep" />
                      <div className="member-info-strip-item">
                        <span className="mis-label"><MapPin size={10} /> Barangay</span>
                        <span className="mis-value">{selectedMember.barangay || r.barangay || '-'}</span>
                      </div>
                      <div className="member-info-strip-sep" />
                      <div className="member-info-strip-item">
                        <span className="mis-label"><Building size={10} /> Purok</span>
                        <span className="mis-value">{selectedMember.purok ? (SUBDIVISION_PUROKS.includes(selectedMember.purok) ? selectedMember.purok : `Purok ${selectedMember.purok}`) : '-'}</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="member-detail-grid">
                      {!SUBDIVISION_PUROKS.includes(selectedMember.purok) && (
                        <div className="member-detail-item"><span className="member-detail-label"><Home size={11} style={{marginRight:3, verticalAlign:'text-bottom'}} /> House No</span><span className="member-detail-value">{selectedMember.house_no || '-'}</span></div>
                      )}
                      {SUBDIVISION_PUROKS.includes(selectedMember.purok) && (
                        <>
                          <div className="member-detail-item"><span className="member-detail-label">Lot</span><span className="member-detail-value">{selectedMember.lot || '-'}</span></div>
                          <div className="member-detail-item"><span className="member-detail-label">Block</span><span className="member-detail-value">{selectedMember.block || '-'}</span></div>
                          <div className="member-detail-item"><span className="member-detail-label">Phase</span><span className="member-detail-value">{selectedMember.phase || '-'}</span></div>
                        </>
                      )}
                      <div className="member-detail-item"><span className="member-detail-label"><Shield size={11} style={{marginRight:3, verticalAlign:'text-bottom'}} /> Suffix</span><span className="member-detail-value">{r.suffix || selectedMember.suffix || '-'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><Cake size={11} style={{marginRight:3, verticalAlign:'text-bottom'}} /> Birthday</span><span className="member-detail-value">{selectedMember.birthday ? (() => { const raw = selectedMember.birthday.trim(); const d = new Date(raw); return isNaN(d.getTime()) ? raw : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); })() : '-'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><User size={11} style={{marginRight:3, verticalAlign:'text-bottom'}} /> Gender</span><span className="member-detail-value">{selectedMember.gender || '-'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><HeartHandshake size={11} style={{marginRight:3, verticalAlign:'text-bottom'}} /> Civil Status</span><span className="member-detail-value">{selectedMember.civil_status || '-'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><UserCheck size={11} style={{marginRight:3, verticalAlign:'text-bottom'}} /> Voter Status</span><span className="member-detail-value" style={{ fontWeight: 600, color: selectedMember.is_valid_resident ? '#059669' : '#f59e0b' }}>{selectedMember.is_valid_resident ? 'Registered Voter' : 'Non-registered'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><UserCheck size={11} style={{marginRight:3, verticalAlign:'text-bottom'}} /> Referral</span>
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
                      <div className="member-detail-item"><span className="member-detail-label"><Printer size={11} style={{marginRight:3, verticalAlign:'text-bottom'}} /> Print Status</span><span className="member-detail-value" style={{ color: selectedMember.printed_at ? '#059669' : '#dc2626', fontWeight: 600 }}>{selectedMember.printed_at ? `Printed · ${new Date(selectedMember.printed_at).toLocaleDateString()}` : 'Not Printed'}</span></div>
                      <div className="member-detail-item"><span className="member-detail-label"><Clock size={11} style={{marginRight:3, verticalAlign:'text-bottom'}} /> Last Scanned</span><span className="member-detail-value">{selectedMember.last_scanned_at ? new Date(selectedMember.last_scanned_at).toLocaleString() : 'Never'}</span></div>
                    </div>

                    {/* QR Section */}
                    <div className="member-detail-qr-section">
                      <span className="member-detail-label"><QrCode size={13} style={{marginRight:4, verticalAlign:'text-bottom'}} /> QR Scan Token</span>
                      {hasQR ? (
                        <>
                          <code className="member-qr-big">{selectedMember.qr_token}</code>
                          <div className="member-qr-image">
                            <QRCodeSVG value={`https://www.em-card.com/card/${selectedMember.qr_token}`} size={140} level="H" includeMargin={true} />
                          </div>
                          <p className="member-qr-hint"><ScanLine size={13} style={{marginRight:4, verticalAlign:'text-bottom'}} /> Scan → <strong>https://www.em-card.com/card/{selectedMember.qr_token}</strong></p>
                        </>
                      ) : (
                        <div className="member-qr-missing">
                          <span>No QR token generated yet.</span>
                          <button className="btn btn-generate-qr" onClick={() => generateQRForMember(selectedMember)}>
                            <Zap size={16} /> Generate QR & Card
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {hasQR && (
                      <div className="member-detail-links">
                        <a href={`https://www.em-card.com/card/${selectedMember.qr_token}`} target="_blank" rel="noreferrer" className="btn btn-member-link"><Globe size={16} /> Open Citizen Dashboard</a>
                        <button className="btn btn-member-copy" onClick={() => { navigator.clipboard.writeText(`https://www.em-card.com/card/${selectedMember.qr_token}`); showToast('Card URL copied!', 'success'); }}><Link2 size={16} /> Copy Card URL</button>
                      </div>
                    )}

                    {/* Scan History */}
                    <div className="member-scan-history">
                      <h4 className="member-scan-history-title"><ScanLine size={13} style={{marginRight:6, verticalAlign:'text-bottom'}} /> Scan History</h4>
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
        const firstName = selectedMember.first_name || r.first_name || '';
        const middleName = selectedMember.middle_name || r.middle_name || '';
        const lastName = selectedMember.last_name || r.last_name || '';
        const suffix = selectedMember.suffix || r.suffix || '';
        const name = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim().toUpperCase();
        const purokLabel = selectedMember.purok ? (SUBDIVISION_PUROKS.includes(selectedMember.purok) ? selectedMember.purok.toUpperCase() : `PUROK ${selectedMember.purok}`) : '';
        const lotBlockPhase = SUBDIVISION_PUROKS.includes(selectedMember.purok) ? `Lot ${selectedMember.lot || ''} Block ${selectedMember.block || ''} Phase ${selectedMember.phase || ''}` : '';
        const barangay = (selectedMember.barangay || r.barangay) ? `${(selectedMember.barangay || r.barangay).toUpperCase()}, ` : '';
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

      {/* ADD MEMBER TO ORG MODAL */}
      {showAddOrgMemberModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => { setShowAddOrgMemberModal(null); setOrgMemberSearch(''); }}>
          <div className="modal-card" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Add Member to {showAddOrgMemberModal}</h3>
              <button className="modal-close-x" onClick={() => { setShowAddOrgMemberModal(null); setOrgMemberSearch(''); }}><X size={20} /></button>
            </div>
            <div className="modal-form" style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>Search Existing Member</label>
                <div className="search-bar" style={{ marginBottom: 12 }}>
                  <Search size={18} />
                  <input type="text" placeholder="Search by name..." value={orgMemberSearch} onChange={e => setOrgMemberSearch(e.target.value)} autoFocus style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none' }} />
                </div>
              </div>
              <div className="org-member-search-results" style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                {orgMemberSearch.length < 2 ? (
                  <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '30px 0', margin: 0 }}>Type at least 2 characters to search...</p>
                ) : (
                  (() => {
                    const q = orgMemberSearch.toLowerCase();
                    const results = allRegs.filter(r => 
                      ((r.first_name || '') + ' ' + (r.last_name || '')).toLowerCase().includes(q) &&
                      r.organization !== showAddOrgMemberModal
                    ).slice(0, 20);
                    
                    if (results.length === 0) return <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '30px 0', margin: 0 }}>No available members found.</p>;
                    
                    return results.map(reg => (
                      <div key={reg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <strong style={{ display: 'block', color: '#1e293b', fontSize: '0.95rem' }}>{`${reg.last_name || ''}, ${reg.first_name || ''}`}</strong>
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{reg.barangay || 'No Barangay'} {reg.organization ? `(Currently: ${reg.organization})` : ''}</span>
                        </div>
                        <button className="btn btn-sm btn-primary" onClick={async () => {
                          try {
                            const { error } = await supabase.from('registrations').update({ organization: showAddOrgMemberModal }).eq('id', reg.id);
                            if (error) throw error;
                            showToast('Member assigned to organization', 'success');
                            fetchAllRegistrations(); // refresh
                            setOrgMemberSearch('');
                            setShowAddOrgMemberModal(null);
                          } catch (err) {
                            showToast('Failed to assign member', 'error');
                          }
                        }}>Add</button>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-modal-secondary" onClick={() => { setShowAddOrgMemberModal(null); setOrgMemberSearch(''); }}>Close</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ORG DETAILS MODAL */}
      {showOrgDetailsModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowOrgDetailsModal(null)}>
          <div className="modal-card modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{showOrgDetailsModal} Members</h3>
              <button className="modal-close-x" onClick={() => setShowOrgDetailsModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-form" style={{ padding: '0', flex: 1, overflowY: 'auto', maxHeight: '60vh' }}>
              {(() => {
                const orgMembers = allRegs.filter(r => r.organization === showOrgDetailsModal);
                if (orgMembers.length === 0) {
                  return <div className="table-empty" style={{ margin: 20 }}>No members in this organization yet.</div>;
                }
                return (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Barangay</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgMembers.map(reg => (
                        <tr key={reg.id}>
                          <td><strong>{`${reg.last_name || ''}, ${reg.first_name || ''}`}</strong></td>
                          <td>{reg.barangay}</td>
                          <td>
                            <span className={`status-badge status-${reg.status.toLowerCase()}`}>{reg.status}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-sm btn-danger" onClick={async () => {
                              try {
                                const { error } = await supabase.from('registrations').update({ organization: null }).eq('id', reg.id);
                                if (error) throw error;
                                showToast('Member removed from organization', 'success');
                                fetchAllRegistrations();
                              } catch(err) {
                                showToast('Failed to remove member', 'error');
                              }
                            }}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-modal-secondary" onClick={() => setShowOrgDetailsModal(null)}>Close</button>
              <button className="btn btn-modal-primary" onClick={() => {
                setShowAddOrgMemberModal(showOrgDetailsModal);
                setOrgMemberSearch('');
                setShowOrgDetailsModal(null);
              }}>+ Add Member</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* CREATE ORG MODAL */}
      {showCreateOrgModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowCreateOrgModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create Organization</h3>
              <button className="modal-close-x" onClick={() => setShowCreateOrgModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-form" style={{ padding: '20px 24px' }}>
              <div className="form-group">
                <label>Organization Name</label>
                <input type="text" value={createOrgName} onChange={e => setCreateOrgName(e.target.value)} placeholder="e.g. Red Cross" autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-modal-secondary" onClick={() => setShowCreateOrgModal(false)}>Cancel</button>
              <button className="btn btn-modal-primary" disabled={!createOrgName.trim()} onClick={async () => {
                try {
                  const { error } = await supabase.from('organizations').insert([{ name: createOrgName.trim() }]);
                  if (error) throw error;
                  showToast('Organization created', 'success');
                  fetchOrganizations();
                  setShowCreateOrgModal(false);
                  setCreateOrgName('');
                } catch(err) {
                  showToast(err.message || 'Failed to create', 'error');
                }
              }}>Create</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* EDIT ORG MODAL */}
      {showEditOrgModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowEditOrgModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Edit Organization</h3>
              <button className="modal-close-x" onClick={() => setShowEditOrgModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-form" style={{ padding: '20px 24px' }}>
              <div className="form-group">
                <label>Organization Name</label>
                <input type="text" value={editOrgName} onChange={e => setEditOrgName(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-modal-secondary" onClick={() => setShowEditOrgModal(null)}>Cancel</button>
              <button className="btn btn-modal-primary" disabled={!editOrgName.trim()} onClick={async () => {
                try {
                  const newName = editOrgName.trim();
                  if (newName === showEditOrgModal.name) {
                    setShowEditOrgModal(null);
                    return;
                  }
                  const { error } = await supabase.from('organizations').update({ name: newName }).eq('id', showEditOrgModal.id);
                  if (error) throw error;
                  // Cascade update to registrations
                  await supabase.from('registrations').update({ organization: newName }).eq('organization', showEditOrgModal.name);
                  showToast('Organization renamed successfully', 'success');
                  fetchOrganizations();
                  fetchAllRegistrations(); // refresh members
                  setShowEditOrgModal(null);
                } catch(err) {
                  showToast(err.message || 'Failed to rename', 'error');
                }
              }}>Save Changes</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* DELETE ORG MODAL */}
      {showDeleteOrgModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" onClick={() => setShowDeleteOrgModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#dc2626' }}>Delete Organization</h3>
              <button className="modal-close-x" onClick={() => setShowDeleteOrgModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-form" style={{ padding: '20px 24px' }}>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{showDeleteOrgModal.name}</strong>?
                <br /><br />
                This will also remove the organization tag from all assigned members. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-modal-secondary" onClick={() => setShowDeleteOrgModal(null)}>Cancel</button>
              <button className="btn btn-modal-danger" style={{ background: '#dc2626', color: '#fff' }} onClick={async () => {
                try {
                  const { error } = await supabase.from('organizations').delete().eq('id', showDeleteOrgModal.id);
                  if (error) throw error;
                  // Cascade remove from registrations
                  await supabase.from('registrations').update({ organization: null }).eq('organization', showDeleteOrgModal.name);
                  showToast('Organization deleted', 'success');
                  fetchOrganizations();
                  fetchAllRegistrations(); // refresh members
                  setShowDeleteOrgModal(null);
                } catch(err) {
                  showToast(err.message || 'Failed to delete', 'error');
                }
              }}>Delete</button>
            </div>
          </div>
        </div>, document.body
      )}

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
                            <h4 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word' }}>{scanQrResult.member.name}</h4>
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
                            <h4 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, wordBreak: 'break-word' }}>{scanQrResult.member.name}</h4>
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
