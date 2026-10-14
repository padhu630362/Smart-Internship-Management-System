import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Extracts raw textual content from an uploaded PDF or document resume.
 * @param {string} filePath - Absolute path to resume document on disk
 * @returns {Promise<string>} Cleaned text extracted from the document
 */
export const extractResumeText = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Resume file not found at ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      try {
        const pdfModule = await import('pdf-parse');
        // Handle various export shapes of pdf-parse across versions
        const pdfParse = pdfModule.default?.default || pdfModule.default || pdfModule;
        if (typeof pdfParse === 'function') {
          const parsed = await pdfParse(dataBuffer);
          if (parsed && parsed.text && parsed.text.trim().length > 0) {
            return cleanExtractedText(parsed.text);
          }
        }
      } catch (pdfErr) {
        logger.warn(`pdf-parse error: ${pdfErr.message}. Falling back to text extraction.`);
      }
    }

    // Fallback: extract legible printable text from buffer
    const rawString = dataBuffer.toString('utf-8');
    const cleaned = cleanExtractedText(rawString);
    if (cleaned.length > 50) {
      return cleaned;
    }

    return '';
  } catch (error) {
    logger.error('Failed to extract text from resume:', error);
    return '';
  }
};

/**
 * Sanitizes extracted document text for AI prompt ingestion.
 */
const cleanExtractedText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // remove control chars
    .replace(/\s+/g, ' ')                                    // normalize whitespace
    .trim()
    .slice(0, 15000);                                        // safe limit for context window
};

/**
 * Local deterministic matching algorithm used when Gemini API key is not configured,
 * or as a robust offline fallback.
 */
export const calculateDeterministicMatch = ({ resumeText = '', studentProfile = {}, internship }) => {
  const requiredSkills = (internship.requiredSkills || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const studentSkills = (studentProfile.skills || []).map((s) => s.trim().toLowerCase()).filter(Boolean);

  const combinedCandidateCorpus = `${resumeText.toLowerCase()} ${studentSkills.join(' ')} ${(studentProfile.department || '').toLowerCase()} ${(studentProfile.bio || '').toLowerCase()}`;

  const matchedSkills = [];
  const missingSkills = [];

  for (const skill of requiredSkills) {
    // Check if skill is mentioned in candidate skills array or resume text
    const regex = new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'i');
    if (studentSkills.includes(skill) || regex.test(combinedCandidateCorpus)) {
      matchedSkills.push(capitalizeWord(skill));
    } else {
      missingSkills.push(capitalizeWord(skill));
    }
  }

  // CGPA match
  const minCgpa = internship.eligibility?.minCgpa || 0;
  const studentCgpa = studentProfile.cgpa || 0;
  const isCgpaEligible = minCgpa === 0 || studentCgpa >= minCgpa;

  // Department match
  const allowedDepts = (internship.eligibility?.allowedDepartments || []).map((d) => d.toLowerCase());
  const studentDept = (studentProfile.department || '').toLowerCase();
  const isDeptEligible = allowedDepts.length === 0 || allowedDepts.some((d) => studentDept.includes(d) || d.includes(studentDept));

  // Compute percentage score (0 - 100)
  const totalSkills = Math.max(1, requiredSkills.length);
  const skillRatio = matchedSkills.length / totalSkills;
  let score = Math.round(skillRatio * 70); // 70% weight on skills

  if (isCgpaEligible) score += 20;        // 20% weight on CGPA
  if (isDeptEligible) score += 10;        // 10% weight on Department

  score = Math.min(100, Math.max(15, score));

  // Extracted skills from candidate
  const uniqueCandidateSkills = Array.from(
    new Set([...(studentProfile.skills || []), ...matchedSkills])
  );

  return {
    matchScore: score,
    matchedSkills,
    missingSkills,
    extractedSkills: uniqueCandidateSkills.length > 0 ? uniqueCandidateSkills : ['General Academic Competencies'],
    educationSummary: studentProfile.department
      ? `${studentProfile.department} (CGPA: ${studentCgpa || 'N/A'})`
      : 'Degree in Progress',
    experienceSummary: studentProfile.bio ? studentProfile.bio.slice(0, 150) : 'Academic coursework & practical project deliverables.',
    strengths: [
      matchedSkills.length > 0
        ? `Direct proficiency in key prerequisite skills: ${matchedSkills.slice(0, 3).join(', ')}.`
        : 'Meets academic foundation criteria.',
      isCgpaEligible ? `CGPA requirement satisfied (${studentCgpa || 'N/A'}).` : 'Academic profile registered on institutional portal.',
    ],
    improvements: missingSkills.length > 0
      ? [
          `Consider building hands-on portfolio projects demonstrating ${missingSkills.slice(0, 2).join(' and ')}.`,
          `Highlight any coursework or certifications covering ${missingSkills[0]}.`,
        ]
      : ['Profile matches all posted core prerequisite skills.'],
    overallAssessment: `Candidate displays an estimated ${score}% alignment with the "${internship.title}" placement criteria. Review application portfolio for complete technical assessment.`,
    isGeminiGenerated: false,
    engine: 'Deterministic Semantic Matcher',
    analyzedAt: new Date(),
  };
};

