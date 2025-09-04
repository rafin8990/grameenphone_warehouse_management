import { Brand } from "@/types/brand"

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function fetchBrands(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string,
  sortBy: string = "created_at",
  sortOrder: "ASC" | "DESC" = "DESC",
  status?: string
): Promise<PaginatedResponse<Brand>> {
  let url = `/api/asset-brands/all?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`
  
  if (status) {
    url += `&status=${status}`
  }
  
  if (searchQuery) {
    url += `&search=${encodeURIComponent(searchQuery)}`
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch brands')
  }
  return response.json()
}

export async function fetchBrandById(id: number): Promise<Brand> {
  const response = await fetch(`/api/asset-brands/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch brand')
  }
  return response.json()
}

export async function createBrand(brand: Partial<Brand>): Promise<Brand> {
  const response = await fetch('/api/asset-brands', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(brand),
  })
  if (!response.ok) {
    throw new Error('Failed to create brand')
  }
  return response.json()
}

export async function updateBrand(id: number, brand: Partial<Brand>): Promise<Brand> {
  const response = await fetch(`/api/asset-brands/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(brand),
  })
  if (!response.ok) {
    throw new Error('Failed to update brand')
  }
  return response.json()
}

export async function deleteBrand(id: number): Promise<void> {
  const response = await fetch(`/api/asset-brands/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete brand')
  }
} 