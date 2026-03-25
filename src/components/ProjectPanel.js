import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

const ANGLES = [0, 90, 180, 270];

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
}) => {
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [projectId, setProjectId] = useState('');
  const dispatch = useDispatch();

  const handleFetch = () => {
    if (projectId.trim()) {
      dispatch(fetchAction(projectId.trim()));
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
