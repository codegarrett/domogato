import { defineStore } from 'pinia';
import { ref } from 'vue';
export const useUiStore = defineStore('ui', () => {
    const savedDark = localStorage.getItem('projecthub-dark-mode') === 'true';
    const sidebarCollapsed = ref(false);
    const darkMode = ref(savedDark);
    if (savedDark) {
        document.documentElement.classList.add('dark-mode');
    }
    function toggleSidebar() {
        sidebarCollapsed.value = !sidebarCollapsed.value;
    }
    function toggleDarkMode() {
        darkMode.value = !darkMode.value;
        document.documentElement.classList.toggle('dark-mode', darkMode.value);
        localStorage.setItem('projecthub-dark-mode', String(darkMode.value));
    }
    function setDarkMode(value) {
        if (darkMode.value !== value) {
            toggleDarkMode();
        }
    }
    return { sidebarCollapsed, darkMode, toggleSidebar, toggleDarkMode, setDarkMode };
});
