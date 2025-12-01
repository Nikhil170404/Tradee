import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const CACHE_DURATION = {
  QUOTE: 900, // 15 minutes
  FUNDAMENTALS: 86400, // 24 hours
  NEWS: 3600, // 1 hour
  MARKET_DATA: 300, // 5 minutes
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    return data as T | null
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

export async function setCachedData(
  key: string,
  data: any,
  duration: number
): Promise<void> {
  try {
    await redis.setex(key, duration, JSON.stringify(data))
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

export async function deleteCachedData(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error('Redis delete error:', error)
  }
}
