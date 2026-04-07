/**
 * Backend API Client
 * Comunicación con el backend Express usando JWT Authentication
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// ==================== INTERFACES ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  requires2FA?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles_id: number;
  role_name: 'admin' | 'user' | 'pro';
  token_id: string | null;
  settings_icons_id: string | null;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TokenIcons {
  id: string;
  token: string;
  type: string;
  start_date: string;
  finish_date: string;
  created_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
}

export interface RefreshTokenResponse {
  refreshToken: string;
  expiresAt: string;
}

export interface RefreshAccessTokenResponse {
  accessToken: string;
  user: User;
}

export interface PasswordResetOtpVerifyResponse {
  valid: boolean;
  expiresAt: string;
}

export interface CheckoutSessionResponse {
  url: string;
}

type CheckoutLocale = 'es' | 'en';
type OtpLocale = 'es' | 'en';

export interface SettingsIcons {
  id: string;
  icon: string;
  layer: string | null;
  created_at?: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  manualEntry: string;
}

export interface TwoFactorVerifyResponse {
  backupCodes: string[];
}

// ==================== TOKEN MANAGEMENT ====================

// Variable global para almacenar el token actual desde el AuthContext
let currentAccessToken: string | null = null;

const REFRESH_TOKEN_STORAGE_KEY = 'refreshToken';
const REFRESH_TOKEN_EXPIRY_STORAGE_KEY = 'refreshTokenExpiry';
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const target = `${name}=`;
  const cookieChunk = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(target));

  if (!cookieChunk) return null;

  const rawValue = cookieChunk.slice(target.length);

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function setCookieValue(name: string, value: string, expiresAt?: string): void {
  if (!isBrowserEnvironment()) return;

  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  const encodedValue = encodeURIComponent(value);
  const parsedExpiry = expiresAt ? new Date(expiresAt) : null;
  const hasValidExpiry = Boolean(parsedExpiry && !Number.isNaN(parsedExpiry.getTime()));
  const expiryDirective = hasValidExpiry
    ? `; Expires=${parsedExpiry!.toUTCString()}`
    : `; Max-Age=${REFRESH_TOKEN_MAX_AGE_SECONDS}`;

  document.cookie = `${name}=${encodedValue}; Path=/; SameSite=Lax${expiryDirective}${secureFlag}`;
}

function removeCookieValue(name: string): void {
  if (!isBrowserEnvironment()) return;

  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
}

/**
 * Persistir refresh token de forma unificada entre AuthContext y API client
 */
export function setRefreshToken(refreshToken: string, expiresAt?: string | null): void {
  if (!isBrowserEnvironment()) return;

  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  setCookieValue(REFRESH_TOKEN_STORAGE_KEY, refreshToken, expiresAt ?? undefined);

  if (expiresAt) {
    localStorage.setItem(REFRESH_TOKEN_EXPIRY_STORAGE_KEY, expiresAt);
    setCookieValue(REFRESH_TOKEN_EXPIRY_STORAGE_KEY, expiresAt, expiresAt);
    return;
  }

  localStorage.removeItem(REFRESH_TOKEN_EXPIRY_STORAGE_KEY);
  removeCookieValue(REFRESH_TOKEN_EXPIRY_STORAGE_KEY);
}

/**
 * Establecer el access token actual (llamado desde AuthContext)
 */
export function setCurrentAccessToken(token: string | null) {
  currentAccessToken = token;
}

/**
 * Obtener access token válido (desde memoria, no localStorage)
 */
export function getAccessToken(): string | null {
  return currentAccessToken;
}

/**
 * Obtener refresh token desde persistencia unificada (localStorage/cookie)
 */
export function getRefreshToken(): string | null {
  if (!isBrowserEnvironment()) return null;

  const tokenFromStorage = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  const tokenFromCookie = getCookieValue(REFRESH_TOKEN_STORAGE_KEY);

  if (tokenFromStorage && !tokenFromCookie) {
    const expiry = localStorage.getItem(REFRESH_TOKEN_EXPIRY_STORAGE_KEY);
    setCookieValue(REFRESH_TOKEN_STORAGE_KEY, tokenFromStorage, expiry ?? undefined);
    if (expiry) {
      setCookieValue(REFRESH_TOKEN_EXPIRY_STORAGE_KEY, expiry, expiry);
    }
    return tokenFromStorage;
  }

  if (!tokenFromStorage && tokenFromCookie) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenFromCookie);
    const expiryFromCookie = getCookieValue(REFRESH_TOKEN_EXPIRY_STORAGE_KEY);
    if (expiryFromCookie) {
      localStorage.setItem(REFRESH_TOKEN_EXPIRY_STORAGE_KEY, expiryFromCookie);
    }
    return tokenFromCookie;
  }

  return tokenFromStorage ?? tokenFromCookie ?? null;
}

