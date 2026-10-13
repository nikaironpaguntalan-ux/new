document.addEventListener("DOMContentLoaded", function () {
    const residentButton = document.getElementById("resident-btn");
    const officialButton = document.getElementById("official-btn");

    // Only a newly registered member needs to pick an identity.
    fetch("forms/account_status.php")
        .then(function (response) { return response.json(); })
        .then(function (account) {
            if (!account.signed_in) {
                window.location.href = "login.html";
            } else if (account.is_admin || account.identity) {
                window.location.href = "forms/dashboard.php";
            }
        })
        .catch(function () { window.location.href = "login.html"; });

    function chooseIdentity(identity) {
        localStorage.setItem("userIdentity", identity);
        window.location.href = "profile.html";
    }

    if (residentButton) {
        residentButton.addEventListener("click", function () {
            chooseIdentity("resident");
        });
    }

    if (officialButton) {
        officialButton.addEventListener("click", function () {
            chooseIdentity("government_official");
        });
    }
});
