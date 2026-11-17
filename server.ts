import express from 'express';
import type { Request, Response } from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY')) {
    return { status: 503, message: 'AI service key is not configured in Settings > Secrets.' };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return { status: 429, message: 'AI rate quota reached. Please retry in a few moments.' };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return { status: 403, message: 'Please verify your Gemini API key in Settings > Secrets.' };
  }
  return { status: 500, message: raw || 'Failed to process AI request.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'elarb-fitpro-ultra', timestamp: new Date().toISOString() });
  });

  app.post('/api/food/analyze', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, mealDescription, language } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        mealDescription?: string;
        language?: 'en' | 'ar';
      };

      if (!imageBase64 && !mealDescription?.trim()) {
        res.status(400).json({ error: 'Provide either a meal photo or a meal description.' });
        return;
      }

      const ai = getAiClient();
      const langInstruction =
        language === 'ar'
          ? 'Return mealName, servingSize, confidenceNote, and item names in Arabic.'
          : 'Return mealName, servingSize, confidenceNote, and item names in English.';

      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];
      if (imageBase64 && mimeType) {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        parts.push({
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        });
      }

      parts.push({
        text: `Analyze this meal for sports nutrition tracking. ${
          mealDescription ? `User notes: "${mealDescription}".` : ''
        } ${langInstruction} Provide realistic calorie and macronutrient estimates (proteinG, carbsG, fatsG, fiberG) plus individual food item breakdowns. Include a brief educational confidence note.`,
      });

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts },
          config: {
            systemInstruction:
              'You are ELARB FitPro Ultra Sports Nutrition Analyzer. Estimate meal calories and macronutrients conservatively and accurately for fitness tracking. Always return valid JSON matching the requested schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mealName: { type: Type.STRING },
                servingSize: { type: Type.STRING },
                calories: { type: Type.NUMBER },
                proteinG: { type: Type.NUMBER },
                carbsG: { type: Type.NUMBER },
                fatsG: { type: Type.NUMBER },
                fiberG: { type: Type.NUMBER },
                confidenceNote: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      calories: { type: Type.NUMBER },
                      proteinG: { type: Type.NUMBER },
                      carbsG: { type: Type.NUMBER },
                      fatsG: { type: Type.NUMBER },
                    },
                  },
                },
              },
            },
          },
        })
      );

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/workout/ai-plan', async (req: Request, res: Response) => {
    try {
      const { goal, discipline, level, equipment, daysPerWeek, language } = req.body as {
        goal?: string;
        discipline?: string;
        level?: string;
        equipment?: string;
        daysPerWeek?: number;
        language?: 'en' | 'ar';
      };

      const ai = getAiClient();
      const langRule = language === 'ar' ? 'Respond in clear Arabic.' : 'Respond in clear English.';

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Create a ${daysPerWeek ?? 4}-day training split for goal: ${goal ?? 'Lean Muscle'}, discipline: ${discipline ?? 'Bodybuilding'}, experience: ${level ?? 'Intermediate'}, equipment: ${equipment ?? 'Full Gym'}. ${langRule}`,
          config: {
            systemInstruction:
              'You are ELARB FitPro Ultra Strength & Conditioning Coach. Build structured, safe, progressive training plans with warm-up guidance and realistic volume. Return valid JSON matching the schema.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                planTitle: { type: Type.STRING },
                weeklySummary: { type: Type.STRING },
                safetyTip: { type: Type.STRING },
                days: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      dayLabel: { type: Type.STRING },
                      focus: { type: Type.STRING },
                      exercises: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            sets: { type: Type.NUMBER },
                            reps: { type: Type.STRING },
                            restSec: { type: Type.NUMBER },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      );

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  const httpServer = http.createServer(app);

  if (!isProduction) {
    process.env.DISABLE_HMR = 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript');
      res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay {}
`);
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ELARB FitPro Ultra server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
