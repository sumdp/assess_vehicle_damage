# Quick Start

Get ClaimAssist AI running in under 2 minutes.

## Prerequisites

- Node.js 18+
- Anthropic API key (optional - test mode works without it)

## Setup

```bash
# Clone and install
git clone git@github.com:sumdp/assess_vehicle_damage.git
cd assess_vehicle_damage
npm install

# Run
npm run dev
```

Open http://localhost:3000

## Test Mode (No API Key Required)

Toggle "Test" mode in the header to use simulated AI responses. This is the default - no API key needed. Useful for:
- Exploring the full UI and workflow
- Testing different confidence levels and severities
- Demonstrating the product

## Live Mode (Requires API Key)

To use real AI analysis:

```bash
cp .env.example .env.local
# Edit .env.local and add: ANTHROPIC_API_KEY=your_key_here
```

Get an API key at https://console.anthropic.com/

## What You'll See

1. **Claim Form** - Enter policy/vehicle details
2. **Image Upload** - Drag & drop damage photos
3. **AI Analysis** - View damage assessment with confidence scores
4. **Agent Review** - Adjust costs, add notes, approve/escalate
5. **Confirmation** - Final summary with next steps

## Key Features to Try

- **Low confidence flow**: In test mode, set confidence below 70% to trigger human-in-the-loop markup
- **Manual override**: Toggle override checkbox on any damage item to adjust costs
- **High-value escalation**: Claims over $5,000 or with severe damage route to senior adjuster

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API errors in Live mode | Verify `ANTHROPIC_API_KEY` in `.env.local` |
| Port in use | Kill process on 3000 or use `npm run dev -- -p 3001` |
| Images not uploading | Check file format (JPG, PNG, HEIC, AVIF supported) |
