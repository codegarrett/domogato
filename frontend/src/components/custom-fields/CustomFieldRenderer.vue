<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Checkbox from 'primevue/checkbox'
import type { CustomFieldDefinition } from '@/api/custom-fields'

const props = defineProps<{
  definition: CustomFieldDefinition
  modelValue: unknown
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

const fieldId = computed(() => `cf-${props.definition.id}`)

const localValue = ref<unknown>(props.modelValue)

watch(() => props.modelValue, (v) => {
  localValue.value = v
})

function onUpdate(val: unknown) {
  localValue.value = val
  emit('update:modelValue', val)
}

const selectOptions = computed(() =>
  props.definition.options.map((o) => ({
    label: o.label,
    value: o.id,
  }))
)

const dateValue = computed({
  get() {
    if (!localValue.value || typeof localValue.value !== 'string') return null
    return new Date(localValue.value + 'T00:00:00')
  },
  set(val: Date | null) {
    if (!val) {
      onUpdate(null)
      return
    }
    const yyyy = val.getFullYear()
    const mm = String(val.getMonth() + 1).padStart(2, '0')
    const dd = String(val.getDate()).padStart(2, '0')
    onUpdate(`${yyyy}-${mm}-${dd}`)
  },
})

const checkboxValue = computed({
  get() {
    return localValue.value === true
  },
  set(val: boolean) {
    onUpdate(val)
  },
})
</script>

<template>
  <div class="custom-field-renderer">
    <template v-if="definition.field_type === 'text'">
      <label :for="fieldId" class="text-sm font-medium block mb-1">{{ definition.name }}</label>
      <InputText
        :id="fieldId"
        :modelValue="(localValue as string) ?? ''"
        @update:modelValue="onUpdate"
        :disabled="disabled"
        class="w-full"
      />
    </template>

    <template v-else-if="definition.field_type === 'number'">
      <label :for="fieldId" class="text-sm font-medium block mb-1">{{ definition.name }}</label>
      <InputNumber
        :inputId="fieldId"
        :modelValue="(localValue as number) ?? null"
        @update:modelValue="onUpdate"
        :disabled="disabled"
        class="w-full"
        :useGrouping="false"
      />
    </template>

    <template v-else-if="definition.field_type === 'date'">
      <label :for="fieldId" class="text-sm font-medium block mb-1">{{ definition.name }}</label>
      <DatePicker
        :inputId="fieldId"
        v-model="dateValue"
        :disabled="disabled"
        dateFormat="yy-mm-dd"
        class="w-full"
      />
    </template>

    <template v-else-if="definition.field_type === 'select'">
      <label :for="fieldId" class="text-sm font-medium block mb-1">{{ definition.name }}</label>
      <Select
        :inputId="fieldId"
        :modelValue="(localValue as string) ?? null"
        @update:modelValue="onUpdate"
        :options="selectOptions"
        optionLabel="label"
        optionValue="value"
        :disabled="disabled"
        :showClear="!definition.is_required"
        class="w-full"
      />
    </template>

    <template v-else-if="definition.field_type === 'multi_select'">
      <label :for="fieldId" class="text-sm font-medium block mb-1">{{ definition.name }}</label>
      <MultiSelect
        :inputId="fieldId"
        :modelValue="(localValue as string[]) ?? []"
        @update:modelValue="onUpdate"
        :options="selectOptions"
        optionLabel="label"
        optionValue="value"
        :disabled="disabled"
        class="w-full"
      />
    </template>

    <template v-else-if="definition.field_type === 'url'">
      <label :for="fieldId" class="text-sm font-medium block mb-1">{{ definition.name }}</label>
      <InputText
        :id="fieldId"
        :modelValue="(localValue as string) ?? ''"
        @update:modelValue="onUpdate"
        :disabled="disabled"
        class="w-full"
        type="url"
      />
    </template>

    <template v-else-if="definition.field_type === 'checkbox'">
      <div class="flex align-items-center gap-2">
        <Checkbox
          v-model="checkboxValue"
          :disabled="disabled"
          :binary="true"
          :inputId="fieldId"
        />
        <label :for="fieldId" class="text-sm">{{ definition.name }}</label>
      </div>
    </template>

    <template v-else-if="definition.field_type === 'user'">
      <label :for="fieldId" class="text-sm font-medium block mb-1">{{ definition.name }}</label>
      <InputText
        :id="fieldId"
        :modelValue="(localValue as string) ?? ''"
        @update:modelValue="onUpdate"
        :disabled="disabled"
        class="w-full"
      />
    </template>
  </div>
</template>
