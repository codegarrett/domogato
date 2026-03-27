import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useAuthStore } from '@/stores/auth';
const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const displayName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errorMsg = ref(null);
const validationErrors = computed(() => {
    const errors = [];
    if (password.value && password.value.length < 8) {
        errors.push(t('auth.passwordMinLength'));
    }
    if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
        errors.push(t('auth.passwordsMustMatch'));
    }
    return errors;
});
const canSubmit = computed(() => {
    return displayName.value.trim() &&
        email.value &&
        password.value.length >= 8 &&
        password.value === confirmPassword.value &&
        validationErrors.value.length === 0;
});
async function handleRegister() {
    if (!canSubmit.value)
        return;
    loading.value = true;
    errorMsg.value = null;
    try {
        await authStore.doLocalRegister(email.value, password.value, displayName.value.trim());
        router.push('/');
    }
    catch (e) {
        const detail = e.response?.data?.detail || e.response?.data?.error?.message;
        errorMsg.value = detail || t('auth.registrationFailed');
    }
    finally {
        loading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['login-link']} */ ;
/** @type {__VLS_StyleScopedClasses['login-link']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "register-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ style: {} },
});
(__VLS_ctx.$t('auth.createAccountSubtitle'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "register-form" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "displayName",
});
(__VLS_ctx.$t('auth.displayName'));
const __VLS_0 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    id: "displayName",
    modelValue: (__VLS_ctx.displayName),
    placeholder: (__VLS_ctx.$t('auth.displayNamePlaceholder')),
    ...{ class: "w-full" },
}));
const __VLS_2 = __VLS_1({
    id: "displayName",
    modelValue: (__VLS_ctx.displayName),
    placeholder: (__VLS_ctx.$t('auth.displayNamePlaceholder')),
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "email",
});
(__VLS_ctx.$t('auth.email'));
const __VLS_4 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    id: "email",
    modelValue: (__VLS_ctx.email),
    type: "email",
    placeholder: (__VLS_ctx.$t('auth.emailPlaceholder')),
    ...{ class: "w-full" },
}));
const __VLS_6 = __VLS_5({
    id: "email",
    modelValue: (__VLS_ctx.email),
    type: "email",
    placeholder: (__VLS_ctx.$t('auth.emailPlaceholder')),
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "password",
});
(__VLS_ctx.$t('auth.password'));
const __VLS_8 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    id: "password",
    modelValue: (__VLS_ctx.password),
    type: "password",
    placeholder: (__VLS_ctx.$t('auth.passwordPlaceholder')),
    ...{ class: "w-full" },
}));
const __VLS_10 = __VLS_9({
    id: "password",
    modelValue: (__VLS_ctx.password),
    type: "password",
    placeholder: (__VLS_ctx.$t('auth.passwordPlaceholder')),
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "confirmPassword",
});
(__VLS_ctx.$t('auth.confirmPassword'));
const __VLS_12 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onKeyup': {} },
    id: "confirmPassword",
    modelValue: (__VLS_ctx.confirmPassword),
    type: "password",
    placeholder: (__VLS_ctx.$t('auth.confirmPasswordPlaceholder')),
    ...{ class: "w-full" },
}));
const __VLS_14 = __VLS_13({
    ...{ 'onKeyup': {} },
    id: "confirmPassword",
    modelValue: (__VLS_ctx.confirmPassword),
    type: "password",
    placeholder: (__VLS_ctx.$t('auth.confirmPasswordPlaceholder')),
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onKeyup: (__VLS_ctx.handleRegister)
};
var __VLS_15;
if (__VLS_ctx.validationErrors.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "validation-errors" },
    });
    for (const [err] of __VLS_getVForSourceType((__VLS_ctx.validationErrors))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: (err),
        });
        (err);
    }
}
const __VLS_20 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('auth.register')),
    icon: "pi pi-user-plus",
    ...{ class: "w-full" },
    loading: (__VLS_ctx.loading),
    disabled: (!__VLS_ctx.canSubmit),
}));
const __VLS_22 = __VLS_21({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('auth.register')),
    icon: "pi pi-user-plus",
    ...{ class: "w-full" },
    loading: (__VLS_ctx.loading),
    disabled: (!__VLS_ctx.canSubmit),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
let __VLS_24;
let __VLS_25;
let __VLS_26;
const __VLS_27 = {
    onClick: (__VLS_ctx.handleRegister)
};
var __VLS_23;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-link" },
});
const __VLS_28 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    to: "/auth/login",
}));
const __VLS_30 = __VLS_29({
    to: "/auth/login",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
(__VLS_ctx.$t('auth.alreadyHaveAccount'));
var __VLS_31;
if (__VLS_ctx.errorMsg) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-msg" },
    });
    (__VLS_ctx.errorMsg);
}
/** @type {__VLS_StyleScopedClasses['register-view']} */ ;
/** @type {__VLS_StyleScopedClasses['register-form']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-errors']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['login-link']} */ ;
/** @type {__VLS_StyleScopedClasses['error-msg']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            InputText: InputText,
            displayName: displayName,
            email: email,
            password: password,
            confirmPassword: confirmPassword,
            loading: loading,
            errorMsg: errorMsg,
            validationErrors: validationErrors,
            canSubmit: canSubmit,
            handleRegister: handleRegister,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
