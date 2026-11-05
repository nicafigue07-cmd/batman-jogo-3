# Kaito Nami — Guardião das Marés · 0.8

Aventura 3D original, com Kaito como um menino japonês de 12 anos. Mantém 20 missões, Aonami, Hikaru, dez poderes, personagens, colecionáveis, 12 objetivos regionais, barco, torre com elevador e progresso salvo.

**Jogar online:** https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.8

**Controles:** WASD/setas movem; Shift corre; Espaço salta; Q usa poder; 1–0 selecionam; E interage; R esquiva; K abre habilidades; J diário; I mochila; M mapa; Esc pausa. Arraste a câmera e use a roda do mouse para zoom. Teclas principais são personalizáveis.

Também há controles de toque e gamepad padrão. Analógicos movem e giram; A salta/confirma, B esquiva/volta, X usa poder, Y interage, LB corre, RB troca poder e Start pausa. No menu, o direcional muda o foco. O mapeamento pode variar conforme controle/navegador.

**Novidades 0.8:** mira de combate (C/R3/toque), câmera para chefes, circuito Corrente Azul na escola de surf e correção da câmera sob os guarda-sóis.

**Desde a 0.7:** carregamento por etapas reais; novas tentativas de contexto e primeiro frame; Surf de Maré acelerado; planeio curto; ataques próximos (F/RT/toque), treino na escola de surf e roupas desbloqueáveis na mochila. FOV acompanha a velocidade e respeita Reduzir movimento.

**Se falhar ao abrir:** experimente https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.8&mode=light e copie os detalhes do diagnóstico. A falha reportada no aparelho do jogador ainda depende desse diagnóstico; não declaramos que foi resolvida.

**Novos comandos:** com Surf Rápido ativo, Shift/LB acelera a onda. Segure Salto na descida para planar após desbloquear Salto Aquático. F/RT executa ataque próximo; no celular use Ataque. Mochila (I) permite mudar a paleta de roupa ao concluir 10/20 missões.

**Sistemas preservados:** colisões/câmera e recuperação de saves; evolução de poderes; três tipos de robôs e três fases do chefe; diálogos e cenas em tempo real; aulas de surf; moradores e carros que cedem passagem; água e céu procedurais; opções de acessibilidade; instancing com fallback gráfico.

**Testes e build, a partir da raiz:**

```sh
npm --prefix kaito-nami test
npm --prefix kaito-nami run build
```

O build gera `output/Kaito-Nami.html`, independente e sem dependências de rede. O pacote ZIP inclui fontes, licença, testes e documentação. A pasta tem seu próprio `package.json` para funcionar junto ao código legado, sem alterar seu sistema de módulos.

Veja [relatório 0.8](kaito-nami/RELATORIO-0.8.md) para as mudanças por etapa, arquivos, testes, instruções e pendências. Esta é uma revisão do protótipo; não uma promessa de qualidade 10/10, de 60/30 FPS em todos os aparelhos ou de lançamento comercial autorizado.
