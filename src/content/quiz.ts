import { RNG } from '../engine/random';

export interface Question {
  id: string;
  unit: string; // id de unidad (e1…e9, m1…m8)
  prompt: string; // markdown + LaTeX
  options: string[];
  answer: number;
  explain: string;
  generated?: boolean;
}

const r = String.raw;

export const QUESTIONS: Question[] = [
  // ---------------- Econometría II
  { id: 'q-e1-1', unit: 'e1', prompt: 'En presencia de heteroscedasticidad y regresores exógenos, el estimador MCO de $\\beta$ es:', options: ['Sesgado e inconsistente', 'Insesgado, pero sus errores estándar clásicos son inválidos', 'Insesgado y eficiente', 'Sesgado pero consistente'], answer: 1, explain: 'La heteroscedasticidad no afecta la insesgadez (que depende de $E[u|X]=0$), pero la fórmula $\\sigma^2(X\'X)^{-1}$ ya no es la varianza correcta. Se corrige con errores HC1 o con MCG factibles.' },
  { id: 'q-e1-2', unit: 'e1', prompt: 'Un modelo incluye $y_{t-1}$ como regresor. ¿Qué prueba de autocorrelación es apropiada?', options: ['Durbin-Watson', 'Breusch-Godfrey', 'Jarque-Bera', 'White'], answer: 1, explain: 'Durbin-Watson está sesgado hacia 2 cuando hay variable dependiente rezagada. Breusch-Godfrey (LM) sigue siendo válido y permite órdenes mayores.' },
  { id: 'q-e1-3', unit: 'e1', prompt: 'El estadístico de Durbin-Watson es 0,42. ¿Cuál es el $\\hat\\rho$ aproximado de los residuos?', options: ['0,21', '0,42', '0,79', '1,58'], answer: 2, explain: '$DW \\approx 2(1-\\hat\\rho) \\Rightarrow \\hat\\rho \\approx 1 - 0{,}42/2 = 0{,}79$. Autocorrelación positiva fuerte.' },
  { id: 'q-e1-4', unit: 'e1', prompt: 'La prueba RESET de Ramsey agrega $\\hat y^2$ y $\\hat y^3$ al modelo. Si son conjuntamente significativos, se concluye que:', options: ['Hay heteroscedasticidad', 'Hay problemas de forma funcional u omisión de variables', 'Los errores no son normales', 'Hay multicolinealidad perfecta'], answer: 1, explain: 'RESET detecta no linealidades omitidas. La corrección típica es usar logaritmos, cuadrados o interacciones.' },
  { id: 'q-e2-1', unit: 'e2', prompt: 'Un buen instrumento $z$ para el regresor endógeno $x$ debe cumplir:', options: ['$Cov(z,x)=0$ y $Cov(z,u)\\neq 0$', '$Cov(z,x)\\neq 0$ y $Cov(z,u)=0$', '$Cov(z,y)=0$', '$z$ debe ser binaria'], answer: 1, explain: 'Relevancia ($Cov(z,x)\\neq0$, se verifica en la primera etapa) y exogeneidad ($Cov(z,u)=0$, sólo se puede probar parcialmente con Sargan si hay sobreidentificación).' },
  { id: 'q-e2-2', unit: 'e2', prompt: 'El F de primera etapa de los instrumentos excluidos es 3,1. ¿Qué implica?', options: ['Instrumentos débiles: MC2E puede estar sesgado hacia MCO', 'Los instrumentos son inválidos', 'El modelo está sobreidentificado', 'MCO es consistente'], answer: 0, explain: 'La regla de Staiger-Stock exige F > 10. Con instrumentos débiles el sesgo de MC2E se acerca al de MCO y los intervalos son poco confiables.' },
  { id: 'q-e2-3', unit: 'e2', prompt: 'Con 1 regresor endógeno y 3 instrumentos excluidos, el estadístico de Sargan se distribuye:', options: ['$\\chi^2_1$', '$\\chi^2_2$', '$\\chi^2_3$', '$F_{3,n-k}$'], answer: 1, explain: 'Grados de libertad = número de restricciones de sobreidentificación = instrumentos excluidos − endógenas = 3 − 1 = 2.' },
  { id: 'q-e3-1', unit: 'e3', prompt: r`Sistema: $Q^d=\alpha_0+\alpha_1P+\alpha_2I+u_1$, $Q^s=\beta_0+\beta_1P+u_2$. ¿Qué ecuación está identificada?`, options: ['Sólo la demanda', 'Sólo la oferta', 'Ambas', 'Ninguna'], answer: 1, explain: 'La oferta excluye a $I$ (una exógena) e incluye una endógena a la derecha ($P$): exactamente identificada. La demanda no excluye ninguna exógena: no identificada. El ingreso desplaza la demanda y traza la oferta.' },
  { id: 'q-e3-2', unit: 'e3', prompt: 'La condición de orden para identificar una ecuación es:', options: ['Necesaria y suficiente', 'Necesaria pero no suficiente', 'Suficiente pero no necesaria', 'Irrelevante si se usa MC2E'], answer: 1, explain: 'La condición de rango es la necesaria y suficiente. La de orden sólo cuenta variables y puede cumplirse aun cuando la ecuación no esté identificada.' },
  { id: 'q-e4-1', unit: 'e4', prompt: 'En un Logit, $\\hat\\beta_{educ}=0{,}25$. La razón de odds asociada a un año más de educación es:', options: ['0,25', '1,25', '1,284', '0,779'], answer: 2, explain: '$e^{0{,}25}=1{,}284$: las odds de $y=1$ aumentan 28,4% por año adicional de educación.' },
  { id: 'q-e4-2', unit: 'e4', prompt: '¿Por qué el MPL tiene heteroscedasticidad por construcción?', options: ['Porque los errores son normales', 'Porque $Var(u|x)=p(x)(1-p(x))$ depende de $x$', 'Porque $y$ es continua', 'No la tiene'], answer: 1, explain: 'Con $y$ binaria, la varianza condicional es la de una Bernoulli: $p(1-p)$, que varía con $x$. Por eso el MPL se reporta con errores robustos.' },
  { id: 'q-e4-3', unit: 'e4', prompt: 'En Logit y Probit, lo que se interpreta como efecto de $x_j$ sobre la probabilidad es:', options: ['$\\beta_j$', '$g(x\'\\beta)\\beta_j$', '$e^{\\beta_j}$', '$\\beta_j/\\sigma$'], answer: 1, explain: 'El efecto marginal es la derivada de $G(x\'\\beta)$: $g(x\'\\beta)\\beta_j$. Depende de $x$; se resume con el efecto marginal promedio (AME).' },
  { id: 'q-e5-1', unit: 'e5', prompt: 'La prueba de Hausman rechaza $H_0$ con $p=0{,}003$. ¿Qué estimador se prefiere?', options: ['MCO agrupado', 'Efectos aleatorios', 'Efectos fijos', 'Between'], answer: 2, explain: 'Rechazar $H_0$ implica que los efectos individuales están correlacionados con los regresores: EA es inconsistente y EF sigue siendo consistente.' },
  { id: 'q-e5-2', unit: 'e5', prompt: 'Con efectos fijos NO se puede estimar el efecto de:', options: ['Una variable que cambia en el tiempo', 'Una variable constante en el tiempo para cada individuo', 'Una variable rezagada', 'Una interacción con el tiempo'], answer: 1, explain: 'La transformación within elimina todo lo que es constante en el tiempo, incluido el efecto de variables como la región o el sexo.' },
  { id: 'q-e5-3', unit: 'e5', prompt: 'En efectos aleatorios, si $\\theta\\to1$ el estimador se aproxima a:', options: ['MCO agrupado', 'Efectos fijos', 'Between', 'MC2E'], answer: 1, explain: '$\\theta\\to1$ ocurre cuando $T\\sigma^2_\\alpha$ es grande respecto de $\\sigma^2_u$: la cuasi-diferenciación se vuelve la transformación within completa.' },
  { id: 'q-e6-1', unit: 'e6', prompt: 'La FACP se corta después del rezago 2 y la FAC decae gradualmente. El modelo candidato es:', options: ['MA(2)', 'AR(2)', 'ARMA(2,2)', 'Ruido blanco'], answer: 1, explain: 'Un AR(p) tiene FACP que se anula después de $p$ y FAC que decae exponencial o sinusoidalmente.' },
  { id: 'q-e6-2', unit: 'e6', prompt: 'Un AR(1) $y_t=0{,}5+0{,}8y_{t-1}+\\varepsilon_t$ tiene media incondicional:', options: ['0,5', '0,625', '2,5', '4,0'], answer: 2, explain: '$\\mu = c/(1-\\phi) = 0{,}5/0{,}2 = 2{,}5$.' },
  { id: 'q-e6-3', unit: 'e6', prompt: 'Un MA(1) $y_t=\\varepsilon_t+\\theta\\varepsilon_{t-1}$ es invertible si:', options: ['$|\\theta|<1$', '$|\\theta|>1$', '$\\theta>0$', 'Siempre'], answer: 0, explain: 'Invertibilidad: la raíz de $1+\\theta z=0$, $z=-1/\\theta$, debe estar fuera del círculo unitario, es decir $|\\theta|<1$.' },
  { id: 'q-e7-1', unit: 'e7', prompt: 'En la prueba ADF, la hipótesis nula es:', options: ['La serie es estacionaria', 'La serie tiene raíz unitaria', 'No hay autocorrelación', 'Los errores son normales'], answer: 1, explain: '$H_0:\\gamma=0$ (raíz unitaria). KPSS es la que plantea estacionariedad en la nula.' },
  { id: 'q-e7-2', unit: 'e7', prompt: 'Se regresan dos caminatas aleatorias independientes: $R^2=0{,}71$, $DW=0{,}18$, $t=14$. ¿Qué concluye?', options: ['Relación fuerte y significativa', 'Probable regresión espuria', 'Multicolinealidad', 'Heteroscedasticidad'], answer: 1, explain: 'Granger y Newbold: con series I(1) no cointegradas, los $t$ se inflan y el $R^2$ es alto. Regla práctica: $R^2 > DW$ es señal de espuria.' },
  { id: 'q-e7-3', unit: 'e7', prompt: 'ADF no rechaza $H_0$ y KPSS rechaza $H_0$. La serie es:', options: ['Estacionaria', 'Con raíz unitaria', 'Evidencia ambigua', 'Ruido blanco'], answer: 1, explain: 'Ambas pruebas apuntan en la misma dirección: no se rechaza la raíz unitaria y se rechaza la estacionariedad.' },
  { id: 'q-e8-1', unit: 'e8', prompt: 'En un MCE $\\Delta y_t = 0{,}3\\Delta x_t - 0{,}25\\hat u_{t-1}$, ¿qué porcentaje del desequilibrio se corrige por período?', options: ['30%', '25%', '75%', '0,25%'], answer: 1, explain: 'El coeficiente de corrección de error $\\gamma=-0{,}25$ indica que cada período se corrige el 25% de la desviación respecto del equilibrio de largo plazo.' },
  { id: 'q-e8-2', unit: 'e8', prompt: '¿Por qué en Engle-Granger no se usan los valores críticos usuales de Dickey-Fuller?', options: ['Porque los residuos son estimados y MCO minimiza su varianza, sesgando la prueba hacia rechazar', 'Porque las series son estacionarias', 'Porque se usa MC2E', 'Sí se usan'], answer: 0, explain: 'MCO elige $\\hat\\beta$ para que los residuos parezcan lo más estacionarios posible; por eso MacKinnon tabuló valores críticos más negativos que dependen del número de variables.' },
  { id: 'q-e9-1', unit: 'e9', prompt: 'En un VAR con K=3 variables y p=2 rezagos (con constante), ¿cuántos coeficientes se estiman en total?', options: ['9', '18', '21', '27'], answer: 2, explain: 'Cada ecuación tiene $1 + Kp = 1 + 6 = 7$ coeficientes; con 3 ecuaciones, 21.' },
  { id: 'q-e9-2', unit: 'e9', prompt: 'En la descomposición de Cholesky con orden (inflación, crédito, tasa), un shock de tasa:', options: ['Afecta contemporáneamente a la inflación', 'No afecta contemporáneamente a inflación ni crédito', 'No afecta a ninguna variable', 'Sólo afecta a la inflación'], answer: 1, explain: 'La última variable del orden no afecta contemporáneamente a las anteriores (la matriz $P$ es triangular inferior).' },

  // ---------------- Economía Monetaria II
  { id: 'q-m1-1', unit: 'm1', prompt: 'Según Baumol-Tobin, la elasticidad de la demanda de dinero respecto del ingreso es:', options: ['1', '½', '−½', '0'], answer: 1, explain: '$M/P=\\sqrt{bY/2i}$: elasticidad ingreso ½ y elasticidad tasa −½. Hay economías de escala en el manejo de efectivo.' },
  { id: 'q-m1-2', unit: 'm1', prompt: 'Con $MV=PY$, $V$ constante, el dinero crece 12% y el producto 4%. La inflación de largo plazo es aproximadamente:', options: ['16%', '12%', '8%', '3%'], answer: 2, explain: '$\\pi \\approx \\mu + g_V - g_Y = 12 + 0 - 4 = 8\\%$.' },
  { id: 'q-m1-3', unit: 'm1', prompt: 'En el modelo de Cagan, la semielasticidad de la demanda de dinero a la inflación esperada es $\\alpha=2$ (inflación en tanto por uno). La inflación que maximiza el señoreaje es:', options: ['2%', '50%', '200%', '20%'], answer: 1, explain: '$\\pi^*=1/\\alpha = 0{,}5$, es decir 50% por período.' },
  { id: 'q-m2-1', unit: 'm2', prompt: 'Con preferencia por efectivo $c=0{,}4$ y encaje $r=0{,}1$, el multiplicador $m=(1+c)/(c+r)$ es:', options: ['2,8', '3,5', '1,4', '10'], answer: 0, explain: '$m=(1+0{,}4)/(0{,}4+0{,}1)=1{,}4/0{,}5=2{,}8$.' },
  { id: 'q-m2-2', unit: 'm2', prompt: 'Si el BCB compra divisas a los exportadores, la base monetaria:', options: ['Aumenta', 'Disminuye', 'No cambia', 'Depende del encaje'], answer: 0, explain: 'Suben las reservas internacionales netas (RIN) del activo del banco central y, en contrapartida, la emisión en su pasivo.' },
  { id: 'q-m2-3', unit: 'm2', prompt: '¿Por qué un encaje legal más alto para depósitos en dólares favorece la bolivianización?', options: ['Porque aumenta la oferta de dólares', 'Porque encarece captar y prestar en dólares, mejorando las tasas relativas en bolivianos', 'Porque prohíbe los depósitos en dólares', 'Porque reduce la inflación'], answer: 1, explain: 'Un encaje mayor inmoviliza más fondos en ME, reduciendo el rendimiento que el banco puede ofrecer y cobrar en esa moneda frente a la nacional.' },
  { id: 'q-m3-1', unit: 'm3', prompt: 'Una venta de títulos del BCB (OMA) tiene como efecto inmediato:', options: ['Aumentar la liquidez', 'Reducir la liquidez del sistema', 'Depreciar el boliviano', 'Aumentar las RIN'], answer: 1, explain: 'Los bancos pagan los títulos con sus reservas: la liquidez disponible cae.' },
  { id: 'q-m3-2', unit: 'm3', prompt: 'Según la Constitución de 2009, el BCB ejecuta su objetivo:', options: ['Con independencia total', 'En coordinación con el Órgano Ejecutivo', 'Bajo mandato del FMI', 'Sin objetivo de estabilidad de precios'], answer: 1, explain: 'El art. 327 mantiene el objetivo de estabilidad del poder adquisitivo interno para contribuir al desarrollo económico y social, en coordinación con la política económica del Ejecutivo.' },
  { id: 'q-m4-1', unit: 'm4', prompt: 'En Barro-Gordon bajo discreción, con expectativas racionales, el resultado es:', options: ['Inflación cero y producto mayor al natural', 'Inflación positiva y producto igual al natural', 'Inflación cero y producto natural', 'Deflación'], answer: 1, explain: 'El público anticipa la tentación de sorprender; en equilibrio no hay sorpresa ($y=y^*$) pero sí sesgo inflacionario $\\pi=b(k-1)y^*/a$.' },
  { id: 'q-m4-2', unit: 'm4', prompt: 'La propuesta de Rogoff para reducir el sesgo inflacionario consiste en:', options: ['Fijar el tipo de cambio', 'Nombrar un banquero central más averso a la inflación que la sociedad', 'Eliminar el banco central', 'Aumentar el encaje'], answer: 1, explain: 'El banquero conservador reduce el sesgo inflacionario, aunque estabiliza menos el producto ante shocks.' },
  { id: 'q-m5-1', unit: 'm5', prompt: 'Con la regla de Taylor $i=r^*+\\pi+0{,}5(\\pi-2)+0{,}5\\tilde y$, $r^*=2$, $\\pi=4$ y $\\tilde y=-1$, la tasa es:', options: ['6,5%', '7,0%', '5,5%', '8,0%'], answer: 0, explain: '$i=2+4+0{,}5(2)+0{,}5(-1)=2+4+1-0{,}5=6{,}5\\%$.' },
  { id: 'q-m5-2', unit: 'm5', prompt: 'El principio de Taylor exige que ante un aumento de 1 pp de la inflación la tasa nominal suba:', options: ['Menos de 1 pp', 'Exactamente 1 pp', 'Más de 1 pp', 'No suba'], answer: 2, explain: 'Sólo si la tasa nominal sube más que la inflación, la tasa real aumenta y enfría la demanda.' },
  { id: 'q-m6-1', unit: 'm6', prompt: 'Con tipo de cambio fijo y movilidad perfecta de capital, una expansión monetaria:', options: ['Aumenta el producto', 'Es inefectiva: se pierden reservas', 'Aprecia la moneda', 'Reduce la tasa de interés de forma permanente'], answer: 1, explain: 'La presión a la baja de la tasa provoca salida de capitales; para defender la paridad el banco central vende divisas y la oferta monetaria vuelve a su nivel inicial.' },
  { id: 'q-m6-2', unit: 'm6', prompt: 'El trilema establece que no se puede tener simultáneamente:', options: ['Inflación baja, crecimiento y empleo', 'Tipo de cambio fijo, libre movilidad de capital y política monetaria autónoma', 'Superávit fiscal, comercial y de capital', 'Encaje alto, tasas bajas y crédito alto'], answer: 1, explain: 'Hay que renunciar a uno de los tres. Bolivia combinó tipo de cambio fijo con restricciones de facto a la movilidad de capital.' },
  { id: 'q-m7-1', unit: 'm7', prompt: 'El Decreto Supremo 21060 (1985) se asocia con:', options: ['La nacionalización de hidrocarburos', 'La estabilización de la hiperinflación', 'La creación de la UFV', 'La fijación del tipo de cambio en 6,96'], answer: 1, explain: 'El DS 21060 del 29 de agosto de 1985 inició la Nueva Política Económica: ajuste fiscal, unificación y liberalización cambiaria, que detuvieron la hiperinflación.' },
  { id: 'q-m7-2', unit: 'm7', prompt: 'El efecto Olivera-Tanzi describe:', options: ['La caída de la velocidad del dinero', 'La erosión real de la recaudación por el rezago en el cobro de impuestos con inflación alta', 'La relación entre desempleo e inflación', 'El sesgo inflacionario'], answer: 1, explain: 'Con inflación alta, el valor real de los impuestos cobrados con rezago se reduce, el déficit aumenta y se exige más emisión.' },
  { id: 'q-m8-1', unit: 'm8', prompt: 'El principal riesgo de la dolarización financiera para los deudores es:', options: ['El riesgo de tasa de interés', 'El descalce cambiario ante una devaluación', 'La inflación importada', 'El encaje legal'], answer: 1, explain: 'Quien gana en bolivianos y debe en dólares ve crecer su deuda en moneda nacional si el boliviano se deprecia.' },
  { id: 'q-m8-2', unit: 'm8', prompt: '¿Cuál de estas medidas NO formó parte de las políticas de bolivianización?', options: ['Encaje diferenciado por moneda', 'Apreciación gradual del boliviano', 'Prohibición legal de los depósitos en dólares', 'La Unidad de Fomento de Vivienda (UFV)'], answer: 2, explain: 'Nunca se prohibieron los depósitos en dólares; la bolivianización fue voluntaria, inducida por incentivos de precios y regulación.' },
];

