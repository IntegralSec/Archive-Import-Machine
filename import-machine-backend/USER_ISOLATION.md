# User Configuration Isolation

This document explains how the Import Machine backend ensures that users can only access their own configuration settings and data.

## 🔒 **Security Overview**

The Import Machine backend implements **complete user isolation** at multiple levels:

- **Configuration Isolation**: Each user has their own archive system configuration
- **Data Isolation**: Cached data is user-specific
- **Authentication**: JWT tokens contain user-specific information
- **Authorization**: All routes verify user identity before accessing data

## 🏗️ **Architecture**

### **Database Design**

All user-related data includes a `userId` foreign key:

```sql
-- Configurations table
CREATE TABLE configurations (
  id INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,  -- Links to users table
  archiveWebUI VARCHAR(500),
  apiToken TEXT,
  s3Settings JSON,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Import jobs cache table
CREATE TABLE import_jobs (
  id INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,  -- Links to users table
  importJobId VARCHAR(255),
  name VARCHAR(255),
  -- ... other fields
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### **Authentication Flow**

1. **Login**: User provides credentials
2. **JWT Generation**: Server creates token with `userId` embedded
3. **Request Authentication**: All API requests include JWT token
4. **User Resolution**: Server extracts `userId` from token
5. **Data Access**: All data queries filter by `userId`

## 🔧 **Implementation Details**

### **Configuration Management**

```javascript
// All configuration operations are user-specific
const getConfig = async (userId) => {
  const config = await Configuration.getCurrent(userId);
  return config;
};

const updateConfig = async (userId, newConfig) => {
  const updatedConfig = await Configuration.updateCurrent(userId, newConfig);
  return updatedConfig;
};
```

### **Route Protection**

All routes use the `authenticate` middleware:

```javascript
router.get('/', authenticate, async (req, res) => {
  // req.user.id contains the authenticated user's ID
  const config = await getConfig(req.user.id);
  // ... rest of the route logic
});
```

### **Cache Isolation**

Cached data is user-specific:

```javascript
// Cache service methods all require userId
await importJobCacheService.getCachedImportJobs(userId, forceRefresh);
await importJobCacheService.cacheImportJobs(userId, importJobs);
```

## 🧪 **Testing User Isolation**

Run the isolation test to verify the system:

```bash
npm run test:isolation
```

This test verifies:
- ✅ Each user has their own configuration
- ✅ Updating one user's config doesn't affect others
- ✅ New users start with empty configuration
- ✅ Configuration resets are user-specific
- ✅ Cache data is properly isolated

## 🔍 **Security Features**

### **1. JWT Token Security**
- Tokens contain encrypted user information
- 24-hour expiration
- Server-side validation on every request

### **2. Database-Level Isolation**
- Foreign key constraints ensure data integrity
- CASCADE deletion removes user data when account is deleted
- Indexes optimize user-specific queries

### **3. Route-Level Protection**
- All routes require authentication
- User ID is extracted from JWT token
- No direct access to other users' data

### **4. Configuration Isolation**
- Each user's configuration is completely separate
- API tokens and credentials are user-specific
- Archive system connections are isolated

## 🚨 **Security Considerations**

### **What's Protected**
- ✅ Archive system credentials (API tokens)
- ✅ S3 configuration settings
- ✅ Cached import job data
- ✅ User preferences and settings

### **Admin Access**
- Admin users can view all users (for management)
- Admin users cannot access other users' configurations
- Admin routes require explicit admin role verification

### **Data Privacy**
- Users cannot see other users' data
- Users cannot modify other users' configurations
- All data queries are filtered by user ID

## 🔧 **Configuration Examples**

### **User A Configuration**
```json
{
  "archiveWebUI": "http://archive-a.example.com",
  "apiToken": "user-a-secret-token",
  "s3Settings": {
    "accessKeyId": "user-a-access-key",
    "secretAccessKey": "user-a-secret-key",
    "bucketName": "user-a-bucket"
  }
}
```

### **User B Configuration**
```json
{
  "archiveWebUI": "http://archive-b.example.com",
  "apiToken": "user-b-secret-token",
  "s3Settings": {
    "accessKeyId": "user-b-access-key",
    "secretAccessKey": "user-b-secret-key",
    "bucketName": "user-b-bucket"
  }
}
```

These configurations are completely isolated - User A cannot access User B's configuration and vice versa.

## 🛡️ **Best Practices**

### **For Developers**
1. Always use `req.user.id` for data queries
2. Never hardcode user IDs in queries
3. Test user isolation regularly
4. Use the provided middleware for authentication

### **For Administrators**
1. Monitor user access patterns
2. Regularly audit user configurations
3. Use admin routes for user management
4. Implement proper backup strategies

### **For Users**
1. Keep your API tokens secure
2. Don't share your credentials
3. Use strong passwords
4. Report any suspicious activity

## 🔍 **Monitoring and Logging**

The system logs all configuration access:

```javascript
console.log('Retrieved configuration for user', userId, ':', {
  archiveWebUI: config.archiveWebUI ? 'set' : 'not set',
  apiToken: config.apiToken ? `set (length: ${config.apiToken.length})` : 'not set'
});
```

This helps with:
- Security auditing
- Debugging user issues
- Monitoring system usage
- Compliance requirements

## 📋 **Compliance**

This isolation system ensures compliance with:
- **Data Privacy Regulations**: User data is properly segregated
- **Security Standards**: Multi-layer authentication and authorization
- **Audit Requirements**: All access is logged and traceable
- **Access Control**: Principle of least privilege enforced

## 🚀 **Future Enhancements**

Potential improvements:
- Role-based access control (RBAC)
- Configuration templates for new users
- Audit trail for configuration changes
- Multi-factor authentication (MFA)
- Configuration backup and restore
