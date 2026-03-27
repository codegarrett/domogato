import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useAuthStore } from '@/stores/auth';
const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const isRedirecting = ref(false);
const localLoading = ref(false);
const errorMsg = ref(null);
const email = ref('');
const password = ref('');
async function handleOidcLogin() {
    isRedirecting.value = true;
    errorMsg.value = null;
    try {
        await authStore.doLogin();
    }
    catch (e) {
        errorMsg.value = t('auth.loginFailed');
        isRedirecting.value = false;
    }
}
async function handleLocalLogin() {
    if (!email.value || !password.value)
        return;
    localLoading.value = true;
    errorMsg.value = null;
    try {
        await authStore.doLocalLogin(email.value, password.value);
        router.push('/');
    }
    catch (e) {
        const detail = e.response?.data?.detail || e.response?.data?.error?.message;
        errorMsg.value = detail || t('auth.loginFailed');
    }
    finally {
        localLoading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['register-link']} */ ;
/** @type {__VLS_StyleScopedClasses['register-link']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ style: {} },
});
(__VLS_ctx.authStore.authMode === 'oidc' ? __VLS_ctx.$t('auth.signInSubtitle') : __VLS_ctx.$t('auth.signInLocal'));
if (__VLS_ctx.authStore.authMode === 'oidc') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    const __VLS_0 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('auth.signInSSO')),
        icon: "pi pi-sign-in",
        ...{ class: "w-full" },
        loading: (__VLS_ctx.isRedirecting),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('auth.signInSSO')),
        icon: "pi pi-sign-in",
        ...{ class: "w-full" },
        loading: (__VLS_ctx.isRedirecting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (__VLS_ctx.handleOidcLogin)
    };
    var __VLS_3;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "local-login-form" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "email",
    });
    (__VLS_ctx.$t('auth.email'));
    const __VLS_8 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onKeyup': {} },
        id: "email",
        modelValue: (__VLS_ctx.email),
        type: "email",
        placeholder: (__VLS_ctx.$t('auth.emailPlaceholder')),
        ...{ class: "w-full" },
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onKeyup': {} },
        id: "email",
        modelValue: (__VLS_ctx.email),
        type: "email",
        placeholder: (__VLS_ctx.$t('auth.emailPlaceholder')),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onKeyup: (__VLS_ctx.handleLocalLogin)
    };
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "password",
    });
    (__VLS_ctx.$t('auth.password'));
    const __VLS_16 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onKeyup': {} },
        id: "password",
        modelValue: (__VLS_ctx.password),
        type: "password",
        placeholder: (__VLS_ctx.$t('auth.passwordPlaceholder')),
        ...{ class: "w-full" },
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onKeyup': {} },
        id: "password",
        modelValue: (__VLS_ctx.password),
        type: "password",
        placeholder: (__VLS_ctx.$t('auth.passwordPlaceholder')),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onKeyup: (__VLS_ctx.handleLocalLogin)
    };
    var __VLS_19;
    const __VLS_24 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('auth.signIn')),
        icon: "pi pi-sign-in",
        ...{ class: "w-full" },
        loading: (__VLS_ctx.localLoading),
        disabled: (!__VLS_ctx.email || !__VLS_ctx.password),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('auth.signIn')),
        icon: "pi pi-sign-in",
        ...{ class: "w-full" },
        loading: (__VLS_ctx.localLoading),
        disabled: (!__VLS_ctx.email || !__VLS_ctx.password),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onClick: (__VLS_ctx.handleLocalLogin)
    };
    var __VLS_27;
    if (__VLS_ctx.authStore.registrationEnabled) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "register-link" },
        });
        const __VLS_32 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            to: "/auth/register",
        }));
        const __VLS_34 = __VLS_33({
            to: "/auth/register",
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_35.slots.default;
        (__VLS_ctx.$t('auth.createAccount'));
        var __VLS_35;
    }
}
if (__VLS_ctx.errorMsg) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-msg" },
    });
    (__VLS_ctx.errorMsg);
}
/** @type {__VLS_StyleScopedClasses['login-view']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['local-login-form']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['register-link']} */ ;
/** @type {__VLS_StyleScopedClasses['error-msg']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            InputText: InputText,
            authStore: authStore,
            isRedirecting: isRedirecting,
            localLoading: localLoading,
            errorMsg: errorMsg,
            email: email,
            password: password,
            handleOidcLogin: handleOidcLogin,
            handleLocalLogin: handleLocalLogin,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
