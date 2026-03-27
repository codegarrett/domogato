<template>
  <div class="rich-text-editor" :class="{ 'editor-focused': isFocused }">
    <div v-if="editor && !readonly" class="editor-toolbar">
      <div class="toolbar-group">
        <button
          type="button"
          :class="{ active: editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
          :title="$t('editor.bold')"
        >
          <i class="pi pi-bold" />
        </button>
        <button
          type="button"
          :class="{ active: editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
          :title="$t('editor.italic')"
        >
          <i class="pi pi-italic" />
        </button>
        <button
          type="button"
          :class="{ active: editor.isActive('underline') }"
          @click="editor.chain().focus().toggleUnderline().run()"
          :title="$t('editor.underline')"
        >
          <i class="pi pi-underline" />
        </button>
        <button
          type="button"
          :class="{ active: editor.isActive('strike') }"
          @click="editor.chain().focus().toggleStrike().run()"
          :title="$t('editor.strikethrough')"
        >
          <i class="pi pi-minus" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          :class="{ active: editor.isActive('heading', { level: 2 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          :title="$t('editor.heading2')"
        >
          H2
        </button>
        <button
          type="button"
          :class="{ active: editor.isActive('heading', { level: 3 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          :title="$t('editor.heading3')"
        >
          H3
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          :class="{ active: editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
          :title="$t('editor.bulletList')"
        >
          <i class="pi pi-list" />
        </button>
        <button
          type="button"
          :class="{ active: editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
          :title="$t('editor.orderedList')"
        >
          <i class="pi pi-sort-numeric-up" />
        </button>
        <button
          type="button"
          :class="{ active: editor.isActive('taskList') }"
          @click="editor.chain().focus().toggleTaskList().run()"
          :title="$t('editor.taskList')"
        >
          <i class="pi pi-check-square" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          :class="{ active: editor.isActive('blockquote') }"
          @click="editor.chain().focus().toggleBlockquote().run()"
          :title="$t('editor.blockquote')"
        >
          <i class="pi pi-align-right" />
        </button>
        <button
          type="button"
          :class="{ active: editor.isActive('codeBlock') }"
          @click="editor.chain().focus().toggleCodeBlock().run()"
          :title="$t('editor.codeBlock')"
        >
          <i class="pi pi-code" />
        </button>
        <button
          type="button"
          @click="editor.chain().focus().setHorizontalRule().run()"
          :title="$t('editor.horizontalRule')"
        >
          ―
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
          :title="$t('editor.insertTable')"
        >
          <i class="pi pi-table" />
        </button>
        <template v-if="editor.isActive('table')">
          <button
            type="button"
            @click="editor.chain().focus().addColumnAfter().run()"
            :title="$t('editor.addColumn')"
          >
            <span class="toolbar-icon-text">+Col</span>
          </button>
          <button
            type="button"
            @click="editor.chain().focus().addRowAfter().run()"
            :title="$t('editor.addRow')"
          >
            <span class="toolbar-icon-text">+Row</span>
          </button>
          <button
            type="button"
            @click="editor.chain().focus().deleteColumn().run()"
            :title="$t('editor.deleteColumn')"
          >
            <span class="toolbar-icon-text">-Col</span>
          </button>
          <button
            type="button"
            @click="editor.chain().focus().deleteRow().run()"
            :title="$t('editor.deleteRow')"
          >
            <span class="toolbar-icon-text">-Row</span>
          </button>
          <button
            type="button"
            @click="editor.chain().focus().deleteTable().run()"
            :title="$t('editor.deleteTable')"
          >
            <i class="pi pi-trash" />
          </button>
        </template>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button
          type="button"
          :disabled="!editor.can().undo()"
          @click="editor.chain().focus().undo().run()"
          :title="$t('editor.undo')"
        >
          <i class="pi pi-undo" />
        </button>
        <button
          type="button"
          :disabled="!editor.can().redo()"
          @click="editor.chain().focus().redo().run()"
          :title="$t('editor.redo')"
        >
          <i class="pi pi-refresh" />
        </button>
      </div>
    </div>

    <EditorContent :editor="editor" class="editor-content" />
  </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  readonly?: boolean
}>(), {
  modelValue: '',
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const resolvedPlaceholder = computed(() => props.placeholder ?? t('editor.placeholder'))

const isFocused = ref(false)

const editor = useEditor({
  content: props.modelValue,
  editable: !props.readonly,
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: resolvedPlaceholder.value }),
    Link.configure({ openOnClick: false }),
    Underline,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  onUpdate: ({ editor: e }) => {
    emit('update:modelValue', e.getHTML())
  },
  onFocus: () => { isFocused.value = true },
  onBlur: () => { isFocused.value = false },
})

