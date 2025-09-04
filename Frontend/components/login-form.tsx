"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both your email and password to continue",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // In a real app, you would call your authentication API here
      // const response = await signIn(email, password)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // For demo purposes, we'll just redirect to dashboard
      // In a real app, you would check the response and handle errors
      if (email === "demo@assetiq.com" && password === "password") {
        // Save to localStorage if remember me is checked
        if (rememberMe) {
          localStorage.setItem("assetiq-email", email)
        }

        router.push("/dashboard")
      } else {
        throw new Error("Invalid credentials")
      }
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "The email or password you entered is incorrect. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-emerald-500 mb-8 text-center">
          Asset Management System
        </h2>
        <p className="text-gray-600 text-base mb-6 text-center">
          Track, manage, and optimize your assets in one place. Get real-time insights and make data-driven decisions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <div className="relative">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 py-6 border-2 border-gray-200 focus:border-emerald-500 focus:ring-0 shadow-sm rounded-lg"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 py-6 border-2 border-gray-200 focus:border-emerald-500 focus:ring-0 shadow-sm rounded-lg"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="h-5 w-5" />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              className="border-gray-200 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <label htmlFor="remember" className="text-sm text-gray-600">
            Remember my preference
            </label>
          </div>

          <Link 
            href="/forgot-password" 
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            className="w-full py-6 bg-emerald-400 hover:bg-emerald-600 text-white font-medium transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
          <Button
            variant="outline"
            className="w-full py-6 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-600 transition-colors"
            onClick={() => {
              setEmail("demo@assetiq.com")
              setPassword("password")
              setTimeout(() => {
                const form = document.querySelector('form')
                if (form) {
                  const event = new Event('submit', { bubbles: true, cancelable: true })
                  form.dispatchEvent(event)
                }
              }, 100)
            }}
          >
            Try demo account
          </Button>
        </div>
      </form>
    </div>
  )
}
