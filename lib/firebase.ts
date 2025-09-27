import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, 
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Validate that all required environment variables are present
const requiredEnvVars = {
  'NEXT_PUBLIC_FIREBASE_API_KEY': firebaseConfig.apiKey,
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': firebaseConfig.authDomain,
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID': firebaseConfig.projectId,
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': firebaseConfig.storageBucket,
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': firebaseConfig.messagingSenderId,
  'NEXT_PUBLIC_FIREBASE_APP_ID': firebaseConfig.appId
}

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0) {
  throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}. Please check your .env.local file.`)
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

// Initialize Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' && isSupported() ? getAnalytics(app) : null

export default app
