import axios from '../axios';

export interface RFIDTag {
  id: number;
  code: string;
  status: string;
  created_at: string;
  updated_at: string;
  reader: RFIDReader;
  asset: any;
}

export interface RFIDReader {
  id: number;
  code: string;
  branch_id: number;
  floor_id: number;
  department_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse<T> {
  data: T[];
  pagination: PaginationResponse;
}

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(error.response.data.message || "An error occurred");
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error("No response received from server");
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error("Error setting up request");
    }
  }
);

export async function fetchRFIDTags(
  page: number = 1,
  limit: number = 10,
  searchQuery: string = "",
  sortBy: string = "created_at",
  sortOrder: "ASC" | "DESC" = "DESC",
  status?: string
): Promise<ApiResponse<RFIDTag>> {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder,
    ...(status && { status }),
    ...(searchQuery && { search: searchQuery }),
  };

  const response = await axios.get<ApiResponse<RFIDTag>>("/rfid-tags/all", { params });
  return response.data;
}

export async function fetchRFIDReaders(
  page: number = 1,
  limit: number = 10,
  searchQuery: string = "",
  sortBy: string = "created_at",
  sortOrder: "ASC" | "DESC" = "DESC",
  status?: string,
  branch_id?: number,
  floor_id?: number,
  department_id?: number
): Promise<ApiResponse<RFIDReader>> {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder,
    ...(status && { status }),
    ...(branch_id && { branch_id }),
    ...(floor_id && { floor_id }),
    ...(department_id && { department_id }),
    ...(searchQuery && { search: searchQuery }),
  };

  const response = await axios.get<ApiResponse<RFIDReader>>("/rfid-readers/all", { params });
  return response.data;
}

export async function searchRFIDTags(query: string): Promise<ApiResponse<RFIDTag>> {
  const response = await axios.get<ApiResponse<RFIDTag>>(`/rfid-tags/search?q=${query}`);
  return response.data;
}

export async function searchRFIDReaders(query: string): Promise<ApiResponse<RFIDReader>> {
  const response = await axios.get<ApiResponse<RFIDReader>>(`/rfid-readers/search?q=${query}`);
  return response.data;
}

export async function fetchRFIDTag(id: number): Promise<RFIDTag> {
  const response = await axios.get<RFIDTag>(`/rfid-tags/${id}`);
  return response.data;
}

export async function fetchRFIDReader(id: number): Promise<RFIDReader> {
  const response = await axios.get<RFIDReader>(`/rfid-readers/${id}`);
  return response.data;
}

export async function createRFIDTag(tag: Partial<RFIDTag>): Promise<RFIDTag> {
  const response = await axios.post<RFIDTag>("/rfid-tags", tag);
  return response.data;
}

export async function createRFIDReader(reader: Partial<RFIDReader>): Promise<RFIDReader> {
  const response = await axios.post<RFIDReader>("/rfid-readers", reader);
  return response.data;
}

export async function updateRFIDTag(id: number, tag: Partial<RFIDTag>): Promise<RFIDTag> {
  const response = await axios.put<RFIDTag>(`/rfid-tags/${id}`, tag);
  return response.data;
}

export async function updateRFIDReader(id: number, reader: Partial<RFIDReader>): Promise<RFIDReader> {
  const response = await axios.put<RFIDReader>(`/rfid-readers/${id}`, reader);
  return response.data;
}

export async function deleteRFIDTag(id: number): Promise<void> {
  await axios.delete(`/rfid-tags/${id}`);
}

export async function deleteRFIDReader(id: number): Promise<void> {
  await axios.delete(`/rfid-readers/${id}`);
}