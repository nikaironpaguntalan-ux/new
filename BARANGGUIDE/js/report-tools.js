/* BARANGUIDE report tools. Uses the same Leaflet map as the original map.js.
   Written with simple functions, arrays, jQuery, and basic event handlers. */
$(document).ready(function () {
    if (!window.BarangGuideMap) return;

    var bg = window.BarangGuideMap;
    var map = bg.map;
    var isAdmin = $("body").attr("data-is-admin") === "1";
    var isVerifiedOfficial = $("body").attr("data-official-verified") === "1";
    var csrf = $("body").attr("data-csrf");

    // Three BIOGUARD reporting categories. The second select depends on the first.
    var categories = [
        { name: "Human / Vector-borne", key: "animal_transmitted", color: "#346c77", icon: "fa-shield-virus" },
        { name: "Animal Disease", key: "animal_disease", color: "#ad6a42", icon: "fa-paw" },
        { name: "Habitat / Environment", key: "habitat_risk", color: "#a6823b", icon: "fa-seedling" }
    ];
    var reportOptions = {
        animal_transmitted: ["Dengue", "Rabies", "Malaria", "Leptospirosis", "Chikungunya", "Other human/vector-borne disease"],
        animal_disease: ["African Swine Fever (ASF)", "Avian Influenza", "Newcastle Disease", "Foot-and-Mouth Disease", "Other animal disease"],
        habitat_risk: ["Mosquito breeding site", "Stagnant water", "Rat/rodent infestation", "Flood-prone area", "Improper waste accumulation", "Stray/aggressive animal area", "Animal bite incident", "Unusual animal deaths", "Other environmental risk"]
    };

    var allReports = [];
    var allInterventions = [];
    var reportMarkers = [];
    var shownReports = [];
    var activeMode = "";   // "report", "place", "radius", or "distance"
    var selectionMarker = null;
    var radiusCenter = null;
    var radiusCircle = null;
    var distancePoints = [];
    var distanceLine = null;
    var distanceLabel = null;

    function escapeHTML(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function categoryInfo(type) {
        for (var i = 0; i < categories.length; i++) {
            if (categories[i].key === type) return categories[i];
        }
        return categories[2];
    }

    function categoryName(key) { return categoryInfo(key).name; }

    function updateReportDetails() {
        var category = $("#reportType").val();
        var detail = $("#reportDetail").empty().append('<option value="">Select disease or hazard</option>');
        var options = reportOptions[category] || [];
        for (var i = 0; i < options.length; i++) detail.append($("<option>").val(options[i]).text(options[i]));
    }
    $("#reportType").on("change", updateReportDetails);

    function niceStatus(value) {
        if (value === "in_progress") return "In progress";
        return String(value || "pending").replace(/^./, function (letter) { return letter.toUpperCase(); });
    }

    function notify(icon, title, message) {
        if (window.Swal) Swal.fire({ icon: icon, title: title, text: message });
        else alert(title + "\n" + message);
    }

    function setHint(message) {
        $("#toolHint").text(message).prop("hidden", !message);
    }

    function closeDrawer() {
        $("#mapDrawer").removeClass("is-open").attr("aria-hidden", "true");
        $("#menuButton").attr("aria-expanded", "false");
    }

    function openDrawer(panel) {
        $("#mapDrawer").addClass("is-open").attr("aria-hidden", "false");
        $("#menuButton").attr("aria-expanded", "true");
        if (panel) showPanel(panel);
    }

    function showPanel(name) {
        $(".drawer-tab").removeClass("is-selected");
        $('.drawer-tab[data-panel="' + name + '"]').addClass("is-selected");
        $(".drawer-page").prop("hidden", true);
        $("#panel-" + name).prop("hidden", false);
    }

    $("#menuButton").on("click", function () {
        if ($("#mapDrawer").hasClass("is-open")) closeDrawer();
        else openDrawer("analytics");
    });
    $("#closeMenu").on("click", closeDrawer);
    $(".drawer-tab").on("click", function () { showPanel($(this).attr("data-panel")); });
    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            closeDrawer();
            closeReport();
            closeIntervention();
            clearMeasurements();
        }
    });

    function removeSelectionMarker() {
        if (selectionMarker) map.removeLayer(selectionMarker);
        selectionMarker = null;
    }

    function closeReport() {
        $("#reportForm").removeClass("is-open").hide();
        removeSelectionMarker();
        if (activeMode === "report") {
            activeMode = "";
            setHint("");
        }
    }

    function closeIntervention() {
        $("#interventionForm").removeClass("is-open").hide();
    }

    function startReport() {
        closeDrawer();
        closeIntervention();
        bg.closePlotForm();
        clearMeasurements();
        $("#reportForm")[0].reset();
        $("#reportLat, #reportLng").val("");
        updateReportDetails();
        removeSelectionMarker();
        activeMode = "report";
        $("#reportForm").addClass("is-open").show();
        setHint("Add report: click a location on the map to set its coordinates.");
    }

    $("#addReportBtn, #drawerAddReport").on("click", startReport);
    $("#closeReportForm").on("click", closeReport);

    function openIntervention(reportId) {
        if (!isVerifiedOfficial) return;
        closeReport();
        bg.closePlotForm();
        clearMeasurements();
        closeDrawer();
        $("#interventionForm")[0].reset();
        if (reportId) $("#interventionReport").val(String(reportId));
        $("#interventionForm").addClass("is-open").show();
    }

    $("#newIntervention").on("click", function () { openIntervention(""); });
    $("#closeInterventionForm").on("click", closeIntervention);

    // The original location add form remains available in Saved places.
    window.BarangGuideReports = {
        updatePlaces: updatePlaces,
        startPlace: function () {
            closeDrawer();
            closeReport();
            clearMeasurements();
            activeMode = "place";
            setHint("Saved place: click the map to select the coordinates.");
        },
        endPlace: function () {
            if (activeMode === "place") {
                activeMode = "";
                setHint("");
            }
        }
    };

    // Let the existing map.js receive clicks for adding saved places.
    // Its code checks whether #plotForm is open.
    window.BarangGuideReports.handleMapClick = function (event) {
        if (activeMode === "place") return false;
        if (activeMode === "report") {
            var lat = event.latlng.lat.toFixed(6);
            var lng = event.latlng.lng.toFixed(6);
            $("#reportLat").val(lat);
            $("#reportLng").val(lng);
            removeSelectionMarker();
            selectionMarker = L.marker([lat, lng], { opacity: 0.8 }).addTo(map);
            setHint("Location selected. Complete the report form and submit.");
            return true;
        }
        if (activeMode === "radius") { radiusCenter = event.latlng; drawRadius(); return true; }
        if (activeMode === "distance") { addDistancePoint(event.latlng); return true; }
        return false;
    };

    function makeReportIcon(type, verification) {
        var info = categoryInfo(type);
        var state = verification === "verified" ? "verified" : (verification === "rejected" ? "rejected" : "pending");
        var stateIcon = state === "verified" ? "fa-check" : (state === "rejected" ? "fa-xmark" : "fa-clock");
        return L.divIcon({
            className: "report-marker-icon",
            html: '<span class="report-pin report-' + state + '" style="--pin-color:' + info.color + '"><i class="fa-solid ' + info.icon + '"></i></span>' +
                  '<span class="pin-state ' + state + '"><i class="fa-solid ' + stateIcon + '"></i></span>', 
            iconSize: [34, 37],
            iconAnchor: [17, 34],
            popupAnchor: [0, -32]
        });
    }

    function makeReportPopup(report) {
        var info = categoryInfo(report.risk_category);
        return '<div class="report-popup">' +
            '<div class="report-popup-title">' + escapeHTML(report.location_name) + '</div>' +
            '<div class="report-popup-meta"><span style="color:' + info.color + '">&#9679;</span> ' + escapeHTML(categoryName(report.risk_category)) +
            '<br>' + escapeHTML(report.risk_detail || report.report_type) +
            '<br>Official review: ' + escapeHTML(niceStatus(report.verification_status)) +
            '<br>Reported urgency: ' + escapeHTML(niceStatus(report.severity)) +
            '<br>Response: ' + escapeHTML(niceStatus(report.status)) + '</div>' +
            (report.verification_note ? '<div class="report-popup-description"><strong>Review note:</strong> ' + escapeHTML(report.verification_note) + '</div>' : '') +
            (report.photo_path && /^\.\.\/assets\/uploads\/reports\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(report.photo_path) ?
             '<a href="' + escapeHTML(report.photo_path) + '" target="_blank" rel="noopener noreferrer"><img class="report-photo" src="' + escapeHTML(report.photo_path) + '" alt="Submitted evidence"></a>' : '') +
            '<div class="report-popup-description">' + escapeHTML(report.description) + '</div>' +
            '<small>' + escapeHTML(report.created_at || "") + '</small></div>';
    }

    function checkedValues(selector) {
        var values = [];
        $(selector + ":checked").each(function () { values.push($(this).val()); });
        return values;
    }

    function filterReports() {
        var types = checkedValues(".filter-type");
        var severities = checkedValues(".filter-severity");
        var statuses = checkedValues(".filter-status");
        var results = [];
        for (var i = 0; i < allReports.length; i++) {
            var report = allReports[i];
            if (types.indexOf(report.risk_category) >= 0 &&
                severities.indexOf(report.severity) >= 0 &&
                statuses.indexOf(report.status) >= 0 &&
                checkedValues(".filter-verification").indexOf(report.verification_status) >= 0 &&
                (!$("#detailFilter").val() || $("#detailFilter").val() === report.risk_detail)) results.push(report);
        }
        return results;
    }

    function updatePlaces() {
        var shouldShow = $("#showPlaces").is(":checked");
        var oldMarkers = bg.getMarkers();
        for (var i = 0; i < oldMarkers.length; i++) {
            if (shouldShow && !map.hasLayer(oldMarkers[i])) map.addLayer(oldMarkers[i]);
            if (!shouldShow && map.hasLayer(oldMarkers[i])) map.removeLayer(oldMarkers[i]);
        }
    }

    function renderReports() {
        for (var i = 0; i < reportMarkers.length; i++) map.removeLayer(reportMarkers[i].marker);
        reportMarkers = [];
        shownReports = filterReports();
        var visible = $("#showReportMarkers").is(":checked");
        for (var j = 0; j < shownReports.length; j++) {
            var report = shownReports[j];
            var lat = parseFloat(report.latitude);
            var lng = parseFloat(report.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
            var marker = L.marker([lat, lng], { icon: makeReportIcon(report.risk_category, report.verification_status) });
            marker.bindPopup(makeReportPopup(report));
            if (visible) marker.addTo(map);
            reportMarkers.push({ marker: marker, report: report });
        }
        $("#reportCount").text(shownReports.length);
        updatePlaces();
        renderReportList();
        renderAnalytics();
        updateRadiusCount();
        updateInterventionOptions();
        renderVerificationQueue();
    }

    function renderReportList() {
        var container = $("#reportList").empty();
        if (!shownReports.length) {
            container.append('<p class="empty-note">No reports match the current filters.</p>');
            return;
        }
        for (var i = 0; i < shownReports.length; i++) {
            var report = shownReports[i];
            var info = categoryInfo(report.risk_category);
            var button = $("<button>").attr("type", "button").addClass("record-entry");
            button.html('<div class="record-head"><span><i class="record-dot" style="--record-color:' + info.color + '"></i>' + escapeHTML(report.risk_detail || report.report_type) +
                '</span><span class="status-chip">' + escapeHTML(niceStatus(report.verification_status)) + '</span></div>' +
                '<p>' + escapeHTML(categoryName(report.risk_category)) + ' · ' + escapeHTML(report.location_name) + '</p>' + '<small>' + escapeHTML(report.created_at || "") + '</small>');
            button.data("report-id", report.id);
            container.append(button);
        }
    }

    function renderAnalytics() {
        $("#statTotal").text(allReports.length);
        var pending = 0, verified = 0, progress = 0;
        for (var i = 0; i < allReports.length; i++) {
            if (allReports[i].verification_status === "pending") pending++;
            if (allReports[i].verification_status === "verified") verified++;
            if (allReports[i].status === "in_progress") progress++;
        }
        $("#statPending").text(pending);
        $("#statVerified").text(verified);
        $("#statProgress").text(progress);
        var container = $("#categoryBreakdown").empty();
        renderRiskNotices();
        if (!allReports.length) { container.append('<p class="empty-note">No reports yet.</p>'); return; }
        for (var j = 0; j < categories.length; j++) {
            var count = 0;
            for (var k = 0; k < allReports.length; k++) {
                if (allReports[k].risk_category === categories[j].key) count++;
            }
            if (!count) continue;
            var width = (count / allReports.length * 100).toFixed(1);
            container.append('<div class="breakdown-row"><span>' + escapeHTML(categories[j].name) + '</span><strong>' + count + '</strong>' +
                '<div class="breakdown-bar"><div style="width:' + width + '%;background:' + categories[j].color + '"></div></div></div>');
        }
    }

    // High-priority alerts are based on VERIFIED reports only, not disease predictions.
    function renderRiskNotices() {
        var alerts = $("#priorityAlerts").empty();
        var count = 0, recent = 0, earlier = 0;
        var now = new Date().getTime();
        var month = 30 * 24 * 60 * 60 * 1000;
        for (var i = 0; i < allReports.length; i++) {
            var report = allReports[i];
            if (report.verification_status !== "verified") continue;
            var created = new Date(String(report.created_at || "").replace(" ", "T")).getTime();
            if (Number.isFinite(created)) {
                var age = now - created;
                if (age >= 0 && age < month) recent++;
                else if (age >= month && age < 2 * month) earlier++;
            }
            if (report.status !== "resolved" && (report.severity === "high" || report.severity === "critical")) {
                count++;
                if (count <= 5) alerts.append('<div class="notice-item">' + escapeHTML(report.risk_detail) +
                    ' · ' + escapeHTML(report.location_name) + ' · ' + escapeHTML(niceStatus(report.severity)) +
                    ' priority. Awaiting / undergoing an appropriate response.</div>');
            }
        }
        if (!count) alerts.html('<p class="empty-note">No verified high-priority unresolved reports.</p>');
        else if (count > 5) alerts.append('<p class="context-note">' + (count - 5) + ' more high-priority reports are visible on the map.</p>');
        var direction = recent > earlier ? "more" : (recent < earlier ? "fewer" : "the same number of");
        $("#submissionTrend").text(recent + " verified reports from the last 30 days; " + earlier +
            " during the preceding 30 days (" + direction + " reports). This tracks reporting volume, not confirmed disease incidence.");
    }

    function updateDetailFilter() {
        var selected = $("#detailFilter").val();
        var values = [];
        $("#detailFilter").empty().append('<option value="">All diseases and hazards</option>');
        for (var i = 0; i < allReports.length; i++) {
            var detail = allReports[i].risk_detail || allReports[i].report_type;
            if (values.indexOf(detail) === -1) values.push(detail);
        }
        values.sort();
        for (var j = 0; j < values.length; j++) $("#detailFilter").append($("<option>").val(values[j]).text(values[j]));
        $("#detailFilter").val(selected || "");
    }

    function renderVerificationQueue() {
        if (!isVerifiedOfficial) return;
        var box = $("#verificationQueue").empty();
        var count = 0;
        for (var i = 0; i < allReports.length; i++) {
            var report = allReports[i];
            if (report.verification_status !== "pending") continue;
            count++;
            var entry = $("<div>").addClass("record-entry");
            entry.html('<div class="record-head"><span>#' + escapeHTML(report.id) + ' · ' + escapeHTML(report.risk_detail) +
                '</span><span class="status-chip">Pending</span></div><p>' + escapeHTML(report.location_name) + ' · ' +
                escapeHTML(report.description) + '</p>');
            var actions = $("<div>").addClass("review-buttons");
            actions.append($("<button type='button' class='review-accept'>Verify</button>").data("id", report.id));
            actions.append($("<button type='button' class='review-decline'>Reject</button>").data("id", report.id));
            actions.append($("<button type='button' class='review-view'>View on map</button>").data("id", report.id));
            entry.append(actions);
            box.append(entry);
        }
        if (!count) box.html('<p class="empty-note">No reports awaiting verification.</p>');
    }

    function focusReport(id) {
        var existsInLayer = false;
        for (var j = 0; j < reportMarkers.length; j++) {
            if (String(reportMarkers[j].report.id) === String(id)) existsInLayer = true;
        }
        if (!existsInLayer) {
            $(".filter-type, .filter-verification, .filter-severity, .filter-status").prop("checked", true);
            $("#detailFilter").val("");
            renderReports();
        }
        if (!$("#showReportMarkers").is(":checked")) {
            $("#showReportMarkers").prop("checked", true);
            renderReports();
        }
        for (var i = 0; i < reportMarkers.length; i++) {
            if (String(reportMarkers[i].report.id) === String(id)) {
                var item = reportMarkers[i];
                $("#showReportMarkers").prop("checked", true);
                if (!map.hasLayer(item.marker)) map.addLayer(item.marker);
                closeDrawer();
                map.flyTo(item.marker.getLatLng(), 18);
                item.marker.openPopup();
                return;
            }
        }
    }

    $("#reportList").on("click", ".record-entry", function () { focusReport($(this).data("report-id")); });

    function loadReports() {
        $.ajax({
            url: "fetch_reports.php", type: "GET", dataType: "json", cache: false,
            success: function (response) {
                if (response.status === "success") {
                    allReports = response.data || [];
                    updateDetailFilter();
                    renderReports();
                } else {
                    $("#reportList").html('<p class="empty-note">' + escapeHTML(response.message || "Unable to load reports.") + '</p>');
                    notify("error", "Could not load reports", response.message || "Check the report database table.");
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) { location.href = "../login.html"; return; }
                $("#reportList").html('<p class="empty-note">Database not available. Import the updated database_setup.sql first.</p>');
            }
        });
    }

    $("#reportForm").on("submit", function (event) {
        event.preventDefault();
        var latitude = $("#reportLat").val();
        var longitude = $("#reportLng").val();
        var reportType = $("#reportType").val();
        var locationName = $("#reportPlace").val().trim();
        var reportDetail = $("#reportDetail").val();
        var severity = $("#reportSeverity").val();
        var description = $("#reportDescription").val().trim();
        if (!latitude || !longitude) { notify("warning", "Map point needed", "Click the map to choose the location."); return; }
        if (!reportType || !reportDetail || !locationName || !description) { notify("warning", "Missing details", "Complete the category, location and description."); return; }
        var formData = new FormData();
        formData.append("latitude", latitude);
        formData.append("longitude", longitude);
        formData.append("risk_category", reportType);
        formData.append("risk_detail", reportDetail);
        formData.append("location_name", locationName);
        formData.append("severity", severity);
        formData.append("description", description);
        formData.append("csrf_token", csrf);
        var file = $("#reportPhoto")[0].files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { notify("warning", "Image too large", "Maximum file size is 5 MB."); return; }
            formData.append("photo", file);
        }
        $("#saveReportBtn").prop("disabled", true);
        $.ajax({
            url: "save_report.php", type: "POST", dataType: "json",
            data: formData, processData: false, contentType: false,
            success: function (response) {
                if (response.status === "success") {
                    closeReport();
                    loadReports();
                    notify("success", "Report submitted", "Your report is pending official government verification.");
                } else notify("error", "Unable to submit", response.message || "The report was not saved.");
            },
            error: function (xhr) {
                if (xhr.status === 401) { location.href = "../login.html"; return; }
                notify("error", "Save failed", (xhr.responseJSON && xhr.responseJSON.message) || "Check the PHP/MySQL setup.");
            },
            complete: function () { $("#saveReportBtn").prop("disabled", false); }
        });
    });

    $("#filterToggleBtn").on("click", function () {
        var open = $("#reportFilters").prop("hidden");
        $("#reportFilters").prop("hidden", !open);
        $(this).attr("aria-expanded", String(open));
        $(this).toggleClass("is-active", open);
    });
    $("#applyReportFilters, #detailFilter").on("click change", function () { renderReports(); });
    $("#clearReportFilters").on("click", function () {
        $(".filter-type, .filter-verification, .filter-severity, .filter-status, #showReportMarkers").prop("checked", true);
        $("#detailFilter").val("");
        renderReports();
    });
    $("#viewMarkersBtn").on("click", function () {
        closeReport();
        closeIntervention();
        bg.closePlotForm();
        clearMeasurements();
        $(".filter-type, .filter-verification, .filter-severity, .filter-status, #showReportMarkers").prop("checked", true);
        $("#detailFilter").val("");
        renderReports();
        var bounds = [];
        for (var i = 0; i < reportMarkers.length; i++) bounds.push(reportMarkers[i].marker.getLatLng());
        var oldMarkers = bg.getMarkers();
        for (var j = 0; j < oldMarkers.length; j++) bounds.push(oldMarkers[j].getLatLng());
        if (bounds.length > 1) map.fitBounds(bounds, { padding: [75, 75], maxZoom: 17 });
        else if (bounds.length === 1) map.setView(bounds[0], 17);
        else notify("info", "No markers found", "Submit a report first.");
    });

    // Straight-line radius in meters around a point selected on the map.
    function drawRadius() {
        if (!radiusCenter) return;
        var meters = parseInt($("#radiusMeters").val(), 10) || 500;
        if (radiusCircle) map.removeLayer(radiusCircle);
        radiusCircle = L.circle(radiusCenter, {
            radius: meters, color: "#2f7771", weight: 2, fillColor: "#82dcd5", fillOpacity: .15
        }).addTo(map);
        updateRadiusCount();
        $("#clearMeasureBtn").prop("hidden", false);
        setHint("Radius centered. Click another point to move the circle.");
    }

    function updateRadiusCount() {
        if (!radiusCenter) return;
        var meters = parseInt($("#radiusMeters").val(), 10) || 500;
        var count = 0;
        for (var i = 0; i < shownReports.length; i++) {
            var report = shownReports[i];
            if (map.distance(radiusCenter, [parseFloat(report.latitude), parseFloat(report.longitude)]) <= meters) count++;
        }
        $("#radiusResult").text(count + " matching reports within " + meters + " meters (straight-line radius).");
    }

    $("#radiusBtn").on("click", function () {
        if (activeMode === "radius") { clearMeasurements(); return; }
        closeReport();
        closeIntervention();
        bg.closePlotForm();
        clearMeasurements();
        activeMode = "radius";
        $("#radiusOptions").prop("hidden", false);
        $("#radiusBtn").addClass("is-active");
        setHint("Radius tool: click the map to choose a center point.");
        $("#clearMeasureBtn").prop("hidden", false);
    });
    $("#radiusMeters").on("change", drawRadius);

    function clearDistance() {
        distancePoints = [];
        if (distanceLine) map.removeLayer(distanceLine);
        if (distanceLabel) map.removeLayer(distanceLabel);
        distanceLine = null;
        distanceLabel = null;
    }

    function addDistancePoint(point) {
        if (distancePoints.length === 2) clearDistance();
        distancePoints.push(point);
        if (distancePoints.length === 1) {
            setHint("Distance tool: select the second point on the map.");
            return;
        }
        var meters = map.distance(distancePoints[0], distancePoints[1]);
        var label = meters >= 1000 ? (meters / 1000).toFixed(2) + " km" : Math.round(meters) + " m";
        distanceLine = L.polyline(distancePoints, { color: "#286e64", weight: 3, dashArray: "7 5" }).addTo(map);
        var middle = L.latLng((distancePoints[0].lat + distancePoints[1].lat) / 2,
            (distancePoints[0].lng + distancePoints[1].lng) / 2);
        distanceLabel = L.marker(middle, {
            icon: L.divIcon({ className: "leaflet-div-icon", html: '<span class="radius-label">' + label + '</span>' }),
            interactive: false
        }).addTo(map);
        $("#clearMeasureBtn").prop("hidden", false);
        setHint("Straight-line distance: " + label + ". Click again to start another measurement.");
    }

    $("#distanceBtn").on("click", function () {
        if (activeMode === "distance") { clearMeasurements(); return; }
        closeReport();
        closeIntervention();
        bg.closePlotForm();
        clearMeasurements();
        activeMode = "distance";
        $("#distanceBtn").addClass("is-active");
        $("#clearMeasureBtn").prop("hidden", false);
        setHint("Distance tool: click two locations on the map (straight-line distance).");
    });

    function clearMeasurements() {
        if (radiusCircle) map.removeLayer(radiusCircle);
        radiusCircle = null;
        radiusCenter = null;
        clearDistance();
        $("#radiusOptions").prop("hidden", true);
        $("#radiusBtn, #distanceBtn").removeClass("is-active");
        $("#clearMeasureBtn").prop("hidden", true);
        if (activeMode === "radius" || activeMode === "distance") {
            activeMode = "";
            setHint("");
        }
    }
    $("#clearMeasureBtn").on("click", clearMeasurements);

    function updateInterventionOptions() {
        if (!isVerifiedOfficial) return;
        var select = $("#interventionReport");
        var previous = select.val();
        select.empty().append('<option value="">Select report</option>');
        for (var i = 0; i < allReports.length; i++) {
            var report = allReports[i];
            if (report.verification_status === "verified") select.append($("<option>").val(report.id).text("#" + report.id + " — " + report.risk_detail + " / " + report.location_name));
        }
        select.val(previous || "");
    }

    function renderInterventions() {
        var container = $("#interventionList").empty();
        if (!allInterventions.length) {
            container.append('<p class="empty-note">No recorded interventions.</p>');
            return;
        }
        for (var i = 0; i < allInterventions.length; i++) {
            var entry = allInterventions[i];
            var card = $("<button>").attr("type", "button").addClass("record-entry").data("report-id", entry.report_id);
            card.html('<div class="record-head"><span>' + escapeHTML(entry.agency) + '</span><span class="status-chip">' +
                escapeHTML(niceStatus(entry.status)) + '</span></div>' +
                '<p>' + escapeHTML(entry.action_taken) + '</p>' +
                '<small>Related: #' + escapeHTML(entry.report_id) + ' &middot; ' + escapeHTML(entry.risk_detail || entry.report_type) +
                ' &middot; ' + escapeHTML(entry.created_at || "") + '</small>' +
                (entry.scheduled_for ? '<p><strong>Scheduled:</strong> ' + escapeHTML(entry.scheduled_for) + '</p>' : ''));
            container.append(card);
        }
    }
    $("#interventionList").on("click", ".record-entry", function () { focusReport($(this).data("report-id")); });

    function loadInterventions() {
        $.ajax({
            url: "fetch_interventions.php", type: "GET", dataType: "json", cache: false,
            success: function (response) {
                if (response.status === "success") {
                    allInterventions = response.data || [];
                    renderInterventions();
                } else $("#interventionList").html('<p class="empty-note">Unable to load interventions.</p>');
            },
            error: function () {
                $("#interventionList").html('<p class="empty-note">Import the updated database_setup.sql to enable interventions.</p>');
            }
        });
    }

    $("#interventionForm").on("submit", function (event) {
        event.preventDefault();
        var reportId = $("#interventionReport").val();
        var agency = $("#interventionAgency").val().trim();
        var status = $("#interventionStatus").val();
        var action = $("#interventionAction").val().trim();
        var scheduledFor = $("#interventionDate").val();
        if (!reportId || !agency || !action || (status === "planned" && !scheduledFor)) { notify("warning", "Missing information", "Complete all intervention fields."); return; }
        $("#saveInterventionBtn").prop("disabled", true);
        $.ajax({
            url: "save_intervention.php", type: "POST", dataType: "json",
            data: { report_id: reportId, agency: agency, status: status, scheduled_for: scheduledFor, action_taken: action, csrf_token: csrf },
            success: function (response) {
                if (response.status === "success") {
                    closeIntervention();
                    loadInterventions();
                    loadReports();
                    notify("success", "Intervention saved", "The intervention was recorded successfully.");
                } else notify("error", "Could not save", response.message || "Try again.");
            },
            error: function (xhr) {
                if (xhr.status === 403) { notify("error", "Not permitted", "Only a verified government official can record interventions."); return; }
                notify("error", "Connection error", (xhr.responseJSON && xhr.responseJSON.message) || "Could not save this intervention.");
            },
            complete: function () { $("#saveInterventionBtn").prop("disabled", false); }
        });
    });

    $("#verificationQueue").on("click", ".review-view", function () { focusReport($(this).data("id")); });
    $("#verificationQueue").on("click", ".review-accept, .review-decline", function () {
        var id = $(this).data("id");
        var decision = $(this).hasClass("review-accept") ? "verified" : "rejected";
        var promptText = decision === "verified" ? "Optional verification notes:" : "Reason for rejection (required):";
        var notes = window.prompt(promptText, "");
        if (notes === null) return;
        if (decision === "rejected" && !notes.trim()) { notify("warning", "Reason needed", "Enter a reason for rejection."); return; }
        if (!window.confirm("Confirm " + decision + " report #" + id + "?")) return;
        $.post("review_report.php", { report_id: id, decision: decision, notes: notes, csrf_token: csrf }, function (result) {
            if (result.status === "success") { loadReports(); notify("success", "Report reviewed", result.message); }
            else notify("error", "Review failed", result.message || "Try again.");
        }, "json").fail(function (xhr) { notify("error", "Review failed", (xhr.responseJSON && xhr.responseJSON.message) || "Check permissions."); });
    });

    function loadOfficials() {
        if (!isAdmin) return;
        $.getJSON("admin_officials.php", function (response) {
            var box = $("#officialList").empty();
            if (response.status !== "success") { box.text(response.message || "Could not load official accounts."); return; }
            var officials = response.data || [];
            if (!officials.length) { box.html('<p class="empty-note">No government official accounts yet.</p>'); return; }
            for (var i = 0; i < officials.length; i++) {
                var official = officials[i];
                var entry = $("<div>").addClass("record-entry");
                entry.html('<div class="record-head"><span>' + escapeHTML(official.name) + '</span><span class="status-chip">' + escapeHTML(niceStatus(official.official_verification)) + '</span></div>' +
                    '<p>' + escapeHTML(official.government_office || "Profile not completed") + ' · ' + escapeHTML(official.position || "") +
                    '</p><small>' + escapeHTML(official.official_email || official.email) + ' · ID: ' + escapeHTML(official.employee_id || "Not provided") +
                    ' · ' + escapeHTML(official.city || "") + '</small>' + (official.official_review_note ? '<p>Last decision: ' + escapeHTML(official.official_review_note) + '</p>' : ''));
                if (official.employee_id && official.government_office) {
                    var actions = $("<div>").addClass("review-buttons");
                    actions.append($("<button type='button' class='official-approve'>Approve</button>").data("id", official.id));
                    actions.append($("<button type='button' class='official-reject'>Reject / Revoke</button>").data("id", official.id));
                    entry.append(actions);
                }
                box.append(entry);
            }
        }).fail(function (xhr) { $("#officialList").text((xhr.responseJSON && xhr.responseJSON.message) || "Unable to load official profiles."); });
    }
    $("#officialList").on("click", ".official-approve, .official-reject", function () {
        var id = $(this).data("id");
        var decision = $(this).hasClass("official-approve") ? "verified" : "rejected";
        var notes = window.prompt(decision === "verified" ? "Credential verification notes (optional):" : "Reason for rejection/revocation (required):", "");
        if (notes === null) return;
        if (decision === "rejected" && !notes.trim()) { notify("warning", "Reason needed", "Enter a review reason."); return; }
        if (!window.confirm("Have you independently checked this official's credentials? " +
            (decision === "verified" ? "Approve" : "Reject / revoke") + " account #" + id + "?")) return;
        $.post("review_official.php", { user_id: id, decision: decision, notes: notes, csrf_token: csrf }, function (response) {
            if (response.status === "success") { loadOfficials(); notify("success", "Account reviewed", response.message); }
            else notify("error", "Review failed", response.message || "Try again.");
        }, "json").fail(function (xhr) { notify("error", "Review failed", (xhr.responseJSON && xhr.responseJSON.message) || "Check permissions."); });
    });

    loadReports();
    loadInterventions();
    loadOfficials();
    // Residents see status changes without manually reloading the entire map.
    window.setInterval(function () {
        if ($("#reportForm").is(":visible") || $("#interventionForm").is(":visible")) return;
        loadReports();
        loadInterventions();
    }, 60000);
});