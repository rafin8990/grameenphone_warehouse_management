"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Plugin {
  id: string
  name: string
  description: string
  icon: string
  version: string
  category: string
  features: string[]
  isInstalled: boolean
}

interface PluginResponse {
  success: boolean
  data: {
    available: Plugin[]
    installed: string[]
  }
}

interface PluginContextType {
  plugins: Plugin[]
  installedPlugins: string[]
  loading: boolean
  error: string | null
  isPluginInstalled: (pluginId: string) => boolean
  refreshPlugins: () => void
  installPlugin: (pluginId: string) => Promise<boolean>
  uninstallPlugin: (pluginId: string) => Promise<boolean>
}

const PluginContext = createContext<PluginContextType | undefined>(undefined)

export function PluginProvider({ children }: { children: ReactNode }) {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlugins = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/plugins')
      const data: PluginResponse = await response.json()
      
      if (data.success) {
        setPlugins(data.data.available)
        setInstalledPlugins(data.data.installed)
      } else {
        setError('Failed to load plugins')
      }
    } catch (error) {
      console.error('Error fetching plugins:', error)
      setError('Failed to load plugins')
    } finally {
      setLoading(false)
    }
  }

  const isPluginInstalled = (pluginId: string): boolean => {
    return installedPlugins.includes(pluginId)
  }

  const refreshPlugins = () => {
    fetchPlugins()
  }

  const installPlugin = async (pluginId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/plugins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'install', pluginId }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchPlugins() // Refresh the plugin list
        return true
      } else {
        console.error('Failed to install plugin:', data.error)
        return false
      }
    } catch (error) {
      console.error('Error installing plugin:', error)
      return false
    }
  }

  const uninstallPlugin = async (pluginId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/plugins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'uninstall', pluginId }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchPlugins() // Refresh the plugin list
        return true
      } else {
        console.error('Failed to uninstall plugin:', data.error)
        return false
      }
    } catch (error) {
      console.error('Error uninstalling plugin:', error)
      return false
    }
  }

  useEffect(() => {
    fetchPlugins()
  }, [])

  const value: PluginContextType = {
    plugins,
    installedPlugins,
    loading,
    error,
    isPluginInstalled,
    refreshPlugins,
    installPlugin,
    uninstallPlugin
  }

  return (
    <PluginContext.Provider value={value}>
      {children}
    </PluginContext.Provider>
  )
}

export function usePlugins() {
  const context = useContext(PluginContext)
  if (context === undefined) {
    throw new Error('usePlugins must be used within a PluginProvider')
  }
  return context
} 