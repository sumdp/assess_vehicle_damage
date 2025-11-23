'use client';

import { useState } from 'react';
import { ClaimData } from './ClaimForm';
import { AssessmentResult, DamageItem } from './DamageAssessment';
import { UploadedImage } from './ImageUploader';

interface AgentReviewProps {
  claimData: ClaimData;
  images: UploadedImage[];
  assessment: AssessmentResult;
  onApprove: (finalAssessment: FinalAssessment) => void;
  onBack: () => void;
}

export interface FinalAssessment {
  assessment: AssessmentResult;
  agentNotes: string;
  adjustedTotal: number;
  adjustments: DamageAdjustment[];
  approvedBy: string;
  approvalLevel: 'agent' | 'senior';
  approvedAt: Date;
}

interface DamageAdjustment {
  damageIndex: number;
  originalCost: number;
  adjustedCost: number;
  reason: string;
}

export default function AgentReview({ claimData, images, assessment, onApprove, onBack }: AgentReviewProps) {
  const [adjustedDamages, setAdjustedDamages] = useState<DamageItem[]>(assessment.damages);
  const [agentNotes, setAgentNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Labor is already included in each item's estimatedCost
  const adjustedTotal = adjustedDamages.reduce((sum, d) => sum + d.estimatedCost, 0);
  const SENIOR_APPROVAL_THRESHOLD = 5000;
  const requiresSeniorApproval = adjustedTotal > SENIOR_APPROVAL_THRESHOLD || assessment.overallSeverity === 'Severe';

  const handleCostAdjust = (index: number, newCost: number) => {
    const updated = [...adjustedDamages];
    updated[index] = { ...updated[index], estimatedCost: newCost };
    setAdjustedDamages(updated);
  };

  const handleApprove = () => {
    const adjustments: DamageAdjustment[] = [];
    adjustedDamages.forEach((damage, index) => {
      if (damage.estimatedCost !== assessment.damages[index].estimatedCost) {
        adjustments.push({
          damageIndex: index,
          originalCost: assessment.damages[index].estimatedCost,
          adjustedCost: damage.estimatedCost,
          reason: 'Manual adjustment by claims agent',
        });
      }
    });

    const finalAssessment: FinalAssessment = {
      assessment: { ...assessment, damages: adjustedDamages, totalEstimate: adjustedTotal },
      agentNotes,
      adjustedTotal,
      adjustments,
      approvedBy: 'Agent Smith', // Would come from auth in production
      approvalLevel: requiresSeniorApproval ? 'senior' : 'agent',
      approvedAt: new Date(),
    };

    onApprove(finalAssessment);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Agent Review</h2>
        <p className="text-gray-600 text-sm">
          Review AI assessment and make adjustments if needed
        </p>
      </div>

      {/* Claim Summary */}
      <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Policy</p>
          <p className="font-medium text-gray-900">{claimData.policyNumber}</p>
        </div>
        <div>
          <p className="text-gray-600">Vehicle</p>
          <p className="font-medium text-gray-900">{claimData.vehicleYear} {claimData.vehicleMake} {claimData.vehicleModel}</p>
        </div>
        <div>
          <p className="text-gray-600">Accident Date</p>
          <p className="font-medium text-gray-900">{new Date(claimData.accidentDate).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-gray-600">Claim ID</p>
          <p className="font-medium text-gray-900">{assessment.claimId}</p>
        </div>
      </div>

      {/* Photo Gallery */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Submitted Photos</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <img
              key={index}
              src={image.preview}
              alt={`Damage ${index + 1}`}
              className={`h-20 w-28 object-cover rounded cursor-pointer border-2 transition-all ${
                selectedImage === index ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
              }`}
              onClick={() => setSelectedImage(selectedImage === index ? null : index)}
            />
          ))}
        </div>
        {selectedImage !== null && (
          <div className="mt-2">
            <img
              src={images[selectedImage].preview}
              alt="Selected damage"
              className="max-h-64 rounded-lg border"
            />
          </div>
        )}
      </div>

      {/* Adjustable Damage Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
          <h3 className="font-medium text-gray-900">Cost Breakdown</h3>
          <span className="text-sm text-gray-600">Click costs to adjust</span>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-700">
            <tr>
              <th className="text-left px-4 py-2">Damage Area</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Severity</th>
              <th className="text-left px-4 py-2">AI Confidence</th>
              <th className="text-right px-4 py-2">Est. Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {adjustedDamages.map((damage, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{damage.area}</div>
                  {/* Parts & Labor breakdown */}
                  {(damage.partsCost !== undefined || damage.laborHours !== undefined) && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      Parts: ${(damage.partsCost || 0).toLocaleString()} | Labor: {damage.laborHours || 0}h @ ${damage.laborRate || 115}/hr
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{damage.type}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    damage.severity === 'Minor' ? 'bg-green-100 text-green-800' :
                    damage.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {damage.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${damage.confidence}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-700">{damage.confidence}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    value={damage.estimatedCost}
                    onChange={(e) => handleCostAdjust(index, parseInt(e.target.value) || 0)}
                    className="w-24 text-right px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {damage.estimatedCost !== assessment.damages[index].estimatedCost && (
                    <span className="block text-xs text-orange-500">
                      (was ${assessment.damages[index].estimatedCost})
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {/* Labor Summary Row */}
            {assessment.laborHours > 0 && (
              <tr className="bg-blue-50/50">
                <td className="px-4 py-2 text-sm text-gray-600" colSpan={4}>
                  Total Labor: {assessment.laborHours.toFixed(1)} hours @ $115/hr
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-700">
                  ${(assessment.laborHours * 115).toLocaleString()}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50">
              <td className="px-4 py-3 font-semibold text-gray-900" colSpan={4}>Total Estimate</td>
              <td className="px-4 py-3 text-right text-xl font-bold text-blue-600">
                ${adjustedTotal.toLocaleString()}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-4 py-2 text-center text-sm text-gray-500" colSpan={5}>
                Expected range: ${Math.round(adjustedTotal * 0.85).toLocaleString()} – ${Math.round(adjustedTotal * 1.15).toLocaleString()}
                <span className="text-xs text-gray-400 ml-1">(±15%)</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Previous Manual Overrides from Assessment Step */}
      {assessment.manualOverrides && assessment.manualOverrides.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 font-medium text-orange-800 mb-3">
            <span>📝</span>
            <span>Manual Overrides Applied in Assessment</span>
          </div>
          <div className="space-y-2">
            {assessment.manualOverrides.map((override, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-white/50 rounded px-3 py-2">
                <div>
                  <span className="font-medium text-gray-900">
                    {assessment.damages[override.damageIndex]?.area || `Item ${override.damageIndex + 1}`}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ${override.originalCost.toLocaleString()} → ${override.adjustedCost.toLocaleString()}
                  </span>
                </div>
                {override.reason && (
                  <span className="text-xs text-orange-600 italic">{override.reason}</span>
                )}
              </div>
            ))}
          </div>
          {assessment.overrideNotes && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <p className="text-sm text-orange-700">
                <span className="font-medium">Agent Notes:</span> {assessment.overrideNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Approval Requirements */}
      {requiresSeniorApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 font-medium text-amber-800">
            <span>⚠️</span>
            <span>Senior Adjuster Approval Required</span>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            {adjustedTotal > SENIOR_APPROVAL_THRESHOLD && `Estimate exceeds $${SENIOR_APPROVAL_THRESHOLD.toLocaleString()} threshold. `}
            {assessment.overallSeverity === 'Severe' && 'Severe damage classification requires senior review.'}
          </p>
        </div>
      )}

      {/* Agent Notes */}
      <div>
        <label className="block font-medium text-gray-900 mb-2">Agent Notes</label>
        <textarea
          value={agentNotes}
          onChange={(e) => setAgentNotes(e.target.value)}
          rows={3}
          placeholder="Add any notes about this assessment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Back to Assessment
        </button>
        <button
          onClick={() => setShowApprovalModal(true)}
          className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
        >
          {requiresSeniorApproval ? 'Submit for Senior Approval' : 'Approve Estimate'}
        </button>
      </div>

      {/* Approval Confirmation Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {requiresSeniorApproval ? 'Submit for Senior Approval?' : 'Approve Estimate?'}
            </h3>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-700">Claim ID:</span>
                <span className="font-medium text-gray-900">{assessment.claimId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Total Estimate:</span>
                <span className="font-medium text-gray-900">${adjustedTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">AI Confidence:</span>
                <span className="font-medium text-gray-900">{assessment.aiConfidence}%</span>
              </div>
              {adjustedDamages.some((d, i) => d.estimatedCost !== assessment.damages[i].estimatedCost) && (
                <div className="text-orange-600">
                  ⚠️ Manual cost adjustments have been made
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
