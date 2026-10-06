---
description: Crea un commit siguiendo el formato Conventional Commits
argument-hint: [pista opcional sobre el tipo o alcance del cambio]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

Crea un commit de git siguiendo la especificación [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

## Contexto

- Estado: !`git status --short 2>/dev/null || echo "⚠️ No es un repositorio git"`
- Cambios en staging: !`git diff --cached --stat 2>/dev/null || echo "—"`
- Cambios sin stagear: !`git diff --stat 2>/dev/null || echo "—"`
- Commits recientes (para ver el estilo): !`git log --oneline -10 2>/dev/null || echo "⚠️ Sin commits aún"`

Pista del usuario (puede estar vacía): $ARGUMENTS

## Formato

```
<tipo>(<alcance opcional>)<!>: <descripción>

[cuerpo opcional]

[pie(s) opcional(es)]
```

Tipos permitidos:

- `feat`: nueva funcionalidad
- `fix`: corrección de un error
- `docs`: solo documentación
- `style`: formato que no afecta al código (espacios, comas, etc.)
- `refactor`: cambio de código que no corrige un error ni añade funcionalidad
- `perf`: mejora de rendimiento
- `test`: añadir o corregir tests
- `build`: sistema de build o dependencias
- `ci`: configuración de integración continua
- `chore`: tareas de mantenimiento que no tocan `src` ni tests
- `revert`: revierte un commit anterior

## Reglas

1. **Inicialización**: Si el directorio no es un repositorio git (comando `git status` falla), inicialízalo con `git init`, configura usuario/email si es necesario, y luego continúa.
2. **Revisar cambios**: Inspecciona con `git diff --cached` (o `git diff` si no hay staging) para entender qué se modificó realmente; no confíes solo en nombres de archivos.
3. **Stagear cambios**: Si hay cambios en staging, commitea solo eso. Si no hay nada en staging, añade con `git add` los archivos relevantes por ruta (nunca `git add -A` ni `git add .`); no incluyas `.env`, secretos ni generados.
4. **Dividir si es necesario**: Si los cambios mezclan propósitos distintos, propón dividirlos en varios commits (uno por propósito).
5. **Descripción**: Español, imperativo, minúscula inicial, sin punto final, máximo 72 caracteres.
6. **Alcance (opcional)**: Capa/módulo afectado, p. ej. `auth`, `routes`, `controllers`, `services`, `repositories`, `models`.
7. **Cuerpo**: Solo si el *por qué* no es obvio; explica el motivo, no repitas el diff.
8. **BREAKING CHANGE**: Añade `!` tras tipo/alcance y pie `BREAKING CHANGE: <descripción>`.
9. Usa la tool `AskUserQuestion`para mostrarle al usuario el mensaje del commit, y que decida si le parece bien, si te da el OK, continua. Si te dice que no, proponle otro mensaje y vuelve a preguntarle.
10. **Mensaje**: Usa `git commit -m` (múltiples `-m` o heredoc para cuerpo/pies). Sin `--no-verify` ni `--amend`.
11. **Atribución**: Termina con la línea de atribución del entorno, si existe.
12. **Sin cambios**: Si no hay cambios o no es un repo git, avisa al usuario y detente.
13. **Sin push**: No hagas `git push`.
14. **Primer commit sin historial**: Si es el primer commit (no hay `git log`), revisa igual los cambios y crea el commit normalmente; el mensaje puede ser más descriptivo ya que no hay historial anterior.

Al terminar, muestra el mensaje de commit usado y el resultado de `git status --short`.
