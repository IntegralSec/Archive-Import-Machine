// Lazy load the IngestionPoint model to avoid initialization issues
let IngestionPoint = null;
const getIngestionPointModel = () => {
  if (!IngestionPoint) {
    IngestionPoint = require('../models').IngestionPoint;
  }
  return IngestionPoint;
};

class CacheService {
  constructor() {
    this.cacheExpiryMinutes = 30; // Cache expires after 30 minutes
  }

  /**
   * Get cached ingestion points for a user
   * @param {number} userId - The user ID
   * @param {boolean} forceRefresh - Whether to force refresh the cache
   * @returns {Promise<Array>} Array of cached ingestion points
   */
  async getCachedIngestionPoints(userId, forceRefresh = false) {
    try {
      if (forceRefresh) {
        // Clear expired cache entries
        await this.clearExpiredCache(userId);
        return null; // Force a fresh fetch
      }

      // Get all active, non-expired cache entries for the user
      const cachedPoints = await getIngestionPointModel().findAll({
        where: {
          userId: userId,
          isActive: true,
          expiresAt: {
            [require('sequelize').Op.gt]: new Date()
          }
        },
        order: [['name', 'ASC']]
      });

      if (cachedPoints.length === 0) {
        return null; // No valid cache, need to fetch fresh data
      }

      // Convert cached data back to the expected format
      const results = cachedPoints.map(point => {
        const rawData = point.getRawData();
        return {
          ...rawData,
          _cached: true,
          _cachedAt: point.lastFetched,
          _expiresAt: point.expiresAt
        };
      });

      return results;

    } catch (error) {
      console.error('Error getting cached ingestion points:', error);
      return null; // Return null to trigger fresh fetch
    }
  }

  /**
   * Cache ingestion points for a user
   * @param {number} userId - The user ID
   * @param {Array} ingestionPoints - Array of ingestion points from archive system
   * @returns {Promise<void>}
   */
  async cacheIngestionPoints(userId, ingestionPoints) {
    try {
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheExpiryMinutes);

      // Clear existing cache for this user
      await getIngestionPointModel().update(
        { isActive: false },
        { where: { userId: userId } }
      );

      // Cache new ingestion points
      const cachePromises = ingestionPoints.map(point => {
        // Extract the ID from various possible fields
        const ingestionPointId = point.id || point._id || point.aid || 
          (point.aid ? point.aid.split('/').pop() : null) || 
          `unknown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return getIngestionPointModel().create({
          userId: userId,
          ingestionPointId: ingestionPointId,
          name: point.name || 'Unknown',
          type: point.type || 'unknown',
          typeDetails: point.typeDetails ? JSON.stringify(point.typeDetails) : null,
          status: point.status || null,
          description: point.description || null,
          rawData: JSON.stringify(point),
          lastFetched: new Date(),
          expiresAt: expiresAt,
          isActive: true
        });
      });

      await Promise.all(cachePromises);

    } catch (error) {
      console.error('Error caching ingestion points:', error);
      throw error;
    }
  }

  /**
   * Get a specific cached ingestion point
   * @param {number} userId - The user ID
   * @param {string} ingestionPointId - The ingestion point ID
   * @param {boolean} forceRefresh - Whether to force refresh the cache
   * @returns {Promise<Object|null>} The cached ingestion point or null
   */
  async getCachedIngestionPoint(userId, ingestionPointId, forceRefresh = false) {
    try {
      if (forceRefresh) {
        return null; // Force a fresh fetch
      }

      const cachedPoint = await getIngestionPointModel().findOne({
        where: {
          userId: userId,
          ingestionPointId: ingestionPointId,
          isActive: true,
          expiresAt: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });

      if (!cachedPoint) {
        return null; // No valid cache, need to fetch fresh data
      }

      const rawData = cachedPoint.getRawData();
      return {
        ...rawData,
        _cached: true,
        _cachedAt: cachedPoint.lastFetched,
        _expiresAt: cachedPoint.expiresAt
      };

    } catch (error) {
      console.error('Error getting cached ingestion point:', error);
      return null; // Return null to trigger fresh fetch
    }
  }

  /**
   * Cache a specific ingestion point
   * @param {number} userId - The user ID
   * @param {Object} ingestionPoint - The ingestion point data
   * @returns {Promise<void>}
   */
  async cacheIngestionPoint(userId, ingestionPoint) {
    try {
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheExpiryMinutes);

      // Extract the ID from various possible fields
      const ingestionPointId = ingestionPoint.id || ingestionPoint._id || ingestionPoint.aid || 
        (ingestionPoint.aid ? ingestionPoint.aid.split('/').pop() : null) || 
        `unknown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Upsert the cache entry
      await getIngestionPointModel().upsert({
        userId: userId,
        ingestionPointId: ingestionPointId,
        name: ingestionPoint.name || 'Unknown',
        type: ingestionPoint.type || 'unknown',
        typeDetails: ingestionPoint.typeDetails ? JSON.stringify(ingestionPoint.typeDetails) : null,
        status: ingestionPoint.status || null,
        description: ingestionPoint.description || null,
        rawData: JSON.stringify(ingestionPoint),
        lastFetched: new Date(),
        expiresAt: expiresAt,
        isActive: true
      });



    } catch (error) {
      console.error('Error caching ingestion point:', error);
      throw error;
    }
  }

  /**
   * Clear expired cache entries for a user
   * @param {number} userId - The user ID
   * @returns {Promise<number>} Number of expired entries cleared
   */
  async clearExpiredCache(userId) {
    try {
      const result = await getIngestionPointModel().update(
        { isActive: false },
        {
          where: {
            userId: userId,
            expiresAt: {
              [require('sequelize').Op.lte]: new Date()
            },
            isActive: true
          }
        }
      );



      return result[0];
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Clear all cache for a user
   * @param {number} userId - The user ID
   * @returns {Promise<number>} Number of entries cleared
   */
  async clearAllCache(userId) {
    try {
      const result = await getIngestionPointModel().update(
        { isActive: false },
        { where: { userId: userId, isActive: true } }
      );

      return result[0];
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats(userId) {
    try {
      const [activeCount, expiredCount, totalCount] = await Promise.all([
        getIngestionPointModel().count({
          where: {
            userId: userId,
            isActive: true,
            expiresAt: {
              [require('sequelize').Op.gt]: new Date()
            }
          }
        }),
        getIngestionPointModel().count({
          where: {
            userId: userId,
            isActive: true,
            expiresAt: {
              [require('sequelize').Op.lte]: new Date()
            }
          }
        }),
        getIngestionPointModel().count({
          where: { userId: userId, isActive: true }
        })
      ]);

      return {
        active: activeCount,
        expired: expiredCount,
        total: totalCount,
        cacheExpiryMinutes: this.cacheExpiryMinutes
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { active: 0, expired: 0, total: 0, cacheExpiryMinutes: this.cacheExpiryMinutes };
    }
  }
}

module.exports = new CacheService();
