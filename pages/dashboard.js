import { useState, useEffect } from 'react';

function cents(v){return (v/100).toFixed(2);} 

function StatCard({ title, value, sub }){
  return (
    <div className="bg-panel rounded-lg p-4 border border-secondary/20">
      <div className="text-secondary text-sm">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-secondary text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [trips,setTrips]=useState([]);
  const [kpiDay,setKpiDay]=useState(null);
  const [kpiWeek,setKpiWeek]=useState(null);
  const [kpiMonth,setKpiMonth]=useState(null);
  const API='http://localhost:4000';

  useEffect(()=>{
    const today=new Date().toISOString().slice(0,10);
    fetch(`${API}/trips?day=${today}`).then(r=>r.json()).then(setTrips).catch(()=>{});
    Promise.all([
      fetch(`${API}/dashboard/kpis?range=day`).then(r=>r.json()),
      fetch(`${API}/dashboard/kpis?range=week`).then(r=>r.json()),
      fetch(`${API}/dashboard/kpis?range=month`).then(r=>r.json()),
    ]).then(([d,w,m])=>{ setKpiDay(d); setKpiWeek(w); setKpiMonth(m); }).catch(()=>{});
  },[]);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total Revenue (Day)" value={kpiDay?`$${cents(kpiDay.totals.revenue_cents)}`:'—'} sub={`${kpiDay?.trips_count||0} trips • ${kpiDay?.drivers_working||0} drivers`} />
        <StatCard title="Total Revenue (Week)" value={kpiWeek?`$${cents(kpiWeek.totals.revenue_cents)}`:'—'} sub={`${kpiWeek?.trips_count||0} trips • ${kpiWeek?.drivers_working||0} drivers`} />
        <StatCard title="Total Revenue (Month)" value={kpiMonth?`$${cents(kpiMonth.totals.revenue_cents)}`:'—'} sub={`${kpiMonth?.trips_count||0} trips • ${kpiMonth?.drivers_working||0} drivers`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Drivers Working (Day)" value={kpiDay?`${kpiDay.drivers_working}`:'—'} sub={`Trips: ${kpiDay?.trips_count||0}`} />
        <StatCard title="Drivers Working (Week)" value={kpiWeek?`${kpiWeek.drivers_working}`:'—'} sub={`Trips: ${kpiWeek?.trips_count||0}`} />
        <StatCard title="Drivers Working (Month)" value={kpiMonth?`${kpiMonth.drivers_working}`:'—'} sub={`Trips: ${kpiMonth?.trips_count||0}`} />
      </div>

      {/* Trips table */}
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
    </div>
  );
}
