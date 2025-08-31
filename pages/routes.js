import { useState, useEffect } from 'react';
import MoneyInput from '../components/MoneyInput';

export default function Routes() {
  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState({ name: '', route_pay_one_way_cents: 0, driver_pay_cents: 0 });

  const API = 'http://localhost:4000';
  useEffect(() => { fetchRoutes(); }, []);

  async function fetchRoutes() {
    const res = await fetch(`${API}/routes`);
    setRoutes(await res.json());
  }

  async function submit() {
    await fetch(`${API}/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setForm({ name: '', route_pay_one_way_cents: 0, driver_pay_cents: 0 });
    fetchRoutes();
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl">Routes</h1>
      <div className="space-y-2">
        <input className="p-2 bg-panel" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <div>
          Route Pay One Way: <MoneyInput valueCents={form.route_pay_one_way_cents} onChange={v => setForm({ ...form, route_pay_one_way_cents: v })} />
        </div>
        <div>
          Driver Pay: <MoneyInput valueCents={form.driver_pay_cents} onChange={v => setForm({ ...form, driver_pay_cents: v })} />
        </div>
        <button className="bg-primary text-black px-4 py-2" onClick={submit}>Save</button>
      </div>
      <table className="w-full text-left">
        <thead><tr><th>Name</th><th>One-Way</th><th>Total</th><th>Driver Pay</th><th>Profit</th></tr></thead>
        <tbody>
          {routes.map(r => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>${(r.route_pay_one_way_cents/100).toFixed(2)}</td>
              <td>${(r.route_pay_total_cents/100).toFixed(2)}</td>
              <td>${(r.driver_pay_cents/100).toFixed(2)}</td>
              <td>${(r.profit_cents/100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
