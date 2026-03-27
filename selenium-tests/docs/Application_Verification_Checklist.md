# Community Portal - Application Verification Checklist

**Purpose**: Manual verification checklist for features not yet covered by automated tests  
**Last Updated**: February 11, 2026

---

## How to Use This Checklist

1. **Test each feature** in the application manually
2. **Mark** items as ✅ (Working), ❌ (Broken), or 🟡 (Partially Working)
3. **Document issues** in the "Notes" column
4. **Create bug tickets** for any failures
5. **Update this document** as features are fixed or automated

---

## 1. Super Admin Features

### 1.1 Authentication & Dashboard
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| Login with valid credentials | ✅ | Automated test passing | Selenium | 2026-02-11 |
| Login with invalid credentials | ✅ | Error message displayed | Selenium | 2026-02-11 |
| Dashboard displays total organizations count | ✅ | Count updates correctly | Selenium | 2026-02-11 |
| Dashboard displays total members count | ⬜ | Not yet tested | - | - |
| Logout functionality | ⬜ | Not yet tested | - | - |

### 1.2 Organization Management
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| Create new organization | ✅ | All fields validated | Selenium | 2026-02-11 |
| View organizations list | ✅ | List displays correctly | Selenium | 2026-02-11 |
| Search organizations | ⬜ | Not yet tested | - | - |
| Edit organization details | ⬜ | Not yet tested | - | - |
| Delete organization | ⬜ | Not yet tested | - | - |
| Generate organization signup link | ✅ | Link format correct | Selenium | 2026-02-11 |
| Copy signup link to clipboard | ⬜ | Not yet tested | - | - |
| View organization members | ⬜ | Not yet tested | - | - |

---

## 2. Organization Admin Features

### 2.1 Authentication & Setup
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| First-time password setup | ✅ | Works correctly | Selenium | 2026-02-11 |
| Login with credentials | ✅ | Redirects to dashboard | Selenium | 2026-02-11 |
| Dashboard access | ✅ | Loads correctly | Selenium | 2026-02-11 |
| Logout functionality | ⬜ | Not yet tested | - | - |

### 2.2 Member Management
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| Add new member | ✅ | Member created successfully | Selenium | 2026-02-11 |
| View members list | ⬜ | Not yet tested | - | - |
| Search members | ⬜ | Not yet tested | - | - |
| Edit member details | ⬜ | Not yet tested | - | - |
| Delete/deactivate member | ⬜ | Not yet tested | - | - |
| Resend member invitation | ⬜ | Not yet tested | - | - |

### 2.3 Master Data - Chapters
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| Navigate to Chapters page | ✅ | Navigation works | Selenium | 2026-02-11 |
| Create single chapter | 🟡 | **Backend works, but chapter NOT visible in list table** | Selenium | 2026-02-11 |
| Create multiple chapters | ❌ | **Only 1 chapter created, loop fails** | Selenium | 2026-02-11 |
| View chapter details | ❌ | **Blocked by list display issue** | Selenium | 2026-02-11 |
| Edit chapter | ❌ | **Blocked by list display issue** | Selenium | 2026-02-11 |
| Delete chapter | ❌ | **Blocked by list display issue** | Selenium | 2026-02-11 |
| Chapter count on dashboard | ✅ | Shows correct count (1) | Selenium | 2026-02-11 |
| Search chapters | ⬜ | Not yet tested | - | - |

**🔴 CRITICAL ISSUE**: Chapters are created in backend (visible on dashboard) but NOT appearing in the Chapters list table. This blocks all View/Edit/Delete operations.

### 2.4 Master Data - Categories
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| Navigate to Categories page | ✅ | Navigation works | Selenium | 2026-02-11 |
| Create single category | ✅ | Works correctly | Selenium | 2026-02-11 |
| Create multiple categories | ✅ | All 3 created successfully | Selenium | 2026-02-11 |
| View category details | ✅ | Modal opens with correct data | Selenium | 2026-02-11 |
| Edit category | ✅ | Updates reflected in list and dashboard | Selenium | 2026-02-11 |
| Delete category | ✅ | Alert confirmation works, count updates | Selenium | 2026-02-11 |
| Category count on dashboard | ✅ | Shows correct count (3 → 2 after delete) | Selenium | 2026-02-11 |
| Search categories | ⬜ | Not yet tested | - | - |

