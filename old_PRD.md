# Product Requirements Document: ClaimAssist AI

## Executive Summary

ClaimAssist AI is an AI-powered vehicle damage assessment tool that augments insurance claims agents by automating the analysis of damage photos, generating cost estimates, and streamlining the approval workflow. The system is designed to reduce claim processing time by 75% while maintaining human oversight at every decision point.

---

## 1. Vision

### Problem Statement

Insurance claims agents currently spend 15-30 minutes per claim manually reviewing damage photos, cross-referencing repair cost databases, and generating estimates. This process is:
- **Time-intensive**: High-volume periods create backlogs
- **Inconsistent**: Estimates vary between agents by 20-30%
- **Error-prone**: Manual data entry and lookup increase mistakes

### Product Vision

ClaimAssist AI transforms claims agents from data processors into decision-makers. The AI handles the repetitive analysis work—identifying damage, estimating costs, flagging anomalies—while agents apply expertise to validate, adjust, and approve assessments.

**Design Principle**: AI suggests, humans decide. The agent always has final authority.

### Goals

1. **Efficiency**: Reduce average claim processing time from 20 minutes to 5 minutes
2. **Consistency**: Establish AI-generated baselines that reduce inter-agent variance
3. **Accuracy**: Achieve 85%+ of estimates within ±15% of actual repair costs
4. **Trust**: Provide transparent confidence scoring so agents know when to scrutinize

---

## 2. User Stories

### Primary Persona: Claims Agent

| ID | User Story | Priority |
|----|------------|----------|
| US-1 | As a claims agent, I want to upload multiple damage photos so that the AI can analyze all angles of the vehicle | P0 |
| US-2 | As a claims agent, I want to see per-damage confidence scores so that I know which assessments need closer review | P0 |
| US-3 | As a claims agent, I want to override AI cost estimates with documented reasoning so that I can apply domain expertise | P0 |
| US-4 | As a claims agent, I want low-confidence assessments to prompt me for input so that I can help the AI improve its analysis | P0 |
| US-5 | As a claims agent, I want high-value claims automatically flagged for senior review so that approval authority is enforced | P1 |
| US-6 | As a claims agent, I want to export claim summaries as PDF so that I can share them with adjusters and policyholders | P1 |
| US-7 | As a claims agent, I want a test mode so that I can explore the system without consuming API credits | P1 |
| US-8 | As a claims agent, I want to see fraud/inconsistency flags so that suspicious claims are surfaced early | P2 |

### Secondary Persona: Senior Adjuster

| ID | User Story | Priority |
|----|------------|----------|
| US-9 | As a senior adjuster, I want to see which claims were escalated and why so that I can prioritize my review queue | P1 |
| US-10 | As a senior adjuster, I want a complete audit trail of AI assessments and agent overrides so that I can validate decisions | P1 |

---

## 3. Key Features

### 3.1 Claim Intake Form
Captures policy number, vehicle details (year/make/model), accident date, and description. Vehicle selectors include 16+ manufacturers with model/trim dropdowns for accurate parts pricing context.

### 3.2 Image Upload & Processing
- Drag-and-drop interface supporting JPG, PNG, HEIC, AVIF formats
- Automatic conversion of unsupported formats (HEIC → JPEG)
- Multi-image upload for comprehensive damage documentation
- Image preview with removal capability

### 3.3 AI Damage Assessment
- **Component Detection**: Identifies damaged parts (bumper, hood, fender, headlight, etc.)
- **Severity Classification**: Categorizes as Minor, Moderate, or Severe
- **Cost Estimation**: Calculates parts + labor costs using industry-standard rates
- **Confidence Scoring**: Per-damage confidence percentages (0-100%)
- **Inconsistency Detection**: Flags potential fraud indicators (color mismatch, multiple vehicles, model discrepancies)

### 3.4 Human-in-the-Loop Workflow
When AI confidence falls below 70%:
1. System prompts agent to mark damage locations on images
2. Agent clicks to place numbered markers
3. Markers provide additional context for re-analysis
4. Agent can skip to use original assessment if preferred

