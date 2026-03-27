import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import es from './locales/es.json';
const savedLocale = localStorage.getItem('projecthub-locale') || 'en';
const i18n = createI18n({
    legacy: false,
    locale: savedLocale,
    fallbackLocale: 'en',
    messages: { en, es },
});
export function setLocale(locale) {
    ;
    i18n.global.locale.value = locale;
    localStorage.setItem('projecthub-locale', locale);
    document.documentElement.lang = locale;
}
export function getLocale() {
    return i18n.global.locale.value;
}
export default i18n;
