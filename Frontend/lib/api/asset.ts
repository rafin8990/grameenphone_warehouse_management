import { Asset } from "@/types/asset"
import api from "@/lib/axios"

interface FetchAssetsResponse {
  items: Asset[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorMessage = error.response.data?.message || error.response.data?.error || "An error occurred"
      throw new Error(errorMessage)
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error("No response received from server")
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error("Error setting up request")
    }
  }
)

export async function fetchAssets(
  page: number,
  limit: number,
  searchQuery: string = "",
  sortBy: string = "created_at",
  sortOrder: "ASC" | "DESC" = "DESC",
  status?: string
): Promise<FetchAssetsResponse> {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder,
    ...(searchQuery && { search: searchQuery }),
  }

  const endpoint = status ? `/assets/status/${status}` : "/assets/all"
  const response = await api.get(endpoint, { params })

  // Handle different response structures
  const data = response.data
  if (status) {
    // Response from /assets/status/:status
    return {
      items: data.data,
      total: data.pagination.total,
      page: data.pagination.page,
      limit: data.pagination.limit,
      totalPages: data.pagination.totalPages
    }
  } else {
    // Response from /assets/all
    return data
  }
}

export async function fetchAsset(id: string | number): Promise<Asset> {
  const response = await api.get<Asset>(`/assets/${id}`)
  return response.data
}

export async function createAsset(asset: Partial<Asset>): Promise<Asset> {
  const response = await api.post<Asset>("/assets", asset)
  return response.data
}

export async function updateAsset(id: string | number, asset: Partial<Asset>): Promise<Asset> {
  const response = await api.put<Asset>(`/assets/${id}`, asset)
  return response.data
}

export async function deleteAsset(id: string | number): Promise<void> {
  await api.delete(`/assets/${id}`)
}