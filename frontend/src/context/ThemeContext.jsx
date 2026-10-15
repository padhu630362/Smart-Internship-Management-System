import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  BURGUNDY: 'burgundy',
  SAPPHIRE: 'sapphire',
  LIGHT: 'light',
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check saved local preference
    const saved = localStorage.getItem('sims-theme');
    if (saved && ['burgundy', 'sapphire', 'light', 'dark'].includes(saved)) {
      return saved === 'dark' ? 'burgundy' : saved;
    }
    // Default to signature Burgundy theme
    return 'burgundy';
  });

  useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('dark', 'theme-sapphire', 'theme-burgundy', 'theme-light');

    if (theme === 'sapphire') {
      root.classList.add('dark', 'theme-sapphire');
    } else if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      // Default: Royal Burgundy (dark)
      root.classList.add('dark', 'theme-burgundy');
    }

    localStorage.setItem('sims-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'burgundy' || prev === 'dark') return 'sapphire';
      if (prev === 'sapphire') return 'light';
      return 'burgundy';
    });
  };

  const isDark = theme !== 'light';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
