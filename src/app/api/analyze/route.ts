import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface DamageItem {
  area: string;
  type: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  estimatedCost: number;
  confidence: number;
}

interface InconsistencyFlag {
  type: 'color_mismatch' | 'model_mismatch' | 'multiple_vehicles' | 'vin_mismatch' | 'other';
  description: string;
  severity: 'warning' | 'critical';
  confidence: number;
}

interface AnalysisResult {
  hasDamage: boolean;
  damages: DamageItem[];
  overallSeverity: 'None' | 'Minor' | 'Moderate' | 'Severe';
  totalEstimate: number;
  laborHours: number;
  partsRequired: string[];
  aiConfidence: number;
  recommendations: string[];
  summary: string;
  // Fraud/inconsistency detection
  hasInconsistencies: boolean;
  inconsistencies: InconsistencyFlag[];
}

export async function POST(request: NextRequest) {
  try {
    const { images, vehicleInfo } = await request.json();

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Build the image content for Claude
    const imageContent: Anthropic.ImageBlockParam[] = images.map((img: { base64: string; mediaType: string }) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: img.base64,
      },
    }));

    const systemPrompt = `You are an expert automotive damage assessor for an insurance company. Your job is to analyze vehicle damage photos, provide accurate assessments, AND detect potential fraud or inconsistencies.

You must respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "hasDamage": boolean,
  "summary": "Brief 1-2 sentence summary of findings",
  "damages": [
    {
      "area": "Specific part name (e.g., Front Bumper, Hood, Left Fender)",
      "type": "Type of damage (e.g., Dent, Scratch, Crack, Crumple)",
      "severity": "Minor" | "Moderate" | "Severe",
      "estimatedCost": number (USD estimate for repair),
      "confidence": number (0-100, your confidence in this assessment)
    }
  ],
  "overallSeverity": "None" | "Minor" | "Moderate" | "Severe",
  "laborHours": number (estimated repair hours),
  "partsRequired": ["list of parts that may need replacement"],
  "recommendations": ["list of 2-3 recommendations for the claims agent"],
  "hasInconsistencies": boolean,
  "inconsistencies": [
    {
      "type": "color_mismatch" | "model_mismatch" | "multiple_vehicles" | "vin_mismatch" | "other",
      "description": "Clear description of what was detected",
      "severity": "warning" | "critical",
      "confidence": number (0-100)
    }
  ]
}

FRAUD/INCONSISTENCY DETECTION (IMPORTANT):
When analyzing multiple images, carefully check for:
- Different vehicle colors across photos (color_mismatch) - CRITICAL if obvious
- Different vehicle makes/models across photos (model_mismatch) - CRITICAL
- Photos clearly showing different vehicles (multiple_vehicles) - CRITICAL
- Vehicle doesn't match the claimed make/model/year (vin_mismatch) - WARNING or CRITICAL
- Any other suspicious inconsistencies (other)

Set hasInconsistencies to true if ANY inconsistencies are detected. Even if damage is present, flag inconsistencies.
For critical inconsistencies, add a recommendation to halt processing and investigate.

DAMAGE ASSESSMENT Guidelines:
- If the vehicle shows NO damage (new car, clean condition), set hasDamage to false and return empty damages array
- Be conservative with estimates - real repair costs for reference:
  - Minor scratch/scuff: $150-400
  - Small dent: $200-500
  - Bumper repair: $300-700
  - Bumper replacement: $500-1500
  - Fender repair: $400-800
  - Hood repair: $500-1000
  - Headlight replacement: $300-800
- Labor rate: approximately $85/hour
- Set confidence lower (60-75%) if image quality is poor or damage is ambiguous
- Set confidence higher (85-95%) for clear, obvious damage`;

    const userPrompt = vehicleInfo
      ? `Analyze these images of a ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model} for vehicle damage. If there is no visible damage, clearly state that.`
      : `Analyze these vehicle images for damage. If there is no visible damage, clearly state that.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      system: systemPrompt,
    });

    // Extract text response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON response
    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(textContent.text);
    } catch {
      console.error('Failed to parse Claude response:', textContent.text);
      throw new Error('Invalid response format from AI');
    }

    // Calculate totals
    const totalEstimate = analysis.damages.reduce((sum, d) => sum + d.estimatedCost, 0) +
                          (analysis.laborHours * 85);
    const avgConfidence = analysis.damages.length > 0
      ? Math.round(analysis.damages.reduce((sum, d) => sum + d.confidence, 0) / analysis.damages.length)
      : 95; // High confidence for "no damage" assessments

    return NextResponse.json({
      ...analysis,
      totalEstimate,
      aiConfidence: avgConfidence,
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
