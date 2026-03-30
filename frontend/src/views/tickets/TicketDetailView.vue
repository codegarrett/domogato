<template>
  <div v-if="loadError" class="surface-card p-4 border-round shadow-1">
    <p class="m-0 text-color-secondary">{{ loadError }}</p>
    <Button :label="$t('common.retry')" class="mt-3" icon="pi pi-refresh" @click="loadTicketPage" />
  </div>

  <div v-else-if="!ticket" class="flex justify-content-center p-6">
    <i class="pi pi-spin pi-spinner text-4xl text-color-secondary" aria-hidden="true" />
  </div>

  <div v-else class="ticket-detail">
    <div class="grid">
      <div class="col-12 lg:col-8">
        <div class="flex flex-wrap align-items-center gap-2 mb-3">
          <Tag v-if="ticket.ticket_key" :value="ticket.ticket_key" severity="info" class="font-semibold" />
          <Tag v-else :value="`#${ticket.ticket_number}`" severity="secondary" />

          <div v-if="!editingTitle" class="flex align-items-center gap-2 flex-1 min-w-0" @click="startTitleEdit">
            <h1 class="m-0 text-2xl font-semibold cursor-pointer ticket-title-display">
              {{ ticket.title }}
            </h1>
            <Button icon="pi pi-pencil" text rounded severity="secondary" :aria-label="$t('common.edit')" @click.stop="startTitleEdit" />
          </div>
          <div v-else class="flex flex-wrap align-items-center gap-2 flex-1 min-w-0">
            <InputText
              ref="titleInputRef"
              v-model="titleDraft"
              class="flex-1 min-w-0"
              @keydown.enter.prevent="commitTitle"
              @keydown.escape="cancelTitleEdit"
            />
            <Button :label="$t('common.save')" size="small" @mousedown.prevent @click="commitTitle" />
            <Button
              :label="$t('common.cancel')"
              size="small"
              severity="secondary"
              outlined
              @mousedown.prevent
              @click="cancelTitleEdit"
            />
          </div>

          <Tag :value="formatPriorityLabel(ticket.priority)" :severity="prioritySeverity(ticket.priority)" />
          <Tag :value="formatTypeLabel(ticket.ticket_type)" severity="secondary" />
        </div>

        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <div class="flex align-items-center justify-content-between mb-2">
            <span class="text-sm font-semibold text-color-secondary">{{ $t('common.description') }}</span>
            <div v-if="descEditing" class="flex gap-2">
              <Button :label="$t('common.save')" size="small" icon="pi pi-check" :loading="savingDescription" @click="saveDescriptionExplicit" />
              <Button
                :label="$t('common.cancel')"
                size="small"
                severity="secondary"
                outlined
                icon="pi pi-times"
                @mousedown.prevent
                @click="cancelDescriptionEdit"
              />
            </div>
            <Button
              v-else
              :label="$t('common.edit')"
              size="small"
              text
              icon="pi pi-pencil"
              @click="startDescriptionEdit"
            />
          </div>

          <div
            ref="descSectionRef"
            class="description-section"
            tabindex="-1"
            :class="{ 'cursor-pointer': !descEditing }"
            @focusout="onDescriptionFocusOut"
            @click="onDescriptionSectionClick"
          >
            <RichTextEditor
              v-model="descDraft"
              :readonly="!descEditing"
              :placeholder="$t('tickets.descriptionPlaceholder')"
            />
          </div>
        </div>

        <div class="surface-card p-0 border-round shadow-1 overflow-hidden">
          <TabView>
            <TabPanel value="0" :header="$t('tickets.comments')">
              <div class="p-4 pt-3">
                <div v-if="comments.length === 0" class="text-color-secondary text-sm mb-4">{{ $t('tickets.noComments') }}</div>
                <div v-else class="flex flex-column gap-4 mb-4">
                  <div
                    v-for="c in comments"
                    :key="c.id"
                    class="flex gap-3 comment-row"
                  >
                    <Avatar
                      :label="authorInitials(c)"
                      shape="circle"
                      class="flex-shrink-0 bg-primary text-primary-contrast"
                      style="width: 2.25rem; height: 2.25rem"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex flex-wrap align-items-center gap-2 mb-1">
                        <span class="font-semibold">{{ c.author_name || 'Unknown' }}</span>
                        <span class="text-color-secondary text-sm">{{ formatRelativeTime(c.created_at) }}</span>
                        <Tag v-if="c.is_edited" :value="$t('tickets.edited')" severity="secondary" class="text-xs" />
                      </div>
                      <template v-if="editingCommentId === c.id">
                        <RichTextEditor v-model="commentEditDraft" class="mb-2" :placeholder="$t('tickets.commentPlaceholder')" />
                        <div class="flex gap-2">
                          <Button :label="$t('common.save')" size="small" :loading="commentSaving" @click="saveCommentEdit(c.id)" />
                          <Button :label="$t('common.cancel')" size="small" severity="secondary" outlined @click="cancelCommentEdit" />
                        </div>
                      </template>
                      <template v-else>
                        <div class="comment-body text-sm" v-html="c.body" />
                        <div v-if="canEditComment(c)" class="flex gap-2 mt-2">
                          <Button :label="$t('common.edit')" size="small" text icon="pi pi-pencil" @click="startCommentEdit(c)" />
                          <Button :label="$t('common.delete')" size="small" text severity="danger" icon="pi pi-trash" @click="removeComment(c.id)" />
                        </div>
                      </template>
                    </div>
                  </div>
                </div>

                <div class="border-top-1 surface-border pt-4 mt-2">
                  <label class="block text-sm font-semibold text-color-secondary mb-2">{{ $t('tickets.addComment') }}</label>
                  <RichTextEditor v-model="newCommentBody" :placeholder="$t('tickets.commentPlaceholder')" class="mb-3" />
                  <Button :label="$t('common.comment')" icon="pi pi-send" :loading="commentPosting" :disabled="isCommentEmpty(newCommentBody)" @click="submitComment" />
                </div>
              </div>
            </TabPanel>
            <TabPanel value="1" :header="$t('tickets.activity')">
              <div class="p-4 pt-3">
                <div v-if="activityLoading" class="flex justify-content-center p-3">
                  <i class="pi pi-spin pi-spinner text-xl text-color-secondary" />
                </div>
                <div v-else-if="activityEntries.length === 0" class="text-color-secondary text-sm">{{ $t('tickets.noActivity') }}</div>
                <div v-else class="flex flex-column gap-3">
                  <div
                    v-for="entry in activityEntries"
                    :key="entry.id"
                    class="flex gap-3 align-items-start"
                  >
                    <Avatar
                      :label="activityInitials(entry)"
                      shape="circle"
                      class="flex-shrink-0 bg-primary-100 text-primary-700"
                      style="width: 2rem; height: 2rem; font-size: 0.75rem"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="text-sm">
                        <span class="font-semibold">{{ entry.user_name || $t('tickets.system') }}</span>
                        {{ ' ' }}
                        <span class="text-color-secondary">{{ describeActivity(entry) }}</span>
                      </div>
                      <div class="text-xs text-color-secondary mt-1">{{ formatRelativeTime(entry.created_at) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
            <TabPanel value="2" :header="$t('timeTracking.timeLog')">
              <div class="p-4 pt-3">
                <div class="flex align-items-center justify-content-between mb-3">
                  <span class="text-sm text-color-secondary">
                    {{ $t('timeTracking.totalLogged') }}: <strong>{{ formatDuration(timeSummary?.total_logged_seconds ?? 0) }}</strong>
                  </span>
                  <Button :label="$t('timeTracking.logWork')" icon="pi pi-plus" size="small" @click="openLogTimeDialog" />
                </div>
                <div v-if="timeLogs.length === 0" class="text-color-secondary text-sm">{{ $t('timeTracking.noEntries') }}</div>
                <div v-else class="flex flex-column gap-2">
                  <div
                    v-for="entry in timeLogs"
                    :key="entry.id"
                    class="surface-50 p-3 border-round flex align-items-center justify-content-between"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex align-items-center gap-2 mb-1">
                        <span class="font-semibold text-sm">{{ formatDuration(entry.seconds_spent) }}</span>
                        <Tag :value="entry.work_date" severity="secondary" class="text-xs" />
                        <Tag v-if="entry.activity_type !== 'general'" :value="entry.activity_type" severity="info" class="text-xs" />
                      </div>
                      <div v-if="entry.description" class="text-xs text-color-secondary">{{ entry.description }}</div>
                    </div>
                    <Button
                      v-if="entry.user_id === currentUser?.id"
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      rounded
                      size="small"
                      @click="removeTimeLog(entry.id)"
                    />
                  </div>
                </div>
              </div>
            </TabPanel>
            <TabPanel value="3" :header="$t('attachments.title')">
              <div class="p-4 pt-3">
                <div class="flex align-items-center justify-content-between mb-3">
                  <span class="text-sm text-color-secondary">
                    {{ $t('attachments.count', { n: attachments.length }) }}
                  </span>
                  <div class="flex gap-2 align-items-center">
                    <input
                      ref="fileInputRef"
                      type="file"
                      multiple
                      class="hidden"
                      @change="onFileSelected"
                    />
                    <Button :label="$t('attachments.upload')" icon="pi pi-upload" size="small" :loading="attachmentUploading" @click="triggerFileInput" />
                  </div>
                </div>
                <div v-if="attachments.length === 0" class="text-color-secondary text-sm">{{ $t('attachments.noFiles') }}</div>
                <div v-else class="flex flex-column gap-2">
                  <div
                    v-for="att in attachments"
                    :key="att.id"
                    class="surface-50 p-3 border-round flex align-items-center justify-content-between"
                  >
                    <div class="flex align-items-center gap-3 flex-1 min-w-0">
                      <i :class="fileIcon(att.content_type)" class="text-xl text-color-secondary" />
                      <div class="flex-1 min-w-0">
                        <a class="font-semibold text-sm text-primary cursor-pointer hover:underline" @click="downloadFile(att)">
                          {{ att.filename }}
                        </a>
                        <div class="text-xs text-color-secondary mt-1">
                          {{ formatFileSize(att.size_bytes) }} &middot; {{ formatRelativeTime(att.created_at) }}
                        </div>
                      </div>
                    </div>
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      rounded
                      size="small"
                      @click="removeAttachment(att.id)"
                    />
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabView>
        </div>
      </div>

      <div class="col-12 lg:col-4">
        <div class="flex flex-column gap-3">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('common.status') }}</div>
            <div class="flex align-items-center justify-content-between gap-2 flex-wrap">
              <Tag
                :value="currentStatusName"
                :style="currentStatusStyle"
                class="font-medium"
              />
              <Button
                :label="$t('tickets.transition')"
                icon="pi pi-arrow-right"
                size="small"
                outlined
                :disabled="!transitionOptions.length"
                @click="openTransitionDialog"
              />
            </div>
          </div>

          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('tickets.assignee') }}</div>
            <Select
              :model-value="ticket.assignee_id"
              :options="assigneeOptions"
              option-label="label"
              option-value="value"
              :placeholder="$t('tickets.unassigned')"
              class="w-full"
              show-clear
              @update:model-value="onAssigneeChange"
            />
          </div>

          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('tickets.priority') }}</div>
            <Select
              :model-value="ticket.priority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              @update:model-value="onPriorityChange"
            />
          </div>

          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('tickets.type') }}</div>
            <Tag :value="formatTypeLabel(ticket.ticket_type)" severity="secondary" />
          </div>

          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('nav.sprints') }}</div>
            <Select
              :model-value="ticket.sprint_id"
              :options="sprintOptions"
              option-label="label"
              option-value="value"
              :placeholder="$t('tickets.noSprint')"
              class="w-full"
              show-clear
              @update:model-value="onSprintChange"
            />
            <router-link
              v-if="ticket.sprint_id && currentSprint"
              :to="`/projects/${ticket.project_id}/sprints`"
              class="text-xs text-primary no-underline hover:underline mt-2 inline-block"
            >
              {{ currentSprint.name }}
              <Tag v-if="currentSprint.status" :value="currentSprint.status" :severity="currentSprint.status === 'active' ? 'success' : currentSprint.status === 'completed' ? 'secondary' : 'info'" class="text-xs ml-1" />
            </router-link>
          </div>

          <div v-if="ticket.epic_id" class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('tickets.epic') }}</div>
            <span v-if="epic">{{ epic.title }}</span>
            <span v-else class="text-color-secondary text-sm">{{ $t('common.loading') }}</span>
          </div>

          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('tickets.storyPoints') }}</div>
            <InputNumber
              :model-value="ticket.story_points ?? null"
              class="w-full"
              :min="0"
              :max="999"
              show-buttons
              button-layout="horizontal"
              :step="1"
              @update:model-value="onStoryPointsChange"
            />
          </div>

          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('tickets.dates') }}</div>
            <div class="flex flex-column gap-3">
              <div>
                <label class="block text-xs text-color-secondary mb-1">{{ $t('tickets.startDate') }}</label>
                <input
                  class="p-inputtext p-component w-full border-round"
                  type="date"
                  :value="toDateInputValue(ticket.start_date)"
                  @change="onStartDateChange"
                />
              </div>
              <div>
                <label class="block text-xs text-color-secondary mb-1">{{ $t('tickets.dueDate') }}</label>
                <input
                  class="p-inputtext p-component w-full border-round"
                  type="date"
                  :value="toDateInputValue(ticket.due_date)"
                  @change="onDueDateChange"
                />
              </div>
            </div>
          </div>

          <div class="surface-card p-4 border-round shadow-1">
            <div class="flex align-items-center justify-content-between mb-2">
              <span class="text-sm font-semibold text-color-secondary">{{ $t('tickets.labels') }}</span>
              <Button :label="$t('common.add')" icon="pi pi-plus" size="small" text @click="labelDialogVisible = true" />
            </div>
            <div v-if="ticketLabels.length === 0" class="text-color-secondary text-sm">{{ $t('tickets.noLabels') }}</div>
            <div v-else class="flex flex-wrap gap-2">
              <Chip
                v-for="lbl in ticketLabels"
                :key="lbl.id"
                :label="lbl.name"
                removable
                class="label-chip"
                :style="chipStyle(lbl)"
                @remove="onRemoveLabel(lbl)"
              />
            </div>
          </div>

          <!-- Watchers -->
          <div class="surface-card p-4 border-round shadow-1">
            <div class="flex align-items-center justify-content-between mb-2">
              <span class="text-sm font-semibold text-color-secondary">Watchers</span>
              <Button
                v-if="!isWatching"
                label="Watch"
                icon="pi pi-eye"
                size="small"
                text
                @click="watchTicket"
              />
              <Button
                v-else
                label="Unwatch"
                icon="pi pi-eye-slash"
                size="small"
                text
                severity="secondary"
                @click="unwatchTicket"
              />
            </div>
            <div v-if="watchers.length === 0" class="text-color-secondary text-sm">No watchers</div>
            <div v-else class="flex flex-wrap gap-2">
              <Tag
                v-for="w in watchers"
                :key="w.user_id"
                :value="w.display_name || 'User'"
                severity="secondary"
                class="text-xs"
              />
            </div>
          </div>

          <div class="surface-card p-4 border-round shadow-1">
            <div class="flex align-items-center justify-content-between mb-2">
              <span class="text-sm font-semibold text-color-secondary">{{ $t('dependencies.title') }}</span>
              <Button :label="$t('common.add')" icon="pi pi-plus" size="small" text @click="depDialogVisible = true" />
            </div>
            <div v-if="dependencies.length === 0" class="text-color-secondary text-sm">{{ $t('dependencies.none') }}</div>
            <div v-else class="flex flex-column gap-2">
              <div
                v-for="dep in dependencies"
                :key="dep.id"
                class="surface-50 p-2 border-round flex align-items-center justify-content-between"
              >
                <div class="flex align-items-center gap-2 flex-1 min-w-0">
                  <Tag
                    :value="depLabel(dep)"
                    :severity="depSeverity(dep)"
                    class="text-xs flex-shrink-0"
                  />
                  <router-link
                    :to="`/tickets/${depTargetId(dep)}`"
                    class="text-sm text-primary no-underline hover:underline flex-1 min-w-0 overflow-hidden text-overflow-ellipsis white-space-nowrap"
                  >
                    {{ depTargetKey(dep) }} {{ depTargetTitle(dep) }}
                  </router-link>
                </div>
                <Button icon="pi pi-times" severity="danger" text rounded size="small" @click="removeDependency(dep.id)" />
              </div>
            </div>
          </div>

          <div v-if="userStories.length" class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('kb.relatedStories') }}</div>
            <div class="flex flex-column gap-2">
              <router-link
                v-for="story in userStories"
                :key="story.page_id"
                :to="`/projects/${ticket.project_id}/kb/${story.space_slug}/${story.page_slug}`"
                class="surface-50 p-2 border-round flex align-items-center gap-2 no-underline text-color hover:surface-100"
              >
                <i class="pi pi-clipboard text-primary text-sm" />
                <span class="text-sm flex-1">{{ story.page_title }}</span>
                <Tag
                  v-if="story.story_status_name"
                  :value="story.story_status_name"
                  :style="story.story_status_color ? { background: story.story_status_color, color: '#fff', fontSize: '0.7rem' } : {}"
                  class="text-xs"
                />
              </router-link>
            </div>
          </div>

          <div v-if="sourceIssueReports.length > 0" class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-2">{{ $t('issueReports.sourceReports') }}</div>
            <div class="flex flex-column gap-2">
              <router-link
                v-for="ir in sourceIssueReports"
                :key="ir.id"
                :to="`/projects/${ticket.project_id}/issue-reports/${ir.id}`"
                class="surface-50 p-2 border-round flex align-items-center gap-2 no-underline text-color hover:surface-100"
              >
                <i class="pi pi-exclamation-triangle text-orange-500 text-sm" />
                <span class="text-sm flex-1 min-w-0 overflow-hidden text-overflow-ellipsis white-space-nowrap">{{ ir.title }}</span>
                <span class="flex align-items-center gap-1 text-xs text-color-secondary flex-shrink-0">
                  <i class="pi pi-users" style="font-size: 0.7rem" />
                  {{ ir.reporter_count }}
                </span>
              </router-link>
            </div>
          </div>

          <div class="surface-card p-4 border-round shadow-1">
            <div class="flex align-items-center justify-content-between mb-2">
              <span class="text-sm font-semibold text-color-secondary">{{ $t('timeTracking.title') }}</span>
              <Button :label="$t('timeTracking.logWork')" icon="pi pi-clock" size="small" text @click="openLogTimeDialog" />
            </div>
            <div v-if="timeSummary" class="flex flex-column gap-2 text-sm">
              <div class="flex justify-content-between">
                <span class="text-color-secondary">{{ $t('timeTracking.logged') }}</span>
                <span class="font-semibold">{{ formatDuration(timeSummary.total_logged_seconds) }}</span>
              </div>
              <div class="flex justify-content-between">
                <span class="text-color-secondary">{{ $t('timeTracking.estimate') }}</span>
                <span>{{ formatDuration(timeSummary.original_estimate_seconds) }}</span>
              </div>
              <div class="flex justify-content-between">
                <span class="text-color-secondary">{{ $t('timeTracking.remaining') }}</span>
                <span>{{ formatDuration(timeSummary.remaining_estimate_seconds) }}</span>
              </div>
              <div
                v-if="timeSummary.original_estimate_seconds && timeSummary.original_estimate_seconds > 0"
                class="mt-1"
              >
                <div class="h-1rem border-round overflow-hidden bg-surface-100">
                  <div
                    class="h-full border-round"
                    :style="{
                      width: Math.min(100, Math.round((timeSummary.total_logged_seconds / timeSummary.original_estimate_seconds) * 100)) + '%',
                      background: timeSummary.total_logged_seconds > timeSummary.original_estimate_seconds ? 'var(--p-red-500)' : 'var(--p-primary-color)',
                    }"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="customFieldDefs.length > 0" class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('customFields.title') }}</div>
            <div class="flex flex-column gap-3">
              <div v-for="defn in customFieldDefs" :key="defn.id">
                <label v-if="defn.field_type !== 'checkbox'" class="block text-xs text-color-secondary mb-1">
                  {{ defn.name }}
                  <span v-if="defn.is_required" class="text-red-500">*</span>
                </label>
                <CustomFieldRenderer
                  :definition="defn"
                  :modelValue="customFieldValues[defn.id]"
                  :disabled="customFieldSaving[defn.id]"
                  @update:modelValue="onCustomFieldChange(defn.id, $event)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="transitionDialogVisible" :header="$t('tickets.changeStatus')" modal :style="{ width: '28rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm text-color-secondary mb-2">{{ $t('tickets.newStatus') }}</label>
          <Select
            v-model="transitionTargetId"
            :options="transitionOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('tickets.selectStatus')"
            class="w-full"
          />
        </div>
        <div v-if="transitionTargetIsTerminal">
          <label class="block text-sm text-color-secondary mb-2">{{ $t('tickets.resolution') }}</label>
          <Textarea v-model="transitionResolution" rows="3" class="w-full" auto-resize :placeholder="$t('tickets.resolutionPlaceholder')" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" outlined @click="transitionDialogVisible = false" />
        <Button :label="$t('common.apply')" icon="pi pi-check" :loading="transitionLoading" :disabled="!transitionTargetId" @click="applyTransition" />
      </template>
    </Dialog>

    <Dialog v-model:visible="timeLogDialogVisible" :header="$t('timeTracking.logWork')" modal :style="{ width: '26rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="block text-sm text-color-secondary mb-1">{{ $t('timeTracking.hours') }}</label>
            <InputNumber v-model="timeLogHours" :min="0" :max="99" class="w-full" :placeholder="'0'" />
          </div>
          <div class="flex-1">
            <label class="block text-sm text-color-secondary mb-1">{{ $t('timeTracking.minutes') }}</label>
            <InputNumber v-model="timeLogMinutes" :min="0" :max="59" class="w-full" :placeholder="'0'" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-color-secondary mb-1">{{ $t('timeTracking.workDate') }}</label>
          <input type="date" class="p-inputtext p-component w-full border-round" v-model="timeLogDate" />
        </div>
        <div>
          <label class="block text-sm text-color-secondary mb-1">{{ $t('common.description') }}</label>
          <Textarea v-model="timeLogDescription" rows="2" class="w-full" :placeholder="$t('timeTracking.descriptionPlaceholder')" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" outlined @click="timeLogDialogVisible = false" />
        <Button :label="$t('timeTracking.logWork')" icon="pi pi-clock" :loading="timeLogSaving" :disabled="((timeLogHours ?? 0) * 60 + (timeLogMinutes ?? 0)) <= 0" @click="submitTimeLog" />
      </template>
    </Dialog>

    <Dialog v-model:visible="depDialogVisible" :header="$t('dependencies.add')" modal :style="{ width: '28rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm text-color-secondary mb-2">{{ $t('dependencies.type') }}</label>
          <Select
            v-model="depType"
            :options="depTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm text-color-secondary mb-2">{{ $t('dependencies.targetTicket') }}</label>
          <Select
            v-model="depTargetTicketId"
            :options="depTicketOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('dependencies.selectTicket')"
            class="w-full"
            filter
          />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" outlined @click="depDialogVisible = false" />
        <Button :label="$t('common.add')" icon="pi pi-plus" :loading="depSaving" :disabled="!depTargetTicketId" @click="submitDependency" />
      </template>
    </Dialog>

    <Dialog v-model:visible="labelDialogVisible" :header="$t('tickets.addLabel')" modal :style="{ width: '28rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <div v-if="!creatingNewLabel">
          <Select
            v-model="labelToAdd"
            :options="labelsAvailableToAdd"
            option-label="name"
            option-value="id"
            :placeholder="$t('tickets.chooseLabel')"
            class="w-full"
          />
          <Button
            :label="$t('tickets.createNewLabel')"
            icon="pi pi-plus"
            size="small"
            text
            class="mt-2 p-0"
            @click="creatingNewLabel = true"
          />
        </div>
        <div v-else class="flex flex-column gap-2">
          <div>
            <label class="block text-sm text-color-secondary mb-1">{{ $t('tickets.labelName') }}</label>
            <InputText v-model="newLabelName" class="w-full" :placeholder="$t('tickets.labelNamePlaceholder')" />
          </div>
          <div>
            <label class="block text-sm text-color-secondary mb-1">{{ $t('tickets.labelColor') }}</label>
            <div class="flex align-items-center gap-2">
              <input v-model="newLabelColor" type="color" class="border-round" style="width: 2.5rem; height: 2.5rem; padding: 2px; cursor: pointer;" />
              <Tag :value="newLabelName || $t('tickets.preview')" :style="{ background: newLabelColor, color: '#fff', borderColor: newLabelColor }" />
            </div>
          </div>
          <div class="flex gap-2 mt-1">
            <Button :label="$t('tickets.saveLabel')" size="small" icon="pi pi-check" :loading="savingNewLabel" :disabled="!newLabelName.trim()" @click="createAndAddLabel" />
            <Button :label="$t('common.cancel')" size="small" severity="secondary" outlined @click="creatingNewLabel = false" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" outlined @click="labelDialogVisible = false" />
        <Button :label="$t('common.add')" icon="pi pi-plus" :disabled="!labelToAdd || creatingNewLabel" @click="confirmAddLabel" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Chip from 'primevue/chip'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Avatar from 'primevue/avatar'
import RichTextEditor from '@/components/editor/RichTextEditor.vue'
import {
  getTicket,
  updateTicket,
  transitionStatus,
  type Ticket,
  type TicketUpdate,
} from '@/api/tickets'
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
  type Comment,
} from '@/api/comments'
import {
  listLabels,
  createLabel,
  listTicketLabels,
  addLabelToTicket,
  removeLabelFromTicket,
  type Label,
} from '@/api/labels'
import { listActivity, type ActivityLog as ActivityEntry } from '@/api/activity'
import {
  listFieldDefinitions,
  getTicketCustomFields,
  setTicketCustomFields,
  type CustomFieldDefinition,
} from '@/api/custom-fields'
import CustomFieldRenderer from '@/components/custom-fields/CustomFieldRenderer.vue'
import { getProject, listProjectMembers, type ProjectMember } from '@/api/projects'
import { listSprints, type Sprint } from '@/api/sprints'
import { getEpic, type Epic } from '@/api/epics'
import { listWorkflows, type Workflow, type WorkflowStatus } from '@/api/workflows'
import {
  logTime,
  listTimeLogs,
  getTimeSummary,
  deleteTimeLog,
  type TimeLog,
  type TimeSummary,
} from '@/api/time-tracking'
import {
  listAttachments as fetchAttachments,
  createAttachment as createAttachmentApi,
  uploadToPresignedUrl,
  getDownloadUrl,
  deleteAttachment as deleteAttachmentApi,
  formatFileSize,
  type Attachment,
} from '@/api/attachments'
import {
  listDependencies as fetchDependencies,
  createDependency as createDependencyApi,
  deleteDependency as deleteDependencyApi,
  type Dependency,
} from '@/api/dependencies'
import { listTickets } from '@/api/tickets'
import { getUserStoriesForTicket, type UserStoryForTicket } from '@/api/kb'
import { listWatchers, addWatcher, removeWatcher, type Watcher } from '@/api/watchers'
import { getTicketIssueReports } from '@/api/issue-reports'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const ws = useWebSocket()
const { currentUser } = storeToRefs(authStore)

