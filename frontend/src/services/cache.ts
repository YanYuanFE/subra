/**
 * 缓存服务 - 减少重复的区块链查询
 */

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * 设置缓存项
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * 获取缓存项
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取或设置缓存（如果不存在则执行获取函数）
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * 批量获取或设置缓存
   */
  async batchGetOrSet<T>(
    keys: string[],
    fetchFn: (missingKeys: string[]) => Promise<Map<string, T>>,
    ttl?: number
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const missingKeys: string[] = [];

    // 检查缓存中已有的数据
    for (const key of keys) {
      const cached = this.get<T>(key);
      if (cached !== null) {
        result.set(key, cached);
      } else {
        missingKeys.push(key);
      }
    }

    // 批量获取缺失的数据
    if (missingKeys.length > 0) {
      const fetchedData = await fetchFn(missingKeys);
      for (const [key, data] of fetchedData) {
        this.set(key, data, ttl);
        result.set(key, data);
      }
    }

    return result;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 导出单例实例
export const cacheService = new CacheService();

// 定期清理过期缓存
setInterval(() => {
  cacheService.cleanup();
}, 60 * 1000); // 每分钟清理一次