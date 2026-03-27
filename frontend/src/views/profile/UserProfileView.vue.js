import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import ProgressSpinner from 'primevue/progressspinner';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import AvatarUpload from '@/components/profile/AvatarUpload.vue';
import { useAuthStore } from '@/stores/auth';
import { updateCurrentUser, getAccountUrls } from '@/api/users';
import { getNotificationPreferences, updateNotificationPreferences, } from '@/api/notification-preferences';
import { useToastService } from '@/composables/useToast';
const { t } = useI18n();
const authStore = useAuthStore();
const toast = useToastService();
const user = ref(authStore.currentUser);
const editingName = ref(false);
const editName = ref('');
const savingName = ref(false);
const accountUrls = ref(null);
const notifPrefs = ref([]);
const loadingPrefs = ref(true);
let prefsSaveTimer = null;
const EVENT_LABELS = {
    ticket_assigned: 'Ticket Assigned',
    ticket_commented: 'Ticket Commented',
    ticket_status_changed: 'Status Changed',
    mentioned: 'Mentioned',
    sprint_started: 'Sprint Started',
    sprint_completed: 'Sprint Completed',
    kb_page_updated: 'KB Page Updated',
};
function formatEventCategory(cat) {
    return EVENT_LABELS[cat] || cat.replace(/_/g, ' ');
}
async function loadPrefs() {
    loadingPrefs.value = true;
    try {
        notifPrefs.value = await getNotificationPreferences();
    }
    catch {
        notifPrefs.value = [];
    }
    finally {
        loadingPrefs.value = false;
    }
}
function savePrefs() {
    if (prefsSaveTimer)
        clearTimeout(prefsSaveTimer);
    prefsSaveTimer = setTimeout(async () => {
        try {
            notifPrefs.value = await updateNotificationPreferences(notifPrefs.value);
        }
        catch { /* handled */ }
    }, 500);
}
onMounted(async () => {
    if (!user.value) {
        await authStore.fetchCurrentUser();
        user.value = authStore.currentUser;
    }
    try {
        accountUrls.value = await getAccountUrls();
    }
    catch {
        // Keycloak URLs may not be available in dev mode
    }
    await loadPrefs();
});
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
function roleSeverity(role) {
    const map = { owner: 'danger', admin: 'warn', maintainer: 'warn', developer: 'info', member: 'info', viewer: 'secondary', guest: 'secondary' };
    return (map[role] ?? 'secondary');
}
function startEditName() {
    editName.value = user.value?.display_name ?? '';
    editingName.value = true;
}
async function saveName() {
    if (!editName.value.trim())
        return;
    savingName.value = true;
    try {
        await updateCurrentUser({ display_name: editName.value.trim() });
        if (user.value)
            user.value.display_name = editName.value.trim();
        authStore.currentUser = { ...authStore.currentUser, display_name: editName.value.trim() };
        editingName.value = false;
        toast.showSuccess(t('common.success'), t('profile.nameUpdated'));
    }
    catch {
        toast.showError('Error', t('profile.updateFailed'));
    }
    finally {
        savingName.value = false;
    }
}
function onAvatarUpdated(url) {
    if (user.value)
        user.value.avatar_url = url;
    authStore.currentUser = { ...authStore.currentUser, avatar_url: url };
}
function openKeycloak(section) {
    if (!accountUrls.value) {
        toast.showError('Error', t('profile.keycloakUnavailable'));
        return;
    }
    const urlMap = {
        security: accountUrls.value.security_url,
        password: accountUrls.value.password_url,
        sessions: accountUrls.value.sessions_url,
    };
    window.open(urlMap[section], '_blank');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['editable']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['editable']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['membership-name']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-header']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-row']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-row']} */ ;
