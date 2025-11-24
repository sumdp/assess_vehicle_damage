# ClaimAssist AI

An AI-powered vehicle damage assessment prototype for insurance claims processing. Built with Next.js and Claude Vision API.

============================================================================================================================

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

============================================================================================================================
## ClaimAssist Overview

ClaimAssist AI streamlines the insurance claims workflow by:

- Allowing claims agents to capture policy and vehicle information
- Uploading and processing vehicle damage photos
- Using AI (Claude Vision) to analyze damage and generate cost estimates
- Supporting human-in-the-loop review for low-confidence assessments
- Enabling agent review, cost adjustments, and approval routing

## Features

- **Smart Claim Form**: Dropdown selectors for vehicle make/model/year with 16+ manufacturers
- **Drag-and-Drop Image Upload**: Supports JPG, PNG, HEIC, AVIF (auto-converts unsupported formats)
- **AI Damage Assessment**: Real-time analysis using Claude Vision API
- **Transparent AI Confidence**: Per-damage confidence scores with visual indicators
- **Manual Override System**: Checkbox toggle to adjust AI-estimated costs with reason tracking
- **Human-in-the-Loop**: Interactive damage marking when AI confidence is low (<70%)
- **Test/Live Mode Toggle**: Switch between simulated responses and live API calls
- **Test Mode Controls**: Configurable confidence, severity, and damage detection for testing
- **Agent Review Dashboard**: Adjust costs, add notes, view damage breakdown
- **Approval Routing**: Automatic escalation for high-value claims (>$2,000) or severe damage

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **AI**: Anthropic Claude Vision API
- **Runtime**: React 19

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd assess-vehicular_damage
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Add your Anthropic API key to `.env.local`:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

### Running the App

**Development mode:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Production build:**
```bash
npm run build
npm start
```

## Usage

### Live Mode (Default)
1. Toggle to "Live" in the header
2. Fill out the claim form with policy and vehicle details
3. Upload damage photos (supports multiple images)
4. AI analyzes images and generates damage assessment
5. Review and adjust costs as needed
6. Approve or escalate the claim

### Test Mode
1. Toggle to "Test" in the header (shows "Demo Mode" badge)
2. Use test controls on the assessment page:
   - **Damage Toggle**: Enable/disable damage detection
   - **Confidence Slider**: Set AI confidence (below 70% triggers human input)
   - **Severity Selector**: Choose Minor/Moderate/Severe
3. Experience the full workflow with simulated data

### Human-in-the-Loop Flow
When AI confidence is below 70%:
1. You'll see a prompt to mark damage locations
2. Click on the image(s) to place numbered markers
3. Submit markers to re-analyze with improved accuracy
4. Or skip to use the original AI assessment

### Manual Override for Cost Adjustments
Each damage item in the assessment shows:
1. **Confidence Score**: Visual indicator (green/blue/amber/red) showing AI certainty
2. **Manual Override Checkbox**: Enable to adjust the AI-estimated cost
3. **Adjusted Cost Input**: Enter the corrected amount
4. **Reason Field**: Document why the adjustment was made
5. **Agent Notes**: Global notes section for audit purposes (appears when any override is active)

Overrides are carried through to the Agent Review step and tracked for transparency.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts      # Claude Vision API endpoint
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main workflow orchestrator
├── components/
│   ├── ClaimForm.tsx         # Policy & vehicle info form
│   ├── ImageUploader.tsx     # Drag-drop image upload
│   ├── DamageAssessment.tsx  # AI analysis & human feedback
│   ├── AgentReview.tsx       # Cost adjustment & approval
│   └── ClaimConfirmation.tsx # Success & next steps
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Yes (for Live mode) |

### Thresholds

- **Low Confidence Threshold**: 70% (triggers human input request)
- **Senior Approval Threshold**: $5,000 or Severe damage classification

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add `ANTHROPIC_API_KEY` environment variable
4. Deploy

### Other Platforms

The app is a standard Next.js application and can be deployed to any platform supporting Node.js:
- AWS Amplify
- Railway
- Render
- Self-hosted with `npm run build && npm start`

## License

MIT
