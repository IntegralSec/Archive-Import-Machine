const { ImportJob } = require('../models');

class ImportJobCacheService {
  constructor() {
    this.cacheExpiryMinutes = 15; // Import jobs expire after 15 minutes (shorter than ingestion points)
  }

  /**
   * Get cached import jobs for a user
   * @param {number} userId - The user ID
   * @param {boolean} forceRefresh - Whether to force refresh the cache
   * @returns {Promise<Array>} Array of cached import jobs
   */
  async getCachedImportJobs(userId, forceRefresh = false) {
    try {

      
      if (forceRefresh) {
        // Clear expired cache entries
        try {
          await this.clearExpiredCache(userId);
        } catch (clearError) {
          console.error(`⚠️ Warning: Failed to clear expired cache for user ${userId}:`, clearError);
          // Continue without clearing cache
        }
        return null; // Force a fresh fetch
      }

      // Get all active, non-expired cache entries for the user
      let cachedJobs;
      try {
        cachedJobs = await ImportJob.findAll({
          where: {
            userId: userId,
            isActive: true,
            expiresAt: {
              [require('sequelize').Op.gt]: new Date()
            }
          },
          order: [['lastFetched', 'DESC']]
        });
      } catch (dbError) {
        console.error(`❌ Database error getting cached import jobs for user ${userId}:`, dbError);
        return null; // Return null to trigger fresh fetch
      }

      if (cachedJobs.length === 0) {
        return null; // No valid cache, need to fetch fresh data
      }

      // Convert cached data back to the expected format
      const results = [];
      for (const job of cachedJobs) {
        try {
          const rawData = job.getRawData();
          if (rawData) {
            results.push({
              ...rawData,
              _cached: true,
              _cachedAt: job.lastFetched,
              _expiresAt: job.expiresAt
            });
          } else {
            console.warn(`⚠️ Skipping cached job ${job.id} due to invalid raw data`);
          }
        } catch (parseError) {
          console.error(`❌ Error parsing cached job ${job.id}:`, parseError);
          // Skip this job and continue with others
        }
      }

      return results;

    } catch (error) {
      console.error(`❌ Unexpected error getting cached import jobs for user ${userId}:`, error);
      return null; // Return null to trigger fresh fetch
    }
  }

  /**
   * Cache import jobs for a user
   * @param {number} userId - The user ID
   * @param {Array} importJobs - Array of import jobs from archive system
   * @returns {Promise<void>}
   */
  async cacheImportJobs(userId, importJobs) {
    try {
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheExpiryMinutes);

      // Clear existing cache for this user
      try {
        await ImportJob.update(
          { isActive: false },
          { where: { userId: userId } }
        );
      } catch (clearError) {
        console.error(`⚠️ Warning: Failed to clear existing cache for user ${userId}:`, clearError);
        // Continue without clearing cache
      }

      // Cache new import jobs using upsert to handle duplicates gracefully
      const cachePromises = importJobs.map((job, index) => {
        try {
          // Extract the ID from various possible fields
          const importJobId = job.id || job._id || job.aid || 
            (job.aid ? job.aid.split('/').pop() : null) || 
            `unknown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Use upsert instead of create to handle potential duplicates
          return ImportJob.upsert({
            userId: userId,
            importJobId: importJobId,
            name: job.name || job.title || 'Unknown Import Job',
            status: job.status || job.state || null,
            description: job.description || null,
            ingestionPointId: job.ingestionPointId || job.ingestionPoint || null,
            progress: job.progress || job.percentage || null,
            startTime: job.startTime || job.startedAt || null,
            endTime: job.endTime || job.completedAt || null,
            rawData: JSON.stringify(job),
            lastFetched: new Date(),
            expiresAt: expiresAt,
            isActive: true
          });
        } catch (jobError) {
          console.error(`❌ Error creating cache entry for job ${index}:`, jobError);
          return null; // Return null for failed jobs
        }
      });

      // Filter out null values and await the promises
      const validPromises = cachePromises.filter(promise => promise !== null);
      const results = await Promise.allSettled(validPromises);
      
      // Count successful and failed cache entries
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      
      if (failed > 0) {
        console.warn(`⚠️ Failed to cache ${failed} import jobs for user ${userId}`);
        // Log the specific errors for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`❌ Failed to cache job ${index}:`, result.reason);
          }
        });
      }

    } catch (error) {
      console.error('Error caching import jobs:', error);
      throw error;
    }
  }

  /**
   * Get a specific cached import job
   * @param {number} userId - The user ID
   * @param {string} importJobId - The import job ID
   * @param {boolean} forceRefresh - Whether to force refresh the cache
   * @returns {Promise<Object|null>} The cached import job or null
   */
  async getCachedImportJob(userId, importJobId, forceRefresh = false) {
    try {
      if (forceRefresh) {
        return null; // Force a fresh fetch
      }

      const cachedJob = await ImportJob.findOne({
        where: {
          userId: userId,
          importJobId: importJobId,
          isActive: true,
          expiresAt: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });

      if (!cachedJob) {
        return null; // No valid cache, need to fetch fresh data
      }

      const rawData = cachedJob.getRawData();
      return {
        ...rawData,
        _cached: true,
        _cachedAt: cachedJob.lastFetched,
        _expiresAt: cachedJob.expiresAt
      };

    } catch (error) {
      console.error('Error getting cached import job:', error);
      return null; // Return null to trigger fresh fetch
    }
  }

  /**
   * Cache a specific import job
   * @param {number} userId - The user ID
   * @param {Object} importJob - The import job data
   * @returns {Promise<void>}
   */
  async cacheImportJob(userId, importJob) {
    try {
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheExpiryMinutes);

      // Extract the ID from various possible fields
      const importJobId = importJob.id || importJob._id || importJob.aid || 
        (importJob.aid ? importJob.aid.split('/').pop() : null) || 
        `unknown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Upsert the cache entry
      await ImportJob.upsert({
        userId: userId,
        importJobId: importJobId,
        name: importJob.name || importJob.title || 'Unknown Import Job',
        status: importJob.status || importJob.state || null,
        description: importJob.description || null,
        ingestionPointId: importJob.ingestionPointId || importJob.ingestionPoint || null,
        progress: importJob.progress || importJob.percentage || null,
        startTime: importJob.startTime || importJob.startedAt || null,
        endTime: importJob.endTime || importJob.completedAt || null,
        rawData: JSON.stringify(importJob),
        lastFetched: new Date(),
        expiresAt: expiresAt,
        isActive: true
      });

      

    } catch (error) {
      console.error('Error caching import job:', error);
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
      const result = await ImportJob.update(
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
      console.error('Error clearing expired import job cache:', error);
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
      const result = await ImportJob.update(
        { isActive: false },
        { where: { userId: userId, isActive: true } }
      );

      return result[0];
    } catch (error) {
      console.error('Error clearing all import job cache:', error);
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
        ImportJob.count({
          where: {
            userId: userId,
            isActive: true,
            expiresAt: {
              [require('sequelize').Op.gt]: new Date()
            }
          }
        }),
        ImportJob.count({
          where: {
            userId: userId,
            isActive: true,
            expiresAt: {
              [require('sequelize').Op.lte]: new Date()
            }
          }
        }),
        ImportJob.count({
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
      console.error('Error getting import job cache stats:', error);
      return { active: 0, expired: 0, total: 0, cacheExpiryMinutes: this.cacheExpiryMinutes };
    }
  }
}

module.exports = new ImportJobCacheService();

