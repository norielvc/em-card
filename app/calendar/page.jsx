'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, ChevronLeft } from 'lucide-react';
import './calendar.css';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/upcoming-events');
        const data = await res.json();
        if (data.events) {
          // Sort by date
          const sorted = data.events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
          setEvents(sorted);
        }
      } catch (e) {
        console.error('Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

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

  const shareEvent = (platform, event) => {
    const eventUrl = encodeURIComponent(window.location.href);
    const eventTitle = encodeURIComponent(event.title);

    let shareUrl = '';
    if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${eventUrl}&quote=${eventTitle}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?url=${eventUrl}&text=${eventTitle}`;
    }
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const groupEventsByMonth = (events) => {
    const grouped = {};
    events.forEach(evt => {
      const date = new Date(evt.event_date);
      const monthKey = date.toLocaleDateString('fil-PH', { month: 'long', year: 'numeric' });
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(evt);
    });
    return grouped;
  };

  const filteredEvents = filter === 'all' ? events : events.filter(e => {
    const title = e.title.toLowerCase();
    if (filter === 'health') return title.includes('health') || title.includes('medical') || title.includes('wellness');
    if (filter === 'youth') return title.includes('youth') || title.includes('sports') || title.includes('leadership');
    if (filter === 'community') return title.includes('community') || title.includes('bayanihan');
    return true;
  });

  const groupedEvents = groupEventsByMonth(filteredEvents);

  return (
    <div className="calendar-page">
      {/* Header */}
      <header className="calendar-header">
        <div className="container">
          <div className="calendar-header-content">
            <Link href="/" className="back-link">
              <ChevronLeft size={20} />
              Bumalik sa Home
            </Link>
            <h1>Kalendaryo ng mga Kaganapan</h1>
            <p>Tingnan ang lahat ng paparating at nakaraang mga kaganapan ng EM Card</p>
          </div>
        </div>
      </header>

      {/* Filter Buttons */}
      <div className="calendar-filters">
        <div className="container">
          <div className="filter-buttons">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              Lahat
            </button>
            <button className={filter === 'health' ? 'active' : ''} onClick={() => setFilter('health')}>
              Kalusugan
            </button>
            <button className={filter === 'youth' ? 'active' : ''} onClick={() => setFilter('youth')}>
              Kabataan
            </button>
            <button className={filter === 'community' ? 'active' : ''} onClick={() => setFilter('community')}>
              Komunidad
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <main className="calendar-main">
        <div className="container">
          {loading ? (
            <div className="calendar-loading">Naglo-load ng mga kaganapan...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="calendar-empty">
              <Calendar size={48} />
              <h3>Walang nakatakdang kaganapan</h3>
              <p>Magbabalik mamaya para sa mga update.</p>
            </div>
          ) : (
            <div className="calendar-timeline">
              {Object.entries(groupedEvents).map(([month, monthEvents]) => (
                <div key={month} className="calendar-month">
                  <h2 className="month-header">{month}</h2>
                  <div className="events-grid">
                    {monthEvents.map(evt => {
                      const evtDate = new Date(evt.event_date);
                      const day = evtDate.getDate();
                      const weekday = evtDate.toLocaleDateString('fil-PH', { weekday: 'short' });
                      const countdown = getCountdownBadge(evt.event_date);

                      return (
                        <div key={evt.id} className="calendar-event-card" onClick={() => setSelectedEvent(evt)}>
                          <div className="event-date-box">
                            <span className="event-day">{day}</span>
                            <span className="event-weekday">{weekday}</span>
                          </div>
                          <div className="event-content">
                            <h3>{evt.title}</h3>
                            <p className="event-desc">{evt.description || 'Maghintay para sa higit pang detalye.'}</p>
                            <div className="event-meta">
                              {evt.event_time && (
                                <span><Clock size={14} /> {evt.event_time}</span>
                              )}
                              {evt.location && (
                                <span><MapPin size={14} /> {evt.location}</span>
                              )}
                            </div>
                          </div>
                          {countdown && (
                            <div className="event-countdown" style={{ backgroundColor: countdown.color }}>
                              {countdown.text}
                            </div>
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
      </main>

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
                  <Calendar size={16} />
                  <span>{new Date(selectedEvent.event_date).toLocaleDateString('fil-PH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                {selectedEvent.event_time && (
                  <div className="event-meta-row">
                    <Clock size={16} />
                    <span>{selectedEvent.event_time}</span>
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="event-meta-row">
                    <MapPin size={16} />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
              </div>

              {/* Social Share */}
              <div className="event-social-share">
                <span className="share-label">Ibahagi:</span>
                <button className="share-btn share-facebook" onClick={() => shareEvent('facebook', selectedEvent)}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>f</span>
                </button>
                <button className="share-btn share-twitter" onClick={() => shareEvent('twitter', selectedEvent)}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>X</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
