import { useErrorHandler, createHttpError } from '@/errors'
import type { FeatureCollection } from 'geojson'

export const apiClient = {
  async post<T>(url: string, data: FeatureCollection): Promise<T> {
    const { handleErrorWithRetry } = useErrorHandler()

    return await handleErrorWithRetry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_AWS_APIGATEWAY_KEY,
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw createHttpError(response.status, url, 'POST')
        }

        return await response.json()
      },
      (error) => createHttpError(0, url, 'POST', error),
      {
        retry: {
          enabled: true,
          maxAttempts: 3,
          delay: 1000,
        },
      }
    ) as T
  },
}
