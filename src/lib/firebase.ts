import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnRh8ods3phnnLAlMNUwByVZ8RRkxKy9o",
  authDomain: "otimizador-de-fluxo-de-leads.firebaseapp.com",
  projectId: "otimizador-de-fluxo-de-leads",
  storageBucket: "otimizador-de-fluxo-de-leads.firebasestorage.app",
  messagingSenderId: "30555990373",
  appId: "1:30555990373:web:224550286107928838598c"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };