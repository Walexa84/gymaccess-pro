import React, { createContext, useContext, useState, useEffect } from 'react';

export type GymTheme = 'cyber' | 'clean';

interface ThemeContextType {
  theme: GymTheme;
  setTheme: (theme: GymTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<GymTheme>(() => {
    const saved = localStorage.getItem('gym_theme');
    if (saved === 'cyber' || saved === 'clean') {
      return saved;
    }
    return 'cyber'; // Cyber-Gym por defecto
  });

  const applyTheme = (newTheme: GymTheme) => {
    const root = document.documentElement;
    root.classList.remove('theme-cyber', 'theme-clean', 'dark');
    if (newTheme === 'cyber') {
      root.classList.add('theme-cyber', 'dark');
    } else {
      root.classList.add('theme-clean');
    }
  };

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('gym_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: GymTheme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'cyber' ? 'clean' : 'cyber'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};
