$(document).ready(function () {
    if (typeof L === "undefined") {
        $("#mapError").text("The map library could not load. Check your internet connection and reload the page.").prop("hidden", false);
        return;
    }

    var defaultView = [10.669644, 122.948844];
    var map = L.map("map", { zoomControl: false }).setView(defaultView, 17);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // Chosen is optional. The normal category select still works without it.
    if ($.fn.chosen) {
        $(".chosen-select").chosen({
            width: "100%",
            no_results_text: "No category found."
        });
    }

    if (L.esri && L.esri.Geocoding && L.esri.Geocoding.geosearch) {
        var searchControl = L.esri.Geocoding.geosearch({
            position: "bottomleft",
            expanded: false,
            placeholder: "Search place or address"
        }).addTo(map);
        var results = L.layerGroup().addTo(map);

        searchControl.on("results", function (data) {
            results.clearLayers();
            data.results.forEach(function (result) {
                var marker = L.marker(result.latlng).bindPopup(
                    escapeHTML(result.text || "Search result")
                );
                results.addLayer(marker);
            });
        });
    }

    var tempMarker = null;
    var markers = [];
    var latlngs = [];
    var polylines = [];
    var distanceLabels = [];
    var markerMap = {};

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function clearForm() {
        $("#lat, #lng, #name, #description").val("");
        $("#category").val("");
    }

    function openPlotForm() {
        $("#plotForm").addClass("is-open").show();
    }

    function closePlotForm() {
        $("#plotForm").removeClass("is-open").hide();
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }

    function getIconPath(category) {
        var iconMap = {
            Restaurant: "../assets/images/restaurant.png",
            Church: "../assets/images/church.png",
            Mall: "../assets/images/mall.png",
            School: "../assets/images/school.png",
            Park: "../assets/images/park.png"
        };
        return iconMap[category] || iconMap.Park;
    }

    function createCustomIcon(category) {
        return L.icon({
            iconUrl: getIconPath(category),
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
    }

    function createPopup(name, category, description) {
        return "<b>" + escapeHTML(name).toUpperCase() + "</b><br>" +
            escapeHTML(category) + "<br>" + escapeHTML(description);
    }

    function resetResultState() {
        markers.forEach(function (marker) { map.removeLayer(marker); });
        polylines.forEach(function (line) { map.removeLayer(line); });
        distanceLabels.forEach(function (label) { map.removeLayer(label); });

        markers = [];
        latlngs = [];
        polylines = [];
        distanceLabels = [];
        markerMap = {};
        $("#deleteBtn").prop("disabled", true).removeData("id");
    }

    function plotMarkers(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return;
        }

        data.forEach(function (loc) {
            var lat = parseFloat(loc.latitude);
            var lng = parseFloat(loc.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return;
            }

            var category = String(loc.category || "Park");
            var name = String(loc.name || "Unnamed location");
            var description = String(loc.description || "");
            var id = loc.id;

            var marker = L.marker([lat, lng], {
                icon: createCustomIcon(category)
            }).addTo(map);

            marker.bindPopup(createPopup(name, category, description));
            markers.push(marker);
            latlngs.push([lat, lng]);
            markerMap[name.toLowerCase()] = { marker: marker, id: id };
        });

        // Older versions connected unrelated saved places with lines.
        // Distance is now measured only when the user selects SHOW DISTANCE.
        // Do not automatically zoom away from the current map view.
        if (window.BarangGuideReports && window.BarangGuideReports.updatePlaces) {
            window.BarangGuideReports.updatePlaces();
        }
    }

    function refreshLocations(filterData) {
        resetResultState();

        if (Array.isArray(filterData)) {
            plotMarkers(filterData);
            return;
        }

        $.ajax({
            url: "fetch_location.php",
            type: "GET",
            dataType: "json",
            success: function (response) {
                if (response.status === "success") {
                    plotMarkers(response.data);
                } else {
                    Swal.fire({ icon: "info", title: "No locations", text: response.message || "No locations found." });
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    window.location.href = "../login.html";
                    return;
                }
                Swal.fire({ icon: "error", title: "Fetch error", text: "Could not retrieve locations from the database." });
            }
        });
    }

    $("#newBtn").on("click", function () {
        if (window.BarangGuideReports) window.BarangGuideReports.startPlace();
        clearForm();
        closePlotForm();
        openPlotForm();
    });

    $("#closeForm").on("click", function (e) {
        e.preventDefault();
        closePlotForm();
        if (window.BarangGuideReports) window.BarangGuideReports.endPlace();
    });

    map.on("movestart", function () {
        if ($("#plotForm").is(":visible")) {
            closePlotForm();
        }
    });

    map.on("click", function (event) {
        if (window.BarangGuideReports && window.BarangGuideReports.handleMapClick(event)) {
            return;
        }
        // Normal map clicks no longer open the old location form unexpectedly.
        if (!$("#plotForm").is(":visible")) return;
        if ($(event.originalEvent.target).closest("#plotForm, .leaflet-control, .leaflet-popup").length) {
            return;
        }

        var lat = event.latlng.lat.toFixed(6);
        var lng = event.latlng.lng.toFixed(6);

        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = L.marker([lat, lng]).addTo(map);

        clearForm();
        $("#lat").val(lat);
        $("#lng").val(lng);
        openPlotForm();
    });

    $("#plotForm").on("submit", function (event) {
        event.preventDefault();
        event.stopPropagation();

        var lat = parseFloat($("#lat").val());
        var lng = parseFloat($("#lng").val());
        var category = $("#category").val();
        var name = $("#name").val().trim();
        var description = $("#description").val().trim();
        var button = $("#saveBtn");

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            Swal.fire({ icon: "warning", title: "Location required", text: "Click a point on the map first." });
            return;
        }
        if (!category) {
            Swal.fire({ icon: "warning", title: "Category required", text: "Select a category." });
            return;
        }
        if (!name || !description) {
            Swal.fire({ icon: "warning", title: "Missing information", text: "Enter a location name and description." });
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "save_location.php",
            type: "POST",
            dataType: "json",
            data: {
                latitude: lat,
                longitude: lng,
                category: category,
                name: name,
                description: description
            },
            success: function (response) {
                if (response.status === "success") {
                    closePlotForm();
                    Swal.fire({ icon: "success", title: "Location saved", text: "The mapped location was added successfully." });
                    refreshLocations();
                    if (window.BarangGuideReports) window.BarangGuideReports.endPlace();
                } else {
                    Swal.fire({ icon: "error", title: "Unable to save", text: response.message || "Something went wrong." });
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    window.location.href = "../login.html";
                    return;
                }
                Swal.fire({ icon: "error", title: "Connection error", text: "Could not save the location." });
            },
            complete: function () {
                button.prop("disabled", false);
            }
        });
    });

    $("#searchBtn").on("click", function () {
        var query = $("#searchInput").val().trim().toLowerCase();
        if (!query) {
            Swal.fire({ icon: "info", title: "Search location", text: "Enter a location name first." });
            return;
        }

        var found = markerMap[query];
        if (!found) {
            Swal.fire({ icon: "info", title: "Not found", text: "No mapped location matches that name." });
            return;
        }

        var latlng = found.marker.getLatLng();
        map.flyTo(latlng, 18, { animate: true, duration: 0.8 });
        found.marker.openPopup();
        $("#deleteBtn").prop("disabled", false).data("id", found.id);
    });

    $("#searchInput").on("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            $("#searchBtn").trigger("click");
        }
    });

    $("#deleteBtn").on("click", function () {
        var button = $(this);
        var locationId = button.data("id");

        if (!locationId) {
            Swal.fire({ icon: "info", title: "No location selected", text: "Search for a mapped location first." });
            return;
        }

        Swal.fire({
            title: "Delete this location?",
            text: "The location will be removed from the database.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Delete",
            cancelButtonText: "Cancel"
        }).then(function (result) {
            if (!result.isConfirmed) return;

            $.ajax({
                url: "delete_location.php",
                type: "POST",
                dataType: "json",
                data: { id: locationId },
                success: function (response) {
                    if (response.status === "success") {
                        button.prop("disabled", true).removeData("id");
                        refreshLocations();
                        Swal.fire({ icon: "success", title: "Deleted", text: "The location has been removed." });
                    } else {
                        Swal.fire({ icon: "error", title: "Delete failed", text: response.message || "The location could not be deleted." });
                    }
                },
                error: function (xhr) {
                    if (xhr.status === 401) {
                        window.location.href = "../login.html";
                        return;
                    }
                    Swal.fire({ icon: "error", title: "Connection error", text: "Could not delete the location." });
                }
            });
        });
    });

    $("#submitBtn").on("click", function (event) {
        event.preventDefault();
        var selectedCategories = $("#filterCategory").val();

        if (!selectedCategories || selectedCategories.length === 0) {
            refreshLocations();
            return;
        }

        $.ajax({
            url: "filter_location.php",
            type: "POST",
            dataType: "json",
            data: { category: selectedCategories },
            success: function (response) {
                if (response.status === "success") {
                    refreshLocations(response.data);
                } else {
                    Swal.fire({ icon: "info", title: "No locations", text: response.message || "No locations match the filter." });
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    window.location.href = "../login.html";
                    return;
                }
                Swal.fire({ icon: "error", title: "Filter error", text: "Could not apply the selected categories." });
            }
        });
    });

    // Expose just the existing map and saved-place layers to the new report tools.
    window.BarangGuideMap = {
        map: map,
        getMarkers: function () { return markers; },
        refreshLocations: refreshLocations,
        closePlotForm: closePlotForm
    };

    // Leaflet needs to know the map's final size once the page finishes loading.
    window.setTimeout(function () { map.invalidateSize(); }, 150);
    window.addEventListener("resize", function () { map.invalidateSize(); });
    // BIOGUARD focuses on risk reports; legacy saved-place functions remain available in code.
});
