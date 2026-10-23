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
  ShieldCheck,
  Smartphone,
  Monitor,
  Laptop,
  Key,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  Edit3,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import authService from '../services/authService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import Modal from '../components/common/Modal';
import UserAvatar from '../components/common/UserAvatar';

// Curated high-resolution SVG preset avatars
const PRESET_AVATARS = [
  { id: 'dev-1', label: 'Engineer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&mouth=smile&eyebrows=default' },
  { id: 'dev-2', label: 'Tech Lead', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&mouth=smile' },
  { id: 'dev-3', label: 'Full Stack', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&mouth=smile' },
  { id: 'dev-4', label: 'Frontend', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara&mouth=smile' },
  { id: 'bot-1', label: 'AI Specialist', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex' },
  { id: 'bot-2', label: 'Cyber Tech', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Circuit' },
  { id: 'notion-1', label: 'Designer', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Leo' },
  { id: 'notion-2', label: 'Scientist', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Luna' },
  { id: 'lorelei-1', label: 'Researcher', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Milo' },
  { id: 'lorelei-2', label: 'Analyst', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe' },
  { id: 'persona-1', label: 'Manager', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Mason' },
  { id: 'persona-2', label: 'Coordinator', url: 'https://api.dicebear.com/7.x/personas/svg?seed=Maya' },
];

export const ProfilePage = () => {
  const { user: authUser, updateUserState, reloadUser, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  // Profile Picture (Avatar) Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarTab, setAvatarTab] = useState('upload'); // 'upload' | 'preset' | 'url'
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarFileInputRef = useRef(null);

  // Form State
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatarUrl: '',
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

  // Tab State: 'profile' | 'security'
  const [activeTab, setActiveTab] = useState('profile');

  // Two-Factor Authentication (2FA) State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(authUser?.twoFactorEnabled));
  const [showEnable2FAModal, setShowEnable2FAModal] = useState(false);
  const [enable2FACode, setEnable2FACode] = useState('');
  const [enable2FALoading, setEnable2FALoading] = useState(false);
  const [enable2FAError, setEnable2FAError] = useState('');
  const [enable2FANotice, setEnable2FANotice] = useState('');
  const [enable2FACooldown, setEnable2FACooldown] = useState(0);

  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [disable2FALoading, setDisable2FALoading] = useState(false);
  const [disable2FAError, setDisable2FAError] = useState('');

  // Active Sessions State
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  // 2FA Cooldown countdown
  useEffect(() => {
    if (enable2FACooldown <= 0) return;
    const timer = setInterval(() => {
      setEnable2FACooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [enable2FACooldown]);

  const fetch2FAStatus = async () => {
    try {
      const res = await authService.getTwoFactorStatus();
      if (res?.data) {
        setTwoFactorEnabled(!!res.data.twoFactorEnabled);
      }
    } catch (err) {
      console.warn('Failed to fetch 2FA status:', err);
    }
  };

  const handleStartEnable2FA = async () => {
    setEnable2FALoading(true);
    setEnable2FAError('');
    try {
      const res = await authService.requestEnableTwoFactor();
      setEnable2FANotice(res?.message || 'A 6-digit confirmation code has been dispatched to your email.');
      setEnable2FACode('');
      setEnable2FACooldown(60);
      setShowEnable2FAModal(true);
    } catch (err) {
      setErrorMessage(err.response?.data?.error?.message || err.message || 'Failed to request 2FA confirmation code.');
    } finally {
      setEnable2FALoading(false);
    }
  };

  const handleConfirmEnable2FA = async (e) => {
    e.preventDefault();
    if (!enable2FACode || enable2FACode.length !== 6) {
      setEnable2FAError('Please enter the complete 6-digit verification code.');
      return;
    }
    setEnable2FALoading(true);
    setEnable2FAError('');
    try {
      await authService.confirmEnableTwoFactor({ code: enable2FACode });
      setTwoFactorEnabled(true);
      if (typeof updateUserState === 'function') {
        updateUserState({ twoFactorEnabled: true });
      }
      setShowEnable2FAModal(false);
      setSuccessMessage('Two-factor authentication has been successfully activated!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setEnable2FAError(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Invalid or expired confirmation code.');
    } finally {
      setEnable2FALoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!disable2FAPassword) {
      setDisable2FAError('Please enter your current account password.');
      return;
    }
    setDisable2FALoading(true);
    setDisable2FAError('');
    try {
      await authService.disableTwoFactor({ password: disable2FAPassword });
      setTwoFactorEnabled(false);
      if (typeof updateUserState === 'function') {
        updateUserState({ twoFactorEnabled: false });
      }
      setShowDisable2FAModal(false);
      setDisable2FAPassword('');
      setSuccessMessage('Two-factor authentication has been disabled.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setDisable2FAError(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Incorrect password.');
    } finally {
      setDisable2FALoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await authService.getSessions();
      if (res?.data?.sessions) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      console.warn('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Log out this session? The device will immediately lose access.')) return;
    try {
      setRevokingSessionId(sessionId);
      await authService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSuccessMessage('Session revoked successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to revoke session.');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm('Log out all other active sessions? All devices except this one will be signed out.')) return;
    try {
      setRevokingOthers(true);
      const res = await authService.revokeOtherSessions();
      await fetchSessions();
      setSuccessMessage(res?.message || 'All other active sessions have been logged out.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to revoke other sessions.');
    } finally {
      setRevokingOthers(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetch2FAStatus();
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
          avatarUrl: u.profile?.avatarUrl || '',
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
        avatarUrl: profile.avatarUrl,
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

  // Profile Picture (Avatar) Handlers
  const handleOpenAvatarModal = () => {
    setAvatarError('');
    setSelectedAvatarFile(null);
    setAvatarPreview(profile.avatarUrl || '');
    setCustomAvatarUrl(profile.avatarUrl && !profile.avatarUrl.startsWith('/uploads') ? profile.avatarUrl : '');
    setAvatarTab('upload');
    setShowAvatarModal(true);
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file (PNG, JPG, JPEG, WEBP, GIF, SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image file size must be less than 5MB.');
      return;
    }

    setAvatarError('');
    setSelectedAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSaveAvatar = async () => {
    setSavingAvatar(true);
    setAvatarError('');

    try {
      if (avatarTab === 'upload') {
        if (!selectedAvatarFile) {
          setAvatarError('Please choose an image file to upload.');
          setSavingAvatar(false);
          return;
        }

        const res = await userService.uploadAvatar(selectedAvatarFile);
        if (res?.data?.avatarUrl) {
          const newUrl = res.data.avatarUrl;
          setProfile((prev) => ({ ...prev, avatarUrl: newUrl }));
          if (res.data.user) {
            updateUserState(res.data.user);
          } else {
            updateUserState({ profile: { ...(authUser?.profile || {}), avatarUrl: newUrl } });
          }
          setShowAvatarModal(false);
          setSuccessMessage('Profile picture updated successfully!');
          setTimeout(() => setSuccessMessage(''), 4000);
        }
      } else if (avatarTab === 'preset' || avatarTab === 'url') {
        const targetUrl = avatarTab === 'preset' ? avatarPreview : customAvatarUrl.trim();
        if (!targetUrl) {
          setAvatarError(avatarTab === 'preset' ? 'Please select an avatar preset.' : 'Please enter an image web address.');
          setSavingAvatar(false);
          return;
        }

        const res = await userService.updateProfile({ avatarUrl: targetUrl });
        const updatedUser = res?.data?.user;
        setProfile((prev) => ({ ...prev, avatarUrl: targetUrl }));
        if (updatedUser) {
          updateUserState(updatedUser);
        } else {
          updateUserState({ profile: { ...(authUser?.profile || {}), avatarUrl: targetUrl } });
        }
        setShowAvatarModal(false);
        setSuccessMessage('Profile picture updated successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setAvatarError(err.response?.data?.error?.message || err.message || 'Failed to update profile picture.');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove your profile picture and revert to initial monogram?')) return;
    setSavingAvatar(true);
    try {
      await userService.deleteAvatar();
      setProfile((prev) => ({ ...prev, avatarUrl: '' }));
      setAvatarPreview('');
      setSelectedAvatarFile(null);
      setCustomAvatarUrl('');
      updateUserState({ profile: { ...(authUser?.profile || {}), avatarUrl: '' } });
      setShowAvatarModal(false);
      setSuccessMessage('Profile picture removed.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setAvatarError(err.message || 'Failed to remove profile picture.');
    } finally {
      setSavingAvatar(false);
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
      <div className="surface-card rounded-2xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Interactive Profile Picture Container */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={handleOpenAvatarModal}
                className="relative block rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] shadow-md border-2 border-white/20"
                title="Click to change profile picture"
                id="profile-avatar-trigger"
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl.startsWith('/uploads') ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'}${profile.avatarUrl}` : profile.avatarUrl}
                    alt={profile.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-slate-100 dark:bg-slate-850"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={['w-16 h-16 sm:w-20 sm:h-20 rounded-2xl gradient-brand text-white flex items-center justify-center font-bold text-2xl', profile.avatarUrl ? 'hidden' : 'flex'].join(' ')}
                >
                  {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>

                {/* Subtle Hover Action Overlay */}
                <div className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                  <Camera className="w-5 h-5 mb-0.5 text-white" />
                  <span className="text-[10px] font-bold tracking-tight">Edit Photo</span>
                </div>
              </button>

              {/* Camera Badge Quick-Trigger Icon */}
              <button
                type="button"
                onClick={handleOpenAvatarModal}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-md border-2 border-white dark:border-stone-900 transition-transform hover:scale-110"
                title="Change profile picture"
                aria-label="Change profile picture"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
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

              {/* Action Buttons: Change Photo & Edit Profile */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Camera}
                  onClick={handleOpenAvatarModal}
                  className="text-xs border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 py-1 px-3"
                  id="change-photo-btn"
                >
                  Change Photo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Edit3}
                  onClick={() => {
                    setActiveTab('profile');
                    document.getElementById('full-name-input')?.focus();
                    document.getElementById('profile-form')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs py-1 px-3"
                  id="edit-profile-btn"
                >
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>

          {activeTab === 'profile' ? (
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
          ) : (
            <Button
              type="button"
              variant="outline"
              icon={RefreshCw}
              loading={loadingSessions}
              onClick={() => {
                fetch2FAStatus();
                fetchSessions();
              }}
              className="w-full sm:w-auto text-xs"
            >
              Refresh Sessions
            </Button>
          )}
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={['flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap', activeTab === 'profile' ? 'bg-burgundy-700 text-white shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:bg-champagne-50 dark:hover:bg-warmdark-850'].join(' ')}
        >
          <UserIcon className="w-4 h-4" />
          <span>Profile Details</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('security');
            fetchSessions();
            fetch2FAStatus();
          }}
          className={['flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap', activeTab === 'security' ? 'bg-burgundy-700 text-white shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:bg-champagne-50 dark:hover:bg-warmdark-850'].join(' ')}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security & Sessions</span>
          {twoFactorEnabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          )}
        </button>
      </div>

      {activeTab === 'profile' && (
        <form id="profile-form" onSubmit={handleSave} className="space-y-6">
        {/* Core Personal Details */}
        <Card
          title="Account & Contact Information"
          subtitle="Basic identity and contact information visible across InternHub"
        >
          {/* Profile Picture Quick Management Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mb-6 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <UserAvatar
                name={profile.name}
                avatarUrl={profile.avatarUrl}
                size="lg"
                className="ring-2 ring-brand-500/20"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Profile Photo</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visible to recruiters, coordinators, mentors, and peers across InternHub.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Camera}
                onClick={handleOpenAvatarModal}
                className="text-xs"
                id="inline-change-photo-btn"
              >
                Change Photo
              </Button>
              {profile.avatarUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={handleRemoveAvatar}
                  disabled={savingAvatar}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  id="inline-remove-photo-btn"
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="full-name-input"
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
                      href={`${profile.studentDetails.resumeUrl}${profile.studentDetails.resumeUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sims_auth_token') : null) || '')}`}
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
                      href={`${profile.studentDetails.resumeUrl}${profile.studentDetails.resumeUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sims_auth_token') : null) || '')}&download=true`}
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
      )}

      {/* Security & Active Sessions View */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Two-Factor Authentication Card */}
          <Card
            title="Two-Factor Authentication (2FA)"
            subtitle="Add a critical extra layer of defense by requiring an email verification code on sign-in."
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-start gap-3.5">
                <div
                  className={['w-11 h-11 rounded-xl flex items-center justify-center shrink-0', twoFactorEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'].join(' ')}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                      Email-Based 2FA Protection
                    </h4>
                    <span
                      className={['px-2.5 py-0.5 rounded-full text-xs font-bold', twoFactorEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'].join(' ')}
                    >
                      {twoFactorEnabled ? 'Active (Protected)' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xl leading-relaxed">
                    {twoFactorEnabled
                      ? 'Whenever you sign in with your password, a real 6-digit verification code will be sent to your registered email address before dashboard access is granted.'
                      : 'Two-factor authentication is currently disabled. Protect your account from unauthorized access by activating 2-step verification.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {twoFactorEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Lock}
                    onClick={() => {
                      setDisable2FAPassword('');
                      setDisable2FAError('');
                      setShowDisable2FAModal(true);
                    }}
                    className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400"
                  >
                    Disable 2FA
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={ShieldCheck}
                    loading={enable2FALoading}
                    onClick={handleStartEnable2FA}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    Enable 2FA
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Active Sessions Card */}
          <Card
            title="Active Login Sessions"
            subtitle="View devices and browsers that currently hold an authenticated session on your account."
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {sessions.length} active session{sessions.length === 1 ? '' : 's'} recorded
                </span>
                {sessions.filter((s) => !s.isCurrent).length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={LogOut}
                    loading={revokingOthers}
                    onClick={handleRevokeOtherSessions}
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400"
                  >
                    Log Out All Other Devices
                  </Button>
                )}
              </div>

              {loadingSessions ? (
                <div className="py-8">
                  <LoadingState message="Checking active sessions..." />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-400">
                  No other active sessions detected.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                  {sessions.map((sess) => {
                    const isMobile = sess.deviceType === 'Mobile';
                    const isTablet = sess.deviceType === 'Tablet';
                    const IconComponent = isMobile ? Smartphone : isTablet ? Laptop : Monitor;

                    return (
                      <div
                        key={sess.id}
                        className={['p-4 flex items-center justify-between gap-4 transition-colors', sess.isCurrent ? 'bg-champagne-50/40 dark:bg-warmdark-900/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-850/40'].join(' ')}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', sess.isCurrent ? 'bg-burgundy-100 text-burgundy-700 dark:bg-burgundy-950/60 dark:text-champagne-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'].join(' ')}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                                {sess.browser} on {sess.os}
                              </span>
                              {sess.isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500 font-mono">
                              <span>IP: {sess.ip}</span>
                              <span>•</span>
                              <span>
                                Active: {new Date(sess.lastActiveAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {!sess.isCurrent && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon={LogOut}
                              loading={revokingSessionId === sess.id}
                              onClick={() => handleRevokeSession(sess.id)}
                              className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Enable 2FA Verification Modal */}
      <Modal
        isOpen={showEnable2FAModal}
        onClose={() => {
          if (!enable2FALoading) {
            setShowEnable2FAModal(false);
            setEnable2FAError('');
          }
        }}
        title="Activate Two-Factor Authentication"
        subtitle="Confirm email delivery to secure your account."
        size="md"
      >
        <form onSubmit={handleConfirmEnable2FA} className="space-y-4 pt-2">
          {enable2FANotice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{enable2FANotice}</span>
            </div>
          )}

          {enable2FAError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{enable2FAError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 text-center">
              Enter 6-Digit Confirmation Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={enable2FACode}
              onChange={(e) => setEnable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-burgundy-500/20 focus:border-burgundy-600 shadow-inner"
              autoFocus
              required
            />
            <p className="text-[11px] text-stone-500 text-center">
              The code was sent to <span className="font-semibold font-mono">{authUser?.email}</span>. Valid for 10 minutes.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={enable2FACooldown > 0 || enable2FALoading}
              onClick={handleStartEnable2FA}
              className="text-xs font-semibold text-burgundy-700 dark:text-champagne-400 hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${enable2FALoading ? 'animate-spin' : ''}`} />
              <span>
                {enable2FACooldown > 0 ? `Resend in ${enable2FACooldown}s` : 'Resend code'}
              </span>
            </button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEnable2FAModal(false)}
                disabled={enable2FALoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={enable2FALoading}
                disabled={enable2FACode.length !== 6 || enable2FALoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirm & Enable
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Disable 2FA Verification Modal */}
      <Modal
        isOpen={showDisable2FAModal}
        onClose={() => {
          if (!disable2FALoading) {
            setShowDisable2FAModal(false);
            setDisable2FAError('');
          }
        }}
        title="Disable Two-Factor Authentication"
        subtitle="Confirm your current account password to turn off 2FA."
        size="md"
      >
        <form onSubmit={handleDisable2FA} className="space-y-4 pt-2">
          {disable2FAError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{disable2FAError}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Disabling two-factor authentication lowers your account security. Only password credentials will be required to sign in.
            </span>
          </div>

          <Input
            label="Current Account Password"
            type="password"
            icon={Key}
            placeholder="••••••••••••"
            value={disable2FAPassword}
            onChange={(e) => setDisable2FAPassword(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDisable2FAModal(false)}
              disabled={disable2FALoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={disable2FALoading}
              disabled={!disable2FAPassword || disable2FALoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Turn Off 2FA
            </Button>
          </div>
        </form>
      </Modal>

      {/* Profile Picture (Avatar) Modal */}
      <Modal
        isOpen={showAvatarModal}
        onClose={() => {
          if (!savingAvatar) {
            setShowAvatarModal(false);
            setAvatarError('');
          }
        }}
        title="Update Profile Picture"
        subtitle="Upload a custom photo, pick a curated avatar preset, or enter an image link."
        size="lg"
      >
        <div className="space-y-5 pt-1">
          {avatarError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{avatarError}</span>
            </div>
          )}

          {/* Live Avatar Preview Card */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-800">
            <div className="relative shrink-0">
              {avatarPreview ? (
                <img
                  src={
                    avatarPreview.startsWith('/uploads')
                      ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'}${avatarPreview}`
                      : avatarPreview
                  }
                  alt="Avatar Preview"
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-brand-500/20 shadow-md bg-slate-100 dark:bg-slate-800"
                  onError={() => {
                    setAvatarError('Unable to load image from preview source. Please check the URL.');
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl gradient-brand text-white flex items-center justify-center font-bold text-3xl shadow-md">
                  {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              {selectedAvatarFile && (
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-semibold shadow-xs">
                  New
                </span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {profile.name || 'Your Profile Picture'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {avatarTab === 'upload' && selectedAvatarFile
                  ? `Selected: ${selectedAvatarFile.name} (${(selectedAvatarFile.size / 1024).toFixed(1)} KB)`
                  : avatarTab === 'preset'
                  ? 'Selected from curated design presets'
                  : avatarTab === 'url' && customAvatarUrl
                  ? 'Custom direct URL source'
                  : 'Currently active profile image preview'}
              </p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-medium">
                  {avatarTab.toUpperCase()} MODE
                </span>
                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPreview(profile.avatarUrl);
                      setSelectedAvatarFile(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                  >
                    Reset to current
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAvatarTab('upload');
                setAvatarError('');
              }}
              className={['flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer', avatarTab === 'upload' ? 'bg-white dark:bg-slate-750 text-brand-600 dark:text-brand-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'].join(' ')}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAvatarTab('preset');
                setAvatarError('');
              }}
              className={['flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer', avatarTab === 'preset' ? 'bg-white dark:bg-slate-750 text-brand-600 dark:text-brand-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'].join(' ')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preset Avatars</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAvatarTab('url');
                setAvatarError('');
              }}
              className={['flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer', avatarTab === 'url' ? 'bg-white dark:bg-slate-750 text-brand-600 dark:text-brand-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'].join(' ')}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Image URL</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {avatarTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={handleAvatarFileChange}
              />

              <div
                onClick={() => avatarFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 group"
              >
                <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {selectedAvatarFile ? 'Replace selected image file' : 'Click to select or drop an image file'}
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supports PNG, JPG, JPEG, WEBP, GIF, SVG up to 5MB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Upload}
                  className="mt-3 pointer-events-none text-xs"
                >
                  Browse Image
                </Button>
              </div>

              {selectedAvatarFile && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Ready to save: {selectedAvatarFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAvatarFile(null);
                      setAvatarPreview(profile.avatarUrl || '');
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Preset Gallery */}
          {avatarTab === 'preset' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose one of our vector-rendered illustrated avatars for your profile:
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-64 overflow-y-auto p-1 pr-2">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = avatarPreview === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setAvatarPreview(preset.url);
                        setSelectedAvatarFile(null);
                      }}
                      className={['group relative flex flex-col items-center p-2 rounded-xl border transition-all text-center cursor-pointer', isSelected ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/30' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'].join(' ')}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-12 h-12 rounded-full object-cover group-hover:scale-105 transition-transform bg-slate-100 dark:bg-slate-800"
                        loading="lazy"
                      />
                      <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1 truncate max-w-full">
                        {preset.label}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Direct Web Image URL */}
          {avatarTab === 'url' && (
            <div className="space-y-3">
              <Input
                label="Direct Image Web Address (URL)"
                placeholder="https://example.com/avatar.jpg"
                icon={LinkIcon}
                value={customAvatarUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomAvatarUrl(val);
                  setAvatarPreview(val);
                  setSelectedAvatarFile(null);
                }}
                helperText="Paste a secure (HTTPS) link to an image on Gravatar, Unsplash, GitHub, or any public host."
              />
            </div>
          )}

          {/* Dialog Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            {profile.avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={handleRemoveAvatar}
                disabled={savingAvatar}
                className="w-full sm:w-auto text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Remove Current Photo
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarError('');
                }}
                disabled={savingAvatar}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Save}
                loading={savingAvatar}
                onClick={handleSaveAvatar}
                className="font-bold shadow-xs"
              >
                Save Picture
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
