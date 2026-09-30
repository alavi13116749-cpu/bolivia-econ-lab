# Auxiliar IA — Bolivia Econ Lab

Aplicación web educativa para estudiantes de **Econometría II** y **Economía Monetaria II**, con la economía boliviana como hilo conductor. Todo corre en el navegador: no hay servidor.

## Qué incluye

| Módulo | Contenido |
|---|---|
| **Lecciones** | 9 unidades de Econometría II (inferencia robusta, VI, ecuaciones simultáneas, Logit/Probit, panel, ARIMA, raíces unitarias, cointegración, VAR) y 8 de Monetaria II (demanda y oferta de dinero, banca central y BCB, Barro-Gordon, Taylor y modelo de 3 ecuaciones, Mundell-Fleming, señoreaje e hiperinflación de 1985, bolivianización). LaTeX, recuadros "En Bolivia" y errores frecuentes de examen. |
| **Laboratorio** | MCO (clásico, HC1, Newey-West), diagnóstico completo, Logit/Probit con efectos marginales, MC2E con Hausman/Sargan, panel EF/EA/Hausman, ADF+KPSS, correlograma, ARIMA con pronóstico, VAR con IRF/FEVD/Granger, Engle-Granger + MCE. Salida tipo Stata, gráficos, interpretación automática y **código equivalente en Stata, R, Python y EViews**. |
| **Datos** | 7 datasets didácticos simulados con parámetros conocidos (siempre etiquetados como simulados), descarga en vivo de indicadores oficiales de Bolivia del **Banco Mundial**, e importación de CSV o celdas pegadas desde Excel (acepta coma decimal). |
| **Simuladores** | 12: multiplicador con bolivianización, modelo de 3 ecuaciones, regla de Taylor, Barro-Gordon/Rogoff, curva de Laffer del señoreaje, Mundell-Fleming, Baumol-Tobin, explorador ARMA, Monte Carlo de regresión espuria, sesgo de simultaneidad, MPL/Logit/Probit y cobertura de errores robustos. |
| **Práctica** | Banco de preguntas conceptuales y ejercicios numéricos generados al azar con solución paso a paso. Progreso guardado en el navegador. |
| **Auxiliar IA** | Tutor en modos *Explicar*, *Socrático* y *Examen*. Puede **ejecutar análisis en el Lab** como herramienta en lugar de inventar números. |

### El Auxiliar IA: tres proveedores

1. **Dentro de claude.ai** (publicado como Artifact): usa la capacidad `sample` con la cuenta del propio estudiante, sin configurar nada, y expone las herramientas `listar_datasets`, `ejecutar_analisis`, `leer_leccion` y `abrir_pagina`.
2. **Versión web con clave propia**: SDK oficial `@anthropic-ai/sdk` desde el navegador, bucle de herramientas con streaming, `claude-opus-5-5` por defecto (Sonnet 5.5 y Haiku 4.5 opcionales). La clave queda sólo en el navegador del usuario.
3. **Sin conexión**: búsqueda en el material del curso más la interpretación automática del último resultado.

## Validación numérica

`src/engine/` es un motor econométrico escrito desde cero. `tests/engine.test.ts` lo compara contra **statsmodels** y **linearmodels** con fixtures generados por `scripts/make_fixtures.py` (24 pruebas), y `tests/analysis.test.ts` verifica que cada dataset didáctico recupere sus parámetros verdaderos (10 pruebas).

Convención: HC1 y Newey-West aplican la corrección n/(n−k), como Stata y EViews.

## Desarrollo

```bash
npm install
npm run dev            # servidor local
npm test               # 34 pruebas
npm run build          # sitio estático en dist/ (GitHub Pages)
npm run build:artifact # un solo HTML para publicar como Artifact de claude.ai
npm run fixtures       # regenerar fixtures (requiere statsmodels y linearmodels)
```

El flujo `.github/workflows/ci.yml` ejecuta las pruebas en cada PR y publica `dist/` en GitHub Pages al hacer push a `main` (active *Settings → Pages → Source: GitHub Actions*).

## Estructura

```
src/engine/     álgebra lineal, distribuciones, MCO, diagnóstico, VI, Logit/Probit, panel, series de tiempo
src/analysis/   especificaciones de análisis, informes, interpretación, generación de código
src/data/       datasets didácticos y conector del Banco Mundial
src/content/    lecciones y banco de preguntas
src/ai/         proveedores del Auxiliar IA y herramientas
src/sims/       simuladores
src/pages/, src/lab/, src/tutor/, src/ui/   interfaz
```

Los datasets incorporados son **simulados con fines didácticos**; no son estadísticas oficiales.
