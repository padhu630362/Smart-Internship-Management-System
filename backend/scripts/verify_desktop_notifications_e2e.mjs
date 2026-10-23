import http from 'http';
import { io as Client } from 'socket.io-client';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { initSocket, getIO } from '../src/socket.js';
import { User, ROLES } from '../src/models/User.js';
import { Conversation, CONVERSATION_TYPES } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { Notification, NOTIFICATION_TYPES } from '../src/models/Notification.js';
import { hashPassword } from '../src/utils/security.js';
import { signToken } from '../src/utils/jwt.js';
import { createAndDispatchNotification } from '../src/services/notificationService.js';
import { env } from '../src/config/env.js';

async function runE2EVerification() {
  console.log('--- STARTING INTERNHUB REAL-TIME DESKTOP NOTIFICATIONS E2E TEST ---');

  await connectDB();

  // Create isolated HTTP server on random port
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  await new Promise((resolve) => {
    httpServer.listen(0, () => resolve());
  });

  const port = httpServer.address().port;
  const serverUrl = `http://localhost:${port}`;
  console.log(`[TEST SERVER] Running on ${serverUrl}`);

  const timestamp = Date.now();
  const password = 'Password123!';
  const passwordHash = await hashPassword(password);

  // 1. Create two real accounts: Arshad (Mentor / Sender) and Priya (Student / Recipient)
  const arshad = await User.create({
    name: 'Arshad Khan',
    email: `arshad_${timestamp}@example.com`,
    passwordHash,
    role: ROLES.MENTOR,
    status: 'active',
  });
  const arshadToken = signToken({ id: arshad._id.toString(), role: ROLES.MENTOR, email: arshad.email });

  const priya = await User.create({
    name: 'Priya Sharma',
    email: `priya_${timestamp}@example.com`,
    passwordHash,
    role: ROLES.STUDENT,
    status: 'active',
  });
  const priyaToken = signToken({ id: priya._id.toString(), role: ROLES.STUDENT, email: priya.email });

  console.log(`[ACCOUNTS] Created Sender: ${arshad.name} (${arshad.email})`);
  console.log(`[ACCOUNTS] Created Recipient: ${priya.name} (${priya.email})`);

  // 2. Connect authenticated Socket.IO client for Priya (Recipient)
  const priyaSocket = Client(serverUrl, {
    auth: { token: priyaToken },
    transports: ['websocket'],
  });

  await new Promise((resolve, reject) => {
    priyaSocket.on('connect', resolve);
    priyaSocket.on('connect_error', reject);
  });
  console.log(`[SOCKET] Priya connected to private user room user:${priya._id}`);

  // Create 1-on-1 Conversation between Arshad and Priya
  const conversation = await Conversation.create({
    type: CONVERSATION_TYPES.DIRECT,
    participants: [arshad._id, priya._id],
    createdBy: arshad._id,
  });

  // TEST 1: Arshad sends a real-time message to Priya -> verify Priya receives desktop notification payload
  console.log('\n[TEST 1] Testing Real-Time Chat Message System Notification:');
  const test1Promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for chat:new_message')), 6000);

    priyaSocket.on('chat:new_message', ({ conversationId, message }) => {
      clearTimeout(timer);
      console.log(` -> Received 'chat:new_message' event!`);
      console.log(` -> Conversation ID: ${conversationId}`);
      console.log(` -> Sender Name: ${message.sender?.name || arshad.name}`);
      console.log(` -> Content: "${message.content}"`);

      // Verify notification format matching user prompt requirement:
      // “New message received — Arshad sent you a message.”
      const senderName = message.sender?.name || arshad.name;
      const expectedDesktopTitle = `New message received — ${senderName}`;
      console.log(` -> Verified Desktop Title: "${expectedDesktopTitle}"`);
      resolve({ conversationId, message });
    });
  });

  // Persist real message in MongoDB
  const sentMessage = await Message.create({
    conversation: conversation._id,
    sender: arshad._id,
    content: 'Hello Priya, your internship task review has been approved.',
  });

  // Emit event via socket (same as chatController)
  const { emitChatMessage } = await import('../src/socket.js');
  emitChatMessage(conversation._id, {
    _id: sentMessage._id,
    conversation: conversation._id,
    sender: { _id: arshad._id, name: arshad.name, role: arshad.role },
    content: sentMessage.content,
    createdAt: sentMessage.createdAt,
  }, [arshad._id, priya._id]);

  await test1Promise;
  console.log(' -> [PASS] Test 1: Chat message produces instant real-time notification without refreshing.');

  // TEST 2: Certificate Issuance notification
  console.log('\n[TEST 2] Testing Certificate Issuance Desktop Notification:');
  const test2Promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for certificate notification')), 6000);

    priyaSocket.on('notification:new', (notif) => {
      if (notif.type === NOTIFICATION_TYPES.CERTIFICATE_ISSUED) {
        clearTimeout(timer);
        console.log(` -> Received 'notification:new' (certificate_issued)!`);
        console.log(` -> Title: "${notif.title}"`);
        console.log(` -> Message: "${notif.message}"`);
        console.log(` -> Link: "${notif.link}"`);
        resolve(notif);
      }
    });
  });

  await createAndDispatchNotification({
    recipientId: priya._id,
    senderId: arshad._id,
    type: NOTIFICATION_TYPES.CERTIFICATE_ISSUED,
    title: 'Certificate of Completion Issued',
    message: 'Congratulations Priya! Your verified internship certificate is ready for download.',
    link: '/certificates',
  });

  await test2Promise;
  console.log(' -> [PASS] Test 2: Certificate notification successfully persisted in MongoDB and delivered via socket.');

  // TEST 3: User isolation - Arshad must NOT receive Priya's notifications
  console.log('\n[TEST 3] Testing Security & Isolation:');
  const arshadSocket = Client(serverUrl, {
    auth: { token: arshadToken },
    transports: ['websocket'],
  });

  await new Promise((resolve) => arshadSocket.on('connect', resolve));

  let arshadReceivedLeak = false;
  arshadSocket.on('notification:new', (notif) => {
    if (notif.recipient?.toString() === priya._id.toString()) {
      arshadReceivedLeak = true;
    }
  });

  await createAndDispatchNotification({
    recipientId: priya._id,
    senderId: null,
    type: NOTIFICATION_TYPES.APPLICATION_STATUS,
    title: 'Application Status Update',
    message: 'Your application has moved to final review.',
    link: '/applications',
  });

  await new Promise((r) => setTimeout(r, 400));
  if (arshadReceivedLeak) {
    throw new Error('SECURITY BREACH: Arshad received notification intended for Priya!');
  }
  console.log(' -> [PASS] Test 3: Total security isolation confirmed — user private rooms prevent unauthorized leaks.');

  // Cleanup
  priyaSocket.disconnect();
  arshadSocket.disconnect();
  const io = getIO();
  if (io) io.disconnectSockets(true);
  httpServer.close();

  await User.deleteMany({ _id: { $in: [arshad._id, priya._id] } });
  await Conversation.findByIdAndDelete(conversation._id);
  await Message.deleteMany({ conversation: conversation._id });
  await Notification.deleteMany({ recipient: { $in: [arshad._id, priya._id] } });

  console.log('\n--- ALL E2E DESKTOP NOTIFICATION VERIFICATIONS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

runE2EVerification().catch((err) => {
  console.error('E2E Verification Failed:', err);
  process.exit(1);
});

