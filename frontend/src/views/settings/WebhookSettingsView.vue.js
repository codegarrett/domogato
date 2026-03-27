import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { useToastService } from '@/composables/useToast';
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, } from '@/api/webhooks';
const route = useRoute();
const { t } = useI18n();
const toast = useToastService();
const projectId = route.params.projectId;
const webhooks = ref([]);
const loading = ref(false);
const showCreateDialog = ref(false);
const saving = ref(false);
const newWebhook = ref({ name: '', url: '', secret: '', events: [] });
const newEvents = ref('');
async function loadWebhooks() {
    loading.value = true;
    try {
        webhooks.value = await listWebhooks(projectId);
    }
    finally {
        loading.value = false;
    }
}
function openCreateDialog() {
    newWebhook.value = { name: '', url: '', secret: '', events: [] };
    newEvents.value = '';
    showCreateDialog.value = true;
}
async function onCreate() {
    if (!newWebhook.value.name.trim() || !newWebhook.value.url.trim())
        return;
    saving.value = true;
    try {
        const events = newEvents.value
            .split(',')
            .map(e => e.trim())
            .filter(Boolean);
        await createWebhook(projectId, { ...newWebhook.value, events });
        showCreateDialog.value = false;
        toast.showSuccess(t('common.success'), t('webhooks.created'));
        await loadWebhooks();
    }
    finally {
        saving.value = false;
    }
}
async function onToggleActive(wh) {
    try {
        await updateWebhook(wh.id, { is_active: !wh.is_active });
        await loadWebhooks();
    }
    catch { /* global interceptor */ }
}
async function onDelete(wh) {
    try {
        await deleteWebhook(wh.id);
        toast.showSuccess(t('common.success'), t('webhooks.deleted'));
        await loadWebhooks();
    }
    catch { /* global interceptor */ }
}
async function onTest(wh) {
    try {
        await testWebhook(wh.id);
        toast.showSuccess(t('common.success'), t('webhooks.testQueued'));
    }
    catch { /* global interceptor */ }
}
onMounted(loadWebhooks);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center justify-content-between mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "m-0" },
});
(__VLS_ctx.$t('webhooks.title'));
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('webhooks.create')),
    icon: "pi pi-plus",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('webhooks.create')),
    icon: "pi pi-plus",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.openCreateDialog)
};
var __VLS_3;
const __VLS_8 = {}.DataTable;
/** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    value: (__VLS_ctx.webhooks),
    loading: (__VLS_ctx.loading),
    stripedRows: true,
    responsiveLayout: "scroll",
}));
const __VLS_10 = __VLS_9({
    value: (__VLS_ctx.webhooks),
    loading: (__VLS_ctx.loading),
    stripedRows: true,
    responsiveLayout: "scroll",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
{
    const { empty: __VLS_thisSlot } = __VLS_11.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-color-secondary p-4" },
    });
    (__VLS_ctx.$t('webhooks.empty'));
}
const __VLS_12 = {}.Column;
/** @type {[typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    header: (__VLS_ctx.$t('webhooks.name')),
    field: "name",
}));
const __VLS_14 = __VLS_13({
    header: (__VLS_ctx.$t('webhooks.name')),
    field: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const __VLS_16 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    header: (__VLS_ctx.$t('webhooks.url')),
}));
const __VLS_18 = __VLS_17({
    header: (__VLS_ctx.$t('webhooks.url')),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_19.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs font-mono" },
    });
    (data.url);
}
var __VLS_19;
const __VLS_20 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    header: (__VLS_ctx.$t('webhooks.events')),
}));
const __VLS_22 = __VLS_21({
    header: (__VLS_ctx.$t('webhooks.events')),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_23.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (data.events.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-1 flex-wrap" },
        });
        for (const [ev] of __VLS_getVForSourceType((data.events))) {
            const __VLS_24 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                key: (ev),
                value: (ev),
                severity: "info",
                ...{ class: "text-xs" },
            }));
            const __VLS_26 = __VLS_25({
                key: (ev),
                value: (ev),
                severity: "info",
                ...{ class: "text-xs" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-color-secondary text-xs" },
        });
        (__VLS_ctx.$t('webhooks.allEvents'));
    }
}
var __VLS_23;
const __VLS_28 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    header: (__VLS_ctx.$t('common.status')),
    ...{ style: {} },
}));
const __VLS_30 = __VLS_29({
    header: (__VLS_ctx.$t('common.status')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_31.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (data.is_active) {
        const __VLS_32 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            value: (__VLS_ctx.$t('common.active')),
            severity: "success",
        }));
        const __VLS_34 = __VLS_33({
            value: (__VLS_ctx.$t('common.active')),
            severity: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    }
    else {
        const __VLS_36 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            value: (__VLS_ctx.$t('common.inactive')),
            severity: "danger",
        }));
        const __VLS_38 = __VLS_37({
            value: (__VLS_ctx.$t('common.inactive')),
            severity: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    }
}
var __VLS_31;
const __VLS_40 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    header: (__VLS_ctx.$t('common.actions')),
    ...{ style: {} },
}));
const __VLS_42 = __VLS_41({
    header: (__VLS_ctx.$t('common.actions')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_43.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-1" },
    });
    const __VLS_44 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        ...{ 'onClick': {} },
        icon: "pi pi-play",
        severity: "info",
        text: true,
        rounded: true,
        size: "small",
    }));
    const __VLS_46 = __VLS_45({
        ...{ 'onClick': {} },
        icon: "pi pi-play",
        severity: "info",
        text: true,
        rounded: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    let __VLS_48;
    let __VLS_49;
    let __VLS_50;
    const __VLS_51 = {
        onClick: (...[$event]) => {
            __VLS_ctx.onTest(data);
        }
    };
    __VLS_asFunctionalDirective(__VLS_directives.vTooltip)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.$t('webhooks.test')) }, null, null);
    var __VLS_47;
    const __VLS_52 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        ...{ 'onClick': {} },
        icon: (data.is_active ? 'pi pi-pause' : 'pi pi-play'),
        severity: "secondary",
        text: true,
        rounded: true,
        size: "small",
    }));
    const __VLS_54 = __VLS_53({
        ...{ 'onClick': {} },
        icon: (data.is_active ? 'pi pi-pause' : 'pi pi-play'),
        severity: "secondary",
        text: true,
        rounded: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    let __VLS_56;
    let __VLS_57;
    let __VLS_58;
    const __VLS_59 = {
        onClick: (...[$event]) => {
            __VLS_ctx.onToggleActive(data);
        }
    };
    var __VLS_55;
    const __VLS_60 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        ...{ 'onClick': {} },
        icon: "pi pi-trash",
        severity: "danger",
        text: true,
        rounded: true,
        size: "small",
    }));
    const __VLS_62 = __VLS_61({
        ...{ 'onClick': {} },
        icon: "pi pi-trash",
        severity: "danger",
        text: true,
        rounded: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    let __VLS_64;
    let __VLS_65;
    let __VLS_66;
    const __VLS_67 = {
        onClick: (...[$event]) => {
            __VLS_ctx.onDelete(data);
        }
    };
    var __VLS_63;
}
var __VLS_43;
var __VLS_11;
const __VLS_68 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('webhooks.create')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
}));
const __VLS_70 = __VLS_69({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('webhooks.create')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('webhooks.name'));
const __VLS_72 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    modelValue: (__VLS_ctx.newWebhook.name),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('webhooks.namePlaceholder')),
}));
const __VLS_74 = __VLS_73({
    modelValue: (__VLS_ctx.newWebhook.name),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('webhooks.namePlaceholder')),
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('webhooks.url'));
const __VLS_76 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    modelValue: (__VLS_ctx.newWebhook.url),
    ...{ class: "w-full" },
    placeholder: "https://example.com/hooks",
}));
const __VLS_78 = __VLS_77({
    modelValue: (__VLS_ctx.newWebhook.url),
    ...{ class: "w-full" },
    placeholder: "https://example.com/hooks",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('webhooks.secret'));
const __VLS_80 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    modelValue: (__VLS_ctx.newWebhook.secret),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('webhooks.secretPlaceholder')),
    type: "password",
}));
const __VLS_82 = __VLS_81({
    modelValue: (__VLS_ctx.newWebhook.secret),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('webhooks.secretPlaceholder')),
    type: "password",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('webhooks.events'));
const __VLS_84 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    modelValue: (__VLS_ctx.newEvents),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('webhooks.eventsPlaceholder')),
}));
const __VLS_86 = __VLS_85({
    modelValue: (__VLS_ctx.newEvents),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('webhooks.eventsPlaceholder')),
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-color-secondary" },
});
(__VLS_ctx.$t('webhooks.eventsHelp'));
{
    const { footer: __VLS_thisSlot } = __VLS_71.slots;
    const __VLS_88 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_90 = __VLS_89({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    let __VLS_92;
    let __VLS_93;
    let __VLS_94;
    const __VLS_95 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCreateDialog = false;
        }
    };
    var __VLS_91;
    const __VLS_96 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onClick: (__VLS_ctx.onCreate)
    };
    var __VLS_99;
}
var __VLS_71;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
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
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            DataTable: DataTable,
            Column: Column,
            Dialog: Dialog,
            InputText: InputText,
            Tag: Tag,
            webhooks: webhooks,
            loading: loading,
            showCreateDialog: showCreateDialog,
            saving: saving,
            newWebhook: newWebhook,
            newEvents: newEvents,
            openCreateDialog: openCreateDialog,
            onCreate: onCreate,
            onToggleActive: onToggleActive,
            onDelete: onDelete,
            onTest: onTest,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