const ticketId = computed(() => route.params.ticketId as string)

const ticket = ref<Ticket | null>(null)
const loadError = ref<string | null>(null)
const comments = ref<Comment[]>([])
const allProjectLabels = ref<Label[]>([])
const ticketLabels = ref<Label[]>([])
const members = ref<ProjectMember[]>([])
const epic = ref<Epic | null>(null)
const workflow = ref<Workflow | null>(null)
const userStories = ref<UserStoryForTicket[]>([])
const watchers = ref<Watcher[]>([])
const sourceIssueReports = ref<Array<{ id: string; title: string; status: string; priority: string; reporter_count: number; linked_at: string }>>([])


const projectSprints = ref<Sprint[]>([])

const editingTitle = ref(false)
const titleDraft = ref('')
const titleInputRef = ref<InstanceType<typeof InputText> | null>(null)

const descEditing = ref(false)
const descDraft = ref('')
const descSectionRef = ref<HTMLElement | null>(null)
const savingDescription = ref(false)
let descBlurTimer: ReturnType<typeof setTimeout> | null = null

const newCommentBody = ref('')
const commentPosting = ref(false)
const editingCommentId = ref<string | null>(null)
const commentEditDraft = ref('')
const commentSaving = ref(false)

const transitionDialogVisible = ref(false)
const transitionTargetId = ref<string | null>(null)
const transitionResolution = ref('')
const transitionLoading = ref(false)

