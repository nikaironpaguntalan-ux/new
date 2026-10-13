BIOGUARD — Updated BARANGGUIDE project (October 2026)
====================================================

WHAT WAS CHANGED
- Original HTML/CSS/JavaScript/PHP/MySQL approach retained. Original folder name
  BARANGGUIDE was kept so existing relative links and Laragon paths still work.
- New BIOGUARD branding for login, account profile and dashboard.
- Hamburger menu: Analytics, Interventions, and Admin (administrators only).
- The right-side Map Tools retains Add Report, Show Radius, Show Distance,
  View Markers, and Filter Reports.
- Report category -> disease/hazard choices:
  * Animal-transmitted / vector-borne human disease: Dengue, Rabies,
    Malaria, Leptospirosis, Chikungunya, Other.
  * Animal disease: African Swine Fever (ASF), Avian Influenza,
    Newcastle Disease, Foot-and-Mouth Disease, Other.
  * Animal habitat / environmental risk: Mosquito breeding sites,
    stagnant water, rodent infestations, floods, improper waste,
    stray animals, animal bites, unusual animal deaths, Other.
- JPG, PNG, WEBP evidence photo optional (max 5MB). Images are publicly
  viewable via the report map when someone has their URL; never upload faces,
  personal records, or sensitive medical information.
- Report status: pending official review, verified or rejected.
- Official status: pending admin review, verified or rejected/revoked.
- An administrator reviews the stated government office, employee number,
  official email and position. Verify credentials independently before approval.
  Admin rejection notes are recorded and shown to the affected account.
- ONLY ADMIN-APPROVED GOVERNMENT OFFICIALS can verify or reject reports.
  Rejected reports require a review note. New reports cannot be self-verified.
- ONLY ADMIN-APPROVED GOVERNMENT OFFICIALS can schedule or record interventions,
  and only on VERIFIED reports. Government interventions have planned/ongoing/
  completed states, scheduled date/time for planned actions and action history.
- Residents can see report verification state, government progress and schedules.
  The report/intervention views refresh every 60 seconds while no form is open.
- Analytics shows unverified vs verified totals, category breakdown, verified
  high-urgency notices and last-30-day vs earlier reporting volumes. Counts
  are NOT confirmed disease incidence or validated epidemiological risk scores.
- Existing location files and legacy place database tables remain intact,
  but their old restaurant/school/etc pins are not auto-loaded on BIOGUARD map.

INSTALL IN LARAGON — EXISTING WEBSITE
1. BACK UP both auth_db and mappingproject in phpMyAdmin / HeidiSQL first.
2. Stop Apache or take a backup of C:\laragon\www\BARANGGUIDE.
3. Extract this ZIP. Copy the updated BARANGGUIDE folder into your Laragon
   www directory. Keep the existing folder name, unless you also update URLs.
4. Start Apache + MySQL. Open phpMyAdmin and IMPORT database_setup.sql.
   This uses CREATE TABLE IF NOT EXISTS and preserves existing records.
5. In phpMyAdmin, IMPORT upgrade_bioguard.sql. This adds the necessary fields
   to existing tables, without deleting past records. It is safe to rerun.
6. Open http://localhost/BARANGGUIDE/login.html and sign in.
7. Ensure the web server can write to assets/uploads/reports/.
   Apache should allow the included .htaccess (Laragon normally does).
8. Press Ctrl+Shift+R once, to clear older JS/CSS from the browser cache.

INSTALL FOR A COMPLETELY NEW DATABASE
1. Copy the folder into Laragon www.
2. Import database_setup.sql and then upgrade_bioguard.sql (safe no-op for
   already-existing new columns).
3. Set up an administrator account via existing forms/create_admin.php.

CREATE THE FIRST ADMIN (Windows PowerShell example)
Open PowerShell in your BARANGGUIDE project folder and run:
    $env:BARANGUIDE_ADMIN_PASSWORD = "put-your-own-long-unique-password-here"
    php forms/create_admin.php admin@example.com "Administrator"
    Remove-Item Env:BARANGUIDE_ADMIN_PASSWORD
Use your own email/password. Requires PHP CLI configured in PATH.
This existing script will not work as a browser page (for security).

TEST ACCOUNTS AND PERMISSIONS
1. Register resident; open map; Add Report; choose category + disease/animal
   issue + location + picture (optional); submit. Expected: PENDING.
2. Register Government Official and complete profile. Expected: NOT APPROVED.
   They should NOT see report verification or intervention editing buttons.
3. Login as Administrator; hamburger -> Admin; review account and verify actual
   employment/office independently; approve official.
4. Refresh official account. Hamburger -> Interventions. The pending reports
   show Verify / Reject / View on map. Verify a report.
5. Schedule a planned intervention for that verified report, with date/time,
   agency and action. Later record an ongoing/completed update for that report.
6. Resident opens or refreshes the map: sees verification, response history
   and intervention schedule. The map automatically polls every 60 seconds.
7. Try a resident calling review_report.php or save_intervention.php manually:
   PHP must reject it with HTTP 403. Admins cannot verify reports unless they
   also have an independently approved government-official identity.
8. Admin reject/revoke the government official: the account must immediately
   lose permission for official writes even if the browser UI was not reloaded.

MAIN MODIFIED FILES
    forms/dashboard.php          Hamburger, forms, role-aware sections
    js/report-tools.js           Map reports, filters, queue, verification UI
    css/map-tools.css            Minimal, consistent BIOGUARD UI styles
    forms/save_report.php        Validate category and save optional photo
    forms/fetch_reports.php      Return all reports and review state
    forms/admin_officials.php   Admin list of gov credentials
    forms/review_official.php   Admin approval/revocation
    forms/review_report.php     Official verification / rejection
    forms/save_intervention.php Official schedule and response updates
    forms/fetch_interventions.php Read-only progress for signed-in users
    forms/bg_access.php         Shared live DB authorization and CSRF
    forms/save_profile.php      Gov profile changes reset admin approval
    database_setup.sql          Full schema for new setups
    upgrade_bioguard.sql        ALTERs for your existing database

KNOWN LIMITATIONS / IMPORTANT POLICY
- No SMS, email alerts, hospital/ABTC/veterinary clinic routing or verified
  disease risk prediction included. These require reliable facility data,
  external delivery integrations, or validated health surveillance criteria.
- Admin approval records a human administrative decision. Do not treat
  employee ID and email strings alone as proof of government employment.
- A verified community report means an authorized official reviewed the
  report, NOT that a laboratory confirmed any disease or an outbreak.
- Avoid personally identifying patients; uploaded photos can be viewed by
  anyone who obtains the direct file URL.
- Code was checked with php -l and node --check. End-to-end MySQL behavior
  and Leaflet map/CDN availability must be tested on your Laragon installation.
