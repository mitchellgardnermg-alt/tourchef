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
        'You are CarnetAI. Extract an ATA carnet packing list from the provided photos.',
        '',
        'You MUST use only what is visible in the photos (including labels, engravings, printed stickers, packaging, and case markings).',
        'Do NOT invent items. Do NOT guess brand/model/country of origin/serial number/value if not supported by the photos.',
        'If an item is unclear, omit it.',
        '',
        'Search across ALL images for the same item (different angles) and combine duplicates by increasing quantity.',
        'Prefer model numbers, brand names, and distinctive descriptors when visible.',
        '',
        'Return JSON only with this exact shape:',
        '{ "items": [ { "itemDescription": string, "category": "Kitchen Equipment"|"Production Equipment"|"Instruments"|"Audio Equipment"|"Lighting"|"Other", "quantity": number, "valueGbp": number, "countryOfOrigin": string, "weightKg": number|null, "serialNumber": string, "notes": string } ] }',
        '',
        'Rules:',
        '- ItemDescription must be clear, specific, and uniquely identifiable. Include brand/model/capacity/color where visible. Avoid generic terms like "Pan" or "DJ equipment".',
        '- Quantity: integer >= 1.',
        '- valueGbp: integer >= 0. If price/value is not visible, set to 0 (do not guess).',
        '- countryOfOrigin: ONLY if explicitly visible (e.g., "Made in ..."). Otherwise empty string.',
        '- weightKg: ONLY if explicitly visible or clearly printed. Otherwise null.',
        '- serialNumber: ONLY if explicitly visible. If not visible, use "N/A".',
        '- notes: include helpful evidence like: "Label shows MODEL XYZ", "Case marked 03", "Sticker reads Made in UK", "Serial on rear panel". Otherwise empty string.',
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

      const items = Array.isArray(parsed?.items) ? parsed.items : null;
      if (!items) {
        return res.status(502).json({ error: 'Model JSON did not include an items array.', raw: parsed });
      }

      // Minimal shape validation; frontend normalizes further.
      const sanitizedItems = items
        .filter((it: any) => it && typeof it === 'object')
        .map((it: any) => ({
          itemDescription: typeof it.itemDescription === 'string' ? it.itemDescription : '',
          category: typeof it.category === 'string' ? it.category : 'Other',
          quantity: Number.isFinite(Number(it.quantity)) ? Number(it.quantity) : 1,
          valueGbp: Number.isFinite(Number(it.valueGbp)) ? Number(it.valueGbp) : 0,
          countryOfOrigin: typeof it.countryOfOrigin === 'string' ? it.countryOfOrigin : '',
          weightKg: it.weightKg === null || Number.isFinite(Number(it.weightKg)) ? it.weightKg : null,
          serialNumber: typeof it.serialNumber === 'string' ? it.serialNumber : 'N/A',
          notes: typeof it.notes === 'string' ? it.notes : '',
        }))
        .filter((it: any) => typeof it.itemDescription === 'string' && it.itemDescription.trim().length > 0);

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