const activityEntries = ref<ActivityEntry[]>([])
const activityLoading = ref(false)

const customFieldDefs = ref<CustomFieldDefinition[]>([])
const customFieldValues = ref<Record<string, unknown>>({})
const customFieldSaving = ref<Record<string, boolean>>({})

const labelDialogVisible = ref(false)
const labelToAdd = ref<string | null>(null)
const creatingNewLabel = ref(false)
const newLabelName = ref('')
const newLabelColor = ref('#6366F1')
const savingNewLabel = ref(false)

const timeLogs = ref<TimeLog[]>([])
const timeSummary = ref<TimeSummary | null>(null)
const timeLogDialogVisible = ref(false)
const timeLogSaving = ref(false)
const timeLogHours = ref<number | null>(null)
const timeLogMinutes = ref<number | null>(null)
const timeLogDate = ref(new Date().toISOString().slice(0, 10))
const timeLogDescription = ref('')

const attachments = ref<Attachment[]>([])
const attachmentUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const dependencies = ref<Dependency[]>([])
const depDialogVisible = ref(false)
const depType = ref<'blocks' | 'blocked_by' | 'relates_to'>('blocks')
const depTargetTicketId = ref<string | null>(null)
const depSaving = ref(false)
const projectTickets = ref<{ id: string; title: string; ticket_number: number; project_key?: string }[]>([])

