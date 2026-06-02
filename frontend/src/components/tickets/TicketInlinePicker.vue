<script setup lang="ts">

import { ref, watch, onBeforeUnmount } from 'vue'

import { useInlineDropdownAnchor } from '@/composables/useInlineDropdownAnchor'

import './ticket-inline-dropdown.css'



const props = withDefaults(defineProps<{

  editing: boolean

  options: { label: string; value: string }[]

  allowClear?: boolean

}>(), {

  allowClear: false,

})



const editValue = defineModel<string | null>('editValue')



const emit = defineEmits<{

  start: []

  commit: []

  cancel: []

}>()



const panelVisible = ref(false)

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



function onTriggerClick() {

  if (!props.editing) {

    emit('start')

    return

  }

  if (!panelVisible.value) openPanel()

}



function pick(value: string | null) {

  committed = true

  editValue.value = value

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

}



watch(

  () => props.editing,

  (open) => {

    if (open) {

      committed = false

      openPanel()

      document.addEventListener('keydown', onDocumentKeydown)

    } else {

      panelVisible.value = false

      document.removeEventListener('keydown', onDocumentKeydown)

    }

  },

)



onBeforeUnmount(() => {

  document.removeEventListener('keydown', onDocumentKeydown)

})

</script>



<template>

  <div class="ticket-inline-picker">

    <div

      ref="triggerRef"

      class="ticket-inline-picker__trigger"

      :class="{ 'ticket-inline-picker__trigger--open': editing }"

      role="button"

      tabindex="0"

      @click.stop="onTriggerClick"

      @keydown.enter.prevent.stop="onTriggerClick"

      @keydown.space.prevent.stop="onTriggerClick"

    >

      <slot />

    </div>



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
        <div class="ticket-inline-dropdown-panel ticket-inline-picker-panel" role="listbox">
        <ul class="ticket-inline-picker__list">

          <li

            v-if="allowClear"

            role="option"

            class="ticket-inline-picker__option"

            :class="{ 'ticket-inline-picker__option--selected': editValue == null }"

            @click.stop="pick(null)"

          >

            {{ $t('tickets.unassigned') }}

          </li>

          <li

            v-for="opt in options"

            :key="opt.value"

            role="option"

            class="ticket-inline-picker__option"

            :class="{ 'ticket-inline-picker__option--selected': opt.value === editValue }"

            @click.stop="pick(opt.value)"

          >

            {{ opt.label }}

          </li>

        </ul>
        </div>
      </div>

    </Teleport>

  </div>

</template>



<style scoped>

.ticket-inline-picker {

  width: 100%;

  max-width: 100%;

  min-width: 0;

  display: flex;

  align-items: center;

  justify-content: center;

}



.ticket-inline-picker__trigger {

  max-width: 100%;

  min-width: 0;

  border-radius: 6px;

  cursor: pointer;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  transition: outline-color 0.12s, box-shadow 0.12s;

}



.ticket-inline-picker__trigger--open {

  outline: 2px solid var(--p-primary-color, #6366f1);

  outline-offset: 2px;

}



.ticket-inline-picker__trigger :deep(.p-tag) {

  max-width: 100%;

}



.ticket-inline-picker__trigger :deep(.p-tag-value) {

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}

</style>



<style>

.ticket-inline-picker-panel {

  padding: 0.25rem 0;

}



.ticket-inline-picker-panel .ticket-inline-picker__list {

  list-style: none;

  margin: 0;

  padding: 0;

  min-width: 7rem;

  max-height: 14rem;

  overflow-y: auto;

}



.ticket-inline-picker-panel .ticket-inline-picker__option {

  padding: 0.5rem 0.75rem;

  font-size: 0.8125rem;

  cursor: pointer;

  white-space: nowrap;

  transition: background 0.1s;

}



.ticket-inline-picker-panel .ticket-inline-picker__option:hover {

  background: var(--p-content-hover-background, var(--p-surface-100));

}



.ticket-inline-picker-panel .ticket-inline-picker__option--selected {

  background: var(--p-primary-50, #eef2ff);

  color: var(--p-primary-color, #6366f1);

  font-weight: 600;

}

</style>

