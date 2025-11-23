'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ClaimData } from './ClaimForm';
import { UploadedImage } from './ImageUploader';

interface DamageAssessmentProps {
  claimData: ClaimData;
  images: UploadedImage[];
  onContinue: (assessment: AssessmentResult) => void;
  onQuickApprove?: (assessment: AssessmentResult) => void;
  onBack: () => void;
  mode: 'live' | 'simulated';
}

export interface DamageItem {
  area: string;
  type: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  estimatedCost: number;
  confidence: number;
  // Detailed cost breakdown
  partsCost?: number;
  laborHours?: number;
  laborRate?: number;
}

export interface InconsistencyFlag {
  type: 'color_mismatch' | 'model_mismatch' | 'multiple_vehicles' | 'vin_mismatch' | 'other';
  description: string;
  severity: 'warning' | 'critical';
  confidence: number;
}

export interface AssessmentResult {
  claimId: string;
  overallSeverity: 'None' | 'Minor' | 'Moderate' | 'Severe';
  hasDamage: boolean;
  damages: DamageItem[];
  totalEstimate: number;
  laborHours: number;
  partsRequired: string[];
  aiConfidence: number;
  recommendations: string[];
  processingTime: number;
  summary?: string;
  humanAssisted?: boolean;
  // Manual override data
  manualOverrides?: ManualOverride[];
  overrideNotes?: string;
  // Fraud/inconsistency detection
  hasInconsistencies?: boolean;
  inconsistencies?: InconsistencyFlag[];
}

export interface ManualOverride {
  damageIndex: number;
  originalCost: number;
  adjustedCost: number;
  reason: string;
}

interface DamageMarker {
  x: number; // percentage
  y: number; // percentage
  imageIndex: number;
  description?: string;
}

// Confidence threshold for requesting human input
const LOW_CONFIDENCE_THRESHOLD = 70;
// Senior approval threshold
const SENIOR_APPROVAL_THRESHOLD = 5000;
// High confidence threshold for auto-approval
const HIGH_CONFIDENCE_THRESHOLD = 85;

// Supported image formats for Claude Vision API
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Convert image to a supported format using canvas
async function convertToSupportedFormat(file: File): Promise<{ blob: Blob; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, mediaType: 'image/jpeg' });
          } else {
            reject(new Error('Failed to convert image'));
          }
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// Convert file to base64, converting unsupported formats if needed
async function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  let targetFile: Blob = file;
  let mediaType = file.type || 'image/jpeg';

  if (!SUPPORTED_FORMATS.includes(mediaType)) {
    console.log(`Converting ${mediaType} to JPEG for API compatibility`);
    const converted = await convertToSupportedFormat(file);
    targetFile = converted.blob;
    mediaType = converted.mediaType;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(targetFile);
  });
}

// Labor rate constant
const LABOR_RATE = 115; // $115/hr (regional rate)

