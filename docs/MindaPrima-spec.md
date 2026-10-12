# Minda Prima: product and UI specification

Paste this whole file to the AI that will build it. The design canvas ("Minda Prima Redesign") is the visual reference. Sample names and numbers are placeholders.

## 1. Product

Minda Prima is a management portal for a Malaysian tuition centre (est. 2004). Office staff use it on desktop. Drivers use a phone run sheet. It covers students, guardians, teachers, classes, sessions, transport, billing and WhatsApp messages.

Existing repo: `NazimFu/MindaPrima`. Stack: Next.js 15, Tailwind + shadcn, Google Sheets as the database, whatsapp-web.js for WhatsApp. This is a UI/UX redesign plus new features. Keep the stack unless told otherwise.

## 2. Visual style (do not look "AI generated")

- Flat, ledger-like, professional green. Tables over cards. Status = coloured dot + label. No gradients, no emoji.
- Fonts: IBM Plex Sans (UI), IBM Plex Mono (plates, codes). Tabular numerals. Radius about 6px.
- Colours: sidebar #14382A, accent #1F6B3F, background #F5F6F0, surface #FFFFFF, table header #EAF1EB, line #E2E2DA, text #1C1F1D, muted #666B66. Ok #1F6B3F on #E6F0E9, warn #80530A on #F8EED9, error #B3261E on #F9E4E2.
- Dark mode via a `dark` toggle (same tokens, dark values).
- Desktop: 220px deep-green sidebar + main. Sidebar: Overview, Students, Guardians, Teachers, Transport, Billing; Settings group: Pricing, Classes, Sessions, WhatsApp.
- Keep wording short. No filler text. No timestamps in status labels.

## 3. Naming rules (Malaysia)

- A student has: First name, Connector (bin, binti, A/L, A/P, or none), Father's name. Full name = First + Connector + Father's name, e.g. "Adam Bin Rahman".
- Every screen shows the FIRST name only.
- Exception: Invoice and Receipt use the combined full name.
- Any student, guardian or teacher name is a link to that person's full profile page.

## 4. Domain model

**Session** (user-defined, not fixed): name, code (one letter), colour, time window. Samples: Morning M #B45F06 (7:00 am to 12:00 pm), Afternoon A #1F6B3F (12:00 to 5:00 pm), Night N #2F4A8A (5:00 to 10:00 pm). Users can add more. The code is used wherever space is tight.

**Level**: Primary 1 to 6, Secondary 1 to 5.

**Class** (one per level x subject): subject, teacher, list of slots (day, start, end, session). Example Primary 1: Mathematics, Cikgu Farah, Mon and Wed 2:00 to 3:30 pm (A). Science, Mr Daniel Wong, Tue 2:00 pm (A), Thu 7:30 pm (N). Bahasa Melayu, Puan Salmah. English, Ms Priya, Mon 7:30 pm (N), Fri 9:00 am (M). Add Student reads subjects and times from Classes.

**Teacher**: name, subject, contact, levels, classes.

**Guardian**: name, contact, address, children, invoices. One guardian can have many students.

**Student**: first name, connector, father's name, level, registration date, address, guardian, subjects (classes), sibling flag, first-time-registration flag, transport settings (below), status.

**Pricing** (Settings > Pricing): tuition fee per subject (tiers by number of subjects). Transport fee depends on the STUDENT's address, not the vehicle: inside limit RM40, outside limit RM60 per month. Staff set "inside" or "outside" when adding the student.

**Vehicle**: plate, model, driver (name, phone), seats (used of total), session runs. One screen per vehicle. Samples: JQK 4521 Toyota Hiace, Pak Ramli, 11 of 14; WCD 8830 Nissan Urvan, Encik Azman, 12 of 14; JNB 1192 Perodua Alza, Encik Hafiz, 6 of 7. Do not show area or fee on the vehicle card.

**Student transport settings**: needed (yes/no), address is inside/outside limit, vehicle, plan (Both ways / Pick-up only / Drop-off only), pick-up from (School or Home), drop-off address (default same as home), and a weekly schedule: for each day (Mon to Fri), which sessions need transport.

