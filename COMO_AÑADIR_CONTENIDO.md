# Cómo añadir campañas, escenarios y cartas nuevas

**Lo más fácil: el MODO EDICIÓN** (menú → *Modo edición (crear cartas)*). Es un formulario, sin programar:

1. **Paquete**: nombre y caja de New Game.
2. **Cartas**: tipo, valores impresos (casillas para Guardián, Oleada, Dureza…) y, sobre todo, el **constructor de reglas**: eliges
   *cuándo* (al revelarse, acción de héroe…), el *coste* y uno o varios *efectos* de un menú; la frase se escribe sola y la ves en vivo.
3. **Escenarios**: fases del villano (las tuyas o las del juego), plan principal (crea las dos caras con un botón), cartas de encuentro
   con su número de copias y sets; marca «versión experta» y elige sus fases.
4. **Sets** modulares.
5. **Comprobar e instalar**: el motor revisa todo, lo instala (la app se reinicia y vuelve al editor) y cada carta tiene
   **«Probar en partida»**: una partida preparada con la carta en la mano (con recursos para pagarla) o revelada en la fase del villano.
   También: descargar el ZIP, abrir un paquete instalado o un ZIP para editarlo. El borrador se guarda solo en el dispositivo.

Si prefieres escribir los archivos a mano, todo lo que sigue explica el formato (el editor genera exactamente esto).

## Reglas sin programar (`"reglas"`)

Cada carta puede llevar en `cartas.json` una lista de frases que describen lo que hace:

```json
{"card_id": "99101", "type": "Event", "name": "Golpe certero", "desc": {"Cost": "2", "Class": "Aggression"},
 "reglas": ["Acción de héroe (ataque): inflige 4 de daño a un enemigo y roba 1 carta."]}
{"card_id": "99102", "type": "Treachery", "name": "Embestida", "desc": {"Boost": "2"},
 "reglas": ["Al revelarse (héroe): el villano te ataca.", "Al revelarse (alter-ego): el villano maquina."]}
{"card_id": "99103", "type": "Minion", "name": "Matón", "desc": {"HP": "3", "ATK": "1", "SCH": "1", "Guard": "1"},
 "reglas": ["Al ser derrotado: pon 1 de amenaza en el plan principal."]}
```

Forma de cada frase: **`Disparador [(condición)] [, coste] : efecto [y efecto …].`** El motor las traduce a las mismas piezas que usan
las cartas oficiales; si una frase no se entiende, el validador dice cuál y propone la correcta (p. ej. «Al revelar» → «Al revelarse»).

### Cuándo (disparadores)

| Disparador | Para | Qué significa |
|---|---|---|
| `Acción` | eventos, apoyos, mejoras, aliados | Un evento se juega con esta acción; una carta en juego la usa cuando quieras en tu turno (ponle un coste) |
| `Acción de héroe` · `Acción de héroe (ataque)` · `Acción de héroe (frustración)` | cartas de jugador | Solo en forma de héroe; «(ataque)»/«(frustración)» la marcan como ataque o frustración |
| `Acción de alter-ego` | cartas de jugador | Solo en forma de alter-ego |
| `Al entrar en juego` | aliados, apoyos, mejoras (y esbirros/accesorios/planes: igual que «Al revelarse») | Respuesta al entrar en juego la carta |
| `Al revelarse` · `Al revelarse (héroe)` · `Al revelarse (alter-ego)` | cartas de encuentro, villanos, planes | Cuando se revela (opcionalmente, solo si el jugador está en esa forma) |
| `Al ser derrotado` | esbirros, aliados, villanos, planes secundarios | Cuando es derrotado (un plan secundario: al quitarle toda la amenaza) |
| `Potenciación` | cartas de encuentro | Cuando la carta se usa como potenciación en una activación del villano |

### Costes (opcionales, tras una coma)

`Acción, agota esta carta: …` · `Acción, descarta una carta de tu mano: …`

### Efectos (se pueden encadenar con «y»)

* `inflige 3 de daño a un enemigo`
* `inflige 2 de daño a cada enemigo`
* `inflige 1 de daño a tu héroe`
* `inflige 1 de daño a cada héroe`
* `cura 2 de daño a un personaje`
* `cura 3 de daño a tu héroe`
* `cura 2 de daño al villano`
* `quita 2 de amenaza de un plan`
* `quita 1 de amenaza del plan principal`
* `quita 1 de amenaza de cada plan`
* `pon 1 de amenaza en el plan principal`
* `pon 1 por jugador de amenaza en el plan principal`
* `pon 2 de amenaza en esta carta`
* `roba 2 cartas`
* `cada jugador roba 1 carta`
* `descarta 1 carta al azar`
* `cada jugador descarta 1 carta al azar`
* `aturde a un enemigo`
* `confunde al villano`
* `da dureza a tu héroe`
* `prepara a tu héroe`
* `agota a un aliado`
* `el villano maquina`
* `el villano te ataca`
* `el villano ataca a cada jugador`
* `el villano maquina contra cada jugador`
* `recibe 1 carta de encuentro`
* `cada jugador recibe 1 carta de encuentro`
* `esta carta gana oleada`
* `busca «Nombre de la carta» en el mazo de encuentros y revélala`
* `busca «Nombre de la carta» en el mazo de encuentros y ponla en juego`
* `descarta cartas de encuentro hasta un esbirro y ponlo en juego`

