import type { Course } from './types';

const r = String.raw;

export const econometria: Course = {
  id: 'econometria',
  name: 'Econometría II',
  code: 'ECO-II',
  tagline: 'De la regresión clásica a las series de tiempo: ecuaciones simultáneas, variable dependiente limitada, panel, raíces unitarias, cointegración y VAR.',
  units: [
    {
      id: 'e1', number: 1, title: 'Violación de supuestos e inferencia robusta',
      summary: 'Heteroscedasticidad, autocorrelación y cómo hacer inferencia válida sin supuestos que no se cumplen.',
      objectives: ['Detectar heteroscedasticidad (Breusch-Pagan, White) y autocorrelación (Durbin-Watson, Breusch-Godfrey).', 'Usar errores estándar robustos HC1 y Newey-West (HAC).', 'Distinguir entre sesgo del estimador y sesgo de la inferencia.'],
      keywords: ['heteroscedasticidad', 'autocorrelación', 'white', 'breusch', 'newey', 'hac', 'robustos', 'durbin', 'watson', 'mcg'],
      simulators: ['cobertura'],
      lab: [
        { label: 'Mincer con prueba de White', dataset: 'salarios', spec: { kind: 'ols', y: 'ln_salario', x: ['educacion', 'experiencia', 'experiencia^2', 'mujer', 'informal', 'urbano'] } },
        { label: 'La misma regresión con HC1', dataset: 'salarios', spec: { kind: 'ols', y: 'ln_salario', x: ['educacion', 'experiencia', 'experiencia^2', 'mujer', 'informal', 'urbano'], covType: 'HC1' } },
      ],
      body: r`
## El modelo y sus supuestos

Partimos de $y = X\beta + u$. Bajo exogeneidad estricta, $E[u \mid X] = 0$, el estimador MCO
$$\hat\beta = (X'X)^{-1}X'y$$
es **insesgado y consistente**. La varianza "clásica" $\widehat{Var}(\hat\beta) = \hat\sigma^2 (X'X)^{-1}$ exige además $Var(u\mid X) = \sigma^2 I$: **homoscedasticidad** y **ausencia de autocorrelación**.

> Idea clave del examen: la heteroscedasticidad y la autocorrelación **no sesgan** $\hat\beta$ (si los regresores son exógenos), pero **invalidan los errores estándar**, y con ellos los $t$, los $F$ y los intervalos de confianza. MCO deja de ser MELI (el mejor estimador lineal insesgado).

## Heteroscedasticidad

Si $Var(u_i \mid X) = \sigma_i^2$, la varianza verdadera es de tipo "sándwich":
$$Var(\hat\beta) = (X'X)^{-1}\Big(\sum_i \sigma_i^2 x_i x_i'\Big)(X'X)^{-1}.$$

**Detección.**
- **Breusch-Pagan (versión de Koenker):** regresión auxiliar $\hat u_i^2 = \delta_0 + \delta_1 x_{1i} + \dots + v_i$; el estadístico $LM = nR^2_{aux} \sim \chi^2_{k}$ bajo $H_0$.
- **White:** la regresión auxiliar incluye regresores, cuadrados y productos cruzados. Detecta formas más generales, pero gasta muchos grados de libertad.

**Corrección.** Errores robustos de White (HC1):
$$\widehat{Var}_{HC1}(\hat\beta) = \frac{n}{n-k}(X'X)^{-1}\Big(\sum_i \hat u_i^2 x_i x_i'\Big)(X'X)^{-1}.$$
Si se conoce la forma de la varianza, **MCG factibles** (mínimos cuadrados ponderados) recuperan eficiencia.

## Autocorrelación

En series de tiempo es común $u_t = \rho u_{t-1} + \varepsilon_t$.
- **Durbin-Watson:** $DW = \sum (\hat u_t - \hat u_{t-1})^2 / \sum \hat u_t^2 \approx 2(1-\hat\rho)$. Valores cercanos a 2 sugieren ausencia de autocorrelación de orden 1. No es válido si hay una variable dependiente rezagada entre los regresores.
- **Breusch-Godfrey:** regresión de $\hat u_t$ sobre $X_t$ y $\hat u_{t-1},\dots,\hat u_{t-p}$; $LM = nR^2 \sim \chi^2_p$. Sirve con rezagos de $y$ y para órdenes altos.

**Corrección.** Errores de **Newey-West (HAC)** con ponderaciones de Bartlett $w_\ell = 1 - \ell/(L+1)$, o reespecificar la dinámica (agregar rezagos). Si hay autocorrelación **y** un rezago de $y$ entre los regresores, MCO es inconsistente: el problema ya no es sólo de inferencia.

## Especificación y multicolinealidad

- **RESET de Ramsey:** agrega $\hat y^2, \hat y^3$; si son significativos, falta forma funcional (logs, cuadrados, interacciones).
- **Jarque-Bera:** $JB = \tfrac{n}{6}\big(S^2 + \tfrac{(K-3)^2}{4}\big)\sim\chi^2_2$. Con muestras grandes la no normalidad no invalida la inferencia asintótica.
- **VIF:** $VIF_j = 1/(1-R_j^2)$. Un VIF > 10 indica errores estándar muy inflados.

> **En Bolivia.** En ecuaciones de salarios con datos de la Encuesta de Hogares del INE la varianza del ingreso crece con la educación y es mayor en el sector informal: la heteroscedasticidad es la norma, no la excepción. Reporte siempre errores robustos.

## Errores frecuentes en el examen
1. Decir que la heteroscedasticidad sesga los coeficientes.
2. Usar Durbin-Watson con $y_{t-1}$ como regresor.
3. Corregir con HC1 un problema que en realidad es de forma funcional (revise antes RESET).
`,
    },
    {
      id: 'e2', number: 2, title: 'Endogeneidad y variables instrumentales',
      summary: 'Por qué MCO falla cuando un regresor está correlacionado con el error y cómo lo resuelven los instrumentos.',
      objectives: ['Identificar las fuentes de endogeneidad: omisión, error de medida, simultaneidad.', 'Estimar por MC2E y reportar la primera etapa.', 'Aplicar las pruebas de Hausman (endogeneidad) y Sargan (sobreidentificación).'],
      keywords: ['endogeneidad', 'instrumentos', 'variables instrumentales', 'mc2e', '2sls', 'hausman', 'sargan', 'instrumento débil', 'primera etapa'],
      simulators: ['simultaneidad'],
      lab: [{ label: 'Demanda de quinua por MC2E', dataset: 'quinua', spec: { kind: 'iv', y: 'cantidad', exog: ['ingreso_externo'], endog: ['precio'], instruments: ['lluvia', 'precio_fertilizante'] } }],
      body: r`
## El problema

Si $Cov(x_j, u) \neq 0$, entonces $\operatorname{plim}\hat\beta_{MCO} \neq \beta$: **MCO es inconsistente** y el sesgo no desaparece con más datos. Las tres fuentes clásicas:

1. **Variable omitida** correlacionada con un regresor (habilidad en una ecuación de salarios).
2. **Error de medida** en un regresor: produce sesgo de atenuación hacia cero.
3. **Simultaneidad**: $y$ y $x$ se determinan conjuntamente (precio y cantidad de equilibrio).

## Instrumentos

Un instrumento $z$ debe cumplir:
- **Relevancia:** $Cov(z, x) \neq 0$ (verificable: primera etapa).
- **Exogeneidad:** $Cov(z, u) = 0$ (no verificable si el modelo está exactamente identificado).

Con un instrumento y un regresor endógeno, $\hat\beta_{VI} = \dfrac{\widehat{Cov}(z,y)}{\widehat{Cov}(z,x)}$.

## Mínimos cuadrados en dos etapas (MC2E)

1. Primera etapa: regresar $x$ sobre todos los instrumentos $Z$ (excluidos + exógenos incluidos) y obtener $\hat x$.
2. Segunda etapa: regresar $y$ sobre $\hat x$ y las exógenas.

$$\hat\beta_{MC2E} = (X'P_Z X)^{-1} X'P_Z y, \qquad P_Z = Z(Z'Z)^{-1}Z'.$$

> Cuidado: si hace la segunda etapa "a mano" con MCO, los coeficientes son correctos pero los **errores estándar no**, porque los residuos deben calcularse con $x$, no con $\hat x$. Use el comando de MC2E.

## Diagnóstico

- **Instrumentos débiles:** regla de Staiger-Stock, **F de primera etapa > 10**. Con instrumentos débiles MC2E está sesgado hacia MCO y la inferencia es poco confiable.
- **Hausman (Durbin-Wu-Hausman):** agregue los residuos de la primera etapa $\hat v$ a la ecuación estructural; si su coeficiente es significativo, $x$ es endógena y MC2E es preferible.
- **Sargan:** con más instrumentos que endógenas, $nR^2$ de regresar los residuos de MC2E sobre $Z$ se distribuye $\chi^2_{L-K}$. Rechazar indica que algún instrumento es inválido.

> **En Bolivia.** Estimar la demanda de un producto agrícola (quinua, papa) con datos de precio y cantidad por MCO mezcla oferta y demanda. Los **shocks climáticos del Altiplano** (lluvia, heladas) mueven la oferta pero no la demanda: son instrumentos naturales para identificar la pendiente de la demanda.
`,
    },
    {
      id: 'e3', number: 3, title: 'Modelos de ecuaciones simultáneas',
      summary: 'Forma estructural y reducida, el problema de identificación y la estimación por MC2E.',
      objectives: ['Pasar de la forma estructural a la reducida.', 'Aplicar las condiciones de orden y rango.', 'Explicar el sesgo de simultaneidad con un diagrama de oferta y demanda.'],
      keywords: ['ecuaciones simultáneas', 'identificación', 'condición de orden', 'condición de rango', 'forma reducida', 'forma estructural', 'sobreidentificada', 'exactamente identificada'],
      simulators: ['simultaneidad'],
      lab: [{ label: 'Oferta y demanda: MCO vs MC2E', dataset: 'quinua', spec: { kind: 'iv', y: 'cantidad', exog: ['ingreso_externo'], endog: ['precio'], instruments: ['lluvia', 'precio_fertilizante'] } }],
      body: r`
## Forma estructural

Un mercado con demanda y oferta:
$$Q^d = \alpha_0 + \alpha_1 P + \alpha_2 I + u_1 \qquad Q^s = \beta_0 + \beta_1 P + \beta_2 L + u_2$$
donde $I$ (ingreso) y $L$ (lluvia) son **exógenas** y $P, Q$ son **endógenas**. En equilibrio $Q^d = Q^s$ y
$$P = \frac{\alpha_0 - \beta_0 + \alpha_2 I - \beta_2 L + u_1 - u_2}{\beta_1 - \alpha_1}.$$
Como $P$ depende de $u_1$, en la ecuación de demanda $Cov(P, u_1) \neq 0$: **sesgo de simultaneidad**.

## Forma reducida

Cada endógena expresada sólo en función de exógenas: $P = \pi_{10} + \pi_{11} I + \pi_{12} L + v_1$. Se estima consistentemente por MCO, pero sus coeficientes mezclan parámetros estructurales.

## Identificación

Con $G$ ecuaciones (endógenas) en el sistema:
- **Condición de orden (necesaria):** el número de exógenas excluidas de la ecuación debe ser $\geq$ al número de endógenas incluidas del lado derecho, es decir, $K - k \geq m - 1$.
  - Igualdad → **exactamente identificada**; mayor → **sobreidentificada**; menor → **no identificada**.
- **Condición de rango (necesaria y suficiente):** la matriz de coeficientes de las variables excluidas de la ecuación, en las demás ecuaciones, debe tener rango $G-1$.

En el ejemplo, la demanda excluye $L$ (una exógena) e incluye una endógena a la derecha ($P$): **exactamente identificada**. La lluvia desplaza la oferta y "traza" la demanda.

> Intuición gráfica: si sólo se mueve la oferta, los equilibrios caen sobre la curva de demanda y la revelan. Si ambas curvas se mueven, la nube de puntos no corresponde a ninguna de las dos.

## Estimación

- **MCI (mínimos cuadrados indirectos):** sólo para ecuaciones exactamente identificadas.
- **MC2E:** para exacta y sobreidentificación, ecuación por ecuación.
- **MC3E:** sistema completo, aprovecha la correlación entre errores de las ecuaciones.

> **En Bolivia.** Los modelos macroeconométricos que usan el BCB y el Ministerio de Economía para el Programa Fiscal-Financiero son sistemas de ecuaciones: consumo, inversión, demanda de dinero e inflación se determinan conjuntamente.
`,
    },
    {
      id: 'e4', number: 4, title: 'Variable dependiente binaria: MPL, Logit y Probit',
      summary: 'Modelar probabilidades: por qué el MPL es insuficiente y cómo interpretar Logit y Probit.',
      objectives: ['Estimar e interpretar el modelo de probabilidad lineal.', 'Entender la estimación por máxima verosimilitud de Logit y Probit.', 'Calcular e interpretar efectos marginales y razones de odds.'],
      keywords: ['logit', 'probit', 'mpl', 'probabilidad lineal', 'efectos marginales', 'odds', 'máxima verosimilitud', 'pseudo r2', 'binaria'],
      simulators: ['logit'],
      lab: [{ label: 'Acceso al crédito: Logit', dataset: 'credito', spec: { kind: 'binary', link: 'logit', y: 'acceso_credito', x: ['log(ingreso)', 'educacion', 'urbano', 'mujer', 'edad', 'edad^2', 'cuenta_bancaria'] } }],
      body: r`
## Modelo de probabilidad lineal (MPL)

Con $y \in \{0,1\}$, $E[y\mid x] = P(y=1\mid x) = x'\beta$. Cada $\beta_j$ es el cambio en la probabilidad. Problemas:
- predicciones fuera de $[0,1]$;
- heteroscedasticidad por construcción: $Var(u\mid x) = p(1-p)$ → **use siempre HC1**;
- efectos marginales constantes, poco realistas en los extremos.

## Logit y Probit

$P(y = 1\mid x) = G(x'\beta)$ con $G$ una función de distribución:
- **Logit:** $G(z) = \Lambda(z) = \dfrac{e^z}{1+e^z}$.
- **Probit:** $G(z) = \Phi(z)$, la normal estándar.

Se derivan de un modelo de **variable latente**: $y^* = x'\beta + e$, $y = 1$ si $y^* > 0$.

Estimación por **máxima verosimilitud**:
$$\ln L(\beta) = \sum_i \big[y_i \ln G(x_i'\beta) + (1-y_i)\ln(1 - G(x_i'\beta))\big].$$

## Interpretación

Los coeficientes sólo indican **signo** y significancia. La magnitud está en los **efectos marginales**:
$$\frac{\partial P}{\partial x_j} = g(x'\beta)\,\beta_j,$$
que dependen de $x$. Se reportan:
- **Efecto marginal promedio (AME):** $\frac{1}{n}\sum_i g(x_i'\hat\beta)\hat\beta_j$ (el recomendado).
- **Efecto marginal en la media (MEM):** $g(\bar x'\hat\beta)\hat\beta_j$.

En Logit, $\ln\frac{p}{1-p} = x'\beta$, así que $e^{\beta_j}$ es la **razón de odds**: cuánto se multiplican las odds por una unidad más de $x_j$.

> Regla práctica: $\hat\beta_{Logit} \approx 1{,}6\,\hat\beta_{Probit} \approx 4\,\hat\beta_{MPL}$ (cerca de $p = 0{,}5$). Los AME de los tres modelos suelen ser muy parecidos.

## Bondad de ajuste
- **Pseudo-R² de McFadden:** $1 - \ln L / \ln L_0$. Valores de 0,2–0,4 ya son buenos.
- **Prueba LR:** $2(\ln L - \ln L_0) \sim \chi^2_{k-1}$.
- **Porcentaje correctamente clasificado** con umbral 0,5 (engañoso si la muestra está desbalanceada).

> **En Bolivia.** La inclusión financiera se estudia con modelos binarios sobre la Encuesta de Hogares: la probabilidad de tener crédito o cuenta depende de ingreso, educación, área y sexo. Un AME de 0,03 para educación significa 3 puntos porcentuales más de probabilidad por año adicional de estudio.
`,
    },
    {
      id: 'e5', number: 5, title: 'Datos de panel',
      summary: 'Aprovechar la dimensión individuo × tiempo para controlar la heterogeneidad no observada.',
      objectives: ['Distinguir MCO agrupado, efectos fijos y efectos aleatorios.', 'Aplicar la prueba F, el LM de Breusch-Pagan y la prueba de Hausman.', 'Interpretar el R² within y la fracción de varianza ρ.'],
      keywords: ['panel', 'efectos fijos', 'efectos aleatorios', 'hausman', 'within', 'between', 'heterogeneidad no observada', 'lsdv'],
      lab: [{ label: 'Panel departamental: EF vs EA', dataset: 'panel', spec: { kind: 'panel', y: 'crecimiento', x: ['inversion_publica', 'escolaridad', 'precio_minerales'] } }],
      body: r`
## El modelo

$$y_{it} = x_{it}'\beta + \alpha_i + u_{it}, \qquad i = 1,\dots,N;\; t = 1,\dots,T$$
$\alpha_i$ es la **heterogeneidad individual no observada** (la geografía de un departamento, su dotación de recursos). El tratamiento de $\alpha_i$ define el estimador.

## MCO agrupado
Ignora $\alpha_i$. Si $Cov(x_{it}, \alpha_i) \neq 0$ está **sesgado** (sesgo de variable omitida).

## Efectos fijos (within)
Resta la media de cada individuo: $y_{it} - \bar y_i = (x_{it} - \bar x_i)'\beta + (u_{it} - \bar u_i)$. Elimina $\alpha_i$, sea cual sea su correlación con $x$. Equivale a MCO con una dummy por individuo (**LSDV**).
- Costo: no puede estimar efectos de variables constantes en el tiempo (región, sexo).
- Grados de libertad: $NT - N - k$.

## Efectos aleatorios
Supone $Cov(x_{it}, \alpha_i) = 0$ y trata $\alpha_i$ como parte del error. Es MCG sobre datos **cuasi-diferenciados**:
$$y_{it} - \theta\bar y_i, \qquad \theta = 1 - \sqrt{\frac{\sigma_u^2}{T\sigma_\alpha^2 + \sigma_u^2}}.$$
Si $\theta \to 0$ se parece al agrupado; si $\theta \to 1$, a efectos fijos. Es más eficiente que EF **si su supuesto es cierto**.

## ¿Cuál elegir?
| Prueba | $H_0$ | Si rechaza |
|---|---|---|
| F de efectos individuales | todos los $\alpha_i$ iguales | EF mejor que agrupado |
| LM de Breusch-Pagan | $\sigma_\alpha^2 = 0$ | EA mejor que agrupado |
| **Hausman** | $Cov(x, \alpha) = 0$ | **EF** (EA es inconsistente) |

$$H = (\hat\beta_{EF} - \hat\beta_{EA})'\big[\widehat{Var}(\hat\beta_{EF}) - \widehat{Var}(\hat\beta_{EA})\big]^{-1}(\hat\beta_{EF} - \hat\beta_{EA}) \sim \chi^2_k$$

> **En Bolivia.** Con datos departamentales, Tarija y Santa Cruz tienen características persistentes (hidrocarburos, agroindustria) que también atraen inversión pública. Esa correlación entre $\alpha_i$ y los regresores hace que Hausman favorezca efectos fijos.
`,
    },
    {
      id: 'e6', number: 6, title: 'Series de tiempo: estacionariedad y modelos ARIMA',
      summary: 'La metodología de Box-Jenkins: identificar, estimar, diagnosticar y pronosticar.',
      objectives: ['Definir estacionariedad débil y ruido blanco.', 'Reconocer procesos AR, MA y ARMA por su FAC y FACP.', 'Aplicar el ciclo de Box-Jenkins y pronosticar.'],
      keywords: ['arima', 'arma', 'ar', 'ma', 'box-jenkins', 'fac', 'facp', 'correlograma', 'estacionariedad', 'ruido blanco', 'pronóstico', 'ljung-box'],
      simulators: ['arma'],
      lab: [
        { label: 'Correlograma de la inflación', dataset: 'var', spec: { kind: 'correlogram', variable: 'inflacion', lags: 24 } },
        { label: 'AR(2) de la inflación', dataset: 'var', spec: { kind: 'arima', variable: 'inflacion', p: 2, d: 0, q: 0, horizon: 12 } },
      ],
      body: r`
## Estacionariedad

Un proceso es **débilmente estacionario** si su media, su varianza y sus autocovarianzas no dependen del tiempo: $E[y_t] = \mu$, $Var(y_t) = \gamma_0$, $Cov(y_t, y_{t-k}) = \gamma_k$. El **ruido blanco** $\varepsilon_t$ tiene media cero, varianza constante y ninguna autocorrelación.

## Los procesos básicos

**AR(p):** $y_t = c + \phi_1 y_{t-1} + \dots + \phi_p y_{t-p} + \varepsilon_t$. Estacionario si las raíces de $1 - \phi_1 z - \dots - \phi_p z^p = 0$ están fuera del círculo unitario (en AR(1): $|\phi_1| < 1$).

**MA(q):** $y_t = \mu + \varepsilon_t + \theta_1\varepsilon_{t-1} + \dots + \theta_q\varepsilon_{t-q}$. Siempre estacionario; **invertible** si las raíces de $\theta(z)$ están fuera del círculo unitario.

**ARMA(p,q)** combina ambos; **ARIMA(p,d,q)** aplica ARMA a la serie diferenciada $d$ veces.

## Identificación con FAC y FACP

| Proceso | FAC | FACP |
|---|---|---|
| AR(p) | decae gradualmente | **se corta** después de $p$ |
| MA(q) | **se corta** después de $q$ | decae gradualmente |
| ARMA(p,q) | decae | decae |
| Raíz unitaria | decae **muy lentamente** | primer rezago ≈ 1 |

Bandas de significancia aproximadas: $\pm 1{,}96/\sqrt{T}$.

## Box-Jenkins

1. **Identificación:** grafique, pruebe raíz unitaria, diferencie si hace falta, mire FAC/FACP.
2. **Estimación:** máxima verosimilitud o suma de cuadrados condicional.
3. **Diagnóstico:** los residuos deben ser ruido blanco. Ljung-Box: $Q = T(T+2)\sum_{k=1}^{m}\dfrac{\hat\rho_k^2}{T-k} \sim \chi^2_{m-p-q}$.
4. **Pronóstico:** con errores futuros iguales a cero; la varianza del error de pronóstico a $h$ pasos es $\sigma^2\sum_{j=0}^{h-1}\psi_j^2$.

Entre modelos que pasan el diagnóstico, elija el de menor **AIC** o **BIC** (el BIC penaliza más la complejidad).

> **En Bolivia.** El BCB pronostica la inflación de corto plazo combinando modelos ARIMA con modelos estructurales. La inflación boliviana tiene fuerte componente de alimentos, con shocks climáticos (El Niño, La Niña) que aparecen como picos en la serie.
`,
    },
    {
      id: 'e7', number: 7, title: 'Raíces unitarias y regresión espuria',
      summary: 'Por qué las series no estacionarias engañan, y cómo detectarlas con Dickey-Fuller y KPSS.',
      objectives: ['Distinguir procesos con tendencia determinística y estocástica.', 'Aplicar e interpretar ADF y KPSS.', 'Explicar el fenómeno de regresión espuria.'],
      keywords: ['raíz unitaria', 'dickey-fuller', 'adf', 'kpss', 'caminata aleatoria', 'regresión espuria', 'integrada', 'i(1)', 'mackinnon', 'granger newbold'],
      simulators: ['espuria'],
      lab: [
        { label: 'ADF al PIB (en logs)', dataset: 'dinero', spec: { kind: 'unitroot', variable: 'ln_pib', regression: 'ct' } },
        { label: 'Una regresión espuria', dataset: 'espuria', spec: { kind: 'ols', y: 'y', x: ['x'] } },
      ],
      body: r`
## Caminata aleatoria

$y_t = y_{t-1} + \varepsilon_t$ tiene **raíz unitaria**: los shocks son permanentes y $Var(y_t) = t\sigma^2$ crece sin límite. Se dice que $y_t$ es **integrada de orden 1, I(1)**, porque $\Delta y_t$ es estacionaria.

- **Tendencia determinística:** $y_t = \alpha + \delta t + u_t$ con $u_t$ estacionario → se estacionariza quitando la tendencia.
- **Tendencia estocástica:** $y_t = \delta + y_{t-1} + \varepsilon_t$ (caminata con deriva) → se estacionariza diferenciando.

## Prueba de Dickey-Fuller aumentada

$$\Delta y_t = \alpha + \delta t + \gamma y_{t-1} + \sum_{j=1}^{p}\lambda_j\Delta y_{t-j} + \varepsilon_t$$
$H_0: \gamma = 0$ (raíz unitaria) contra $H_1: \gamma < 0$ (estacionaria). El estadístico $\tau = \hat\gamma/ee(\hat\gamma)$ **no sigue una t de Student**: se compara con los valores críticos de **MacKinnon**, más negativos (≈ −2,86 al 5% con constante).

- Elija la especificación (sin constante, con constante, con tendencia) según el gráfico de la serie.
- Los rezagos $\Delta y_{t-j}$ limpian la autocorrelación; se eligen por AIC/BIC.

## KPSS: la prueba al revés

KPSS invierte las hipótesis: $H_0$: **estacionaria**. Usar ADF y KPSS juntos da conclusiones más robustas:

| ADF | KPSS | Conclusión |
|---|---|---|
| rechaza | no rechaza | estacionaria |
| no rechaza | rechaza | raíz unitaria |
| otros casos | | evidencia ambigua |

## Regresión espuria

Granger y Newbold (1974): al regresar dos caminatas aleatorias **independientes**, el $t$ del coeficiente rechaza $H_0: \beta = 0$ la mayoría de las veces y el $R^2$ es alto. Señal de alarma: **$R^2 > DW$**. La solución es diferenciar o, si las series comparten tendencia, trabajar con **cointegración**.

> **En Bolivia.** El PIB real, los agregados monetarios y los precios en niveles son típicamente I(1). Regresar la emisión sobre el PIB en niveles sin verificar cointegración puede producir resultados sin sentido económico.
`,
    },
    {
      id: 'e8', number: 8, title: 'Cointegración y modelo de corrección de errores',
      summary: 'Cuando series I(1) comparten una tendencia común: equilibrio de largo plazo y ajuste de corto plazo.',
      objectives: ['Definir cointegración.', 'Aplicar el procedimiento de Engle-Granger en dos etapas.', 'Estimar e interpretar un MCE y la velocidad de ajuste.'],
      keywords: ['cointegración', 'engle-granger', 'corrección de errores', 'mce', 'ecm', 'largo plazo', 'johansen', 'velocidad de ajuste'],
      lab: [{ label: 'Demanda de dinero cointegrada', dataset: 'dinero', spec: { kind: 'coint', y: 'ln_m1_real', x: ['ln_pib', 'tasa_interes'] } }],
      body: r`
## Definición

Si $y_t$ y $x_t$ son I(1) pero existe $\beta$ tal que $u_t = y_t - \beta x_t$ es I(0), las series están **cointegradas**: comparten una tendencia estocástica común y $y_t = \beta x_t$ es una relación de **equilibrio de largo plazo**.

## Engle-Granger en dos etapas

1. Verifique que todas las series sean I(1).
2. Estime por MCO la regresión estática $y_t = \alpha + \beta x_t + u_t$. El estimador es **superconsistente**, pero sus errores estándar no sirven para inferencia.
3. Aplique ADF (sin constante) a los residuos $\hat u_t$. Use los **valores críticos de MacKinnon para cointegración**, que dependen del número de variables (≈ −3,34 al 5% con dos variables).
4. Si se rechaza la raíz unitaria de $\hat u_t$, hay cointegración.

## Modelo de corrección de errores (MCE)

Por el **teorema de representación de Granger**, si hay cointegración existe un MCE:
$$\Delta y_t = \alpha_0 + \alpha_1\Delta x_t + \gamma\,\hat u_{t-1} + \varepsilon_t.$$
- $\alpha_1$: efecto de **corto plazo**.
- $\gamma$: **velocidad de ajuste**, debe ser **negativa** (entre −1 y 0). Si $y$ está por encima de su equilibrio ($\hat u_{t-1} > 0$), baja.
- **Vida media** del desequilibrio: $\ln(0{,}5)/\ln(1+\gamma)$ períodos.

## Extensiones
- **Johansen:** estima el número de vectores de cointegración en sistemas de varias variables (pruebas de traza y máximo autovalor) y un VEC.
- **ARDL / bounds testing** (Pesaran): útil con mezcla de I(0) e I(1).

> **En Bolivia.** La demanda de dinero es la aplicación clásica: saldos reales, PIB y tasa de interés cointegran. La **bolivianización** desplazó la demanda de dinero en moneda nacional hacia arriba a partir de 2006, un quiebre estructural que conviene modelar (por ejemplo con una dummy o incluyendo la tasa de bolivianización).
`,
    },
    {
      id: 'e9', number: 9, title: 'Vectores autorregresivos (VAR)',
      summary: 'Modelar varias series a la vez: causalidad de Granger, impulso-respuesta y descomposición de varianza.',
      objectives: ['Especificar y estimar un VAR(p) y elegir su orden.', 'Evaluar estabilidad y causalidad de Granger.', 'Interpretar funciones impulso-respuesta y descomposición de varianza.'],
      keywords: ['var', 'vector autorregresivo', 'impulso respuesta', 'irf', 'granger', 'cholesky', 'descomposición de varianza', 'fevd', 'sims'],
      lab: [{ label: 'VAR de transmisión monetaria', dataset: 'var', spec: { kind: 'var', variables: ['inflacion', 'credito', 'tasa_interbancaria', 'emision'], horizon: 12 } }],
      body: r`
## El modelo

Sims (1980) propuso tratar todas las variables como endógenas:
$$Y_t = c + A_1 Y_{t-1} + \dots + A_p Y_{t-p} + e_t, \qquad E[e_te_t'] = \Sigma.$$
Se estima **por MCO ecuación por ecuación** (todas tienen los mismos regresores).

## Especificación
- **Orden p:** minimice AIC, BIC o HQ: $\ln|\hat\Sigma_p| + \dfrac{c_T}{T}\,(pK^2 + K)$, con $c_T = 2$ (AIC), $\ln T$ (BIC) o $2\ln\ln T$ (HQ).
- **Estabilidad:** todas las raíces de la matriz compañera con módulo **< 1**.
- Las variables deben ser estacionarias (o usar un VEC si hay cointegración).

## Causalidad de Granger
$x$ **causa en el sentido de Granger** a $y$ si los rezagos de $x$ mejoran la predicción de $y$. Prueba F de que todos los coeficientes de $x_{t-1},\dots,x_{t-p}$ en la ecuación de $y$ son cero. Es **precedencia predictiva**, no causalidad económica.

## Impulso-respuesta
La representación MA: $Y_t = \mu + \sum_{i\geq 0}\Phi_i e_{t-i}$, con $\Phi_0 = I$ y $\Phi_i = \sum_{j=1}^{\min(i,p)} A_j\Phi_{i-j}$.

Como los errores están correlacionados, se **ortogonalizan** con Cholesky: $\Sigma = PP'$, y $\Theta_i = \Phi_i P$ da la respuesta a un shock de una desviación estándar. **El orden importa**: la primera variable no responde contemporáneamente a las demás. Ordene de la más exógena a la más endógena.

## Descomposición de varianza
Qué fracción de la varianza del error de pronóstico de cada variable, a $h$ pasos, se debe a cada shock.

> **En Bolivia.** Los estudios de transmisión monetaria del BCB usan VAR para medir cómo responden el crédito y la inflación a cambios en la liquidez y en las tasas de títulos públicos. Con tipo de cambio fijo y alta bolivianización, el canal del crédito tiende a ser más relevante que el canal de tasas de interés.
`,
    },
  ],
};
