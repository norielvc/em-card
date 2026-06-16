# EM Card - User Acceptance Testing (UAT) Test Plan

## Project Information
- **Project Name:** EM Card (Epektibong Mamamayan)
- **Version:** 1.0
- **UAT Date:** [To be filled]
- **Tester:** [To be filled]

---

## Table of Contents
1. [Public Portal - Landing Page](#1-public-portal---landing-page)
2. [Public Portal - Calendar Page](#2-public-portal---calendar-page)
3. [Public Portal - Track Application](#3-public-portal---track-application)
4. [Admin Portal - Authentication](#4-admin-portal---authentication)
5. [Admin Portal - Dashboard](#5-admin-portal---dashboard)
6. [Admin Portal - Registration Management](#6-admin-portal---registration-management)
7. [Admin Portal - ID Card Management](#7-admin-portal---id-card-management)
8. [Admin Portal - QR Code Scanner](#8-admin-portal---qr-code-scanner)
9. [Admin Portal - Analytics](#9-admin-portal---analytics)
10. [Admin Portal - Notifications](#10-admin-portal---notifications)

---

## 1. Public Portal - Landing Page

### 1.1 Header & Navigation
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-001 | Logo Display | 1. Load homepage<br>2. Verify logo visibility | EM Card logo displays correctly with "Epektibong Mamamayan" tagline | ⬜ |
| PP-002 | Navigation Links | 1. Check all nav links<br>2. Click each link | Links: Home, About Us, Programs, FAQs, Contact, Track Application work correctly | ⬜ |
| PP-003 | Login Button | 1. Click Login button | Redirects to /admin login page | ⬜ |
| PP-004 | Mobile Menu | 1. Resize to mobile view<br>2. Click hamburger menu | Menu expands/collapses correctly on mobile | ⬜ |
| PP-005 | Header Scroll Behavior | 1. Scroll down page<br>2. Observe header | Header becomes solid background on scroll | ⬜ |

### 1.2 Hero Section
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-006 | Hero Slideshow | 1. Load homepage<br>2. Wait 5 seconds | Images rotate automatically with fade transition | ⬜ |
| PP-007 | Hero Title Display | 1. Verify title visibility | "EPEKTIBONG MAMAMAYAN" displays with correct styling (white + green) | ⬜ |
| PP-008 | Hero Description | 1. Read hero copy | Tagalog description about helping communities displays correctly | ⬜ |
| PP-009 | CTA Buttons | 1. Click "Matuto Pa Tungkol sa Amin"<br>2. Click "Panoorin ang Video" | First scrolls to About section, second opens video modal | ⬜ |
| PP-010 | Hero Stats | 1. Verify stats display | 4 stats show: Kabuuang Botante, Miyembro, Rate ng Rehistro, Bagong Naka-rehistro | ⬜ |
| PP-011 | Hero Cards | 1. Verify 4 hero cards display | Matatag na Komunidad, Sosyal na Suporta, Napapanatiling Pag-unlad, Pananagutan at Pagiging Bukas | ⬜ |
| PP-012 | Hero Animation | 1. Refresh page<br>2. Observe animations | Clean fade-in animations on hero elements | ⬜ |

### 1.3 Programs Section
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-013 | Section Title | 1. Scroll to Programs<br>2. Verify title | "Mga Programa ng EM Card" displays with underline | ⬜ |
| PP-014 | Pangkalahatang Programa | 1. Verify subsection title<br>2. Check 4 program items | Kalusugan, Kabuhayan, Komunidad, Karunungan display with icons | ⬜ |
| PP-015 | Programa para sa mga Sektor | 1. Verify subsection title<br>2. Check 4 sector cards | TODA Development, PWD's Rights, LGBTQIA+ Community, Youth Program display with images | ⬜ |
| PP-016 | Sector Card Images | 1. Verify all 4 card images load | toda.jpg, pwd.jpg, lgbtq.jpg, youth.jpg display correctly | ⬜ |
| PP-017 | Sector Card Badges | 1. Verify badge text | Each card shows correct badge: Transport,PWD,LGBTQIA+,Youth | ⬜ |
| PP-018 | Sector Card Lists | 1. Expand each card<br>2. Check list items | Each card shows 3 initiative items | ⬜ |
| PP-019 | Card Hover Effects | 1. Hover over sector cards | Cards lift and show shadow on hover | ⬜ |

### 1.4 Upcoming Events Section
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-020 | Section Title | 1. Verify title | "Mga Paparating na Kaganapan" displays | ⬜ |
| PP-021 | Events Carousel | 1. Check events display<br>2. Click arrows | Events rotate, navigation arrows work | ⬜ |
| PP-022 | Event Card Content | 1. Check event card | Shows: title, description, date, time, location, image | ⬜ |
| PP-023 | Event Countdown Badge | 1. Check events within 7 days | Shows "Ngayon!", "Bukas!", or "X araw na lang" badge | ⬜ |
| PP-024 | Social Share | 1. Click event card<br>2. Click share buttons | Facebook and Twitter share buttons work | ⬜ |
| PP-025 | View All Events | 1. Click "Tingnan ang Lahat ng Kaganapan" | Navigates to /calendar page | ⬜ |

### 1.5 About EM Card Section
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-026 | Section Title | 1. Verify title | "Ano ang EM Card?" displays | ⬜ |
| PP-027 | Description | 1. Read description | Organization description in Tagalog is accurate | ⬜ |
| PP-028 | Value Tags | 1. Verify 4 tags | Serbisyo, Integridad, Pagiging Bukas, Pananagutan display | ⬜ |
| PP-029 | ID Image | 1. Verify ID sample image | "ID 1 sample.png" displays correctly | ⬜ |

### 1.6 Mission & Vision Section
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-030 | Section Title | 1. Verify title | "ANG MISYON AT BISYON NATIN" displays in orange | ⬜ |
| PP-031 | Mission Card | 1. Check Mission content<br>2. Verify icon | HeartHandshake icon displays, content in Tagalog | ⬜ |
| PP-032 | Vision Card | 1. Check Vision content<br>2. Verify icon | Telescope icon displays, content in Tagalog | ✁ |
| PP-033 | Card Labels | 1. Verify labels | "Misyon" and "Bisyon" labels display correctly | ⬜ |

### 1.7 Track Application Section
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-034 | Section Title | 1. Verify title | "Subaybayan ang Aplikasyon" displays | ⬜ |
| PP-035 | Description | 1. Read description | Instructions in Tagalog are clear | ⬜ |
| PP-036 | Search Form | 1. Enter reference number<br>2. Click Search | Form accepts input and searches | ⬜ |
| PP-037 | Valid Search | 1. Search existing record<br>2. Verify results | Shows: status, progress steps, print button | ⬜ |
| PP-038 | Invalid Search | 1. Search non-existent ref<br>2. Verify message | Shows error: "Hindi natagpuan ang rekord..." | ⬜ |
| PP-039 | Progress Steps | 1. Check tracked result<br>2. Verify step labels | "Narehistro", "Naproseso", "Nai-print" steps show correctly | ⬜ |
| PP-040 | Print Card Button | 1. Click print button | Opens print dialog or shows printable view | ⬜ |

### 1.8 FAQ Section
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-041 | Section Label | 1. Verify label | "MGA GABAY" displays | ⬜ |
| PP-042 | Section Title | 1. Verify title | "Mga Madalas Itanong (FAQs)" displays | ⬜ |
| PP-043 | FAQ Accordion | 1. Click FAQ question<br>2. Click again | Expands to show answer, collapses on second click | ⬜ |
| PP-044 | FAQ Content | 1. Read all 6 FAQs | All questions and answers in Tagalog are accurate | ⬜ |
| PP-045 | FAQ Hover | 1. Hover over FAQ items | Subtle slide effect on hover | ⬜ |

### 1.9 Contact Section
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-046 | Section Title | 1. Verify title | "Makipag-ugnayan at Magbigay ng Puna" displays | ⬜ |
| PP-047 | Contact Details | 1. Verify contact info | Email, Telepono, Tanggapan info shows | ⬜ |
| PP-048 | Social Links | 1. Click social icons | Facebook, Twitter, Instagram links work | ⬜ |
| PP-049 | Contact Form | 1. Fill all fields<br>2. Submit | Form submits successfully with success message | ⬜ |
| PP-050 | Form Validation | 1. Submit empty form | Shows required field validation | ⬜ |
| PP-051 | Success State | 1. Submit valid form<br>2. Verify success | Shows "NaiPadala na ang Mensahe!" with checkmark | ⬜ |

### 1.10 Footer
| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PP-052 | Footer Links | 1. Click footer navigation links | All links scroll to correct sections | ⬜ |
| PP-053 | Newsletter | 1. Enter email<br>2. Subscribe | Newsletter subscription works | ⬜ |
| PP-054 | Copyright | 1. Verify copyright text | Shows "2025 EM Card. All rights reserved." | ⬜ |

---

## 2. Public Portal - Calendar Page

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CAL-001 | Page Load | 1. Navigate to /calendar | Calendar page loads with header and filters | ⬜ |
| CAL-002 | Header Title | 1. Verify title | "Kalendaryo ng mga Kaganapan" displays in white | ⬜ |
| CAL-003 | Back Link | 1. Click "Bumalik sa Home" | Returns to homepage | ⬜ |
| CAL-004 | Filter Buttons | 1. Click each filter<br>2. Verify events | Lahat, Kalusugan, Kabataan, Komunidad filters work | ⬜ |
| CAL-005 | Month Grouping | 1. Check events display | Events grouped by month (e.g., "Hunyo 2026") | ⬜ |
| CAL-006 | Event Cards | 1. Verify card content | Shows: date box, title, description, time, location | ⬜ |
| CAL-007 | Countdown Badges | 1. Check upcoming events | Shows correct countdown badges | ⬜ |
| CAL-008 | Event Modal | 1. Click event card<br>2. Verify modal | Wider modal opens with full details and social share | ⬜ |
| CAL-009 | Modal Close | 1. Click X or outside<br>2. Verify close | Modal closes correctly | ⬜ |
| CAL-010 | Social Share | 1. Click share buttons<br>2. Verify | Facebook and Twitter share opens correctly | ⬜ |
| CAL-011 | Empty State | 1. Filter to show no events | Shows "Walang nakatakdang kaganapan" message | ⬜ |
| CAL-012 | Responsive | 1. Test on mobile<br>2. Test on tablet | Layout adapts correctly | ⬜ |

---

## 3. Public Portal - Track Application

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| TRK-001 | Page Access | 1. Navigate to #track section | Section is accessible via URL or scroll | ⬜ |
| TRK-002 | Search Placeholder | 1. Check input field | Placeholder: "Ilagay ang reference number (hal. EM-ABC123)..." | ⬜ |
| TRK-003 | Search Button | 1. Verify button text | Shows "Hanapin" | ⬜ |
| TRK-004 | Loading State | 1. Search valid ref<br>2. Observe loading | Shows "Naghahanap..." during search | ⬜ |
| TRK-005 | Result Display | 1. Search valid ref | Shows applicant name, status, progress | ⬜ |
| TRK-006 | Progress Visualization | 1. Check progress bar | Shows completed and pending steps visually | ⬜ |
| TRK-007 | Print Functionality | 1. Click "I-print ang ID Card" | Opens print dialog with ID card | ⬜ |
| TRK-008 | Not Found Error | 1. Search invalid ref | Shows: "Hindi natagpuan ang rekord..." with help text | ⬜ |

---

## 4. Admin Portal - Authentication

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-001 | Login Page Load | 1. Navigate to /admin | Login page loads with EM Card branding | ⬜ |
| ADM-002 | Login Form | 1. Enter valid credentials<br>2. Click Login | Successfully logs in and redirects to dashboard | ⬜ |
| ADM-003 | Invalid Login | 1. Enter wrong password<br>2. Submit | Shows error message | ⬜ |
| ADM-004 | Password Visibility | 1. Click eye icon<br>2. Toggle | Password shows/hides correctly | ⬜ |
| ADM-005 | Remember Me | 1. Check Remember Me<br>2. Login<br>3. Close and reopen | Session persists based on selection | ⬜ |
| ADM-006 | Logout | 1. Click Logout | Successfully logs out and redirects to login | ⬜ |
| ADM-007 | Session Timeout | 1. Leave idle for timeout period | Auto-logout after inactivity | ⬜ |

---

## 5. Admin Portal - Dashboard

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-008 | Dashboard Load | 1. Login as admin<br>2. View dashboard | Dashboard loads with stats and charts | ⬜ |
| ADM-009 | Language Toggle | 1. Click EN/FIL toggle | Dashboard language switches correctly | ⬜ |
| ADM-010 | Stats Cards | 1. Verify 4 stat cards | Total Members, New Today, Pending, Printed display correctly | ⬜ |
| ADM-011 | Charts Display | 1. Verify charts load | Registration Trends and Demographics charts display | ⬜ |
| ADM-012 | Chart Data | 1. Check chart values | Data reflects actual database records | ⬜ |
| ADM-013 | Recent Activity | 1. Check activity feed | Recent registrations show with timestamps | ⬜ |
| ADM-014 | Quick Actions | 1. Click quick action buttons | Navigate to correct admin sections | ⬜ |
| ADM-015 | Real-time Updates | 1. Add new registration in another tab<br>2. Check dashboard | Stats update automatically | ⬜ |

---

## 6. Admin Portal - Registration Management

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-016 | Registration List | 1. Navigate to registrations<br>2. View list | Table shows all registrations with columns | ⬜ |
| ADM-017 | Search/Filter | 1. Use search box<br>2. Apply filters | Results filter correctly by name, status, date | ⬜ |
| ADM-018 | Pagination | 1. Navigate pages<br>2. Change items per page | Pagination works correctly | ⬜ |
| ADM-019 | Sort Columns | 1. Click column headers | Table sorts by clicked column | ⬜ |
| ADM-020 | View Details | 1. Click View on a record | Detail modal opens with full information | ⬜ |
| ADM-021 | Edit Registration | 1. Click Edit<br>2. Modify data<br>3. Save | Changes save successfully | ⬜ |
| ADM-022 | Update Status | 1. Change status dropdown<br>2. Save | Status updates (Registered → Processed → Printed) | ⬜ |
| ADM-023 | Delete Record | 1. Click Delete<br>2. Confirm | Record deletes after confirmation | ⬜ |
| ADM-024 | Bulk Actions | 1. Select multiple records<br>2. Apply bulk action | Bulk update/delete works | ⬜ |
| ADM-025 | Export Data | 1. Click Export<br>2. Choose format | Exports to Excel/CSV correctly | ⬜ |

---

## 7. Admin Portal - ID Card Management

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-026 | ID Card View | 1. Navigate to ID Cards<br>2. Select member | ID card preview displays correctly | ⬜ |
| ADM-027 | QR Code | 1. View ID card<br>2. Scan QR code | QR code scans and shows correct data | ⬜ |
| ADM-028 | Print ID Card | 1. Click Print | Print dialog opens with formatted ID card | ⬜ |
| ADM-029 | Download ID Card | 1. Click Download | Downloads ID card as PNG/PDF | ⬜ |
| ADM-030 | Batch Print | 1. Select multiple members<br>2. Batch print | Prints all selected ID cards | ⬜ |
| ADM-031 | ID Template | 1. Check ID card design | Shows: photo, name, ID number, EM Card branding | ⬜ |

---

## 8. Admin Portal - QR Code Scanner

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-032 | Scanner Page | 1. Navigate to Scanner<br>2. Allow camera | Camera preview displays | ⬜ |
| ADM-033 | Scan QR Code | 1. Show valid QR to camera | Scanner detects and displays member info | ⬜ |
| ADM-034 | Invalid QR | 1. Show invalid QR code | Shows error or no result message | ⬜ |
| ADM-035 | Manual Entry | 1. Type ID number<br>2. Search | Finds member by ID number | ⬜ |
| ADM-036 | Mark Attendance | 1. After scan<br>2. Click Mark Present | Records attendance for event/activity | ⬜ |
| ADM-037 | Scan History | 1. View scan history | Shows recent scans with timestamps | ⬜ |

---

## 9. Admin Portal - Analytics

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-038 | Analytics Dashboard | 1. Navigate to Analytics | Shows comprehensive charts and metrics | ⬜ |
| ADM-039 | Date Range Filter | 1. Select date range<br>2. Apply | Charts update for selected period | ⬜ |
| ADM-040 | Registration Trends | 1. View line chart | Shows registration trends over time | ⬜ |
| ADM-041 | Demographics | 1. View pie/bar charts | Shows age, gender, location distribution | ⬜ |
| ADM-042 | Program Analytics | 1. View program stats | Shows participation by program type | ⬜ |
| ADM-043 | Export Reports | 1. Click Export Report<br>2. Choose format | Downloads analytics report | ⬜ |

---

## 10. Admin Portal - Notifications

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ADM-044 | Notification Bell | 1. Check bell icon | Shows unread notification count badge | ⬜ |
| ADM-045 | View Notifications | 1. Click bell icon | Dropdown shows recent notifications | ⬜ |
| ADM-046 | Mark Read | 1. Click notification<br>2. Click Mark as Read | Notification marked as read | ⬜ |
| ADM-047 | Clear All | 1. Click Clear All | All notifications marked as read | ⬜ |
| ADM-048 | Real-time Notifications | 1. Trigger event (new registration)<br>2. Check admin | Notification appears in real-time | ⬜ |
| ADM-049 | Notification Types | 1. Check various notifications | Shows: new registration, status update, etc. | ⬜ |

---

## General Tests

### Cross-Browser Compatibility
| Test ID | Browser | Status |
|---------|---------|--------|
| GEN-001 | Chrome | ⬜ |
| GEN-002 | Firefox | ⬜ |
| GEN-003 | Safari | ⬜ |
| GEN-004 | Edge | ⬜ |

### Responsive Design
| Test ID | Device | Status |
|---------|--------|--------|
| GEN-005 | Desktop (1920x1080) | ⬜ |
| GEN-006 | Laptop (1366x768) | ⬜ |
| GEN-007 | Tablet (768x1024) | ⬜ |
| GEN-008 | Mobile (375x667) | ⬜ |

### Performance
| Test ID | Test Case | Target | Status |
|---------|-----------|--------|--------|
| GEN-009 | Page Load Time | < 3 seconds | ⬜ |
| GEN-010 | Image Optimization | WebP format | ⬜ |
| GEN-011 | Lazy Loading | Images load on scroll | ⬜ |

### Accessibility
| Test ID | Test Case | Status |
|---------|-----------|--------|
| GEN-012 | Keyboard Navigation | ⬜ |
| GEN-013 | Screen Reader Support | ⬜ |
| GEN-014 | Color Contrast | ⬜ |
| GEN-015 | Focus Indicators | ⬜ |

### Security
| Test ID | Test Case | Status |
|---------|-----------|--------|
| GEN-016 | HTTPS Connection | ⬜ |
| GEN-017 | SQL Injection Protection | ⬜ |
| GEN-018 | XSS Protection | ⬜ |
| GEN-019 | Authentication Required for Admin | ⬜ |

---

## UAT Sign-off

### Tester Information
- **Name:** _________________________
- **Date:** _________________________
- **Signature:** _________________________

### Test Results Summary
| Category | Total Tests | Passed | Failed | Pending |
|----------|-------------|--------|--------|---------|
| Public Portal - Landing Page | 54 | | | |
| Public Portal - Calendar | 12 | | | |
| Public Portal - Track | 8 | | | |
| Admin Portal | 49 | | | |
| General Tests | 19 | | | |
| **TOTAL** | **142** | | | |

### Critical Issues Found
1. ________________________________________________________
2. ________________________________________________________
3. ________________________________________________________

### Recommendations
1. ________________________________________________________
2. ________________________________________________________
3. ________________________________________________________

### Approval
- **Tested By:** _________________________ Date: ___________
- **Reviewed By:** _________________________ Date: ___________
- **Approved By:** _________________________ Date: ___________

---

**End of UAT Test Plan**
