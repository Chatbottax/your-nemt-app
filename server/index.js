import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Drivers
app.post('/drivers', async (req, res) => {
  const { name, home_formatted_address, home_place_id, home_lat, home_lng } = req.body;
  const driver = await prisma.driver.create({ data: { name, home_formatted_address, home_place_id, home_lat, home_lng } });
  res.json(driver);
});

app.get('/drivers', async (_req, res) => {
  const drivers = await prisma.driver.findMany();
  res.json(drivers);
});

app.patch('/drivers/:id', async (req, res) => {
  const id = Number(req.params.id);
  const driver = await prisma.driver.update({ where: { id }, data: req.body });
  res.json(driver);
});

// Students
app.post('/students', async (req, res) => {
  const { name, pickup_formatted_address, pickup_place_id, pickup_lat, pickup_lng } = req.body;
  const student = await prisma.student.create({ data: { name, pickup_formatted_address, pickup_place_id, pickup_lat, pickup_lng } });
  res.json(student);
});

app.get('/students', async (_req, res) => {
  const students = await prisma.student.findMany();
  res.json(students);
});

// Routes
function computeRoute(route_pay_one_way_cents, driver_pay_cents) {
  const route_pay_total_cents = route_pay_one_way_cents * 2;
  const profit_cents = route_pay_total_cents - driver_pay_cents;
  return { route_pay_total_cents, profit_cents };
}

app.post('/routes', async (req, res) => {
  const { name, route_pay_one_way_cents, driver_pay_cents } = req.body;
  const { route_pay_total_cents, profit_cents } = computeRoute(route_pay_one_way_cents, driver_pay_cents);
  const route = await prisma.route.create({ data: { name, route_pay_one_way_cents, route_pay_total_cents, driver_pay_cents, profit_cents } });
  res.json(route);
});

app.get('/routes', async (_req, res) => {
  const routes = await prisma.route.findMany();
  res.json(routes);
});

app.patch('/routes/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { route_pay_one_way_cents, driver_pay_cents } = req.body;
  const { route_pay_total_cents, profit_cents } = computeRoute(route_pay_one_way_cents, driver_pay_cents);
  const route = await prisma.route.update({ where: { id }, data: { route_pay_one_way_cents, route_pay_total_cents, driver_pay_cents, profit_cents } });
  res.json(route);
});

// Uploads (simplified, no OCR implementation)
app.post('/uploads', upload.single('file'), async (req, res) => {
  const f = req.file;
  const uploadRec = await prisma.upload.create({ data: { filename: f.originalname, mime: f.mimetype, size: f.size, storage_path: f.path, status: 'PENDING' } });
  res.json(uploadRec);
});

app.post('/uploads/:id/parse', async (req, res) => {
  // Placeholder parse: returns an example structure owner can edit/accept on FE.
  // For real OCR, integrate Google Vision with VISION_OCR_KEY and populate students array.
  const id = Number(req.params.id);
  const example = {
    students: [
      {
        name: 'Sample Student 1',
        pickup_formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA',
        // FE should resolve place details before accept
        pickup_place_id: null,
        pickup_lat: null,
        pickup_lng: null
      }
    ]
  };
  const uploadRec = await prisma.upload.update({ where: { id }, data: { parsed_json: example, status: 'PARSED' } });
  res.json(uploadRec);
});

app.post('/uploads/:id/accept', async (req, res) => {
  const id = Number(req.params.id);
  const { routeId, students: incomingStudents } = req.body;
  const uploadRec = await prisma.upload.findUnique({ where: { id } });
  const parsed = uploadRec?.parsed_json || { students: [] };
  const source = Array.isArray(incomingStudents) && incomingStudents.length > 0 ? incomingStudents : parsed.students;

  const created = [];
  for (const s of source) {
    if (!s.pickup_place_id || s.pickup_lat == null || s.pickup_lng == null) {
      // Require FE to resolve address to place details before accept when not available
      return res.status(400).json({ error: 'Missing place details for one or more students' });
    }
    const student = await prisma.student.upsert({
      where: { pickup_place_id: s.pickup_place_id },
      update: {
        name: s.name,
        pickup_formatted_address: s.pickup_formatted_address,
        pickup_lat: s.pickup_lat,
        pickup_lng: s.pickup_lng,
      },
      create: {
        name: s.name,
        pickup_formatted_address: s.pickup_formatted_address,
        pickup_place_id: s.pickup_place_id,
        pickup_lat: s.pickup_lat,
        pickup_lng: s.pickup_lng
      }
    });
    await prisma.trip.create({ data: { routeId, studentId: student.id } });
    created.push(student);
  }
  await prisma.upload.update({ where: { id }, data: { status: 'ACCEPTED' } });
  res.json({ students: created });
});

