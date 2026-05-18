import apiClient from '@/api/client'

/** Upload a single file to a multipart API endpoint. */
export async function uploadFile<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
  const formData = new FormData()
  formData.append(fieldName, file)
  const { data } = await apiClient.post<T>(path, formData)
  return data
}
