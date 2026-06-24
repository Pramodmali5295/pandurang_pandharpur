// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMrHgBsTEOZVtPScI_K0_tM9chbtywYss",
  authDomain: "panduranglodge.firebaseapp.com",
  projectId: "panduranglodge",
  storageBucket: "panduranglodge.firebasestorage.app",
  messagingSenderId: "1093748243742",
  appId: "1:1093748243742:web:73582d787bb83b6ea0dd0f",
  measurementId: "G-X822R11QNF",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
