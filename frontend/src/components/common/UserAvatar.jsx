import React, { useState } from 'react';

// Curated harmonious gradients based on character codes
const GRADIENTS = [
  'from-emerald-600 to-teal-700',
  'from-blue-600 to-indigo-700',
  'from-purple-600 to-pink-700',
  'from-amber-600 to-rose-600',
  'from-teal-600 to-cyan-700',
  'from-rose-600 to-burgundy-700',
  'from-indigo-600 to-violet-700',
  'from-cyan-600 to-blue-700',
];

const getGradientForName = (name = '') => {
  if (!name) return GRADIENTS[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return GRADIENTS[sum % GRADIENTS.length];
};

export const UserAvatar = ({
  user,
  sender,
  name,
  avatarUrl,
  isOnline = false,
  showStatus = false,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Extract candidate data
  const targetUser = user || sender;
  const rawName = name || targetUser?.name || 'User';
  const rawAvatarUrl = avatarUrl || targetUser?.profile?.avatarUrl;
  const initial = (rawName.trim().charAt(0) || 'U').toUpperCase();
  const gradientClass = getGradientForName(rawName);

  // Size configurations
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs sm:text-sm',
    lg: 'w-12 h-12 text-sm sm:text-base',
    xl: 'w-14 h-14 text-base sm:text-lg',
  };

  const statusSizeMap = {
    xs: 'w-1.5 h-1.5 border',
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-3.5 h-3.5 border-2',
  };

  const currentSizeClass = sizeMap[size] || size;
  const currentStatusClass = statusSizeMap[size] || 'w-2.5 h-2.5 border-2';

  const hasValidImage = rawAvatarUrl && !imgError;

  return (
    <div className={`relative shrink-0 inline-flex items-center justify-center ${className}`}>
      {hasValidImage ? (
        <img
          src={rawAvatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${currentSizeClass} rounded-full object-cover border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs`}
        />
      ) : (
        <div
          className={`${currentSizeClass} rounded-full bg-gradient-to-tr ${gradientClass} text-white flex items-center justify-center font-bold tracking-tight shadow-xs select-none border border-white/20`}
        >
          {initial}
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-white dark:border-stone-900 ${currentStatusClass} ${
            isOnline ? 'bg-emerald-500 ring-1 ring-emerald-300 dark:ring-emerald-800' : 'bg-stone-300 dark:bg-stone-600'
          }`}
          title={isOnline ? 'Online now' : 'Offline'}
        />
      )}
    </div>
  );
};

export default UserAvatar;
