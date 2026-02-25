const AWS = require('aws-sdk');
const { getConfig } = require('../config/shared');

class S3Service {
  constructor() {
    this.s3Instances = new Map(); // Cache S3 instances per user
  }

  // Get S3 instance for a specific user
  async getS3Instance(userId) {
    // Check if we already have an instance for this user
    if (this.s3Instances.has(userId)) {
      return this.s3Instances.get(userId);
    }

    try {
      // Get user's S3 configuration
      const config = await getConfig(userId);
      
      if (!config.s3Settings || !config.s3Settings.accessKeyId || !config.s3Settings.secretAccessKey) {
        throw new Error('S3 credentials not configured. Please configure your AWS credentials in the Config page.');
      }

      // Create AWS S3 instance with user's credentials
      const s3 = new AWS.S3({
        accessKeyId: config.s3Settings.accessKeyId,
        secretAccessKey: config.s3Settings.secretAccessKey,
        region: config.s3Settings.region || 'us-east-1'
      });

      // Cache the instance
      this.s3Instances.set(userId, s3);
      
      return s3;
    } catch (error) {
      console.error('Error creating S3 instance for user:', userId, error);
      throw error;
    }
  }

  // List all S3 buckets for a user
  async listBuckets(userId) {
    try {
      const s3 = await this.getS3Instance(userId);
      
      const result = await s3.listBuckets().promise();
      
      return result.Buckets.map(bucket => ({
        name: bucket.Name,
        creationDate: bucket.CreationDate,
        region: 'us-east-1' // Default region, we'll get actual region in next step
      }));
    } catch (error) {
      console.error('Error listing S3 buckets for user:', userId, error);
      throw error;
    }
  }

  // Get bucket location (region)
  async getBucketLocation(userId, bucketName) {
    try {
      const s3 = await this.getS3Instance(userId);
      
      const result = await s3.getBucketLocation({ Bucket: bucketName }).promise();
      return result.LocationConstraint || 'us-east-1';
    } catch (error) {
      console.error('Error getting bucket location for bucket:', bucketName, error);
      return 'us-east-1'; // Default fallback
    }
  }

  // Create a new S3 bucket
  async createBucket(userId, bucketName, region = 'us-east-1') {
    try {
      const s3 = await this.getS3Instance(userId);
      
      const params = {
        Bucket: bucketName
      };

      // Add location constraint for regions other than us-east-1
      if (region !== 'us-east-1') {
        params.CreateBucketConfiguration = {
          LocationConstraint: region
        };
      }

      const result = await s3.createBucket(params).promise();
      
      return {
        name: bucketName,
        region: region,
        location: result.Location
      };
    } catch (error) {
      console.error('Error creating S3 bucket:', bucketName, error);
      throw error;
    }
  }

  // Delete an S3 bucket
  async deleteBucket(userId, bucketName) {
    try {
      const s3 = await this.getS3Instance(userId);
      
      // First, check if bucket is empty
      const objects = await this.listBucketObjects(userId, bucketName);
      if (objects.length > 0) {
        throw new Error('Cannot delete bucket: bucket is not empty');
      }

      await s3.deleteBucket({ Bucket: bucketName }).promise();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting S3 bucket:', bucketName, error);
      throw error;
    }
  }

  // List objects in a bucket
  async listBucketObjects(userId, bucketName, prefix = '', maxKeys = 1000) {
    try {
      const s3 = await this.getS3Instance(userId);
      
      const params = {
        Bucket: bucketName,
        MaxKeys: maxKeys
      };

      if (prefix) {
        params.Prefix = prefix;
      }

      const result = await s3.listObjectsV2(params).promise();
      
      return result.Contents.map(object => ({
        key: object.Key,
        size: object.Size,
        lastModified: object.LastModified,
        storageClass: object.StorageClass || 'STANDARD',
        etag: object.ETag
      }));
    } catch (error) {
      console.error('Error listing bucket objects for bucket:', bucketName, error);
      throw error;
    }
  }

  // Get bucket information
  async getBucketInfo(userId, bucketName) {
    try {
      const s3 = await this.getS3Instance(userId);
      
      // Get bucket location
      const location = await this.getBucketLocation(userId, bucketName);
      
      // Get bucket versioning status
      let versioning = 'Disabled';
      try {
        const versioningResult = await s3.getBucketVersioning({ Bucket: bucketName }).promise();
        versioning = versioningResult.Status || 'Disabled';
      } catch (error) {
        // Versioning might not be enabled, which is fine
      }

      return {
        name: bucketName,
        region: location,
        versioning: versioning
      };
    } catch (error) {
      console.error('Error getting bucket info for bucket:', bucketName, error);
      throw error;
    }
  }

  // Test S3 connection
  async testConnection(userId) {
    try {
      const s3 = await this.getS3Instance(userId);
      
      // Try to list buckets to test connection
      const result = await s3.listBuckets().promise();
      
      return {
        success: true,
        bucketCount: result.Buckets.length,
        owner: result.Owner
      };
    } catch (error) {
      console.error('Error testing S3 connection for user:', userId, error);
      throw error;
    }
  }

  // Upload a file to S3
  async uploadFile(userId, bucketName, key, fileBuffer, contentType = 'application/octet-stream') {
    try {
      const s3 = await this.getS3Instance(userId);
      
      const params = {
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
      };

      const result = await s3.upload(params).promise();
      
      return {
        success: true,
        location: result.Location,
        etag: result.ETag,
        key: result.Key
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  // Create a folder in S3 (by uploading an empty object with trailing slash)
  async createFolder(userId, bucketName, folderPath) {
    try {
      const s3 = await this.getS3Instance(userId);
      
      // Ensure folder path ends with '/'
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      const params = {
        Bucket: bucketName,
        Key: normalizedPath,
        Body: '',
        ContentType: 'application/x-directory'
      };

      const result = await s3.upload(params).promise();
      
      return {
        success: true,
        location: result.Location,
        etag: result.ETag,
        key: result.Key
      };
    } catch (error) {
      console.error('Error creating folder in S3:', error);
      throw error;
    }
  }

  // Download a file from S3
  async downloadFile(userId, bucketName, key) {
    try {
      const s3 = await this.getS3Instance(userId);
      
      const params = {
        Bucket: bucketName,
        Key: key
      };

      const result = await s3.getObject(params).promise();
      
      return {
        success: true,
        body: result.Body,
        contentType: result.ContentType || 'application/octet-stream',
        contentLength: result.ContentLength,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata || {}
      };
    } catch (error) {
      console.error('Error downloading file from S3:', error);
      throw error;
    }
  }

  // Clear cached S3 instance for a user (useful when credentials change)
  clearUserCache(userId) {
    this.s3Instances.delete(userId);
  }
}

module.exports = new S3Service();
