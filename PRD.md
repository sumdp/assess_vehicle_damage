# Product Requirements Document: ClaimAssist AI

## 1. Vision & Goals

**Problem**: Claims agents spend 15-30 minutes per claim manually reviewing damage photos and generating estimates -- a process that's time-intensive, inconsistent across agents, and error-prone.

**Vision**: ClaimAssist AI augments claims agents by automating damage analysis and cost estimation while keeping humans in control of every decision. Ambitious but possible! 

**Goals**:
- **Automation**: 85% of straightforward claims (high-confidence) require minimal agent intervention
- **Speed**: Reduce claim processing time by 70% (20 min → 6 min)
- **Accuracy**: 90% of cost estimates within ±15% of final shop quotes
- **Experience**: Faster turnaround and transparent processes improve customer satisfaction
- **Control**: Human oversight for complex cases; auto-approval for high-confidence, low-value claims

---

## 2. Users & Stories

### Primary Users

- **Laura** (Senior Adjuster, 8 years): Processes 15-20 claims daily. High-performing operator who needs speed.
- **Matteo** (Junior Agent, 6 months): Still learning damage patterns. "I'm still uncertain quite often."
- **Nadia** (Claims Manager, 12 years): Oversees team quality and performance.

### User Stories

| User | Priority | Story |
|:----|:---:|:------|
| Laura | P0 | "I want confidence scores on estimates so I can approve high-certainty claims in 20 seconds and dig deeper on uncertain ones. Days are long, we have to prioritize!" |
| Matteo | P0 | "I need AI to flag damaged components with severity levels so I can learn patterns while focusing review time on ambiguous cases." |
| Laura | P0 | "I want detailed cost breakdowns (parts, labor, confidence) so I can explain the $1,800 bumper estimate to the customer in 3 minutes instead of 15." |
| Nadia | P0 | "I want my team to override AI decisions with documented reasoning so the system learns from our expertise and improves accuracy over time." |
| Matteo | P0 | "When AI isn't confident, I want it to ask me for help marking damage so I can contribute to a better result." |
| Laura | P1 | "High-value claims should auto-flag for senior review so approval authority is enforced." |
| Nadia | P2 | "I want fraud/inconsistency flags so suspicious claims surface early." |

---

## 3. Key Features

| Feature | Description |
|---------|-------------|
| **Image Upload** | Drag-and-drop, multi-image, supports JPG/PNG/HEIC/AVIF |
| **AI Damage Assessment** | Detects damaged components, classifies severity, estimates costs |
| **Confidence Scoring** | Per-damage confidence (0-100%) with visual indicators |
| **Human-in-the-Loop** | When confidence <70%, agent marks damage locations to improve analysis |
| **Manual Override** | Adjust any AI estimate with required reasoning; tracked in audit trail |
| **Approval Routing** | Claims >$5,000 or Severe damage escalate to senior adjuster |
| **Basic Fraud Detection** | Flags vehicle inconsistencies or highlights when no damage present |
| **Test Mode** | Simulated responses for demos/training without API costs |

---

## 4. Prioritization Rationale

| Priority | Feature | Rationale |
|:--------:|---------|-----------|
| P0 | VIN lookup & AI damage assessment | Core value proposition. 100% reach, enables all downstream features. |
| P0 | Automated cost estimation | Primary ROI driver. Eliminates manual estimate calculation. |
| P0 | Confidence scoring & agent oversight | Essential for trust, compliance, and accuracy. Prevents automation failures; human-in-the-loop defines core value proposition and ensures compliance. |
| P1 | Basic fraud detection included in MVP | Extensive fraud scoring requires more training data and validation.|
| P1 | Historical claims data integration | Improves model accuracy through learning. Medium complexity. |
| P2 | Extensive fraud detection scoring | High value but requires extensive training data. Complex implementation for non-trivial threat vectors. |

**P1 (Should Have)**: Approval routing and PDF export are operational necessities but not launch-blocking.

**P2 (Deferred)**: Basic fraud detection included in MVP; extensive fraud scoring requires more training data and validation.

---

## 5. Success Metrics

| Category | Metric | Target |
|----------|--------|--------|
| **Efficiency** | Processing time | 32 min → < 3 min |
| **Efficiency** | Automation rate (minimal intervention) | 85% |
| **Efficiency** | Cost per claim | 60% reduction |
| **Efficiency** | Claims volume per agent | +200% capacity |
| **Accuracy** | Estimates within ±15% of shop quote | 90% |
| **Accuracy** | Component detection precision | 95% |
| **Accuracy** | Agent override rate | < 15% |
| **Business** | Customer satisfaction (claim experience) | +20% improvement |
| **Business** | Agent adoption within 30 days | 90% |
| **Business** | Audit compliance | 100% documented |
| **Ethical** | Estimate variance across vehicle types | < 5% deviation |
| **Ethical** | Estimate variance across demographics | < 5% deviation |

---

## 6. AI Integration

### Technical Approach

**Model**: Claude Vision API (claude-sonnet-4)

**Input**: Vehicle context: VIN (year/make/model) + vehicle damage images

**Output**: Structured JSON with damages, severity, costs, confidence scores, and inconsistency flags

**Cost Calculation**: Parts (per-component) + Labor (hours × $85/hr)

### Human-AI Interaction Model

The system implements **supervised automation with escalation protocols**:

| HIGH (>=85%) | MEDIUM (70-84%) | LOW (<70%) |
|--------------|-----------------|------------|
| Auto-approved (if <=\$5K) | Standard review (~2 min) | Agent marks damage |
| No intervention | Validate costs | AI re-analyzes with input |

**Automated Processing (High Confidence >=85% + <=$5,000 + No Fraud Flags)** --- *Expected: 85% of claims*
- AI generates estimate and auto-approves without agent intervention
- System logs decision with full audit trail
- Estimate sent to customer immediately

**Agent-Assisted Review (Medium Confidence 70-85%)** --- *Expected: 12% of claims*
- AI provides initial assessment with highlighted uncertainties
- Agent reviews photos directly and adjusts estimate as needed
- System logs agent corrections for model retraining

**Manual Escalation (Low Confidence <70%)** --- *Expected: 3% of claims*
- System flags for full manual review
- Agent processes using traditional methods with AI insights as reference
- System learns from edge cases to improve detection boundaries

**Human Empowerment: Agent Override**
- Override any AI decision with documented reasoning
- Add components missed by AI
- Adjust severity classifications
- Manually input costs for rare/custom parts
- Flag images for model improvement

### Ethical Considerations

| Concern | Mitigation |
|---------|------------|
| Bias in estimates | Regular audits across vehicle types |
| Over-reliance on AI | Confidence-based routing ensures complex cases get human review |
| Accountability | Complete audit trail; human is accountable |
| Job displacement | Positioned as augmentation -- more claims per agent, not fewer agents |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI accuracy below target | Human override system; iterative improvement |
| Agent resistance | Training; emphasize augmentation not replacement |
| Compliance concerns | Audit trail; human-in-the-loop by design |
