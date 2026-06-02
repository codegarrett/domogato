<script setup lang="ts">

import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

import InputNumber from 'primevue/inputnumber'

import { useInlineDropdownAnchor } from '@/composables/useInlineDropdownAnchor'

import './ticket-inline-dropdown.css'



const props = defineProps<{

  editing: boolean

  displayValue: string

  min?: number

  max?: number

}>()



const editValue = defineModel<number | null>('editValue')



const emit = defineEmits<{

  start: []

  commit: []

  cancel: []

}>()



const panelVisible = ref(false)

const inputRef = ref<InstanceType<typeof InputNumber> | null>(null)

let committed = false



const {

  triggerRef,

  panelRef,

  panelStyle,

  placement,

  openPanel,

} = useInlineDropdownAnchor({

  isActive: () => props.editing,

  panelVisible,

  onDismiss: () => {

    if (!committed) emit('cancel')

    committed = false

  },

})



function focusInput() {

  void nextTick(() => {

    const root = inputRef.value as { $el?: HTMLElement } | null

    const elInput = root?.$el?.querySelector?.('input') as HTMLInputElement | null

    elInput?.focus()

    elInput?.select()

  })

}



function onTriggerClick() {

  if (!props.editing) {

    emit('start')

    return

  }

  if (!panelVisible.value) openPanel()

}



function commit() {

  committed = true

  panelVisible.value = false

  emit('commit')

}



function onDocumentKeydown(e: KeyboardEvent) {

  if (!props.editing) return

  if (e.key === 'Escape') {

    e.preventDefault()

    committed = false

    panelVisible.value = false

    emit('cancel')

  }

  if (e.key === 'Enter') {

    e.preventDefault()

    commit()

  }

}



watch(

  () => props.editing,

  (open) => {

    if (open) {

      committed = false

      openPanel()

      focusInput()

      document.addEventListener('keydown', onDocumentKeydown)

    } else {

      panelVisible.value = false

      document.removeEventListener('keydown', onDocumentKeydown)

    }

  },

)



watch(panelVisible, (visible) => {

  if (visible) focusInput()

})



onBeforeUnmount(() => {

  document.removeEventListener('keydown', onDocumentKeydown)

})

</script>



<template>

  <div class="ticket-inline-number-picker">

    <span

      ref="triggerRef"

      class="ticket-inline-number-picker__trigger story-points-value inline-editable"

      :class="{ 'ticket-inline-number-picker__trigger--open': editing }"

      role="button"

      tabindex="0"

      @click.stop="onTriggerClick"

      @keydown.enter.prevent.stop="onTriggerClick"

    >

      {{ displayValue }}

    </span>



    <Teleport to="body">

      <div
        v-if="panelVisible && editing"
        ref="panelRef"
        class="ticket-inline-dropdown-shell"
        :style="panelStyle"
        :data-placement="placement"
        @click.stop
        @mousedown.stop
      >
        <div class="ticket-inline-dropdown-panel ticket-inline-number-picker-panel">
        <div class="ticket-inline-number-picker__input-wrap" @click.stop>

          <InputNumber

            ref="inputRef"

            v-model="editValue"

            :min="min ?? 0"

            :max="max ?? 999"

            :show-buttons="false"

            class="w-full"

            @keydown.enter.prevent="commit"

            @blur="commit"

          />

        </div>
        </div>
      </div>

    </Teleport>

  </div>

</template>



<style scoped>

.ticket-inline-number-picker {

  width: 100%;

  max-width: 100%;

  min-width: 0;

  display: flex;

  align-items: center;

  justify-content: center;

}



.ticket-inline-number-picker__trigger {

  display: inline-block;

  max-width: 100%;

  border-radius: 4px;

  transition: outline-color 0.12s;

}



.ticket-inline-number-picker__trigger--open {

  outline: 2px solid var(--p-primary-color, #6366f1);

  outline-offset: 2px;

}

</style>



<style>

.ticket-inline-number-picker-panel {

  padding: 0.5rem;

  min-width: 5rem;

}



.ticket-inline-number-picker-panel .p-inputnumber {

  width: 100%;

}



.ticket-inline-number-picker-panel .p-inputnumber-input,

.ticket-inline-number-picker-panel .p-inputtext {

  width: 100%;

  text-align: center;

  font-size: 0.875rem;

  font-weight: 600;

  padding: 0.375rem 0.5rem;

}

</style>

