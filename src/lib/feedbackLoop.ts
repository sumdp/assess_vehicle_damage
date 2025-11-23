/**
 * Feedback Loop for Continuous AI Learning
 *
 * This module captures agent interactions with AI assessments to enable
 * continuous improvement of the damage detection model.
 *
 * In production, this data would be:
 * 1. Stored in a database for analysis
 * 2. Used to retrain/fine-tune the CV model
 * 3. Monitored for accuracy drift
 * 4. Used to identify systematic errors
 */

export interface FeedbackEntry {
  id: string;
  timestamp: Date;
  claimId: string;

  // Original AI assessment
  aiAssessment: {
    damages: Array<{
      area: string;
      type: string;
      severity: string;
      estimatedCost: number;
      confidence: number;
    }>;
    totalEstimate: number;
    aiConfidence: number;
    overallSeverity: string;
  };

  // Agent modifications
  agentModifications: {
    costAdjustments: Array<{
      damageIndex: number;
      originalCost: number;
      adjustedCost: number;
      reason: string;
    }>;
    removedItems: number[];
    addedNotes: string;
    finalTotal: number;
  };

  // Interaction metadata
  interactionType: 'auto_approved' | 'quick_approved' | 'agent_reviewed' | 'rejected';
  reviewTimeSeconds: number;
  agentId: string;

  // Computed metrics for learning
  metrics: {
    estimateAccuracyDelta: number; // percentage difference from final
    wasOverridden: boolean;
    overrideDirection: 'increased' | 'decreased' | 'none';
    confidenceWasAccurate: boolean; // high confidence = no major changes
  };
}

// In-memory store for demo (would be database in production)
const feedbackStore: FeedbackEntry[] = [];

/**
 * Record feedback when an assessment is completed
 */
export function recordFeedback(entry: Omit<FeedbackEntry, 'id' | 'timestamp' | 'metrics'>): FeedbackEntry {
  const fullEntry: FeedbackEntry = {
    ...entry,
    id: `FB-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date(),
    metrics: calculateMetrics(entry),
  };

  feedbackStore.push(fullEntry);

  // Log for demo visibility
  console.log('[FeedbackLoop] Recorded:', {
    claimId: fullEntry.claimId,
    interactionType: fullEntry.interactionType,
    wasOverridden: fullEntry.metrics.wasOverridden,
    estimateAccuracyDelta: `${fullEntry.metrics.estimateAccuracyDelta.toFixed(1)}%`,
  });

  return fullEntry;
}

/**
 * Calculate learning metrics from the feedback
 */
function calculateMetrics(entry: Omit<FeedbackEntry, 'id' | 'timestamp' | 'metrics'>): FeedbackEntry['metrics'] {
  const originalTotal = entry.aiAssessment.totalEstimate;
  const finalTotal = entry.agentModifications.finalTotal;

  const delta = originalTotal > 0
    ? ((finalTotal - originalTotal) / originalTotal) * 100
    : 0;

  const wasOverridden = entry.agentModifications.costAdjustments.length > 0 ||
                        entry.agentModifications.removedItems.length > 0;

  const overrideDirection: 'increased' | 'decreased' | 'none' =
    !wasOverridden ? 'none' :
    finalTotal > originalTotal ? 'increased' : 'decreased';

  // High confidence should correlate with fewer changes
  const significantChange = Math.abs(delta) > 15; // >15% change is significant
  const confidenceWasAccurate = entry.aiAssessment.aiConfidence >= 85
    ? !significantChange
    : significantChange; // Low confidence should have changes

  return {
    estimateAccuracyDelta: delta,
    wasOverridden,
    overrideDirection,
    confidenceWasAccurate,
  };
}

/**
 * Get aggregated statistics for the analytics dashboard
 */
export function getFeedbackStats(): {
  totalAssessments: number;
  autoApprovedRate: number;
  overrideRate: number;
  averageAccuracyDelta: number;
  confidenceCalibration: number;
  byInteractionType: Record<string, number>;
  recentFeedback: FeedbackEntry[];
} {
  if (feedbackStore.length === 0) {
    return {
      totalAssessments: 0,
      autoApprovedRate: 0,
      overrideRate: 0,
      averageAccuracyDelta: 0,
      confidenceCalibration: 0,
      byInteractionType: {},
      recentFeedback: [],
    };
  }

  const autoApproved = feedbackStore.filter(f =>
    f.interactionType === 'auto_approved' || f.interactionType === 'quick_approved'
  ).length;

  const overridden = feedbackStore.filter(f => f.metrics.wasOverridden).length;

  const avgDelta = feedbackStore.reduce((sum, f) =>
    sum + Math.abs(f.metrics.estimateAccuracyDelta), 0
  ) / feedbackStore.length;

  const calibrationAccurate = feedbackStore.filter(f =>
    f.metrics.confidenceWasAccurate
  ).length;

  const byType: Record<string, number> = {};
  feedbackStore.forEach(f => {
    byType[f.interactionType] = (byType[f.interactionType] || 0) + 1;
  });

  return {
    totalAssessments: feedbackStore.length,
    autoApprovedRate: (autoApproved / feedbackStore.length) * 100,
    overrideRate: (overridden / feedbackStore.length) * 100,
    averageAccuracyDelta: avgDelta,
    confidenceCalibration: (calibrationAccurate / feedbackStore.length) * 100,
    byInteractionType: byType,
    recentFeedback: feedbackStore.slice(-10).reverse(),
  };
}

/**
 * Get feedback entries that indicate model errors
 * (for retraining pipeline in production)
 */
export function getTrainingCandidates(): FeedbackEntry[] {
  return feedbackStore.filter(f =>
    f.metrics.wasOverridden &&
    Math.abs(f.metrics.estimateAccuracyDelta) > 20 // >20% error
  );
}

/**
 * Clear feedback store (for testing)
 */
export function clearFeedback(): void {
  feedbackStore.length = 0;
}

/**
 * Export all feedback (for analytics/export)
 */
export function exportFeedback(): FeedbackEntry[] {
  return [...feedbackStore];
}
