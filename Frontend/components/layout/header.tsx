"use client"

import { Bell, ChevronDown, Search, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        const sidebar = document.querySelector('aside')
        if (sidebar) {
          const isOpen = !sidebar.classList.contains('-translate-x-full')
          setIsMobileMenuOpen(isOpen)
        }
      } else {
        setIsMobileMenuOpen(true)
      }
    }

    // Initial check
    handleResize()

    // Add resize listener
    window.addEventListener('resize', handleResize)

    // Add mutation observer to watch for sidebar changes
    const observer = new MutationObserver(handleResize)
    const sidebar = document.querySelector('aside')
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] })
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [])

  return (
    <header className={cn(
      "bg-white py-4 px-6 flex items-center justify-between shadow-sm rounded-lg ml-0 mr-4 my-4 border-2",
      "transition-all duration-300",
      "md:translate-x-0",
      // Hide header when sidebar is hidden on mobile
      // isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      isMobileMenuOpen ? "ml-0" : "ml-8"
    )}>
      {/* Search - Always visible */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 h-4 w-4" />
        <Input type="text" placeholder="Search..." className="pl-10 py-2 w-full bg-white border-gray-200 rounded-xl" />
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-8 w-8 text-white bg-emerald-500 rounded-xl p-1" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full"></span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                <span className="text-sm font-medium">SM</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium">Shadab Mahbub</span>
                <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/organization-profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/">Sign out</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile View */}
      <div className="flex md:hidden items-center space-x-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-6 w-6 text-white bg-emerald-500 rounded-xl p-1" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"></span>
        </Button>
        
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="flex flex-col space-y-4 mt-4">
              <div className="flex items-center space-x-2 p-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                  <span className="text-sm font-medium">SM</span>
                </div>
                <span className="text-sm font-medium">Shadab Mahbub</span>
              </div>
              <div className="border-t pt-4">
                <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                  Profile
                </Link>
                <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                  Settings
                </Link>
                <Link href="/" className="block px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                  Sign out
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