// Generate mock assessment with configurable parameters
function generateMockAssessment(
  claimData: ClaimData,
  imageCount: number,
  overrideConfidence?: number,
  overrideSeverity?: 'Minor' | 'Moderate' | 'Severe',
  hasDamageOverride?: boolean,
  hasInconsistencyOverride?: boolean
): AssessmentResult {
  // Damage types with realistic cost ranges and parts/labor breakdown:
  // Minor: < $800, Moderate: $800-$3000, Severe: > $10,000
  const damageTypes = [
    { area: 'Front Bumper', type: 'Dent', severity: 'Moderate' as const, partsCost: 550, laborHours: 3.5 },
    { area: 'Hood', type: 'Scratch', severity: 'Minor' as const, partsCost: 0, laborHours: 2.0 },
    { area: 'Front Left Fender', type: 'Crumple damage', severity: 'Severe' as const, partsCost: 2800, laborHours: 6.5 },
    { area: 'Headlight Assembly', type: 'Cracked lens', severity: 'Moderate' as const, partsCost: 450, laborHours: 1.5 },
    { area: 'Grille', type: 'Broken', severity: 'Minor' as const, partsCost: 180, laborHours: 0.5 },
    { area: 'Front Quarter Panel', type: 'Structural damage', severity: 'Severe' as const, partsCost: 3200, laborHours: 8.0 },
    { area: 'Windshield', type: 'Minor chip', severity: 'Minor' as const, partsCost: 0, laborHours: 0.5 },
    { area: 'Door Panel', type: 'Deep scratch', severity: 'Moderate' as const, partsCost: 950, laborHours: 4.0 },
  ];

  // If hasDamageOverride is false, return no damage
  if (hasDamageOverride === false) {
    return {
      claimId: `CLM-${Date.now().toString(36).toUpperCase()}`,
      hasDamage: false,
      overallSeverity: 'None',
      damages: [],
      totalEstimate: 0,
      laborHours: 0,
      partsRequired: [],
      aiConfidence: overrideConfidence ?? 85,
      recommendations: ['No visible damage detected', 'Consider requesting additional photos if damage was reported'],
      processingTime: 2.3,
      summary: '[Simulated] No damage detected in uploaded images',
    };
  }

  const numDamages = Math.min(Math.max(2, imageCount), damageTypes.length);
  let selectedDamages = damageTypes
    .sort(() => Math.random() - 0.5)
    .slice(0, numDamages)
    .map((d) => {
      const laborCost = d.laborHours * LABOR_RATE;
      const totalCost = d.partsCost + laborCost;
      return {
        area: d.area,
        type: d.type,
        severity: overrideSeverity || d.severity,
        estimatedCost: totalCost + Math.floor(Math.random() * 100),
        confidence: overrideConfidence ?? (75 + Math.floor(Math.random() * 20)),
        partsCost: d.partsCost,
        laborHours: d.laborHours,
        laborRate: LABOR_RATE,
      };
    });

  // Apply severity override to all damages if provided
  // Severe: should produce totals > $10,000
  // Minor: should produce totals < $800
  // Moderate: should produce totals between $800 - $5,000
  if (overrideSeverity) {
    if (overrideSeverity === 'Severe') {
      // For severe, ensure we get high-cost items totaling > $10k
      selectedDamages = selectedDamages.map(d => {
        const partsCost = 2000 + Math.floor(Math.random() * 1500); // $2000-3500 parts
        const laborHours = 5.0 + Math.random() * 3.0; // 5-8 hours
        return {
          ...d,
          severity: overrideSeverity,
          partsCost,
          laborHours: Math.round(laborHours * 2) / 2, // round to 0.5
          laborRate: LABOR_RATE,
          estimatedCost: partsCost + (laborHours * LABOR_RATE),
        };
      });
    } else if (overrideSeverity === 'Minor') {
      // For minor, ensure low costs totaling < $800
      selectedDamages = selectedDamages.slice(0, Math.min(2, selectedDamages.length)).map(d => {
        const partsCost = Math.floor(Math.random() * 100); // $0-100 parts
        const laborHours = 0.5 + Math.random() * 1.5; // 0.5-2 hours
        return {
          ...d,
          severity: overrideSeverity,
          partsCost,
          laborHours: Math.round(laborHours * 2) / 2,
          laborRate: LABOR_RATE,
          estimatedCost: partsCost + (laborHours * LABOR_RATE),
        };
      });
    } else {
      // Moderate - mid-range costs
      selectedDamages = selectedDamages.map(d => {
        const partsCost = 300 + Math.floor(Math.random() * 500); // $300-800 parts
        const laborHours = 2.0 + Math.random() * 2.5; // 2-4.5 hours
        return {
          ...d,
          severity: overrideSeverity,
          partsCost,
          laborHours: Math.round(laborHours * 2) / 2,
          laborRate: LABOR_RATE,
          estimatedCost: partsCost + (laborHours * LABOR_RATE),
        };
      });
    }
  }

  const totalEstimate = selectedDamages.reduce((sum, d) => sum + d.estimatedCost, 0);
  const totalLaborHours = selectedDamages.reduce((sum, d) => sum + (d.laborHours || 0), 0);

  const overallSeverity = overrideSeverity ||
    (selectedDamages.some(d => d.severity === 'Severe') ? 'Severe' :
    selectedDamages.some(d => d.severity === 'Moderate') ? 'Moderate' : 'Minor');

  const partsRequired = selectedDamages
    .filter((d) => (d.partsCost || 0) > 0)
    .map((d) => `${d.area} replacement/repair`);

  const avgConfidence = overrideConfidence ??
    Math.floor(selectedDamages.reduce((sum, d) => sum + d.confidence, 0) / selectedDamages.length);

  // Generate inconsistency flags if override is set
  const inconsistencies: InconsistencyFlag[] = hasInconsistencyOverride ? [
    {
      type: 'color_mismatch',
      description: 'Images show vehicles of different colors (white vs blue detected)',
      severity: 'critical',
      confidence: 94,
    },
    {
      type: 'multiple_vehicles',
      description: 'Photos appear to show 2 different vehicles based on body style and features',
      severity: 'critical',
      confidence: 89,
    },
  ] : [];

  const recommendations = [
    avgConfidence < LOW_CONFIDENCE_THRESHOLD
      ? 'Low confidence assessment - human review recommended'
      : overallSeverity === 'Severe'
      ? 'Recommend in-person inspection before authorization'
      : 'Damage consistent with reported incident',
    totalEstimate > SENIOR_APPROVAL_THRESHOLD
      ? `Estimate exceeds $${SENIOR_APPROVAL_THRESHOLD.toLocaleString()} threshold - senior adjuster review required`
      : 'Within standard authorization limits',
    'All repairs should be performed at certified body shop',
  ];

  // Add fraud warning to recommendations if inconsistencies detected
  if (hasInconsistencyOverride) {
    recommendations.unshift('CRITICAL: Vehicle inconsistencies detected - halt processing and investigate for potential fraud');
  }

  return {
    claimId: `CLM-${Date.now().toString(36).toUpperCase()}`,
    hasDamage: true,
    overallSeverity,
    damages: selectedDamages,
    totalEstimate, // Labor is already included in each item's cost
    laborHours: totalLaborHours,
    partsRequired,
    aiConfidence: avgConfidence,
    recommendations,
    processingTime: 2.3 + Math.random() * 1.5,
    summary: hasInconsistencyOverride
      ? '[Simulated] ALERT: Multiple vehicle inconsistencies detected in uploaded images'
      : '[Simulated] Demo mode - using simulated assessment data',
    hasInconsistencies: hasInconsistencyOverride,
    inconsistencies: hasInconsistencyOverride ? inconsistencies : undefined,
  };
}

