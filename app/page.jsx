'use client';

import { useState, useEffect } from 'react';
import HeroSlideshow from './HeroSlideshow';
import { Users, Heart, TrendingUp, Shield, GraduationCap, HeartPulse, Sprout, Landmark } from 'lucide-react';

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#about">About Us</a>
            <a href="#programs">Programs</a>
            <a href="#projects">Projects</a>
            <a href="#news">News</a>
            <a href="#contact">Contact</a>
          </div>
          <a href="/register" className="btn btn-primary nav-btn">Get Involved →</a>
          <a href="/admin" className="btn btn-outline nav-login">Login</a>
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
              <p className="hero-copy">EM Card is dedicated to helping communities and promoting unity, support, and progress for every Filipino family.</p>
              <div className="hero-actions">
                <a className="btn hero-btn-solid" href="#about">Learn More About Us →</a>
                <button className="btn btn-outline hero-btn-outline">▶ Watch Video</button>
              </div>
            </div>

            {/* Hero Bottom Cards — single card with 4 items */}
            <div className="hero-cards">
              <div className="hero-card-item">
                <div className="hero-card-icon"><Users size={22} strokeWidth={1.5} /></div>
                <div className="hero-card-body">
                  <h4>Stronger Communities</h4>
                  <p>Building unity and empowering every citizen.</p>
                </div>
              </div>
              <div className="hero-card-divider" />
              <div className="hero-card-item">
                <div className="hero-card-icon"><Heart size={22} strokeWidth={1.5} /></div>
                <div className="hero-card-body">
                  <h4>Social Support</h4>
                  <p>Providing assistance and resources to those in need.</p>
                </div>
              </div>
              <div className="hero-card-divider" />
              <div className="hero-card-item">
                <div className="hero-card-icon"><TrendingUp size={22} strokeWidth={1.5} /></div>
                <div className="hero-card-body">
                  <h4>Sustainable Progress</h4>
                  <p>Creating long-term solutions for a better tomorrow.</p>
                </div>
              </div>
              <div className="hero-card-divider" />
              <div className="hero-card-item">
                <div className="hero-card-icon"><Shield size={22} strokeWidth={1.5} /></div>
                <div className="hero-card-body">
                  <h4>Accountable & Transparent</h4>
                  <p>Ensuring integrity and transparency in every action.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT WE DO */}
        <section className="section section-light" id="programs">
          <div className="container">
            <div className="section-center-header">
              <span className="section-label">WHAT WE DO</span>
              <h2 className="section-title">Programs and Initiatives</h2>
            </div>
            <div className="programs-grid">
              <div className="program-card">
                <div className="program-icon"><GraduationCap size={28} strokeWidth={1.5} /></div>
                <h3>Education</h3>
                <p>Supporting quality education and lifelong learning.</p>
                <a href="#programs" className="program-link">Learn More →</a>
              </div>
              <div className="program-card">
                <div className="program-icon"><HeartPulse size={28} strokeWidth={1.5} /></div>
                <h3>Health & Wellness</h3>
                <p>Promoting healthy communities and well-being.</p>
                <a href="#programs" className="program-link">Learn More →</a>
              </div>
              <div className="program-card">
                <div className="program-icon"><Sprout size={28} strokeWidth={1.5} /></div>
                <h3>Livelihood</h3>
                <p>Empowering individuals through livelihood programs.</p>
                <a href="#programs" className="program-link">Learn More →</a>
              </div>
              <div className="program-card">
                <div className="program-icon"><Landmark size={28} strokeWidth={1.5} /></div>
                <h3>Community Development</h3>
                <p>Building resilient and self-sustaining communities.</p>
                <a href="#programs" className="program-link">Learn More →</a>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT IS EM CARD */}
        <section className="section" id="about">
          <div className="container about-grid">
            <div className="about-content">
              <h2 className="section-title">What is EM Card?</h2>
              <p><strong>EM Card</strong> stands for <strong>Epektibong Mamamayan</strong> — a Non-Government Organization dedicated to encouraging active citizenship, community participation, and meaningful public service initiatives.</p>
              <p>We serve as a bridge between people and community action by sharing timely information, organizing activities, tracking projects, and listening to public feedback.</p>
              <div className="values-row">
                <span className="value-tag">Service</span>
                <span className="value-tag">Integrity</span>
                <span className="value-tag">Transparency</span>
                <span className="value-tag">Accountability</span>
              </div>
            </div>
            <div className="about-image">
              <img src="https://images.unsplash.com/photo-1560252829-804f1aedf1be?auto=format&fit=crop&w=600&q=80" alt="Community engagement" />
            </div>
          </div>
        </section>

        {/* LATEST ANNOUNCEMENTS */}
        <section className="section" id="announcements">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Latest Announcements</h2>
              <a href="#announcements" className="view-all">View all news →</a>
            </div>
            <div className="announcement-grid">
              <article className="announcement-card featured">
                <div className="announcement-img">
                  <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80" alt="Community Summit" />
                </div>
                <div className="announcement-body">
                  <h3>Community Leadership Summit 2026</h3>
                  <p>Organization-wide leadership orientation and community empowerment sessions.</p>
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
                  <h3>Team EM Card: Driving Change</h3>
                  <p>EM Card is a community-led organization dedicated to promoting transparency, service, and active citizenship.</p>
                </div>
              </article>
              <article className="announcement-card cta-card">
                <div className="announcement-body">
                  <h3>Call for Volunteers!</h3>
                  <p>EM Card is looking for dedicated volunteers committed to promoting service, accountability, and active citizenship.</p>
                  <a className="btn btn-primary" href="/register">Register Now</a>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* UPCOMING EVENTS */}
        <section className="section events-section" id="programs">
          <div className="container">
            <div className="events-header">
              <p className="events-eyebrow">Event Schedule</p>
              <h2 className="section-title">Upcoming Events</h2>
            </div>
            <div className="events-tabs">
              <button className="event-tab active">June 2026</button>
              <button className="event-tab">July 2026</button>
              <button className="event-tab">August 2026</button>
            </div>
            <div className="events-list">
              <div className="event-row">
                <div className="event-info">
                  <h3>Community Assembly</h3>
                  <p>General orientation for new members and program briefing</p>
                </div>
                <div className="event-thumb">
                  <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=200&q=80" alt="Community Assembly" />
                </div>
                <div className="event-details">
                  <span>10 AM to 3 PM</span>
                  <span>8 June 2026</span>
                  <span>Community Center</span>
                </div>
                <a href="#contact" className="event-cta">View Details →</a>
              </div>
              <div className="event-row">
                <div className="event-info">
                  <h3>Health and Wellness Mission</h3>
                  <p>Free medical check-up and wellness education for residents</p>
                </div>
                <div className="event-thumb">
                  <img src="https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=200&q=80" alt="Health Mission" />
                </div>
                <div className="event-details">
                  <span>8 AM to 4 PM</span>
                  <span>15 June 2026</span>
                  <span>Barangay Hall</span>
                </div>
                <a href="#contact" className="event-cta">View Details →</a>
              </div>
              <div className="event-row">
                <div className="event-info">
                  <h3>Youth Leadership Training</h3>
                  <p>Skills development, values formation, and civic engagement</p>
                </div>
                <div className="event-thumb">
                  <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=200&q=80" alt="Youth Training" />
                </div>
                <div className="event-details">
                  <span>9 AM to 5 PM</span>
                  <span>22 June 2026</span>
                  <span>Municipal Gym</span>
                </div>
                <a href="#contact" className="event-cta">View Details →</a>
              </div>
            </div>
          </div>
        </section>


        {/* PROJECTS */}
        <section className="section tinted" id="projects">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Project Updates</h2>
              <a href="#projects" className="view-all">View all projects →</a>
            </div>
            <div className="projects-grid">
              <article className="project-card">
                <div className="project-status ongoing">Ongoing</div>
                <h3>Community Resource Mapping</h3>
                <p>Identifying community needs, available support, and priority areas for assistance.</p>
                <div className="progress"><span style={{ width: '72%' }}></span></div>
                <small>72% complete</small>
              </article>
              <article className="project-card">
                <div className="project-status ongoing">Ongoing</div>
                <h3>Public Information Campaign</h3>
                <p>Producing clear and helpful information materials for residents and partner groups.</p>
                <div className="progress"><span style={{ width: '58%' }}></span></div>
                <small>58% complete</small>
              </article>
              <article className="project-card">
                <div className="project-status completed">Completed</div>
                <h3>Community Consultation Drive</h3>
                <p>Gathered citizen feedback to guide future programs and activities.</p>
                <div className="progress"><span style={{ width: '100%' }}></span></div>
                <small>100% complete</small>
              </article>
            </div>
          </div>
        </section>

        {/* OUR MISSION */}
        <section className="section mission-section" id="news">
          <div className="container">
            <h2 className="section-title centered">Our Mission</h2>
            <p className="mission-text">To empower citizens and communities through meaningful programs, transparent communication, and responsive public service initiatives for a better future.</p>
            <div className="mission-video">
              <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80" alt="EM Card mission" />
              <div className="play-overlay">
                <svg width="56" height="56" fill="none" viewBox="0 0 56 56"><circle cx="28" cy="28" r="28" fill="rgba(6,78,59,0.85)"/><polygon points="22,18 22,38 40,28" fill="white"/></svg>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="section contact-section" id="contact">
          <div className="container contact-grid">
            <div>
              <h2 className="section-title">Contact &amp; Feedback</h2>
              <p>Send questions, suggestions, volunteer interest, partnership inquiries, or community concerns to EM Card.</p>
              <div className="contact-details">
                <p><strong>Email:</strong> info@emcard.org</p>
                <p><strong>Phone:</strong> +63 900 000 0000</p>
                <p><strong>Office:</strong> Community Service Center</p>
              </div>
            </div>
            <form className="feedback-form">
              <label>Full Name<input type="text" name="name" placeholder="Your full name" required /></label>
              <label>Email Address<input type="email" name="email" placeholder="you@example.com" required /></label>
              <label>Inquiry Type
                <select name="type" required>
                  <option value="">Select one</option>
                  <option>General Inquiry</option>
                  <option>Volunteer</option>
                  <option>Donation</option>
                  <option>Program Concern</option>
                  <option>Feedback</option>
                  <option>Partnership</option>
                </select>
              </label>
              <label>Message<textarea name="message" rows="5" placeholder="Write your message here" required /></label>
              <button className="btn btn-primary" type="submit">Submit Message</button>
            </form>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <span className="brand-mark">EM</span>
            <strong>EM Card</strong>
            <p>Epektibong Mamamayan — empowering communities through service and action.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <a href="#home">Home</a>
            <a href="#about">About Us</a>
            <a href="#programs">Programs</a>
            <a href="#projects">Projects</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-newsletter">
            <h4>Newsletter</h4>
            <p>Stay updated with our latest activities.</p>
            <form className="newsletter-form">
              <input type="email" placeholder="Enter your email" />
              <button type="submit">→</button>
            </form>
            <div className="social-links">
              <a href="#" aria-label="Facebook">
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" aria-label="Twitter">
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
              </a>
              <a href="#" aria-label="Instagram">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom container">
          <p>© 2026 EM Card. All Rights Reserved.</p>
        </div>
      </footer>
    </>
  );
}
