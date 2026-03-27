import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import ProgressBar from 'primevue/progressbar';
import { useToastService } from '@/composables/useToast';
import { listSprints, createSprint, startSprint, completeSprint, deleteSprint, getSprintDetail, } from '@/api/sprints';
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToastService();
const projectId = route.params.projectId;
const sprints = ref([]);
const sprintStats = ref(new Map());
const loading = ref(false);
const showCreateDialog = ref(false);
const saving = ref(false);
const newSprint = ref({ name: '' });
const showCompleteDialog = ref(false);
const completingSprintId = ref(null);
const moveIncompleteTo = ref('backlog');
const activeSprint = computed(() => sprints.value.find((s) => s.status === 'active'));
const planningSprints = computed(() => sprints.value.filter((s) => s.status === 'planning'));
const completedSprints = computed(() => sprints.value.filter((s) => s.status === 'completed'));
async function loadSprints() {
    loading.value = true;
    try {
        const resp = await listSprints(projectId, { limit: 100 });
        sprints.value = resp.items;
        for (const s of resp.items) {
            const stats = await getSprintDetail(s.id);
            sprintStats.value.set(s.id, stats);
        }
    }
    finally {
        loading.value = false;
    }
}
function openCreateDialog() {
    newSprint.value = { name: '' };
    showCreateDialog.value = true;
}
async function onCreate() {
    if (!newSprint.value.name.trim())
        return;
    saving.value = true;
    try {
        await createSprint(projectId, newSprint.value);
        showCreateDialog.value = false;
        toast.showSuccess(t('common.success'), t('sprints.created'));
        await loadSprints();
    }
    finally {
        saving.value = false;
    }
}
async function onStart(sprintId) {
    try {
        await startSprint(sprintId);
        toast.showSuccess(t('common.success'), t('sprints.started'));
        await loadSprints();
    }
    catch {
        // global interceptor
    }
}
function openCompleteDialog(sprintId) {
    completingSprintId.value = sprintId;
    moveIncompleteTo.value = 'backlog';
    showCompleteDialog.value = true;
}
async function onComplete() {
    if (!completingSprintId.value)
        return;
    saving.value = true;
    try {
        await completeSprint(completingSprintId.value, moveIncompleteTo.value);
        showCompleteDialog.value = false;
        toast.showSuccess(t('common.success'), t('sprints.completed'));
        await loadSprints();
    }
    finally {
        saving.value = false;
    }
}
async function onDelete(sprintId) {
    try {
        await deleteSprint(sprintId);
        toast.showSuccess(t('common.success'), t('sprints.deleted'));
        await loadSprints();
    }
    catch {
        // global interceptor
    }
}
function progressPercent(sid) {
    const stats = sprintStats.value.get(sid);
    if (!stats || stats.total_tickets === 0)
        return 0;
    return Math.round((stats.completed_tickets / stats.total_tickets) * 100);
}
function goToBacklog() {
    router.push(`/projects/${projectId}/backlog`);
}
onMounted(loadSprints);
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
(__VLS_ctx.$t('sprints.title'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-2" },
});
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('sprints.backlog')),
    icon: "pi pi-inbox",
    severity: "secondary",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('sprints.backlog')),
    icon: "pi pi-inbox",
    severity: "secondary",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.goToBacklog)
};
var __VLS_3;
const __VLS_8 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('sprints.create')),
    icon: "pi pi-plus",
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('sprints.create')),
    icon: "pi pi-plus",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.openCreateDialog)
};
var __VLS_11;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center p-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner text-4xl text-color-secondary" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-4" },
    });
    if (__VLS_ctx.activeSprint) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "surface-card p-4 border-round shadow-1 border-left-3 border-green-500" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-center justify-content-between mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-center gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "m-0" },
        });
        (__VLS_ctx.activeSprint.name);
        const __VLS_16 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            value: "Active",
            severity: "success",
        }));
        const __VLS_18 = __VLS_17({
            value: "Active",
            severity: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        const __VLS_20 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('sprints.completeSprint')),
            icon: "pi pi-check-circle",
            severity: "success",
            size: "small",
        }));
        const __VLS_22 = __VLS_21({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('sprints.completeSprint')),
            icon: "pi pi-check-circle",
            severity: "success",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        let __VLS_24;
        let __VLS_25;
        let __VLS_26;
        const __VLS_27 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!(__VLS_ctx.activeSprint))
                    return;
                __VLS_ctx.openCompleteDialog(__VLS_ctx.activeSprint.id);
            }
        };
        var __VLS_23;
        if (__VLS_ctx.activeSprint.goal) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-color-secondary text-sm mt-1 mb-2" },
            });
            (__VLS_ctx.activeSprint.goal);
        }
        if (__VLS_ctx.activeSprint.start_date || __VLS_ctx.activeSprint.end_date) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-color-secondary mb-2" },
            });
            (__VLS_ctx.activeSprint.start_date);
            (__VLS_ctx.activeSprint.end_date || '...');
        }
        const __VLS_28 = {}.ProgressBar;
        /** @type {[typeof __VLS_components.ProgressBar, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            value: (__VLS_ctx.progressPercent(__VLS_ctx.activeSprint.id)),
            showValue: (true),
            ...{ class: "mb-2" },
        }));
        const __VLS_30 = __VLS_29({
            value: (__VLS_ctx.progressPercent(__VLS_ctx.activeSprint.id)),
            showValue: (true),
            ...{ class: "mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-4 text-sm text-color-secondary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.$t('sprints.tickets'));
        (__VLS_ctx.sprintStats.get(__VLS_ctx.activeSprint.id)?.completed_tickets ?? 0);
        (__VLS_ctx.sprintStats.get(__VLS_ctx.activeSprint.id)?.total_tickets ?? 0);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.$t('sprints.storyPoints'));
        (__VLS_ctx.sprintStats.get(__VLS_ctx.activeSprint.id)?.completed_story_points ?? 0);
        (__VLS_ctx.sprintStats.get(__VLS_ctx.activeSprint.id)?.total_story_points ?? 0);
    }
    if (__VLS_ctx.planningSprints.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-sm font-semibold text-color-secondary uppercase mb-2" },
        });
        (__VLS_ctx.$t('sprints.planning'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-2" },
        });
        for (const [s] of __VLS_getVForSourceType((__VLS_ctx.planningSprints))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (s.id),
                ...{ class: "surface-card p-3 border-round shadow-1 flex align-items-center justify-content-between" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex align-items-center gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold" },
            });
            (s.name);
            const __VLS_32 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                value: "Planning",
                severity: "info",
            }));
            const __VLS_34 = __VLS_33({
                value: "Planning",
                severity: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
            if (s.goal) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "text-color-secondary text-xs m-0 mt-1" },
                });
                (s.goal);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex gap-2" },
            });
            const __VLS_36 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                ...{ 'onClick': {} },
                icon: "pi pi-play",
                severity: "success",
                size: "small",
                text: true,
                rounded: true,
                disabled: (!!__VLS_ctx.activeSprint),
            }));
            const __VLS_38 = __VLS_37({
                ...{ 'onClick': {} },
                icon: "pi pi-play",
                severity: "success",
                size: "small",
                text: true,
                rounded: true,
                disabled: (!!__VLS_ctx.activeSprint),
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
            let __VLS_40;
            let __VLS_41;
            let __VLS_42;
            const __VLS_43 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.planningSprints.length > 0))
                        return;
                    __VLS_ctx.onStart(s.id);
                }
            };
            __VLS_asFunctionalDirective(__VLS_directives.vTooltip)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.$t('sprints.startSprint')) }, null, null);
            var __VLS_39;
            const __VLS_44 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                ...{ 'onClick': {} },
                icon: "pi pi-trash",
                severity: "danger",
                size: "small",
                text: true,
                rounded: true,
            }));
            const __VLS_46 = __VLS_45({
                ...{ 'onClick': {} },
                icon: "pi pi-trash",
                severity: "danger",
                size: "small",
                text: true,
                rounded: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_45));
            let __VLS_48;
            let __VLS_49;
            let __VLS_50;
            const __VLS_51 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.planningSprints.length > 0))
                        return;
                    __VLS_ctx.onDelete(s.id);
                }
            };
            var __VLS_47;
        }
    }
    if (__VLS_ctx.completedSprints.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-sm font-semibold text-color-secondary uppercase mb-2" },
        });
        (__VLS_ctx.$t('sprints.completedSprints'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-2" },
        });
        for (const [s] of __VLS_getVForSourceType((__VLS_ctx.completedSprints))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (s.id),
                ...{ class: "surface-card p-3 border-round shadow-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex align-items-center justify-content-between" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex align-items-center gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold" },
            });
            (s.name);
            const __VLS_52 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                value: "Completed",
                severity: "secondary",
            }));
            const __VLS_54 = __VLS_53({
                value: "Completed",
                severity: "secondary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_53));
            if (s.velocity !== null) {
                const __VLS_56 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
                    value: (`${s.velocity} pts`),
                    severity: "info",
                    ...{ class: "text-xs" },
                }));
                const __VLS_58 = __VLS_57({
                    value: (`${s.velocity} pts`),
                    severity: "info",
                    ...{ class: "text-xs" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_57));
            }
            if (s.completed_at) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-xs text-color-secondary" },
                });
                (new Date(s.completed_at).toLocaleDateString());
            }
        }
    }
    if (__VLS_ctx.sprints.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center text-color-secondary p-6" },
        });
        (__VLS_ctx.$t('sprints.empty'));
    }
}
const __VLS_60 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('sprints.create')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}));
const __VLS_62 = __VLS_61({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('sprints.create')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('sprints.sprintName'));
const __VLS_64 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.newSprint.name),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('sprints.namePlaceholder')),
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.newSprint.name),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('sprints.namePlaceholder')),
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('sprints.goal'));
const __VLS_68 = {}.Textarea;
/** @type {[typeof __VLS_components.Textarea, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    modelValue: (__VLS_ctx.newSprint.goal),
    ...{ class: "w-full" },
    rows: "2",
}));
const __VLS_70 = __VLS_69({
    modelValue: (__VLS_ctx.newSprint.goal),
    ...{ class: "w-full" },
    rows: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('tickets.startDate'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
    ...{ class: "p-inputtext p-component w-full border-round" },
});
(__VLS_ctx.newSprint.start_date);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-6" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('sprints.endDate'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "date",
    ...{ class: "p-inputtext p-component w-full border-round" },
});
(__VLS_ctx.newSprint.end_date);
{
    const { footer: __VLS_thisSlot } = __VLS_63.slots;
    const __VLS_72 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCreateDialog = false;
        }
    };
    var __VLS_75;
    const __VLS_80 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (__VLS_ctx.onCreate)
    };
    var __VLS_83;
}
var __VLS_63;
const __VLS_88 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    visible: (__VLS_ctx.showCompleteDialog),
    header: (__VLS_ctx.$t('sprints.completeSprint')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}));
const __VLS_90 = __VLS_89({
    visible: (__VLS_ctx.showCompleteDialog),
    header: (__VLS_ctx.$t('sprints.completeSprint')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-color-secondary m-0" },
});
(__VLS_ctx.$t('sprints.completeDescription'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "radio",
    id: "move-backlog",
    value: "backlog",
});
(__VLS_ctx.moveIncompleteTo);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "move-backlog",
    ...{ class: "text-sm" },
});
(__VLS_ctx.$t('sprints.moveToBacklog'));
for (const [s] of __VLS_getVForSourceType((__VLS_ctx.planningSprints))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (s.id),
        ...{ class: "flex align-items-center gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "radio",
        id: (`move-${s.id}`),
        value: (s.id),
    });
    (__VLS_ctx.moveIncompleteTo);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: (`move-${s.id}`),
        ...{ class: "text-sm" },
    });
    (__VLS_ctx.$t('sprints.moveToSprint', { name: s.name }));
}
{
    const { footer: __VLS_thisSlot } = __VLS_91.slots;
    const __VLS_92 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_94 = __VLS_93({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    let __VLS_96;
    let __VLS_97;
    let __VLS_98;
    const __VLS_99 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCompleteDialog = false;
        }
    };
    var __VLS_95;
    const __VLS_100 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('sprints.completeSprint')),
        icon: "pi pi-check-circle",
        severity: "success",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('sprints.completeSprint')),
        icon: "pi pi-check-circle",
        severity: "success",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onClick: (__VLS_ctx.onComplete)
    };
    var __VLS_103;
}
var __VLS_91;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['border-left-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-green-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
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
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext']} */ ;
/** @type {__VLS_StyleScopedClasses['p-component']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext']} */ ;
/** @type {__VLS_StyleScopedClasses['p-component']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            Tag: Tag,
            Dialog: Dialog,
            InputText: InputText,
            Textarea: Textarea,
            ProgressBar: ProgressBar,
            sprints: sprints,
            sprintStats: sprintStats,
            loading: loading,
            showCreateDialog: showCreateDialog,
            saving: saving,
            newSprint: newSprint,
            showCompleteDialog: showCompleteDialog,
            moveIncompleteTo: moveIncompleteTo,
            activeSprint: activeSprint,
            planningSprints: planningSprints,
            completedSprints: completedSprints,
            openCreateDialog: openCreateDialog,
            onCreate: onCreate,
            onStart: onStart,
            openCompleteDialog: openCompleteDialog,
            onComplete: onComplete,
            onDelete: onDelete,
            progressPercent: progressPercent,
            goToBacklog: goToBacklog,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
