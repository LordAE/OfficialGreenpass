// src/api/flamelinkClient.js
import firebase from 'firebase/app';
import 'firebase/firestore';
import flamelink from 'flamelink/app';
import 'flamelink/content';
import 'flamelink/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const firebaseApp = firebase.initializeApp(firebaseConfig);

const flamelinkApp = flamelink({
  firebaseApp,
  dbType: 'firestore',
  env: 'production', // or whatever environment you configured
});

export default flamelinkApp;
