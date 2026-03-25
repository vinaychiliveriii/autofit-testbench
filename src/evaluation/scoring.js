// Hard checks contribute to the score.
// Informational metrics are always reported but never penalise.
const HARD_CHECKS = [
  ['placement',   'inBounds'],
  ['placement',   'wallSnapAccuracy'],
  ['placement',   'cornerSnapAccuracy'],
  ['placement',   'moduleOutOfBounds'],
  ['integrity',   'zoneCount'],
  ['integrity',   'typePreservation'],
  ['integrity',   'overlaps'],
  ['integrity',   'neighborGaps'],
  ['integrity',   'moduleCount'],
  ['scaling',     'scaleFactors'],
  ['scaling',     'cornerLoftSkipped'],
  ['wallMapping', 'completeness'],
  ['lights',      'countMatch'],
  ['lights',      'bloomExposure'],
  ['api',         'copyRoomData'],
  ['api',         'autoResize'],
  ['api',         'transforms'],
  ['api',         'lights'],
];

const grade = (score) => {
  if (score >= 95) return 'A';
  if (score >= 80) return 'B';
  if (score >= 60) return 'C';
  return 'F';
};

export const computeScore = (evaluationResult, meta = {}) => {
  const failedChecks = [];
  let passed = 0;

  HARD_CHECKS.forEach(([section, check]) => {
    const result = evaluationResult[section]?.[check];
    if (!result) return;
    if (result.pass) {
      passed++;
    } else {
      failedChecks.push(`${section}.${check}`);
    }
  });

  const total = HARD_CHECKS.length;
  const score = Math.round((passed / total) * 100);

  return {
    runId: new Date().toISOString(),
    ...meta,
    scores: evaluationResult,
    overall: {
      score,
      grade: grade(score),
      totalHardChecks: total,
      passedHardChecks: passed,
      failedChecks,
      informationals: {
        avgPositionDriftX:  evaluationResult.placement?.positionDrift?.avgDriftX,
        avgPositionDriftZ:  evaluationResult.placement?.positionDrift?.avgDriftZ,
        avgResizeErrorPct:  evaluationResult.scaling?.zoneResizeAccuracy?.avgErrorPct,
        lightPositionDrift: evaluationResult.lights?.positionDrift?.avgDrift,
        latencyMs:          evaluationResult.api?.latencyMs?.value,
      },
    },
  };
};
