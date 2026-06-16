# EM Card - Standard UAT Test Plan

**Project:** EM Card (Epektibong Mamamayan)  
**Version:** 1.0  
**Date:** June 2026  
**Tester:** _________________

---

## 1. Public Portal - Major Features

### 1.1 Homepage
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 1 | Page loads correctly | Open homepage | All sections display without errors | ⬜ |
| 2 | Hero slideshow works | Wait 10 seconds | Images rotate automatically | ⬜ |
| 3 | Navigation links work | Click each nav item | Smooth scroll to correct section | ⬜ |
| 4 | Mobile menu functions | Resize to mobile, click hamburger | Menu opens/closes properly | ⬜ |
| 5 | Programs display | Scroll to Programs section | 4 Pangkalahatang + 4 Sector cards show | ⬜ |
| 6 | Events carousel | View events section | Events slide, arrows work | ⬜ |
| 7 | Mission & Vision | Scroll to section | Both cards with icons display | ⬜ |
| 8 | FAQ accordion | Click each question | Expands/collapses correctly | ⬜ |
| 9 | Contact form | Fill and submit form | Success message displays | ⬜ |

### 1.2 Track Application
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 10 | Search valid record | Enter valid ref number | Shows status and progress | ⬜ |
| 11 | Search invalid record | Enter fake ref number | Shows "not found" error | ⬜ |
| 12 | Mobile responsive | Test on mobile view | Form stacks vertically | ⬜ |

### 1.3 Calendar Page
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 13 | Page loads | Navigate to /calendar | Events display grouped by month | ⬜ |
| 14 | Filter works | Click filter buttons | Events filter correctly | ⬜ |
| 15 | Event modal | Click event card | Modal opens with details | ⬜ |

---

## 2. Admin Portal - Major Features

### 2.1 Authentication
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 16 | Login works | Enter valid credentials | Dashboard loads | ⬜ |
| 17 | Invalid login blocked | Enter wrong password | Error message shows | ⬜ |
| 18 | Logout works | Click logout | Returns to login page | ⬜ |

### 2.2 Dashboard
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 19 | Stats display | View dashboard | 4 stat cards show numbers | ⬜ |
| 20 | Charts load | Verify charts | Registration & demographic charts visible | ⬜ |
| 21 | Language toggle | Click EN/FIL | Interface language changes | ⬜ |

### 2.3 Registration Management
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 22 | View registrations | Go to registrations page | List displays with pagination | ⬜ |
| 23 | Search/filter | Use search box | Results filter correctly | ⬜ |
| 24 | Edit registration | Click edit, modify, save | Changes saved successfully | ⬜ |
| 25 | Update status | Change status dropdown | Status updates in real-time | ⬜ |
| 26 | Delete record | Click delete, confirm | Record removed from list | ⬜ |
| 27 | Bulk operations | Select multiple, apply action | Bulk action executes | ⬜ |
| 28 | Export data | Click export | File downloads successfully | ⬜ |

### 2.4 ID Card Management
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 29 | Generate ID card | Select member, view card | Card preview with QR displays | ⬜ |
| 30 | Print card | Click print | Print dialog opens | ⬜ |
| 31 | Download card | Click download | Image file downloads | ⬜ |

### 2.5 QR Scanner
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 32 | Enter event name | Input event, start scanning | Scanner interface opens | ⬜ |
| 33 | Scan valid QR | Scan approved card | Member details display | ⬜ |
| 34 | Duplicate detection | Scan same card twice | Duplicate warning shows | ⬜ |

### 2.6 Messaging
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 35 | Send SMS | Compose message, select recipients, send | Message sends successfully | ⬜ |
| 36 | Birthday greetings | View birthday list, send greetings | Messages sent to birthday celebrants | ⬜ |
| 37 | View message history | Go to messages | Sent messages list displays | ⬜ |

### 2.7 Events Management
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 38 | Create event | Fill form, save | Event appears in list | ⬜ |
| 39 | Edit event | Modify event, save | Changes saved | ⬜ |
| 40 | Delete event | Click delete, confirm | Event removed | ⬜ |

### 2.8 User Management
| # | Test Scenario | Steps | Expected Result | Status |
|---|---------------|-------|-----------------|--------|
| 41 | Create admin | Add new user with role | User created successfully | ⬜ |
| 42 | Edit permissions | Change user role | Permissions updated | ⬜ |
| 43 | Reset password | Reset user password | Password reset works | ⬜ |

---

## 3. End-to-End Workflows

| # | Workflow | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| 44 | Complete registration flow | New reg → Approve → Print → Scan | All steps execute successfully | ⬜ |
| 45 | Rejection flow | Submit reg → Reject → View status | Rejection handled correctly | ⬜ |
| 46 | Bulk card printing | Select 10 members → Bulk print | All cards generated | ⬜ |
| 47 | SMS campaign | Compose → Select all → Send | Messages delivered | ⬜ |
| 48 | Event creation to public view | Create event → View on calendar | Event visible publicly | ⬜ |

---

## 4. Cross-Browser Testing

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ⬜ |
| Firefox | Latest | ⬜ |
| Safari | Latest | ⬜ |
| Edge | Latest | ⬜ |

---

## 5. Responsive Testing

| Device | Resolution | Status |
|--------|------------|--------|
| Desktop | 1920x1080 | ⬜ |
| Laptop | 1366x768 | ⬜ |
| Tablet | 768x1024 | ⬜ |
| Mobile | 375x667 | ⬜ |

---

## 6. Critical Issues Log

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | | Critical / High / Medium / Low | Open / Fixed |
| 2 | | | |
| 3 | | | |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Reviewer | | | |
| Approver | | | |

---

**Total Test Cases:** 48  
**Passed:** ___  
**Failed:** ___  
**Completion:** ___%
