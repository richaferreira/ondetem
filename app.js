/**
 * app.js - Gerenciamento de Notificações Push
 * Implementação baseada na Aula 6 - Engenharia de Software
 */

// Chave VAPID pública (Gerada para o projeto)
const VAPID_PUBLIC_KEY = 'BNo6E7y9E_v1G9QyXq8zY4Z5R8J2L6m5n4b3v2c1x0z9a8s7d6f5g4h3j2k1l0'; // Chave de exemplo

// 1. Registra o Service Worker ao carregar a página
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => {
                console.log('✓ SW registrado para Push:', reg.scope);
                configurarBotao(reg);
            })
            .catch(err => {
                console.warn('⚠ SW não registrado, configurando botão sem push:', err);
                configurarBotao(null);
            });
    });
} else {
    window.addEventListener('load', () => {
        configurarBotao(null);
    });
}

// 2. Configura o botão de inscrição
function configurarBotao(registration) {
    const btnDesktop = document.getElementById('btn-subscribe');
    const btnMobile = document.getElementById('btn-subscribe-mobile');

    // Verificar se já ativou notificações
    const notificacoesAtivas = localStorage.getItem('ondetem_notificacoes_ativas') === 'true';

    const handleSubscribe = async (btn) => {
        if (!('Notification' in window)) {
            alert('Seu navegador não suporta notificações.');
            return;
        }

        const permissao = await Notification.requestPermission();
        if (permissao === 'granted') {
            // Tentar inscrição push se disponível
            if (registration && 'pushManager' in registration) {
                try {
                    await inscreverUsuario(registration);
                } catch (err) {
                    console.warn('⚠ Push subscription falhou, usando notificações locais:', err);
                }
            }

            localStorage.setItem('ondetem_notificacoes_ativas', 'true');
            atualizarBotaoStatus(btnDesktop, true);
            atualizarBotaoStatus(btnMobile, true);
            mostrarNotificacaoLocal('Notificações Ativadas!', 'Agora você receberá alertas de agendamento.');
        } else {
            if (btn.id === 'btn-subscribe-mobile') {
                btn.innerHTML = '<i class="bi bi-bell-slash text-danger"></i>';
            } else {
                btn.textContent = '🔕 Permissão Negada';
            }
            console.warn('⚠ Permissão de notificação negada pelo usuário.');
        }
    };

    if (btnDesktop) {
        if (notificacoesAtivas && Notification.permission === 'granted') {
            atualizarBotaoStatus(btnDesktop, true);
        }
        btnDesktop.addEventListener('click', () => handleSubscribe(btnDesktop));
    }
    if (btnMobile) {
        if (notificacoesAtivas && Notification.permission === 'granted') {
            atualizarBotaoStatus(btnMobile, true);
        }
        btnMobile.addEventListener('click', () => handleSubscribe(btnMobile));
    }

    // Verificar push subscription existente
    if (registration && 'pushManager' in registration) {
        registration.pushManager.getSubscription().then(subscription => {
            if (subscription) {
                if (btnDesktop) atualizarBotaoStatus(btnDesktop, true);
                if (btnMobile) atualizarBotaoStatus(btnMobile, true);
            }
        }).catch(() => {});
    }
}

// Função auxiliar para atualizar o visual do botão
function atualizarBotaoStatus(btn, inscrito) {
    if (inscrito) {
        btn.disabled = true;
        if (btn.id === 'btn-subscribe-mobile') {
            btn.innerHTML = '<i class="bi bi-bell-fill text-success"></i>';
        } else {
            btn.innerHTML = '🔔 Notificações Ativas';
            btn.classList.replace('btn-outline-primary', 'btn-success');
        }
    }
}

// 3. Cria a subscription com a chave VAPID pública
async function inscreverUsuario(registration) {
    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        console.log('✓ Usuário inscrito no Push:', JSON.stringify(subscription));
        
        // TODO: Enviar 'subscription' para o back-end aqui
        // await enviarSubscriptionParaServidor(subscription);
        
    } catch (err) {
        console.error('✗ Falha ao inscrever usuário no Push:', err);
    }
}

// Utilitário: converte chave VAPID de Base64 para Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Função para disparar notificação local (simulação de push)
function mostrarNotificacaoLocal(titulo, corpo) {
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: corpo,
                icon: './img/Logo-png 5.svg', // Adicionado ponto aqui
                badge: './img/Logo-png 5.svg', // Adicionado ponto aqui
                vibrate: [100, 50, 100],
                data: {
                    dateOfArrival: Date.now(),
                    primaryKey: 1
                }
            });
        });
    }
}

// Exportar para uso no script.js
window.mostrarNotificacaoPush = mostrarNotificacaoLocal;