/**
 * Limpiar tokens
 */
export function clearTokens() {
  currentAccessToken = null;
  if (isBrowserEnvironment()) {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_EXPIRY_STORAGE_KEY);
    removeCookieValue(REFRESH_TOKEN_STORAGE_KEY);
    removeCookieValue(REFRESH_TOKEN_EXPIRY_STORAGE_KEY);
  }
}

/**
 * Crear headers con Authorization
 */
function createAuthHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth && currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  return headers;
}

// ==================== AUTENTICACIÓN ====================

/**
 * Register - Registrar nuevo usuario
 */
export async function register(
  username: string,
  email: string,
  password: string,
  confirmPassword: string
): Promise<RegisterResponse> {
  const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: createAuthHeaders(false),
    body: JSON.stringify({ username, email, password, confirmPassword }),
  });

  const data: ApiResponse<RegisterResponse> = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Registration failed');
  }

  return data.data!;
}

/**
 * Login - Iniciar sesión
 */
export async function login(
  email: string,
  password: string,
  twoFactorCode?: string
): Promise<LoginResponse> {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: createAuthHeaders(false),
    body: JSON.stringify({ email, password, twoFactorCode }),
  });

  const data: ApiResponse<LoginResponse> = await response.json();

  // Si requiere 2FA
  if (data.requires2FA) {
    throw new Error('2FA_REQUIRED');
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Login failed');
  }

  return data.data!;
}

/**
 * Solicitar OTP para reset de contraseña
 */
export async function requestPasswordResetOtp(email: string, locale: OtpLocale): Promise<void> {
  const localeHeaders = {
    ...createAuthHeaders(false),
    'Accept-Language': locale,
    'X-Locale': locale,
  };

  const response = await fetch(`${BACKEND_URL}/api/auth/password-reset/request-otp`, {
    method: 'POST',
    headers: localeHeaders,
    body: JSON.stringify({ email, locale }),
  });

  const data: ApiResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to request password reset OTP');
  }
}

/**
 * Verificar OTP de reset de contraseña
 */
export async function verifyPasswordResetOtp(
  email: string,
  otp: string,
  locale: OtpLocale
): Promise<PasswordResetOtpVerifyResponse> {
  const localeHeaders = {
    ...createAuthHeaders(false),
    'Accept-Language': locale,
    'X-Locale': locale,
  };

  const response = await fetch(`${BACKEND_URL}/api/auth/password-reset/verify-otp`, {
    method: 'POST',
    headers: localeHeaders,
    body: JSON.stringify({ email, otp, locale }),
  });

  const data: ApiResponse<PasswordResetOtpVerifyResponse> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to verify OTP');
  }

  return data.data!;
}

/**
 * Resetear contraseña con OTP
 */
export async function resetPasswordWithOtp(
  email: string,
  otp: string,
  newPassword: string,
  confirmPassword: string,
  locale: OtpLocale
): Promise<void> {
  const localeHeaders = {
    ...createAuthHeaders(false),
    'Accept-Language': locale,
    'X-Locale': locale,
  };

  const response = await fetch(`${BACKEND_URL}/api/auth/password-reset/reset-with-otp`, {
    method: 'POST',
    headers: localeHeaders,
    body: JSON.stringify({ email, otp, newPassword, confirmPassword, locale }),
  });

  const data: ApiResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to reset password');
  }
}

/**
 * Obtener Refresh Token (después de login)
 */
export async function getRefreshTokenFromServer(): Promise<RefreshTokenResponse> {
  const response = await fetch(`${BACKEND_URL}/api/auth/refresh-token`, {
    method: 'POST',
    headers: createAuthHeaders(),
  });

  const data: ApiResponse<RefreshTokenResponse> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to get refresh token');
  }

  return data.data!;
}

/**
 * Refrescar Access Token
 */
export async function refreshAccessToken(): Promise<RefreshAccessTokenResponse> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: createAuthHeaders(false),
    body: JSON.stringify({ refreshToken }),
  });

  const data: ApiResponse<RefreshAccessTokenResponse> = await response.json();

  if (!response.ok || !data.success) {
    // Si falla, limpiar tokens
    clearTokens();
    throw new Error(data.message || 'Failed to refresh token');
  }

  return data.data!;
}

/**
 * Obtener perfil del usuario actual
 */
export async function getUserProfile(): Promise<User | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
      headers: createAuthHeaders(),
    });

    if (!response.ok) return null;

    const data: ApiResponse<User> = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Logout - Cerrar sesión
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      headers: createAuthHeaders(),
    });
  } finally {
    // Siempre limpiar tokens locales
    clearTokens();
  }
}

// ==================== USUARIOS ====================

/**
 * Obtener todos los usuarios (Admin)
 */