/**
 * Runs deep LLM resume analysis via Google Gemini API if GEMINI_API_KEY is available.
 * Falls back transparently to the deterministic matching engine.
 */
export const analyzeResumeWithGemini = async ({ resumeText, studentProfile = {}, internship }) => {
  const apiKey = env.GEMINI_API_KEY;

  if (process.env.NODE_ENV === 'test' || !apiKey || apiKey.trim().length === 0) {
    logger.debug('Running deterministic skill analysis engine (test or unconfigured key).');
    return calculateDeterministicMatch({ resumeText, studentProfile, internship });
  }

  try {
    const prompt = `
You are an expert AI Technical Recruiter and University Internship Evaluator.
Analyze this student candidate's resume and academic profile against the specified internship position.

INTERNSHIP REQUIREMENTS:
- Role Title: ${internship.title}
- Company: ${internship.companyName || 'Host Employer'}
- Description: ${internship.description}
- Required Skills: ${(internship.requiredSkills || []).join(', ')}
- Minimum CGPA: ${internship.eligibility?.minCgpa || 'None'}
- Allowed Departments: ${(internship.eligibility?.allowedDepartments || []).join(', ') || 'Any'}

CANDIDATE PROFILE:
- Name: ${studentProfile.name || 'Candidate'}
- Department: ${studentProfile.department || 'Not specified'}
- CGPA: ${studentProfile.cgpa || 'Not specified'}
- Stated Skills: ${(studentProfile.skills || []).join(', ')}
- Bio: ${studentProfile.bio || 'None'}
- Resume Document Content:
${resumeText ? resumeText.slice(0, 8000) : 'No document text extracted. Use candidate profile data.'}

TASK:
Evaluate the candidate's fit for this role.
Return a strictly valid JSON object (no markdown code fences, no extra text) with this exact schema:
{
  "matchScore": <number between 1 and 100 representing percentage match>,
  "matchedSkills": [<array of skill strings found in candidate profile that match the job>],
  "missingSkills": [<array of required skills the candidate appears to lack>],
  "extractedSkills": [<array of top skills identified from candidate>],
  "educationSummary": "<brief 1-sentence education summary>",
  "experienceSummary": "<brief 1-sentence experience summary>",
  "strengths": [<array of 2-3 key candidate strengths for this role>],
  "improvements": [<array of 1-3 specific suggestions to strengthen candidate readiness>],
  "overallAssessment": "<2-sentence executive assessment of candidate fit>"
}
`;

    // Use Gemini REST endpoint with native Node.js fetch
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      logger.warn(`Gemini API returned status ${response.status}: ${errBody}. Falling back to deterministic engine.`);
      return calculateDeterministicMatch({ resumeText, studentProfile, internship });
    }

    const jsonResponse = await response.json();
    const candidateText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return calculateDeterministicMatch({ resumeText, studentProfile, internship });
    }

    // Parse sanitized response
    let cleanJson = candidateText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);

    return {
      matchScore: Math.min(100, Math.max(1, Math.round(Number(parsed.matchScore) || 50))),
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      extractedSkills: Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills : [],
      educationSummary: parsed.educationSummary || 'Degree Candidate',
      experienceSummary: parsed.experienceSummary || 'Academic Projects',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      overallAssessment: parsed.overallAssessment || 'Candidate evaluated against posted opportunity specifications.',
      isGeminiGenerated: true,
      engine: 'Google Gemini 1.5 Flash',
      analyzedAt: new Date(),
    };
  } catch (error) {
    logger.warn(`Gemini analysis exception: ${error.message}. Using deterministic fallback.`);
    return calculateDeterministicMatch({ resumeText, studentProfile, internship });
  }
};

/**
 * Evaluates match between an external job/internship and a student candidate's profile.
 * Employs Google Gemini AI when configured, with a deterministic fallback.
 * Strictly avoids hallucinating details (salaries, dates, or invented criteria).
 */
