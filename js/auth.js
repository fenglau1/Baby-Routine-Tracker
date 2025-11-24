/**
 * Auth.js
 * Handles Authentication and User State
 */

const Auth = {
    user: null,

    init() {
        console.log("Auth.init() called");

        // Check for file protocol
        if (window.location.protocol === 'file:') {
            alert("Warning: Google Sign-In may not work when opening the file directly. Please use a local server (e.g., VS Code Live Server).");
        }

        if (!window.auth) {
            console.error("Auth not initialized - Firebase not configured or script missing");
            alert("Critical Error: Firebase Auth not loaded. Please check console.");
            return;
        }

        // Fail-safe: If auth doesn't respond in 2 seconds, assume logged out and show login
        setTimeout(() => {
            if (this.user === null) {
                console.warn("Auth timeout - forcing UI update");
                this.updateUI();
            }
        }, 2000);

        window.auth.onAuthStateChanged(async user => {
            console.log("AuthStateChanged:", user ? user.email : "No user");
            this.user = user;
            this.updateUI();

            if (user) {
                console.log("User logged in:", user.email);

                // Show loading overlay
                const loadingOverlay = document.getElementById('loading-overlay');
                if (loadingOverlay) loadingOverlay.classList.remove('hidden');

                try {
                    console.log("Starting sync...");
                    // Add timeout to sync to prevent hanging
                    const syncPromise = Store.syncData();
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Sync timeout")), 8000));

                    await Promise.race([syncPromise, timeoutPromise]);
                    console.log("Sync complete.");
                } catch (err) {
                    console.error("Sync error in Auth:", err);
                    alert("Sync failed: " + err.message);
                } finally {
                    // Hide loading overlay
                    if (loadingOverlay) loadingOverlay.classList.add('hidden');
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
        if (!window.auth) {
            alert("Firebase not configured. Please update firebase-config.js with your Firebase credentials.");
            return;
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        window.auth.signInWithPopup(provider)
            .then((result) => {
                // User signed in
                console.log("Manual login success:", result.user.email);
                this.user = result.user;
                this.updateUI(); // Force UI update immediately
                Store.syncData();
            }).catch((error) => {
                console.error("Login failed", error);
                alert("Login failed: " + error.message);
            });
    },

    logout() {
        if (!auth) return;

        window.auth.signOut().then(() => {
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
