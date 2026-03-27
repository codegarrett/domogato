import { computed } from 'vue';
import { useRoute } from 'vue-router';
import WorkflowEditor from '@/components/workflows/WorkflowEditor.vue';
const route = useRoute();
const workflowId = computed(() => route.params.workflowId);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.workflowId) {
    /** @type {[typeof WorkflowEditor, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(WorkflowEditor, new WorkflowEditor({
        workflowId: (__VLS_ctx.workflowId),
    }));
    const __VLS_1 = __VLS_0({
        workflowId: (__VLS_ctx.workflowId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    var __VLS_3 = {};
    var __VLS_2;
}
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            WorkflowEditor: WorkflowEditor,
            workflowId: workflowId,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
