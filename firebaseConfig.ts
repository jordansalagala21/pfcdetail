// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAfsvY1g2gM9aaQ79GVtfOafjTbzgFkfTs",
  authDomain: "perfectchoiceauto-58c87.firebaseapp.com",
  projectId: "perfectchoiceauto-58c87",
  storageBucket: "perfectchoiceauto-58c87.firebasestorage.app",
  messagingSenderId: "970429128935",
  appId: "1:970429128935:web:45a26e21400523821f4242",
  measurementId: "G-HRC6DY8SEZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);