NOTE: For the latest BIOGUARD government/report verification workflow, READ README_BIOGUARD.txt FIRST.
The older instructions below describe the original BARANGGUIDE starter implementation.

BARANGUIDE – installation and changes
====================================

This update preserves the original pages, PHP endpoints, and Leaflet map.js.
It does NOT replace the project with the ANI-SALBA agricultural system.

WHAT CHANGED
* The map now has a correctly sized .map-area parent. It loads on dashboard.php.
* JavaScript recalculates Leaflet size after page load and on resize.
* jQuery loads from your existing js/jquery-3.7.1.min.js, not a remote CDN.
* If the Leaflet CDN is unavailable, a readable error appears in the map area.
* Signup starts a PHP session and redirects to user.html (Resident / Government Official).
* After profile completion, the user opens forms/dashboard.php.
* Sign in (including administrator) goes DIRECTLY to forms/dashboard.php.
* Administrator accounts must be created from the terminal, not the signup form.
* Only administrators may delete mapped locations. Other signed-in members can
  still create map locations using the existing functionality. Choosing Government
  Official alone does NOT verify government employment or give admin privileges.
* BARANGUIDE logo is in assets/images/baranguide-logo.svg, also easy to replace.

INSTALL IN LARAGON
1. Copy the BARANGGUIDE folder inside C:\laragon\www\BARANGGUIDE
   (or your actual Laragon www folder). Start Apache and MySQL in Laragon.
2. Import database_setup.sql in HeidiSQL or phpMyAdmin. Import even if you
   previously imported the old version: it adds the new is_admin column safely.
   Back up your database before running schema updates.
3. Visit http://localhost/BARANGGUIDE/login.html
   Do not open the pages as file:///... because PHP won't run.
4. Sign up -> choose role -> enter details -> see map.
   Sign out -> Sign in -> automatically see map (no role question).

CONFIGURE YOUR ADMIN (PowerShell / Laragon terminal)
  cd C:\laragon\www\BARANGGUIDE
  $env:BARANGUIDE_ADMIN_PASSWORD = "put-your-own-long-unique-password-here"
  php forms/create_admin.php admin@example.com "Admin Name"
  Remove-Item Env:BARANGUIDE_ADMIN_PASSWORD

Replace admin@example.com and Admin Name with your own details. The PHP command
creates the account or upgrades an existing account with that email to admin.
Use your actual MySQL credentials in create_admin.php if not Laragon defaults.
If you use Laragon CMD rather than PowerShell, use:
  set BARANGUIDE_ADMIN_PASSWORD=your-own-long-unique-password
  php forms/create_admin.php admin@example.com "Admin Name"
  set BARANGUIDE_ADMIN_PASSWORD=

MAP NOTES
* Internet access is needed for OpenStreetMap tiles and Leaflet CDN libraries.
* A map can appear with ZERO saved markers; this is normal if locationtagging is empty.
* The map starts at the original Bacolod coordinates [10.669644, 122.948844].
* Confirm you open forms/dashboard.php after sign-in (not a cached old HTML page).
* Press Ctrl+Shift+R to reload cached CSS and scripts after replacing files.
* When disconnected, a message is displayed instead of a silent blank map if
  the Leaflet library itself fails to load.
* For public deployment, add moderation, rate limits, verified government roles,
  CSRF protection, and HTTPS before allowing real community contributions.

DISCLAIMER
This environment cannot verify your local Laragon/MySQL settings or live map
tile availability. PHP syntax and JavaScript syntax are checked before delivery.

OCTOBER 2026 — COMMUNITY REPORT MAP UPGRADE
===========================================
ADDED FEATURES
* The upper-left three-line (hamburger) button opens Analytics, Reports,
  Interventions, and Saved places. Original saved-place functionality remains.
* The right toolbar has ADD REPORT, SHOW RADIUS, SHOW DISTANCE, VIEW MARKERS,
  and FILTER REPORTS, followed by a ten-category report color legend.
* Reports are color-coded by CATEGORY, not by urgency or verified medical risk.
  The severity field is an unverified, user-reported urgency label.
* Reports have 10 types, 4 urgency levels, and 3 progress statuses.
  Multiple checkboxes can be combined in the client-side report filter.
* Analytics displays report counts and a category breakdown.
* Admins can record interventions linked to specific reports; a planned,
  ongoing, or completed intervention updates the linked report's status.
* Radius: choose radius in meters, click on the map to set the center. The
  number shown is the count of CURRENTLY FILTER-MATCHING reports inside the
  circle, not a population or risk estimate.
* Distance: click two points. Distance is straight-line (not road distance).
* VIEW MARKERS resets report filters, turns on both map marker layers and
  zooms to the saved places and report locations.
* The existing Restaurants, Churches, Malls, Schools and Parks remain in
  the original locationtagging table. Reports are in their OWN new table.

NEW FILES
    css/map-tools.css
    js/report-tools.js
    forms/fetch_reports.php
    forms/save_report.php
    forms/fetch_interventions.php
    forms/save_intervention.php

MODIFIED FILES
    forms/dashboard.php
    (css/mystyle.css remains unchanged)
    js/map.js       [minimal updates to share the existing map]
    database_setup.sql [two additional CREATE TABLE statements]

IMPORTANT — DATABASE UPDATE
1. BACK UP your old database before modifying it.
2. Open phpMyAdmin or HeidiSQL in Laragon, run the updated database_setup.sql.
   This creates community_reports and interventions WITHOUT deleting the
   existing users, profiles, or locationtagging data.
3. Put the updated BARANGGUIDE folder inside Laragon's www directory.
4. Start Apache and MySQL, then visit:
   http://localhost/BARANGGUIDE/login.html
5. Sign in and open forms/dashboard.php. Press Ctrl+Shift+R once to refresh.
6. Click ADD REPORT, select a map point, enter details and submit. Reload
   the page to check that the report was saved by PHP/MySQL.
7. Sign in as the administrator to use Record intervention.

SECURITY AND MEANING OF DATA
* Anyone with a signed-in account can submit unverified reports.
* Only the administrator can create interventions (not any user who selected
  Government Official in the profile page).
* The new write endpoints use session checks, prepared SQL and CSRF tokens.
* Do not include personal medical records, names of patients, or private data
  in public report descriptions. Add a verification/moderation process before
  deploying to the public or relying on these reports for health decisions.
* If your MySQL credentials differ from Laragon defaults, update the four
  new PHP endpoints to use your actual credentials.
* Map tiles, icons and mapping libraries require an internet connection.

VERIFICATION
* PHP and JS files were syntax checked and the HTML IDs/file paths inspected.
* End-to-end tests with your Laragon/MySQL data must be done on your computer.
