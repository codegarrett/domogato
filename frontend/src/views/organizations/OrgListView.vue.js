import { ref, onMounted } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { useOrganizationStore } from '@/stores/organization';
import { useAuthStore } from '@/stores/auth';
import { createOrganization } from '@/api/organizations';
const orgStore = useOrganizationStore();
const authStore = useAuthStore();
const showCreateDialog = ref(false);
const creating = ref(false);
const newOrg = ref({ name: '', description: '' });
onMounted(() => {
    orgStore.fetchOrganizations();
});
async function handleCreate() {
    creating.value = true;
    try {
        await createOrganization({ name: newOrg.value.name, description: newOrg.value.description || undefined });
        showCreateDialog.value = false;
        newOrg.value = { name: '', description: '' };
        await orgStore.fetchOrganizations();
    }
    finally {
        creating.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex justify-content-between align-items-center mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.$t('orgs.title'));
if (__VLS_ctx.authStore.isSystemAdmin) {
    const __VLS_0 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('orgs.createOrg')),
        icon: "pi pi-plus",
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('orgs.createOrg')),
        icon: "pi pi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.authStore.isSystemAdmin))
                return;
            __VLS_ctx.showCreateDialog = true;
        }
    };
    var __VLS_3;
}
const __VLS_8 = {}.DataTable;
/** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    value: (__VLS_ctx.orgStore.organizations),
    loading: (__VLS_ctx.orgStore.loading),
    stripedRows: true,
    ...{ class: "p-datatable-sm" },
}));
const __VLS_10 = __VLS_9({
    value: (__VLS_ctx.orgStore.organizations),
    loading: (__VLS_ctx.orgStore.loading),
    stripedRows: true,
    ...{ class: "p-datatable-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    field: "name",
    header: (__VLS_ctx.$t('common.name')),
}));
const __VLS_14 = __VLS_13({
    field: "name",
    header: (__VLS_ctx.$t('common.name')),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_15.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_16 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        to: (`/organizations/${data.id}`),
        ...{ class: "font-semibold" },
    }));
    const __VLS_18 = __VLS_17({
        to: (`/organizations/${data.id}`),
        ...{ class: "font-semibold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    (data.name);
    var __VLS_19;
}
var __VLS_15;
const __VLS_20 = {}.Column;
/** @type {[typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    field: "slug",
    header: (__VLS_ctx.$t('orgs.slug')),
}));
const __VLS_22 = __VLS_21({
    field: "slug",
    header: (__VLS_ctx.$t('orgs.slug')),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
const __VLS_24 = {}.Column;
/** @type {[typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    field: "description",
    header: (__VLS_ctx.$t('common.description')),
}));
const __VLS_26 = __VLS_25({
    field: "description",
    header: (__VLS_ctx.$t('common.description')),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
const __VLS_28 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    field: "created_at",
    header: (__VLS_ctx.$t('common.created')),
}));
const __VLS_30 = __VLS_29({
    field: "created_at",
    header: (__VLS_ctx.$t('common.created')),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_31.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    (new Date(data.created_at).toLocaleDateString());
}
var __VLS_31;
var __VLS_11;
const __VLS_32 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('orgs.createOrg')),
    modal: true,
    ...{ style: ({ width: '450px' }) },
}));
const __VLS_34 = __VLS_33({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('orgs.createOrg')),
    modal: true,
    ...{ style: ({ width: '450px' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3 pt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "orgName",
});
(__VLS_ctx.$t('common.name'));
const __VLS_36 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    id: "orgName",
    modelValue: (__VLS_ctx.newOrg.name),
}));
const __VLS_38 = __VLS_37({
    id: "orgName",
    modelValue: (__VLS_ctx.newOrg.name),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "orgDesc",
});
(__VLS_ctx.$t('common.description'));
const __VLS_40 = {}.Textarea;
/** @type {[typeof __VLS_components.Textarea, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    id: "orgDesc",
    modelValue: (__VLS_ctx.newOrg.description),
    rows: "3",
}));
const __VLS_42 = __VLS_41({
    id: "orgDesc",
    modelValue: (__VLS_ctx.newOrg.description),
    rows: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
{
    const { footer: __VLS_thisSlot } = __VLS_35.slots;
    const __VLS_44 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        text: true,
    }));
    const __VLS_46 = __VLS_45({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    let __VLS_48;
    let __VLS_49;
    let __VLS_50;
    const __VLS_51 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCreateDialog = false;
        }
    };
    var __VLS_47;
    const __VLS_52 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.creating),
    }));
    const __VLS_54 = __VLS_53({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.creating),
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    let __VLS_56;
    let __VLS_57;
    let __VLS_58;
    const __VLS_59 = {
        onClick: (__VLS_ctx.handleCreate)
    };
    var __VLS_55;
}
var __VLS_35;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['p-datatable-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            DataTable: DataTable,
            Column: Column,
            Dialog: Dialog,
            InputText: InputText,
            Textarea: Textarea,
            orgStore: orgStore,
            authStore: authStore,
            showCreateDialog: showCreateDialog,
            creating: creating,
            newOrg: newOrg,
            handleCreate: handleCreate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
