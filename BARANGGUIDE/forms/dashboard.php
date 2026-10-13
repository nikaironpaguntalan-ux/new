<?php
session_start();

if (!isset($_SESSION["user_id"])) {
    header("Location: ../login.html");
    exit;
}

require_once __DIR__ . "/bg_access.php";
$currentUser = bg_user();

if (empty($_SESSION["report_csrf"])) {
    $_SESSION["report_csrf"] = bin2hex(random_bytes(32));
}

$name = $_SESSION["user_name"] ?? "User";
$email = $_SESSION["user_email"] ?? "";
$identity = $currentUser["identity"] ?? "";
$isAdmin = (int)$currentUser["is_admin"] === 1;
$isOfficialVerified = bg_official($currentUser);
$officialStatus = $currentUser["official_verification"] ?? "pending";
$identityLabel = $isAdmin ? "Administrator" : ($identity === "government_official" ? ($isOfficialVerified ? "Verified Official" : ($officialStatus === 'rejected' ? 'Official · Not Approved' : 'Official · Awaiting Approval')) : ($identity === "resident" ? "Resident" : "Member"));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BIOGUARD | Community Map</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" onerror="this.onerror=null;this.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/chosen/1.8.7/chosen.min.css">
    <link rel="stylesheet" href="https://unpkg.com/esri-leaflet-geocoder@3.1.4/dist/esri-leaflet-geocoder.css">
    <link rel="stylesheet" href="../css/mystyle.css">
    <link rel="stylesheet" href="../css/map-tools.css">
</head>
<body data-is-admin="<?= $isAdmin ? '1' : '0' ?>" data-official-verified="<?= $isOfficialVerified ? '1' : '0' ?>" data-csrf="<?= htmlspecialchars($_SESSION['report_csrf'], ENT_QUOTES, 'UTF-8') ?>">
<header class="app-header">
    <a class="app-brand" href="dashboard.php" aria-label="BIOGUARD map home">
        <span class="brand-mark"><img class="site-logo" src="../assets/images/baranguide-logo.svg" alt=""></span>
        <span>BIO<span>GUARD</span></span>
    </a>
    <div class="header-user">
        <div class="header-user-copy">
            <strong><?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?></strong>
            <span><?= htmlspecialchars($identityLabel, ENT_QUOTES, 'UTF-8') ?></span>
        </div>
        <a class="logout-button" href="signin.php">Sign out</a>
    </div>
</header>

