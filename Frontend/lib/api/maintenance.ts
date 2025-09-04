import { MaintenanceResponse, MaintenanceRecord } from "@/types/maintenance"
import api from "@/lib/axios"

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(error.response.data.message || "An error occurred")
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error("No response received from server")
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error("Error setting up request")
    }
  }
)

export async function fetchMaintenance(
  page: number = 1,
  limit: number = 10,
  searchQuery: string = "",
  sortBy: string = "created_at",
  sortOrder: "ASC" | "DESC" = "DESC",
  maintenanceType?: string,
  status?: string
): Promise<MaintenanceResponse> {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder,
    ...(maintenanceType && { maintenance_type: maintenanceType }),
    ...(status && { status: status }),
  }

  const endpoint = searchQuery ? `/asset-maintenance/search?q=${searchQuery}` : "/asset-maintenance/all"
  const response = await api.get<MaintenanceResponse>(endpoint, { params })
  return response.data
}

export async function fetchMaintenanceById(id: number): Promise<MaintenanceRecord> {
  const response = await api.get<MaintenanceRecord>(`/asset-maintenance/${id}`)
  return response.data
}

export async function createMaintenance(maintenance: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
  const response = await api.post<MaintenanceRecord>("/asset-maintenance", maintenance)
  return response.data
}

export async function updateMaintenance(id: number, maintenance: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
  const response = await api.put<MaintenanceRecord>(`/asset-maintenance/${id}`, maintenance)
  return response.data
}

export async function deleteMaintenance(id: number): Promise<void> {
  await api.delete(`/asset-maintenance/${id}`)
}