### 2.5 Master Data - Membership Plans
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| Navigate to Membership Plans page | ⬜ | Not yet tested | - | - |
| Create membership plan | ⬜ | Not yet tested | - | - |
| View plan details | ⬜ | Not yet tested | - | - |
| Edit membership plan | ⬜ | Not yet tested | - | - |
| Delete membership plan | ⬜ | Not yet tested | - | - |
| Set plan pricing | ⬜ | Not yet tested | - | - |

---

## 3. Member Features

### 3.1 Authentication & Profile
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| First-time password setup | ✅ | Works correctly | Selenium | 2026-02-11 |
| Login with credentials | ✅ | Redirects to dashboard | Selenium | 2026-02-11 |
| Complete profile | ✅ | All fields saved | Selenium | 2026-02-11 |
| Edit profile | ⬜ | Not yet tested | - | - |
| Upload profile picture | ⬜ | Not yet tested | - | - |
| Change password | ⬜ | Not yet tested | - | - |
| Logout functionality | ⬜ | Not yet tested | - | - |

### 3.2 Posts & Feed
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| View posts feed | ⬜ | Not yet tested | - | - |
| Create new post | ⬜ | Not yet tested | - | - |
| Add post with image | ⬜ | Not yet tested | - | - |
| Like a post | ⬜ | Not yet tested | - | - |
| Comment on post | ⬜ | Not yet tested | - | - |
| Edit own post | ⬜ | Not yet tested | - | - |
| Delete own post | ⬜ | Not yet tested | - | - |
| Share post | ⬜ | Not yet tested | - | - |
| Report inappropriate post | ⬜ | Not yet tested | - | - |

### 3.3 Meetings
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| View meetings list | ⬜ | Not yet tested | - | - |
| Schedule new meeting | ⬜ | Not yet tested | - | - |
| Add meeting attendees | ⬜ | Not yet tested | - | - |
| Edit meeting details | ⬜ | Not yet tested | - | - |
| Cancel meeting | ⬜ | Not yet tested | - | - |
| Join meeting (video call) | ⬜ | Not yet tested | - | - |
| Meeting reminders/notifications | ⬜ | Not yet tested | - | - |

### 3.4 Referrals
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| View referrals list | ⬜ | Not yet tested | - | - |
| Create new referral | ⬜ | Not yet tested | - | - |
| Add referral details | ⬜ | Not yet tested | - | - |
| View referral details | ⬜ | Not yet tested | - | - |
| Add comments to referral | ⬜ | Not yet tested | - | - |
| Update referral status | ⬜ | Not yet tested | - | - |
| Close/complete referral | ⬜ | Not yet tested | - | - |

### 3.5 Business Directory
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| View business directory | ⬜ | Not yet tested | - | - |
| Add business listing | ⬜ | Not yet tested | - | - |
| Search businesses | ⬜ | Not yet tested | - | - |
| Filter by category | ⬜ | Not yet tested | - | - |
| View business details | ⬜ | Not yet tested | - | - |
| Edit own business listing | ⬜ | Not yet tested | - | - |
| Delete business listing | ⬜ | Not yet tested | - | - |
| Contact business owner | ⬜ | Not yet tested | - | - |

### 3.6 Events
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| View events list | ⬜ | Not yet tested | - | - |
| Create new event | ⬜ | Not yet tested | - | - |
| RSVP to event | ⬜ | Not yet tested | - | - |
| View event details | ⬜ | Not yet tested | - | - |
| View event attendees | ⬜ | Not yet tested | - | - |
| Edit event (creator only) | ⬜ | Not yet tested | - | - |
| Cancel event | ⬜ | Not yet tested | - | - |
| Event reminders | ⬜ | Not yet tested | - | - |

