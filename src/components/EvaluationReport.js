import { useState } from 'react';

const PASS_COLOR  = '#16a34a';
const FAIL_COLOR  = '#dc2626';
const INFO_COLOR  = '#2563eb';
const MUTED_COLOR = '#6b7280';

const Badge = ({ pass, informational }) => {
  if (informational) return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#dbeafe', color: INFO_COLOR }}>INFO</span>;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: pass ? '#dcfce7' : '#fee2e2', color: pass ? PASS_COLOR : FAIL_COLOR }}>
      {pass ? 'PASS' : 'FAIL'}
    </span>
  );
};

const Row = ({ label, result }) => {
  const [open, setOpen] = useState(false);
  if (!result) return null;

  const isInfo  = result.informational === true;
  const hasFail = !isInfo && !result.pass;
  const hasDetail = Object.keys(result).length > (isInfo ? 1 : 2);

  return (
    <div style={{ borderBottom: '1px solid #f3f4f6' }}>
      <div
        onClick={() => hasDetail && setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: hasDetail ? 'pointer' : 'default', background: hasFail ? '#fff5f5' : 'transparent' }}
      >
        <Badge pass={result.pass} informational={isInfo} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: hasFail ? 600 : 400, color: hasFail ? FAIL_COLOR : '#111' }}>{label}</span>
        {result.reason && <span style={{ fontSize: 12, color: FAIL_COLOR }}>{result.reason}</span>}
        {hasDetail && <span style={{ fontSize: 11, color: MUTED_COLOR }}>{open ? '▲' : '▼'}</span>}
      </div>

      {open && (
        <pre style={{ margin: 0, padding: '8px 16px 12px', fontSize: 11, background: '#f9fafb', color: '#374151', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
};

const Section = ({ title, icon, checks }) => {
  const [open, setOpen] = useState(true);
  const allPass = checks.every(([, r]) => !r || r.informational || r.pass);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: allPass ? '#f0fdf4' : '#fff5f5' }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: allPass ? PASS_COLOR : FAIL_COLOR }}>{title}</span>
        <span style={{ fontSize: 11, color: MUTED_COLOR }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && checks.map(([label, result]) => <Row key={label} label={label} result={result} />)}
    </div>
  );
};

const ScoreBadge = ({ score, grade }) => {
  const color = score >= 95 ? PASS_COLOR : score >= 80 ? '#d97706' : score >= 60 ? '#ea580c' : FAIL_COLOR;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', border: `5px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: MUTED_COLOR }}>/ 100</span>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{grade}</div>
        <div style={{ fontSize: 12, color: MUTED_COLOR }}>Grade</div>
      </div>
    </div>
  );
};

const EvaluationReport = ({ report }) => {
  const [jsonOpen, setJsonOpen] = useState(false);
  if (!report) return null;

  const { overall, scores } = report;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  };

  const informationals = [
    overall.informationals.avgPositionDriftX != null  && `Avg position drift X: ${overall.informationals.avgPositionDriftX}`,
    overall.informationals.avgPositionDriftZ != null  && `Avg position drift Z: ${overall.informationals.avgPositionDriftZ}`,
    overall.informationals.avgResizeErrorPct != null  && `Avg resize error: ${overall.informationals.avgResizeErrorPct}%`,
    overall.informationals.lightPositionDrift != null && `Light position drift: ${overall.informationals.lightPositionDrift}`,
    overall.informationals.latencyMs != null          && `Latency: ${overall.informationals.latencyMs}ms`,
  ].filter(Boolean);

  return (
    <div style={{ marginTop: 32, fontFamily: 'sans-serif', maxWidth: 1100, margin: '32px auto 0', padding: '0 16px' }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <ScoreBadge score={overall.score} grade={overall.grade} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Autofit Evaluation Report</div>
            <div style={{ fontSize: 12, color: MUTED_COLOR, marginBottom: 8 }}>{report.runId}</div>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: PASS_COLOR, fontWeight: 600 }}>{overall.passedHardChecks} passed</span>
              <span style={{ color: MUTED_COLOR }}> / {overall.totalHardChecks} checks</span>
            </div>
            {overall.failedChecks.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: FAIL_COLOR }}>
                Failed: {overall.failedChecks.join(', ')}
              </div>
            )}
          </div>
          {informationals.length > 0 && (
            <div style={{ fontSize: 12, color: MUTED_COLOR, lineHeight: 1.8 }}>
              {informationals.map((s, i) => <div key={i}>{s}</div>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copyJson} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>
              Copy JSON
            </button>
            <button onClick={() => setJsonOpen(o => !o)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>
              {jsonOpen ? 'Hide JSON' : 'View JSON'}
            </button>
          </div>
        </div>

        {/* Raw JSON */}
        {jsonOpen && (
          <pre style={{ margin: 0, padding: '16px 24px', fontSize: 11, background: '#1e1e1e', color: '#d4d4d4', overflowX: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(report, null, 2)}
          </pre>
        )}

        {/* Sections */}
        <div style={{ padding: 16 }}>
          <Section title="A — Zone Placement" icon="📐" checks={[
            ['A1 In-bounds',              scores.placement?.inBounds],
            ['A2 Wall snap accuracy',     scores.placement?.wallSnapAccuracy],
            ['A3 Corner snap accuracy',   scores.placement?.cornerSnapAccuracy],
            ['A4 Position drift',         scores.placement?.positionDrift],
            ['A5 Module out-of-bounds',   scores.placement?.moduleOutOfBounds],
          ]} />

          <Section title="B — Zone Integrity" icon="🔒" checks={[
            ['B1 Zone count',           scores.integrity?.zoneCount],
            ['B2 Type preservation',    scores.integrity?.typePreservation],
            ['B3 No overlaps',          scores.integrity?.overlaps],
            ['B4 Neighbor gaps',        scores.integrity?.neighborGaps],
            ['B5 Module count',         scores.integrity?.moduleCount],
          ]} />

          <Section title="C — Scaling" icon="📏" checks={[
            ['C1 Scale factor correctness',   scores.scaling?.scaleFactors],
            ['C2 Zone resize accuracy',       scores.scaling?.zoneResizeAccuracy],
            ['C3 L-corner / loft skipped',    scores.scaling?.cornerLoftSkipped],
          ]} />

          <Section title="D — Wall Mapping" icon="🧱" checks={[
            ['D1 Mapping completeness',  scores.wallMapping?.completeness],
            ['D2 Angle alignment',       scores.wallMapping?.angleAlignment],
          ]} />

          <Section title="E — Lights" icon="💡" checks={[
            ['E1 Light count',           scores.lights?.countMatch],
            ['E2 Position drift',        scores.lights?.positionDrift],
            ['E3 Bloom / exposure',      scores.lights?.bloomExposure],
          ]} />

          <Section title="F — API Execution" icon="🌐" checks={[
            ['F1 copyRoomData',   scores.api?.copyRoomData],
            ['F2 autoResize',     scores.api?.autoResize],
            ['F3 Transforms',     scores.api?.transforms],
            ['F4 Lights PUT',     scores.api?.lights],
            ['F5 Latency',        scores.api?.latencyMs],
          ]} />
        </div>
      </div>
    </div>
  );
};

export default EvaluationReport;
