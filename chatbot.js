import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory user sessions: { userId: [ {role, content} ] }
const userSessions = {};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const config = {
  responseMimeType: 'text/plain',
};

const allowedOrigins = [
  'http://localhost:5173',
  'https://artlinkme.netlify.app'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.post('/chat', async (req, res) => {
  let { message, userId } = req.body;
  if (!userId) {
    userId = uuidv4();
  }
  if (!userSessions[userId]) {
    userSessions[userId] = [];
  }
  userSessions[userId].push({ role: 'user', content: message });

  const systemPrompt = `You are ARTLINK, an AI chatbot created and owned by Suryanshu. Your job is to assist users by answering their questions, providing information, and engaging in helpful conversation. Respond in a friendly, clear, and informative manner, using natural language. Understand the user's message and intent. Generate relevant and accurate responses. Maintain a conversational and polite tone. Help users with their queries, whether they are about art, general knowledge, or other topics.`;

  // Build conversation history for Gemini
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    ...userSessions[userId].map(m => ({ role: m.role, parts: [{ text: m.content }] }))
  ];

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      config,
      contents
    });
    let reply = 'No response from Gemini.';
    if (result && result.response && Array.isArray(result.response.parts)) {
      reply = result.response.parts.map(p => p.text).join('');
    } else if (result && result.candidates && result.candidates.length > 0) {
      reply = result.candidates.map(c => c.content?.parts?.map(p => p.text).join('')).join(' ');
    }
    if (!reply || reply.trim() === '') {
      reply = 'Sorry, I could not generate a response.';
    }
    userSessions[userId].push({ role: 'model', content: reply });
    res.json({ reply, userId });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ reply: 'There was an error connecting to Artlink Bot.', userId });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
