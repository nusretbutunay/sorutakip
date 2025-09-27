import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'

export interface SubjectData {
  name: string
  icon: string
  correct: number
  wrong: number
  empty: number
  target: number
  color: string
}

export interface DailyProgress {
  date: string
  subjects: Record<string, { correct: number; wrong: number; empty: number; total: number }>
  total: number
  userId: string
  timestamp: any
}

export interface UserProgress {
  subjects: SubjectData[]
  totalTarget: number
  lastUpdated: any
}

export interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  createdAt: any
  lastLoginAt: any
}

class FirestoreService {
  // Save user's current progress
  async saveUserProgress(userId: string, subjects: SubjectData[], totalTarget: number): Promise<void> {
    const progressRef = doc(db, 'userProgress', userId)
    await setDoc(progressRef, {
      subjects,
      totalTarget,
      lastUpdated: serverTimestamp()
    })
  }

  // Get user's current progress
  async getUserProgress(userId: string): Promise<UserProgress | null> {
    const progressRef = doc(db, 'userProgress', userId)
    const progressSnap = await getDoc(progressRef)
    
    if (progressSnap.exists()) {
      return progressSnap.data() as UserProgress
    }
    return null
  }

  // Save daily history entry
  async saveDailyHistory(userId: string, dailyProgress: Omit<DailyProgress, 'userId' | 'timestamp'>): Promise<void> {
    const historyRef = collection(db, 'dailyHistory')
    await addDoc(historyRef, {
      ...dailyProgress,
      userId,
      timestamp: serverTimestamp()
    })
  }

  // Get user's daily history
  async getUserDailyHistory(userId: string, limitCount: number = 7): Promise<DailyProgress[]> {
    const historyRef = collection(db, 'dailyHistory')
    const q = query(
      historyRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    const history: DailyProgress[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      history.push({
        date: data.date,
        subjects: data.subjects,
        total: data.total,
        userId: data.userId,
        timestamp: data.timestamp
      })
    })
    
    return history
  }

  // Save user profile information
  async saveUserProfile(userId: string, email: string, firstName: string, lastName: string): Promise<void> {
    const profileRef = doc(db, 'userProfiles', userId)
    await setDoc(profileRef, {
      uid: userId,
      email,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    })
  }

  // Update user's last login time
  async updateLastLogin(userId: string): Promise<void> {
    const profileRef = doc(db, 'userProfiles', userId)
    await setDoc(profileRef, {
      lastLoginAt: serverTimestamp()
    }, { merge: true })
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const profileRef = doc(db, 'userProfiles', userId)
    const profileSnap = await getDoc(profileRef)
    
    if (profileSnap.exists()) {
      return profileSnap.data() as UserProfile
    }
    return null
  }

  // Initialize user progress with default subjects
  async initializeUserProgress(userId: string): Promise<void> {
    const defaultSubjects: SubjectData[] = [
      { name: "Türkçe", icon: "🇹🇷", correct: 0, wrong: 0, empty: 0, target: 10, color: "bg-red-500" },
      { name: "Matematik", icon: "🔢", correct: 0, wrong: 0, empty: 0, target: 15, color: "bg-blue-500" },
      { name: "Sosyal Bilgiler", icon: "🌍", correct: 0, wrong: 0, empty: 0, target: 8, color: "bg-green-500" },
      { name: "Fen Bilimleri", icon: "🔬", correct: 0, wrong: 0, empty: 0, target: 12, color: "bg-purple-500" },
      { name: "İngilizce", icon: "🇬🇧", correct: 0, wrong: 0, empty: 0, target: 10, color: "bg-yellow-500" },
      { name: "Din Kültürü", icon: "📿", correct: 0, wrong: 0, empty: 0, target: 5, color: "bg-orange-500" },
    ]
    
    const totalTarget = defaultSubjects.reduce((sum, subject) => sum + subject.target, 0)
    await this.saveUserProgress(userId, defaultSubjects, totalTarget)
  }
}

export const firestoreService = new FirestoreService()
