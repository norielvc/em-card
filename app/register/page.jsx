'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Menu, X } from 'lucide-react';

const TRANSLATIONS = {
  en: {
    backHome: '← Back to Homepage',
    portalTitle: 'Official Citizen Security Portal',
    portalDesc: 'Verify your credentials, link your community referral, and request your official EM NGO Card in under three minutes.',
    step1Title: 'Identity Identification',
    step1Desc: 'Lookup your registered identity within the secure central registry database.',
    step2Title: 'Complete Registration',
    step2Desc: 'Provide address details, capture your portrait, and confirm your community referral.',
    secureNetwork: '🔒 AES 256 End-to-End Encrypted Registry Network',
    stepIndicator: 'STEP',
    verifyRecord: 'Verify Your Record',
    verifyRecordDesc: 'Verify your identity first to register for EM Card.',
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
    genderLabel: 'Gender',
    chooseGender: 'Select gender...',
    civilStatusLabel: 'Civil Status',
    chooseCivilStatus: 'Select civil status...',
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
    reviewGender: 'Gender',
    reviewCivilStatus: 'Civil Status',
    lotLabel: 'Lot',
    blockLabel: 'Block',
    phaseLabel: 'Phase',
    reviewBirthday: 'Date of Birth',
    reviewPhoto: 'Portrait Photo',
    editDetails: '\u2190 Edit Details',
    confirmSubmit: 'Confirm & Submit',
    modalTitle: 'Terms & Data Privacy Policy',
    modalP1: 'By submitting this form, I voluntarily agree to the collection and processing of my personal data by EM Card (Epektibong Mamamayan) for the purpose of receiving, evaluating, and responding to feedback, as well as improving its services and programs.',
    modalP2: 'I understand that the information I provide may include my name, contact details, and feedback responses, and that such data will be treated with strict confidentiality and used only for legitimate purposes in accordance with the Data Privacy Act of 2012.',
    modalP3: 'I further understand that my personal data will not be shared with third parties without my consent, unless required by law or authorized by applicable regulations.',
    modalP4: 'I have been informed of my rights as a data subject, including the right to access, correct, and request deletion of my personal data.',
    modalP5: 'I also consent to receiving SMS, email, and in-app messages from EM Card regarding program updates, event invitations, aid disbursements, and other community announcements. I understand that I may opt out at any time by contacting the help desk or updating my notification preferences.',
    modalClose: 'Understood & Close',
    alertPhoto: 'Please capture or upload your photo.',
    alertReferral: 'Please select a valid referral from the database.',
    duplicateRegistration: 'This resident already has an active registration request (Pending or Approved). Duplicate registrations are not allowed.',
    alreadyRegistered: 'This person already has an active registration (Pending or Approved). Each resident can only have one active registration at a time.',
    alreadyRegisteredTitle: 'Already Registered',
    faceNotDetected: 'No clear face detected. Please ensure your face is centered, well-lit, and unobstructed.',
    faceWarningTitle: 'Face Not Detected',
    noFaceAlert: 'No face was detected in the uploaded image. Please upload a clear photo of your face.',
    faceGuide: 'Center your face in the oval',
    successHeader: 'Verification Complete',
    successHeaderDesc: 'Your physical citizen identity card is currently being queued for automated production.',
    successCardTitle: 'Registration Completed!',
    successCardDesc: 'Your details have been successfully mapped to the security register.',
    successBtn: 'Return to Dashboard',
    registerMore: 'Register Another',
    refNumberLabel: 'Your Reference Number',
    refNumberDesc: 'Save this number. You can use it to track the status of your EM Card application.',
    trackBtn: 'Track Application',
    copyRef: 'Copy',
    copied: 'Copied!',
    trackPageTitle: 'Track Your Application',
    trackPageDesc: 'Enter your reference number to check the status of your EM Card registration.',
    trackInputLabel: 'Reference Number',
    trackInputPlaceholder: 'Paste your reference number...',
    trackSearchBtn: 'Search',
    trackNotFound: 'No record found. Please check your reference number and try again.',
    trackStatusPending: 'Pending Review',
    trackStatusApproved: 'Approved',
    trackStatusRejected: 'Rejected',
    trackSubmitted: 'Submitted',
    trackInReview: 'Under Review',
    trackProcessing: 'Processing',
    trackPrinting: 'Card Printing',
    trackReady: 'Ready for Pickup',
    trackDetailName: 'Name',
    trackDetailBarangay: 'Barangay',
    trackDetailStatus: 'Status',
    trackDetailDate: 'Date Submitted',
    trackDetailCardNo: 'EM Card Number',
    trackDetailPrinted: 'Card Printed',
    trackDetailNotPrinted: 'Not yet printed',
    barangay: 'Barangay',
    sector: 'Sector',
    birthday: 'Birthday',
    referredBy: 'Referred By',
    searching: 'Searching Database...',
    registerAnyway: 'Not in the registry? Click here to register anyway.',
    registerAnywayBtn: 'Register as New Resident',
    firstNameLabel: 'First Name',
    middleNameLabel: 'Middle Name',
    lastNameLabel: 'Last Name',
    suffixLabel: 'Suffix (e.g. Jr., III)',
  },
  ph: {
    backHome: '← Bumalik sa Homepage',
    portalTitle: 'Opisyal na Portal sa Seguridad ng Mamamayan',
    portalDesc: 'Patunayan ang iyong rekord, i-link ang iyong referral sa komunidad, at hilingin ang iyong opisyal na EM NGO Card sa loob ng tatlong minuto.',
    step1Title: 'Pagtukoy sa Pagkakakilanlan',
    step1Desc: 'Hanapin ang iyong rehistradong profile sa aming secure na database ng registry.',
    step2Title: 'Kumpletuhin ang Pagpaparehistro',
    step2Desc: 'Magbigay ng mga detalye ng tirahan, kumuha ng iyong larawan, at kumpirmahin ang iyong referral.',
    secureNetwork: '🔒 AES 256 End-to-End Naka-encrypt na Registry Network',
    stepIndicator: 'HAKBANG',
    verifyRecord: 'Patunayan ang Iyong Rekord',
    verifyRecordDesc: 'Patunayan muna ang iyong pagkakakilanlan upang magparehistro para sa EM Card.',
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
    genderLabel: 'Kasarian',
    chooseGender: 'Pumili ng kasarian...',
    civilStatusLabel: 'Katayuan sa Pag-aasawa',
    chooseCivilStatus: 'Pumili ng katayuan...',
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
    reviewGender: 'Kasarian',
    reviewCivilStatus: 'Katayuan sa Pag-aasawa',
    lotLabel: 'Lot',
    blockLabel: 'Block',
    phaseLabel: 'Phase',
    reviewBirthday: 'Petsa ng Kapanganakan',
    reviewPhoto: 'Larawan',
    editDetails: '\u2190 I-edit ang Detalye',
    confirmSubmit: 'Kumpirmahin at Isumite',
    modalTitle: 'Mga Tuntunin at Patakaran sa Data Privacy',
    modalP1: 'Sa pagsusumite ng form na ito, kusang-loob akong sumasang-ayon sa koleksyon at pagproseso ng aking personal na data ng EM Card (Epektibong Mamamayan) para sa layunin ng pagtanggap, pagsusuri, at pagtugon sa feedback, pati na rin sa pagpapabuti ng mga serbisyo at programa nito.',
    modalP2: 'Nauunawaan ko na ang impormasyong aking ibibigay ay maaaring maglaman ng aking pangalan, mga detalye ng pakikipag-ugnayan, at mga tugon sa feedback, at ang naturang data ay tratratuhin nang may mahigpit na kumpidensyalidad at gagamitin lamang para sa mga ligal na layunin alinsunod sa Data Privacy Act of 2012.',
    modalP3: 'Nauunawaan ko rin na ang aking personal na data ay hindi ibabahagi sa mga ikatlong partido nang walang aking pahintulot, maliban kung kinakailangan ng batas o pinahihintulutan ng mga naaangkop na regulasyon.',
    modalP4: 'Naabisuhan na ako tungkol sa aking mga karapatan bilang data subject, kaming karapatang i-access, iwasto, at hilingin ang pagtanggal ng aking personal na data.',
    modalP5: 'Sumasang-ayon din ako sa pagtanggap ng mga SMS, email, at in-app messages mula sa EM Card patungkol sa mga program updates, imbitasyon sa event, aid disbursements, at iba pang community announcements. Nauunawaan kong maaari akong mag-opt out anumang oras sa pamamagitan ng pakikipag-ugnayan sa help desk o pag-update ng aking notification preferences.',
    modalClose: 'Naintindihan ko at Isara',
    alertPhoto: 'Mangyaring kumuha o mag-upload ng iyong larawan.',
    alertReferral: 'Mangyaring pumili ng wastong referral mula sa database.',
    duplicateRegistration: 'Ang residenteng ito ay mayroon nang aktibong registration request (Pending o Approved). Hindi pinapayagan ang duplicate na pagrehistro.',
    alreadyRegistered: 'Ang taong ito ay mayroon nang aktibong registration (Pending o Approved). Ang bawat residente ay maaari lamang magkaroon ng isang aktibong registration sa bawat pagkakataon.',
    alreadyRegisteredTitle: 'Nakapagrehistro Na',
    faceNotDetected: 'Walang malinaw na mukha na nakita. Mangyaring siguraduhin na ang iyong mukha ay naka-center, maliwanag, at walang harang.',
    faceWarningTitle: 'Hindi Nakita ang Mukha',
    noFaceAlert: 'Walang mukhang nakita sa na-upload na larawan. Mangyaring mag-upload ng malinaw na larawan ng iyong mukha.',
    faceGuide: 'Ilagay ang iyong mukha sa gitna',
    successHeader: 'Kumpleto na ang Pagpapatunay',
    successHeaderDesc: 'Ang iyong pisikal na card ng pagkakakilanlan ay kasalukuyang nakapila para sa awtomatikong produksyon.',
    successCardTitle: 'Matagumpay na Rehistrado!',
    successCardDesc: 'Matagumpay na naitala ang iyong mga detalye sa security register.',
    successBtn: 'Bumalik sa Dashboard',
    registerMore: 'Magrehistro ng Iba',
    refNumberLabel: 'Iyong Reference Number',
    refNumberDesc: 'I-save ang numerong ito. Maaari mo itong gamitin para masubaybayan ang status ng iyong EM Card application.',
    trackBtn: 'Subaybayan ang Application',
    copyRef: 'Kopyahin',
    copied: 'Nakopya!',
    trackPageTitle: 'Subaybayan ang Iyong Application',
    trackPageDesc: 'Ilagay ang iyong reference number para malaman ang status ng iyong EM Card registration.',
    trackInputLabel: 'Reference Number',
    trackInputPlaceholder: 'I-paste ang iyong reference number...',
    trackSearchBtn: 'Hanapin',
    trackNotFound: 'Walang nahanap na rekord. Mangyaring suriin ang iyong reference number at subukang muli.',
    trackStatusPending: 'Nakabinbing Suriin',
    trackStatusApproved: 'Aprobadong',
    trackStatusRejected: 'Tinanggihan',
    trackSubmitted: 'Nai-submit',
    trackInReview: 'Nasusuri',
    trackProcessing: 'Pinoproseso',
    trackPrinting: 'Pagpi-print ng Card',
    trackReady: 'Handang Kunin',
    trackDetailName: 'Pangalan',
    trackDetailBarangay: 'Barangay',
    trackDetailStatus: 'Status',
    trackDetailDate: 'Petsa ng Pag-submit',
    trackDetailCardNo: 'Numero ng EM Card',
    trackDetailPrinted: 'Na-print na ang Card',
    trackDetailNotPrinted: 'Hindi pa na-print',
    barangay: 'Barangay',
    sector: 'Sektor',
    birthday: 'Kaarawan',
    referredBy: 'Inirekomenda Ni',
    searching: 'Naghahanap sa Database...',
    registerAnyway: 'Wala sa listahan? Magrehistro pa rin dito.',
    registerAnywayBtn: 'Magrehistro Bilang Bagong Residente',
    firstNameLabel: 'Pangalan',
    middleNameLabel: 'Gitnang Pangalan',
    lastNameLabel: 'Apelyido',
    suffixLabel: 'Sipix (hal. Jr., III)',
  }
};

