import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { listTicketLinks, createTicketLink, deleteTicketLink, } from '@/api/kb';
import { listTickets } from '@/api/tickets';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
const props = defineProps();
const emit = defineEmits();
const { t } = useI18n();
const links = ref([]);
const loading = ref(false);
const showLinkDialog = ref(false);
const searchTerm = ref('');
const searchResults = ref([]);
const searching = ref(false);
const linking = ref(null);
let searchTimer = null;
async function load() {
    loading.value = true;
    try {
        links.value = await listTicketLinks(props.pageId);
        emit('linkCountChanged', links.value.length);
    }
    finally {
        loading.value = false;
    }
}
onMounted(load);
watch(() => props.pageId, load);
function onSearchInput() {
    if (searchTimer)
        clearTimeout(searchTimer);
    const q = searchTerm.value.trim();
    if (!q) {
        searchResults.value = [];
        return;
    }
    searchTimer = setTimeout(async () => {
        searching.value = true;
        try {
            const result = await listTickets(props.projectId, { search: q, limit: 15 });
            const linkedIds = new Set(links.value.map((l) => l.ticket_id));
            searchResults.value = result.items.filter((t) => !linkedIds.has(t.id));
        }
        catch {
            searchResults.value = [];
        }
        finally {
            searching.value = false;
        }
    }, 300);
}
async function linkTicket(ticket) {
    linking.value = ticket.id;
    try {
        await createTicketLink(props.pageId, { ticket_id: ticket.id });
        searchResults.value = searchResults.value.filter((t) => t.id !== ticket.id);
        await load();
    }
    finally {
        linking.value = null;
    }
}
async function unlinkTicket(link) {
    await deleteTicketLink(props.pageId, link.id);
    await load();
}
function prioritySeverity(p) {
    switch (p) {
        case 'critical': return 'danger';
        case 'high': return 'warn';
        case 'medium': return 'info';
        case 'low': return 'secondary';
        default: return 'secondary';
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "story-ticket-links" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center justify-content-between mb-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-link text-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "text-sm font-semibold" },
});
(__VLS_ctx.t('kb.linkedTickets'));
const __VLS_0 = {}.Tag;
/** @type {[typeof __VLS_components.Tag, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    value: (String(__VLS_ctx.links.length)),
    severity: "secondary",
    rounded: true,
    ...{ class: "text-xs" },
}));
const __VLS_2 = __VLS_1({
    value: (String(__VLS_ctx.links.length)),
    severity: "secondary",
    rounded: true,
    ...{ class: "text-xs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_4 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    icon: "pi pi-plus",
    label: (__VLS_ctx.t('kb.linkTicket')),
    size: "small",
    text: true,
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    icon: "pi pi-plus",
    label: (__VLS_ctx.t('kb.linkTicket')),
    size: "small",
    text: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showLinkDialog = true;
    }
};
var __VLS_7;
if (__VLS_ctx.links.length) {
    const __VLS_12 = {}.DataTable;
    /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        value: (__VLS_ctx.links),
        size: "small",
        ...{ class: "text-sm" },
        rows: (20),
    }));
    const __VLS_14 = __VLS_13({
        value: (__VLS_ctx.links),
        size: "small",
        ...{ class: "text-sm" },
        rows: (20),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    const __VLS_16 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        field: "ticket_key",
        header: (__VLS_ctx.t('tickets.key')),
        ...{ style: {} },
    }));
    const __VLS_18 = __VLS_17({
        field: "ticket_key",
        header: (__VLS_ctx.t('tickets.key')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_19.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-mono text-primary font-semibold" },
        });
        (data.ticket_key);
    }
    var __VLS_19;
    const __VLS_20 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        field: "ticket_title",
        header: (__VLS_ctx.t('tickets.title')),
    }));
    const __VLS_22 = __VLS_21({
        field: "ticket_title",
        header: (__VLS_ctx.t('tickets.title')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    const __VLS_24 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        field: "ticket_priority",
        header: (__VLS_ctx.t('tickets.priority')),
        ...{ style: {} },
    }));
    const __VLS_26 = __VLS_25({
        field: "ticket_priority",
        header: (__VLS_ctx.t('tickets.priority')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_27.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (data.ticket_priority) {
            const __VLS_28 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                value: (data.ticket_priority),
                severity: (__VLS_ctx.prioritySeverity(data.ticket_priority)),
            }));
            const __VLS_30 = __VLS_29({
                value: (data.ticket_priority),
                severity: (__VLS_ctx.prioritySeverity(data.ticket_priority)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        }
    }
    var __VLS_27;
    const __VLS_32 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        field: "ticket_status",
        header: (__VLS_ctx.t('tickets.status')),
        ...{ style: {} },
    }));
    const __VLS_34 = __VLS_33({
        field: "ticket_status",
        header: (__VLS_ctx.t('tickets.status')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_35.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (data.ticket_status) {
            const __VLS_36 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                value: (data.ticket_status),
                ...{ style: (data.ticket_status_color ? { background: data.ticket_status_color, color: '#fff' } : {}) },
            }));
            const __VLS_38 = __VLS_37({
                value: (data.ticket_status),
                ...{ style: (data.ticket_status_color ? { background: data.ticket_status_color, color: '#fff' } : {}) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        }
    }
    var __VLS_35;
    const __VLS_40 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ style: {} },
    }));
    const __VLS_42 = __VLS_41({
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_43.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_44 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            ...{ 'onClick': {} },
            icon: "pi pi-times",
            severity: "danger",
            text: true,
            rounded: true,
            size: "small",
        }));
        const __VLS_46 = __VLS_45({
            ...{ 'onClick': {} },
            icon: "pi pi-times",
            severity: "danger",
            text: true,
            rounded: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        let __VLS_48;
        let __VLS_49;
        let __VLS_50;
        const __VLS_51 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.links.length))
                    return;
                __VLS_ctx.unlinkTicket(data);
            }
        };
        var __VLS_47;
    }
    var __VLS_43;
    var __VLS_15;
}
else if (!__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-color-secondary text-sm py-2" },
    });
    (__VLS_ctx.t('kb.noLinkedTickets'));
}
const __VLS_52 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    visible: (__VLS_ctx.showLinkDialog),
    header: (__VLS_ctx.t('kb.linkTicket')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
}));
const __VLS_54 = __VLS_53({
    visible: (__VLS_ctx.showLinkDialog),
    header: (__VLS_ctx.t('kb.linkTicket')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3" },
});
const __VLS_56 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.searchTerm),
    placeholder: (__VLS_ctx.t('kb.searchTickets')),
    ...{ class: "w-full" },
    autofocus: true,
}));
const __VLS_58 = __VLS_57({
    ...{ 'onInput': {} },
    modelValue: (__VLS_ctx.searchTerm),
    placeholder: (__VLS_ctx.t('kb.searchTickets')),
    ...{ class: "w-full" },
    autofocus: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
let __VLS_60;
let __VLS_61;
let __VLS_62;
const __VLS_63 = {
    onInput: (__VLS_ctx.onSearchInput)
};
var __VLS_59;
if (__VLS_ctx.searching) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner" },
    });
}
else if (__VLS_ctx.searchResults.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-ticket-list" },
    });
    for (const [ticket] of __VLS_getVForSourceType((__VLS_ctx.searchResults))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (ticket.id),
            ...{ class: "flex align-items-center justify-content-between py-2 px-2 border-bottom-1 surface-border hover:surface-50 cursor-pointer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-mono text-primary mr-2 text-sm" },
        });
        (ticket.ticket_number);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-sm" },
        });
        (ticket.title);
        const __VLS_64 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
            ...{ 'onClick': {} },
            icon: "pi pi-plus",
            size: "small",
            text: true,
            loading: (__VLS_ctx.linking === ticket.id),
        }));
        const __VLS_66 = __VLS_65({
            ...{ 'onClick': {} },
            icon: "pi pi-plus",
            size: "small",
            text: true,
            loading: (__VLS_ctx.linking === ticket.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        let __VLS_68;
        let __VLS_69;
        let __VLS_70;
        const __VLS_71 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.searching))
                    return;
                if (!(__VLS_ctx.searchResults.length))
                    return;
                __VLS_ctx.linkTicket(ticket);
            }
        };
        var __VLS_67;
    }
}
else if (__VLS_ctx.searchTerm.trim()) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-color-secondary text-sm py-3 text-center" },
    });
    (__VLS_ctx.t('kb.noResults'));
}
var __VLS_55;
/** @type {__VLS_StyleScopedClasses['story-ticket-links']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-link']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['search-ticket-list']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-bottom-1']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-border']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:surface-50']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
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
            t: t,
            links: links,
            loading: loading,
            showLinkDialog: showLinkDialog,
            searchTerm: searchTerm,
            searchResults: searchResults,
            searching: searching,
            linking: linking,
            onSearchInput: onSearchInput,
            linkTicket: linkTicket,
            unlinkTicket: unlinkTicket,
            prioritySeverity: prioritySeverity,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
