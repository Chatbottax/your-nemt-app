import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
// Import the core parser to avoid pdf-parse's debug harness executing under ESM
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const prisma = new PrismaClient();
const IS_SQLITE = ((process.env.DB_PROVIDER || '').toLowerCase() === 'sqlite') || ((process.env.DATABASE_URL || '').startsWith('file:'));
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
try { fs.mkdirSync('uploads', { recursive: true }); } catch {}

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
  const id = Number(req.params.id);

  // Helpers
  function parseStudentsFromText(text) {
    const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const students = [];
    const addrRegex = /(\d+\s+[^,]+\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ct|Court|Dr|Drive|Ln|Lane|Hwy|Highway|Pkwy|Parkway|Way|Pl|Place)\b[^\n]*)/i;
    const timeRegex = /\b(\d{1,2}[:\.]\d{2}\s?(AM|PM)?)\b/gi;

    for (let i = 0; i < lines.length; i++) {
      const nameLine = lines[i];
      const next = lines[i + 1] || '';
      const twoLineAddr = addrRegex.exec(next);
      const inlineAddr = addrRegex.exec(nameLine);

      let name = '';
      let address = '';
      let pickup_time = null;
      let dropoff_time = null;

      // Extract times if present (first -> pickup, second -> dropoff)
      const timesInName = [...(nameLine.match(timeRegex) || [])];
      const timesInNext = [...(next.match(timeRegex) || [])];
      const allTimes = [...timesInName, ...timesInNext].map(t => t.replace(/\./g, ':'));
      if (allTimes.length > 0) {
        const now = new Date();
        const mk = (t) => {
          const m = t.match(/(\d{1,2})[:](\d{2})\s?(AM|PM)?/i);
          if (!m) return null;
          let hh = parseInt(m[1], 10);
          const mm = parseInt(m[2], 10);
          const ampm = (m[3] || '').toUpperCase();
          if (ampm === 'PM' && hh < 12) hh += 12;
          if (ampm === 'AM' && hh === 12) hh = 0;
          const d = new Date(now); d.setHours(hh, mm, 0, 0); return d.toISOString();
        };
        pickup_time = mk(allTimes[0]);
        if (allTimes[1]) dropoff_time = mk(allTimes[1]);
      }

      if (twoLineAddr) {
        name = nameLine.replace(timeRegex, '').trim();
        address = twoLineAddr[0].trim();
        i++; // consume next line
      } else if (inlineAddr) {
        const addr = inlineAddr[0];
        const before = nameLine.split(addr)[0].trim();
        name = before.replace(timeRegex, '').trim();
        address = addr.trim();
      } else {
        continue;
      }

      if (!name && address) {
        // Try to infer name from surrounding tokens (best-effort)
        const maybeName = (lines[i - 1] || '').trim();
        if (maybeName && !addrRegex.test(maybeName)) name = maybeName;
      }

      if (name && address) {
        students.push({
          name,
          pickup_formatted_address: address,
          pickup_place_id: null,
          pickup_lat: null,
          pickup_lng: null,
          ...(pickup_time ? { pickup_time } : {}),
          ...(dropoff_time ? { dropoff_time } : {}),
        });
      }
    }

    // Deduplicate by name+address
    const seen = new Set();
    return students.filter(s => {
      const k = `${s.name}::${s.pickup_formatted_address}`.toLowerCase();
      if (seen.has(k)) return false; seen.add(k); return true;
    });
  }

  async function extractTextFromImageVision(filePath) {
    const key = process.env.VISION_OCR_KEY;
    if (!key) return null;
    const buf = fs.readFileSync(filePath);
    const content = buf.toString('base64');
    const body = {
      requests: [
        {
          image: { content },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
        }
      ]
    };
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${key}`;
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) return null;
    const json = await resp.json();
    const text = json?.responses?.[0]?.fullTextAnnotation?.text || '';
    return { text, raw: json };
  }

  async function extractTextFromPdf(filePath) {
    try {
      const data = await pdfParse(fs.readFileSync(filePath));
      return { text: data.text || '', raw: { numpages: data.numpages } };
    } catch (e) {
      return { text: '', raw: { error: 'pdf_parse_failed' } };
    }
  }

  // Load upload record
  const uploadRec = await prisma.upload.findUnique({ where: { id } });
  if (!uploadRec) return res.status(404).json({ error: 'Upload not found' });
  const filePath = uploadRec.storage_path;
  const mime = uploadRec.mime || '';
  const ext = path.extname(uploadRec.filename || '').toLowerCase();

  let ocr = null;
  let text = '';

  try {
    if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png'].includes(ext)) {
      const result = await extractTextFromImageVision(filePath);
      if (result) { ocr = result.raw; text = result.text; }
    } else if (mime === 'application/pdf' || ext === '.pdf') {
      const result = await extractTextFromPdf(filePath);
      ocr = result.raw; text = result.text;
    }
  } catch (e) {
    // proceed to fallback
  }

  // Fallback: if nothing extracted, seed with a single empty row
  if (!text || text.trim().length === 0) {
    text = '';
  }

  const students = parseStudentsFromText(text);
  const parsed = { students: students.length ? students : [
    { name: '', pickup_formatted_address: '', pickup_place_id: null, pickup_lat: null, pickup_lng: null }
  ] };

  const data = IS_SQLITE
    ? { parsed_json: JSON.stringify(parsed), ocr_json: JSON.stringify(ocr || {}), status: 'PARSED' }
    : { parsed_json: parsed, ocr_json: (ocr || {}), status: 'PARSED' };

  const updated = await prisma.upload.update({ where: { id }, data });
  res.json({ id: updated.id, parsed_json: parsed, status: updated.status });
});

app.post('/uploads/:id/accept', async (req, res) => {
  const id = Number(req.params.id);
  const { routeId, students: incomingStudents } = req.body;
  const uploadRec = await prisma.upload.findUnique({ where: { id } });
  const parsedField = uploadRec?.parsed_json;
  const parsed = typeof parsedField === 'string' ? JSON.parse(parsedField) : (parsedField || { students: [] });
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
    const pickup_time = s.pickup_time ? new Date(s.pickup_time) : null;
    const dropoff_time = s.dropoff_time ? new Date(s.dropoff_time) : null;
    await prisma.trip.create({ data: { routeId, studentId: student.id, pickup_time, dropoff_time } });
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

  const assignment_obj = {
    driverId: best.driver.id,
    duration_s: Math.round(best.duration),
    distance_m: Math.round(best.distance),
    api_timestamp_iso: new Date().toISOString(),
    method: dmKey ? 'distance_matrix' : 'haversine_fallback'
  };
  const assignment_json = IS_SQLITE ? JSON.stringify(assignment_obj) : assignment_obj;
  const updated = await prisma.trip.update({ where: { id: trip.id }, data: { assigned_driver_id: best.driver.id, assignment_json } });
  return updated;
}

app.post('/trips/:id/assign', async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const trip = await prisma.trip.findUnique({ where: { id } });

  async function hasConflict(driverId, start, end, routeId) {
    if (!start || !end) return false;
    const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const others = await prisma.trip.findMany({
      where: {
        assigned_driver_id: driverId,
        id: { not: id },
        routeId: { not: routeId },
        pickup_time: { gte: dayStart, lt: dayEnd },
        dropoff_time: { not: null }
      },
      select: { id: true, pickup_time: true, dropoff_time: true, routeId: true }
    });
    const s1 = new Date(trip.pickup_time || start).getTime();
    const e1 = new Date(trip.dropoff_time || end).getTime();
    return others.find(o => {
      const s2 = new Date(o.pickup_time).getTime();
      const e2 = new Date(o.dropoff_time).getTime();
      return s1 < e2 && s2 < e1;
    });
  }

  // Manual assignment path
  if (body.driverId) {
    const conflict = await hasConflict(body.driverId, trip.pickup_time, trip.dropoff_time, trip.routeId);
    if (conflict) return res.status(409).json({ error: 'Driver time conflict', conflict });
    const assignment_obj = { driverId: body.driverId, api_timestamp_iso: new Date().toISOString(), method: 'manual' };
    const assignment_json = IS_SQLITE ? JSON.stringify(assignment_obj) : assignment_obj;
    const updated = await prisma.trip.update({ where: { id }, data: { assigned_driver_id: body.driverId, assignment_json } });
    return res.json(updated);
  }

  // Auto-assign path
  const proposed = await assignDriver(trip);
  const conflict = await hasConflict(proposed.assigned_driver_id, proposed.pickup_time, proposed.dropoff_time, proposed.routeId);
  if (conflict) return res.status(409).json({ error: 'Driver time conflict', conflict });
  res.json(proposed);
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
  } else if (range === 'month') {
    start.setDate(1);
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

// KPI endpoint: totals and drivers working for day/week/month
app.get('/dashboard/kpis', async (req, res) => {
  const range = (req.query.range || 'day').toString();
  const now = new Date();
  let start = new Date(now);
  if (range === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
  } else if (range === 'month') {
    start.setDate(1);
  }
  start.setHours(0,0,0,0);
  const end = new Date(start);
  if (range === 'day') end.setDate(end.getDate() + 1);
  if (range === 'week') end.setDate(end.getDate() + 7);
  if (range === 'month') { end.setMonth(end.getMonth() + 1); }

  // Find trips in window (prefer pickup_time, else createdAt)
  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { pickup_time: { gte: start, lt: end } },
        { AND: [ { pickup_time: null }, { createdAt: { gte: start, lt: end } } ] }
      ]
    },
    include: { route: true }
  });

  // Distinct routes present in window
  const routeIds = Array.from(new Set(trips.filter(t => t.routeId).map(t => t.routeId)));
  const routes = routeIds.length ? await prisma.route.findMany({ where: { id: { in: routeIds } } }) : [];
  const totals = routes.reduce((acc, r) => {
    acc.revenue_cents += r.route_pay_total_cents;
    acc.driver_pay_cents += r.driver_pay_cents;
    acc.profit_cents += r.profit_cents;
    return acc;
  }, { revenue_cents:0, driver_pay_cents:0, profit_cents:0 });

  const driversWorking = new Set(trips.map(t => t.assigned_driver_id).filter(Boolean)).size;
  res.json({ range, totals, trips_count: trips.length, drivers_working: driversWorking, start, end });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Server started on port', PORT);
});
