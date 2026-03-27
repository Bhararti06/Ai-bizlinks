# Project Documentation: Community Portal Application

> **Version:** 1.0.0
> **Last Updated:** 2026-01-29
> **Status:** Live & Stable

---

## 1️⃣ Project Overview

**Project Name:** BizLinks Community Portal

**Purpose:**
A unified, multi-tenant digital platform designed for professional networking groups to manage their operations, members, events, and business exchanges (referrals) efficiently.

**Business Problem Solved:**
Traditional networking groups suffer from manual tracking of referrals, disjointed event management, and lack of inter-chapter visibility. This portal digitizes the entire experience, providing real-time stats on "Business Given" and centralized member directories.

**Target Users:**
1.  **Business Networking Organizations** (e.g., similar to BNI, Rotary).
2.  **Alumni Associations**.
3.  **Chambers of Commerce**.

---

## 2️⃣ User Roles & Permissions

### 👑 Super Admin
**Scope:** Global (Multi-Tenant)
- **Access Route:** `/super-admin/login`
- **Capabilities:**
    - Create/Onboard new Organizations.
    - View global statistics (Total Orgs, Total Members).
    - Manage Organization Admins.
- **Restrictions:** Cannot view private messages or sensitive internal data of specific organizations unless impersonating.

### 🛡️ Admin (Organization Owner)
**Scope:** Single Organization
- **Capabilities:**
    - **Master Data:** Manage Chapters, Member Categories, Membership Plans.
    - **Members:** Approve/Reject registrations, Renew memberships, Edit member profiles.
    - **Events/Trainings:** Create global events, manage internal/external registrations.
    - **Settings:** Customize "Naming Conventions" (e.g., rename "Chapter" to "Branch"), Update Logo/Branding.
    - **Reports:** View Revenue generated, Referrals exchanged.

### 🏛️ Chapter Admin
**Scope:** Single Chapter within an Organization
- **Capabilities:**
    - Manage members within their specific Chapter.
    - Schedule Chapter Meetings.
    - View Chapter-specific reports (Business Done, Thanks Notes).
- **Restrictions:** Cannot change Organization-wide settings (Logo, Plans).

### 👤 Member
**Scope:** Self & Public Community
- **Capabilities:**
    - **Profile:** Edit Bio, Company Info, Upload Profile Pic.
    - **Networking:** Search Directory, Give Referrals, Submit "Thank You Notes" (Business Done).
    - **Activity:** Create Posts (Feed), Like/Comment, RSVP to Meetings.
    - **Billing:** Register for Events, View Renewal Date.

### 🌐 Visitor (Guest)
**Scope:** Public Functionality
- **Capabilities:**
    - View Public Event/Training Landing Pages.
    - Register for Events (External Registration).
    - Pay for Events (if applicable).

---

## 3️⃣ Application Modules & Features

### 🔐 Authentication & Onboarding
- **Tech:** JWT (JSON Web Tokens), bcrypt.
- **Flows:**
    - **Login:** Email + Password. Checks `organization_id` to scope data.
    - **Register (Member):** Public form -> status=`pending` -> Admin approves -> status=`approved` -> User sets Password.
    - **Register (Org):** Super Admin creates Org -> Admin gets email to set password.
    - **Forgot Password:** Token-based email reset.

### 🏢 Organization Settings (White-Labeling)
- **Feature:** Dynamic Branding & Naming.
- **Data:** Stored in `organizations` table as JSON.
- **Capability:** Admins can rename tabs (e.g., "Meeting" -> "Gathering") using the **Naming Convention** module.

### 👥 Member Management
- **Directory:** Searchable list of all members. Filter by Chapter/Category.
- **Renewals:** dedicated view (`/admin/renewals`) identifying members near expiry. Logic: `membership_end_date` approaching.

### 💼 Business Referrals & Thank You Notes
- **Referral Flow:** Member A fills "Give Referral" form for Member B.
- **Thank You Note (Business Done):** Loop closure. Member B confirms "Business Done" with Member A and enters the `amount`.
- **Logic:** Updates "Revenue" stats for the Organization and Chapter.

### 📰 Feed & Social
- **Posts:** Text/Image posts visible to Organization members.
- **Interactions:** Like (Toggle) and Comments.
- **Media:** Images stored locally in `backend/public/uploads/posts`.

### 📅 Events & Trainings
- **Events:** Social gatherings or major meetups.
- **Trainings:** Educational sessions.
- **Registration types:**
    1.  **Member (Internal):** One-click RSVP.
    2.  **Visitor (External):** Form capture (Name, Email, Company, Chapter).
- **Payment:** Tracks `payment_status` ('pending' -> 'completed') and `payment_confirmed` (Admin override).

### 📂 File Repository
- **Purpose:** Admin uploads documents (Policies, Bylaws) for members to download.

---

## 4️⃣ Database Schema Design

**Database:** MySQL
**Storage:** Local Filesystem (`/public/uploads`)

