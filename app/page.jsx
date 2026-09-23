'use client';

// EM Card Official Portal - v1.2.0
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import HeroSlideshow from './HeroSlideshow';
import { Users, Heart, TrendingUp, Shield, GraduationCap, HeartPulse, Sprout, Landmark, PlayCircle, Calendar, Menu, X, CheckCircle, Search, AlertTriangle, ChevronLeft, ChevronRight, LogIn, HeartHandshake, Telescope, MapPin, Phone, Mail, Share2, Smartphone } from 'lucide-react';

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventSlideIndex, setEventSlideIndex] = useState(0);
  const [contactForm, setContactForm] = useState({ name: '', email: '', type: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [trackRef, setTrackRef] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  const handleTrackSearch = async (e) => {
    e.preventDefault();
    if (!trackRef.trim()) return;
    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await fetch('/api/track-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: trackRef.trim() }),
      });
      const json = await res.json();
      if (!json.found) {
        setTrackError('Walang record na natagpuan. Paki-check ang iyong reference number at subukan muli.');
      } else {
        setTrackResult(json.data);
      }
    } catch (err) {
      setTrackError('May nangyaring problema. Subukan muli mamaya.');
    } finally {
      setTrackLoading(false);
    }
  };

  // Helper function to get countdown badge text
  const getCountdownBadge = (eventDate) => {
    const now = new Date();
    const event = new Date(eventDate);
    const diffTime = event - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;
    if (diffDays === 0) return { text: 'Ngayon!', color: '#ef4444' };
    if (diffDays === 1) return { text: 'Bukas!', color: '#f59e0b' };
    if (diffDays <= 3) return { text: `${diffDays} araw na lang`, color: '#10b981' };
    if (diffDays <= 7) return { text: `${diffDays} araw`, color: '#3b82f6' };
    return null;
  };

  // Social share function
  const shareEvent = (platform, event) => {
    const eventUrl = encodeURIComponent(window.location.href);
    const eventTitle = encodeURIComponent(event.title);
    const eventDesc = encodeURIComponent(event.description || '');

    let shareUrl = '';
    if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${eventUrl}&quote=${eventTitle}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?url=${eventUrl}&text=${eventTitle}`;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/upcoming-events');
        const data = await res.json();
        if (data.events) setUpcomingEvents(data.events);
      } catch (e) {
        // silent
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Auto-slide upcoming events carousel
  useEffect(() => {
    if (upcomingEvents.length < 2) return;
    const interval = setInterval(() => {
      setEventSlideIndex(prev => (prev + 1) % upcomingEvents.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [upcomingEvents]);

  // Scroll reveal animation with Intersection Observer
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe only sections with reveal class
    const revealSections = document.querySelectorAll('.reveal');
    revealSections.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [upcomingEvents.length]);

  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <nav className="nav container">
          <a className="brand" href="#home">
            <Image src="/em-logo.png" alt="EM Logo" width={36} height={36} className="brand-mark-img" />
            <span>
              <strong>EM Card</strong>
              <small>Epektibong Mamamayan</small>
            </span>
          </a>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <button className="nav-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X size={28} />
            </button>
            <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About Us</a>
            <a href="#leadership" onClick={() => setMenuOpen(false)}>Leadership</a>
            <a href="#programs" onClick={() => setMenuOpen(false)}>Programs</a>
            <a href="#events" onClick={() => setMenuOpen(false)}>Events</a>
            <a href="#faqs" onClick={() => setMenuOpen(false)}>FAQs</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
            <a href="#track" onClick={() => setMenuOpen(false)}>Track Application</a>
            <a href="/admin" className="nav-link-mobile-login" onClick={() => setMenuOpen(false)} style={{ backgroundColor: '#10b981', color: '#fff' }}>
              <LogIn size={20} /> Admin Login
            </a>
          </div>
          <a href="/admin" className="btn btn-outline nav-login">Login</a>
          <button className="nav-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="hero" id="home">
          <HeroSlideshow />
          <div className="hero-overlay" />
          <div className="container hero-grid">
            <div className="hero-content">
              <h1>
                <span className="hero-line hero-white">EPEKTIBONG</span>
                <span className="hero-line hero-green">MAMAMAYAN</span>
              </h1>
              <p className="hero-copy">Ang EM Card ay nakatuon sa pagtulong sa mga komunidad at pagpapalakas ng pagkakaisa, suporta, at kaunlaran para sa bawat pamilya sa buong Pilipinas.</p>
              <div className="hero-actions">
                <a className="btn hero-btn-solid" href="#about"><Sprout size={16} strokeWidth={2} /> Matuto Pa Tungkol sa Amin</a>
                <a href="/register" className="btn btn-primary hero-btn-mobile">Sumali →</a>
                <button className="btn btn-outline hero-btn-outline"><PlayCircle size={16} strokeWidth={2} /> Panoorin ang Video</button>
              </div>

              {/* Stats strip — mobile only */}
              <div className="hero-stats">
                <div className="hero-stat">
                  <Users size={20} strokeWidth={1.5} />
                  <span className="hero-stat-value">54,258</span>
                  <span className="hero-stat-label">Kabuuang Botante</span>
                </div>
                <div className="hero-stat">
                  <Landmark size={20} strokeWidth={1.5} />
                  <span className="hero-stat-value">0</span>
                  <span className="hero-stat-label">Miyembro ng EM Card</span>
                </div>
                <div className="hero-stat">
                  <TrendingUp size={20} strokeWidth={1.5} />
                  <span className="hero-stat-value">0%</span>
                  <span className="hero-stat-label">Rate ng Rehistro</span>
                </div>
                <div className="hero-stat">
                  <Calendar size={20} strokeWidth={1.5} />
                  <span className="hero-stat-value">0</span>
                  <span className="hero-stat-label">Bagong Naka-rehistro</span>
                </div>
              </div>
            </div>

            {/* Hero Bottom Cards — single card with 4 items */}
            <div className="hero-cards">
              <div className="hero-card-item">
                <div className="hero-card-icon"><Users size={22} strokeWidth={1.5} /></div>
                <div className="hero-card-body">
                  <h4>Matatag na Komunidad</h4>
                  <p>Pagtatayo ng pagkakaisa at pagpapalakas sa bawat mamamayan.</p>
                </div>
              </div>
              <div className="hero-card-divider" />
              <div className="hero-card-item">
                <div className="hero-card-icon"><Heart size={22} strokeWidth={1.5} /></div>
                <div className="hero-card-body">
                  <h4>Sosyal na Suporta</h4>
                  <p>Pagbibigay ng tulong at pinagkukunan sa nangangailangan.</p>
                </div>
              </div>
              <div className="hero-card-divider" />
              <div className="hero-card-item">
                <div className="hero-card-icon"><TrendingUp size={22} strokeWidth={1.5} /></div>
                <div className="hero-card-body">
                  <h4>Napapanatiling Pag-unlad</h4>
                  <p>Paglikha ng pangmatagalang solusyon para sa mas magandang kinabukasan.</p>
                </div>
              </div>
              <div className="hero-card-divider" />
              <div className="hero-card-item">
                <div className="hero-card-icon"><Shield size={22} strokeWidth={1.5} /></div>
                <div className="hero-card-body">
                  <h4>Pananagutan at Pagiging Bukas</h4>
                  <p>Taguyod ng integridad at pagiging bukas sa bawat aksyon.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROGRAMS - Combined Section */}
        <section className="section section-light programs-combined-section reveal" id="programs">
          <div className="container">
            {/* Main Header */}
            <div className="programs-combined-header">
              <h2 className="programs-combined-title">Mga Programa ng EM Card</h2>
              <div className="programs-combined-line"></div>
              <p className="programs-combined-subtitle">Sa EM Card, aming itinataguyod ang kagalingan at pag-unlad ng bawat mamamayan sa pamamagitan ng mga makabuluhang programa sa kalusugan, kabuhayan, at serbisyo sa komunidad.</p>
            </div>

            {/* Pangkalahatang Programa */}
            <div className="programs-subsection">
              <h3 className="programs-subsection-title">Pangkalahatang Programa</h3>
              <div className="programs-split-grid">
                <div className="programs-split-art">
                  <Image src="/em-main-logo.png" alt="Epektibong Mamamayan Logo" width={320} height={320} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                </div>

                <div className="programs-split-list">
                  <div className="programs-split-item">
                    <div className="programs-split-icon-box">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div className="programs-split-info">
                      <h4>Bayanihan sa Hanap-buhay</h4>
                      <p>Serbisyo Center at EM Pharmacy para sa kabuhayan ng pamilya.</p>
                    </div>
                  </div>

                  <div className="programs-split-item">
                    <div className="programs-split-icon-box">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    </div>
                    <div className="programs-split-info">
                      <h4>Health Programs</h4>
                      <p>Medical Mission, Libreng Gamot sa Seniors, Libreng Operasyon ng Katarata/Bukol, at Libreng Pag-papagamot sa PGH.</p>
                    </div>
                  </div>

                  <div className="programs-split-item">
                    <div className="programs-split-icon-box">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                    <div className="programs-split-info">
                      <h4>Rescue Unit &amp; Burial</h4>
                      <p>Ambulance, Fire Truck, Community Fire Pump, at Burial Assistance para sa panahon ng sakuna o pangangailangan.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Programa para sa mga Sektor */}
            <div className="programs-subsection sector-subsection">
              <h3 className="programs-subsection-title">Programa para sa mga Sektor</h3>
              <p className="programs-subsection-subtitle">Mga natatanging programa na nakatuon sa pagpapalakas at suporta sa iba't ibang sektor ng ating komunidad.</p>
              <div className="sector-programs-grid">
                {/* Senior Citizen Program */}
                <div className="sector-card">
                  <div className="sector-card-image">
                    <img src="/images/programa/senior.jpg" alt="Senior Citizen Program" />
                    <div className="sector-card-badge">Senior Citizen</div>
                  </div>
                  <div className="sector-card-body">
                    <h3>Regular na Health Check-up</h3>
                    <ul className="sector-card-list">
                      <li>Libreng blood pressure monitoring, blood sugar testing, at konsultasyon</li>
                      <li>Libreng gamot</li>
                      <li>Exercise at Wellness session – simpleng ehersisyo o Zumba</li>
                      <li>Livelihood Training – Pag gawa ng Handicrafts, gardening o iba pang pag kakakitaan</li>
                    </ul>
                  </div>
                </div>

                {/* TODA Development Program */}
                <div className="sector-card">
                  <div className="sector-card-image">
                    <img src="/images/programa/toda.jpg" alt="TODA Development Program" />
                    <div className="sector-card-badge">TODA</div>
                  </div>
                  <div className="sector-card-body">
                    <h3>Toda Development Program</h3>
                    <ul className="sector-card-list">
                      <li>Leadership Training para sa mga opisyal</li>
                      <li>Organizational Management</li>
                      <li>Gas Subsidy</li>
                      <li>Health Insurance</li>
                    </ul>
                  </div>
                </div>

                {/* PWD Rights and Benefits */}
                <div className="sector-card">
                  <div className="sector-card-image">
                    <img src="/images/programa/pwd.jpg" alt="PWD Rights and Benefits" />
                    <div className="sector-card-badge">PWD</div>
                  </div>
                  <div className="sector-card-body">
                    <h3>PWD's Rights and Benefit Orientation</h3>
                    <ul className="sector-card-list">
                      <li>Skills and Livelihood Training</li>
                      <li>Seminar tungkol sa disability awareness at inclusion</li>
                      <li>Information drive laban sa diskriminasyon</li>
                      <li>Pagsusulong ng accessibility sa mga pampublikong lugar</li>
                    </ul>
                  </div>
                </div>

                {/* LGBTQIA+ Community */}
                <div className="sector-card">
                  <div className="sector-card-image">
                    <img src="/images/programa/lgbtq.jpg" alt="LGBTQIA+ Community" />
                    <div className="sector-card-badge">LGBTQIA+</div>
                  </div>
                  <div className="sector-card-body">
                    <h3>LGBTQIA+ Community Rights and Awareness</h3>
                    <ul className="sector-card-list">
                      <li>Karapatang pantao at gender sensitivity</li>
                      <li>Anti-discrimination awareness</li>
                      <li>Gender and development (GAD) orientation</li>
                      <li>Financial literacy seminar</li>
                      <li>Skills development workshops</li>
                    </ul>
                  </div>
                </div>

                {/* Youth Program */}
                <div className="sector-card">
                  <div className="sector-card-image">
                    <img src="/images/programa/youth.jpg" alt="Youth Program" />
                    <div className="sector-card-badge">Youth</div>
                  </div>
                  <div className="sector-card-body">
                    <h3>Youth Sports and Leadership Program</h3>
                    <ul className="sector-card-list">
                      <li>Basketball/Volleyball league</li>
                      <li>Sports tournaments at competitions</li>
                      <li>Leadership training workshops</li>
                      <li>Youth empowerment seminars</li>
                      <li>Pagsasanay para sa mga susunod na pinuno</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* UPCOMING EVENTS */}
        <section className="section events-section reveal" id="events">
          <div className="container">
            <div className="events-header">
              <h2 className="section-title">Mga Paparating na Kaganapan</h2>
            </div>
            {eventsLoading ? (
              <div className="events-carousel-wrapper">
                <div className="events-loading">Naglo-load ng mga kaganapan...</div>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="events-carousel-wrapper">
                <div className="events-empty">Walang nakatakdang kaganapan.</div>
              </div>
            ) : (
              <div className="events-carousel-wrapper">
                <button
                  className="carousel-arrow carousel-arrow-left"
                  onClick={() => setEventSlideIndex(prev => (prev - 1 + upcomingEvents.length) % upcomingEvents.length)}
                  aria-label="Previous event"
                >
                  <ChevronLeft size={28} />
                </button>

                <div className="events-carousel-viewport">
                  <div
                    className="events-carousel-track"
                    style={{ transform: `translateX(-${eventSlideIndex * 100}%)` }}
                  >
                    {upcomingEvents.map((evt) => {
                      const evtDate = new Date(evt.event_date);
                      const dateStr = evtDate.toLocaleDateString('fil-PH', { day: 'numeric', month: 'long', year: 'numeric' });
                      const countdown = getCountdownBadge(evt.event_date);
                      return (
                        <div className="events-carousel-slide" key={evt.id}>
                          <div className="events-hero-card">
                            <div className="events-hero-image">
                              <img
                                src={evt.image_url || '/pexels-denniz-futalan-339724-3453056.jpg'}
                                alt={evt.title}
                              />
                              <div className="events-hero-overlay" />
                              {countdown && (
                                <div className="event-countdown-badge" style={{ backgroundColor: countdown.color }}>
                                  {countdown.text}
                                </div>
                              )}
                            </div>
                            <div className="events-hero-content">
                              <h3 className="events-hero-title">{evt.title}</h3>
                              <p className="events-hero-desc">{evt.description || 'Maghintay para sa higit pang detalye.'}</p>
                              <div className="events-hero-meta">
                                <div className="events-hero-meta-item">
                                  <Calendar size={16} />
                                  <span>{dateStr}</span>
                                </div>
                                {evt.event_time && (
                                  <div className="events-hero-meta-item">
                                    <PlayCircle size={16} />
                                    <span>{evt.event_time}</span>
                                  </div>
                                )}
                                {evt.location && (
                                  <div className="events-hero-meta-item">
                                    <Landmark size={16} />
                                    <span>{evt.location}</span>
                                  </div>
                                )}
                              </div>
                              <button
                                className="events-hero-btn"
                                onClick={() => setSelectedEvent(evt)}
                              >
                                Tingnan ang Detalye →
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  className="carousel-arrow carousel-arrow-right"
                  onClick={() => setEventSlideIndex(prev => (prev + 1) % upcomingEvents.length)}
                  aria-label="Next event"
                >
                  <ChevronRight size={28} />
                </button>

                <div className="events-carousel-dots">
                  {upcomingEvents.map((_, idx) => (
                    <button
                      key={idx}
                      className={`carousel-dot${idx === eventSlideIndex ? ' active' : ''}`}
                      onClick={() => setEventSlideIndex(idx)}
                      aria-label={`Go to event ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* View All Events Link */}
                <div className="view-all-events-link">
                  <Link href="/calendar">
                    Tingnan ang Lahat ng Kaganapan →
                  </Link>
                </div>
              </div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
              <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
                <div className="event-modal-card" onClick={e => e.stopPropagation()}>
                  <button className="event-modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
                  {selectedEvent.image_url && (
                    <div className="event-modal-image">
                      <img src={selectedEvent.image_url} alt={selectedEvent.title} />
                    </div>
                  )}
                  <div className="event-modal-body">
                    <h3>{selectedEvent.title}</h3>
                    <p className="event-modal-desc">{selectedEvent.description}</p>
                    <div className="event-modal-meta">
                      <div className="event-meta-row">
                        <Calendar size={16} strokeWidth={2} />
                        <span>{new Date(selectedEvent.event_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      {selectedEvent.event_time && (
                        <div className="event-meta-row">
                          <span style={{ width: 16, textAlign: 'center' }}>🕐</span>
                          <span>{selectedEvent.event_time}</span>
                        </div>
                      )}
                      {selectedEvent.location && (
                        <div className="event-meta-row">
                          <span style={{ width: 16, textAlign: 'center' }}>📍</span>
                          <span>{selectedEvent.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Social Share Buttons */}
                    <div className="event-social-share">
                      <span className="share-label">Ibahagi:</span>
                      <button
                        className="share-btn share-facebook"
                        onClick={() => shareEvent('facebook', selectedEvent)}
                        aria-label="Share on Facebook"
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>f</span>
                      </button>
                      <button
                        className="share-btn share-twitter"
                        onClick={() => shareEvent('twitter', selectedEvent)}
                        aria-label="Share on Twitter"
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>X</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* WHAT IS EM CARD */}
        <section className="section reveal" id="about">
          <div className="container about-grid">
            <div className="about-content">
              <h2 className="section-title">Ano ang EM Card?</h2>
              <p>Ang <strong>EM Card</strong> o <strong>Epektibong Mamamayan</strong> ay isang Non-Government Organization na nakatuon sa paghihikayat ng aktibong pagkamamamayan, pakikilahok sa komunidad, at makabuluhang pampublikong serbisyo.</p>
              <p>Kami ay nagsisilbing tulay sa pagitan ng mga tao at aksyon sa komunidad sa pamamagitan ng pagbabahagi ng tamang impormasyon, pag-oorganisa ng mga aktibidad, pagsubaybay sa mga proyekto, at pakikinig sa opinyon ng publiko.</p>
              <div className="values-row">
                <span className="value-tag">Serbisyo</span>
                <span className="value-tag">Integridad</span>
                <span className="value-tag">Pagiging Bukas</span>
                <span className="value-tag">Pananagutan</span>
              </div>
            </div>
            <div className="about-image" style={{ boxShadow: 'none', background: 'transparent' }}>
              <img src="/ID 1 sample.png" alt="EM Card Sample ID" style={{ objectFit: 'contain', height: 'auto', boxShadow: 'none', borderRadius: '0', background: 'transparent' }} />
            </div>
          </div>
        </section>

        {/* LEADERSHIP */}
        <section className="section leadership-section reveal" id="leadership">
          <div className="container">
            <div className="leadership-header">
              <h2 className="section-title">Aming Pamunuan</h2>
              <div className="leadership-line"></div>
              <p className="leadership-subtitle">Ang mga taong nangunguna at nagsisilbi sa Epektibong Mamamayan.</p>
            </div>
            <div className="leadership-president-row">
              <div className="leader-card president">
                <div className="leader-photo-accent">
                  <span className="leader-accent-dot red"></span>
                  <div className="leader-photo-wrap">
                    <img src="/images/leadership/president.png" alt="Ryan Sarucam - President" className="leader-photo" />
                  </div>
                </div>
                <div className="leader-info">
                  <h3>Ryan Sarucam</h3>
                  <div className="leader-role-line">
                    <span className="leader-role">President</span>
                    <span className="leader-accent-bar"></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="leadership-divider">
              <span className="leadership-divider-line"></span>
              <span className="leadership-divider-text">Board of Directors</span>
              <span className="leadership-divider-line"></span>
            </div>

            <div className="leadership-grid">
              <div className="leader-card">
                <div className="leader-avatar">HC</div>
                <div className="leader-info">
                  <h3>Haidie Castro</h3>
                  <span className="leader-role">Corporate Secretary</span>
                </div>
              </div>
              <div className="leader-card">
                <div className="leader-avatar">BA</div>
                <div className="leader-info">
                  <h3>Bernabe B. Ariznabareta III</h3>
                  <span className="leader-role">Treasurer</span>
                </div>
              </div>
              <div className="leader-card">
                <div className="leader-avatar">AA</div>
                <div className="leader-info">
                  <h3>Adler P. Aydante</h3>
                  <span className="leader-role">Trustee</span>
                </div>
              </div>
              <div className="leader-card">
                <div className="leader-avatar">MZ</div>
                <div className="leader-info">
                  <h3>Marie Jun Ann Zara</h3>
                  <span className="leader-role">Trustee</span>
                </div>
              </div>
              <div className="leader-card">
                <div className="leader-avatar">RA</div>
                <div className="leader-info">
                  <h3>Randy B. Abanes</h3>
                  <span className="leader-role">Trustee</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MISSION & VISION */}
        <section className="section mv-section reveal" id="news">
          <div className="container">
            <div className="mv-header">
              <h2 className="mv-section-title">ANG MISYON AT BISYON NATIN</h2>
              <div className="mv-title-line"></div>
            </div>
            <div className="mv-grid">
              <div className="mv-card">
                <div className="mv-card-icon-wrap">
                  <div className="mv-icon-glow"></div>
                  <HeartHandshake size={48} strokeWidth={1.5} color="#fff" />
                </div>
                <h3 className="mv-card-label">Misyon</h3>
                <div className="mv-card-body">
                  <p className="mv-card-text">Naglalayong itaguyod ang pagkakaisa, kaunlaran at aktibong pakikilahok ng bawat mamamayan sa paghubog ng isang maayos, makatarungan at progresibong Lipunan.</p>
                  <p className="mv-card-text">Layunin nitong palakasin ang kakayahan ng mga komunidad sa pamamagitan ng mga programang pangkabuhayan, edukasyon, at serbisyong panlipunan habang isinusulong ang tapat at mabuting pamamahala, may integridad at malasakit sa kapwa.</p>
                </div>
              </div>
              <div className="mv-divider"></div>
              <div className="mv-card">
                <div className="mv-card-icon-wrap">
                  <div className="mv-icon-glow"></div>
                  <Telescope size={48} strokeWidth={1.5} color="#fff" />
                </div>
                <h3 className="mv-card-label">Bisyon</h3>
                <div className="mv-card-body">
                  <p className="mv-card-text">Isang pagkakaisa, maunlad at makatarungang Lipunan kung saan ang bawat mamamayan ay may pantay na oportunidad, aktibong nakikilahok sa pamamahala at may kakayahang mag ambag sa patuloy na pag unlad ng buong Pilipinas.</p>
                  <p className="mv-card-text">Isinusulong ng kilusan ang mga komunidad na may malasakit, disiplina at nagsisilbing pundasyon ng isang matatag at progresibong kinabukasan para sa lahat.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRACK APPLICATION SECTION */}
        <section className="section track-section reveal" id="track" style={{ background: 'linear-gradient(135deg, #0f3d2e 0%, #1a5c44 50%, #0d3326 100%)', padding: '80px 0' }}>
          <div className="container" style={{ maxWidth: '640px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '2rem', color: '#fff', fontWeight: '800' }}>Subaybayan ang Aplikasyon</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginTop: '8px' }}>Ilagay ang iyong reference number upang makita ang status ng iyong EM Card registration.</p>
            </div>

            <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <form onSubmit={handleTrackSearch} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Ilagay ang reference number (hal. EM-ABC123)..."
                  value={trackRef}
                  onChange={(e) => setTrackRef(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: '#f8fafc',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={trackLoading || !trackRef.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '14px 24px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {trackLoading ? (
                    <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  ) : (
                    <><Search size={18} /> Hanapin</>
                  )}
                </button>
              </form>

              {trackError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '10px', color: '#ef4444', fontSize: '0.88rem', fontWeight: '600' }}>
                  <AlertTriangle size={20} />
                  <span>{trackError}</span>
                </div>
              )}

              {trackResult && (
                <div style={{ marginTop: '8px', animation: 'fadeInUp 0.4s ease' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '16px', color: trackResult.status === 'Approved' ? '#10b981' : '#f59e0b', background: trackResult.status === 'Approved' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)' }}>
                    <CheckCircle size={18} />
                    <span>{trackResult.status}</span>
                  </div>

                  {/* Progress Bar */}
                  {(() => {
                    const steps = [
                      { label: 'Nai-submit', done: true },
                      { label: 'Ini-review', done: ['Pending','Approved','Rejected'].includes(trackResult.status) },
                      { label: 'Aprubado', done: trackResult.status === 'Approved' },
                      { label: 'Pag-print ng Card', done: trackResult.printedAt && trackResult.emCardNo },
                      { label: 'Handa na', done: trackResult.printedAt && trackResult.emCardNo },
                    ];
                    const currentIndex = steps.filter(s => s.done).length - 1;
                    return (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                          {steps.map((step, i) => (
                            <div key={step.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, position: 'relative', zIndex: 2 }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: step.done ? '#10b981' : '#e2e8f0',
                                color: step.done ? '#fff' : '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                border: `2px solid ${step.done ? '#10b981' : '#e2e8f0'}`,
                                transition: 'all 0.3s ease',
                              }}>
                                {step.done ? '✓' : i + 1}
                              </div>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: step.done ? '700' : '500',
                                color: step.done ? '#10b981' : '#94a3b8',
                                textAlign: 'center',
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                              }}>{step.label}</span>
                              {i === currentIndex && step.done && (
                                <span style={{
                                  fontSize: '0.6rem',
                                  fontWeight: '700',
                                  color: '#f59e0b',
                                  background: 'rgba(245,158,11,0.1)',
                                  padding: '1px 6px',
                                  borderRadius: '8px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.3px',
                                }}>Kasalukuyan</span>
                              )}
                            </div>
                          ))}
                          {/* Connector line */}
                          <div style={{
                            position: 'absolute',
                            top: '13px',
                            left: '10%',
                            right: '10%',
                            height: '3px',
                            background: '#e2e8f0',
                            zIndex: 1,
                            borderRadius: '2px',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%`,
                              background: '#10b981',
                              borderRadius: '2px',
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Pangalan</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{trackResult.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Barangay</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{trackResult.barangay}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Petsa ng Pagsubmit</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{new Date(trackResult.createdAt).toLocaleDateString('fil-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    {trackResult.emCardNo && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>EM Card Number</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981' }}>{trackResult.emCardNo}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Nai-print na</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: trackResult.printedAt ? '#10b981' : '#64748b' }}>{trackResult.printedAt ? new Date(trackResult.printedAt).toLocaleDateString('fil-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Hindi pa nai-print'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* INTERACTIVE FAQ SECTION */}
        <section className="section faq-section reveal" id="faqs" style={{ background: '#f8fafc', padding: '100px 0' }}>
          <div className="container" style={{ maxWidth: '800px' }}>
            <div className="section-center-header" style={{ marginBottom: '48px', textAlign: 'center' }}>
              <span className="section-label" style={{ color: '#10b981', fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem' }}>MGA GABAY</span>
              <h2 className="section-title" style={{ fontSize: '2.2rem', color: '#1e293b', fontWeight: '800', marginTop: '8px' }}>Mga Madalas Itanong (FAQs)</h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '8px' }}>Alamin ang higit pa tungkol sa EM Card, mga benepisyo, at paano makilahok.</p>
            </div>

            <div className="faq-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                {
                  q: "Ano ang pangunahing layunin ng EM Card?",
                  a: "Ang EM Card (Epektibong Mamamayan) ay naglalayong magbigay ng mas madali at mabilis na akses sa mga pampublikong programa tulad ng libreng gamot, serbisyong medikal, tulong pinansyal, at transportasyon sa oras ng sakuna."
                },
                {
                  q: "Paano makakakuha o magpaparehistro para sa sarili kong EM Card?",
                  a: "Maaari kayong magrehistro online sa pamamagitan ng pag-click sa 'Get Involved' button sa aming portal, o bumisita sa pinakamalapit na EM Card Community Service Center sa inyong lugar dala ang isang balidong ID."
                },
                {
                  q: "May bayad ba ang pagpaparehistro at pagkuha ng EM Card?",
                  a: "Walang bayad ang EM Card! Ito ay ganap na libreng serbisyo para sa lahat ng kwalipikadong mamamayan ng komunidad."
                },
                {
                  q: "Sinu-sino ang maaaring mag-apply para sa EM Card?",
                  a: "Ang lahat ng residente na may sapat na gulang (o mga menor de edad sa pamamagitan ng kanilang magulang/guardian) na naninirahan sa sakop na barangay ay kwalipikadong mag-apply."
                },
                {
                  q: "Ano ang gagawin kung mawala o masira ang aking EM Card?",
                  a: "Huwag mag-alala! Maaari kayong mag-request ng replacement card sa pamamagitan ng aming Community Service Center o makipag-ugnayan sa amin gamit ang form sa ibaba upang magabayan kayo sa mabilis na pagkuha ng bagong card."
                }
              ].map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div 
                    key={idx} 
                    className={`faq-item ${isOpen ? 'open' : ''}`}
                    style={{ 
                      background: '#fff', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      overflow: 'hidden', 
                      boxShadow: isOpen ? '0 10px 25px -5px rgba(16,185,129,0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      style={{
                        width: '100%',
                        padding: '24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: isOpen ? '#047857' : '#1e293b',
                        fontWeight: '700',
                        fontSize: '1.05rem',
                        outline: 'none'
                      }}
                    >
                      <span>{faq.q}</span>
                      <span 
                        style={{ 
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', 
                          transition: 'transform 0.3s',
                          fontSize: '1.2rem',
                          color: isOpen ? '#10b981' : '#64748b'
                        }}
                      >
                        ▼
                      </span>
                    </button>
                    <div 
                      style={{ 
                        maxHeight: isOpen ? '300px' : '0', 
                        opacity: isOpen ? '1' : '0',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderTop: isOpen ? '1px solid #f1f5f9' : '0 solid transparent'
                      }}
                    >
                      <p style={{ padding: '24px', margin: 0, color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>
                        {faq.a}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </main>

      {/* CONTACT SECTION */}
      <section className="section contact-section reveal" id="contact">
        <div className="container contact-grid">
          <div>
            <h2 className="section-title" style={{ color: '#fff', fontSize: '2rem', marginBottom: '16px', fontWeight: '800' }}>Makipag-ugnayan at Magbigay ng Puna</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: '32px' }}>Magpadala ng mga katanungan, mungkahi, interes na boluntaryo, katanungan sa pakikipagtulungan, o mga alalahanin sa komunidad sa EM Card.</p>
            <div className="contact-details" style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0 }}><strong>Email:</strong> info@emcard.org</p>
              <p style={{ margin: 0 }}><strong>Telepono:</strong> 0919 818 1245</p>
              <p style={{ margin: 0 }}><strong>Tanggapan:</strong> 657, Quirino Hi-Way, Bagbag Novaliches, Quezon City</p>
            </div>
            <div className="social-links" style={{ display: 'flex', gap: '16px' }}>
              <a href="https://www.facebook.com/profile.php?id=61591019261852" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: 'rgba(255,255,255,0.8)', transition: 'color 0.2s' }}>
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" aria-label="Twitter" style={{ color: 'rgba(255,255,255,0.8)', transition: 'color 0.2s' }}>
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
              </a>
              <a href="#" aria-label="Instagram" style={{ color: 'rgba(255,255,255,0.8)', transition: 'color 0.2s' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
            </div>
          </div>
          {contactSuccess ? (
            <div className="feedback-form feedback-success">
              <div className="feedback-success-icon"><CheckCircle size={36} strokeWidth={2.5} /></div>
              <h4>NaiPadala na ang Mensahe!</h4>
              <p>Salamat sa pagkontak sa amin. Makikipag-ugnayan kami sa inyo sa lalong madaling panahon.</p>
              <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setContactSuccess(false)}>
                Magpadala ng Ibang Mensahe
              </button>
            </div>
          ) : (
            <form className="feedback-form" onSubmit={async (e) => {
              e.preventDefault();
              setContactSubmitting(true);
              try {
                const res = await fetch('/api/contact', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(contactForm),
                });
                const data = await res.json();
                if (data.success) {
                  setContactSuccess(true);
                  setContactForm({ name: '', email: '', type: '', message: '' });
                } else {
                  alert(data.error || 'Nabigong magpadala ng mensahe');
                }
                if (data.email) {
                  if (data.email.error) {
                    alert('Nabigo ang abiso sa email: ' + data.email.error);
                  }
                }
              } catch (err) {
                alert(err.message || 'Error sa network');
              } finally {
                setContactSubmitting(false);
              }
            }}>
              <label>Buong Pangalan<input type="text" value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="Buong pangalan mo" required /></label>
              <label>Email Address<input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="ikaw@halimbawa.com" required /></label>
              <label>Uri ng Katanungan
                <select value={contactForm.type} onChange={e => setContactForm(f => ({ ...f, type: e.target.value }))} required>
                  <option value="">Pumili ng isa</option>
                  <option>Pangkalahatang Katanungan</option>
                  <option>Boluntaryo</option>
                  <option>Donasyon</option>
                  <option>Alalahanin sa Programa</option>
                  <option>Puna</option>
                  <option>Pakikipagtulungan</option>
                </select>
              </label>
              <label>Mensahe<textarea value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))} rows="5" placeholder="Isulat ang iyong mensahe dito" required /></label>
              <button className="btn btn-primary" type="submit" disabled={contactSubmitting}>
                {contactSubmitting ? 'Nagpapadala...' : 'Ipadala ang Mensahe'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-top-bar" />
        <div className="container footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <div className="footer-logo-wrap">
              <Image src="/em-main-logo.png" alt="EM Card Logo" width={56} height={56} className="footer-logo-img" />
              <div>
                <strong>EM Card</strong>
                <span>Epektibong Mamamayan</span>
              </div>
            </div>
            <p>Nakatuon sa pagpapalakas ng komunidad sa pamamagitan ng serbisyo, integridad, at makabuluhang aksyon para sa bawat Pilipino.</p>
            <div className="social-links">
              <a href="https://www.facebook.com/profile.php?id=61591019261852" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><span style={{ fontSize: '0.75rem', fontWeight: 800 }}>f</span></a>
              <a href="#" aria-label="Twitter"><span style={{ fontSize: '0.75rem', fontWeight: 800 }}>𝕏</span></a>
              <a href="#" aria-label="Instagram"><Share2 size={14} /></a>
            </div>
          </div>

          {/* Navigation */}
          <div className="footer-col">
            <h4 className="footer-col-title">Navigation</h4>
            <div className="footer-links">
              <a href="#home">Home</a>
              <a href="#about">About Us</a>
              <a href="#leadership">Leadership</a>
              <a href="#programs">Programs</a>
              <a href="#events">Events</a>
              <a href="#faqs">FAQs</a>
            </div>
          </div>

          {/* Programs */}
          <div className="footer-col">
            <h4 className="footer-col-title">Mga Programa</h4>
            <div className="footer-links">
              <a href="#programs">Pangkalahatang Programa</a>
              <a href="#programs">Senior Citizen</a>
              <a href="#programs">TODA Development</a>
              <a href="#programs">PWD Rights</a>
              <a href="#programs">LGBTQIA+ Community</a>
              <a href="#programs">Youth Leadership</a>
            </div>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h4 className="footer-col-title">Makipag-ugnayan</h4>
            <div className="footer-contact-list">
              <div className="footer-contact-item">
                <MapPin size={14} />
                <span>657, Quirino Hi-Way, Bagbag Novaliches, Quezon City</span>
              </div>
              <div className="footer-contact-item">
                <Phone size={14} />
                <span>0919 818 1245</span>
              </div>
              <div className="footer-contact-item">
                <Mail size={14} />
                <span>info@emcard.org</span>
              </div>
            </div>
            <a href="#track" className="footer-track-btn">Track Application →</a>
          </div>
        </div>

        <div className="footer-bottom container">
          <p>© 2026 EM Card — Epektibong Mamamayan. Lahat ng Karapatan ay Nakalaan.</p>
          <div className="footer-bottom-links">
            <a href="#about">Privacy Policy</a>
            <a href="#about">Terms of Use</a>
          </div>
        </div>
      </footer>
    </>
  );
}
