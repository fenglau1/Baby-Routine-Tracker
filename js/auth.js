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

        auth.onAuthStateChanged(async user => {
            this.user = user;
            this.updateUI();
            if (user) {
                console.log("User logged in:", user.email);
                await Store.syncData(); // Trigger sync on login

                // Force add baby if none exist after sync
                if (Store.state.babies.length === 0) {
                    app.addNewBaby();
                    document.getElementById('create-baby-close-btn').style.display = 'none';
                    document.querySelector('#create-baby-modal h3').textContent = 'Welcome! Add a Baby';
                }
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
        const forceLoginModal = document.getElementById('force-login-modal');

        if (this.user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (userInfo) userInfo.classList.remove('hidden');
            if (userName) userName.textContent = this.user.displayName;
            if (userEmail) userEmail.textContent = this.user.email;
            if (userAvatar) userAvatar.src = this.user.photoURL;

            // Hide force login modal
            if (forceLoginModal) forceLoginModal.classList.add('hidden');
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');

            // Show force login modal
            if (forceLoginModal) forceLoginModal.classList.remove('hidden');
        }
    }
};
