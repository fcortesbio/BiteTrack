const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

/**
 * Swagger Configuration for BiteTrack API
 * 
 * This configuration integrates our existing OpenAPI 3.1 specification
 * with Swagger UI to provide an interactive documentation portal.
 */

// Load existing OpenAPI specification with dynamic server configuration
const loadOpenAPISpec = (port, host = 'localhost') => {
  try {
    const yamlPath = path.join(__dirname, '../docs/openapi.yaml');
    const fileContents = fs.readFileSync(yamlPath, 'utf8');
    const spec = yaml.load(fileContents);
    
    // Update servers with dynamic port and environment-aware configuration
    spec.servers = [
      {
        url: `http://${host}:${port}/bitetrack`,
        description: `${process.env.NODE_ENV || 'development'} server (Port ${port})`
      }
    ];
    
    // Enhanced with additional Swagger UI customizations
    spec.info = {
      ...spec.info,
      description: `
        <div style="margin-bottom: 20px;">
          <h3>🍔 BiteTrack Enterprise Business Intelligence Platform</h3>
          <p><strong>Transform your food business from spreadsheet chaos to structured success</strong></p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4>🎯 Platform Capabilities</h4>
            <ul>
              <li><strong>36 Professional API Endpoints</strong> across 9 business categories</li>
              <li><strong>Advanced Business Intelligence</strong> with sales analytics and reporting</li>
              <li><strong>Food Waste Management</strong> with regulatory compliance features</li>
              <li><strong>Multi-role Authentication</strong> with enterprise-grade security</li>
              <li><strong>Atomic Transactions</strong> with real-time inventory management</li>
              <li><strong>Professional Testing Infrastructure</strong> with automated scenarios</li>
            </ul>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4>🚀 Getting Started</h4>
            <ol>
              <li><strong>Authentication Required:</strong> Most endpoints require JWT authentication</li>
              <li><strong>Get Token:</strong> Use <code>POST /auth/login</code> to obtain your JWT token</li>
              <li><strong>Authorization:</strong> Add <code>Bearer YOUR_TOKEN</code> to Authorization header</li>
              <li><strong>Explore:</strong> Use the interactive interface below to test endpoints</li>
            </ol>
          </div>
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4>📊 Business Categories</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <div><strong>🔐 Authentication</strong><br/>Login, activation, recovery</div>
              <div><strong>👤 User Management</strong><br/>Staff, roles, permissions</div>
              <div><strong>🏪 Customer Relations</strong><br/>CRM, transaction history</div>
              <div><strong>📦 Inventory</strong><br/>Products, pricing, stock</div>
              <div><strong>💳 Sales Processing</strong><br/>Transactions, settlements</div>
              <div><strong>📊 Business Intelligence</strong><br/>Analytics, reporting, CSV</div>
              <div><strong>🗑️ Waste Management</strong><br/>Compliance, cost tracking</div>
              <div><strong>🧪 Development Tools</strong><br/>Testing, data management</div>
              <div><strong>❤️ System Health</strong><br/>Monitoring, status</div>
            </div>
          </div>
        </div>
      `,
      contact: {
        name: 'BiteTrack API Support',
        url: 'https://github.com/fcortesbio/BiteTrack',
        email: 'support@bitetrack.api'
      },
      license: {
        name: 'MIT License',
        url: 'https://github.com/fcortesbio/BiteTrack/blob/main/LICENSE'
      }
    };
    
    return spec;
  } catch (error) {
    console.error('Error loading OpenAPI specification:', error);
    
    // Fallback basic configuration with dynamic port
    return {
      openapi: '3.1.0',
      info: {
        title: 'BiteTrack API',
        version: '2.0.0',
        description: 'Professional food business management platform with business intelligence'
      },
      servers: [
        {
          url: `http://${host}:${port}/bitetrack`,
          description: `${process.env.NODE_ENV || 'development'} server (Port ${port})`
        }
      ]
    };
  }
};

// Swagger UI customization options
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { 
      background-color: #2c3e50; 
    }
    .swagger-ui .topbar .download-url-wrapper .select-label {
      color: white;
    }
    .swagger-ui .info .title {
      color: #2c3e50;
    }
    .swagger-ui .scheme-container {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .swagger-ui .auth-wrapper {
      background: #e8f5e8;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #4caf50;
    }
    .swagger-ui .info .description p {
      font-size: 14px;
      line-height: 1.6;
    }
    .swagger-ui .info .description h4 {
      color: #2c3e50;
      margin-top: 20px;
      margin-bottom: 10px;
    }
  `,
  customSiteTitle: 'BiteTrack API Documentation - Interactive Portal',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Add custom headers or modify requests if needed
      req.headers['User-Agent'] = 'BiteTrack-Swagger-UI/2.0.0';
      return req;
    },
    responseInterceptor: (res) => {
      // Process responses if needed
      return res;
    },
    // Group operations by tags for better organization
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
    // Default auth configuration
    persistAuthorization: true,
    // Show request duration
    showExtensions: true,
    showCommonExtensions: true
  }
};

module.exports = {
  swaggerUi,
  swaggerOptions,
  loadOpenAPISpec, // Export the function so we can call it with dynamic parameters
  
  // Helper function to serve Swagger UI with dynamic configuration
  setupSwaggerUI: (app, port, host = 'localhost') => {
    // Load specification with dynamic port and host
    const swaggerSpec = loadOpenAPISpec(port, host);
    
    // Swagger UI endpoint
    app.use('/bitetrack/api-docs', swaggerUi.serve);
    app.get('/bitetrack/api-docs', swaggerUi.setup(swaggerSpec, swaggerOptions));
    
    // JSON endpoint for raw spec
    app.get('/bitetrack/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
    
    // Dynamic logging with correct port information
    const environment = process.env.NODE_ENV || 'development';
    console.log(`📚 Swagger UI Documentation Portal initialized (${environment})`);
    console.log(`🌐 Interactive docs available at: http://${host}:${port}/bitetrack/api-docs`);
    console.log(`📄 JSON specification at: http://${host}:${port}/bitetrack/api-docs.json`);
    
    // Return the spec for potential use elsewhere
    return swaggerSpec;
  }
};