### 3.5 Manual Override System
- Toggle override on any damage item
- Enter adjusted cost with required reason
- Original vs. adjusted amounts displayed side-by-side
- Overrides tracked in audit trail

### 3.6 Agent Review Dashboard
- Complete damage breakdown with costs
- Inline cost adjustment capability
- Agent notes field for documentation
- Approval routing indicator (agent vs. senior)

### 3.7 Approval Routing
- Claims ≤$5,000 with Minor/Moderate severity: Agent approval
- Claims >$5,000 OR Severe damage: Senior adjuster escalation
- Configurable thresholds

### 3.8 Confirmation & Export
- Final claim summary with all details
- Processing time metrics and efficiency gains
- PDF export for records and communication
- Analytics dashboard with aggregate metrics

### 3.9 Test Mode
- Toggle between Live (API) and Test (simulated) modes
- Configurable test controls: confidence level, severity, damage detection
- Enables demonstration and training without API costs

---

## 4. Prioritization Rationale

### P0 (Must Have) — Core Value Proposition
- **Image upload + AI analysis**: Without this, there's no product
- **Confidence scoring**: Builds trust and guides agent attention
- **Manual override**: Ensures human control; non-negotiable for compliance
- **Human-in-the-loop**: Handles AI uncertainty gracefully

### P1 (Should Have) — Operational Necessities
- **Approval routing**: Enforces business rules for authorization
- **PDF export**: Required for downstream workflows
- **Test mode**: Essential for demos, training, and development

### P2 (Nice to Have) — Future Enhancements
- **Fraud detection**: Valuable but requires more data and validation
- **Analytics dashboard**: Useful for optimization but not launch-critical

### Excluded from MVP
- **VIN decoder integration**: Adds complexity; vehicle selector suffices
- **Historical claim lookup**: Requires database infrastructure
- **Mobile app**: Web-first approach for faster iteration

---

## 5. Success Metrics

### Efficiency KPIs

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Average processing time | 20 min | 5 min | Timestamp difference: claim start → approval |
| Claims processed per agent per day | 20 | 40 | Daily claim count / active agents |
| Time to first assessment | 15 min | 30 sec | Timestamp: image upload → AI results displayed |

### Accuracy KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Estimate accuracy | 85% within ±15% of actual | Compare AI estimate to final repair invoice |
| Override rate | 15-25% | (Claims with overrides / total claims) |
| False positive rate (fraud flags) | <5% | Manual review of flagged claims |

### Adoption KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Agent adoption rate | 90% within 30 days | Active agents using system / total agents |
| Workflow completion rate | >95% | Claims completed / claims started |
| Test mode → Live mode conversion | 80% | Agents who transition after training |

### Quality KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Agent satisfaction (NPS) | >50 | Quarterly survey |
| Escalation accuracy | 95%+ | Senior adjusters agree with escalation decision |
| Audit compliance | 100% | All decisions have documented trail |

---

## 6. AI Integration

### 6.1 Technical Approach

**Model**: Claude Vision API (claude-sonnet-4)

**Input**:
- Multiple vehicle damage images (base64 encoded)
- Vehicle context (year, make, model) for accurate parts pricing

**Output** (structured JSON):
```json
{
  "hasDamage": true,
  "damages": [
    {
      "area": "Front Bumper",
      "type": "Crack",
      "severity": "Moderate",
      "estimatedCost": 850,
      "confidence": 87
    }
  ],
  "overallSeverity": "Moderate",
  "laborHours": 4.5,
  "partsRequired": ["Front bumper cover", "Mounting brackets"],
  "recommendations": ["Inspect for hidden damage behind bumper"],
  "hasInconsistencies": false,
  "inconsistencies": []
}
```

**Cost Calculation**:
- Parts cost: Per-component estimate from AI
- Labor: Hours × $85/hour (configurable regional rate)
- Total: Parts + Labor + applicable adjustments

