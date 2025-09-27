"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from '@/lib/auth-context'
import { BookOpen, User, Lock, Mail, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegistering) {
        await register(email, password, firstName, lastName)
      } else {
        await login(email, password)
      }
      router.push('/')
    } catch (error: any) {
      console.error('Authentication error:', error)
      
      // Friendly error messages in Turkish
      switch (error.code) {
        case 'auth/user-not-found':
          setError('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.')
          break
        case 'auth/wrong-password':
          setError('Yanlış şifre girdiniz.')
          break
        case 'auth/email-already-in-use':
          setError('Bu e-posta adresi zaten kullanımda.')
          break
        case 'auth/weak-password':
          setError('Şifre en az 6 karakter olmalıdır.')
          break
        case 'auth/invalid-email':
          setError('Geçersiz e-posta adresi.')
          break
        case 'auth/too-many-requests':
          setError('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.')
          break
        case 'permission-denied':
          setError('Veritabanına erişim reddedildi. Lütfen daha sonra tekrar deneyin.')
          break
        case 'unavailable':
          setError('Veritabanı hizmeti geçici olarak kullanılamıyor. Lütfen tekrar deneyin.')
          break
        default:
          if (error.message?.includes('firestore') || error.message?.includes('database')) {
            setError('Veritabanı hatası oluştu. Hesabınız oluşturuldu ancak profil kaydedilmedi.')
          } else {
            setError('Bir hata oluştu. Lütfen tekrar deneyin.')
          }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BookOpen className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Soru Takip</h1>
          <p className="text-muted-foreground">Günlük soru çözüm takip sistemi</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {isRegistering ? 'Hesap Oluştur' : 'Giriş Yap'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {isRegistering && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ad</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Adınız"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Soyad</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Soyadınız"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                {isRegistering && (
                  <p className="text-xs text-muted-foreground">
                    Şifre en az 6 karakter olmalıdır
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isRegistering ? 'Hesap oluşturuluyor...' : 'Giriş yapılıyor...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {isRegistering ? 'Hesap Oluştur' : 'Giriş Yap'}
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsRegistering(!isRegistering)
                  setError('')
                  // Clear form fields when switching modes
                  setFirstName('')
                  setLastName('')
                  setEmail('')
                  setPassword('')
                }}
                className="text-sm"
              >
                {isRegistering 
                  ? 'Zaten hesabınız var mı? Giriş yapın' 
                  : 'Hesabınız yok mu? Kayıt olun'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
