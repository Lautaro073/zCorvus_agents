/**
 * Script personalizado para Swagger UI
 * Auto-captura el token JWT del login y lo configura automáticamente
 */

(function () {
    'use strict';

    // Esperar a que Swagger UI esté completamente cargado
    let swaggerUIInstance = null;
    const checkSwaggerUI = setInterval(() => {
        if (window.ui) {
            swaggerUIInstance = window.ui;
            clearInterval(checkSwaggerUI);
        }
    }, 100);

    // Interceptar fetch para capturar respuestas del login
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
        return originalFetch.apply(this, args).then(async (response) => {
            // Clonar la respuesta para poder leerla sin consumirla
            const clonedResponse = response.clone();

            try {
                // Verificar si es una petición de login exitosa
                if (args[0].includes('/api/auth/login') && response.status === 200) {
                    const data = await clonedResponse.json();

                    if (data.success && data.data && data.data.accessToken) {
                        const token = data.data.accessToken;

                        // Esperar a que Swagger UI esté listo
                        setTimeout(() => {
                            if (swaggerUIInstance) {
                                try {
                                    // Usar la API de Swagger UI para autorizar
                                    swaggerUIInstance.preauthorizeApiKey('bearerAuth', token);
                                    console.log('✅ Token configurado automáticamente');

                                    // Mostrar notificación visual
                                    const notification = document.createElement('div');
                                    notification.style.cssText = `
                                        position: fixed;
                                        top: 20px;
                                        right: 20px;
                                        background: #4caf50;
                                        color: white;
                                        padding: 15px 20px;
                                        border-radius: 4px;
                                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                                        z-index: 10000;
                                        font-family: sans-serif;
                                        font-size: 14px;
                                    `;
                                    notification.innerHTML = '🔑 Token configurado automáticamente!';
                                    document.body.appendChild(notification);

                                    setTimeout(() => notification.remove(), 3000);
                                } catch (error) {
                                    console.error('Error configurando token:', error);
                                    useManualMethod(token);
                                }
                            } else {
                                useManualMethod(token);
                            }
                        }, 500);
                    }
                }
            } catch (error) {
                // Ignorar errores de parsing
            }

            return response;
        });
    };

    // Método alternativo: manipulación del DOM
    function useManualMethod(token) {
        const authorizeBtn = document.querySelector('.btn.authorize');
        if (authorizeBtn) {
            authorizeBtn.click();

            setTimeout(() => {
                const tokenInput = document.querySelector('input[type="text"][placeholder*="bearer"]') ||
                    document.querySelector('input[name="bearerAuth"]') ||
                    document.querySelector('.auth-container input[type="text"]') ||
                    document.querySelector('section input[type="text"]');

                if (tokenInput) {
                    tokenInput.value = token;

                    const inputEvent = new Event('input', { bubbles: true });
                    const changeEvent = new Event('change', { bubbles: true });
                    tokenInput.dispatchEvent(inputEvent);
                    tokenInput.dispatchEvent(changeEvent);

                    setTimeout(() => {
                        const modalAuthorizeBtn =
                            document.querySelector('.auth-btn-wrapper button.btn.authorize') ||
                            document.querySelector('button.btn.modal-btn.auth.authorize.button') ||
                            document.querySelector('.modal-ux button.authorize') ||
                            document.querySelector('button[aria-label="Apply credentials"]') ||
                            Array.from(document.querySelectorAll('button')).find(btn =>
                                btn.textContent.trim().toLowerCase() === 'authorize' &&
                                btn.closest('.modal-ux')
                            );

                        if (modalAuthorizeBtn) {
                            modalAuthorizeBtn.click();

                            setTimeout(() => {
                                const closeBtn = document.querySelector('.modal-ux .close-modal') ||
                                    document.querySelector('button.close-modal');
                                if (closeBtn) closeBtn.click();
                            }, 500);
                        }
                    }, 300);
                }
            }, 500);
        }
    }
})();