// ---------------------------------------------------------------- generadores numéricos

const f2 = (x: number, d = 2) => x.toFixed(d).replace('.', ',');

function shuffleWithAnswer(correct: string, wrongs: string[], rng: RNG) {
  const opts = [correct, ...wrongs.filter((w) => w !== correct)].slice(0, 4);
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rng.uniform() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { options: opts, answer: opts.indexOf(correct) };
}

type Gen = (rng: RNG) => Omit<Question, 'id'>;

export const GENERATORS: { id: string; unit: string; title: string; gen: Gen }[] = [
  {
    id: 'g-mult', unit: 'm2', title: 'Multiplicador con bolivianización',
    gen: (rng) => {
      const c = rng.int(10, 40) / 100;
      const rmn = rng.int(5, 12) / 100;
      const rme = rng.int(15, 45) / 100;
      const d = rng.int(10, 60) / 100;
      const m = (1 + c) / (c + rmn * (1 - d) + rme * d);
      const wrong = [(1 + c) / (c + rmn), (1 + c) / (c + rme), 1 / (rmn * (1 - d) + rme * d)];
      const s = shuffleWithAnswer(f2(m, 3), wrong.map((w) => f2(w, 3)), rng);
      return {
        unit: 'm2', generated: true,
        prompt: `Preferencia por efectivo $c=${f2(c)}$, encaje en MN $r_{MN}=${f2(rmn)}$, encaje en ME $r_{ME}=${f2(rme)}$, dolarización de depósitos $d=${f2(d)}$. Calcule el multiplicador del agregado ampliado $m'=\\dfrac{1+c}{c+r_{MN}(1-d)+r_{ME}d}$.`,
        ...s,
        explain: `Denominador: $${f2(c)} + ${f2(rmn)}\\cdot${f2(1 - d)} + ${f2(rme)}\\cdot${f2(d)} = ${f2(c + rmn * (1 - d) + rme * d, 4)}$. Entonces $m' = ${f2(1 + c)}/${f2(c + rmn * (1 - d) + rme * d, 4)} = ${f2(m, 3)}$. Note que si $d$ sube (más dolarización) con $r_{ME} > r_{MN}$, el multiplicador cae.`,
      };
    },
  },
  {
    id: 'g-taylor', unit: 'm5', title: 'Regla de Taylor',
    gen: (rng) => {
      const rs = rng.int(1, 3);
      const pi = rng.int(10, 90) / 10;
      const ps = rng.pick([2, 3, 4]);
      const gap = rng.int(-30, 30) / 10;
      const a = rng.pick([0.5, 1.5]);
      const b = rng.pick([0.5, 1]);
      const i = rs + pi + a * (pi - ps) + b * gap;
      const s = shuffleWithAnswer(`${f2(i)}%`, [`${f2(rs + pi)}%`, `${f2(rs + a * (pi - ps) + b * gap)}%`, `${f2(i + b * gap * -2)}%`], rng);
      return {
        unit: 'm5', generated: true,
        prompt: `Regla $i = r^* + \\pi + ${f2(a, 1)}(\\pi - \\pi^*) + ${f2(b, 1)}\\,\\tilde y$ con $r^*=${rs}\\%$, $\\pi=${f2(pi, 1)}\\%$, $\\pi^*=${ps}\\%$ y brecha $\\tilde y=${f2(gap, 1)}\\%$. ¿Qué tasa nominal prescribe?`,
        ...s,
        explain: `$i = ${rs} + ${f2(pi, 1)} + ${f2(a, 1)}(${f2(pi - ps, 1)}) + ${f2(b, 1)}(${f2(gap, 1)}) = ${f2(i)}\\%$. La tasa real implícita es $${f2(i - pi)}\\%$.`,
      };
    },
  },
  {
    id: 'g-barro', unit: 'm4', title: 'Sesgo inflacionario de Barro-Gordon',
    gen: (rng) => {
      const b = rng.int(5, 20) / 10;
      const k = rng.int(11, 15) / 10;
      const ys = rng.int(2, 6);
      const a = rng.int(5, 30) / 10;
      const pi = (b * (k - 1) * ys) / a;
      const s = shuffleWithAnswer(f2(pi), [f2((b * k * ys) / a), f2((b * (k - 1) * ys) * a), f2(((k - 1) * ys) / a)], rng);
      return {
        unit: 'm4', generated: true,
        prompt: `En Barro-Gordon, $y = y^* + b(\\pi-\\pi^e)$ y $L=\\tfrac12(y-ky^*)^2+\\tfrac a2\\pi^2$ con $b=${f2(b, 1)}$, $k=${f2(k, 1)}$, $y^*=${ys}$, $a=${f2(a, 1)}$. ¿Cuál es la inflación de equilibrio bajo discreción?`,
        ...s,
        explain: `$\\pi^D = b(k-1)y^*/a = ${f2(b, 1)}\\cdot${f2(k - 1, 1)}\\cdot${ys}/${f2(a, 1)} = ${f2(pi)}$. El producto queda en $y^*$: la inflación extra no compra empleo.`,
      };
    },
  },
  {
    id: 'g-cagan', unit: 'm7', title: 'Señoreaje máximo de Cagan',
    gen: (rng) => {
      const alpha = rng.int(15, 60) / 10;
      const pistar = 1 / alpha;
      const s = shuffleWithAnswer(`${f2(pistar * 100, 1)}%`, [`${f2(alpha * 100, 1)}%`, `${f2((pistar * 100) / 2, 1)}%`, `${f2(Math.exp(pistar) * 100 - 100, 1)}%`], rng);
      return {
        unit: 'm7', generated: true,
        prompt: `La demanda de saldos reales es $m = e^{\\gamma - ${f2(alpha, 1)}\\pi}$ (inflación por período, en tanto por uno). ¿Qué inflación maximiza el señoreaje $S=\\pi m$?`,
        ...s,
        explain: `$dS/d\\pi = m(1-\\alpha\\pi)=0 \\Rightarrow \\pi^*=1/\\alpha = 1/${f2(alpha, 1)} = ${f2(pistar, 3)}$, es decir ${f2(pistar * 100, 1)}% por período. Más inflación reduce la recaudación.`,
      };
    },
  },
  {
    id: 'g-ar1', unit: 'e6', title: 'Media y varianza de un AR(1)',
    gen: (rng) => {
      const c = rng.int(2, 20) / 10;
      const phi = rng.int(2, 9) / 10;
      const s2 = rng.int(1, 4);
      const mu = c / (1 - phi);
      const v = s2 / (1 - phi * phi);
      const s = shuffleWithAnswer(`μ = ${f2(mu)}, γ₀ = ${f2(v)}`, [`μ = ${f2(c)}, γ₀ = ${f2(s2)}`, `μ = ${f2(mu)}, γ₀ = ${f2(s2 / (1 - phi))}`, `μ = ${f2(c / phi)}, γ₀ = ${f2(v)}`], rng);
      return {
        unit: 'e6', generated: true,
        prompt: `Para $y_t = ${f2(c, 1)} + ${f2(phi, 1)}\\,y_{t-1} + \\varepsilon_t$ con $\\sigma^2_\\varepsilon = ${s2}$, calcule la media $\\mu$ y la varianza $\\gamma_0$.`,
        ...s,
        explain: `$\\mu = c/(1-\\phi) = ${f2(c, 1)}/${f2(1 - phi, 1)} = ${f2(mu)}$; $\\gamma_0 = \\sigma^2/(1-\\phi^2) = ${s2}/${f2(1 - phi * phi)} = ${f2(v)}$. Además $\\rho_k = ${f2(phi, 1)}^k$.`,
      };
    },
  },
  {
    id: 'g-logit', unit: 'e4', title: 'Probabilidad y efecto marginal en Logit',
    gen: (rng) => {
      const b0 = rng.int(-30, -5) / 10;
      const b1 = rng.int(5, 40) / 100;
      const x = rng.int(5, 16);
      const z = b0 + b1 * x;
      const p = 1 / (1 + Math.exp(-z));
      const me = p * (1 - p) * b1;
      const s = shuffleWithAnswer(`P = ${f2(p, 3)}; efecto = ${f2(me, 4)}`, [`P = ${f2(z, 3)}; efecto = ${f2(b1, 4)}`, `P = ${f2(p, 3)}; efecto = ${f2(b1, 4)}`, `P = ${f2(1 - p, 3)}; efecto = ${f2(me, 4)}`], rng);
      return {
        unit: 'e4', generated: true,
        prompt: `Logit: $P(y=1|x) = \\Lambda(${f2(b0, 1)} + ${f2(b1)}\\,x)$. Para $x = ${x}$, calcule la probabilidad y el efecto marginal $\\partial P/\\partial x$.`,
        ...s,
        explain: `$z = ${f2(b0, 1)} + ${f2(b1)}\\cdot${x} = ${f2(z, 3)}$; $P = 1/(1+e^{-z}) = ${f2(p, 3)}$; efecto $= P(1-P)\\beta_1 = ${f2(p, 3)}\\cdot${f2(1 - p, 3)}\\cdot${f2(b1)} = ${f2(me, 4)}$.`,
      };
    },
  },
  {
    id: 'g-ecm', unit: 'e8', title: 'Vida media en un MCE',
    gen: (rng) => {
      const g = -rng.int(5, 60) / 100;
      const hl = Math.log(0.5) / Math.log(1 + g);
      const s = shuffleWithAnswer(`${f2(hl)} períodos`, [`${f2(-1 / g)} períodos`, `${f2(Math.abs(g) * 10)} períodos`, `${f2(0.5 / Math.abs(g))} períodos`], rng);
      return {
        unit: 'e8', generated: true,
        prompt: `En un MCE el coeficiente de corrección de error es $\\gamma = ${f2(g)}$. ¿Cuál es la vida media de un desequilibrio?`,
        ...s,
        explain: `La brecha sigue $u_t = (1+\\gamma)u_{t-1}$; la vida media resuelve $(1+\\gamma)^h = 0{,}5$: $h = \\ln 0{,}5/\\ln(${f2(1 + g)}) = ${f2(hl)}$.`,
      };
    },
  },
  {
    id: 'g-ident', unit: 'e3', title: 'Condición de orden',
    gen: (rng) => {
      const K = rng.int(3, 6);
      const k = rng.int(1, K - 1);
      const m = rng.int(1, 3);
      const excl = K - k;
      const need = m - 1;
      const ans = excl > need ? 'Sobreidentificada' : excl === need ? 'Exactamente identificada' : 'No identificada';
      const s = shuffleWithAnswer(ans, ['Sobreidentificada', 'Exactamente identificada', 'No identificada', 'Identificada sólo por rango'].filter((x) => x !== ans), rng);
      return {
        unit: 'e3', generated: true,
        prompt: `Un sistema tiene $K=${K}$ variables exógenas. Una ecuación incluye $k=${k}$ exógenas y $m=${m}$ endógenas (incluida la dependiente). Según la condición de orden, la ecuación está:`,
        ...s,
        explain: `Exógenas excluidas: $K-k=${excl}$. Endógenas a la derecha: $m-1=${need}$. Como $${excl} ${excl > need ? '>' : excl === need ? '=' : '<'} ${need}$, está ${ans.toLowerCase()} (sujeto a la condición de rango).`,
      };
    },
  },
];

export function generateQuestion(genId: string, seed: number): Question {
  const g = GENERATORS.find((x) => x.id === genId)!;
  return { id: `${genId}-${seed}`, ...g.gen(new RNG(seed)) };
}