---

## 4. Cross-Cutting Features

### 4.1 Notifications
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| Toast notifications on success | ⬜ | Not yet tested | - | - |
| Toast notifications on error | ⬜ | Not yet tested | - | - |
| In-app notification bell | ⬜ | Not yet tested | - | - |
| Email notifications | ⬜ | Not yet tested | - | - |
| Mark notifications as read | ⬜ | Not yet tested | - | - |

### 4.2 Search & Filters
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| Global search | ⬜ | Not yet tested | - | - |
| Filter by date range | ⬜ | Not yet tested | - | - |
| Filter by category | ⬜ | Not yet tested | - | - |
| Sort results | ⬜ | Not yet tested | - | - |

### 4.3 Responsive Design
| Feature | Status | Notes | Tested By | Date |
|---------|--------|-------|-----------|------|
| Desktop view (1920x1080) | ⬜ | Not yet tested | - | - |
| Tablet view (768x1024) | ⬜ | Not yet tested | - | - |
| Mobile view (375x667) | ⬜ | Not yet tested | - | - |
| Navigation menu on mobile | ⬜ | Not yet tested | - | - |

---

## 5. Known Issues & Bugs

### 🔴 Critical Issues

| ID | Feature | Issue Description | Impact | Status | Assigned To |
|----|---------|-------------------|--------|--------|-------------|
| BUG-001 | Chapters CRUD | Chapters created in backend but NOT visible in Chapters list table | HIGH - Blocks all chapter View/Edit/Delete operations | OPEN | - |

### 🟡 Medium Issues

| ID | Feature | Issue Description | Impact | Status | Assigned To |
|----|---------|-------------------|--------|--------|-------------|
| - | - | No medium issues reported yet | - | - | - |

### 🟢 Low Issues

| ID | Feature | Issue Description | Impact | Status | Assigned To |
|----|---------|-------------------|--------|--------|-------------|
| - | - | No low issues reported yet | - | - | - |

---

## 6. Test Data Requirements

### For Manual Testing

```javascript
// Super Admin
Email: superadmin@bizlinks.in
Password: <configured in .env>

// Test Organization
Name: ManualTest_Org_<timestamp>
Owner: Manual Test Owner
Contact: 9876543210
Email: manualtest_<timestamp>@example.com
Domain: manualtest-<timestamp>

// Test Member
Name: Jane Smith
Email: jane.smith_<timestamp>@example.com
Phone: 9876543211
Company: Test Company
Designation: QA Tester

// Test Chapter
Name: Test Chapter_<timestamp>
Phone: 9876543210
City: Test City
State: Test State

// Test Category
Name: Test Category_<timestamp>
Description: Test category for manual verification
```

---

## 7. Testing Guidelines

### Before Testing
1. Ensure application is running on correct port (default: 3000)
2. Database should be in clean state or have test data
3. Clear browser cache if testing login/logout
4. Use Chrome DevTools to monitor network requests

### During Testing
1. Test one feature at a time
2. Document exact steps to reproduce any issues
3. Take screenshots of errors
4. Note any console errors
5. Verify data persistence (refresh page)

### After Testing
1. Update this checklist with results
2. Create bug tickets for failures
3. Document any workarounds found
4. Clean up test data if needed

---

## 8. Next Steps

### Immediate (This Week)
- [ ] **Fix BUG-001**: Investigate and fix chapter list display issue
- [ ] Complete chapter CRUD testing once fixed
- [ ] Test membership plans CRUD operations
- [ ] Verify member management features

### Short Term (Next 2 Weeks)
- [ ] Test Posts & Feed functionality
- [ ] Implement Meetings test scenarios
- [ ] Verify Referrals features
- [ ] Test Business Directory

### Long Term (Next Month)
- [ ] Complete Events testing
- [ ] Test all notification types
- [ ] Verify responsive design on all devices
- [ ] Performance testing
- [ ] Security testing

---

**Checklist Version**: 1.0  
**Last Updated**: February 11, 2026  
**Maintained By**: QA Team
