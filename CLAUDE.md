# Guía para agentes

- Idioma de la interfaz y del contenido: español (Bolivia). Código e identificadores pueden estar en inglés o español, siga el estilo del archivo.
- Antes de hacer push: `npx tsc --noEmit -p tsconfig.app.json && npm test && npm run build`.
- El motor (`src/engine/`) está validado contra statsmodels: cualquier cambio numérico debe seguir pasando `tests/engine.test.ts`. Si agrega un estimador, agregue su fixture en `scripts/make_fixtures.py`.
- Nunca presente datos simulados como oficiales: todo dataset lleva `source`.
- Colores sólo mediante los tokens de `src/styles.css` (claro y oscuro); los gráficos leen los tokens con `useThemeColors`.
- Las rejillas de página usan container queries (`@container` en `<main>`) porque el cajón del Auxiliar reduce el ancho útil.
- `__ARTIFACT__` es verdadero en el build para claude.ai: allí no hay red externa (el Banco Mundial no funciona) y el tutor usa la capacidad `sample`.
