/**
 * Auth.js
 * Handles Authentication and User State
 */

const Auth = {
    user: null,

    init() {
        console.log("Auth.init() called");
        if (typeof auth === 'undefined' || !auth) {
            console.error("Auth not initialized - Firebase not configured or script missing");
            alert("Critical Error: Firebase Auth not loaded. Please check console.");
            return;
        }

        auth.onAuthStateChanged(async user => {
            console.log("AuthStateChanged:", user ? user.email : "No user");
            this.user = user;
            this.updateUI();
            if (user) {
                console.log("User logged in:", user.email);

                try {
                    console.log("Starting sync...");
                    await Store.syncData(); // Trigger sync on login
                    console.log("Sync complete.");
                } catch (err) {
                    console.error("Sync error in Auth:", err);
                }

                // Force add baby if none exist after sync (or if sync failed and we have no local data)
                if (Store.state.babies.length === 0) {
                    console.log("No babies found, forcing creation.");
                    app.addNewBaby();
                    const closeBtn = document.getElementById('create-baby-close-btn');
                    if (closeBtn) closeBtn.style.display = 'none';
                    const title = document.querySelector('#create-baby-modal h3');
                    if (title) title.textContent = 'Welcome! Add a Baby';
                }
            } else {
                console.log("User logged out");
                // Ensure UI is updated even if logged out
                this.updateUI();
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
