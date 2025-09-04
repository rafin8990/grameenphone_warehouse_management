import { Vendor } from "@/types/vendor"
import api from "@/lib/axios"

interface FetchVendorsResponse {
  data: Vendor[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

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

export async function fetchVendors(
  page: number = 1,
  limit: number = 10,
  searchQuery: string = "",
  sortBy: string = "created_at",
  sortOrder: "ASC" | "DESC" = "DESC",
  status?: string,
  city?: string,
  country?: string,
  rating?: number
): Promise<FetchVendorsResponse> {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder,
    ...(status && { status }),
    ...(city && { city }),
    ...(country && { country }),
    ...(rating && { rating }),
    ...(searchQuery && { search: searchQuery }),
  }

  const response = await api.get<FetchVendorsResponse>("/vendors/all", { params })
  return response.data
}

export async function searchVendors(query: string): Promise<FetchVendorsResponse> {
  const response = await api.get<FetchVendorsResponse>(`/vendors/search?q=${query}`)
  return response.data
}

export async function fetchVendor(id: number): Promise<Vendor> {
  const response = await api.get<Vendor>(`/vendors/${id}`)
  return response.data
}

export async function createVendor(vendor: Partial<Vendor>): Promise<Vendor> {
  const response = await api.post<Vendor>("/vendors", vendor)
  return response.data
}

export async function updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor> {
  const response = await api.put<Vendor>(`/vendors/${id}`, vendor)
  return response.data
}

export async function deleteVendor(id: number): Promise<void> {
  await api.delete(`/vendors/${id}`)
}