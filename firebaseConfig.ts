import * as firebase from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: សូមជំនួសកន្លែងនេះដោយព័ត៌មានពី Firebase Project របស់អ្នក
// ១. ចូលទៅកាន់ firebase.google.com
// ២. បង្កើត Project ថ្មី
// ៣. បង្កើត Web App ក្នុង Project Settings
// ៤. Copy config មកដាក់នៅទីនេះ
const firebaseConfig = {
  apiKey: "AIzaSyD79IwnUeZuL-EAqKmLCcapPp9wTtLUerU",
  authDomain: "ysacambodia2025.firebaseapp.com",
  projectId: "ysacambodia2025",
  storageBucket: "ysacambodia2025.firebasestorage.app",
  messagingSenderId: "821287581974",
  appId: "1:821287581974:web:7bca37674d20914e81f837"
};

// Initialize Firebase
let db: any;

try {
    // Check if firebase app is already initialized to avoid "Duplicate App" error
    // Using 'any' cast on firebase namespace to avoid TypeScript errors when 
    // inconsistent type definitions (like v8 types with v9 SDK) are present.
    const fb = firebase as any;
    const app = (fb.getApps && fb.getApps().length > 0) ? fb.getApp() : fb.initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.warn("Firebase initialization failed:", error);
    // db remains undefined, which is handled in the components
}

export { db };