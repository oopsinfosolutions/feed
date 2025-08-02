#!/usr/bin/env node

/**
 * Network Diagnostic Script for Backend Server
 * Run this to diagnose connection issues between your mobile app and server
 */

const http = require('http');
const os = require('os');
const { spawn, exec } = require('child_process');

console.log('🔍 Backend Server Network Diagnostic Tool');
console.log('==========================================\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Get network interfaces
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        addresses.push({
          name: name,
          address: interface.address,
          netmask: interface.netmask
        });
      }
    }
  }
  
  return addresses;
}

// Check if port is in use
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.listen(port, (err) => {
      if (err) {
        resolve(false);
      } else {
        server.close();
        resolve(true);
      }
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Test HTTP connection
function testConnection(url) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 5000 }, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        resolve({
          success: true,
          status: response.statusCode,
          data: data
        });
      });
    });
    
    request.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });
    
    request.on('timeout', () => {
      request.destroy();
      resolve({
        success: false,
        error: 'Connection timeout'
      });
    });
  });
}

// Get process info for port 3000
function getPortProcess(port) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows 
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// Main diagnostic function
async function runDiagnostics() {
  try {
    // 1. Check system information
    info('System Information:');
    log(`   Platform: ${os.platform()} ${os.arch()}`);
    log(`   Node.js Version: ${process.version}`);
    log(`   Hostname: ${os.hostname()}\n`);
    
    // 2. Check network interfaces
    info('Network Interfaces:');
    const interfaces = getNetworkInterfaces();
    
    if (interfaces.length === 0) {
      error('   No network interfaces found!');
      return;
    }
    
    interfaces.forEach((iface, index) => {
      log(`   ${index + 1}. ${iface.name}: ${iface.address} (${iface.netmask})`);
    });
    log('');
    
    // 3. Check if port 3000 is available
    info('Port Availability Check:');
    const portAvailable = await checkPort(3000);
    
    if (portAvailable) {
      warning('   Port 3000 is available (server not running)');
    } else {
      success('   Port 3000 is in use (server might be running)');
    }
    
    // 4. Check what process is using port 3000
    const processInfo = await getPortProcess(3000);
    if (processInfo) {
      log(`   Process on port 3000:\n   ${processInfo}`);
    } else {
      warning('   No process found on port 3000');
    }
    log('');
    
    // 5. Test localhost connection
    info('Testing Local Connections:');
    
    // Test localhost
    const localhostTest = await testConnection('http://localhost:3000/health');
    if (localhostTest.success) {
      success(`   localhost:3000 - Status: ${localhostTest.status}`);
      log(`   Response: ${localhostTest.data}`);
    } else {
      error(`   localhost:3000 - ${localhostTest.error}`);
    }
    
    // Test 127.0.0.1
    const loopbackTest = await testConnection('http://127.0.0.1:3000/health');
    if (loopbackTest.success) {
      success(`   127.0.0.1:3000 - Status: ${loopbackTest.status}`);
    } else {
      error(`   127.0.0.1:3000 - ${loopbackTest.error}`);
    }
    log('');
    
    // 6. Test network IP connections
    info('Testing Network IP Connections:');
    
    for (const iface of interfaces) {
      const networkTest = await testConnection(`http://${iface.address}:3000/health`);
      if (networkTest.success) {
        success(`   ${iface.address}:3000 - Status: ${networkTest.status}`);
        log(`   📱 Use this URL in your mobile app: http://${iface.address}:3000`, 'cyan');
      } else {
        error(`   ${iface.address}:3000 - ${networkTest.error}`);
      }
    }
    log('');
    
    // 7. Firewall check (Windows specific)
    if (process.platform === 'win32') {
      info('Windows Firewall Check:');
      warning('   Please ensure Windows Firewall allows Node.js on port 3000');
      warning('   Run as Administrator: netsh advfirewall firewall add rule name="Node.js" dir=in action=allow protocol=TCP localport=3000');
      log('');
    }
    
    // 8. Recommendations
    info('📋 Recommendations:');
    
    if (!localhostTest.success && !loopbackTest.success) {
      error('   Server is not running or not responding');
      log('   Solutions:');
      log('   1. Start your server: npm start');
      log('   2. Check server logs for errors');
      log('   3. Verify server.js exists and is correct');
    } else if (localhostTest.success) {
      success('   Server is running locally');
      
      // Find working network IPs
      const workingIPs = [];
      for (const iface of interfaces) {
        const networkTest = await testConnection(`http://${iface.address}:3000/health`);
        if (networkTest.success) {
          workingIPs.push(iface.address);
        }
      }
      
      if (workingIPs.length > 0) {
        success('   Server is accessible from network');
        log('   📱 Mobile App Configuration:', 'cyan');
        workingIPs.forEach(ip => {
          log(`      const API_CONFIG.BASE_URL = 'http://${ip}:3000';`, 'cyan');
        });
      } else {
        error('   Server is not accessible from network');
        log('   Solutions:');
        log('   1. Check firewall settings');
        log('   2. Ensure server binds to 0.0.0.0 not just localhost');
        log('   3. Check if server.js contains: app.listen(3000, "0.0.0.0")');
      }
    }
    
    log('');
    info('🔧 Quick Fixes:');
    log('   1. Restart server: npm start');
    log('   2. Update mobile app IP address');
    log('   3. Disable firewall temporarily for testing');
    log('   4. Ensure phone and computer on same WiFi');
    log('');
    
    info('📞 Need Help?');
    log('   - Check the troubleshooting guide');
    log('   - Verify your server.js configuration');
    log('   - Test with phone browser first');
    
  } catch (error) {
    error(`Diagnostic failed: ${error.message}`);
  }
}

// Run diagnostics
runDiagnostics().then(() => {
  log('\n🏁 Diagnostic complete!', 'green');
}).catch((err) => {
  log(`\n💥 Diagnostic error: ${err.message}`, 'red');
});

module.exports = {
  runDiagnostics,
  getNetworkInterfaces,
  testConnection
};