export const matchExternalJobWithGemini = async ({ studentProfile = {}, job = {} }) => {
  const studentSkills = (studentProfile.skills || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const jobTags = (job.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const jobTitle = (job.title || '').trim();
  const jobCompany = (job.company || '').trim();
  const jobDesc = (job.description || job.snippet || '').slice(0, 3000);
  const jobType = job.jobType || 'internship';

  // Fallback calculation helper
  const calculateDeterministicJobMatch = () => {
    const matchedSkills = [];
    const missingSkills = [];
    const descLower = jobDesc.toLowerCase();
    const titleLower = jobTitle.toLowerCase();

    for (const tag of jobTags) {
      if (studentSkills.includes(tag) || (descLower.includes(tag) && studentSkills.some((s) => tag.includes(s) || s.includes(tag)))) {
        matchedSkills.push(capitalizeWord(tag));
      } else {
        missingSkills.push(capitalizeWord(tag));
      }
    }

    for (const s of studentSkills) {
      if ((descLower.includes(s) || titleLower.includes(s)) && !matchedSkills.map((m) => m.toLowerCase()).includes(s)) {
        matchedSkills.push(capitalizeWord(s));
      }
    }

    const totalKeySkills = Math.max(1, jobTags.length || 3);
    const skillRatio = Math.min(1, matchedSkills.length / totalKeySkills);
    let score = Math.round(skillRatio * 75);

    const dept = (studentProfile.department || studentProfile.course || '').toLowerCase();
    if (dept && (descLower.includes(dept) || titleLower.includes(dept) || ['computer', 'information', 'software', 'technology', 'engineering'].some((k) => dept.includes(k)))) {
      score += 15;
    }

    if (jobType === 'internship' || jobType === 'entry-level' || titleLower.includes('intern') || titleLower.includes('junior')) {
      score += 10;
    }

    score = Math.min(98, Math.max(20, score));

    let recommendationLevel = 'Exploratory';
    if (score >= 75) recommendationLevel = 'High Match';
    else if (score >= 50) recommendationLevel = 'Moderate Fit';

    const fitReason = matchedSkills.length > 0
      ? `Strong alignment with candidate skills (${matchedSkills.slice(0, 3).join(', ')}) in ${jobCompany}'s ${jobTitle} opening.`
      : `Broad role alignment with candidate's academic background and career trajectory for ${jobTitle}.`;

    return {
      matchScore: score,
      matchedSkills: Array.from(new Set(matchedSkills)),
      missingSkills: Array.from(new Set(missingSkills.slice(0, 5))),
      keyRequirements: jobTags.length > 0 ? jobTags.map(capitalizeWord).slice(0, 6) : ['Core Problem Solving', 'Software Engineering Fundamentals'],
      fitReason,
      recommendationLevel,
      isGeminiGenerated: false,
      engine: 'Deterministic Semantic Job Matcher',
      analyzedAt: new Date(),
    };
  };

  const apiKey = env.GEMINI_API_KEY;
  if (process.env.NODE_ENV === 'test' || !apiKey || apiKey.trim().length === 0) {
    return calculateDeterministicJobMatch();
  }

  try {
    const prompt = `
You are an expert AI Career Coach and Technical Job Placement Matcher.
Analyze how well this student candidate matches the following real-world job or internship opportunity.
CRITICAL CONSTRAINT: Do NOT hallucinate or invent salaries, application deadlines, or requirements not present in the provided text.

CANDIDATE PROFILE:
- Name: ${studentProfile.name || 'Candidate'}
- Department / Major: ${studentProfile.department || studentProfile.course || 'Technology'}
- CGPA: ${studentProfile.cgpa || 'Not specified'}
- Stated Skills: ${(studentProfile.skills || []).join(', ') || 'Not specified'}
- Bio: ${studentProfile.bio || 'Not specified'}

JOB OPPORTUNITY:
- Role Title: ${jobTitle}
- Company: ${jobCompany}
- Type: ${jobType}
- Location: ${job.location || 'Remote'}
- Tags / Listed Skills: ${jobTags.join(', ') || 'Not explicitly tagged'}
- Description Snippet:
${jobDesc}

TASK:
Provide an objective match score (0-100) and structured fit rationale.
Return STRICT JSON ONLY (no markdown code blocks, no backticks, no explanatory text outside the JSON) with this exact schema:
{
  "matchScore": <integer between 1 and 100>,
  "matchedSkills": [<strings of matching skills found in candidate profile>],
  "missingSkills": [<strings of key skills mentioned in the job description that candidate lacks>],
  "keyRequirements": [<top 3 to 5 core technical requirements extracted from description>],
  "fitReason": "<clear 1-2 sentence explanation of why this job matches the student>",
  "recommendationLevel": "<High Match | Moderate Fit | Exploratory>"
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      logger.warn(`Gemini Job Match returned status ${response.status}. Using deterministic fallback.`);
      return calculateDeterministicJobMatch();
    }

    const jsonRes = await response.json();
    const candidateText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return calculateDeterministicJobMatch();
    }

    let cleanJson = candidateText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    const score = Math.min(100, Math.max(1, Math.round(Number(parsed.matchScore) || 50)));

    let recLevel = parsed.recommendationLevel;
    if (!['High Match', 'Moderate Fit', 'Exploratory'].includes(recLevel)) {
      recLevel = score >= 75 ? 'High Match' : score >= 50 ? 'Moderate Fit' : 'Exploratory';
    }

    return {
      matchScore: score,
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      keyRequirements: Array.isArray(parsed.keyRequirements) ? parsed.keyRequirements : [],
      fitReason: parsed.fitReason || `Opportunity aligns with candidate profile for ${jobTitle}.`,
      recommendationLevel: recLevel,
      isGeminiGenerated: true,
      engine: 'Google Gemini 1.5 Flash',
      analyzedAt: new Date(),
    };
  } catch (err) {
    logger.warn(`Gemini Job Match error: ${err.message}. Using deterministic fallback.`);
    return calculateDeterministicJobMatch();
  }
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const capitalizeWord = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default {
  extractResumeText,
  calculateDeterministicMatch,
  analyzeResumeWithGemini,
  matchExternalJobWithGemini,
};

