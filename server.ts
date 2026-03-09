import express from 'express';
import { createServer as createViteServer } from 'vite';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'path';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia' as any,
});

// Initialize Database
const db = new Database('tourchef.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Touring Catering Ops Bundle',
                description: 'The complete toolkit for touring and event catering teams.',
                images: ['https://picsum.photos/seed/tour-bundle/800/600'],
              },
              unit_amount: 2900, // £29.00
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/`,
      });

      res.json({ id: session.id });
    } catch (error: any) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    try {
      const stmt = db.prepare('INSERT INTO subscribers (email) VALUES (?)');
      stmt.run(email);
      console.log(`New subscriber saved: ${email}`);
      // In a real app, you'd trigger an email here via SendGrid/Postmark
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.json({ success: true, message: 'Already subscribed' });
      }
      console.error('Database error:', error);
      res.status(500).json({ error: 'Failed to save subscriber' });
    }
  });

  // Real download endpoint - serves the Touring Bundle ZIP from the public directory
  app.get('/api/download', (req, res) => {
    // In a production app, you should verify the user's purchase or a signed token here.
    const bundlePath = path.join(process.cwd(), 'public', 'TourChef_Ops_Touring_Bundle.zip');
    res.download(bundlePath, 'TourChef_Ops_Touring_Bundle.zip', (err) => {
      if (err) {
        console.error('Bundle download error:', err);
        if (!res.headersSent) {
          res.status(500).send('Unable to download bundle');
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
