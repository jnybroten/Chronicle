import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBfmOKp1bZoI0_iEsJJ8Sc015fphMO9Hwk",
    authDomain: "chronicle-acc48.firebaseapp.com",
    projectId: "chronicle-acc48",
    storageBucket: "chronicle-acc48.firebasestorage.app",
    messagingSenderId: "966447733242",
    appId: "1:966447733242:web:5a81735acf47ff8ed22c43",
    measurementId: "G-N5V0Z6TSRN"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
export const appId = 'personal-chronicle';

export default firebase;