**Confidence Scoring**:
- Per-damage confidence based on image clarity and damage visibility
- Aggregate confidence: weighted average across all damage items
- Thresholds: <70% = low (human input requested), 70-85% = medium, >85% = high

### 6.2 Human-AI Interaction Model

The system implements a **confidence-based workflow** that adapts agent involvement to AI certainty:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI CONFIDENCE LEVEL                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   HIGH (≥85%)   │  MEDIUM (70-84%)│      LOW (<70%)             │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ Quick review    │ Standard review │ Human-in-the-loop           │
│ ~15 seconds     │ ~2 minutes      │ Agent marks damage          │
│ Approve/adjust  │ Validate costs  │ AI re-analyzes with input   │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

**Key Principles**:

1. **AI Never Auto-Approves**: Every claim requires explicit agent action
2. **Transparency**: Confidence scores visible for each damage item
3. **Graceful Degradation**: Low confidence triggers assistance request, not failure
4. **Learning Loop**: Agent overrides feed back to improve future assessments
5. **Audit Trail**: Every AI assessment and human decision is logged

### 6.3 Interaction Flow

```
Agent uploads photos
        │
        ▼
   AI analyzes images
        │
        ├── Confidence ≥ 85% ──────► Display results
        │                            Agent reviews (15s)
        │                            Approve or adjust
        │
        ├── Confidence 70-84% ─────► Display results with caution
        │                            Agent validates each item
        │                            Override as needed
        │
        └── Confidence < 70% ──────► Prompt: "Mark damage locations"
                                     Agent clicks on images
                                     AI re-analyzes with markers
                                     Agent reviews improved results
```

### 6.4 Ethical Considerations

| Concern | Mitigation |
|---------|------------|
| **Bias in estimates** | Regular audits comparing AI estimates across vehicle types and demographics |
| **Over-reliance on AI** | Mandatory human approval; no auto-processing |
| **Transparency** | Confidence scores and reasoning visible to agents |
| **Accountability** | Complete audit trail; AI is advisory, human is accountable |
| **Data privacy** | Images processed in real-time, not stored permanently; PII handling per policy |
| **Job displacement** | Positioned as augmentation; agents handle more claims, not fewer agents |

### 6.5 Future AI Enhancements (Post-MVP)

1. **Continuous Learning**: Feed agent overrides back into model fine-tuning
2. **Fraud Detection Model**: Train on historical fraud data for anomaly detection
3. **Multi-Modal Analysis**: Incorporate video for dynamic damage assessment
4. **Predictive Routing**: Predict which claims will need escalation before analysis
5. **Regional Cost Adjustment**: Auto-adjust estimates based on geographic labor rates

---

## 7. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  Next.js 15 + React 19 + TypeScript + Tailwind CSS              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ClaimForm │ │ImageUpload│ │Assessment│ │AgentReview│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
│  Next.js API Routes                                              │
│  /api/analyze - Claude Vision integration                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│  Anthropic Claude Vision API (claude-sonnet-4)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI accuracy below target | High | Medium | Human override system; iterative model improvement |
| Agent resistance to adoption | High | Medium | Training program; emphasize augmentation not replacement |
| API rate limits/costs | Medium | Low | Test mode reduces usage; caching for repeated analyses |
| Compliance concerns | High | Low | Complete audit trail; human-in-the-loop by design |

---

## 9. Timeline & Phases

### Phase 1: MVP (Completed)
- Core workflow: claim intake → image upload → AI analysis → agent review → approval
- Human-in-the-loop for low confidence
- Manual override with audit trail
- Test/Live mode toggle
- PDF export

### Phase 2: Operational (Future)
- Database persistence for claims
- User authentication and RBAC
- Senior adjuster queue management
- Analytics dashboard expansion
- API rate limiting and caching

### Phase 3: Intelligence (Future)
- Fraud detection model
- Continuous learning from overrides
- Regional cost adjustment
- Historical claim lookup
- Integration with claims management systems
