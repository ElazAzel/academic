import { getPrisma } from "../lib/prisma";
import { listCertificates } from "../server/modules/certificates/service";

async function main() {
  const prisma = getPrisma();

  // 1. Find student1
  const student = await prisma.user.findUnique({
    where: { email: "student1@academy.local" },
    select: { id: true, email: true, name: true },
  });
  if (!student) {
    console.error("ERROR: student1@academy.local not found in database!");
    process.exit(1);
  }
  console.log(`Student found: ${student.email} (ID: ${student.id}, Name: ${student.name})`);

  // 2. Check roles for this student
  const roles = await prisma.userRole.findMany({
    where: { userId: student.id },
    include: { role: { select: { key: true } } },
  });
  console.log(`Roles: ${roles.map(r => r.role.key).join(", ") || "NONE"}`);

  // 3. Use the same listCertificates function the page uses
  const certs = await listCertificates({ userId: student.id });
  console.log(`\nlistCertificates({ userId: "${student.id}" }) returned ${certs.length} certificate(s):`);
  for (const c of certs) {
    console.log(`  - Number: ${c.number}`);
    console.log(`    Course: ${c.course.title}`);
    console.log(`    Issued: ${c.issuedAt}`);
    console.log(`    Verification URL: ${c.verificationUrl}`);
  }

  // 4. Direct DB check for this student's certificates
  const directCerts = await prisma.certificate.findMany({
    where: { userId: student.id },
  });
  console.log(`\nDirect DB query: found ${directCerts.length} certificate(s) for userId=${student.id}`);

  // 5. Check if the student has the "student" role
  const hasStudentRole = roles.some(r => r.role.key === "student");
  console.log(`\nHas "student" role: ${hasStudentRole}`);
  if (!hasStudentRole) {
    console.error("WARNING: student1@academy.local does NOT have the 'student' role! The page guard requireRolePage(['student']) will block access.");
  }
}

main().catch(console.error);
