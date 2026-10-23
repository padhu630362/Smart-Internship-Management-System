import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import { Notification, NOTIFICATION_TYPES } from '../src/models/Notification.js';
import { User, ROLES } from '../src/models/User.js';
import {
  createAndDispatchNotification,
  createAndDispatchBulkNotifications,
} from '../src/services/notificationService.js';

async function runTests() {
  console.log('=== Starting Notification System Verification Tests ===\n');
  await connectDB();

  // Find a real test student user
  const student = await User.findOne({ role: ROLES.STUDENT, email: 'padhu@sbit.com' });
  const admin = await User.findOne({ role: ROLES.ADMIN, email: 's.v.padmavathi2005@gmail.com' });

  if (!student || !admin) {
    throw new Error('Test users padhu@sbit.com and s.v.padmavathi2005@gmail.com must exist.');
  }

  const testEventKey = `test_event_${Date.now()}`;
  console.log(`Using test eventKey: ${testEventKey}`);

  // Test 1: First dispatch with eventKey should succeed
  console.log('Test 1: Dispatch first notification with eventKey...');
  const first = await createAndDispatchNotification({
    recipientId: student._id,
    senderId: admin._id,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: 'Unit Test Task Assignment',
    message: 'Test message for idempotency check.',
    link: '/my-tasks',
    eventKey: testEventKey,
    metadata: { test: true },
  });

  if (!first || !first._id) {
    throw new Error('Test 1 failed: notification not created.');
  }
  console.log('Test 1 PASSED: Created notification ID:', first._id);

  // Test 2: Second dispatch with same eventKey should be idempotent and NOT create duplicate
  console.log('Test 2: Dispatch duplicate notification with identical eventKey...');
  const second = await createAndDispatchNotification({
    recipientId: student._id,
    senderId: admin._id,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: 'Unit Test Task Assignment (Duplicate Attempt)',
    message: 'Test message duplicate attempt.',
    link: '/my-tasks',
    eventKey: testEventKey,
    metadata: { test: true },
  });

  if (!second || second._id.toString() !== first._id.toString()) {
    throw new Error(`Test 2 failed: expected identical ID ${first._id}, got ${second?._id}`);
  }

  const countForEventKey = await Notification.countDocuments({
    recipient: student._id,
    eventKey: testEventKey,
  });

  if (countForEventKey !== 1) {
    throw new Error(`Test 2 failed: duplicate record created! Count: ${countForEventKey}`);
  }
  console.log('Test 2 PASSED: Idempotency verified. Exactly 1 document exists.');

  // Test 3: Bulk dispatch with eventKeyPrefix deduplication
  console.log('Test 3: Bulk dispatch with eventKeyPrefix...');
  const bulkPrefix = `test_bulk_${Date.now()}`;
  const inserted1 = await createAndDispatchBulkNotifications(
    [student._id],
    {
      senderId: admin._id,
      type: NOTIFICATION_TYPES.OPPORTUNITY_PUBLISHED,
      title: 'Bulk Test Opportunity',
      message: 'Testing bulk deduplication.',
      link: '/internships',
      eventKeyPrefix: bulkPrefix,
    }
  );

  if (inserted1.length !== 1) {
    throw new Error(`Test 3 failed: expected 1 insert, got ${inserted1.length}`);
  }
  console.log('Bulk insert 1 inserted:', inserted1.length);

  // Repeat bulk dispatch with same prefix - should insert 0 duplicates!
  const inserted2 = await createAndDispatchBulkNotifications(
    [student._id],
    {
      senderId: admin._id,
      type: NOTIFICATION_TYPES.OPPORTUNITY_PUBLISHED,
      title: 'Bulk Test Opportunity Duplicate',
      message: 'Testing bulk deduplication duplicate.',
      link: '/internships',
      eventKeyPrefix: bulkPrefix,
    }
  );

  if (inserted2.length !== 0) {
    throw new Error(`Test 3 failed: duplicate bulk notifications inserted: ${inserted2.length}`);
  }
  console.log('Test 3 PASSED: Bulk deduplication prevented duplicate insertions.');

  // Clean up our temporary test notifications so live database remains clean
  console.log('Cleaning up temporary test records...');
  await Notification.deleteMany({
    $or: [
      { eventKey: testEventKey },
      { eventKey: `${bulkPrefix}:${student._id}` },
    ],
  });

  const finalCount = await Notification.countDocuments();
  console.log(`Cleanup complete. Preserved legitimate notifications count in DB: ${finalCount}`);

  await mongoose.disconnect();
  console.log('\n=== All Notification System Tests PASSED Successfully! ===');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

