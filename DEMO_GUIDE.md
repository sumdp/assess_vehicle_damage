# ClaimAssist AI - Demo Guide

## Quick Start Demo

```bash
npm install && npm run dev
```
Open http://localhost:3000 - Test mode works without an API key.

---

## Demo Walkthrough (5-7 minutes)

### Introduction (30 seconds)

> "ClaimAssist AI automates vehicle damage assessment for insurance claims. It uses computer vision to analyze damage photos, estimate repair costs, and route claims for approval - while keeping agents in control at every step."

### Setup

1. Open the app at http://localhost:3000
2. Ensure "Test" mode is enabled (toggle in header)
3. Point out the workflow progress bar at the top

---

### Step 1: Claim Intake (1 minute)

**Actions:**
- Fill in the claim form with sample data:
  - Policy #: `POL-2024-78432`
  - Select vehicle: 2022 Toyota Camry
  - Accident date: Today
  - Description: "Rear-ended at stoplight"

**Key message:**
> "Simple data capture ensures we have context for accurate AI analysis. Vehicle make/model/year affects parts pricing."

---

### Step 2: Photo Upload (1 minute)

**Actions:**
- Drag and drop 2-3 damage photos (or click to browse)
- Show the image preview grid
- Point out the remove button on each image

**Key message:**
> "Quality control happens here - the agent validates photos before AI processing. Bad photos get flagged early."

---

### Step 3: AI Analysis (2 minutes)

**Actions:**
- Click "Analyze Images" to trigger AI processing
- Show the loading state (2-3 seconds in test mode)

**What to highlight in results:**

1. **Damage Detection**
   - Each damaged component is listed with severity
   - Color-coded severity indicators (green/yellow/red)

2. **Confidence Scores**
   - Per-item confidence percentages
   - Visual indicators: green (>85%), blue (70-85%), amber (50-70%), red (<50%)

3. **Cost Breakdown**
   - Parts cost per component
   - Labor hours and rates
   - Total estimate with range

**Key message:**
> "The AI doesn't just detect damage - it explains its confidence. Agents know exactly where to focus their review."

---

### Step 4: Human-in-the-Loop (Optional Demo)

**To demonstrate low-confidence flow:**
1. Use test mode controls to set confidence below 70%
2. Re-run analysis
3. Show the "Mark Damage Locations" prompt
4. Click on image to place numbered markers
5. Submit for re-analysis

**Key message:**
> "When AI isn't confident, it asks for help rather than guessing. This is human-AI collaboration, not automation."

---

### Step 5: Agent Review & Override (2 minutes)

**Actions:**
1. Show the damage breakdown table
2. Toggle "Manual Override" on one item
3. Enter an adjusted cost
4. Add a reason: "Parts pricing outdated for this region"
5. Add agent notes in the global notes field

**What to highlight:**
- Every override requires a reason (audit trail)
- Original AI estimate vs. adjusted amount shown side-by-side
- Notes carry through to final confirmation

**Key message:**
> "AI suggests, humans decide. Agents can accept, adjust, or override any assessment with full transparency."

---

### Step 6: Approval Routing (1 minute)

**Actions:**
- Click "Approve Claim" (or "Escalate to Senior Adjuster")
- Show the confirmation screen

**What to highlight:**
- Claims over $5,000 or with severe damage auto-flag for senior review
- Complete audit trail visible
- Next steps clearly displayed

**Key message:**
> "High-value claims get additional oversight automatically. The system enforces your business rules."

---

## Key Talking Points

### Product Vision
> "We're not replacing claims agents - we're making them 10x more efficient while maintaining their expertise and judgment."

### Human-AI Collaboration Model
| AI Does | Human Does |
|---------|------------|
| Detects damage components | Validates detection accuracy |
| Estimates severity | Applies domain expertise |
| Calculates costs | Adjusts for edge cases |
| Flags uncertainties | Makes final decisions |
| Maintains audit trail | Provides accountability |

### Business Impact (Projected)
- **75% faster**: 20 min → 5 min per claim
- **2x throughput**: Process 40 claims/day instead of 20
- **Consistent quality**: AI baseline reduces variance between agents
- **Full compliance**: Every decision logged for audit

---

## Handling Common Questions

### "What if the AI is wrong?"

> "That's exactly why we have confidence scores and mandatory agent review. The AI knows its limitations - low confidence triggers human input. Agents can always override with documented reasoning."

### "Will this replace claims agents?"

> "No - it makes them more efficient. Agents become claim analysts who handle exceptions and complex cases, not data entry clerks processing routine claims. Think augmentation, not automation."

### "How accurate is the AI?"

> "We target >85% accuracy with the confidence scoring ensuring agents know when to scrutinize. The system learns from agent corrections over time."

### "What about fraud detection?"

> "This prototype focuses on legitimate claims processing. The audit trail we build - storing all images, decisions, and confidence scores - provides the foundation for fraud detection in a future phase."

### "What about regulatory compliance?"

> "Human oversight is mandatory by design. Every estimate requires agent approval. Complete audit trails support regulatory review."

---

## Test Mode Controls

When in Test mode, use these controls on the Assessment page:

| Control | What it does |
|---------|--------------|
| **Damage Toggle** | Enable/disable damage detection |
| **Confidence Slider** | Set AI confidence (below 70% triggers human input) |
| **Severity Selector** | Choose Minor/Moderate/Severe |

This lets you demonstrate:
- Happy path (high confidence, auto-approve)
- Human-in-the-loop (low confidence, manual markup)
- Escalation flow (severe damage, high value)

---

## Demo Tips

### Do
- Start with the problem: "Manual claims take 30+ minutes"
- Walk through the actual prototype, don't just talk
- Emphasize human oversight at every step
- Connect features to business value
- Show the audit trail prominently

### Don't
- Say "AI will replace agents"
- Claim "100% accuracy" or "fully automated"
- Skip the confidence score explanation
- Rush through the override feature
- Forget to mention Test vs Live mode

---

## Technical Notes for Deep-Dive Questions

**Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Claude Vision API

**Architecture:**
- Frontend captures claim data and images
- API route sends images to Claude Vision for analysis
- Structured JSON response parsed into damage assessment
- Agent review layer for human oversight
- Approval routing based on configurable thresholds

**Production considerations discussed in PRD:**
- Async job queues for scale
- GPU instances for CV inference
- Database for audit trail
- MLOps for model monitoring
- Feedback loop for continuous improvement

---

**Remember:** The agent is the hero, AI is the sidekick. Frame everything around empowering agents, not replacing them.
