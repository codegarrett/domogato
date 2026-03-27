import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import es from './locales/es.json'

type MessageSchema = typeof en

const savedLocale = localStorage.getItem('projecthub-locale') || 'en'

const i18n = createI18n<[MessageSchema], 'en' | 'es'>({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, es },
})

export function setLocale(locale: 'en' | 'es') {
  ;(i18n.global.locale as any).value = locale
  localStorage.setItem('projecthub-locale', locale)
  document.documentElement.lang = locale
}

export function getLocale(): string {
  return (i18n.global.locale as any).value
}

export default i18n
