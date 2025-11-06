import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// Your working Gemini function
async function callGeminiAI(prompt, temperature = 0.8) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 1024,
        topP: 0.9,
        topK: 40,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error('Gemini API error: ' + error);
  }

  const data = await response.json();
  return data;
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { history = [], userText = '' } = req.body || {};
    
    if (!userText) {
      return res.status(400).json({ error: 'No message provided' });
    }

    // Build conversation context like your Next.js API
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    let data;
    try {
      data = await response.json();
    } catch (err) {
      return res.status(500).json({ error: 'Gemini API did not return JSON.', details: String(err) });
    }

    if (!response.ok) {
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
}
