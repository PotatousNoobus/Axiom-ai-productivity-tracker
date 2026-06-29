import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZl5dvNoIS4LMxBh_pNVVwlYAKHpjUwWQ",
  authDomain: "productivity-tracker-a50de.firebaseapp.com",
  projectId: "productivity-tracker-a50de",
  storageBucket: "productivity-tracker-a50de.firebasestorage.app",
  messagingSenderId: "242701319534",
  appId: "1:242701319534:web:e62f4fb7c6c5ba4aa4957f"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