const depTypeOptions = computed(() => [
  { label: t('dependencies.blocks'), value: 'blocks' as const },
  { label: t('dependencies.blockedBy'), value: 'blocked_by' as const },
  { label: t('dependencies.relatesTo'), value: 'relates_to' as const },
])

const depTicketOptions = computed(() => {
  const current = ticket.value?.id
  return projectTickets.value
    .filter(tk => tk.id !== current)
    .map(tk => ({
      label: `${tk.project_key ? tk.project_key + '-' : '#'}${tk.ticket_number} ${tk.title}`,
      value: tk.id,
    }))
})

const sprintOptions = computed(() =>
  projectSprints.value
    .filter(s => s.status !== 'completed')
    .map(s => ({
      label: `${s.name}${s.status === 'active' ? ' ★' : ''}`,
      value: s.id,
    })),
)

const currentSprint = computed(() => {
  if (!ticket.value?.sprint_id) return null
  return projectSprints.value.find(s => s.id === ticket.value!.sprint_id) ?? null
})

const priorityOptions = computed(() => [
  { label: t('tickets.priorities.lowest'), value: 'lowest' },
  { label: t('tickets.priorities.low'), value: 'low' },
  { label: t('tickets.priorities.medium'), value: 'medium' },
  { label: t('tickets.priorities.high'), value: 'high' },
  { label: t('tickets.priorities.highest'), value: 'highest' },
])

