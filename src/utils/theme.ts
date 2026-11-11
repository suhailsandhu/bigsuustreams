export type ThemeMode = 'light' | 'dark' | 'system';

export function getEffectiveTheme(mode?: string | null): 'light' | 'dark' {
  const m = mode || (typeof window !== 'undefined' ? localStorage.getItem('bss_theme_mode') : null) || 'light';
  if (m === 'dark') return 'dark';
  if (m === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(mode?: ThemeMode): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  const savedMode = (mode || localStorage.getItem('bss_theme_mode') || 'light') as ThemeMode;
  const effective = getEffectiveTheme(savedMode);
  const isDark = effective === 'dark';
  const root = document.documentElement;

  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    root.style.backgroundColor = '#0b0b0c';
    document.body.style.backgroundColor = '#0b0b0c';
    document.body.style.color = '#f5f5f5';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    root.style.backgroundColor = '#ffffff';
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#0f172a';
  }

  // Update mobile status bar theme-color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#0b0b0c' : '#ffffff');
  }

  return effective;
}
