import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBCyIySdplWt8CFo00vL8wPpDhdKBoQOAU",
  authDomain: "taskflow-531a8.firebaseapp.com",
  projectId: "taskflow-531a8",
  storageBucket: "taskflow-531a8.firebasestorage.app",
  messagingSenderId: "211818822343",
  appId: "1:211818822343:web:9cea1be309364c4368dce2"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)