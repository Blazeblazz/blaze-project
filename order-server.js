const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// File-based storage for orders
const ORDERS_FILE = path.join(__dirname, 'orders.json');
let orders = [];
let orderIdCounter = 1;

// Load orders from file
function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf8');
      const savedData = JSON.parse(data);
      orders = savedData.orders || [];
      orderIdCounter = savedData.nextId || 1;
    }
  } catch (error) {
    console.log('Starting with empty orders');
  }
}

// Save orders to file
function saveOrders() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify({
      orders: orders,
      nextId: orderIdCounter
    }, null, 2));
  } catch (error) {
    console.error('Error saving orders:', error);
  }
}

// Initialize orders
loadOrders();

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Enable CORS for production
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle API routes
  if (pathname === '/api/v1/orders' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const orderData = JSON.parse(body);
        const order = {
          id: orderIdCounter++,
          ...orderData,
          timestamp: new Date().toISOString(),
          status: 'pending'
        };
        
        orders.unshift(order);
        saveOrders();
        console.log('New order received:', order);
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          message: 'Order submitted successfully',
          data: { order }
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: 'Failed to submit order',
          error: error.message
        }));
      }
    });
    return;
  }

  if (pathname === '/api/v1/orders' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      results: orders.length,
      data: { orders }
    }));
    return;
  }

  // Serve static files
  let filePath = '';
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(__dirname, 'index.html');
  } else if (pathname === '/orders.html') {
    filePath = path.join(__dirname, 'server', 'public', 'orders.html');
  } else if (pathname === '/script.js') {
    filePath = path.join(__dirname, 'script.js');
  } else if (pathname === '/styles.css') {
    filePath = path.join(__dirname, 'styles.css');
  } else if (pathname.startsWith('/images/')) {
    filePath = path.join(__dirname, pathname);
  } else if (pathname.startsWith('/css/')) {
    filePath = path.join(__dirname, pathname);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  // Check if file exists and serve it
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    // Set content type based on file extension
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    switch (ext) {
      case '.html': contentType = 'text/html'; break;
      case '.js': contentType = 'application/javascript'; break;
      case '.css': contentType = 'text/css'; break;
      case '.json': contentType = 'application/json'; break;
      case '.png': contentType = 'image/png'; break;
      case '.jpg': contentType = 'image/jpeg'; break;
      case '.webp': contentType = 'image/webp'; break;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Orders saved to: ${ORDERS_FILE}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});