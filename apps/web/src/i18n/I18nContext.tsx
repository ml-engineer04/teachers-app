import React, { createContext, useCallback, useContext, useState } from 'react';
import { WebLanguage, webStorage } from '../services/storage/webStorage';
import {
  TRANSLATIONS,
  interpolate,
  localizeBookType,
  localizeGradeLabel,
  localizeSubjectName,
} from './translations';

type TranslationBag = (typeof TRANSLATIONS)[WebLanguage];

interface I18nContextValue {
  language: WebLanguage;
  strings: TranslationBag;
  setLanguage: (lang: WebLanguage) => void;
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
  setLanguage: () => {},
  t: (path, vars) => interpolate(getByPath(TRANSLATIONS.uz, path) ?? path, vars),
  formatGrade: (g) => localizeGradeLabel(g, 'uz'),
  formatSubject: (name, id) => localizeSubjectName(name, 'uz', id),
  formatBookType: (type) => localizeBookType(type, 'uz'),
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<WebLanguage>(() => webStorage.getLanguage());

  const setLanguage = useCallback((lang: WebLanguage) => {
    setLanguageState(lang);
    webStorage.saveLanguage(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
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
