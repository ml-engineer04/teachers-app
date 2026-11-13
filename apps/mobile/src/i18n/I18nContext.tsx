import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AppLanguage,
  getCachedPreferences,
  loadAppPreferences,
  normalizeLanguageCode,
  saveLanguage,
  subscribePreferences,
} from '../services/storage/appPreferences';
import {
  TRANSLATIONS,
  interpolate,
  localizeBookType,
  localizeGradeLabel,
  localizeSubjectName,
} from './translations';

type TranslationBag = (typeof TRANSLATIONS)[AppLanguage];

interface I18nContextValue {
  language: AppLanguage;
  strings: TranslationBag;
  setLanguage: (lang: AppLanguage | string) => Promise<void>;
  t: (path: string, vars?: Record<string, string | number>) => string;
  formatGrade: (gradeId: number | string) => string;
  formatSubject: (name?: string | null, subjectId?: string | null) => string;
  formatBookType: (type?: string | null) => string;
}

function getByPath(obj: any, path: string): string | undefined {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'uz',
  strings: TRANSLATIONS.uz,
  setLanguage: async () => {},
  t: (path, vars) => interpolate(getByPath(TRANSLATIONS.uz, path) ?? path, vars),
  formatGrade: (g) => localizeGradeLabel(g, 'uz'),
  formatSubject: (name, id) => localizeSubjectName(name, 'uz', id),
  formatBookType: (type) => localizeBookType(type, 'uz'),
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => getCachedPreferences().language);

  useEffect(() => {
    let mounted = true;
    loadAppPreferences().then((prefs) => {
      if (mounted) setLanguageState(prefs.language);
    });
    const unsub = subscribePreferences((prefs) => {
      if (mounted) setLanguageState(prefs.language);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const setLanguage = useCallback(async (lang: AppLanguage | string) => {
    const normalized = normalizeLanguageCode(lang);
    setLanguageState(normalized);
    await saveLanguage(normalized);
  }, []);

  const strings = TRANSLATIONS[language] || TRANSLATIONS.uz;

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const value =
        getByPath(TRANSLATIONS[language], path) ??
        getByPath(TRANSLATIONS.uz, path) ??
        path;
      return interpolate(value, vars);
    },
    [language],
  );

  const formatGrade = useCallback(
    (gradeId: number | string) => localizeGradeLabel(gradeId, language),
    [language],
  );

  const formatSubject = useCallback(
    (name?: string | null, subjectId?: string | null) => localizeSubjectName(name, language, subjectId),
    [language],
  );

  const formatBookType = useCallback(
    (type?: string | null) => localizeBookType(type, language),
    [language],
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        strings,
        setLanguage,
        t,
        formatGrade,
        formatSubject,
        formatBookType,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