### Core Identity
| Table | Description | Key Fields |
| :--- | :--- | :--- |
| **`organizations`** | Tenant root | `id`, `name`, `sub_domain` (unique), `settings` (JSON: logo, colors, naming_convention) |
| **`users`** | All actors | `id`, `email`, `password` (hash), `role`, `status` ('pending', 'approved'), `organization_id` (FK), `chapter` (String), `profile_image` |
| **`chapters`** | Sub-groups | `id`, `name`, `organization_id` |

### Business Logic
| Table | Description | Key Fields |
| :--- | :--- | :--- |
| **`business_references`** | Referrals & TY Notes | `from_user_id`, `referred_to` (Mixed: UserID or Name), `referral_flag` (1=Referral, 0=TY Note), `business_done_amount`, `status` |
| **`posts`** | Feed content | `user_id`, `content`, `image_path` |
| **`post_likes`** | Interactions | `post_id`, `user_id` |
| **`post_comments`** | Interactions | `post_id`, `user_id`, `comment` |

### Events & Activities
| Table | Description | Key Fields |
| :--- | :--- | :--- |
| **`events`** | Event Master | `title`, `event_date`, `event_charges`, `event_mode`, `payment_link` |
| **`trainings`** | Similar to Events | `training_title`, `trainer_name` |
| **`meetings`** | Chapter/1-2-1 | `meeting_date`, `mode`, `meeting_link` |
| **`event_registrations`**| Internal RSVPs | `event_id`, `user_id`, `payment_status`, `payment_confirmed` |
| **`visitors`** | External RSVPs | `event_id`, `name`, `email`, `company_name`, `chapter`, `payment_status` |

### System
| Table | Description | Key Fields |
| :--- | :--- | :--- |
| **`notifications`** | In-app alerts | `user_id`, `message`, `is_read`, `type`, `data` (JSON) |
| **`files`** | Document repo | `filename`, `original_name`, `uploaded_by` |

---

## 5️⃣ Rebuild Instructions (Developer Roadmap)

### Phase 1: Foundation (Backend)
1.  **Setup Node.js Project**: `npm init`, install `express`, `mysql2`, `dotenv`.
2.  **Database**: Create MySQL DB `community_portal`.
3.  **Migrations**: Run table creation scripts in this order:
    1.  `organizations`
    2.  `users` (Depends on orgs)
    3.  `chapters`
    4.  `posts`, `events`, `business_references`
    5.  `event_registrations`, `visitors` (Latest schema includes `company_name`).
4.  **Auth Middleware**: Implement `verifyToken` (JWT) and `roleCheck` (Admin/SuperAdmin).

### Phase 2: Core API Modules
1.  **Auth Controller**: Login, Register, Password Reset.
2.  **User Controller**: Profile management, Approval flow.
3.  **Organization Controller**: Settings update (Naming Convention JSON logic).

### Phase 3: Frontend Setup
1.  **React App**: Vite or CRA.
2.  **Context**: Create `AuthContext` to store User + Org Branding.
3.  **Routing**: Setup `App.jsx` with `react-router-dom`.
    -   Public Routes: `/login`, `/register`, `/public/event/:id`
    -   Protected Routes: `/dashboard`, `/members`, `/profile`
    -   Admin Routes: `/admin/*`

### Phase 4: Feature Implementation
1.  **Dashboard**: Stats widgets (fetching count APIs).
2.  **Member Directory**: Grid view with filters.
3.  **Events System**:
    -   Create Form (Admin).
    -   Register Button (Member).
    -   **Public Page**: Standalone layout, API endpoint `getPublicEventById`.
4.  **Referrals**: Tabbed interface (Received/Sent/Give).

### Phase 5: Polish & Security
1.  **File Uploads**: Setup `multer` for Images (Profiles, Posts, Event banners).
2.  **Validation**: Ensure backend validates all ID inputs against `organization_id`.
3.  **Error Handling**: Global Error Boundary (React) and Middleware (Express).

---

## 6️⃣ Deployment & Environment

**Environment Variables (.env)**
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=community_portal
JWT_SECRET=super_secret_key_123
SUPER_ADMIN_EMAIL=superadmin@bizlinks.in
```

**Folder Structure**
- `backend/`
  - `controllers/` (Business Logic)
  - `models/` (DB Queries)
  - `routes/` (API Endpoints)
  - `public/uploads/` (Static Assets)
- `frontend/`
  - `src/components/` (Reusable UI)
  - `src/pages/` (Views)
  - `src/context/` (State)

---

## 7️⃣ Future Enhancements (Roadmap)
1.  **Payment Gateway Integration**: Automate `payment_confirmed` status via Stripe/Razorpay webhooks.
2.  **Mobile App**: React Native build reusing the same API.
3.  **Chat System**: Real-time Socket.io 1-to-1 messaging.
4.  **Email Notifications**: Send SMTP emails on Registration/Approve (currently simulated).
