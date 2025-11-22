/**
 * Firebase Configuration
 * Replace with your own Firebase project config.
 */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCS_FDHmac0d9od-jQ2u68QzDCuVx3nwQk",
    authDomain: "baby-routine-tracker-4f317.firebaseapp.com",
    projectId: "baby-routine-tracker-4f317",
    storageBucket: "baby-routine-tracker-4f317.firebasestorage.app",
    messagingSenderId: "950299073710",
    appId: "1:950299073710:web:34d42f97803595f852e13f",
    measurementId: "G-JT88YT52YF"
};

// Initialize Firebase only if valid config
let db, auth;
try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        console.log("Firebase initialized successfully");
    } else {
        console.warn("Firebase not configured - using local storage only");
    }
} catch (error) {
    console.error("Firebase initialization failed:", error);
    console.warn("Falling back to local storage only");
}
