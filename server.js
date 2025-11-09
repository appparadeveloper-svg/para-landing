import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// Removed unused callGeminiAI helper to avoid unused-variable lint errors.

app.post('/api/chat', async (req, res) => {
  try {
    const { history = [], userText = '' } = req.body || {};
    if (!userText) {
      return res.status(400).json({ error: 'No message provided' });
    }

    // Build conversation context
    const systemPrompt = `You are the PARA! assistant for a commuting app in the Philippines. Be concise, friendly, and helpful. If users ask about downloads, note the app is coming soon; suggest newsletter subscription. If they ask about features, highlight tracking, ETA, notifications, fare calculator, and nearest stops.`;
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...(Array.isArray(history) ? history.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })) : []),
      { role: 'user', parts: [{ text: userText }] }
    ];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing from environment.' });
    }

    // Retry logic for Gemini API 503 errors
    const maxRetries = 3;
    let attempt = 0;
    let response, data;
    while (attempt < maxRetries) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });
      try {
        data = await response.json();
      } catch (err) {
        return res.status(500).json({ error: 'Gemini API did not return JSON.', details: String(err) });
      }
      // If not 503, break; else, retry
      if (response.status !== 503) break;
      attempt++;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
      }
    }

    if (!response.ok) {
      // If 503, send a user-friendly message
      if (response.status === 503) {
        return res.status(503).json({ error: 'Gemini API overloaded. Please try again in a few moments.' });
      }
      console.error('Gemini API error:', data);
      return res.status(500).json({ error: 'Gemini API error', details: data });
    }

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({
        reply: 'Sorry, I could not generate a response.',
        debug: data
      });
    }

    const reply = data.candidates[0].content.parts[0].text;
    return res.json({ reply });
  } catch (err) {
    console.error('Server chat error:', err);
    return res.status(500).json({ error: 'No Internet Connection. Please try again later.', details: String(err) });
  }
});

// Health check endpoint for UptimeRobot monitoring
app.get('/api/health', (_req, res) => {
  const uptime = process.uptime();
  const healthCheck = {
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    service: 'PARA API'
  };
  res.status(200).json(healthCheck);
});

// Alternative root health check (in case UptimeRobot pings root)
app.get('/', (_req, res) => {
  res.status(200).json({ 
    ok: true, 
    message: 'PARA API is running',
    timestamp: new Date().toISOString() 
  });
});

app.listen(port, () => {
  console.log(`[chat-server] listening on http://localhost:${port}`);
});


