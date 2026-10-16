import { ExternalJob, JOB_TYPES } from '../models/ExternalJob.js';
import { User, ROLES } from '../models/User.js';
import { Notification, NOTIFICATION_TYPES } from '../models/Notification.js';
import { createAndDispatchNotification } from './notificationService.js';
import { matchExternalJobWithGemini } from './aiService.js';
import { logger } from '../utils/logger.js';

/**
 * Strips HTML tags and normalizes whitespace for safe preview snippets
 */
const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Infers appropriate job type classification from title and metadata
 */
const inferJobType = (title = '', tags = []) => {
  const combined = `${title.toLowerCase()} ${tags.join(' ').toLowerCase()}`;
  if (combined.includes('intern') || combined.includes('trainee') || combined.includes('apprentice') || combined.includes('co-op')) {
    return JOB_TYPES.INTERNSHIP;
  }
  if (combined.includes('junior') || combined.includes('entry') || combined.includes('graduate') || combined.includes('associate')) {
    return JOB_TYPES.ENTRY_LEVEL;
  }
  if (combined.includes('part-time') || combined.includes('part time')) {
    return JOB_TYPES.PART_TIME;
  }
  if (combined.includes('contract') || combined.includes('freelance')) {
    return JOB_TYPES.CONTRACT;
  }
  return JOB_TYPES.FULL_TIME;
};

/**
 * Fetches verified public tech listings from Arbeitnow Job Board API
 */
export const fetchArbeitnowJobs = async (limit = 25) => {
  try {
    const response = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: {
        'User-Agent': 'SmartInternshipManagementSystem/1.0 (Academic Verification Engine)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      logger.warn(`Arbeitnow API returned HTTP ${response.status}`);
      return [];
    }

    const payload = await response.json();
    const rawList = Array.isArray(payload?.data) ? payload.data : [];

    return rawList.slice(0, limit).map((item) => {
      const title = (item.title || 'Software Engineering Role').trim();
      const company = (item.company_name || 'Hiring Enterprise').trim();
      const tags = Array.isArray(item.tags)
        ? item.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
        : [];
      const cleanSnippet = stripHtml(item.description).slice(0, 320);

      return {
        externalId: `arbeitnow-${item.slug || Math.random().toString(36).substring(2, 9)}`,
        canonicalUrl: item.url || `https://www.arbeitnow.com/view/${item.slug}`,
        title,
        company,
        location: item.location || (item.remote ? 'Remote' : 'Flexible Location'),
        isRemote: Boolean(item.remote),
        jobType: inferJobType(title, tags),
        description: item.description || cleanSnippet,
        snippet: cleanSnippet,
        tags,
        salary: null,
        source: 'Arbeitnow',
        sourceUrl: item.url || `https://www.arbeitnow.com/view/${item.slug}`,
        publishedAt: item.created_at ? new Date(item.created_at * 1000) : new Date(),
        metadata: { slug: item.slug },
      };
    });
  } catch (error) {
    logger.warn(`Failed to fetch Arbeitnow jobs: ${error.message}`);
    return [];
  }
};

/**
 * Fetches verified remote positions from RemoteOK open API
 */
export const fetchRemoteOKJobs = async (limit = 25) => {
  try {
    const response = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'SmartInternshipManagementSystem/1.0 (Academic Platform contact@smartinternship.edu)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      logger.warn(`RemoteOK API returned HTTP ${response.status}`);
      return [];
    }

    const rawList = await response.json();
    if (!Array.isArray(rawList)) return [];

    // First element in RemoteOK response is disclaimer legal notice, filter it out
    const jobs = rawList
      .filter((item) => item && (item.position || item.title) && item.company)
      .slice(0, limit);

    return jobs.map((item) => {
      const title = (item.position || item.title || 'Remote Developer').trim();
      const company = (item.company || 'Tech Employer').trim();
      const tags = Array.isArray(item.tags)
        ? item.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
        : [];
      const cleanSnippet = stripHtml(item.description).slice(0, 320);

      return {
        externalId: `remoteok-${item.id || item.slug || Math.random().toString(36).substring(2, 9)}`,
        canonicalUrl: item.url || item.apply_url || `https://remoteok.com/remote-jobs/${item.id}`,
        title,
        company,
        location: item.location || 'Worldwide Remote',
        isRemote: true,
        jobType: inferJobType(title, tags),
        description: item.description || cleanSnippet,
        snippet: cleanSnippet,
        tags,
        salary: item.salary_min && item.salary_max ? `$${item.salary_min.toLocaleString()} - $${item.salary_max.toLocaleString()}` : null,
        companyLogo: item.company_logo || null,
        source: 'RemoteOK',
        sourceUrl: item.apply_url || item.url || `https://remoteok.com/remote-jobs/${item.id}`,
        publishedAt: item.date ? new Date(item.date) : new Date(),
        metadata: { slug: item.slug, id: item.id },
      };
    });
  } catch (error) {
    logger.warn(`Failed to fetch RemoteOK jobs: ${error.message}`);
    return [];
  }
};

