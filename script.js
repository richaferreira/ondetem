// 1. Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('SW registrado:', reg.scope))
            .catch(err => console.log('Erro SW:', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // --- SELEÇÃO DE ELEMENTOS ---
    const btnLupaMobile = document.getElementById('btn-lupa-mobile');
    const inputMobile = document.getElementById('input-busca-mobile');
    const inputDesktop = document.querySelector('.search-bar input'); 
    const cards = document.querySelectorAll('.listings .row > div');
    
    const modalElement = document.getElementById('modalAgendamento');
    const bModal = new bootstrap.Modal(modalElement);
    const form = document.getElementById('formAgendamento');
    const statusPagamento = document.getElementById('statusPagamento');

    // --- LÓGICA DE BUSCA (FILTRO) ---
    function filtrarCards(termo) {
        const searchTerm = termo.toLowerCase();
        cards.forEach(card => {
            const title = card.querySelector('.card-title').innerText.toLowerCase();
            const services = card.querySelector('.card-text').innerText.toLowerCase();
            card.style.display = (title.includes(searchTerm) || services.includes(searchTerm)) ? "block" : "none";
        });
    }

    if(inputDesktop) inputDesktop.addEventListener('input', (e) => filtrarCards(e.target.value));
    if(inputMobile) inputMobile.addEventListener('input', (e) => filtrarCards(e.target.value));

    if(btnLupaMobile) {
        btnLupaMobile.addEventListener('click', () => {
            inputMobile.classList.toggle('d-none');
            inputMobile.classList.toggle('ativo');
            inputMobile.focus();
        });
    }

    // --- LÓGICA DO MODAL (ABRIR E PREENCHER) ---
    // Usamos delegação de evento para garantir que funcione mesmo após a busca
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-danger') && e.target.closest('.card-body')) {
            const btn = e.target;
            const nomeLocal = btn.closest('.card-body').querySelector('.card-title').innerText;
            document.getElementById('modalAgendamentoLabel').innerText = `Agendar em: ${nomeLocal}`;
            bModal.show();
        }
    });

    // --- LÓGICA DE PAGAMENTO (ENVIO PARA API) ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = form.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
        statusPagamento.innerHTML = "Conectando ao servidor...";

        const dadosAgendamento = {
            local: document.getElementById('modalAgendamentoLabel').innerText,
            data: document.getElementById('dataAgendamento').value,
            hora: document.getElementById('horaAgendamento').value,
            pagamento: document.getElementById('metodoPagamento').value
        };

        try {
            // Chamada real para o JSONPlaceholder (API Fake)
            const resposta = await fetch('https://jsonplaceholder.typicode.com/posts', {
                method: 'POST',
                body: JSON.stringify(dadosAgendamento),
                headers: { 'Content-type': 'application/json; charset=UTF-8' }
            });

            if(resposta.ok) {
                const resultado = await resposta.json();
                statusPagamento.innerHTML = '<b class="text-success">Pagamento Aprovado!</b>';
                
                setTimeout(() => {
                    bModal.hide();
                    form.reset();
                    statusPagamento.innerHTML = '';
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = 'Confirmar e Pagar';
                    alert("Sucesso! Agendamento #" + resultado.id + " confirmado em Saquarema.");
                }, 2000);
            }
        } catch (erro) {
            statusPagamento.innerHTML = '<b class="text-danger">Erro no processamento.</b>';
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Confirmar e Pagar';
        }
    });
});