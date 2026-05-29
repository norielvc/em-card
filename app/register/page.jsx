'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const TRANSLATIONS = {
  en: {
    backHome: '← Back to Homepage',
    portalTitle: 'Official Citizen Security Portal',
    portalDesc: 'Verify your credentials, link your community referral, and request your official EM NGO Card in under three minutes.',
    step1Title: 'Identity Identification',
    step1Desc: 'Lookup your registered identity within the secure central registry database.',
    step2Title: 'Security Configuration',
    step2Desc: 'Capture validation portrait snapshot and confirm your local coordinate referral.',
    secureNetwork: '🔒 AES 256 End-to-End Encrypted Registry Network',
    stepIndicator: 'STEP',
    verifyRecord: 'Verify Your Record',
    verifyRecordDesc: 'Enter your full name to search and claim your account profile.',
    searchPlaceholder: 'Search by Firstname, Lastname...',
    noRecords: 'No Records Identified',
    noRecordsDesc: 'We could not find "{query}" in our registry. Please check spelling or coordinate with your sector leader.',
    identifiedRecords: 'IDENTIFIED RECORDS',
    verifiedBadge: '✓ Verified',
    selectBtn: 'Select',
    completeDetails: 'Complete Details',
    completeDetailsDesc: 'Provide your secure verification photograph, community referral node, and sector group details.',
    changeProfile: 'Change Profile',
    portraitLabel: 'E-Snapshot Portrait',
    openCamera: 'Open Camera Hardware',
    uploadFile: 'Upload Portrait File',
    capturePortrait: 'Capture Portrait',
    cancel: 'Cancel',
    removePhotoCamera: '✕ Remove and Recapture',
    removePhotoUpload: '✕ Remove and Re-upload',
    referralLabel: 'Authorized Referral Node',
    referralPlaceholder: 'Start typing community referral name...',
    nodeVerified: '✓ Node Verified',
    zeroRecordsNode: 'Zero records found matching this node string in our directory.',
    houseNoLabel: 'House Number',
    purokLabel: 'Purok',
    barangayLabel: 'Barangay',
    contactLabel: 'Contact Number',
    sectorLabel: 'Civil Sector Category',
    chooseCategory: 'Choose category...',
    birthdayLabel: 'Citizen Date of Birth',
    month: 'Month',
    day: 'Day',
    year: 'Year',
    consentCheck: 'I declare details correct & consent to the',
    consentLink: 'NGO Security Registry & DPA Terms',
    submitBtn: 'Review & Confirm Registration',
    reviewTitle: 'Review Your Details',
    reviewSubtitle: 'Please confirm all information is correct before finalizing.',
    reviewName: 'Name',
    reviewBarangay: 'Barangay',
    reviewHouse: 'House Number',
    reviewPurok: 'Purok',
    reviewContact: 'Contact',
    reviewReferral: 'Referred By',
    reviewSector: 'Sector Category',
    reviewBirthday: 'Date of Birth',
    reviewPhoto: 'Portrait Photo',
    editDetails: '\u2190 Edit Details',
    confirmSubmit: 'Confirm & Submit',
    modalTitle: 'Terms & Data Privacy Policy',
    modalP1: 'By submitting this form, I voluntarily agree to the collection and processing of my personal data by EM Card (Epektibong Mamamayan) for the purpose of receiving, evaluating, and responding to feedback, as well as improving its services and programs.',
    modalP2: 'I understand that the information I provide may include my name, contact details, and feedback responses, and that such data will be treated with strict confidentiality and used only for legitimate purposes in accordance with the Data Privacy Act of 2012.',
    modalP3: 'I further understand that my personal data will not be shared with third parties without my consent, unless required by law or authorized by applicable regulations.',
    modalP4: 'I have been informed of my rights as a data subject, including the right to access, correct, and request deletion of my personal data.',
    modalClose: 'Understood & Close',
    alertPhoto: 'Please capture or upload your photo.',
    alertReferral: 'Please select a valid referral from the database.',
    alreadyRegistered: 'This person has already completed registration. Each resident can only register once.',
    faceNotDetected: 'No clear face detected. Please ensure your face is centered, well-lit, and unobstructed.',
    faceWarningTitle: 'Face Not Detected',
    noFaceAlert: 'No face was detected in the uploaded image. Please upload a clear photo of your face.',
    faceGuide: 'Center your face in the oval',
    successHeader: 'Verification Complete',
    successHeaderDesc: 'Your physical citizen identity card is currently being queued for automated production.',
    successCardTitle: 'Registration Completed!',
    successCardDesc: 'Your details have been successfully mapped to the security register.',
    successBtn: 'Return to Dashboard',
    barangay: 'Barangay',
    sector: 'Sector',
    birthday: 'Birthday',
    referredBy: 'Referred By',
    searching: 'Searching Database...',
  },
  ph: {
    backHome: '← Bumalik sa Homepage',
    portalTitle: 'Opisyal na Portal sa Seguridad ng Mamamayan',
    portalDesc: 'Patunayan ang iyong rekord, i-link ang iyong referral sa komunidad, at hilingin ang iyong opisyal na EM NGO Card sa loob ng tatlong minuto.',
    step1Title: 'Pagtukoy sa Pagkakakilanlan',
    step1Desc: 'Hanapin ang iyong rehistradong profile sa aming secure na database ng registry.',
    step2Title: 'Pag-configure ng Seguridad',
    step2Desc: 'Kumuha ng larawan para sa pagpapatunay at kumpirmahin ang iyong lokal na referral.',
    secureNetwork: '🔒 AES 256 End-to-End Naka-encrypt na Registry Network',
    stepIndicator: 'HAKBANG',
    verifyRecord: 'Patunayan ang Iyong Rekord',
    verifyRecordDesc: 'Ilagay ang iyong buong pangalan upang hanapin at i-claim ang iyong account profile.',
    searchPlaceholder: 'Maghanap gamit ang Pangalan at Apelyido...',
    noRecords: 'Walang Natukoy na Rekord',
    noRecordsDesc: 'Hindi namin mahanap ang "{query}" sa aming listahan. Mangyaring suriin ang baybay o makipag-ugnayan sa iyong lider ng sektor.',
    identifiedRecords: 'MGA NATUKOY NA REKORD',
    verifiedBadge: '✓ Kumpirmado',
    selectBtn: 'Piliin',
    completeDetails: 'Kumpletuhin ang mga Detalye',
    completeDetailsDesc: 'Magbigay ng larawan para sa kumpirmasyon, referral sa komunidad, at mga detalye ng iyong sektor.',
    changeProfile: 'Palitan ang Profile',
    portraitLabel: 'Larawan para sa Pagpapatunay',
    openCamera: 'Buksan ang Camera',
    uploadFile: 'Mag-upload ng Larawan',
    capturePortrait: 'Kumuha ng Larawan',
    cancel: 'Kanselahin',
    removePhotoCamera: '✕ Alisin at Kumuha Muli',
    removePhotoUpload: '✕ Alisin at Mag-upload Muli',
    referralLabel: 'Awtorisadong Referral sa Komunidad',
    referralPlaceholder: 'Simulang i-type ang pangalan ng referral sa komunidad...',
    nodeVerified: '✓ Beripikadong Node',
    zeroRecordsNode: 'Walang nahanap na rekord na tumutugma sa pangalang ito sa aming direktoryo.',
    houseNoLabel: 'Numero ng Bahay',
    purokLabel: 'Purok',
    barangayLabel: 'Barangay',
    contactLabel: 'Numero ng Kontak',
    sectorLabel: 'Kategorya ng Sektor',
    chooseCategory: 'Pumili ng kategorya...',
    birthdayLabel: 'Kaarawan ng Mamamayan',
    month: 'Buwan',
    day: 'Araw',
    year: 'Taon',
    consentCheck: 'Idinedeklara kong tama ang mga detalye at sumasang-ayon ako sa',
    consentLink: 'NGO Security Registry & Mga Tuntunin ng DPA',
    submitBtn: 'Suriin at Kumpirmahin',
    reviewTitle: 'Suriin ang Iyong Detalye',
    reviewSubtitle: 'Mangyaring kumpirmahin na tama ang lahat ng impormasyon bago tapusin.',
    reviewName: 'Pangalan',
    reviewBarangay: 'Barangay',
    reviewHouse: 'Numero ng Bahay',
    reviewPurok: 'Purok',
    reviewContact: 'Kontak',
    reviewReferral: 'Inirekomenda Ni',
    reviewSector: 'Kategorya ng Sektor',
    reviewBirthday: 'Petsa ng Kapanganakan',
    reviewPhoto: 'Larawan',
    editDetails: '\u2190 I-edit ang Detalye',
    confirmSubmit: 'Kumpirmahin at Isumite',
    modalTitle: 'Mga Tuntunin at Patakaran sa Data Privacy',
    modalP1: 'Sa pagsusumite ng form na ito, kusang-loob akong sumasang-ayon sa koleksyon at pagproseso ng aking personal na data ng EM Card (Epektibong Mamamayan) para sa layunin ng pagtanggap, pagsusuri, at pagtugon sa feedback, pati na rin sa pagpapabuti ng mga serbisyo at programa nito.',
    modalP2: 'Nauunawaan ko na ang impormasyong aking ibibigay ay maaaring maglaman ng aking pangalan, mga detalye ng pakikipag-ugnayan, at mga tugon sa feedback, at ang naturang data ay tratratuhin nang may mahigpit na kumpidensyalidad at gagamitin lamang para sa mga ligal na layunin alinsunod sa Data Privacy Act of 2012.',
    modalP3: 'Nauunawaan ko rin na ang aking personal na data ay hindi ibabahagi sa mga ikatlong partido nang walang aking pahintulot, maliban kung kinakailangan ng batas o pinahihintulutan ng mga naaangkop na regulasyon.',
    modalP4: 'Naabisuhan na ako tungkol sa aking mga karapatan bilang data subject, kaming karapatang i-access, iwasto, at hilingin ang pagtanggal ng aking personal na data.',
    modalClose: 'Naintindihan ko at Isara',
    alertPhoto: 'Mangyaring kumuha o mag-upload ng iyong larawan.',
    alertReferral: 'Mangyaring pumili ng wastong referral mula sa database.',
    alreadyRegistered: 'Ang taong ito ay nakapagrehistro na. Ang bawat residente ay maaari lamang magrehistro nang isang beses.',
    faceNotDetected: 'Walang malinaw na mukha na nakita. Mangyaring siguraduhin na ang iyong mukha ay naka-center, maliwanag, at walang harang.',
    faceWarningTitle: 'Hindi Nakita ang Mukha',
    noFaceAlert: 'Walang mukhang nakita sa na-upload na larawan. Mangyaring mag-upload ng malinaw na larawan ng iyong mukha.',
    faceGuide: 'Ilagay ang iyong mukha sa gitna',
    successHeader: 'Kumpleto na ang Pagpapatunay',
    successHeaderDesc: 'Ang iyong pisikal na card ng pagkakakilanlan ay kasalukuyang nakapila para sa awtomatikong produksyon.',
    successCardTitle: 'Matagumpay na Rehistrado!',
    successCardDesc: 'Matagumpay na naitala ang iyong mga detalye sa security register.',
    successBtn: 'Bumalik sa Dashboard',
    barangay: 'Barangay',
    sector: 'Sektor',
    birthday: 'Kaarawan',
    referredBy: 'Inirekomenda Ni',
    searching: 'Naghahanap sa Database...',
  }
};

