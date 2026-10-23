import { connectDB } from '../backend/src/config/db.js';
import { Certificate } from '../backend/src/models/Certificate.js';
import { generateCertificatePdfBuffer } from '../backend/src/services/certificateService.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

await connectDB();
const cert = await Certificate.findOne({ certificateNumber: 'CERT-2026-853925' })
  .populate('issuedBy', 'name email role')
  .populate('mentor', 'name email');

console.log('Cert found:', cert.certificateNumber, 'Student:', cert.studentName);
console.log('IssuedBy:', cert.issuedBy);
console.log('Mentor:', cert.mentor);

const pdfBuf = await generateCertificatePdfBuffer(cert);
console.log('Generated PDF size:', pdfBuf.length, 'bytes');

const outPath = path.resolve('scratch/Certificate-Hari-CERT-2026-853925.pdf');
fs.writeFileSync(outPath, pdfBuf);
console.log('Wrote PDF to:', outPath);

await mongoose.disconnect();

