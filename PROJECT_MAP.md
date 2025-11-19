# BizHub Tracking - Project Mapping & Flow Document

## 1. System Architecture

### Core Entities
- **User**: Authenticated system user.
- **Project**: A container for QR codes (e.g., "Summer Campaign", "Business Cards").
- **QRCode**: The actual dynamic QR code entity.
  - Contains: Target URL, UTM parameters, Design customization (logo, colors), Short code.
- **Scan**: An event log for every QR code scan.
  - Contains: Timestamp, User Agent, IP/Location, Referrer.

### Directory Structure
- `src/app/projects`: Main dashboard for project management.
- `src/app/r/[code]`: Public redirect handler (logs scan -> redirects).
- `src/app/api`: Backend endpoints for data persistence.

## 2. User Flows

### A. Project Management Flow
1. **Dashboard (`/projects`)**:
   - View list of all projects.
   - Create new project (Modal/Page).
   - View aggregate stats (Total scans across all projects).

2. **Project Details (`/projects/[id]`)**:
   - View specific project analytics.
   - List of QR codes within the project.
   - "Create New QR Code" entry point.

### B. QR Code Creation Flow (The "Redo" Target)
A multi-step or comprehensive form wizard:
1. **Step 1: Destination & Tracking**:
   - Enter Destination URL.
   - UTM Builder (Source, Medium, Campaign).
   - *Preview generated URL*.
2. **Step 2: Design & Customization**:
   - Color picker (Foreground/Background).
   - Logo upload/URL.
   - Pattern selection (Dots, Squares).
3. **Step 3: Review & Save**:
   - Live preview of the QR code.
   - Download test.
   - Save to Project.

### C. End-User (Scanner) Flow
1. User scans QR code image.
2. Request hits `https://domain.com/r/[short_code]`.
3. Server logs the scan (Device, Time, Location).
4. Server responds with 302 Redirect to `Destination URL + UTM Params`.

## 3. UI/UX Design System (Planned Redesign)

### Visual Style
- **Clean & Professional**: Using Shadcn/UI components.
- **Dashboard Layout**: Sidebar navigation (Projects, Analytics, Settings).
- **Card-based Lists**: Projects and QR codes displayed in rich cards with quick actions.

### Key Components
- **ProjectCard**: Shows name, description, and scan trend sparkline.
- **QRCodeEditor**: Split screen - Form on left, Live Preview on right.
- **AnalyticsChart**: Time-series data visualization of scans.

## 4. Gap Analysis & Fix Plan
- **Missing**: Dedicated "Create QR" flow with advanced styling options.
- **Missing**: Proper UTM builder integration.
- **Improvement**: The current `/projects` UI is likely basic. Needs a full dashboard treatment.