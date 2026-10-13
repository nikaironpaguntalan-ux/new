const signupContainer = document.getElementById("signup-container");
const signinContainer = document.getElementById("signin-container");
const signupToSignin = document.getElementById("signup-to-signin");
const signinToSignup = document.getElementById("signin-to-signup");
const signupForm = document.getElementById("signup-form");
const signinForm = document.getElementById("signin-form");
const forgotPassword = document.getElementById("forgot-password");

function showSignIn() {
    signupContainer.hidden = true;
    signinContainer.hidden = false;
    document.title = "BIOGUARD | Sign In";

    const emailInput = document.getElementById("signin-email");
    if (emailInput) emailInput.focus();
}

function showSignUp() {
    signinContainer.hidden = true;
    signupContainer.hidden = false;
    document.title = "BIOGUARD | Sign Up";

    const nameInput = document.getElementById("signup-name");
    if (nameInput) nameInput.focus();
}

function showAlert(options) {
    if (window.Swal) {
        return Swal.fire(options);
    }

    window.alert(options.text || options.title || "BIOGUARD");
    return Promise.resolve();
}

async function postJSON(url, data) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const text = await response.text();
    let result;

    try {
        result = JSON.parse(text);
    } catch (error) {
        result = {
            success: false,
            message: "The server returned an unexpected response."
        };
    }

    return { ok: response.ok, result };
}

if (signupToSignin) signupToSignin.addEventListener("click", showSignIn);
if (signinToSignup) signinToSignup.addEventListener("click", showSignUp);

if (window.location.hash.toLowerCase() === "#signup") {
    showSignUp();
} else {
    showSignIn();
}

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const button = signupForm.querySelector(".submit-btn");

    if (name === "" || email === "" || password === "") {
        await showAlert({ icon: "warning", title: "Incomplete form", text: "Please complete all fields." });
        return;
    }

    if (password.length < 8) {
        await showAlert({ icon: "warning", title: "Password too short", text: "Password must contain at least 8 characters." });
        return;
    }

    button.disabled = true;

    try {
        const { ok, result } = await postJSON("forms/signup.php", { name, email, password });

        if (ok && result.success) {
            await showAlert({
                icon: "success",
                title: "Account created",
                text: result.message || "Your account has been created.",
                confirmButtonText: "Continue"
            });
            window.location.href = result.redirect || "user.html";
            return;
        }

        await showAlert({ icon: "error", title: "Registration failed", text: result.message || "Something went wrong. Please try again." });
    } catch (error) {
        console.error(error);
        await showAlert({ icon: "error", title: "Server unavailable", text: "Could not reach BIOGUARD. Make sure Laragon and Apache are running." });
    } finally {
        button.disabled = false;
    }
});

signinForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("signin-email").value.trim();
    const password = document.getElementById("signin-password").value;
    const button = signinForm.querySelector(".submit-btn");

    if (email === "" || password === "") {
        await showAlert({ icon: "warning", title: "Incomplete form", text: "Please enter your email and password." });
        return;
    }

    button.disabled = true;

    try {
        const { ok, result } = await postJSON("forms/signin.php", { email, password });

        if (ok && result.success) {
            window.location.href = result.redirect || "forms/dashboard.php";
            return;
        }

        await showAlert({ icon: "error", title: "Sign in failed", text: result.message || "Invalid email or password." });
    } catch (error) {
        console.error(error);
        await showAlert({ icon: "error", title: "Server unavailable", text: "Could not reach BIOGUARD. Make sure Laragon and Apache are running." });
    } finally {
        button.disabled = false;
    }
});

forgotPassword.addEventListener("click", async function () {
    const email = document.getElementById("signin-email").value.trim();

    if (email === "") {
        await showAlert({ icon: "info", title: "Enter your email", text: "Enter your account email first so password recovery can be linked to the correct account." });
        return;
    }

    await showAlert({ icon: "info", title: "Password recovery", text: "Password recovery is not enabled in this project yet." });
});
