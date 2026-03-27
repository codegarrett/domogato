import { computed, ref, watch } from 'vue';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Checkbox from 'primevue/checkbox';
const props = defineProps();
const emit = defineEmits();
const localValue = ref(props.modelValue);
watch(() => props.modelValue, (v) => {
    localValue.value = v;
});
function onUpdate(val) {
    localValue.value = val;
    emit('update:modelValue', val);
}
const selectOptions = computed(() => props.definition.options.map((o) => ({
    label: o.label,
    value: o.id,
})));
const dateValue = computed({
    get() {
        if (!localValue.value || typeof localValue.value !== 'string')
            return null;
        return new Date(localValue.value + 'T00:00:00');
    },
    set(val) {
        if (!val) {
            onUpdate(null);
            return;
        }
        const yyyy = val.getFullYear();
        const mm = String(val.getMonth() + 1).padStart(2, '0');
        const dd = String(val.getDate()).padStart(2, '0');
        onUpdate(`${yyyy}-${mm}-${dd}`);
    },
});
const checkboxValue = computed({
    get() {
        return localValue.value === true;
    },
    set(val) {
        onUpdate(val);
    },
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "custom-field-renderer" },
});
if (__VLS_ctx.definition.field_type === 'text') {
    const __VLS_0 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? ''),
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? ''),
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        'onUpdate:modelValue': (__VLS_ctx.onUpdate)
    };
    var __VLS_3;
}
else if (__VLS_ctx.definition.field_type === 'number') {
    const __VLS_8 = {}.InputNumber;
    /** @type {[typeof __VLS_components.InputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? null),
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
        useGrouping: (false),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? null),
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
        useGrouping: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        'onUpdate:modelValue': (__VLS_ctx.onUpdate)
    };
    var __VLS_11;
}
else if (__VLS_ctx.definition.field_type === 'date') {
    const __VLS_16 = {}.DatePicker;
    /** @type {[typeof __VLS_components.DatePicker, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        modelValue: (__VLS_ctx.dateValue),
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        dateFormat: "yy-mm-dd",
        ...{ class: "w-full" },
    }));
    const __VLS_18 = __VLS_17({
        modelValue: (__VLS_ctx.dateValue),
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        dateFormat: "yy-mm-dd",
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
}
else if (__VLS_ctx.definition.field_type === 'select') {
    const __VLS_20 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? null),
        options: (__VLS_ctx.selectOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        showClear: (!__VLS_ctx.definition.is_required),
        ...{ class: "w-full" },
    }));
    const __VLS_22 = __VLS_21({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? null),
        options: (__VLS_ctx.selectOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        showClear: (!__VLS_ctx.definition.is_required),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    let __VLS_24;
    let __VLS_25;
    let __VLS_26;
    const __VLS_27 = {
        'onUpdate:modelValue': (__VLS_ctx.onUpdate)
    };
    var __VLS_23;
}
else if (__VLS_ctx.definition.field_type === 'multi_select') {
    const __VLS_28 = {}.MultiSelect;
    /** @type {[typeof __VLS_components.MultiSelect, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? []),
        options: (__VLS_ctx.selectOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
    }));
    const __VLS_30 = __VLS_29({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? []),
        options: (__VLS_ctx.selectOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    let __VLS_32;
    let __VLS_33;
    let __VLS_34;
    const __VLS_35 = {
        'onUpdate:modelValue': (__VLS_ctx.onUpdate)
    };
    var __VLS_31;
}
else if (__VLS_ctx.definition.field_type === 'url') {
    const __VLS_36 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? ''),
        placeholder: ('https://...'),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
        type: "url",
    }));
    const __VLS_38 = __VLS_37({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? ''),
        placeholder: ('https://...'),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
        type: "url",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    let __VLS_40;
    let __VLS_41;
    let __VLS_42;
    const __VLS_43 = {
        'onUpdate:modelValue': (__VLS_ctx.onUpdate)
    };
    var __VLS_39;
}
else if (__VLS_ctx.definition.field_type === 'checkbox') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center gap-2" },
    });
    const __VLS_44 = {}.Checkbox;
    /** @type {[typeof __VLS_components.Checkbox, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        modelValue: (__VLS_ctx.checkboxValue),
        disabled: (__VLS_ctx.disabled),
        binary: (true),
        inputId: (`cf-${__VLS_ctx.definition.id}`),
    }));
    const __VLS_46 = __VLS_45({
        modelValue: (__VLS_ctx.checkboxValue),
        disabled: (__VLS_ctx.disabled),
        binary: (true),
        inputId: (`cf-${__VLS_ctx.definition.id}`),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: (`cf-${__VLS_ctx.definition.id}`),
        ...{ class: "text-sm" },
    });
    (__VLS_ctx.definition.name);
}
else if (__VLS_ctx.definition.field_type === 'user') {
    const __VLS_48 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? ''),
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.localValue ?? ''),
        placeholder: (__VLS_ctx.definition.name),
        disabled: (__VLS_ctx.disabled),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        'onUpdate:modelValue': (__VLS_ctx.onUpdate)
    };
    var __VLS_51;
}
/** @type {__VLS_StyleScopedClasses['custom-field-renderer']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            InputText: InputText,
            InputNumber: InputNumber,
            DatePicker: DatePicker,
            Select: Select,
            MultiSelect: MultiSelect,
            Checkbox: Checkbox,
            localValue: localValue,
            onUpdate: onUpdate,
            selectOptions: selectOptions,
            dateValue: dateValue,
            checkboxValue: checkboxValue,
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
