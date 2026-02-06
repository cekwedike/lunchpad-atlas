# Setting Up Google Gemini API (FREE)

## Why Gemini?
- ✅ **FREE API key** from Google AI Studio
- ✅ **60 requests/minute** on free tier (more than enough)
- ✅ **Gemini 1.5 Flash** - Fast, high-quality, JSON support
- ✅ **No credit card required** for free tier
- ✅ Perfect for session analytics and AI insights

## Get Your Free API Key

### Step 1: Go to Google AI Studio
Visit: https://aistudio.google.com/

### Step 2: Sign In
- Use your Google account
- Accept the terms of service

### Step 3: Create API Key
1. Click on "Get API key" in the top right
2. Click "Create API key"
3. Select "Create API key in new project" or use existing project
4. Copy your API key (starts with `AIza...`)

### Step 4: Add to Your .env File
```bash
cd backend
# Edit .env file
GEMINI_API_KEY="AIzaSy..."  # Paste your API key here
```

## Usage Limits (Free Tier)

**Gemini 1.5 Flash:**
- 15 RPM (Requests Per Minute)
- 1 million TPM (Tokens Per Minute)  
- 1,500 RPD (Requests Per Day)

**Gemini 1.5 Pro:**
- 2 RPM
- 32,000 TPM
- 50 RPD

For this project, **Gemini 1.5 Flash** is perfect!

## Test Your Setup

```bash
# Start the backend server
cd backend
npm run start:dev

# Test the session analytics endpoint (use Postman or curl)
curl -X POST http://localhost:4000/session-analytics/process/SESSION_ID \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "transcript": "Facilitator: Welcome everyone! Today we discuss leadership..."
  }'
```

## What Changed?

### From OpenAI → Gemini:
- ❌ `openai` package removed
- ✅ `@google/generative-ai` added
- ❌ `OPENAI_API_KEY` removed
- ✅ `GEMINI_API_KEY` added
- ❌ GPT-4 Turbo (`gpt-4-turbo-preview`)
- ✅ Gemini 1.5 Flash (`gemini-1.5-flash`)

### API Differences:
```typescript
// Before (OpenAI)
const completion = await this.openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [...],
  response_format: { type: 'json_object' }
});

// After (Gemini)
const result = await this.model.generateContent([{
  role: 'user',
  parts: [{ text: prompt }]
}]);
const response = await result.response;
const text = response.text();
```

## Benefits of Gemini for This Project

1. **Cost**: FREE (vs OpenAI's $0.01 per 1K tokens)
2. **Speed**: Gemini 1.5 Flash is very fast
3. **Quality**: Excellent for analytics and insights
4. **JSON Mode**: Native JSON response support
5. **Multimodal**: Can handle text, images, video (future use)

## Resources

- **Google AI Studio**: https://aistudio.google.com/
- **Gemini API Docs**: https://ai.google.dev/docs
- **Pricing**: https://ai.google.dev/pricing
- **Node.js SDK**: https://www.npmjs.com/package/@google/generative-ai

## Need Help?

If you get errors:
1. **"API key not configured"** → Check `.env` has `GEMINI_API_KEY="..."`
2. **"Resource exhausted"** → You hit rate limits, wait a minute
3. **"Invalid API key"** → Double-check you copied the full key from AI Studio

## Next Steps

After setting up:
1. Get your free API key from https://aistudio.google.com/
2. Add to `backend/.env` as `GEMINI_API_KEY`
3. Install dependencies: `cd backend && npm install`
4. Start server: `npm run start:dev`
5. Test session analytics endpoints!

---

**Estimated Cost**: $0.00 (FREE forever on free tier!)
