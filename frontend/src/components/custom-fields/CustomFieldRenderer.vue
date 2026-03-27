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
      <InputText
        :modelValue="(localValue as string) ?? ''"
        @update:modelValue="onUpdate"
        :placeholder="definition.name"
        :disabled="disabled"
        class="w-full"
      />
    </template>

    <template v-else-if="definition.field_type === 'number'">
      <InputNumber
        :modelValue="(localValue as number) ?? null"
        @update:modelValue="onUpdate"
        :placeholder="definition.name"
        :disabled="disabled"
        class="w-full"
        :useGrouping="false"
      />
    </template>

    <template v-else-if="definition.field_type === 'date'">
      <DatePicker
        v-model="dateValue"
        :placeholder="definition.name"
        :disabled="disabled"
        dateFormat="yy-mm-dd"
        class="w-full"
      />
    </template>

    <template v-else-if="definition.field_type === 'select'">
      <Select
        :modelValue="(localValue as string) ?? null"
        @update:modelValue="onUpdate"
        :options="selectOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="definition.name"
        :disabled="disabled"
        :showClear="!definition.is_required"
        class="w-full"
      />
    </template>

    <template v-else-if="definition.field_type === 'multi_select'">
      <MultiSelect
        :modelValue="(localValue as string[]) ?? []"
        @update:modelValue="onUpdate"
        :options="selectOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="definition.name"
        :disabled="disabled"
        class="w-full"
      />
    </template>

    <template v-else-if="definition.field_type === 'url'">
      <InputText
        :modelValue="(localValue as string) ?? ''"
        @update:modelValue="onUpdate"
        :placeholder="'https://...'"
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
          :inputId="`cf-${definition.id}`"
        />
        <label :for="`cf-${definition.id}`" class="text-sm">{{ definition.name }}</label>
      </div>
    </template>

    <template v-else-if="definition.field_type === 'user'">
      <InputText
        :modelValue="(localValue as string) ?? ''"
        @update:modelValue="onUpdate"
        :placeholder="definition.name"
        :disabled="disabled"
        class="w-full"
      />
    </template>
  </div>
</template>
