import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createRoom, fetchDestProject } from '../store/actions';
import toast from 'react-hot-toast';

const ANGLES = [0, 90, 180, 270];
const ROOM_TYPES = ['Livingroom', 'Bedroom', 'Kitchen', 'Bathroom'];
const SHAPES = ['Rectangular'];

const ProjectPanel = ({
  title,
  fetchAction,
  selectAction,
  projectDetails,
  selectedSourceRoom,
  loading,
  error,
  showAngle = false,
  onAngleChange,
  showCreateRoom = false,
}) => {
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [projectId, setProjectId] = useState('');
  const [createRoomType, setCreateRoomType] = useState('Bedroom');
  const [createWidth, setCreateWidth] = useState('');
  const [createLength, setCreateLength] = useState('');
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Auto-expand when project loads with no rooms; collapse when rooms exist
  useEffect(() => {
    if (!showCreateRoom || !projectDetails) return;
    const roomCount = projectDetails.floors?.reduce((n, f) => n + (f.rooms?.length ?? 0), 0) ?? 0;
    setCreateOpen(roomCount === 0);
  }, [projectDetails, showCreateRoom]);
  const dispatch = useDispatch();
  const { roomCreating } = useSelector((state) => state);

  const handleFetch = () => {
    if (projectId.trim()) {
      dispatch(fetchAction(projectId.trim()));
    }
  };

  const handleCreateRoom = async () => {
    const widthMm  = parseInt(createWidth,  10);
    const lengthMm = parseInt(createLength, 10);
    if (!widthMm || !lengthMm || widthMm <= 0 || lengthMm <= 0) {
      toast.error('Please enter valid width and length in mm.');
      return;
    }
    const firstFloor = projectDetails?.floors?.[0];
    if (!firstFloor) {
      toast.error('No floor found in destination project.');
      return;
    }
    setCreating(true);
    try {
      await new Promise((resolve, reject) => {
        dispatch(createRoom(
          {
            projectId: projectDetails.projectId,
            floorId: firstFloor.id,
            roomType: createRoomType,
            widthMm,
            lengthMm,
            floorRooms: firstFloor.rooms ?? [],
          },
          { resolve, reject }
        ));
      });
      toast.success(`Room created with dimensions ${widthMm}mm × ${lengthMm}mm`);
      dispatch(fetchDestProject(projectDetails.projectId, { silent: true }));
    } catch (e) {
      toast.error(e?.message || 'Room creation failed.');
    } finally {
      setCreating(false);
    }
  };

  const allRooms = [];
  if (projectDetails?.floors) {
    const projectId = projectDetails.projectId;
    projectDetails.floors.forEach((floor) => {
      floor.rooms.forEach((room) => {
        allRooms.push({
          projectId: projectId,
          floorId: floor.id,
          roomId: room.id,
          roomName: room.name,
          roomType: room.roomType,
          roomShape: room.roomShape,
          roomPriceTotal: room.roomPriceTotal,
          unitEntries: room.unitEntries,
          room: room, // full room details for later use
        });
      });
    });
  }

  const handleRoomSelect = (e) => {
    const roomId = e.target.value;
    if (!roomId) {
      dispatch(selectAction(null));
      return;
    }
    const room = allRooms.find((r) => String(r.roomId) === roomId);
    if (room) dispatch(selectAction(room));
  };

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          placeholder="Enter project ID"
          style={{ flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 }}
        />
        <button
          onClick={handleFetch}
          disabled={loading}
          style={{ padding: '8px 16px', fontSize: 14, cursor: 'pointer', borderRadius: 4, border: '1px solid #888' }}
        >
          {loading ? 'Fetching...' : 'Fetch'}
        </button>
      </div>

      {error && <p style={{ color: 'red', marginTop: 12 }}>Error: {error}</p>}

      {allRooms.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Select Room</label>
          <select
            onChange={handleRoomSelect}
            defaultValue=""
            style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 }}
          >
            <option value="">-- Select a room --</option>
            {allRooms.map((room) => (
              <option key={room.roomId} value={room.roomId}>
                {room.roomName}
              </option>
            ))}
          </select>
        </div>
      )}

      {showAngle && selectedSourceRoom && (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Angle</label>
          <select
            value={selectedAngle}
            onChange={(e) => {
              const angle = parseInt(e.target.value);
              setSelectedAngle(angle);
              onAngleChange?.(angle);
            }}
            style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 }}
          >
            {ANGLES.map((a) => (
              <option key={a} value={a}>{a}°</option>
            ))}
          </select>
        </div>
      )}

      {showCreateRoom && projectDetails && (
        <div style={{ marginTop: 20, borderRadius: 6, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div
            onClick={() => setCreateOpen((o) => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Create New Room</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{createOpen ? '▲' : '▼'}</span>
          </div>

          {createOpen && <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Room Type</label>
                <select
                  value={createRoomType}
                  onChange={(e) => setCreateRoomType(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4 }}
                >
                  {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Shape</label>
                <select
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4 }}
                >
                  {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Width (mm)</label>
                <input
                  type="number"
                  value={createWidth}
                  onChange={(e) => setCreateWidth(e.target.value)}
                  placeholder="e.g. 3600"
                  min="0"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Length (mm)</label>
                <input
                  type="number"
                  value={createLength}
                  onChange={(e) => setCreateLength(e.target.value)}
                  placeholder="e.g. 4200"
                  min="0"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={creating || roomCreating}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: (creating || roomCreating) ? 'not-allowed' : 'pointer',
                borderRadius: 4,
                border: '1px solid #16a34a',
                background: (creating || roomCreating) ? '#86efac' : '#16a34a',
                color: '#fff',
                alignSelf: 'flex-start',
              }}
            >
              {(creating || roomCreating) ? 'Creating...' : 'Create Room'}
            </button>
          </div>}
        </div>
      )}

      {selectedSourceRoom && false && (
        <div style={{ marginTop: 16, padding: 14, background: '#eef6ff', borderRadius: 6 }}>
          <h4 style={{ marginTop: 0 }}>Selected Room</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {Object.entries(selectedSourceRoom).map(([key, value]) => (
                <tr key={key} style={{ borderBottom: '1px solid #d0e4f7' }}>
                  <td style={{ padding: '5px 8px', fontWeight: 600, color: '#555', width: '45%' }}>{key}</td>
                  <td style={{ padding: '5px 8px', color: '#222' }}>{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectPanel;
