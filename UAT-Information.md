# EM Card - Comprehensive UAT Information Document

## Project Overview

**Project Name:** EM Card (Epektibong Mamamayan)  
**Version:** 1.0  
**Technology Stack:** Next.js 16, React 19, Supabase, Lucide Icons  
**Language:** Tagalog (Filipino) with English admin interface option  

---

## System Architecture

### Frontend Structure
```
app/
├── page.jsx              # Public landing page (homepage)
├── layout.jsx            # Root layout with metadata
├── globals.css           # Global styles (327KB+ of CSS)
├── HeroSlideshow.jsx     # Hero image carousel
├── track/page.jsx        # Standalone track application page
├── scan/page.jsx         # QR Code scanner for volunteers
├── calendar/page.jsx     # Events calendar
├── card/[token]/page.jsx # Citizen dashboard (per card)
├── admin/page.jsx        # Admin portal (single file, ~8000+ lines)
├── api/                  # API routes (12 endpoints)
└── components/           # Shared components
```

### API Endpoints
1. `/api/track-registration` - Track registration status
2. `/api/upcoming-events` - CRUD for events
3. `/api/contact` - Contact form submissions
4. `/api/send-sms` - SMS messaging via Semaphore
5. `/api/admin-logs` - Admin action logging
6. `/api/analytics` - Dashboard analytics data
7. `/api/admin/users` - User management
8. `/api/registrations/delete` - Delete registrations
9. `/api/search-residents` - Search valid residents
10. `/api/system/stats` - System statistics
11. `/api/upload-image` - Image uploads
12. `/api/upload-member-photo` - Member photo uploads

### Database Tables (Supabase)
- `registrations` - Member registrations
- `ValidResidents` - Validated resident data
- `upcoming_events` - Events management
- `contact_inquiries` - Contact form messages
- `admin_users` - Admin accounts
- `admin_logs` - Audit trail
- `grievances` - Citizen feedback/complaints
- `messages` - SMS message history

---

## Detailed Feature List for UAT

### 1. PUBLIC PORTAL (Landing Page)

