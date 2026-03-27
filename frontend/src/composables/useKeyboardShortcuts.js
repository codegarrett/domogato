import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
const globalShortcuts = [];
let initialized = false;
export function useKeyboardShortcuts() {
    const router = useRouter();
    function registerDefaults() {
        if (initialized)
            return;
        initialized = true;
        globalShortcuts.push({
            key: 'c',
            description: 'Create ticket (when on project)',
            handler: () => {
                const event = new CustomEvent('shortcut:create-ticket');
                window.dispatchEvent(event);
            },
        }, {
            key: '?',
            shift: true,
            description: 'Show keyboard shortcuts',
            handler: () => {
                const event = new CustomEvent('shortcut:show-help');
                window.dispatchEvent(event);
            },
        }, {
            key: 'g',
            description: 'Go to home/dashboard',
            handler: () => {
                router.push('/');
            },
        });
    }
    function handleKeydown(event) {
        const target = event.target;
        if (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable) {
            return;
        }
        for (const shortcut of globalShortcuts) {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
            if (keyMatch && ctrlMatch && shiftMatch) {
                event.preventDefault();
                shortcut.handler();
                return;
            }
        }
    }
    onMounted(() => {
        registerDefaults();
        window.addEventListener('keydown', handleKeydown);
    });
    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeydown);
    });
    return {
        shortcuts: globalShortcuts,
    };
}
