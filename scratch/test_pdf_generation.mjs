import { generateCertificatePdfBuffer } from '../backend/src/services/certificateService.js';
import fs from 'fs';
import path from 'path';

const dummyCertPadma = {
  certificateNumber: 'CERT-2026-TESTPADMA',
  verificationCode: 'SIMS-PADMA-12345',
  studentName: 'Hari Student',
  internshipTitle: 'Full Stack Engineering',
  companyName: 'Tech Innovations Ltd',
  mentorName: 'Jaya',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-04-01'),
  issueDate: new Date(),
  finalRating: 4.9,
  grade: 'Distinction',
  issuedByRole: 'admin',
  issuedBy: { name: 'Padmavathi 2005', role: 'admin' },
  isDemo: false
};

const dummyCertOther = {
  certificateNumber: 'CERT-2026-TESTOTHER',
  verificationCode: 'SIMS-OTHER-67890',
  studentName: 'John Intern',
  internshipTitle: 'Data Analyst',
  companyName: 'Acme Corp',
  mentorName: 'Dr. Robert Smith',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-04-01'),
  issueDate: new Date(),
  finalRating: 4.5,
  grade: 'Distinction',
  issuedByRole: 'mentor',
  issuedBy: { name: 'Dr. Robert Smith', role: 'mentor' },
  isDemo: false
};

const bufPadma = await generateCertificatePdfBuffer(dummyCertPadma);
console.log('bufPadma generated:', bufPadma.length, 'bytes');

const bufOther = await generateCertificatePdfBuffer(dummyCertOther);
console.log('bufOther generated:', bufOther.length, 'bytes');

fs.writeFileSync(path.resolve('..', 'scratch', 'test_padma.pdf'), bufPadma);
fs.writeFileSync(path.resolve('..', 'scratch', 'test_other.pdf'), bufOther);
console.log('Saved test PDFs successfully.');

