# KAIZO

Aplicativo React/PWA para gestão de serviços automotivos. Clientes, veículos, ordens de serviço, diagnósticos, orçamentos, aprovações, histórico e pagamentos funcionam sem backend e são persistidos localmente no navegador.

## Stack oficial

- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- PWA com manifesto e service worker
- Persistência local atrás de uma camada de repositório

O projeto não usa backend, autenticação, Supabase, Next.js, Vinext, Wrangler, Cloudflare Workers, OpenNext ou adapters de runtime.

## Desenvolvimento

Requisito: Node.js 20.19 ou superior.

```bash
npm install
npm run dev
```

O Vite exibirá o endereço local no terminal.

## Build de produção

```bash
npm run build
```

O resultado é gerado em `dist/`.

Para testar exatamente o build de produção:

```bash
npm run preview
```

## Deploy na Vercel

Importe o repositório na Vercel. O projeto já inclui `vercel.json` e usa:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Não são necessárias funções, adapters ou configurações adicionais.

## Persistência local

A implementação está em `src/lib/repository.ts`. A interface consome serviços de clientes, veículos, ordens, pagamentos e configurações, sem acessar `localStorage` diretamente.

Os dados são locais a cada navegador/dispositivo. Em **Configurações**, “Restaurar dados de demonstração” volta ao estado inicial.

### Fotos e evidências

Os metadados das evidências ficam associados à OS, mas as imagens nunca são gravadas no `localStorage`. Fotos são redimensionadas/comprimidas quando necessário e persistidas como `Blob` no IndexedDB.

- `src/lib/mediaRepository.ts`: contrato de armazenamento de mídia e implementação IndexedDB.
- `src/lib/evidenceService.ts`: compressão, criação, leitura e exclusão das evidências.
- `src/components/EvidenceGallery.tsx`: interface da oficina e galeria compacta exibida ao cliente.

Para uma futura migração, implemente `MediaStorageRepository` com Supabase Storage e substitua o adapter exportado por `mediaRepository`; os componentes não precisam ser alterados.

## PWA

O manifesto e o service worker ficam em `public/`. Em navegadores compatíveis, o KAIZO pode ser instalado e reutiliza o shell em modo offline após a primeira visita.

## Regra de arquitetura

O ambiente permanente do KAIZO é React + Vite + TypeScript com deploy estático na Vercel. Consulte também `AGENTS.md` antes de alterações estruturais.
