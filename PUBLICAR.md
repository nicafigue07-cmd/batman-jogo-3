# Compartilhar o jogo

O jogo é um site estático. Amigos podem abrir a mesma versão no navegador; o
progresso de cada pessoa fica salvo no próprio dispositivo. Não há multiplayer.

## Download público independente

O pacote `jogar.zip` é gerado com `npm run build:share` (Python 3 é necessário apenas para criar o ZIP). Depois de enviar essa versão para `main`, o link para baixar é:

[Baixar jogar.zip](https://github.com/nicafigue07-cmd/batman-jogo-3/raw/refs/heads/main/jogar.zip)

Baixe, extraia e abra **jogar.html** no navegador. Este é um link de download; a página de jogo direto no navegador depende da hospedagem abaixo. O pacote contém somente o jogo independente e as instruções. Regenere e envie o ZIP ao compartilhar uma atualização.

## Publicar com GitHub Pages

O arquivo `.github/workflows/publicar-jogo.yml` prepara e publica a versão de
`main`, com testes antes da publicação. Para habilitar uma primeira publicação:

1. Salve os arquivos do projeto no repositório e envie para `main`.
2. Abra [Settings → Pages](https://github.com/nicafigue07-cmd/batman-jogo-3/settings/pages)
   e selecione **GitHub Actions** em **Build and deployment → Source**.
3. Em [Actions](https://github.com/nicafigue07-cmd/batman-jogo-3/actions), execute
   **Publicar jogo no GitHub Pages**, se a execução automática ainda não ocorreu.
4. Aguarde a tarefa **deploy** ficar verde. Abra a URL que aparece em
   **github-pages** no resultado dessa tarefa e envie essa URL aos amigos.

O endereço esperado, depois de uma publicação bem-sucedida, é
`https://nicafigue07-cmd.github.io/batman-jogo-3/`. Esse endereço não comprova que
o site esteja publicado: confirme o resultado da tarefa antes de compartilhá-lo.

## Preparar para outra hospedagem

Execute:

```sh
npm ci
npm test
npm run build -- --base=./
node scripts/package-portable.mjs
```

Publique **o conteúdo de `dist/`** em um serviço de hospedagem estática. O arquivo
`index.html` é a entrada do site. Os arquivos `Batman-Sombras-de-Gotham-*.html`
também podem ser enviados diretamente aos amigos para jogar sem hospedagem.

## Situação verificada neste ambiente

Em 5 de novembro de 2026, o acesso Git ao repositório e a página pública do
GitHub funcionaram. A ferramenta de prévia do ambiente retornou
`preview relay unavailable`; o acesso à API do GitHub e ao domínio do GitHub
Pages foi bloqueado pela política de rede. Não foi possível habilitar Pages,
acompanhar uma publicação ou validar uma URL pública jogável daqui.

Este arquivo e o workflow preparam a publicação; eles não significam que a
publicação já aconteceu.
