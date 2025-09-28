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
  subjects: Record<string, { correct: number; wrong: number; empty: number; total: number; target: number }>
  total: number
  totalTarget: number
  userId: string
  timestamp: any
}

export interface UserProgress {
  subjects: SubjectData[]
  totalTarget: number
  lastUpdated: any
  lastUpdateDate?: string // YYYY-MM-DD format for easy date comparison
}

export interface UserSettings {
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
      lastUpdated: serverTimestamp(),
      lastUpdateDate: new Date().toISOString().split("T")[0] // Store the date separately for easier comparison
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

  // Save user settings (subjects structure and targets only)
  async saveUserSettings(userId: string, subjects: SubjectData[], totalTarget: number): Promise<void> {
    const settingsRef = doc(db, 'userSettings', userId)
    // Save only the structure and targets, not the actual progress numbers
    const settingsSubjects = subjects.map(subject => ({
      ...subject,
      correct: 0, // Reset progress numbers in settings
      wrong: 0,
      empty: 0
    }))
    
    await setDoc(settingsRef, {
      subjects: settingsSubjects,
      totalTarget,
      lastUpdated: serverTimestamp()
    })
  }

  // Get user settings
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const settingsRef = doc(db, 'userSettings', userId)
    const settingsSnap = await getDoc(settingsRef)
    
    if (settingsSnap.exists()) {
      return settingsSnap.data() as UserSettings
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

  // Save/update daily progress for specific date
  async saveDailyProgressForDate(userId: string, dailyProgress: Omit<DailyProgress, 'userId' | 'timestamp'>): Promise<void> {
    try {
      // Use date as document ID to ensure one record per date per user
      const docId = `${userId}_${dailyProgress.date}`
      const historyRef = doc(db, 'dailyHistory', docId)
      
      await setDoc(historyRef, {
        ...dailyProgress,
        userId,
        timestamp: serverTimestamp()
      }, { merge: true }) // Merge to update existing or create new
    } catch (error) {
      console.error('Error saving daily progress for date:', error)
      throw error
    }
  }

  // Get daily progress for specific date
  async getDailyProgressForDate(userId: string, dateString: string): Promise<DailyProgress | null> {
    try {
      const docId = `${userId}_${dateString}`
      const historyRef = doc(db, 'dailyHistory', docId)
      const historySnap = await getDoc(historyRef)
      
      if (historySnap.exists()) {
        const data = historySnap.data()
        return {
          date: data.date,
          subjects: data.subjects,
          total: data.total,
          totalTarget: data.totalTarget,
          userId: data.userId,
          timestamp: data.timestamp
        }
      }
      return null
    } catch (error) {
      console.error('Error getting daily progress for date:', error)
      return null
    }
  }

  // Get user's daily history
  async getUserDailyHistory(userId: string, limitCount: number = 7): Promise<DailyProgress[]> {
    try {
      const historyRef = collection(db, 'dailyHistory')
      const q = query(
        historyRef,
        where('userId', '==', userId),
        orderBy('date', 'desc'),  // Order by date instead of timestamp for better sorting
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
          totalTarget: data.totalTarget,
          userId: data.userId,
          timestamp: data.timestamp
        })
      })
      
      return history
    } catch (error) {
      console.error('Error getting user daily history:', error)
      return []
    }
  }

  // Save user profile information
  async saveUserProfile(userId: string, email: string, firstName: string, lastName: string): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error saving user profile:', error)
      throw error
    }
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

  // Initialize user settings with default subjects
  async initializeUserSettings(userId: string): Promise<void> {
    try {
      // Check if settings already exist to avoid duplicates
      const existingSettings = await this.getUserSettings(userId)
      if (existingSettings) {
        return // Already initialized
      }

      const defaultSubjects: SubjectData[] = [
        { name: "Türkçe", icon: "🇹🇷", correct: 0, wrong: 0, empty: 0, target: 10, color: "bg-red-500" },
        { name: "Matematik", icon: "🔢", correct: 0, wrong: 0, empty: 0, target: 15, color: "bg-blue-500" },
        { name: "Sosyal Bilgiler", icon: "🌍", correct: 0, wrong: 0, empty: 0, target: 8, color: "bg-green-500" },
        { name: "Fen Bilimleri", icon: "🔬", correct: 0, wrong: 0, empty: 0, target: 12, color: "bg-purple-500" },
        { name: "İngilizce", icon: "🇬🇧", correct: 0, wrong: 0, empty: 0, target: 10, color: "bg-yellow-500" },
        { name: "Din Kültürü", icon: "📿", correct: 0, wrong: 0, empty: 0, target: 5, color: "bg-orange-500" },
      ]
      
      const totalTarget = defaultSubjects.reduce((sum, subject) => sum + subject.target, 0)
      await this.saveUserSettings(userId, defaultSubjects, totalTarget)
    } catch (error) {
      console.error('Error initializing user settings:', error)
      throw error
    }
  }

  // Initialize user progress with default subjects (legacy method - kept for compatibility)
  async initializeUserProgress(userId: string): Promise<void> {
    try {
      // Check if progress already exists to avoid duplicates
      const existingProgress = await this.getUserProgress(userId)
      if (existingProgress) {
        return // Already initialized
      }

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
    } catch (error) {
      console.error('Error initializing user progress:', error)
      throw error
    }
  }
}

export const firestoreService = new FirestoreService()
