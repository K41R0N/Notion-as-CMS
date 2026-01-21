const { Client } = require('@notionhq/client');

/**
 * Form Submission Function
 * Receives form data and creates a new entry in Notion database.
 * Includes honeypot spam protection and input validation.
 */
exports.handler = async (event, context) => {
  // Set CORS headers - use SITE_URL for production, allow all for development
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.SITE_URL || '*')
    : '*';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check for NOTION_TOKEN before proceeding
  if (!process.env.NOTION_TOKEN) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Service not configured',
        message: 'NOTION_TOKEN environment variable not set'
      })
    };
  }

  if (!process.env.NOTION_DATABASE_ID) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Service not configured',
        message: 'NOTION_DATABASE_ID environment variable not set'
      })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { name, email, message, website } = body;

    // Honeypot check - if "website" field is filled, it's a bot
    // (This field should be hidden via CSS and left empty by real users)
    if (website) {
      // Pretend success to not alert the bot
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Lead submitted successfully'
        })
      };
    }

    // Validate required fields
    if (!name || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name and email are required' })
      };
    }

    // Validate name length (1-100 characters)
    if (name.length < 1 || name.length > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name must be between 1 and 100 characters' })
      };
    }

    // Validate email format (more strict regex)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Validate message length (max 2000 characters)
    const sanitizedMessage = message ? String(message).slice(0, 2000) : '';

    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });

    // Create page in Notion database
    const response = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID,
      },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: name,
              },
            },
          ],
        },
        'Email': {
          email: email,
        },
        'Message': {
          rich_text: [
            {
              text: {
                content: sanitizedMessage || 'No message provided',
              },
            },
          ],
        },
        'Status': {
          select: {
            name: 'New Lead',
          },
        },
        'Source': {
          select: {
            name: 'Website',
          },
        },
        'Date Submitted': {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Lead submitted successfully',
        id: response.id
      })
    };

  } catch (error) {
    console.error('Error submitting to Notion:', error);
    
    // Return different error messages based on the error type
    let errorMessage = 'Failed to submit lead';
    let statusCode = 500;

    if (error.code === 'unauthorized') {
      errorMessage = 'Notion integration not configured properly';
      statusCode = 503;
    } else if (error.code === 'object_not_found') {
      errorMessage = 'Notion database not found';
      statusCode = 503;
    } else if (error.code === 'validation_error') {
      errorMessage = 'Invalid data format';
      statusCode = 400;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