// Test Mode Controls Component
function TestModeControls({
  confidence,
  setConfidence,
  severity,
  setSeverity,
  hasDamage,
  setHasDamage,
  hasInconsistency,
  setHasInconsistency,
}: {
  confidence: number;
  setConfidence: (v: number) => void;
  severity: 'Minor' | 'Moderate' | 'Severe';
  setSeverity: (v: 'Minor' | 'Moderate' | 'Severe') => void;
  hasDamage: boolean;
  setHasDamage: (v: boolean) => void;
  hasInconsistency: boolean;
  setHasInconsistency: (v: boolean) => void;
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-600">🧪</span>
        <span className="font-medium text-amber-800">Test Mode Controls</span>
      </div>

      <div className="space-y-4">
        {/* Has Damage Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Damage Detected</label>
          <button
            onClick={() => setHasDamage(!hasDamage)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              hasDamage ? 'bg-red-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                hasDamage ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Vehicle Inconsistency Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-gray-700">Vehicle Inconsistency</label>
            <p className="text-xs text-gray-500">Simulates photos of different vehicles</p>
          </div>
          <button
            onClick={() => setHasInconsistency(!hasInconsistency)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              hasInconsistency ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                hasInconsistency ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {hasDamage && (
          <>
            {/* Confidence Slider */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <label className="text-gray-700">AI Confidence</label>
                <span className={`font-medium ${confidence < LOW_CONFIDENCE_THRESHOLD ? 'text-amber-600' : 'text-green-600'}`}>
                  {confidence}%
                  {confidence < LOW_CONFIDENCE_THRESHOLD && ' (triggers human input)'}
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="99"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low (30%)</span>
                <span className="text-amber-500">Threshold ({LOW_CONFIDENCE_THRESHOLD}%)</span>
                <span>High (99%)</span>
              </div>
            </div>

            {/* Severity Selector */}
            <div>
              <label className="text-sm text-gray-700 block mb-2">Damage Severity</label>
              <div className="flex gap-2">
                {(['Minor', 'Moderate', 'Severe'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      severity === sev
                        ? sev === 'Minor'
                          ? 'bg-green-500 text-white'
                          : sev === 'Moderate'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Human Feedback Component - for marking damage on images
function HumanFeedbackRequest({
  images,
  markers,
  setMarkers,
  onSubmit,
  onSkip,
}: {
  images: UploadedImage[];
  markers: DamageMarker[];
  setMarkers: (markers: DamageMarker[]) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker: DamageMarker = {
      x,
      y,
      imageIndex: selectedImageIndex,
    };

    setMarkers([...markers, newMarker]);
  };

  const removeMarker = (index: number) => {
    setMarkers(markers.filter((_, i) => i !== index));
  };

  const currentImageMarkers = markers.filter((m) => m.imageIndex === selectedImageIndex);

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🔍</span>
          <h3 className="font-semibold text-amber-800">Human Input Requested</h3>
        </div>
        <p className="text-amber-700 text-sm">
          The AI assessment has low confidence. Please click on the image(s) to mark where you see damage.
          This will help improve the assessment accuracy.
        </p>
      </div>

      {/* Image Selector */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImageIndex === index ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <img
                src={img.preview}
                alt={`Photo ${index + 1}`}
                className="h-16 w-24 object-cover"
              />
              {markers.filter((m) => m.imageIndex === index).length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {markers.filter((m) => m.imageIndex === index).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Interactive Image */}
      <div
        ref={imageContainerRef}
        onClick={handleImageClick}
        className="relative cursor-crosshair rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
      >
        <img
          src={images[selectedImageIndex].preview}
          alt="Click to mark damage"
          className="w-full max-h-96 object-contain bg-gray-100"
        />

        {/* Markers */}
        {currentImageMarkers.map((marker, index) => {
          const globalIndex = markers.findIndex(
            (m) => m.x === marker.x && m.y === marker.y && m.imageIndex === marker.imageIndex
          );
          return (
            <div
              key={index}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            >
              <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-sm font-bold animate-pulse">
                {globalIndex + 1}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeMarker(globalIndex);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          );
        })}

        {/* Click instruction overlay */}
        {currentImageMarkers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <span className="bg-white/90 px-4 py-2 rounded-lg text-gray-700 text-sm font-medium">
              Click to mark damage locations
            </span>
          </div>
        )}
      </div>

      {/* Marker count */}
      <div className="text-sm text-gray-600">
        {markers.length > 0 ? (
          <span className="text-green-600 font-medium">
            ✓ {markers.length} damage location{markers.length !== 1 ? 's' : ''} marked
          </span>
        ) : (
          <span>No damage locations marked yet</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onSkip}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Skip (Use AI Assessment)
        </button>
        <button
          onClick={onSubmit}
          disabled={markers.length === 0}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
            markers.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Submit & Re-analyze ({markers.length} marker{markers.length !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}

export default function DamageAssessment({ claimData, images, onContinue, onQuickApprove, onBack, mode }: DamageAssessmentProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Preparing images...');
  const [quickApproveComplete, setQuickApproveComplete] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Human feedback state
  const [needsHumanInput, setNeedsHumanInput] = useState(false);
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([]);

  // Manual override state
  const [overrideEnabled, setOverrideEnabled] = useState<Record<number, boolean>>({});
  const [adjustedCosts, setAdjustedCosts] = useState<Record<number, number>>({});
  const [overrideReasons, setOverrideReasons] = useState<Record<number, string>>({});
  const [overrideNotes, setOverrideNotes] = useState('');
  const [removedItems, setRemovedItems] = useState<Record<number, boolean>>({});

  // Rejection state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionDetails, setRejectionDetails] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionSent, setRejectionSent] = useState(false);

  // Auto-approval state
  const [isAutoApproving, setIsAutoApproving] = useState(false);

  // Test mode controls
  const [testConfidence, setTestConfidence] = useState(85);
  const [testSeverity, setTestSeverity] = useState<'Minor' | 'Moderate' | 'Severe'>('Moderate');
  const [testHasDamage, setTestHasDamage] = useState(true);
  const [testHasInconsistency, setTestHasInconsistency] = useState(false);
  const [showTestControls, setShowTestControls] = useState(true);
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);

  const analyzeImages = useCallback(async (humanMarkers?: DamageMarker[]) => {
    const startTime = Date.now();
    setIsAnalyzing(true);
    setNeedsHumanInput(false);
    setProgress(0);

    // If in simulated mode, use mock data with test controls
    if (mode === 'simulated') {
      setStatusMessage('Running simulated analysis...');
      setProgress(30);

      await new Promise(resolve => setTimeout(resolve, 1500));
      setProgress(70);

      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(100);

      const mockResult = generateMockAssessment(
        claimData,
        images.length,
        testConfidence,
        testSeverity,
        testHasDamage,
        testHasInconsistency
      );
      mockResult.processingTime = (Date.now() - startTime) / 1000;

      // If human markers were provided, boost confidence and mark as human-assisted
      if (humanMarkers && humanMarkers.length > 0) {
        mockResult.aiConfidence = Math.min(95, mockResult.aiConfidence + 15);
        mockResult.humanAssisted = true;
        mockResult.summary = `[Simulated] Human-assisted assessment with ${humanMarkers.length} marked location(s)`;
      }

      // Check if we need human input (low confidence and no markers provided yet)
      if (mockResult.aiConfidence < LOW_CONFIDENCE_THRESHOLD && !humanMarkers && mockResult.hasDamage) {
        setAssessment(mockResult);
        setNeedsHumanInput(true);
        setIsAnalyzing(false);
        return;
      }

      // Auto-approve in test mode if high confidence, low value, no inconsistencies
      const isHighConf = mockResult.aiConfidence >= HIGH_CONFIDENCE_THRESHOLD;
      const isLowVal = mockResult.totalEstimate <= SENIOR_APPROVAL_THRESHOLD;
      const noFraud = !mockResult.hasInconsistencies;

      if (mockResult.hasDamage && isHighConf && isLowVal && noFraud && onQuickApprove) {
        setAssessment(mockResult);
        setIsAnalyzing(false);
        // Trigger auto-approval after brief delay to show assessment
        setTimeout(() => {
          setIsAutoApproving(true);
          setTimeout(() => {
            setIsAutoApproving(false);
            setQuickApproveComplete(true);
            setTimeout(() => {
              onQuickApprove(mockResult);
            }, 1500);
          }, 1000);
        }, 500);
        return;
      }

      setAssessment(mockResult);
      setIsAnalyzing(false);
      return;
    }

    // Live mode - call the real API
    try {
      setStatusMessage('Converting images...');
      setProgress(10);

      const imageData = await Promise.all(
        images.map((img) => fileToBase64(img.file))
      );

      setStatusMessage('Sending to AI for analysis...');
      setProgress(30);

      // Include human markers in the request if provided
      const requestBody: Record<string, unknown> = {
        images: imageData,
        vehicleInfo: {
          make: claimData.vehicleMake,
          model: claimData.vehicleModel,
          year: claimData.vehicleYear,
        },
      };

      if (humanMarkers && humanMarkers.length > 0) {
        requestBody.humanMarkers = humanMarkers;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      setProgress(70);
      setStatusMessage('Processing AI response...');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      setProgress(90);

      const processingTime = (Date.now() - startTime) / 1000;

      const assessmentResult: AssessmentResult = {
        claimId: `CLM-${Date.now().toString(36).toUpperCase()}`,
        hasDamage: result.hasDamage,
        overallSeverity: result.overallSeverity || 'None',
        damages: result.damages || [],
        totalEstimate: result.totalEstimate || 0,
        laborHours: result.laborHours || 0,
        partsRequired: result.partsRequired || [],
        aiConfidence: result.aiConfidence || 0,
        recommendations: result.recommendations || [],
        processingTime,
        summary: result.summary,
        humanAssisted: humanMarkers && humanMarkers.length > 0,
        hasInconsistencies: result.hasInconsistencies || false,
        inconsistencies: result.inconsistencies || [],
      };

      setProgress(100);

      // Check if we need human input (low confidence and no markers provided yet)
      if (assessmentResult.aiConfidence < LOW_CONFIDENCE_THRESHOLD && !humanMarkers && assessmentResult.hasDamage) {
        setAssessment(assessmentResult);
        setNeedsHumanInput(true);
        setIsAnalyzing(false);
        return;
      }

      setAssessment(assessmentResult);
      setIsAnalyzing(false);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');

      setStatusMessage('Falling back to simulated assessment...');
      setTimeout(() => {
        const mockResult = generateMockAssessment(claimData, images.length);
        mockResult.summary = `[API Error] ${err instanceof Error ? err.message : 'Unknown error'} - using simulated data`;
        setAssessment(mockResult);
        setIsAnalyzing(false);
      }, 1000);
    }
  }, [images, claimData, mode, testConfidence, testSeverity, testHasDamage, testHasInconsistency]);

  const handleStartAnalysis = () => {
    setHasStartedAnalysis(true);
    setShowTestControls(false);
    analyzeImages();
  };

  const handleHumanFeedbackSubmit = () => {
    analyzeImages(damageMarkers);
  };

  const handleSkipHumanFeedback = () => {
    setNeedsHumanInput(false);
  };

  // Progress animation for visual feedback
  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 25) return prev + 2;
        if (prev < 65) return prev + 0.5;
        if (prev < 85) return prev + 0.3;
        return prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const severityColor = {
    None: 'bg-gray-100 text-gray-800',
    Minor: 'bg-green-100 text-green-800',
    Moderate: 'bg-yellow-100 text-yellow-800',
    Severe: 'bg-red-100 text-red-800',
  };

  // Confidence color helper
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-100';
    if (confidence >= 70) return 'text-blue-600 bg-blue-100';
    if (confidence >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  // Calculate adjusted total (labor is already included in each item's estimatedCost)
  const getAdjustedTotal = () => {
    if (!assessment) return 0;
    let total = 0;
    assessment.damages.forEach((damage, index) => {
      // Skip removed items
      if (removedItems[index]) return;

      if (overrideEnabled[index] && adjustedCosts[index] !== undefined) {
        total += adjustedCosts[index];
      } else {
        total += damage.estimatedCost;
      }
    });
    return total;
  };

  // Check if any overrides or removals are active
  const hasActiveOverrides = Object.values(overrideEnabled).some(v => v);
  const hasRemovedItems = Object.values(removedItems).some(v => v);
  const hasModifications = hasActiveOverrides || hasRemovedItems;

  // Handle continue with override data
  const handleContinueWithOverrides = () => {
    if (!assessment) return;

    const manualOverrides: ManualOverride[] = [];

    // Filter out removed items from damages
    const filteredDamages = assessment.damages.filter((_, index) => !removedItems[index]);

    assessment.damages.forEach((damage, index) => {
      // Skip removed items
      if (removedItems[index]) return;

      if (overrideEnabled[index] && adjustedCosts[index] !== undefined) {
        manualOverrides.push({
          damageIndex: index,
          originalCost: damage.estimatedCost,
          adjustedCost: adjustedCosts[index],
          reason: overrideReasons[index] || 'Manual adjustment',
        });
      }
    });

    const updatedAssessment: AssessmentResult = {
      ...assessment,
      damages: filteredDamages,
      totalEstimate: getAdjustedTotal(),
      manualOverrides: manualOverrides.length > 0 ? manualOverrides : undefined,
      overrideNotes: overrideNotes.trim() || undefined,
    };

    onContinue(updatedAssessment);
  };

  // Handle claim rejection with email notification
  const handleRejectClaim = async () => {
    if (!rejectionReason) return;

    setIsRejecting(true);

    // Simulate sending rejection email
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In production, this would call an API to send the email
    console.log('Rejection email sent:', {
      claimId: assessment?.claimId,
      policyNumber: claimData.policyNumber,
      reason: rejectionReason,
      details: rejectionDetails,
      vehicle: `${claimData.vehicleYear} ${claimData.vehicleMake} ${claimData.vehicleModel}`,
    });

    setIsRejecting(false);
    setRejectionSent(true);
  };

  // Handle auto-approval for high-confidence, low-value claims
  const handleAutoApprove = async () => {
    if (!assessment) return;

    setIsAutoApproving(true);

    // Brief delay to show processing state (simulates quick agent review)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create the assessment result without modifications
    const autoApprovedAssessment: AssessmentResult = {
      ...assessment,
      totalEstimate: getAdjustedTotal(),
      overrideNotes: 'Auto-approved: High confidence assessment within standard limits',
    };

    setIsAutoApproving(false);
    setQuickApproveComplete(true);

    // If onQuickApprove is provided, use it for direct finalization
    // Otherwise fall back to onContinue
    if (onQuickApprove) {
      // Delay slightly to show success state
      setTimeout(() => {
        onQuickApprove(autoApprovedAssessment);
      }, 2000);
    }
  };

  // Initial state - show test controls (in test mode) and start button
  if (!hasStartedAnalysis && !isAnalyzing && !assessment) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Damage Assessment</h2>
          <p className="text-gray-700 text-sm">
            Ready to analyze {images.length} uploaded image{images.length !== 1 ? 's' : ''} for vehicle damage.
          </p>
        </div>

        {/* Test Mode Controls */}
        {mode === 'simulated' && showTestControls && (
          <TestModeControls
            confidence={testConfidence}
            setConfidence={setTestConfidence}
            severity={testSeverity}
            setSeverity={setTestSeverity}
            hasDamage={testHasDamage}
            setHasDamage={setTestHasDamage}
            hasInconsistency={testHasInconsistency}
            setHasInconsistency={setTestHasInconsistency}
          />
        )}

        {/* Image Preview */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <img
              key={index}
              src={img.preview}
              alt={`Upload ${index + 1}`}
              className="h-24 w-32 object-cover rounded-lg border"
            />
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Back
          </button>
          <button
            onClick={handleStartAnalysis}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Start Analysis
          </button>
        </div>
      </div>
    );
  }

  // Analyzing state
  if (isAnalyzing) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse mb-6">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Analyzing Damage</h2>
          <p className="text-gray-700">Processing {images.length} image{images.length !== 1 ? 's' : ''}...</p>
        </div>
        <div className="max-w-md mx-auto">
          <div className="bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-700 mt-2">{statusMessage}</p>
          {error && (
            <p className="text-sm text-amber-600 mt-2">
              Note: {error}. Using fallback assessment.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Human feedback request state
  if (needsHumanInput && assessment) {
    return (
      <HumanFeedbackRequest
        images={images}
        markers={damageMarkers}
        setMarkers={setDamageMarkers}
        onSubmit={handleHumanFeedbackSubmit}
        onSkip={handleSkipHumanFeedback}
      />
    );
  }

  if (!assessment) return null;

  // No damage detected view
  if (!assessment.hasDamage || assessment.damages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-semibold text-green-700 mb-2">No Damage Detected</h2>
          <p className="text-gray-700 max-w-md mx-auto">
            {assessment.summary || 'The AI analysis did not identify any visible damage to the vehicle in the uploaded images.'}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-600">🤖</span>
              <span className="font-medium text-gray-900">AI Confidence Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${assessment.aiConfidence}%` }}
                />
              </div>
              <span className="font-semibold text-green-700">{assessment.aiConfidence}%</span>
            </div>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Processed in {assessment.processingTime.toFixed(1)}s
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">AI Recommendations</h3>
          <ul className="space-y-2">
            {assessment.recommendations.length > 0 ? (
              assessment.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="text-green-500">→</span>
                  <span>{rec}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="text-green-500">→</span>
                  <span>Vehicle appears to be in good condition</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="text-green-500">→</span>
                  <span>Consider requesting additional photos if damage was reported</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Upload Different Photos
          </button>
          <button
            onClick={() => onContinue(assessment)}
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            Proceed to Review
          </button>
        </div>
      </div>
    );
  }

  // Determine if this is a high-confidence auto-approve candidate
  const isHighConfidence = assessment.aiConfidence >= 85;
  const isLowValue = getAdjustedTotal() <= SENIOR_APPROVAL_THRESHOLD;
  const canAutoApprove = isHighConfidence && isLowValue && !assessment.hasInconsistencies;

  // Damage detected view
  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🔍</span>
              <h2 className="text-xl font-semibold">AI Damage Assessment Complete</h2>
            </div>
            <p className="text-slate-300 text-sm">Claim ID: {assessment.claimId} • Processed in {assessment.processingTime.toFixed(1)}s</p>
          </div>
          <div className="flex items-center gap-2">
            {assessment.humanAssisted && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Human Assisted
              </span>
            )}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              assessment.overallSeverity === 'Minor' ? 'bg-green-500/30 text-green-200 border border-green-400/30' :
              assessment.overallSeverity === 'Moderate' ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/30' :
              'bg-red-500/30 text-red-200 border border-red-400/30'
            }`}>
              {assessment.overallSeverity} Damage
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-600">
          <div className="text-center">
            <div className="text-2xl font-bold">{assessment.damages.length}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Items Found</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isHighConfidence ? 'text-green-400' : 'text-amber-400'}`}>
              {assessment.aiConfidence}%
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">AI Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{assessment.laborHours}h</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Est. Labor</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">${getAdjustedTotal().toLocaleString()}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Total Estimate</div>
          </div>
        </div>
      </div>

      {/* AI Recommendation Card - PROMINENT */}
      <div className={`rounded-xl p-5 border-2 ${
        assessment.hasInconsistencies
          ? 'bg-red-50 border-red-300'
          : canAutoApprove
          ? 'bg-green-50 border-green-300'
          : 'bg-amber-50 border-amber-300'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
            assessment.hasInconsistencies
              ? 'bg-red-100 text-red-600'
              : canAutoApprove
              ? 'bg-green-100 text-green-600'
              : 'bg-amber-100 text-amber-600'
          }`}>
            {assessment.hasInconsistencies ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : canAutoApprove ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className={`font-bold text-lg mb-1 ${
              assessment.hasInconsistencies
                ? 'text-red-800'
                : canAutoApprove
                ? 'text-green-800'
                : 'text-amber-800'
            }`}>
              AI Recommendation: {
                assessment.hasInconsistencies
                  ? 'Investigation Required'
                  : canAutoApprove
                  ? 'Approve Estimate'
                  : 'Agent Review Required'
              }
            </h3>
            <p className={`text-sm mb-3 ${
              assessment.hasInconsistencies
                ? 'text-red-700'
                : canAutoApprove
                ? 'text-green-700'
                : 'text-amber-700'
            }`}>
              {assessment.hasInconsistencies
                ? 'Potential fraud indicators detected. Do not approve until inconsistencies are investigated.'
                : canAutoApprove
                ? `High confidence assessment (${assessment.aiConfidence}%) within standard limits ($${getAdjustedTotal().toLocaleString()}). Safe for expedited approval.`
                : assessment.aiConfidence < 85
                ? `Confidence score (${assessment.aiConfidence}%) is below ${HIGH_CONFIDENCE_THRESHOLD}% threshold. Manual verification recommended.`
                : `Estimate exceeds $${SENIOR_APPROVAL_THRESHOLD.toLocaleString()} threshold. Senior adjuster review may be required.`
              }
            </p>

            {/* Detailed Recommendations */}
            <div className="space-y-2">
              {assessment.recommendations.map((rec, index) => (
                <div key={index} className={`flex items-start gap-2 text-sm ${
                  assessment.hasInconsistencies
                    ? 'text-red-800'
                    : canAutoApprove
                    ? 'text-green-800'
                    : 'text-amber-800'
                }`}>
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    assessment.hasInconsistencies
                      ? 'bg-red-200 text-red-700'
                      : canAutoApprove
                      ? 'bg-green-200 text-green-700'
                      : 'bg-amber-200 text-amber-700'
                  }`}>
                    {index + 1}
                  </span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>

            {/* Quick Approve Button for eligible claims */}
            {canAutoApprove && !hasModifications && (
              <div className="mt-4 pt-4 border-t border-green-200">
                {quickApproveComplete ? (
                  <div className="text-center py-2">
                    <div className="inline-flex items-center gap-2 text-green-700 font-medium">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Claim Approved & Submitted
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Proceeding to next claim...
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleAutoApprove}
                      disabled={isAutoApproving}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:bg-green-400"
                    >
                      {isAutoApproving ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing Quick Approval...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Quick Approve (15-sec review)
                        </>
                      )}
                    </button>
                    <p className="text-xs text-green-700 text-center mt-2">
                      High confidence • Under ${SENIOR_APPROVAL_THRESHOLD.toLocaleString()} • No fraud flags
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fraud/Inconsistency Alert */}
      {assessment.hasInconsistencies && assessment.inconsistencies && assessment.inconsistencies.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="font-bold text-red-800 text-lg">Vehicle Inconsistencies Detected</h3>
          </div>
          <p className="text-red-700 text-sm mb-4">
            The AI has detected potential inconsistencies in the uploaded images that may indicate fraud or incorrect documentation.
            <strong> Review required before proceeding.</strong>
          </p>
          <div className="space-y-3">
            {assessment.inconsistencies.map((issue, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  issue.severity === 'critical' ? 'bg-red-100' : 'bg-amber-100'
                }`}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  issue.severity === 'critical' ? 'bg-red-600' : 'bg-amber-500'
                }`}>
                  {issue.severity === 'critical' ? '!' : '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                      issue.severity === 'critical'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-amber-200 text-amber-800'
                    }`}>
                      {issue.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {issue.confidence}% confidence
                    </span>
                  </div>
                  <p className={`text-sm ${
                    issue.severity === 'critical' ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {issue.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-red-200">
            <p className="text-xs text-red-600">
              Recommended action: Investigate before approving. Contact policyholder for clarification or request additional documentation.
            </p>
          </div>
        </div>
      )}

      {/* Itemized Cost Estimate */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Itemized Cost Estimate</h3>
            <p className="text-xs text-slate-400">Parts and labor breakdown for repair shop quote comparison</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
            {assessment.damages.length} item{assessment.damages.length !== 1 ? 's' : ''} + labor
          </span>
        </div>

        {/* Table Header */}
        <div className="bg-gray-100 px-4 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 uppercase tracking-wide border-b">
          <div className="col-span-4">Component</div>
          <div className="col-span-2">Damage Type</div>
          <div className="col-span-2 text-center">Severity</div>
          <div className="col-span-2 text-center">Confidence</div>
          <div className="col-span-2 text-right">Est. Cost</div>
        </div>

        <div className="divide-y">
          {assessment.damages.map((damage, index) => (
            <div key={index} className={`px-4 py-3 ${
              removedItems[index]
                ? 'bg-gray-100 opacity-60'
                : overrideEnabled[index]
                ? 'bg-orange-50'
                : ''
            }`}>
              {/* Main row */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <p className={`font-medium ${removedItems[index] ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {damage.area}
                  </p>
                  {/* Parts & Labor breakdown */}
                  {!removedItems[index] && (damage.partsCost !== undefined || damage.laborHours !== undefined) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Parts: ${(damage.partsCost || 0).toLocaleString()} | Labor: {damage.laborHours || 0}h @ ${damage.laborRate || 115}/hr
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className={`text-sm ${removedItems[index] ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                    {damage.type}
                  </p>
                </div>
                <div className="col-span-2 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    removedItems[index] ? 'bg-gray-200 text-gray-400' : severityColor[damage.severity]
                  }`}>
                    {damage.severity}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  {removedItems[index] ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <div className="w-12 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            damage.confidence >= 85 ? 'bg-green-500' :
                            damage.confidence >= 70 ? 'bg-blue-500' :
                            damage.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${damage.confidence}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        damage.confidence >= 85 ? 'text-green-600' :
                        damage.confidence >= 70 ? 'text-blue-600' :
                        damage.confidence >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {damage.confidence}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  {removedItems[index] ? (
                    <p className="font-semibold text-gray-400 line-through">${damage.estimatedCost.toLocaleString()}</p>
                  ) : overrideEnabled[index] ? (
                    <div>
                      <p className="text-xs text-gray-400 line-through">${damage.estimatedCost.toLocaleString()}</p>
                      <p className="font-semibold text-orange-600">
                        ${(adjustedCosts[index] ?? damage.estimatedCost).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="font-semibold text-gray-900">${damage.estimatedCost.toLocaleString()}</p>
                  )}
                </div>
              </div>

              {/* Actions Row - Override Toggle & Remove */}
              <div className="mt-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  {!removedItems[index] && (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={overrideEnabled[index] || false}
                          onChange={(e) => {
                            setOverrideEnabled(prev => ({ ...prev, [index]: e.target.checked }));
                            if (e.target.checked && adjustedCosts[index] === undefined) {
                              setAdjustedCosts(prev => ({ ...prev, [index]: damage.estimatedCost }));
                            }
                          }}
                          className="w-3.5 h-3.5 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                        />
                        <span className="text-gray-500 text-xs">Override</span>
                      </label>

                      {/* Inline override inputs */}
                      {overrideEnabled[index] && (
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">$</span>
                            <input
                              type="number"
                              value={adjustedCosts[index] ?? damage.estimatedCost}
                              onChange={(e) => setAdjustedCosts(prev => ({
                                ...prev,
                                [index]: parseInt(e.target.value) || 0
                              }))}
                              className="w-24 px-2 py-1 text-sm border border-orange-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                              min="0"
                            />
                          </div>
                          <input
                            type="text"
                            value={overrideReasons[index] || ''}
                            onChange={(e) => setOverrideReasons(prev => ({ ...prev, [index]: e.target.value }))}
                            placeholder="Reason for adjustment..."
                            className="flex-1 px-2 py-1 text-sm border border-orange-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Remove/Restore Button */}
                <button
                  onClick={() => {
                    setRemovedItems(prev => ({ ...prev, [index]: !prev[index] }));
                    // Clear override if removing
                    if (!removedItems[index]) {
                      setOverrideEnabled(prev => ({ ...prev, [index]: false }));
                    }
                  }}
                  className={`text-lg px-2 py-1 rounded transition-colors ${
                    removedItems[index]
                      ? 'hover:bg-green-100'
                      : 'hover:bg-red-100'
                  }`}
                  title={removedItems[index] ? 'Restore item' : 'Remove item'}
                >
                  {removedItems[index] ? '✅' : '❌'}
                </button>
              </div>
            </div>
          ))}

          {/* Labor Summary Row */}
          {assessment.laborHours > 0 && (
            <div className="px-4 py-2 bg-blue-50/50 border-t border-blue-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  Total Labor: {assessment.laborHours.toFixed(1)} hours @ $115/hr
                </span>
                <span className="font-medium text-gray-700">
                  ${(assessment.laborHours * 115).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-4 bg-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-lg font-semibold text-gray-900">Total Estimate</span>
              {hasActiveOverrides && (
                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                  Adjusted
                </span>
              )}
              {hasRemovedItems && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                  {Object.values(removedItems).filter(v => v).length} item(s) removed
                </span>
              )}
            </div>
            <div className="text-right">
              {hasModifications && (
                <p className="text-sm text-gray-400 line-through">${assessment.totalEstimate.toLocaleString()}</p>
              )}
              <span className={`text-2xl font-bold ${hasModifications ? 'text-orange-600' : 'text-blue-600'}`}>
                ${getAdjustedTotal().toLocaleString()}
              </span>
            </div>
          </div>
          {/* Expected Range */}
          <div className="mt-2 pt-2 border-t border-gray-200 text-center">
            <span className="text-sm text-gray-500">
              Expected range: ${Math.round(getAdjustedTotal() * 0.85).toLocaleString()} – ${Math.round(getAdjustedTotal() * 1.15).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 ml-2">(±15%)</span>
          </div>
        </div>
      </div>

      {/* Agent Override Notes - shown when any override is active */}
      {hasActiveOverrides && (
        <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
          <label className="block font-medium text-orange-800 mb-2">
            Agent Notes for Manual Adjustments
          </label>
          <textarea
            value={overrideNotes}
            onChange={(e) => setOverrideNotes(e.target.value)}
            placeholder="Explain the reasoning for manual cost adjustments..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          />
          <p className="text-xs text-orange-600 mt-1">
            These notes will be attached to the assessment for audit purposes.
          </p>
        </div>
      )}

      {/* Parts Required */}
      {assessment.partsRequired.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Parts Required</h3>
          <div className="flex flex-wrap gap-2">
            {assessment.partsRequired.map((part, index) => (
              <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                {part}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
        >
          Reject Claim
        </button>
        <button
          onClick={handleContinueWithOverrides}
          className={`flex-1 py-3 px-4 rounded-md transition-colors font-medium ${
            hasModifications
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {hasModifications ? 'Review with Adjustments' : 'Review & Approve'}
        </button>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            {!rejectionSent ? (
              <>
                {/* Modal Header */}
                <div className="bg-red-600 text-white px-6 py-4">
                  <h3 className="text-lg font-semibold">Reject Claim</h3>
                  <p className="text-red-100 text-sm">Send rejection notification to policyholder</p>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      <strong>Claim ID:</strong> {assessment?.claimId}<br />
                      <strong>Vehicle:</strong> {claimData.vehicleYear} {claimData.vehicleMake} {claimData.vehicleModel}<br />
                      <strong>Policy:</strong> {claimData.policyNumber}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                    >
                      <option value="">Select a reason...</option>
                      <option value="insufficient_evidence">Insufficient Evidence / Poor Image Quality</option>
                      <option value="policy_not_covered">Damage Not Covered by Policy</option>
                      <option value="pre_existing_damage">Pre-existing Damage Detected</option>
                      <option value="fraud_suspected">Suspected Fraud / Inconsistencies</option>
                      <option value="policy_lapsed">Policy Lapsed / Not Active</option>
                      <option value="deductible_not_met">Damage Below Deductible</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Details for Policyholder
                    </label>
                    <textarea
                      value={rejectionDetails}
                      onChange={(e) => setRejectionDetails(e.target.value)}
                      rows={4}
                      placeholder="Provide specific details about the rejection that will help the policyholder understand the decision..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      <strong>Email Preview:</strong> An automated email will be sent to the policyholder explaining the rejection reason and providing instructions for appeal if applicable.
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason('');
                      setRejectionDetails('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectClaim}
                    disabled={!rejectionReason || isRejecting}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium disabled:bg-red-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRejecting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Reject & Notify Policyholder'
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Claim Rejected</h3>
                <p className="text-gray-600 mb-2">
                  The rejection notification has been sent to the policyholder at their registered email address.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Claim ID: {assessment?.claimId}
                </p>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionSent(false);
                    setRejectionReason('');
                    setRejectionDetails('');
                    onBack(); // Go back to start new claim
                  }}
                  className="bg-gray-800 text-white py-2 px-6 rounded-md hover:bg-gray-700 transition-colors font-medium"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
