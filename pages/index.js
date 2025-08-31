import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-2xl">NEMT Dashboard</h1>
      <nav className="space-x-4">
        <Link href="/drivers">Drivers</Link>
        <Link href="/routes">Routes</Link>
        <Link href="/intake">Intake</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
    </div>
  );
}
