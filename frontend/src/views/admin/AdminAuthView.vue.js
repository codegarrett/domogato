import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import Chip from 'primevue/chip';
import ProgressSpinner from 'primevue/progressspinner';
import AdminSubNav from '@/components/common/AdminSubNav.vue';
import SourceBadge from '@/components/admin/SourceBadge.vue';
import apiClient from '@/api/client';
import { useToastService } from '@/composables/useToast';
const { t } = useI18n();
const toast = useToastService();
const loading = ref(true);
const saving = ref(false);
const testing = ref(false);
const testResult = ref(null);
const newDomain = ref('');
const serverSettings = ref({});
const form = reactive({
    auth_mode: 'local',
    local_registration_enabled: false,
    oidc_issuer_url: '',
    oidc_client_id: '',
    oidc_client_secret: '',
    oidc_auto_provision: true,
    oidc_allowed_domains: [],
    oidc_default_org_id: null,
    oidc_admin_claim: 'projecthub-admin',
});
const authModeOptions = [
    { label: t('admin.modeLocal'), value: 'local' },
    { label: t('admin.modeOidc'), value: 'oidc' },
];
const orgOptions = ref([]);
function settingSource(key) {
    return serverSettings.value[key]?.source || 'default';
}
function settingLocked(key) {
    return serverSettings.value[key]?.env_locked || false;
}
function removeDomain(domain) {
    form.oidc_allowed_domains = form.oidc_allowed_domains.filter(d => d !== domain);
}
function addDomain() {
    const domain = newDomain.value.trim().toLowerCase();
    if (domain && !form.oidc_allowed_domains.includes(domain)) {
        form.oidc_allowed_domains.push(domain);
    }
    newDomain.value = '';
}
async function loadSettings() {
    loading.value = true;
    try {
        const [settingsResp, orgsResp] = await Promise.all([
            apiClient.get('/system-settings/auth'),
            apiClient.get('/organizations'),
        ]);
        serverSettings.value = settingsResp.data.settings;
        for (const [key, entry] of Object.entries(settingsResp.data.settings)) {
            if (key in form) {
                form[key] = entry.value;
            }
        }
        const orgs = orgsResp.data.items || orgsResp.data || [];
        orgOptions.value = orgs.map((o) => ({ label: o.name, value: o.id }));
    }
    catch (e) {
        console.error('Failed to load auth settings:', e);
    }
    finally {
        loading.value = false;
    }
}
async function saveSettings() {
    saving.value = true;
    try {
        const updates = {};
        for (const [key, val] of Object.entries(form)) {
            if (!settingLocked(key)) {
                if (key === 'oidc_client_secret' && val === '****')
                    continue;
                updates[key] = val;
            }
        }
        const resp = await apiClient.put('/system-settings/auth', updates);
        serverSettings.value = resp.data.settings;
        toast.showSuccess(t('common.saved'), t('admin.settingsSaved'));
    }
    catch (e) {
        const msg = e.response?.data?.detail || 'Failed to save settings';
        toast.showError(t('common.error'), msg);
    }
    finally {
        saving.value = false;
    }
}
async function testOidcConnection() {
    testing.value = true;
    testResult.value = null;
    try {
        const resp = await apiClient.post('/system-settings/auth/test-oidc', {
            issuer_url: form.oidc_issuer_url || undefined,
        });
        testResult.value = resp.data.success;
        if (!resp.data.success) {
            toast.showError(t('admin.testFailed'), resp.data.detail || 'Unknown error');
        }
    }
    catch (e) {
        testResult.value = false;
    }
    finally {
        testing.value = false;
    }
}
onMounted(loadSettings);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['domain-add-row']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
(__VLS_ctx.t('admin.authSettings'));
/** @type {[typeof AdminSubNav, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(AdminSubNav, new AdminSubNav({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center py-6" },
    });
    const __VLS_3 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({}));
    const __VLS_5 = __VLS_4({}, ...__VLS_functionalComponentArgsRest(__VLS_4));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "auth-settings-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settings-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.t('admin.authMode'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "muted" },
    });
    (__VLS_ctx.t('admin.authModeDescription'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "setting-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "setting-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.t('admin.authModeLabel'));
    /** @type {[typeof SourceBadge, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(SourceBadge, new SourceBadge({
        source: (__VLS_ctx.settingSource('auth_mode')),
        locked: (__VLS_ctx.settingLocked('auth_mode')),
    }));
    const __VLS_8 = __VLS_7({
        source: (__VLS_ctx.settingSource('auth_mode')),
        locked: (__VLS_ctx.settingLocked('auth_mode')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const __VLS_10 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
        modelValue: (__VLS_ctx.form.auth_mode),
        options: (__VLS_ctx.authModeOptions),
        optionLabel: "label",
        optionValue: "value",
        disabled: (__VLS_ctx.settingLocked('auth_mode')),
        ...{ class: "setting-select" },
    }));
    const __VLS_12 = __VLS_11({
        modelValue: (__VLS_ctx.form.auth_mode),
        options: (__VLS_ctx.authModeOptions),
        optionLabel: "label",
        optionValue: "value",
        disabled: (__VLS_ctx.settingLocked('auth_mode')),
        ...{ class: "setting-select" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    if (__VLS_ctx.form.auth_mode === 'local') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "settings-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        (__VLS_ctx.t('admin.localAuthSettings'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted" },
        });
        (__VLS_ctx.t('admin.localAuthDescription'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        (__VLS_ctx.t('admin.allowRegistration'));
        /** @type {[typeof SourceBadge, ]} */ ;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent(SourceBadge, new SourceBadge({
            source: (__VLS_ctx.settingSource('local_registration_enabled')),
            locked: (__VLS_ctx.settingLocked('local_registration_enabled')),
        }));
        const __VLS_15 = __VLS_14({
            source: (__VLS_ctx.settingSource('local_registration_enabled')),
            locked: (__VLS_ctx.settingLocked('local_registration_enabled')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_14));
        const __VLS_17 = {}.ToggleSwitch;
        /** @type {[typeof __VLS_components.ToggleSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
            modelValue: (__VLS_ctx.form.local_registration_enabled),
            disabled: (__VLS_ctx.settingLocked('local_registration_enabled')),
        }));
        const __VLS_19 = __VLS_18({
            modelValue: (__VLS_ctx.form.local_registration_enabled),
            disabled: (__VLS_ctx.settingLocked('local_registration_enabled')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_18));
    }
    if (__VLS_ctx.form.auth_mode === 'oidc') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "settings-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        (__VLS_ctx.t('admin.oidcSettings'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted" },
        });
        (__VLS_ctx.t('admin.oidcDescription'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-row vertical" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        (__VLS_ctx.t('admin.oidcIssuerUrl'));
        /** @type {[typeof SourceBadge, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(SourceBadge, new SourceBadge({
            source: (__VLS_ctx.settingSource('oidc_issuer_url')),
            locked: (__VLS_ctx.settingLocked('oidc_issuer_url')),
        }));
        const __VLS_22 = __VLS_21({
            source: (__VLS_ctx.settingSource('oidc_issuer_url')),
            locked: (__VLS_ctx.settingLocked('oidc_issuer_url')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        const __VLS_24 = {}.InputText;
        /** @type {[typeof __VLS_components.InputText, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            modelValue: (__VLS_ctx.form.oidc_issuer_url),
            disabled: (__VLS_ctx.settingLocked('oidc_issuer_url')),
            placeholder: "https://keycloak.example.com/realms/projecthub",
            ...{ class: "w-full" },
        }));
        const __VLS_26 = __VLS_25({
            modelValue: (__VLS_ctx.form.oidc_issuer_url),
            disabled: (__VLS_ctx.settingLocked('oidc_issuer_url')),
            placeholder: "https://keycloak.example.com/realms/projecthub",
            ...{ class: "w-full" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-row vertical" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        (__VLS_ctx.t('admin.oidcClientId'));
        /** @type {[typeof SourceBadge, ]} */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(SourceBadge, new SourceBadge({
            source: (__VLS_ctx.settingSource('oidc_client_id')),
            locked: (__VLS_ctx.settingLocked('oidc_client_id')),
        }));
        const __VLS_29 = __VLS_28({
            source: (__VLS_ctx.settingSource('oidc_client_id')),
            locked: (__VLS_ctx.settingLocked('oidc_client_id')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        const __VLS_31 = {}.InputText;
        /** @type {[typeof __VLS_components.InputText, ]} */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
            modelValue: (__VLS_ctx.form.oidc_client_id),
            disabled: (__VLS_ctx.settingLocked('oidc_client_id')),
            placeholder: "projecthub-backend",
            ...{ class: "w-full" },
        }));
        const __VLS_33 = __VLS_32({
            modelValue: (__VLS_ctx.form.oidc_client_id),
            disabled: (__VLS_ctx.settingLocked('oidc_client_id')),
            placeholder: "projecthub-backend",
            ...{ class: "w-full" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-row vertical" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        (__VLS_ctx.t('admin.oidcClientSecret'));
        /** @type {[typeof SourceBadge, ]} */ ;
        // @ts-ignore
        const __VLS_35 = __VLS_asFunctionalComponent(SourceBadge, new SourceBadge({
            source: (__VLS_ctx.settingSource('oidc_client_secret')),
            locked: (__VLS_ctx.settingLocked('oidc_client_secret')),
        }));
        const __VLS_36 = __VLS_35({
            source: (__VLS_ctx.settingSource('oidc_client_secret')),
            locked: (__VLS_ctx.settingLocked('oidc_client_secret')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_35));
        const __VLS_38 = {}.InputText;
        /** @type {[typeof __VLS_components.InputText, ]} */ ;
        // @ts-ignore
        const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
            modelValue: (__VLS_ctx.form.oidc_client_secret),
            type: "password",
            disabled: (__VLS_ctx.settingLocked('oidc_client_secret')),
            placeholder: "••••••••",
            ...{ class: "w-full" },
        }));
        const __VLS_40 = __VLS_39({
            modelValue: (__VLS_ctx.form.oidc_client_secret),
            type: "password",
            disabled: (__VLS_ctx.settingLocked('oidc_client_secret')),
            placeholder: "••••••••",
            ...{ class: "w-full" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_39));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        (__VLS_ctx.t('admin.testConnection'));
        const __VLS_42 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.testResult === null ? __VLS_ctx.t('admin.testOidc') : __VLS_ctx.testResult ? __VLS_ctx.t('admin.testSuccess') : __VLS_ctx.t('admin.testFailed')),
            icon: (__VLS_ctx.testResult === null ? 'pi pi-bolt' : __VLS_ctx.testResult ? 'pi pi-check' : 'pi pi-times'),
            severity: (__VLS_ctx.testResult === null ? 'secondary' : __VLS_ctx.testResult ? 'success' : 'danger'),
            size: "small",
            loading: (__VLS_ctx.testing),
        }));
        const __VLS_44 = __VLS_43({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.testResult === null ? __VLS_ctx.t('admin.testOidc') : __VLS_ctx.testResult ? __VLS_ctx.t('admin.testSuccess') : __VLS_ctx.t('admin.testFailed')),
            icon: (__VLS_ctx.testResult === null ? 'pi pi-bolt' : __VLS_ctx.testResult ? 'pi pi-check' : 'pi pi-times'),
            severity: (__VLS_ctx.testResult === null ? 'secondary' : __VLS_ctx.testResult ? 'success' : 'danger'),
            size: "small",
            loading: (__VLS_ctx.testing),
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
        let __VLS_46;
        let __VLS_47;
        let __VLS_48;
        const __VLS_49 = {
            onClick: (__VLS_ctx.testOidcConnection)
        };
        var __VLS_45;
    }
    if (__VLS_ctx.form.auth_mode === 'oidc') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "settings-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        (__VLS_ctx.t('admin.jitProvisioning'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted" },
        });
        (__VLS_ctx.t('admin.jitDescription'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        (__VLS_ctx.t('admin.autoProvision'));
        /** @type {[typeof SourceBadge, ]} */ ;
        // @ts-ignore
        const __VLS_50 = __VLS_asFunctionalComponent(SourceBadge, new SourceBadge({
            source: (__VLS_ctx.settingSource('oidc_auto_provision')),
            locked: (__VLS_ctx.settingLocked('oidc_auto_provision')),
        }));
        const __VLS_51 = __VLS_50({
            source: (__VLS_ctx.settingSource('oidc_auto_provision')),
            locked: (__VLS_ctx.settingLocked('oidc_auto_provision')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_50));
        const __VLS_53 = {}.ToggleSwitch;
        /** @type {[typeof __VLS_components.ToggleSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
            modelValue: (__VLS_ctx.form.oidc_auto_provision),
            disabled: (__VLS_ctx.settingLocked('oidc_auto_provision')),
        }));
        const __VLS_55 = __VLS_54({
            modelValue: (__VLS_ctx.form.oidc_auto_provision),
            disabled: (__VLS_ctx.settingLocked('oidc_auto_provision')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_54));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-row vertical" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        (__VLS_ctx.t('admin.allowedDomains'));
        /** @type {[typeof SourceBadge, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(SourceBadge, new SourceBadge({
            source: (__VLS_ctx.settingSource('oidc_allowed_domains')),
            locked: (__VLS_ctx.settingLocked('oidc_allowed_domains')),
        }));
        const __VLS_58 = __VLS_57({
            source: (__VLS_ctx.settingSource('oidc_allowed_domains')),
            locked: (__VLS_ctx.settingLocked('oidc_allowed_domains')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "domain-input-wrapper" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "domain-tags" },
        });
        for (const [domain] of __VLS_getVForSourceType((__VLS_ctx.form.oidc_allowed_domains))) {
            const __VLS_60 = {}.Chip;
            /** @type {[typeof __VLS_components.Chip, ]} */ ;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
                ...{ 'onRemove': {} },
                key: (domain),
                label: (domain),
                removable: true,
            }));
            const __VLS_62 = __VLS_61({
                ...{ 'onRemove': {} },
                key: (domain),
                label: (domain),
                removable: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_61));
            let __VLS_64;
            let __VLS_65;
            let __VLS_66;
            const __VLS_67 = {
                onRemove: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.form.auth_mode === 'oidc'))
                        return;
                    __VLS_ctx.removeDomain(domain);
                }
            };
            var __VLS_63;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "domain-add-row" },
        });
        const __VLS_68 = {}.InputText;
        /** @type {[typeof __VLS_components.InputText, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            ...{ 'onKeyup': {} },
            modelValue: (__VLS_ctx.newDomain),
            placeholder: (__VLS_ctx.t('admin.addDomainPlaceholder')),
            size: "small",
            disabled: (__VLS_ctx.settingLocked('oidc_allowed_domains')),
        }));
        const __VLS_70 = __VLS_69({
            ...{ 'onKeyup': {} },
            modelValue: (__VLS_ctx.newDomain),
            placeholder: (__VLS_ctx.t('admin.addDomainPlaceholder')),
            size: "small",
            disabled: (__VLS_ctx.settingLocked('oidc_allowed_domains')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        let __VLS_72;
        let __VLS_73;
        let __VLS_74;
        const __VLS_75 = {
            onKeyup: (__VLS_ctx.addDomain)
        };
        var __VLS_71;
        const __VLS_76 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            ...{ 'onClick': {} },
            icon: "pi pi-plus",
            size: "small",
            severity: "secondary",
            disabled: (!__VLS_ctx.newDomain.trim() || __VLS_ctx.settingLocked('oidc_allowed_domains')),
        }));
        const __VLS_78 = __VLS_77({
            ...{ 'onClick': {} },
            icon: "pi pi-plus",
            size: "small",
            severity: "secondary",
            disabled: (!__VLS_ctx.newDomain.trim() || __VLS_ctx.settingLocked('oidc_allowed_domains')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        let __VLS_80;
        let __VLS_81;
        let __VLS_82;
        const __VLS_83 = {
            onClick: (__VLS_ctx.addDomain)
        };
        var __VLS_79;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-row vertical" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        (__VLS_ctx.t('admin.defaultOrg'));
        /** @type {[typeof SourceBadge, ]} */ ;
        // @ts-ignore
        const __VLS_84 = __VLS_asFunctionalComponent(SourceBadge, new SourceBadge({
            source: (__VLS_ctx.settingSource('oidc_default_org_id')),
            locked: (__VLS_ctx.settingLocked('oidc_default_org_id')),
        }));
        const __VLS_85 = __VLS_84({
            source: (__VLS_ctx.settingSource('oidc_default_org_id')),
            locked: (__VLS_ctx.settingLocked('oidc_default_org_id')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_84));
        const __VLS_87 = {}.Select;
        /** @type {[typeof __VLS_components.Select, ]} */ ;
        // @ts-ignore
        const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
            modelValue: (__VLS_ctx.form.oidc_default_org_id),
            options: (__VLS_ctx.orgOptions),
            optionLabel: "label",
            optionValue: "value",
            placeholder: (__VLS_ctx.t('admin.noDefaultOrg')),
            showClear: true,
            disabled: (__VLS_ctx.settingLocked('oidc_default_org_id')),
            ...{ class: "w-full" },
        }));
        const __VLS_89 = __VLS_88({
            modelValue: (__VLS_ctx.form.oidc_default_org_id),
            options: (__VLS_ctx.orgOptions),
            optionLabel: "label",
            optionValue: "value",
            placeholder: (__VLS_ctx.t('admin.noDefaultOrg')),
            showClear: true,
            disabled: (__VLS_ctx.settingLocked('oidc_default_org_id')),
            ...{ class: "w-full" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_88));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-row vertical" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "setting-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        (__VLS_ctx.t('admin.adminClaim'));
        /** @type {[typeof SourceBadge, ]} */ ;
        // @ts-ignore
        const __VLS_91 = __VLS_asFunctionalComponent(SourceBadge, new SourceBadge({
            source: (__VLS_ctx.settingSource('oidc_admin_claim')),
            locked: (__VLS_ctx.settingLocked('oidc_admin_claim')),
        }));
        const __VLS_92 = __VLS_91({
            source: (__VLS_ctx.settingSource('oidc_admin_claim')),
            locked: (__VLS_ctx.settingLocked('oidc_admin_claim')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_91));
        const __VLS_94 = {}.InputText;
        /** @type {[typeof __VLS_components.InputText, ]} */ ;
        // @ts-ignore
        const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
            modelValue: (__VLS_ctx.form.oidc_admin_claim),
            disabled: (__VLS_ctx.settingLocked('oidc_admin_claim')),
            placeholder: "projecthub-admin",
            ...{ class: "w-full" },
        }));
        const __VLS_96 = __VLS_95({
            modelValue: (__VLS_ctx.form.oidc_admin_claim),
            disabled: (__VLS_ctx.settingLocked('oidc_admin_claim')),
            placeholder: "projecthub-admin",
            ...{ class: "w-full" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_95));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "save-bar" },
    });
    const __VLS_98 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.save')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_100 = __VLS_99({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.save')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_99));
    let __VLS_102;
    let __VLS_103;
    let __VLS_104;
    const __VLS_105 = {
        onClick: (__VLS_ctx.saveSettings)
    };
    var __VLS_101;
}
/** @type {__VLS_StyleScopedClasses['admin-page']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-settings-content']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-select']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['domain-input-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['domain-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['domain-add-row']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-info']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['save-bar']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            InputText: InputText,
            Select: Select,
            ToggleSwitch: ToggleSwitch,
            Chip: Chip,
            ProgressSpinner: ProgressSpinner,
            AdminSubNav: AdminSubNav,
            SourceBadge: SourceBadge,
            t: t,
            loading: loading,
            saving: saving,
            testing: testing,
            testResult: testResult,
            newDomain: newDomain,
            form: form,
            authModeOptions: authModeOptions,
            orgOptions: orgOptions,
            settingSource: settingSource,
            settingLocked: settingLocked,
            removeDomain: removeDomain,
            addDomain: addDomain,
            saveSettings: saveSettings,
            testOidcConnection: testOidcConnection,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
