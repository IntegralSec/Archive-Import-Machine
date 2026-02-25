# Network Access Guide

This guide explains how to access the Import Machine backend from other machines on the network.

## Quick Start

### 1. Start the Backend for Network Access

```bash
# Option 1: Use the network script (recommended)
npm run network

# Option 2: Use the regular start command (server now listens on all interfaces)
npm start

# Option 3: Use nodemon for development
npm run lan
```

### 2. Find Your Machine's IP Address

The server will display your local IP address when it starts. Look for:
```
📱 Local IP Address: 192.168.1.100
🔗 Backend URL: http://192.168.1.100:5000
```

### 3. Configure Frontend for Network Access

When accessing the frontend from another machine, you need to set the backend URL:

#### Option A: Environment Variable (Recommended)
Create a `.env` file in the frontend directory:
```bash
# import-machine-frontend/.env
REACT_APP_BACKEND_URL=http://YOUR_MACHINE_IP:5000
```

#### Option B: Browser Console (Temporary)
Open the browser console and run:
```javascript
localStorage.setItem('backendUrl', 'http://YOUR_MACHINE_IP:5000');
location.reload();
```

## Troubleshooting

### Common Issues

1. **"Network error. Please try again."**
   - Ensure the backend is running with `npm run network`
   - Check that your firewall allows connections on port 5000
   - Verify the IP address is correct

2. **CORS Errors**
   - The backend now allows all origins in development mode
   - If you're still getting CORS errors, restart the backend

3. **Connection Refused**
   - Make sure the backend server is running
   - Check that port 5000 is not blocked by firewall
   - Verify you're using the correct IP address

### Firewall Configuration

#### Windows
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change settings" and "Allow another app"
4. Browse to your Node.js executable and add it
5. Make sure both Private and Public networks are checked

#### macOS
```bash
# Allow incoming connections on port 5000
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node
```

#### Linux
```bash
# Allow incoming connections on port 5000
sudo ufw allow 5000
```

### Security Notes

- The server now listens on all network interfaces (`0.0.0.0`)
- CORS is configured to allow all origins in development mode
- For production, configure specific allowed origins in the CORS settings
- Consider using HTTPS for production deployments

## Testing Network Access

1. Start the backend: `npm run network`
2. Note the displayed IP address
3. From another machine, open a browser and go to: `http://YOUR_IP:5000`
4. You should see the API welcome message
5. Configure the frontend to use this IP address
6. Test login functionality

## Production Considerations

For production deployment:
1. Set `NODE_ENV=production` to restrict CORS origins
2. Configure specific allowed origins in the CORS settings
3. Use HTTPS with proper SSL certificates
4. Consider using a reverse proxy (nginx, Apache)
5. Implement proper authentication and authorization
