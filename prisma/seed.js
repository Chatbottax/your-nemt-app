import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.driver.createMany({
    data: [
      {
        name: 'Alice Driver',
        home_formatted_address: '123 Main St, City',
        home_place_id: 'place1',
        home_lat: 37.7749,
        home_lng: -122.4194,
      },
      {
        name: 'Bob Driver',
        home_formatted_address: '456 Oak Ave, Town',
        home_place_id: 'place2',
        home_lat: 37.8044,
        home_lng: -122.2711,
      }
    ]
  });

  await prisma.route.create({
    data: {
      name: 'Sample Route',
      route_pay_one_way_cents: 5000,
      route_pay_total_cents: 10000,
      driver_pay_cents: 6000,
      profit_cents: 4000,
    }
  });
}

main().catch(e => {
  console.error(e);
}).finally(async () => {
  await prisma.$disconnect();
});
