import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import AdminSubNav from '@/components/common/AdminSubNav.vue';
import { listUsers, adminUpdateUser } from '@/api/users';
import { useToastService } from '@/composables/useToast';
const { t } = useI18n();
const toast = useToastService();
const users = ref([]);
const total = ref(0);
const offset = ref(0);
const limit = ref(50);
const loading = ref(false);
const searchQuery = ref('');
const showConfirmDialog = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmSeverity = ref('warn');
const confirmLoading = ref(false);
let confirmAction = null;
let searchTimeout = null;
onMounted(() => loadUsers());
async function loadUsers() {
    loading.value = true;
    try {
        const res = await listUsers(offset.value, limit.value, searchQuery.value || undefined);
        users.value = res.items;
        total.value = res.total;
    }
    catch {
        // handled by interceptor
    }
    finally {
        loading.value = false;
    }
}
function debouncedSearch() {
    if (searchTimeout)
        clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        offset.value = 0;
        loadUsers();
    }, 300);
}
function onPage(event) {
    offset.value = event.first;
    limit.value = event.rows;
    loadUsers();
}
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function confirmToggleActive(user) {
    const action = user.is_active ? 'deactivate' : 'activate';
    confirmTitle.value = t(`admin.${action}User`);
    confirmMessage.value = t(`admin.${action}Confirm`, { name: user.display_name });
    confirmSeverity.value = user.is_active ? 'danger' : 'success';
    confirmAction = async () => {
        await adminUpdateUser(user.id, { is_active: !user.is_active });
        user.is_active = !user.is_active;
        toast.showSuccess(t('common.success'), t(`admin.${action}d`));
    };
    showConfirmDialog.value = true;
}
function confirmToggleAdmin(user) {
    const action = user.is_system_admin ? 'revokeAdmin' : 'grantAdmin';
    confirmTitle.value = t(`admin.${action}Title`);
    confirmMessage.value = t(`admin.${action}Confirm`, { name: user.display_name });
    confirmSeverity.value = user.is_system_admin ? 'danger' : 'warn';
    confirmAction = async () => {
        await adminUpdateUser(user.id, { is_system_admin: !user.is_system_admin });
        user.is_system_admin = !user.is_system_admin;
        toast.showSuccess(t('common.success'), t(`admin.${action}Done`));
    };
    showConfirmDialog.value = true;
}
async function executeConfirm() {
    if (!confirmAction)
        return;
    confirmLoading.value = true;
    try {
        await confirmAction();
        showConfirmDialog.value = false;
    }
    catch {
        // handled by interceptor
    }
    finally {
        confirmLoading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
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
(__VLS_ctx.t('admin.userManagement'));
/** @type {[typeof AdminSubNav, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(AdminSubNav, new AdminSubNav({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-toolbar" },
});
const __VLS_3 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: (__VLS_ctx.t('admin.searchUsers')),
    ...{ class: "search-input" },
}));
const __VLS_5 = __VLS_4({
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.searchQuery),
    placeholder: (__VLS_ctx.t('admin.searchUsers')),
    ...{ class: "search-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
let __VLS_7;
let __VLS_8;
let __VLS_9;
const __VLS_10 = {
    onInput: (__VLS_ctx.debouncedSearch)
};
var __VLS_6;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center py-6" },
    });
    const __VLS_11 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({}));
    const __VLS_13 = __VLS_12({}, ...__VLS_functionalComponentArgsRest(__VLS_12));
}
else {
    const __VLS_15 = {}.DataTable;
    /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
        ...{ 'onPage': {} },
        value: (__VLS_ctx.users),
        size: "small",
        ...{ class: "text-sm" },
        rows: (__VLS_ctx.limit),
        lazy: (true),
        totalRecords: (__VLS_ctx.total),
        first: (__VLS_ctx.offset),
        paginator: true,
        rowsPerPageOptions: ([25, 50, 100]),
    }));
    const __VLS_17 = __VLS_16({
        ...{ 'onPage': {} },
        value: (__VLS_ctx.users),
        size: "small",
        ...{ class: "text-sm" },
        rows: (__VLS_ctx.limit),
        lazy: (true),
        totalRecords: (__VLS_ctx.total),
        first: (__VLS_ctx.offset),
        paginator: true,
        rowsPerPageOptions: ([25, 50, 100]),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    let __VLS_19;
    let __VLS_20;
    let __VLS_21;
    const __VLS_22 = {
        onPage: (__VLS_ctx.onPage)
    };
    __VLS_18.slots.default;
    const __VLS_23 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
        ...{ style: {} },
    }));
    const __VLS_25 = __VLS_24({
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    __VLS_26.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_26.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (data.avatar_url) {
            const __VLS_27 = {}.Avatar;
            /** @type {[typeof __VLS_components.Avatar, ]} */ ;
            // @ts-ignore
            const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
                image: (data.avatar_url),
                shape: "circle",
                size: "normal",
            }));
            const __VLS_29 = __VLS_28({
                image: (data.avatar_url),
                shape: "circle",
                size: "normal",
            }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        }
        else {
            const __VLS_31 = {}.Avatar;
            /** @type {[typeof __VLS_components.Avatar, ]} */ ;
            // @ts-ignore
            const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
                label: (data.display_name?.charAt(0)?.toUpperCase() ?? '?'),
                shape: "circle",
                size: "normal",
            }));
            const __VLS_33 = __VLS_32({
                label: (data.display_name?.charAt(0)?.toUpperCase() ?? '?'),
                shape: "circle",
                size: "normal",
            }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        }
    }
    var __VLS_26;
    const __VLS_35 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
        header: (__VLS_ctx.t('profile.displayName')),
        field: "display_name",
        ...{ style: {} },
    }));
    const __VLS_37 = __VLS_36({
        header: (__VLS_ctx.t('profile.displayName')),
        field: "display_name",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    const __VLS_39 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        header: (__VLS_ctx.t('common.email')),
        field: "email",
        ...{ style: {} },
    }));
    const __VLS_41 = __VLS_40({
        header: (__VLS_ctx.t('common.email')),
        field: "email",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    const __VLS_43 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        header: (__VLS_ctx.t('common.role')),
        ...{ style: {} },
    }));
    const __VLS_45 = __VLS_44({
        header: (__VLS_ctx.t('common.role')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    __VLS_46.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_46.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (data.is_system_admin) {
            const __VLS_47 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
                value: "Admin",
                severity: "warn",
            }));
            const __VLS_49 = __VLS_48({
                value: "Admin",
                severity: "warn",
            }, ...__VLS_functionalComponentArgsRest(__VLS_48));
        }
        else {
            const __VLS_51 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
                value: "User",
                severity: "info",
            }));
            const __VLS_53 = __VLS_52({
                value: "User",
                severity: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        }
    }
    var __VLS_46;
    const __VLS_55 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
        header: (__VLS_ctx.t('common.status')),
        ...{ style: {} },
    }));
    const __VLS_57 = __VLS_56({
        header: (__VLS_ctx.t('common.status')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    __VLS_58.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_58.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (data.is_active) {
            const __VLS_59 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
                value: (__VLS_ctx.t('common.active')),
                severity: "success",
            }));
            const __VLS_61 = __VLS_60({
                value: (__VLS_ctx.t('common.active')),
                severity: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_60));
        }
        else {
            const __VLS_63 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
                value: (__VLS_ctx.t('common.inactive')),
                severity: "danger",
            }));
            const __VLS_65 = __VLS_64({
                value: (__VLS_ctx.t('common.inactive')),
                severity: "danger",
            }, ...__VLS_functionalComponentArgsRest(__VLS_64));
        }
    }
    var __VLS_58;
    const __VLS_67 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
        header: (__VLS_ctx.t('profile.lastLogin')),
        ...{ style: {} },
    }));
    const __VLS_69 = __VLS_68({
        header: (__VLS_ctx.t('profile.lastLogin')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_68));
    __VLS_70.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_70.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        (data.last_login_at ? __VLS_ctx.formatDate(data.last_login_at) : '—');
    }
    var __VLS_70;
    const __VLS_71 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
        ...{ style: {} },
    }));
    const __VLS_73 = __VLS_72({
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
    __VLS_74.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_74.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-1" },
        });
        if (data.is_active) {
            const __VLS_75 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
                ...{ 'onClick': {} },
                icon: "pi pi-ban",
                size: "small",
                text: true,
                severity: "danger",
            }));
            const __VLS_77 = __VLS_76({
                ...{ 'onClick': {} },
                icon: "pi pi-ban",
                size: "small",
                text: true,
                severity: "danger",
            }, ...__VLS_functionalComponentArgsRest(__VLS_76));
            let __VLS_79;
            let __VLS_80;
            let __VLS_81;
            const __VLS_82 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(data.is_active))
                        return;
                    __VLS_ctx.confirmToggleActive(data);
                }
            };
            __VLS_asFunctionalDirective(__VLS_directives.vTooltip)(null, { ...__VLS_directiveBindingRestFields, modifiers: { top: true, }, value: (__VLS_ctx.t('admin.deactivate')) }, null, null);
            var __VLS_78;
        }
        else {
            const __VLS_83 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
                ...{ 'onClick': {} },
                icon: "pi pi-check-circle",
                size: "small",
                text: true,
                severity: "success",
            }));
            const __VLS_85 = __VLS_84({
                ...{ 'onClick': {} },
                icon: "pi pi-check-circle",
                size: "small",
                text: true,
                severity: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_84));
            let __VLS_87;
            let __VLS_88;
            let __VLS_89;
            const __VLS_90 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(data.is_active))
                        return;
                    __VLS_ctx.confirmToggleActive(data);
                }
            };
            __VLS_asFunctionalDirective(__VLS_directives.vTooltip)(null, { ...__VLS_directiveBindingRestFields, modifiers: { top: true, }, value: (__VLS_ctx.t('admin.activate')) }, null, null);
            var __VLS_86;
        }
        if (!data.is_system_admin) {
            const __VLS_91 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
                ...{ 'onClick': {} },
                icon: "pi pi-shield",
                size: "small",
                text: true,
                severity: "warn",
            }));
            const __VLS_93 = __VLS_92({
                ...{ 'onClick': {} },
                icon: "pi pi-shield",
                size: "small",
                text: true,
                severity: "warn",
            }, ...__VLS_functionalComponentArgsRest(__VLS_92));
            let __VLS_95;
            let __VLS_96;
            let __VLS_97;
            const __VLS_98 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(!data.is_system_admin))
                        return;
                    __VLS_ctx.confirmToggleAdmin(data);
                }
            };
            __VLS_asFunctionalDirective(__VLS_directives.vTooltip)(null, { ...__VLS_directiveBindingRestFields, modifiers: { top: true, }, value: (__VLS_ctx.t('admin.grantAdmin')) }, null, null);
            var __VLS_94;
        }
        else {
            const __VLS_99 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
                ...{ 'onClick': {} },
                icon: "pi pi-shield",
                size: "small",
                text: true,
                severity: "secondary",
            }));
            const __VLS_101 = __VLS_100({
                ...{ 'onClick': {} },
                icon: "pi pi-shield",
                size: "small",
                text: true,
                severity: "secondary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_100));
            let __VLS_103;
            let __VLS_104;
            let __VLS_105;
            const __VLS_106 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(!data.is_system_admin))
                        return;
                    __VLS_ctx.confirmToggleAdmin(data);
                }
            };
            __VLS_asFunctionalDirective(__VLS_directives.vTooltip)(null, { ...__VLS_directiveBindingRestFields, modifiers: { top: true, }, value: (__VLS_ctx.t('admin.revokeAdmin')) }, null, null);
            var __VLS_102;
        }
    }
    var __VLS_74;
    var __VLS_18;
}
const __VLS_107 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
    visible: (__VLS_ctx.showConfirmDialog),
    header: (__VLS_ctx.confirmTitle),
    modal: true,
    ...{ style: ({ width: '28rem' }) },
}));
const __VLS_109 = __VLS_108({
    visible: (__VLS_ctx.showConfirmDialog),
    header: (__VLS_ctx.confirmTitle),
    modal: true,
    ...{ style: ({ width: '28rem' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_108));
__VLS_110.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm" },
});
(__VLS_ctx.confirmMessage);
{
    const { footer: __VLS_thisSlot } = __VLS_110.slots;
    const __VLS_111 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.cancel')),
        text: true,
    }));
    const __VLS_113 = __VLS_112({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.cancel')),
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_112));
    let __VLS_115;
    let __VLS_116;
    let __VLS_117;
    const __VLS_118 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showConfirmDialog = false;
        }
    };
    var __VLS_114;
    const __VLS_119 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.save')),
        severity: (__VLS_ctx.confirmSeverity),
        loading: (__VLS_ctx.confirmLoading),
    }));
    const __VLS_121 = __VLS_120({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.save')),
        severity: (__VLS_ctx.confirmSeverity),
        loading: (__VLS_ctx.confirmLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_120));
    let __VLS_123;
    let __VLS_124;
    let __VLS_125;
    const __VLS_126 = {
        onClick: (__VLS_ctx.executeConfirm)
    };
    var __VLS_122;
}
var __VLS_110;
/** @type {__VLS_StyleScopedClasses['admin-page']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DataTable: DataTable,
            Column: Column,
            InputText: InputText,
            Button: Button,
            Avatar: Avatar,
            Tag: Tag,
            Dialog: Dialog,
            ProgressSpinner: ProgressSpinner,
            AdminSubNav: AdminSubNav,
            t: t,
            users: users,
            total: total,
            offset: offset,
            limit: limit,
            loading: loading,
            searchQuery: searchQuery,
            showConfirmDialog: showConfirmDialog,
            confirmTitle: confirmTitle,
            confirmMessage: confirmMessage,
            confirmSeverity: confirmSeverity,
            confirmLoading: confirmLoading,
            debouncedSearch: debouncedSearch,
            onPage: onPage,
            formatDate: formatDate,
            confirmToggleActive: confirmToggleActive,
            confirmToggleAdmin: confirmToggleAdmin,
            executeConfirm: executeConfirm,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
