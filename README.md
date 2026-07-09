# Galeria Pessoal

Aplicativo de galeria pessoal com upload, organização, busca, favoritos, visualização ampliada e armazenamento local no navegador.

## Tecnologias utilizadas

- HTML5
- CSS3 responsivo
- JavaScript moderno
- Dexie.js para IndexedDB
- FilePond para upload de imagens
- PhotoSwipe para visualização em tela cheia
- Phosphor Icons Duotone para ícones
- SweetAlert2 para alertas e confirmações
- Fuse.js para busca inteligente
- browser-image-compression para compressão automática de imagens
- PWA com `manifest.json` e `service-worker.js`

## Funcionalidades

- Upload de uma ou várias fotos
- Preview antes de salvar
- Armazenamento local com IndexedDB
- Galeria responsiva
- Filtro por categoria
- Área de favoritas
- Busca por nome, categoria ou descrição
- Visualização em tela cheia com PhotoSwipe
- Compartilhamento de fotos pelo menu nativo do celular quando disponível
- Edição de categoria
- Exclusão com confirmação
- Limpeza total da galeria
- Ícone instalável como aplicativo no celular
- Rodapé discreto com autoria e foto de Edivandro Lima
- Compressão automática antes de salvar fotos grandes

## Como rodar localmente

Como o projeto usa módulos JavaScript e Service Worker, rode com servidor local.

### Opção 1: VS Code + Live Server

1. Abra a pasta do projeto no VS Code.
2. Instale a extensão **Live Server**.
3. Clique com o botão direito no `index.html`.
4. Escolha **Open with Live Server**.

### Opção 2: Node.js

```bash
npx serve .
```

Depois acesse o endereço indicado no terminal.

## Como instalar no celular

Depois de publicar na Vercel ou abrir em um servidor HTTPS:

1. Abra o site no navegador do celular.
2. Toque no menu do navegador.
3. Escolha **Adicionar à tela inicial** ou **Instalar aplicativo**.
4. O app aparecerá com o ícone da Galeria Pessoal.

## Observações importantes

As fotos ficam salvas no navegador do dispositivo atual, usando IndexedDB. Se o usuário limpar os dados do navegador, as fotos podem ser apagadas.

Para uma versão fullstack futura, o próximo passo recomendado é integrar com Supabase Auth + Supabase Storage para login e fotos em nuvem.

## Autor

Desenvolvido por Edivandro Lima.

O projeto inclui um rodapé discreto com a foto do autor em `src/assets/images/edivandro-lima.jpg`.


## Correção mobile aplicada

- Fotos agora usam `object-fit: contain`, para aparecerem inteiras nos cards.
- Botões dos cards foram reorganizados em grid para evitar corte na tela do celular.
- O layout recebeu proteção contra rolagem horizontal indesejada.
- O cache da PWA foi atualizado para carregar a nova versão do CSS.

## Ajuste mobile 1.0.2

- Cards da galeria em 2 colunas no celular.
- Fotos exibidas inteiras, sem corte, com `object-fit: contain`.
- Botões dos cards viraram ações por ícone no mobile para evitar corte de texto.
- Hero, indicadores e menu superior foram compactados para melhorar a experiência em telas pequenas.


## Ajuste 1.0.3

- Removida dependência de fonte local para evitar erros 404 de `.woff2` no console.
- Fotos novas recebem títulos limpos automaticamente, como `Foto 01`, `Foto 02` e `Foto 03`.
- Fotos antigas sem título são normalizadas automaticamente ao abrir o app.
- O botão de edição agora permite alterar título e categoria da foto.
- Botões de ação possuem `aria-label`, melhorando acessibilidade no mobile com ícones.
- Adicionado seletor de proporção: **Inteira** ou **Preencher**.
- O recurso de copiar e colar imagens foi avaliado como opcional e removido em versão posterior para simplificar a experiência mobile.


## Ajuste 1.0.4

- Adicionada compressão automática com `browser-image-compression`.
- Fotos grandes são otimizadas antes de serem salvas no IndexedDB.
- O app mantém o nome original da foto, mas salva uma versão mais leve quando a compressão reduz o tamanho.
- Cards exibem um selo com a economia de espaço, por exemplo `-62%`.
- O botão de salvar mostra `Otimizando fotos...` durante o processamento.
- O cache da PWA foi atualizado para carregar a nova versão do JavaScript.

### Configuração atual da compressão

```javascript
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.82
};
```

Essa configuração reduz o peso das fotos sem tentar destruir a qualidade visual. Para galeria pessoal e uso mobile, é uma boa configuração inicial.

## Ajuste 1.0.5

- Percentual de otimização agora aparece também no mobile como selo sobre a foto.
- Campo de pesquisa recebeu placeholder mais curto no celular para evitar corte visual.
- Área de pesquisa recebeu espaçamento e padding ajustados para telas pequenas.
- Fotos agora possuem feedback visual ao tocar no celular, melhorando a sensação de interação.
- O cache da PWA foi atualizado novamente para carregar CSS e JavaScript novos.


## Atualização 1.0.6

- Adicionado botão **Compartilhar** em cada foto.
- No celular, o botão abre o compartilhamento nativo do sistema quando o navegador permite.
- Se o compartilhamento direto não estiver disponível, o aplicativo exibe uma mensagem orientando o usuário a tentar no celular, no app instalado ou em navegador compatível.
- Ajustado o grid de ações no mobile para comportar quatro botões: Favoritar, Compartilhar, Editar e Excluir.
- Atualizado o cache da PWA para carregar a nova versão do JavaScript e CSS.


## Atualização 1.0.7

- Removido o botão **Copiar** dos cards da galeria.
- Removido o botão **Colar foto** do topo do aplicativo.
- A interface mobile ficou mais limpa, com quatro ações principais por foto: Favoritar, Compartilhar, Editar e Excluir.
- O compartilhamento continua ativo por meio da Web Share API quando o navegador/dispositivo permite.
- Atualizado o cache da PWA para evitar carregamento da versão anterior.
