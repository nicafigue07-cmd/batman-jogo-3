# FORGE IA 3D PRO

**Site:** https://nicafigue07-cmd.github.io/batman-jogo-3/forge-ia-3d/

## O que o site faz sem configurar nada
- Cria e modifica protótipos 3D (cidade, praia, floresta ou espaço).
- Entende comandos simples em português, como "coloque 8 personagens", "deixe de noite", "adicione 15 cristais", "câmera em primeira pessoa".
- Edita a quantidade de NPCs decorativos, cristais e obstáculos, velocidade e iluminação.
- Salva o projeto no navegador, desfaz alterações e permite exportar jogo HTML.

O modo gratuito **não é uma IA generativa real**; usa interpretação de comandos por regras.

## Para ativar um modelo de IA real

O arquivo backend/server.mjs fornece uma API opcional usando **OpenAI Responses API**. Requer Node.js 22+, hospedagem Node com HTTPS, conexão com a internet e conta com acesso à API OpenAI.

1. Hospede este servidor em uma plataforma para Node.js (ou rode localmente para testar).
2. Cadastre as variáveis de ambiente **privadas**:
   - OPENAI_API_KEY: sua chave da API OpenAI (nunca coloque no HTML nem no GitHub).
   - FORGE_ACCESS_TOKEN: uma senha longa *diferente* da chave da API, para autorizar suas solicitações.
   - OPENAI_MODEL (opcional): padrão gpt-6.1-sol.
   - PORT (opcional): porta da hospedagem, padrão 8787.
3. Comando de inicialização: node forge-ia-3d/backend/server.mjs (a partir da raiz do repositório).
4. No site, clique em "⚙ IA real", informe a URL HTTPS terminada em /api/forge e sua senha de acesso.
5. Digite o pedido no chat. O modelo planejará alterações no projeto com base no estado atual.

A senha de acesso fica só na sessão do navegador. O backend tem limite básico de 5 pedidos/minuto/IP, mas para uso público amplie a proteção com autenticação e controle de gastos. A API pode gerar cobranças. Se for menor de idade, configure serviços pagos com um responsável.

**Limitação:** mesmo com modelo real, este editor não cria jogos AAA, carros dirigíveis, animações avançadas ou multiplayer. A IA adapta opções de cenário/câmera e conversa sobre o desenvolvimento; funcionalidades de jogo novas exigem código novo.

## Jogo exportado

O HTML exportado carrega Three.js pela internet. É um protótipo, não um projeto Unity ou Unreal.
