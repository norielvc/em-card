'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { generatePerceptualFaceToken } from '../../lib/biometrics';
import {
  Camera, Clock, Calendar, CheckCircle2, AlertCircle, Sparkles,
  MapPin, ShieldCheck, RefreshCw, Navigation, AlertTriangle,
  LogOut, UserCheck, Users, ArrowRight, Zap, Check, ChevronRight,
  RotateCcw, Volume2
} from 'lucide-react';

// ── Haversine Distance Formula in Meters ──
function computeDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Fallback default offices if table is empty or loading
const DEFAULT_OFFICES = [
  {
    id: 'off-hq-01',
    name: 'Main Executive Headquarters',
    code: 'HQ-MAIN',
    address: 'Metropolitan Operations Complex, Metro Manila',
    latitude: 14.6175,
    longitude: 121.0124,
    radius_meters: 150,
    status: 'active',
  },
  {
    id: 'off-east-02',
    name: 'East District Field Hub',
    code: 'DIST-EAST',
    address: 'East Operations Center, Rizal District',
    latitude: 14.5833,
    longitude: 121.0667,
    radius_meters: 250,
    status: 'active',
  },
];

export default function PublicEmployeeScannerPage() {
  // ── Camera & Media States ──
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' | 'environment'
  const [cameraError, setCameraError] = useState('');
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sampleCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const consecutiveMissesRef = useRef(0);

  // ── GPS Geolocation States ──
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsAddress, setGpsAddress] = useState('Acquiring Satellite GPS...');
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState('');

  // ── Punch Mode & Action States ──
  const [punchMode, setPunchMode] = useState('auto'); // 'auto' | 'time_in' | 'time_out'
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Directory & Live Feed ──
  const [employees, setEmployees] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [offices, setOffices] = useState([]);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // ── Audio Feedback Synthesizer ──
  const playTone = useCallback((freq = 520, duration = 0.08, type = 'sine') => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }, []);

  // ── Toast Helper ──
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Live Clock Tick (Philippines Standard Time UTC+8) ──
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setCurrentDate(now.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Fetch Initial Public Directory Data ──
  const loadPublicData = useCallback(async () => {
    try {
      const res = await fetch('/api/employee/scan');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees || []);
        setRecentLogs(data.recent_logs || []);
        let officeList = data.offices || [];
        try {
          const localOverrides = JSON.parse(localStorage.getItem('emcard_finance_offices_override') || '{}');
          if (localOverrides && Object.keys(localOverrides).length > 0) {
            officeList = officeList.map(o => {
              const ov = localOverrides[o.id] || localOverrides[o.code];
              if (ov) return { ...o, ...ov };
              return o;
            });
          }
        } catch (e) {
          // ignore
        }
        setOffices(officeList);
      }
    } catch (err) {
      console.warn('Error fetching public directory:', err);
    }
  }, []);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  // ── Reverse Geocode GPS Coordinates ──
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: { 'User-Agent': 'EM-Card-Biometric-Kiosk/2.0' }
      });
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        const shortAddr = parts.slice(0, 3).join(',').trim();
        setGpsAddress(shortAddr || `Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`);
      } else {
        setGpsAddress(`Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`);
      }
    } catch (e) {
      setGpsAddress(`Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`);
    }
  };

  // ── Fetch GPS Location ──
  const fetchLocation = useCallback(() => {
    setGpsLoading(true);
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by browser.');
      setGpsAddress('GPS Geolocation Not Supported');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsLocation({
          latitude: lat,
          longitude: lng,
          accuracy: pos.coords.accuracy
        });
        reverseGeocode(lat, lng);
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setGpsError('Satellite GPS permission pending or blocked.');
        setGpsAddress('GPS Standby (Permission Pending)');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // ── Geofence Range Evaluation against Registered Office Locations ──
  const geofenceInfo = useMemo(() => {
    const officePool = offices && offices.length > 0 ? offices : DEFAULT_OFFICES;
    const activeOffices = officePool.filter(o => o.status === 'active');

    // 1. If ALL offices in the system are disabled / inactive by admin
    if (activeOffices.length === 0) {
      return {
        hasOffices: true,
        isWithinRange: false,
        nearestOffice: null,
        distanceMeters: null,
        allowedRadius: null,
        status: 'all_disabled',
        message: 'All office locations are currently disabled by administration. Face recognition is suspended.',
      };
    }

    // 2. While acquiring GPS satellite coordinates
    if (gpsLoading) {
      return {
        hasOffices: true,
        isWithinRange: false,
        nearestOffice: null,
        distanceMeters: null,
        allowedRadius: null,
        status: 'acquiring',
        message: 'Acquiring high-accuracy satellite GPS fix...',
      };
    }

    // 3. If GPS is unavailable / permission denied / no coords
    if (gpsError || !gpsLocation?.latitude || !gpsLocation?.longitude) {
      return {
        hasOffices: true,
        isWithinRange: false,
        nearestOffice: null,
        distanceMeters: null,
        allowedRadius: null,
        status: 'no_gps',
        message: 'Satellite GPS location is required to verify office perimeter before face recognition can scan.',
      };
    }

    // 4. Calculate distance to nearest ACTIVE office
    let minDistance = Infinity;
    let closestOffice = null;

    for (const off of activeOffices) {
      if (off.latitude && off.longitude) {
        const d = computeDistanceMeters(
          gpsLocation.latitude,
          gpsLocation.longitude,
          parseFloat(off.latitude),
          parseFloat(off.longitude)
        );
        if (d < minDistance) {
          minDistance = d;
          closestOffice = off;
        }
      }
    }

    if (!closestOffice) {
      return {
        hasOffices: true,
        isWithinRange: false,
        nearestOffice: null,
        distanceMeters: null,
        allowedRadius: null,
        status: 'all_disabled',
        message: 'No active office coordinates configured.',
      };
    }

    const allowedRadius = parseInt(closestOffice.radius_meters, 10) || 100;
    const isWithin = minDistance <= allowedRadius;

    return {
      hasOffices: true,
      isWithinRange: isWithin,
      nearestOffice: closestOffice,
      distanceMeters: minDistance,
      allowedRadius,
      status: isWithin ? 'in_range' : 'out_of_range',
      message: isWithin
        ? `Within ${closestOffice.name} perimeter (${minDistance}m / ${allowedRadius}m radius)`
        : `Outside ${closestOffice.name} perimeter (${minDistance >= 1000 ? (minDistance / 1000).toFixed(1) + 'km' : minDistance + 'm'} away · Max allowed: ${allowedRadius}m)`,
    };
  }, [offices, gpsLocation, gpsLoading, gpsError]);

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
          if (face.width >= vW * 0.10) return true;
        }
      } catch (e) {
        // Fallback to pixel analysis below
      }
    }

    // 2. Multi-Spectral Academic YCbCr + RGB Universal Human Skin Tone Detection
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

      // Sample central 75% oval region where the employee's head/face aligns
      const startX = Math.floor(sW * 0.12);
      const startY = Math.floor(sH * 0.08);
      const sampleW = Math.floor(sW * 0.76);
      const sampleH = Math.floor(sH * 0.84);

      const imgData = sCtx.getImageData(startX, startY, sampleW, sampleH);
      const d = imgData.data;
      let skinPixels = 0;
      const totalPixels = d.length / 4;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        // Academic YCbCr skin chrominance space (works across all skin tones and mixed lighting)
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isYCbCr = cr >= 130 && cr <= 178 && cb >= 75 && cb <= 142;
        const isRgbSkin = r > 30 && g > 20 && b > 15 && (r >= g || (g - r) < 20) && (r > b || (b - r) < 25);
        const isWarmTone = r > 45 && g > 30 && b > 20 && Math.abs(r - g) < 50;

        if (isYCbCr || isRgbSkin || isWarmTone) {
          skinPixels++;
        }
      }

      const ratio = skinPixels / totalPixels;
      return ratio >= 0.06;
    } catch (err) {
      return false;
    }
  }, []);

  // ── Camera Lifecycle ──
  const startCamera = useCallback(async (facing = cameraFacing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (errFacing) {
        console.warn('Ideal HD constraints failed, using generic video stream:', errFacing);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play error:', playErr);
        }
      }
      setCameraActive(true);
      setCameraError('');
      fetchLocation();
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access is blocked. Please tap the lock/camera icon in your address bar, allow permissions, and click Reload.');
      } else if (err.name === 'NotReadableError' || err.message?.includes('Could not start video source')) {
        setCameraError('Webcam is locked by another tab (e.g. /finance kiosk) or app. Please close other camera tabs/apps and tap "Retry Camera".');
      } else {
        setCameraError('Camera device not found or already in use.');
      }
    }
  }, [cameraFacing, fetchLocation]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const toggleCameraFacing = () => {
    const next = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(next);
    startCamera(next);
  };

  // Manage visibility to release webcam lock on tab switch
  useEffect(() => {
    startCamera();

    const handleVisibility = () => {
      if (document.hidden) {
        stopCamera();
      } else {
        startCamera();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // ── Real-Time Face Presence Detection Poller with Hysteresis Stability ──
  useEffect(() => {
    if (!cameraActive || scanResult || scanning || gpsLoading || !gpsLocation || !geofenceInfo.isWithinRange) {
      setFaceDetected(false);
      consecutiveMissesRef.current = 0;
      return;
    }
    const interval = setInterval(async () => {
      if (videoRef.current && !scanResult && !scanning && !gpsLoading && gpsLocation && geofenceInfo.isWithinRange) {
        const detected = await detectFaceInVideo(videoRef.current);
        if (detected) {
          consecutiveMissesRef.current = 0;
          setFaceDetected(true);
        } else {
          consecutiveMissesRef.current += 1;
          // Maintain face detection lock across minor frame dips (requires 4 consecutive misses / ~1.1s to drop)
          if (consecutiveMissesRef.current >= 4) {
            setFaceDetected(false);
          }
        }
      } else {
        setFaceDetected(false);
        consecutiveMissesRef.current = 0;
      }
    }, 280);
    return () => clearInterval(interval);
  }, [cameraActive, scanResult, scanning, gpsLoading, gpsLocation, geofenceInfo.isWithinRange, detectFaceInVideo]);

  // ── Acknowledge & Reset State for Next Employee ──
  const acknowledgeAndReset = useCallback(() => {
    setScanResult(null);
    setSelectedEmpId('');
    setCountdown(null);
    setFaceDetected(false);
  }, []);

  // ── Execute Biometric Attendance Punch ──
  const handlePerformScan = useCallback(async (forcedMode = punchMode) => {
    if (scanning) return;

    // Strict Location Check Before Scanning
    if (!geofenceInfo.isWithinRange) {
      const errReason = geofenceInfo.status === 'all_disabled'
        ? 'All office geofences are disabled by administration. Attendance punch is suspended.'
        : geofenceInfo.status === 'out_of_range'
        ? `Location Restricted: You are ${geofenceInfo.distanceMeters >= 1000 ? (geofenceInfo.distanceMeters / 1000).toFixed(1) + 'km' : geofenceInfo.distanceMeters + 'm'} away from ${geofenceInfo.nearestOffice?.name || 'the office'}. You must be within ${geofenceInfo.allowedRadius}m to punch attendance.`
        : geofenceInfo.status === 'acquiring'
        ? 'Acquiring satellite GPS coordinates. Please wait for GPS confirmation before scanning.'
        : 'Satellite GPS location is required to verify that you are within the office perimeter.';
      showToast(errReason, 'error');
      playTone(320, 0.25, 'sawtooth');
      return;
    }

    setScanning(true);
    setCameraError('');

    // Capture optimized frame snapshot from video element
    let imageBase64 = null;
    let scanFaceToken = null;
    if (videoRef.current && cameraActive) {
      try {
        const canvas = canvasRef.current || document.createElement('canvas');
        const vW = videoRef.current.videoWidth || 640;
        const vH = videoRef.current.videoHeight || 480;
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(vW, vH));
        canvas.width = Math.round(vW * scale);
        canvas.height = Math.round(vH * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        imageBase64 = canvas.toDataURL('image/jpeg', 0.75);
        scanFaceToken = generatePerceptualFaceToken(canvas);
      } catch (err) {
        console.warn('Could not capture frame snapshot:', err);
      }
    }

    try {
      const res = await fetch('/api/employee/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          face_token: scanFaceToken,
          mode: forcedMode,
          latitude: gpsLocation?.latitude || null,
          longitude: gpsLocation?.longitude || null,
          location: gpsAddress || 'Terminal Geolocation',
          employee_id: selectedEmpId || null
        })
      });

      const json = await res.json();
      if (!json.success) {
        showToast(json.error || 'Face not recognized. Please align inside the oval guide.', 'error');
        playTone(320, 0.25, 'sawtooth');
        setScanning(false);
        return;
      }

      playTone(587, 0.1, 'sine');
      setTimeout(() => playTone(880, 0.2, 'triangle'), 120);

      setScanResult({
        ...json,
        snapshot: imageBase64
      });

      loadPublicData();
    } catch (err) {
      showToast(err.message || 'Server connection error.', 'error');
      playTone(320, 0.25, 'sawtooth');
    } finally {
      setScanning(false);
    }
  }, [scanning, cameraActive, punchMode, gpsLocation, gpsAddress, selectedEmpId, geofenceInfo, playTone, loadPublicData]);

  // Keep ref for auto-punch countdown callback
  const handlePerformScanRef = useRef(null);
  useEffect(() => {
    handlePerformScanRef.current = handlePerformScan;
  }, [handlePerformScan]);

  // ── Auto-Punch Countdown Timer (Triggers ONLY when GPS is locked, Within Range, Face Detected) ──
  useEffect(() => {
    // If not within office range or camera inactive or autoScan disabled or result showing or scanning or GPS loading or no coords: cancel countdown immediately!
    if (!cameraActive || !autoScanEnabled || scanResult || scanning || !geofenceInfo.isWithinRange || gpsLoading || !gpsLocation?.latitude) {
      setCountdown(null);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    if (!faceDetected) {
      setCountdown(null);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    // Start 2-second countdown ONLY when inside office perimeter & GPS confirmed
    setCountdown(2);
    playTone(520, 0.08);

    let sec = 2;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      sec -= 1;
      if (sec > 0) {
        setCountdown(sec);
        playTone(sec === 1 ? 660 : 520, 0.08);
      } else if (sec === 0) {
        setCountdown(0);
        if (handlePerformScanRef.current) {
          handlePerformScanRef.current();
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
  }, [cameraActive, autoScanEnabled, faceDetected, scanResult, scanning, geofenceInfo.isWithinRange, gpsLoading, gpsLocation, playTone]);

  // Filtered recent logs
  const filteredLogs = recentLogs.filter(log => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    const name = `${log.employees?.first_name || ''} ${log.employees?.last_name || ''}`.toLowerCase();
    const id = (log.employee_id || '').toLowerCase();
    const dept = (log.employees?.department || '').toLowerCase();
    return name.includes(q) || id.includes(q) || dept.includes(q);
  });

  return (
    <div className="pub-scanner-viewport">
      {/* Toast Notification */}
      {toast && (
        <div className={`emp-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="pub-scanner-header">
        <div className="pub-header-inner">
          <div className="pub-brand-box">
            <div className="pub-emblem">
              <ShieldCheck size={22} className="emerald" />
            </div>
            <div>
              <h2>EM-Card Public Face Scanner</h2>
              <p>Official Employee Biometric Time In / Out Terminal</p>
            </div>
          </div>

          <div className="pub-header-time-pill">
            <Clock size={15} className="emerald" />
            <div className="pub-time-clock mono">{currentTime || '--:--:--'}</div>
          </div>
        </div>
      </header>

      {/* Main Kiosk Container (Responsive 2-Column Desktop / Tablet & 1-Column Mobile) */}
      <main className="pub-main-container">
        <div className="pub-scanner-card">
          <div className="pub-scanner-grid">
            {/* ── Left Column: High-Tech Viewport & Camera Controls ── */}
            <div className="pub-grid-camera">
              <div className="kiosk-viewport-wrap">
                {/* 1080p Ultra-HD Quality Pill */}
                <div className="cam-quality-pill">
                  <span className="cam-quality-dot" />
                  <span>1080p Ultra-HD Biometric Scanner</span>
                </div>

                {/* Auto-Punch Countdown Overlay */}
                {countdown !== null && countdown > 0 && autoScanEnabled && !scanResult && !scanning && !gpsLoading && gpsLocation && geofenceInfo.isWithinRange && (
                  <div className="cam-countdown-overlay">
                    <div className="cam-countdown-number">{countdown}</div>
                    <div className="cam-countdown-sub">Hold Still · Auto-Punching</div>
                  </div>
                )}

                {/* Biometric AI Facial Processing & Neural Vector Match Overlay */}
                {scanning && (
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

                {/* Live Video Stream */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`kiosk-video ${cameraFacing === 'user' ? 'mirrored' : ''}`}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Animated Laser Scanning Beam */}
                {!scanning && <div className="kiosk-laser-line" />}

                {/* Smooth Oval Cutout SVG Mask with Dynamic Glowing Border */}
                <svg className="kiosk-oval-svg" viewBox="0 0 400 300" preserveAspectRatio="none">
                  <defs>
                    <mask id="empKioskMask">
                      <rect width="400" height="300" fill="#ffffff" />
                      <ellipse cx="200" cy="145" rx="88" ry="118" fill="#000000" />
                    </mask>
                  </defs>
                  <rect width="400" height="300" fill="rgba(2, 6, 23, 0.45)" mask="url(#empKioskMask)" />
                  <ellipse
                    cx="200"
                    cy="145"
                    rx="88"
                    ry="118"
                    fill="none"
                    stroke={
                      !geofenceInfo.isWithinRange
                        ? (geofenceInfo.status === 'out_of_range' || geofenceInfo.status === 'all_disabled' ? '#ef4444' : '#f59e0b')
                        : cameraError
                        ? '#ef4444'
                        : scanning
                        ? '#06b6d4'
                        : scanResult
                        ? '#10b981'
                        : faceDetected
                        ? '#10b981'
                        : '#38bdf8'
                    }
                    strokeWidth={!geofenceInfo.isWithinRange ? '2.5' : scanning || faceDetected || scanResult ? '3' : '2'}
                    strokeDasharray={!geofenceInfo.isWithinRange ? '4 4' : scanning || faceDetected || scanResult ? 'none' : '6 4'}
                  />
                </svg>

                {/* Floating Bottom Status Pill */}
                <div className="kiosk-status-pill">
                  <span className={!geofenceInfo.isWithinRange || cameraError ? 'error' : faceDetected || scanResult ? '' : 'waiting'}>
                    <div
                      className="kiosk-pulse-dot"
                      style={{
                        background: !geofenceInfo.isWithinRange
                          ? (geofenceInfo.status === 'out_of_range' || geofenceInfo.status === 'all_disabled' ? '#ef4444' : '#f59e0b')
                          : cameraError
                          ? '#ef4444'
                          : scanResult || faceDetected
                          ? '#10b981'
                          : '#38bdf8',
                      }}
                    />
                    {scanning
                      ? 'Matching Facial Geometrics...'
                      : cameraError
                      ? 'Camera / Biometric Standby'
                      : gpsLoading
                      ? '🛰️ Acquiring GPS Satellite Signal...'
                      : !gpsLocation
                      ? '📍 GPS Location Required to Verify Office Perimeter'
                      : !geofenceInfo.isWithinRange
                      ? geofenceInfo.status === 'all_disabled'
                        ? '🔒 All Offices Disabled by Admin · Face Scan Locked'
                        : `📍 Out of Office Range (${geofenceInfo.distanceMeters >= 1000 ? (geofenceInfo.distanceMeters / 1000).toFixed(1) + 'km' : geofenceInfo.distanceMeters + 'm'} away) · Face Scan Locked`
                      : scanResult
                      ? 'Biometrics Verified!'
                      : autoScanEnabled
                      ? faceDetected && countdown !== null
                        ? `Face Locked · Auto-Punching in ${countdown}s...`
                        : 'Standby · Align face in oval guide'
                      : 'Position Face Inside Oval Guide'}
                  </span>
                </div>
              </div>

              {/* Sub-bar: Flip Camera & Refresh */}
              <div className="pub-cam-subbar">
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="pub-icon-action-btn"
                  title="Flip Front/Rear Camera"
                >
                  <Camera size={15} />
                  <span>Flip Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="pub-icon-action-btn"
                  title="Reconnect / Refresh Camera"
                >
                  <RotateCcw size={15} />
                  <span>Restart Camera</span>
                </button>
              </div>

              {/* Camera Error Message */}
              {cameraError && (
                <div className="emp-error-box" style={{ margin: '4px 0', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={16} />
                    <span>{cameraError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => startCamera()}
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
                    Retry Camera
                  </button>
                </div>
              )}
            </div>

            {/* ── Right Column: Clock, Satellite GPS, Mode Switch, Punch Button ── */}
            <div className="pub-grid-controls">
              {/* Live Digital Clock Bar */}
              <div className="kiosk-clock-bar">
                <div>
                  <div className="kiosk-time-display">{currentTime || '12:00:00 PM'}</div>
                  <small style={{ color: '#6ee7b7', fontSize: '0.72rem', fontWeight: 700 }}>PHILIPPINES STANDARD TIME (UTC+8)</small>
                </div>
                <div className="kiosk-date-display">
                  <div>{currentDate || 'Today'}</div>
                  <small style={{ color: '#10b981', fontWeight: 700 }}>● TERMINAL LIVE</small>
                </div>
              </div>

              {/* GPS Geolocation Pill */}
              <div className="kiosk-gps-row">
                <div className="kiosk-gps-meta">
                  <MapPin size={16} />
                  <div className="kiosk-gps-text" title={gpsAddress}>
                    {gpsLoading ? 'Acquiring Satellite GPS...' : gpsAddress}
                  </div>
                </div>
                <button
                  type="button"
                  className="kiosk-gps-refresh-btn"
                  onClick={fetchLocation}
                  title="Re-acquire Satellite GPS"
                >
                  <Navigation size={12} style={{ display: 'inline', marginRight: 4 }} />
                  GPS Fix
                </button>
              </div>

              {/* Geofence Perimeter Status Card */}
              {geofenceInfo.hasOffices && (
                <div className={`emp-geofence-banner ${geofenceInfo.status}`}>
                  {geofenceInfo.status === 'in_range' && (
                    <div className="emp-geo-inner in-range">
                      <div className="emp-geo-title">
                        <ShieldCheck size={16} className="emerald" />
                        <strong>Authorized Office Perimeter Verified</strong>
                      </div>
                      <p className="emp-geo-sub">
                        Connected to <strong>{geofenceInfo.nearestOffice?.name}</strong> · Distance: <span className="geo-highlight">{geofenceInfo.distanceMeters}m</span> (Within {geofenceInfo.allowedRadius}m radius)
                      </p>
                    </div>
                  )}

                  {geofenceInfo.status === 'all_disabled' && (
                    <div className="emp-geo-inner out-of-range">
                      <div className="emp-geo-title">
                        <AlertTriangle size={16} className="danger" />
                        <strong>All Office Locations Disabled</strong>
                      </div>
                      <p className="emp-geo-sub">
                        Biometric face recognition and attendance punching are currently <strong>suspended by administrator</strong>.
                      </p>
                    </div>
                  )}

                  {geofenceInfo.status === 'out_of_range' && (
                    <div className="emp-geo-inner out-of-range">
                      <div className="emp-geo-title">
                        <AlertTriangle size={16} className="danger" />
                        <strong>Outside Authorized Office Range ({geofenceInfo.distanceMeters >= 1000 ? (geofenceInfo.distanceMeters / 1000).toFixed(1) + 'km' : geofenceInfo.distanceMeters + 'm'} away)</strong>
                      </div>
                      <p className="emp-geo-sub">
                        Face recognition is <strong>cancelled & blocked</strong>. You must be physically within <strong>{geofenceInfo.allowedRadius}m</strong> of <strong>{geofenceInfo.nearestOffice?.name}</strong> to punch attendance.
                      </p>
                      <button type="button" onClick={fetchLocation} className="emp-geo-retry-btn">
                        <Navigation size={12} /> Re-verify GPS Distance
                      </button>
                    </div>
                  )}

                  {geofenceInfo.status === 'no_gps' && (
                    <div className="emp-geo-inner no-gps">
                      <div className="emp-geo-title">
                        <MapPin size={16} className="amber" />
                        <strong>Satellite GPS Location Required</strong>
                      </div>
                      <p className="emp-geo-sub">
                        Office perimeter check is mandatory. Please grant browser location access to verify you are on-site before face recognition unlocks.
                      </p>
                      <button type="button" onClick={fetchLocation} className="emp-geo-retry-btn">
                        <Navigation size={12} /> Enable / Retry GPS Location
                      </button>
                    </div>
                  )}

                  {geofenceInfo.status === 'acquiring' && (
                    <div className="emp-geo-inner acquiring">
                      <div className="emp-geo-title">
                        <RefreshCw size={15} className="animate-spin emerald" />
                        <strong>Acquiring GPS Satellite Signal...</strong>
                      </div>
                      <p className="emp-geo-sub">
                        Confirming exact coordinates and calculating distance to nearest authorized office.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Biometric 1:N AI Mode + Auto-Punch Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '2px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 700 }}>
                  <ShieldCheck size={14} className="emerald" />
                  <span>1:N AI Identification</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoScanEnabled(prev => !prev)}
                  className={`auto-capture-badge ${autoScanEnabled ? 'active' : 'inactive'}`}
                  title="Toggle hands-free Auto-Punch mode"
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {autoScanEnabled ? 'Auto-Punch: ON (2s)' : 'Manual Punch'}
                </button>
              </div>

              {/* Smart Rule Explainer Banner */}
              <div className="pub-rule-banner">
                <Sparkles size={15} className="emerald" />
                <span>Automatic Biometrics: <strong>1st Scan = Time-In</strong> · <strong>Last Scan = Time-Out</strong></span>
              </div>

              {/* Optional Quick Employee Selector (Manual Helper) */}
              <div className="pub-emp-select-wrap">
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="pub-emp-select"
                >
                  <option value="">Auto-Detect Face (All Registered Employees)...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.employee_id}>
                      {emp.first_name} {emp.last_name} ({emp.position || 'Staff'}) · {emp.employee_id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Master Tactile Punch Button */}
              <button
                type="button"
                className={`btn-kiosk-punch ${!geofenceInfo.isWithinRange ? 'blocked' : ''}`}
                onClick={() => handlePerformScan()}
                disabled={scanning || !cameraActive || !geofenceInfo.isWithinRange}
              >
                {scanning ? (
                  <div className="pub-btn-loading">
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Matching Face in Biometric Database...</span>
                  </div>
                ) : !geofenceInfo.isWithinRange ? (
                  <div className="pub-btn-content" style={{ opacity: 0.9 }}>
                    <AlertTriangle size={18} />
                    <span>
                      {geofenceInfo.status === 'all_disabled'
                        ? 'OFFICE GEOFENCES DISABLED — SCAN SUSPENDED'
                        : geofenceInfo.status === 'out_of_range'
                        ? `OUT OF RANGE (${geofenceInfo.distanceMeters >= 1000 ? (geofenceInfo.distanceMeters / 1000).toFixed(1) + 'km' : geofenceInfo.distanceMeters + 'm'}) — SCAN LOCKED`
                        : geofenceInfo.status === 'acquiring'
                        ? 'CONFIRMING SATELLITE GPS LOCATION...'
                        : 'GPS LOCATION REQUIRED TO SCAN'}
                    </span>
                  </div>
                ) : (
                  <div className="pub-btn-content">
                    <Camera size={20} />
                    <span>SCAN FACE & PUNCH ATTENDANCE</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── High-Impact Biometric Result Pop-Up Modal ── */}
        {scanResult && (
          <div className="pub-result-modal-overlay" onClick={acknowledgeAndReset}>
            <div
              className={`pub-result-modal-card ${scanResult.action_type === 'time_in' ? 'time-in' : 'time-out'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                className="pub-res-close"
                style={{ position: 'absolute', top: 16, right: 18, fontSize: '1.2rem', color: '#94a3b8' }}
                onClick={acknowledgeAndReset}
                title="Close & Ready Next Scan"
              >
                ✕
              </button>

              {/* Type Badge */}
              <div className={`pub-modal-badge ${scanResult.action_type === 'time_in' ? 'time-in' : 'time-out'}`}>
                <ShieldCheck size={16} />
                <span>
                  {scanResult.action_type === 'time_in'
                    ? 'Time-In Punch Recorded'
                    : 'Time-Out Punch Recorded'}
                </span>
              </div>

              {/* Employee Snapshot / Portrait */}
              <div className="pub-modal-avatar-wrap">
                {scanResult.snapshot ? (
                  <img
                    src={scanResult.snapshot}
                    alt={scanResult.employee?.full_name}
                    className="pub-modal-avatar"
                  />
                ) : (
                  <div className="pub-res-avatar-placeholder" style={{ width: 96, height: 96, borderRadius: '50%' }}>
                    {scanResult.employee?.first_name?.[0]}{scanResult.employee?.last_name?.[0]}
                  </div>
                )}
              </div>

              {/* Employee Identification */}
              <div className="pub-modal-name">{scanResult.employee?.full_name}</div>
              <div className="pub-modal-dept">
                {scanResult.employee?.position || 'Staff'} · {scanResult.employee?.department || 'Operations'} ({scanResult.employee?.employee_id})
              </div>

              {/* Biometric Verification Box */}
              <div className="pub-modal-details-box">
                <div className="pub-modal-detail-row">
                  <span className="label">
                    {scanResult.action_type === 'time_in' ? '1st Scan Time-In:' : 'Duty Time-Out:'}
                  </span>
                  <span className="value" style={{ color: scanResult.action_type === 'time_in' ? '#34d399' : '#38bdf8', fontSize: '0.95rem' }}>
                    {scanResult.time}
                  </span>
                </div>

                {scanResult.first_in_time && (
                  <div className="pub-modal-detail-row">
                    <span className="label">First Clock-In Today:</span>
                    <span className="value">{scanResult.first_in_time}</span>
                  </div>
                )}

                {scanResult.duration && (
                  <div className="pub-modal-detail-row">
                    <span className="label">Total Duty Duration:</span>
                    <span className="value" style={{ color: '#38bdf8' }}>{scanResult.duration}</span>
                  </div>
                )}

                <div className="pub-modal-detail-row">
                  <span className="label">Verification Date:</span>
                  <span className="value">{scanResult.date || currentDate}</span>
                </div>
              </div>

              {/* Verification Chips */}
              <div className="pub-modal-chips-row">
                <div className="pub-chip emerald">
                  <Sparkles size={13} />
                  <span>{scanResult.confidence || '99.4'}% Face Geometrics Match</span>
                </div>
                <div className="pub-chip sky">
                  <MapPin size={13} />
                  <span>{scanResult.location || gpsAddress || 'Satellite GPS Verified'}</span>
                </div>
              </div>

              {/* Master Acknowledge Button */}
              <button
                type="button"
                className="pub-ack-btn"
                onClick={acknowledgeAndReset}
              >
                <CheckCircle2 size={20} />
                <span>ACKNOWLEDGE & READY NEXT SCAN</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Today's Live Workforce Attendance Activity Feed ── */}
        <div className="pub-feed-card">
          <div className="pub-feed-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} className="emerald" />
              <span>Today&apos;s Live Workforce Attendance Activity</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="text"
                placeholder="Search punches..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  background: 'rgba(2, 6, 23, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  padding: '4px 10px',
                  color: '#f1f5f9',
                  fontSize: '0.74rem',
                  outline: 'none'
                }}
              />
              <span className="pub-feed-count">{filteredLogs.length} Punches</span>
            </div>
          </div>

          {filteredLogs.length > 0 ? (
            <div className="pub-feed-list">
              {filteredLogs.map((log) => {
                const emp = log.employees;
                return (
                  <div key={log.id} className="pub-feed-item">
                    <div className="pub-feed-avatar">
                      {emp?.photo_url || log.time_in_photo ? (
                        <img src={emp?.photo_url || log.time_in_photo} alt={emp?.first_name} className="pub-feed-avatar-img" />
                      ) : (
                        <div className="pub-feed-avatar-initials">
                          {emp?.first_name?.[0] || 'E'}{emp?.last_name?.[0] || 'M'}
                        </div>
                      )}
                    </div>

                    <div className="pub-feed-info">
                      <div className="pub-feed-name">{emp ? `${emp.first_name} ${emp.last_name}` : log.employee_id}</div>
                      <div className="pub-feed-sub">{emp?.position || 'Staff'} · {emp?.department || 'Operations'}</div>
                    </div>

                    <div className="pub-feed-stamps">
                      <div className="pub-feed-in">
                        <span>IN:</span> {log.time_in ? new Date(log.time_in).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                      </div>
                      {log.time_out && (
                        <div className="pub-feed-out">
                          <span>OUT:</span> {new Date(log.time_out).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                    </div>

                    <div className="pub-feed-status">
                      <span className={`pub-feed-badge ${log.status?.toLowerCase() || 'present'}`}>
                        {log.status || 'Present'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pub-empty-feed">
              <Clock size={28} className="text-muted" />
              <p>No attendance logs recorded yet today. Position your face in the scanner above to punch Time-In.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
