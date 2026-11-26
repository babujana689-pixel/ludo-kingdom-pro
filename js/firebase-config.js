import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-LX_SEe3GXWjF3C-AjTu7NHLMYWesIF4",
  authDomain: "ludo-kingdom-pro.firebaseapp.com",
  databaseURL: "https://ludo-kingdom-pro-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ludo-kingdom-pro",
  storageBucket: "ludo-kingdom-pro.firebasestorage.app",
  messagingSenderId: "497347829715",
  appId: "1:497347829715:web:887eeb636ca2857739d926",
  measurementId: "G-HDF5KWTM4K"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