const assigneeOptions = computed(() =>
  members.value.map(m => ({ label: m.display_name || m.email, value: m.user_id })),
)

const currentStatus = computed((): WorkflowStatus | null => {
  if (!ticket.value || !workflow.value) return null
  return workflow.value.statuses.find(s => s.id === ticket.value!.workflow_status_id) ?? null
})

const currentStatusName = computed(() => currentStatus.value?.name ?? 'Unknown status')

const currentStatusStyle = computed(() => {
  const c = currentStatus.value?.color
  if (!c) return {}
  return {
    background: c,
    color: '#fff',
    borderColor: c,
  }
})

const transitionOptions = computed(() => {
  if (!ticket.value || !workflow.value) return []
  const from = ticket.value.workflow_status_id
  const statusById = new Map(workflow.value.statuses.map(s => [s.id, s]))
  return workflow.value.transitions
    .filter(tr => tr.from_status_id === from)
    .map(tr => ({
      label: statusById.get(tr.to_status_id)?.name ?? tr.to_status_id,
      value: tr.to_status_id,
      terminal: statusById.get(tr.to_status_id)?.is_terminal ?? false,
    }))
})

const transitionTargetIsTerminal = computed(() => {
  if (!transitionTargetId.value || !workflow.value) return false
  return workflow.value.statuses.find(s => s.id === transitionTargetId.value)?.is_terminal ?? false
})

const labelsAvailableToAdd = computed(() => {
  const on = new Set(ticketLabels.value.map(l => l.id))
  return allProjectLabels.value.filter(l => !on.has(l.id))
})

function formatPriorityLabel(p: string): string {
  return p.replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase())
}

function formatTypeLabel(tp: string): string {
  return tp.replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase())
}

function prioritySeverity(p: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  if (p === 'highest' || p === 'high') return 'danger'
  if (p === 'low' || p === 'lowest') return 'secondary'
  return 'info'
}

function formatRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return iso
  const sec = Math.round((Date.now() - ts) / 1000)
  if (sec < 45) return t('tickets.timeAgo.justNow')
  const min = Math.round(sec / 60)
  if (min < 60) return t('tickets.timeAgo.minutesAgo', { n: min })
  const hr = Math.round(min / 60)
  if (hr < 24) return t('tickets.timeAgo.hoursAgo', { n: hr })
  const day = Math.round(hr / 24)
  if (day < 30) return t('tickets.timeAgo.daysAgo', { n: day })
  const mo = Math.round(day / 30)
  if (mo < 12) return t('tickets.timeAgo.monthsAgo', { n: mo })
  return new Date(iso).toLocaleDateString()
}

