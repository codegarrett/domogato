<template>
  <div v-if="loading" class="flex justify-content-center p-6">
    <ProgressSpinner />
  </div>
  <div v-else-if="story">
    <div class="flex align-items-center gap-3 mb-4 flex-wrap">
      <Button icon="pi pi-arrow-left" text @click="router.back()" />
      <h1 class="text-2xl font-bold m-0 flex-1 min-w-0">{{ story.title }}</h1>
      <Tag :severity="statusSeverity(story.status)" :value="statusLabel(story.status)" />
      <Tag :severity="prioritySeverity(story.priority)" :value="priorityLabel(story.priority)" />
      <Button
        v-if="canCreateTicket"
        :label="$t('userStories.createTicket')"
        icon="pi pi-ticket"
        size="small"
        @click="createTicket"
      />
    </div>

    <div class="grid">
      <div class="col-12 lg:col-8">
        <!-- Quick notes -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <h2 class="text-lg font-semibold mb-3">{{ $t('userStories.quickNotes') }}</h2>
          <MarkdownEditor
            v-model="quickNotes"
            :rows="4"
            :placeholder="$t('userStories.quickNotesPlaceholder')"
            @blur="saveQuickNotes"
          />
        </div>

        <!-- Open questions -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <div class="flex align-items-center justify-content-between mb-3">
            <h2 class="text-lg font-semibold m-0">{{ $t('userStories.openQuestions') }}</h2>
          </div>
          <div v-if="story.questions.length" class="flex flex-column gap-2 mb-3">
            <div
              v-for="q in story.questions"
              :key="q.id"
              class="flex align-items-start gap-2 surface-ground p-2 border-round"
            >
              <i class="pi pi-question-circle text-primary mt-1" />
              <RichContent :content="q.text" compact class="flex-1 text-sm min-w-0" />
              <Button
                icon="pi pi-trash"
                text
                rounded
                severity="danger"
                size="small"
                @click="removeQuestion(q.id)"
              />
            </div>
          </div>
          <div v-else class="text-sm text-color-secondary mb-3">{{ $t('userStories.noQuestions') }}</div>
          <div class="flex flex-column gap-2">
            <MarkdownEditor
              v-model="newQuestion"
              :rows="3"
              :placeholder="$t('userStories.addQuestionPlaceholder')"
            />
            <div class="flex justify-content-end">
              <Button icon="pi pi-plus" :label="$t('common.add')" @click="addQuestion" />
            </div>
          </div>
        </div>

        <!-- Discussion -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <h2 class="text-lg font-semibold mb-3">{{ $t('userStories.discussion') }}</h2>
          <div v-if="story.discussions.length" class="flex flex-column gap-3 mb-3">
            <div
              v-for="d in story.discussions"
              :key="d.id"
              class="surface-ground p-3 border-round"
            >
              <div class="flex align-items-center gap-2 mb-2 text-sm text-color-secondary">
                <span class="font-semibold">{{ d.author_name || $t('userStories.anonymous') }}</span>
                <span>{{ formatDate(d.created_at) }}</span>
                <Tag
                  v-if="d.applies_to_all_questions"
                  :value="$t('userStories.allQuestions')"
                  severity="secondary"
                  class="text-xs"
                />
              </div>
              <div v-if="d.question_ids.length" class="flex flex-wrap gap-1 mb-2">
                <Tag
                  v-for="qid in d.question_ids"
                  :key="qid"
                  :value="questionLabel(questionText(qid))"
                  severity="info"
                  class="text-xs"
                />
              </div>
              <RichContent :content="d.body" compact class="text-sm" />
            </div>
          </div>
          <div v-else class="text-sm text-color-secondary mb-3">{{ $t('userStories.noDiscussion') }}</div>
          <MarkdownEditor
            v-model="newDiscussion"
            class="mb-2"
            :rows="4"
            :placeholder="$t('userStories.discussionPlaceholder')"
          />
          <div v-if="story.questions.length" class="flex flex-wrap gap-2 mb-2">
            <div v-for="q in story.questions" :key="q.id" class="flex align-items-center gap-1">
              <Checkbox v-model="discussionQuestionIds" :input-id="q.id" :value="q.id" />
              <label :for="q.id" class="text-sm">{{ questionLabel(q.text) }}</label>
            </div>
            <div class="flex align-items-center gap-1">
              <Checkbox v-model="discussionAllQuestions" input-id="all-q" :binary="true" />
              <label for="all-q" class="text-sm">{{ $t('userStories.allQuestions') }}</label>
            </div>
          </div>
          <Button icon="pi pi-send" :label="$t('userStories.postDiscussion')" @click="postDiscussion" />
        </div>

        <!-- Refined story -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <div class="flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
            <h2 class="text-lg font-semibold m-0">{{ $t('userStories.refinedStory') }}</h2>
            <div class="flex align-items-center gap-2">
              <Button
                :label="$t('userStories.generateStory')"
                icon="pi pi-sparkles"
                size="small"
                :loading="aiGenerating"
                :disabled="!hasDiscoveryContext"
                @click="generateStory"
              />
              <AiSparklesButton
                :loading="aiGenerating"
                :disabled="!hasDiscoveryContext"
                @click="openRefineDialog"
              />
            </div>
          </div>
          <p class="text-sm text-color-secondary mt-0 mb-3">
            {{ $t('userStories.generateStoryHint') }}
          </p>
          <div class="flex flex-column gap-3">
            <div>
              <label class="block text-sm font-semibold mb-1">{{ $t('userStories.storyTitle') }}</label>
              <InputText v-model="refinedForm.story_title" class="w-full" @blur="saveRefined" />
            </div>
            <div>
              <MarkdownEditor
                v-model="refinedForm.story_body"
                :label="$t('userStories.storyBody')"
                :rows="8"
                @blur="saveRefined"
              />
            </div>
            <div>
              <MarkdownEditor
                v-model="refinedForm.story_acceptance_criteria"
                :label="$t('userStories.acceptanceCriteria')"
                :rows="5"
                @blur="saveRefined"
              />
            </div>
          </div>
        </div>

        <!-- Linked tickets -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <h2 class="text-lg font-semibold mb-3">{{ $t('userStories.linkedTickets') }}</h2>
          <div v-if="story.linked_tickets.length" class="flex flex-column gap-2">
            <router-link
              v-for="link in story.linked_tickets"
              :key="link.ticket_id"
              :to="`/projects/${projectId}/tickets/${link.ticket_key}`"
              class="surface-50 p-2 border-round flex align-items-center gap-2 no-underline text-color hover:surface-100"
            >
              <i class="pi pi-ticket text-primary text-sm" />
              <span class="font-semibold text-sm">{{ link.ticket_key }}</span>
              <span class="text-sm flex-1">{{ link.ticket_title }}</span>
            </router-link>
          </div>
          <div v-else class="text-sm text-color-secondary">{{ $t('userStories.noLinkedTickets') }}</div>
        </div>
      </div>

      <div class="col-12 lg:col-4">
        <!-- Metadata -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <h2 class="text-lg font-semibold mb-3">{{ $t('userStories.metadata') }}</h2>
          <div class="flex flex-column gap-2 text-sm">
            <div>
              <span class="text-color-secondary">{{ $t('userStories.createdBy') }}:</span>
              {{ story.created_by_name || $t('userStories.anonymous') }}
            </div>
            <div>
              <span class="text-color-secondary">{{ $t('userStories.created') }}:</span>
              {{ formatDate(story.created_at) }}
            </div>
            <div>
              <span class="text-color-secondary">{{ $t('userStories.updated') }}:</span>
              {{ formatDate(story.updated_at) }}
            </div>
          </div>
          <div class="mt-3">
            <label class="block text-sm font-semibold mb-1">{{ $t('userStories.status') }}</label>
            <Select
              v-model="metaForm.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              class="w-full mb-2"
              @change="saveMeta"
            />
            <label class="block text-sm font-semibold mb-1">{{ $t('userStories.priority') }}</label>
            <Select
              v-model="metaForm.priority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              @change="saveMeta"
            />
          </div>
        </div>

        <!-- Parent & children -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <h2 class="text-lg font-semibold mb-3">{{ $t('userStories.hierarchy') }}</h2>
          <div v-if="story.parent_id" class="mb-3 text-sm">
            <span class="text-color-secondary">{{ $t('userStories.parent') }}:</span>
            <router-link
              :to="`/projects/${projectId}/user-stories/${story.parent_id}`"
              class="text-primary no-underline hover:underline ml-1"
            >
              {{ story.parent_title }}
            </router-link>
          </div>
          <AutoComplete
            v-model="parentPicker"
            :suggestions="parentSuggestions"
            option-label="title"
            :placeholder="$t('userStories.setParent')"
            class="w-full mb-3"
            @complete="searchParents"
            @item-select="onParentSelect"
          />
          <div v-if="story.children.length">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('userStories.children') }}</div>
            <router-link
              v-for="child in story.children"
              :key="child.id"
              :to="`/projects/${projectId}/user-stories/${child.id}`"
              class="block surface-50 p-2 border-round mb-1 no-underline text-color hover:surface-100 text-sm"
            >
              {{ child.title }}
            </router-link>
          </div>
          <div v-else class="text-sm text-color-secondary">{{ $t('userStories.noChildren') }}</div>
        </div>

        <!-- Dependencies -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <h2 class="text-lg font-semibold mb-3">{{ $t('userStories.dependencies') }}</h2>
          <div v-if="story.dependencies.length" class="flex flex-column gap-2 mb-3">
            <div
              v-for="dep in story.dependencies"
              :key="dep.depends_on_id"
              class="flex align-items-center gap-2 surface-ground p-2 border-round text-sm"
            >
              <router-link
                :to="`/projects/${projectId}/user-stories/${dep.depends_on_id}`"
                class="flex-1 text-primary no-underline hover:underline"
              >
                {{ dep.depends_on_title }}
              </router-link>
              <Button
                icon="pi pi-times"
                text
                rounded
                severity="danger"
                size="small"
                @click="removeDependency(dep.depends_on_id)"
              />
            </div>
          </div>
          <div v-else class="text-sm text-color-secondary mb-3">{{ $t('userStories.noDependencies') }}</div>
          <AutoComplete
            v-model="dependencyPicker"
            :suggestions="dependencySuggestions"
            option-label="title"
            :placeholder="$t('userStories.addDependency')"
            class="w-full"
            @complete="searchDependencies"
            @item-select="onDependencySelect"
          />
        </div>
      </div>
    </div>

    <AiGeneratePromptDialog
      v-model:visible="showRefineDialog"
      v-model:prompt="refinePrompt"
      :loading="aiGenerating"
      :title="$t('userStories.refineStoryTitle')"
      :hint="$t('userStories.refineStoryHint')"
      :placeholder="$t('userStories.refineStoryPlaceholder')"
      @generate="onRefineGenerate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import MarkdownEditor from '@/components/common/MarkdownEditor.vue'
