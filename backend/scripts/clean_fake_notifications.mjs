import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import '../src/config/env.js';
import { connectDB } from '../src/config/db.js';

async function cleanup() {
  await connectDB();
  const notifCol = mongoose.connection.collection('notifications');
  const userCol = mongoose.connection.collection('users');

  const beforeTotal = await notifCol.countDocuments();
  console.log(`Starting cleanup. Total notifications before: ${beforeTotal}`);

  // 1. Identify real users vs test users
  const users = await userCol.find({}, { projection: { _id: 1, email: 1 } }).toArray();
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  const realUsers = users.filter(u => !(
    u.email.includes('_p') ||
    u.email.includes('rival_') ||
    u.email.includes('disabled_') ||
    u.email.includes('phase') ||
    u.email.includes('test_')
  ));
  const realUserIds = new Set(realUsers.map(u => u._id.toString()));

  // 2. Classify notifications to delete vs keep
  const allNotifs = await notifCol.find({}).toArray();
  const toDeleteIds = [];
  const toKeepIds = [];

  for (const n of allNotifs) {
    const recId = n.recipient ? n.recipient.toString() : null;

    // Check if recipient is missing or not a real user
    if (!recId || !realUserIds.has(recId)) {
      toDeleteIds.push(n._id);
      continue;
    }

    // Recipient is a real user. Check if it's a known fake/test broadcast:
    const isFakeAnnouncement =
      n.title === 'Sprint 3 Code Freeze & Architecture Showcase' ||
      n.title === 'Urgent: Midterm Presentation Schedule';

    const isFakeInternshipSpam =
      n.title === 'New Internship Opportunity' &&
      (n.message.includes('Acme Cloud Technologies') ||
       n.message.includes('Quantum Dynamics Inc') ||
       n.message.includes('Neural AI') ||
       n.message.includes('Apex Robotics'));

    if (isFakeAnnouncement || isFakeInternshipSpam) {
      toDeleteIds.push(n._id);
    } else {
      toKeepIds.push(n._id);
    }
  }

  console.log(`Classified: ${toDeleteIds.length} notifications to delete, ${toKeepIds.length} to preserve.`);

  // Perform deletion
  if (toDeleteIds.length > 0) {
    const deleteResult = await notifCol.deleteMany({ _id: { $in: toDeleteIds } });
    console.log(`Successfully deleted ${deleteResult.deletedCount} fake/test/duplicate notification records.`);
  }

  const afterTotal = await notifCol.countDocuments();
  console.log(`Total notifications after cleanup: ${afterTotal}`);

  const remaining = await notifCol.find({}).toArray();
  console.log('Preserved genuine notifications:');
  for (const r of remaining) {
    const u = userMap.get(r.recipient.toString());
    console.log(`- [${r.type}] "${r.title}" to ${u ? u.email : r.recipient} (Created: ${r.createdAt})`);
  }

  await mongoose.disconnect();
}

cleanup().catch(console.error);

