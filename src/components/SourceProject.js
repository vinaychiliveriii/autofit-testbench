import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSourceProject,
  fetchDestProject,
  selectRoom,
  selectDestRoom,
  copyZones,
} from '../store/actions';
import ProjectPanel from './ProjectPanel';
import { getRelativePositionsWrapper } from './AutoFit';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'computing', label: 'Computing zone positions...' },
  { key: 'copying',   label: 'Copying zones to destination...' },
  { key: 'done',      label: 'Auto-fit complete!' },
];

const SourceProject = () => {
  const [importError, setImportError] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(null); // null | 'computing' | 'copying' | 'done' | 'failed'
  const dispatch = useDispatch();

  const {
    sourceProjectDetails, selectedSourceRoom, sourceLoading, sourceError,
    destProjectDetails, selectedDestRoom, destLoading, destError,
  } = useSelector((state) => state);

  const handleImport = async () => {
    setImportError(null);
    setCurrentStep(null);

    if (!selectedSourceRoom || !selectedDestRoom) {
      setImportError('Please select a room in both Source and Destination panels.');
      return;
    }

    if (selectedSourceRoom.projectId === selectedDestRoom.projectId) {
      setImportError('Source and destination projects must be different.');
      return;
    }

    if (selectedSourceRoom.roomType !== selectedDestRoom.roomType) {
      setImportError(`Room types must match. Source: "${selectedSourceRoom.roomType}", Destination: "${selectedDestRoom.roomType}".`);
      return;
    }

    const srcPrice = selectedSourceRoom.roomPriceTotal?.totalPrice ?? 0;
    const srcEntries = selectedSourceRoom.unitEntries ?? [];
    if (srcPrice <= 0) {
      setImportError('Source room must have a price greater than 0.');
      return;
    }
    if (srcEntries.length === 0) {
      setImportError('Source room must have at least one unit entry.');
      return;
    }

    const destPrice = selectedDestRoom.roomPriceTotal?.totalPrice ?? -1;
    const destEntries = selectedDestRoom.unitEntries ?? [1];
    if (destPrice !== 0) {
      setImportError('Destination room price must be 0.');
      return;
    }
    if (destEntries.length !== 0) {
      setImportError('Destination room must have no unit entries.');
      return;
    }

    console.log('import room button clicked');

    try {
      setImportLoading(true);

      // Step 1 — compute zones
      setCurrentStep('computing');
      let zonesData = getRelativePositionsWrapper(
        selectedSourceRoom.room,
        selectedDestRoom.room,
        sourceProjectDetails,
        destProjectDetails,
        parseInt(0)
      );
      console.log('zonesData', zonesData);
      zonesData = [zonesData];

      // Step 2 — copy zones
      setCurrentStep('copying');
      if (zonesData?.length) {
        const promises = zonesData.map((zone, keyIndex) =>
          new Promise((resolve, reject) => {
            dispatch(copyZones({ ...zone, keyIndex }, { resolve, reject }));
          })
        );
        await Promise.all(promises);
      }

      // Done
      setCurrentStep('done');
      toast.success('Rooms auto fitted successfully!');
    } catch (err) {
      setCurrentStep('failed');
      setImportError(err?.message || 'Auto-fit failed. Please try again.');
      toast.error('Auto-fit failed.');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: 32 }}>
        <ProjectPanel
          title="Source Project"
          fetchAction={fetchSourceProject}
          selectAction={selectRoom}
          projectDetails={sourceProjectDetails}
          selectedSourceRoom={selectedSourceRoom}
          loading={sourceLoading}
          error={sourceError}
        />

        <div style={{ width: 1, background: '#ddd', flexShrink: 0 }} />

        <ProjectPanel
          title="Destination Project"
          fetchAction={fetchDestProject}
          selectAction={selectDestRoom}
          projectDetails={destProjectDetails}
          selectedSourceRoom={selectedDestRoom}
          loading={destLoading}
          error={destError}
        />
      </div>

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleImport}
          disabled={importLoading}
          style={{
            padding: '10px 28px',
            fontSize: 15,
            fontWeight: 600,
            cursor: importLoading ? 'not-allowed' : 'pointer',
            borderRadius: 6,
            border: '1px solid #2563eb',
            background: importLoading ? '#93b4f5' : '#2563eb',
            color: '#fff',
          }}
        >
          {importLoading ? 'Working...' : 'Import Room with Autofit'}
        </button>

        {/* Step progress */}
        {currentStep && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {STEPS.map((step, i) => {
              const stepKeys = STEPS.map((s) => s.key);
              const currentIdx = stepKeys.indexOf(currentStep === 'failed' ? 'copying' : currentStep);
              const stepIdx = i;
              const isDone = currentStep === 'done' || stepIdx < currentIdx;
              const isActive = stepIdx === currentIdx && currentStep !== 'done' && currentStep !== 'failed';
              const isFailed = currentStep === 'failed' && stepIdx === currentIdx;

              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 700,
                    background: isFailed ? '#ef4444' : isDone ? '#16a34a' : isActive ? '#2563eb' : '#e5e7eb',
                    color: isFailed || isDone || isActive ? '#fff' : '#9ca3af',
                    flexShrink: 0,
                  }}>
                    {isFailed ? '✕' : isDone ? '✓' : i + 1}
                  </div>
                  <span style={{
                    fontSize: 13,
                    color: isFailed ? '#ef4444' : isDone ? '#16a34a' : isActive ? '#2563eb' : '#9ca3af',
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 24, height: 2, background: isDone ? '#16a34a' : '#e5e7eb', marginLeft: 4 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {importError && (
          <p style={{ color: '#ef4444', margin: 0, fontSize: 13 }}>{importError}</p>
        )}
      </div>
    </div>
  );
};

export default SourceProject;