import RichContent from '@/components/common/RichContent.vue'
import {
  addUserStoryDependency,
  addUserStoryDiscussion,
  addUserStoryQuestion,
  createTicketsFromUserStories,
  deleteUserStoryQuestion,
  getUserStory,
  listUserStories,
  removeUserStoryDependency,
  updateUserStory,
  type UserStory,
  type UserStoryListItem,
} from '@/api/user-stories'
import { useContentAssist } from '@/composables/useContentAssist'
import { useToastService } from '@/composables/useToast'
import AiSparklesButton from '@/components/ai/AiSparklesButton.vue'
import AiGeneratePromptDialog from '@/components/ai/AiGeneratePromptDialog.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToastService()
const { generateContent: runContentGenerate, generating: aiGenerating } = useContentAssist()

const projectId = computed(() => route.params.projectId as string)
const storyId = computed(() => route.params.storyId as string)

const story = ref<UserStory | null>(null)
const loading = ref(true)
const quickNotes = ref('')
const newQuestion = ref('')
const newDiscussion = ref('')
const discussionQuestionIds = ref<string[]>([])
const discussionAllQuestions = ref(false)
const showRefineDialog = ref(false)
const refinePrompt = ref('')

const refinedForm = ref({
  story_title: '',
  story_body: '',
  story_acceptance_criteria: '',
})

