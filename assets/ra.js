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
        var clip = inGesture && mv.animationName === gesture ? mv.currentTime || 0 : 0
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
    function playGesture(times) {
      if (!gesture || typeof mv.play !== 'function') return
      clearTimeout(stillBack)
      if (!moving && reduced.matches) {
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
        if (inGesture && mv.animationName === gesture) mv.play({ repetitions: n, pingpong: false })
      }
      // O aceno começa JÁ no clique: o play com N repetições vai logo depois da troca do nome (o clipe entra pela
      // mistura no mesmo quadro). A troca ainda dispara o updated() do model-viewer, que põe o clipe em laço infinito
      // (opções padrão) — por isso o play com N repetições é repetido DEPOIS dessa atualização (o relógio segue; só o
      // modo de repetição volta a “uma vez”; senão o aceno não para).
      // O relógio do aceno anterior ficou no fim (clampWhenFinished): sem zerá-lo, o novo “Acenar” só virava a VIDA de
      // frente, sem erguer o braço. Zera ANTES da troca, com o laço ainda na tela (o laço volta ao 1º quadro — quase
      // parado — e a mistura começa dali). O clipe termina no quadro 0 do idle (descida pela frente do corpo).
      if (mv.animationName !== gesture) {
        // Pausado: o laço volta a tocar antes da troca, para o aceno entrar pela mistura (com o modelo pausado, a troca
        // para todas as ações e o braço saltaria).
        if (mv.paused) mv.play()
        mv.currentTime = 0
        mv.animationName = gesture
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
        if (!mv.paused && d && mv.animationName === gesture && mv.currentTime >= d - GESTURE_END_S) {
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
        // na RA (WebXR), a VIDA acena assim que é posicionada
        playGesture(1)
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
})()
