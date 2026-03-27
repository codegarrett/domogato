import { ref, nextTick, onMounted } from 'vue';
import Button from 'primevue/button';
const props = defineProps();
const emit = defineEmits();
const text = ref('');
const textareaRef = ref();
function send() {
    if (!text.value.trim() || props.disabled)
        return;
    emit('send', text.value);
    text.value = '';
    nextTick(autoResize);
}
function handleKeydown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        send();
    }
}
function autoResize() {
    const el = textareaRef.value;
    if (!el)
        return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
onMounted(autoResize);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['chat-input-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input-textarea']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-input" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
    ...{ onKeydown: (__VLS_ctx.handleKeydown) },
    ...{ onInput: (__VLS_ctx.autoResize) },
    ref: "textareaRef",
    value: (__VLS_ctx.text),
    placeholder: (__VLS_ctx.$t('ai.typeMessage')),
    disabled: (__VLS_ctx.disabled),
    rows: "1",
    ...{ class: "chat-input-textarea" },
});
/** @type {typeof __VLS_ctx.textareaRef} */ ;
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    icon: "pi pi-send",
    disabled: (__VLS_ctx.disabled || !__VLS_ctx.text.trim()),
    size: "small",
    rounded: true,
    ...{ class: "chat-input-send" },
    'aria-label': (__VLS_ctx.$t('ai.send')),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    icon: "pi pi-send",
    disabled: (__VLS_ctx.disabled || !__VLS_ctx.text.trim()),
    size: "small",
    rounded: true,
    ...{ class: "chat-input-send" },
    'aria-label': (__VLS_ctx.$t('ai.send')),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.send)
};
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['chat-input']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input-send']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            text: text,
            textareaRef: textareaRef,
            send: send,
            handleKeydown: handleKeydown,
            autoResize: autoResize,
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
