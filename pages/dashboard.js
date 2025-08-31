import { useState, useEffect } from 'react';

function cents(v){return (v/100).toFixed(2);}

export default function Dashboard() {
  const [trips,setTrips]=useState([]);
  const [summary,setSummary]=useState(null);
  const API='http://localhost:4000';

  useEffect(()=>{
    const today=new Date().toISOString().slice(0,10);
    fetch(`${API}/trips?day=${today}`).then(r=>r.json()).then(setTrips);
    fetch(`${API}/dashboard/summary?range=day`).then(r=>r.json()).then(setSummary);
  },[]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl">Dashboard</h1>
      <table className="w-full text-left">
        <thead><tr><th>Route</th><th>Student</th><th>Driver</th><th>Route Pay</th><th>Driver Pay</th><th>Profit</th></tr></thead>
        <tbody>
          {trips.map(t=>(
            <tr key={t.id}>
              <td>{t.route?.name}</td>
              <td>{t.student?.name}</td>
              <td>{t.driver?.name||'Unassigned'}</td>
              <td>${cents(t.route?.route_pay_total_cents||0)}</td>
              <td>${cents(t.route?.driver_pay_cents||0)}</td>
              <td>${cents(t.route?.profit_cents||0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {summary && (
        <div className="text-right space-y-1">
          <div>Total Revenue: ${cents(summary.totals.revenue_cents)}</div>
          <div>Total Driver Pay: ${cents(summary.totals.driver_pay_cents)}</div>
          <div>Total Profit: ${cents(summary.totals.profit_cents)}</div>
        </div>
      )}
    </div>
  );
}
