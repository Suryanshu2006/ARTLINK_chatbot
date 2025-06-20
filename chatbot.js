import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const config = {
  responseMimeType: 'text/plain',
};

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message || 'Hello';

  const systemPrompt = `You are ARTLINK, an AI chatbot. Your job is to assist users by answering their questions, providing information, and engaging in helpful conversation. Respond in a friendly, clear, and informative manner, using natural language. Understand the user's message and intent. Generate relevant and accurate responses. Maintain a conversational and polite tone. Help users with their queries, whether they are about art, general knowledge, or other topics.`;

  const contents = [
    { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }] }
  ];

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      config,
      contents
    });

    // Debug log the result structure
    console.log('Gemini API result:', JSON.stringify(result, null, 2));

    let reply = 'No response from Gemini.';
    if (result && result.response && Array.isArray(result.response.parts)) {
      reply = result.response.parts.map(p => p.text).join('');
    } else if (result && result.candidates && result.candidates.length > 0) {
      // Fallback for different response structure
      reply = result.candidates.map(c => c.content?.parts?.map(p => p.text).join('')).join(' ');
    }
    res.json({ response: reply });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to get response from Gemini.' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});