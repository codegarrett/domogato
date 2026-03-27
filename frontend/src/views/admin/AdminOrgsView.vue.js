import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import AdminSubNav from '@/components/common/AdminSubNav.vue';
import { listOrganizations, createOrganization, listOrgMembers, addOrgMember, updateOrgMemberRole, removeOrgMember, } from '@/api/organizations';
import { useToastService } from '@/composables/useToast';
const { t } = useI18n();
const router = useRouter();
const toast = useToastService();
const orgs = ref([]);
const total = ref(0);
const offset = ref(0);
const limit = ref(50);
const loading = ref(false);
const showCreateDialog = ref(false);
const creating = ref(false);
const newOrg = ref({ name: '', slug: '', description: '' });
const showMembersDialog = ref(false);
const selectedOrg = ref(null);
const members = ref([]);
const membersLoading = ref(false);
const newMemberEmail = ref('');
const newMemberRole = ref('member');
const addingMember = ref(false);
const roleOptions = [
    { label: 'Member', value: 'member' },
    { label: 'Admin', value: 'admin' },
    { label: 'Owner', value: 'owner' },
];
onMounted(() => loadOrgs());
async function loadOrgs() {
    loading.value = true;
    try {
        const res = await listOrganizations(offset.value, limit.value);
        orgs.value = res.items;
        total.value = res.total;
    }
    finally {
        loading.value = false;
    }
}
function onPage(event) {
    offset.value = event.first;
    limit.value = event.rows;
    loadOrgs();
}
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function onRowClick(event) {
    router.push(`/organizations/${event.data.id}`);
}
async function onCreate() {
    if (!newOrg.value.name.trim())
        return;
    creating.value = true;
    try {
        await createOrganization({
            name: newOrg.value.name.trim(),
            slug: newOrg.value.slug.trim() || undefined,
            description: newOrg.value.description.trim() || undefined,
        });
        showCreateDialog.value = false;
        newOrg.value = { name: '', slug: '', description: '' };
        toast.showSuccess(t('common.success'), t('admin.orgCreated'));
        await loadOrgs();
    }
    finally {
        creating.value = false;
    }
}
async function openMembersDialog(org) {
    selectedOrg.value = org;
    showMembersDialog.value = true;
    membersLoading.value = true;
    try {
        const res = await listOrgMembers(org.id, 0, 200);
        members.value = res.items;
    }
    finally {
        membersLoading.value = false;
    }
}
async function onAddMember() {
    if (!newMemberEmail.value.trim() || !selectedOrg.value)
        return;
    addingMember.value = true;
    try {
        const added = await addOrgMember(selectedOrg.value.id, { email: newMemberEmail.value.trim(), role: newMemberRole.value });
        members.value.push(added);
        newMemberEmail.value = '';
        toast.showSuccess(t('common.success'), t('admin.memberAdded'));
    }
    finally {
        addingMember.value = false;
    }
}
async function onRoleChange(member, role) {
    if (!selectedOrg.value)
        return;
    try {
        await updateOrgMemberRole(selectedOrg.value.id, member.user_id, role);
        member.role = role;
    }
    catch {
        // handled by interceptor
    }
}
async function onRemoveMember(member) {
    if (!selectedOrg.value)
        return;
    try {
        await removeOrgMember(selectedOrg.value.id, member.user_id);
        members.value = members.value.filter((m) => m.id !== member.id);
        toast.showSuccess(t('common.success'), t('admin.memberRemoved'));
    }
    catch {
        // handled by interceptor
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
(__VLS_ctx.t('admin.orgManagement'));
/** @type {[typeof AdminSubNav, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(AdminSubNav, new AdminSubNav({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-toolbar" },
});
const __VLS_3 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.t('orgs.createOrg')),
    icon: "pi pi-plus",
    size: "small",
}));
const __VLS_5 = __VLS_4({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.t('orgs.createOrg')),
    icon: "pi pi-plus",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
let __VLS_7;
let __VLS_8;
let __VLS_9;
const __VLS_10 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showCreateDialog = true;
    }
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
        ...{ 'onRowClick': {} },
        value: (__VLS_ctx.orgs),
        size: "small",
        ...{ class: "text-sm" },
        rows: (__VLS_ctx.limit),
        lazy: (true),
        totalRecords: (__VLS_ctx.total),
        first: (__VLS_ctx.offset),
        paginator: true,
        rowsPerPageOptions: ([25, 50, 100]),
        rowClass: (() => 'clickable-row'),
    }));
    const __VLS_17 = __VLS_16({
        ...{ 'onPage': {} },
        ...{ 'onRowClick': {} },
        value: (__VLS_ctx.orgs),
        size: "small",
        ...{ class: "text-sm" },
        rows: (__VLS_ctx.limit),
        lazy: (true),
        totalRecords: (__VLS_ctx.total),
        first: (__VLS_ctx.offset),
        paginator: true,
        rowsPerPageOptions: ([25, 50, 100]),
        rowClass: (() => 'clickable-row'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    let __VLS_19;
    let __VLS_20;
    let __VLS_21;
    const __VLS_22 = {
        onPage: (__VLS_ctx.onPage)
    };
    const __VLS_23 = {
        onRowClick: (__VLS_ctx.onRowClick)
    };
    __VLS_18.slots.default;
    const __VLS_24 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        header: (__VLS_ctx.t('common.name')),
        field: "name",
        ...{ style: {} },
    }));
    const __VLS_26 = __VLS_25({
        header: (__VLS_ctx.t('common.name')),
        field: "name",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const __VLS_28 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        header: (__VLS_ctx.t('orgs.slug')),
        field: "slug",
        ...{ style: {} },
    }));
    const __VLS_30 = __VLS_29({
        header: (__VLS_ctx.t('orgs.slug')),
        field: "slug",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_31.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_31.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({
            ...{ class: "slug-code" },
        });
        (data.slug);
    }
    var __VLS_31;
    const __VLS_32 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        header: (__VLS_ctx.t('common.status')),
        ...{ style: {} },
    }));
    const __VLS_34 = __VLS_33({
        header: (__VLS_ctx.t('common.status')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_35.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (data.is_active) {
            const __VLS_36 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                value: (__VLS_ctx.t('common.active')),
                severity: "success",
            }));
            const __VLS_38 = __VLS_37({
                value: (__VLS_ctx.t('common.active')),
                severity: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        }
        else {
            const __VLS_40 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                value: (__VLS_ctx.t('common.inactive')),
                severity: "danger",
            }));
            const __VLS_42 = __VLS_41({
                value: (__VLS_ctx.t('common.inactive')),
                severity: "danger",
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        }
    }
    var __VLS_35;
    const __VLS_44 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        header: (__VLS_ctx.t('common.created')),
        ...{ style: {} },
    }));
    const __VLS_46 = __VLS_45({
        header: (__VLS_ctx.t('common.created')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_47.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_47.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        (__VLS_ctx.formatDate(data.created_at));
    }
    var __VLS_47;
    const __VLS_48 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ style: {} },
    }));
    const __VLS_50 = __VLS_49({
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_51.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_52 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
            ...{ 'onClick': {} },
            icon: "pi pi-users",
            size: "small",
            text: true,
        }));
        const __VLS_54 = __VLS_53({
            ...{ 'onClick': {} },
            icon: "pi pi-users",
            size: "small",
            text: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        let __VLS_56;
        let __VLS_57;
        let __VLS_58;
        const __VLS_59 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                __VLS_ctx.openMembersDialog(data);
            }
        };
        __VLS_asFunctionalDirective(__VLS_directives.vTooltip)(null, { ...__VLS_directiveBindingRestFields, modifiers: { top: true, }, value: (__VLS_ctx.t('admin.manageMembers')) }, null, null);
        var __VLS_55;
    }
    var __VLS_51;
    var __VLS_18;
}
const __VLS_60 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.t('orgs.createOrg')),
    modal: true,
    ...{ style: ({ width: '28rem' }) },
}));
const __VLS_62 = __VLS_61({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.t('orgs.createOrg')),
    modal: true,
    ...{ style: ({ width: '28rem' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.t('common.name'));
const __VLS_64 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.newOrg.name),
    ...{ class: "w-full" },
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.newOrg.name),
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.t('orgs.slug'));
const __VLS_68 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    modelValue: (__VLS_ctx.newOrg.slug),
    ...{ class: "w-full" },
}));
const __VLS_70 = __VLS_69({
    modelValue: (__VLS_ctx.newOrg.slug),
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.t('common.description'));
const __VLS_72 = {}.Textarea;
/** @type {[typeof __VLS_components.Textarea, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    modelValue: (__VLS_ctx.newOrg.description),
    ...{ class: "w-full" },
    rows: "2",
}));
const __VLS_74 = __VLS_73({
    modelValue: (__VLS_ctx.newOrg.description),
    ...{ class: "w-full" },
    rows: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
{
    const { footer: __VLS_thisSlot } = __VLS_63.slots;
    const __VLS_76 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.cancel')),
        text: true,
    }));
    const __VLS_78 = __VLS_77({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.cancel')),
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    let __VLS_80;
    let __VLS_81;
    let __VLS_82;
    const __VLS_83 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCreateDialog = false;
        }
    };
    var __VLS_79;
    const __VLS_84 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.create')),
        loading: (__VLS_ctx.creating),
    }));
    const __VLS_86 = __VLS_85({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.create')),
        loading: (__VLS_ctx.creating),
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    let __VLS_88;
    let __VLS_89;
    let __VLS_90;
    const __VLS_91 = {
        onClick: (__VLS_ctx.onCreate)
    };
    var __VLS_87;
}
var __VLS_63;
const __VLS_92 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    visible: (__VLS_ctx.showMembersDialog),
    header: (__VLS_ctx.selectedOrg?.name + ' — ' + __VLS_ctx.t('orgs.members')),
    modal: true,
    ...{ style: ({ width: '36rem' }) },
}));
const __VLS_94 = __VLS_93({
    visible: (__VLS_ctx.showMembersDialog),
    header: (__VLS_ctx.selectedOrg?.name + ' — ' + __VLS_ctx.t('orgs.members')),
    modal: true,
    ...{ style: ({ width: '36rem' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
if (__VLS_ctx.membersLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center py-4" },
    });
    const __VLS_96 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
    const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3 flex gap-2" },
    });
    const __VLS_100 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        modelValue: (__VLS_ctx.newMemberEmail),
        placeholder: (__VLS_ctx.t('admin.memberEmail')),
        ...{ class: "flex-1" },
        size: "small",
    }));
    const __VLS_102 = __VLS_101({
        modelValue: (__VLS_ctx.newMemberEmail),
        placeholder: (__VLS_ctx.t('admin.memberEmail')),
        ...{ class: "flex-1" },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    const __VLS_104 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        modelValue: (__VLS_ctx.newMemberRole),
        options: (__VLS_ctx.roleOptions),
        optionLabel: "label",
        optionValue: "value",
        size: "small",
        ...{ class: "w-8rem" },
    }));
    const __VLS_106 = __VLS_105({
        modelValue: (__VLS_ctx.newMemberRole),
        options: (__VLS_ctx.roleOptions),
        optionLabel: "label",
        optionValue: "value",
        size: "small",
        ...{ class: "w-8rem" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    const __VLS_108 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onClick': {} },
        icon: "pi pi-plus",
        size: "small",
        loading: (__VLS_ctx.addingMember),
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onClick': {} },
        icon: "pi pi-plus",
        size: "small",
        loading: (__VLS_ctx.addingMember),
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_112;
    let __VLS_113;
    let __VLS_114;
    const __VLS_115 = {
        onClick: (__VLS_ctx.onAddMember)
    };
    var __VLS_111;
    const __VLS_116 = {}.DataTable;
    /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        value: (__VLS_ctx.members),
        size: "small",
        ...{ class: "text-sm" },
    }));
    const __VLS_118 = __VLS_117({
        value: (__VLS_ctx.members),
        size: "small",
        ...{ class: "text-sm" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_119.slots.default;
    const __VLS_120 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        header: (__VLS_ctx.t('common.name')),
        field: "display_name",
    }));
    const __VLS_122 = __VLS_121({
        header: (__VLS_ctx.t('common.name')),
        field: "display_name",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    const __VLS_124 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        header: (__VLS_ctx.t('common.email')),
        field: "email",
    }));
    const __VLS_126 = __VLS_125({
        header: (__VLS_ctx.t('common.email')),
        field: "email",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    const __VLS_128 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        header: (__VLS_ctx.t('common.role')),
        ...{ style: {} },
    }));
    const __VLS_130 = __VLS_129({
        header: (__VLS_ctx.t('common.role')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_131.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_132 = {}.Select;
        /** @type {[typeof __VLS_components.Select, ]} */ ;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
            ...{ 'onChange': {} },
            modelValue: (data.role),
            options: (__VLS_ctx.roleOptions),
            optionLabel: "label",
            optionValue: "value",
            size: "small",
        }));
        const __VLS_134 = __VLS_133({
            ...{ 'onChange': {} },
            modelValue: (data.role),
            options: (__VLS_ctx.roleOptions),
            optionLabel: "label",
            optionValue: "value",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_133));
        let __VLS_136;
        let __VLS_137;
        let __VLS_138;
        const __VLS_139 = {
            onChange: ((e) => __VLS_ctx.onRoleChange(data, e.value))
        };
        var __VLS_135;
    }
    var __VLS_131;
    const __VLS_140 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        ...{ style: {} },
    }));
    const __VLS_142 = __VLS_141({
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_143.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_144 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
            ...{ 'onClick': {} },
            icon: "pi pi-trash",
            size: "small",
            text: true,
            severity: "danger",
        }));
        const __VLS_146 = __VLS_145({
            ...{ 'onClick': {} },
            icon: "pi pi-trash",
            size: "small",
            text: true,
            severity: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_145));
        let __VLS_148;
        let __VLS_149;
        let __VLS_150;
        const __VLS_151 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.membersLoading))
                    return;
                __VLS_ctx.onRemoveMember(data);
            }
        };
        var __VLS_147;
    }
    var __VLS_143;
    var __VLS_119;
}
var __VLS_95;
/** @type {__VLS_StyleScopedClasses['admin-page']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['slug-code']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8rem']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DataTable: DataTable,
            Column: Column,
            InputText: InputText,
            Textarea: Textarea,
            Button: Button,
            Tag: Tag,
            Select: Select,
            Dialog: Dialog,
            ProgressSpinner: ProgressSpinner,
            AdminSubNav: AdminSubNav,
            t: t,
            orgs: orgs,
            total: total,
            offset: offset,
            limit: limit,
            loading: loading,
            showCreateDialog: showCreateDialog,
            creating: creating,
            newOrg: newOrg,
            showMembersDialog: showMembersDialog,
            selectedOrg: selectedOrg,
            members: members,
            membersLoading: membersLoading,
            newMemberEmail: newMemberEmail,
            newMemberRole: newMemberRole,
            addingMember: addingMember,
            roleOptions: roleOptions,
            onPage: onPage,
            formatDate: formatDate,
            onRowClick: onRowClick,
            onCreate: onCreate,
            openMembersDialog: openMembersDialog,
            onAddMember: onAddMember,
            onRoleChange: onRoleChange,
            onRemoveMember: onRemoveMember,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
