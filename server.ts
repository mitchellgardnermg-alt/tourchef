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
          // "high" helps with reading labels / model numbers / serials.
          detail: 'high' as const,
        };
      });

      const prompt = [
        'You are an expert in preparing ATA carnet packing lists for customs.',
        '',
        'Analyse the images and identify ALL physical items.',
        '',
        'IMPORTANT RULES:',
        '- Group identical items into one line with quantity',
        '- Use professional, specific names (e.g. "Stainless Steel Saucepan", not "pot")',
        '- Do NOT be vague',
        '- Focus on equipment only (ignore background clutter)',
        '- If items are part of a set, group them (e.g. "Cutlery Set")',
        '- Search across ALL images for the same item and combine duplicates by increasing quantity',
        '- Use only what is visible; do NOT invent items or guess values if not supported by the photos',
        '',
        'Return JSON only. Use this exact shape (array of objects):',
        '[ { "item_name": string, "category": string, "quantity": number, "estimated_value_gbp": number, "notes": string } ]',
        '',
        'Categories (choose one per item): Kitchen Equipment, Utensils, Electrical Equipment, Furniture, Audio Equipment, Other',
        '',
        'Rules:',
        '- item_name: clear and professional; include brand/model/size/material where visible',
        '- quantity: integer >= 1',
        '- estimated_value_gbp: realistic estimate per item (integer); use 0 if not visible',
        '- notes: optional details like size, material, brand if visible; or "Made in X", serial if visible',
        '- No markdown, no extra keys.',
      ].join('\n');

      const response = await openai.responses.create({
        model,
        temperature: 0,
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

      const rawItems = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : null;
      if (!rawItems) {
        return res.status(502).json({ error: 'Model JSON did not include an items array.', raw: parsed });
      }

      // Map item_name/estimated_value_gbp to our schema; frontend normalizes further.
      const sanitizedItems = rawItems
        .filter((it: any) => it && typeof it === 'object')
        .map((it: any) => {
          const desc = it.item_name ?? it.itemDescription ?? it.itemName ?? '';
          const val = Number(it.estimated_value_gbp ?? it.valueGbp ?? it.estimatedValueGbp ?? 0);
          return {
            itemDescription: typeof desc === 'string' ? desc.trim() : '',
            category: typeof it.category === 'string' ? it.category : 'Other',
            quantity: Number.isFinite(Number(it.quantity)) ? Math.max(1, Math.round(Number(it.quantity))) : 1,
            valueGbp: Number.isFinite(val) ? Math.max(0, Math.round(val)) : 0,
            countryOfOrigin: typeof it.countryOfOrigin === 'string' ? it.countryOfOrigin : '',
            weightKg: it.weightKg === null || Number.isFinite(Number(it.weightKg)) ? it.weightKg : null,
            serialNumber: typeof it.serialNumber === 'string' ? it.serialNumber : 'N/A',
            notes: typeof it.notes === 'string' ? it.notes : '',
          };
        })
        .filter((it: any) => typeof it.itemDescription === 'string' && it.itemDescription.length > 0);

      return res.json({ items: sanitizedItems });
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
