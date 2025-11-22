/**
 * Auth.js
 * Handles Authentication and User State
 */

const Auth = {
    user: null,

    init() {
        if (!auth) {
            console.warn("Auth not initialized - Firebase not configured");
            return;
        }

        auth.onAuthStateChanged(user => {
            this.user = user;
            this.updateUI();
            if (user) {
                console.log("User logged in:", user.email);
                Store.syncData(); // Trigger sync on login
            } else {
                console.log("User logged out");
            }
        });
    },

    login() {
        if (!auth) {
            alert("Firebase not configured. Please update firebase-config.js with your Firebase credentials.");
            return;
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                // User signed in
                alert("Logged in as " + result.user.email);
                Store.syncData();
            }).catch((error) => {
                console.error("Login failed", error);
                alert("Login failed: " + error.message);
            });
    },

    logout() {
        if (!auth) return;

        auth.signOut().then(() => {
            // Sign-out successful.
            // Optional: Clear local data or keep it? 
            // For now, we keep local data but stop syncing.
            alert("Signed out");
        }).catch((error) => {
            console.error("Logout failed", error);
        });
    },

    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const userAvatar = document.getElementById('user-avatar');

        if (this.user) {
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            userName.textContent = this.user.displayName;
            userEmail.textContent = this.user.email;
            userAvatar.src = this.user.photoURL;
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            userInfo.classList.add('hidden');
        }
    }
};