<main class="dashboard-shell">
    <section class="map-area" aria-label="Interactive BIOGUARD community risk map">
        <div id="map" aria-label="Interactive map centered on Bacolod"></div>
        <div id="mapError" class="map-error" hidden role="alert"></div>

        <!-- Upper-left: three-line menu -->
        <div class="map-top-left">
            <button id="menuButton" class="hamburger-button" type="button" aria-label="Open navigation" aria-controls="mapDrawer" aria-expanded="false">
                <span class="hamburger-lines" aria-hidden="true"><span></span><span></span><span></span></span>
            </button>
            <div class="map-page-name">
                <strong>Community risk map</strong>
                <span><span class="tiny-dot"></span> Bacolod City &middot; <span id="reportCount">0</span> reports</span>
            </div>
        </div>

        <!-- Role-specific BIOGUARD navigation. -->
        <aside id="mapDrawer" class="map-drawer" aria-label="Map navigation" aria-hidden="true">
            <div class="drawer-top">
                <div><span class="section-kicker">EXPLORE</span><h2>Map workspace</h2></div>
                <button id="closeMenu" class="small-icon-button" type="button" aria-label="Close navigation"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <nav class="drawer-nav" aria-label="Sections">
                <button type="button" data-panel="analytics" class="drawer-tab is-selected"><i class="fa-solid fa-chart-column"></i> Analytics</button>
                <button type="button" data-panel="interventions" class="drawer-tab"><i class="fa-solid fa-briefcase-medical"></i> Interventions</button>
                <?php if ($isAdmin): ?>
                <button type="button" data-panel="admin" class="drawer-tab"><i class="fa-solid fa-user-shield"></i> Admin</button>
                <?php endif; ?>
            </nav>

            <div class="drawer-content">
                <section class="drawer-page" id="panel-analytics">
                    <div class="drawer-section-heading"><h3>Risk monitoring overview</h3><p>Community-submitted observations, not medical diagnoses.</p></div>
                    <div class="stat-grid">
                        <div class="stat-card"><span>All reports</span><strong id="statTotal">0</strong></div>
                        <div class="stat-card"><span>Pending review</span><strong id="statPending">0</strong></div>
                        <div class="stat-card"><span>Verified</span><strong id="statVerified">0</strong></div>
                        <div class="stat-card"><span>In progress</span><strong id="statProgress">0</strong></div>
                    </div>
                    <h4 class="tiny-title">Verified high-priority reports</h4>
                    <div id="priorityAlerts" class="notice-list"><p class="empty-note">No verified high-priority reports yet.</p></div>
                    <h4 class="tiny-title">Submission trend</h4>
                    <p id="submissionTrend" class="context-note">Waiting for report data...</p>
                    <h4 class="tiny-title">Reports by category</h4>
                    <div id="categoryBreakdown" class="category-breakdown"><p class="empty-note">No reports yet.</p></div>
                    <h4 class="tiny-title">Recent community reports</h4>
                    <div id="reportList" class="record-list"><p class="empty-note">No reports yet.</p></div>
                    <p class="context-note">Reported urgency is a citizen observation. Verification confirms that the report was reviewed, not that a disease diagnosis or outbreak was established.</p>
                </section>

                <section class="drawer-page" id="panel-interventions" hidden>
                    <div class="drawer-section-heading"><h3>Intervention tracking</h3><p>Government responses and scheduled activities, visible to residents.</p></div>
                    <?php if ($isOfficialVerified): ?>
                    <button id="newIntervention" type="button" class="drawer-primary"><i class="fa-solid fa-calendar-plus"></i> Schedule / update intervention</button>
                    <h4 class="tiny-title">Reports awaiting your verification</h4>
                    <div id="verificationQueue" class="record-list"><p class="empty-note">No reports awaiting review.</p></div>
                    <?php elseif ($identity === 'government_official'): ?>
                    <p class="context-note">Your government profile status: <strong><?= htmlspecialchars(strtoupper($officialStatus), ENT_QUOTES, 'UTF-8') ?></strong>. Only administrator-approved officials can verify reports or record interventions.</p>
                    <?php if ($officialStatus === 'rejected' && !empty($currentUser['official_review_note'])): ?>
                    <p class="context-note">Admin's review note: <?= htmlspecialchars($currentUser['official_review_note'], ENT_QUOTES, 'UTF-8') ?></p>
                    <?php endif; ?>
                    <?php else: ?>
                    <p class="context-note">Only administrator-approved government officials can verify reports, schedule actions, or update interventions.</p>
                    <?php endif; ?>
                    <h4 class="tiny-title">Government response history</h4>
                    <div id="interventionList" class="record-list"><p class="empty-note">No interventions recorded yet.</p></div>
                </section>

                <?php if ($isAdmin): ?>
                <section class="drawer-page" id="panel-admin" hidden>
                    <div class="drawer-section-heading"><h3>Official account verification</h3><p>Review credentials before granting government permissions.</p></div>
                    <p class="context-note">Check employee identity and official affiliation using a trusted channel outside this website. Selecting Approve alone does not independently prove the credentials are genuine.</p>
                    <div id="officialList" class="record-list"><p class="empty-note">Loading government accounts...</p></div>
                </section>
                <?php endif; ?>
            </div>
        </aside>

        <!-- Right controls -->
        <aside class="map-toolbar" aria-label="Report map controls">
            <div class="toolbar-title"><span>MAP TOOLS</span><i class="fa-solid fa-layer-group"></i></div>
            <button id="addReportBtn" type="button" class="action-button primary"><i class="fa-solid fa-plus"></i><span>ADD REPORT</span></button>
            <button id="radiusBtn" type="button" class="action-button"><i class="fa-solid fa-circle-dot"></i><span>SHOW RADIUS</span></button>
            <button id="distanceBtn" type="button" class="action-button"><i class="fa-solid fa-ruler-horizontal"></i><span>SHOW DISTANCE</span></button>
            <button id="viewMarkersBtn" type="button" class="action-button"><i class="fa-solid fa-location-dot"></i><span>VIEW MARKERS</span></button>
            <button id="filterToggleBtn" type="button" class="action-button" aria-expanded="false" aria-controls="reportFilters"><i class="fa-solid fa-sliders"></i><span>FILTER REPORTS</span><i class="fa-solid fa-chevron-down chevron"></i></button>

            <div id="radiusOptions" class="tool-expand" hidden>
                <label for="radiusMeters">Radius</label>
                <select id="radiusMeters"><option value="100">100 meters</option><option value="250">250 meters</option><option value="500" selected>500 meters</option><option value="1000">1 kilometer</option><option value="2000">2 kilometers</option></select>
                <p id="radiusResult" class="filter-footnote">Click anywhere on the map to choose a center.</p>
            </div>

            <div id="reportFilters" class="report-filters" hidden>
                <p class="filter-intro">Choose one or more options from each group.</p>
                <div class="filter-group">
                    <strong>Risk categories</strong>
                    <label><input class="filter-type" type="checkbox" value="animal_transmitted" checked> Human / vector-borne disease</label>
                    <label><input class="filter-type" type="checkbox" value="animal_disease" checked> Animal disease</label>
                    <label><input class="filter-type" type="checkbox" value="habitat_risk" checked> Animal habitat / environmental risk</label>
                </div>
                <div class="filter-group"><strong>Specific disease / hazard</strong>
                    <select id="detailFilter"><option value="">All diseases and hazards</option></select>
                </div>
                <div class="filter-group"><strong>Verification</strong>
                    <label><input class="filter-verification" type="checkbox" value="pending" checked> Awaiting official review</label>
                    <label><input class="filter-verification" type="checkbox" value="verified" checked> Verified by official</label>
                    <label><input class="filter-verification" type="checkbox" value="rejected" checked> Rejected</label>
                </div>
                <div class="filter-group"><strong>Severity</strong>
                    <label><input class="filter-severity" type="checkbox" value="low" checked> Low</label>
                    <label><input class="filter-severity" type="checkbox" value="moderate" checked> Moderate</label>
                    <label><input class="filter-severity" type="checkbox" value="high" checked> High</label>
                    <label><input class="filter-severity" type="checkbox" value="critical" checked> Critical</label>
                </div>
                <div class="filter-group"><strong>Status</strong>
                    <label><input class="filter-status" type="checkbox" value="pending" checked> Pending</label>
                    <label><input class="filter-status" type="checkbox" value="in_progress" checked> In progress</label>
                    <label><input class="filter-status" type="checkbox" value="resolved" checked> Resolved</label>
                </div>
                <div class="filter-group"><strong>Map layers</strong>
                    <label><input id="showReportMarkers" type="checkbox" checked> Report markers</label>

                </div>
                <div class="filter-actions"><button id="applyReportFilters" type="button">Apply</button><button id="clearReportFilters" type="button">Reset</button></div>
            </div>

            <div class="legend-block">
                <div class="legend-heading"><strong>REPORT COLOR GUIDE</strong><span>BY CATEGORY</span></div>
                <div class="legend-grid">
                    <div><i style="--legend:#346c77"></i> Human / vector-borne</div>
                    <div><i style="--legend:#ad6a42"></i> Animal disease</div>
                    <div><i style="--legend:#a6823b"></i> Habitat / environmental</div>
                </div>
                <p class="filter-footnote">Colors identify report categories, not severity or verified risk levels.</p>
            </div>
        </aside>

        <div id="toolHint" class="map-tool-hint" hidden role="status"></div>
        <button id="clearMeasureBtn" class="clear-measure" type="button" hidden><i class="fa-solid fa-xmark"></i> Clear measurement</button>

        <!-- New report form, saved in its own database table -->
        <form id="reportForm" class="plot-panel report-form" novalidate>
            <button type="button" class="close-btn" id="closeReportForm" aria-label="Close report form">&times;</button>
            <div class="plot-heading"><span class="section-kicker">COMMUNITY REPORT</span><h2>Add a report</h2><p>Choose a point on the map, then describe the incident.</p></div>
            <div class="plot-fields">
                <div class="field-row"><div><label for="reportLat">Latitude</label><input id="reportLat" readonly placeholder="Click map"></div><div><label for="reportLng">Longitude</label><input id="reportLng" readonly placeholder="Click map"></div></div>
                <label for="reportType">Report category</label>
                <select id="reportType" required>
                    <option value="">Select category</option>
                    <option value="animal_transmitted">Animal-transmitted / vector-borne human disease</option>
                    <option value="animal_disease">Animal disease</option>
                    <option value="habitat_risk">Habitat of disease-carrying animals / environmental risk</option>
                </select>
                <label for="reportDetail">Disease / observation</label>
                <select id="reportDetail" required><option value="">Choose a category first</option></select>
                <label for="reportPlace">Location / landmark</label><input id="reportPlace" maxlength="120" placeholder="e.g. Near barangay hall" required>
                <label for="reportSeverity">Reported urgency (unverified)</label>
                <select id="reportSeverity"><option value="low">Low</option><option value="moderate" selected>Moderate</option><option value="high">High</option><option value="critical">Critical</option></select>
                <label for="reportDescription">Description</label><textarea id="reportDescription" rows="4" maxlength="1000" placeholder="Describe your observation. Do not include patient names or medical records." required></textarea>
                <label for="reportPhoto">Photograph (optional, JPG/PNG/WEBP, maximum 5 MB)</label>
                <input type="file" id="reportPhoto" accept="image/jpeg,image/png,image/webp">
                <p class="field-help">Only upload photographs you have permission to share. Avoid faces and personal information.</p>
            </div>
            <button id="saveReportBtn" class="save-button" type="submit">Submit report</button>
            <p class="context-note">New reports remain PENDING until reviewed by a verified government official.</p>
        </form>

        <?php if ($isOfficialVerified): ?>
        <form id="interventionForm" class="plot-panel intervention-form" novalidate>
            <button type="button" class="close-btn" id="closeInterventionForm" aria-label="Close intervention form">&times;</button>
            <div class="plot-heading"><span class="section-kicker">RESPONSE TRACKING</span><h2>Schedule / update intervention</h2></div>
            <div class="plot-fields">
                <label for="interventionReport">Related report</label><select id="interventionReport" required><option value="">Select report</option></select>
                <label for="interventionAgency">Responsible team / office</label><input id="interventionAgency" maxlength="150" required placeholder="e.g. Barangay health office">
                <label for="interventionStatus">Action status</label><select id="interventionStatus"><option value="planned">Planned</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option></select>
                <label for="interventionDate">Scheduled date and time (required when planned)</label><input id="interventionDate" type="datetime-local">
                <label for="interventionAction">Action taken or planned</label><textarea id="interventionAction" maxlength="1000" rows="4" required placeholder="Describe the activity"></textarea>
            </div>
            <button id="saveInterventionBtn" type="submit" class="save-button">Save intervention</button>
        </form>
        <?php endif; ?>

        <!-- Legacy place form retained for compatibility with the existing map.js, but not in the hamburger menu. -->
        <form id="plotForm" class="plot-panel" novalidate>
            <button type="button" class="close-btn" id="closeForm" aria-label="Close form">&times;</button>
            <div class="plot-heading"><span class="section-kicker">NEW LOCATION</span><h2>Add a mapped place</h2></div>
            <div class="plot-fields">
                <div class="field-row"><div><label for="lat">Latitude</label><input id="lat" type="text" readonly></div><div><label for="lng">Longitude</label><input id="lng" type="text" readonly></div></div>
                <label for="category">Category</label><select id="category"><option value="">Select category</option><option>Restaurant</option><option>Church</option><option>Mall</option><option>School</option><option>Park</option></select>
                <label for="name">Location name</label><input id="name" type="text" maxlength="120" placeholder="Enter location name">
                <label for="description">Description</label><textarea id="description" rows="4" maxlength="500" placeholder="Add a short description"></textarea>
            </div>
            <div class="form-buttons"><button id="saveBtn" type="submit" class="save-button">Save location</button></div>
        </form>
    </section>
</main>

<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" onerror="this.onerror=null;this.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'"></script>
<script src="https://unpkg.com/esri-leaflet@3.0.19/dist/esri-leaflet.js"></script>
<script src="https://unpkg.com/esri-leaflet-geocoder@3.1.4/dist/esri-leaflet-geocoder.js"></script>
<script src="../js/jquery-3.7.1.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/chosen/1.8.7/chosen.jquery.min.js"></script>
<script src="../js/map.js"></script>
<script src="../js/report-tools.js"></script>
</body>
</html>