/**
 * Fetches optional RapidAPI JSearch listings if RAPIDAPI_KEY is configured
 */
export const fetchJSearchJobs = async () => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return [];
  }

  try {
    const url = 'https://jsearch.p.rapidapi.com/search?query=software%20internship%20or%20developer&page=1&num_pages=1';
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const rawList = Array.isArray(data?.data) ? data.data : [];

    return rawList.map((item) => {
      const title = (item.job_title || 'Software Role').trim();
      const company = (item.employer_name || 'Employer').trim();
      const tags = (item.job_required_skills || []).map((s) => s.toLowerCase());
      const cleanSnippet = stripHtml(item.job_description).slice(0, 320);

      return {
        externalId: `jsearch-${item.job_id}`,
        canonicalUrl: item.job_apply_link || item.job_google_link,
        title,
        company,
        location: `${item.job_city || ''} ${item.job_country || ''}`.trim() || 'Flexible',
        isRemote: Boolean(item.job_is_remote),
        jobType: inferJobType(title, tags),
        description: item.job_description || cleanSnippet,
        snippet: cleanSnippet,
        tags,
        salary: item.job_min_salary ? `$${item.job_min_salary} - $${item.job_max_salary}` : null,
        companyLogo: item.employer_logo || null,
        source: 'JSearch (Aggregated Partner)',
        sourceUrl: item.job_apply_link || item.job_google_link,
        publishedAt: item.job_posted_at_timestamp ? new Date(item.job_posted_at_timestamp * 1000) : new Date(),
        metadata: { publisher: item.job_publisher },
      };
    });
  } catch (error) {
    logger.warn(`Failed to fetch JSearch jobs: ${error.message}`);
    return [];
  }
};

/**
 * Main ingestion workflow:
 * Fetches from all authorized sources, deduplicates against database,
 * stores fresh opportunities, and dispatches real-time alerts to matching candidates.
 */
