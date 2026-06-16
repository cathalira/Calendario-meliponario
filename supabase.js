const SUPABASE_URL = 'https://zlgogrjsdnbiaiplllak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZ29ncmpzZG5iaWFpcGxsbGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzg4NTgsImV4cCI6MjA5Njg1NDg1OH0.dyOf0eEhAUwGLTuVb23JGpzg6wbjjV7jANtakpUQEVU';

const SENHA_ADMIN = 'chacara2026';

const db = {
    async get(tabela, filtros = {}) {
        let url = `${SUPABASE_URL}/rest/v1/${tabela}?select=*`;
        for (const [campo, valor] of Object.entries(filtros)) {
            url += `&${campo}=eq.${encodeURIComponent(valor)}`;
        }
        url += '&order=criado_em.asc';
        const res = await fetch(url, { headers: cabecalhos() });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async inserir(tabela, dados) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
            method: 'POST',
            headers: { ...cabecalhos(), 'Prefer': 'return=representation' },
            body: JSON.stringify(dados)
        });
        if (!res.ok) throw new Error(await res.text());
        const resultado = await res.json();
        return resultado[0];
    },
    async deletar(tabela, id) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?id=eq.${id}`, {
            method: 'DELETE',
            headers: cabecalhos()
        });
        if (!res.ok) throw new Error(await res.text());
    },
    async atualizar(tabela, id, dados) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?id=eq.${id}`, {
            method: 'PATCH',
            headers: { ...cabecalhos(), 'Prefer': 'return=representation' },
            body: JSON.stringify(dados)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async query(tabela, queryString) {
        const url = `${SUPABASE_URL}/rest/v1/${tabela}?${queryString}`;
        const res = await fetch(url, { headers: cabecalhos() });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
};

function cabecalhos() {
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };
}