export async function getAllUsers(): Promise<User[]> {
  const response = await fetch(`${BACKEND_URL}/api/users`, {
    headers: createAuthHeaders(),
  });

  const data: ApiResponse<User[]> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch users');
  }

  return data.data || [];
}

/**
 * Obtener usuario por ID
 */
export async function getUserById(id: string): Promise<User> {
  const response = await fetch(`${BACKEND_URL}/api/users/${id}`, {
    headers: createAuthHeaders(),
  });

  const data: ApiResponse<User> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'User not found');
  }

  return data.data!;
}

/**
 * Actualizar mi perfil
 */
export async function updateMyProfile(updates: { username?: string; email?: string }): Promise<User> {
  const response = await fetch(`${BACKEND_URL}/api/users/profile`, {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify(updates),
  });

  const data: ApiResponse<User> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update profile');
  }

  return data.data!;
}

/**
 * Cambiar contraseña
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/users/${userId}/password`, {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data: ApiResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to change password');
  }
}

// ==================== TOKENS (NPM) ====================

/**
 * Obtener mi token NPM
 */
export async function getUserToken(): Promise<TokenIcons | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tokens/me`, {
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const data: ApiResponse<{token: TokenIcons}> = await response.json();
    // El backend devuelve {data: {token: {id, token, ...}}}
    return data.data?.token || null;
  } catch (error) {
    console.error('Error fetching user token:', error);
    return null;
  }
}

/**
 * Obtener todos los tokens (Admin)
 */
export async function getAllTokens(): Promise<TokenIcons[]> {
  const response = await fetch(`${BACKEND_URL}/api/tokens`, {
    headers: createAuthHeaders(),
  });

  const data: ApiResponse<TokenIcons[]> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch tokens');
  }

  return data.data || [];
}

// ==================== STRIPE ====================

/**
 * Crear sesión de checkout de Stripe
 */
export async function createCheckoutSession(
  planType: 'pro' | 'enterprise',
  locale: CheckoutLocale
): Promise<CheckoutSessionResponse> {
  // Primero obtener el perfil del usuario para tener su ID y email
  const user = await getUserProfile();
  
  if (!user?.id || !user?.email) {
    throw new Error('userId and userEmail are required');
  }

  console.log('Creating checkout session with:', {
    planType,
    userId: user.id,
    userEmail: user.email
  });

  const response = await fetch(`${BACKEND_URL}/api/stripe/checkout`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({ 
      planType,
      locale,
      userId: user.id,
      userEmail: user.email
    }),
  });

  const data: ApiResponse<CheckoutSessionResponse> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to create checkout session');
  }

  return data.data!;
}

// ==================== SETTINGS ICONS ====================

/**
 * Obtener mis settings de iconos
 */
export async function getMyIconSettings(): Promise<SettingsIcons | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/settings-icons/me`, {
      headers: createAuthHeaders(),
    });

    if (!response.ok) return null;

    const data: ApiResponse<SettingsIcons> = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching icon settings:', error);
    return null;
  }
}

/**
 * Crear/actualizar settings de iconos
 */
export async function updateIconSettings(
  icon: string,
  layer?: string
): Promise<SettingsIcons> {
  const response = await fetch(`${BACKEND_URL}/api/settings-icons`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({ icon, layer }),
  });

  const data: ApiResponse<SettingsIcons> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update icon settings');
  }

  return data.data!;
}

// ==================== 2FA ====================

/**
 * Setup 2FA - Generar QR
 */
export async function setup2FA(): Promise<TwoFactorSetup> {
  const response = await fetch(`${BACKEND_URL}/api/auth/2fa/setup`, {
    method: 'POST',
    headers: createAuthHeaders(),
  });

  const data: ApiResponse<TwoFactorSetup> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to setup 2FA');
  }

  return data.data!;
}

/**
 * Verificar y activar 2FA
 */
export async function verify2FA(token: string): Promise<TwoFactorVerifyResponse> {
  const response = await fetch(`${BACKEND_URL}/api/auth/2fa/verify`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({ token }),
  });

  const data: ApiResponse<TwoFactorVerifyResponse> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to verify 2FA');
  }

  return data.data!;
}

/**
 * Desactivar 2FA
 */
export async function disable2FA(password: string, twoFactorCode: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/auth/2fa/disable`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({ password, twoFactorCode }),
  });

  const data: ApiResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to disable 2FA');
  }
}

// ==================== UTILIDADES ====================

/**
 * Verificar si el usuario tiene acceso premium
 */
export async function hasPremiumAccess(): Promise<boolean> {
  const profile = await getUserProfile();
  return profile?.roles_id === 3 || profile?.role_name === 'pro';
}

/**
 * Verificar si el token está expirado
 */
export function isTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
