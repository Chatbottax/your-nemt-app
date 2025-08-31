import { useState, useEffect } from 'react';
import AddressInput from '../components/AddressInput';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ name: '', address: null });

  const API = 'http://localhost:4000';
  useEffect(() => { fetchDrivers(); }, []);

  async function fetchDrivers() {
    const res = await fetch(`${API}/drivers`);
    setDrivers(await res.json());
  }

  async function submit() {
    if (!form.address) return;
    await fetch(`${API}/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        home_formatted_address: form.address.formatted,
        home_place_id: form.address.place_id,
        home_lat: form.address.lat,
        home_lng: form.address.lng
      })
    });
    setForm({ name: '', address: null });
    fetchDrivers();
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl">Drivers</h1>
      <div className="space-y-2">
        <input className="p-2 bg-panel" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <AddressInput onSelect={addr => setForm({ ...form, address: addr })} />
        <button className="bg-primary text-black px-4 py-2" onClick={submit}>Save</button>
      </div>
      <table className="w-full text-left">
        <thead><tr><th>Name</th><th>Home</th></tr></thead>
        <tbody>
          {drivers.map(d => (
            <tr key={d.id}><td>{d.name}</td><td>{d.home_formatted_address}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