/** @type {__VLS_StyleScopedClasses['pref-select']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
(__VLS_ctx.t('profile.title'));
if (!__VLS_ctx.user) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center py-6" },
    });
    const __VLS_0 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "card-heading" },
    });
    (__VLS_ctx.t('profile.avatar'));
    /** @type {[typeof AvatarUpload, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(AvatarUpload, new AvatarUpload({
        ...{ 'onUpdated': {} },
        currentUrl: (__VLS_ctx.user.avatar_url),
        initials: (__VLS_ctx.user.display_name?.charAt(0)?.toUpperCase() ?? '?'),
    }));
    const __VLS_5 = __VLS_4({
        ...{ 'onUpdated': {} },
        currentUrl: (__VLS_ctx.user.avatar_url),
        initials: (__VLS_ctx.user.display_name?.charAt(0)?.toUpperCase() ?? '?'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
    let __VLS_7;
    let __VLS_8;
    let __VLS_9;
    const __VLS_10 = {
        onUpdated: (__VLS_ctx.onAvatarUpdated)
    };
    var __VLS_6;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "card-heading" },
    });
    (__VLS_ctx.t('profile.accountInfo'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.t('profile.displayName'));
    if (!__VLS_ctx.editingName) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.startEditName) },
            ...{ class: "info-value editable" },
        });
        (__VLS_ctx.user.display_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-pencil edit-icon" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "edit-row" },
        });
        const __VLS_11 = {}.InputText;
        /** @type {[typeof __VLS_components.InputText, ]} */ ;
        // @ts-ignore
        const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
            ...{ 'onKeyup': {} },
            modelValue: (__VLS_ctx.editName),
            size: "small",
            ...{ class: "flex-1" },
        }));
        const __VLS_13 = __VLS_12({
            ...{ 'onKeyup': {} },
            modelValue: (__VLS_ctx.editName),
            size: "small",
            ...{ class: "flex-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_12));
        let __VLS_15;
        let __VLS_16;
        let __VLS_17;
        const __VLS_18 = {
            onKeyup: (__VLS_ctx.saveName)
        };
        var __VLS_14;
        const __VLS_19 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
            ...{ 'onClick': {} },
            icon: "pi pi-check",
            size: "small",
            text: true,
            loading: (__VLS_ctx.savingName),
        }));
        const __VLS_21 = __VLS_20({
            ...{ 'onClick': {} },
            icon: "pi pi-check",
            size: "small",
            text: true,
            loading: (__VLS_ctx.savingName),
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        let __VLS_23;
        let __VLS_24;
        let __VLS_25;
        const __VLS_26 = {
            onClick: (__VLS_ctx.saveName)
        };
        var __VLS_22;
        const __VLS_27 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
            ...{ 'onClick': {} },
            icon: "pi pi-times",
            size: "small",
            text: true,
            severity: "secondary",
        }));
        const __VLS_29 = __VLS_28({
            ...{ 'onClick': {} },
            icon: "pi pi-times",
            size: "small",
            text: true,
            severity: "secondary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        let __VLS_31;
        let __VLS_32;
        let __VLS_33;
        const __VLS_34 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.user))
                    return;
                if (!!(!__VLS_ctx.editingName))
                    return;
                __VLS_ctx.editingName = false;
            }
        };
        var __VLS_30;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.t('common.email'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    (__VLS_ctx.user.email);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.t('profile.memberSince'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    (__VLS_ctx.formatDate(__VLS_ctx.user.created_at));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.t('profile.lastLogin'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    (__VLS_ctx.user.last_login_at ? __VLS_ctx.formatDate(__VLS_ctx.user.last_login_at) : '—');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.t('common.role'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-value" },
    });
    if (__VLS_ctx.user.is_system_admin) {
        const __VLS_35 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
            value: "System Admin",
            severity: "warn",
        }));
        const __VLS_37 = __VLS_36({
            value: "System Admin",
            severity: "warn",
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    }
    else {
        const __VLS_39 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
            value: "User",
            severity: "info",
        }));
        const __VLS_41 = __VLS_40({
            value: "User",
            severity: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "card-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-shield" },
    });
    (__VLS_ctx.t('profile.security'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-color-secondary mb-3" },
    });
    (__VLS_ctx.t('profile.securityDescription'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "security-actions" },
    });
    const __VLS_43 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('profile.manageSecurity')),
        icon: "pi pi-external-link",
        size: "small",
        outlined: true,
    }));
    const __VLS_45 = __VLS_44({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('profile.manageSecurity')),
        icon: "pi pi-external-link",
        size: "small",
        outlined: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    let __VLS_47;
    let __VLS_48;
    let __VLS_49;
    const __VLS_50 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.user))
                return;
            __VLS_ctx.openKeycloak('security');
        }
    };
    var __VLS_46;
    const __VLS_51 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('profile.changePassword')),
        icon: "pi pi-key",
        size: "small",
        outlined: true,
    }));
    const __VLS_53 = __VLS_52({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('profile.changePassword')),
        icon: "pi pi-key",
        size: "small",
        outlined: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    let __VLS_55;
    let __VLS_56;
    let __VLS_57;
    const __VLS_58 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.user))
                return;
            __VLS_ctx.openKeycloak('password');
        }
    };
    var __VLS_54;
    const __VLS_59 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('profile.activeSessions')),
        icon: "pi pi-desktop",
        size: "small",
        outlined: true,
    }));
    const __VLS_61 = __VLS_60({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('profile.activeSessions')),
        icon: "pi pi-desktop",
        size: "small",
        outlined: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    let __VLS_63;
    let __VLS_64;
    let __VLS_65;
    const __VLS_66 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.user))
                return;
            __VLS_ctx.openKeycloak('sessions');
        }
    };
    var __VLS_62;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "card-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-bell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-color-secondary mb-3" },
    });
    if (__VLS_ctx.loadingPrefs) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-center py-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-spin pi-spinner" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "notif-pref-table" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "notif-pref-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "notif-pref-event" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "notif-pref-toggle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "notif-pref-toggle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "notif-pref-delivery" },
        });
        for (const [pref] of __VLS_getVForSourceType((__VLS_ctx.notifPrefs))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (pref.event_category),
                ...{ class: "notif-pref-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "notif-pref-event" },
            });
            (__VLS_ctx.formatEventCategory(pref.event_category));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "notif-pref-toggle" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (__VLS_ctx.savePrefs) },
                type: "checkbox",
            });
            (pref.in_app);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "notif-pref-toggle" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (__VLS_ctx.savePrefs) },
                type: "checkbox",
            });
            (pref.email);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "notif-pref-delivery" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                ...{ onChange: (__VLS_ctx.savePrefs) },
                value: (pref.email_delivery),
                disabled: (!pref.email),
                ...{ class: "pref-select" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "digest",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "instant",
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "card-heading" },
    });
    (__VLS_ctx.t('profile.memberships'));
    if (__VLS_ctx.user.org_memberships?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: "sub-heading" },
        });
        (__VLS_ctx.t('nav.organizations'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "membership-list" },
        });
        for (const [m] of __VLS_getVForSourceType((__VLS_ctx.user.org_memberships))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (m.id),
                ...{ class: "membership-item" },
            });
            const __VLS_67 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
            // @ts-ignore
            const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
                to: (`/organizations/${m.organization_id}`),
                ...{ class: "membership-name" },
            }));
            const __VLS_69 = __VLS_68({
                to: (`/organizations/${m.organization_id}`),
                ...{ class: "membership-name" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_68));
            __VLS_70.slots.default;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-building" },
            });
            (m.organization_name);
            var __VLS_70;
            const __VLS_71 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
                value: (m.role),
                severity: (__VLS_ctx.roleSeverity(m.role)),
                size: "small",
            }));
            const __VLS_73 = __VLS_72({
                value: (m.role),
                severity: (__VLS_ctx.roleSeverity(m.role)),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_72));
        }
    }
    if (__VLS_ctx.user.project_memberships?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: "sub-heading" },
        });
        (__VLS_ctx.t('nav.projects'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "membership-list" },
        });
        for (const [m] of __VLS_getVForSourceType((__VLS_ctx.user.project_memberships))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (m.id),
                ...{ class: "membership-item" },
            });
            const __VLS_75 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
            // @ts-ignore
            const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
                to: (`/projects/${m.project_id}`),
                ...{ class: "membership-name" },
            }));
            const __VLS_77 = __VLS_76({
                to: (`/projects/${m.project_id}`),
                ...{ class: "membership-name" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_76));
            __VLS_78.slots.default;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-folder" },
            });
            (m.project_name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "membership-key" },
            });
            (m.project_key);
            var __VLS_78;
            const __VLS_79 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
                value: (m.role),
                severity: (__VLS_ctx.roleSeverity(m.role)),
                size: "small",
            }));
            const __VLS_81 = __VLS_80({
                value: (m.role),
                severity: (__VLS_ctx.roleSeverity(m.role)),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_80));
        }
    }
    if (!__VLS_ctx.user.org_memberships?.length && !__VLS_ctx.user.project_memberships?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-sm text-color-secondary" },
        });
        (__VLS_ctx.t('profile.noMemberships'));
    }
}
/** @type {__VLS_StyleScopedClasses['profile-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['info-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['editable']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-pencil']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['edit-row']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-value']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-shield']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['security-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-bell']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-table']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-header']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-event']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-delivery']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-row']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-event']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-pref-delivery']} */ ;
/** @type {__VLS_StyleScopedClasses['pref-select']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['membership-list']} */ ;
/** @type {__VLS_StyleScopedClasses['membership-item']} */ ;
/** @type {__VLS_StyleScopedClasses['membership-name']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-building']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['membership-list']} */ ;
/** @type {__VLS_StyleScopedClasses['membership-item']} */ ;
/** @type {__VLS_StyleScopedClasses['membership-name']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-folder']} */ ;
/** @type {__VLS_StyleScopedClasses['membership-key']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ProgressSpinner: ProgressSpinner,
            InputText: InputText,
            Button: Button,
            Tag: Tag,
            AvatarUpload: AvatarUpload,
            t: t,
            user: user,
            editingName: editingName,
            editName: editName,
            savingName: savingName,
            notifPrefs: notifPrefs,
            loadingPrefs: loadingPrefs,
            formatEventCategory: formatEventCategory,
            savePrefs: savePrefs,
            formatDate: formatDate,
            roleSeverity: roleSeverity,
            startEditName: startEditName,
            saveName: saveName,
            onAvatarUpdated: onAvatarUpdated,
            openKeycloak: openKeycloak,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