#### 1.1 Header & Navigation
- **Logo:** EM Card with "Epektibong Mamamayan" tagline
- **Navigation Items:**
  - Home (scrolls to hero)
  - About Us (scrolls to #about)
  - Programs (scrolls to #programs)
  - FAQs (scrolls to #faqs)
  - Contact (scrolls to #contact)
  - Track Application (scrolls to #track)
- **Login Button:** Links to /admin
- **Mobile Menu:** Hamburger menu with full-screen overlay
- **Scroll Behavior:** Header becomes solid on scroll

#### 1.2 Hero Section
- **Slideshow:** 4 rotating background images (5-second intervals)
- **Headline:** "EPEKTIBONG MAMAMAYAN" (white + green split)
- **Description:** Tagalog copy about helping communities
- **CTA Buttons:**
  - "Matuto Pa Tungkol sa Amin" (green, scrolls to about)
  - "Panoorin ang Video" (outline, opens video modal)
- **Stats Strip:** 4 stats (mobile only)
  - Kabuuang Botante: 54,258
  - Miyembro ng EM Card: 0
  - Rate ng Rehistro: 0%
  - Bagong Naka-rehistro: 0
- **Hero Cards:** 4 cards at bottom
  1. Matatag na Komunidad (Users icon)
  2. Sosyal na Suporta (Heart icon)
  3. Napapanatiling Pag-unlad (TrendingUp icon)
  4. Pananagutan at Pagiging Bukas (Shield icon)

#### 1.3 Programs Section
**Header:**
- Title: "Mga Programa ng EM Card"
- Subtitle: Program description in Tagalog

**Pangkalahatang Programa (4 items):**
1. **Kalusugan** (HeartPulse icon)
   - Medical missions, free check-ups, health education
2. **Kabuhayan** (Sprout icon)
   - Livelihood training, financial assistance
3. **Komunidad** (Landmark icon)
   - Clean-up drives, disaster response
4. **Karunungan** (GraduationCap icon)
   - Educational support, scholarships

**Programa para sa mga Sektor (4 cards with images):**
1. **TODA Development** (toda.jpg)
   - Transport sector programs
2. **PWD's Rights & Benefits** (pwd.jpg)
   - Disability support programs
3. **LGBTQIA+ Community Rights** (lgbtq.jpg)
   - LGBTQIA+ awareness programs
4. **Youth Program** (youth.jpg)
   - Youth leadership and development

#### 1.4 Upcoming Events Section
- **Title:** "Mga Paparating na Kaganapan"
- **Features:**
  - Carousel with auto-slide (5 seconds)
  - Event countdown badges ("Ngayon!", "Bukas!", "X araw na lang")
  - Social share buttons (Facebook, Twitter)
  - Event detail modal
  - "Tingnan ang Lahat ng Kaganapan" link → /calendar

#### 1.5 About EM Card Section
- **Title:** "Ano ang EM Card?"
- **Content:** Organization description (NGO focused on community)
- **Value Tags:** Serbisyo, Integridad, Pagiging Bukas, Pananagutan
- **Image:** ID 1 sample.png

#### 1.6 Mission & Vision Section
- **Title:** "ANG MISYON AT BISYON NATIN"
- **Mission Card:**
  - Icon: HeartHandshake
  - Label: "Misyon"
  - Content: Community unity and participation goals
- **Vision Card:**
  - Icon: Telescope
  - Label: "Bisyon"
  - Content: Progressive society vision

#### 1.7 Track Application Section
- **Title:** "Subaybayan ang Aplikasyon"
- **Features:**
  - Reference number input
  - Search button with loading state
  - Results display:
    - Status badge (Approved/Pending/Rejected)
    - Progress steps (5 steps with visual indicators)
    - Applicant details (Name, Barangay, Date, EM Card No)
    - Print Card button
  - Error handling for invalid references

#### 1.8 FAQ Section
- **Label:** "MGA GABAY"
- **Title:** "Mga Madalas Itanong (FAQs)"
- **6 Questions:**
  1. What is EM Card?
  2. Who can join?
  3. How to register?
  4. What are the benefits?
  5. Is there a fee?
  6. How to update information?
- **Accordion behavior:** Expand/collapse

#### 1.9 Contact Section
- **Title:** "Makipag-ugnayan at Magbigay ng Puna"
- **Contact Details:**
  - Email: info@emcard.org
  - Phone: +63 900 000 0000
  - Office: Community Service Center
- **Social Links:** Facebook, Twitter, Instagram
- **Contact Form:**
  - Fields: Name, Email, Type (dropdown), Message
  - Validation required
  - Success state with checkmark

#### 1.10 Footer
- Navigation links
- Newsletter subscription
- Copyright: © 2025 EM Card

---

### 2. ADDITIONAL PUBLIC PAGES

#### 2.1 Track Page (/track)
- **Standalone page** (separate from landing page section)
- **English interface**
- **Features:**
  - Reference number search
  - Timeline visualization
  - Detailed status tracking
  - Card printing option

#### 2.2 Calendar Page (/calendar)
- **Title:** "Kalendaryo ng mga Kaganapan"
- **Filters:** Lahat, Kalusugan, Kabataan, Komunidad
- **Month grouping:** Events grouped by month
- **Event cards:** Date box, title, description, time, location
- **Modal:** Full event details with social share
- **Responsive:** Mobile-adaptive grid

#### 2.3 QR Scanner Page (/scan)
**Purpose:** Volunteer scanning for distribution verification

**Event Entry Screen:**
- Event name input
- "Start Scanning" button

**Scanner Interface:**
- QR code input (camera/manual)
- Result display:
  - Success: Identity verified, photo, barangay, eligibility
  - Duplicate: Warning with previous scan details
  - Error: Invalid QR message
- Recent scans list (last 10)
- Auto-clear after 4 seconds

#### 2.4 Card Dashboard (/card/[token])
**Purpose:** Citizen self-service portal

**Features:**
- Personalized greeting (time-based: umaga/hapon/gabi)
- Profile card with photo and verification badge
- **Active Benefits:**
  - Community Relief Aid
  - Referral Program
  - Local Events Access
- **Scan History:**
  - Last scanned date
  - Total scan count
- **Digital Suggestion Box:**
  - Types: Feedback, Suggestion, Grievance, Complaint
  - Textarea input
  - Submit to barangay coordinator

---

### 3. ADMIN PORTAL (/admin)

#### 3.1 Authentication
- **Login page** with EM Card branding
- **Fields:** Username/Email, Password
- **Features:**
  - Password visibility toggle
  - Remember me checkbox
  - Session timeout handling
  - Error messages

#### 3.2 Dashboard
**Stats Cards:**
- Total Members
- New Today
- Pending Applications
- Cards Printed

**Charts:**
- Registration Trends (line chart)
- Demographics (age, gender, barangay)

**Recent Activity:**
- Live feed of new registrations
- Real-time updates

**Quick Actions:**
- Add New Member
- Print Cards
- Send Messages
- View Reports

#### 3.3 Registration Management
**Registration Table:**
- Columns: ID, Name, Barangay, Status, Date, Actions
- **Search/Filter:** By name, status, barangay, date range
- **Pagination:** Configurable items per page
- **Sortable columns**

**Actions per Record:**
- **View:** Full details modal
- **Edit:** Modify registration data
- **Update Status:**
  - Pending → Approved/Rejected
  - Approved → Processed → Printed
- **Delete:** With confirmation
- **Print Card:** Generate ID card

**Bulk Actions:**
- Select multiple records
- Bulk status update
- Bulk delete
- Export selected

**Registration Form:**
- Personal info (name, birthday, contact)
- Address (barangay, purok)
- Photo upload (with compression)
- Resident validation (search against ValidResidents)
- Referral tracking

#### 3.4 ID Card Management
- **Card Preview:** Real-time preview with QR code
- **QR Code:** Unique token per card
- **Print Options:**
  - Single card print
  - Batch print (multiple cards)
- **Download:** PNG/PDF export
- **Template:** Standardized EM Card design

#### 3.5 QR Code Scanner (Admin)
- **Camera-based scanning**
- **Manual token entry**
- **Member lookup** by scanned QR
- **Verification status** check
- **Distribution marking** (eligible/not eligible)

#### 3.6 Analytics & Reports
**Dashboard Analytics:**
- Registration trends (daily/weekly/monthly)
- Demographic breakdowns:
  - By barangay
  - By age group
  - By gender
  - By civil status
- Program participation stats
- Growth comparisons

**Report Types:**
- Member masterlist
- Registration summary
- Barangay distribution
- Birthday list (for greetings)

**Export Formats:**
- Excel (.xlsx)
- CSV
- PDF

#### 3.7 Messaging System
**SMS Integration (Semaphore API):**
- Compose messages
- Recipient selection:
  - All members
  - By barangay
  - By program
  - Individual selection
- **Birthday Automation:**
  - Auto-detect upcoming birthdays
  - Send greeting messages
  - Personalized templates

**Message History:**
- Sent messages log
- Delivery status tracking
- Recipients list per message

#### 3.8 Upcoming Events Management
- **CRUD Operations:**
  - Create new event
  - Edit existing
  - Delete (with confirmation)
- **Fields:**
  - Title, description
  - Date and time
  - Location
  - Category (health, youth, community)
  - Cover image
- **Social sharing** metadata

#### 3.9 Contact Inquiries Management
- **Inquiry List:** From public contact form
- **Status Tracking:** New, In Progress, Resolved
- **Assignment:** Assign to admin staff
- **Response:** Reply to citizen
- **Notifications:** Real-time alerts

#### 3.10 Admin User Management
**User Roles:**
- Super Admin (full access)
- Admin (registration management)
- Viewer (read-only access)

**User Management:**
- Create new admin accounts
- Edit roles/permissions
- Reset passwords
- Deactivate accounts
- Activity logging

#### 3.11 System Logs & Audit Trail
**Admin Logs:**
- Action type (CREATE, UPDATE, DELETE)
- Target table and record
- Admin who performed action
- Timestamp
- IP address

**Filterable by:**
- Date range
- Admin user
- Action type
- Table affected

#### 3.12 Settings & Configuration
**System Settings:**
- Barangay list management
- Program categories
- SMS provider configuration
- Email settings
- Logo/branding updates

---

## UAT Test Data Requirements

### Test Accounts Needed
```
Admin Accounts:
1. superadmin@emcard.org / password (Super Admin role)
2. admin@emcard.org / password (Admin role)
3. viewer@emcard.org / password (Viewer role)
```

### Sample Data to Prepare
1. **Valid Residents:** At least 50 test records
2. **Registrations:** Mix of statuses (Pending, Approved, Rejected, Printed)
3. **Events:** 5-10 upcoming events across categories
4. **Contact Inquiries:** 5 test messages
5. **Scan History:** Sample scan records

### Test Scenarios
1. **Complete Registration Flow:**
   - New resident → Registration → Approval → Card Print → QR Scan
2. **Rejection Flow:**
   - Registration → Rejection → Reapply
3. **Bulk Operations:**
   - Select 20 records → Bulk approve → Bulk print
4. **SMS Campaign:**
   - Compose → Select recipients → Send → Verify delivery

---

## Browser & Device Requirements

### Supported Browsers
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Responsive Breakpoints
- Desktop: 1920px, 1366px
- Tablet: 768px
- Mobile: 375px, 320px

### Performance Targets
- Page load: < 3 seconds
- First Contentful Paint: < 1.5 seconds
- Time to Interactive: < 3.5 seconds

---

## Security Requirements for UAT

### Authentication Tests
- [ ] Password strength validation
- [ ] Brute force protection
- [ ] Session timeout enforcement
- [ ] Concurrent session handling
- [ ] Password reset flow

### Authorization Tests
- [ ] Role-based access control
- [ ] URL direct access blocking
- [ ] API endpoint protection
- [ ] Data isolation between users

### Data Protection
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] File upload validation
- [ ] Sensitive data masking

---

## UAT Entry & Exit Criteria

### Entry Criteria (Before UAT Starts)
1. All critical bugs resolved
2. Code freeze implemented
3. Test environment deployed
4. Test data prepared
5. UAT team trained

### Exit Criteria (UAT Complete)
1. All test cases executed
2. Critical defects resolved
3. Zero show-stopper bugs
4. Performance targets met
5. Sign-off from stakeholders

---

## Defect Severity Levels

| Severity | Definition | Example | Response Time |
|----------|------------|---------|---------------|
| **Critical** | System unusable, data loss | Can't login, registration fails | Immediate |
| **High** | Major feature broken | Search not working, SMS fails | 24 hours |
| **Medium** | Feature partially broken | UI misalignment, slow loading | 48 hours |
| **Low** | Cosmetic issues | Spelling errors, minor styling | 1 week |

---

## UAT Schedule Template

| Day | Activity | Duration |
|-----|----------|----------|
| Day 1 | Public Portal Testing | 4 hours |
| Day 2 | Admin Portal - Registration | 4 hours |
| Day 3 | Admin Portal - ID/Messaging | 4 hours |
| Day 4 | QR Scanner & Card Dashboard | 3 hours |
| Day 5 | Cross-browser & Mobile | 3 hours |
| Day 6 | Regression & Bug Verification | 4 hours |
| Day 7 | Final Review & Sign-off | 2 hours |

---

## Contact Information

**UAT Coordinator:** [Name]  
**Technical Lead:** [Name]  
**Project Manager:** [Name]  
**Emergency Contact:** [Number]

---

**Document Version:** 1.0  
**Last Updated:** June 16, 2026  
**Next Review:** [Date]
