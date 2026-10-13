document.addEventListener("DOMContentLoaded", function () {
    const residentForm = document.getElementById("resident-form");
    const officialForm = document.getElementById("official-form");
    const profileTitle = document.getElementById("profile-title");
    const profileDescription = document.getElementById("profile-description");
    const identity = localStorage.getItem("userIdentity");

    fetch("forms/account_status.php")
        .then(function (response) { return response.json(); })
        .then(function (account) {
            if (!account.signed_in) window.location.href = "login.html";
            else if (account.is_admin || (account.identity && account.identity !== identity)) {
                window.location.href = "forms/dashboard.php";
            }
        })
        .catch(function () { window.location.href = "login.html"; });

    if (identity === "resident") {
        residentForm.hidden = false;
        profileTitle.textContent = "Resident Information";
        profileDescription.textContent = "Provide your residential and contact details for your BIOGUARD profile.";
    } else if (identity === "government_official") {
        officialForm.hidden = false;
        profileTitle.textContent = "Government Official Information";
        profileDescription.textContent = "Provide your designation, office, and official contact details.";
    } else {
        window.location.href = "user.html";
        return;
    }

    function showAlert(options) {
        if (window.Swal) return Swal.fire(options);
        window.alert(options.text || options.title || "BIOGUARD");
        return Promise.resolve();
    }

    function collectFormData(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.identity = identity;
        return data;
    }

    async function saveProfile(form, submitButton) {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        submitButton.disabled = true;

        try {
            const response = await fetch("forms/save_profile.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(collectFormData(form))
            });

            const raw = await response.text();
            let result;

            try {
                result = JSON.parse(raw);
            } catch (error) {
                throw new Error("Invalid server response.");
            }

            if (!response.ok || !result.success) {
                await showAlert({ icon: "error", title: "Unable to save profile", text: result.message || "Please try again." });
                return;
            }

            await showAlert({
                icon: "success",
                title: "Profile completed",
                text: result.message || "Your profile has been saved.",
                confirmButtonText: "Continue"
            });

            localStorage.removeItem("userIdentity");
            window.location.href = result.redirect || "forms/dashboard.php";
        } catch (error) {
            console.error(error);
            await showAlert({ icon: "error", title: "Server error", text: error.message || "Unable to connect to the server." });
        } finally {
            submitButton.disabled = false;
        }
    }

    residentForm.addEventListener("submit", function (event) {
        event.preventDefault();
        saveProfile(residentForm, residentForm.querySelector(".submit-button"));
    });

    officialForm.addEventListener("submit", function (event) {
        event.preventDefault();
        saveProfile(officialForm, officialForm.querySelector(".submit-button"));
    });
});
