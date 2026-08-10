# KAIZO

Aplicativo web/PWA de gestão de serviços automotivos. O protótipo funciona sem backend: clientes, veículos, ordens de serviço, orçamentos, aprovações, histórico e pagamentos são salvos localmente no navegador.

## Como rodar

Requisitos: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Para validar a versão de produção:

```bash
npm run build
```

## Dados locais

O app inicia com dados de demonstração e usa uma camada de repositório em `lib/repository.ts`. Nenhuma página acessa o armazenamento diretamente, deixando a persistência pronta para ser substituída por uma API/Supabase no futuro.

Em **Configurações**, o botão “Restaurar dados de demonstração” limpa as alterações locais e volta ao estado inicial.

## PWA

O manifesto e o service worker ficam em `public/`. Em navegadores compatíveis, o KAIZO pode ser instalado e mantém o shell principal disponível offline.