function activityInitials(entry: ActivityEntry): string {
  const n = entry.user_name || '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

function describeActivity(entry: ActivityEntry): string {
  switch (entry.action) {
    case 'created':
      return t('tickets.activityLog.created')
    case 'comment_added':
      return t('tickets.activityLog.commentAdded')
    case 'transition': {
      const fromStatus = workflow.value?.statuses.find(s => s.id === entry.old_value)
      const toStatus = workflow.value?.statuses.find(s => s.id === entry.new_value)
      return t('tickets.activityLog.transition', {
        from: fromStatus?.name || entry.old_value || '?',
        to: toStatus?.name || entry.new_value || '?',
      })
    }
    case 'field_change': {
      const field = entry.field_name || ''
      const fieldLabel = t(`tickets.activityLog.fields.${field}`, field)
      if (entry.old_value && entry.new_value) {
        return t('tickets.activityLog.fieldChanged', { field: fieldLabel, from: entry.old_value, to: entry.new_value })
      }
      if (entry.new_value) {
        return t('tickets.activityLog.fieldSet', { field: fieldLabel, value: entry.new_value })
      }
      return t('tickets.activityLog.fieldCleared', { field: fieldLabel })
    }
    default:
      return entry.action
  }
}

function authorInitials(c: Comment): string {
  const n = c.author_name || c.author_email || '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

function canEditComment(c: Comment): boolean {
  if (!currentUser.value || !c.author_id) return false
  return c.author_id === currentUser.value.id
}

function isCommentEmpty(html: string): boolean {
  const txt = html.replace(/<[^>]+>/g, '').replace(/\s|&nbsp;/g, '')
  return txt.length === 0
}

function chipStyle(lbl: Label) {
  return {
    background: lbl.color || undefined,
    color: lbl.color ? '#fff' : undefined,
    borderColor: lbl.color || undefined,
  } as Record<string, string | undefined>
}

function toDateInputValue(d: string | null): string {
  if (!d) return ''
  return d.length >= 10 ? d.slice(0, 10) : d
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds === undefined) return '—'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return '0m'
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  return parts.join(' ')
}

async function loadTimeData() {
  if (!ticket.value) return
  try {
    const [logsRes, summary] = await Promise.all([
      listTimeLogs(ticket.value.id, { limit: 100 }),
      getTimeSummary(ticket.value.id),
    ])
    timeLogs.value = logsRes.items
    timeSummary.value = summary
  } catch { /* ignore */ }
}

function openLogTimeDialog() {
  timeLogHours.value = null
  timeLogMinutes.value = null
  timeLogDate.value = new Date().toISOString().slice(0, 10)
  timeLogDescription.value = ''
  timeLogDialogVisible.value = true
}

async function submitTimeLog() {
  if (!ticket.value) return
  const h = timeLogHours.value ?? 0
  const m = timeLogMinutes.value ?? 0
  const seconds = h * 3600 + m * 60
  if (seconds <= 0) return

  timeLogSaving.value = true
  try {
    await logTime(ticket.value.id, {
      seconds_spent: seconds,
      work_date: timeLogDate.value,
      description: timeLogDescription.value || undefined,
    })
    timeLogDialogVisible.value = false
    await loadTimeData()
  } catch (e) {
    console.error(e)
  } finally {
    timeLogSaving.value = false
  }
}

async function removeTimeLog(logId: string) {
  try {
    await deleteTimeLog(logId)
    await loadTimeData()
  } catch (e) {
    console.error(e)
  }
}

function depLabel(dep: Dependency): string {
  const tid = ticket.value?.id
  if (dep.dependency_type === 'relates_to') return t('dependencies.relatesTo')
  if (dep.blocking_ticket_id === tid) return t('dependencies.blocks')
  return t('dependencies.blockedBy')
}

function depSeverity(dep: Dependency): 'danger' | 'warn' | 'info' {
  const tid = ticket.value?.id
  if (dep.dependency_type === 'relates_to') return 'info'
  if (dep.blocking_ticket_id === tid) return 'warn'
  return 'danger'
}

function depTargetId(dep: Dependency): string {
  const tid = ticket.value?.id
  return dep.blocking_ticket_id === tid ? dep.blocked_ticket_id : dep.blocking_ticket_id
}

function depTargetKey(dep: Dependency): string {
  const tid = ticket.value?.id
  return (dep.blocking_ticket_id === tid ? dep.blocked_ticket_key : dep.blocking_ticket_key) || ''
}

function depTargetTitle(dep: Dependency): string {
  const tid = ticket.value?.id
  return (dep.blocking_ticket_id === tid ? dep.blocked_ticket_title : dep.blocking_ticket_title) || ''
}

async function loadDependencies() {
  if (!ticket.value) return
  try {
    dependencies.value = await fetchDependencies(ticket.value.id)
  } catch { /* ignore */ }
}

async function loadProjectTickets() {
  if (!ticket.value) return
  try {
    const res = await listTickets(ticket.value.project_id, { limit: 200 })
    projectTickets.value = res.items.map((tk: any) => ({
      id: tk.id,
      title: tk.title,
      ticket_number: tk.ticket_number,
      project_key: tk.project_key,
    }))
  } catch { /* ignore */ }
}

async function submitDependency() {
  if (!ticket.value || !depTargetTicketId.value) return
  depSaving.value = true
  try {
    await createDependencyApi(ticket.value.id, {
      blocked_ticket_id: depTargetTicketId.value,
      dependency_type: depType.value,
    })
    depDialogVisible.value = false
    await loadDependencies()
  } catch (e) {
    console.error(e)
  } finally {
    depSaving.value = false
  }
}

async function removeDependency(depId: string) {
  try {
    await deleteDependencyApi(depId)
    dependencies.value = dependencies.value.filter(d => d.id !== depId)
  } catch (e) {
    console.error(e)
  }
}

function fileIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return 'pi pi-image'
  if (contentType === 'application/pdf') return 'pi pi-file-pdf'
  if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType === 'text/csv') return 'pi pi-file-excel'
  if (contentType.includes('word') || contentType.includes('document')) return 'pi pi-file-word'
  if (contentType.startsWith('video/')) return 'pi pi-video'
  if (contentType.startsWith('audio/')) return 'pi pi-volume-up'
  if (contentType.includes('zip') || contentType.includes('tar') || contentType.includes('gzip')) return 'pi pi-box'
  return 'pi pi-file'
}

async function loadAttachments() {
  if (!ticket.value) return
  try {
    const res = await fetchAttachments(ticket.value.id, { limit: 100 })
    attachments.value = res.items
  } catch { /* ignore */ }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0 || !ticket.value) return

  attachmentUploading.value = true
  try {
    for (const file of Array.from(files)) {
      const { upload_url } = await createAttachmentApi(ticket.value.id, {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      })
      await uploadToPresignedUrl(upload_url, file)
    }
    await loadAttachments()
  } catch (e) {
    console.error(e)
  } finally {
    attachmentUploading.value = false
    input.value = ''
  }
}

async function downloadFile(att: Attachment) {
  try {
    const url = await getDownloadUrl(att.id)
    window.open(url, '_blank')
  } catch (e) {
    console.error(e)
  }
}

async function removeAttachment(attId: string) {
  try {
    await deleteAttachmentApi(attId)
    attachments.value = attachments.value.filter(a => a.id !== attId)
  } catch (e) {
    console.error(e)
  }
}

async function loadTicketPage() {
  loadError.value = null
  const id = ticketId.value
  if (!id) {
    loadError.value = t('tickets.missingId')
    ticket.value = null
    return
  }
  if (ticket.value?.id !== id) {
    ticket.value = null
    workflow.value = null
    epic.value = null
  }
  try {
    const tk = await getTicket(id)
    ticket.value = tk
    descDraft.value = tk.description ?? ''
    const proj = await getProject(tk.project_id)
    activityLoading.value = true
    const [commentsRes, lblProj, memRes, wfRes, tLabels, actRes, cfDefs, cfVals] = await Promise.all([
      listComments(tk.id, 0, 100),
      listLabels(tk.project_id),
      listProjectMembers(tk.project_id, 0, 200),
      listWorkflows(proj.organization_id, 0, 100),
      listTicketLabels(tk.id),
      listActivity(tk.id, 0, 100),
      listFieldDefinitions(tk.project_id),
      getTicketCustomFields(tk.id),
    ])
    comments.value = commentsRes.items.filter(c => !c.is_deleted)
    allProjectLabels.value = lblProj
    members.value = memRes.items
    ticketLabels.value = tLabels
    activityEntries.value = actRes.items
    activityLoading.value = false
    customFieldDefs.value = cfDefs
    customFieldValues.value = cfVals.values
    const wf = wfRes.items.find(w => w.statuses.some(s => s.id === tk.workflow_status_id)) ?? null
    workflow.value = wf
    if (tk.epic_id) {
      epic.value = await getEpic(tk.epic_id)
    }
    void loadTimeData()
    void loadAttachments()
    void loadDependencies()
    void loadProjectTickets()
    void loadSprints()
    void loadUserStories(tk.id)
    void loadWatchers(tk.id)
    void loadSourceIssueReports(tk.id)
  } catch (e) {
    console.error(e)
    loadError.value = t('tickets.loadFailed')
  }
}

