"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { firestoreService, type SubjectData, type DailyProgress } from "@/lib/firestore-service"
import {
  Plus,
  Minus,
  BookOpen,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  Circle,
  Edit3,
  Calendar,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  User,
} from "lucide-react"

export default function StudyTracker() {
  const { currentUser, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const [subjectProgress, setSubjectProgress] = useState<SubjectData[]>([])
  const [dailyHistory, setDailyHistory] = useState<DailyProgress[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [totalTarget, setTotalTarget] = useState(60)
  const [editingTarget, setEditingTarget] = useState<number | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login')
    }
  }, [currentUser, router, authLoading])

  // Load user data from Firebase for selected date
  const loadUserDataForDate = async (dateString: string) => {
    if (!currentUser) return

    try {
      setDataLoading(true)
      
      // Load base user progress (for targets and structure)
      let userProgress = await firestoreService.getUserProgress(currentUser.uid)
      
      // If no progress exists, initialize with default subjects
      if (!userProgress) {
        try {
          await firestoreService.initializeUserProgress(currentUser.uid)
          userProgress = await firestoreService.getUserProgress(currentUser.uid)
        } catch (initError) {
          console.error('Error initializing user progress:', initError)
          userProgress = null
        }
      }

      if (userProgress) {
        // Load progress for the specific selected date
        const dateProgress = await firestoreService.getDailyProgressForDate(currentUser.uid, dateString)
        
        let finalSubjects = userProgress.subjects
        if (dateProgress) {
          // If we have data for this date, use it
          finalSubjects = userProgress.subjects.map(subject => {
            const dateData = dateProgress.subjects[subject.name]
            return dateData ? {
              ...subject,
              correct: dateData.correct,
              wrong: dateData.wrong,
              empty: dateData.empty
            } : {
              ...subject,
              correct: 0,
              wrong: 0,
              empty: 0
            }
          })
        } else {
          // No data for this date, show empty progress
          finalSubjects = userProgress.subjects.map(subject => ({
            ...subject,
            correct: 0,
            wrong: 0,
            empty: 0
          }))
        }

        setSubjectProgress(finalSubjects)
        setTotalTarget(userProgress.totalTarget)
        
        // Calculate total questions for selected date
        const total = finalSubjects.reduce(
          (sum, subject) => sum + subject.correct + subject.wrong + subject.empty,
          0
        )
        setTotalQuestions(total)
      }

      // Load daily history
      const history = await firestoreService.getUserDailyHistory(currentUser.uid)
      setDailyHistory(history)

      // Load theme preference
      const savedTheme = localStorage.getItem("theme")
      if (savedTheme === "dark") {
        setIsDarkMode(true)
        document.documentElement.classList.add("dark")
      } else {
        setIsDarkMode(false)
        document.documentElement.classList.remove("dark")
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  // Load data when user or selected date changes
  useEffect(() => {
    if (currentUser) {
      loadUserDataForDate(selectedDate)
    }
  }, [currentUser, selectedDate])


  // Save progress to Firebase whenever it changes
  useEffect(() => {
    const saveProgress = async () => {
      if (!currentUser || dataLoading || subjectProgress.length === 0) return
      
      try {
        setSaveLoading(true)
        await firestoreService.saveUserProgress(currentUser.uid, subjectProgress, totalTarget)
      } catch (error) {
        console.error('Error saving progress:', error)
      } finally {
        setSaveLoading(false)
      }
    }

    // Debounce the save operation
    const timeoutId = setTimeout(saveProgress, 1000)
    return () => clearTimeout(timeoutId)
  }, [currentUser, subjectProgress, totalTarget, loading])

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)

    if (newTheme) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const updateQuestions = async (subjectIndex: number, type: "correct" | "wrong" | "empty", change: number) => {
    const newProgress = [...subjectProgress]
    newProgress[subjectIndex][type] = Math.max(0, newProgress[subjectIndex][type] + change)

    setSubjectProgress(newProgress)
    const newTotal = newProgress.reduce((sum, subject) => sum + subject.correct + subject.wrong + subject.empty, 0)
    setTotalQuestions(newTotal)

    // Automatically save daily progress for selected date
    if (currentUser) {
      try {
        const progressForDate = {
          date: selectedDate,
          subjects: {} as Record<string, { correct: number; wrong: number; empty: number; total: number }>,
          total: newTotal,
        }

        newProgress.forEach((subject) => {
          const total = subject.correct + subject.wrong + subject.empty
          progressForDate.subjects[subject.name] = {
            correct: subject.correct,
            wrong: subject.wrong,
            empty: subject.empty,
            total,
          }
        })

        // Save/update progress for selected date
        await firestoreService.saveDailyProgressForDate(currentUser.uid, progressForDate)
      } catch (error) {
        console.error('Error saving daily progress:', error)
      }
    }
  }


  const updateTarget = (subjectIndex: number, newTarget: number) => {
    const newProgress = [...subjectProgress]
    newProgress[subjectIndex].target = Math.max(1, newTarget)

    setSubjectProgress(newProgress)
    const newTotalTarget = newProgress.reduce((sum, subject) => sum + subject.target, 0)
    setTotalTarget(newTotalTarget)
    setEditingTarget(null)
  }

  const handleTargetKeyPress = (e: React.KeyboardEvent, subjectIndex: number, value: string) => {
    if (e.key === "Enter") {
      const newTarget = Number.parseInt(value) || 1
      updateTarget(subjectIndex, newTarget)
    } else if (e.key === "Escape") {
      setEditingTarget(null)
    }
  }

  const getProgressPercentage = (subject: SubjectData) => {
    const total = subject.correct + subject.wrong + subject.empty
    return Math.min((total / subject.target) * 100, 100)
  }

  const overallProgress = totalTarget > 0 ? (totalQuestions / totalTarget) * 100 : 0

  const calculateAllTimeStats = () => {
    const allTimeStats: Record<string, { correct: number; wrong: number; empty: number; total: number }> = {}

    // Initialize with current day progress
    subjectProgress.forEach((subject) => {
      allTimeStats[subject.name] = {
        correct: subject.correct,
        wrong: subject.wrong,
        empty: subject.empty,
        total: subject.correct + subject.wrong + subject.empty,
      }
    })

    // Add historical data
    dailyHistory.forEach((day) => {
      Object.entries(day.subjects).forEach(([subjectName, data]) => {
        if (allTimeStats[subjectName]) {
          allTimeStats[subjectName].correct += data.correct
          allTimeStats[subjectName].wrong += data.wrong
          allTimeStats[subjectName].empty += data.empty
          allTimeStats[subjectName].total += data.total
        }
      })
    })

    return allTimeStats
  }

  const calculateWeeklyStats = () => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const weeklyStats: Record<string, { correct: number; wrong: number; empty: number; total: number }> = {}

    // Initialize with current day progress
    subjectProgress.forEach((subject) => {
      weeklyStats[subject.name] = {
        correct: subject.correct,
        wrong: subject.wrong,
        empty: subject.empty,
        total: subject.correct + subject.wrong + subject.empty,
      }
    })

    // Add last 7 days from history
    dailyHistory
      .filter((day) => new Date(day.date) >= weekAgo)
      .forEach((day) => {
        Object.entries(day.subjects).forEach(([subjectName, data]) => {
          if (weeklyStats[subjectName]) {
            weeklyStats[subjectName].correct += data.correct
            weeklyStats[subjectName].wrong += data.wrong
            weeklyStats[subjectName].empty += data.empty
            weeklyStats[subjectName].total += data.total
          }
        })
      })

    return weeklyStats
  }

  // Show loading screen while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Don't render if user is not authenticated (will redirect)
  if (!currentUser) {
    return null
  }

  // Show loading screen while loading data
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Veriler yükleniyor...</p>
        </div>
      </div>
    )
  }

  const allTimeStats = calculateAllTimeStats()
  const weeklyStats = calculateWeeklyStats()

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-balance">Soru Takip</h1>
            <p className="text-muted-foreground">
              Hoşgeldin, {currentUser.displayName || currentUser.email?.split('@')[0]} 👋
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Kaydediliyor...
              </div>
            )}
            <Button onClick={toggleTheme} variant="outline" size="sm" className="w-fit bg-transparent">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="w-fit bg-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış
            </Button>
          </div>
        </div>

        {/* Date Selector */}
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Tarih Seçin:</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
                {selectedDate === new Date().toISOString().split("T")[0] && (
                  <Badge variant="default" className="bg-green-600">
                    Bugün
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Seçili tarih: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('tr-TR', { 
                  weekday: 'long',
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Seçili Gün
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Bu Hafta
            </TabsTrigger>
            <TabsTrigger value="alltime" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Tüm Zamanlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    {selectedDate === new Date().toISOString().split("T")[0] ? "Bugünkü Durum" : "Seçili Gün Durumu"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{totalQuestions}</span>
                    <span className="text-muted-foreground">/ {totalTarget} soru</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(overallProgress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{overallProgress.toFixed(1)}% Tamamlandı</span>
                    <span>Kalan: {totalTarget - totalQuestions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectProgress.map((subject, index) => {
                const totalSolved = subject.correct + subject.wrong + subject.empty
                return (
                  <Card key={subject.name} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{subject.icon}</span>
                          <span className="text-lg">{subject.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={totalSolved >= subject.target ? "default" : "secondary"}>
                            {totalSolved}/
                            {editingTarget === index ? (
                              <Input
                                type="number"
                                defaultValue={subject.target}
                                className="w-12 h-5 text-xs p-0 text-center border-0 bg-transparent"
                                min="1"
                                onBlur={(e) => updateTarget(index, Number.parseInt(e.target.value) || 1)}
                                onKeyDown={(e) => handleTargetKeyPress(e, index, e.currentTarget.value)}
                                autoFocus
                              />
                            ) : (
                              <span>{subject.target}</span>
                            )}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                            onClick={() => setEditingTarget(editingTarget === index ? null : index)}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${subject.color}`}
                          style={{ width: `${getProgressPercentage(subject)}%` }}
                        />
                      </div>

                      <div className="space-y-3">
                        {/* Correct Questions */}
                        <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium">Doğru</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuestions(index, "correct", -1)}
                              disabled={subject.correct === 0}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm font-bold w-6 text-center">{subject.correct}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuestions(index, "correct", 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Wrong Questions */}
                        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium">Yanlış</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuestions(index, "wrong", -1)}
                              disabled={subject.wrong === 0}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm font-bold w-6 text-center">{subject.wrong}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuestions(index, "wrong", 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Empty Questions */}
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Circle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm font-medium">Boş</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuestions(index, "empty", -1)}
                              disabled={subject.empty === 0}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm font-bold w-6 text-center">{subject.empty}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuestions(index, "empty", 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="text-center text-sm text-muted-foreground">
                        {totalSolved >= subject.target ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">Hedef Başarıldı! 🎉</span>
                        ) : (
                          <span>Hedefe Kalan: {subject.target - totalSolved}</span>
                        )}
                      </div>

                      {totalSolved > 0 && (
                        <div className="text-center text-xs text-muted-foreground">
                          Doğru Yüzdesi: {((subject.correct / totalSolved) * 100).toFixed(1)}%
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Bu Hafta İlerleme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectProgress.map((subject) => {
                    const stats = weeklyStats[subject.name] || { correct: 0, wrong: 0, empty: 0, total: 0 }
                    const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0

                    return (
                      <Card key={subject.name} className="relative overflow-hidden">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <span className="text-xl">{subject.icon}</span>
                            <span className="text-base">{subject.name}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">çözülen soru</div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded">
                              <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                {stats.correct}
                              </div>
                              <div className="text-xs text-muted-foreground">Doğru</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded">
                              <div className="text-sm font-bold text-red-600 dark:text-red-400">{stats.wrong}</div>
                              <div className="text-xs text-muted-foreground">Yanlış</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                              <div className="text-sm font-bold text-gray-600 dark:text-gray-400">{stats.empty}</div>
                              <div className="text-xs text-muted-foreground">Boş</div>
                            </div>
                          </div>

                          {stats.total > 0 && (
                            <div className="text-center">
                              <div className="text-lg font-semibold">{accuracy.toFixed(1)}%</div>
                              <div className="text-xs text-muted-foreground">Doğruluk</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alltime" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Tüm Zamanlar İlerleme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectProgress.map((subject) => {
                    const stats = allTimeStats[subject.name] || { correct: 0, wrong: 0, empty: 0, total: 0 }
                    const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0

                    return (
                      <Card key={subject.name} className="relative overflow-hidden">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2">
                            <span className="text-xl">{subject.icon}</span>
                            <span className="text-base">{subject.name}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-center">
                            <div className="text-3xl font-bold">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">toplam çözülen soru</div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded">
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {stats.correct}
                              </div>
                              <div className="text-xs text-muted-foreground">Doğru</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded">
                              <div className="text-lg font-bold text-red-600 dark:text-red-400">{stats.wrong}</div>
                              <div className="text-xs text-muted-foreground">Yanlış</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                              <div className="text-lg font-bold text-gray-600 dark:text-gray-400">{stats.empty}</div>
                              <div className="text-xs text-muted-foreground">Boş</div>
                            </div>
                          </div>

                          {stats.total > 0 && (
                            <div className="text-center">
                              <div className="text-xl font-semibold">{accuracy.toFixed(1)}%</div>
                              <div className="text-xs text-muted-foreground">Genel Doğruluk</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Genel Özet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">
                          {Object.values(allTimeStats).reduce((sum, stats) => sum + stats.total, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Toplam Soru</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {Object.values(allTimeStats).reduce((sum, stats) => sum + stats.correct, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Doğru</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {Object.values(allTimeStats).reduce((sum, stats) => sum + stats.wrong, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Yanlış</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {(() => {
                            const totalQuestions = Object.values(allTimeStats).reduce(
                              (sum, stats) => sum + stats.total,
                              0,
                            )
                            const totalCorrect = Object.values(allTimeStats).reduce(
                              (sum, stats) => sum + stats.correct,
                              0,
                            )
                            return totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) + "%" : "0%"
                          })()}
                        </div>
                        <div className="text-sm text-muted-foreground">Genel Doğruluk</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent History */}
        {dailyHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Son Geçmiş
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailyHistory.slice(0, 5).map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString("tr-TR", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <Badge variant="outline">{day.total} soru</Badge>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(day.subjects).map(([subject, data]) => (
                        <div key={subject} className="text-xs px-2 py-1 bg-muted rounded">
                          {subject.slice(0, 3)}: {data.total}
                          {data.total > 0 && (
                            <span className="text-green-600 dark:text-green-400 ml-1">
                              (%{((data.correct / data.total) * 100).toFixed(0)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}