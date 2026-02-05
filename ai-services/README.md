# AI Services - ATLAS Platform

Python microservices for AI-powered analytics and quality assessment.

## Services

### 1. Session Engagement Analyzer
Analyzes session transcripts or videos to extract engagement insights.

**Input:**
- Session transcript (text)
- Session video URL (optional)

**Output:**
- Engagement score (0-100)
- Engagement curve over time
- Drop-off timestamps
- Participation density
- Topic engagement spikes

### 2. Discussion Quality Evaluator
Evaluates discussion posts for relevance, originality, and depth.

**Input:**
- Discussion prompt
- User response text

**Output:**
- Quality score (0-100)
- Relevance rating
- Originality rating
- Depth rating
- Suggested point range

### 3. Skimming Pattern Detector
Detects suspicious engagement patterns indicating skimming behavior.

**Input:**
- User engagement events
- Resource completion history
- Time-based patterns

**Output:**
- Skimming confidence (0-100)
- Pattern flags
- Anomaly descriptions
- Admin action recommendations

## Tech Stack

- **FastAPI** - Python web framework
- **OpenAI API / Anthropic API** - GPT-4 or Claude 3.5 Haiku for analysis
- **LangChain** - LLM orchestration (optional)
- **Pydantic** - Data validation
- **Redis** - Caching results
- **Docker** - Containerization

## Directory Structure

```
ai-services/
├── session-analyzer/
│   ├── app/
│   │   ├── api/          # FastAPI routes
│   │   ├── services/     # Business logic
│   │   ├── models/       # Pydantic models
│   │   └── utils/        # Helpers
│   ├── requirements.txt
│   ├── Dockerfile
│   └── main.py
├── discussion-quality/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── main.py
├── skimming-detector/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── main.py
└── docker-compose.yml
```

## Getting Started

### Prerequisites
- Python 3.10+
- OpenAI API key
- Redis (for caching)

### Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your OpenAI API key

# Run service
python main.py
```

### Docker Setup

```bash
# Build and run all services
docker-compose up --build

# Run specific service
docker-compose up session-analyzer
```

## Environment Variables

```env
# AI Provider Configuration
AI_MODEL_PROVIDER="anthropic"  # Options: "openai", "anthropic"
AI_MODEL_NAME="claude-3-5-haiku-20241022"  # For Anthropic: claude-3-5-haiku-20241022, claude-3-5-sonnet-20241022

# API Keys (provide one based on provider)
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Redis
REDIS_URL="redis://localhost:6379"

# Model Parameters
TEMPERATURE=0.3
MAX_TOKENS=1000
```

## API Endpoints

### Session Analyzer
- `POST /api/analyze/session` - Analyze session transcript/video
- `GET /api/analyze/session/:id` - Get cached analysis

### Discussion Quality
- `POST /api/evaluate/discussion` - Evaluate discussion quality
- `GET /api/evaluate/discussion/:id` - Get cached evaluation

### Skimming Detector
- `POST /api/detect/skimming` - Detect skimming patterns
- `GET /api/detect/skimming/:userId` - Get user skimming history

## Usage Example

### Session Analysis

```python
# Request
POST /api/analyze/session
{
  "session_id": "uuid",
  "transcript": "Full session transcript...",
  "metadata": {
    "duration_minutes": 150,
    "attendance_count": 45
  }
}

# Response
{
  "engagement_score": 78,
  "engagement_curve": [
    {"timestamp": 0, "level": 85},
    {"timestamp": 30, "level": 72},
    ...
  ],
  "dropoff_points": [
    {"timestamp": 45, "severity": "high", "description": "Major drop during Q&A"}
  ],
  "participation_density": {
    "high": [0, 30],
    "medium": [30, 90],
    "low": [90, 150]
  },
  "summary": "Strong engagement in first half..."
}
```

### Discussion Quality

```python
# Request
POST /api/evaluate/discussion
{
  "prompt": "What are the key challenges...",
  "response": "In my experience, the main challenges are...",
  "min_words": 100
}

# Response
{
  "quality_score": 82,
  "relevance": 90,
  "originality": 75,
  "depth": 80,
  "suggested_points": 18,
  "reasoning": "Response demonstrates clear understanding..."
}
```

## AI Prompts

### Session Analysis Prompt Template
```
Analyze the following session transcript and provide:
1. Overall engagement score (0-100)
2. Engagement curve with timestamps
3. Key drop-off points and reasons
4. Participation patterns
5. Topic-level engagement

Transcript: {transcript}
Session metadata: {metadata}
```

### Discussion Quality Prompt Template
```
Evaluate this discussion response based on:
1. Relevance to prompt (0-100)
2. Originality of thought (0-100)
3. Depth of analysis (0-100)

Prompt: {prompt}
Response: {response}

Provide quality score and reasoning.
```

## Caching Strategy

- Cache analysis results in Redis for 24 hours
- Use content hash as cache key
- Invalidate on manual admin override

## Error Handling

- Graceful degradation if OpenAI API fails
- Fallback to rule-based scoring
- Log all errors for admin review
- Never block user flow

## Features to Implement

- [ ] Session engagement analyzer
- [ ] Discussion quality evaluator
- [ ] Skimming pattern detector
- [ ] OpenAI API integration
- [ ] Redis caching
- [ ] Error handling and fallbacks
- [ ] API rate limiting
- [ ] Logging and monitoring
- [ ] Docker containerization

## Security

- API key rotation
- Rate limiting per backend service
- Input sanitization
- No PII logging
- Secure environment variables

## Monitoring

- Track API usage and costs
- Monitor response times
- Log analysis accuracy (when admin overrides)
- Alert on failures