// Trips
app.post('/trips', async (req, res) => {
  const { routeId, studentId, pickup_time, dropoff_time } = req.body;
  const trip = await prisma.trip.create({ data: { routeId, studentId, pickup_time, dropoff_time } });
  res.json(trip);
});

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // meters
}

async function assignDriver(trip) {
  const drivers = await prisma.driver.findMany();
  const student = await prisma.student.findUnique({ where: { id: trip.studentId } });
  const dmKey = process.env.DM_SERVER_KEY;
  let best = null;

  if (dmKey) {
    for (const driver of drivers) {
      try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${driver.home_lat},${driver.home_lng}&destinations=${student.pickup_lat},${student.pickup_lng}&key=${dmKey}`;
        const dm = await fetch(url).then(r => r.json());
        const elem = dm?.rows?.[0]?.elements?.[0];
        if (!elem || elem.status !== 'OK') throw new Error('DM element not OK');
        const duration = elem.duration.value; // seconds
        const distance = elem.distance.value; // meters
        const current = { driver, duration, distance };
        if (!best || duration < best.duration || (duration === best.duration && (distance < best.distance || (distance === best.distance && driver.name < best.driver.name)))) {
          best = current;
        }
      } catch (_) {
        // fall through to fallback if any error
        best = null;
        break;
      }
    }
  }

  if (!best) {
    // Fallback: straight-line distance ranking when DM is unavailable
    for (const driver of drivers) {
      const distance = haversine(driver.home_lat, driver.home_lng, student.pickup_lat, student.pickup_lng);
      const duration = distance; // proxy for tie-breaking
      const current = { driver, duration, distance };
      if (!best || duration < best.duration || (duration === best.duration && (distance < best.distance || (distance === best.distance && driver.name < best.driver.name)))) {
        best = current;
      }
    }
  }

  const assignment_json = {
    driverId: best.driver.id,
    duration_s: Math.round(best.duration),
    distance_m: Math.round(best.distance),
    api_timestamp_iso: new Date().toISOString(),
    method: dmKey ? 'distance_matrix' : 'haversine_fallback'
  };
  const updated = await prisma.trip.update({ where: { id: trip.id }, data: { assigned_driver_id: best.driver.id, assignment_json } });
  return updated;
}

app.post('/trips/:id/assign', async (req, res) => {
  const id = Number(req.params.id);
  const trip = await prisma.trip.findUnique({ where: { id } });
  const assigned = await assignDriver(trip);
  res.json(assigned);
});

app.get('/trips', async (req, res) => {
  const day = req.query.day;
  const date = new Date(day);
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const trips = await prisma.trip.findMany({
    where: { createdAt: { gte: date, lt: next } },
    include: { student: true, driver: true, route: true }
  });
  res.json(trips);
});

// Dashboard summary
app.get('/dashboard/summary', async (req, res) => {
  const range = req.query.range || 'day';
  const now = new Date();
  let start = new Date(now);
  if (range === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - day); // start of week
  }
  start.setHours(0,0,0,0);
  const routes = await prisma.route.findMany({ where: { createdAt: { gte: start } } });
  const totals = routes.reduce((acc, r) => {
    acc.revenue_cents += r.route_pay_total_cents;
    acc.driver_pay_cents += r.driver_pay_cents;
    acc.profit_cents += r.profit_cents;
    return acc;
  }, { revenue_cents:0, driver_pay_cents:0, profit_cents:0 });
  res.json({ routes, totals });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Server started on port', PORT);
});
