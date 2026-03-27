import { ref, watch, onMounted } from 'vue';
import Select from 'primevue/select';
import { useOrganizationStore } from '@/stores/organization';
const orgStore = useOrganizationStore();
const selectedOrgId = ref(orgStore.currentOrgId);
onMounted(async () => {
    if (orgStore.organizations.length === 0) {
        await orgStore.fetchOrganizations();
    }
    selectedOrgId.value = orgStore.currentOrgId;
});
watch(() => orgStore.currentOrgId, (newId) => {
    selectedOrgId.value = newId;
});
function onOrgChange(event) {
    orgStore.setCurrentOrg(event.value);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.selectedOrgId),
    options: (__VLS_ctx.orgStore.organizations),
    optionLabel: "name",
    optionValue: "id",
    placeholder: (__VLS_ctx.$t('orgs.selectOrg')),
    ...{ class: "org-switcher" },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.selectedOrgId),
    options: (__VLS_ctx.orgStore.organizations),
    optionLabel: "name",
    optionValue: "id",
    placeholder: (__VLS_ctx.$t('orgs.selectOrg')),
    ...{ class: "org-switcher" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onChange: (__VLS_ctx.onOrgChange)
};
var __VLS_8 = {};
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['org-switcher']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Select: Select,
            orgStore: orgStore,
            selectedOrgId: selectedOrgId,
            onOrgChange: onOrgChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
