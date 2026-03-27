import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
const props = withDefaults(defineProps(), {
    options: () => ({}),
});
const mergedOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: { mode: 'index', intersect: false },
    },
    scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true },
    },
    elements: {
        line: { fill: true, tension: 0.3 },
    },
    ...props.options,
}));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    options: () => ({}),
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
const __VLS_0 = {}.Line;
/** @type {[typeof __VLS_components.Line, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    data: (__VLS_ctx.data),
    options: (__VLS_ctx.mergedOptions),
}));
const __VLS_2 = __VLS_1({
    data: (__VLS_ctx.data),
    options: (__VLS_ctx.mergedOptions),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
var __VLS_3;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Line: Line,
            mergedOptions: mergedOptions,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
