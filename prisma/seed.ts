import { Difficulty, Platform, PrismaClient, RoleType } from "@prisma/client";
import { LABS } from "../lib/labs/catalog";

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { key: RoleType.STUDENT, name: "Student", description: "Learns and completes labs." },
    { key: RoleType.INSTRUCTOR, name: "Instructor", description: "Reviews assigned students and course progress." },
    { key: RoleType.ADMIN, name: "Admin", description: "Administers the CyberLab platform." },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  for (const lab of LABS) {
    await prisma.lab.upsert({
      where: { number: lab.number },
      update: {
        slug: lab.slug,
        title: lab.title,
        objective: lab.objective,
        platform: lab.platform as Platform,
        difficulty: lab.difficulty as Difficulty,
        estimatedMinutes: lab.estimatedMinutes,
        enabled: true,
      },
      create: {
        number: lab.number,
        slug: lab.slug,
        title: lab.title,
        objective: lab.objective,
        platform: lab.platform as Platform,
        difficulty: lab.difficulty as Difficulty,
        estimatedMinutes: lab.estimatedMinutes,
        enabled: true,
      },
    });
  }

  console.log(`Seeded ${roles.length} roles and ${LABS.length} labs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
