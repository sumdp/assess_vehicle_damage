'use client';

import { useState } from 'react';
import { FinalAssessment } from './AgentReview';
import { ClaimData } from './ClaimForm';
import AnalyticsDashboard from './AnalyticsDashboard';

interface ClaimConfirmationProps {
  claimData: ClaimData;
  finalAssessment: FinalAssessment;
  onNewClaim: () => void;
  processingTime?: number; // in seconds
}

export default function ClaimConfirmation({ claimData, finalAssessment, onNewClaim, processingTime }: ClaimConfirmationProps) {
  const { assessment, agentNotes, adjustedTotal, adjustments, approvedBy, approvalLevel, approvedAt } = finalAssessment;
  const [isExporting, setIsExporting] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Calculate metrics
  const aiProcessingTime = assessment.processingTime || processingTime || 0;
  const manualTimeEstimate = 15 * 60; // 15 minutes in seconds (industry average for manual assessment)
  const timeSavingsPercent = manualTimeEstimate > 0
    ? Math.round((1 - (aiProcessingTime / manualTimeEstimate)) * 100)
    : 0;

  // Format time as "Xm Ys"
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs.toFixed(1)}s`;
  };

  // Generate PDF using browser capabilities
  const handleExportPDF = async () => {
    setIsExporting(true);

    try {
      // Create a new window with print-optimized content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to export PDF');
        setIsExporting(false);
        return;
      }

      const pdfContent = generatePDFContent();
      printWindow.document.write(pdfContent);
      printWindow.document.close();

      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        printWindow.print();
        // Close window after print dialog (user can cancel or save as PDF)
        printWindow.onafterprint = () => printWindow.close();
      };
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to generate PDF. Please try the Print Summary option.');
    } finally {
      setIsExporting(false);
    }
  };

  // Generate HTML content for PDF
  const generatePDFContent = () => {
    const damageRows = assessment.damages.map((damage, index) => {
      const adjustment = adjustments.find(a => a.damageIndex === index);
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${damage.area}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${damage.type}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${damage.severity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${damage.confidence}%</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${adjustment
              ? `<span style="text-decoration: line-through; color: #9ca3af;">$${adjustment.originalCost.toLocaleString()}</span>
                 <strong style="color: #ea580c;">$${adjustment.adjustedCost.toLocaleString()}</strong>`
              : `$${damage.estimatedCost.toLocaleString()}`
            }
          </td>
        </tr>
      `;
    }).join('');

    const adjustmentDetails = adjustments.length > 0 ? `
      <div style="margin-top: 20px; padding: 15px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #c2410c;">Manual Adjustments</h3>
        ${adjustments.map(adj => `
          <div style="margin-bottom: 8px; font-size: 14px;">
            <strong>${assessment.damages[adj.damageIndex]?.area || 'Item ' + (adj.damageIndex + 1)}</strong>:
            $${adj.originalCost.toLocaleString()} → $${adj.adjustedCost.toLocaleString()}
            ${adj.reason ? `<em style="color: #9a3412;"> (${adj.reason})</em>` : ''}
          </div>
        `).join('')}
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Claim Summary - ${assessment.claimId}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #1f2937;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #16a34a;
          }
          .logo { font-size: 24px; margin-bottom: 10px; }
          .claim-id {
            background: #dcfce7;
            color: #166534;
            padding: 5px 15px;
            border-radius: 20px;
            display: inline-block;
            font-weight: 600;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .info-item label {
            font-size: 12px;
            color: #6b7280;
            display: block;
          }
          .info-item value {
            font-weight: 500;
            color: #1f2937;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            text-align: left;
            padding: 10px 8px;
            background: #f9fafb;
            font-size: 12px;
            color: #6b7280;
            border-bottom: 2px solid #e5e7eb;
          }
          th:last-child { text-align: right; }
          .total-row {
            background: #f0fdf4;
          }
          .total-row td {
            padding: 15px 8px;
            font-weight: 600;
          }
          .total-amount {
            font-size: 24px;
            color: #16a34a;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-yellow { background: #fef9c3; color: #854d0e; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .notes-section {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🚗 ClaimAssist AI</div>
          <h1 style="margin: 10px 0; font-size: 22px;">
            ${approvalLevel === 'senior' ? 'Claim Submitted for Senior Approval' : 'Repair Authorization'}
          </h1>
          <div class="claim-id">${assessment.claimId}</div>
        </div>

        <div class="section">
          <div class="section-title">Policy & Vehicle Information</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Policy Number</label>
              <value>${claimData.policyNumber}</value>
            </div>
            <div class="info-item">
              <label>Vehicle</label>
              <value>${claimData.vehicleYear} ${claimData.vehicleMake} ${claimData.vehicleModel}</value>
            </div>
            <div class="info-item">
              <label>Accident Date</label>
              <value>${new Date(claimData.accidentDate).toLocaleDateString()}</value>
            </div>
            <div class="info-item">
              <label>Approved By</label>
              <value>${approvedBy}</value>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Damage Assessment Details</div>
          <table>
            <thead>
              <tr>
                <th>Damage Area</th>
                <th>Type</th>
                <th>Severity</th>
                <th>AI Confidence</th>
                <th>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              ${damageRows}
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Labor</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;" colspan="3">${assessment.laborHours} hours @ $85/hr</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(assessment.laborHours * 85).toLocaleString()}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="4"><strong>Total Approved Amount</strong></td>
                <td style="text-align: right;" class="total-amount">$${adjustedTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          ${adjustmentDetails}
        </div>

        <div class="section">
          <div class="section-title">Assessment Summary</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Overall Severity</label>
              <value><span class="badge ${
                assessment.overallSeverity === 'Minor' ? 'badge-green' :
                assessment.overallSeverity === 'Moderate' ? 'badge-yellow' : 'badge-red'
              }">${assessment.overallSeverity}</span></value>
            </div>
            <div class="info-item">
              <label>AI Confidence</label>
              <value>${assessment.aiConfidence}%</value>
            </div>
            <div class="info-item">
              <label>Items Identified</label>
              <value>${assessment.damages.length} damage areas</value>
            </div>
            <div class="info-item">
              <label>Processing Status</label>
              <value>${approvalLevel === 'senior' ? 'Pending Senior Review' : 'Approved'}</value>
            </div>
          </div>
        </div>

        ${agentNotes ? `
          <div class="section">
            <div class="section-title">Agent Notes</div>
            <div class="notes-section">${agentNotes}</div>
          </div>
        ` : ''}

        ${assessment.overrideNotes ? `
          <div class="section">
            <div class="section-title">Override Notes</div>
            <div class="notes-section">${assessment.overrideNotes}</div>
          </div>
        ` : ''}

        <div class="footer">
          <p>Generated by ClaimAssist AI on ${approvedAt.toLocaleString()}</p>
          <p>This document is an official record of the claim assessment.</p>
          <p style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
            Document ID: ${assessment.claimId} | AI-Assisted Assessment
          </p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-6">
        <div className="text-6xl mb-4">✓</div>
        <h2 className="text-2xl font-semibold text-green-700">
          {approvalLevel === 'senior' ? 'Submitted for Senior Approval' : 'Claim Assessment Complete'}
        </h2>
        <p className="text-gray-700 mt-2">
          {approvalLevel === 'senior'
            ? 'The claim has been forwarded to a senior adjuster for final authorization.'
            : 'The repair authorization has been issued.'}
        </p>
      </div>

      {/* AI Performance Metrics */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <h3 className="text-center text-sm font-medium text-indigo-800 mb-4 uppercase tracking-wide">
          AI Processing Metrics
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-1">
              {formatTime(aiProcessingTime)}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Processing Time
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-1">
              {assessment.aiConfidence}%
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              AI Confidence
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              -{timeSavingsPercent}%
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              vs Manual Time
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-4">
          Estimated manual assessment time: ~15 minutes
        </p>
      </div>

      {/* Claim Summary Card */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-green-50 px-4 py-3 border-b">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-green-800">Claim Summary</h3>
            <span className="text-sm bg-green-200 text-green-800 px-3 py-1 rounded-full">
              {assessment.claimId}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Policy & Vehicle Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Policy Number</p>
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
              <p className="text-gray-600">Approved By</p>
              <p className="font-medium text-gray-900">{approvedBy}</p>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">Damages Identified</span>
              <span className="font-medium text-gray-900">{assessment.damages.length} items</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">Labor Hours</span>
              <span className="font-medium text-gray-900">{assessment.laborHours} hours</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">AI Confidence</span>
              <span className="font-medium text-gray-900">{assessment.aiConfidence}%</span>
            </div>
            {adjustments.length > 0 && (
              <div className="flex justify-between items-center mb-2 text-orange-600">
                <span>Manual Adjustments</span>
                <span>{adjustments.length} items adjusted</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t mt-2">
              <span className="text-lg font-semibold text-gray-900">Approved Amount</span>
              <span className="text-2xl font-bold text-green-600">${adjustedTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-3">Next Steps</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          {approvalLevel === 'senior' ? (
            <>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                <span>Senior adjuster will review the assessment within 24 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                <span>Upon approval, repair authorization will be issued</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                <span>Policyholder will be notified with approved repair shops</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                <span>Repair authorization sent to policyholder</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                <span>Policyholder selects approved repair shop</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                <span>Repairs completed and final inspection scheduled</span>
              </li>
            </>
          )}
        </ol>
      </div>

      {/* Agent Notes */}
      {agentNotes && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Agent Notes</h3>
          <p className="text-gray-700 text-sm">{agentNotes}</p>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-center text-sm text-gray-600">
        Processed on {approvedAt.toLocaleString()}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {/* AI Performance Stats Button */}
        <button
          onClick={() => setShowAnalytics(true)}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          View AI Workflow Performance Stats
        </button>

        <div className="flex gap-4">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium disabled:bg-green-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Print Summary
          </button>
        </div>
        <button
          onClick={onNewClaim}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Process New Claim
        </button>
      </div>

      {/* Production Note */}
      <p className="text-xs text-center text-gray-400">
        In production, PDF export can be configured to use server-side generation for consistent formatting.
      </p>

      {/* Analytics Dashboard Modal */}
      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  );
}