const metaForm = ref({ status: 'not_started', priority: 'medium' })

const parentPicker = ref<UserStoryListItem | null>(null)
const parentSuggestions = ref<UserStoryListItem[]>([])
const dependencyPicker = ref<UserStoryListItem | null>(null)
const dependencySuggestions = ref<UserStoryListItem[]>([])

const statusOptions = computed(() => [
  { label: t('userStories.notStarted'), value: 'not_started' },
  { label: t('userStories.inProgress'), value: 'in_progress' },
  { label: t('userStories.discovery'), value: 'discovery' },
  { label: t('userStories.storyReady'), value: 'story_ready' },
  { label: t('userStories.ticketCreatedStatus'), value: 'ticket_created' },
  { label: t('userStories.blocked'), value: 'blocked' },
  { label: t('userStories.deferred'), value: 'deferred' },
  { label: t('userStories.canceled'), value: 'canceled' },
])

const priorityOptions = computed(() => [
  { label: t('userStories.lowest'), value: 'lowest' },
  { label: t('userStories.low'), value: 'low' },
  { label: t('userStories.medium'), value: 'medium' },
  { label: t('userStories.high'), value: 'high' },
  { label: t('userStories.highest'), value: 'highest' },
])

const canCreateTicket = computed(() => {
  if (!story.value) return false
  return story.value.status !== 'ticket_created' && story.value.status !== 'canceled'
})

