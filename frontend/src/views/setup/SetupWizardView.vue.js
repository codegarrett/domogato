import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import { useAuthStore } from '@/stores/auth';
import { useAuth } from '@/composables/useAuth';
import axios from 'axios';
const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const { setLocalToken } = useAuth();
const step = ref(1);
const displayName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const redirecting = ref(false);
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
async function handleSetup() {
    if (!canSubmit.value)
        return;
    loading.value = true;
    errorMsg.value = null;
    try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
        const response = await axios.post(`${baseUrl}/setup/initialize`, {
            email: email.value,
            password: password.value,
            display_name: displayName.value.trim(),
        });
        const { access_token } = response.data;
        setLocalToken(access_token);
        step.value = 3;
        redirecting.value = true;
        await authStore.initAuth();
        setTimeout(() => {
            router.push('/');
        }, 1500);
    }
    catch (e) {
        const detail = e.response?.data?.detail || e.response?.data?.error?.message;
        errorMsg.value = detail || t('setup.setupFailed');
    }
    finally {
        loading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "setup-wizard" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "setup-card" },
});
if (__VLS_ctx.step === 1) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "step-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "step-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-cog" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    (__VLS_ctx.$t('setup.welcome'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtitle" },
    });
    (__VLS_ctx.$t('setup.welcomeMessage'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "features-list" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "feature-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-shield" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.$t('setup.featureAdmin'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "feature-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-users" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.$t('setup.featureTeam'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "feature-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-chart-bar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.$t('setup.featureProjects'));
    const __VLS_0 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('setup.getStarted')),
        icon: "pi pi-arrow-right",
        iconPos: "right",
        ...{ class: "w-full" },
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('setup.getStarted')),
        icon: "pi pi-arrow-right",
        iconPos: "right",
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.step === 1))
                return;
            __VLS_ctx.step = 2;
        }
    };
    var __VLS_3;
}
else if (__VLS_ctx.step === 2) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "step-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.$t('setup.createAdmin'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtitle" },
    });
    (__VLS_ctx.$t('setup.createAdminMessage'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-fields" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "displayName",
    });
    (__VLS_ctx.$t('auth.displayName'));
    const __VLS_8 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        id: "displayName",
        modelValue: (__VLS_ctx.displayName),
        placeholder: (__VLS_ctx.$t('auth.displayNamePlaceholder')),
        ...{ class: "w-full" },
    }));
    const __VLS_10 = __VLS_9({
        id: "displayName",
        modelValue: (__VLS_ctx.displayName),
        placeholder: (__VLS_ctx.$t('auth.displayNamePlaceholder')),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "email",
    });
    (__VLS_ctx.$t('auth.email'));
    const __VLS_12 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        id: "email",
        modelValue: (__VLS_ctx.email),
        type: "email",
        placeholder: (__VLS_ctx.$t('auth.emailPlaceholder')),
        ...{ class: "w-full" },
    }));
    const __VLS_14 = __VLS_13({
        id: "email",
        modelValue: (__VLS_ctx.email),
        type: "email",
        placeholder: (__VLS_ctx.$t('auth.emailPlaceholder')),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
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
        id: "password",
        modelValue: (__VLS_ctx.password),
        type: "password",
        placeholder: (__VLS_ctx.$t('auth.passwordPlaceholder')),
        ...{ class: "w-full" },
    }));
    const __VLS_18 = __VLS_17({
        id: "password",
        modelValue: (__VLS_ctx.password),
        type: "password",
        placeholder: (__VLS_ctx.$t('auth.passwordPlaceholder')),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "confirmPassword",
    });
    (__VLS_ctx.$t('auth.confirmPassword'));
    const __VLS_20 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        ...{ 'onKeyup': {} },
        id: "confirmPassword",
        modelValue: (__VLS_ctx.confirmPassword),
        type: "password",
        placeholder: (__VLS_ctx.$t('auth.confirmPasswordPlaceholder')),
        ...{ class: "w-full" },
    }));
    const __VLS_22 = __VLS_21({
        ...{ 'onKeyup': {} },
        id: "confirmPassword",
        modelValue: (__VLS_ctx.confirmPassword),
        type: "password",
        placeholder: (__VLS_ctx.$t('auth.confirmPasswordPlaceholder')),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    let __VLS_24;
    let __VLS_25;
    let __VLS_26;
    const __VLS_27 = {
        onKeyup: (__VLS_ctx.handleSetup)
    };
    var __VLS_23;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "button-row" },
    });
    const __VLS_28 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.back')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_30 = __VLS_29({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.back')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    let __VLS_32;
    let __VLS_33;
    let __VLS_34;
    const __VLS_35 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.step === 1))
                return;
            if (!(__VLS_ctx.step === 2))
                return;
            __VLS_ctx.step = 1;
        }
    };
    var __VLS_31;
    const __VLS_36 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('setup.createAndContinue')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.loading),
        disabled: (!__VLS_ctx.canSubmit),
    }));
    const __VLS_38 = __VLS_37({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('setup.createAndContinue')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.loading),
        disabled: (!__VLS_ctx.canSubmit),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    let __VLS_40;
    let __VLS_41;
    let __VLS_42;
    const __VLS_43 = {
        onClick: (__VLS_ctx.handleSetup)
    };
    var __VLS_39;
    if (__VLS_ctx.errorMsg) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "error-msg" },
        });
        (__VLS_ctx.errorMsg);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "step-content success-step" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "step-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-check-circle" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.$t('setup.success'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subtitle" },
    });
    (__VLS_ctx.$t('setup.successMessage'));
    if (__VLS_ctx.redirecting) {
        const __VLS_44 = {}.ProgressSpinner;
        /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            ...{ style: {} },
        }));
        const __VLS_46 = __VLS_45({
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    }
}
/** @type {__VLS_StyleScopedClasses['setup-wizard']} */ ;
/** @type {__VLS_StyleScopedClasses['setup-card']} */ ;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['step-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-cog']} */ ;
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['features-list']} */ ;
/** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-shield']} */ ;
/** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-users']} */ ;
/** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-chart-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['form-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-errors']} */ ;
/** @type {__VLS_StyleScopedClasses['button-row']} */ ;
/** @type {__VLS_StyleScopedClasses['error-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['success-step']} */ ;
/** @type {__VLS_StyleScopedClasses['step-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-check-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            InputText: InputText,
            ProgressSpinner: ProgressSpinner,
            step: step,
            displayName: displayName,
            email: email,
            password: password,
            confirmPassword: confirmPassword,
            loading: loading,
            redirecting: redirecting,
            errorMsg: errorMsg,
            validationErrors: validationErrors,
            canSubmit: canSubmit,
            handleSetup: handleSetup,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
