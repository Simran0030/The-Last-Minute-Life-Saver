import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4Z_OsS-7pyXtQ8Kazlt0vmMYus7yHpmk",
  authDomain: "primal-correlate-ggbcx.firebaseapp.com",
  projectId: "primal-correlate-ggbcx",
  storageBucket: "primal-correlate-ggbcx.firebasestorage.app",
  messagingSenderId: "1070403131306",
  appId: "1:1070403131306:web:e56faefc7246893f203dd3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Custom databaseId is specified for Firestore
const db = getFirestore(app, "ai-studio-thelastminutelif-fb1e79bc-b3bf-4bea-b475-69c52c8cc269");

export { app, auth, googleProvider, db, signInWithPopup, signOut };