const hasDiscoveryContext = computed(() => {
  if (!story.value) return false
  const hasNotes = Boolean(quickNotes.value?.trim())
  const hasQuestions = story.value.questions.length > 0
  const hasDiscussion = story.value.discussions.length > 0
  const hasTitle = Boolean(story.value.title?.trim())
  const hasExistingRefined = Boolean(
    refinedForm.value.story_title?.trim()
    || refinedForm.value.story_body?.trim()
    || refinedForm.value.story_acceptance_criteria?.trim(),
  )
  return hasTitle && (hasNotes || hasQuestions || hasDiscussion || hasExistingRefined)
})

function statusSeverity(s: string): string {
  const map: Record<string, string> = {
    not_started: 'secondary', in_progress: 'info', discovery: 'warn',
    story_ready: 'success', ticket_created: 'success', blocked: 'danger',
    deferred: 'secondary', canceled: 'secondary',
  }
  return map[s] ?? 'info'
}

function statusLabel(s: string): string {
  const key = s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  const translated = t(`userStories.${key}`)
  return translated !== `userStories.${key}` ? translated : s
}

function prioritySeverity(p: string): string {
  const map: Record<string, string> = {
    lowest: 'secondary', low: 'secondary', medium: 'info', high: 'warn', highest: 'danger',
  }
  return map[p] ?? 'info'
}

