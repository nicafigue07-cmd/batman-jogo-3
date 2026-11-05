"""Pack only the standalone game and its instructions for public download."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
source = root / 'dist' / 'Batman-Sombras-de-Gotham.html'
if not source.is_file():
    raise SystemExit('Execute npm run build:portable antes de criar o download.')
instructions = '''BATMAN — SOMBRAS DE GOTHAM

1. Extraia os dois arquivos deste ZIP para uma pasta.
2. Abra jogar.html no Chrome, Edge, Firefox ou Safari com WebGL ativado.
3. Escolha PC, Tablet ou Controle e clique JOGAR CAMPANHA ou PATRULHA LIVRE.

O jogo funciona sem baixar modelos, imagens ou outros arquivos da internet.
No PC: WASD move, arraste o mouse para a câmera, Espaço pula/abre a capa,
E usa o gancho, J/K atacam, Q lança batarangue, Z usa fumaça, F interage.
Na patrulha livre: C agacha, V finaliza um guarda por trás sem alerta.
H mostra a ajuda. M escolhe missões. T abre as armaduras.

Cada pessoa tem sua própria partida e progresso local. Não há multiplayer.
Controle PlayStation funciona em navegadores compatíveis; este HTML não é
um aplicativo nativo instalável no PS4 ou PS5.
'''
output = root / 'jogar.zip'
with ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    archive.write(source, 'jogar.html')
    archive.writestr('COMO-JOGAR.txt', instructions)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert archive.namelist() == ['jogar.html', 'COMO-JOGAR.txt']
print(f'Download compartilhável: {output} ({output.stat().st_size:,} bytes)')