export const syncAllJobFeeds = async ({ notifyUsers = true } = {}) => {
  logger.info('Starting external job feeds synchronization...');

  // Fetch concurrently from all enabled providers
  const [arbeitnowResult, remoteokResult, jsearchResult] = await Promise.allSettled([
    fetchArbeitnowJobs(30),
    fetchRemoteOKJobs(30),
    fetchJSearchJobs(),
  ]);

  const fetchedJobsings = [];
  if (arbeitnowResult.status === 'fulfilled') fetchedJobsings.push(...arbeitnowResult.value);
  if (remoteokResult.status === 'fulfilled') fetchedJobsings.push(...remoteokResult.value);
  if (jsearchResult.status === 'fulfilled') fetchedJobsings.push(...jsearchResult.value);

  logger.info(`Fetched total of ${fetchedJobsings.length} job postings from external providers.`);

  // Automatically expire opportunities older than 60 days
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  await ExternalJob.updateMany(
    { publishedAt: { $lt: sixtyDaysAgo }, isActive: true },
    { $set: { isActive: false } }
  );

  let newlyCreated = [];

  for (const jobData of fetchedJobsings) {
    try {
      // Deduplicate by externalId, canonicalUrl, or company + title combination
      const titleRegex = new RegExp(`^${jobData.title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const companyRegex = new RegExp(`^${jobData.company.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

      const existing = await ExternalJob.findOne({
        $or: [
          { externalId: jobData.externalId },
          { canonicalUrl: jobData.canonicalUrl },
          { title: titleRegex, company: companyRegex },
        ],
      });

      if (!existing) {
        const createdJob = await ExternalJob.create(jobData);
        newlyCreated.push(createdJob);
      } else {
        // Refresh active flag and canonical fields if previously inactive
        if (!existing.isActive) {
          existing.isActive = true;
          existing.publishedAt = jobData.publishedAt || existing.publishedAt;
          await existing.save();
        }
      }
    } catch (insertErr) {
      // Duplicate key or validation error safe handling
      logger.debug(`Skipping duplicate or invalid job (${jobData.title}): ${insertErr.message}`);
    }
  }

  logger.info(`Successfully persisted ${newlyCreated.length} brand new external job opportunities.`);

  // Dispatch real-time notifications for newly discovered relevant opportunities
  let notificationsDispatched = 0;
  if (notifyUsers && newlyCreated.length > 0) {
    notificationsDispatched = await dispatchJobAlertsToStudents(newlyCreated);
  }

  const totalActive = await ExternalJob.countDocuments({ isActive: true });

  return {
    success: true,
    syncedCount: fetchedJobsings.length,
    newCount: newlyCreated.length,
    totalActive,
    notificationsDispatched,
    sourcesChecked: ['Arbeitnow', 'RemoteOK', ...(process.env.RAPIDAPI_KEY ? ['JSearch'] : [])],
  };
};

/**
 * Matches newly indexed opportunities against active registered students,
 * avoiding duplicate notifications and delivering via Socket.IO.
 */
export const dispatchJobAlertsToStudents = async (newJobs = []) => {
  if (!newJobs || newJobs.length === 0) return 0;

  try {
    const students = await User.find({
      role: ROLES.STUDENT,
      status: 'active',
    }).select('_id name email profile').lean();

    if (students.length === 0) return 0;

    let alertCount = 0;

    // Check for each student
    for (const student of students) {
      const studentSkills = (student.profile?.studentDetails?.skills || []).map((s) => s.toLowerCase());
      const studentDept = (student.profile?.studentDetails?.department || student.profile?.department || '').toLowerCase();

      // Find top 1-2 newly created jobs matching student skills
      const matchingJobs = newJobs.filter((job) => {
        const jobTags = (job.tags || []).map((t) => t.toLowerCase());
        const hasSkillOverlap = studentSkills.some((skill) =>
          jobTags.some((tag) => tag.includes(skill) || skill.includes(tag))
        );
        const titleMatchesDept = studentDept && job.title.toLowerCase().includes(studentDept);
        return hasSkillOverlap || titleMatchesDept;
      });

      // Send alert for at most 2 relevant matches to avoid alert fatigue
      const selectedForAlertings = matchingJobs.slice(0, 2);

      for (const job of selectedForAlertings) {
        // Check if student was already notified about this specific job
        const recentNotif = await Notification.findOne({
          recipient: student._id,
          type: NOTIFICATION_TYPES.JOB_ALERT,
          'metadata.jobId': job._id,
        });

        if (!recentNotif) {
          const typeBadge = job.jobType === JOB_TYPES.INTERNSHIP ? 'Internship' : 'Job';
          await createAndDispatchNotification({
            recipientId: student._id,
            type: NOTIFICATION_TYPES.JOB_ALERT,
            title: `New ${typeBadge}: ${job.title} at ${job.company}`,
            message: `A new ${job.isRemote ? 'remote ' : ''}${typeBadge.toLowerCase()} was posted that aligns with your profile: ${job.title} at ${job.company} (Source: ${job.source}).`,
            link: '/external-jobs',
            metadata: {
              jobId: job._id,
              externalId: job.externalId,
              company: job.company,
              title: job.title,
              source: job.source,
              jobType: job.jobType,
              isRemote: job.isRemote,
            },
          });
          alertCount++;
        }
      }
    }

    logger.info(`Dispatched ${alertCount} real-time job alert notifications to active students.`);
    return alertCount;
  } catch (error) {
    logger.error('Error dispatching job alerts to students:', error);
    return 0;
  }
};

export default {
  fetchArbeitnowJobs,
  fetchRemoteOKJobs,
  fetchJSearchJobs,
  syncAllJobFeeds,
  dispatchJobAlertsToStudents,
};