**One-off skip**: a date (or later a date range) when a normally riding student does not ride. Shows as "Not riding".

**Invoice**: one per guardian per month. Number format OCT0001 (month code + sequence). Lines are per child (combined name, level, subjects, amount; transport is a line item). Total = sum of children. Example: Adam RM180 (140 tuition + 40 transport), Dania RM160, Haikal RM260, family total RM600; invoice OCT0001 total RM610 (includes RM10 extra item).

**Payment and receipt**: Record payment against an invoice (amount, method, date). Receipt RCP0001 numbered and linked to the invoice, e.g. RM300 received, RM310 balance. Receipt can be sent by WhatsApp or saved as PDF.

**Payment status**: Paid, Partial, Overdue. Status belongs to a monthly invoice. Lists show the current month's status (add a month picker). Overdue = an earlier month still unpaid.

## 5. Transport rules

- The daily Transport list is rebuilt automatically every school day (placeholder: 5:00 am) from each student's weekly schedule on the Students > Transport tab, minus one-off skips.
- Statuses today: Picked (driver tapped at the stop), Waiting, Absent (red; driver marks a student on the list who did not show), Not riding (grey; set in advance by the office via "Skip a day"; "Undo" restores). Wording is "Picked", not "Picked up". Do not use "today" in labels.
- Absent and Not riding are different: Absent = on the list but did not show; Not riding = known in advance, removed from the list.
- A student can ride different sessions on different days (e.g. Mon afternoon + night, Wed afternoon, Thu night). Schedule is per day x session.

## 6. Screens

Desktop (all with the sidebar):

