import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { updateCurrentUser } from '@/api/users';
import { setLocale, getLocale } from '@/i18n';
import { useToastService } from '@/composables/useToast';
const { t } = useI18n();
const authStore = useAuthStore();
const uiStore = useUiStore();
const toast = useToastService();
const localeOptions = [
    { label: 'English', value: 'en' },
    { label: 'Español', value: 'es' },
];
const locale = ref(getLocale() || 'en');
const darkMode = ref(uiStore.darkMode);
const emailNotifications = ref(true);
const soundNotifications = ref(true);
onMounted(() => {
    const prefs = authStore.currentUser?.preferences ?? {};
    if (prefs.locale)
        locale.value = prefs.locale;
    if (typeof prefs.darkMode === 'boolean') {
        darkMode.value = prefs.darkMode;
        uiStore.setDarkMode(darkMode.value);
    }
    const notifs = (prefs.notifications ?? {});
    if (typeof notifs.email === 'boolean')
        emailNotifications.value = notifs.email;
    if (typeof notifs.sound === 'boolean')
        soundNotifications.value = notifs.sound;
});
async function onLocaleChange() {
    setLocale(locale.value);
    await savePreferences();
}
async function onDarkModeChange() {
    uiStore.setDarkMode(darkMode.value);
    await savePreferences();
}
async function savePreferences() {
    try {
        const prefs = {
            locale: locale.value,
            darkMode: darkMode.value,
            notifications: {
                email: emailNotifications.value,
                sound: soundNotifications.value,
            },
        };
        await updateCurrentUser({ preferences: prefs });
        if (authStore.currentUser) {
            authStore.currentUser = { ...authStore.currentUser, preferences: prefs };
        }
    }
    catch {
        toast.showError('Error', t('settings.saveFailed'));
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
(__VLS_ctx.t('settings.title'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "card-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-globe" },
});
(__VLS_ctx.t('settings.language'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-color-secondary mb-3" },
});
(__VLS_ctx.t('settings.languageDescription'));
const __VLS_0 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.locale),
    options: (__VLS_ctx.localeOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    ...{ style: {} },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.locale),
    options: (__VLS_ctx.localeOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onChange: (__VLS_ctx.onLocaleChange)
};
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "card-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-palette" },
});
(__VLS_ctx.t('settings.appearance'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-color-secondary mb-3" },
});
(__VLS_ctx.t('settings.appearanceDescription'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
(__VLS_ctx.t('settings.darkMode'));
const __VLS_8 = {}.ToggleSwitch;
/** @type {[typeof __VLS_components.ToggleSwitch, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.darkMode),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.darkMode),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onChange: (__VLS_ctx.onDarkModeChange)
};
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "card-heading" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-bell" },
});
(__VLS_ctx.t('settings.notifications'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-color-secondary mb-3" },
});
(__VLS_ctx.t('settings.notificationsDescription'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
(__VLS_ctx.t('settings.emailNotifications'));
const __VLS_16 = {}.ToggleSwitch;
/** @type {[typeof __VLS_components.ToggleSwitch, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.emailNotifications),
}));
const __VLS_18 = __VLS_17({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.emailNotifications),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onChange: (__VLS_ctx.savePreferences)
};
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row mt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
(__VLS_ctx.t('settings.soundNotifications'));
const __VLS_24 = {}.ToggleSwitch;
/** @type {[typeof __VLS_components.ToggleSwitch, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.soundNotifications),
}));
const __VLS_26 = __VLS_25({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.soundNotifications),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
let __VLS_28;
let __VLS_29;
let __VLS_30;
const __VLS_31 = {
    onChange: (__VLS_ctx.savePreferences)
};
var __VLS_27;
/** @type {__VLS_StyleScopedClasses['settings-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-globe']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-palette']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-bell']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Select: Select,
            ToggleSwitch: ToggleSwitch,
            t: t,
            localeOptions: localeOptions,
            locale: locale,
            darkMode: darkMode,
            emailNotifications: emailNotifications,
            soundNotifications: soundNotifications,
            onLocaleChange: onLocaleChange,
            onDarkModeChange: onDarkModeChange,
            savePreferences: savePreferences,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
