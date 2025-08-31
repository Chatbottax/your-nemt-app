import { useEffect, useState } from 'react';
import FileDropZone from '../components/FileDropZone';
import AddressInput from '../components/AddressInput';

export default function Intake() {
  const [upload, setUpload] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [rows, setRows] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState('');
  const [accepted, setAccepted] = useState(false);
  const API = 'http://localhost:4000';

  useEffect(() => {
    fetch(`${API}/routes`).then(r=>r.json()).then(setRoutes).catch(()=>{});
  },[]);

  async function onFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/uploads`, { method: 'POST', body: fd });
    const up = await res.json();
    setUpload(up);
  }

  async function parse() {
    const res = await fetch(`${API}/uploads/${upload.id}/parse`, { method: 'POST' });
    const data = await res.json();
    const p = data.parsed_json || { students: [] };
    setParsed(p);
    setRows((p.students||[]).map(s => ({
      name: s.name || '',
      address: s.pickup_formatted_address || '',
      place: s.pickup_place_id ? { formatted: s.pickup_formatted_address, place_id: s.pickup_place_id, lat: s.pickup_lat, lng: s.pickup_lng } : null
    })));
  }

  function addRow() {
    setRows([...rows, { name: '', address: '', place: null }]);
  }

  async function accept() {
    if (!routeId) return alert('Choose a route');
    const students = rows.map(r => ({
      name: r.name,
      pickup_formatted_address: r.place?.formatted,
      pickup_place_id: r.place?.place_id,
      pickup_lat: r.place?.lat,
      pickup_lng: r.place?.lng,
    }));
    const missing = students.find(s => !s.pickup_place_id);
    if (missing) return alert('Please resolve all addresses via autocomplete');
    const res = await fetch(`${API}/uploads/${upload.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId, students })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({ error: 'Accept failed' }));
      return alert(err.error||'Accept failed');
    }
    setAccepted(true);
  }

  async function autoAssignAll() {
    const today = new Date().toISOString().slice(0,10);
    const trips = await fetch(`${API}/trips?day=${today}`).then(r=>r.json());
    const byRoute = trips.filter(t => String(t.routeId) === String(routeId));
    for (const t of byRoute) {
      // best-effort
      await fetch(`${API}/trips/${t.id}/assign`, { method: 'POST' });
    }
    alert('Auto-assign completed');
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl">Intake</h1>
      {!upload && <FileDropZone onFile={onFile} />}
      {upload && !parsed && <button className="bg-primary text-black px-4 py-2" onClick={parse}>Parse Upload</button>}
      {parsed && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label>Route:</label>
            <select className="bg-panel p-2" value={routeId} onChange={e=>setRouteId(e.target.value)}>
              <option value="">Select route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="ml-auto border border-secondary px-2 py-1" onClick={addRow}>Add Student Row</button>
          </div>
          <table className="w-full text-left">
            <thead><tr><th className="w-1/4">Name</th><th>Pickup Address</th></tr></thead>
            <tbody>
              {rows.map((r,idx)=>(
                <tr key={idx}>
                  <td>
                    <input className="w-full p-2 bg-panel" value={r.name} placeholder="Student name" onChange={e=>{
                      const next=[...rows]; next[idx]={...next[idx], name:e.target.value}; setRows(next);
                    }} />
                  </td>
                  <td>
                    <AddressInput value={r.address} onSelect={addr=>{
                      const next=[...rows]; next[idx]={...next[idx], address: addr.formatted, place: addr}; setRows(next);
                    }} />
                    {r.place && <div className="text-secondary text-sm mt-1">{r.place.formatted}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <button className="bg-primary text-black px-4 py-2" onClick={accept}>Accept Selected Rows</button>
            {accepted && <button className="border border-secondary px-4 py-2" onClick={autoAssignAll}>Auto-assign all trips</button>}
          </div>
        </div>
      )}
    </div>
  );
}
