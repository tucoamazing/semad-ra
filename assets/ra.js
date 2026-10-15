// Páginas de RA · Expedição Parques GO — gerado por scripts/ar-site.mjs (não editar à mão).
// Sem dependências. O <model-viewer> vem do próprio site (assets/model-viewer.min.js, com SRI); aqui: disponibilidade de
// RA, botão externo, link direto para a câmera sem o visualizador, pausa do movimento, vídeo-convite, cópia do link e
// mensagens em português.
(function () {
  var body = document.body
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  var status = document.querySelector('[data-ar-status]')
  var FAIL = 'A realidade aumentada não abriu neste aparelho. Você ainda pode girar o modelo em 3D aqui mesmo.'

  function say(msg) {
    if (status) status.textContent = msg || ''
  }

  // Foco pelo teclado: o model-viewer recebe o foco dentro do shadow DOM (anel nativo de 1 px);
  // com esta marca o CSS desenha o anel âmbar no próprio componente, sem aparecer ao arrastar.
  var root = document.documentElement
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') root.setAttribute('data-kbd', '')
  })
  document.addEventListener('pointerdown', function () {
    root.removeAttribute('data-kbd')
  })

  // AR Quick Look (iPhone/iPad). A mesma regra do model-viewer: o relList falha nos navegadores do iPhone que não são
  // o Safari (Chrome, Edge, Firefox, app Google — todos WKWebView), mas o Quick Look abre neles do mesmo jeito.
  function temQuickLook() {
    var ua = navigator.userAgent
    var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (ios && /CriOS\/|EdgiOS\/|FxiOS\/|GSA\/|DuckDuckGo\//.test(ua)) return true
    var a = document.createElement('a')
    return !!(a.relList && a.relList.supports && a.relList.supports('ar'))
  }

  // Misturador interno do model-viewer (three.js), pelo símbolo “scene”: para mexer no relógio de UMA ação só.
  // O relógio global (mv.currentTime) zera todas as ações — o laço que está saindo pulava para o 1º quadro e a
  // mistura recomeçava: a “flicada” antes de cada gesto (medido: cabeça saltando 17° num quadro, 08/10).
  function cenaDe(v) {
    var syms = Object.getOwnPropertySymbols(v)
    for (var i = 0; i < syms.length; i++) if (syms[i].description === 'scene') return v[syms[i]]
    return null
  }
  function acaoDe(v, name) {
    var sc = cenaDe(v)
    var mx = sc && sc.mixers && sc.mixers[0]
    var acts = mx && mx._actions
    if (!acts) return null
    for (var i = 0; i < acts.length; i++) if (acts[i].getClip && acts[i].getClip().name === name) return acts[i]
    return null
  }
  // antes de trocar para um clipe que já tocou (parado no fim): zera só ele. Sem isso o model-viewer, ao ver o clipe
  // no fim, zera o relógio de TODAS as ações. Devolve false quando o misturador não está acessível.
  function preparaClipe(v, name) {
    if (!cenaDe(v)) return false
    var a = acaoDe(v, name)
    if (a) {
      a.time = 0
      a.paused = false
      // 13/10: a sincronia com a voz agora mexe na VELOCIDADE da ação (nunca no tempo): volta ao normal
      a.timeScale = 1
    }
    return true
  }
  // 13/10 (verificação r2): depois de pedir o clipe “name” (animationName + play) com a VIDA fora da vista: só ele com peso 1,
  // sem mistura em curso, e as outras ações paradas. Um misturador que não desenha (caixa escondida, página coberta) não
  // anda: a mistura ficava pela metade e era retomada na próxima vez que ela aparecesse (a pose da fala antiga por ~0,3 s)
  function soClipe(v, name) {
    var sc = cenaDe(v)
    var mx = sc && sc.mixers && sc.mixers[0]
    var acts = mx && mx._actions
    if (!acts) return false
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i]
      if (!a.getClip) continue
      if (a.getClip().name === name) {
        a.enabled = true
        a.setEffectiveWeight(1)
      } else if (a.isRunning() || a.getEffectiveWeight() > 0) a.stop()
    }
    return true
  }
  // 13/10 (verificação r2): a hora (performance.now) do último desenho de cada visualizador, no onBeforeRender da cena — o
  // misturador já andou nesse instante. A sincronia da fala precisa dela para prever onde o clipe estará no próximo desenho
  function marcaDesenho(v) {
    var sc = cenaDe(v)
    if (!sc || sc.__marcaDesenho) return
    sc.__marcaDesenho = true
    var prev = sc.onBeforeRender
    sc.onBeforeRender = function () {
      v.__desenhoEm = performance.now()
      if (typeof prev === 'function') return prev.apply(this, arguments)
    }
  }

  var mv = document.querySelector('model-viewer')
  if (mv) setupViewer(mv)
  setupVideo()
  setupCopy()
  setupFx()
  setupApp()

  // Profundidade ao ponteiro (só mouse, sem movimento reduzido): cartões inclinam até 5°, palavra do palco em paralaxe.
  function setupFx() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    function on() {
      return fine.matches && !reduced.matches
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-tilt]'), function (card) {
      var raf = 0
      card.addEventListener('pointermove', function (e) {
        if (!on() || e.pointerType !== 'mouse') return
        var r = card.getBoundingClientRect()
        var px = (e.clientX - r.left) / r.width - 0.5
        var py = (e.clientY - r.top) / r.height - 0.5
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(function () {
          card.setAttribute('data-tilting', '')
          card.style.setProperty('--rx', (-py * 5).toFixed(2) + 'deg')
          card.style.setProperty('--ry', (px * 6).toFixed(2) + 'deg')
          card.style.setProperty('--px', px.toFixed(3))
          card.style.setProperty('--py', py.toFixed(3))
        })
      })
      card.addEventListener('pointerleave', function () {
        cancelAnimationFrame(raf)
        card.removeAttribute('data-tilting')
        ;['--rx', '--ry', '--px', '--py'].forEach(function (k) {
          card.style.removeProperty(k)
        })
      })
    })
    var st = document.querySelector('.ra-stage')
    if (st) {
      st.addEventListener('pointermove', function (e) {
        if (!on() || e.pointerType !== 'mouse') return
        var r = st.getBoundingClientRect()
        st.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
        st.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
      })
      st.addEventListener('pointerleave', function () {
        st.style.removeProperty('--px')
        st.style.removeProperty('--py')
      })
    }
  }

  // 14/10 (verificação): a RA de verdade abre UMA vez por toque. A sessão imersiva do WebXR é exclusiva: um 2º
  // requestSession com outra aberta OU AINDA PENDENTE é recusado (InvalidStateError, como manda a especificação) e o
  // model-viewer 4.3.1 trata isso como falha da RA — fecha a 1ª sessão (stopPresenting), desliga o WebXR até a página
  // recarregar e tenta o Scene Viewer (outro app, sem a voz); depois disso, “Tirar uma foto com a VIDA” caía na tela do
  // giroscópio. O 2º toque em “Tirar uma foto com a VIDA” ou em “Ver no meu espaço” antes de a RA cobrir a página (o ARCore
  // leva 0,6–1,5 s para abrir e o activateAR ainda espera o modelo carregar) fazia isso. Agora o pedido é um só: com a RA
  // aberta (ar-status session-started/object-placed) ou abrindo (o activateAR ainda não terminou), o toque é ignorado, a
  // página diz que a RA está abrindo e os botões ficam “ocupados” (aria-busy). O “abrindo” cai quando o activateAR termina
  // (a sessão abriu ou falhou) — NÃO por tempo: soltar antes, com o pedido ainda pendente, devolveria o defeito (teste H2:
  // sessão de 7 s e 2º toque aos 6,5 s). A reserva de 20 s só existe para um pedido que nunca termine.
  // Teste: scripts/ra-foto-ra.mjs --only H (o simulador agora recusa a 2ª sessão, como o navegador).
  function raAbrindo(mv) {
    var em = mv.__raAbrindoEm || 0
    return em > 0 && performance.now() - em < 20000
  }
  function raOcupada(mv) {
    return /session-started|object-placed/.test(mv.getAttribute('ar-status') || '') || raAbrindo(mv)
  }
  function marcaAbrindo(mv, on) {
    mv.__raAbrindoEm = on ? performance.now() : 0
    clearTimeout(mv.__raAbrindoT)
    if (on) {
      mv.__raAbrindoT = setTimeout(function () {
        marcaAbrindo(mv, false)
      }, 20000)
    }
    if (on) document.body.setAttribute('data-ar-abrindo', '')
    else {
      document.body.removeAttribute('data-ar-abrindo')
      // o aviso do toque ignorado não fica para trás (a RA que caiu no Scene Viewer volta para a página)
      if (status && status.textContent === 'Abrindo a realidade aumentada…') say('')
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-ar-launch], [data-foto-open]'), function (b) {
      if (on) b.setAttribute('aria-busy', 'true')
      else b.removeAttribute('aria-busy')
    })
  }
  // o activateAR com a trava: devolve a promessa dele, ou null quando o toque foi ignorado (RA aberta ou abrindo)
  function abrirRA(mv) {
    if (raOcupada(mv)) return null
    marcaAbrindo(mv, true)
    var tok = mv.__raAbrindoEm
    var p
    try {
      p = mv.activateAR()
    } catch (e) {
      marcaAbrindo(mv, false)
      throw e
    }
    function solta() {
      if (mv.__raAbrindoEm === tok) marcaAbrindo(mv, false)
    }
    Promise.resolve(p).then(solta, solta)
    return p
  }

  function setupViewer(mv) {
    var launchers = document.querySelectorAll('[data-ar-launch]')
    var motion = document.querySelector('[data-motion]')
    var motionLabel = motion && motion.querySelector('[data-motion-label]')
    var gestureBtn = document.querySelector('[data-gesture-play]')
    var bar = document.querySelector('.ra-progress')
    var decided = false
    var moving = !reduced.matches
    var loopClip = mv.getAttribute('data-loop')
    var gesture = mv.getAttribute('data-gesture')
    var inGesture = false
    // gesto genérico (VIDA falante): o clipe em curso e o retorno chamado no fim dele (ver playGesture)
    var activeGesture = gesture
    var gestureDone = null
    var origLoop = loopClip
    var placedHook = null
    var arExitHook = null
    // 13/10: iPhone/iPad com a VIDA falante — os botões de RA abrem “A VIDA no seu mundo” (setupFala) em vez do Quick Look
    var mundoHook = null
    // movimento reduzido: o carregamento já começa no laço (idle), nunca no gesto
    if (!moving && loopClip && gesture) mv.setAttribute('animation-name', loopClip)

    // Pose parada (movimento pausado ou reduzido): quadro de um clipe, sem animar. Trocar de clipe com o modelo
    // pausado deixa a mistura (crossfade) no meio e o esqueleto cai na pose T; por isso a troca é feita sem mistura
    // (duração 0): o nome do clipe muda, a atualização do componente (updateComplete) roda, o clipe toca e, depois do
    // evento “play” e de três quadros — o misturador já aplicou o clipe novo com peso total —, o tempo é fixado e o
    // clipe pausa. Antes, com dois quadros contados a partir da troca, o tempo às vezes era fixado antes de a
    // atualização tocar o clipe, e a pose ficava no 1º quadro. A duração da mistura volta no quadro seguinte.
    var fadeMs = null
    var stillToken = 0
    var stillPending = false
    function frames(n, fn) {
      if (n <= 0) return fn()
      requestAnimationFrame(function () {
        frames(n - 1, fn)
      })
    }
    function restoreFade() {
      if (fadeMs === null) return
      mv.animationCrossfadeDuration = fadeMs
      fadeMs = null
    }
    function still(name, t) {
      if (!name || typeof mv.pause !== 'function' || typeof mv.play !== 'function') return
      var token = ++stillToken
      if (fadeMs === null) fadeMs = mv.animationCrossfadeDuration
      stillPending = true
      mv.animationCrossfadeDuration = 0
      function onPlay() {
        mv.removeEventListener('play', onPlay)
        frames(3, function () {
          if (token !== stillToken) return
          mv.currentTime = t
          mv.pause()
          stillPending = false
          requestAnimationFrame(function () {
            if (token === stillToken) restoreFade()
          })
        })
      }
      if (mv.animationName !== name) mv.animationName = name
      ;(mv.updateComplete || Promise.resolve()).then(function () {
        if (token !== stillToken) return
        mv.addEventListener('play', onPlay)
        mv.play()
      })
    }
    // Gesto (VIDA: “acenar”): toca N vezes e volta ao laço; com movimento parado, mostra o quadro-chave do gesto.
    // Durante o gesto a VIDA fica de frente: o giro automático para e, como ele gira o MODELO (turntable) e não a
    // câmera, o próprio modelo volta à frente numa curva curta (0,42 s) — a câmera volta à órbita do gesto ao mesmo
    // tempo. Nada salta: com o modelo de costas (giro > 150°), ela vira de frente antes de o braço subir. R10: a virada
    // anda pelo RELÓGIO DO CLIPE do gesto (o mesmo do braço), não pelo da página — com o processador lento, os quadros
    // longos faziam o braço subir com a VIDA ainda de perfil; enquanto o clipe não anda, vale o relógio da página, 3 vezes
    // mais devagar (reserva: a virada nunca fica parada no meio).
    var gestureOrbit = mv.getAttribute('data-gesture-orbit')
    var TURN_S = 0.42
    var turnRaf = 0
    function holdCamera() {
      spin(false)
      // 13/10: na RA (WebXR) o giro do modelo é do model-viewer (goalYaw = de frente para quem segura o
      // celular; ARRenderer.updateYaw o persegue a cada quadro). Escrever scene.yaw aqui (resetTurntableRotation)
      // brigava com ele: a VIDA virava até |goalYaw| para o lado e voltava em ~0,5 s a cada fala.
      if (/session-started|object-placed/.test(mv.getAttribute('ar-status') || '')) return
      if (gestureOrbit) mv.cameraOrbit = gestureOrbit
      if (typeof mv.resetTurntableRotation !== 'function') return
      var tau = Math.PI * 2
      var t0 = typeof mv.turntableRotation === 'number' ? mv.turntableRotation : 0
      // caminho mais curto até a frente: o giro acumulado vai para [-π, π)
      var from = (((t0 % tau) + tau * 1.5) % tau) - Math.PI
      cancelAnimationFrame(turnRaf)
      if (Math.abs(from) < 0.002) {
        mv.resetTurntableRotation(0)
        return
      }
      var start = performance.now()
      ;(function step(now) {
        var clip = inGesture && mv.animationName === activeGesture ? mv.currentTime || 0 : 0
        var k = Math.min(1, Math.max(0, clip / TURN_S, (now - start) / (TURN_S * 3000)))
        var e = 1 - Math.pow(1 - k, 3)
        mv.resetTurntableRotation(from * (1 - e))
        if (k < 1) turnRaf = requestAnimationFrame(step)
      })(start)
    }
    // Giro: auto-rotate do model-viewer (turntable: o MODELO dá a volta inteira) ou, com data-sweep = A (periquito), um
    // pêndulo por rAF — a CÂMERA vai e volta de −A a +A graus de azimute pela frente (36 s por ida e volta: no pico,
    // ≈ 16°/s, como o giro de 14°/s) e o modelo nunca aparece de costas. Arrastar pausa; 3 s depois do último arrasto,
    // o pêndulo continua do rumo, da altura e da distância em que a pessoa deixou, no mesmo sentido em que ia.
    // R11: deixada FORA da faixa do pêndulo (centro ± A — a arara arrastada até +74°, +92° ou uma volta inteira), a câmera
    // volta até a borda da faixa devagar (no máximo SWEEP_BACK_DPS, desacelerando perto dela) e só então o vaivém segue;
    // antes, o seno saturado punha o alvo direto na borda e a arara girava 80° ou mais de uma vez.
    var sweep = parseFloat(mv.getAttribute('data-sweep') || '')
    // centro do pêndulo (graus de azimute; padrão 0 = a frente): a arara vai e volta em volta do perfil
    var sweepC = parseFloat(mv.getAttribute('data-sweep-center') || '') || 0
    var SWEEP_MS = 36000
    var SWEEP_IDLE_MS = 3000
    // volta até a faixa: teto de velocidade (graus/s) e, perto da borda, velocidade proporcional à distância (1/s)
    var SWEEP_BACK_DPS = 10
    var SWEEP_BACK_K = 1.2
    // rumo da volta em curso (graus); NaN = nenhuma volta
    var sweepBack = NaN
    // voltas inteiras que o arrasto deixou no ângulo da câmera (múltiplo de 360°)
    var sweepWind = 0
    var sweepOn = false
    var sweepRaf = 0
    var sweepPhase = 0
    var sweepLast = 0
    var sweepHold = 0
    var sweepResume = true
    var sweepUser = false
    // altura e distância da câmera enquanto ninguém arrastou: as da página (a distância em % segue o palco)
    var sweepRest = (mv.getAttribute('camera-orbit') || '0deg 80deg auto').split(' ').slice(1).join(' ')
    function spin(on) {
      if (!(sweep > 0)) {
        if (on) mv.setAttribute('auto-rotate', '')
        else mv.removeAttribute('auto-rotate')
        return
      }
      mv.removeAttribute('auto-rotate')
      if (on === sweepOn) return
      sweepOn = on
      cancelAnimationFrame(sweepRaf)
      sweepRaf = 0
      if (on) {
        sweepResume = true
        sweepRaf = requestAnimationFrame(sweepStep)
      }
    }
    function sweepStep(now) {
      sweepRaf = 0
      if (!sweepOn) return
      sweepRaf = requestAnimationFrame(sweepStep)
      if (now < sweepHold) {
        sweepResume = true
        sweepBack = NaN
        return
      }
      if (typeof mv.getCameraOrbit !== 'function') return
      var o = mv.getCameraOrbit()
      if (sweepResume) {
        if (sweepUser) {
          sweepRest = ((o.phi * 180) / Math.PI).toFixed(2) + 'deg ' + o.radius.toFixed(3) + 'm'
          sweepUser = false
        }
        var raw = (o.theta * 180) / Math.PI
        // o rumo em (centro − 180°, centro + 180°]: o arrasto pode ter dado voltas (o model-viewer não reduz o ângulo).
        // As voltas inteiras ficam em sweepWind e entram em todo alvo: a câmera segue do ângulo em que está, sem pular
        // 360° (o model-viewer desfaz uma volta por quadro quando o alvo fica a mais de 180°)
        var th = sweepC + 180 - ((((sweepC + 180 - raw) % 360) + 360) % 360)
        sweepWind = Math.round((raw - th) / 360) * 360
        sweepResume = false
        sweepLast = now
        if (Math.abs(th - sweepC) > sweep) {
          sweepBack = th
          return
        }
        sweepBack = NaN
        var a = Math.asin((th - sweepC) / sweep)
        sweepPhase = Math.cos(sweepPhase) >= 0 ? a : Math.PI - a
        return
      }
      var dt = Math.min(64, now - sweepLast)
      sweepLast = now
      if (!isNaN(sweepBack)) {
        // volta até a borda mais perto da faixa, com a velocidade limitada pelo tempo de cada quadro
        var edge = sweepBack > sweepC ? sweepC + sweep : sweepC - sweep
        var dist = Math.abs(edge - sweepBack)
        var step = (Math.max(1, Math.min(SWEEP_BACK_DPS, dist * SWEEP_BACK_K)) * dt) / 1000
        if (dist <= step) {
          // na borda: o pêndulo segue daqui (parado no extremo), rumo ao centro
          sweepBack = NaN
          sweepPhase = edge > sweepC ? Math.PI / 2 : -Math.PI / 2
          mv.cameraOrbit = (edge + sweepWind).toFixed(2) + 'deg ' + sweepRest
          return
        }
        sweepBack += edge > sweepBack ? step : -step
        mv.cameraOrbit = (sweepBack + sweepWind).toFixed(2) + 'deg ' + sweepRest
        return
      }
      sweepPhase += (dt / SWEEP_MS) * Math.PI * 2
      mv.cameraOrbit = (sweepC + sweepWind + sweep * Math.sin(sweepPhase)).toFixed(2) + 'deg ' + sweepRest
    }
    if (sweep > 0) {
      mv.addEventListener('camera-change', function (e) {
        if (!e.detail || e.detail.source !== 'user-interaction') return
        sweepHold = performance.now() + SWEEP_IDLE_MS
        sweepUser = true
      })
    }
    // Movimento reduzido: o “Acenar” mostra o quadro-chave do aceno (braço erguido), de frente e sem animar, e volta
    // sozinho à pose inicial do laço em 2,6 s. Movimento pausado pelo botão (sem preferência de movimento reduzido): o
    // toque no “Acenar” é um pedido explícito — a VIDA vira de frente, acena uma vez e, no fim, volta ao 1º quadro do
    // laço e fica parada de novo (antes, com o modelo girado, ela mostrava o quadro-chave de lado ou de costas).
    var stillBack = 0
    var STILL_BACK_MS = 2600
    function playGesture(times, clip, done) {
      // clip/done: outro clipe que não o gesto da página (fala da VIDA) e o retorno no fim dele
      // o aceno já estava tocando antes deste toque (para o BIS, abaixo)
      var jaNoGesto = inGesture
      bis = false
      var prevDone = gestureDone
      gestureDone = done || null
      if (prevDone && prevDone !== gestureDone) prevDone()
      activeGesture = clip || gesture
      if (!activeGesture || typeof mv.play !== 'function') return
      clearTimeout(stillBack)
      if (!clip && !moving && reduced.matches) {
        inGesture = false
        spin(false)
        cancelAnimationFrame(turnRaf)
        if (gestureOrbit) mv.cameraOrbit = gestureOrbit
        if (typeof mv.resetTurntableRotation === 'function') mv.resetTurntableRotation(0)
        if (typeof mv.jumpCameraToGoal === 'function') mv.jumpCameraToGoal()
        still(gesture, 0.9)
        stillBack = setTimeout(function () {
          if (!moving && loopClip) still(loopClip, 0)
        }, STILL_BACK_MS)
        return
      }
      // um quadro parado em preparação (still) não pode pausar o aceno depois
      stillToken++
      stillPending = false
      restoreFade()
      inGesture = true
      holdCamera()
      var n = times || 1
      function go() {
        if (inGesture && mv.animationName === activeGesture) mv.play({ repetitions: n, pingpong: false })
      }
      // O aceno começa JÁ no clique: o play com N repetições vai logo depois da troca do nome (o clipe entra pela
      // mistura no mesmo quadro). A troca ainda dispara o updated() do model-viewer, que põe o clipe em laço infinito
      // (opções padrão) — por isso o play com N repetições é repetido DEPOIS dessa atualização (o relógio segue; só o
      // modo de repetição volta a “uma vez”; senão o aceno não para).
      // O relógio do aceno anterior ficou no fim (clampWhenFinished): sem zerá-lo, o novo “Acenar” só virava a VIDA de
      // frente, sem erguer o braço. Zera ANTES da troca, com o laço ainda na tela (o laço volta ao 1º quadro — quase
      // parado — e a mistura começa dali). O clipe termina no quadro 0 do idle (descida pela frente do corpo).
      if (mv.animationName !== activeGesture) {
        // Pausado: o laço volta a tocar antes da troca, para o aceno entrar pela mistura (com o modelo pausado, a troca
        // para todas as ações e o braço saltaria).
        if (mv.paused) mv.play()
        // 08/10: o relógio global não é mais zerado (o laço que sai pulava para o 1º quadro: a “flicada”); zera só o
        // clipe que entra, ANTES da troca. Sem acesso ao misturador, o comportamento antigo.
        if (!preparaClipe(mv, activeGesture)) mv.currentTime = 0
        mv.animationName = activeGesture
        go()
        ;(mv.updateComplete || Promise.resolve()).then(go)
      } else {
        // 13/10: o clipe pedido já é o atual. Antes: mv.currentTime = 0 → mixer.setTime(0) zerava TODAS as ações e o
        // relógio do misturador (2º “Acenar”: mão saltando 153° num quadro; misturas em curso congeladas).
        // Gesto tocando e ainda longe do fim: o toque não recomeça um aceno que já está acontecendo. Senão (parado no
        // fim, ou fala que recomeça): zera só a ação dele.
        var cur = acaoDe(mv, activeGesture)
        if (!clip && cur && !mv.paused && cur.time < cur.getClip().duration - 0.6) {
          watchGesture()
          return
        }
        // 13/10 (verificação r1): nos últimos 0,6 s do aceno (o braço descendo — o 2º toque mais natural de quem quer ver
        // de novo), zerar a ação com peso 1 derrubava o braço até 121° num quadro. Agora o toque marca um BIS: o aceno
        // recomeça quando o clipe acabar (fimDoGesto), e o fim × o começo do acenar-curto ficam a 4°
        if (!clip && cur && !mv.paused && jaNoGesto) {
          bis = true
          watchGesture()
          return
        }
        if (!preparaClipe(mv, activeGesture)) mv.currentTime = 0
        if (mv.paused) mv.play()
        go()
      }
      watchGesture()
    }
    // Fim do gesto por quadro (rAF): o relógio do clipe a menos de um quadro (1/30 s) do fim. O evento “finished” nem
    // sempre chega (visto com o model-viewer 4.3.1); antes, a espera por temporizador (300–460 ms) deixava a VIDA parada
    // no fim do clipe antes de o laço voltar.
    var gestureWatch = 0
    var GESTURE_END_S = 1 / 30
    function watchGesture() {
      cancelAnimationFrame(gestureWatch)
      gestureWatch = requestAnimationFrame(function tick() {
        gestureWatch = 0
        if (!inGesture) return
        // aceno pausado no meio (“Pausar” durante o gesto): nada a fazer até retomar
        var d = mv.duration || 0
        if (!mv.paused && d && mv.animationName === activeGesture && mv.currentTime >= d - GESTURE_END_S) {
          fimDoGesto()
          return
        }
        gestureWatch = requestAnimationFrame(tick)
      })
    }
    // Fim do gesto: o clipe já termina no quadro 0 do idle (descida pela frente do corpo, a mesma do site); o laço
    // volta com uma mistura curta de 0,25 s (a duração da página, 450 ms, volta logo depois). O relógio do aceno é
    // zerado no próximo gesto.
    var LOOP_BACK_MS = 250
    // 13/10: mistura da próxima volta ao laço (setLoop(nome, ms)): sair dos braços em V da pose em 250 ms era
    // um estalo de 135° no antebraço
    var voltaMs = 0
    // 13/10 (verificação r1): “Acenar” tocado de novo nos últimos 0,6 s do aceno — recomeça no fim do clipe (playGesture)
    var bis = false
    // fim do clipe do gesto: com o BIS, o aceno recomeça daqui (a ação zerada no fim do próprio clipe, que termina no
    // quadro 0 do idle, perto do começo dele: 4°, sem mistura); senão, volta ao laço
    function fimDoGesto() {
      if (bis) {
        bis = false
        if (inGesture && activeGesture === gesture && mv.animationName === gesture && !mv.paused && preparaClipe(mv, gesture)) {
          mv.play({ repetitions: 1, pingpong: false })
          watchGesture()
          return
        }
      }
      toLoop()
    }
    function toLoop() {
      bis = false
      inGesture = false
      cancelAnimationFrame(gestureWatch)
      clearTimeout(stillBack)
      activeGesture = gesture
      if (gestureDone) {
        var gd = gestureDone
        gestureDone = null
        setTimeout(gd, 0)
      }
      if (moving) spin(true)
      if (!loopClip) return
      if (moving) {
        var pageFade = mv.animationCrossfadeDuration
        var ms = voltaMs || LOOP_BACK_MS
        voltaMs = 0
        // 13/10: os gestos e as falas terminam no quadro 0 do idle; o idle, fora de cena, ficou parado na
        // fase em que saiu (3,1 s, 4,5 s…: cabeça até 16° de diferença) — recomeça do 0 quando não está à vista
        var la = acaoDe(mv, loopClip)
        if (la && mv.animationName !== loopClip && la.getEffectiveWeight() < 0.01) preparaClipe(mv, loopClip)
        mv.animationCrossfadeDuration = ms
        mv.animationName = loopClip
        mv.play()
        ;(mv.updateComplete || Promise.resolve()).then(function () {
          requestAnimationFrame(function () {
            if (mv.animationCrossfadeDuration === ms && fadeMs === null) mv.animationCrossfadeDuration = pageFade
          })
        })
      } else still(loopClip, 0)
    }
    mv.addEventListener('finished', function () {
      if (inGesture) fimDoGesto()
    })
    if (gestureBtn) {
      gestureBtn.addEventListener('click', function () {
        playGesture(1)
      })
    }

    // Tamanho na RA (escala fixa, sem pinça para ampliar): lido do próprio modelo depois de carregado, quando o
    // gerador não o gravou na página.
    function showSize() {
      var kind = mv.getAttribute('data-measure')
      if (document.querySelector('[data-size][data-static]')) return
      if (!kind || typeof mv.getDimensions !== 'function') return
      var d = mv.getDimensions()
      if (!d || !d.y) return
      var len = Math.max(d.x, d.z)
      var v = kind === 'altura' ? d.y : len
      var num = v < 1 ? Math.round(v * 100) + ' cm' : v.toFixed(1).replace('.', ',') + ' m'
      var what = kind === 'altura' ? 'de altura' : kind === 'envergadura' ? 'de envergadura' : 'de comprimento'
      var hud = document.querySelector('[data-dim]')
      if (hud) hud.textContent = 'Na RA · ' + num
      var size = document.querySelector('[data-size]')
      var sizeV = size && size.querySelector('[data-size-v]')
      if (size && sizeV) {
        sizeV.textContent = 'cerca de ' + num + ' ' + what
        size.hidden = false
      }
    }

    // Retículo do chão: a elipse (atrás do canvas) acompanha o ponto do chão sob o modelo. Um hotspot invisível
    // do model-viewer marca esse ponto em 3D; a elipse segue a posição dele na tela.
    var stage = mv.closest('.ra-stage')
    var anchor = mv.querySelector('[slot="hotspot-chao"]')
    var floorQueued = false
    function placeFloor() {
      floorQueued = false
      if (!stage || !anchor) return
      var r = anchor.getBoundingClientRect()
      var s = stage.getBoundingClientRect()
      var x = r.left + r.width / 2 - s.left
      var y = r.top + r.height / 2 - s.top
      if (!(x > 0 && x < s.width && y > 0 && y < s.height)) return
      stage.style.setProperty('--fx', x.toFixed(1) + 'px')
      stage.style.setProperty('--fy', y.toFixed(1) + 'px')
      stage.setAttribute('data-floor', '')
    }
    function queueFloor() {
      if (floorQueued) return
      floorQueued = true
      requestAnimationFrame(placeFloor)
    }
    function setupFloor() {
      if (!anchor || typeof mv.getBoundingBoxCenter !== 'function' || typeof mv.updateHotspot !== 'function') return
      var c = mv.getBoundingBoxCenter()
      var d = mv.getDimensions()
      mv.updateHotspot({ name: 'hotspot-chao', position: c.x + 'm ' + (c.y - d.y / 2) + 'm ' + c.z + 'm' })
      // largura da elipse proporcional à pegada do modelo (a VIDA, alta e estreita, pede uma elipse menor)
      var foot = Math.max(d.x, d.z) / Math.max(d.x, d.y, d.z)
      if (stage) stage.style.setProperty('--floor-k', String(Math.min(1, Math.max(0.5, foot))))
      setTimeout(queueFloor, 60)
      setTimeout(queueFloor, 400)
    }
    mv.addEventListener('camera-change', queueFloor)
    window.addEventListener('resize', queueFloor)

    // Câmera no corpo (morcego em voo): a caixa do model-viewer vai até o chão (âncora invisível, para a RA pousar o
    // modelo na superfície), e o centro dela fica abaixo do animal. O alvo sobe em direção ao meio do corpo — topo da
    // caixa menos meia altura do modelo (data-body-h, em metros) — até a fração data-body-k do caminho a partir do
    // chão (1 = no corpo); a sombra e a elipse continuam juntas no chão, sob ele.
    function setupTarget() {
      var bh = parseFloat(mv.getAttribute('data-body-h') || '')
      if (!(bh > 0) || typeof mv.getBoundingBoxCenter !== 'function') return
      var k = parseFloat(mv.getAttribute('data-body-k') || '1')
      var c = mv.getBoundingBoxCenter()
      var d = mv.getDimensions()
      var floor = c.y - d.y / 2
      var body = Math.max(floor + bh / 2, c.y + d.y / 2 - bh / 2)
      var y = floor + (k > 0 && k <= 1 ? k : 1) * (body - floor)
      mv.cameraTarget = c.x.toFixed(3) + 'm ' + y.toFixed(3) + 'm ' + c.z.toFixed(3) + 'm'
      if (typeof mv.jumpCameraToGoal === 'function') mv.jumpCameraToGoal()
    }

    // Enquadramento pela extensão ANIMADA (data-frame = “largura altura profundidade”, em metros, do chão à ponta das
    // asas): alvo no meio da altura e distância que cabe essa caixa no palco com 8% de folga — na vertical e na
    // horizontal (campo de visão do model-viewer e proporção do palco). Refeito quando o palco muda de tamanho.
    var frame = (mv.getAttribute('data-frame') || '').split(' ').map(parseFloat)
    var hasFrame = frame.length === 3 && frame[0] > 0 && frame[1] > 0 && frame[2] >= 0
    function fitFrame(jump) {
      if (!hasFrame || typeof mv.getBoundingBoxCenter !== 'function' || typeof mv.getCameraOrbit !== 'function') return
      var c = mv.getBoundingBoxCenter()
      var d = mv.getDimensions()
      var floor = c.y - d.y / 2
      mv.cameraTarget = c.x.toFixed(3) + 'm ' + (floor + frame[1] / 2).toFixed(3) + 'm ' + c.z.toFixed(3) + 'm'
      var box = mv.getBoundingClientRect()
      var aspect = box.width / Math.max(1, box.height)
      var fov = ((typeof mv.getFieldOfView === 'function' ? mv.getFieldOfView() : 30) * Math.PI) / 180
      var tv = Math.tan(fov / 2)
      var th = tv * aspect
      var r = (Math.max(frame[1] / 2 / tv, frame[0] / 2 / th) + frame[2] / 2) * 1.08
      var o = mv.getCameraOrbit()
      mv.cameraOrbit = ((o.theta * 180) / Math.PI).toFixed(2) + 'deg ' + ((o.phi * 180) / Math.PI).toFixed(2) + 'deg ' + r.toFixed(3) + 'm'
      if (jump && typeof mv.jumpCameraToGoal === 'function') mv.jumpCameraToGoal()
    }
    if (hasFrame) {
      var frameT = 0
      window.addEventListener('resize', function () {
        clearTimeout(frameT)
        frameT = setTimeout(function () {
          fitFrame(false)
        }, 120)
      })
    }

    function setAR(v) {
      body.setAttribute('data-ar', v)
    }

    // O Scene Viewer (Android) volta para a página com este marcador quando não consegue abrir.
    if (/model-viewer-no-ar-fallback/.test(location.hash)) {
      body.setAttribute('data-ar-failed', 'true')
      say(FAIL)
    }

    // Detecção da RA: no Android, o canActivateAR do model-viewer pode virar true tarde (a checagem do Scene Viewer e do
    // WebXR é assíncrona e, numa carga fria, passa dos 3 s). Por isso só o 'yes' (e o visualizador ausente, noViewer)
    // é definitivo: o 'no' é reversível — depois dele a checagem continua a cada 0,5 s por até 15 s e, se a RA ficar
    // disponível, o botão aparece. No toque, a chamada fica em 'checking' (botão visível) por até 6 s antes do 'no'.
    var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    var recheck = 0
    function check() {
      if (decided) return
      // a RA da página (iPhone) só precisa do visualizador: vale mesmo onde o Quick Look não abre (navegador de app)
      if (mv.canActivateAR || mundoHook) {
        decided = true
        clearInterval(recheck)
        setAR('yes')
      }
    }

    if (window.customElements) {
      customElements.whenDefined('model-viewer').then(function () {
        var wait = coarse ? 6000 : 3000
        var t0 = Date.now()
        check()
        // 'checking': confere a cada 250 ms até o prazo (e confere de novo no próprio prazo, antes do 'no')
        recheck = setInterval(function () {
          check()
          if (decided || Date.now() - t0 < wait) return
          clearInterval(recheck)
          setAR('no')
          // 'no' reversível: segue conferindo a cada 0,5 s por até 15 s
          var tNo = Date.now()
          recheck = setInterval(function () {
            check()
            if (decided || Date.now() - tNo > 15000) clearInterval(recheck)
          }, 500)
        }, 250)
      })
    }
    // Visualizador 3D ausente (arquivo do componente bloqueado, sem rede ou com o SRI diferente): o <model-viewer> não
    // é definido. Os módulos rodam em ordem e antes do DOMContentLoaded, então nesse momento já se sabe; o prazo de
    // 12 s fica como garantia. A página mostra o pôster na moldura, esconde os botões e a régua do palco (sem 3D não há
    // o que pausar nem girar) e, no iPhone/iPad e no Android, oferece o link direto para a câmera — AR Quick Look com
    // canonicalWebPageURL ou o intent do Scene Viewer, os mesmos do site (src/components/ArQr.tsx). O botão grande de
    // RA passa a usar esse link.
    var direct = document.querySelector('[data-direct]')
    var errBox = stage && stage.querySelector('.ra-stage__error')
    var viewerOff = false
    function defined() {
      return !!(window.customElements && customElements.get('model-viewer'))
    }
    function platform() {
      if (temQuickLook()) return 'ios'
      if (/Android/i.test(navigator.userAgent)) return 'android'
      return 'other'
    }
    function directHref(p) {
      var page = location.href.split('#')[0]
      if (p === 'ios') {
        var ios = mv.getAttribute('ios-src')
        if (!ios) return null
        var canon = (/canonicalWebPageURL=([^&]+)/.exec(ios) || [])[1]
        return ios.split('#')[0] + '#allowsContentScaling=0&canonicalWebPageURL=' + encodeURIComponent(canon ? decodeURIComponent(canon) : page)
      }
      if (p === 'android' && window.URLSearchParams) {
        var src = mv.getAttribute('src')
        if (!src) return null
        var q = new URLSearchParams({ mode: 'ar_preferred', disable_occlusion: 'true', resizable: 'false', title: (direct && direct.getAttribute('data-title')) || document.title, file: new URL(src, location.href).href })
        return 'intent://arvr.google.com/scene-viewer/1.2?' + q.toString() + '#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=' + encodeURIComponent(page) + ';end;'
      }
      return null
    }
    function measureErr() {
      if (stage && errBox) stage.style.setProperty('--err-h', errBox.offsetHeight + 'px')
    }
    function noViewer() {
      if (viewerOff || defined()) return
      viewerOff = true
      decided = true
      body.setAttribute('data-viewer', 'off')
      body.setAttribute('data-model', 'error')
      var text = stage && stage.querySelector('[data-error-text]')
      var href = direct && directHref(platform())
      if (href) {
        direct.setAttribute('href', href)
        if (platform() === 'ios') direct.setAttribute('rel', 'ar')
        direct.hidden = false
        if (text) text.textContent = 'O visualizador 3D não carregou. Abra direto na câmera:'
        setAR('yes')
      } else {
        // computador: o QR ao lado leva a página para o celular; toque sem RA direta: as dicas logo abaixo
        if (text) text.textContent = window.matchMedia('(pointer: fine)').matches ? 'O visualizador 3D não carregou neste navegador. Tente de novo ou escaneie o QR para abrir no celular.' : 'O visualizador 3D não carregou neste navegador. Tente de novo em instantes.'
        setAR('no')
      }
      measureErr()
      window.addEventListener('resize', measureErr)
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', noViewer)
    else setTimeout(noViewer, 0)
    setTimeout(noViewer, 12000)

    mv.addEventListener('load', function () {
      body.setAttribute('data-model', 'loaded')
      showSize()
      if (hasFrame) fitFrame(true)
      else setupTarget()
      setupFloor()
      check()
      // depois do autoplay do próprio model-viewer (que roda logo após este evento)
      setTimeout(function () {
        // um aceno na chegada (o clipe curto já tem os três movimentos da mão), como a VIDA do site
        if (moving && gesture) playGesture(1)
        else if (!moving) toLoop()
        applyMotion()
      }, 0)
    })
    // Modelo que não carregou (rede, arquivo ausente): “Ver no meu espaço” não tem o que abrir pelo visualizador. No
    // iPhone/iPad e no Android, ele passa a usar o link direto para a câmera (AR Quick Look ou Scene Viewer, que
    // baixam o arquivo de novo), à vista também junto do “Tentar de novo”; no computador e em aparelho sem RA, some.
    var modelOff = false
    mv.addEventListener('error', function () {
      body.setAttribute('data-model', 'error')
      modelOff = true
      decided = true
      clearInterval(recheck)
      var href = direct && directHref(platform())
      if (href) {
        direct.setAttribute('href', href)
        if (platform() === 'ios') direct.setAttribute('rel', 'ar')
        direct.hidden = false
        setAR('yes')
      } else {
        setAR('no')
      }
      measureErr()
      say('Não foi possível carregar o modelo 3D. Verifique a conexão e toque em “Tentar de novo”.')
    })
    mv.addEventListener('progress', function (e) {
      if (bar) bar.style.setProperty('--p', String((e.detail && e.detail.totalProgress) || 0))
    })
    mv.addEventListener('ar-status', function (e) {
      var s = e.detail && e.detail.status
      if (s === 'failed') {
        body.setAttribute('data-ar-failed', 'true')
        say(FAIL)
      } else if (s === 'session-started') {
        say('')
      } else if (s === 'object-placed' && gesture && moving) {
        // na RA (WebXR), a VIDA acena assim que é posicionada — ou, com a voz liberada pelo toque que abriu a RA, se
        // apresenta falando (setupFala)
        if (!(placedHook && placedHook())) playGesture(1)
      } else if (s === 'not-presenting') {
        // 14/10: o aviso do toque ignorado (“Abrindo…”) não fica na página depois da RA
        if (status && status.textContent === 'Abrindo a realidade aumentada…') say('')
        if (arExitHook) arExitHook()
      }
    })

    Array.prototype.forEach.call(launchers, function (btn) {
      btn.addEventListener('click', function (e) {
        if (!defined() || modelOff) {
          // sem o visualizador ou sem o modelo: o link direto (dentro do toque, como o próprio model-viewer faz com o
          // Quick Look)
          if ((viewerOff || modelOff) && direct && !direct.hidden) direct.click()
          else say(viewerOff ? 'Este navegador não abriu a realidade aumentada. Veja as dicas logo abaixo.' : 'Preparando a realidade aumentada. Toque de novo em instantes.')
          return
        }
        // iPhone/iPad (13/10): a RA da própria página, com voz, no lugar do AR Quick Look (que fica no chip “Ver na RA da
        // Apple”). Dentro do toque: “A VIDA no seu mundo” pede o som, o movimento e a câmera no “Começar”
        if (mundoHook && mundoHook(e)) return
        // confere de novo antes de dizer que a RA não abre (a detecção pode ter terminado depois da última checagem)
        check()
        // 14/10 (verificação): a RA já está abrindo (ou aberta) — o 2º toque não pede outra sessão (abrirRA) nem chega ao
        // setupFala (que calaria a fala e liberaria a voz de novo)
        if (mv.canActivateAR && raOcupada(mv)) {
          e.stopImmediatePropagation()
          if (raAbrindo(mv)) say('Abrindo a realidade aumentada…')
          return
        }
        if (mv.canActivateAR) {
          // chamada direta, dentro do toque: o navegador exige o gesto para abrir a câmera
          var p = abrirRA(mv)
          if (p && p.catch) {
            p.catch(function () {
              say(FAIL)
            })
          }
        } else if (body.getAttribute('data-ar') === 'checking') {
          // detecção ainda em curso (toque nos primeiros segundos): não afirma que a RA não abre
          say('Preparando a realidade aumentada. Toque de novo em instantes.')
        } else {
          setAR('no')
          say('Este navegador não abriu a realidade aumentada. Veja as dicas logo abaixo.')
        }
      })
    })

    // “Pausar” só pausa o clipe atual (sem trocar de clipe: nada de pose T); “Retomar” volta ao laço com mistura
    // suave quando o clipe parado é outro (o gesto, pausado no meio ou mostrado parado pelo “Acenar”).
    function applyMotion() {
      var hasAnim = mv.availableAnimations && mv.availableAnimations.length && typeof mv.play === 'function'
      if (moving) {
        clearTimeout(stillBack)
        // com o gesto tocando, o giro volta só no fim dele (toLoop)
        if (!(inGesture && !mv.paused)) spin(true)
        if (!hasAnim) return syncMotionUi()
        stillToken++
        stillPending = false
        if (fadeMs !== null) {
          mv.animationCrossfadeDuration = fadeMs
          fadeMs = null
        }
        if (loopClip && mv.animationName !== loopClip && !(inGesture && !mv.paused)) toLoop()
        else if (!inGesture || mv.paused) mv.play()
      } else {
        spin(false)
        // um quadro parado em preparação (still) pausa sozinho depois de aplicar o clipe
        if (!stillPending && typeof mv.pause === 'function') mv.pause()
      }
      syncMotionUi()
    }
    function syncMotionUi() {
      if (motion) {
        motion.setAttribute('data-state', moving ? 'playing' : 'paused')
        if (motionLabel) motionLabel.textContent = moving ? 'Pausar movimento' : 'Retomar movimento'
      }
    }

    // movimento reduzido: começa parado (sem giro automático; a animação fica num quadro fixo depois do carregamento)
    if (!moving) spin(false)
    if (motion) {
      motion.setAttribute('data-state', moving ? 'playing' : 'paused')
      if (motionLabel) motionLabel.textContent = moving ? 'Pausar movimento' : 'Retomar movimento'
      motion.addEventListener('click', function () {
        moving = !moving
        applyMotion()
      })
    }
    if (reduced.addEventListener) {
      reduced.addEventListener('change', function () {
        if (reduced.matches && moving) {
          moving = false
          applyMotion()
        }
      })
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-reload]'), function (b) {
      b.addEventListener('click', function () {
        location.reload()
      })
    })
    if (mv.hasAttribute('data-fala')) {
      setupFala(mv, {
        playGesture: playGesture,
        toLoop: toLoop,
        // 13/10 (verificação r2): volta ao laço SEM mistura (1 ms) — para quando a página não está à vista (o 📸 e a saída
        // da RA). Com a mistura normal, o palco ficava preso na fala (o 📸 no meio do “Olá”: a página não desenha nenhum
        // quadro até o mundo cobri-la) e, na RA seguinte, o “Olá” recomeçava o MESMO clipe do 0 com peso 1 (mão 126°)
        toLoopJa: function () {
          voltaMs = 1
          toLoop()
          if (moving && loopClip && mv.animationName === loopClip) soClipe(mv, loopClip)
        },
        // a ação do clipe “clip” quando ele é o atual do gesto, tocando e com peso (a fala que ainda termina o gesto); senão null
        acaoAtual: function (clip) {
          if (!inGesture || mv.paused || mv.animationName !== clip) return null
          var a = acaoDe(mv, clip)
          return a && a.getEffectiveWeight() >= 0.5 ? a : null
        },
        moving: function () {
          return moving
        },
        inAR: function () {
          return /session-started|object-placed/.test(mv.getAttribute('ar-status') || '')
        },
        // 13/10: ms = duração da mistura quando a troca acontecer. Chamado DURANTE um gesto, só marca o laço
        // seguinte (o toLoop do fim do gesto vai direto a ele, sem passar pelo idle)
        setLoop: function (name, ms) {
          loopClip = name || origLoop
          voltaMs = ms || 0
          if (!inGesture) toLoop()
        },
        onPlaced: function (fn) {
          placedHook = fn
        },
        onARExit: function (fn) {
          arExitHook = fn
        },
        // 13/10: fn(evento do toque) → true quando abriu “A VIDA no seu mundo” (iPhone); a RA passa a contar como disponível
        onMundo: function (fn) {
          mundoHook = fn
          check()
        },
        // o endereço do AR Quick Look (o .usdz com allowsContentScaling=0 e canonicalWebPageURL), para o chip do iPhone
        linkQuickLook: function () {
          return directHref('ios')
        },
      })
    }
  }

  // ------------------------------------------------------------------ VIDA falante e modo foto (07/10/2026)
  // data-fala no <model-viewer>: { falas: { ola|vem|contagem|ficou: { src, clip, dur, texto } }, pose, xis }.
  // Uma só voz (<audio>) para todas as falas: o 1º play acontece dentro de um toque (o navegador só libera som assim)
  // e as falas seguintes reaproveitam o mesmo elemento. A boca anda pelo clipe; o clipe segue o relógio do áudio pela
  // VELOCIDADE da ação, nunca pelo tempo (13/10). Movimento reduzido: só a voz e a legenda, sem animar.
  function setupFala(mv, api) {
    var cfg
    try {
      cfg = JSON.parse(mv.getAttribute('data-fala') || 'null')
    } catch (e) {
      cfg = null
    }
    if (!cfg || !cfg.falas) return
    var F = cfg.falas
    // iPhone/iPad (AR Quick Look): mostra o aviso de como fazê-la falar lá dentro
    if (temQuickLook()) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-ios-only]'), function (el) {
        el.hidden = false
      })
    }
    var voice = new Audio()
    voice.preload = 'auto'
    voice.setAttribute('playsinline', '')
    // 13/10 (verificação r2): a voz solta (soltaVoz, sem src) não volta a “tocar”: o iOS retoma o áudio no fim de uma
    // interrupção com um play(), e o elemento sem fonte ficava “tocando” mudo (paused = false, à espera de uma fonte)
    voice.addEventListener('play', function () {
      if (!voice.getAttribute('src')) voice.pause()
    })
    var primed = false
    // 13/10: legenda no palco e na tela “A VIDA no seu mundo” (as duas recebem cada fala)
    var legendas = document.querySelectorAll('[data-legenda]')
    var arMsg = mv.querySelector('[data-arui-msg]')
    var falaBtns = document.querySelectorAll('[data-fala-play]')
    var speaking = null
    var syncRaf = 0

    // ficha da liberação: uma fala que começa depois dela a invalida (09/10 — no 1º toque em “Ouvir”, o play mudo
    // terminava DEPOIS de a fala começar no mesmo <audio> e a pausa dele cortava a fala: a VIDA ficava muda no iPhone)
    var primeTok = 0
    // 13/10: o <audio> do iPhone já toca com a chave de silencioso ligada (WebKit, bug 252746); declarar a sessão de
    // áudio da página como 'playback' (Safari 16.4+, https://w3c.github.io/audio-session/) deixa isso explícito e protege
    // de um AudioContext futuro, que poria a página inteira em “ambient” (mudo no silencioso)
    function sessaoPlayback() {
      try {
        if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'
      } catch (e) {}
    }
    function prime() {
      sessaoPlayback()
      // dentro de um toque: um play mudo libera a voz para as falas que vêm depois (RA, sequência da foto)
      if (primed || speaking) return
      primed = true
      var tok = ++primeTok
      try {
        voice.src = F.ola.src
        voice.muted = true
        var p = voice.play()
        if (p && p.then) {
          p.then(function () {
            if (tok === primeTok && !speaking) {
              voice.pause()
              voice.currentTime = 0
            }
            voice.muted = false
          }).catch(function () {
            voice.muted = false
            if (tok === primeTok) primed = false
          })
        }
      } catch (e) {
        voice.muted = false
        primed = false
      }
    }

    function caption(txt) {
      Array.prototype.forEach.call(legendas, function (l) {
        l.textContent = txt || ''
      })
      if (arMsg && api.inAR()) arMsg.textContent = txt || ''
    }

    function stop() {
      cancelAnimationFrame(syncRaf)
      if (speaking) {
        var s = speaking
        speaking = null
        s.cancelled = true
        try {
          voice.pause()
        } catch (e) {}
        s.finish()
      }
      caption('')
      setPlaying(false)
    }

    function setPlaying(on) {
      Array.prototype.forEach.call(falaBtns, function (b) {
        b.setAttribute('data-state', on ? 'playing' : 'idle')
      })
    }

    // fala: voz + clipe no visualizador (main = o do palco, pelo playGesture; ou um tocador de clipes — modo foto)
    // 13/10 (verificação r2): a voz pedida que não começa a soar em VOZ_ESPERA_MS (o MP3 preso na rede SEM erro: o play()
    // fica pendente e o relógio do áudio parado em 0) segue pelo relógio do arquivo, como o play recusado — legenda,
    // contagem 3-2-1 e foto pelo tempo da fala. Antes nada encerrava a fala: a VIDA ficava parada no 1º quadro com a
    // legenda e, na contagem, a foto nunca saía (só o X tirava a pessoa dali). A voz que chegar depois disso é solta
    var VOZ_ESPERA_MS = 3000
    // 13/10 (verificação r2): a MESMA fala pedida de novo logo que a voz dela acaba (“Ouvir” no fim do “Olá”, no palco e na
    // RA): o clipe ainda termina o gesto (no fim da voz o braço está a 110° do começo; 0,2 s depois, a ≤ 2,3° — medido no
    // GLB, correcao_r2/clipes_rabo.txt) e recomeçá-lo ali zerava a ação com peso 1: a mão caía 87–95° num quadro. A fala
    // nova espera o clipe passar RABO_S do fim da voz (no máximo ~0,55 s) e só então começa, voz e clipe juntos
    var RABO_S = 0.25
    var LACO = mv.getAttribute('data-loop') || 'idle'
    // duração da voz de cada clipe de fala (o rabo do clipe começa aí)
    var DUR_VOZ = {}
    Object.keys(F).forEach(function (k) {
      if (F[k].clip) DUR_VOZ[F[k].clip] = F[k].dur || 0
    })
    // nada pode retomar a voz: o iOS retoma o áudio no fim de uma interrupção (ligação, Siri) e um MP3 preso pode chegar
    // depois. A próxima fala põe o src de novo
    function soltaVoz() {
      voice.onended = null
      voice.onerror = null
      voice.onpause = null
      voice.onplaying = null
      try {
        voice.pause()
      } catch (e) {}
      try {
        voice.removeAttribute('src')
        voice.load()
      } catch (e) {}
    }
    function speak(key, player, onCue) {
      var f = F[key]
      if (!f) return Promise.resolve()
      stop()
      return new Promise(function (resolve) {
        var s = { key: key, voiceDone: false, clipDone: false, cancelled: false }
        var done = false
        var vigia = 0
        var viewer = null
        s.finish = function () {
          if (done) return
          done = true
          clearTimeout(vigia)
          cancelAnimationFrame(syncRaf)
          var fa = viewer && acaoDe(viewer, f.clip)
          if (fa) fa.timeScale = 1
          if (speaking === s) speaking = null
          setPlaying(false)
          setTimeout(function () {
            if (!speaking) caption('')
          }, 400)
          resolve(!s.cancelled)
        }
        speaking = s
        primeTok++
        setPlaying(true)
        caption(f.texto)
        function check() {
          if (s.voiceDone && s.clipDone) s.finish()
        }
        // voz acabou: o clipe ainda termina o gesto (é ~1 s mais longo), mas não se espera por ele para sempre —
        // fora da tela o model-viewer CONGELA a animação, e a fala ficava “tocando” sem som (09/10: o 2º “Ouvir”
        // depois do botão de RA do topo só calava a fala presa — a VIDA ficava muda no iPhone)
        function vozAcabou() {
          s.voiceDone = true
          check()
          if (s.clipDone) return
          var act = viewer && acaoDe(viewer, f.clip)
          var resto = act ? Math.max(0, act.getClip().duration - act.time) + 1 : 1.5
          setTimeout(function () {
            if (speaking === s && !s.clipDone) {
              s.clipDone = true
              check()
            }
          }, resto * 1000)
        }
        // sem som (o navegador recusou o play, ou a voz não começou em VOZ_ESPERA_MS): a fala segue só com a legenda e o
        // tempo do arquivo (relógio reserva)
        function semVoz() {
          if (s.fake || speaking !== s) return
          s.fake = performance.now()
          s.voiceDone = false
          setTimeout(vozAcabou, (f.dur || 3) * 1000)
        }
        // modelo ainda não carregado (ou com erro): só a voz e a legenda — sem clipe não há quem avise o fim. 13/10
        // (verificação r1): o tocador de “A VIDA no seu mundo” (semPalco) anima a fala mesmo com o movimento do palco
        // parado (Reduzir movimento do iPhone, ou “Pausar movimento”): lá ela falava de boca parada e sem gestos
        var animate = (api.moving() || (player && player.semPalco)) && player && !(player.viewer && player.viewer.loaded === false)
        var rabo = animate && player.acaoAtual ? player.acaoAtual(f.clip) : null
        if (rabo && rabo.time > f.dur - 0.3 && rabo.time < f.dur + RABO_S) {
          var limite = performance.now() + (f.dur + RABO_S - rabo.time + 0.4) * 1000
          ;(function espera() {
            if (speaking !== s) return
            var a = player.acaoAtual(f.clip)
            if (a && a.time < f.dur + RABO_S && performance.now() < limite) {
              syncRaf = requestAnimationFrame(espera)
              return
            }
            comeca()
          })()
        } else comeca()

        function comeca() {
          voice.onended = vozAcabou
          voice.onerror = vozAcabou
          voice.onpause = null
          voice.onplaying = function () {
            if (speaking === s) s.soou = true
          }
          voice.muted = false
          voice.src = f.src
          try {
            voice.currentTime = 0
          } catch (e) {}
          var vp = voice.play()
          if (vp && vp.then) {
            vp.then(function () {
              if (speaking !== s || s.fake) return
              // pausa vinda de fora (o iOS pausa o áudio da página ao abrir o Quick Look, ligação, troca de app): encerra
              // a fala em vez de deixá-la presa. Só depois do play — a troca de src pode enfileirar um “pause” antigo.
              // 13/10 (verificação r2): e a VIDA volta ao laço (o clipe seguia até o fim de boca mexendo, sem som e sem
              // legenda) e a voz é solta (o iOS RETOMA o áudio no fim da interrupção: a voz voltava sozinha, fora de hora)
              voice.onpause = function () {
                if (speaking === s && !s.cancelled && voice.paused && !voice.ended) {
                  soltaVoz()
                  if (viewer && player.laco) player.laco()
                  s.voiceDone = true
                  s.clipDone = true
                  check()
                }
              }
            }, semVoz)
          }
          vigia = setTimeout(function () {
            if (speaking !== s || s.fake || s.soou || voice.currentTime > 0) return
            soltaVoz()
            semVoz()
          }, VOZ_ESPERA_MS)
          if (animate) {
            // 13/10 (verificação r2): a fala entra com 160 ms (mais que isso amortece o começo dela), mas com 300 ms quando
            // a ação que sai ainda gesticula com peso — outra fala antes do fim da voz dela + RABO_S, ou um gesto longe do
            // fim: com 160 ms o braço estendido varria 22–44° por quadro (“Tirar a foto” no fim do “Olá”)
            var vv = player.viewer
            var sai = vv && vv.animationName
            if (sai && sai !== f.clip && sai !== LACO && sai !== cfg.pose && !player.nextFade) {
              var sa = acaoDe(vv, sai)
              var fimG = DUR_VOZ[sai] != null ? DUR_VOZ[sai] + RABO_S : sa ? sa.getClip().duration - 0.3 : 0
              if (sa && sa.getEffectiveWeight() >= 0.5 && sa.time < fimG) player.nextFade = 300
            }
            player.play(f.clip, function () {
              s.clipDone = true
              check()
            })
          } else s.clipDone = true
          viewer = animate ? player.viewer : null
          if (viewer) marcaDesenho(viewer)
          var lastCue = -1
          ;(function tick(rafT) {
            syncRaf = requestAnimationFrame(tick)
            var rafAnt = s.ultRaf
            if (rafT && s.ultRaf) s.intervalo = (s.intervalo || 1 / 60) * 0.8 + 0.2 * Math.max(0.008, Math.min(0.1, (rafT - s.ultRaf) / 1000))
            if (rafT) s.ultRaf = rafT
            if (speaking !== s) return
            // só com a voz tocando de fato: terminada a voz (o clipe é mais longo — a VIDA ainda baixa o braço), o clipe
            // segue sozinho até o fim (antes, o relógio do áudio parado no fim puxava o clipe de volta para sempre)
            var playing = !voice.paused && !voice.ended
            var t = playing ? voice.currentTime : -1
            if (s.fake) {
              t = (performance.now() - s.fake) / 1000
              playing = t < (f.dur || 3)
              if (!playing) t = f.dur || 3
            }
            if (viewer && viewer.animationName === f.clip && !viewer.paused) {
              // 13/10: a sincronia NUNCA mexe no tempo da ação (act.time = t puxava o clipe 0,08–0,09 s: no fim
              // da voz, com o relógio do áudio parado em 3,56 s antes do “ended”, a mão saltava 44° e os dedos 79° num
              // quadro; no começo, com a voz ainda carregando, o clipe ia e voltava a cada 5 quadros). Agora:
              //  - voz pedida mas ainda muda (relógio em 0): o clipe espera parado (a mistura de entrada segue);
              //  - voz soando: a velocidade da ação corrige a diferença aos poucos (±15 %), sem salto;
              //  - voz no fim, parada ou acabada / sem som (relógio reserva): o clipe segue sozinho em 1×.
              var act = acaoDe(viewer, f.clip)
              if (act) {
                var dur = f.dur || act.getClip().duration
                var vtNow = voice.currentTime
                // relógio do áudio parado: 1 quadro é normal (o currentTime nem sempre anda a cada quadro); 4 ou mais
                // (~65 ms) = voz engasgada carregando → o clipe espera
                s.paradas = vtNow === s.lastVt ? (s.paradas || 0) + 1 : 0
                s.lastVt = vtNow
                // 13/10 (verificação r2): o erro que importa é o do PRÓXIMO DESENHO. O tempo da ação é o do último desenho
                // (o misturador anda no desenho, com o dt entre os carimbos de rAF) e o da voz é o de agora. Dois casos:
                //  - o desenho deste quadro JÁ aconteceu (antes deste rAF): o próximo recebe o atraso deste quadro + um
                //    intervalo — dEf = (ação − voz) + atraso (a conta da r1);
                //  - o desenho deste quadro AINDA vem (na RA o model-viewer desenha depois deste rAF): ele recebe o dt deste
                //    quadro e a voz quase não anda até lá — dEf = (ação − voz) + dt. Antes valia a conta da r1 aqui também, e
                //    na RA o clipe ficava um quadro à frente (+0,022 s em média; 0,041 s no começo do “Olá”).
                // Qual dos dois: a hora do último desenho (onBeforeRender da cena, marcaDesenho) × o carimbo deste rAF
                var agora = performance.now()
                var atraso = rafT ? Math.max(0, (agora - rafT) / 1000) : 0
                var iv = s.intervalo || 1 / 60
                var ud = viewer.__desenhoEm
                var vem = !!(rafT && rafAnt && ud && ud < rafT)
                var dq = vem ? Math.max(0.004, Math.min(0.25, (rafT - rafAnt) / 1000)) : 0
                var dEf = act.time - t + (vem ? dq : atraso)
                var prox = vem ? dq : atraso + iv
                if (s.fake || !playing || t >= dur - 0.15) act.timeScale = 1
                else if (!(t > 0) || s.paradas >= 4) act.timeScale = 0
                // 13/10 (verificação r1): no começo da fala o relógio do áudio anda aos saltos (0,007 → 0,021 parado 3 quadros
                // → 0,028): com o clipe seguindo em 1×, ele chegava 0,043 s à frente. Nos primeiros 0,25 s, relógio parado e
                // clipe já 0,02 s à frente: o clipe espera (a mistura de entrada ainda está em curso; parado, não salta)
                else if (s.paradas && t < 0.25 && dEf > 0.02) act.timeScale = 0
                else if (s.paradas) act.timeScale = act.timeScale || 1
                // 13/10 (verificação r1): pausa da página (a prévia da foto, a captura no Xis). O model-viewer aplica ao
                // misturador o dt entre os rAF: depois de uma pausa, ou o desenho já veio com ela inteira (o clipe, parado
                // com a voz muda, fica para trás: 0,078 s no “ficou”, 12 quadros com a correção de 15 %), ou o rAF deste
                // quadro é de ANTES da pausa e o próximo desenho é que recebe tudo de uma vez (o clipe passava 0,09 s à
                // frente). Com erro > 0,03 s ou com este quadro atrasado (> 30 ms entre o rAF e agora): a velocidade é a que
                // leva o clipe ao tempo da voz no PRÓXIMO desenho (0 a 3×). Nunca act.time = t. Em dia, dEf ≈ 0 e a conta
                // dá 1× — sem efeito fora das pausas.
                // 13/10 (verificação r2): valia só no começo da fala (< 0,35 s); no MEIO, depois de uma pausa de 300–500 ms,
                // a correção de ±15 % deixava o clipe 0,057–0,099 s à frente por 344–630 ms. Agora vale a fala inteira, a
                // partir de 0,03 s (era 0,04)
                else if (Math.abs(dEf) > 0.03 || atraso > 0.03) act.timeScale = Math.max(0, Math.min(3, 1 - dEf / prox))
                else act.timeScale = Math.abs(dEf) < 0.015 ? 1 : Math.max(0.85, Math.min(1.15, 1 - dEf * 3))
              }
            }
            if (onCue) lastCue = onCue(playing || s.fake ? t : voice.ended ? f.dur || 99 : -1, lastCue)
          })()
        }
      })
    }

    // tocador do visualizador do palco: usa o gesto genérico (vira de frente, para o giro, volta ao laço no fim)
    var mainPlayer = {
      viewer: mv,
      // mistura da próxima fala, pedida pela speak (13/10, verificação r2: 300 ms sobre um gesto em curso)
      nextFade: 0,
      play: function (clip, done) {
        // mistura curta na entrada da fala: com os 450 ms da página, o “Olá” saía com a boca amortecida pelo laço
        var fade = mv.animationCrossfadeDuration
        var ms = mainPlayer.nextFade || 160
        mainPlayer.nextFade = 0
        mv.animationCrossfadeDuration = ms
        api.playGesture(1, clip, done)
        setTimeout(function () {
          if (mv.animationCrossfadeDuration === ms) mv.animationCrossfadeDuration = fade
        }, 400)
      },
      // 13/10 (verificação r2): a ação do clipe quando ele é o atual da fala (a speak espera o rabo dele antes de recomeçá-lo)
      acaoAtual: function (clip) {
        return api.acaoAtual(clip)
      },
      // pausa vinda de fora: de volta ao laço (com a mistura da página)
      laco: function () {
        api.toLoop()
      },
    }

    var falaToqueEm = 0
    Array.prototype.forEach.call(falaBtns, function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation()
        prime()
        // o botão do texto de abertura leva até a VIDA (fora da tela o visualizador congela a animação)
        if (b.hasAttribute('data-fala-scroll')) {
          var st = mv.closest('.ra-stage')
          if (st && st.scrollIntoView) st.scrollIntoView({ behavior: reducedPref() ? 'auto' : 'smooth', block: 'center' })
        }
        // 13/10 (verificação r1): toque duplo (o 2º a menos de 600 ms) não começa e já cala a fala
        var agora = performance.now()
        if (agora - falaToqueEm < 600) return
        falaToqueEm = agora
        // 2º toque cala — mas só se a voz estiver soando de fato; uma fala que ficou presa recomeça (speak para a anterior)
        if (speaking && speaking.key === 'ola' && !speaking.voiceDone && !voice.paused && !voice.ended) {
          stop()
          api.toLoop()
          return
        }
        speak('ola', mainPlayer).then(function (ok) {
          if (ok) hintFoto()
        })
      })
    })
    // a pausa do movimento cala a VIDA
    var motionBtn = document.querySelector('[data-motion]')
    if (motionBtn) motionBtn.addEventListener('click', function () {
      if (speaking && !api.moving()) stop()
    })
    // o toque que abre a RA também libera a voz: na RA (WebXR) ela se apresenta assim que é posicionada.
    // No iPhone o toque abre “A VIDA no seu mundo” (13/10), que libera a voz sozinha; se cair no Quick Look (visualizador
    // ou modelo que não carregou), a voz de lá vem de DENTRO do USDZ — tocar áudio na página no mesmo toque só disputa a
    // saída de som com o Quick Look, e uma fala da página que continuasse por baixo pareceria a VIDA falando (09/10)
    Array.prototype.forEach.call(document.querySelectorAll('[data-ar-launch]'), function (b) {
      b.addEventListener('click', function () {
        if (temQuickLook()) {
          if (speaking) stop()
          return
        }
        // 13/10 (verificação r2): a fala do palco em curso cala ao abrir a RA e a VIDA volta ao laço (com a mistura da
        // página, ainda à vista) — no object-placed o “Olá” da RA pedia o MESMO clipe no meio dele, e recomeçá-lo zerava
        // a ação com peso 1
        if (speaking) {
          stop()
          api.toLoop()
        }
        prime()
      })
    })
    api.onPlaced(function () {
      // 14/10: a RA aberta pelo “Tirar uma foto com a VIDA” da página (Android): já começa a sequência da foto
      if (fotoAoEntrar) {
        fotoNaEntrada()
        return true
      }
      if (!primed) return false
      speak('ola', mainPlayer)
      return true
    })
    // a RA chegou a abrir (session-started/object-placed): só então a saída dela volta ao laço sem mistura
    var raAberta = false
    mv.addEventListener('ar-status', function (e) {
      var st = (e.detail && e.detail.status) || ''
      if (/session-started|object-placed/.test(st)) raAberta = true
      // (com movimento reduzido o setupViewer não chama o onPlaced: a foto pedida na entrada começa aqui)
      if (st === 'object-placed' && fotoAoEntrar) fotoNaEntrada()
      if (st === 'failed') fotoAoEntrar = false
    })
    api.onARExit(function () {
      stop()
      // 13/10 (verificação r2): a fala, o gesto ou a pose em curso na RA voltam ao laço SEM mistura — a página reaparece
      // e o model-viewer aplica a RA inteira como um único dt no 1º quadro dela (+10,8 s a +52 s no relógio do misturador:
      // a fala em curso pulava para o fim, 127,6°). No laço, o pulo só muda a fase do idle
      cancelAR(raAberta)
      if (raAberta) api.toLoopJa()
      raAberta = false
      fotoAoEntrar = false
      // 14/10: a marca do chão, a contagem e as instruções somem; o botão volta a “Tirar a foto”
      marca.esconder(true)
      faseRA('')
      dicaRA('')
      if (arConta) arConta.textContent = ''
      if (fotoArRot) fotoArRot.textContent = 'Tirar a foto'
      botoesFoto(false)
      if (arFoto) arFoto.hidden = true
      if (arFlash) arFlash.classList.remove('is-on')
      // 14/10: o “Compartilhar” tirou a pessoa da RA (a RA fechou até 20 s depois do toque nele) ou não abriu dentro dela:
      // a foto aparece na própria página
      if (((compartilhouEm && performance.now() - compartilhouEm < 20000) || previaAoSair) && arFotoArq) mostrarPrevia()
      compartilhouEm = 0
      previaAoSair = false
    })

    function reducedPref() {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    function hintFoto() {
      var b = document.querySelector('[data-foto-open]')
      if (!b) return
      b.classList.add('is-hint')
      setTimeout(function () {
        b.classList.remove('is-hint')
      }, 4000)
    }

    // ---------------- foto na RA (WebXR). 14/10 (retorno do dono: “tudo na mesma aba de realidade aumentada”; a tela
    // separada da câmera saía “toda bugada, sem track”): a foto acontece INTEIRA dentro da RA. “Tirar a foto”: ela chama
    // (“Oba! Vem aqui pro meu ladinho!”) e aparece no CHÃO, ao lado dela, a marca TRACEJADA “Fique aqui” (criarMarcaLado,
    // presa à VIDA); espera; conta 3-2-1 nos dedos com os números grandes na tela; no Xis a marca some e a foto sai sem sair
    // da RA (imagem da câmera + a VIDA do mesmo quadro + assinatura, com flash: criarFotoRA, 'camera-access' pedido por
    // padrão), baixa direto (pasta Download, que a Galeria mostra) e aparece em miniatura com “Compartilhar”; o botão vira
    // “Tirar outra”; ela diz “Ficou demais! Obrigada!”. Sem a câmera na sessão (recusada, sem suporte, auto-cura, ?camacc=0):
    // a mesma sequência e, no Xis, “Agora tire um print (botões de ligar + volume)”. Nada abre outra tela.
    var arRun = 0
    // ja: a volta ao laço (se não houver gesto em curso) sem mistura — a página não está à vista (13/10, verificação r2)
    function cancelAR(ja) {
      arRun++
      api.setLoop(null, ja ? 1 : 0)
    }
    var fra = criarFotoRA(mv)
    var marca = criarMarcaLado(mv, fra.interno)
    // a marca nasce quando a RA abre (antes de a VIDA pousar e falar): o quadro pesado da criação fica onde não se vê
    mv.addEventListener('ar-status', function (e) {
      if (!(e.detail && e.detail.status === 'session-started')) return
      setTimeout(function () {
        if (api.inAR()) marca.preparar()
      }, 60)
    })
    // para os testes (scripts/ra-foto-ra.mjs)
    fra.marca = marca
    mv.__fotoRA = fra
    var mundo = null
    var aruiBox = mv.querySelector('[data-arui]')
    var fotoAr = mv.querySelector('[data-foto-ar]')
    var fotoArRot = mv.querySelector('[data-foto-ar-rotulo]')
    var ouvirAr = mv.querySelector('.ra-arui [data-fala-play]')
    var arFoto = mv.querySelector('[data-arui-foto]')
    var arFlash = mv.querySelector('[data-arui-flash]')
    var arConta = mv.querySelector('[data-arui-conta]')
    var arDica = mv.querySelector('[data-arui-dica]')
    var arFotoArq = null
    var arFotoUrl = null
    var arFotoNome = ''
    // a RA aberta pelo “Tirar uma foto com a VIDA” da página: a sequência começa quando ela pousa no chão
    var fotoAoEntrar = false
    // o “Compartilhar” de dentro da RA: quando foi tocado (a RA que fechar logo depois mostra a foto na página)
    var compartilhouEm = 0
    var previaAoSair = false
    var PRINT_RA = 'Agora tire um print (botões de ligar + volume)'
    // sem a câmera na RA: o aviso do print vem já na contagem — no Xis ele fica só 1,5 s (senão saía no próprio print)
    var PRINT_ANTES = 'No “Xis!”, tire um print (botões de ligar + volume)'
    var MSG_LADO = 'Fique no tracejado, ao lado da VIDA'
    var MSG_TRAS = 'Dê uns passos para trás para ver o tracejado ao lado da VIDA'
    function faseRA(f) {
      if (aruiBox) aruiBox.setAttribute('data-fase', f || '')
      // no print, o X da RA (do model-viewer) também sai da frente (CSS: model-viewer[data-ra-print]::part(…))
      if (f === 'print') mv.setAttribute('data-ra-print', '')
      else mv.removeAttribute('data-ra-print')
    }
    function dicaRA(t) {
      if (arDica && arDica.textContent !== (t || '')) arDica.textContent = t || ''
    }
    function botoesFoto(ocupado) {
      if (fotoAr) fotoAr.disabled = ocupado
      // durante a sequência, “Ouvir” cortaria a fala dela no meio da contagem
      if (ouvirAr) ouvirAr.disabled = ocupado
    }
    function doisQuadrosRA() {
      return new Promise(function (res) {
        var t = setTimeout(res, 250)
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            clearTimeout(t)
            res()
          })
        })
      })
    }
    // a foto de dentro da RA: flash, imagem da câmera + a VIDA do mesmo quadro, download, miniatura (já decodificada: a
    // prévia não trava o começo do “Ficou demais!” — 13/10, verificação r1)
    function tirarNaRA() {
      if (arFlash) arFlash.classList.add('is-on')
      function apaga() {
        requestAnimationFrame(function () {
          if (arFlash) arFlash.classList.remove('is-on')
        })
      }
      return fra.capturar().then(function (r) {
        apaga()
        var nome = fra.salvar(r.blob)
        arFotoArq = null
        try {
          arFotoArq = new File([r.blob], nome, { type: 'image/jpeg' })
        } catch (e) {}
        if (arFotoUrl) URL.revokeObjectURL(arFotoUrl)
        arFotoUrl = URL.createObjectURL(r.blob)
        arFotoNome = nome
        // o botão já diz “Tirar outra” junto com a miniatura (antes só no fim da contagem, ~1–2 s depois dela)
        if (fotoArRot) fotoArRot.textContent = 'Tirar outra'
        if (!arFoto) return r
        var sh = arFoto.querySelector('[data-arui-foto-share]')
        if (sh) sh.hidden = !(arFotoArq && navigator.canShare && navigator.canShare({ files: [arFotoArq] }))
        var im = arFoto.querySelector('[data-arui-foto-img]')
        if (!im) {
          arFoto.hidden = false
          return r
        }
        im.src = arFotoUrl
        var dec = im.decode ? im.decode().catch(function () {}) : Promise.resolve()
        return dec.then(function () {
          if (api.inAR()) arFoto.hidden = false
          return r
        })
      }, function (e) {
        apaga()
        throw e
      })
    }
    // “Compartilhar” dentro da RA: o menu do Android, com o arquivo. Se ele não abrir por cima da RA (recusa que não é a
    // pessoa cancelando) ou se a RA fechar com ele, a foto aparece na própria página com “Compartilhar” e “Salvar”
    var arFotoShare = arFoto && arFoto.querySelector('[data-arui-foto-share]')
    // 14/10 (verificação): toque duplo em “Compartilhar” — o 2º chegava antes de o menu do Android cobrir a tela e o
    // navegador o recusava (InvalidStateError: “an earlier share has not yet completed”, como manda o Web Share); a
    // recusa era lida como “o menu não abre na RA” e a RA fechava com o menu ainda aberto. Agora: um menu por vez (o
    // botão fica preso até o 1º terminar, no máximo 8 s) e InvalidStateError nunca tira a pessoa da RA
    var compartilhando = false
    if (arFotoShare) {
      arFotoShare.addEventListener('click', function (e) {
        e.stopPropagation()
        if (!arFotoArq || !navigator.share) return
        if (compartilhando && performance.now() - compartilhouEm < 8000) return
        compartilhando = true
        compartilhouEm = performance.now()
        var p
        try {
          p = navigator.share({ files: [arFotoArq], title: 'Eu e a VIDA', text: 'Foto com a VIDA · Expedição Parques GO' })
        } catch (err) {
          p = Promise.reject(err)
        }
        Promise.resolve(p).then(function () {
          compartilhando = false
          compartilhouEm = 0
        }, function (err) {
          compartilhando = false
          // a pessoa fechou o menu: nada a fazer
          if (err && err.name === 'AbortError') return
          // outro menu ainda aberto (ou o documento sem foco): não é o menu recusando a RA
          if (err && err.name === 'InvalidStateError') return
          if (fra.naRA()) {
            previaAoSair = true
            fra.sair()
          } else mostrarPrevia()
        })
      })
    }
    // a foto na própria página (depois da RA): sem câmera e sem outra tela — só a foto, “Compartilhar” e “Salvar”
    var previa = document.querySelector('[data-ra-previa]')
    function mostrarPrevia() {
      if (!previa || !arFotoUrl) return
      var im = previa.querySelector('[data-ra-previa-img]')
      if (im) im.src = arFotoUrl
      var sv = previa.querySelector('[data-ra-previa-save]')
      if (sv) {
        sv.href = arFotoUrl
        sv.setAttribute('download', arFotoNome || nomeDaFoto())
      }
      var sh = previa.querySelector('[data-ra-previa-share]')
      if (sh) sh.hidden = !(arFotoArq && navigator.canShare && navigator.canShare({ files: [arFotoArq] }))
      previa.hidden = false
      document.documentElement.classList.add('ra-foto-aberta')
      var x = previa.querySelector('[data-ra-previa-close]')
      if (x && x.focus) x.focus()
    }
    function fechaPrevia() {
      if (!previa || previa.hidden) return
      previa.hidden = true
      document.documentElement.classList.remove('ra-foto-aberta')
      var ab = document.querySelector('[data-foto-open]')
      if (ab && ab.focus) ab.focus()
    }
    if (previa) {
      var pvShare = previa.querySelector('[data-ra-previa-share]')
      if (pvShare) {
        pvShare.addEventListener('click', function () {
          if (arFotoArq && navigator.share) navigator.share({ files: [arFotoArq], title: 'Eu e a VIDA', text: 'Foto com a VIDA · Expedição Parques GO' }).catch(function () {})
        })
      }
      var pvX = previa.querySelector('[data-ra-previa-close]')
      if (pvX) pvX.addEventListener('click', fechaPrevia)
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') fechaPrevia()
      })
    }
    // 14/10 (verificação): onde ela pousa (~1,1 m do celular) a marca fica FORA da tela, nas 4 larguras medidas — a contagem
    // seguia mesmo assim e o Xis vinha sem a pessoa no lugar. Agora, depois dos 2,6 s, a espera segura a contagem até a
    // marca entrar na tela (quem segura o celular dá uns passos para trás: é o que a instrução do alto pede), por até 10 s
    // a mais; sem projeção (a marca não foi criada), segue
    function esperaEnquadrar(run) {
      var t0 = performance.now()
      return new Promise(function (res) {
        ;(function confere() {
          if (run !== arRun || !api.inAR()) return res()
          var p = marca.projetar()
          if (!p || p.naTela !== false || performance.now() - t0 > 10000) return res()
          setTimeout(confere, 250)
        })()
      })
    }
    // a instrução do alto: se a marca do chão estiver fora da tela (a pessoa perto demais), pede uns passos para trás
    function vigiaMarca(run) {
      ;(function confere() {
        if (run !== arRun) return
        var f = aruiBox && aruiBox.getAttribute('data-fase')
        if (f !== 'chamar' && f !== 'espera') return
        var p = marca.projetar()
        dicaRA(p && p.naTela === false ? MSG_TRAS : MSG_LADO)
        setTimeout(confere, 400)
      })()
    }
    // a sequência dentro da RA: vem (+ marca no chão) → espera → 3-2-1 → Xis (foto ou print) → “Ficou demais!” → idle
    function fotoNaRA() {
      prime()
      var comCamera = fra.comCamera()
      var run = ++arRun
      function alive() {
        return run === arRun && api.inAR()
      }
      var tiro = null
      function tira() {
        if (!tiro) {
          // a marca some NO Xis, antes do disparo: nem a foto nem a tela daquele quadro a mostram
          marca.esconder(true)
          tiro = tirarNaRA().then(function () {
            return true
          }, function () {
            return false
          })
        }
        return tiro
      }
      botoesFoto(true)
      if (arFoto) arFoto.hidden = true
      if (arConta) arConta.textContent = ''
      faseRA('chamar')
      marca.mostrar()
      dicaRA(MSG_LADO)
      vigiaMarca(run)
      // 14/10 (verificação): “Tirar a foto” no meio de uma fala (o “Olá” da chegada, o “Ouvir”): a troca para o “vem” com
      // 450 ms — com 300 ms a mão direita girava 24,4° num quadro no começo dele
      if (speaking && !speaking.voiceDone) mainPlayer.nextFade = 450
      speak('vem', mainPlayer)
        .then(function () {
          if (!alive()) return
          faseRA('espera')
          return wait(2600).then(function () {
            return esperaEnquadrar(run)
          })
        })
        .then(function () {
          if (!alive()) return
          faseRA('contagem')
          // sem a câmera, a pessoa já sabe na contagem que o Xis é a hora do print
          dicaRA(comCamera ? '' : PRINT_ANTES)
          var p = speak('contagem', mainPlayer, function (t, last) {
            var n = t < 3.1 ? -1 : t < 4.6 ? 3 : t < 6.6 ? 2 : t < 8.4 ? 1 : 0
            if (n !== last && arConta) arConta.textContent = n > 0 ? String(n) : n === 0 ? 'Xis!' : ''
            // no Xis a foto sai sozinha (câmera + VIDA do mesmo quadro XR), sem sair da RA; sem a câmera, só a marca some
            if (n === 0 && alive()) {
              if (comCamera) tira()
              else marca.esconder(true)
            }
            return n
          })
          // 13/10: a pose vira o laço JÁ durante a contagem (inGesture = true: só marca). No fim da contagem
          // o toLoop vai direto à pose (emenda de 0,8°). Antes: toLoop(idle) e, no mesmo quadro, setLoop(pose) → duas
          // misturas sobrepostas, o idle saltava para peso 0,93 e o antebraço girava 66° num quadro, bem no “Xis”.
          // (parada — movimento reduzido ou pausado — a contagem não abre gesto: a pose entra no fim dela, como antes)
          if (api.moving()) api.setLoop(cfg.pose)
          return p
        })
        .then(function () {
          if (!alive()) return
          if (!api.moving()) api.setLoop(cfg.pose)
          if (arConta) arConta.textContent = ''
          marca.esconder(true)
          // a deixa do Xis pode se perder (as deixas são conferidas a cada quadro e a fala pode acabar entre dois
          // quadros lentos): a foto sai aqui, no fim da contagem
          return (comCamera ? tira() : Promise.resolve(false)).then(function (saiu) {
            if (!alive()) return
            if (saiu) {
              faseRA('pronta')
              if (fotoArRot) fotoArRot.textContent = 'Tirar outra'
              return doisQuadrosRA().then(function () {
                return true
              })
            }
            // sem a câmera (recusada, sem suporte ou a captura falhou): o print, com os botões (e o X da RA) fora da frente.
            // 14/10 (verificação): o pedido fica 1,5 s e sai também (ele já veio na contagem) — antes ficava os 6 s e saía
            // no próprio print da pessoa
            faseRA('print')
            dicaRA(PRINT_RA)
            setTimeout(function () {
              if (run === arRun && aruiBox && aruiBox.getAttribute('data-fase') === 'print') dicaRA('')
            }, 1500)
            return wait(6000).then(function () {
              if (!alive()) return
              faseRA('')
              dicaRA('')
              return true
            })
          })
        })
        .then(function (segue) {
          if (!segue || !alive()) return
          // 14/10: “Ficou demais! Obrigada!” também na RA — da pose para o “ficou” com 450 ms (como no modo foto: com a
          // mistura curta os braços iam da pose ao “ficou” em 160 ms) e, no fim dele, de volta ao idle com 700 ms
          // (setLoop chamado DURANTE a fala: só marca o laço seguinte)
          mainPlayer.nextFade = 450
          var pf = speak('ficou', mainPlayer)
          api.setLoop(null, 700)
          return pf
        })
        .then(function () {
          if (run !== arRun) return
          botoesFoto(false)
          if (aruiBox && aruiBox.getAttribute('data-fase') !== 'pronta') faseRA('')
          dicaRA('')
        })
    }
    // a RA aberta pelo “Tirar uma foto com a VIDA”: um respiro para a pessoa ver a VIDA no chão antes de ela chamar
    function fotoNaEntrada() {
      if (!fotoAoEntrar) return
      fotoAoEntrar = false
      var run = arRun
      setTimeout(function () {
        if (run !== arRun || !api.inAR()) return
        fotoNaRA()
      }, 700)
    }
    if (fotoAr) {
      fotoAr.addEventListener('click', function (e) {
        e.stopPropagation()
        fotoNaRA()
      })
    }
    // 14/10: Android com a RA de verdade (WebXR): “Tirar uma foto com a VIDA” da página abre a RA e já começa a sequência
    // (a tela “A VIDA no seu mundo”, por giroscópio, fica só para quem não tem WebXR — iPhone e Android sem ARCore)
    // (só no Android: num óculos de RA/RV ou no computador, “Tirar uma foto com a VIDA” segue como antes)
    var xrAR = null
    if (/Android/i.test(navigator.userAgent) && !temQuickLook() && !ehIOS() && navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
      try {
        navigator.xr.isSessionSupported('immersive-ar').then(function (ok) {
          xrAR = !!ok
        }, function () {
          xrAR = false
        })
      } catch (e) {
        xrAR = false
      }
    } else xrAR = false
    // o modo de RA que o model-viewer escolheu (símbolo “arMode”: webxr, scene-viewer, quick-look ou none enquanto confere)
    function modoRA() {
      var syms = Object.getOwnPropertySymbols(mv)
      for (var i = 0; i < syms.length; i++) if (syms[i].description === 'arMode') return mv[syms[i]]
      return null
    }
    function abrirRAComFoto() {
      if (xrAR === false || typeof mv.activateAR !== 'function') return false
      if (document.body.getAttribute('data-model') === 'error') return false
      // 14/10 (verificação): toque duplo — a RA já está abrindo (por este botão ou pelo “Ver no meu espaço”): o 2º toque
      // não pede outra sessão (o navegador a recusaria e o model-viewer derrubaria a 1ª) e não abre a outra tela
      if (raOcupada(mv)) {
        if (raAbrindo(mv)) say('Abrindo a realidade aumentada…')
        return true
      }
      var modo = modoRA()
      if (modo == null) modo = xrAR && mv.canActivateAR ? 'webxr' : 'none'
      // o Scene Viewer (WebXR sem o que o model-viewer precisa) não roda a página: a foto fica na tela “A VIDA no seu mundo”
      if (modo !== 'webxr' && modo !== 'none') return false
      if (modo !== 'webxr' || !mv.canActivateAR) {
        if (xrAR === false) return false
        // a RA ainda está sendo conferida (toque logo depois de a página abrir): não cai na outra tela
        say('Preparando a realidade aumentada. Toque de novo em instantes.')
        return true
      }
      if (speaking) {
        stop()
        api.toLoop()
      }
      prime()
      fotoAoEntrar = true
      // dentro do toque: o navegador exige o gesto para abrir a câmera (abrirRA: um pedido de sessão por vez)
      var p = abrirRA(mv)
      if (p && p.catch) {
        p.catch(function () {
          fotoAoEntrar = false
        })
      }
      return true
    }

    function wait(ms) {
      return new Promise(function (r) {
        setTimeout(r, ms)
      })
    }

    mundo = setupFoto(mv, cfg, speak, prime, stop, wait)
    // 14/10: no Android com WebXR, “Tirar uma foto com a VIDA” vai para a RA de verdade (abrirRAComFoto), não para esta tela
    if (mundo) mundo.desvio = abrirRAComFoto
    // iPhone/iPad (13/10): não existe WebXR (nem no Safari 26/27) e, no AR Quick Look, a página não roda nada — a voz de
    // lá falha de forma intermitente e o arquivo não escolhe a sessão de áudio. Os botões de RA abrem a RA da própria
    // página (“A VIDA no seu mundo”, com a voz pelo <audio> liberado no toque); o Quick Look fica no chip “Ver na RA da
    // Apple (chão de verdade)”. Também no iPhone sem o Quick Look (navegador dentro de app): lá a página ainda pode ter
    // câmera e voz
    // 15/10 (dono, depois de testar: “não trava no chão, escala péssima” — a RA por giroscópio e o SLAM no navegador não
    // seguram o chão de um iPhone real): no iPhone/iPad COM Quick Look, os botões de RA e de foto abrem a RA da própria
    // Apple (ARKit: chão de verdade e tamanho certo) — vida.usdz com a linha do tempo contínua e a marca “Fique aqui”
    // (scripts/usdz-fique-aqui.py). A tela “A VIDA no seu mundo” fica só para o iPhone SEM Quick Look (navegador dentro
    // de app), onde ainda dá câmera e voz.
    if (temQuickLook()) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-ql-texto]'), function (el) {
        el.innerHTML = el.getAttribute('data-ql-texto')
      })
      Array.prototype.forEach.call(document.querySelectorAll('.ra-ql'), function (el) {
        el.setAttribute('data-ql-redundante', '')
      })
      // “Tirar uma foto com a VIDA” também abre a RA da Apple (lá: toque nela → sequência da foto; o botão branco salva)
      document.addEventListener('click', function (e) {
        var b = e.target && e.target.closest && e.target.closest('[data-foto-open]')
        if (!b) return
        e.stopPropagation()
        e.preventDefault()
        if (speaking) stop()
        try {
          abrirRA(mv)
        } catch (er) {}
      }, true)
    }
    if (mundo && ehIOS() && !temQuickLook()) {
      api.onMundo(function (e) {
        mundo.abrir({}, e)
        return true
      })
      Array.prototype.forEach.call(document.querySelectorAll('[data-ios-texto]'), function (el) {
        el.textContent = el.getAttribute('data-ios-texto')
      })
    }
    var ql = document.querySelector('[data-ql]')
    if (ql && temQuickLook()) {
      var qlHref = api.linkQuickLook()
      if (qlHref) {
        ql.setAttribute('rel', 'ar')
        ql.setAttribute('href', qlHref)
      }
      // a voz da página não continua por baixo do Quick Look
      ql.addEventListener('click', function () {
        if (speaking) stop()
      })
    }
    // a VIDA do palco segue a câmera (com o movimento ligado) — mas NÃO enquanto o giro automático roda o modelo: a
    // cabeça ficava presa na câmera sobre um corpo girando (“efeito coruja”, medido em 09/10). Arrastando, falando e
    // na RA o modelo não gira, e ela volta a seguir
    var ttUlt = null
    var ttGiro = 0
    function girando() {
      var t = typeof mv.turntableRotation === 'number' ? mv.turntableRotation : 0
      var agora = performance.now()
      if (ttUlt !== null && Math.abs(t - ttUlt) > 1e-4) ttGiro = agora
      ttUlt = t
      return agora - ttGiro < 600
    }
    setupOlhar(mv, function () {
      return api.moving() && !girando()
    })
  }

  // ------------------------------------------------------------------ foto na RA do Android (WebXR) (13/10 e 14/10/2026)
  // A foto tirada DENTRO da RA. 14/10 (retorno do dono: “tudo na mesma aba”): 'camera-access' é pedido POR PADRÃO, como
  // OPCIONAL, na sessão que o model-viewer abre (ele mesmo pede só hit-test, dom-overlay e light-estimation; opcional = sem
  // suporte ou negada, a sessão abre igual); ?camacc=0 desliga. Até 13/10 era só com ?camacc=1 e o 📸 saía da RA para a
  // tela “A VIDA no seu mundo” — esse caminho não existe mais no Android.
  // A foto sai SEM SAIR da RA: no Xis, a imagem da câmera em tela cheia e, por cima, a cena da VIDA com a câmera XR daquele
  // quadro, desenhadas no canvas do próprio model-viewer (o framebuffer padrão, que na RA não aparece) e copiadas ainda
  // dentro do quadro (a textura da câmera só vale no callback). A especificação garante a imagem alinhada à vista (mesma
  // pose e frustum: https://immersive-web.github.io/raw-camera-access/), com origem no canto inferior esquerdo (amostra
  // camera-access-barebones.html do Chromium); ?fotoflip=1 inverte na vertical, caso um aparelho real mostre o contrário.
  // Riscos de ligar por padrão (por isso a auto-cura): um Galaxy S25 travou a GPU só por pedir o recurso
  // (https://github.com/needle-tools/needle-engine-support/discussions/220) e, com ele, o three busca a imagem da câmera a
  // cada quadro. Auto-cura: se a página voltar com uma sessão com câmera que não terminou limpa (caiu) ou se o contexto
  // WebGL se perder com ela, não pede mais por 7 dias neste aparelho (limpar os dados do site libera antes) — a foto vira o
  // print, sempre dentro da RA. E, se a sessão não abrir COM o recurso, ela é pedida de novo sem ele.
  // Protótipo: captures/estudo_iphone/foto_android_webxr/proto/foto-ra-webxr.js; teste: scripts/ra-foto-ra.mjs (Edge +
  // scripts/lib/mock-webxr.js, a RA do celular simulada para o model-viewer).
  function lsFotoRA(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k)
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    } catch (e) {}
    return null
  }
  function nomeDaFoto() {
    var d = new Date()
    function z(n) {
      return (n < 10 ? '0' : '') + n
    }
    return 'foto-com-a-vida-' + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds()) + '.jpg'
  }
  function criarFotoRA(mv) {
    // as constantes ficam AQUI dentro: o criarFotoRA roda no carregamento (setupViewer → setupFala), antes de o IIFE chegar
    // às linhas de “var” lá de baixo — com elas fora, as chaves ainda eram undefined e a auto-cura não via a queda
    var FOTO_RA_OFF = 'vida_ra_camera_off'
    var FOTO_RA_USO = 'vida_ra_camera_em_uso'
    var est = { injetou: false, motivo: '', pedidos: [], medidas: [], erros: [] }
    var camOff = /[?&]camacc=0(&|$)/.test(location.search)
    var flipV = /[?&]fotoflip=1(&|$)/.test(location.search)
    // auto-cura: a sessão com câmera que estava aberta quando a página saiu sem 'pagehide' (caiu) desliga o pedido
    var uso = Number(lsFotoRA(FOTO_RA_USO) || 0)
    if (uso && Date.now() - uso < 10 * 60 * 1000) lsFotoRA(FOTO_RA_OFF, String(Date.now()))
    lsFotoRA(FOTO_RA_USO, null)
    function motivoSemCamera() {
      if (camOff) return 'desligado'
      var off = Number(lsFotoRA(FOTO_RA_OFF) || 0)
      if (off && Date.now() - off < 7 * 864e5) return 'falhou-antes'
      return ''
    }
    est.motivo = motivoSemCamera()

    // internos do model-viewer: o símbolo 'renderer' é um getter no PROTÓTIPO (ModelViewerElementBase)
    var simRenderer = null
    function interno() {
      if (!simRenderer) {
        for (var o = mv; o && !simRenderer; o = Object.getPrototypeOf(o)) {
          var syms = Object.getOwnPropertySymbols(o)
          for (var i = 0; i < syms.length; i++) if (syms[i].description === 'renderer') simRenderer = syms[i]
        }
      }
      var r = simRenderer ? mv[simRenderer] : null
      if (!r || !r.threeRenderer) return null
      return { three: r.threeRenderer, ar: r.arRenderer }
    }
    function sessaoDe() {
      var it = interno()
      return (it && it.three.xr && it.three.xr.getSession && it.three.xr.getSession()) || null
    }
    // true / false / null (navegador antigo sem enabledFeatures: só o quadro dirá)
    function temCameraNaSessao(s) {
      if (!s || !s.enabledFeatures) return null
      return s.enabledFeatures.indexOf('camera-access') >= 0
    }

    // o pedido do recurso (14/10: por padrão). Com ?camacc=0, o requestSession do navegador nem é tocado
    function vigia(s) {
      if (!s || temCameraNaSessao(s) === false) return
      lsFotoRA(FOTO_RA_USO, String(Date.now()))
      var it = interno()
      var cv = it && it.three.domElement
      function perdeu() {
        // contexto WebGL perdido com a câmera ligada: não pedir mais aqui
        lsFotoRA(FOTO_RA_OFF, String(Date.now()))
        est.erros.push('webglcontextlost com camera-access')
      }
      if (cv) cv.addEventListener('webglcontextlost', perdeu)
      function limpa() {
        lsFotoRA(FOTO_RA_USO, null)
        if (cv) cv.removeEventListener('webglcontextlost', perdeu)
        window.removeEventListener('pagehide', limpa)
      }
      s.addEventListener('end', limpa)
      // sair da página normalmente não conta como queda
      window.addEventListener('pagehide', limpa)
    }
    var xr = navigator.xr
    if (!camOff && xr && typeof xr.requestSession === 'function' && !xr.__fotoRA) {
      var orig = xr.requestSession
      xr.requestSession = function (modo, init) {
        var self = this
        var motivo = modo === 'immersive-ar' ? motivoSemCamera() : 'nao-ar'
        var init0 = init
        if (!motivo) {
          init = Object.assign({}, init || {})
          var opt = (init.optionalFeatures || []).slice()
          var req = init.requiredFeatures || []
          if (opt.indexOf('camera-access') < 0 && req.indexOf('camera-access') < 0) opt.push('camera-access')
          init.optionalFeatures = opt
        }
        est.injetou = !motivo
        est.motivo = motivo
        est.pedidos.push({ modo: modo, optional: ((init && init.optionalFeatures) || []).slice(), bloqueio: motivo })
        var p = orig.call(this, modo, init)
        if (!p || !p.then || motivo) return p
        return p.then(
          function (s) {
            vigia(s)
            return s
          },
          function (err) {
            // 14/10 (verificação): recusa que não tem a ver com a câmera — outra sessão aberta ou pendente
            // (InvalidStateError) ou sem o toque (SecurityError): pedir de novo sem o recurso só repetiria a recusa, e
            // marcaria a sessão que está abrindo como “sem câmera” (a foto dela viraria o print)
            var nome = err && err.name
            if (nome === 'InvalidStateError' || nome === 'SecurityError') throw err
            // a sessão não abriu COM o recurso opcional (um navegador que recusa em vez de ignorar): de novo, sem ele — a
            // RA abre igual e a foto vira o print
            est.erros.push('requestSession com camera-access: ' + ((err && err.name) || err))
            est.injetou = false
            est.motivo = 'recusou-a-sessao'
            est.pedidos.push({ modo: modo, optional: ((init0 && init0.optionalFeatures) || []).slice(), bloqueio: 'recusou-a-sessao' })
            return orig.call(self, modo, init0)
          }
        )
      }
      xr.__fotoRA = true
    }

    // fundo = a imagem da câmera em tela cheia no framebuffer padrão (o canvas do model-viewer, W × H = a vista XR)
    var gp = null
    function preparaGL(gl) {
      if (gp && gp.gl === gl) return gp
      function sh(tipo, src) {
        var s = gl.createShader(tipo)
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s))
        return s
      }
      var vs = '#version 300 es\nin vec2 p;out vec2 uv;uniform float flipV;void main(){uv=p*0.5+0.5;if(flipV>0.5)uv.y=1.0-uv.y;gl_Position=vec4(p,0.0,1.0);}'
      var fs = '#version 300 es\nprecision mediump float;in vec2 uv;uniform sampler2D cam;out vec4 cor;void main(){cor=vec4(texture(cam,uv).rgb,1.0);}'
      var prog = gl.createProgram()
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs))
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs))
      gl.bindAttribLocation(prog, 0, 'p')
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog))
      var vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      var buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      gl.bindVertexArray(null)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gp = { gl: gl, prog: prog, vao: vao, uCam: gl.getUniformLocation(prog, 'cam'), uFlip: gl.getUniformLocation(prog, 'flipV') }
      return gp
    }
    function desenhaCamera(gl, tex, W, H, flip) {
      var g = preparaGL(gl)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, W, H)
      ;[gl.DEPTH_TEST, gl.BLEND, gl.CULL_FACE, gl.SCISSOR_TEST, gl.STENCIL_TEST, gl.SAMPLE_ALPHA_TO_COVERAGE, gl.RASTERIZER_DISCARD, gl.POLYGON_OFFSET_FILL].forEach(function (c) {
        gl.disable(c)
      })
      gl.colorMask(true, true, true, true)
      gl.depthMask(true)
      gl.clearColor(0, 0, 0, 1)
      gl.clearDepth(1)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.useProgram(g.prog)
      gl.bindVertexArray(g.vao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(g.uCam, 0)
      gl.uniform1f(g.uFlip, flip ? 1 : 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      // solta a textura da câmera antes do fim do quadro (crbug 350939008: usar a imagem compartilhada fora de ordem
      // derrubava o contexto)
      gl.bindTexture(gl.TEXTURE_2D, null)
      gl.bindVertexArray(null)
      gl.useProgram(null)
    }
    function comporNoQuadro(it, frame, op) {
      var three = it.three
      var xrm = three.xr
      var cena = it.ar && it.ar.presentedScene
      if (!cena) throw new Error('sem-cena')
      var pose = frame.getViewerPose(xrm.getReferenceSpace())
      if (!pose || !pose.views || !pose.views.length) return 'sem-pose'
      var cam = pose.views[0].camera
      if (!cam) throw new Error('sem-camera')
      var binding = xrm.getBinding()
      if (!binding || typeof binding.getCameraImage !== 'function') throw new Error('sem-camera')
      var tex = binding.getCameraImage(cam)
      if (!tex) return 'sem-imagem'
      var gl = three.getContext()
      var canvas = three.domElement
      var W = canvas.width
      var H = canvas.height
      var t0 = performance.now()
      var prevRT = three.getRenderTarget()
      var prevAuto = three.autoClear
      var prevXR = xrm.enabled
      var out = null
      var preto = false
      try {
        desenhaCamera(gl, tex, W, H, op.flip)
        if (!op.aceitarPreto) {
          // câmera ainda “aquecendo” vem preta (a amostra do Chromium avisa): tenta no próximo quadro
          var px = new Uint8Array(4)
          gl.readPixels(W >> 1, H >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
          preto = px[0] + px[1] + px[2] === 0
        }
        // o three volta a saber o estado real do GL
        three.resetState()
        if (!preto) {
          // no framebuffer padrão, com a câmera XR deste quadro (não na camada da RA), sem apagar a câmera desenhada
          xrm.enabled = false
          three.setRenderTarget(null)
          three.autoClear = false
          // o olhar (setupOlhar) dá um passo da suavização a cada desenho: neste 2º desenho do mesmo quadro a cabeça e os
          // olhos andariam de novo e a foto sairia diferente da tela (medido no simulador: 1,20/255, contornos do rosto).
          // Desligado SÓ neste desenho, os ossos ficam como o olhar os pôs no desenho do model-viewer deste quadro
          var olhar0 = window.__olharOff
          window.__olharOff = true
          try {
            three.render(cena, cena.getCamera())
          } finally {
            window.__olharOff = olhar0
          }
          out = document.createElement('canvas')
          out.width = W
          out.height = H
          out.getContext('2d').drawImage(canvas, 0, 0)
        }
      } finally {
        xrm.enabled = prevXR
        three.autoClear = prevAuto
        three.setRenderTarget(prevRT)
      }
      if (preto) return 'preto'
      est.medidas.push({ msNoQuadro: Math.round((performance.now() - t0) * 10) / 10, W: W, H: H, camW: cam.width, camH: cam.height })
      return { canvas: out, camW: cam.width, camH: cam.height }
    }
    function capturar(op) {
      op = op || {}
      if (op.flip === undefined) op.flip = flipV
      var it = interno()
      if (!it) return Promise.reject(new Error('sem-renderer'))
      var s = sessaoDe()
      if (!s) return Promise.reject(new Error('fora-da-ra'))
      if (temCameraNaSessao(s) === false) return Promise.reject(new Error('sem-camera'))
      return new Promise(function (resolve, reject) {
        var tent = 0
        function noQuadro(t, frame) {
          var r
          try {
            r = comporNoQuadro(it, frame, op)
          } catch (e) {
            est.erros.push(String(e && e.message))
            return reject(e)
          }
          if (typeof r === 'string') {
            if (++tent < 20) return s.requestAnimationFrame(noQuadro)
            if (r === 'preto' && !op.aceitarPreto) {
              op.aceitarPreto = true
              return s.requestAnimationFrame(noQuadro)
            }
            return reject(new Error(r))
          }
          resolve(r)
        }
        // pedido agora (entre quadros): no próximo quadro roda DEPOIS do callback do three/model-viewer, registrado no
        // quadro anterior — a câmera XR e a imagem da câmera são do mesmo quadro que a VIDA desenhada
        s.requestAnimationFrame(noQuadro)
      }).then(function (r) {
        // fora do quadro: assinatura e JPEG
        var c = r.canvas
        var cx = c.getContext('2d')
        var fsz = Math.round(Math.max(16, Math.min(44, c.width * 0.032)))
        cx.font = '600 ' + fsz + 'px "Inter Tight", system-ui, sans-serif'
        cx.fillStyle = 'rgba(255,255,255,0.88)'
        cx.shadowColor = 'rgba(0,0,0,0.5)'
        cx.shadowBlur = Math.round(fsz * 0.35)
        cx.textAlign = 'right'
        cx.fillText('Eu e a VIDA · Expedição Parques GO', c.width - Math.round(fsz * 0.8), c.height - Math.round(fsz * 0.9))
        return new Promise(function (res) {
          c.toBlob(function (b) {
            res({ blob: b, largura: c.width, altura: c.height, camW: r.camW, camH: r.camH })
          }, 'image/jpeg', 0.95)
        })
      })
    }
    // download direto: pasta Download do Android (a Galeria mostra). Cada foto nasce de um toque (“Tirar a foto” na RA ou
    // “Tirar uma foto com a VIDA” na página), que reabre o limite de downloads automáticos do Chrome
    function salvar(blob) {
      var url = URL.createObjectURL(blob)
      var a = document.createElement('a')
      a.href = url
      a.download = nomeDaFoto()
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(function () {
        URL.revokeObjectURL(url)
        if (a.parentNode) a.parentNode.removeChild(a)
      }, 60000)
      return a.download
    }
    // 14/10: encerra a RA (o “Compartilhar” que não abre por cima dela leva a foto para a página)
    function sair() {
      var s = sessaoDe()
      if (!s) return
      try {
        var p = s.end()
        if (p && p.catch) p.catch(function () {})
      } catch (e) {}
    }
    return {
      estado: est,
      interno: interno,
      temCamera: function () {
        return temCameraNaSessao(sessaoDe())
      },
      naRA: function () {
        return !!sessaoDe()
      },
      // a sequência da RA tira a foto no Xis: o recurso pedido nesta sessão e a câmera não recusada
      comCamera: function () {
        var s = sessaoDe()
        return est.injetou && !!s && temCameraNaSessao(s) !== false
      },
      capturar: capturar,
      salvar: salvar,
      sair: sair,
    }
  }

  // ------------------------------------------------------------------ “Fique aqui” no CHÃO da RA (14/10/2026)
  // Retorno do dono (14/10): o tracejado “Fique aqui” do modo foto ficou “muito bom — aplique nos dois”. Na RA de verdade
  // (WebXR) ele vira 3D, deitado no chão real e PRESO À VIDA: um quadro no chão (anel tracejado de 52 cm, duas pegadas e
  // “Fique aqui”), filho do alvo da cena do model-viewer — anda e gira com ela. Nasce à direita dela na tela no instante em
  // que a sequência da foto começa (o lado direito da câmera, no chão), com o centro a MARCA_LADO_M do centro dos pés dela
  // e o texto virado para quem segura o celular. As classes do three vêm de objetos do próprio model-viewer (a página não
  // importa o three): Mesh, PlaneGeometry e MeshBasicMaterial do chão da sombra de contato; Texture, Vector3, Matrix4 e
  // Object3D da cena da VIDA. Fica FORA da sombra de contato (o model-viewer desenha a sombra com a cena INTEIRA vista de
  // baixo: a marca sairia como uma mancha escura no chão) e FORA da foto (some no Xis, um quadro antes do disparo).
  // Teste: scripts/ra-foto-ra.mjs (a marca na tela do simulador, ao lado dela, no “vem” e na contagem; fora depois).
  var MARCA_LADO_M = 0.55
  var MARCA_R_M = 0.26
  var MARCA_TAM_M = 1
  function criarMarcaLado(mv, interno) {
    var est = { criada: false, visivel: false, erro: '', centro: null, pes: null }
    var g = null
    var mat = null
    var V3 = null
    var M4 = null
    var alvo = 0
    var t0 = 0
    function pegada(c, x, y, px, espelho) {
      c.save()
      c.translate(x, y)
      if (espelho) c.scale(-1, 1)
      c.fillStyle = 'rgba(243,240,231,0.88)'
      c.strokeStyle = 'rgba(9,15,13,0.6)'
      c.lineWidth = 0.008 * px
      // calcanhar (longe da câmera)
      c.beginPath()
      c.ellipse(0, -0.07 * px, 0.032 * px, 0.042 * px, 0, 0, 2 * Math.PI)
      c.fill()
      c.stroke()
      // planta e dedos (perto da câmera), um pouco para fora
      c.beginPath()
      c.ellipse(-0.006 * px, 0.04 * px, 0.04 * px, 0.062 * px, 0.12, 0, 2 * Math.PI)
      c.fill()
      c.stroke()
      c.restore()
    }
    // o quadro do chão (1 m × 1 m, 1 px ≈ 1 mm): o alto do quadro fica longe da câmera, o pé dele perto
    function texturaCanvas() {
      var N = 1024
      var px = N / MARCA_TAM_M
      var cv = document.createElement('canvas')
      cv.width = N
      cv.height = N
      var c = cv.getContext('2d')
      var cx = N / 2
      var cy = N * 0.4
      var r = MARCA_R_M * px
      // fundo leve dentro do anel: contraste em chão claro
      c.fillStyle = 'rgba(9,15,13,0.30)'
      c.beginPath()
      c.arc(cx, cy, r, 0, 2 * Math.PI)
      c.fill()
      // anel tracejado: contorno escuro por baixo e creme por cima (como o tracejado do modo foto, 13/10 r1)
      var passo = (2 * Math.PI * r) / 20
      c.lineCap = 'round'
      c.setLineDash([passo * 0.55, passo * 0.45])
      c.strokeStyle = 'rgba(9,15,13,0.72)'
      c.lineWidth = 0.05 * px
      c.beginPath()
      c.arc(cx, cy, r, 0, 2 * Math.PI)
      c.stroke()
      c.strokeStyle = '#f3f0e7'
      c.lineWidth = 0.03 * px
      c.beginPath()
      c.arc(cx, cy, r, 0, 2 * Math.PI)
      c.stroke()
      c.setLineDash([])
      // duas pegadas, de frente para a câmera
      pegada(c, cx - 0.075 * px, cy + 0.005 * px, px, false)
      pegada(c, cx + 0.075 * px, cy + 0.005 * px, px, true)
      // “Fique aqui”, entre o anel e a câmera
      c.font = '700 ' + Math.round(0.115 * px) + 'px "Inter Tight", system-ui, sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.lineJoin = 'round'
      var ty = cy + r + 0.12 * px
      c.strokeStyle = 'rgba(9,15,13,0.8)'
      c.lineWidth = 0.024 * px
      c.strokeText('Fique aqui', cx, ty)
      c.fillStyle = '#f3f0e7'
      c.fillText('Fique aqui', cx, ty)
      return cv
    }
    // aparece em 350 ms e “respira” de leve (chama o olhar); some em 350 ms (ou na hora: esconder(true))
    function anima() {
      if (!mat) return
      var agora = performance.now()
      var k = Math.min(1, (agora - t0) / 350)
      var o = alvo ? k : 1 - k
      if (alvo && k >= 1) o = 0.86 + 0.14 * Math.cos(((agora - t0 - 350) / 1600) * 2 * Math.PI)
      mat.opacity = o
      if (!alvo && k >= 1 && g) g.visible = false
    }
    function cria(sc) {
      if (g) return
      var sh = sc.shadow
      var chao = sh && sh.floor
      if (!chao || !chao.isMesh || !chao.geometry || !chao.material || !chao.material.isMeshBasicMaterial) throw new Error('sem-classes')
      var Tex = null
      sc.target.traverse(function (o) {
        if (Tex || !o.isMesh || !o.material) return
        var ms = Array.isArray(o.material) ? o.material : [o.material]
        for (var i = 0; i < ms.length && !Tex; i++) {
          var t = ms[i] && ms[i].map
          if (t && t.isTexture && !t.isDataTexture && !t.isCompressedTexture && !t.isVideoTexture && !t.isRenderTargetTexture && !t.isDepthTexture) Tex = t.constructor
        }
      })
      if (!Tex) throw new Error('sem-textura')
      V3 = sc.target.position.constructor
      M4 = sc.target.matrixWorld.constructor
      var tex = new Tex(texturaCanvas())
      tex.colorSpace = 'srgb'
      tex.anisotropy = 8
      tex.needsUpdate = true
      mat = new chao.material.constructor({ map: tex, transparent: true, depthWrite: false, side: 2, opacity: 0 })
      mat.toneMapped = false
      var mesh = new chao.constructor(new chao.geometry.constructor(MARCA_TAM_M, MARCA_TAM_M), mat)
      // deitado no chão; o anel (a 40 % do alto do quadro) no centro do grupo, o texto mais perto da câmera
      mesh.rotation.x = -Math.PI / 2
      mesh.position.z = MARCA_TAM_M * 0.1
      mesh.renderOrder = 2
      mesh.userData.noHit = true
      mesh.onBeforeRender = anima
      g = new sc.target.constructor()
      g.name = 'vida-marca-lado'
      g.visible = false
      g.userData.noHit = true
      g.add(mesh)
      sc.target.add(g)
      // fora da sombra de contato
      var rs = sc.renderShadow
      if (typeof rs === 'function' && !sc.__semMarca) {
        sc.renderShadow = function () {
          var v = g.visible
          g.visible = false
          try {
            return rs.apply(this, arguments)
          } finally {
            g.visible = v
          }
        }
        sc.__semMarca = true
      }
      est.criada = true
    }
    // a câmera de agora: a da RA (a vista do celular) ou, fora dela, a do model-viewer
    function camera() {
      var it = interno()
      var xrm = it && it.three && it.three.xr
      if (xrm && xrm.isPresenting) {
        var cx = xrm.getCamera()
        return cx && cx.cameras && cx.cameras.length ? cx.cameras[0] : cx
      }
      var sc = cenaDe(mv)
      return sc ? sc.getCamera() : null
    }
    function posiciona(sc) {
      var cam = camera()
      if (!cam) throw new Error('sem-camera')
      sc.target.updateWorldMatrix(true, false)
      var tm = sc.target.matrixWorld
      var bb = sc.boundingBox
      var cheia = bb && !bb.isEmpty()
      var yl = cheia ? bb.min.y : 0
      var pes = new V3(cheia ? (bb.min.x + bb.max.x) / 2 : 0, yl, cheia ? (bb.min.z + bb.max.z) / 2 : 0).applyMatrix4(tm)
      var cm = cam.matrixWorld.elements
      // o lado direito da câmera, no chão
      var dir = new V3(cm[0], 0, cm[2])
      if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0)
      dir.normalize()
      var p = pes.clone().addScaledVector(dir, MARCA_LADO_M)
      var olha = new V3(cm[12] - p.x, 0, cm[14] - p.z)
      var inv = new M4().copy(tm).invert()
      var pl = p.clone().applyMatrix4(inv)
      var dl = olha.lengthSq() > 1e-8 ? olha.normalize().transformDirection(inv) : new V3(0, 0, 1)
      var esc = new V3()
      sc.target.getWorldScale(esc)
      g.position.set(pl.x, yl + 0.004 / (esc.y || 1), pl.z)
      g.rotation.set(0, Math.atan2(dl.x, dl.z), 0)
      g.scale.setScalar(1 / (esc.x || 1))
      g.updateMatrixWorld(true)
      est.centro = [p.x, pes.y, p.z]
      est.pes = [pes.x, pes.y, pes.z]
    }
    // onde a marca (e os pés dela) caem na tela agora, em px da página; naTela = o centro do anel à vista
    function projetar() {
      if (!g || !est.centro || !V3) return null
      var cam = camera()
      if (!cam) return null
      function p(a) {
        var v = new V3(a[0], a[1], a[2]).applyMatrix4(cam.matrixWorldInverse)
        var frente = v.z < 0
        v.applyMatrix4(cam.projectionMatrix)
        return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight, frente: frente }
      }
      var c = p(est.centro)
      var m = 0.04
      return { centro: c, pes: p(est.pes), naTela: c.frente && c.x > innerWidth * m && c.x < innerWidth * (1 - m) && c.y > innerHeight * m && c.y < innerHeight * (1 - m) }
    }
    return {
      estado: est,
      // 14/10 (verificação): a marca nasce ANTES de ser pedida (quando a RA abre). Criada no toque em “Tirar a foto”, a
      // textura de 1024² e os 2 shaders dela faziam um quadro de ~48 ms bem no começo do “vem”. Aqui ela é desenhada UM
      // quadro com opacidade 0 (sobe a textura e compila os shaders) e se esconde sozinha (anima: alvo 0 → invisível)
      preparar: function () {
        try {
          var sc = cenaDe(mv)
          if (!sc || !sc.target || g) return
          cria(sc)
          if (est.visivel) return
          alvo = 0
          t0 = performance.now() - 1000
          if (mat) mat.opacity = 0
          g.visible = true
          est.preparada = true
        } catch (e) {
          est.erroPreparar = String((e && e.message) || e)
        }
      },
      mostrar: function () {
        try {
          var sc = cenaDe(mv)
          if (!sc || !sc.target) throw new Error('sem-cena')
          cria(sc)
          posiciona(sc)
          alvo = 1
          t0 = performance.now()
          if (mat) mat.opacity = 0
          g.visible = true
          est.visivel = true
          est.erro = ''
        } catch (e) {
          est.erro = String((e && e.message) || e)
        }
      },
      esconder: function (ja) {
        est.visivel = false
        if (!g) return
        alvo = 0
        if (ja) {
          g.visible = false
          if (mat) mat.opacity = 0
        } else t0 = performance.now()
      },
      projetar: projetar,
    }
  }

  // ------------------------------------------------------------------ RA da página por giroscópio (13/10/2026)
  // A VIDA fica PARADA NO MUNDO enquanto o celular gira no lugar: RA de 3 graus de liberdade, sem WebXR (o iPhone não tem
  // immersive-ar, nem no Safari 26/27, e no Quick Look a página não roda nada). A orientação vem do DeviceOrientationEvent
  // (no iPhone, depois de DeviceOrientationEvent.requestPermission() dentro de um toque), o chão é um plano a “altura”
  // metros abaixo do celular e o 2º model-viewer desenha a VIDA vista exatamente da posição do celular.
  // Como: o model-viewer só sabe olhar PARA o alvo; mas o celular só GIRA (não anda), então a câmera do model-viewer e a
  // do celular têm o MESMO centro óptico, e duas câmeras com o mesmo centro diferem por uma homografia exata
  // (H = K·Rᵀ·M·K⁻¹). Ela vai para o CSS como matrix3d: os pés ficam no ponto do chão em qualquer lugar da tela, sem atraso
  // entre o 3D e a imagem, e a câmera do model-viewer só muda quando ela muda de lugar no chão (girar o celular só muda o
  // transform, no compositor). Medido em scripts/ra-mundo.mjs (um mundo do three.js no lugar da câmera): pés ≤ 0,5 px do
  // X do chão em 15 poses. Limites: não cresce quando a pessoa anda até ela; o campo de visão da câmera não vem de nenhuma
  // API (padrão 68° no lado maior; ?calibrar=1). Protótipo: captures/estudo_iphone/web-ar-iphone/prototipo/giro.js.
  // Referenciais: Terra (W3C) X leste, Y norte, Z cima, celular na origem, chão em Z = −altura; tela x direita, y cima,
  // z saindo da tela (a câmera traseira olha para −z; a frontal, espelhada, para +z).
  var GRAU = Math.PI / 180
  // distância do celular aos pés dela (m): mais perto que isso, o quadrado do model-viewer ficaria enorme
  var GIRO_DIST_MIN = 0.9
  var GIRO_DIST_MAX = 6
  // onde ela nasce: no mínimo a 2,4 m (a distância do raio de 74 % da tela com o celular a −12°; ver posInicial)
  var GIRO_DIST_INI = 2.4
  // e no máximo a 4,5 m (13/10, verificação r2: com o celular apontado para cima ela nascia a 6 m, pequena, com os pés atrás
  // da legenda). A verificação sugeriu ~3,5 m, mas com o celular em pé (0°, a postura mais comum) o raio de 74 % já cai a
  // 4,31–4,34 m: 3,5 m mudaria esse caso (os pés 47 px mais baixos, colados na legenda) e, a +10°, ela nasceria com o corpo
  // atrás da barra (pés em y 810). Com 4,5 m: 0° igual a antes; +10° inteira na tela, com os pés atrás da legenda do “Olá”
  // (y 746) e a mensagem pedindo para abaixar o celular (enquadrar; ra-mundo, caso inclinado)
  var GIRO_DIST_INI_MAX = 4.5
  // matrizes 3×3 em arrays de 9, por linha
  function giroMul(a, b) {
    var r = new Array(9)
    for (var i = 0; i < 3; i++)
      for (var j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
    return r
  }
  function giroTr(a) {
    return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]]
  }
  function giroVec(a, v) {
    return [a[0] * v[0] + a[1] * v[1] + a[2] * v[2], a[3] * v[0] + a[4] * v[1] + a[5] * v[2], a[6] * v[0] + a[7] * v[1] + a[8] * v[2]]
  }
  function giroRx(t) {
    return [1, 0, 0, 0, Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t)]
  }
  function giroRy(t) {
    return [Math.cos(t), 0, Math.sin(t), 0, 1, 0, -Math.sin(t), 0, Math.cos(t)]
  }
  function giroRz(t) {
    return [Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t), 0, 0, 0, 1]
  }
  function giroNorm(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1
    return [v[0] / l, v[1] / l, v[2] / l]
  }
  function giroCross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  }
  // matriz ↔ quatérnio: a suavização interpola quatérnios (sem tremer nem dar a volta errada)
  function giroM2q(m) {
    var t = m[0] + m[4] + m[8]
    var w, x, y, z, s
    if (t > 0) {
      s = Math.sqrt(t + 1) * 2
      w = 0.25 * s
      x = (m[7] - m[5]) / s
      y = (m[2] - m[6]) / s
      z = (m[3] - m[1]) / s
    } else if (m[0] > m[4] && m[0] > m[8]) {
      s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2
      w = (m[7] - m[5]) / s
      x = 0.25 * s
      y = (m[1] + m[3]) / s
      z = (m[2] + m[6]) / s
    } else if (m[4] > m[8]) {
      s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2
      w = (m[2] - m[6]) / s
      x = (m[1] + m[3]) / s
      y = 0.25 * s
      z = (m[5] + m[7]) / s
    } else {
      s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2
      w = (m[3] - m[1]) / s
      x = (m[2] + m[6]) / s
      y = (m[5] + m[7]) / s
      z = 0.25 * s
    }
    return [w, x, y, z]
  }
  function giroQ2m(q) {
    var w = q[0], x = q[1], y = q[2], z = q[3]
    return [
      1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
      2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
      2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
    ]
  }
  function giroSlerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
    if (d < 0) {
      b = [-b[0], -b[1], -b[2], -b[3]]
      d = -d
    }
    var r = [0, 0, 0, 0]
    var i
    if (d > 0.9995) {
      for (i = 0; i < 4; i++) r[i] = a[i] + (b[i] - a[i]) * t
      var l = Math.sqrt(r[0] * r[0] + r[1] * r[1] + r[2] * r[2] + r[3] * r[3]) || 1
      for (i = 0; i < 4; i++) r[i] /= l
      return r
    }
    var th = Math.acos(d)
    var sn = Math.sin(th)
    var ka = Math.sin((1 - t) * th) / sn
    var kb = Math.sin(t * th) / sn
    for (i = 0; i < 4; i++) r[i] = a[i] * ka + b[i] * kb
    return r
  }
  /** Rotação tela→Terra pelos ângulos do DeviceOrientationEvent (W3C: R = Rz(α)·Rx(β)·Ry(γ)) e pelo giro da tela. */
  function rotacaoTela(alpha, beta, gamma, anguloTela) {
    var R = giroMul(giroMul(giroRz((alpha || 0) * GRAU), giroRx((beta || 0) * GRAU)), giroRy((gamma || 0) * GRAU))
    return giroMul(R, giroRz(-(anguloTela || 0) * GRAU))
  }
  function anguloDaTela() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle
    return typeof window.orientation === 'number' ? window.orientation : 0
  }
  // Pinça: escala SÓ o modelo, em volta dos pés (a origem dele), pela cena interna — o mesmo que o model-viewer faz ao
  // mudar o atributo “scale” (applyTransform → caixa → sombra → desenho), sem o passo seguinte dele, que na 4.3.1 quebra
  // fora da RA (ARRenderer.onUpdateScene com presentedScene nulo: um erro por mudança e o novo desenho não é pedido).
  // Alvo, órbita e hotspots continuam em metros do mundo.
  function escalaModelo(v, s) {
    var sc = cenaDe(v)
    var ms = sc && sc.models
    if (!ms || !ms.length) return false
    for (var i = 0; i < ms.length; i++) ms[i].scale.set(s, s, s)
    if (typeof sc.updateBoundingBox === 'function') sc.updateBoundingBox()
    if (typeof sc.updateShadow === 'function') sc.updateShadow()
    if (typeof sc.queueRender === 'function') sc.queueRender()
    return true
  }

  /**
   * Âncora de um <model-viewer> no chão. opts: mv; focal() → px CSS; altura() → m do celular ao chão; frontal() → true com
   * a câmera de selfie; suave (s; 0 = sem suavização); xIni/yIni (fração da tela onde ela nasce); aoQuadro(visível);
   * aoGirar() (o sensor respondeu depois de ela ter ficado presa à tela).
   */
  function criarAncora(opts) {
    var mv = opts.mv
    var st = { R: null, q: null, qAlvo: null, P: null, s: 1, sModelo: 1, S: 0, f: 0, fov: 30, T: null, G: null, eventos: 0, visivel: false, fixa: false }
    var raf = 0
    var ultimoT = 0
    var chave = ''
    var ultimoTf = ''
    var ligada = false
    // alvo da câmera do model-viewer: o meio do corpo (1,10 m de altura × escala)
    function alturaAlvo() {
      return 0.55 * st.s
    }
    function F() {
      return opts.frontal() ? [1, 0, 0, 0, 1, 0, 0, 0, -1] : [1, 0, 0, 0, 1, 0, 0, 0, 1]
    }
    function onOri(e) {
      if (e.alpha == null && e.beta == null && e.gamma == null) return
      var R = rotacaoTela(e.alpha, e.beta, e.gamma, anguloDaTela())
      st.eventos++
      if (st.fixa) {
        // presa à tela porque o sensor não respondeu a tempo — e agora respondeu: passa a valer o giro, com ela no mesmo
        // lugar da tela
        var uv = st.P ? projetar(st.P) : null
        st.fixa = false
        st.q = st.qAlvo = giroM2q(R)
        st.R = R
        if (uv) st.P = chaoSob(uv[0], uv[1])
        chave = ''
        quadro()
        if (opts.aoGirar) opts.aoGirar()
        return
      }
      st.qAlvo = giroM2q(R)
      if (!st.q) st.q = st.qAlvo
      if (!(opts.suave > 0)) {
        st.q = st.qAlvo
        quadro()
      }
    }
    // raio da tela (px CSS) → direção na Terra
    function raio(u, v) {
      var f = opts.focal()
      var dc = [(u - innerWidth / 2) / f, -(v - innerHeight / 2) / f, -1]
      return giroNorm(giroVec(st.R, giroVec(F(), dc)))
    }
    // ponto do chão sob um ponto da tela (a 2,2 m na direção, se a tela mira o horizonte ou o céu)
    function chaoSob(u, v) {
      var d = raio(u, v)
      var h = opts.altura()
      if (d[2] < -0.05) {
        var t = -h / d[2]
        var p = [d[0] * t, d[1] * t, -h]
        var dist = Math.sqrt(p[0] * p[0] + p[1] * p[1])
        var k = Math.max(GIRO_DIST_MIN, Math.min(GIRO_DIST_MAX, dist)) / (dist || 1)
        return [p[0] * k, p[1] * k, -h]
      }
      var hz = giroNorm([d[0], d[1], 0])
      return [hz[0] * 2.2, hz[1] * 2.2, -h]
    }
    // Onde ela nasce (e para onde “Colocar na minha frente” a leva): o chão sob (xIni, yIni) da tela, mas nunca mais perto que
    // GIRO_DIST_INI. 13/10 (verificação r1): quem acabou de tocar em “Permitir” segura o celular a 30–50° da horizontal,
    // e o raio de 74 % caía a 0,9–1,1 m — ao levantar o celular para enquadrar, ela ficava cortada nos joelhos, atrás dos
    // botões, ou fora da tela (a −65°, só uma bota na borda). Agora, com o raio perto demais, o celular é “levantado” em
    // volta do eixo horizontal da tela (a guinada e o lado do ponto ficam) até o raio cair a 2,4 m: com o celular para baixo
    // ela nasce à frente, alta na tela, e aparece inteira ao levantar. Com o raio a 2,4 m ou mais (o celular a −12°, os
    // testes de 15 poses) nada muda, e a passagem entre os dois casos é contínua.
    // 13/10 (verificação r2): do outro lado, com o celular apontado para cima (o raio caindo a mais de 4,5 m, ou no céu), o
    // raio é “abaixado” do mesmo jeito até cair a GIRO_DIST_INI_MAX: ela nascia a 6 m (o limite do chaoSob), com 125 px, os
    // pés atrás da legenda; agora nasce a 4,5 m e, com os pés atrás da legenda ou abaixo da barra, a mensagem pede para
    // abaixar o celular (enquadrar)
    function posInicial() {
      var u = innerWidth * (opts.xIni == null ? 0.5 : opts.xIni)
      var v = innerHeight * (opts.yIni == null ? 0.74 : opts.yIni)
      var d = raio(u, v)
      var h = opts.altura()
      var dist = d[2] < -0.05 ? (Math.sqrt(d[0] * d[0] + d[1] * d[1]) * h) / -d[2] : Infinity
      if (dist >= GIRO_DIST_INI && dist <= GIRO_DIST_INI_MAX) return chaoSob(u, v)
      var D = dist < GIRO_DIST_INI ? GIRO_DIST_INI : GIRO_DIST_INI_MAX
      // rumo do celular no chão: o de trás da câmera (−z da câmera) e, com o celular deitado, o do alto da tela (+y; para
      // trás se a câmera olha para cima)
      var RF = giroMul(st.R, F())
      var fz = giroVec(RF, [0, 0, -1])
      var fy = giroVec(RF, [0, 1, 0])
      var w = Math.min(1, Math.sqrt(fz[0] * fz[0] + fz[1] * fz[1]))
      var sy = fz[2] < 0 ? 1 - w : w - 1
      var fw = giroNorm([fz[0] + sy * fy[0], fz[1] + sy * fy[1], 0])
      var rt = giroNorm(giroCross(fw, [0, 0, 1]))
      // o raio levantado (ou abaixado): o lado (a) fica; a altura (c) é a que cai a D; a frente (b) completa o unitário
      var a = d[0] * rt[0] + d[1] * rt[1] + d[2] * rt[2]
      var c = -h / Math.sqrt(h * h + D * D)
      var b2 = 1 - a * a - c * c
      if (b2 < 0) {
        a = (a < 0 ? -1 : 1) * Math.sqrt(1 - c * c)
        b2 = 0
      }
      var b = Math.sqrt(b2)
      var t = -h / c
      return [(a * rt[0] + b * fw[0]) * t, (a * rt[1] + b * fw[1]) * t, -h]
    }
    // câmera do model-viewer: depende só de onde ela está no chão (o celular não anda)
    function atualizaCameraMV() {
      var P = st.P
      var tc = alturaAlvo()
      var T = [P[0], P[1], P[2] + tc]
      var dh = Math.sqrt(P[0] * P[0] + P[1] * P[1])
      var r = Math.sqrt(dh * dh + T[2] * T[2])
      // câmera acima do alvo → elevação positiva
      var phi = 90 - Math.atan2(-T[2], dh) / GRAU
      // campo de visão que cabe a VIDA inteira (1,10 m × escala; braços abertos 0,91 m) com folga. O “scale” do
      // model-viewer escala só o modelo: alvo, órbita e hotspots continuam em metros do mundo
      var meia = 0.72 * st.s
      var f = opts.focal()
      var fov = Math.max(8, Math.min(75, (2 * Math.atan2(meia, r) * 1.12) / GRAU))
      // o quadrado só muda de tamanho quando precisa (−8 % a +30 % do ideal): redimensionar o canvas do model-viewer a
      // cada movimento do dedo custa caro e deixa o desenho um quadro atrás do transform
      var fovAgora = st.S ? (2 * Math.atan(st.S / 2 / f)) / GRAU : 0
      if (!st.S || f !== st.f || fovAgora < fov * 0.92 || fovAgora > fov * 1.3) st.S = Math.max(16, Math.round(2 * f * Math.tan((fov / 2) * GRAU)))
      st.f = f
      // o lado arredondado manda: o campo de visão sai dele, para a câmera do model-viewer ter a MESMA focal da tela
      st.fov = (2 * Math.atan(st.S / 2 / f)) / GRAU
      st.T = T
      var k = [phi.toFixed(4), r.toFixed(5), st.fov.toFixed(5), st.S, st.s.toFixed(4)].join('|')
      if (k === chave) return
      chave = k
      mv.style.width = st.S + 'px'
      mv.style.height = st.S + 'px'
      mv.cameraTarget = '0m ' + tc.toFixed(5) + 'm 0m'
      mv.cameraOrbit = '0deg ' + phi.toFixed(4) + 'deg ' + r.toFixed(5) + 'm'
      mv.fieldOfView = st.fov.toFixed(5) + 'deg'
      if (st.sModelo !== st.s && escalaModelo(mv, st.s)) st.sModelo = st.s
      if (typeof mv.jumpCameraToGoal === 'function') mv.jumpCameraToGoal()
    }
    // homografia elemento (px, origem no canto) → tela (px CSS)
    function homografia() {
      var f = opts.focal()
      var W = innerWidth
      var H = innerHeight
      var S = st.S
      var fw = giroNorm(st.T)
      var rt = giroNorm(giroCross(fw, [0, 0, 1]))
      var up = giroCross(rt, fw)
      // colunas: x, y e z da câmera do model-viewer, na Terra
      var M = [rt[0], up[0], -fw[0], rt[1], up[1], -fw[1], rt[2], up[2], -fw[2]]
      var A = [1 / f, 0, 0, 0, -1 / f, 0, 0, 0, -1]
      var B = [f, 0, 0, 0, -f, 0, 0, 0, -1]
      var Hm = giroMul(giroMul(giroMul(giroMul(B, F()), giroTr(st.R)), M), A)
      var T1 = [1, 0, W / 2, 0, 1, H / 2, 0, 0, 1]
      var T0 = [1, 0, -S / 2, 0, 1, -S / 2, 0, 0, 1]
      var G = giroMul(giroMul(T1, Hm), T0)
      if (G[8] < 0) G = G.map(function (v) {
        return -v
      })
      return G
    }
    function quadro(now) {
      if (!st.qAlvo) return
      if (opts.suave > 0 && now) {
        var dt = ultimoT ? Math.min(0.1, (now - ultimoT) / 1000) : 0.016
        st.q = giroSlerp(st.q, st.qAlvo, 1 - Math.exp(-dt / opts.suave))
      }
      ultimoT = now || 0
      st.R = giroQ2m(st.q)
      if (!st.P) st.P = posInicial()
      atualizaCameraMV()
      // atrás do celular (girou demais): esconde
      var Tc = giroVec(F(), giroVec(giroTr(st.R), st.T))
      var frente = Tc[2] < -0.05
      if (frente !== st.visivel) {
        st.visivel = frente
        mv.style.visibility = frente ? 'visible' : 'hidden'
      }
      if (opts.aoQuadro) opts.aoQuadro(frente)
      if (!frente) return
      var G = homografia()
      st.G = G
      var tf = 'matrix3d(' + [G[0], G[3], 0, G[6], G[1], G[4], 0, G[7], 0, 0, 1, 0, G[2], G[5], 0, G[8]].join(',') + ')'
      if (tf !== ultimoTf) {
        ultimoTf = tf
        mv.style.transform = tf
      }
    }
    function laco(now) {
      raf = requestAnimationFrame(laco)
      if (opts.suave > 0) quadro(now)
    }
    // onde um ponto da Terra cai na tela (px CSS), ou null atrás do celular
    function projetar(p) {
      if (!st.R) return null
      var f = opts.focal()
      var c = giroVec(F(), giroVec(giroTr(st.R), p))
      if (c[2] >= 0) return null
      return [innerWidth / 2 + (f * c[0]) / -c[2], innerHeight / 2 - (f * c[1]) / -c[2]]
    }
    return {
      estado: st,
      ligar: function () {
        if (ligada) return
        ligada = true
        window.addEventListener('deviceorientation', onOri)
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(laco)
      },
      desligar: function () {
        ligada = false
        window.removeEventListener('deviceorientation', onOri)
        cancelAnimationFrame(raf)
      },
      // de novo do zero (cada “Começar”)
      reiniciar: function () {
        st.R = st.q = st.qAlvo = st.P = st.G = null
        st.s = 1
        st.S = 0
        st.eventos = 0
        st.fixa = false
        st.visivel = false
        chave = ''
        ultimoTf = ''
        mv.style.visibility = 'hidden'
      },
      // presa à TELA (sem movimento): o celular “em pé, 8° para baixo”, fixo — arrastar e pinçar continuam valendo, no
      // mesmo chão virtual
      fixar: function () {
        st.fixa = true
        st.q = st.qAlvo = giroM2q(rotacaoTela(0, 82, 0, 0))
        quadro()
      },
      recentrar: function () {
        if (!st.qAlvo) return
        st.R = giroQ2m(st.q)
        st.P = posInicial()
        chave = ''
        quadro()
      },
      // arrastar: o ponto do chão sob o dedo anda junto
      chaoSob: chaoSob,
      moverPara: function (P) {
        var d = Math.sqrt(P[0] * P[0] + P[1] * P[1])
        var k = d ? Math.max(GIRO_DIST_MIN, Math.min(GIRO_DIST_MAX, d)) / d : 1
        st.P = [P[0] * k, P[1] * k, P[2]]
        quadro()
      },
      escala: function (s) {
        st.s = Math.max(0.5, Math.min(1.6, s))
        quadro()
      },
      // a tela ou a câmera mudou de tamanho (girou o celular, chegou o vídeo): a focal muda, ela fica no mesmo lugar
      refaz: function () {
        chave = ''
        quadro()
      },
      projetar: projetar,
    }
  }

  /**
   * Distância focal (px CSS) da imagem da câmera como ela aparece na tela (object-fit: cover). fovLongo = campo de visão
   * do LADO MAIOR do vídeo (graus). Sem vídeo: fovV (vertical) da tela.
   */
  function focalDaCamera(video, fovLongo, fovVSemVideo) {
    var W = innerWidth
    var H = innerHeight
    var vw = video && video.videoWidth
    var vh = video && video.videoHeight
    if (vw && vh) {
      var k = Math.max(W / vw, H / vh)
      return (k * (Math.max(vw, vh) / 2)) / Math.tan((fovLongo / 2) * GRAU)
    }
    return H / 2 / Math.tan(((fovVSemVideo || 60) / 2) * GRAU)
  }

  /**
   * Desenha a imagem do elemento (PNG do model-viewer) na foto com a MESMA homografia da tela (WebGL: perspectiva certa,
   * o que um drawImage não faz). Devolve false sem WebGL.
   */
  function desenhaComHomografia(ctx, img, G, S, W, H, k) {
    var cv = document.createElement('canvas')
    cv.width = Math.round(W * k)
    cv.height = Math.round(H * k)
    var gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true })
    if (!gl) return false
    var vs =
      'attribute vec2 p; uniform mat3 G; uniform vec2 tela; uniform float S; varying vec2 uv;' +
      'void main(){ vec3 q = G * vec3(p * S, 1.0); uv = p;' +
      ' gl_Position = vec4(q.x / tela.x * 2.0 - q.z, q.z - q.y / tela.y * 2.0, 0.0, q.z); }'
    var fs = 'precision mediump float; uniform sampler2D t; varying vec2 uv; void main(){ gl_FragColor = texture2D(t, uv); }'
    function sh(tipo, src) {
      var s = gl.createShader(tipo)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    var pr = gl.createProgram()
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs))
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(pr)
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false
    gl.useProgram(pr)
    var b = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
    var loc = gl.getAttribLocation(pr, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    // mat3 do GLSL é por coluna
    gl.uniformMatrix3fv(gl.getUniformLocation(pr, 'G'), false, new Float32Array([G[0], G[3], G[6], G[1], G[4], G[7], G[2], G[5], G[8]]))
    gl.uniform2f(gl.getUniformLocation(pr, 'tela'), W, H)
    gl.uniform1f(gl.getUniformLocation(pr, 'S'), S)
    var tx = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tx)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.viewport(0, 0, cv.width, cv.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    ctx.drawImage(cv, 0, 0, W, H)
    // um contexto WebGL por foto: solta já (o navegador limita quantos ficam abertos). 13/10 (verificação r2): e a memória
    // do canvas (o Safari tem um teto de memória de canvas por página: cada foto criava um de 780×1688)
    var perde = gl.getExtension('WEBGL_lose_context')
    if (perde) perde.loseContext()
    cv.width = 0
    cv.height = 0
    return true
  }

  // ------------------------------------------------------------------ “A VIDA no seu mundo” (13/10/2026)
  // O modo foto virou a RA da própria página — o caminho principal no iPhone, onde a RA nativa (Quick Look) não deixa a
  // página falar: câmera traseira ao fundo e a VIDA (2º model-viewer) presa no chão pela âncora do giroscópio.
  // Entrada com “Começar”: o toque libera, NELE e antes de qualquer espera, o som (play mudo + sessão de áudio
  // 'playback'), o movimento (requestPermission, iPhone) e a câmera (só vídeo, traseira — nunca o microfone); com tudo
  // pronto ela diz o “Olá”. Sem evento de movimento em 1,5 s (negado, sem sensor): presa à tela, no mesmo chão virtual;
  // sem câmera: fundo de parque e presa à tela. “Tirar a foto”: vem → idle → 3-2-1 → no “Xis” a foto (quadro da câmera +
  // o render 3D pela MESMA homografia da tela) → prévia → “Ficou demais!”. Salvar: no Android baixa sozinha
  // (foto-com-a-vida-AAAAMMDD-HHMMSS.jpg, na pasta Download, que a Galeria mostra); no iPhone pelo menu de compartilhar
  // (“Salvar imagem”, 2º toque) ou tocando e segurando a foto — um <a download> no iPhone grava em Arquivos, não nas Fotos.
  // Parâmetros de campo: ?calibrar=1 (régua), ?fov= (graus do lado maior da câmera traseira; padrão 68), ?fovf=
  // (frontal; 72), ?altura= (m do celular ao chão; 1,4), ?suave= (s; 0 = sem suavizar, para os testes).
  function setupFoto(mv, cfg, speak, prime, stopSpeech, wait) {
    var box = document.querySelector('[data-foto]')
    var openers = document.querySelectorAll('[data-foto-open]')
    if (!box || !openers.length) return null
    function q(s) {
      return box.querySelector(s)
    }
    var cam = q('[data-foto-cam]')
    var holder = q('[data-foto-vida]')
    var lado = q('[data-foto-lado]')
    var flash = q('[data-foto-flash]')
    var msg = q('[data-foto-msg]')
    var count = q('[data-foto-count]')
    var shoot = q('[data-foto-shoot]')
    var ouvir = q('[data-foto-ouvir]')
    var inicio = q('[data-foto-inicio]')
    var prev = q('[data-foto-prev]')
    var img = q('[data-foto-img]')
    var save = q('[data-foto-save]')
    var share = q('[data-foto-share]')
    var galeria = q('[data-foto-galeria]')
    var aviso = q('[data-foto-aviso]')
    var dica = q('[data-foto-dica]')
    var again = q('[data-foto-again]')
    var ua = navigator.userAgent
    var iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    var android = /Android/i.test(ua)
    var QS = window.URLSearchParams ? new URLSearchParams(location.search) : null
    function param(k, d, zero) {
      var v = QS && QS.has(k) ? parseFloat(QS.get(k)) : NaN
      return isFinite(v) && (v > 0 || (zero && v === 0)) ? v : d
    }
    // campo de visão do lado MAIOR da imagem da câmera (graus): nenhuma API informa; a grande-angular do iPhone (26 mm
    // equivalentes) fica em ~67–70°. Com 10% de erro ela escorrega 13–16 px a cada 10° de giro (ra-mundo-sensibilidade)
    var calib = { fov: param('fov', 68), fovf: param('fovf', 72), altura: param('altura', 1.4) }
    var SUAVE = param('suave', 0.06, true)
    var CALIBRAR = !!(QS && QS.has('calibrar'))
    var ESPERA_GIRO_MS = 1500
    var MSG = {
      prepara: 'Preparando a câmera…',
      giro: 'Gire o celular: ela fica no lugar. Arraste para levá-la; abra ou feche dois dedos para mudar o tamanho.',
      tela: 'Sem o movimento do celular: arraste a VIDA para o lugar; abra ou feche dois dedos para mudar o tamanho.',
      semCam: 'Sem câmera: libere a câmera para este site. A VIDA aparece mesmo assim.',
    }
    // 13/10 (verificação r1): presa ao mundo, ela pode ficar fora da tela (o celular apontado para o chão quando ela
    // aparece, para o céu ou para o lado): a mensagem diz para onde mover o celular e volta à de sempre quando ela aparece
    var MSG_ENQ = {
      cima: 'Levante o celular: a VIDA está à sua frente.',
      baixo: 'Abaixe um pouco o celular para ver os pés da VIDA.',
      lado: 'Vire o celular até achar a VIDA, ou toque em “Colocar na minha frente”.',
    }
    var facing = 'environment'
    var stream = null
    var camOk = false
    var mvf = null
    var ancora = null
    var run = 0
    // cada abertura ou “Começar” invalida as promessas da anterior (permissões, câmera, modelo)
    var sessao = 0
    // já passou pelo “Começar” nesta página: as próximas aberturas pedem tudo no próprio toque que abre
    var comecou = false
    // 'giro' (presa ao mundo) ou 'tela' (presa à tela)
    var modo = ''
    var lastUrl = null
    var arquivo = null
    var opener = null
    var falandoOla = false
    // para os testes (scripts/ra-mundo.mjs) e para quem abrir esta tela por código: o botão de RA do iPhone (com o toque,
    // e = o evento, para devolver o foco a ele ao fechar) e o 📸 da RA do Android ({ direto, foto }: sem a tela de entrada
    // e já com a sequência)
    var api = {
      ancora: null,
      capturar: function (tipo) {
        return capture(tipo)
      },
      abrir: function (op, e) {
        open(e || null, op)
      },
      modo: function () {
        return modo
      },
    }
    box.__mundo = api

    function say(t) {
      if (msg) msg.textContent = t || ''
    }
    function fase(f) {
      box.setAttribute('data-fase', f || '')
    }
    function msgModo() {
      return !camOk ? MSG.semCam : modo === 'giro' ? MSG.giro : MSG.tela
    }

    // tocador de clipes do 2º visualizador (sem o giro e a câmera do palco)
    var player = {
      viewer: null,
      watch: 0,
      // a fala anima aqui mesmo com o movimento do palco parado (speak)
      semPalco: true,
      play: function (clip, done, loop) {
        var v = mvf
        if (!v) return done && done()
        cancelAnimationFrame(player.watch)
        // 13/10: laço que já é o atual (“Tirar outra”, fechar): nada a fazer. Antes, preparaClipe zerava o
        // idle que estava tocando com peso 1 (cabeça saltando até 16°, conforme a fase)
        // mistura da próxima troca pedida por quem chama (ex.: 450 ms do Xis para o “Ficou demais!”); vale só para esta
        // chamada, mesmo que ela não troque nada
        var fade = player.nextFade
        player.nextFade = 0
        if (loop && v.animationName === clip && !v.paused) return
        v.animationCrossfadeDuration = fade || (loop ? 300 : 160)
        if (!preparaClipe(v, clip)) {
          try {
            v.currentTime = 0
          } catch (e) {}
        }
        v.animationName = clip
        var opts = loop ? { repetitions: Infinity } : { repetitions: 1, pingpong: false }
        v.play(opts)
        ;(v.updateComplete || Promise.resolve()).then(function () {
          if (v.animationName === clip) v.play(opts)
        })
        if (loop) return
        player.watch = requestAnimationFrame(function tick() {
          var d = v.duration || 0
          if (v.animationName !== clip) return
          if (d && v.currentTime >= d - 1 / 30) {
            done && done()
            return
          }
          player.watch = requestAnimationFrame(tick)
        })
      },
      // 13/10 (verificação r2): a ação do clipe quando ele é o atual, tocando e com peso (a speak espera o rabo dele antes de
      // recomeçá-lo) e a volta ao laço numa pausa vinda de fora
      acaoAtual: function (clip) {
        var v = mvf
        if (!v || v.paused || v.animationName !== clip) return null
        var a = acaoDe(v, clip)
        return a && a.getEffectiveWeight() >= 0.5 ? a : null
      },
      laco: function () {
        player.play('idle', null, true)
      },
    }

    function focal() {
      if (camOk && cam.videoWidth) return focalDaCamera(cam, facing === 'user' ? calib.fovf : calib.fov, 60)
      return focalDaCamera(null, 0, 60)
    }

    function makeViewer() {
      if (mvf) return mvf
      mvf = document.createElement('model-viewer')
      var attrs = {
        src: mv.getAttribute('src'),
        alt: 'A VIDA',
        'camera-orbit': '0deg 75deg 2.5m',
        'camera-target': '0m 0.55m 0m',
        'field-of-view': '30deg',
        // a câmera do model-viewer vai aonde a âncora mandar (qualquer altura, distância e campo de visão)
        'min-camera-orbit': '-Infinity 0deg 0.1m',
        'max-camera-orbit': 'Infinity 180deg 100m',
        'min-field-of-view': '1deg',
        'max-field-of-view': '120deg',
        'interaction-prompt': 'none',
        'disable-zoom': '',
        'disable-pan': '',
        'disable-tap': '',
        'environment-image': mv.getAttribute('environment-image') || 'neutral',
        'tone-mapping': 'neutral',
        exposure: mv.getAttribute('exposure') || '0.8',
        // sombra de contato no chão dela (desenhada pelo model-viewer no plano do chão: segue a homografia junto)
        'shadow-intensity': '1',
        'shadow-softness': '0.5',
        'animation-name': 'idle',
        autoplay: '',
        loading: 'eager',
        reveal: 'auto',
      }
      for (var k in attrs) mvf.setAttribute(k, attrs[k])
      mvf.setAttribute('aria-hidden', 'true')
      mvf.style.visibility = 'hidden'
      // ponto dos pés (chão do modelo, 0 m): referência para medir (scripts/ra-mundo.mjs)
      var pes = document.createElement('span')
      pes.setAttribute('slot', 'hotspot-pes')
      pes.setAttribute('data-position', '0m 0m 0m')
      pes.setAttribute('data-visibility-attribute', 'visible')
      pes.style.cssText = 'display:block;width:2px;height:2px;pointer-events:none'
      mvf.appendChild(pes)
      holder.appendChild(mvf)
      player.viewer = mvf
      ancora = criarAncora({
        mv: mvf,
        focal: focal,
        altura: function () {
          return calib.altura
        },
        frontal: function () {
          return facing === 'user' && camOk
        },
        suave: SUAVE,
        // ela nasce um pouco à esquerda: o lugar da pessoa (à direita de quem olha) cabe na tela
        xIni: 0.36,
        yIni: 0.74,
        aoQuadro: function () {
          if (ladoAberto()) posLado()
          enquadrar()
        },
        aoGirar: function () {
          modo = 'giro'
          box.setAttribute('data-modo', modo)
          if (!box.getAttribute('data-fase')) say(msgModo())
        },
      })
      api.ancora = ancora
      // no modo foto ela olha para o celular (a câmera do model-viewer está no celular)
      setupOlhar(mvf)
      return mvf
    }

    function vidaPronta() {
      return new Promise(function (res) {
        if (!mvf || mvf.loaded) return res()
        mvf.addEventListener('load', function () {
          res()
        }, { once: true })
        // modelo com erro: segue sem ela (a câmera, a voz e a legenda funcionam)
        mvf.addEventListener('error', function () {
          res()
        }, { once: true })
      })
    }

    // o lugar da pessoa: ao lado ESQUERDO dela (à direita de quem olha), a 0,6 m, no mesmo chão — o tracejado é a caixa
    // de uma pessoa de 1,6 m ali, vista do celular
    function ladoAberto() {
      var f = box.getAttribute('data-fase')
      return f === 'chamar' || f === 'espera'
    }
    function posLado() {
      var st = ancora && ancora.estado
      if (!st || !st.P || !st.R) return
      var dx = giroVec(st.R, [1, 0, 0])
      var h = giroNorm([dx[0], dx[1], 0])
      var p = [st.P[0] + h[0] * 0.6, st.P[1] + h[1] * 0.6, st.P[2]]
      var a = ancora.projetar(p)
      var b = ancora.projetar([p[0], p[1], p[2] + 1.6])
      if (!a || !b || a[1] - b[1] < 30) {
        lado.style.visibility = 'hidden'
        return
      }
      var alto = a[1] - b[1]
      var larg = alto * 0.38
      // dentro da tela (com ela perto da borda direita o tracejado e o “Fique aqui” saíam cortados), sem passar dos pés
      var pe = ancora.projetar(st.P)
      var x0 = Math.min(a[0] - larg / 2, innerWidth - larg - 6)
      if (pe) x0 = Math.max(x0, pe[0] + 12)
      lado.style.visibility = ''
      lado.style.width = larg.toFixed(0) + 'px'
      lado.style.height = alto.toFixed(0) + 'px'
      lado.style.transform = 'translate(' + x0.toFixed(1) + 'px,' + b[1].toFixed(1) + 'px)'
    }

    // fora da tela? (presa ao mundo, fora da sequência da foto): pés e cabeça projetados; a barra de baixo (“Ouvir”,
    // “Tirar a foto”) conta como fora. A altura da barra é lida só quando a tela muda (ler a cada quadro forçaria o layout)
    var barra = q('.ra-foto__bottom')
    var barraY = 0
    // 13/10 (verificação r2): a legenda de uma fala também esconde os pés (o celular apontado para cima: ela nasce a 4,5 m
    // com os pés atrás da legenda do “Olá”). O topo dela é lido só quando o texto muda
    var legenda = q('[data-legenda]')
    var legTxt = null
    var legY = 0
    function enquadrar() {
      if (modo !== 'giro' || box.getAttribute('data-fase') || !msg) return
      var st = ancora && ancora.estado
      if (!st || !st.P || !st.R) return
      if (!barraY) barraY = barra ? barra.getBoundingClientRect().top : innerHeight
      var pe = ancora.projetar(st.P)
      var cab = ancora.projetar([st.P[0], st.P[1], st.P[2] + 1.1 * st.s])
      var lim = barraY
      var lt = legenda && legenda.textContent
      if (lt) {
        if (lt !== legTxt) {
          legTxt = lt
          legY = legenda.getBoundingClientRect().top
        }
        // mais de 24 px atrás da legenda (encostar nela não conta)
        if (legY > 0) lim = Math.min(lim, legY + 24)
      }
      var k = ''
      if (!st.visivel || !pe || !cab || Math.max(pe[0], cab[0]) < 0 || Math.min(pe[0], cab[0]) > innerWidth) k = 'lado'
      else if (cab[1] < 0) k = 'cima'
      else if (pe[1] > lim) k = 'baixo'
      var t = k ? MSG_ENQ[k] : msgModo()
      if (msg.textContent !== t) say(t)
    }

    // arrastar (1 dedo: o chão sob o dedo anda junto) e pinçar (2 dedos: tamanho)
    var pts = {}
    var g0 = null
    function gesto() {
      var ids = Object.keys(pts)
      var n = ids.length
      var cx = 0
      var cy = 0
      ids.forEach(function (id) {
        cx += pts[id].x / n
        cy += pts[id].y / n
      })
      var d = n >= 2 ? Math.hypot(pts[ids[0]].x - pts[ids[1]].x, pts[ids[0]].y - pts[ids[1]].y) : 0
      var st = ancora && ancora.estado
      return { n: n, cx: cx, cy: cy, d: d, P: st && st.P ? st.P.slice() : null, s: st ? st.s : 1, H: st && st.R && n ? ancora.chaoSob(cx, cy) : null }
    }
    holder.addEventListener('pointerdown', function (e) {
      if (!ancora || !ancora.estado.P || box.getAttribute('data-fase') === 'contagem') return
      try {
        holder.setPointerCapture(e.pointerId)
      } catch (er) {}
      pts[e.pointerId] = { x: e.clientX, y: e.clientY }
      g0 = gesto()
    })
    holder.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId] || !g0 || !g0.P) return
      pts[e.pointerId] = { x: e.clientX, y: e.clientY }
      var g = gesto()
      if (g.n !== g0.n) {
        g0 = g
        return
      }
      if (g.n === 1 && g0.H && g.H) ancora.moverPara([g0.P[0] + g.H[0] - g0.H[0], g0.P[1] + g.H[1] - g0.H[1], g0.P[2]])
      if (g.n >= 2 && g0.d > 0) ancora.escala(g0.s * (g.d / g0.d))
    })
    function solta(e) {
      delete pts[e.pointerId]
      g0 = gesto()
    }
    holder.addEventListener('pointerup', solta)
    holder.addEventListener('pointercancel', solta)
    holder.addEventListener('wheel', function (e) {
      e.preventDefault()
      if (ancora && ancora.estado.P) ancora.escala(ancora.estado.s * (e.deltaY < 0 ? 1.06 : 0.94))
    }, { passive: false })

    function pedirMovimento() {
      var D = window.DeviceOrientationEvent
      // iPhone/iPad (iOS 13+): só pergunta dentro de um toque e guarda a resposta na aba (negada, não pergunta de novo)
      if (D && typeof D.requestPermission === 'function') {
        try {
          return Promise.resolve(D.requestPermission()).then(function (r) {
            return r === 'granted'
          }, function () {
            return false
          })
        } catch (e) {
          return Promise.resolve(false)
        }
      }
      return Promise.resolve(!!D)
    }
    // tentativas: novas tentativas (a cada 0,5 s) se a câmera estiver ocupada — 13/10 (verificação r1): vindo do 📸 da RA
    // do Android, o ARCore pode ainda não ter soltado a câmera depois dos 400 ms (NotReadableError/AbortError), e a foto
    // saía com o fundo de parque e era baixada assim mesmo
    function startCam(tentativas) {
      stopCam()
      box.setAttribute('data-facing', facing)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve(false)
      var tok = sessao
      return pedeCam(tok, tentativas || 0)
    }
    function pedeCam(tok, resta) {
      var p
      try {
        // só o vídeo: pedir o microfone mudaria a sessão de áudio do iPhone (e a voz dela)
        p = navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      } catch (e) {
        return Promise.resolve(false)
      }
      return p
        .then(function (s) {
          // fechou (ou recomeçou) enquanto o aparelho pedia a câmera: desliga o que chegou atrasado
          if (tok !== sessao || box.hidden) {
            s.getTracks().forEach(function (t) {
              t.stop()
            })
            return false
          }
          stream = s
          cam.srcObject = s
          vigiaCam(s, tok)
          var pp = cam.play()
          return pp && pp.then
            ? pp.then(function () {
                return true
              }, function () {
                return true
              })
            : true
        })
        .catch(function (e) {
          var ocupada = e && /NotReadable|Abort|TrackStart/.test(e.name || '')
          if (!ocupada || resta <= 0 || tok !== sessao || box.hidden) return false
          return wait(500).then(function () {
            return tok === sessao && !box.hidden ? pedeCam(tok, resta - 1) : false
          })
        })
    }
    function stopCam() {
      if (stream) stream.getTracks().forEach(function (t) { t.stop() })
      stream = null
      cam.srcObject = null
    }
    // 13/10 (verificação r2): a câmera tomada por outro app, ou perdida na volta do segundo plano (o track termina): a
    // página não percebia — fundo preto, a mensagem de sempre, e a foto sairia sem a câmera. Agora pede a câmera de novo
    // (até 2 novas tentativas); sem ela, o fundo de parque com a mensagem de sem câmera, como no começo
    function vigiaCam(s, tok) {
      var tr = s.getVideoTracks && s.getVideoTracks()[0]
      if (!tr || !tr.addEventListener) return
      tr.addEventListener('ended', function () {
        if (tok === sessao && !box.hidden && stream === s) religaCam()
      })
    }
    var religando = false
    function religaCam() {
      if (religando) return
      religando = true
      var minha = sessao
      if (!box.getAttribute('data-fase')) say('Religando a câmera…')
      startCam(2).then(function (ok) {
        religando = false
        if (minha !== sessao || box.hidden) return
        camOk = ok
        if (!ok) {
          modo = 'tela'
          if (ancora) {
            ancora.desligar()
            ancora.fixar()
          }
        }
        box.setAttribute('data-modo', modo)
        if (!box.getAttribute('data-fase')) say(msgModo())
      })
    }
    // 13/10 (verificação r2): as 4 vozes baixadas já no “Começar” (e na abertura pelo 📸), ~150 KB: a sequência da foto
    // não depende da rede na hora (o MP3 da contagem preso na rede congelava a foto). Vão para o cache HTTP do navegador; o
    // <audio> continua com o mesmo endereço. Se ainda assim a voz não começar, a fala segue sem som (VOZ_ESPERA_MS, setupFala)
    var vozesPedidas = false
    function precarregaVozes() {
      if (vozesPedidas || !window.fetch || !cfg || !cfg.falas) return
      vozesPedidas = true
      Object.keys(cfg.falas).forEach(function (k) {
        var src = cfg.falas[k] && cfg.falas[k].src
        if (!src) return
        try {
          fetch(src, { credentials: 'same-origin' })
            .then(function (r) {
              if (!r.ok) throw new Error(String(r.status))
              return r.blob()
            })
            .catch(function () {
              // na próxima abertura tenta de novo
              vozesPedidas = false
            })
        } catch (e) {
          vozesPedidas = false
        }
      })
    }

    function open(e, op) {
      op = op || {}
      opener = e && e.currentTarget
      prime()
      stopSpeech()
      run++
      box.hidden = false
      document.documentElement.classList.add('ra-foto-aberta')
      prev.hidden = true
      box.removeAttribute('data-foto-pronta')
      count.textContent = ''
      say('')
      makeViewer()
      // já passou pelo “Começar” (ou veio por código, sem tela de entrada): este toque mesmo pede tudo de novo
      if (comecou || op.direto) return comecar(op)
      fase('inicio')
      inicio.hidden = false
      var b = q('[data-foto-comecar]')
      if (b) b.focus()
    }
    function comecar(op) {
      op = op || {}
      var minha = ++sessao
      comecou = true
      // 1) som, 2) movimento, 3) câmera: tudo AQUI, antes de qualquer espera — o iPhone só pergunta pelo movimento (e só
      // libera a voz) dentro do toque, e a ativação do toque não sobrevive a um await
      prime()
      var pOri = pedirMovimento()
      // vindo do 📸 da RA (direto + foto): a câmera pode estar saindo do ARCore — até 3 novas tentativas
      var pCam = startCam(op.direto && op.foto ? 3 : 0)
      precarregaVozes()
      inicio.hidden = true
      fase('preparando')
      shoot.disabled = true
      ouvir.disabled = true
      shoot.classList.remove('is-hint')
      say(MSG.prepara)
      ancora.desligar()
      ancora.reiniciar()
      Promise.all([pOri, pCam, vidaPronta()]).then(function (r) {
        if (minha !== sessao || box.hidden) return
        camOk = !!r[1]
        if (!camOk) stopCam()
        // sem câmera o fundo fica parado: ela também (girar com ela por cima de um fundo fixo não faz sentido)
        if (!camOk || !r[0]) {
          modo = 'tela'
          ancora.fixar()
          return pronta(minha, op)
        }
        ancora.ligar()
        var t0 = performance.now()
        ;(function espera() {
          if (minha !== sessao || box.hidden) return
          if (ancora.estado.eventos > 0) {
            modo = 'giro'
            return pronta(minha, op)
          }
          if (performance.now() - t0 > ESPERA_GIRO_MS) {
            // nenhum evento (sem sensor, ou o navegador não manda): presa à tela no mesmo chão virtual; se o sensor
            // responder depois, ela passa a ficar no mundo (aoGirar)
            modo = 'tela'
            ancora.fixar()
            return pronta(minha, op)
          }
          requestAnimationFrame(espera)
        })()
      })
    }
    function pronta(minha, op) {
      fase('')
      box.setAttribute('data-modo', modo)
      shoot.disabled = false
      ouvir.disabled = false
      say(msgModo())
      if (op && op.foto) return sequence()
      // ela se apresenta logo depois de aparecer
      var r0 = run
      setTimeout(function () {
        if (minha !== sessao || r0 !== run || box.hidden) return
        falarOla()
      }, 600)
    }
    function falarOla() {
      falandoOla = true
      return speak('ola', player).then(function (ok) {
        falandoOla = false
        if (ok && !box.hidden && !shoot.disabled) {
          shoot.classList.add('is-hint')
          setTimeout(function () {
            shoot.classList.remove('is-hint')
          }, 4000)
        }
        return ok
      })
    }
    function close() {
      fechouEm = performance.now()
      run++
      sessao++
      stopSpeech()
      stopCam()
      camOk = false
      if (ancora) ancora.desligar()
      box.hidden = true
      document.documentElement.classList.remove('ra-foto-aberta')
      fase('')
      // 13/10 (verificação r2): de volta ao laço SEM mistura (1 ms; o player.play ignora o 0). Com a caixa escondida o
      // model-viewer não desenha e o misturador congela no meio da mistura de 300 ms (idle 0,06, a fala 0,94): ao reabrir
      // (o 📸 da RA, qualquer rota), ela aparecia ~0,3 s na pose da fala antiga e o “vem”, entrando no meio da mistura,
      // fazia o idle saltar de 0,5 para 0,9 num quadro (mão 25–28°)
      if (mvf) {
        player.nextFade = 1
        player.play('idle', null, true)
        soClipe(mvf, 'idle')
      }
      if (opener && opener.focus) opener.focus()
    }

    // a foto: quadro da câmera (cobrindo a tela, como na prévia) + o render 3D da VIDA pela mesma homografia da tela.
    // NUNCA mv.pause() antes do toBlob (com a animação pausada ele devolve um recorte errado — estudo, _dbg_toblob.png).
    // tipo: JPEG (padrão); 'image/png' só para os testes compararem sem a perda do JPEG
    function capture(tipo) {
      var W = window.innerWidth
      var H = window.innerHeight
      var k = Math.min(2, 2048 / Math.max(W, H), window.devicePixelRatio || 1)
      var cv = document.createElement('canvas')
      cv.width = Math.round(W * k)
      cv.height = Math.round(H * k)
      var cx = cv.getContext('2d')
      cx.scale(k, k)
      var vw = cam.videoWidth
      var vh = cam.videoHeight
      if (stream && vw && vh) {
        var sc = Math.max(W / vw, H / vh)
        var dw = vw * sc
        var dh = vh * sc
        cx.save()
        if (facing === 'user') {
          cx.translate(W, 0)
          cx.scale(-1, 1)
        }
        cx.drawImage(cam, (W - dw) / 2, (H - dh) / 2, dw, dh)
        cx.restore()
      } else {
        var gr = cx.createRadialGradient(W / 2, H * 0.3, 10, W / 2, H * 0.3, Math.max(W, H))
        gr.addColorStop(0, '#6f8f63')
        gr.addColorStop(0.7, '#2c3d2b')
        cx.fillStyle = gr
        cx.fillRect(0, 0, W, H)
      }
      var st = ancora && ancora.estado
      var G = st && st.G && st.visivel ? st.G.slice() : null
      var S = st ? st.S : 0
      var blobP = mvf && typeof mvf.toBlob === 'function' ? mvf.toBlob({ mimeType: 'image/png' }) : Promise.reject()
      return blobP
        .then(function (b) {
          return loadImg(URL.createObjectURL(b))
        })
        .then(function (im) {
          if (G && !desenhaComHomografia(cx, im, G, S, W, H, k)) {
            // sem WebGL para a homografia: aproxima pela caixa do elemento na tela
            var r = mvf.getBoundingClientRect()
            cx.drawImage(im, r.left, r.top, r.width, r.height)
          }
          URL.revokeObjectURL(im.src)
        })
        .catch(function () {})
        .then(function () {
          // assinatura discreta no canto
          cx.font = '600 ' + Math.round(Math.min(22, Math.max(12, W * 0.032))) + 'px "Inter Tight", system-ui, sans-serif'
          cx.fillStyle = 'rgba(255,255,255,0.88)'
          cx.shadowColor = 'rgba(0,0,0,0.5)'
          cx.shadowBlur = 6
          cx.textAlign = 'right'
          cx.fillText('Eu e a VIDA · Expedição Parques GO', W - 14, H - 16)
          // 13/10: JPEG 0,95 (era 0,9): é a foto que a pessoa guarda; com 0,9 a perda do JPEG sozinha já punha a foto a
          // 2,1/255 da tela (scripts/ra-mundo.mjs), com 0,95 fica abaixo de 2
          return new Promise(function (res) {
            cv.toBlob(function (b) {
              // 13/10 (verificação r2): solta a memória do canvas da foto (teto de memória de canvas do Safari)
              cv.width = 0
              cv.height = 0
              res(b)
            }, tipo || 'image/jpeg', 0.95)
          })
        })
    }
    // depois de 2 quadros (o 1º desenha o que acabou de mudar); com a página escondida o rAF para: no máximo 250 ms
    function doisQuadros() {
      return new Promise(function (res) {
        var t = setTimeout(res, 250)
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            clearTimeout(t)
            res()
          })
        })
      })
    }
    function loadImg(src) {
      return new Promise(function (res, rej) {
        var im = new Image()
        im.onload = function () {
          res(im)
        }
        im.onerror = rej
        im.src = src
      })
    }

    function baixar(nome) {
      var a = document.createElement('a')
      a.href = lastUrl
      a.download = nome
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(function () {
        if (a.parentNode) a.parentNode.removeChild(a)
      }, 0)
    }
    // devolve uma promessa: a prévia aparece com a foto já decodificada
    function showPhoto(blob) {
      if (!blob) return Promise.resolve()
      if (lastUrl) URL.revokeObjectURL(lastUrl)
      lastUrl = URL.createObjectURL(blob)
      var nome = nomeDaFoto()
      img.src = lastUrl
      save.href = lastUrl
      save.setAttribute('download', nome)
      arquivo = null
      try {
        arquivo = new File([blob], nome, { type: 'image/jpeg' })
      } catch (e) {}
      var podeShare = !!(arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] }))
      // iPhone: as Fotos só pelo menu de compartilhar (“Salvar imagem”) ou tocando e segurando a foto. Android: a foto
      // já baixou (pasta Download, que a Galeria mostra) e “Compartilhar” vai para o WhatsApp, Instagram… Computador:
      // “Salvar” e, se houver, “Compartilhar”
      galeria.hidden = !(iOS && podeShare)
      share.hidden = iOS || !podeShare
      save.hidden = iOS
      var rot = save.querySelector('span')
      if (rot) rot.textContent = android ? 'Baixar de novo' : 'Salvar'
      save.classList.toggle('ra-foto__btn--ghost', android)
      dica.textContent = iOS
        ? podeShare
          ? 'Toque em “Salvar na galeria” e depois em “Salvar imagem”. Ou toque e segure a foto → “Adicionar às Fotos”.'
          : 'Toque e segure a foto → “Adicionar às Fotos”.'
        : ''
      var dec = img.decode ? img.decode().catch(function () {}) : Promise.resolve()
      return dec.then(function () {
        // fechou enquanto a foto decodificava: a próxima abertura recomeça do zero
        if (box.hidden) return
        aviso.hidden = true
        prev.hidden = false
        box.setAttribute('data-foto-pronta', '')
        if (android) {
          // cada foto nasce de um toque (“Tirar a foto”), que reabre o limite de downloads automáticos do Chrome
          baixar(nome)
          aviso.textContent = 'Foto salva — está na Galeria (pasta Download).'
          aviso.hidden = false
        }
      })
    }
    // o arquivo já está pronto ANTES do toque: o share() sai na hora, dentro da ativação do toque (WebKit: 5 s)
    galeria.addEventListener('click', function () {
      if (!arquivo || !navigator.share) return
      navigator.share({ files: [arquivo] }).catch(function () {})
    })
    share.addEventListener('click', function () {
      if (!arquivo || !navigator.share) return
      navigator.share({ files: [arquivo], title: 'Eu e a VIDA', text: 'Foto com a VIDA · Expedição Parques GO' }).catch(function () {})
    })

    function sequence() {
      var my = ++run
      function alive() {
        return my === run && !box.hidden
      }
      shoot.disabled = true
      ouvir.disabled = true
      shoot.classList.remove('is-hint')
      prev.hidden = true
      box.removeAttribute('data-foto-pronta')
      fase('chamar')
      say('Fique ao lado da VIDA, no tracejado')
      posLado()
      return speak('vem', player)
        .then(function () {
          if (!alive()) return
          fase('espera')
          say('Prepare-se…')
          // 13/10: na espera ela respira (antes ficava CONGELADA 2,6 s no último quadro do “vem”)
          player.play('idle', null, true)
          return wait(2600)
        })
        .then(function () {
          if (!alive()) return
          fase('contagem')
          say('')
          var shot = null
          return speak('contagem', player, function (t, last) {
            var n = t < 3.1 ? -1 : t < 4.6 ? 3 : t < 6.6 ? 2 : t < 8.4 ? 1 : 0
            if (n !== last) count.textContent = n > 0 ? String(n) : n === 0 ? 'Xis!' : ''
            if (!shot && t >= (cfg.xis || 8.6) + 0.35) {
              shot = capture().then(function (b) {
                flash.classList.remove('is-on')
                void flash.offsetWidth
                flash.classList.add('is-on')
                return b
              })
            }
            return n
          }).then(function () {
            return shot
          })
        })
        .then(function (blob) {
          count.textContent = ''
          if (!alive()) return
          // 13/10 (verificação r1): a contagem acabou SEM foto (a voz foi pausada de fora antes do Xis: ligação, Siri, fone
          // Bluetooth que caiu) — antes ela dizia “Ficou demais! Obrigada!” sem foto nenhuma e a tela ficava sem mensagem.
          // Agora volta à tela ao vivo, pronta para tentar de novo
          if (!blob) {
            fase('')
            player.play('idle', null, true)
            say(msgModo())
            return
          }
          fase('pronta')
          // 13/10: a pose e o “ficou” entravam no MESMO quadro: o fadeOut da pose recém-pedida recomeçava do
          // peso 1 (salto de 7° num quadro) e os braços iam da pose ao ficou em 160 ms. Agora só o “ficou”, com 450 ms
          say('')
          // 13/10 (verificação r1): a prévia (a foto de 780×1688 decodificada e pintada) aparecia no mesmo instante em que o
          // “ficou” começava: quadros de 100–130 ms logo depois dela em 6 de 10 gravações (a VIDA parada no meio da mistura e
          // depois alcançando de uma vez). Agora a foto é decodificada antes (img.decode, fora da thread principal) e o
          // “ficou” começa com a prévia já na tela
          // 13/10 (verificação r2): e só 2 quadros depois de a prévia aparecer — o quadro que a desenha (com o download, no
          // Android) levava 100–140 ms bem quando a voz começava: o clipe, esperando a voz, ficava 0,09 s para trás e levava
          // 3 quadros para alcançar (0,055 s)
          return showPhoto(blob).then(doisQuadros).then(function () {
            if (!alive()) return
            player.nextFade = 450
            return speak('ficou', player).then(function () {
              if (alive()) player.play('idle', null, true)
            })
          })
        })
        .then(function () {
          if (box.getAttribute('data-fase') === 'preparando') return
          shoot.disabled = false
          ouvir.disabled = false
        })
    }

    Array.prototype.forEach.call(openers, function (b) {
      b.addEventListener('click', function (e) {
        // 14/10: no Android com a RA de verdade (WebXR) a foto é tirada LÁ (setupFala: abrirRAComFoto) — esta tela não abre
        if (api.desvio && api.desvio(e)) return
        open(e)
      })
    })
    q('[data-foto-comecar]').addEventListener('click', function () {
      comecar()
    })
    q('[data-foto-close]').addEventListener('click', close)
    // 13/10 (verificação r1): toque duplo no X — o 1º fecha na hora e o 2º caía no link “Todos os modelos”, no mesmo canto
    // da página (a pessoa saía da VIDA para a página inicial). Os cliques dos 400 ms seguintes ao fechar são engolidos
    var fechouEm = 0
    document.addEventListener('click', function (e) {
      if (fechouEm && performance.now() - fechouEm < 400) {
        e.preventDefault()
        e.stopPropagation()
      }
    }, true)
    q('[data-foto-recentrar]').addEventListener('click', function () {
      if (ancora) ancora.recentrar()
    })
    q('[data-foto-flip]').addEventListener('click', function () {
      facing = facing === 'user' ? 'environment' : 'user'
      var minha = sessao
      startCam().then(function (ok) {
        if (minha !== sessao || box.hidden) return
        camOk = ok
        if (!ok) {
          modo = 'tela'
          ancora.desligar()
          ancora.fixar()
        }
        box.setAttribute('data-modo', modo)
        ancora.recentrar()
        if (!box.getAttribute('data-fase')) say(msgModo())
      })
    })
    var ouvirEm = 0
    ouvir.addEventListener('click', function () {
      prime()
      // 13/10 (verificação r1): toque duplo (2 cliques a ~140 ms) começava e já calava o “Olá”: um toque a menos de
      // 600 ms do anterior é ignorado
      var agora = performance.now()
      if (agora - ouvirEm < 600) return
      ouvirEm = agora
      // 2º toque durante o “Olá” cala
      if (falandoOla) {
        stopSpeech()
        player.play('idle', null, true)
        return
      }
      falarOla()
    })
    shoot.addEventListener('click', function () {
      prime()
      sequence()
    })
    again.addEventListener('click', function () {
      prev.hidden = true
      box.removeAttribute('data-foto-pronta')
      fase('')
      stopSpeech()
      run++
      player.play('idle', null, true)
      shoot.disabled = false
      ouvir.disabled = false
      say(msgModo())
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !box.hidden) close()
    })
    // 13/10 (verificação r2): a página escondida no meio da contagem (outro app, a tela apagou): a voz seguia lá fora e, na
    // volta, a foto saía na hora (6 ms depois) com o quadro de câmera que estivesse ali. Agora a contagem é cancelada ao
    // sair (a voz cala) e a pessoa volta à tela ao vivo, pronta para tentar de novo. Na volta, a câmera que terminou lá fora
    // é pedida de novo
    document.addEventListener('visibilitychange', function () {
      if (box.hidden) return
      if (document.hidden) {
        if (box.getAttribute('data-fase') === 'contagem') {
          run++
          stopSpeech()
          count.textContent = ''
          fase('')
          player.play('idle', null, true)
          shoot.disabled = false
          ouvir.disabled = false
          say(msgModo())
        }
        return
      }
      var tr = stream && stream.getVideoTracks && stream.getVideoTracks()[0]
      if (tr && tr.readyState === 'ended') religaCam()
    })
    // girou a tela ou o vídeo mudou de tamanho: a focal muda, ela fica no mesmo lugar do mundo
    function refaz() {
      barraY = 0
      legTxt = null
      if (!box.hidden && ancora) ancora.refaz()
    }
    window.addEventListener('resize', refaz)
    cam.addEventListener('resize', refaz)

    // ?calibrar=1: régua para achar o campo de visão da câmera do aparelho (gire o celular: se ela “escorrega” junto com
    // a imagem, o valor está errado) e a altura do celular (o tamanho dela perto de uma pessoa de verdade)
    if (CALIBRAR) {
      var cal = document.createElement('div')
      cal.className = 'ra-foto__calib'
      box.setAttribute('data-calibrar', '')
      cal.innerHTML =
        '<label>Campo de visão da câmera (lado maior): <b data-cal-v-fov></b>°<input data-cal-fov type="range" min="45" max="95" step="0.5"></label>' +
        '<label>Altura do celular: <b data-cal-v-alt></b> m<input data-cal-alt type="range" min="0.8" max="1.9" step="0.05"></label>' +
        '<p data-cal-info></p>'
      box.insertBefore(cal, prev)
      var fi = cal.querySelector('[data-cal-fov]')
      var ai = cal.querySelector('[data-cal-alt]')
      var info = cal.querySelector('[data-cal-info]')
      var qual = function () {
        return facing === 'user' ? 'fovf' : 'fov'
      }
      var mostra = function () {
        fi.value = String(calib[qual()])
        ai.value = String(calib.altura)
        // números com vírgula, como se escreve no Brasil (o “anote” abaixo continua com ponto: é o endereço)
        cal.querySelector('[data-cal-v-fov]').textContent = String(calib[qual()]).replace('.', ',')
        cal.querySelector('[data-cal-v-alt]').textContent = calib.altura.toFixed(2).replace('.', ',')
      }
      mostra()
      fi.addEventListener('input', function () {
        calib[qual()] = parseFloat(fi.value)
        if (ancora) ancora.recentrar()
        mostra()
      })
      ai.addEventListener('input', function () {
        calib.altura = parseFloat(ai.value)
        if (ancora) ancora.recentrar()
        mostra()
      })
      var n0 = 0
      setInterval(function () {
        if (box.hidden || !ancora) return
        var n = ancora.estado.eventos
        info.textContent = 'movimento: ' + (n - n0) + ' eventos/s · ' + (modo || '—') + ' · anote: ?' + qual() + '=' + calib[qual()] + '&altura=' + calib.altura.toFixed(2)
        n0 = n
      }, 1000)
    }
    return api
  }

  function setupVideo() {
    var v = document.querySelector('[data-invite]')
    if (!v) return
    var btn = document.querySelector('[data-video-toggle]')
    var label = btn && btn.querySelector('[data-video-label]')
    var wants = !reduced.matches
    function sync() {
      var playing = !v.paused && !v.ended
      if (btn) btn.setAttribute('data-state', playing ? 'playing' : 'paused')
      if (label) label.textContent = playing ? 'Pausar vídeo' : 'Assistir ao vídeo'
    }
    v.addEventListener('play', sync)
    v.addEventListener('pause', sync)
    v.addEventListener('ended', sync)
    // Laço sem os fades do arquivo (R10, como o vídeo-convite do site): o arquivo abre e fecha com fade do preto (até
    // 0,3 s; a partir de 8,6 s), e o loop nativo escurecia o quadro a cada 9 s. A cada quadro apresentado
    // (requestVideoFrameCallback; sem ele, pelo timeupdate, com margem maior), perto do fim volta a 0,3 s; a 1ª
    // reprodução já começa em 0,3 s (#t= na URL). Se ainda assim chegar ao fim, recomeça em 0,3 s.
    var LOOP_IN = 0.3
    var LOOP_OUT = 0.5
    function wrap(t, margin) {
      var d = v.duration
      if (d > LOOP_IN + LOOP_OUT + 1 && (t >= d - LOOP_OUT - margin || t < LOOP_IN - 0.05)) v.currentTime = LOOP_IN
    }
    if (typeof v.requestVideoFrameCallback === 'function') {
      v.requestVideoFrameCallback(function onFrame(now, meta) {
        wrap(meta.mediaTime, 1 / 20)
        v.requestVideoFrameCallback(onFrame)
      })
    } else {
      v.addEventListener('timeupdate', function () {
        wrap(v.currentTime, 0.3)
      })
    }
    v.addEventListener('ended', function () {
      v.currentTime = LOOP_IN
      if (wants) v.play().catch(function () {})
    })
    if (btn) {
      btn.addEventListener('click', function () {
        if (v.paused) {
          wants = true
          v.play().catch(function () {})
        } else {
          wants = false
          v.pause()
        }
      })
    }
    // Começa sozinho (mudo) só sem movimento reduzido e quando está visível; pausa fora da tela.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting && wants) v.play().catch(function () {})
            else if (!en.isIntersecting && !v.paused) v.pause()
          })
        },
        { threshold: 0.35 },
      ).observe(v)
    } else if (wants) {
      v.play().catch(function () {})
    }
    sync()
  }

  function setupCopy() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy-link]'), function (b) {
      b.addEventListener('click', function () {
        var url = location.href.split('#')[0]
        function done() {
          say('Link copiado. Cole no Safari (iPhone) ou no Chrome (Android) para abrir a realidade aumentada.')
        }
        function fallback() {
          var t = document.createElement('textarea')
          t.value = url
          t.setAttribute('readonly', '')
          t.style.position = 'fixed'
          t.style.opacity = '0'
          document.body.appendChild(t)
          t.select()
          try {
            document.execCommand('copy')
            done()
          } catch (e) {
            say('Copie o endereço: ' + url)
          }
          document.body.removeChild(t)
        }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback)
        else fallback()
      })
    })
  }

  // ------------------------------------------------------------------ navegador dentro de app (13/10/2026)
  // Instagram, Facebook, WhatsApp, Line…: lá a câmera, o som e a RA dependem do app, e o Quick Look nem abre em
  // WKWebView (https://bugs.webkit.org/show_bug.cgi?id=239135) — pode ser parte do “sem áudio”. HEURÍSTICA pelo
  // userAgent, não provada para todos os apps: o nome do app; no iPhone, a falta do “Safari/” (Safari, Chrome, Edge e
  // Firefox do iPhone têm); no Android, o “; wv)” da WebView. Aviso no topo da página e na entrada de “A VIDA no seu
  // mundo”, com “Abrir no Safari” (x-safari-https://, iOS 17+ segundo relatos) ou “Abrir no Chrome” e “Copiar o link”.
  function ehIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }
  function emApp() {
    var ua = navigator.userAgent
    if (/FBAN|FBAV|FB_IAB|FBIOS|Instagram|WhatsApp|LinkedInApp|Snapchat|TikTok|musical_ly|Bytedance|MicroMessenger/i.test(ua)) return true
    if (/\bLine\//.test(ua)) return true
    if (ehIOS() && !/Safari\//.test(ua)) return true
    if (/Android/i.test(ua) && /; wv\)/.test(ua)) return true
    return false
  }
  function setupApp() {
    var avisos = document.querySelectorAll('[data-aviso-app]')
    if (!avisos.length || !emApp()) return
    body.setAttribute('data-em-app', '')
    var ios = ehIOS()
    var android = /Android/i.test(navigator.userAgent)
    var url = location.href.split('#')[0]
    var esquema = location.protocol === 'http:' ? 'http' : 'https'
    var semEsquema = url.replace(/^https?:\/\//, '')
    Array.prototype.forEach.call(avisos, function (av) {
      av.hidden = false
      var a = av.querySelector('[data-app-abrir]')
      var onde = av.querySelector('[data-app-onde]')
      var ok = av.querySelector('[data-app-ok]')
      if (a && ios) {
        a.href = 'x-safari-' + esquema + '://' + semEsquema
        a.textContent = 'Abrir no Safari'
        if (onde) onde.textContent = 'Abrir no Safari'
      } else if (a && android) {
        a.href = 'intent://' + semEsquema + '#Intent;scheme=' + esquema + ';package=com.android.chrome;end'
        a.textContent = 'Abrir no Chrome'
      } else if (a) a.hidden = true
      var cp = av.querySelector('[data-app-copiar]')
      if (!cp) return
      cp.addEventListener('click', function () {
        function feito() {
          if (ok) ok.textContent = 'Link copiado. Cole no Safari (iPhone) ou no Chrome (Android).'
        }
        function reserva() {
          var t = document.createElement('textarea')
          t.value = url
          t.setAttribute('readonly', '')
          t.style.position = 'fixed'
          t.style.opacity = '0'
          document.body.appendChild(t)
          t.select()
          try {
            document.execCommand('copy')
            feito()
          } catch (e) {
            if (ok) ok.textContent = 'Copie o endereço: ' + url
          }
          document.body.removeChild(t)
        }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(feito, reserva)
        else reserva()
      })
    })
  }

  // ------------------------------------------------------------------ olhar que segue a câmera (08/10/2026)
  // A VIDA acompanha quem olha para ela: pescoço e cabeça giram até ±55° e inclinam de −20° a +25°; os olhos cobrem o
  // resto até ±12° — os DOIS juntos, sem convergir (olho convergente em personagem de olhos grandes lê como vesgo).
  // Somado por cima do clipe a cada quadro, no onBeforeRender da cena interna do model-viewer (three.js, pelo símbolo
  // “scene”): depois do misturador, antes do desenho. Funciona no palco, no modo foto e na RA (WebXR), onde a câmera é o
  // próprio celular. Com a pessoa atrás dela (> 100°), volta devagar para a frente. Nos trechos em que o clipe olha para
  // outro lugar de propósito (“vem pro meu ladinho”, apontar), o seguimento cede.
  function setupOlhar(viewer, ligado) {
    var LIM_Y = 55, LIM_P0 = -20, LIM_P1 = 25, LIM_OLHO = 12
    var DEG = Math.PI / 180
    var st = null
    var tries = 0
    function sceneOf() {
      var syms = Object.getOwnPropertySymbols(viewer)
      for (var i = 0; i < syms.length; i++) if (syms[i].description === 'scene') return viewer[syms[i]]
      return null
    }
    function init() {
      var scene = sceneOf()
      if (!scene || !scene.getObjectByName) return false
      var b = {}
      var names = { head: 'spine_006', neck: 'spine_005', neck2: 'spine_004', eyeL: 'olho_L', eyeR: 'olho_R', root: 'VIDA_rig' }
      for (var k in names) {
        b[k] = scene.getObjectByName(names[k])
        if (!b[k]) return false
      }
      var V = b.head.position.constructor
      var Q = b.head.quaternion.constructor
      st = { scene: scene, b: b, V: V, Q: Q, sy: 0, sp: 0, ey: 0, ep: 0, w: 1, last: 0, mem: new Map(), dbg: {} }
      st.tmp = { v1: new V(), v2: new V(), v3: new V(), q1: new Q(), q2: new Q(), q3: new Q(), q4: new Q() }
      var prev = scene.onBeforeRender
      scene.onBeforeRender = function (renderer, sc, camera) {
        if (prev) prev.apply(this, arguments)
        try {
          apply(camera)
        } catch (e) {}
      }
      viewer.__olhar = st.dbg
      return true
    }
    // restaura o que o misturador não reescreveu (animação pausada): sem isso, o giro somaria quadro a quadro
    function base(o) {
      var m = st.mem.get(o)
      if (m && o.quaternion.equals(m.out)) o.quaternion.copy(m.base)
      else if (m) m.base.copy(o.quaternion)
      else st.mem.set(o, (m = { base: o.quaternion.clone(), out: o.quaternion.clone() }))
      return m
    }
    function done(o, m) {
      m.out.copy(o.quaternion)
    }
    // gira o osso o por q (rotação no MUNDO), em torno da própria origem
    function rotWorld(o, q) {
      var pq = st.tmp.q3
      o.parent.getWorldQuaternion(pq)
      var inv = st.tmp.q4.copy(pq).invert()
      o.quaternion.premultiply(inv.multiply(q).multiply(pq))
    }
    function clipWeight() {
      var n = viewer.animationName
      var t = viewer.currentTime || 0
      if (n === 'fala-vem' && t > 1.3 && t < 3.0) return 0.15
      if (n === 'apontar' && t > 0.2 && t < 2.4) return 0.25
      return 1
    }
    function apply(camera) {
      if (!camera || camera.isOrthographicCamera || window.__olharOff) return
      var mainCam = camera.isArrayCamera || camera === st.scene.camera || (st.scene.getCamera && camera === st.scene.getCamera())
      if (!mainCam) return
      var b = st.b, T = st.tmp
      var now = performance.now()
      var dt = st.last ? Math.min(0.1, (now - st.last) / 1000) : 0.016
      st.last = now
      var on = ligado ? ligado() : true
      var mh = base(b.head), mn = base(b.neck), mn2 = base(b.neck2), mL = base(b.eyeL), mR = base(b.eyeR)
      b.root.updateWorldMatrix(true, true)
      // alvo: câmera vista do meio dos olhos, no referencial do corpo (raiz: +Z frente, +Y cima)
      var rootQ = b.root.getWorldQuaternion(T.q1)
      var rootQi = T.q2.copy(rootQ).invert()
      var pL = b.eyeL.getWorldPosition(T.v1), pR = b.eyeR.getWorldPosition(T.v2)
      var mid = pL.add(pR).multiplyScalar(0.5)
      var cam = camera.getWorldPosition(T.v3)
      var d = cam.sub(mid).normalize().applyQuaternion(rootQi)
      var yawT = Math.atan2(d.x, d.z) / DEG
      var pitT = Math.asin(Math.max(-1, Math.min(1, d.y))) / DEG
      var gate = Math.abs(yawT) < 100 ? 1 : Math.abs(yawT) > 130 ? 0 : 1 - (Math.abs(yawT) - 100) / 30
      var wT = on ? gate * clipWeight() : 0
      st.w += (wT - st.w) * (1 - Math.exp(-dt / 0.35))
      var yC = Math.max(-LIM_Y, Math.min(LIM_Y, yawT)) * st.w
      var pC = Math.max(LIM_P0, Math.min(LIM_P1, pitT)) * st.w
      var kh = 1 - Math.exp(-dt / 0.28)
      st.sy += (yC - st.sy) * kh
      st.sp += (pC - st.sp) * kh
      // pescoço 20% + 30%, cabeça 50%
      var parts = [[b.neck2, 0.2], [b.neck, 0.3], [b.head, 0.5]]
      for (var i = 0; i < parts.length; i++) {
        var f = parts[i][1]
        var qy = T.q3.setFromAxisAngle(T.v1.set(0, 1, 0), st.sy * f * DEG)
        var qp = T.q4.setFromAxisAngle(T.v2.set(1, 0, 0), -st.sp * f * DEG)
        var qr = qy.multiply(qp)
        // no referencial do corpo → mundo
        var qw = rootQ.clone().multiply(qr).multiply(rootQi)
        rotWorld(parts[i][0], qw)
        parts[i][0].updateMatrixWorld(true)
      }
      // olhos: o que a cabeça ainda não alcançou (limite do pescoço ou atraso da suavização), mais depressa
      var ry = Math.max(-LIM_OLHO, Math.min(LIM_OLHO, yawT * st.w - st.sy))
      var rp = Math.max(-LIM_OLHO * 0.7, Math.min(LIM_OLHO * 0.7, pitT * st.w - st.sp))
      if (gate < 0.5) {
        ry = 0
        rp = 0
      }
      var ke = 1 - Math.exp(-dt / 0.07)
      st.ey += (ry - st.ey) * ke
      st.ep += (rp - st.ep) * ke
      var qe = T.q3.setFromAxisAngle(T.v1.set(0, 1, 0), st.ey * DEG).multiply(T.q4.setFromAxisAngle(T.v2.set(1, 0, 0), -st.ep * DEG))
      var qew = rootQ.clone().multiply(qe).multiply(rootQi)
      rotWorld(b.eyeL, qew)
      rotWorld(b.eyeR, qew)
      b.eyeL.updateMatrixWorld(true)
      b.eyeR.updateMatrixWorld(true)
      done(b.head, mh)
      done(b.neck, mn)
      done(b.neck2, mn2)
      done(b.eyeL, mL)
      done(b.eyeR, mR)
      st.dbg.alvo = [Math.round(yawT), Math.round(pitT)]
      st.dbg.cabeca = [Math.round(st.sy * 10) / 10, Math.round(st.sp * 10) / 10]
      st.dbg.olhos = [Math.round(st.ey * 10) / 10, Math.round(st.ep * 10) / 10]
    }
    function tryInit() {
      if (st || init()) return
      if (++tries < 40) setTimeout(tryInit, 250)
    }
    if (viewer.loaded) tryInit()
    viewer.addEventListener('load', function () {
      st = null
      tries = 0
      tryInit()
    })
  }
})()