async function refreshActivity() {
  if (!ticket.value) return
  try {
    const res = await listActivity(ticket.value.id, 0, 100)
    activityEntries.value = res.items
  } catch { /* ignore */ }
}

async function patchTicket(payload: TicketUpdate) {
  if (!ticket.value) return
  const updated = await updateTicket(ticket.value.id, payload)
  ticket.value = updated
  descDraft.value = updated.description ?? ''
  void refreshActivity()
}

function startTitleEdit() {
  if (!ticket.value) return
  titleDraft.value = ticket.value.title
  editingTitle.value = true
  void nextTick(() => {
    const root = titleInputRef.value as { $el?: HTMLElement } | null
    const el = root?.$el
    const input = (el?.tagName === 'INPUT' ? el : el?.querySelector?.('input')) as HTMLInputElement | null
    input?.focus()
    input?.select()
  })
}

function cancelTitleEdit() {
  editingTitle.value = false
  if (ticket.value) titleDraft.value = ticket.value.title
}

async function commitTitle() {
  if (!editingTitle.value || !ticket.value) return
  const next = titleDraft.value.trim()
  if (!next) {
    titleDraft.value = ticket.value.title
    editingTitle.value = false
    return
  }
  if (next === ticket.value.title) {
    editingTitle.value = false
    return
  }
  try {
    await patchTicket({ title: next })
  } catch (e) {
    console.error(e)
  } finally {
    editingTitle.value = false
  }
}

function startDescriptionEdit() {
  if (!ticket.value) return
  descDraft.value = ticket.value.description ?? ''
  descEditing.value = true
}

function cancelDescriptionEdit() {
  clearDescBlurTimer()
  if (ticket.value) descDraft.value = ticket.value.description ?? ''
  descEditing.value = false
}

function clearDescBlurTimer() {
  if (descBlurTimer) {
    clearTimeout(descBlurTimer)
    descBlurTimer = null
  }
}

async function saveDescriptionExplicit() {
  clearDescBlurTimer()
  if (!ticket.value || !descEditing.value) return
  savingDescription.value = true
  try {
    await patchTicket({ description: descDraft.value || null })
    descEditing.value = false
  } catch (e) {
    console.error(e)
  } finally {
    savingDescription.value = false
  }
}

function onDescriptionSectionClick() {
  if (!descEditing.value && ticket.value) startDescriptionEdit()
}

function onDescriptionFocusOut(ev: FocusEvent) {
  if (!descEditing.value) return
  const root = descSectionRef.value
  const next = ev.relatedTarget as Node | null
  if (root && next && root.contains(next)) return
  clearDescBlurTimer()
  descBlurTimer = setTimeout(() => {
    descBlurTimer = null
    void saveDescriptionFromBlur()
  }, 120)
}

async function saveDescriptionFromBlur() {
  if (!descEditing.value || !ticket.value || savingDescription.value) return
  const current = ticket.value.description ?? ''
  if (descDraft.value === current) {
    descEditing.value = false
    return
  }
  savingDescription.value = true
  try {
    await patchTicket({ description: descDraft.value || null })
    descEditing.value = false
  } catch (e) {
    console.error(e)
  } finally {
    savingDescription.value = false
  }
}

async function onPriorityChange(value: string) {
  if (!ticket.value || value === ticket.value.priority) return
  try {
    await patchTicket({ priority: value })
  } catch (e) {
    console.error(e)
  }
}

async function onAssigneeChange(value: string | null | undefined) {
  if (!ticket.value) return
  const next = value ?? null
  const cur = ticket.value.assignee_id ?? null
  if (next === cur) return
  try {
    await patchTicket({ assignee_id: next })
  } catch (e) {
    console.error(e)
  }
}

async function onSprintChange(value: string | null | undefined) {
  if (!ticket.value) return
  const next = value ?? null
  const cur = ticket.value.sprint_id ?? null
  if (next === cur) return
  try {
    await patchTicket({ sprint_id: next } as TicketUpdate)
  } catch (e) {
    console.error(e)
  }
}

async function loadSprints() {
  if (!ticket.value) return
  try {
    const res = await listSprints(ticket.value.project_id, { limit: 100 })
    projectSprints.value = res.items
  } catch { /* ignore */ }
}

async function loadUserStories(ticketId: string) {
  try {
    userStories.value = await getUserStoriesForTicket(ticketId)
  } catch { /* ignore */ }
}

async function loadWatchers(tid: string) {
  try {
    watchers.value = await listWatchers(tid)
  } catch { /* ignore */ }
}

async function loadSourceIssueReports(tid: string) {
  try {
    sourceIssueReports.value = await getTicketIssueReports(tid)
  } catch { /* ignore */ }
}

const isWatching = computed(() => {
  const uid = currentUser.value?.id
  return uid ? watchers.value.some((w) => w.user_id === uid) : false
})

async function watchTicket() {
  if (!ticket.value || !currentUser.value) return
  try {
    await addWatcher(ticket.value.id, currentUser.value.id)
    await loadWatchers(ticket.value.id)
  } catch { /* ignore */ }
}

async function unwatchTicket() {
  if (!ticket.value || !currentUser.value) return
  try {
    await removeWatcher(ticket.value.id, currentUser.value.id)
    await loadWatchers(ticket.value.id)
  } catch { /* ignore */ }
}

async function onStoryPointsChange(value: number | null) {
  if (!ticket.value) return
  const n = value === null || value === undefined ? null : value
  if (n === ticket.value.story_points) return
  try {
    await patchTicket({ story_points: n })
  } catch (e) {
    console.error(e)
  }
}

async function onDateFieldChange(field: 'start_date' | 'due_date', raw: string) {
  if (!ticket.value) return
  const v = raw && raw.length ? raw : null
  const cur = ticket.value[field]
  const curS = cur ? toDateInputValue(cur) : ''
  if ((v ?? '') === curS) return
  try {
    await patchTicket({ [field]: v } as TicketUpdate)
  } catch (e) {
    console.error(e)
  }
}

function onStartDateChange(ev: Event) {
  const v = (ev.target as HTMLInputElement).value
  void onDateFieldChange('start_date', v)
}

function onDueDateChange(ev: Event) {
  const v = (ev.target as HTMLInputElement).value
  void onDateFieldChange('due_date', v)
}

function openTransitionDialog() {
  transitionTargetId.value = transitionOptions.value[0]?.value ?? null
  transitionResolution.value = ''
  transitionDialogVisible.value = true
}

