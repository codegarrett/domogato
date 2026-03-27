import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import axios from 'axios';
import { requestAvatarUpload, confirmAvatarUpload, deleteAvatar } from '@/api/users';
import { useToastService } from '@/composables/useToast';
const __VLS_props = defineProps();
const emit = defineEmits();
const { t } = useI18n();
const toast = useToastService();
const fileInput = ref();
const uploading = ref(false);
const removing = ref(false);
function openFilePicker() {
    fileInput.value?.click();
}
async function onFileSelected(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file)
        return;
    if (file.size > 5 * 1024 * 1024) {
        toast.showError('Error', t('profile.avatarTooLarge'));
        return;
    }
    uploading.value = true;
    try {
        const { upload_url, avatar_key } = await requestAvatarUpload(file.name, file.type);
        await axios.put(upload_url, file, {
            headers: { 'Content-Type': file.type },
        });
        const { avatar_url } = await confirmAvatarUpload(avatar_key);
        emit('updated', avatar_url);
        toast.showSuccess(t('common.success'), t('profile.avatarUpdated'));
    }
    catch {
        toast.showError('Error', t('profile.avatarUploadFailed'));
    }
    finally {
        uploading.value = false;
        input.value = '';
    }
}
async function onRemove() {
    removing.value = true;
    try {
        await deleteAvatar();
        emit('updated', null);
        toast.showSuccess(t('common.success'), t('profile.avatarRemoved'));
    }
    catch {
        toast.showError('Error', t('profile.avatarRemoveFailed'));
    }
    finally {
        removing.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['avatar-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-overlay']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "avatar-upload" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.openFilePicker) },
    ...{ class: "avatar-preview" },
});
if (__VLS_ctx.currentUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.currentUrl),
        alt: "Avatar",
        ...{ class: "avatar-img" },
    });
}
else {
    const __VLS_0 = {}.Avatar;
    /** @type {[typeof __VLS_components.Avatar, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        label: (__VLS_ctx.initials),
        shape: "circle",
        ...{ class: "avatar-placeholder" },
        size: "xlarge",
    }));
    const __VLS_2 = __VLS_1({
        label: (__VLS_ctx.initials),
        shape: "circle",
        ...{ class: "avatar-placeholder" },
        size: "xlarge",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "avatar-overlay" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-camera" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "avatar-actions" },
});
const __VLS_4 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.t('profile.changeAvatar')),
    icon: "pi pi-upload",
    size: "small",
    outlined: true,
    loading: (__VLS_ctx.uploading),
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.t('profile.changeAvatar')),
    icon: "pi pi-upload",
    size: "small",
    outlined: true,
    loading: (__VLS_ctx.uploading),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (__VLS_ctx.openFilePicker)
};
var __VLS_7;
if (__VLS_ctx.currentUrl) {
    const __VLS_12 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('profile.removeAvatar')),
        icon: "pi pi-trash",
        size: "small",
        text: true,
        severity: "danger",
        loading: (__VLS_ctx.removing),
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('profile.removeAvatar')),
        icon: "pi pi-trash",
        size: "small",
        text: true,
        severity: "danger",
        loading: (__VLS_ctx.removing),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onClick: (__VLS_ctx.onRemove)
    };
    var __VLS_15;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.onFileSelected) },
    ref: "fileInput",
    type: "file",
    accept: "image/jpeg,image/png,image/gif,image/webp",
    ...{ class: "hidden-input" },
});
/** @type {typeof __VLS_ctx.fileInput} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-upload']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-img']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-camera']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden-input']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Avatar: Avatar,
            Button: Button,
            t: t,
            fileInput: fileInput,
            uploading: uploading,
            removing: removing,
            openFilePicker: openFilePicker,
            onFileSelected: onFileSelected,
            onRemove: onRemove,
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
