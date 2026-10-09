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
    }
    return true
  }

  var mv = document.querySelector('model-viewer')
  if (mv) setupViewer(mv)
  setupVideo()
  setupCopy()
  setupFx()

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
        // O próprio aceno já é o clipe (pausado no meio do aceno de chegada, ou tocando): recomeça do início — senão o
        // play seguia do ponto parado e o braço só aparecia no fim (ou nem subia). Zera e, pausado, retoma depois.
        mv.currentTime = 0
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
          toLoop()
          return
        }
        gestureWatch = requestAnimationFrame(tick)
      })
    }
    // Fim do gesto: o clipe já termina no quadro 0 do idle (descida pela frente do corpo, a mesma do site); o laço
    // volta com uma mistura curta de 0,25 s (a duração da página, 450 ms, volta logo depois). O relógio do aceno é
    // zerado no próximo gesto.
    var LOOP_BACK_MS = 250
    function toLoop() {
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
        mv.animationCrossfadeDuration = LOOP_BACK_MS
        mv.animationName = loopClip
        mv.play()
        ;(mv.updateComplete || Promise.resolve()).then(function () {
          requestAnimationFrame(function () {
            if (mv.animationCrossfadeDuration === LOOP_BACK_MS && fadeMs === null) mv.animationCrossfadeDuration = pageFade
          })
        })
      } else still(loopClip, 0)
    }
    mv.addEventListener('finished', function () {
      if (inGesture) toLoop()
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
      if (mv.canActivateAR) {
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
      var a = document.createElement('a')
      if (a.relList && a.relList.supports && a.relList.supports('ar')) return 'ios'
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
      } else if (s === 'not-presenting' && arExitHook) {
        arExitHook()
      }
    })

    Array.prototype.forEach.call(launchers, function (btn) {
      btn.addEventListener('click', function () {
        if (!defined() || modelOff) {
          // sem o visualizador ou sem o modelo: o link direto (dentro do toque, como o próprio model-viewer faz com o
          // Quick Look)
          if ((viewerOff || modelOff) && direct && !direct.hidden) direct.click()
          else say(viewerOff ? 'Este navegador não abriu a realidade aumentada. Veja as dicas logo abaixo.' : 'Preparando a realidade aumentada. Toque de novo em instantes.')
          return
        }
        // confere de novo antes de dizer que a RA não abre (a detecção pode ter terminado depois da última checagem)
        check()
        if (mv.canActivateAR) {
          // chamada direta, dentro do toque: o navegador exige o gesto para abrir a câmera
          var p = mv.activateAR()
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
        moving: function () {
          return moving
        },
        inAR: function () {
          return /session-started|object-placed/.test(mv.getAttribute('ar-status') || '')
        },
        setLoop: function (name) {
          loopClip = name || origLoop
          if (!inGesture) toLoop()
        },
        onPlaced: function (fn) {
          placedHook = fn
        },
        onARExit: function (fn) {
          arExitHook = fn
        },
      })
    }
  }

  // ------------------------------------------------------------------ VIDA falante e modo foto (07/10/2026)
  // data-fala no <model-viewer>: { falas: { ola|vem|contagem|ficou: { src, clip, dur, texto } }, pose, xis }.
  // Uma só voz (<audio>) para todas as falas: o 1º play acontece dentro de um toque (o navegador só libera som assim)
  // e as falas seguintes reaproveitam o mesmo elemento. A boca anda pelo clipe; o relógio do clipe segue o do áudio
  // (corrigido quando a diferença passa de 0,08 s). Movimento reduzido: só a voz e a legenda, sem animar.
  function setupFala(mv, api) {
    var cfg
    try {
      cfg = JSON.parse(mv.getAttribute('data-fala') || 'null')
    } catch (e) {
      cfg = null
    }
    if (!cfg || !cfg.falas) return
    var F = cfg.falas
    var voice = new Audio()
    voice.preload = 'auto'
    voice.setAttribute('playsinline', '')
    var primed = false
    var legenda = document.querySelector('[data-legenda]')
    var arMsg = mv.querySelector('[data-arui-msg]')
    var falaBtns = document.querySelectorAll('[data-fala-play]')
    var speaking = null
    var syncRaf = 0

    function prime() {
      // dentro de um toque: um play mudo libera a voz para as falas que vêm depois (RA, sequência da foto)
      if (primed) return
      primed = true
      try {
        voice.src = F.ola.src
        voice.muted = true
        var p = voice.play()
        if (p && p.then) {
          p.then(function () {
            voice.pause()
            voice.muted = false
            voice.currentTime = 0
          }).catch(function () {
            voice.muted = false
            primed = false
          })
        }
      } catch (e) {
        voice.muted = false
        primed = false
      }
    }

    function caption(txt) {
      if (legenda) legenda.textContent = txt || ''
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
    function speak(key, player, onCue) {
      var f = F[key]
      if (!f) return Promise.resolve()
      stop()
      return new Promise(function (resolve) {
        var s = { key: key, voiceDone: false, clipDone: false, cancelled: false }
        var done = false
        s.finish = function () {
          if (done) return
          done = true
          cancelAnimationFrame(syncRaf)
          if (speaking === s) speaking = null
          setPlaying(false)
          setTimeout(function () {
            if (!speaking) caption('')
          }, 400)
          resolve(!s.cancelled)
        }
        speaking = s
        setPlaying(true)
        caption(f.texto)
        function check() {
          if (s.voiceDone && s.clipDone) s.finish()
        }
        voice.onended = function () {
          s.voiceDone = true
          check()
        }
        voice.onerror = function () {
          s.voiceDone = true
          check()
        }
        voice.muted = false
        voice.src = f.src
        try {
          voice.currentTime = 0
        } catch (e) {}
        var vp = voice.play()
        if (vp && vp.catch) {
          vp.catch(function () {
            // sem som (navegador bloqueou): a fala segue só com a legenda e o tempo do arquivo (relógio reserva)
            s.fake = performance.now()
            s.voiceDone = false
            setTimeout(function () {
              s.voiceDone = true
              check()
            }, (f.dur || 3) * 1000)
          })
        }
        var animate = api.moving() && player
        if (animate) {
          player.play(f.clip, function () {
            s.clipDone = true
            check()
          })
        } else s.clipDone = true
        var viewer = animate ? player.viewer : null
        var lastCue = -1
        ;(function tick() {
          syncRaf = requestAnimationFrame(tick)
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
          if (viewer && playing && !s.fake && viewer.animationName === f.clip && !viewer.paused) {
            // acerta só a ação da fala (o relógio global zerava também a mistura com o laço)
            var act = acaoDe(viewer, f.clip)
            if (act) {
              var d = act.time - t
              if (Math.abs(d) > 0.08 && t < act.getClip().duration - 0.1) act.time = t
            }
          }
          if (onCue) lastCue = onCue(playing || s.fake ? t : voice.ended ? f.dur || 99 : -1, lastCue)
        })()
      })
    }

    // tocador do visualizador do palco: usa o gesto genérico (vira de frente, para o giro, volta ao laço no fim)
    var mainPlayer = {
      viewer: mv,
      play: function (clip, done) {
        // mistura curta na entrada da fala: com os 450 ms da página, o “Olá” saía com a boca amortecida pelo laço
        var fade = mv.animationCrossfadeDuration
        mv.animationCrossfadeDuration = 160
        api.playGesture(1, clip, done)
        setTimeout(function () {
          if (mv.animationCrossfadeDuration === 160) mv.animationCrossfadeDuration = fade
        }, 400)
      },
    }

    Array.prototype.forEach.call(falaBtns, function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation()
        prime()
        // o botão do texto de abertura leva até a VIDA (fora da tela o visualizador congela a animação)
        if (b.hasAttribute('data-fala-scroll')) {
          var st = mv.closest('.ra-stage')
          if (st && st.scrollIntoView) st.scrollIntoView({ behavior: reducedPref() ? 'auto' : 'smooth', block: 'center' })
        }
        if (speaking && speaking.key === 'ola') {
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
    // o toque que abre a RA também libera a voz: na RA (WebXR) ela se apresenta assim que é posicionada
    Array.prototype.forEach.call(document.querySelectorAll('[data-ar-launch]'), function (b) {
      b.addEventListener('click', prime)
    })
    api.onPlaced(function () {
      if (!primed) return false
      speak('ola', mainPlayer)
      return true
    })
    api.onARExit(function () {
      stop()
      cancelAR()
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

    // ---------------- foto na RA (WebXR): a câmera não chega à página — a VIDA faz a pose e a pessoa tira um print
    var arRun = 0
    function cancelAR() {
      arRun++
      api.setLoop(null)
    }
    var fotoAr = mv.querySelector('[data-foto-ar]')
    if (fotoAr) {
      fotoAr.addEventListener('click', function (e) {
        e.stopPropagation()
        prime()
        var run = ++arRun
        function alive() {
          return run === arRun
        }
        fotoAr.disabled = true
        speak('vem', mainPlayer)
          .then(function () {
            if (!alive()) return
            if (arMsg) arMsg.textContent = 'Fique ao lado da VIDA…'
            return wait(2600)
          })
          .then(function () {
            if (!alive()) return
            return speak('contagem', mainPlayer, function (t, last) {
              var n = t < 3.1 ? -1 : t < 4.6 ? 3 : t < 6.6 ? 2 : t < 8.4 ? 1 : 0
              if (n !== last && arMsg) arMsg.textContent = n > 0 ? String(n) + '…' : n === 0 ? 'Xiiis! Tire o print agora 📸' : 'Preparados?'
              return n
            })
          })
          .then(function () {
            if (!alive()) return
            api.setLoop(cfg.pose)
            if (arMsg) arMsg.textContent = 'Tire o print agora 📸'
            return wait(7000)
          })
          .then(function () {
            fotoAr.disabled = false
            if (!alive()) return
            api.setLoop(null)
            if (arMsg) arMsg.textContent = ''
          })
      })
    }

    function wait(ms) {
      return new Promise(function (r) {
        setTimeout(r, ms)
      })
    }

    setupFoto(mv, cfg, speak, prime, stop, wait)
    // a VIDA do palco segue a câmera (com o movimento ligado)
    setupOlhar(mv, function () {
      return api.moving()
    })
  }

  // ------------------------------------------------------------------ modo foto (câmera + VIDA)
  function setupFoto(mv, cfg, speak, prime, stopSpeech, wait) {
    var box = document.querySelector('[data-foto]')
    var openers = document.querySelectorAll('[data-foto-open]')
    if (!box || !openers.length) return
    var cam = box.querySelector('[data-foto-cam]')
    var holder = box.querySelector('[data-foto-vida]')
    var lado = box.querySelector('[data-foto-lado]')
    var flash = box.querySelector('[data-foto-flash]')
    var msg = box.querySelector('[data-foto-msg]')
    var count = box.querySelector('[data-foto-count]')
    var shoot = box.querySelector('[data-foto-shoot]')
    var prev = box.querySelector('[data-foto-prev]')
    var img = box.querySelector('[data-foto-img]')
    var save = box.querySelector('[data-foto-save]')
    var share = box.querySelector('[data-foto-share]')
    var again = box.querySelector('[data-foto-again]')
    var facing = 'environment'
    var stream = null
    var mvf = null
    var run = 0
    var lastBlob = null
    var lastUrl = null
    var opener = null
    // posição da VIDA na tela: deslocamento (px) e escala, por arrasto e pinça
    var pos = { x: 0, y: 0, s: 1 }
    var MSG_INI = 'Arraste a VIDA para o lugar; pince para aproximar.'

    function say(t) {
      if (msg) msg.textContent = t || ''
    }
    function fase(f) {
      box.setAttribute('data-fase', f || '')
    }

    // tocador de clipes do 2º visualizador (sem o giro e a câmera do palco)
    var player = {
      viewer: null,
      watch: 0,
      play: function (clip, done, loop) {
        var v = mvf
        if (!v) return done && done()
        cancelAnimationFrame(player.watch)
        v.animationCrossfadeDuration = loop ? 300 : 160
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
    }

    function makeViewer() {
      if (mvf) return mvf
      mvf = document.createElement('model-viewer')
      var attrs = {
        src: mv.getAttribute('src'),
        alt: 'A VIDA para a foto',
        'camera-orbit': '0deg 88deg auto',
        'field-of-view': '24deg',
        'interaction-prompt': 'none',
        'disable-zoom': '',
        'disable-pan': '',
        'disable-tap': '',
        'environment-image': mv.getAttribute('environment-image') || 'neutral',
        'tone-mapping': 'neutral',
        exposure: mv.getAttribute('exposure') || '0.8',
        'shadow-intensity': '1',
        'shadow-softness': '0.7',
        'animation-name': 'idle',
        autoplay: '',
        loading: 'eager',
        reveal: 'auto',
      }
      for (var k in attrs) mvf.setAttribute(k, attrs[k])
      mvf.setAttribute('aria-hidden', 'true')
      // ponto dos pés (chão do modelo): ancora a VIDA no chão da cena (antes ela flutuava a 73% da altura da tela)
      var pes = document.createElement('span')
      pes.setAttribute('slot', 'hotspot-pes')
      pes.setAttribute('data-position', '0m 0m 0m')
      pes.setAttribute('data-visibility-attribute', 'visible')
      pes.style.cssText = 'display:block;width:2px;height:2px;pointer-events:none'
      mvf.appendChild(pes)
      mvf.addEventListener('load', function () {
        setTimeout(resetPos, 60)
      })
      holder.appendChild(mvf)
      player.viewer = mvf
      // no modo foto ela olha para o celular
      setupOlhar(mvf)
      return mvf
    }

    function feetY() {
      var p = mvf && mvf.querySelector('[slot="hotspot-pes"]')
      if (!p) return null
      var r = p.getBoundingClientRect()
      return r.height || r.width || r.top ? r.top + r.height / 2 : null
    }
    function layout() {
      if (!mvf) return
      mvf.style.transform = 'translate(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px) scale(' + pos.s.toFixed(3) + ')'
      // o lugar da pessoa fica ao lado esquerdo DELA (direita de quem olha), com a base no mesmo chão dos pés
      var r = mvf.getBoundingClientRect()
      var w = r.width * 0.42
      var left = r.left + r.width * 0.5 + r.width * 0.16
      lado.style.left = Math.min(window.innerWidth - w - 8, left).toFixed(0) + 'px'
      lado.style.width = w.toFixed(0) + 'px'
      var fy = feetY()
      if (fy) {
        lado.style.bottom = Math.max(8, window.innerHeight - fy - 6).toFixed(0) + 'px'
        lado.style.height = Math.min(window.innerHeight * 0.66, r.height * 0.62).toFixed(0) + 'px'
      }
    }
    function resetPos() {
      var W = window.innerWidth
      var H = window.innerHeight
      // VIDA na metade esquerda, pés a 92% da altura (no chão da cena); a pessoa cabe à direita
      pos.s = W < H ? 0.84 : 0.74
      pos.x = -W * (W < H ? 0.2 : 0.18)
      pos.y = 0
      layout()
      var fy = feetY()
      if (fy) {
        pos.y = H * 0.92 - fy
        layout()
      }
    }

    // arrasto (1 dedo) e pinça (2 dedos) sobre a VIDA
    var pts = {}
    var g0 = null
    holder.addEventListener('pointerdown', function (e) {
      if (box.getAttribute('data-fase') === 'contagem') return
      holder.setPointerCapture && holder.setPointerCapture(e.pointerId)
      pts[e.pointerId] = { x: e.clientX, y: e.clientY }
      g0 = snapshot()
    })
    holder.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId] || !g0) return
      pts[e.pointerId] = { x: e.clientX, y: e.clientY }
      var g = snapshot()
      if (g.n !== g0.n) {
        g0 = g
        return
      }
      pos.x = g0.px + (g.cx - g0.cx)
      pos.y = g0.py + (g.cy - g0.cy)
      if (g.n >= 2 && g0.d > 0) pos.s = Math.max(0.35, Math.min(1.6, g0.ps * (g.d / g0.d)))
      layout()
    })
    function up(e) {
      delete pts[e.pointerId]
      g0 = snapshot()
    }
    holder.addEventListener('pointerup', up)
    holder.addEventListener('pointercancel', up)
    holder.addEventListener('wheel', function (e) {
      e.preventDefault()
      pos.s = Math.max(0.35, Math.min(1.6, pos.s * (e.deltaY < 0 ? 1.06 : 0.94)))
      layout()
    }, { passive: false })
    function snapshot() {
      var ids = Object.keys(pts)
      var n = ids.length
      var cx = 0
      var cy = 0
      ids.forEach(function (id) {
        cx += pts[id].x / Math.max(1, n)
        cy += pts[id].y / Math.max(1, n)
      })
      var d = n >= 2 ? Math.hypot(pts[ids[0]].x - pts[ids[1]].x, pts[ids[0]].y - pts[ids[1]].y) : 0
      return { n: n, cx: cx, cy: cy, d: d, px: pos.x, py: pos.y, ps: pos.s }
    }

    function startCam() {
      stopCam()
      box.setAttribute('data-facing', facing)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        say('Este navegador não abriu a câmera. A VIDA posa mesmo assim — tire um print da tela.')
        return Promise.resolve(false)
      }
      return navigator.mediaDevices
        .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
        .then(function (s) {
          stream = s
          cam.srcObject = s
          var p = cam.play()
          return p && p.then ? p.then(function () { return true }) : true
        })
        .catch(function () {
          say('Sem acesso à câmera: libere a câmera para este site (ou tire um print da tela na hora do “xis”).')
          return false
        })
    }
    function stopCam() {
      if (stream) stream.getTracks().forEach(function (t) { t.stop() })
      stream = null
      cam.srcObject = null
    }

    function open(e) {
      opener = e && e.currentTarget
      prime()
      stopSpeech()
      box.hidden = false
      document.documentElement.classList.add('ra-foto-aberta')
      fase('')
      prev.hidden = true
      shoot.disabled = false
      count.textContent = ''
      say(MSG_INI)
      makeViewer()
      requestAnimationFrame(resetPos)
      startCam()
      var c = box.querySelector('[data-foto-close]')
      if (c) c.focus()
    }
    function close() {
      run++
      stopSpeech()
      stopCam()
      box.hidden = true
      document.documentElement.classList.remove('ra-foto-aberta')
      fase('')
      if (mvf) player.play('idle', null, true)
      if (opener && opener.focus) opener.focus()
    }

    // a foto: quadro da câmera (cobrindo a tela, como na prévia) + render 3D da VIDA no lugar em que está na tela
    function capture() {
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
      var r = mvf.getBoundingClientRect()
      var blobP = typeof mvf.toBlob === 'function' ? mvf.toBlob({ mimeType: 'image/png' }) : Promise.reject()
      return blobP
        .then(function (b) {
          return loadImg(URL.createObjectURL(b))
        })
        .then(function (im) {
          cx.drawImage(im, r.left, r.top, r.width, r.height)
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
          return new Promise(function (res) {
            cv.toBlob(res, 'image/jpeg', 0.9)
          })
        })
    }
    function loadImg(src) {
      return new Promise(function (res, rej) {
        var im = new Image()
        im.onload = function () { res(im) }
        im.onerror = rej
        im.src = src
      })
    }

    function showPhoto(blob) {
      if (!blob) return
      lastBlob = blob
      if (lastUrl) URL.revokeObjectURL(lastUrl)
      lastUrl = URL.createObjectURL(blob)
      img.src = lastUrl
      save.href = lastUrl
      var file = null
      try {
        file = new File([blob], 'foto-com-a-vida.jpg', { type: 'image/jpeg' })
      } catch (e) {}
      share.hidden = !(file && navigator.canShare && navigator.canShare({ files: [file] }))
      share.onclick = function () {
        navigator.share({ files: [file], title: 'Eu e a VIDA', text: 'Foto com a VIDA · Expedição Parques GO' }).catch(function () {})
      }
      prev.hidden = false
      box.setAttribute('data-foto-pronta', '')
    }

    function sequence() {
      var my = ++run
      function alive() {
        return my === run && !box.hidden
      }
      shoot.disabled = true
      prev.hidden = true
      box.removeAttribute('data-foto-pronta')
      fase('chamar')
      say('Fique ao lado da VIDA, no tracejado')
      layout()
      return speak('vem', player)
        .then(function () {
          if (!alive()) return
          fase('espera')
          say('Prepare-se…')
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
          fase('pronta')
          player.play(cfg.pose, null, true)
          showPhoto(blob)
          say('')
          return speak('ficou', player).then(function () {
            if (alive()) player.play('idle', null, true)
          })
        })
        .then(function () {
          shoot.disabled = false
        })
    }

    Array.prototype.forEach.call(openers, function (b) {
      b.addEventListener('click', open)
    })
    box.querySelector('[data-foto-close]').addEventListener('click', close)
    box.querySelector('[data-foto-flip]').addEventListener('click', function () {
      facing = facing === 'user' ? 'environment' : 'user'
      startCam()
    })
    shoot.addEventListener('click', function () {
      prime()
      sequence()
    })
    again.addEventListener('click', function () {
      prev.hidden = true
      box.removeAttribute('data-foto-pronta')
      fase('')
      say(MSG_INI)
      stopSpeech()
      run++
      player.play('idle', null, true)
      shoot.disabled = false
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !box.hidden) close()
    })
    window.addEventListener('resize', function () {
      if (!box.hidden) resetPos()
    })
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