1. **Sign in**: email/password.
2. **Overview**: counts and a guardian table (guardian name link, children first names, amount owed, status); quick actions Add student, Add teacher.
3. **Pricing**: tuition tiers and the two transport fees (inside RM40, outside RM60). Links to Classes and Sessions.
4. **Classes**: level list (left) and subject table for the selected level: Subject, Teacher (link), Days and times with session code, Students count. This is the master for times.
5. **Sessions**: table (colour swatch, name, code, time window, Classes count link, Vehicle runs link, Edit) and an Add session form with a colour palette.
6. **Teachers**: table Name (link), Subject, Contact, Edit. Add teacher.
7. **Teacher profile**: details, classes (level, days and times, student count), students per class. No session codes on this page.
8. **Students**: tabs All / Paid / Pending / Overdue / Transport. Table: first name (link), level, subjects, guardian (link), status, row menu (Edit, Mark as paid, Mark as overdue, Delete).
9. **Add student** (dialog, two columns). Left: First name, Connector (bin / binti / A/L / A/P / None), Father's name, Level, First-time registration, Sibling already registered, Guardian name and contact, Address, Subjects (checkbox rows with subject and times; link to Classes). Right "Transport": Transport needed, Address is (Inside limit RM40 / Outside limit RM60), Vehicle (with seats free), Plan, Pick up from, Drop-off address, then "Days and sessions that need transport": one row per weekday with a checkbox pill per session showing ONLY the session code (A, N, M), coloured by session; link to Sessions. Bottom: monthly fee box (tuition + transport = total) linking to Pricing.
10. **Students, Transport tab**: filters (search, vehicle, day, session), legend of sessions, table Student (first name link), Vehicle (link), Area, Plan, Mon to Fri cells showing session-code chips, Edit. Current weekday highlighted.
11. **Student profile**: details (first name, connector, father's name, full name, level, registered, guardian link and contact, siblings as links, address), Subjects (subject link, teacher link; no days/times, no session codes), Transport (vehicle link, inside/outside, plan, pick-up, drop-off, per-day schedule shown as plain subjects), Monthly fee breakdown, Invoices (number link, month, amount, status Paid/Partial/Overdue).
12. **Delete confirmation** (dialog): "Delete <first name>?" Cancel / Delete student.
13. **Guardians** list: name link, contact, children (first names, links), amount owed, status.
14. **Guardian profile**: details, WhatsApp link, family total, Children table, Invoices and receipts, Record payment.
15. **Transport** (one screen per vehicle, vehicle tabs on top): stats strip (On list, Picked, Waiting, Absent, Not riding); vehicle card (plate, model, driver + phone, seats); session pills (Morning, Afternoon, Night with counts); rider table: #, Student (first name link, level, guardian link), Pick-up (place only, no time), Drop-off (place only, no time), Plan (no days list, the filters already cover days and sessions), Status (with "Skip a day" or "Undo"). Buttons: Print run sheets, Add vehicle.
16. **Billing**: guardian rows (name link, children, amounts, status), month filter, links to Invoice.
17. **Invoice**: header with the combined name per child line, number, month, lines, total; guardian name link.
18. **Record payment** (dialog): amount, method, date.
19. **Receipt**: numbered, linked to invoice, guardian link, combined names, received and balance.
20. **WhatsApp**: message templates and send log.

Phone:
- **Overview on phone**.
- **Driver run sheet**: stops in order with first name, place, status (Picked / Waiting / Absent); driver taps at each stop. No timestamps.

## 7. Cross-screen rules

- Where the session code appears, do not repeat subject names beside it (Add Student transport pills).
- Student and Teacher profiles show plain days and times, not session codes.
- Time windows and the day/time slots live only in Sessions and Classes. Other screens read from them.
- Master-data links: Pricing, Classes, Sessions, Teachers, Vehicles are linked from every screen that shows their data.
- Inside/outside limit is a property of the student, never of the vehicle.

## 8. Codebase structure (reorganize first)

Reorganize the repo into /frontend, /backend and /common before building features:

```
/frontend   Next.js app: pages, components, styles, client-side API calls only. No secrets, no direct Google Sheets or WhatsApp access.
/backend    API server: routes, services, Google Sheets data layer, WhatsApp service, auth, validation, jobs (daily transport list, invoice generation).
/common     Shared by both. Common code (types, validation schemas e.g. zod, constants, utilities, name formatting, session codes, fee rules) and ALL images in one folder: /common/images.
```

- Do not create a /shared folder. Anything used by both frontend and backend lives in /common, and each side imports it from there instead of copying it (workspace setup, e.g. npm workspaces or a path alias).
- Write each piece of common logic once (for example the full-name builder "First + Connector + Father's name" and the validation schemas) and reuse it everywhere.
- Move every image (logo, mascot, icons, illustrations) into /common/images and reference them from there. No images left in other folders.
- Frontend talks to the backend only through a documented REST API (`/api/v1/...`). Backend owns all data access.
- Each folder has its own `package.json`, `.env.example`, lint and test setup. Update scripts, CI and deploy config.
- Use a layered backend: route, then controller, then service, then repository (Sheets). No business logic in routes.
- Move in small steps (one module at a time) and keep the app running after each step.

## 9. No hardcoding, spreadsheet as database (mandatory)

- Never hardcode configuration. Anything that changes between environments goes in environment variables (`.env`, with a committed `.env.example`): Google Sheet IDs, sheet tab names, service account credentials, API base URLs, CORS origins, JWT and session secrets, WhatsApp settings, ports, daily-refresh time, rate-limit values. Read them in one config module in /common or /backend and validate at startup (fail fast if missing).
- Never hardcode business data in code. Fees (tuition tiers, transport inside RM40 and outside RM60), sessions and their codes, colours and time windows, levels, subjects, classes and slots, vehicles, drivers, WhatsApp templates, invoice number format all live in the spreadsheet and are edited in the app (Pricing, Sessions, Classes, Teachers, Transport screens). The sample values in this spec are examples only.
- The Google Spreadsheet is the only database. All stored information is read from and written to it: students, guardians, teachers, classes, sessions, pricing, vehicles, transport settings and schedules, skips, invoices, payments, receipts, users, audit log, message log. No other database, no local JSON files, no data kept only in memory or the browser.
- One sheet tab per entity with a header row and a stable ID column. Access it only through the backend repository layer, using column names from one definition in /common, not magic column letters.
- No hardcoded UI text that depends on data (session names, subject lists, fee amounts). Render from the API.
- Cache reads briefly to respect Google Sheets rate limits, but the sheet stays the source of truth. Writes go straight to the sheet.

## 10. Security requirements (mandatory)

Treat all input as hostile. Follow OWASP Top 10 and ASVS.

- **Authentication**: hash passwords with argon2id or bcrypt (cost 12 or higher). Short-lived access tokens, httpOnly + Secure + SameSite=Strict cookies, refresh token rotation, logout invalidates tokens. Rate-limit and lock out repeated login failures. Optional 2FA for admins.
- **Authorization**: role-based access (admin, staff, teacher, driver). Enforce on the backend for every route and every record, never only in the UI. Drivers see only their own vehicle run. Deny by default. Guard against IDOR (check the user may access that student, guardian or invoice).
- **Input validation**: validate and sanitize every request body, query and param on the backend with a schema library (zod or similar). Reject unknown fields. Limit lengths and types.
- **Injection**: no string-built queries or formulas. Prevent Google Sheets formula injection: prefix any user value starting with `=`, `+`, `-`, `@` before writing it to a sheet.
- **XSS**: escape output, no `dangerouslySetInnerHTML` with user data, strict Content-Security-Policy, no inline scripts.
- **CSRF**: SameSite cookies plus CSRF tokens for state-changing requests. Strict CORS allow-list (no `*`).
- **Transport and headers**: HTTPS only, HSTS, `helmet`-style headers (X-Content-Type-Options, X-Frame-Options or frame-ancestors, Referrer-Policy).
- **Secrets**: all secrets (Google service account key, WhatsApp session, JWT secret) in environment variables or a secret manager. Never in the repo or the frontend bundle. Rotate keys. Add `.env` to `.gitignore` and scan history for leaked secrets.
- **Google Sheets**: use a service account with the minimum scope and access to only the needed sheet. Backend only. Back up the sheet on a schedule.
- **WhatsApp**: store the session securely on the server, never expose it to the client. Rate-limit sends. Only send to numbers from the database. Log sends.
- **Personal data (PDPA Malaysia)**: students are children, so collect the minimum, protect contact and address data, restrict access by role, no personal data in logs or URLs, support deletion on request. Encrypt sensitive data at rest where possible.
- **Rate limiting and abuse**: global and per-route limits, request size limits, timeouts.
- **Errors and logging**: generic error messages to clients, no stack traces. Audit log for sensitive actions (login, payment recorded, student deleted, status changed) with user and time. No secrets or passwords in logs.
- **Files**: if uploads exist, check type and size, rename, store outside the web root, scan if possible.
- **Dependencies**: pin versions, run `npm audit` in CI, enable Dependabot, keep Node and Next.js patched.
- **Payments data**: record only amounts, method and dates. Never store card numbers.
- **Testing**: unit tests for validation and authorization rules, plus tests that a user cannot read or change another user's records.

## 11. Suggested build order

0. Reorganize into `/frontend`, `/backend` and `/common` and set up the security baseline (auth, validation, headers, rate limits).

1. Data model in Google Sheets: Sessions, Levels, Classes (slots), Teachers, Guardians, Students, Transport settings + weekly schedule, Skips, Vehicles, Pricing, Invoices, Payments, Receipts.
2. Design tokens, layout shell, shared table/status/dialog components.
3. Master data: Sessions, Pricing, Teachers, Classes.
4. Guardians, Students, Add student (name fields, transport), profiles.
5. Transport: daily list generation, per-vehicle screens, skip a day, driver sheet.
6. Billing: monthly invoice generation, payments, receipts, WhatsApp send.

## 12. Open items (confirm with the owner)

- Real morning run times, session cut-offs and the daily refresh time are placeholders.
- Skip a day dialog (single date vs range) and the screen to set vehicle run times per session are not designed yet.
- Month picker on Students and Billing is not drawn yet.
