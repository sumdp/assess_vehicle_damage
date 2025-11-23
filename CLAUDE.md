# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is an AI-powered car insurance claims assessment prototype for a take-home assignment. The goal is to automate the manual review and damage assessment workflow for claims agents.

**Target User:** Claims agents (not policyholders)

**Core Workflow to Automate:**
1. Claims agent receives damage photos/videos from policyholder
2. AI analyzes images and generates preliminary damage assessment
3. AI estimates repair costs (referencing repair cost databases)
4. Claims agent reviews, adjusts, and approves the assessment
5. Senior adjuster authorizes repairs

## Recommended Tech Stack

For rapid prototyping within 3-4 hours:
- **Frontend:** Next.js with React (or simple HTML/JS)
- **Styling:** Tailwind CSS (functional over polished)
- **AI Integration:** Claude API with vision capabilities for image analysis
- **Backend:** Next.js API routes or simple Express server

## Development Commands

Once the project is set up with Next.js:
```bash
npm install          # Install dependencies
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Run production build
```

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claims Agent   │────▶│  Claim Initiation │────▶│  Image Upload   │
│     (User)      │     │      Form         │     │   Component     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Agent Review   │◀────│  Assessment      │◀────│  AI Analysis    │
│  & Approval     │     │  Display         │     │  (Vision API)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Key Components:**
- `ClaimForm` - Capture policy number, accident details
- `ImageUploader` - Handle damage photo uploads with preview
- `DamageAnalysis` - Display AI-generated assessment (damage type, severity, affected parts)
- `CostEstimate` - Show repair cost breakdown
- `AgentReview` - Allow agent to adjust and approve assessment

## Human-AI Interaction Model

The AI serves as an assistant, not a decision-maker:
- AI generates preliminary assessment with confidence scores
- Agent can override any AI recommendation
- High-value claims (>$X threshold) require senior adjuster review
- All AI assessments are logged for audit trail

## Constraints

- **Time:** 3-4 hours maximum
- **Focus:** UX over UI polish
- **Scope:** Core workflow only; document additional features in PRD
- **AI responses:** Can be mocked if real integration not completed
