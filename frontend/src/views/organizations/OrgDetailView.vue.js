import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import { getOrganization, listOrgMembers } from '@/api/organizations';
import { listProjects, createProject } from '@/api/projects';
const route = useRoute();
const orgId = route.params.orgId;
const org = ref(null);
const projects = ref([]);
const members = ref([]);
const loadingProjects = ref(false);
const loadingMembers = ref(false);
const showProjectDialog = ref(false);
const creatingProject = ref(false);
const newProject = ref({ name: '', key: '', description: '', visibility: 'private' });
onMounted(async () => {
    org.value = await getOrganization(orgId);
    loadingProjects.value = true;
    loadingMembers.value = true;
    const [projResult, memberResult] = await Promise.all([
        listProjects(orgId),
        listOrgMembers(orgId),
    ]);
    projects.value = projResult.items;
    members.value = memberResult.items;
    loadingProjects.value = false;
    loadingMembers.value = false;
});
async function handleCreateProject() {
    creatingProject.value = true;
    try {
        await createProject(orgId, {
            name: newProject.value.name,
            key: newProject.value.key.toUpperCase(),
            description: newProject.value.description || undefined,
            visibility: newProject.value.visibility,
        });
        showProjectDialog.value = false;
        newProject.value = { name: '', key: '', description: '', visibility: 'private' };
        const result = await listProjects(orgId);
        projects.value = result.items;
    }
    finally {
        creatingProject.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.org) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-between align-items-center mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.org.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-color-secondary" },
    });
    (__VLS_ctx.org.description);
    const __VLS_0 = {}.TabView;
    /** @type {[typeof __VLS_components.TabView, typeof __VLS_components.TabView, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    const __VLS_4 = {}.TabPanel;
    /** @type {[typeof __VLS_components.TabPanel, typeof __VLS_components.TabPanel, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        value: "0",
        header: (__VLS_ctx.$t('orgs.projects')),
    }));
    const __VLS_6 = __VLS_5({
        value: "0",
        header: (__VLS_ctx.$t('orgs.projects')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-between align-items-center mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.$t('orgs.projects'));
    const __VLS_8 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('orgs.newProject')),
        icon: "pi pi-plus",
        size: "small",
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('orgs.newProject')),
        icon: "pi pi-plus",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.org))
                return;
            __VLS_ctx.showProjectDialog = true;
        }
    };
    var __VLS_11;
    const __VLS_16 = {}.DataTable;
    /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        value: (__VLS_ctx.projects),
        loading: (__VLS_ctx.loadingProjects),
        stripedRows: true,
        ...{ class: "p-datatable-sm" },
    }));
    const __VLS_18 = __VLS_17({
        value: (__VLS_ctx.projects),
        loading: (__VLS_ctx.loadingProjects),
        stripedRows: true,
        ...{ class: "p-datatable-sm" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    const __VLS_20 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        field: "key",
        header: (__VLS_ctx.$t('projects.key')),
        ...{ style: {} },
    }));
    const __VLS_22 = __VLS_21({
        field: "key",
        header: (__VLS_ctx.$t('projects.key')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_23.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_23.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_24 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            value: (data.key),
            severity: "info",
        }));
        const __VLS_26 = __VLS_25({
            value: (data.key),
            severity: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    }
    var __VLS_23;
    const __VLS_28 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        field: "name",
        header: (__VLS_ctx.$t('common.name')),
    }));
    const __VLS_30 = __VLS_29({
        field: "name",
        header: (__VLS_ctx.$t('common.name')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_31.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_31.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_32 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            to: (`/projects/${data.id}`),
            ...{ class: "font-semibold" },
        }));
        const __VLS_34 = __VLS_33({
            to: (`/projects/${data.id}`),
            ...{ class: "font-semibold" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_35.slots.default;
        (data.name);
        var __VLS_35;
    }
    var __VLS_31;
    const __VLS_36 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        field: "visibility",
        header: (__VLS_ctx.$t('common.visibility')),
    }));
    const __VLS_38 = __VLS_37({
        field: "visibility",
        header: (__VLS_ctx.$t('common.visibility')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_39.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_40 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            value: (data.visibility),
            severity: (data.visibility === 'private' ? 'danger' : 'success'),
        }));
        const __VLS_42 = __VLS_41({
            value: (data.visibility),
            severity: (data.visibility === 'private' ? 'danger' : 'success'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    }
    var __VLS_39;
    const __VLS_44 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        field: "created_at",
        header: (__VLS_ctx.$t('common.created')),
    }));
    const __VLS_46 = __VLS_45({
        field: "created_at",
        header: (__VLS_ctx.$t('common.created')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_47.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_47.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        (new Date(data.created_at).toLocaleDateString());
    }
    var __VLS_47;
    var __VLS_19;
    var __VLS_7;
    const __VLS_48 = {}.TabPanel;
    /** @type {[typeof __VLS_components.TabPanel, typeof __VLS_components.TabPanel, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        value: "1",
        header: (__VLS_ctx.$t('orgs.members')),
    }));
    const __VLS_50 = __VLS_49({
        value: "1",
        header: (__VLS_ctx.$t('orgs.members')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    const __VLS_52 = {}.DataTable;
    /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        value: (__VLS_ctx.members),
        loading: (__VLS_ctx.loadingMembers),
        stripedRows: true,
        ...{ class: "p-datatable-sm" },
    }));
    const __VLS_54 = __VLS_53({
        value: (__VLS_ctx.members),
        loading: (__VLS_ctx.loadingMembers),
        stripedRows: true,
        ...{ class: "p-datatable-sm" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    const __VLS_56 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        field: "display_name",
        header: (__VLS_ctx.$t('common.name')),
    }));
    const __VLS_58 = __VLS_57({
        field: "display_name",
        header: (__VLS_ctx.$t('common.name')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    const __VLS_60 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        field: "email",
        header: (__VLS_ctx.$t('common.email')),
    }));
    const __VLS_62 = __VLS_61({
        field: "email",
        header: (__VLS_ctx.$t('common.email')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    const __VLS_64 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        field: "role",
        header: (__VLS_ctx.$t('common.role')),
    }));
    const __VLS_66 = __VLS_65({
        field: "role",
        header: (__VLS_ctx.$t('common.role')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_67.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_67.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_68 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            value: (data.role),
        }));
        const __VLS_70 = __VLS_69({
            value: (data.role),
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    }
    var __VLS_67;
    var __VLS_55;
    var __VLS_51;
    var __VLS_3;
    const __VLS_72 = {}.Dialog;
    /** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        visible: (__VLS_ctx.showProjectDialog),
        header: (__VLS_ctx.$t('projects.createProject')),
        modal: true,
        ...{ style: ({ width: '450px' }) },
    }));
    const __VLS_74 = __VLS_73({
        visible: (__VLS_ctx.showProjectDialog),
        header: (__VLS_ctx.$t('projects.createProject')),
        modal: true,
        ...{ style: ({ width: '450px' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3 pt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.$t('projects.projectName'));
    const __VLS_76 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        modelValue: (__VLS_ctx.newProject.name),
    }));
    const __VLS_78 = __VLS_77({
        modelValue: (__VLS_ctx.newProject.name),
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.$t('projects.keyHelp'));
    const __VLS_80 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        modelValue: (__VLS_ctx.newProject.key),
        placeholder: (__VLS_ctx.$t('projects.keyPlaceholder')),
    }));
    const __VLS_82 = __VLS_81({
        modelValue: (__VLS_ctx.newProject.key),
        placeholder: (__VLS_ctx.$t('projects.keyPlaceholder')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.$t('common.description'));
    const __VLS_84 = {}.Textarea;
    /** @type {[typeof __VLS_components.Textarea, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        modelValue: (__VLS_ctx.newProject.description),
        rows: "3",
    }));
    const __VLS_86 = __VLS_85({
        modelValue: (__VLS_ctx.newProject.description),
        rows: "3",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.$t('common.visibility'));
    const __VLS_88 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        modelValue: (__VLS_ctx.newProject.visibility),
        options: (['private', 'internal']),
    }));
    const __VLS_90 = __VLS_89({
        modelValue: (__VLS_ctx.newProject.visibility),
        options: (['private', 'internal']),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    {
        const { footer: __VLS_thisSlot } = __VLS_75.slots;
        const __VLS_92 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            text: true,
        }));
        const __VLS_94 = __VLS_93({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            text: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        let __VLS_96;
        let __VLS_97;
        let __VLS_98;
        const __VLS_99 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.org))
                    return;
                __VLS_ctx.showProjectDialog = false;
            }
        };
        var __VLS_95;
        const __VLS_100 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.create')),
            icon: "pi pi-check",
            loading: (__VLS_ctx.creatingProject),
        }));
        const __VLS_102 = __VLS_101({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.create')),
            icon: "pi pi-check",
            loading: (__VLS_ctx.creatingProject),
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        let __VLS_104;
        let __VLS_105;
        let __VLS_106;
        const __VLS_107 = {
            onClick: (__VLS_ctx.handleCreateProject)
        };
        var __VLS_103;
    }
    var __VLS_75;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner" },
        ...{ style: {} },
    });
}
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-datatable-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['p-datatable-sm']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            DataTable: DataTable,
            Column: Column,
            Tag: Tag,
            TabView: TabView,
            TabPanel: TabPanel,
            Dialog: Dialog,
            InputText: InputText,
            Textarea: Textarea,
            Select: Select,
            org: org,
            projects: projects,
            members: members,
            loadingProjects: loadingProjects,
            loadingMembers: loadingMembers,
            showProjectDialog: showProjectDialog,
            creatingProject: creatingProject,
            newProject: newProject,
            handleCreateProject: handleCreateProject,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
