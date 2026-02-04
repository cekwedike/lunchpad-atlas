# LaunchPad Fellowship Platform
## Analytics & AI Behavior Specification

---

## 1. Purpose of This Document

This document defines **how analytics are collected, interpreted, and augmented by AI** within the LaunchPad Fellowship platform. It exists to:
- Make engagement measurement explicit and explainable
- Prevent black-box AI decisions
- Ensure admin control and override
- Enable safe AI-assisted development

AI is **assistive**, not authoritative.

---

## 2. Analytics Philosophy

### 2.1 Core Principles

- Every score must be traceable to raw events
- AI suggests; humans decide
- Engagement is multidimensional, not binary
- Analytics never block learning access

---

## 3. Event Tracking System

### 3.1 Event Emission Rules

Every meaningful interaction emits an event:

Tracked events include:
- Resource opened
- Scroll depth reached
- Video playback started
- Video playback progress
- Video paused / resumed
- Resource marked complete
- Discussion submitted
- Comment submitted
- Quiz started
- Quiz submitted
- Session attendance ping
- Chat message sent

Each event includes:
- user_id
- event_type
- entity_type
- entity_id
- timestamp
- metadata (JSON)

Events are immutable.

---

## 4. Resource Engagement Analytics

### 4.1 Article Engagement Signals

Measured signals:
- Scroll depth percentage
- Time spent
- Scroll velocity anomalies

Completion qualification:
- ≥ 80% scroll depth
- ≥ 70% estimated time

---

### 4.2 Video Engagement Signals

Measured signals:
- Watch percentage
- Playback continuity
- Seek frequency

Completion qualification:
- ≥ 85% watched
- No abnormal skipping patterns

---

## 5. Skimming & Abuse Detection

### 5.1 Rule-Based Flags

Flag conditions:
- Completion under minimum time
- Multiple rapid completions
- Identical discussion submissions

Flag outcomes:
- Marked as suspicious
- Reduced future point allocation
- Admin notification

---

### 5.2 AI-Assisted Validation (Optional)

AI analyzes:
- Time-series behavior
- Completion pattern variance

AI outputs:
- Confidence score (0–100)
- Reason codes

Admins always have final say.

---

## 6. Discussion Quality Analysis

### 6.1 Rule-Based Validation

- Minimum word count
- Duplicate detection

---

### 6.2 AI Quality Signals (Advisory)

AI evaluates:
- Relevance to prompt
- Originality
- Depth of reasoning

AI outputs:
- Quality score
- Suggested point range

Admins can override.

---

## 7. Session Engagement Analytics

### 7.1 Input Sources

- Attendance logs
- Chat participation
- Poll responses
- Uploaded transcript or video

---

### 7.2 AI Session Analysis

AI extracts:
- Engagement curve over time
- Attention drop-off points
- Participation density
- Topic engagement spikes

Output:
- Engagement score (0–100)
- Key moments summary
- Drop-off timestamps

---

## 8. Admin Review & Overrides

Admins can:
- Adjust engagement scores
- Award session points manually
- Ignore AI recommendations

All overrides are logged.

---

## 9. Privacy & Ethics

- No biometric analysis
- No sentiment profiling
- No hidden scoring
- Fellows can view their own engagement summaries

---

## 10. Performance Considerations

- Event ingestion must be non-blocking
- AI analysis runs asynchronously
- Failures do not impact user flow

---

## 11. AI Failure Modes & Fallbacks

- If AI unavailable → rule-based scoring only
- If transcript unreadable → manual scoring

---

## 12. Transparency Requirements

Admins can view:
- Raw events
- AI outputs
- Final scores

Fellows can view:
- Their engagement status
- Completion reasons (high-level)

---

## 13. Next Document

**Non-Functional Requirements (NFR) Specification**

This will define performance, security, reliability, and scalability expectations.