function priorityLabel(p: string): string {
  const translated = t(`userStories.${p}`)
  return translated !== `userStories.${p}` ? translated : p
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function questionText(qid: string): string {
  return story.value?.questions.find((q) => q.id === qid)?.text ?? qid
}

/** Plain-text snippet for tags and checkbox labels (full markdown shown elsewhere). */
function questionLabel(text: string): string {
  const line = text.split('\n').find((l) => l.trim())?.trim() ?? text.trim()
  const plain = line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`#~]/g, '')
  return plain.length > 100 ? `${plain.slice(0, 100)}…` : plain
}

async function loadStory() {
  loading.value = true
  try {
    story.value = await getUserStory(projectId.value, storyId.value)
    quickNotes.value = story.value.quick_notes ?? ''
    refinedForm.value = {
      story_title: story.value.story_title ?? '',
      story_body: story.value.story_body ?? '',
      story_acceptance_criteria: story.value.story_acceptance_criteria ?? '',
    }
    metaForm.value = { status: story.value.status, priority: story.value.priority }
  } catch {
    toast.showError(t('common.error'), '')
  } finally {
    loading.value = false
  }
}

async function saveQuickNotes() {
  if (!story.value || quickNotes.value === (story.value.quick_notes ?? '')) return
  try {
    story.value = await updateUserStory(projectId.value, storyId.value, { quick_notes: quickNotes.value })
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function saveRefined() {
  if (!story.value) return
  try {
    story.value = await updateUserStory(projectId.value, storyId.value, {
      story_title: refinedForm.value.story_title || null,
      story_body: refinedForm.value.story_body || null,
      story_acceptance_criteria: refinedForm.value.story_acceptance_criteria || null,
    })
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function saveMeta() {
  if (!story.value) return
  try {
    story.value = await updateUserStory(projectId.value, storyId.value, {
      status: metaForm.value.status,
      priority: metaForm.value.priority,
    })
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function addQuestion() {
  const text = newQuestion.value.trim()
  if (!text) return
  try {
    await addUserStoryQuestion(projectId.value, storyId.value, text)
    newQuestion.value = ''
    await loadStory()
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function removeQuestion(questionId: string) {
  try {
    await deleteUserStoryQuestion(projectId.value, storyId.value, questionId)
    await loadStory()
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function postDiscussion() {
  const body = newDiscussion.value.trim()
  if (!body) return
  try {
    await addUserStoryDiscussion(projectId.value, storyId.value, {
      body,
      question_ids: discussionAllQuestions.value ? undefined : discussionQuestionIds.value,
      applies_to_all_questions: discussionAllQuestions.value,
    })
    newDiscussion.value = ''
    discussionQuestionIds.value = []
    discussionAllQuestions.value = false
    await loadStory()
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function searchParents(event: { query: string }) {
  const result = await listUserStories(projectId.value, { q: event.query, limit: 20 })
  parentSuggestions.value = result.items.filter((s) => s.id !== storyId.value)
}

async function onParentSelect() {
  if (!parentPicker.value) return
  try {
    story.value = await updateUserStory(projectId.value, storyId.value, {
      parent_id: parentPicker.value.id,
    })
    parentPicker.value = null
    await loadStory()
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function searchDependencies(event: { query: string }) {
  const result = await listUserStories(projectId.value, { q: event.query, limit: 20 })
  dependencySuggestions.value = result.items.filter((s) => s.id !== storyId.value)
}

async function onDependencySelect() {
  if (!dependencyPicker.value) return
  try {
    await addUserStoryDependency(projectId.value, storyId.value, dependencyPicker.value.id)
    dependencyPicker.value = null
    await loadStory()
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function removeDependency(dependsOnId: string) {
  try {
    await removeUserStoryDependency(projectId.value, storyId.value, dependsOnId)
    await loadStory()
  } catch {
    toast.showError(t('common.error'), '')
  }
}

function buildStoryGenerateContext(): Record<string, unknown> {
  const s = story.value
  const hasExisting = Boolean(
    refinedForm.value.story_title?.trim()
    || refinedForm.value.story_body?.trim()
    || refinedForm.value.story_acceptance_criteria?.trim(),
  )
  return {
    working_title: s?.title ?? '',
    quick_notes: quickNotes.value?.trim() || null,
    open_questions: (s?.questions ?? []).map((q) => ({ id: q.id, text: q.text })),
    discussions: (s?.discussions ?? []).map((d) => ({
      body: d.body,
      author: d.author_name,
      applies_to_all_questions: d.applies_to_all_questions,
      linked_questions: d.question_ids.map((qid) => questionText(qid)).filter(Boolean),
    })),
    existing_refined_story: hasExisting
      ? {
          story_title: refinedForm.value.story_title || null,
          story_body: refinedForm.value.story_body || null,
          story_acceptance_criteria: refinedForm.value.story_acceptance_criteria || null,
        }
      : null,
  }
}

async function applyGeneratedStory(result: {
  story_title?: string | null
  story_body?: string | null
  story_acceptance_criteria?: string | null
}) {
  if (result.story_title) refinedForm.value.story_title = result.story_title
  if (result.story_body) refinedForm.value.story_body = result.story_body
  if (result.story_acceptance_criteria) {
    refinedForm.value.story_acceptance_criteria = result.story_acceptance_criteria
  }
  await saveRefined()
  if (
    refinedForm.value.story_title?.trim()
    && refinedForm.value.story_body?.trim()
    && refinedForm.value.story_acceptance_criteria?.trim()
    && story.value
    && !['ticket_created', 'canceled', 'story_ready'].includes(story.value.status)
  ) {
    metaForm.value.status = 'story_ready'
    await saveMeta()
  }
  toast.showSuccess(t('contentAssist.reviewBeforeSave'), '')
}

async function runStoryGeneration(extraPrompt = '') {
  try {
    const result = await runContentGenerate({
      context: 'user_story_refine',
      prompt: extraPrompt || t('userStories.generateStoryDefaultPrompt'),
      project_id: projectId.value,
      current_fields: buildStoryGenerateContext(),
    })
    await applyGeneratedStory(result)
  } catch {
    toast.showError(t('contentAssist.generateFailed'), '')
  }
}

function openRefineDialog() {
  refinePrompt.value = ''
  showRefineDialog.value = true
}

async function generateStory() {
  await runStoryGeneration()
}

async function onRefineGenerate() {
  showRefineDialog.value = false
  await runStoryGeneration(refinePrompt.value.trim())
}

async function createTicket() {
  try {
    const tickets = await createTicketsFromUserStories(projectId.value, [storyId.value])
    toast.showSuccess(t('userStories.ticketCreated'), '')
    await loadStory()
    const ticket = tickets[0]
    if (tickets.length === 1 && ticket?.ticket_key) {
      router.push(`/projects/${projectId}/tickets/${ticket.ticket_key}`)
    }
  } catch {
    toast.showError(t('userStories.refinedFieldsRequired'), '')
  }
}

watch(storyId, () => loadStory())
onMounted(() => loadStory())
</script>