watch(resolvedPlaceholder, (val) => {
  if (!editor.value) return
  const placeholderExt = editor.value.extensionManager.extensions.find(
    (e: { name: string }) => e.name === 'placeholder',
  ) as { options: { placeholder: string } } | undefined
  if (placeholderExt) placeholderExt.options.placeholder = val
})

watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val || '', { emitUpdate: false })
  }
})

watch(() => props.readonly, (val) => {
  editor.value?.setEditable(!val)
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid var(--p-content-border-color, #dee2e6);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.15s;
}

.rich-text-editor.editor-focused {
  border-color: var(--p-primary-color, #3b82f6);
  box-shadow: 0 0 0 1px var(--p-primary-color, #3b82f6);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: var(--app-card-alt-bg);
  border-bottom: 1px solid var(--p-content-border-color, #dee2e6);
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 1px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--p-content-border-color, #dee2e6);
  margin: 0 4px;
}

.editor-toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--p-text-color, #334155);
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.15s;
}

.editor-toolbar button:hover {
  background: var(--p-surface-200, #e2e8f0);
}

.editor-toolbar button.active {
  background: var(--p-primary-100, #dbeafe);
  color: var(--p-primary-color, #3b82f6);
}

.editor-toolbar button:disabled {
  opacity: 0.4;
  cursor: default;
}

.editor-content {
  padding: 12px 16px;
  min-height: 120px;
}

.editor-content :deep(.tiptap) {
  outline: none;
  min-height: 100px;
}

.editor-content :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--p-text-muted-color, #94a3b8);
  pointer-events: none;
  height: 0;
}

.editor-content :deep(.tiptap h2) {
  font-size: 1.25rem;
  margin: 0.75em 0 0.25em;
}

.editor-content :deep(.tiptap h3) {
  font-size: 1.1rem;
  margin: 0.75em 0 0.25em;
}

.editor-content :deep(.tiptap ul),
.editor-content :deep(.tiptap ol) {
  padding-left: 1.5rem;
}

.editor-content :deep(.tiptap blockquote) {
  border-left: 3px solid var(--p-primary-200, #bfdbfe);
  padding-left: 1rem;
  color: var(--p-text-muted-color, #64748b);
  margin: 0.5em 0;
}

.editor-content :deep(.tiptap pre) {
  background: var(--p-surface-100, #f1f5f9);
  color: var(--p-text-color, #334155);
  padding: 12px 16px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.85rem;
  overflow-x: auto;
  border: 1px solid var(--p-content-border-color, #e2e8f0);
}

.editor-content :deep(.tiptap pre code) {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
  color: inherit;
}

.editor-content :deep(.tiptap code) {
  background: var(--p-surface-100, #f1f5f9);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--p-text-color, #334155);
}

.editor-content :deep(.tiptap ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}

.editor-content :deep(.tiptap ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.editor-content :deep(.tiptap ul[data-type="taskList"] li label) {
  margin-top: 2px;
}

.editor-content :deep(.tiptap hr) {
  border: none;
  border-top: 1px solid var(--p-content-border-color, #dee2e6);
  margin: 1em 0;
}

.editor-content :deep(.tiptap table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  table-layout: fixed;
  overflow: hidden;
}

.editor-content :deep(.tiptap table td),
.editor-content :deep(.tiptap table th) {
  border: 1px solid var(--p-content-border-color, #dee2e6);
  padding: 8px 12px;
  vertical-align: top;
  position: relative;
  min-width: 80px;
}

.editor-content :deep(.tiptap table th) {
  background: var(--app-card-alt-bg);
  font-weight: 600;
  text-align: left;
}

.editor-content :deep(.tiptap table td.selectedCell),
.editor-content :deep(.tiptap table th.selectedCell) {
  background: var(--p-primary-50, #eff6ff);
  border-color: var(--p-primary-color, #3b82f6);
}

.editor-content :deep(.tiptap table .column-resize-handle) {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--p-primary-color, #3b82f6);
  pointer-events: none;
}

.editor-content :deep(.tableWrapper) {
  overflow-x: auto;
  margin: 1em 0;
}

.toolbar-icon-text {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
</style>
