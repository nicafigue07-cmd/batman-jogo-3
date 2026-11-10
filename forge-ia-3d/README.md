# FORGE IA 3D PRO — versão 5

**Site:** https://nicafigue07-cmd.github.io/batman-jogo-3/forge-ia-3d/

A FORGE é um editor de protótipos 3D com Three.js. A parte gratuita funciona diretamente no navegador. O modo de geração por IA real exige um servidor e chave de API, que não são fornecidos pelo GitHub Pages.

## Ferramentas gratuitas

- Cenários de cidade, praia, floresta e base espacial; iluminação de dia, noite e pôr do sol.
- Jogabilidade 3D com câmera, sombras, minimapa, coleção de cristais, plataformas, portais e NPCs que respondem à tecla E.
- Corrida, salto, pausa, reinício de missão e modo contra o tempo.
- **Editor de objetos 3D**: árvores, casas, rochas, caixas, muros, torres, postes, portais e plataformas.
- Clique para adicionar, ligar o modo editar e arrastar os objetos; alterar posição, cor e tamanho, duplicar e excluir.
- Modelos de aventura urbana, parkour e exploração na praia.
- Desfazer/refazer; salvar e carregar; exportar e importar o projeto JSON.
- Exportar seu jogo HTML e jogar no navegador (internet necessária para carregar Three.js).
- Comandos locais em português, por exemplo: "adicione 5 casas", "crie uma praia", "coloque 8 cristais".

**Importante:** os comandos locais são regras, não um modelo generativo equivalente ao ChatGPT.

## Ativar modelo de IA real (opcional)

O backend Node.js 22+ está no arquivo forge-ia-3d/backend/server.mjs. Ele chama a OpenAI Responses API quando configurado.

1. Publique o backend em hospedagem Node.js HTTPS (não use apenas GitHub Pages).
2. Configure variáveis de ambiente privadas na hospedagem:
   - OPENAI_API_KEY: chave da API OpenAI. Nunca coloque no HTML ou no repositório.
   - FORGE_ACCESS_TOKEN: senha longa, diferente da chave da API.
   - OPENAI_MODEL: opcional, padrão gpt-6.1-sol.
   - PORT: opcional, padrão 8787.
3. Comando a executar a partir da raiz do repositório: node forge-ia-3d/backend/server.mjs
4. No estúdio, clique em **⚙ IA real** e informe a URL HTTPS terminada em /api/forge e a senha de acesso.
5. Use o chat para pedir mudanças de cenário, câmera, personagens e novos objetos.
6. Para pedir um minijogo HTML independente, clique em **🚀 Gerar um jogo novo com código de IA**. A prévia é exibida em iframe isolado, e o arquivo HTML pode ser baixado após teste.

A prévia utiliza iframe com sandbox e CSP restrita. Mesmo assim, confira todo código gerado pela IA antes de executá-lo fora do editor. Não compartilhe sua senha. O servidor inclui limite básico de requisições; para uso público também são necessários controle de custos e autenticação aprimorada.

**Custos:** a API pode gerar cobranças. Para menores de idade, qualquer configuração de serviços pagos deve ser feita com um responsável.

## Controles

| Controle | Função |
| --- | --- |
| W/A/S/D ou setas | Andar |
| Espaço | Pular |
| Shift | Correr |
| Arrastar mouse | Girar câmera |
| Rodinha do mouse | Zoom |
| E | Conversar com NPC próximo |
| P | Pausar ou continuar |
| R | Reiniciar missão |
| Ctrl+Z / Ctrl+Y | Desfazer/refazer no editor |
| Modo Editar | Selecionar e arrastar objetos |

## Testes automatizados

O fluxo de trabalho .github/workflows/testar-forge.yml verifica o backend com uma API OpenAI simulada e roda o estúdio em Chromium/Playwright com WebGL. Abrange controles, cristal coletado, pausa, minimapa, edição de objetos, modelos de mundo, importar/exportar JSON e HTML, prévia de código gerado com servidor simulado e viewport mobile.

A FORGE não é um motor AAA nem substitui Unity ou Unreal. O modelo conectado ajuda a criar protótipos, mas a qualidade, os testes e a correção do código gerado ainda exigem revisão.