### Objetivos

* **Elegidos por el jugador** (uno por regla): `un enemigo`, `un esbirro`, `un personaje`, `un aliado`, `un plan`, `un plan secundario`.
* **Fijos**: `el villano`, `cada enemigo`, `cada esbirro`, `tu héroe`, `cada héroe`, `cada aliado`, `esta carta`, `el plan principal`, `cada plan`, `cada plan secundario`.
* Números: cifras o palabras (`una`, `dos`, `tres`…). `por jugador` multiplica por el número de jugadores (`pon 1 por jugador de amenaza…`).
* Mayúsculas, tildes y contracciones dan igual (`al villano` = `a el villano`, `del plan` = `de el plan`). Los nombres de carta van entre « » o comillas.

Todo este vocabulario está comprobado en partidas reales (`tests/test_rules_play*.py`, 53 comprobaciones).

### Lo que todavía necesita un script de Python
Efectos permanentes («+1 ATK mientras…»), condiciones complejas («si hay 2 esbirros…»), límites («una vez por ronda»), interrupciones
o respuestas a lo que hacen OTRAS cartas, y elecciones entre varias opciones. Para eso, `cartas/<id>.py` (sección 3). Si una carta tiene
reglas y script, se usa el script.

### Avisos útiles
* Una «Acción» de una carta en juego sin coste se podría usar sin límite: el validador te sugiere «, agota esta carta».
* El primer villano y el primer plan principal se revelan en la **preparación**, con los mazos de los jugadores aún vacíos: no uses
  ahí «roba» ni «descarta» (el validador avisa).

La app admite **paquetes de contenido**: una carpeta (o su ZIP) con escenarios, sets de encuentro, cartas nuevas con sus
reglas (scripts) e imágenes. Se instalan desde el menú (**Importar contenido**), quedan guardados en el dispositivo, viajan
en la **Copia de seguridad** y se pueden **Quitar**. Antes de instalar nada, **el propio motor del juego comprueba el
paquete** y, si hay errores, te dice cuáles y en qué archivo.

En `fuentes/contenido/ejemplo_regreso_de_rhino/` tienes un paquete completo de ejemplo (y en `contenido_ejemplo.zip`, listo
para importar). **Lo más fácil es copiarlo y modificarlo.**

## 1. Estructura de un paquete

```
mi_campania/
├── contenido.json            obligatorio
├── caja.json                 opcional: la caja que aparece en «New Game»
├── cartas/
│   ├── cartas.json           cartas nuevas (catálogo)
│   └── 99003.py              reglas de la carta 99003 (una por archivo, opcional)
├── escenarios/
│   ├── mi_escenario.json
│   └── mi_escenario_expert.json   versión experta (New Game la espera)
├── sets/                     sets de encuentro / modulares
│   └── mi_set.json
├── nemesis/                  sets de némesis (opcional)
├── mazos/                    mazos de héroe (opcional; aparecen en el selector como «Mío»)
└── imagenes/                 99001a.jpg, 99002.jpg… (opcional)
```

### `contenido.json`
```json
{ "id": "mi_campania", "nombre": "Mi campaña", "version": "1", "autor": "Tu nombre", "descripcion": "…" }
```
`id`: corto, en minúsculas, sin espacios (letras, números, `_` o `-`). Si reimportas un paquete con el mismo `id`, se actualiza.

### `caja.json` (la caja de New Game)
```json
{ "nombre": "90. Mi campaña", "escenarios": ["mi_escenario"], "heroes": [], "sets": ["mi_set"] }
```
`escenarios`: nombres de archivo sin `.json` y **sin** `_expert`. Sin `caja.json`, los escenarios salen en la caja «Custom».

## 2. Cartas nuevas: `cartas/cartas.json`
Mismo formato que el catálogo del juego (`fuentes/repo/data/cards.json`): un grupo con una lista de cartas.
```json
{
  "mi_campania": [
    {"card_id": "99001a", "type": "MainScheme", "name": "Robo en el puerto", "desc": {"Stage": "1"}, "traits": [], "set_name": "Mi escenario"},
    {"card_id": "99001b", "type": "MainScheme", "name": "Robo en el puerto",
     "desc": {"StartingThreat": "0", "TargetThreat": "8*", "EscalationThreat": "1*", "Stage": "1"}, "traits": [], "set_name": "Mi escenario",
     "text": "<b>If this stage is completed, the players lose the game.</b>"},
    {"card_id": "99002", "type": "Minion", "name": "Matón", "desc": {"HP": "3", "ATK": "1", "SCH": "1", "Boost": "1", "Guard": "1"},
     "traits": ["CRIMINAL"], "set_name": "Mi set", "text": "Guard."}
  ]
}
```
* **`card_id`**: único. Usa números que el juego no use (por ejemplo **a partir de 99001**). Las caras de una misma carta
  llevan letra (`99001a`, `99001b`). Si reutilizas un id del juego, tu carta **lo sustituye** (el validador avisa).
