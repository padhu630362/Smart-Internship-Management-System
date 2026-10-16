import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Building2,
  FileText,
  Upload,
  Trash2,
  Download,
  Eye,
  Save,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  ExternalLink,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';

export const ProfilePage = () => {
  const { user: authUser, updateUserState, reloadUser, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  // Form State
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    department: '',
    studentDetails: {
      studentId: '',
      department: '',
      course: '',
      graduationYear: '',
      cgpa: '',
      skills: [],
      resumeUrl: '',
      resumeFileName: '',
      resumeUploadedAt: null,
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
    },
    companyDetails: {
      companyName: '',
      industry: '',
      website: '',
      description: '',
      address: '',
      contactEmail: '',
      contactPhone: '',
    },
    mentorDetails: {
      companyName: '',
      designation: '',
      expertise: [],
      yearsOfExperience: '',
      linkedinUrl: '',
    },
    coordinatorDetails: {
      institution: '',
      facultyId: '',
      department: '',
      designation: '',
      officeLocation: '',
    },
  });

  const [skillInput, setSkillInput] = useState('');
  const [expertiseInput, setExpertiseInput] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await userService.getProfile();
      if (res?.data?.user) {
        const u = res.data.user;
        setProfile({
          name: u.name || '',
          email: u.email || '',
          phone: u.profile?.phone || '',
          bio: u.profile?.bio || '',
          department: u.profile?.department || '',
          studentDetails: {
            studentId: u.profile?.studentDetails?.studentId || '',
            department: u.profile?.studentDetails?.department || '',
            course: u.profile?.studentDetails?.course || '',
            graduationYear: u.profile?.studentDetails?.graduationYear || '',
            cgpa: u.profile?.studentDetails?.cgpa || '',
            skills: u.profile?.studentDetails?.skills || [],
            resumeUrl: u.profile?.studentDetails?.resumeUrl || '',
            resumeFileName: u.profile?.studentDetails?.resumeFileName || '',
            resumeUploadedAt: u.profile?.studentDetails?.resumeUploadedAt || null,
            linkedinUrl: u.profile?.studentDetails?.linkedinUrl || '',
            githubUrl: u.profile?.studentDetails?.githubUrl || '',
            portfolioUrl: u.profile?.studentDetails?.portfolioUrl || '',
          },
          companyDetails: {
            companyName: u.profile?.companyDetails?.companyName || '',
            industry: u.profile?.companyDetails?.industry || '',
            website: u.profile?.companyDetails?.website || '',
            description: u.profile?.companyDetails?.description || '',
            address: u.profile?.companyDetails?.address || '',
            contactEmail: u.profile?.companyDetails?.contactEmail || '',
            contactPhone: u.profile?.companyDetails?.contactPhone || '',
          },
          mentorDetails: {
            companyName: u.profile?.mentorDetails?.companyName || '',
            designation: u.profile?.mentorDetails?.designation || '',
            expertise: u.profile?.mentorDetails?.expertise || [],
            yearsOfExperience: u.profile?.mentorDetails?.yearsOfExperience || '',
            linkedinUrl: u.profile?.mentorDetails?.linkedinUrl || '',
          },
          coordinatorDetails: {
            institution: u.profile?.coordinatorDetails?.institution || '',
            facultyId: u.profile?.coordinatorDetails?.facultyId || '',
            department: u.profile?.coordinatorDetails?.department || '',
            designation: u.profile?.coordinatorDetails?.designation || '',
            officeLocation: u.profile?.coordinatorDetails?.officeLocation || '',
          },
        });
      }
    } catch (err) {
      setErrorMessage(err.message || err.response?.data?.error?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSaving(true);

    try {
      const payload = {
        name: profile.name,
        phone: profile.phone,
        bio: profile.bio,
        department: profile.department,
      };

      if (authUser?.role === 'student') {
        const studentDetailsClean = {
          studentId: profile.studentDetails?.studentId || '',
          department: profile.studentDetails?.department || '',
          course: profile.studentDetails?.course || '',
          skills: Array.isArray(profile.studentDetails?.skills) ? profile.studentDetails.skills : [],
          linkedinUrl: profile.studentDetails?.linkedinUrl || '',
          githubUrl: profile.studentDetails?.githubUrl || '',
          portfolioUrl: profile.studentDetails?.portfolioUrl || '',
        };
        const gradYear = profile.studentDetails?.graduationYear ? Number(profile.studentDetails.graduationYear) : null;
        if (gradYear && !isNaN(gradYear) && gradYear >= 2000 && gradYear <= 2100) {
          studentDetailsClean.graduationYear = gradYear;
        }
        const cgpaVal = profile.studentDetails?.cgpa !== '' && profile.studentDetails?.cgpa !== null && profile.studentDetails?.cgpa !== undefined ? Number(profile.studentDetails.cgpa) : null;
        if (cgpaVal !== null && !isNaN(cgpaVal) && cgpaVal >= 0 && cgpaVal <= 10) {
          studentDetailsClean.cgpa = cgpaVal;
        }
        payload.studentDetails = studentDetailsClean;
      } else if (authUser?.role === 'company') {
        payload.companyDetails = {
          companyName: profile.companyDetails?.companyName || '',
          industry: profile.companyDetails?.industry || '',
          website: profile.companyDetails?.website || '',
          description: profile.companyDetails?.description || '',
          address: profile.companyDetails?.address || '',
          contactEmail: profile.companyDetails?.contactEmail || '',
          contactPhone: profile.companyDetails?.contactPhone || '',
        };
      } else if (authUser?.role === 'mentor') {
        const yoe = profile.mentorDetails?.yearsOfExperience ? Number(profile.mentorDetails.yearsOfExperience) : null;
        payload.mentorDetails = {
          companyName: profile.mentorDetails?.companyName || '',
          designation: profile.mentorDetails?.designation || '',
          expertise: Array.isArray(profile.mentorDetails?.expertise) ? profile.mentorDetails.expertise : [],
          linkedinUrl: profile.mentorDetails?.linkedinUrl || '',
          ...(yoe !== null && !isNaN(yoe) && yoe >= 0 && { yearsOfExperience: yoe }),
        };
      } else if (authUser?.role === 'coordinator') {
        payload.coordinatorDetails = {
          institution: profile.coordinatorDetails?.institution || '',
          facultyId: profile.coordinatorDetails?.facultyId || '',
          department: profile.coordinatorDetails?.department || '',
          designation: profile.coordinatorDetails?.designation || '',
          officeLocation: profile.coordinatorDetails?.officeLocation || '',
        };
      }

      const res = await userService.updateProfile(payload);
      if (res?.data?.user) {
        if (typeof updateUserState === 'function') {
          updateUserState(res.data.user);
        } else if (typeof reloadUser === 'function') {
          reloadUser();
        }
        setSuccessMessage('Profile saved successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || err.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Student Skills Management
  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !profile.studentDetails.skills.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        studentDetails: {
          ...prev.studentDetails,
          skills: [...prev.studentDetails.skills, trimmed],
        },
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      studentDetails: {
        ...prev.studentDetails,
        skills: prev.studentDetails.skills.filter((s) => s !== skillToRemove),
      },
    }));
  };

  // Mentor Expertise Management
  const handleAddExpertise = (e) => {
    e.preventDefault();
    const trimmed = expertiseInput.trim();
    if (trimmed && !profile.mentorDetails.expertise.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        mentorDetails: {
          ...prev.mentorDetails,
          expertise: [...prev.mentorDetails.expertise, trimmed],
        },
      }));
      setExpertiseInput('');
    }
  };

  const handleRemoveExpertise = (itemToRemove) => {
    setProfile((prev) => ({
      ...prev,
      mentorDetails: {
        ...prev.mentorDetails,
        expertise: prev.mentorDetails.expertise.filter((e) => e !== itemToRemove),
      },
    }));
  };

  // Resume Upload Handler
  const handleResumeFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Resume file size must not exceed 5MB.');
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setErrorMessage('Only PDF, DOC, and DOCX documents are supported.');
      return;
    }

    try {
      setUploadingResume(true);
      setErrorMessage('');
      const res = await userService.uploadResume(file);
      if (res?.data) {
        setProfile((prev) => ({
          ...prev,
          studentDetails: {
            ...prev.studentDetails,
            resumeUrl: res.data.resumeUrl,
            resumeFileName: res.data.resumeFileName,
            resumeUploadedAt: res.data.resumeUploadedAt,
          },
        }));
        setSuccessMessage('Resume uploaded and verified successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || err.response?.data?.error?.message || 'Failed to upload resume file.');
    } finally {
      setUploadingResume(false);
      e.target.value = '';
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove your uploaded resume?')) return;

    try {
      setUploadingResume(true);
      await userService.deleteResume();
      setProfile((prev) => ({
        ...prev,
        studentDetails: {
          ...prev.studentDetails,
          resumeUrl: '',
          resumeFileName: '',
          resumeUploadedAt: null,
        },
      }));
      setSuccessMessage('Resume removed.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || err.response?.data?.error?.message || 'Failed to delete resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Loading your profile..." />
      </div>
    );
  }

  const role = authUser?.role || 'student';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Profile Banner */}
      <div className="surface-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-brand text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white/20">
              {profile.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {profile.name}
                </h1>
                <StatusBadge status={authUser?.status || 'active'} />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {profile.email}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold border border-brand-200/50 dark:border-brand-800/40 capitalize">
                  {role} Portal
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Role-authorized profile fields active
                </span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            form="profile-form"
            variant="primary"
            icon={Save}
            loading={saving}
            className="w-full sm:w-auto shadow-sm"
          >
            Save Profile
          </Button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <form id="profile-form" onSubmit={handleSave} className="space-y-6">
        {/* Core Personal Details */}
        <Card
          title="Account & Contact Information"
          subtitle="Basic identity and contact information visible across InternHub"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required
              placeholder="e.g. Alex Johnson"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Official Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850/60 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed font-mono"
                />
                <Shield className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Account email is tied to authentication and verified.
              </p>
            </div>

            <Input
              label="Phone Number"
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="e.g. +1 (555) 012-3456"
            />

            <Input
              label="Primary Department / Unit"
              value={profile.department}
              onChange={(e) => setProfile({ ...profile, department: e.target.value })}
              placeholder="e.g. School of Engineering"
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Professional Biography / Summary
            </label>
            <textarea
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              maxLength={500}
              placeholder="Brief professional headline, career goals, or research interests..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400 text-right mt-1">
              {profile.bio.length} / 500 characters
            </p>
          </div>
        </Card>

        {/* Student-Specific Profile Section */}
        {role === 'student' && (
          <>
            <Card
              title="Academic Details"
              subtitle="University registration, degree course, and academic metrics"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Student Enrollment ID"
                  value={profile.studentDetails.studentId}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      studentDetails: { ...profile.studentDetails, studentId: e.target.value },
                    })
                  }
                  placeholder="e.g. STU-2024-041"
                />

                <Input
                  label="Academic Department"
                  value={profile.studentDetails.department}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      studentDetails: { ...profile.studentDetails, department: e.target.value },
                    })
                  }
                  placeholder="e.g. Computer Science"
                />

                <Input
                  label="Course / Degree Program"
                  value={profile.studentDetails.course}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      studentDetails: { ...profile.studentDetails, course: e.target.value },
                    })
                  }
                  placeholder="e.g. B.S. Software Eng"
                />

                <Input
                  label="Expected Graduation Year"
                  type="number"
                  min="2020"
                  max="2035"
                  value={profile.studentDetails.graduationYear}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      studentDetails: { ...profile.studentDetails, graduationYear: e.target.value },
                    })
                  }
                  placeholder="e.g. 2026"
                />

                <Input
                  label="Cumulative GPA / Grade"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={profile.studentDetails.cgpa}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      studentDetails: { ...profile.studentDetails, cgpa: e.target.value },
                    })
                  }
                  placeholder="e.g. 8.75"
                />
              </div>
            </Card>

            {/* Skills Card */}
            <Card
              title="Technical Skills & Competencies"
              subtitle="Highlight technologies and methodologies to match relevant internship listings"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(e);
                    }
                  }}
                  placeholder="Add skill (e.g. React, Python, AWS) and press Enter"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-slate-400"
                />
                <Button
                  type="button"
                  variant="secondary"
                  icon={Plus}
                  onClick={handleAddSkill}
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3 min-h-[40px] p-3 rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800/60">
                {profile.studentDetails.skills.length > 0 ? (
                  profile.studentDetails.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/50"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="p-0.5 rounded-full hover:bg-brand-200/60 dark:hover:bg-brand-800/80 text-brand-600 dark:text-brand-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 self-center">
                    No skills added yet. Add skills to improve recommendations.
                  </p>
                )}
              </div>
            </Card>

            {/* Resume Upload Card */}
            <Card
              title="Official Student Resume Document"
              subtitle="Verified documents are shared with internship recruiters upon application submission"
            >
              {/* Hidden file input controlled via fileInputRef */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeFileChange}
                disabled={uploadingResume}
                className="hidden"
              />

              {profile.studentDetails.resumeUrl ? (
                <div className="p-4 rounded-xl border border-brand-200 dark:border-brand-800/80 bg-brand-50/50 dark:bg-brand-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {profile.studentDetails.resumeFileName || 'Student Resume Document'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Uploaded:{' '}
                        {profile.studentDetails.resumeUploadedAt
                          ? new Date(profile.studentDetails.resumeUploadedAt).toLocaleDateString()
                          : 'Recently'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <a
                      href={`${profile.studentDetails.resumeUrl}${profile.studentDetails.resumeUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token || localStorage.getItem('sims_auth_token') || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none"
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={Eye}
                        className="w-full"
                      >
                        View
                      </Button>
                    </a>

                    <a
                      href={`${profile.studentDetails.resumeUrl}${profile.studentDetails.resumeUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token || localStorage.getItem('sims_auth_token') || '')}&download=true`}
                      download={profile.studentDetails.resumeFileName || 'Resume.pdf'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none"
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        icon={Download}
                        className="w-full"
                      >
                        Download
                      </Button>
                    </a>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      icon={Upload}
                      loading={uploadingResume}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 sm:flex-none"
                    >
                      Replace
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={handleDeleteResume}
                      disabled={uploadingResume}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center hover:border-brand-500/60 dark:hover:border-brand-500/60 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Upload your latest CV / Resume
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Supported formats: PDF, DOC, DOCX. Maximum allowed file size: 5MB.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={Upload}
                    loading={uploadingResume}
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer shadow-sm"
                  >
                    Select File to Upload
                  </Button>
                </div>
              )}
            </Card>

            {/* Social & Portfolio Links */}
            <Card
              title="Social & Portfolio Profiles"
              subtitle="Add links to your public code repositories and professional profiles"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="LinkedIn Profile"
                  value={profile.studentDetails.linkedinUrl}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      studentDetails: { ...profile.studentDetails, linkedinUrl: e.target.value },
                    })
                  }
                  placeholder="https://linkedin.com/in/username"
                />

                <Input
                  label="GitHub Profile"
                  value={profile.studentDetails.githubUrl}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      studentDetails: { ...profile.studentDetails, githubUrl: e.target.value },
                    })
                  }
                  placeholder="https://github.com/username"
                />

                <Input
                  label="Portfolio / Personal Website"
                  value={profile.studentDetails.portfolioUrl}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      studentDetails: { ...profile.studentDetails, portfolioUrl: e.target.value },
                    })
                  }
                  placeholder="https://myportfolio.dev"
                />
              </div>
            </Card>
          </>
        )}

        {/* Company-Specific Section */}
        {role === 'company' && (
          <Card
            title="Company Organization Profile"
            subtitle="Employer entity details shown to applicants on internship postings"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company / Enterprise Name"
                value={profile.companyDetails.companyName}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    companyDetails: { ...profile.companyDetails, companyName: e.target.value },
                  })
                }
                placeholder="e.g. Acme Cloud Technologies"
              />

              <Input
                label="Industry Vertical"
                value={profile.companyDetails.industry}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    companyDetails: { ...profile.companyDetails, industry: e.target.value },
                  })
                }
                placeholder="e.g. Information Technology & SaaS"
              />

              <Input
                label="Corporate Website"
                value={profile.companyDetails.website}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    companyDetails: { ...profile.companyDetails, website: e.target.value },
                  })
                }
                placeholder="https://acmecloud.com"
              />

              <Input
                label="Recruiting Contact Email"
                type="email"
                value={profile.companyDetails.contactEmail}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    companyDetails: { ...profile.companyDetails, contactEmail: e.target.value },
                  })
                }
                placeholder="careers@acmecloud.com"
              />

              <div className="md:col-span-2">
                <Input
                  label="Headquarters Address"
                  value={profile.companyDetails.address}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      companyDetails: { ...profile.companyDetails, address: e.target.value },
                    })
                  }
                  placeholder="e.g. Suite 400, Tech Park, San Francisco, CA"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Mentor-Specific Section */}
        {role === 'mentor' && (
          <Card
            title="Mentor Professional Credentials"
            subtitle="Industry expertise and mentoring background"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Affiliated Organization"
                value={profile.mentorDetails.companyName}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    mentorDetails: { ...profile.mentorDetails, companyName: e.target.value },
                  })
                }
                placeholder="e.g. Global Tech Solutions"
              />

              <Input
                label="Designation / Position"
                value={profile.mentorDetails.designation}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    mentorDetails: { ...profile.mentorDetails, designation: e.target.value },
                  })
                }
                placeholder="e.g. Principal Software Engineer"
              />

              <Input
                label="Years of Industry Experience"
                type="number"
                min="0"
                max="50"
                value={profile.mentorDetails.yearsOfExperience}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    mentorDetails: { ...profile.mentorDetails, yearsOfExperience: e.target.value },
                  })
                }
                placeholder="e.g. 10"
              />

              <Input
                label="LinkedIn Profile"
                value={profile.mentorDetails.linkedinUrl}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    mentorDetails: { ...profile.mentorDetails, linkedinUrl: e.target.value },
                  })
                }
                placeholder="https://linkedin.com/in/mentor"
              />
            </div>
          </Card>
        )}

        {/* Coordinator-Specific Section */}
        {role === 'coordinator' && (
          <Card
            title="Institutional Placement Credentials"
            subtitle="Academic placement and faculty details for campus verification"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="University / Institution Name"
                value={profile.coordinatorDetails.institution}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    coordinatorDetails: { ...profile.coordinatorDetails, institution: e.target.value },
                  })
                }
                placeholder="e.g. Apex Institute of Technology"
              />

              <Input
                label="Faculty / Employee ID"
                value={profile.coordinatorDetails.facultyId}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    coordinatorDetails: { ...profile.coordinatorDetails, facultyId: e.target.value },
                  })
                }
                placeholder="e.g. FAC-2024-88"
              />

              <Input
                label="Placement Cell Department"
                value={profile.coordinatorDetails.department}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    coordinatorDetails: { ...profile.coordinatorDetails, department: e.target.value },
                  })
                }
                placeholder="e.g. Department of Training and Placement"
              />

              <Input
                label="Official Campus Office Location"
                value={profile.coordinatorDetails.officeLocation}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    coordinatorDetails: { ...profile.coordinatorDetails, officeLocation: e.target.value },
                  })
                }
                placeholder="e.g. Room 302, Academic Block A"
              />
            </div>
          </Card>
        )}

        {/* Save Bar at Bottom */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={saving}
            className="shadow-sm font-semibold px-6"
          >
            Save All Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
