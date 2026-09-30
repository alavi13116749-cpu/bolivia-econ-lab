import { Markdown } from '../ui/Markdown';

const TEXT = String.raw`
## Qué es
**Auxiliar IA — Bolivia Econ Lab** es una aplicación educativa para estudiantes de Econometría II y Economía Monetaria II. Todo el cálculo ocurre en su navegador: no hay servidor y sus datos no salen de su computadora (salvo lo que usted envíe al Auxiliar IA).

## El motor econométrico
Escrito desde cero en TypeScript y **validado automáticamente contra statsmodels y linearmodels** (34 pruebas):

| Método | Qué se compara |
|---|---|
| MCO | coeficientes, errores clásicos, HC1 y Newey-West, R², F, AIC/BIC, Durbin-Watson |
| Diagnóstico | Breusch-Pagan (Koenker), White, Breusch-Godfrey, Jarque-Bera, RESET, VIF |
| Raíces unitarias | ADF con selección de rezagos por AIC, p-valores MacKinnon (1994), críticos MacKinnon (2010), KPSS |
| Series | FAC, FACP, ARMA (suma de cuadrados condicional, cercano a MV) |
| VAR | coeficientes, Σu, AIC/BIC/HQ, selección de orden, IRF ortogonalizadas, FEVD, Granger |
| Cointegración | Engle-Granger con críticos de MacKinnon para N variables |
| MC2E | coeficientes y errores; F de primera etapa, Hausman, Sargan |
| Logit/Probit | coeficientes, errores, log-verosimilitud, efectos marginales promedio con método delta |
| Panel | efectos fijos (within), efectos aleatorios (Swamy-Arora), Hausman |

Convenciones: HC1 y HAC usan la corrección $n/(n-k)$ como Stata y EViews.

## Los datos
- **Datasets didácticos (etiqueta "Simulado")**: generados con parámetros conocidos y calibrados a rasgos de la economía boliviana, para que los ejercicios tengan respuesta verificable. **No son estadísticas oficiales.**
- **Banco Mundial (en vivo)**: indicadores oficiales de Bolivia descargados de api.worldbank.org en el momento (sólo en la versión web).
- **Sus datos**: importe CSV o pegue desde Excel; se acepta coma decimal.

## El Auxiliar IA
- Dentro de **claude.ai** conversa con Claude usando su propia cuenta, y puede **ejecutar análisis en el Lab** como herramienta.
- En la **versión web** puede usar su propia clave de la API de Anthropic (se guarda sólo en su navegador).
- **Sin conexión**, responde con el material del curso y la interpretación automática del Lab.

El Auxiliar puede equivocarse: verifique los resultados con el Lab y con su docente.
`;

export default function About() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="eyebrow !text-accent">Acerca de</div>
      <h1 className="display mb-4 text-3xl sm:text-4xl">Cómo funciona</h1>
      <Markdown text={TEXT} />
    </div>
  );
}