export default function RegisterPage() {
  const [lang, setLang] = useState('en'); // 'en' or 'ph'
  const t = TRANSLATIONS[lang];

  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Step 2 fields
  const [referral, setReferral] = useState('');
  const [referralQuery, setReferralQuery] = useState('');
  const [referralResults, setReferralResults] = useState([]);
  const [referralValid, setReferralValid] = useState(false);
  const [sector, setSector] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [purok, setPurok] = useState('');
  const [contact, setContact] = useState('');

  // Custom birthday selectors
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const [photo, setPhoto] = useState(null);
  const [photoSource, setPhotoSource] = useState(null); // 'camera' | 'upload'
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const months = [
    { value: '01', label: lang === 'en' ? 'January' : 'Enero' },
    { value: '02', label: lang === 'en' ? 'February' : 'Pebrero' },
    { value: '03', label: lang === 'en' ? 'March' : 'Marso' },
    { value: '04', label: lang === 'en' ? 'April' : 'Abril' },
    { value: '05', label: lang === 'en' ? 'May' : 'Mayo' },
    { value: '06', label: lang === 'en' ? 'June' : 'Hunyo' },
    { value: '07', label: lang === 'en' ? 'July' : 'Hulyo' },
    { value: '08', label: lang === 'en' ? 'August' : 'Agosto' },
    { value: '09', label: lang === 'en' ? 'September' : 'Setyembre' },
    { value: '10', label: lang === 'en' ? 'October' : 'Oktubre' },
    { value: '11', label: lang === 'en' ? 'November' : 'Nobyembre' },
    { value: '12', label: lang === 'en' ? 'December' : 'Disyembre' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i); // Last 100 years
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  const smartMatchesName = (fullName, queryStr) => {
    const nameLower = fullName.toLowerCase();
    const queryLower = queryStr.toLowerCase().replace(/[,.-]/g, ' ').trim();
    if (!queryLower) return false;
    const queryTokens = queryLower.split(/\s+/).filter(Boolean);
    return queryTokens.every(token => nameLower.includes(token));
  };

  // Compress image to max 300KB (base64 length)
  const compressImage = (dataUrl, maxKb = 300) => {
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

  // Detect face in an image using the FaceDetector API if available
  const detectFace = async (dataUrl) => {
    if (typeof FaceDetector === 'undefined') return true; // API not available, allow with visual guide fallback
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });
      const detector = new FaceDetector({ fastMode: false, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (faces.length === 0) return false;
      // Validate bounding box: real face should cover at least 8% of image area
      // (filters out false positives on blank/gray images)
      const imgArea = img.naturalWidth * img.naturalHeight;
      const largestFace = faces.reduce((max, f) => {
        const area = f.boundingBox.width * f.boundingBox.height;
        return area > max.area ? { area, face: f } : max;
      }, { area: 0, face: null });
      const faceRatio = largestFace.area / imgArea;
      console.log('[detectFace] faces found:', faces.length, '| largest face ratio:', (faceRatio * 100).toFixed(1) + '%');
      return faceRatio >= 0.08;
    } catch (err) {
      console.error('[detectFace] error:', err);
      return true; // On any error, allow to avoid blocking legitimate submissions
    }
  };

  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    const query = value.trim();
    if (query.length >= 1) {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const { data, error } = await supabase
          .from('registered_voters')
          .select('*');

        if (error || !data) {
          setSearchResults([]);
        } else {
          // Construct full name for search and filter dynamically using smartMatchesName
          const results = data
            .map(p => ({
              ...p,
              name: `${p.first_name} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name}`.trim(),
              barangay: p.barangay,
              id: p.id
            }))
            .filter((p) => smartMatchesName(p.name, query));
          setSearchResults(results);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSearchResults([]);
      setHasSearched(false);
    }
  };

  const isAlreadyRegistered = (id) => {
    try {
      const registered = JSON.parse(localStorage.getItem('emcard_registered') || '[]');
      return registered.includes(id);
    } catch {
      return false;
    }
  };

  const markAsRegistered = (id) => {
    try {
      const registered = JSON.parse(localStorage.getItem('emcard_registered') || '[]');
      if (!registered.includes(id)) {
        registered.push(id);
        localStorage.setItem('emcard_registered', JSON.stringify(registered));
      }
    } catch {
      // silently fail
    }
  };

  const handleSelect = (person) => {
    if (isAlreadyRegistered(person.id)) {
      alert(t.alreadyRegistered);
      return;
    }
    setSelectedPerson(person);
    setStep(2);
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser or environment does not support camera access. Please upload an image instead.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      alert('Camera access denied. Please allow camera access or upload an image instead.');
    }
  };

  // Attach camera stream to video element after it mounts
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.warn('[Camera] play error:', e));
    }
  }, [cameraActive]);

  const capturePhoto = async () => {
    console.log('[capturePhoto] clicked');
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        console.warn('[capturePhoto] video or canvas ref missing');
        return;
      }
      if (video.readyState < 2) {
        console.warn('[capturePhoto] video not ready yet, readyState:', video.readyState);
        alert('Camera is still initializing. Please wait a moment and try again.');
        return;
      }
      setPhotoProcessing(true);
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg');
      console.log('[capturePhoto] raw captured, size:', Math.round(rawDataUrl.length / 1024), 'KB');
      const compressed = await compressImage(rawDataUrl, 300);
      console.log('[capturePhoto] compressed, size:', Math.round(compressed.length / 1024), 'KB');
      const hasFace = await detectFace(compressed);
      console.log('[capturePhoto] face detected:', hasFace);
      if (!hasFace) {
        alert(t.noFaceAlert);
        setPhoto(null);
        setPhotoSource(null);
        setPhotoProcessing(false);
        // Keep camera active so they can retake
        return;
      }
      setPhoto(compressed);
      setPhotoSource('camera');
      setPhotoProcessing(false);
      stopCamera();
    } catch (err) {
      console.error('[capturePhoto] error:', err);
      alert('Failed to capture photo. Please try again.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setPhotoProcessing(true);
      const compressed = await compressImage(ev.target.result, 300);
      const hasFace = await detectFace(compressed);
      setPhotoProcessing(false);
      if (!hasFace) {
        alert(t.noFaceAlert);
        setPhoto(null);
        setPhotoSource(null);
        e.target.value = '';
        return;
      }
      setPhoto(compressed);
      setPhotoSource('upload');
    };
    reader.readAsDataURL(file);
  };

  const handleReview = (e) => {
    e.preventDefault();
    if (!photo) {
      alert(t.alertPhoto);
      return;
    }
    if (!referralValid) {
      alert(t.alertReferral);
      return;
    }
    setShowReview(true);
  };

  const submitRegistration = async () => {
    try {
      // Look up parent registration by referral name
      let parentId = null;
      if (referral) {
        const { data: parentCandidates } = await supabase
          .from('registrations')
          .select('id, resident_id, registered_voters(first_name, last_name, middle_name)')
          .neq('id', selectedPerson.id);
        if (parentCandidates) {
          const match = parentCandidates.find(p => {
            const vr = p.registered_voters;
            if (!vr) return false;
            const pname = `${vr.first_name || ''} ${vr.middle_name ? vr.middle_name + ' ' : ''}${vr.last_name || ''}`.trim();
            return pname.toLowerCase() === referral.toLowerCase();
          });
          if (match) parentId = match.id;
        }
      }

      const { error } = await supabase.from('registrations').insert({
        resident_id: selectedPerson.id,
        referral_name: referral,
        sector_category: sector,
        birthday: getFormattedBirthday(),
        photo_base64: photo,
        house_no: houseNo,
        purok: purok,
        barangay: selectedPerson?.barangay || '',
        contact: contact,
        status: 'Pending',
        parent_id: parentId,
      });

      await supabase
        .from('registered_voters')
        .update({ status: 'Registered' })
        .eq('id', selectedPerson.id);

      if (error) {
        console.warn('Supabase Insert Warning:', error.message);
      }
    } catch (err) {
      console.warn('Offline Mode.');
    }

    markAsRegistered(selectedPerson.id);
    setShowReview(false);
    setSubmitted(true);
    stopCamera();
  };

  const getFormattedBirthday = () => {
    if (!birthMonth || !birthDay || !birthYear) return '';
    const mLabel = months.find(m => m.value === birthMonth)?.label;
    return `${mLabel} ${parseInt(birthDay, 10)}, ${birthYear}`;
  };

  // Success screen
  if (submitted) {
    return (
      <div className="reg-page split-layout">
        <div className="split-wrapper">
          {/* Left panel */}
          <div className="split-left-panel">
            <div className="panel-blur-bg" />
            <div className="panel-content">
              <a href="/" className="reg-back-premium">{t.backHome}</a>
              <div className="brand-badge-premium">
                <span className="brand-mark-premium">EM</span>
                <div>
                  <strong>EM Card</strong>
                  <small>Epektibong Mamamayan</small>
                </div>
              </div>
              <div className="panel-status-card success-status">
                <div className="pulse-icon">✓</div>
                <div>
                  <h4>{t.successHeader}</h4>
                  <p>{t.successHeaderDesc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="split-right-panel flex-center">
            {/* Language Toggle in success view */}
            <div className="premium-lang-toggle">
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
              <button className={lang === 'ph' ? 'active' : ''} onClick={() => setLang('ph')}>PH</button>
            </div>

            <div className="premium-glass-card success-card-panel">
              <div className="reg-success">
                <div className="success-icon-badge">✓</div>
                <h2>{t.successCardTitle}</h2>
                <p className="success-subtext">{t.successCardDesc}</p>
                
                <div className="summary-profile-card">
                  <div className="profile-img-wrap">
                    {photo && <img src={photo} alt="Profile Snapshot" />}
                  </div>
                  <div className="profile-details">
                    <span className="profile-id-badge">{selectedPerson.id}</span>
                    <h3>{selectedPerson.name}</h3>
                    <div className="profile-meta-grid">
                      <div>
                        <label>{t.barangay}</label>
                        <span>{selectedPerson.barangay}</span>
                      </div>
                      <div>
                        <label>{t.sector}</label>
                        <span>{sector}</span>
                      </div>
                      <div>
                        <label>{t.birthday}</label>
                        <span>{getFormattedBirthday()}</span>
                      </div>
                      <div>
                        <label>{t.referredBy}</label>
                        <span>{referral}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <a href="/" className="btn btn-premium-solid btn-back">{t.successBtn}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reg-page split-layout">
      <div className="split-wrapper">
        {/* Left panel */}
        <div className="split-left-panel">
          <div className="panel-blur-bg" />
          <div className="panel-content">
            <a href="/" className="reg-back-premium">{t.backHome}</a>
            <div className="brand-badge-premium">
              <span className="brand-mark-premium">EM</span>
              <div>
                <strong>EM Card</strong>
                <small>Epektibong Mamamayan</small>
              </div>
            </div>

            <div className="panel-headline">
              <h1>{t.portalTitle}</h1>
              <p>{t.portalDesc}</p>
            </div>

            {/* Premium Pipeline Tracker */}
            <div className="timeline-pipeline">
              <div className={`pipeline-step ${step >= 1 ? 'current' : ''}`}>
                <div className="pipeline-bullet">1</div>
                <div className="pipeline-info">
                  <h4>{t.step1Title}</h4>
                  <p>{t.step1Desc}</p>
                </div>
              </div>
              <div className={`pipeline-step ${step >= 2 ? 'current' : ''}`}>
                <div className="pipeline-bullet">2</div>
                <div className="pipeline-info">
                  <h4>{t.step2Title}</h4>
                  <p>{t.step2Desc}</p>
                </div>
              </div>
            </div>

            <div className="panel-footer-notes">
              <span>{t.secureNetwork}</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="split-right-panel">
          {/* Language Toggle */}
          <div className="premium-lang-toggle">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>English</button>
            <button className={lang === 'ph' ? 'active' : ''} onClick={() => setLang('ph')}>Tagalog</button>
          </div>

          {/* Step 1: Search */}
          {step === 1 && (
            <div className="premium-glass-card">
              <span className="card-stage-badge">{t.stepIndicator} 01/02</span>
              <h2>{t.verifyRecord}</h2>
              <p className="card-desc">{t.verifyRecordDesc}</p>
              
              <form onSubmit={(e) => e.preventDefault()} className="premium-search-form">
                <div className="premium-input-wrap">
                  <svg className="search-icon-svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    required
                  />
                </div>
              </form>

              {isLoading && (
                <div className="loading-registry-indicator">{t.searching}</div>
              )}

              {hasSearched && !isLoading && searchResults.length === 0 && (
                <div className="premium-empty-alert">
                  <div className="alert-icon">⚠</div>
                  <div>
                    <h4>{t.noRecords}</h4>
                    <p>{t.noRecordsDesc.replace('{query}', searchQuery)}</p>
                  </div>
                </div>
              )}

              {!isLoading && searchResults.length > 0 && (
                <div className="premium-results-container">
                  <div className="results-header-tag">{t.identifiedRecords} ({searchResults.length})</div>
                  <div className="results-scroll-list">
                    {searchResults.map((person) => (
                      <div key={person.id} className="premium-result-card">
                        <div className="result-avatar-mark">EM</div>
                        <div className="result-card-details">
                          <strong>{person.name}</strong>
                          <span>{person.barangay}</span>
                        </div>
                        <div className="badge-verified-premium">{t.verifiedBadge}</div>
                        <button className="btn btn-premium-solid btn-sm" onClick={() => handleSelect(person)}>{t.selectBtn}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && selectedPerson && (
            <div className="premium-glass-card">
              <span className="card-stage-badge">{t.stepIndicator} 02/02</span>
              <h2>{t.completeDetails}</h2>
              <p className="card-desc">{t.completeDetailsDesc}</p>

              <div className="premium-selected-pill">
                <div className="pill-dot" />
                <div className="pill-profile-text">
                  <strong>{selectedPerson.name}</strong>
                  <span>{selectedPerson.barangay}</span>
                </div>
                <button className="btn-premium-change" onClick={() => { setStep(1); setSelectedPerson(null); }}>{t.changeProfile}</button>
              </div>

              <form onSubmit={handleReview} className="premium-compact-form">
                {/* House Number + Purok Row */}
                <div className="premium-form-row">
                  <div className="premium-form-group half">
                    <label className="premium-form-label">{t.houseNoLabel}</label>
                    <input type="text" value={houseNo} onChange={(e) => setHouseNo(e.target.value)} placeholder="e.g. 123" className="premium-input" />
                  </div>
                  <div className="premium-form-group half">
                    <label className="premium-form-label">{t.purokLabel}</label>
                    <div className="premium-select-wrapper">
                      <select value={purok} onChange={(e) => setPurok(e.target.value)}>
                        <option value="">Select purok...</option>
                        {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>Purok {n}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Barangay + Contact Row */}
                <div className="premium-form-row">
                  <div className="premium-form-group half">
                    <label className="premium-form-label">{t.barangayLabel}</label>
                    <input type="text" value={selectedPerson?.barangay || ''} readOnly className="premium-input premium-input-readonly" />
                  </div>
                  <div className="premium-form-group half">
                    <label className="premium-form-label">{t.contactLabel}</label>
                    <input type="tel" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. 09123456789" className="premium-input" />
                  </div>
                </div>

                {/* Photo Area */}
                <div className="premium-form-group">
                  <label className="premium-form-label">{t.portraitLabel} <span className="req-star">*</span></label>
                  <div className="premium-photo-container">
                    {photo ? (
                      <div className="premium-photo-preview-wrap">
                        <img src={photo} alt="Validation Snapshot" />
                        <button type="button" className="btn-remove-photo-premium" onClick={() => { setPhoto(null); setPhotoSource(null); setPhotoProcessing(false); }}>
                          {photoSource === 'camera' ? t.removePhotoCamera : t.removePhotoUpload}
                        </button>
                      </div>
                    ) : photoProcessing ? (
                      <div className="premium-photo-processing">
                        <div className="processing-spinner" />
                        <span>Validating portrait...</span>
                      </div>
                    ) : cameraActive ? (
                      <div className="premium-live-camera-wrap">
                        <video ref={videoRef} autoPlay playsInline muted width="100%" height="100%" onLoadedData={() => console.log('[Camera] video stream loaded and ready')} />
                        <div className="camera-overlay-target" />
                        <div className="face-oval-guide">
                          <div className="face-oval-inner" />
                        </div>
                        <div className="face-guide-text">{t.faceGuide}</div>
                        <div className="premium-camera-controls">
                          <button type="button" className="btn btn-premium-solid" onClick={capturePhoto}>{t.capturePortrait}</button>
                          <button type="button" className="btn btn-premium-outline btn-close-camera" onClick={stopCamera}>{t.cancel}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="premium-photo-placeholder-grid">
                        <button type="button" className="premium-upload-tile" onClick={startCamera}>
                          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          <span>{t.openCamera}</span>
                        </button>
                        <label className="premium-upload-tile">
                          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          <span>{t.uploadFile}</span>
                          <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
                        </label>
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} hidden />
                </div>

                {/* Referral */}
                <div className="premium-form-group">
                  <label className="premium-form-label">{t.referralLabel} <span className="req-star">*</span></label>
                  <div className="premium-referral-combobox">
                    <input
                      type="text"
                      placeholder={t.referralPlaceholder}
                      value={referralQuery}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setReferralQuery(val);
                        setReferralValid(false);
                        setReferral('');
                        const trimmedVal = val.trim();
                        if (trimmedVal.length >= 2) {
                          try {
                            const { data, error } = await supabase
                              .from('registered_voters')
                              .select('*');

                            if (error || !data) {
                              setReferralResults([]);
                            } else {
                              const mapped = data.map(p => ({
                                ...p,
                                name: `${p.first_name} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name}`.trim()
                              }));
                              const matches = mapped.filter(
                                (p) => smartMatchesName(p.name, trimmedVal) && p.id !== selectedPerson.id
                              );
                              setReferralResults(matches);
                            }
                          } catch (err) {
                            setReferralResults([]);
                          }
                        } else {
                          setReferralResults([]);
                        }
                      }}
                      required
                      className={referralValid ? 'input-premium-verified' : ''}
                    />
                    {referralValid && <span className="premium-verified-checkmark">{t.nodeVerified}</span>}
                    {!referralValid && referralResults.length > 0 && (
                      <div className="premium-combobox-dropdown">
                        {referralResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="combobox-item-option"
                            onClick={() => {
                              setReferral(p.name);
                              setReferralQuery(p.name);
                              setReferralValid(true);
                              setReferralResults([]);
                            }}
                          >
                            <strong>{p.name}</strong>
                            <span>{p.id} · {p.barangay}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!referralValid && referralQuery.length >= 2 && referralResults.length === 0 && (
                      <p className="premium-combobox-error">{t.zeroRecordsNode}</p>
                    )}
                  </div>
                </div>

                {/* Sector Organization */}
                <div className="premium-form-group">
                  <label className="premium-form-label">{t.sectorLabel} <span className="req-star">*</span></label>
                  <div className="premium-select-wrapper">
                    <select value={sector} onChange={(e) => setSector(e.target.value)} required>
                      <option value="">{t.chooseCategory}</option>
                      <option>Youth</option>
                      <option>Women</option>
                      <option>Senior Citizens</option>
                      <option>Persons with Disability</option>
                      <option>Workers / Labor</option>
                      <option>Farmers / Fisherfolk</option>
                      <option>Business / Entrepreneurs</option>
                      <option>Education</option>
                      <option>Health</option>
                      <option>Religious</option>
                      <option>Transport</option>
                      <option>Others</option>
                    </select>
                  </div>
                </div>

                {/* Birthday */}
                <div className="premium-form-group">
                  <label className="premium-form-label">{t.birthdayLabel} <span className="req-star">*</span></label>
                  <div className="premium-date-row">
                    <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} required>
                      <option value="">{t.month}</option>
                      {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} required>
                      <option value="">{t.day}</option>
                      {days.map(d => <option key={d} value={d}>{parseInt(d, 10)}</option>)}
                    </select>
                    <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} required>
                      <option value="">{t.year}</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Data Privacy Consent Check */}
                <div className="premium-form-group compact-checkbox-wrap">
                  <label className="premium-checkbox-label">
                    <input type="checkbox" required />
                    <span>{t.consentCheck} <button type="button" className="btn-open-legal-premium" onClick={() => setShowConsentModal(true)}>{t.consentLink}</button>.</span>
                  </label>
                </div>

                <button type="submit" className="btn btn-premium-solid btn-full">{t.submitBtn}</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Review & Confirm Modal */}
      {showReview && (
        <div className="modal-overlay" onClick={() => setShowReview(false)}>
          <div className="modal-card review-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.reviewTitle}</h3>
              <button type="button" className="modal-close-x" onClick={() => setShowReview(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="review-subtitle">{t.reviewSubtitle}</p>
              <div className="review-grid">
                <div className="review-item">
                  <span className="review-label">{t.reviewName}</span>
                  <span className="review-value">{selectedPerson?.name}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t.reviewBarangay}</span>
                  <span className="review-value">{selectedPerson?.barangay}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t.reviewHouse}</span>
                  <span className="review-value">{houseNo || '-'}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t.reviewPurok}</span>
                  <span className="review-value">{purok ? `Purok ${purok}` : '-'}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t.reviewContact}</span>
                  <span className="review-value">{contact || '-'}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t.reviewReferral}</span>
                  <span className="review-value">{referral}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t.reviewSector}</span>
                  <span className="review-value">{sector}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">{t.reviewBirthday}</span>
                  <span className="review-value">{getFormattedBirthday()}</span>
                </div>
                <div className="review-item full">
                  <span className="review-label">{t.reviewPhoto}</span>
                  <img src={photo} alt="Portrait" className="review-photo" />
                </div>
              </div>
            </div>
            <div className="modal-footer review-footer">
              <button type="button" className="btn btn-premium-outline" onClick={() => setShowReview(false)}>{t.editDetails}</button>
              <button type="button" className="btn btn-premium-solid" onClick={submitRegistration}>{t.confirmSubmit}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup for Consent */}
      {showConsentModal && (
        <div className="modal-overlay" onClick={() => setShowConsentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.modalTitle}</h3>
              <button type="button" className="modal-close-x" onClick={() => setShowConsentModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>{t.modalP1}</p>
              <p>{t.modalP2}</p>
              <p>{t.modalP3}</p>
              <p>{t.modalP4}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-premium-solid btn-full" onClick={() => setShowConsentModal(false)}>{t.modalClose}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
