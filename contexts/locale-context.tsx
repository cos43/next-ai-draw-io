"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { zhTranslations, enTranslations, type Locale } from "@/locales/translations";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// 本地存储 key
const LOCALE_STORAGE_KEY = "flowpilot-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化语言设置
  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale;
    if (savedLocale && (savedLocale === "zh" || savedLocale === "en")) {
      setLocaleState(savedLocale);
    } else {
      // 检测浏览器语言
      const browserLang = navigator.language.toLowerCase();
      const detectedLocale = browserLang.startsWith("zh") ? "zh" : "en";
      setLocaleState(detectedLocale);
    }
    setIsInitialized(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    // 更新 html lang 属性
    document.documentElement.lang = newLocale === "zh" ? "zh-CN" : "en";
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = getTranslation(key, locale);
    
    // 支持参数替换，如 {count}
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(
          new RegExp(`\\{${paramKey}\\}`, 'g'),
          String(paramValue)
        );
      });
    }
    
    return translation;
  };

  // 避免闪烁，等待初始化完成
  if (!isInitialized) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

// 翻译函数
function getTranslation(key: string, locale: Locale): string {
  const translations = locale === "zh" ? zhTranslations : enTranslations;
  
  // 支持嵌套键，如 "common.title"
  const keys = key.split(".");
  let value: any = translations;
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      console.warn(`Translation key "${key}" not found for locale "${locale}"`);
      return key;
    }
  }
  
  return typeof value === "string" ? value : key;
}
