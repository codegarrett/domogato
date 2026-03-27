import { ref } from 'vue';
const pendingMessages = ref([]);
let toastInstance = null;
export function registerToast(toast) {
    toastInstance = toast;
    for (const msg of pendingMessages.value) {
        toastInstance.add(msg);
    }
    pendingMessages.value = [];
}
export function useToastService() {
    function add(msg) {
        if (toastInstance) {
            toastInstance.add(msg);
        }
        else {
            pendingMessages.value.push(msg);
        }
    }
    return {
        showSuccess(summary, detail) {
            add({ severity: 'success', summary, detail, life: 4000 });
        },
        showError(summary, detail) {
            add({ severity: 'error', summary, detail, life: 8000 });
        },
        showWarn(summary, detail) {
            add({ severity: 'warn', summary, detail, life: 5000 });
        },
        showInfo(summary, detail) {
            add({ severity: 'info', summary, detail, life: 4000 });
        },
    };
}