* **`type`**: `Villain`, `MainScheme`, `SideScheme`, `Minion`, `Treachery`, `Attachment`, `Environment`, `Obligation`,
  `Ally`, `Event`, `Support`, `Upgrade`, `Resource`, `Hero`, `AlterEgo`, `PlayerSideScheme`…
* Campos opcionales: `subtitle`, `traits`, `set_name`, `text`, `desc` (si faltan se usan valores vacíos).
* **`desc`**: valores impresos (`HP`, `ATK`, `SCH`, `THW`, `DEF`, `REC`, `Cost`, `Boost`, `StartingThreat`, `TargetThreat`…).
  **Las palabras clave sin texto especial (Guard, Toughness, Quickstrike, Surge, Patrol…) se activan desde aquí: no
  necesitan script.** Copia las claves de una carta parecida del catálogo.
* **`text`**: el texto que se muestra (se puede usar `<b>…</b>` e `<i>…</i>`). El texto **no** crea reglas por sí solo.

## 3. Reglas complejas: `cartas/<id>.py` (opcional)
La mayoría de cartas se hacen con `"reglas"` (arriba). Solo los efectos complejos necesitan script. Es Python, con la misma API que las 3.457 cartas del juego:
```python
from . import *

def GetAbilities() -> Sequence['Ability']:
    def ataca(effect: 'Effect', message: 'Message.WhenCardRevealed') -> None:
        player = message.GetToPlayer()
        villain = Worlds.FindVillain(effect)
        if villain:
            villain.DoAttackYou(player, effect)
    return [ AbilityFactory.WhenThisRevealed("Hero", ataca) ]
```
**Truco**: busca en `fuentes/repo/cards/pack/` una carta del juego con un efecto parecido (por su texto en
`data/cards.json`) y copia su script. Referencia completa: `fuentes/repo/docs/card_scripting_guide.md`.

## 4. Escenarios y sets
* `escenarios/<nombre>.json` — mismo formato que `fuentes/repo/data/scenarios/rhino.json`:
  `villain` (fases del villano), `schemes` (planes principales, caras separadas por coma: `"99001a,99001b"`),
  `encounters` (cartas propias del escenario, repetidas tantas veces como copias), `encounter_sets` (`["standard"]`, y en
  experto `["standard", "expert"]`), `modular_sets` (sets modulares por defecto), `set_aside`.
* La versión experta es otro archivo `<nombre>_expert.json` con `"expert": true`, normalmente fases II/III del villano y el set `expert`.
* `sets/<nombre>.json` — `{"version": "0.5.8", "name": "Mi set", "encounters": ["99002", "99002", "01102"]}`.
* Puedes usar cartas, villanos y sets **del juego** (por su id / nombre de archivo) junto con los tuyos.

## 5. Imágenes
`imagenes/<id>.jpg` (o `.png` / `.webp`), una por carta o cara. Los planes apaisados se giran solos. Las cartas sin imagen
se dibujan con sus datos (nombre, tipo, valores, texto).

## 6. Comprobar e instalar
1. **Comprobar en el ordenador** (opcional, recomendable): `python3 fuentes/pwa/tools/validar_contenido.py mi_campania`
   (o el ZIP). Muestra errores, avisos y dónde se instalaría cada archivo.
2. **Instalar en la app**: comprime la carpeta en un ZIP → menú **Importar contenido** → elige el ZIP. Si hay errores no se
   instala nada y se listan; si todo va bien pulsa **Reiniciar la app para usarlo**.
3. **Incluirlo en la propia app** (para quien la publica): pon la carpeta o el ZIP en una carpeta `contenido/` y reconstruye
   con `reconstruir.sh` (variable `CONTENT_DIR=…`) o `build_pwa.py --content contenido`. Esos paquetes vienen de serie y no se pueden quitar desde el menú.

## 7. Errores frecuentes (y lo que dice el validador)
| Mensaje | Causa |
|---|---|
| `cartas que no existen: …` | Un escenario o set usa un id que no está ni en el juego ni en `cartas/cartas.json` |
| `usa el set '…', que no existe` | Nombre de set mal escrito (es el nombre del archivo, sin `.json`) |
| `la carta … no se puede cargar (KeyError: 'type')` | Falta un campo obligatorio de la carta |
| `no entiendo el efecto «…». ¿Quizá …?` | Una regla con una frase que no está en el vocabulario: usa la sugerida |
| `usa la clave «X» en "desc", que no existe para ese tipo` | Un valor impreso inventado (p. ej. `ATKCost`): el mensaje lista las claves válidas |
| `error de sintaxis en la línea N` | El script de la carta tiene un error de Python |
| `AttributeError: … (línea N)` | El script usa una función que no existe: copia el nombre exacto de otra carta |
| `no tiene versión experta` (aviso) | Falta `<escenario>_expert.json`; New Game lo mostrará como no disponible |
