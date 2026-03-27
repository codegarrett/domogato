import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Chip from 'primevue/chip';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Avatar from 'primevue/avatar';
import RichTextEditor from '@/components/editor/RichTextEditor.vue';
import { getTicket, updateTicket, transitionStatus, } from '@/api/tickets';
import { listComments, createComment, updateComment, deleteComment, } from '@/api/comments';
import { listLabels, createLabel, listTicketLabels, addLabelToTicket, removeLabelFromTicket, } from '@/api/labels';
import { listActivity } from '@/api/activity';
import { listFieldDefinitions, getTicketCustomFields, setTicketCustomFields, } from '@/api/custom-fields';
import CustomFieldRenderer from '@/components/custom-fields/CustomFieldRenderer.vue';
import { getProject, listProjectMembers } from '@/api/projects';
import { listSprints } from '@/api/sprints';
import { getEpic } from '@/api/epics';
import { listWorkflows } from '@/api/workflows';
import { logTime, listTimeLogs, getTimeSummary, deleteTimeLog, } from '@/api/time-tracking';
import { listAttachments as fetchAttachments, createAttachment as createAttachmentApi, uploadToPresignedUrl, getDownloadUrl, deleteAttachment as deleteAttachmentApi, formatFileSize, } from '@/api/attachments';
import { listDependencies as fetchDependencies, createDependency as createDependencyApi, deleteDependency as deleteDependencyApi, } from '@/api/dependencies';
import { listTickets } from '@/api/tickets';
import { getUserStoriesForTicket } from '@/api/kb';
import { listWatchers, addWatcher, removeWatcher } from '@/api/watchers';
import { useWebSocket } from '@/composables/useWebSocket';
import { useAuthStore } from '@/stores/auth';
const { t } = useI18n();
const route = useRoute();
const authStore = useAuthStore();
const ws = useWebSocket();
const { currentUser } = storeToRefs(authStore);
const ticketId = computed(() => route.params.ticketId);
const ticket = ref(null);
const loadError = ref(null);
const comments = ref([]);
const allProjectLabels = ref([]);
const ticketLabels = ref([]);
const members = ref([]);
const epic = ref(null);
const workflow = ref(null);
const userStories = ref([]);
const watchers = ref([]);
const projectSprints = ref([]);
const editingTitle = ref(false);
const titleDraft = ref('');
const titleInputRef = ref(null);
const descEditing = ref(false);
const descDraft = ref('');
const descSectionRef = ref(null);
const savingDescription = ref(false);
let descBlurTimer = null;
const newCommentBody = ref('');
const commentPosting = ref(false);
const editingCommentId = ref(null);
const commentEditDraft = ref('');
const commentSaving = ref(false);
const transitionDialogVisible = ref(false);
const transitionTargetId = ref(null);
const transitionResolution = ref('');
const transitionLoading = ref(false);
const activityEntries = ref([]);
const activityLoading = ref(false);
const customFieldDefs = ref([]);
const customFieldValues = ref({});
const customFieldSaving = ref({});
const labelDialogVisible = ref(false);
const labelToAdd = ref(null);
const creatingNewLabel = ref(false);
const newLabelName = ref('');
const newLabelColor = ref('#6366F1');
const savingNewLabel = ref(false);
const timeLogs = ref([]);
const timeSummary = ref(null);
const timeLogDialogVisible = ref(false);
const timeLogSaving = ref(false);
const timeLogHours = ref(null);
const timeLogMinutes = ref(null);
const timeLogDate = ref(new Date().toISOString().slice(0, 10));
const timeLogDescription = ref('');
const attachments = ref([]);
const attachmentUploading = ref(false);
const fileInputRef = ref(null);
const dependencies = ref([]);
const depDialogVisible = ref(false);
const depType = ref('blocks');
const depTargetTicketId = ref(null);
const depSaving = ref(false);
const projectTickets = ref([]);
const depTypeOptions = computed(() => [
    { label: t('dependencies.blocks'), value: 'blocks' },
    { label: t('dependencies.blockedBy'), value: 'blocked_by' },
    { label: t('dependencies.relatesTo'), value: 'relates_to' },
]);
const depTicketOptions = computed(() => {
    const current = ticket.value?.id;
    return projectTickets.value
        .filter(tk => tk.id !== current)
        .map(tk => ({
        label: `${tk.project_key ? tk.project_key + '-' : '#'}${tk.ticket_number} ${tk.title}`,
        value: tk.id,
    }));
});
const sprintOptions = computed(() => projectSprints.value
    .filter(s => s.status !== 'completed')
    .map(s => ({
    label: `${s.name}${s.status === 'active' ? ' ★' : ''}`,
    value: s.id,
})));
const currentSprint = computed(() => {
    if (!ticket.value?.sprint_id)
        return null;
    return projectSprints.value.find(s => s.id === ticket.value.sprint_id) ?? null;
});
const priorityOptions = computed(() => [
    { label: t('tickets.priorities.lowest'), value: 'lowest' },
    { label: t('tickets.priorities.low'), value: 'low' },
    { label: t('tickets.priorities.medium'), value: 'medium' },
    { label: t('tickets.priorities.high'), value: 'high' },
    { label: t('tickets.priorities.highest'), value: 'highest' },
]);
const assigneeOptions = computed(() => members.value.map(m => ({ label: m.display_name || m.email, value: m.user_id })));
const currentStatus = computed(() => {
    if (!ticket.value || !workflow.value)
        return null;
    return workflow.value.statuses.find(s => s.id === ticket.value.workflow_status_id) ?? null;
});
const currentStatusName = computed(() => currentStatus.value?.name ?? 'Unknown status');
const currentStatusStyle = computed(() => {
    const c = currentStatus.value?.color;
    if (!c)
        return {};
    return {
        background: c,
        color: '#fff',
        borderColor: c,
    };
});
const transitionOptions = computed(() => {
    if (!ticket.value || !workflow.value)
        return [];
    const from = ticket.value.workflow_status_id;
    const statusById = new Map(workflow.value.statuses.map(s => [s.id, s]));
    return workflow.value.transitions
        .filter(tr => tr.from_status_id === from)
        .map(tr => ({
        label: statusById.get(tr.to_status_id)?.name ?? tr.to_status_id,
        value: tr.to_status_id,
        terminal: statusById.get(tr.to_status_id)?.is_terminal ?? false,
    }));
});
const transitionTargetIsTerminal = computed(() => {
    if (!transitionTargetId.value || !workflow.value)
        return false;
    return workflow.value.statuses.find(s => s.id === transitionTargetId.value)?.is_terminal ?? false;
});
const labelsAvailableToAdd = computed(() => {
    const on = new Set(ticketLabels.value.map(l => l.id));
    return allProjectLabels.value.filter(l => !on.has(l.id));
});
function formatPriorityLabel(p) {
    return p.replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
}
function formatTypeLabel(tp) {
    return tp.replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
}
function prioritySeverity(p) {
    if (p === 'highest' || p === 'high')
        return 'danger';
    if (p === 'low' || p === 'lowest')
        return 'secondary';
    return 'info';
}
function formatRelativeTime(iso) {
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts))
        return iso;
    const sec = Math.round((Date.now() - ts) / 1000);
    if (sec < 45)
        return t('tickets.timeAgo.justNow');
    const min = Math.round(sec / 60);
    if (min < 60)
        return t('tickets.timeAgo.minutesAgo', { n: min });
    const hr = Math.round(min / 60);
    if (hr < 24)
        return t('tickets.timeAgo.hoursAgo', { n: hr });
    const day = Math.round(hr / 24);
    if (day < 30)
        return t('tickets.timeAgo.daysAgo', { n: day });
    const mo = Math.round(day / 30);
    if (mo < 12)
        return t('tickets.timeAgo.monthsAgo', { n: mo });
    return new Date(iso).toLocaleDateString();
}
function activityInitials(entry) {
    const n = entry.user_name || '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
        return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
}
function describeActivity(entry) {
    switch (entry.action) {
        case 'created':
            return t('tickets.activityLog.created');
        case 'comment_added':
            return t('tickets.activityLog.commentAdded');
        case 'transition': {
            const fromStatus = workflow.value?.statuses.find(s => s.id === entry.old_value);
            const toStatus = workflow.value?.statuses.find(s => s.id === entry.new_value);
            return t('tickets.activityLog.transition', {
                from: fromStatus?.name || entry.old_value || '?',
                to: toStatus?.name || entry.new_value || '?',
            });
        }
        case 'field_change': {
            const field = entry.field_name || '';
            const fieldLabel = t(`tickets.activityLog.fields.${field}`, field);
            if (entry.old_value && entry.new_value) {
                return t('tickets.activityLog.fieldChanged', { field: fieldLabel, from: entry.old_value, to: entry.new_value });
            }
            if (entry.new_value) {
                return t('tickets.activityLog.fieldSet', { field: fieldLabel, value: entry.new_value });
            }
            return t('tickets.activityLog.fieldCleared', { field: fieldLabel });
        }
        default:
            return entry.action;
    }
}
function authorInitials(c) {
    const n = c.author_name || c.author_email || '?';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
        return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
}
function canEditComment(c) {
    if (!currentUser.value || !c.author_id)
        return false;
    return c.author_id === currentUser.value.id;
}
function isCommentEmpty(html) {
    const txt = html.replace(/<[^>]+>/g, '').replace(/\s|&nbsp;/g, '');
    return txt.length === 0;
}
function chipStyle(lbl) {
    return {
        background: lbl.color || undefined,
        color: lbl.color ? '#fff' : undefined,
        borderColor: lbl.color || undefined,
    };
}
function toDateInputValue(d) {
    if (!d)
        return '';
    return d.length >= 10 ? d.slice(0, 10) : d;
}
function formatDuration(totalSeconds) {
    if (totalSeconds === null || totalSeconds === undefined)
        return '—';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h === 0 && m === 0)
        return '0m';
    const parts = [];
    if (h > 0)
        parts.push(`${h}h`);
    if (m > 0)
        parts.push(`${m}m`);
    return parts.join(' ');
}
async function loadTimeData() {
    if (!ticket.value)
        return;
    try {
        const [logsRes, summary] = await Promise.all([
            listTimeLogs(ticket.value.id, { limit: 100 }),
            getTimeSummary(ticket.value.id),
        ]);
        timeLogs.value = logsRes.items;
        timeSummary.value = summary;
    }
    catch { /* ignore */ }
}
function openLogTimeDialog() {
    timeLogHours.value = null;
    timeLogMinutes.value = null;
    timeLogDate.value = new Date().toISOString().slice(0, 10);
    timeLogDescription.value = '';
    timeLogDialogVisible.value = true;
}
async function submitTimeLog() {
    if (!ticket.value)
        return;
    const h = timeLogHours.value ?? 0;
    const m = timeLogMinutes.value ?? 0;
    const seconds = h * 3600 + m * 60;
    if (seconds <= 0)
        return;
    timeLogSaving.value = true;
    try {
        await logTime(ticket.value.id, {
            seconds_spent: seconds,
            work_date: timeLogDate.value,
            description: timeLogDescription.value || undefined,
        });
        timeLogDialogVisible.value = false;
        await loadTimeData();
    }
    catch (e) {
        console.error(e);
    }
    finally {
        timeLogSaving.value = false;
    }
}
async function removeTimeLog(logId) {
    try {
        await deleteTimeLog(logId);
        await loadTimeData();
    }
    catch (e) {
        console.error(e);
    }
}
function depLabel(dep) {
    const tid = ticket.value?.id;
    if (dep.dependency_type === 'relates_to')
        return t('dependencies.relatesTo');
    if (dep.blocking_ticket_id === tid)
        return t('dependencies.blocks');
    return t('dependencies.blockedBy');
}
function depSeverity(dep) {
    const tid = ticket.value?.id;
    if (dep.dependency_type === 'relates_to')
        return 'info';
    if (dep.blocking_ticket_id === tid)
        return 'warn';
    return 'danger';
}
function depTargetId(dep) {
    const tid = ticket.value?.id;
    return dep.blocking_ticket_id === tid ? dep.blocked_ticket_id : dep.blocking_ticket_id;
}
function depTargetKey(dep) {
    const tid = ticket.value?.id;
    return (dep.blocking_ticket_id === tid ? dep.blocked_ticket_key : dep.blocking_ticket_key) || '';
}
function depTargetTitle(dep) {
    const tid = ticket.value?.id;
    return (dep.blocking_ticket_id === tid ? dep.blocked_ticket_title : dep.blocking_ticket_title) || '';
}
async function loadDependencies() {
    if (!ticket.value)
        return;
    try {
        dependencies.value = await fetchDependencies(ticket.value.id);
    }
    catch { /* ignore */ }
}
async function loadProjectTickets() {
    if (!ticket.value)
        return;
    try {
        const res = await listTickets(ticket.value.project_id, { limit: 200 });
        projectTickets.value = res.items.map((tk) => ({
            id: tk.id,
            title: tk.title,
            ticket_number: tk.ticket_number,
            project_key: tk.project_key,
        }));
    }
    catch { /* ignore */ }
}
async function submitDependency() {
    if (!ticket.value || !depTargetTicketId.value)
        return;
    depSaving.value = true;
    try {
        await createDependencyApi(ticket.value.id, {
            blocked_ticket_id: depTargetTicketId.value,
            dependency_type: depType.value,
        });
        depDialogVisible.value = false;
        await loadDependencies();
    }
    catch (e) {
        console.error(e);
    }
    finally {
        depSaving.value = false;
    }
}
async function removeDependency(depId) {
    try {
        await deleteDependencyApi(depId);
        dependencies.value = dependencies.value.filter(d => d.id !== depId);
    }
    catch (e) {
        console.error(e);
    }
}
function fileIcon(contentType) {
    if (contentType.startsWith('image/'))
        return 'pi pi-image';
    if (contentType === 'application/pdf')
        return 'pi pi-file-pdf';
    if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType === 'text/csv')
        return 'pi pi-file-excel';
    if (contentType.includes('word') || contentType.includes('document'))
        return 'pi pi-file-word';
    if (contentType.startsWith('video/'))
        return 'pi pi-video';
    if (contentType.startsWith('audio/'))
        return 'pi pi-volume-up';
    if (contentType.includes('zip') || contentType.includes('tar') || contentType.includes('gzip'))
        return 'pi pi-box';
    return 'pi pi-file';
}
async function loadAttachments() {
    if (!ticket.value)
        return;
    try {
        const res = await fetchAttachments(ticket.value.id, { limit: 100 });
        attachments.value = res.items;
    }
    catch { /* ignore */ }
}
function triggerFileInput() {
    fileInputRef.value?.click();
}
async function onFileSelected(event) {
    const input = event.target;
    const files = input.files;
    if (!files || files.length === 0 || !ticket.value)
        return;
    attachmentUploading.value = true;
    try {
        for (const file of Array.from(files)) {
            const { upload_url } = await createAttachmentApi(ticket.value.id, {
                filename: file.name,
                content_type: file.type || 'application/octet-stream',
                size_bytes: file.size,
            });
            await uploadToPresignedUrl(upload_url, file);
        }
        await loadAttachments();
    }
    catch (e) {
        console.error(e);
    }
    finally {
        attachmentUploading.value = false;
        input.value = '';
    }
}
async function downloadFile(att) {
    try {
        const url = await getDownloadUrl(att.id);
        window.open(url, '_blank');
    }
    catch (e) {
        console.error(e);
    }
}
async function removeAttachment(attId) {
    try {
        await deleteAttachmentApi(attId);
        attachments.value = attachments.value.filter(a => a.id !== attId);
    }
    catch (e) {
        console.error(e);
    }
}
async function loadTicketPage() {
    loadError.value = null;
    const id = ticketId.value;
    if (!id) {
        loadError.value = t('tickets.missingId');
        ticket.value = null;
        return;
    }
    if (ticket.value?.id !== id) {
        ticket.value = null;
        workflow.value = null;
        epic.value = null;
    }
    try {
        const tk = await getTicket(id);
        ticket.value = tk;
        descDraft.value = tk.description ?? '';
        const proj = await getProject(tk.project_id);
        activityLoading.value = true;
        const [commentsRes, lblProj, memRes, wfRes, tLabels, actRes, cfDefs, cfVals] = await Promise.all([
            listComments(tk.id, 0, 100),
            listLabels(tk.project_id),
            listProjectMembers(tk.project_id, 0, 200),
            listWorkflows(proj.organization_id, 0, 100),
            listTicketLabels(tk.id),
            listActivity(tk.id, 0, 100),
            listFieldDefinitions(tk.project_id),
            getTicketCustomFields(tk.id),
        ]);
        comments.value = commentsRes.items.filter(c => !c.is_deleted);
        allProjectLabels.value = lblProj;
        members.value = memRes.items;
        ticketLabels.value = tLabels;
        activityEntries.value = actRes.items;
        activityLoading.value = false;
        customFieldDefs.value = cfDefs;
        customFieldValues.value = cfVals.values;
        const wf = wfRes.items.find(w => w.statuses.some(s => s.id === tk.workflow_status_id)) ?? null;
        workflow.value = wf;
        if (tk.epic_id) {
            epic.value = await getEpic(tk.epic_id);
        }
        void loadTimeData();
        void loadAttachments();
        void loadDependencies();
        void loadProjectTickets();
        void loadSprints();
        void loadUserStories(tk.id);
        void loadWatchers(tk.id);
    }
    catch (e) {
        console.error(e);
        loadError.value = t('tickets.loadFailed');
    }
}
async function refreshActivity() {
    if (!ticket.value)
        return;
    try {
        const res = await listActivity(ticket.value.id, 0, 100);
        activityEntries.value = res.items;
    }
    catch { /* ignore */ }
}
async function patchTicket(payload) {
    if (!ticket.value)
        return;
    const updated = await updateTicket(ticket.value.id, payload);
    ticket.value = updated;
    descDraft.value = updated.description ?? '';
    void refreshActivity();
}
function startTitleEdit() {
    if (!ticket.value)
        return;
    titleDraft.value = ticket.value.title;
    editingTitle.value = true;
    void nextTick(() => {
        const root = titleInputRef.value;
        const el = root?.$el;
        const input = (el?.tagName === 'INPUT' ? el : el?.querySelector?.('input'));
        input?.focus();
        input?.select();
    });
}
function cancelTitleEdit() {
    editingTitle.value = false;
    if (ticket.value)
        titleDraft.value = ticket.value.title;
}
async function commitTitle() {
    if (!editingTitle.value || !ticket.value)
        return;
    const next = titleDraft.value.trim();
    if (!next) {
        titleDraft.value = ticket.value.title;
        editingTitle.value = false;
        return;
    }
    if (next === ticket.value.title) {
        editingTitle.value = false;
        return;
    }
    try {
        await patchTicket({ title: next });
    }
    catch (e) {
        console.error(e);
    }
    finally {
        editingTitle.value = false;
    }
}
function startDescriptionEdit() {
    if (!ticket.value)
        return;
    descDraft.value = ticket.value.description ?? '';
    descEditing.value = true;
}
function cancelDescriptionEdit() {
    clearDescBlurTimer();
    if (ticket.value)
        descDraft.value = ticket.value.description ?? '';
    descEditing.value = false;
}
function clearDescBlurTimer() {
    if (descBlurTimer) {
        clearTimeout(descBlurTimer);
        descBlurTimer = null;
    }
}
async function saveDescriptionExplicit() {
    clearDescBlurTimer();
    if (!ticket.value || !descEditing.value)
        return;
    savingDescription.value = true;
    try {
        await patchTicket({ description: descDraft.value || null });
        descEditing.value = false;
    }
    catch (e) {
        console.error(e);
    }
    finally {
        savingDescription.value = false;
    }
}
function onDescriptionSectionClick() {
    if (!descEditing.value && ticket.value)
        startDescriptionEdit();
}
function onDescriptionFocusOut(ev) {
    if (!descEditing.value)
        return;
    const root = descSectionRef.value;
    const next = ev.relatedTarget;
    if (root && next && root.contains(next))
        return;
    clearDescBlurTimer();
    descBlurTimer = setTimeout(() => {
        descBlurTimer = null;
        void saveDescriptionFromBlur();
    }, 120);
}
async function saveDescriptionFromBlur() {
    if (!descEditing.value || !ticket.value || savingDescription.value)
        return;
    const current = ticket.value.description ?? '';
    if (descDraft.value === current) {
        descEditing.value = false;
        return;
    }
    savingDescription.value = true;
    try {
        await patchTicket({ description: descDraft.value || null });
        descEditing.value = false;
    }
    catch (e) {
        console.error(e);
    }
    finally {
        savingDescription.value = false;
    }
}
async function onPriorityChange(value) {
    if (!ticket.value || value === ticket.value.priority)
        return;
    try {
        await patchTicket({ priority: value });
    }
    catch (e) {
        console.error(e);
    }
}
async function onAssigneeChange(value) {
    if (!ticket.value)
        return;
    const next = value ?? null;
    const cur = ticket.value.assignee_id ?? null;
    if (next === cur)
        return;
    try {
        await patchTicket({ assignee_id: next });
    }
    catch (e) {
        console.error(e);
    }
}
async function onSprintChange(value) {
    if (!ticket.value)
        return;
    const next = value ?? null;
    const cur = ticket.value.sprint_id ?? null;
    if (next === cur)
        return;
    try {
        await patchTicket({ sprint_id: next });
    }
    catch (e) {
        console.error(e);
    }
}
async function loadSprints() {
    if (!ticket.value)
        return;
    try {
        const res = await listSprints(ticket.value.project_id, { limit: 100 });
        projectSprints.value = res.items;
    }
    catch { /* ignore */ }
}
async function loadUserStories(ticketId) {
    try {
        userStories.value = await getUserStoriesForTicket(ticketId);
    }
    catch { /* ignore */ }
}
async function loadWatchers(tid) {
    try {
        watchers.value = await listWatchers(tid);
    }
    catch { /* ignore */ }
}
const isWatching = computed(() => {
    const uid = currentUser.value?.id;
    return uid ? watchers.value.some((w) => w.user_id === uid) : false;
});
async function watchTicket() {
    if (!ticket.value || !currentUser.value)
        return;
    try {
        await addWatcher(ticket.value.id, currentUser.value.id);
        await loadWatchers(ticket.value.id);
    }
    catch { /* ignore */ }
}
async function unwatchTicket() {
    if (!ticket.value || !currentUser.value)
        return;
    try {
        await removeWatcher(ticket.value.id, currentUser.value.id);
        await loadWatchers(ticket.value.id);
    }
    catch { /* ignore */ }
}
async function onStoryPointsChange(value) {
    if (!ticket.value)
        return;
    const n = value === null || value === undefined ? null : value;
    if (n === ticket.value.story_points)
        return;
    try {
        await patchTicket({ story_points: n });
    }
    catch (e) {
        console.error(e);
    }
}
async function onDateFieldChange(field, raw) {
    if (!ticket.value)
        return;
    const v = raw && raw.length ? raw : null;
    const cur = ticket.value[field];
    const curS = cur ? toDateInputValue(cur) : '';
    if ((v ?? '') === curS)
        return;
    try {
        await patchTicket({ [field]: v });
    }
    catch (e) {
        console.error(e);
    }
}
function onStartDateChange(ev) {
    const v = ev.target.value;
    void onDateFieldChange('start_date', v);
}
function onDueDateChange(ev) {
    const v = ev.target.value;
    void onDateFieldChange('due_date', v);
}
function openTransitionDialog() {
    transitionTargetId.value = transitionOptions.value[0]?.value ?? null;
    transitionResolution.value = '';
    transitionDialogVisible.value = true;
}
async function applyTransition() {
    if (!ticket.value || !transitionTargetId.value)
        return;
    transitionLoading.value = true;
    try {
        const body = {
            workflow_status_id: transitionTargetId.value,
        };
        if (transitionTargetIsTerminal.value && transitionResolution.value.trim()) {
            body.resolution = transitionResolution.value.trim();
        }
        const updated = await transitionStatus(ticket.value.id, body);
        ticket.value = updated;
        transitionDialogVisible.value = false;
        void refreshActivity();
    }
    catch (e) {
        console.error(e);
    }
    finally {
        transitionLoading.value = false;
    }
}
async function submitComment() {
    if (!ticket.value || isCommentEmpty(newCommentBody.value))
        return;
    commentPosting.value = true;
    try {
        const created = await createComment(ticket.value.id, newCommentBody.value);
        comments.value = [...comments.value, created];
        newCommentBody.value = '';
        void refreshActivity();
    }
    catch (e) {
        console.error(e);
    }
    finally {
        commentPosting.value = false;
    }
}
function startCommentEdit(c) {
    editingCommentId.value = c.id;
    commentEditDraft.value = c.body;
}
function cancelCommentEdit() {
    editingCommentId.value = null;
    commentEditDraft.value = '';
}
async function saveCommentEdit(id) {
    commentSaving.value = true;
    try {
        const updated = await updateComment(id, commentEditDraft.value);
        comments.value = comments.value.map(c => (c.id === id ? updated : c));
        cancelCommentEdit();
    }
    catch (e) {
        console.error(e);
    }
    finally {
        commentSaving.value = false;
    }
}
async function removeComment(id) {
    try {
        await deleteComment(id);
        comments.value = comments.value.filter(c => c.id !== id);
    }
    catch (e) {
        console.error(e);
    }
}
async function onRemoveLabel(lbl) {
    if (!ticket.value)
        return;
    try {
        await removeLabelFromTicket(ticket.value.id, lbl.id);
        ticketLabels.value = ticketLabels.value.filter(l => l.id !== lbl.id);
    }
    catch (e) {
        console.error(e);
    }
}
async function confirmAddLabel() {
    if (!ticket.value || !labelToAdd.value)
        return;
    try {
        await addLabelToTicket(ticket.value.id, labelToAdd.value);
        const meta = allProjectLabels.value.find(l => l.id === labelToAdd.value);
        if (meta)
            ticketLabels.value = [...ticketLabels.value, meta].sort((a, b) => a.name.localeCompare(b.name));
        labelToAdd.value = null;
        labelDialogVisible.value = false;
    }
    catch (e) {
        console.error(e);
    }
}
async function createAndAddLabel() {
    if (!ticket.value || !newLabelName.value.trim())
        return;
    savingNewLabel.value = true;
    try {
        const created = await createLabel(ticket.value.project_id, {
            name: newLabelName.value.trim(),
            color: newLabelColor.value,
        });
        allProjectLabels.value = [...allProjectLabels.value, created].sort((a, b) => a.name.localeCompare(b.name));
        await addLabelToTicket(ticket.value.id, created.id);
        ticketLabels.value = [...ticketLabels.value, created].sort((a, b) => a.name.localeCompare(b.name));
        newLabelName.value = '';
        newLabelColor.value = '#6366F1';
        creatingNewLabel.value = false;
        labelDialogVisible.value = false;
    }
    catch (e) {
        console.error(e);
    }
    finally {
        savingNewLabel.value = false;
    }
}
async function onCustomFieldChange(fieldId, value) {
    if (!ticket.value)
        return;
    customFieldSaving.value = { ...customFieldSaving.value, [fieldId]: true };
    try {
        const result = await setTicketCustomFields(ticket.value.id, { [fieldId]: value });
        customFieldValues.value = result.values;
        void refreshActivity();
    }
    catch (e) {
        console.error(e);
    }
    finally {
        customFieldSaving.value = { ...customFieldSaving.value, [fieldId]: false };
    }
}
watch(ticketId, () => {
    void loadTicketPage();
    subscribeWs();
});
watch(depDialogVisible, v => {
    if (v) {
        depType.value = 'blocks';
        depTargetTicketId.value = null;
    }
});
watch(labelDialogVisible, v => {
    if (v) {
        labelToAdd.value = labelsAvailableToAdd.value[0]?.id ?? null;
        creatingNewLabel.value = false;
        newLabelName.value = '';
        newLabelColor.value = '#6366F1';
    }
});
function onWsTicketEvent(data) {
    const event = data.event;
    if (!event)
        return;
    if (event === 'comment.added' || event === 'comment.edited' || event === 'comment.deleted') {
        if (ticket.value) {
            listComments(ticket.value.id, 0, 100).then(res => {
                comments.value = res.items.filter(c => !c.is_deleted);
            }).catch(() => { });
        }
    }
    else if (event.startsWith('ticket.')) {
        void loadTicketPage();
    }
}
let currentWsChannel = null;
function subscribeWs() {
    const tid = ticketId.value;
    if (!tid)
        return;
    const ch = `ticket:${tid}`;
    if (currentWsChannel === ch)
        return;
    if (currentWsChannel) {
        ws.unsubscribe(currentWsChannel);
        ws.off('event', onWsTicketEvent);
    }
    ws.subscribe(ch);
    ws.on('event', onWsTicketEvent);
    currentWsChannel = ch;
}
function unsubscribeWs() {
    if (currentWsChannel) {
        ws.unsubscribe(currentWsChannel);
        ws.off('event', onWsTicketEvent);
        currentWsChannel = null;
    }
}
onMounted(() => {
    void loadTicketPage();
    subscribeWs();
});
onUnmounted(() => {
    unsubscribeWs();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['label-chip']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.loadError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "m-0 text-color-secondary" },
    });
    (__VLS_ctx.loadError);
    const __VLS_0 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.retry')),
        ...{ class: "mt-3" },
        icon: "pi pi-refresh",
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.retry')),
        ...{ class: "mt-3" },
        icon: "pi pi-refresh",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (__VLS_ctx.loadTicketPage)
    };
    var __VLS_3;
}
else if (!__VLS_ctx.ticket) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center p-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner text-4xl text-color-secondary" },
        'aria-hidden': "true",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ticket-detail" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 lg:col-8" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-wrap align-items-center gap-2 mb-3" },
    });
    if (__VLS_ctx.ticket.ticket_key) {
        const __VLS_8 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            value: (__VLS_ctx.ticket.ticket_key),
            severity: "info",
            ...{ class: "font-semibold" },
        }));
        const __VLS_10 = __VLS_9({
            value: (__VLS_ctx.ticket.ticket_key),
            severity: "info",
            ...{ class: "font-semibold" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    }
    else {
        const __VLS_12 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            value: (`#${__VLS_ctx.ticket.ticket_number}`),
            severity: "secondary",
        }));
        const __VLS_14 = __VLS_13({
            value: (`#${__VLS_ctx.ticket.ticket_number}`),
            severity: "secondary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
    if (!__VLS_ctx.editingTitle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.startTitleEdit) },
            ...{ class: "flex align-items-center gap-2 flex-1 min-w-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
            ...{ class: "m-0 text-2xl font-semibold cursor-pointer ticket-title-display" },
        });
        (__VLS_ctx.ticket.title);
        const __VLS_16 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            ...{ 'onClick': {} },
            icon: "pi pi-pencil",
            text: true,
            rounded: true,
            severity: "secondary",
            'aria-label': (__VLS_ctx.$t('common.edit')),
        }));
        const __VLS_18 = __VLS_17({
            ...{ 'onClick': {} },
            icon: "pi pi-pencil",
            text: true,
            rounded: true,
            severity: "secondary",
            'aria-label': (__VLS_ctx.$t('common.edit')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        let __VLS_20;
        let __VLS_21;
        let __VLS_22;
        const __VLS_23 = {
            onClick: (__VLS_ctx.startTitleEdit)
        };
        var __VLS_19;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap align-items-center gap-2 flex-1 min-w-0" },
        });
        const __VLS_24 = {}.InputText;
        /** @type {[typeof __VLS_components.InputText, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            ...{ 'onKeydown': {} },
            ...{ 'onKeydown': {} },
            ref: "titleInputRef",
            modelValue: (__VLS_ctx.titleDraft),
            ...{ class: "flex-1 min-w-0" },
        }));
        const __VLS_26 = __VLS_25({
            ...{ 'onKeydown': {} },
            ...{ 'onKeydown': {} },
            ref: "titleInputRef",
            modelValue: (__VLS_ctx.titleDraft),
            ...{ class: "flex-1 min-w-0" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        let __VLS_28;
        let __VLS_29;
        let __VLS_30;
        const __VLS_31 = {
            onKeydown: (__VLS_ctx.commitTitle)
        };
        const __VLS_32 = {
            onKeydown: (__VLS_ctx.cancelTitleEdit)
        };
        /** @type {typeof __VLS_ctx.titleInputRef} */ ;
        var __VLS_33 = {};
        var __VLS_27;
        const __VLS_35 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
            ...{ 'onMousedown': {} },
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.save')),
            size: "small",
        }));
        const __VLS_37 = __VLS_36({
            ...{ 'onMousedown': {} },
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.save')),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        let __VLS_39;
        let __VLS_40;
        let __VLS_41;
        const __VLS_42 = {
            onMousedown: () => { }
        };
        const __VLS_43 = {
            onClick: (__VLS_ctx.commitTitle)
        };
        var __VLS_38;
        const __VLS_44 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            ...{ 'onMousedown': {} },
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            size: "small",
            severity: "secondary",
            outlined: true,
        }));
        const __VLS_46 = __VLS_45({
            ...{ 'onMousedown': {} },
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            size: "small",
            severity: "secondary",
            outlined: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        let __VLS_48;
        let __VLS_49;
        let __VLS_50;
        const __VLS_51 = {
            onMousedown: () => { }
        };
        const __VLS_52 = {
            onClick: (__VLS_ctx.cancelTitleEdit)
        };
        var __VLS_47;
    }
    const __VLS_53 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
        value: (__VLS_ctx.formatPriorityLabel(__VLS_ctx.ticket.priority)),
        severity: (__VLS_ctx.prioritySeverity(__VLS_ctx.ticket.priority)),
    }));
    const __VLS_55 = __VLS_54({
        value: (__VLS_ctx.formatPriorityLabel(__VLS_ctx.ticket.priority)),
        severity: (__VLS_ctx.prioritySeverity(__VLS_ctx.ticket.priority)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_54));
    const __VLS_57 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
        value: (__VLS_ctx.formatTypeLabel(__VLS_ctx.ticket.ticket_type)),
        severity: "secondary",
    }));
    const __VLS_59 = __VLS_58({
        value: (__VLS_ctx.formatTypeLabel(__VLS_ctx.ticket.ticket_type)),
        severity: "secondary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_58));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1 mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm font-semibold text-color-secondary" },
    });
    (__VLS_ctx.$t('common.description'));
    if (__VLS_ctx.descEditing) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-2" },
        });
        const __VLS_61 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.save')),
            size: "small",
            icon: "pi pi-check",
            loading: (__VLS_ctx.savingDescription),
        }));
        const __VLS_63 = __VLS_62({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.save')),
            size: "small",
            icon: "pi pi-check",
            loading: (__VLS_ctx.savingDescription),
        }, ...__VLS_functionalComponentArgsRest(__VLS_62));
        let __VLS_65;
        let __VLS_66;
        let __VLS_67;
        const __VLS_68 = {
            onClick: (__VLS_ctx.saveDescriptionExplicit)
        };
        var __VLS_64;
        const __VLS_69 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
            ...{ 'onMousedown': {} },
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            size: "small",
            severity: "secondary",
            outlined: true,
            icon: "pi pi-times",
        }));
        const __VLS_71 = __VLS_70({
            ...{ 'onMousedown': {} },
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            size: "small",
            severity: "secondary",
            outlined: true,
            icon: "pi pi-times",
        }, ...__VLS_functionalComponentArgsRest(__VLS_70));
        let __VLS_73;
        let __VLS_74;
        let __VLS_75;
        const __VLS_76 = {
            onMousedown: () => { }
        };
        const __VLS_77 = {
            onClick: (__VLS_ctx.cancelDescriptionEdit)
        };
        var __VLS_72;
    }
    else {
        const __VLS_78 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.edit')),
            size: "small",
            text: true,
            icon: "pi pi-pencil",
        }));
        const __VLS_80 = __VLS_79({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.edit')),
            size: "small",
            text: true,
            icon: "pi pi-pencil",
        }, ...__VLS_functionalComponentArgsRest(__VLS_79));
        let __VLS_82;
        let __VLS_83;
        let __VLS_84;
        const __VLS_85 = {
            onClick: (__VLS_ctx.startDescriptionEdit)
        };
        var __VLS_81;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onFocusout: (__VLS_ctx.onDescriptionFocusOut) },
        ...{ onClick: (__VLS_ctx.onDescriptionSectionClick) },
        ref: "descSectionRef",
        ...{ class: "description-section" },
        tabindex: "-1",
        ...{ class: ({ 'cursor-pointer': !__VLS_ctx.descEditing }) },
    });
    /** @type {typeof __VLS_ctx.descSectionRef} */ ;
    /** @type {[typeof RichTextEditor, ]} */ ;
    // @ts-ignore
    const __VLS_86 = __VLS_asFunctionalComponent(RichTextEditor, new RichTextEditor({
        modelValue: (__VLS_ctx.descDraft),
        readonly: (!__VLS_ctx.descEditing),
        placeholder: (__VLS_ctx.$t('tickets.descriptionPlaceholder')),
    }));
    const __VLS_87 = __VLS_86({
        modelValue: (__VLS_ctx.descDraft),
        readonly: (!__VLS_ctx.descEditing),
        placeholder: (__VLS_ctx.$t('tickets.descriptionPlaceholder')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_86));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-0 border-round shadow-1 overflow-hidden" },
    });
    const __VLS_89 = {}.TabView;
    /** @type {[typeof __VLS_components.TabView, typeof __VLS_components.TabView, ]} */ ;
    // @ts-ignore
    const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({}));
    const __VLS_91 = __VLS_90({}, ...__VLS_functionalComponentArgsRest(__VLS_90));
    __VLS_92.slots.default;
    const __VLS_93 = {}.TabPanel;
    /** @type {[typeof __VLS_components.TabPanel, typeof __VLS_components.TabPanel, ]} */ ;
    // @ts-ignore
    const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
        value: "0",
        header: (__VLS_ctx.$t('tickets.comments')),
    }));
    const __VLS_95 = __VLS_94({
        value: "0",
        header: (__VLS_ctx.$t('tickets.comments')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_94));
    __VLS_96.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "p-4 pt-3" },
    });
    if (__VLS_ctx.comments.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm mb-4" },
        });
        (__VLS_ctx.$t('tickets.noComments'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-4 mb-4" },
        });
        for (const [c] of __VLS_getVForSourceType((__VLS_ctx.comments))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (c.id),
                ...{ class: "flex gap-3 comment-row" },
            });
            const __VLS_97 = {}.Avatar;
            /** @type {[typeof __VLS_components.Avatar, ]} */ ;
            // @ts-ignore
            const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
                label: (__VLS_ctx.authorInitials(c)),
                shape: "circle",
                ...{ class: "flex-shrink-0 bg-primary text-primary-contrast" },
                ...{ style: {} },
            }));
            const __VLS_99 = __VLS_98({
                label: (__VLS_ctx.authorInitials(c)),
                shape: "circle",
                ...{ class: "flex-shrink-0 bg-primary text-primary-contrast" },
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_98));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex-1 min-w-0" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex flex-wrap align-items-center gap-2 mb-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold" },
            });
            (c.author_name || 'Unknown');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-color-secondary text-sm" },
            });
            (__VLS_ctx.formatRelativeTime(c.created_at));
            if (c.is_edited) {
                const __VLS_101 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_102 = __VLS_asFunctionalComponent(__VLS_101, new __VLS_101({
                    value: (__VLS_ctx.$t('tickets.edited')),
                    severity: "secondary",
                    ...{ class: "text-xs" },
                }));
                const __VLS_103 = __VLS_102({
                    value: (__VLS_ctx.$t('tickets.edited')),
                    severity: "secondary",
                    ...{ class: "text-xs" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_102));
            }
            if (__VLS_ctx.editingCommentId === c.id) {
                /** @type {[typeof RichTextEditor, ]} */ ;
                // @ts-ignore
                const __VLS_105 = __VLS_asFunctionalComponent(RichTextEditor, new RichTextEditor({
                    modelValue: (__VLS_ctx.commentEditDraft),
                    ...{ class: "mb-2" },
                    placeholder: (__VLS_ctx.$t('tickets.commentPlaceholder')),
                }));
                const __VLS_106 = __VLS_105({
                    modelValue: (__VLS_ctx.commentEditDraft),
                    ...{ class: "mb-2" },
                    placeholder: (__VLS_ctx.$t('tickets.commentPlaceholder')),
                }, ...__VLS_functionalComponentArgsRest(__VLS_105));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex gap-2" },
                });
                const __VLS_108 = {}.Button;
                /** @type {[typeof __VLS_components.Button, ]} */ ;
                // @ts-ignore
                const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
                    ...{ 'onClick': {} },
                    label: (__VLS_ctx.$t('common.save')),
                    size: "small",
                    loading: (__VLS_ctx.commentSaving),
                }));
                const __VLS_110 = __VLS_109({
                    ...{ 'onClick': {} },
                    label: (__VLS_ctx.$t('common.save')),
                    size: "small",
                    loading: (__VLS_ctx.commentSaving),
                }, ...__VLS_functionalComponentArgsRest(__VLS_109));
                let __VLS_112;
                let __VLS_113;
                let __VLS_114;
                const __VLS_115 = {
                    onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loadError))
                            return;
                        if (!!(!__VLS_ctx.ticket))
                            return;
                        if (!!(__VLS_ctx.comments.length === 0))
                            return;
                        if (!(__VLS_ctx.editingCommentId === c.id))
                            return;
                        __VLS_ctx.saveCommentEdit(c.id);
                    }
                };
                var __VLS_111;
                const __VLS_116 = {}.Button;
                /** @type {[typeof __VLS_components.Button, ]} */ ;
                // @ts-ignore
                const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
                    ...{ 'onClick': {} },
                    label: (__VLS_ctx.$t('common.cancel')),
                    size: "small",
                    severity: "secondary",
                    outlined: true,
                }));
                const __VLS_118 = __VLS_117({
                    ...{ 'onClick': {} },
                    label: (__VLS_ctx.$t('common.cancel')),
                    size: "small",
                    severity: "secondary",
                    outlined: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_117));
                let __VLS_120;
                let __VLS_121;
                let __VLS_122;
                const __VLS_123 = {
                    onClick: (__VLS_ctx.cancelCommentEdit)
                };
                var __VLS_119;
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                    ...{ class: "comment-body text-sm" },
                });
                __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (c.body) }, null, null);
                if (__VLS_ctx.canEditComment(c)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "flex gap-2 mt-2" },
                    });
                    const __VLS_124 = {}.Button;
                    /** @type {[typeof __VLS_components.Button, ]} */ ;
                    // @ts-ignore
                    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
                        ...{ 'onClick': {} },
                        label: (__VLS_ctx.$t('common.edit')),
                        size: "small",
                        text: true,
                        icon: "pi pi-pencil",
                    }));
                    const __VLS_126 = __VLS_125({
                        ...{ 'onClick': {} },
                        label: (__VLS_ctx.$t('common.edit')),
                        size: "small",
                        text: true,
                        icon: "pi pi-pencil",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
                    let __VLS_128;
                    let __VLS_129;
                    let __VLS_130;
                    const __VLS_131 = {
                        onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.loadError))
                                return;
                            if (!!(!__VLS_ctx.ticket))
                                return;
                            if (!!(__VLS_ctx.comments.length === 0))
                                return;
                            if (!!(__VLS_ctx.editingCommentId === c.id))
                                return;
                            if (!(__VLS_ctx.canEditComment(c)))
                                return;
                            __VLS_ctx.startCommentEdit(c);
                        }
                    };
                    var __VLS_127;
                    const __VLS_132 = {}.Button;
                    /** @type {[typeof __VLS_components.Button, ]} */ ;
                    // @ts-ignore
                    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
                        ...{ 'onClick': {} },
                        label: (__VLS_ctx.$t('common.delete')),
                        size: "small",
                        text: true,
                        severity: "danger",
                        icon: "pi pi-trash",
                    }));
                    const __VLS_134 = __VLS_133({
                        ...{ 'onClick': {} },
                        label: (__VLS_ctx.$t('common.delete')),
                        size: "small",
                        text: true,
                        severity: "danger",
                        icon: "pi pi-trash",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
                    let __VLS_136;
                    let __VLS_137;
                    let __VLS_138;
                    const __VLS_139 = {
                        onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.loadError))
                                return;
                            if (!!(!__VLS_ctx.ticket))
                                return;
                            if (!!(__VLS_ctx.comments.length === 0))
                                return;
                            if (!!(__VLS_ctx.editingCommentId === c.id))
                                return;
                            if (!(__VLS_ctx.canEditComment(c)))
                                return;
                            __VLS_ctx.removeComment(c.id);
                        }
                    };
                    var __VLS_135;
                }
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "border-top-1 surface-border pt-4 mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-semibold text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('tickets.addComment'));
    /** @type {[typeof RichTextEditor, ]} */ ;
    // @ts-ignore
    const __VLS_140 = __VLS_asFunctionalComponent(RichTextEditor, new RichTextEditor({
        modelValue: (__VLS_ctx.newCommentBody),
        placeholder: (__VLS_ctx.$t('tickets.commentPlaceholder')),
        ...{ class: "mb-3" },
    }));
    const __VLS_141 = __VLS_140({
        modelValue: (__VLS_ctx.newCommentBody),
        placeholder: (__VLS_ctx.$t('tickets.commentPlaceholder')),
        ...{ class: "mb-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_140));
    const __VLS_143 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.comment')),
        icon: "pi pi-send",
        loading: (__VLS_ctx.commentPosting),
        disabled: (__VLS_ctx.isCommentEmpty(__VLS_ctx.newCommentBody)),
    }));
    const __VLS_145 = __VLS_144({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.comment')),
        icon: "pi pi-send",
        loading: (__VLS_ctx.commentPosting),
        disabled: (__VLS_ctx.isCommentEmpty(__VLS_ctx.newCommentBody)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_144));
    let __VLS_147;
    let __VLS_148;
    let __VLS_149;
    const __VLS_150 = {
        onClick: (__VLS_ctx.submitComment)
    };
    var __VLS_146;
    var __VLS_96;
    const __VLS_151 = {}.TabPanel;
    /** @type {[typeof __VLS_components.TabPanel, typeof __VLS_components.TabPanel, ]} */ ;
    // @ts-ignore
    const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
        value: "1",
        header: (__VLS_ctx.$t('tickets.activity')),
    }));
    const __VLS_153 = __VLS_152({
        value: "1",
        header: (__VLS_ctx.$t('tickets.activity')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_152));
    __VLS_154.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "p-4 pt-3" },
    });
    if (__VLS_ctx.activityLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-center p-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-spin pi-spinner text-xl text-color-secondary" },
        });
    }
    else if (__VLS_ctx.activityEntries.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('tickets.noActivity'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-3" },
        });
        for (const [entry] of __VLS_getVForSourceType((__VLS_ctx.activityEntries))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (entry.id),
                ...{ class: "flex gap-3 align-items-start" },
            });
            const __VLS_155 = {}.Avatar;
            /** @type {[typeof __VLS_components.Avatar, ]} */ ;
            // @ts-ignore
            const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
                label: (__VLS_ctx.activityInitials(entry)),
                shape: "circle",
                ...{ class: "flex-shrink-0 bg-primary-100 text-primary-700" },
                ...{ style: {} },
            }));
            const __VLS_157 = __VLS_156({
                label: (__VLS_ctx.activityInitials(entry)),
                shape: "circle",
                ...{ class: "flex-shrink-0 bg-primary-100 text-primary-700" },
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_156));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex-1 min-w-0" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-sm" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold" },
            });
            (entry.user_name || __VLS_ctx.$t('tickets.system'));
            (' ');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-color-secondary" },
            });
            (__VLS_ctx.describeActivity(entry));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-color-secondary mt-1" },
            });
            (__VLS_ctx.formatRelativeTime(entry.created_at));
        }
    }
    var __VLS_154;
    const __VLS_159 = {}.TabPanel;
    /** @type {[typeof __VLS_components.TabPanel, typeof __VLS_components.TabPanel, ]} */ ;
    // @ts-ignore
    const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
        value: "2",
        header: (__VLS_ctx.$t('timeTracking.timeLog')),
    }));
    const __VLS_161 = __VLS_160({
        value: "2",
        header: (__VLS_ctx.$t('timeTracking.timeLog')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_160));
    __VLS_162.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "p-4 pt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm text-color-secondary" },
    });
    (__VLS_ctx.$t('timeTracking.totalLogged'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.formatDuration(__VLS_ctx.timeSummary?.total_logged_seconds ?? 0));
    const __VLS_163 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('timeTracking.logWork')),
        icon: "pi pi-plus",
        size: "small",
    }));
    const __VLS_165 = __VLS_164({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('timeTracking.logWork')),
        icon: "pi pi-plus",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_164));
    let __VLS_167;
    let __VLS_168;
    let __VLS_169;
    const __VLS_170 = {
        onClick: (__VLS_ctx.openLogTimeDialog)
    };
    var __VLS_166;
    if (__VLS_ctx.timeLogs.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('timeTracking.noEntries'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-2" },
        });
        for (const [entry] of __VLS_getVForSourceType((__VLS_ctx.timeLogs))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (entry.id),
                ...{ class: "surface-50 p-3 border-round flex align-items-center justify-content-between" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex-1 min-w-0" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex align-items-center gap-2 mb-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold text-sm" },
            });
            (__VLS_ctx.formatDuration(entry.seconds_spent));
            const __VLS_171 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
                value: (entry.work_date),
                severity: "secondary",
                ...{ class: "text-xs" },
            }));
            const __VLS_173 = __VLS_172({
                value: (entry.work_date),
                severity: "secondary",
                ...{ class: "text-xs" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_172));
            if (entry.activity_type !== 'general') {
                const __VLS_175 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
                    value: (entry.activity_type),
                    severity: "info",
                    ...{ class: "text-xs" },
                }));
                const __VLS_177 = __VLS_176({
                    value: (entry.activity_type),
                    severity: "info",
                    ...{ class: "text-xs" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_176));
            }
            if (entry.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "text-xs text-color-secondary" },
                });
                (entry.description);
            }
            if (entry.user_id === __VLS_ctx.currentUser?.id) {
                const __VLS_179 = {}.Button;
                /** @type {[typeof __VLS_components.Button, ]} */ ;
                // @ts-ignore
                const __VLS_180 = __VLS_asFunctionalComponent(__VLS_179, new __VLS_179({
                    ...{ 'onClick': {} },
                    icon: "pi pi-trash",
                    severity: "danger",
                    text: true,
                    rounded: true,
                    size: "small",
                }));
                const __VLS_181 = __VLS_180({
                    ...{ 'onClick': {} },
                    icon: "pi pi-trash",
                    severity: "danger",
                    text: true,
                    rounded: true,
                    size: "small",
                }, ...__VLS_functionalComponentArgsRest(__VLS_180));
                let __VLS_183;
                let __VLS_184;
                let __VLS_185;
                const __VLS_186 = {
                    onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loadError))
                            return;
                        if (!!(!__VLS_ctx.ticket))
                            return;
                        if (!!(__VLS_ctx.timeLogs.length === 0))
                            return;
                        if (!(entry.user_id === __VLS_ctx.currentUser?.id))
                            return;
                        __VLS_ctx.removeTimeLog(entry.id);
                    }
                };
                var __VLS_182;
            }
        }
    }
    var __VLS_162;
    const __VLS_187 = {}.TabPanel;
    /** @type {[typeof __VLS_components.TabPanel, typeof __VLS_components.TabPanel, ]} */ ;
    // @ts-ignore
    const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
        value: "3",
        header: (__VLS_ctx.$t('attachments.title')),
    }));
    const __VLS_189 = __VLS_188({
        value: "3",
        header: (__VLS_ctx.$t('attachments.title')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_188));
    __VLS_190.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "p-4 pt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm text-color-secondary" },
    });
    (__VLS_ctx.$t('attachments.count', { n: __VLS_ctx.attachments.length }));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-2 align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.onFileSelected) },
        ref: "fileInputRef",
        type: "file",
        multiple: true,
        ...{ class: "hidden" },
    });
    /** @type {typeof __VLS_ctx.fileInputRef} */ ;
    const __VLS_191 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('attachments.upload')),
        icon: "pi pi-upload",
        size: "small",
        loading: (__VLS_ctx.attachmentUploading),
    }));
    const __VLS_193 = __VLS_192({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('attachments.upload')),
        icon: "pi pi-upload",
        size: "small",
        loading: (__VLS_ctx.attachmentUploading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
    let __VLS_195;
    let __VLS_196;
    let __VLS_197;
    const __VLS_198 = {
        onClick: (__VLS_ctx.triggerFileInput)
    };
    var __VLS_194;
    if (__VLS_ctx.attachments.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('attachments.noFiles'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-2" },
        });
        for (const [att] of __VLS_getVForSourceType((__VLS_ctx.attachments))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (att.id),
                ...{ class: "surface-50 p-3 border-round flex align-items-center justify-content-between" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex align-items-center gap-3 flex-1 min-w-0" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: (__VLS_ctx.fileIcon(att.content_type)) },
                ...{ class: "text-xl text-color-secondary" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex-1 min-w-0" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loadError))
                            return;
                        if (!!(!__VLS_ctx.ticket))
                            return;
                        if (!!(__VLS_ctx.attachments.length === 0))
                            return;
                        __VLS_ctx.downloadFile(att);
                    } },
                ...{ class: "font-semibold text-sm text-primary cursor-pointer hover:underline" },
            });
            (att.filename);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-color-secondary mt-1" },
            });
            (__VLS_ctx.formatFileSize(att.size_bytes));
            (__VLS_ctx.formatRelativeTime(att.created_at));
            const __VLS_199 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
                ...{ 'onClick': {} },
                icon: "pi pi-trash",
                severity: "danger",
                text: true,
                rounded: true,
                size: "small",
            }));
            const __VLS_201 = __VLS_200({
                ...{ 'onClick': {} },
                icon: "pi pi-trash",
                severity: "danger",
                text: true,
                rounded: true,
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_200));
            let __VLS_203;
            let __VLS_204;
            let __VLS_205;
            const __VLS_206 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadError))
                        return;
                    if (!!(!__VLS_ctx.ticket))
                        return;
                    if (!!(__VLS_ctx.attachments.length === 0))
                        return;
                    __VLS_ctx.removeAttachment(att.id);
                }
            };
            var __VLS_202;
        }
    }
    var __VLS_190;
    var __VLS_92;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 lg:col-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('common.status'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between gap-2 flex-wrap" },
    });
    const __VLS_207 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
        value: (__VLS_ctx.currentStatusName),
        ...{ style: (__VLS_ctx.currentStatusStyle) },
        ...{ class: "font-medium" },
    }));
    const __VLS_209 = __VLS_208({
        value: (__VLS_ctx.currentStatusName),
        ...{ style: (__VLS_ctx.currentStatusStyle) },
        ...{ class: "font-medium" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_208));
    const __VLS_211 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('tickets.transition')),
        icon: "pi pi-arrow-right",
        size: "small",
        outlined: true,
        disabled: (!__VLS_ctx.transitionOptions.length),
    }));
    const __VLS_213 = __VLS_212({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('tickets.transition')),
        icon: "pi pi-arrow-right",
        size: "small",
        outlined: true,
        disabled: (!__VLS_ctx.transitionOptions.length),
    }, ...__VLS_functionalComponentArgsRest(__VLS_212));
    let __VLS_215;
    let __VLS_216;
    let __VLS_217;
    const __VLS_218 = {
        onClick: (__VLS_ctx.openTransitionDialog)
    };
    var __VLS_214;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('tickets.assignee'));
    const __VLS_219 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.ticket.assignee_id),
        options: (__VLS_ctx.assigneeOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.unassigned')),
        ...{ class: "w-full" },
        showClear: true,
    }));
    const __VLS_221 = __VLS_220({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.ticket.assignee_id),
        options: (__VLS_ctx.assigneeOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.unassigned')),
        ...{ class: "w-full" },
        showClear: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_220));
    let __VLS_223;
    let __VLS_224;
    let __VLS_225;
    const __VLS_226 = {
        'onUpdate:modelValue': (__VLS_ctx.onAssigneeChange)
    };
    var __VLS_222;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('tickets.priority'));
    const __VLS_227 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.ticket.priority),
        options: (__VLS_ctx.priorityOptions),
        optionLabel: "label",
        optionValue: "value",
        ...{ class: "w-full" },
    }));
    const __VLS_229 = __VLS_228({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.ticket.priority),
        options: (__VLS_ctx.priorityOptions),
        optionLabel: "label",
        optionValue: "value",
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_228));
    let __VLS_231;
    let __VLS_232;
    let __VLS_233;
    const __VLS_234 = {
        'onUpdate:modelValue': (__VLS_ctx.onPriorityChange)
    };
    var __VLS_230;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('tickets.type'));
    const __VLS_235 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
        value: (__VLS_ctx.formatTypeLabel(__VLS_ctx.ticket.ticket_type)),
        severity: "secondary",
    }));
    const __VLS_237 = __VLS_236({
        value: (__VLS_ctx.formatTypeLabel(__VLS_ctx.ticket.ticket_type)),
        severity: "secondary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_236));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('nav.sprints'));
    const __VLS_239 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.ticket.sprint_id),
        options: (__VLS_ctx.sprintOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.noSprint')),
        ...{ class: "w-full" },
        showClear: true,
    }));
    const __VLS_241 = __VLS_240({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.ticket.sprint_id),
        options: (__VLS_ctx.sprintOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.noSprint')),
        ...{ class: "w-full" },
        showClear: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_240));
    let __VLS_243;
    let __VLS_244;
    let __VLS_245;
    const __VLS_246 = {
        'onUpdate:modelValue': (__VLS_ctx.onSprintChange)
    };
    var __VLS_242;
    if (__VLS_ctx.ticket.sprint_id && __VLS_ctx.currentSprint) {
        const __VLS_247 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
        // @ts-ignore
        const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
            to: (`/projects/${__VLS_ctx.ticket.project_id}/sprints`),
            ...{ class: "text-xs text-primary no-underline hover:underline mt-2 inline-block" },
        }));
        const __VLS_249 = __VLS_248({
            to: (`/projects/${__VLS_ctx.ticket.project_id}/sprints`),
            ...{ class: "text-xs text-primary no-underline hover:underline mt-2 inline-block" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_248));
        __VLS_250.slots.default;
        (__VLS_ctx.currentSprint.name);
        if (__VLS_ctx.currentSprint.status) {
            const __VLS_251 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
                value: (__VLS_ctx.currentSprint.status),
                severity: (__VLS_ctx.currentSprint.status === 'active' ? 'success' : __VLS_ctx.currentSprint.status === 'completed' ? 'secondary' : 'info'),
                ...{ class: "text-xs ml-1" },
            }));
            const __VLS_253 = __VLS_252({
                value: (__VLS_ctx.currentSprint.status),
                severity: (__VLS_ctx.currentSprint.status === 'active' ? 'success' : __VLS_ctx.currentSprint.status === 'completed' ? 'secondary' : 'info'),
                ...{ class: "text-xs ml-1" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_252));
        }
        var __VLS_250;
    }
    if (__VLS_ctx.ticket.epic_id) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "surface-card p-4 border-round shadow-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-sm font-semibold text-color-secondary mb-2" },
        });
        (__VLS_ctx.$t('tickets.epic'));
        if (__VLS_ctx.epic) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.epic.title);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-color-secondary text-sm" },
            });
            (__VLS_ctx.$t('common.loading'));
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('tickets.storyPoints'));
    const __VLS_255 = {}.InputNumber;
    /** @type {[typeof __VLS_components.InputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.ticket.story_points ?? null),
        ...{ class: "w-full" },
        min: (0),
        max: (999),
        showButtons: true,
        buttonLayout: "horizontal",
        step: (1),
    }));
    const __VLS_257 = __VLS_256({
        ...{ 'onUpdate:modelValue': {} },
        modelValue: (__VLS_ctx.ticket.story_points ?? null),
        ...{ class: "w-full" },
        min: (0),
        max: (999),
        showButtons: true,
        buttonLayout: "horizontal",
        step: (1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_256));
    let __VLS_259;
    let __VLS_260;
    let __VLS_261;
    const __VLS_262 = {
        'onUpdate:modelValue': (__VLS_ctx.onStoryPointsChange)
    };
    var __VLS_258;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('tickets.dates'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-xs text-color-secondary mb-1" },
    });
    (__VLS_ctx.$t('tickets.startDate'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.onStartDateChange) },
        ...{ class: "p-inputtext p-component w-full border-round" },
        type: "date",
        value: (__VLS_ctx.toDateInputValue(__VLS_ctx.ticket.start_date)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-xs text-color-secondary mb-1" },
    });
    (__VLS_ctx.$t('tickets.dueDate'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.onDueDateChange) },
        ...{ class: "p-inputtext p-component w-full border-round" },
        type: "date",
        value: (__VLS_ctx.toDateInputValue(__VLS_ctx.ticket.due_date)),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm font-semibold text-color-secondary" },
    });
    (__VLS_ctx.$t('tickets.labels'));
    const __VLS_263 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.add')),
        icon: "pi pi-plus",
        size: "small",
        text: true,
    }));
    const __VLS_265 = __VLS_264({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.add')),
        icon: "pi pi-plus",
        size: "small",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_264));
    let __VLS_267;
    let __VLS_268;
    let __VLS_269;
    const __VLS_270 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.loadError))
                return;
            if (!!(!__VLS_ctx.ticket))
                return;
            __VLS_ctx.labelDialogVisible = true;
        }
    };
    var __VLS_266;
    if (__VLS_ctx.ticketLabels.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('tickets.noLabels'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap gap-2" },
        });
        for (const [lbl] of __VLS_getVForSourceType((__VLS_ctx.ticketLabels))) {
            const __VLS_271 = {}.Chip;
            /** @type {[typeof __VLS_components.Chip, ]} */ ;
            // @ts-ignore
            const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
                ...{ 'onRemove': {} },
                key: (lbl.id),
                label: (lbl.name),
                removable: true,
                ...{ class: "label-chip" },
                ...{ style: (__VLS_ctx.chipStyle(lbl)) },
            }));
            const __VLS_273 = __VLS_272({
                ...{ 'onRemove': {} },
                key: (lbl.id),
                label: (lbl.name),
                removable: true,
                ...{ class: "label-chip" },
                ...{ style: (__VLS_ctx.chipStyle(lbl)) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_272));
            let __VLS_275;
            let __VLS_276;
            let __VLS_277;
            const __VLS_278 = {
                onRemove: (...[$event]) => {
                    if (!!(__VLS_ctx.loadError))
                        return;
                    if (!!(!__VLS_ctx.ticket))
                        return;
                    if (!!(__VLS_ctx.ticketLabels.length === 0))
                        return;
                    __VLS_ctx.onRemoveLabel(lbl);
                }
            };
            var __VLS_274;
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm font-semibold text-color-secondary" },
    });
    if (!__VLS_ctx.isWatching) {
        const __VLS_279 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
            ...{ 'onClick': {} },
            label: "Watch",
            icon: "pi pi-eye",
            size: "small",
            text: true,
        }));
        const __VLS_281 = __VLS_280({
            ...{ 'onClick': {} },
            label: "Watch",
            icon: "pi pi-eye",
            size: "small",
            text: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_280));
        let __VLS_283;
        let __VLS_284;
        let __VLS_285;
        const __VLS_286 = {
            onClick: (__VLS_ctx.watchTicket)
        };
        var __VLS_282;
    }
    else {
        const __VLS_287 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_288 = __VLS_asFunctionalComponent(__VLS_287, new __VLS_287({
            ...{ 'onClick': {} },
            label: "Unwatch",
            icon: "pi pi-eye-slash",
            size: "small",
            text: true,
            severity: "secondary",
        }));
        const __VLS_289 = __VLS_288({
            ...{ 'onClick': {} },
            label: "Unwatch",
            icon: "pi pi-eye-slash",
            size: "small",
            text: true,
            severity: "secondary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_288));
        let __VLS_291;
        let __VLS_292;
        let __VLS_293;
        const __VLS_294 = {
            onClick: (__VLS_ctx.unwatchTicket)
        };
        var __VLS_290;
    }
    if (__VLS_ctx.watchers.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-wrap gap-2" },
        });
        for (const [w] of __VLS_getVForSourceType((__VLS_ctx.watchers))) {
            const __VLS_295 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_296 = __VLS_asFunctionalComponent(__VLS_295, new __VLS_295({
                key: (w.user_id),
                value: (w.display_name || 'User'),
                severity: "secondary",
                ...{ class: "text-xs" },
            }));
            const __VLS_297 = __VLS_296({
                key: (w.user_id),
                value: (w.display_name || 'User'),
                severity: "secondary",
                ...{ class: "text-xs" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_296));
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm font-semibold text-color-secondary" },
    });
    (__VLS_ctx.$t('dependencies.title'));
    const __VLS_299 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_300 = __VLS_asFunctionalComponent(__VLS_299, new __VLS_299({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.add')),
        icon: "pi pi-plus",
        size: "small",
        text: true,
    }));
    const __VLS_301 = __VLS_300({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.add')),
        icon: "pi pi-plus",
        size: "small",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_300));
    let __VLS_303;
    let __VLS_304;
    let __VLS_305;
    const __VLS_306 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.loadError))
                return;
            if (!!(!__VLS_ctx.ticket))
                return;
            __VLS_ctx.depDialogVisible = true;
        }
    };
    var __VLS_302;
    if (__VLS_ctx.dependencies.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('dependencies.none'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-2" },
        });
        for (const [dep] of __VLS_getVForSourceType((__VLS_ctx.dependencies))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (dep.id),
                ...{ class: "surface-50 p-2 border-round flex align-items-center justify-content-between" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex align-items-center gap-2 flex-1 min-w-0" },
            });
            const __VLS_307 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
                value: (__VLS_ctx.depLabel(dep)),
                severity: (__VLS_ctx.depSeverity(dep)),
                ...{ class: "text-xs flex-shrink-0" },
            }));
            const __VLS_309 = __VLS_308({
                value: (__VLS_ctx.depLabel(dep)),
                severity: (__VLS_ctx.depSeverity(dep)),
                ...{ class: "text-xs flex-shrink-0" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_308));
            const __VLS_311 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
            // @ts-ignore
            const __VLS_312 = __VLS_asFunctionalComponent(__VLS_311, new __VLS_311({
                to: (`/tickets/${__VLS_ctx.depTargetId(dep)}`),
                ...{ class: "text-sm text-primary no-underline hover:underline flex-1 min-w-0 overflow-hidden text-overflow-ellipsis white-space-nowrap" },
            }));
            const __VLS_313 = __VLS_312({
                to: (`/tickets/${__VLS_ctx.depTargetId(dep)}`),
                ...{ class: "text-sm text-primary no-underline hover:underline flex-1 min-w-0 overflow-hidden text-overflow-ellipsis white-space-nowrap" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_312));
            __VLS_314.slots.default;
            (__VLS_ctx.depTargetKey(dep));
            (__VLS_ctx.depTargetTitle(dep));
            var __VLS_314;
            const __VLS_315 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                severity: "danger",
                text: true,
                rounded: true,
                size: "small",
            }));
            const __VLS_317 = __VLS_316({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                severity: "danger",
                text: true,
                rounded: true,
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_316));
            let __VLS_319;
            let __VLS_320;
            let __VLS_321;
            const __VLS_322 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadError))
                        return;
                    if (!!(!__VLS_ctx.ticket))
                        return;
                    if (!!(__VLS_ctx.dependencies.length === 0))
                        return;
                    __VLS_ctx.removeDependency(dep.id);
                }
            };
            var __VLS_318;
        }
    }
    if (__VLS_ctx.userStories.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "surface-card p-4 border-round shadow-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-sm font-semibold text-color-secondary mb-2" },
        });
        (__VLS_ctx.$t('kb.relatedStories'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-2" },
        });
        for (const [story] of __VLS_getVForSourceType((__VLS_ctx.userStories))) {
            const __VLS_323 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
            // @ts-ignore
            const __VLS_324 = __VLS_asFunctionalComponent(__VLS_323, new __VLS_323({
                key: (story.page_id),
                to: (`/projects/${__VLS_ctx.ticket.project_id}/kb/${story.space_slug}/${story.page_slug}`),
                ...{ class: "surface-50 p-2 border-round flex align-items-center gap-2 no-underline text-color hover:surface-100" },
            }));
            const __VLS_325 = __VLS_324({
                key: (story.page_id),
                to: (`/projects/${__VLS_ctx.ticket.project_id}/kb/${story.space_slug}/${story.page_slug}`),
                ...{ class: "surface-50 p-2 border-round flex align-items-center gap-2 no-underline text-color hover:surface-100" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_324));
            __VLS_326.slots.default;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-clipboard text-primary text-sm" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-sm flex-1" },
            });
            (story.page_title);
            if (story.story_status_name) {
                const __VLS_327 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_328 = __VLS_asFunctionalComponent(__VLS_327, new __VLS_327({
                    value: (story.story_status_name),
                    ...{ style: (story.story_status_color ? { background: story.story_status_color, color: '#fff', fontSize: '0.7rem' } : {}) },
                    ...{ class: "text-xs" },
                }));
                const __VLS_329 = __VLS_328({
                    value: (story.story_status_name),
                    ...{ style: (story.story_status_color ? { background: story.story_status_color, color: '#fff', fontSize: '0.7rem' } : {}) },
                    ...{ class: "text-xs" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_328));
            }
            var __VLS_326;
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm font-semibold text-color-secondary" },
    });
    (__VLS_ctx.$t('timeTracking.title'));
    const __VLS_331 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_332 = __VLS_asFunctionalComponent(__VLS_331, new __VLS_331({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('timeTracking.logWork')),
        icon: "pi pi-clock",
        size: "small",
        text: true,
    }));
    const __VLS_333 = __VLS_332({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('timeTracking.logWork')),
        icon: "pi pi-clock",
        size: "small",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_332));
    let __VLS_335;
    let __VLS_336;
    let __VLS_337;
    const __VLS_338 = {
        onClick: (__VLS_ctx.openLogTimeDialog)
    };
    var __VLS_334;
    if (__VLS_ctx.timeSummary) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-2 text-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-color-secondary" },
        });
        (__VLS_ctx.$t('timeTracking.logged'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "font-semibold" },
        });
        (__VLS_ctx.formatDuration(__VLS_ctx.timeSummary.total_logged_seconds));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-color-secondary" },
        });
        (__VLS_ctx.$t('timeTracking.estimate'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDuration(__VLS_ctx.timeSummary.original_estimate_seconds));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-color-secondary" },
        });
        (__VLS_ctx.$t('timeTracking.remaining'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDuration(__VLS_ctx.timeSummary.remaining_estimate_seconds));
        if (__VLS_ctx.timeSummary.original_estimate_seconds && __VLS_ctx.timeSummary.original_estimate_seconds > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "h-1rem border-round overflow-hidden bg-surface-100" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ class: "h-full border-round" },
                ...{ style: ({
                        width: Math.min(100, Math.round((__VLS_ctx.timeSummary.total_logged_seconds / __VLS_ctx.timeSummary.original_estimate_seconds) * 100)) + '%',
                        background: __VLS_ctx.timeSummary.total_logged_seconds > __VLS_ctx.timeSummary.original_estimate_seconds ? 'var(--p-red-500)' : 'var(--p-primary-color)',
                    }) },
            });
        }
    }
    if (__VLS_ctx.customFieldDefs.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "surface-card p-4 border-round shadow-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-sm font-semibold text-color-secondary mb-3" },
        });
        (__VLS_ctx.$t('customFields.title'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-3" },
        });
        for (const [defn] of __VLS_getVForSourceType((__VLS_ctx.customFieldDefs))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (defn.id),
            });
            if (defn.field_type !== 'checkbox') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "block text-xs text-color-secondary mb-1" },
                });
                (defn.name);
                if (defn.is_required) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "text-red-500" },
                    });
                }
            }
            /** @type {[typeof CustomFieldRenderer, ]} */ ;
            // @ts-ignore
            const __VLS_339 = __VLS_asFunctionalComponent(CustomFieldRenderer, new CustomFieldRenderer({
                ...{ 'onUpdate:modelValue': {} },
                definition: (defn),
                modelValue: (__VLS_ctx.customFieldValues[defn.id]),
                disabled: (__VLS_ctx.customFieldSaving[defn.id]),
            }));
            const __VLS_340 = __VLS_339({
                ...{ 'onUpdate:modelValue': {} },
                definition: (defn),
                modelValue: (__VLS_ctx.customFieldValues[defn.id]),
                disabled: (__VLS_ctx.customFieldSaving[defn.id]),
            }, ...__VLS_functionalComponentArgsRest(__VLS_339));
            let __VLS_342;
            let __VLS_343;
            let __VLS_344;
            const __VLS_345 = {
                'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.loadError))
                        return;
                    if (!!(!__VLS_ctx.ticket))
                        return;
                    if (!(__VLS_ctx.customFieldDefs.length > 0))
                        return;
                    __VLS_ctx.onCustomFieldChange(defn.id, $event);
                }
            };
            var __VLS_341;
        }
    }
    const __VLS_346 = {}.Dialog;
    /** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
    // @ts-ignore
    const __VLS_347 = __VLS_asFunctionalComponent(__VLS_346, new __VLS_346({
        visible: (__VLS_ctx.transitionDialogVisible),
        header: (__VLS_ctx.$t('tickets.changeStatus')),
        modal: true,
        ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
    }));
    const __VLS_348 = __VLS_347({
        visible: (__VLS_ctx.transitionDialogVisible),
        header: (__VLS_ctx.$t('tickets.changeStatus')),
        modal: true,
        ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_347));
    __VLS_349.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('tickets.newStatus'));
    const __VLS_350 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_351 = __VLS_asFunctionalComponent(__VLS_350, new __VLS_350({
        modelValue: (__VLS_ctx.transitionTargetId),
        options: (__VLS_ctx.transitionOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.selectStatus')),
        ...{ class: "w-full" },
    }));
    const __VLS_352 = __VLS_351({
        modelValue: (__VLS_ctx.transitionTargetId),
        options: (__VLS_ctx.transitionOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.selectStatus')),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_351));
    if (__VLS_ctx.transitionTargetIsTerminal) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm text-color-secondary mb-2" },
        });
        (__VLS_ctx.$t('tickets.resolution'));
        const __VLS_354 = {}.Textarea;
        /** @type {[typeof __VLS_components.Textarea, ]} */ ;
        // @ts-ignore
        const __VLS_355 = __VLS_asFunctionalComponent(__VLS_354, new __VLS_354({
            modelValue: (__VLS_ctx.transitionResolution),
            rows: "3",
            ...{ class: "w-full" },
            autoResize: true,
            placeholder: (__VLS_ctx.$t('tickets.resolutionPlaceholder')),
        }));
        const __VLS_356 = __VLS_355({
            modelValue: (__VLS_ctx.transitionResolution),
            rows: "3",
            ...{ class: "w-full" },
            autoResize: true,
            placeholder: (__VLS_ctx.$t('tickets.resolutionPlaceholder')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_355));
    }
    {
        const { footer: __VLS_thisSlot } = __VLS_349.slots;
        const __VLS_358 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_359 = __VLS_asFunctionalComponent(__VLS_358, new __VLS_358({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            severity: "secondary",
            outlined: true,
        }));
        const __VLS_360 = __VLS_359({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            severity: "secondary",
            outlined: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_359));
        let __VLS_362;
        let __VLS_363;
        let __VLS_364;
        const __VLS_365 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadError))
                    return;
                if (!!(!__VLS_ctx.ticket))
                    return;
                __VLS_ctx.transitionDialogVisible = false;
            }
        };
        var __VLS_361;
        const __VLS_366 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_367 = __VLS_asFunctionalComponent(__VLS_366, new __VLS_366({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.apply')),
            icon: "pi pi-check",
            loading: (__VLS_ctx.transitionLoading),
            disabled: (!__VLS_ctx.transitionTargetId),
        }));
        const __VLS_368 = __VLS_367({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.apply')),
            icon: "pi pi-check",
            loading: (__VLS_ctx.transitionLoading),
            disabled: (!__VLS_ctx.transitionTargetId),
        }, ...__VLS_functionalComponentArgsRest(__VLS_367));
        let __VLS_370;
        let __VLS_371;
        let __VLS_372;
        const __VLS_373 = {
            onClick: (__VLS_ctx.applyTransition)
        };
        var __VLS_369;
    }
    var __VLS_349;
    const __VLS_374 = {}.Dialog;
    /** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
    // @ts-ignore
    const __VLS_375 = __VLS_asFunctionalComponent(__VLS_374, new __VLS_374({
        visible: (__VLS_ctx.timeLogDialogVisible),
        header: (__VLS_ctx.$t('timeTracking.logWork')),
        modal: true,
        ...{ style: ({ width: '26rem', maxWidth: '95vw' }) },
    }));
    const __VLS_376 = __VLS_375({
        visible: (__VLS_ctx.timeLogDialogVisible),
        header: (__VLS_ctx.$t('timeTracking.logWork')),
        modal: true,
        ...{ style: ({ width: '26rem', maxWidth: '95vw' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_375));
    __VLS_377.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm text-color-secondary mb-1" },
    });
    (__VLS_ctx.$t('timeTracking.hours'));
    const __VLS_378 = {}.InputNumber;
    /** @type {[typeof __VLS_components.InputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_379 = __VLS_asFunctionalComponent(__VLS_378, new __VLS_378({
        modelValue: (__VLS_ctx.timeLogHours),
        min: (0),
        max: (99),
        ...{ class: "w-full" },
        placeholder: ('0'),
    }));
    const __VLS_380 = __VLS_379({
        modelValue: (__VLS_ctx.timeLogHours),
        min: (0),
        max: (99),
        ...{ class: "w-full" },
        placeholder: ('0'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_379));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm text-color-secondary mb-1" },
    });
    (__VLS_ctx.$t('timeTracking.minutes'));
    const __VLS_382 = {}.InputNumber;
    /** @type {[typeof __VLS_components.InputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_383 = __VLS_asFunctionalComponent(__VLS_382, new __VLS_382({
        modelValue: (__VLS_ctx.timeLogMinutes),
        min: (0),
        max: (59),
        ...{ class: "w-full" },
        placeholder: ('0'),
    }));
    const __VLS_384 = __VLS_383({
        modelValue: (__VLS_ctx.timeLogMinutes),
        min: (0),
        max: (59),
        ...{ class: "w-full" },
        placeholder: ('0'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_383));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm text-color-secondary mb-1" },
    });
    (__VLS_ctx.$t('timeTracking.workDate'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "date",
        ...{ class: "p-inputtext p-component w-full border-round" },
    });
    (__VLS_ctx.timeLogDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm text-color-secondary mb-1" },
    });
    (__VLS_ctx.$t('common.description'));
    const __VLS_386 = {}.Textarea;
    /** @type {[typeof __VLS_components.Textarea, ]} */ ;
    // @ts-ignore
    const __VLS_387 = __VLS_asFunctionalComponent(__VLS_386, new __VLS_386({
        modelValue: (__VLS_ctx.timeLogDescription),
        rows: "2",
        ...{ class: "w-full" },
        placeholder: (__VLS_ctx.$t('timeTracking.descriptionPlaceholder')),
    }));
    const __VLS_388 = __VLS_387({
        modelValue: (__VLS_ctx.timeLogDescription),
        rows: "2",
        ...{ class: "w-full" },
        placeholder: (__VLS_ctx.$t('timeTracking.descriptionPlaceholder')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_387));
    {
        const { footer: __VLS_thisSlot } = __VLS_377.slots;
        const __VLS_390 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_391 = __VLS_asFunctionalComponent(__VLS_390, new __VLS_390({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            severity: "secondary",
            outlined: true,
        }));
        const __VLS_392 = __VLS_391({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            severity: "secondary",
            outlined: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_391));
        let __VLS_394;
        let __VLS_395;
        let __VLS_396;
        const __VLS_397 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadError))
                    return;
                if (!!(!__VLS_ctx.ticket))
                    return;
                __VLS_ctx.timeLogDialogVisible = false;
            }
        };
        var __VLS_393;
        const __VLS_398 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_399 = __VLS_asFunctionalComponent(__VLS_398, new __VLS_398({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('timeTracking.logWork')),
            icon: "pi pi-clock",
            loading: (__VLS_ctx.timeLogSaving),
            disabled: (((__VLS_ctx.timeLogHours ?? 0) * 60 + (__VLS_ctx.timeLogMinutes ?? 0)) <= 0),
        }));
        const __VLS_400 = __VLS_399({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('timeTracking.logWork')),
            icon: "pi pi-clock",
            loading: (__VLS_ctx.timeLogSaving),
            disabled: (((__VLS_ctx.timeLogHours ?? 0) * 60 + (__VLS_ctx.timeLogMinutes ?? 0)) <= 0),
        }, ...__VLS_functionalComponentArgsRest(__VLS_399));
        let __VLS_402;
        let __VLS_403;
        let __VLS_404;
        const __VLS_405 = {
            onClick: (__VLS_ctx.submitTimeLog)
        };
        var __VLS_401;
    }
    var __VLS_377;
    const __VLS_406 = {}.Dialog;
    /** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
    // @ts-ignore
    const __VLS_407 = __VLS_asFunctionalComponent(__VLS_406, new __VLS_406({
        visible: (__VLS_ctx.depDialogVisible),
        header: (__VLS_ctx.$t('dependencies.add')),
        modal: true,
        ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
    }));
    const __VLS_408 = __VLS_407({
        visible: (__VLS_ctx.depDialogVisible),
        header: (__VLS_ctx.$t('dependencies.add')),
        modal: true,
        ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_407));
    __VLS_409.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('dependencies.type'));
    const __VLS_410 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_411 = __VLS_asFunctionalComponent(__VLS_410, new __VLS_410({
        modelValue: (__VLS_ctx.depType),
        options: (__VLS_ctx.depTypeOptions),
        optionLabel: "label",
        optionValue: "value",
        ...{ class: "w-full" },
    }));
    const __VLS_412 = __VLS_411({
        modelValue: (__VLS_ctx.depType),
        options: (__VLS_ctx.depTypeOptions),
        optionLabel: "label",
        optionValue: "value",
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_411));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('dependencies.targetTicket'));
    const __VLS_414 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_415 = __VLS_asFunctionalComponent(__VLS_414, new __VLS_414({
        modelValue: (__VLS_ctx.depTargetTicketId),
        options: (__VLS_ctx.depTicketOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('dependencies.selectTicket')),
        ...{ class: "w-full" },
        filter: true,
    }));
    const __VLS_416 = __VLS_415({
        modelValue: (__VLS_ctx.depTargetTicketId),
        options: (__VLS_ctx.depTicketOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('dependencies.selectTicket')),
        ...{ class: "w-full" },
        filter: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_415));
    {
        const { footer: __VLS_thisSlot } = __VLS_409.slots;
        const __VLS_418 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_419 = __VLS_asFunctionalComponent(__VLS_418, new __VLS_418({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            severity: "secondary",
            outlined: true,
        }));
        const __VLS_420 = __VLS_419({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            severity: "secondary",
            outlined: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_419));
        let __VLS_422;
        let __VLS_423;
        let __VLS_424;
        const __VLS_425 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadError))
                    return;
                if (!!(!__VLS_ctx.ticket))
                    return;
                __VLS_ctx.depDialogVisible = false;
            }
        };
        var __VLS_421;
        const __VLS_426 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_427 = __VLS_asFunctionalComponent(__VLS_426, new __VLS_426({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.add')),
            icon: "pi pi-plus",
            loading: (__VLS_ctx.depSaving),
            disabled: (!__VLS_ctx.depTargetTicketId),
        }));
        const __VLS_428 = __VLS_427({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.add')),
            icon: "pi pi-plus",
            loading: (__VLS_ctx.depSaving),
            disabled: (!__VLS_ctx.depTargetTicketId),
        }, ...__VLS_functionalComponentArgsRest(__VLS_427));
        let __VLS_430;
        let __VLS_431;
        let __VLS_432;
        const __VLS_433 = {
            onClick: (__VLS_ctx.submitDependency)
        };
        var __VLS_429;
    }
    var __VLS_409;
    const __VLS_434 = {}.Dialog;
    /** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
    // @ts-ignore
    const __VLS_435 = __VLS_asFunctionalComponent(__VLS_434, new __VLS_434({
        visible: (__VLS_ctx.labelDialogVisible),
        header: (__VLS_ctx.$t('tickets.addLabel')),
        modal: true,
        ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
    }));
    const __VLS_436 = __VLS_435({
        visible: (__VLS_ctx.labelDialogVisible),
        header: (__VLS_ctx.$t('tickets.addLabel')),
        modal: true,
        ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_435));
    __VLS_437.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3" },
    });
    if (!__VLS_ctx.creatingNewLabel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_438 = {}.Select;
        /** @type {[typeof __VLS_components.Select, ]} */ ;
        // @ts-ignore
        const __VLS_439 = __VLS_asFunctionalComponent(__VLS_438, new __VLS_438({
            modelValue: (__VLS_ctx.labelToAdd),
            options: (__VLS_ctx.labelsAvailableToAdd),
            optionLabel: "name",
            optionValue: "id",
            placeholder: (__VLS_ctx.$t('tickets.chooseLabel')),
            ...{ class: "w-full" },
        }));
        const __VLS_440 = __VLS_439({
            modelValue: (__VLS_ctx.labelToAdd),
            options: (__VLS_ctx.labelsAvailableToAdd),
            optionLabel: "name",
            optionValue: "id",
            placeholder: (__VLS_ctx.$t('tickets.chooseLabel')),
            ...{ class: "w-full" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_439));
        const __VLS_442 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_443 = __VLS_asFunctionalComponent(__VLS_442, new __VLS_442({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('tickets.createNewLabel')),
            icon: "pi pi-plus",
            size: "small",
            text: true,
            ...{ class: "mt-2 p-0" },
        }));
        const __VLS_444 = __VLS_443({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('tickets.createNewLabel')),
            icon: "pi pi-plus",
            size: "small",
            text: true,
            ...{ class: "mt-2 p-0" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_443));
        let __VLS_446;
        let __VLS_447;
        let __VLS_448;
        const __VLS_449 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadError))
                    return;
                if (!!(!__VLS_ctx.ticket))
                    return;
                if (!(!__VLS_ctx.creatingNewLabel))
                    return;
                __VLS_ctx.creatingNewLabel = true;
            }
        };
        var __VLS_445;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm text-color-secondary mb-1" },
        });
        (__VLS_ctx.$t('tickets.labelName'));
        const __VLS_450 = {}.InputText;
        /** @type {[typeof __VLS_components.InputText, ]} */ ;
        // @ts-ignore
        const __VLS_451 = __VLS_asFunctionalComponent(__VLS_450, new __VLS_450({
            modelValue: (__VLS_ctx.newLabelName),
            ...{ class: "w-full" },
            placeholder: (__VLS_ctx.$t('tickets.labelNamePlaceholder')),
        }));
        const __VLS_452 = __VLS_451({
            modelValue: (__VLS_ctx.newLabelName),
            ...{ class: "w-full" },
            placeholder: (__VLS_ctx.$t('tickets.labelNamePlaceholder')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_451));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm text-color-secondary mb-1" },
        });
        (__VLS_ctx.$t('tickets.labelColor'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-center gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "color",
            ...{ class: "border-round" },
            ...{ style: {} },
        });
        (__VLS_ctx.newLabelColor);
        const __VLS_454 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_455 = __VLS_asFunctionalComponent(__VLS_454, new __VLS_454({
            value: (__VLS_ctx.newLabelName || __VLS_ctx.$t('tickets.preview')),
            ...{ style: ({ background: __VLS_ctx.newLabelColor, color: '#fff', borderColor: __VLS_ctx.newLabelColor }) },
        }));
        const __VLS_456 = __VLS_455({
            value: (__VLS_ctx.newLabelName || __VLS_ctx.$t('tickets.preview')),
            ...{ style: ({ background: __VLS_ctx.newLabelColor, color: '#fff', borderColor: __VLS_ctx.newLabelColor }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_455));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-2 mt-1" },
        });
        const __VLS_458 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_459 = __VLS_asFunctionalComponent(__VLS_458, new __VLS_458({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('tickets.saveLabel')),
            size: "small",
            icon: "pi pi-check",
            loading: (__VLS_ctx.savingNewLabel),
            disabled: (!__VLS_ctx.newLabelName.trim()),
        }));
        const __VLS_460 = __VLS_459({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('tickets.saveLabel')),
            size: "small",
            icon: "pi pi-check",
            loading: (__VLS_ctx.savingNewLabel),
            disabled: (!__VLS_ctx.newLabelName.trim()),
        }, ...__VLS_functionalComponentArgsRest(__VLS_459));
        let __VLS_462;
        let __VLS_463;
        let __VLS_464;
        const __VLS_465 = {
            onClick: (__VLS_ctx.createAndAddLabel)
        };
        var __VLS_461;
        const __VLS_466 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_467 = __VLS_asFunctionalComponent(__VLS_466, new __VLS_466({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            size: "small",
            severity: "secondary",
            outlined: true,
        }));
        const __VLS_468 = __VLS_467({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            size: "small",
            severity: "secondary",
            outlined: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_467));
        let __VLS_470;
        let __VLS_471;
        let __VLS_472;
        const __VLS_473 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadError))
                    return;
                if (!!(!__VLS_ctx.ticket))
                    return;
                if (!!(!__VLS_ctx.creatingNewLabel))
                    return;
                __VLS_ctx.creatingNewLabel = false;
            }
        };
        var __VLS_469;
    }
    {
        const { footer: __VLS_thisSlot } = __VLS_437.slots;
        const __VLS_474 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_475 = __VLS_asFunctionalComponent(__VLS_474, new __VLS_474({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            severity: "secondary",
            outlined: true,
        }));
        const __VLS_476 = __VLS_475({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.cancel')),
            severity: "secondary",
            outlined: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_475));
        let __VLS_478;
        let __VLS_479;
        let __VLS_480;
        const __VLS_481 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadError))
                    return;
                if (!!(!__VLS_ctx.ticket))
                    return;
                __VLS_ctx.labelDialogVisible = false;
            }
        };
        var __VLS_477;
        const __VLS_482 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_483 = __VLS_asFunctionalComponent(__VLS_482, new __VLS_482({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.add')),
            icon: "pi pi-plus",
            disabled: (!__VLS_ctx.labelToAdd || __VLS_ctx.creatingNewLabel),
        }));
        const __VLS_484 = __VLS_483({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.add')),
            icon: "pi pi-plus",
            disabled: (!__VLS_ctx.labelToAdd || __VLS_ctx.creatingNewLabel),
        }, ...__VLS_functionalComponentArgsRest(__VLS_483));
        let __VLS_486;
        let __VLS_487;
        let __VLS_488;
        const __VLS_489 = {
            onClick: (__VLS_ctx.confirmAddLabel)
        };
        var __VLS_485;
    }
    var __VLS_437;
}
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-8']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-title-display']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['description-section']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-0']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-row']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-contrast']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-top-1']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-border']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['no-underline']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext']} */ ;
/** @type {__VLS_StyleScopedClasses['p-component']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext']} */ ;
/** @type {__VLS_StyleScopedClasses['p-component']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['label-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['no-underline']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['text-overflow-ellipsis']} */ ;
/** @type {__VLS_StyleScopedClasses['white-space-nowrap']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-50']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['no-underline']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:surface-100']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-clipboard']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['h-1rem']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-surface-100']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext']} */ ;
/** @type {__VLS_StyleScopedClasses['p-component']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['p-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
// @ts-ignore
var __VLS_34 = __VLS_33;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Tag: Tag,
            Button: Button,
            Dialog: Dialog,
            Select: Select,
            Chip: Chip,
            InputText: InputText,
            InputNumber: InputNumber,
            Textarea: Textarea,
            TabView: TabView,
            TabPanel: TabPanel,
            Avatar: Avatar,
            RichTextEditor: RichTextEditor,
            CustomFieldRenderer: CustomFieldRenderer,
            formatFileSize: formatFileSize,
            currentUser: currentUser,
            ticket: ticket,
            loadError: loadError,
            comments: comments,
            ticketLabels: ticketLabels,
            epic: epic,
            userStories: userStories,
            watchers: watchers,
            editingTitle: editingTitle,
            titleDraft: titleDraft,
            titleInputRef: titleInputRef,
            descEditing: descEditing,
            descDraft: descDraft,
            descSectionRef: descSectionRef,
            savingDescription: savingDescription,
            newCommentBody: newCommentBody,
            commentPosting: commentPosting,
            editingCommentId: editingCommentId,
            commentEditDraft: commentEditDraft,
            commentSaving: commentSaving,
            transitionDialogVisible: transitionDialogVisible,
            transitionTargetId: transitionTargetId,
            transitionResolution: transitionResolution,
            transitionLoading: transitionLoading,
            activityEntries: activityEntries,
            activityLoading: activityLoading,
            customFieldDefs: customFieldDefs,
            customFieldValues: customFieldValues,
            customFieldSaving: customFieldSaving,
            labelDialogVisible: labelDialogVisible,
            labelToAdd: labelToAdd,
            creatingNewLabel: creatingNewLabel,
            newLabelName: newLabelName,
            newLabelColor: newLabelColor,
            savingNewLabel: savingNewLabel,
            timeLogs: timeLogs,
            timeSummary: timeSummary,
            timeLogDialogVisible: timeLogDialogVisible,
            timeLogSaving: timeLogSaving,
            timeLogHours: timeLogHours,
            timeLogMinutes: timeLogMinutes,
            timeLogDate: timeLogDate,
            timeLogDescription: timeLogDescription,
            attachments: attachments,
            attachmentUploading: attachmentUploading,
            fileInputRef: fileInputRef,
            dependencies: dependencies,
            depDialogVisible: depDialogVisible,
            depType: depType,
            depTargetTicketId: depTargetTicketId,
            depSaving: depSaving,
            depTypeOptions: depTypeOptions,
            depTicketOptions: depTicketOptions,
            sprintOptions: sprintOptions,
            currentSprint: currentSprint,
            priorityOptions: priorityOptions,
            assigneeOptions: assigneeOptions,
            currentStatusName: currentStatusName,
            currentStatusStyle: currentStatusStyle,
            transitionOptions: transitionOptions,
            transitionTargetIsTerminal: transitionTargetIsTerminal,
            labelsAvailableToAdd: labelsAvailableToAdd,
            formatPriorityLabel: formatPriorityLabel,
            formatTypeLabel: formatTypeLabel,
            prioritySeverity: prioritySeverity,
            formatRelativeTime: formatRelativeTime,
            activityInitials: activityInitials,
            describeActivity: describeActivity,
            authorInitials: authorInitials,
            canEditComment: canEditComment,
            isCommentEmpty: isCommentEmpty,
            chipStyle: chipStyle,
            toDateInputValue: toDateInputValue,
            formatDuration: formatDuration,
            openLogTimeDialog: openLogTimeDialog,
            submitTimeLog: submitTimeLog,
            removeTimeLog: removeTimeLog,
            depLabel: depLabel,
            depSeverity: depSeverity,
            depTargetId: depTargetId,
            depTargetKey: depTargetKey,
            depTargetTitle: depTargetTitle,
            submitDependency: submitDependency,
            removeDependency: removeDependency,
            fileIcon: fileIcon,
            triggerFileInput: triggerFileInput,
            onFileSelected: onFileSelected,
            downloadFile: downloadFile,
            removeAttachment: removeAttachment,
            loadTicketPage: loadTicketPage,
            startTitleEdit: startTitleEdit,
            cancelTitleEdit: cancelTitleEdit,
            commitTitle: commitTitle,
            startDescriptionEdit: startDescriptionEdit,
            cancelDescriptionEdit: cancelDescriptionEdit,
            saveDescriptionExplicit: saveDescriptionExplicit,
            onDescriptionSectionClick: onDescriptionSectionClick,
            onDescriptionFocusOut: onDescriptionFocusOut,
            onPriorityChange: onPriorityChange,
            onAssigneeChange: onAssigneeChange,
            onSprintChange: onSprintChange,
            isWatching: isWatching,
            watchTicket: watchTicket,
            unwatchTicket: unwatchTicket,
            onStoryPointsChange: onStoryPointsChange,
            onStartDateChange: onStartDateChange,
            onDueDateChange: onDueDateChange,
            openTransitionDialog: openTransitionDialog,
            applyTransition: applyTransition,
            submitComment: submitComment,
            startCommentEdit: startCommentEdit,
            cancelCommentEdit: cancelCommentEdit,
            saveCommentEdit: saveCommentEdit,
            removeComment: removeComment,
            onRemoveLabel: onRemoveLabel,
            confirmAddLabel: confirmAddLabel,
            createAndAddLabel: createAndAddLabel,
            onCustomFieldChange: onCustomFieldChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