const SUBDIVISION_PUROKS = ['North Ville 6', 'Balagtas Heights'];

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
  const [gender, setGender] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
  const [lot, setLot] = useState('');
  const [block, setBlock] = useState('');
  const [phase, setPhase] = useState('');

  // Custom birthday selectors
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const [photo, setPhoto] = useState(null);
  const [photoSource, setPhotoSource] = useState(null); // 'camera' | 'upload'
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showAlreadyRegistered, setShowAlreadyRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNonValidResident, setIsNonValidResident] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [barangay, setBarangay] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subStep, setSubStep] = useState(1); // 1: Address & Contact, 2: Portrait, 3: Referral & Details

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const hasRestoredRef = useRef(false);

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

  const totalSubSteps = 3;
  const goNextSub = () => setSubStep((s) => Math.min(totalSubSteps, s + 1));
  const goPrevSub = () => setSubStep((s) => Math.max(1, s - 1));

  useEffect(() => {
    if (step !== 2) setSubStep(1);
  }, [step]);

  // ── URL hash persistence (fallback + bookmarkable step) ──
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    hash.set('step', String(step));
    hash.set('sub', String(subStep));
    window.history.replaceState(null, '', `#${hash.toString()}`);
  }, [step, subStep]);

  const REG_PROGRESS_KEY = 'emcard_reg_progress';

  // Clear any previously saved progress so refresh starts clean
  useEffect(() => {
    try {
      sessionStorage.removeItem(REG_PROGRESS_KEY);
    } catch {
      // ignore
    }
  }, []);

  const clearRegProgress = () => {
    try {
      sessionStorage.removeItem(REG_PROGRESS_KEY);
    } catch {
      // ignore
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - 16) - i); // 16+ years old
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  const smartMatchesName = (fullName, queryStr) => {
    const nameLower = fullName.toLowerCase();
    const queryLower = queryStr.toLowerCase().replace(/[,.-]/g, ' ').trim();
    if (!queryLower) return false;

    // Exact phrase match first
    if (nameLower.includes(queryLower)) return true;

    const queryTokens = queryLower.split(/\s+/).filter(Boolean);
    if (queryTokens.length === 0) return false;

    // Particles are optional; significant tokens (length > 2, not particle) must ALL match
    const particles = new Set(['de', 'la', 'del', 'san', 'santa', 'dos', 'das', 'van', 'von', 'di', 'der', 'den']);
    const significantTokens = queryTokens.filter(t => t.length > 2 && !particles.has(t));

    if (significantTokens.length === 0) {
      // Only particles/short words provided: require at least one to match
      return queryTokens.some(t => nameLower.includes(t));
    }

    // All significant tokens must be present in the name
    return significantTokens.every(token => nameLower.includes(token));
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

  const detectFace = async () => true;

  const handleSearchInputChange = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    const query = value.trim();
    if (query.length >= 1) {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const q = query.toLowerCase();
        const allTokens = q.split(/\s+/).filter(Boolean);
        const searchTokens = allTokens.filter(t => t.length >= 2);
        if (searchTokens.length === 0) searchTokens.push(allTokens[0]);

        const res = await fetch(
          `/api/search-residents?q=${encodeURIComponent(query)}&checkRegistration=true`
        );
        const json = await res.json();
        const data = json.data || [];

        if (!data || data.length === 0) {
          setSearchResults([]);
        } else {
          // Build full names, score, filter, and limit to top 20
          const scored = data.map(p => {
            const name = `${p.first_name || ''} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name || ''}${p.suffix ? ' ' + p.suffix : ''}`.trim();
            const nameLower = name.toLowerCase();
            const score = allTokens.filter(t => nameLower.includes(t)).length;
            return { ...p, name, score };
          });

          // Strict filter: must match ALL significant tokens
          let results = scored.filter(p => smartMatchesName(p.name, query));

          // Sort by score desc, then name
          results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.name.localeCompare(b.name);
          });

          // Show top 20 only
          results = results.slice(0, 20);

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
    if (person.hasExistingRegistration) {
      setShowAlreadyRegistered(true);
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

  // Attach camera stream to video element whenever it mounts or remounts
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  const capturePhoto = async () => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        return;
      }
      // Re-attach stream if video was remounted and lost srcObject
      if (cameraActive && streamRef.current && !video.srcObject) {
        video.srcObject = streamRef.current;
        try { await video.play(); } catch (e) { /* silent */ }
      }
      // Wait up to 1.5s for video to be ready (handles remount latency)
      let waited = 0;
      while (video.readyState < 2 && waited < 1500) {
        await new Promise(r => setTimeout(r, 150));
        waited += 150;
      }
      if (video.readyState < 2) {
        setShowFaceModal(true);
        setPhotoProcessing(false);
        return;
      }
      setPhotoProcessing(true);
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg');
      const compressed = await compressImage(rawDataUrl, 300);
      setPhoto(compressed);
      setPhotoSource('camera');
      setPhotoProcessing(false);
      stopCamera();
    } catch (err) {
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
      try {
        const compressed = await compressImage(ev.target.result, 300);
        setPhotoProcessing(false);
        setPhoto(compressed);
        setPhotoSource('upload');
      } catch (err) {
        setPhotoProcessing(false);
        setPhoto(null);
        setPhotoSource(null);
        e.target.value = '';
      }
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!isNonValidResident) {
        // Check: by resident_id (prevent same person from registering twice)
        const { data: existingById, error: errById } = await supabase
          .from('registrations')
          .select('id, status')
          .eq('resident_id', selectedPerson.id)
          .in('status', ['Pending', 'Approved'])
          .maybeSingle();

        if (errById) {
          // silent
        }

        if (existingById) {
          alert(t.duplicateRegistration || 'You already have an existing registration request. Duplicate submissions are not allowed.');
          setIsSubmitting(false);
          return;
        }
      }

      // Look up parent registration by referral name
      let parentId = null;
      if (referral) {
        const { data: parentCandidates } = await supabase
          .from('registrations')
          .select('id, resident_id, ValidResidents(first_name, last_name, middle_name)')
          .neq('id', selectedPerson.id);
        if (parentCandidates) {
          const match = parentCandidates.find(p => {
            const vr = p.ValidResidents;
            if (!vr) return false;
            const pname = `${vr.first_name || ''} ${vr.middle_name ? vr.middle_name + ' ' : ''}${vr.last_name || ''}${vr.suffix ? ' ' + vr.suffix : ''}`.trim();
            return pname.toLowerCase() === referral.toLowerCase();
          });
          if (match) parentId = match.id;
        }
      }

      // Upload photo to Supabase Storage
      let photoUrl = null;
      if (photo) {
        try {
          const uId = isNonValidResident ? `nonvalid-${firstName.toLowerCase().replace(/\s+/g, '')}-${lastName.toLowerCase().replace(/\s+/g, '')}` : selectedPerson.id;
          const uploadRes = await fetch('/api/upload-member-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: photo, residentId: uId }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData.url) photoUrl = uploadData.url;
        } catch (uploadErr) {
          // silent
        }
      }

      // Generate short reference number for display + UUID for DB id
      const refId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const shortRef = 'EM-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error } = await supabase.from('registrations').insert({
        id: refId,
        reference_no: shortRef,
        resident_id: isNonValidResident ? null : selectedPerson.id,
        first_name: isNonValidResident ? firstName : null,
        middle_name: isNonValidResident ? middleName : null,
        last_name: isNonValidResident ? lastName : null,
        suffix: isNonValidResident ? suffix : selectedPerson.suffix || null,
        is_valid_resident: !isNonValidResident,
        referral_name: referral,
        sector_category: sector,
        gender: gender,
        civil_status: civilStatus,
        birthday: getFormattedBirthday(),
        photo_url: photoUrl,
        house_no: SUBDIVISION_PUROKS.includes(purok) ? null : houseNo,
        purok: purok,
        lot: SUBDIVISION_PUROKS.includes(purok) ? lot : null,
        block: SUBDIVISION_PUROKS.includes(purok) ? block : null,
        phase: SUBDIVISION_PUROKS.includes(purok) ? phase : null,
        barangay: isNonValidResident ? barangay : (selectedPerson?.barangay || ''),
        contact: contact,
        status: 'Pending',
        parent_id: parentId,
      });

      if (error) {
        if (error.message && error.message.includes('duplicate key')) {
          alert(t.duplicateRegistration || 'You already have an existing registration request. Duplicate submissions are not allowed.');
        } else {
          alert('Failed to submit registration. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      if (!isNonValidResident) {
        await supabase
          .from('ValidResidents')
          .update({ status: 'Registered' })
          .eq('id', selectedPerson.id);

        markAsRegistered(selectedPerson.id);
      }

      setRefNumber(shortRef);
      setShowReview(false);
      setSubmitted(true);
      clearRegProgress();
      stopCamera();
    } catch (err) {
      alert('Failed to submit. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
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
        {/* Mobile Header */}
        <header className="mobile-reg-header">
          <a href="/" className="mobile-reg-brand">
            <span className="mobile-reg-mark">EM</span>
            <span className="mobile-reg-name">EM Card</span>
          </a>
          <button className="mobile-reg-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className={`mobile-reg-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="/" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="/admin" onClick={() => setMobileMenuOpen(false)}>Dashboard</a>
            <a href="/scan" onClick={() => setMobileMenuOpen(false)}>Scanner</a>
          </div>
        </header>

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
            {/* Mobile Home Button */}
            <a href="/" className="mobile-home-btn">← Home</a>

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
                {refNumber && (
                  <div className="ref-number-box">
                    <label>{t.refNumberLabel}</label>
                    <div className="ref-number-row">
                      <code className="ref-number-code">{refNumber}</code>
                      <button
                        type="button"
                        className="btn btn-premium-outline btn-sm"
                        onClick={() => { navigator.clipboard.writeText(refNumber); }}
                      >{t.copyRef}</button>
                    </div>
                    <p className="ref-number-hint">{t.refNumberDesc}</p>
                  </div>
                )}
                <div className="success-actions">
                  <a href="/track" className="btn btn-premium-solid btn-track">{t.trackBtn}</a>
                  <a href="/" className="btn btn-premium-outline btn-back">{t.successBtn}</a>
                  <button type="button" className="btn btn-premium-outline btn-register-more" onClick={() => window.location.reload()}>{t.registerMore}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reg-page split-layout">
      {/* Mobile Header */}
      <header className="mobile-reg-header">
        <a href="/" className="mobile-reg-brand">
          <span className="mobile-reg-mark">EM</span>
          <span className="mobile-reg-name">EM Card</span>
        </a>
        <div className="mobile-reg-actions">
          <div className="premium-lang-toggle">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'ph' ? 'active' : ''} onClick={() => setLang('ph')}>PH</button>
          </div>
          <button className="mobile-reg-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <div className={`mobile-reg-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="/" onClick={() => setMobileMenuOpen(false)}>Home</a>
          <a href="/admin" onClick={() => setMobileMenuOpen(false)}>Dashboard</a>
          <a href="/scan" onClick={() => setMobileMenuOpen(false)}>Scanner</a>
        </div>
      </header>

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
          {/* Mobile Home Button */}
          <a href="/" className="mobile-home-btn">← Home</a>

          {/* Desktop Back Button */}
          <a href="/" className="desktop-back-btn">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </a>

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
                <div className="premium-empty-alert" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div className="alert-icon">⚠</div>
                    <div>
                      <h4>{t.noRecords}</h4>
                      <p>{t.noRecordsDesc.replace('{query}', searchQuery)}</p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.15)', paddingTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500', color: '#64748b' }}>{t.registerAnyway}</p>
                    <button
                      type="button"
                      className="btn btn-premium-solid"
                      style={{ 
                        padding: '12px 24px', 
                        fontSize: '0.95rem', 
                        fontWeight: '700', 
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onClick={() => {
                        setIsNonValidResident(true);
                        setSelectedPerson({
                          id: 'NON-VALID',
                          name: '',
                          barangay: '',
                          precinct: 'None',
                          first_name: '',
                          middle_name: '',
                          last_name: '',
                          suffix: ''
                        });
                        setFirstName('');
                        setMiddleName('');
                        setLastName('');
                        setSuffix('');
                        setBarangay('');
                        setStep(2);
                      }}
                    >
                      {t.registerAnywayBtn}
                    </button>
                  </div>
                </div>
              )}

              {!isLoading && searchResults.length > 0 && (
                <div className="premium-results-container">
                  <div className="results-header-tag">{t.identifiedRecords} ({searchResults.length})</div>
                  <div className="results-scroll-list">
                    {searchResults.map((person) => (
                      <div key={person.id} className={`premium-result-card ${person.hasExistingRegistration ? 'disabled-result' : ''}`}>
                        <div className="result-avatar-mark">EM</div>
                        <div className="result-card-details">
                          <strong>{person.name}</strong>
                          <span>{person.barangay}</span>
                        </div>
                        <button 
                          className="btn btn-premium-solid btn-sm" 
                          onClick={() => handleSelect(person)}
                          disabled={person.hasExistingRegistration}
                          title={person.hasExistingRegistration ? 'Registration is frozen for this member' : ''}
                        >
                          {person.hasExistingRegistration ? 'Frozen' : t.selectBtn}
                        </button>
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
              <div className="card-top-row">
                <button type="button" className="btn-premium-back" onClick={() => { setStep(1); setSelectedPerson(null); setIsNonValidResident(false); }}>
                  &#8592; Back
                </button>
                <span className="card-stage-badge">{t.stepIndicator} 02/02</span>
                <span className="substep-badge">Part {subStep}/{totalSubSteps}</span>
              </div>
              <h2>{t.completeDetails}</h2>
              <p className="card-desc">{t.completeDetailsDesc}</p>

              <div className="premium-selected-pill">
                <div className="pill-dot" style={{ background: isNonValidResident ? '#f59e0b' : '#10b981' }} />
                <div className="pill-profile-text">
                  <strong>{isNonValidResident ? (`${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim() || 'New Resident') : selectedPerson.name}</strong>
                  <span>{isNonValidResident ? (barangay || 'New Resident') : selectedPerson.barangay}</span>
                </div>
                <button className="btn-premium-change" onClick={() => { setStep(1); setSelectedPerson(null); setIsNonValidResident(false); }}>{t.changeProfile}</button>
              </div>

              {subStep === 1 && (
                <div className="premium-compact-form">
                  {isNonValidResident && (
                    <div className="premium-form-row" style={{ flexWrap: 'wrap' }}>
                      <div className="premium-form-group" style={{ flex: '1 1 200px', minWidth: '150px' }}>
                        <label className="premium-form-label">{t.firstNameLabel} <span className="req-star">*</span></label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value.toUpperCase())} placeholder="e.g. Juan" className="premium-input" required />
                      </div>
                      <div className="premium-form-group" style={{ flex: '1 1 200px', minWidth: '150px' }}>
                        <label className="premium-form-label">{t.middleNameLabel}</label>
                        <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value.toUpperCase())} placeholder="e.g. Perez" className="premium-input" />
                      </div>
                      <div className="premium-form-group" style={{ flex: '1 1 200px', minWidth: '150px' }}>
                        <label className="premium-form-label">{t.lastNameLabel} <span className="req-star">*</span></label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value.toUpperCase())} placeholder="e.g. Dela Cruz" className="premium-input" required />
                      </div>
                      <div className="premium-form-group" style={{ width: '80px', flex: '0 0 80px' }}>
                        <label className="premium-form-label">{t.suffixLabel}</label>
                        <input type="text" value={suffix} onChange={(e) => setSuffix(e.target.value.toUpperCase())} placeholder="e.g. Jr." className="premium-input" />
                      </div>
                    </div>
                  )}

                  <div className="premium-form-row">
                    <div className={SUBDIVISION_PUROKS.includes(purok) ? 'premium-form-group quarter' : 'premium-form-group half'}>
                      <label className="premium-form-label">{t.purokLabel}</label>
                      <div className="premium-select-wrapper">
                        <select value={purok} onChange={(e) => { setPurok(e.target.value); if (SUBDIVISION_PUROKS.includes(e.target.value)) { setHouseNo(''); } else { setLot(''); setBlock(''); setPhase(''); } }}>
                          <option value="">Select purok...</option>
                          {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>Purok {n}</option>)}
                          {(isNonValidResident ? barangay : selectedPerson?.barangay)?.toUpperCase() === 'SANTOL' && (
                            <>
                              <option value="North Ville 6">North Ville 6</option>
                              <option value="Balagtas Heights">Balagtas Heights</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                    {!SUBDIVISION_PUROKS.includes(purok) && (
                      <div className="premium-form-group half">
                        <label className="premium-form-label">{t.houseNoLabel}</label>
                        <input type="text" value={houseNo} onChange={(e) => setHouseNo(e.target.value.toUpperCase())} placeholder="e.g. 123" className="premium-input" />
                      </div>
                    )}
                    {SUBDIVISION_PUROKS.includes(purok) && (
                      <>
                        <div className="premium-form-group quarter">
                          <label className="premium-form-label">{t.lotLabel}</label>
                          <input type="text" value={lot} onChange={(e) => setLot(e.target.value.toUpperCase())} placeholder="e.g. 10" className="premium-input" />
                        </div>
                        <div className="premium-form-group quarter">
                          <label className="premium-form-label">{t.blockLabel}</label>
                          <input type="text" value={block} onChange={(e) => setBlock(e.target.value.toUpperCase())} placeholder="e.g. A" className="premium-input" />
                        </div>
                        <div className="premium-form-group quarter">
                          <label className="premium-form-label">{t.phaseLabel}</label>
                          <input type="text" value={phase} onChange={(e) => setPhase(e.target.value.toUpperCase())} placeholder="e.g. 1" className="premium-input" />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="premium-form-row">
                    <div className="premium-form-group half">
                      <label className="premium-form-label">{t.barangayLabel} <span className="req-star">*</span></label>
                      {isNonValidResident ? (
                        <div className="premium-select-wrapper">
                          <select value={barangay} onChange={(e) => setBarangay(e.target.value)} className="premium-input" required>
                            <option value="">Select barangay...</option>
                            {['Borol 1st', 'Borol 2nd', 'Dalig', 'Longos', 'Panginay', 'Pulong Gubat', 'San Juan', 'Santol', 'Wawa'].map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <input type="text" value={selectedPerson?.barangay || ''} readOnly className="premium-input premium-input-readonly" />
                      )}
                    </div>
                    <div className="premium-form-group half">
                      <label className="premium-form-label">{t.contactLabel}</label>
                      <input type="tel" value={contact} onChange={(e) => setContact(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="e.g. 09123456789" maxLength={11} className="premium-input" />
                    </div>
                  </div>
                  <div className="substep-actions">
                    <button type="button" className="btn btn-premium-outline" onClick={goPrevSub} disabled={subStep === 1}>Back</button>
                    <button
                      type="button"
                      className="btn btn-premium-solid"
                      onClick={goNextSub}
                      disabled={
                        ((contact || '').length > 0 && (contact || '').length < 10) ||
                        (isNonValidResident && (!firstName.trim() || !lastName.trim() || !barangay))
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {subStep === 2 && (
                <div className="premium-compact-form">
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
                          <video ref={videoRef} autoPlay playsInline muted width="100%" height="100%" />
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
                  <div className="substep-actions">
                    <button type="button" className="btn btn-premium-outline" onClick={goPrevSub}>Back</button>
                    <button type="button" className="btn btn-premium-solid" onClick={goNextSub} disabled={!photo || photoProcessing || cameraActive}>Next</button>
                  </div>
                </div>
              )}

              {subStep === 3 && (
                <form onSubmit={handleReview} className="premium-compact-form">
                  <div className="premium-form-group">
                    <label className="premium-form-label">{t.referralLabel} <span className="req-star">*</span></label>
                    <div className="premium-referral-combobox">
                      <input
                        type="text"
                        placeholder={t.referralPlaceholder}
                        value={referralQuery}
                        onChange={async (e) => {
                          const val = e.target.value.toUpperCase();
                          setReferralQuery(val);
                          setReferralValid(false);
                          setReferral('');
                          const trimmedVal = val.trim();
                          if (trimmedVal.length >= 2) {
                            try {
                              const isRealUuid = selectedPerson?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedPerson.id);
                              const excludeParam = isRealUuid ? `&excludeId=${selectedPerson.id}` : '';
                              const apiUrl = `/api/search-residents?q=${encodeURIComponent(trimmedVal)}${excludeParam}`;
                              const res = await fetch(apiUrl);
                              const json = await res.json();
                              const data = json.data || [];

                              const mapped = data.map(p => ({
                                ...p,
                                name: `${p.first_name || ''} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name || ''}${p.suffix ? ' ' + p.suffix : ''}`.trim()
                              }));
                              const matches = mapped.filter(
                                (p) => smartMatchesName(p.name, trimmedVal)
                              );
                              setReferralResults(matches);
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
                              <span>{p.barangay}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {!referralValid && referralQuery.length >= 2 && referralResults.length === 0 && (
                        <p className="premium-combobox-error">{t.zeroRecordsNode}</p>
                      )}
                    </div>
                  </div>

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

                  <div className="premium-form-row">
                    <div className="premium-form-group half">
                      <label className="premium-form-label">{t.genderLabel} <span className="req-star">*</span></label>
                      <div className="premium-select-wrapper">
                        <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                          <option value="">{t.chooseGender}</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                    <div className="premium-form-group half">
                      <label className="premium-form-label">{t.civilStatusLabel} <span className="req-star">*</span></label>
                      <div className="premium-select-wrapper">
                        <select value={civilStatus} onChange={(e) => setCivilStatus(e.target.value)} required>
                          <option value="">{t.chooseCivilStatus}</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>
                    </div>
                  </div>

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

                  <div className="premium-form-group compact-checkbox-wrap">
                    <label className="premium-checkbox-label">
                      <input type="checkbox" required />
                      <span>{t.consentCheck} <button type="button" className="btn-open-legal-premium" onClick={() => setShowConsentModal(true)}>{t.consentLink}</button>.</span>
                    </label>
                  </div>

                  <div className="substep-actions">
                    <button type="button" className="btn btn-premium-outline" onClick={goPrevSub}>Back</button>
                    <button type="submit" className="btn btn-premium-solid">{t.submitBtn}</button>
                  </div>
                </form>
              )}
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
              <div className="review-landscape">
                <div className="review-details">
                  <div className="review-grid">
                    <div className="review-item">
                      <span className="review-label">{t.reviewName}</span>
                      <span className="review-value">
                        {isNonValidResident ? `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}${suffix ? ' ' + suffix : ''}`.trim() : selectedPerson?.name}
                      </span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">{t.reviewBarangay}</span>
                      <span className="review-value">{isNonValidResident ? barangay : selectedPerson?.barangay}</span>
                    </div>
                    {!SUBDIVISION_PUROKS.includes(purok) && (
                      <div className="review-item">
                        <span className="review-label">{t.reviewHouse}</span>
                        <span className="review-value">{houseNo || '-'}</span>
                      </div>
                    )}
                    <div className="review-item">
                      <span className="review-label">{t.reviewPurok}</span>
                      <span className="review-value">{purok ? (SUBDIVISION_PUROKS.includes(purok) ? purok : `Purok ${purok}`) : '-'}</span>
                    </div>
                    {SUBDIVISION_PUROKS.includes(purok) && (
                      <>
                        <div className="review-item">
                          <span className="review-label">{t.lotLabel}</span>
                          <span className="review-value">{lot || '-'}</span>
                        </div>
                        <div className="review-item">
                          <span className="review-label">{t.blockLabel}</span>
                          <span className="review-value">{block || '-'}</span>
                        </div>
                        <div className="review-item">
                          <span className="review-label">{t.phaseLabel}</span>
                          <span className="review-value">{phase || '-'}</span>
                        </div>
                      </>
                    )}
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
                      <span className="review-label">{t.reviewGender}</span>
                      <span className="review-value">{gender}</span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">{t.reviewCivilStatus}</span>
                      <span className="review-value">{civilStatus}</span>
                    </div>
                    <div className="review-item">
                      <span className="review-label">{t.reviewBirthday}</span>
                      <span className="review-value">{getFormattedBirthday()}</span>
                    </div>
                  </div>
                </div>
                <div className="review-photo-side">
                  <span className="review-label">{t.reviewPhoto}</span>
                  <img src={photo} alt="Portrait" className="review-photo" />
                </div>
              </div>
            </div>
            <div className="modal-footer review-footer">
              <button type="button" className="btn btn-premium-outline" onClick={() => setShowReview(false)}>{t.editDetails}</button>
              <button type="button" className="btn btn-premium-solid" onClick={submitRegistration} disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : t.confirmSubmit}</button>
            </div>
          </div>
        </div>
      )}

      {/* Already Registered Modal */}
      {showAlreadyRegistered && (
        <div className="modal-overlay" onClick={() => setShowAlreadyRegistered(false)}>
          <div className="modal-card already-registered-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.alreadyRegisteredTitle}</h3>
              <button type="button" className="modal-close-x" onClick={() => setShowAlreadyRegistered(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div className="already-reg-icon">🚫</div>
              <p style={{ fontSize: '1rem', color: 'var(--text)', margin: '16px 0', lineHeight: 1.6 }}>{t.alreadyRegistered}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-premium-solid btn-full" onClick={() => setShowAlreadyRegistered(false)}>OK</button>
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
              <p>{t.modalP5}</p>
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
