import type { Course } from './types';

const r = String.raw;

export const monetaria: Course = {
  id: 'monetaria',
  name: 'Economía Monetaria II',
  code: 'MON-II',
  tagline: 'Demanda y oferta de dinero, banca central, reglas de política, economía abierta e inflación, con la experiencia boliviana como hilo conductor.',
  units: [
    {
      id: 'm1', number: 1, title: 'Demanda de dinero',
      summary: 'De la teoría cuantitativa a Baumol-Tobin, Friedman y Cagan, y su estimación empírica.',
      objectives: ['Comparar los enfoques transaccional, de cartera y cuantitativo moderno.', 'Derivar la regla de la raíz cuadrada de Baumol-Tobin.', 'Especificar y estimar una demanda de dinero con cointegración.'],
      keywords: ['demanda de dinero', 'baumol', 'tobin', 'teoría cuantitativa', 'friedman', 'cagan', 'velocidad', 'preferencia por liquidez', 'elasticidad'],
      simulators: ['baumol'],
      lab: [{ label: 'Estimar la demanda de dinero', dataset: 'dinero', spec: { kind: 'coint', y: 'ln_m1_real', x: ['ln_pib', 'tasa_interes'] } }],
      body: r`
## Teoría cuantitativa

$MV = PY$. Con velocidad $V$ estable y producto $Y$ en su nivel de pleno empleo, el dinero determina los precios: $\pi \approx \mu - g_Y$ (inflación ≈ crecimiento del dinero menos crecimiento del producto). La versión de Cambridge: $M^d = kPY$, con $k = 1/V$.

## Keynes: preferencia por la liquidez
Tres motivos: transacción, precaución y especulación. El motivo especulación introduce la tasa de interés: $M^d/P = L(Y, i)$ con $L_Y > 0$, $L_i < 0$.

## Baumol-Tobin: inventario de efectivo
Un agente gasta $Y$ de manera uniforme y hace $n$ retiros, cada uno con costo $b$. Costo total: $C(n) = nb + i\dfrac{Y}{2n}$. Minimizando:
$$n^* = \sqrt{\frac{iY}{2b}}, \qquad \frac{M^d}{P} = \frac{Y}{2n^*} = \sqrt{\frac{bY}{2i}}.$$
Elasticidad ingreso **½** y elasticidad tasa **−½**: hay **economías de escala** en el manejo del efectivo.

## Friedman: teoría cuantitativa moderna
La demanda de dinero es una demanda de un activo que depende del **ingreso permanente** y de los rendimientos relativos de bonos, acciones y bienes (la inflación esperada). Es estable, y por eso la política monetaria afecta al gasto nominal de forma predecible.

## Cagan: hiperinflación
En hiperinflación la inflación esperada domina: $\ln(M/P) = -\alpha\,\pi^e + \gamma$. La semielasticidad $\alpha$ determina la tasa de inflación que **maximiza el señoreaje**: $\pi^* = 1/\alpha$.

## Especificación empírica
$$\ln\frac{M_t}{P_t} = \beta_0 + \beta_1\ln Y_t - \beta_2 i_t - \beta_3\pi^e_t + u_t$$
Las series son I(1): se estima como relación de **cointegración** con su MCE.

> **En Bolivia.** La demanda de dinero en moneda nacional tuvo un **quiebre** con la bolivianización desde mediados de los 2000: la participación de los depósitos en bolivianos pasó de menos del 20% a más del 80% en la década siguiente, apoyada por la apreciación cambiaria gradual, encajes diferenciados, el ITF a operaciones en dólares y la Unidad de Fomento de Vivienda (UFV). Un modelo sin ese cambio subestima la demanda de bolivianos.
`,
    },
    {
      id: 'm2', number: 2, title: 'Oferta monetaria y multiplicador',
      summary: 'Base monetaria, encaje legal y preferencia por efectivo en una economía parcialmente dolarizada.',
      objectives: ['Derivar el multiplicador monetario.', 'Analizar el efecto del encaje legal diferenciado por moneda.', 'Explicar cómo la bolivianización aumenta la potencia de la política monetaria.'],
      keywords: ['oferta monetaria', 'multiplicador', 'base monetaria', 'encaje', 'reservas', 'emisión', 'dolarización', 'bolivianización', 'm1', 'm2', 'm3'],
      simulators: ['multiplicador'],
      body: r`
## Base y agregados
- **Base monetaria:** $B = C + R$ (efectivo en poder del público + reservas bancarias).
- **Oferta monetaria:** $M = C + D$ (efectivo + depósitos). En Bolivia se publican M1, M2, M3 y sus versiones ampliadas M'1, M'2, M'3 que incluyen depósitos en moneda extranjera.

## Multiplicador
Con $c = C/D$ (preferencia por efectivo) y $r = R/D$ (tasa de encaje total, legal + excedente):
$$m = \frac{M}{B} = \frac{c + 1}{c + r}.$$
Un aumento de $c$ o de $r$ **reduce** el multiplicador.

## Del lado del balance del Banco Central
$$B = \underbrace{RIN}_{\text{reservas internacionales netas}} + \underbrace{CIN}_{\text{crédito interno neto}}$$
El CIN incluye el crédito al sector público no financiero y al sistema financiero, menos los títulos de regulación monetaria (OMA). Por eso **comprar divisas o financiar al Tesoro expande la base**, y vender títulos la contrae.

## Economía con dos monedas
Sea $D$ el total de depósitos, una fracción $d$ en dólares (dolarización de depósitos), con encajes $r_{MN}$ y $r_{ME}$. Si todas las reservas cuentan en la base (valoradas en bolivianos):
$$B = C + r_{MN}(1-d)D + r_{ME}\,d\,D, \qquad M' = C + D.$$
Entonces el multiplicador del agregado ampliado y el de la moneda nacional ($M_{MN} = C + (1-d)D$) son
$$m' = \frac{1 + c}{c + r_{MN}(1-d) + r_{ME}\,d}, \qquad m_{MN} = \frac{1 + c - d}{c + r_{MN}(1-d) + r_{ME}\,d}.$$
La intuición: **más dolarización = menor control monetario**. Cuanto mayor $d$, menor la parte del dinero que el banco central puede crear y respaldar; además no puede actuar como prestamista de última instancia ilimitado en dólares.

> **En Bolivia.** El BCB fijó **encajes legales más altos para depósitos en moneda extranjera** que en moneda nacional. Esto encarece captar en dólares y fue uno de los instrumentos de la bolivianización. Con la mayor parte de los depósitos y casi todo el crédito en bolivianos, el BCB ganó capacidad de influir en la liquidez con el encaje y las OMA.
`,
    },
    {
      id: 'm3', number: 3, title: 'Banca central e instrumentos de política',
      summary: 'Objetivos, instrumentos y metas intermedias; el marco institucional del BCB.',
      objectives: ['Distinguir objetivo final, metas intermedias, metas operativas e instrumentos.', 'Explicar el funcionamiento de las OMA, el encaje y las ventanillas de liquidez.', 'Describir el marco legal y operativo del BCB.'],
      keywords: ['banco central', 'bcb', 'instrumentos', 'oma', 'operaciones de mercado abierto', 'encaje legal', 'metas intermedias', 'independencia', 'ley 1670', 'programa fiscal financiero', 'prestamista de última instancia'],
      body: r`
## La cadena de la política monetaria
**Instrumentos** (OMA, encaje, tasas de ventanilla) → **metas operativas** (liquidez, tasa interbancaria) → **metas intermedias** (agregados, crédito, tipo de cambio) → **objetivo final** (estabilidad de precios, contribuir al desarrollo).

## Instrumentos
- **Operaciones de mercado abierto (OMA):** compra y venta de títulos (en Bolivia, Letras y Bonos del BCB). Vender títulos retira liquidez; redimirlos la inyecta.
- **Encaje legal:** porcentaje obligatorio de los depósitos que los bancos mantienen como reservas. Actúa sobre el multiplicador.
- **Créditos de liquidez y reportos:** el BCB presta a las entidades con garantía de títulos; su tasa marca un techo a las tasas interbancarias.
- **Política cambiaria:** en régimen de tipo de cambio fijo, la compra y venta de divisas tiene efectos monetarios directos.

## Independencia y credibilidad
La literatura (Alesina-Summers, Cukierman) encuentra que mayor independencia se asocia con menor inflación sin costo en crecimiento. El argumento central es la **inconsistencia temporal** (unidad 4).

## Marco boliviano
- **Ley 1670 (1995):** el objeto del BCB es procurar la estabilidad del poder adquisitivo interno de la moneda nacional; se restringió el financiamiento al sector público.
- **Constitución Política del Estado (2009), art. 327:** el BCB mantiene la estabilidad del poder adquisitivo interno de la moneda para contribuir al desarrollo económico y social, **en coordinación con el Órgano Ejecutivo**.
- **Programa Fiscal-Financiero:** acuerdo anual entre el Ministerio de Economía y el BCB con metas cuantitativas (déficit fiscal, crédito interno neto, reservas internacionales) y proyecciones de inflación y crecimiento.
- La política monetaria operó con un enfoque de **metas cuantitativas** de liquidez y un sesgo que alternó entre contractivo (2007–2008, alta inflación de alimentos) y expansivo.

> **Tema de debate.** Con tipo de cambio fijo y libre movilidad de capital, el trilema implica que la política monetaria no puede ser totalmente autónoma. Bolivia mantuvo controles y una baja integración financiera que le dieron algún margen, pero la pérdida de reservas internacionales desde 2014 y la escasez de dólares en 2023 mostraron los límites de ese margen.
`,
    },
    {
      id: 'm4', number: 4, title: 'Reglas contra discreción: inconsistencia temporal',
      summary: 'Kydland-Prescott y Barro-Gordon: por qué un banco central discrecional genera inflación sin ganar empleo.',
      objectives: ['Resolver el modelo de Barro-Gordon bajo discreción y compromiso.', 'Explicar el sesgo inflacionario.', 'Evaluar soluciones: reputación, banquero conservador, contratos y metas de inflación.'],
      keywords: ['barro-gordon', 'inconsistencia temporal', 'kydland', 'prescott', 'reglas', 'discreción', 'sesgo inflacionario', 'credibilidad', 'rogoff', 'banquero conservador'],
      simulators: ['barro-gordon'],
      body: r`
## El modelo de Barro-Gordon
Curva de Phillips con expectativas: $y = y^* + b(\pi - \pi^e)$. El banco central minimiza
$$L = \frac{1}{2}(y - ky^*)^2 + \frac{a}{2}\pi^2, \qquad k > 1,$$
es decir, desea un producto **mayor** al natural ($k > 1$), por ejemplo por distorsiones del mercado laboral.

## Discreción
Tomando $\pi^e$ como dado, la condición de primer orden es $b(y - ky^*) + a\pi = 0$. Con expectativas racionales, $\pi^e = \pi$ y $y = y^*$:
$$\pi^{D} = \frac{b(k-1)y^*}{a} > 0.$$
**Sesgo inflacionario:** inflación positiva y producto igual al natural. El público anticipa la tentación de sorprender y la neutraliza.

## Compromiso (regla)
Si el banco central puede comprometerse de forma creíble con $\pi = 0$, obtiene $y = y^*$ con cero inflación: **menor pérdida**. Pero la regla es **temporalmente inconsistente**: una vez fijadas las expectativas en cero, conviene sorprender.

## Soluciones
- **Reputación** en juegos repetidos (Barro-Gordon 1983b).
- **Banquero conservador** (Rogoff 1985): delegar en alguien con mayor aversión a la inflación ($a' > a$) reduce el sesgo, a costa de estabilizar menos los shocks.
- **Contratos de Walsh:** penalizar al banquero por la inflación.
- **Metas de inflación** con transparencia y rendición de cuentas.

> **En Bolivia.** La hiperinflación de 1984–85 es el caso extremo de falta de credibilidad: el financiamiento del déficit con emisión hizo que el público anticipara cada vez más inflación. La **Ley 1670** (1995), al limitar el crédito del BCB al Tesoro, fue en parte una respuesta institucional a ese problema.
`,
    },
    {
      id: 'm5', number: 5, title: 'Regla de Taylor y el modelo de tres ecuaciones',
      summary: 'El marco Nuevo Keynesiano: curva IS, curva de Phillips y regla de política.',
      objectives: ['Escribir y calibrar una regla de Taylor.', 'Explicar el principio de Taylor.', 'Simular shocks de demanda, oferta e inflación en el modelo IS-PC-MR.'],
      keywords: ['taylor', 'regla de taylor', 'tres ecuaciones', 'nuevo keynesiano', 'is', 'curva de phillips', 'mr', 'tasa neutral', 'brecha del producto', 'principio de taylor', 'metas de inflación'],
      simulators: ['nk', 'taylor'],
      body: r`
## Regla de Taylor
Taylor (1993) describió la política de la Reserva Federal con:
$$i_t = r^* + \pi_t + \phi_\pi(\pi_t - \pi^*) + \phi_y\,\tilde y_t, \qquad \phi_\pi = \phi_y = 0{,}5.$$
El **principio de Taylor**: la tasa nominal debe subir **más que uno a uno** con la inflación ($1 + \phi_\pi > 1$), de modo que la tasa **real** suba y enfríe la economía. Si no, la inflación se autoalimenta.

## El modelo de tres ecuaciones (Carlin-Soskice)
1. **IS:** $\tilde y_t = -\alpha\,(r_{t-1} - r^*) + \varepsilon^d_t$ — la tasa real afecta la demanda con rezago.
2. **Curva de Phillips:** $\pi_t = \pi_{t-1} + \kappa\,\tilde y_t + \varepsilon^s_t$ — inflación inercial.
3. **Regla monetaria (MR):** el banco central minimiza $\tilde y^2 + \beta(\pi - \pi^*)^2$ sujeto a la curva de Phillips, lo que da $\tilde y_t = -\kappa\beta\,(\pi_t - \pi^*)$.

Ante un shock inflacionario el banco central sube la tasa, provoca una brecha negativa y **guía** la inflación de vuelta a la meta. Cuanto mayor $\beta$ (aversión a la inflación), más rápida y costosa es la desinflación.

## Versión Nuevo Keynesiana
Con expectativas racionales: $\tilde y_t = E_t\tilde y_{t+1} - \sigma^{-1}(i_t - E_t\pi_{t+1} - r^n_t)$ y $\pi_t = \beta E_t\pi_{t+1} + \kappa\tilde y_t$. La política actúa sobre las **expectativas** de la trayectoria futura de tasas.

> **En Bolivia.** Con tipo de cambio fijo, la tasa de interés no es el instrumento principal y la regla de Taylor funciona más como **referencia analítica** que como regla operativa: permite preguntar si la orientación de la política (medida por las tasas de títulos del BCB o por la liquidez) fue coherente con la inflación y la brecha del producto.
`,
    },
    {
      id: 'm6', number: 6, title: 'Economía abierta y régimen cambiario',
      summary: 'Mundell-Fleming, el trilema y la experiencia boliviana con el tipo de cambio.',
      objectives: ['Analizar políticas fiscal y monetaria con tipo de cambio fijo y flexible.', 'Explicar el trilema de la economía abierta.', 'Describir la evolución del régimen cambiario boliviano.'],
      keywords: ['mundell-fleming', 'tipo de cambio', 'trilema', 'régimen cambiario', 'fijo', 'flexible', 'crawling peg', 'bolsín', 'reservas', 'paridad de tasas', 'devaluación', 'apreciación'],
      simulators: ['mundell'],
      body: r`
## Mundell-Fleming (movilidad perfecta de capital)
- **IS:** $Y = C(Y-T) + I(i) + G + XN(e)$.
- **LM:** $M/P = L(i, Y)$.
- **BP:** $i = i^*$ (paridad de tasas).

| Política | Tipo de cambio flexible | Tipo de cambio fijo |
|---|---|---|
| Monetaria expansiva | **efectiva**: $e$ se deprecia, suben exportaciones | **inefectiva**: el banco central vende reservas para defender la paridad y la oferta monetaria vuelve a su nivel |
| Fiscal expansiva | inefectiva: $e$ se aprecia y desplaza exportaciones | **efectiva**: el banco central compra divisas, la oferta monetaria se expande |

## El trilema
No se pueden tener a la vez: (1) tipo de cambio fijo, (2) libre movilidad de capital y (3) política monetaria independiente. Hay que elegir dos.

## Tipo de cambio real
$q = eP^*/P$. Una apreciación real abarata importaciones y encarece exportaciones. Con tipo de cambio nominal fijo, el tipo de cambio real se ajusta por **diferenciales de inflación**.

> **En Bolivia.** Tras la estabilización de 1985 se adoptó un tipo de cambio **deslizante** administrado mediante el **Bolsín** del BCB, con pequeñas depreciaciones frecuentes. Desde 2005 el boliviano se **apreció** gradualmente, y desde noviembre de 2011 el tipo de cambio oficial se mantiene en **Bs 6,86 (compra) y Bs 6,96 (venta)** por dólar. El ancla cambiaria ayudó a la bolivianización y a la baja inflación, pero con la caída de exportaciones de gas y de las reservas internacionales la sostenibilidad del régimen pasó a ser el centro del debate, especialmente desde la escasez de dólares de 2023.
`,
    },
    {
      id: 'm7', number: 7, title: 'Inflación, señoreaje e hiperinflación',
      summary: 'El impuesto inflacionario, la curva de Laffer del señoreaje y la hiperinflación boliviana de 1984–85.',
      objectives: ['Distinguir señoreaje e impuesto inflacionario.', 'Derivar la tasa de inflación que maximiza el señoreaje con la demanda de Cagan.', 'Analizar la hiperinflación boliviana y el DS 21060.'],
      keywords: ['señoreaje', 'impuesto inflacionario', 'hiperinflación', 'cagan', 'curva de laffer', '21060', 'estabilización', 'efecto olivera-tanzi', 'dominancia fiscal'],
      simulators: ['cagan'],
      body: r`
## Señoreaje
El ingreso real del gobierno por emitir dinero:
$$S = \frac{\Delta M}{P} = \frac{\Delta M}{M}\cdot\frac{M}{P} = \mu\, m.$$
En estado estacionario $\mu = \pi$ (más el crecimiento real): el señoreaje es un **impuesto inflacionario** cuya base son los saldos reales $m$.

## La curva de Laffer
Con la demanda de Cagan $m = e^{\gamma - \alpha\pi}$:
$$S(\pi) = \pi\, e^{\gamma - \alpha\pi}, \qquad \frac{dS}{d\pi} = 0 \Rightarrow \pi^* = \frac{1}{\alpha}.$$
Más allá de $\pi^*$, el público reduce tanto sus saldos reales que el gobierno **recauda menos** con más inflación. Si el déficit a financiar supera el señoreaje máximo, no hay equilibrio estacionario: **hiperinflación**.

## Efecto Olivera-Tanzi
Los impuestos se cobran con rezago; con inflación alta su valor real se erosiona, el déficit crece y exige más emisión: un círculo vicioso.

## La hiperinflación boliviana
- Entre 1982 y 1985 el déficit fiscal se financió con emisión del Banco Central, en un contexto de crisis de deuda externa y caída de los precios del estaño.
- La inflación llegó a **8.170% en 1985** (diciembre a diciembre), con tasas anualizadas de más de 20.000% a mediados de ese año, una de las pocas hiperinflaciones de la historia fuera de un contexto de guerra.
- El **Decreto Supremo 21060** (29 de agosto de 1985), bajo el gobierno de Víctor Paz Estenssoro, unificó y liberalizó el tipo de cambio, ajustó precios públicos (combustibles), congeló salarios del sector público, liberalizó el comercio y reordenó las finanzas públicas.
- La inflación cayó en pocas semanas: al **eliminar la causa fiscal**, las expectativas se ajustaron de inmediato (Sargent, "the end of four big inflations").
- En 1987 se introdujo el **boliviano**, equivalente a un millón de pesos bolivianos.

> Lección para el examen: la hiperinflación es un fenómeno **fiscal-monetario**. Detenerla exige un cambio de régimen creíble, no sólo reducir la emisión.
`,
    },
    {
      id: 'm8', number: 8, title: 'Dolarización y bolivianización',
      summary: 'Sustitución de monedas, dolarización financiera y el proceso de remonetización en moneda nacional.',
      objectives: ['Distinguir sustitución de monedas y sustitución de activos.', 'Evaluar los riesgos de la dolarización financiera.', 'Analizar las políticas que impulsaron la bolivianización.'],
      keywords: ['dolarización', 'bolivianización', 'sustitución de monedas', 'histéresis', 'descalce cambiario', 'ufv', 'itf', 'encaje diferenciado', 'desdolarización'],
      simulators: ['multiplicador'],
      lab: [{ label: 'Descriptivos: bolivianización', dataset: 'dinero', spec: { kind: 'describe', variables: ['bolivianizacion', 'tipo_cambio', 'inflacion'] } }],
      body: r`
## Conceptos
- **Sustitución de monedas:** uso del dólar como medio de pago.
- **Sustitución de activos (dolarización financiera):** depósitos y créditos denominados en dólares como reserva de valor.
- **Histéresis:** la dolarización persiste aun después de que la inflación baja, porque cambiar de moneda tiene costos y la memoria de la hiperinflación pesa.

## Riesgos de la dolarización financiera
1. **Descalce cambiario:** deudores con ingresos en bolivianos y deudas en dólares quiebran ante una devaluación.
2. **Prestamista de última instancia limitado:** el banco central no puede emitir dólares.
3. **Menor señoreaje** y menor efectividad de la política monetaria.
4. **Miedo a flotar:** el banco central evita mover el tipo de cambio por sus efectos en los balances.

## La bolivianización
A inicios de los 2000 más del 90% de los depósitos y créditos del sistema financiero estaban en dólares. Desde 2005–2006 se combinaron:
- **Apreciación gradual** del boliviano: tener dólares dejó de ser una apuesta ganadora.
- **Encaje legal diferenciado**, más alto para depósitos en moneda extranjera.
- **Impuesto a las Transacciones Financieras (ITF)** aplicado a operaciones en moneda extranjera.
- **Diferenciación de previsiones** y requerimientos de capital para créditos en dólares a no generadores de divisas.
- **Unidad de Fomento de Vivienda (UFV):** unidad indexada a la inflación que ofreció protección sin dolarizar.
- La estabilidad macroeconómica y la acumulación de reservas internacionales.

El resultado fue una de las desdolarizaciones más marcadas de la región: la mayoría de los depósitos y casi todo el crédito pasaron a moneda nacional.

> **Pregunta de reflexión.** ¿Qué pasa con la bolivianización si el público empieza a esperar una devaluación? La historia boliviana y la de otros países sugieren que la confianza en la moneda puede revertirse rápido: por eso la credibilidad del régimen cambiario y fiscal es clave para preservarla.
`,
    },
  ],
};