async function applyTransition() {
  if (!ticket.value || !transitionTargetId.value) return
  transitionLoading.value = true
  try {
    const body: { workflow_status_id: string; resolution?: string } = {
      workflow_status_id: transitionTargetId.value,
    }
    if (transitionTargetIsTerminal.value && transitionResolution.value.trim()) {
      body.resolution = transitionResolution.value.trim()
    }
    const updated = await transitionStatus(ticket.value.id, body)
    ticket.value = updated
    transitionDialogVisible.value = false
    void refreshActivity()
  } catch (e) {
    console.error(e)
  } finally {
    transitionLoading.value = false
  }
}

async function submitComment() {
  if (!ticket.value || isCommentEmpty(newCommentBody.value)) return
  commentPosting.value = true
  try {
    const created = await createComment(ticket.value.id, newCommentBody.value)
    comments.value = [...comments.value, created]
    newCommentBody.value = ''
    void refreshActivity()
  } catch (e) {
    console.error(e)
  } finally {
    commentPosting.value = false
  }
}

function startCommentEdit(c: Comment) {
  editingCommentId.value = c.id
  commentEditDraft.value = c.body
}

function cancelCommentEdit() {
  editingCommentId.value = null
  commentEditDraft.value = ''
}

async function saveCommentEdit(id: string) {
  commentSaving.value = true
  try {
    const updated = await updateComment(id, commentEditDraft.value)
    comments.value = comments.value.map(c => (c.id === id ? updated : c))
    cancelCommentEdit()
  } catch (e) {
    console.error(e)
  } finally {
    commentSaving.value = false
  }
}

async function removeComment(id: string) {
  try {
    await deleteComment(id)
    comments.value = comments.value.filter(c => c.id !== id)
  } catch (e) {
    console.error(e)
  }
}

async function onRemoveLabel(lbl: Label) {
  if (!ticket.value) return
  try {
    await removeLabelFromTicket(ticket.value.id, lbl.id)
    ticketLabels.value = ticketLabels.value.filter(l => l.id !== lbl.id)
  } catch (e) {
    console.error(e)
  }
}

async function confirmAddLabel() {
  if (!ticket.value || !labelToAdd.value) return
  try {
    await addLabelToTicket(ticket.value.id, labelToAdd.value)
    const meta = allProjectLabels.value.find(l => l.id === labelToAdd.value)
    if (meta) ticketLabels.value = [...ticketLabels.value, meta].sort((a, b) => a.name.localeCompare(b.name))
    labelToAdd.value = null
    labelDialogVisible.value = false
  } catch (e) {
    console.error(e)
  }
}

async function createAndAddLabel() {
  if (!ticket.value || !newLabelName.value.trim()) return
  savingNewLabel.value = true
  try {
    const created = await createLabel(ticket.value.project_id, {
      name: newLabelName.value.trim(),
      color: newLabelColor.value,
    })
    allProjectLabels.value = [...allProjectLabels.value, created].sort((a, b) => a.name.localeCompare(b.name))
    await addLabelToTicket(ticket.value.id, created.id)
    ticketLabels.value = [...ticketLabels.value, created].sort((a, b) => a.name.localeCompare(b.name))
    newLabelName.value = ''
    newLabelColor.value = '#6366F1'
    creatingNewLabel.value = false
    labelDialogVisible.value = false
  } catch (e) {
    console.error(e)
  } finally {
    savingNewLabel.value = false
  }
}

async function onCustomFieldChange(fieldId: string, value: unknown) {
  if (!ticket.value) return
  customFieldSaving.value = { ...customFieldSaving.value, [fieldId]: true }
  try {
    const result = await setTicketCustomFields(ticket.value.id, { [fieldId]: value })
    customFieldValues.value = result.values
    void refreshActivity()
  } catch (e) {
    console.error(e)
  } finally {
    customFieldSaving.value = { ...customFieldSaving.value, [fieldId]: false }
  }
}

watch(ticketId, () => {
  void loadTicketPage()
  subscribeWs()
})

watch(depDialogVisible, v => {
  if (v) {
    depType.value = 'blocks'
    depTargetTicketId.value = null
  }
})

watch(labelDialogVisible, v => {
  if (v) {
    labelToAdd.value = labelsAvailableToAdd.value[0]?.id ?? null
    creatingNewLabel.value = false
    newLabelName.value = ''
    newLabelColor.value = '#6366F1'
  }
})

function onWsTicketEvent(data: Record<string, unknown>) {
  const event = data.event as string | undefined
  if (!event) return
  if (event === 'comment.added' || event === 'comment.edited' || event === 'comment.deleted') {
    if (ticket.value) {
      listComments(ticket.value.id, 0, 100).then(res => {
        comments.value = res.items.filter(c => !c.is_deleted)
      }).catch(() => {})
    }
  } else if (event.startsWith('ticket.')) {
    void loadTicketPage()
  }
}

let currentWsChannel: string | null = null

function subscribeWs() {
  const tid = ticketId.value
  if (!tid) return
  const ch = `ticket:${tid}`
  if (currentWsChannel === ch) return
  if (currentWsChannel) {
    ws.unsubscribe(currentWsChannel)
    ws.off('event', onWsTicketEvent)
  }
  ws.subscribe(ch)
  ws.on('event', onWsTicketEvent)
  currentWsChannel = ch
}

function unsubscribeWs() {
  if (currentWsChannel) {
    ws.unsubscribe(currentWsChannel)
    ws.off('event', onWsTicketEvent)
    currentWsChannel = null
  }
}

onMounted(() => {
  void loadTicketPage()
  subscribeWs()
})

onUnmounted(() => {
  unsubscribeWs()
})
</script>

<style scoped>
.ticket-title-display {
  word-break: break-word;
}

.description-section :deep(.rich-text-editor) {
  border-radius: var(--p-border-radius-md, 6px);
}

.comment-body :deep(p) {
  margin: 0 0 0.5rem;
}

.comment-body :deep(p:last-child) {
  margin-bottom: 0;
}

.comment-body :deep(pre) {
  background: var(--p-surface-100, #f1f5f9);
  color: var(--p-text-color, #334155);
  padding: 12px 16px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.85rem;
  overflow-x: auto;
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  margin: 0.5rem 0;
}

.comment-body :deep(pre code) {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
  color: inherit;
}

.comment-body :deep(code) {
  background: var(--p-surface-100, #f1f5f9);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--p-text-color, #334155);
}

.comment-body :deep(blockquote) {
  border-left: 3px solid var(--p-primary-200, #bfdbfe);
  padding-left: 1rem;
  color: var(--p-text-muted-color, #64748b);
  margin: 0.5em 0;
}

.comment-body :deep(ul),
.comment-body :deep(ol) {
  padding-left: 1.5rem;
}

.comment-body :deep(h2) {
  font-size: 1.15rem;
  margin: 0.5em 0 0.25em;
}

.comment-body :deep(h3) {
  font-size: 1rem;
  margin: 0.5em 0 0.25em;
}

.label-chip {
  border-radius: 1rem;
}

.label-chip :deep(.p-chip-remove-icon) {
  color: inherit !important;
}
</style>
