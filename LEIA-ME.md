# Compras COAP — pronto para publicar no Netlify

Este pacote é o aplicativo completo. Diferente do zip anterior, este já inclui
tudo: as telas e o "arquivo da secretaria" (o banco de dados), usando o
armazenamento gratuito do próprio Netlify (Netlify Blobs). Você não precisa
criar conta em nenhum outro serviço.

## O que fazer, passo a passo

### 1. Suba estes arquivos para o GitHub
- Acesse o repositório "compras-coap" que você já criou no GitHub (o mesmo de antes).
- Se ele já tiver arquivos de uma tentativa anterior, apague-os primeiro (ou crie um repositório novo, do zero, com esse mesmo nome).
- Clique em "Add file" → "Upload files".
- Arraste **todo o conteúdo desta pasta** (não a pasta em si, e sim os arquivos e pastas de dentro dela: `src`, `netlify`, `package.json`, `index.html`, `vite.config.js`, `netlify.toml`, `.gitignore`) para dentro da página.
- Role até o final e clique em "Commit changes".

### 2. Conecte o repositório ao Netlify
- No Netlify, clique em "Add new site" → "Import an existing project".
- Escolha "Deploy with GitHub" e autorize o acesso, se pedir.
- Selecione o repositório "compras-coap".
- Nas configurações de build, confirme (ou preencha, se não vier automático):
  - Build command: `npm run build`
  - Publish directory: `dist`
- Clique em "Deploy site".

### 3. Aguarde a publicação
- O Netlify vai instalar as peças do aplicativo e publicá-lo. Isso leva alguns minutos.
- Quando terminar, o Netlify mostra o link do site (algo como `nome-aleatorio.netlify.app`).
- O armazenamento de dados (Netlify Blobs) já fica ativo automaticamente — não é preciso configurar nada a mais.

### 4. Use o aplicativo
- Abra o link gerado. Esse é o link que você compartilha com toda a equipe do colégio.
- PIN padrão de todos os acessos (solicitantes, administrador e diretor): `0000`.
- Depois do primeiro acesso, cada um pode trocar o próprio PIN dentro do sistema (solicitante: botão "PIN" no topo; administrador: aba "Configurações").

## Se quiser mudar o endereço do site
No painel do Netlify, em "Site configuration" → "Change site name", dá para trocar o nome aleatório por algo como `compras-coap.netlify.app` (se estiver disponível).

## Se algo der errado na publicação
Me envie um print da tela de erro (o Netlify mostra um "deploy log") que eu te ajudo a identificar o problema.
