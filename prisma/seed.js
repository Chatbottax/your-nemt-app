import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear existing for idempotency (SQLite-friendly)
  await prisma.trip.deleteMany();
  await prisma.student.deleteMany();
  await prisma.route.deleteMany();
  await prisma.driver.deleteMany();

  // Seed drivers from provided list (approximate lat/lng)
  await prisma.driver.createMany({
    data: [
      {
        name: 'Alejandra Canovas',
        home_formatted_address: '17888 Barton St, Riverside, CA 92508',
        home_place_id: 'seed-alejandra',
        home_lat: 33.9117,
        home_lng: -117.3203,
      },
      {
        name: 'Sana',
        home_formatted_address: '4636 Orange Vista Way, Riverside, CA 92506',
        home_place_id: 'seed-sana',
        home_lat: 33.9609,
        home_lng: -117.3825,
      },
      {
        name: 'Talal Hawa',
        home_formatted_address: '13539 Applegate Ct, Rancho Cucamonga, CA 91739',
        home_place_id: 'seed-talal',
        home_lat: 34.1142,
        home_lng: -117.5226,
      },
      {
        name: 'Eliana Alsattah',
        home_formatted_address: '2361 Mary Helen St #103, Corona, CA 92879',
        home_place_id: 'seed-eliana',
        home_lat: 33.8715,
        home_lng: -117.5412,
      },
      {
        name: 'Nouredin Mohamad',
        home_formatted_address: '1280 Palmyrita Ave Ste C, Riverside, CA 92507',
        home_place_id: 'seed-nouredin',
        home_lat: 33.9997,
        home_lng: -117.3359,
      }
    ]
  });

  // Seed routes (names only for now; pay values example)
  const routesSeed = [
    { name: 'RCC SPE (Welding) – Alejandra’s Group', oneWay: 5200, driverPay: 3000 },
    { name: 'RCC SPE (Welding) – Sana’s Group', oneWay: 5200, driverPay: 3000 },
    { name: 'Dynamic Hope SPE – Talal’s Group', oneWay: 4500, driverPay: 2800 },
    { name: 'Project Team SPE – Talal’s Group', oneWay: 3000, driverPay: 2000 },
  ];
  for (const r of routesSeed) {
    await prisma.route.create({ data: {
      name: r.name,
      route_pay_one_way_cents: r.oneWay,
      route_pay_total_cents: r.oneWay * 2,
      driver_pay_cents: r.driverPay,
      profit_cents: r.oneWay * 2 - r.driverPay,
    }});
  }

  // Seed students (names + approx addresses)
  const students = [
    { name: 'David Salazar', addr: '9801 Wood Road, Riverside, CA 92508', id: 'seed-david', lat: 33.8808, lng: -117.334 },
    { name: 'Zain Hijazi', addr: '4800 Magnolia Avenue, Riverside, CA 92506', id: 'seed-zain', lat: 33.9727, lng: -117.3743 },
    { name: 'Destiny Meza', addr: '2951 Jackson Street, Riverside, CA 92503', id: 'seed-destiny', lat: 33.9015, lng: -117.4434 },
    { name: 'Byron Rodriguez', addr: '4341 Victor Avenue, Riverside, CA 92507', id: 'seed-byron', lat: 33.9746, lng: -117.353 },
    { name: 'Alex Sega', addr: '4341 Victor Avenue, Riverside, CA 92507', id: 'seed-alex', lat: 33.9746, lng: -117.353 },
    { name: 'Ismiel/Ismet Sivas', addr: '4341 Victor Avenue, Riverside, CA 92507', id: 'seed-ismiel', lat: 33.9746, lng: -117.353 },
    { name: 'Min Zaw', addr: '20520 Bloomfield Road, Riverside, CA 92508', id: 'seed-min', lat: 33.8974, lng: -117.3301 },
    { name: 'Daynika Mathison', addr: '19217 Marmalade Court, Riverside, CA 92508', id: 'seed-daynika', lat: 33.8968, lng: -117.3208 },
    { name: 'Edgar Serrato', addr: '6866 School Circle Drive, Riverside, CA 92506', id: 'seed-edgar', lat: 33.9558, lng: -117.3503 },
  ];
  const studentMap = {};
  for (const s of students) {
    studentMap[s.id] = await prisma.student.upsert({
      where: { pickup_place_id: s.id },
      update: {},
      create: {
        name: s.name,
        pickup_formatted_address: s.addr,
        pickup_place_id: s.id,
        pickup_lat: s.lat,
        pickup_lng: s.lng,
      }
    });
  }

  const routes = await prisma.route.findMany();
  const rByName = Object.fromEntries(routes.map(r => [r.name, r]));

  // Helper to create a trip with times today at HH:MM
  function timeToday(hhmm){
    const [hh,mm] = hhmm.split(':').map(x=>parseInt(x,10));
    const d = new Date(); d.setHours(hh,mm,0,0); return d;
  }

  // Build a minimal set of trips to exercise KPIs (one pickup and one dropoff window per route)
  const toCreate = [
    // Alejandra group examples
    { route: 'RCC SPE (Welding) – Alejandra’s Group', student: 'seed-david', pickup: '12:25', drop: '13:00' },
    { route: 'RCC SPE (Welding) – Alejandra’s Group', student: 'seed-zain', pickup: '12:25', drop: '13:00' },
    { route: 'RCC SPE (Welding) – Alejandra’s Group', student: 'seed-destiny', pickup: '12:49', drop: '13:00' },
    // Sana group
    { route: 'RCC SPE (Welding) – Sana’s Group', student: 'seed-byron', pickup: '12:50', drop: '13:10' },
    { route: 'RCC SPE (Welding) – Sana’s Group', student: 'seed-alex', pickup: '12:50', drop: '13:10' },
    { route: 'RCC SPE (Welding) – Sana’s Group', student: 'seed-ismiel', pickup: '12:50', drop: '13:10' },
    // Talal group (Dynamic Hope)
    { route: 'Dynamic Hope SPE – Talal’s Group', student: 'seed-min', pickup: '08:11', drop: '08:45' },
    { route: 'Dynamic Hope SPE – Talal’s Group', student: 'seed-daynika', pickup: '08:20', drop: '08:45' },
    // Project Team (Talal)
    { route: 'Project Team SPE – Talal’s Group', student: 'seed-edgar', pickup: '07:15', drop: '07:25' },
  ];
  for (const t of toCreate) {
    const route = rByName[t.route];
    if (!route) continue;
    const student = studentMap[t.student];
    await prisma.trip.create({ data: {
      routeId: route.id,
      studentId: student.id,
      pickup_time: timeToday(t.pickup),
      dropoff_time: timeToday(t.drop),
    }});
  }
}

main().catch(e => {
  console.error(e);
}).finally(async () => {
  await prisma.$disconnect();
});
