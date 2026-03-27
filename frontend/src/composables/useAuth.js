import axios from 'axios';
import { computed, ref } from 'vue';
let oidcModule = null;
let userManager = null;
const oidcUser = ref(null);
const isLoading = ref(true);
const error = ref(null);
const localToken = ref(sessionStorage.getItem('projecthub-local-token'));
const authMode = ref(null);
const loggedOut = ref(false);
let refreshTimerId = null;
async function getOidcModule() {
    if (!oidcModule) {
        oidcModule = await import('oidc-client-ts');
    }
    return oidcModule;
}
async function getUserManager(authority, clientId) {
    if (userManager)
        return userManager;
    const { UserManager, WebStorageStateStore } = await getOidcModule();
    userManager = new UserManager({
        authority,
        client_id: clientId,
        redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/auth/callback`,
        post_logout_redirect_uri: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI || window.location.origin,
        response_type: 'code',
        scope: 'openid profile email',
        automaticSilentRenew: true,
        silent_redirect_uri: `${window.location.origin}/auth/silent-renew`,
        userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    });
    userManager.events.addUserLoaded((user) => {
        oidcUser.value = user;
    });
    userManager.events.addUserUnloaded(() => {
        oidcUser.value = null;
    });
    userManager.events.addSilentRenewError((err) => {
        console.error('Silent renew error:', err);
        error.value = 'Session refresh failed';
    });
    userManager.events.addAccessTokenExpired(() => {
        console.warn('Access token expired');
        oidcUser.value = null;
    });
    return userManager;
}
function parseJwtExp(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return typeof payload.exp === 'number' ? payload.exp : null;
    }
    catch {
        return null;
    }
}
function clearRefreshTimer() {
    if (refreshTimerId !== null) {
        clearTimeout(refreshTimerId);
        refreshTimerId = null;
    }
}
function scheduleTokenRefresh(token, setToken) {
    clearRefreshTimer();
    const exp = parseJwtExp(token);
    if (!exp)
        return;
    const nowSec = Math.floor(Date.now() / 1000);
    const remainingSec = exp - nowSec;
    if (remainingSec <= 0)
        return;
    const refreshInMs = Math.max(remainingSec * 0.75, remainingSec - 300) * 1000;
    const minDelay = 30_000;
    refreshTimerId = setTimeout(async () => {
        if (loggedOut.value)
            return;
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
            const response = await axios.post(`${baseUrl}/auth/refresh`, {}, { headers: { Authorization: `Bearer ${localToken.value}` } });
            const newToken = response.data.access_token;
            setToken(newToken);
            scheduleTokenRefresh(newToken, setToken);
        }
        catch (e) {
            console.error('Token refresh failed:', e);
            setToken(null);
            loggedOut.value = true;
            window.location.href = '/auth/login';
        }
    }, Math.max(refreshInMs, minDelay));
}
export function useAuth() {
    const isLocalMode = computed(() => authMode.value === 'local');
    const isOidcMode = computed(() => authMode.value === 'oidc');
    const isAuthenticated = computed(() => {
        if (loggedOut.value)
            return false;
        if (localToken.value)
            return true;
        if (isOidcMode.value)
            return oidcUser.value !== null && !oidcUser.value.expired;
        return oidcUser.value !== null && !oidcUser.value.expired;
    });
    const accessToken = computed(() => {
        if (loggedOut.value)
            return null;
        if (localToken.value)
            return localToken.value;
        return oidcUser.value?.access_token ?? null;
    });
    const userProfile = computed(() => oidcUser.value?.profile ?? null);
    function setAuthMode(mode) {
        authMode.value = mode;
    }
    function setLocalToken(token) {
        localToken.value = token;
        if (token) {
            sessionStorage.setItem('projecthub-local-token', token);
            scheduleTokenRefresh(token, setLocalToken);
        }
        else {
            sessionStorage.removeItem('projecthub-local-token');
            clearRefreshTimer();
        }
    }
    async function initialize() {
        isLoading.value = true;
        error.value = null;
        if (localToken.value) {
            scheduleTokenRefresh(localToken.value, setLocalToken);
            isLoading.value = false;
            return;
        }
        if (isOidcMode.value) {
            try {
                const envAuthority = import.meta.env.VITE_OIDC_AUTHORITY;
                const envClientId = import.meta.env.VITE_OIDC_CLIENT_ID;
                if (envAuthority && envClientId) {
                    const mgr = await getUserManager(envAuthority, envClientId);
                    const user = await mgr.getUser();
                    if (user && !user.expired) {
                        oidcUser.value = user;
                    }
                }
            }
            catch (e) {
                console.error('Auth initialization error:', e);
            }
        }
        isLoading.value = false;
    }
    async function initializeOidc(authority, clientId) {
        try {
            const mgr = await getUserManager(authority, clientId);
            const user = await mgr.getUser();
            if (user && !user.expired) {
                oidcUser.value = user;
            }
        }
        catch (e) {
            console.error('OIDC init error:', e);
        }
    }
    async function login(returnTo) {
        if (isLocalMode.value) {
            return;
        }
        try {
            const envAuthority = import.meta.env.VITE_OIDC_AUTHORITY;
            const envClientId = import.meta.env.VITE_OIDC_CLIENT_ID;
            if (!envAuthority || !envClientId) {
                error.value = 'OIDC is not configured';
                return;
            }
            const mgr = await getUserManager(envAuthority, envClientId);
            await mgr.signinRedirect({
                state: { returnTo: returnTo || window.location.pathname },
            });
        }
        catch (err) {
            console.error('OIDC login failed:', err);
            error.value = 'Authentication provider not available';
        }
    }
    async function handleCallback() {
        const envAuthority = import.meta.env.VITE_OIDC_AUTHORITY;
        const envClientId = import.meta.env.VITE_OIDC_CLIENT_ID;
        const mgr = await getUserManager(envAuthority, envClientId);
        const user = await mgr.signinRedirectCallback();
        oidcUser.value = user;
        const state = user.state;
        return state?.returnTo || '/';
    }
    async function logout() {
        loggedOut.value = true;
        clearRefreshTimer();
        setLocalToken(null);
        if (isOidcMode.value && userManager) {
            try {
                await userManager.signoutRedirect();
                return;
            }
            catch (e) {
                console.error('OIDC logout failed:', e);
            }
        }
    }
    async function silentRenew() {
        if (isLocalMode.value)
            return;
        if (!userManager)
            return;
        const user = await userManager.signinSilent();
        if (user) {
            oidcUser.value = user;
        }
    }
    return {
        oidcUser,
        isAuthenticated,
        accessToken,
        userProfile,
        isLoading,
        error,
        authMode,
        isLocalMode,
        isOidcMode,
        loggedOut,
        setAuthMode,
        setLocalToken,
        initialize,
        initializeOidc,
        login,
        handleCallback,
        logout,
        silentRenew,
    };
}
