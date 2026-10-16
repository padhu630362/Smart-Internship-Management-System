import { User, ROLES, USER_STATUSES } from '../models/User.js';
import { hashPassword } from '../utils/security.js';
import { logger } from '../utils/logger.js';

/**
 * Designated Administrators and Coordinators for InternHub.
 * Exclusively configured for:
 * 1. s.v.padmavathi2005@gmail.com (Password: Q12345678)
 * 2. arshadtaiyab010@gmail.com (Password: W12345678)
 */
export const DESIGNATED_ADMINS = [
  {
    name: 'Padmavathi',
    email: 's.v.padmavathi2005@gmail.com',
    password: 'Q12345678',
  },
  {
    name: 'Arshad Taiyab',
    email: 'arshadtaiyab010@gmail.com',
    password: 'W12345678',
  },
];

export const initAdmins = async () => {
  try {
    const allowedEmails = DESIGNATED_ADMINS.map((a) => a.email.toLowerCase().trim());

    // 1. Ensure the two designated administrators exist with active status, admin role, and exact credentials
    for (const adminData of DESIGNATED_ADMINS) {
      const email = adminData.email.toLowerCase().trim();
      let user = await User.findOne({ email }).select('+passwordHash');

      if (!user) {
        const passwordHash = await hashPassword(adminData.password);
        user = await User.create({
          name: adminData.name,
          email,
          passwordHash,
          role: ROLES.ADMIN,
          status: USER_STATUSES.ACTIVE,
          profile: {
            bio: 'Designated Platform Administrator for InternHub.',
          },
        });
        logger.info(`Bootstrapped designated administrator: ${adminData.name} (${email}) with role: ${ROLES.ADMIN}`);
      } else {
        let changed = false;
        if (user.role !== ROLES.ADMIN) {
          user.role = ROLES.ADMIN;
          changed = true;
        }
        if (user.status !== USER_STATUSES.ACTIVE) {
          user.status = USER_STATUSES.ACTIVE;
          changed = true;
        }

        const validPass = await user.isValidPassword(adminData.password);
        if (!validPass) {
          user.passwordHash = await hashPassword(adminData.password);
          user.passwordChangedAt = new Date();
          changed = true;
        }

        if (changed) {
          await user.save();
          logger.info(`Verified & synchronized designated administrator: ${adminData.name} (${email})`);
        }
      }
    }

    // 2. Strict Access Control: Demote any other accounts that have admin or coordinator role
    await User.updateMany(
      {
        email: { $nin: allowedEmails },
        role: { $in: [ROLES.ADMIN, ROLES.COORDINATOR] },
      },
      {
        role: ROLES.STUDENT,
      }
    );
  } catch (err) {
    logger.warn(`Could not initialize designated administrators: ${err.message}`);
  }
};

export default initAdmins;
