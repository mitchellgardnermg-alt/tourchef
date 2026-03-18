import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import multer from 'multer';
import OpenAI from 'openai';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json());
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      ai: {
        configured: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
      },
    });
  });

  app.post('/api/extract-carnet-items', upload.array('images', 12), async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY is not set on the server.' });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      if (!files.length) {
        return res.status(400).json({ error: 'No images uploaded. Field name must be "images".' });
      }

      const openai = new OpenAI({ apiKey });
      const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

      const images = files.map((f) => {
        const mime = f.mimetype || 'image/jpeg';
        const b64 = f.buffer.toString('base64');
        return {
          type: 'input_image' as const,
          image_url: `data:${mime};base64,${b64}`,
          detail: 'auto' as const,
        };
      });

      const prompt = [
        'You are CarnetAI. Extract an ATA carnet packing list from the provided photos.',
        '',
        'Return JSON only with this shape:',
        '{ "items": [ { "itemName": string, "category": "Kitchen"|"Production"|"Instruments"|"Audio"|"Lighting"|"Backline"|"IT"|"Other", "quantity": number, "estimatedValueGbp": number, "notes": string } ] }',
        '',
        'Rules:',
        '- Be conservative: if unsure about an item, omit it.',
        '- Combine duplicates across images (same item name/category) by increasing quantity.',
        '- Use realistic quantities and GBP values (integer).',
        '- Notes: include case/brand/serial if visible; otherwise empty string.',
        '- No markdown, no extra keys.',
      ].join('\n');

      const response = await openai.responses.create({
        model,
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }, ...images],
          },
        ],
      });

      const text = response.output_text;
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        return res.status(502).json({ error: 'Model returned non-JSON output.', raw: text });
      }

      return res.json(parsed);
    } catch (err: any) {
      console.error('AI extract error:', err);
      return res.status(500).json({ error: err?.message || 'AI extraction failed' });
    }
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
    console.log(`CarnetAI server running on http://localhost:${PORT}`);
  });
}

startServer();
