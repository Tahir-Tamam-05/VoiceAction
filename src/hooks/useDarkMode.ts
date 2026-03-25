import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("voiceaction_theme") === "dark" || 
           (!localStorage.getItem("voiceaction_theme") && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem("voiceaction_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);
  return { isDark, toggle };
}
