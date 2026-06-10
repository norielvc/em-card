'use client';

import { useState, useEffect } from 'react';
import HeroSlideshow from './HeroSlideshow';
import { Users, Heart, TrendingUp, Shield, GraduationCap, HeartPulse, Sprout, Landmark, PlayCircle, Calendar, Menu, X, CheckCircle, Search, AlertTriangle, ChevronLeft, ChevronRight, LogIn } from 'lucide-react';

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
        setTrackError('No record found. Please check your reference number and try again.');
      } else {
        setTrackResult(json.data);
      }
    } catch (err) {
      setTrackError('Something went wrong. Please try again later.');
    } finally {
      setTrackLoading(false);
    }
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
  }, [upcomingEvents.length]);

  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <nav className="nav container">
          <a className="brand" href="#home">
            <span className="brand-mark">EM</span>
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
            <a href="#programs" onClick={() => setMenuOpen(false)}>Programs</a>
            <a href="#projects" onClick={() => setMenuOpen(false)}>Projects</a>
            <a href="#faqs" onClick={() => setMenuOpen(false)}>FAQs</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
            <a href="#track" onClick={() => setMenuOpen(false)}>Track Application</a>
            <a href="/admin" className="nav-link-mobile-login" onClick={() => setMenuOpen(false)} style={{ backgroundColor: '#10b981', color: '#fff' }}>
              <LogIn size={20} /> Login
            </a>
          </div>
          <a href="/register" className="btn btn-primary nav-btn">Get Involved</a>
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
              <p className="hero-copy">Ang EM Card ay nakatuon sa pagtulong sa mga komunidad at pagpapalakas ng pagkakaisa, suporta, at kaunlaran para sa bawat pamilya sa Balagtas.</p>
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

        {/* PROGRAMS */}
        <section className="section section-light programs-split-section" id="programs">
          <div className="container">
            <div className="programs-split-header">
              <h2 className="programs-split-title">ALL OUR PROGRAMS</h2>
              <div className="programs-split-line"></div>
              <p className="programs-split-subtitle">Sa EM Card, aming itinataguyod ang kagalingan at pag-unlad ng bawat mamamayan sa pamamagitan ng mga makabuluhang programa sa kalusugan, kabuhayan, at serbisyo sa komunidad.</p>
            </div>
            <div className="programs-split-grid">
              <div className="programs-split-art">
                {/* SVG vector art representing epektibong mamamayan (unity, community lifting, service) */}
                <svg viewBox="0 0 400 400" width="100%" height="100%">
                  <defs>
                    <linearGradient id="vectorGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(16,185,129,0.2)" />
                      <stop offset="100%" stopColor="rgba(4,120,87,0)" />
                    </linearGradient>
                    <linearGradient id="peopleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fb923c" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  {/* Decorative background circles */}
                  <circle cx="200" cy="200" r="150" fill="url(#vectorGlow)" />
                  <circle cx="200" cy="200" r="110" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="2" strokeDasharray="6 6" />
                  
                  {/* Sun / Future representer */}
                  <circle cx="200" cy="110" r="28" fill="#fef08a" opacity="0.8" />
                  <circle cx="200" cy="110" r="38" fill="none" stroke="#fef08a" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />

                  {/* Base holding hand / platform */}
                  <path d="M100,320 C150,300 250,300 300,320" fill="none" stroke="#047857" strokeWidth="6" strokeLinecap="round" />
                  <path d="M120,328 C160,314 240,314 280,328" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

                  {/* Unity / People vector art representing holding together */}
                  {/* Person 1 (Left) */}
                  <path d="M150,280 C150,240 180,245 180,280" fill="url(#peopleGrad)" />
                  <circle cx="165" cy="225" r="14" fill="#047857" />
                  {/* Arm connecting to Center */}
                  <path d="M175,245 Q190,230 200,245" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />

                  {/* Person 2 (Center) */}
                  <path d="M180,265 C180,225 220,225 220,265" fill="url(#orangeGrad)" />
                  <circle cx="200" cy="205" r="16" fill="#fb923c" />

                  {/* Person 3 (Right) */}
                  <path d="M220,280 C220,240 250,245 250,280" fill="url(#peopleGrad)" />
                  <circle cx="235" cy="225" r="14" fill="#047857" />
                  {/* Arm connecting to Center */}
                  <path d="M225,245 Q210,230 200,245" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />

                  {/* Sprout of growth in center */}
                  <path d="M200,195 Q190,175 200,165 Q210,175 200,195" fill="#10b981" />
                  <path d="M200,195 Q215,180 220,175 Q210,170 200,195" fill="#34d399" />
                  <path d="M200,210 L200,190" stroke="#047857" strokeWidth="3" />
                </svg>
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

                <div className="programs-split-item">
                  <div className="programs-split-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                  </div>
                  <div className="programs-split-info">
                    <h4>Youth Program</h4>
                    <p>Basketball/Volleyball league, Sports, at pagsasanay para sa mga susunod na pinuno ng ating bansa.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* UPCOMING EVENTS */}
        <section className="section events-section" id="programs">
          <div className="container">
            <div className="events-header">
              <p className="events-eyebrow">Iskedyul ng Kaganapan</p>
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
                      const dateStr = evtDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                      return (
                        <div className="events-carousel-slide" key={evt.id}>
                          <div className="events-hero-card">
                            <div className="events-hero-image">
                              <img
                                src={evt.image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'}
                                alt={evt.title}
                              />
                              <div className="events-hero-overlay" />
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
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* WHAT IS EM CARD */}
        <section className="section" id="about">
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

        {/* LATEST ANNOUNCEMENTS */}
        <section className="section" id="announcements">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Pinakabagong Anunsyo</h2>
              <a href="#announcements" className="view-all">Tingnan lahat ng balita →</a>
            </div>
            <div className="announcement-grid">
              <article className="announcement-card featured">
                <div className="announcement-img">
                  <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80" alt="Community Summit" />
                </div>
                <div className="announcement-body">
                  <h3>Komunidad Leadership Summit 2026</h3>
                  <p>Oryentasyon sa pamumuno at sesyon ng pagpapalakas sa komunidad sa buong organisasyon.</p>
                  <div className="announcement-people">
                    <span className="avatar"></span>
                    <span className="avatar"></span>
                    <span className="avatar"></span>
                  </div>
                </div>
              </article>
              <article className="announcement-card">
                <div className="announcement-img">
                  <img src="https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=600&q=80" alt="Team EM Card" />
                </div>
                <div className="announcement-body">
                  <h3>Team EM Card: Tagapagdulot ng Pagbabago</h3>
                  <p>Ang EM Card ay isang organisasyong pangkomunidad na nakatuon sa pagtataguyod ng pagiging bukas, serbisyo, at aktibong pagkamamamayan.</p>
                </div>
              </article>
              <article className="announcement-card cta-card">
                <div className="announcement-body">
                  <h3>Tumawag ng mga Boluntaryo!</h3>
                  <p>Ang EM Card ay naghahanap ng mga nakatuon na boluntaryong nagtataguyod ng serbisyo, pananagutan, at aktibong pagkamamamayan.</p>
                  <a className="btn btn-primary" href="/register">Magrehistro Na</a>
                </div>
              </article>
            </div>
          </div>
        </section>


        {/* PROJECTS */}
        <section className="section tinted" id="projects">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Mga Update sa Proyekto</h2>
              <a href="#projects" className="view-all">Tingnan lahat ng proyekto →</a>
            </div>
            <div className="projects-grid">
              <article className="project-card">
                <div className="project-status ongoing">Kasalukuyang Gawain</div>
                <h3>Pagmamapa ng Pinagkukunan ng Komunidad</h3>
                <p>Pagtukoy sa mga pangangailangan ng komunidad, available na suporta, at prayoridad na lugar para sa tulong.</p>
                <div className="progress"><span style={{ width: '72%' }}></span></div>
                <small>72% kumpleto</small>
              </article>
              <article className="project-card">
                <div className="project-status ongoing">Kasalukuyang Gawain</div>
                <h3>Kampanya sa Pampublikong Impormasyon</h3>
                <p>Paggawa ng malinaw at kapaki-pakinabang na materyales sa impormasyon para sa mga residente at partner na grupo.</p>
                <div className="progress"><span style={{ width: '58%' }}></span></div>
                <small>58% kumpleto</small>
              </article>
              <article className="project-card">
                <div className="project-status completed">Kumpleto</div>
                <h3>Komunidad Konsultasyon Drive</h3>
                <p>Nakalap na mga puna ng mamamayan para gabayan ang mga hinaharap na programa at aktibidad.</p>
                <div className="progress"><span style={{ width: '100%' }}></span></div>
                <small>100% kumpleto</small>
              </article>
            </div>
          </div>
        </section>

        {/* MISSION & VISION */}
        <section className="section mv-section" id="news">
          <div className="container">
            <div className="mv-header">
              <h2 className="mv-section-title">OUR MISSION AND VISION</h2>
              <div className="mv-title-line"></div>
            </div>
            <div className="mv-grid">
              <div className="mv-card">
                <div className="mv-card-icon-wrap">
                  <div className="mv-icon-glow"></div>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 6C13.5 6 6 14.5 6 25c0 10.5 7.5 22 18 22s18-11.5 18-22c0-10.5-7.5-19-18-19z" stroke="#fff" strokeWidth="2" fill="none"/>
                    <path d="M24 20v-6M19 20h10M21 36h6v4h-6zM22 40v3M26 40v3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="mv-card-label">Mission</h3>
                <div className="mv-card-body">
                  <p className="mv-card-text">Naglalayong itaguyod ang pagkakaisa, kaunlaran at aktibong pakikilahok ng bawat mamamayan sa paghubog ng isang maayos, makatarungan at progresibong Lipunan.</p>
                  <p className="mv-card-text">Layunin nitong palakasin ang kakayahan ng mga komunidad sa pamamagitan ng mga programang pangkabuhayan, edukasyon, at serbisyong panlipunan habang isinusulong ang tapat at mabuting pamamahala, may integridad at malasakit sa kapwa.</p>
                </div>
              </div>
              <div className="mv-divider"></div>
              <div className="mv-card">
                <div className="mv-card-icon-wrap">
                  <div className="mv-icon-glow"></div>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="16" stroke="#fff" strokeWidth="2" fill="none"/>
                    <circle cx="24" cy="24" r="10" stroke="#fff" strokeWidth="2" fill="none"/>
                    <circle cx="24" cy="24" r="4" stroke="#fff" strokeWidth="2" fill="none"/>
                    <circle cx="24" cy="24" r="1.5" fill="#fff"/>
                    <line x1="24" y1="4" x2="24" y2="8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="24" y1="40" x2="24" y2="44" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="4" y1="24" x2="8" y2="24" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="40" y1="24" x2="44" y2="24" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="9.9" y1="9.9" x2="12.7" y2="12.7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="35.3" y1="35.3" x2="38.1" y2="38.1" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="mv-card-label">Vision</h3>
                <div className="mv-card-body">
                  <p className="mv-card-text">Isang pagkakaisa, maunlad at makatarungang Lipunan kung saan ang bawat mamamayan ay may pantay na oportunidad, aktibong nakikilahok sa pamamahala at may kakayahang mag ambag sa patuloy na pag unlad ng Balagtas.</p>
                  <p className="mv-card-text">Isinusulong ng kilusan ang mga komunidad na may malasakit, disiplina at nagsisilbing pundasyon ng isang matatag at progresibong kinabukasan para sa lahat.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRACK APPLICATION SECTION */}
        <section className="section track-section" id="track" style={{ background: 'linear-gradient(135deg, #0f3d2e 0%, #1a5c44 50%, #0d3326 100%)', padding: '80px 0' }}>
          <div className="container" style={{ maxWidth: '640px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <span style={{ color: '#34d399', fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem' }}>STATUS CHECKER</span>
              <h2 style={{ fontSize: '2rem', color: '#fff', fontWeight: '800', marginTop: '8px' }}>Track Your Application</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginTop: '8px' }}>Enter your reference number to check the status of your EM Card registration.</p>
            </div>

            <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <form onSubmit={handleTrackSearch} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Paste your reference number (e.g. EM-ABC123)..."
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
                    <><Search size={18} /> Search</>
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
                      { label: 'Submitted', done: true },
                      { label: 'Under Review', done: ['Pending','Approved','Rejected'].includes(trackResult.status) },
                      { label: 'Approved', done: trackResult.status === 'Approved' },
                      { label: 'Card Printing', done: trackResult.printedAt && trackResult.emCardNo },
                      { label: 'Ready', done: trackResult.printedAt && trackResult.emCardNo },
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
                                }}>Current</span>
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
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Name</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{trackResult.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Barangay</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{trackResult.barangay}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Date Submitted</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{new Date(trackResult.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    {trackResult.emCardNo && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>EM Card Number</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981' }}>{trackResult.emCardNo}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Card Printed</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: trackResult.printedAt ? '#10b981' : '#64748b' }}>{trackResult.printedAt ? new Date(trackResult.printedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not yet printed'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* INTERACTIVE FAQ SECTION */}
        <section className="section faq-section" id="faqs" style={{ background: '#f8fafc', padding: '100px 0' }}>
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
      <section className="section contact-section" id="contact">
        <div className="container contact-grid">
          <div>
            <h2 className="section-title" style={{ color: '#fff', fontSize: '2rem', marginBottom: '16px', fontWeight: '800' }}>Makipag-ugnayan at Magbigay ng Puna</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: '32px' }}>Magpadala ng mga katanungan, mungkahi, interes na boluntaryo, katanungan sa pakikipagtulungan, o mga alalahanin sa komunidad sa EM Card.</p>
            <div className="contact-details" style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0 }}><strong>Email:</strong> info@emcard.org</p>
              <p style={{ margin: 0 }}><strong>Telepono:</strong> +63 900 000 0000</p>
              <p style={{ margin: 0 }}><strong>Tanggapan:</strong> Community Service Center</p>
            </div>
            <div className="social-links" style={{ display: 'flex', gap: '16px' }}>
              <a href="#" aria-label="Facebook" style={{ color: 'rgba(255,255,255,0.8)', transition: 'color 0.2s' }}>
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
        <div className="container footer-grid" style={{ paddingBottom: '32px' }}>
          <div className="footer-brand">
            <span className="brand-mark">EM</span>
            <strong>EM Card</strong>
            <p>Epektibong Mamamayan — pagpapalakas ng komunidad sa pamamagitan ng serbisyo at aksyon.</p>
          </div>
          <div className="footer-links">
            <h4>Mabilis na Links</h4>
            <a href="#home">Home</a>
            <a href="#about">Tungkol sa Amin</a>
            <a href="#programs">Programa</a>
            <a href="#projects">Proyekto</a>
            <a href="#faqs">FAQs</a>
            <a href="#contact">Makipag-ugnayan</a>
            <a href="#track">Track Application</a>
          </div>
          <div className="footer-newsletter">
            <h4>Newsletter</h4>
            <p>Manatiling updated sa aming pinakabagong aktibidad.</p>
            <form className="newsletter-form">
              <input type="email" placeholder="Ilagay ang iyong email" />
              <button type="submit">→</button>
            </form>
          </div>
        </div>
        <div className="footer-bottom container">
          <p>© 2026 EM Card. Lahat ng Karapatan ay Nakalaan.</p>
        </div>
      </footer>
    </>
  );
}
