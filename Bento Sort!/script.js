const ASSET =
  "assets/images/";

const TRAY_CAPACITY =
  5;


const FOOD = [
  "eggroll",
  "onigiri",
  "shrimp",
  "strawberry",
  "hamburg",
  "octopus_sausage",
  "broccoli",
  "cheese",
  "gimbap",
  "tomato"
];


/* =========================
   LEVEL CONFIG
========================= */

/*
  시간은 기존보다 넉넉하게 조정
*/

const LEVELS = [

  {
    kinds: 4,
    time: 90,
    seed: 71
  },

  {
    kinds: 4,
    time: 100,
    seed: 108
  },

  {
    kinds: 5,
    time: 130,
    seed: 223
  },

  {
    kinds: 5,
    time: 150,
    seed: 518
  },

  {
    kinds: 6,
    time: 180,
    seed: 997
  }

];


/* =========================
   STATE
========================= */

let level =
  1;

let selected =
  null;

let trays =
  [];

let muted =
  false;

let toastTimer =
  null;

let completedKinds =
  0;

let gameOver =
  false;


let timeLeft =
  0;

let timerId =
  null;


/* =========================
   SAVE
========================= */

const SAVE_KEY =
  "bento-sort-progress";


let progress = {
  highestCleared: 0
};


let shuffleNonce =
  0;


/* =========================
   DRAG
========================= */

let dragState =
  null;

let ignoreNextClick =
  false;


/* =========================
   DOM
========================= */

const board =
  document.querySelector(
    "#trayBoard"
  );


const $ =
  (selector) =>
    document.querySelector(
      selector
    );


/* =========================
   LEVEL CONFIG
========================= */

function configForLevel(
  number
) {

  const preset =
    LEVELS[
      (number - 1) %
      LEVELS.length
    ];


  return {

    ...preset,

    seed:
      preset.seed +
      Math.floor(
        (number - 1) /
        LEVELS.length
      ) *
      131

  };

}


/* =========================
   SHUFFLE
========================= */

function seededShuffle(
  items,
  seed
) {

  const output =
    [...items];


  let value =
    seed;


  const random =
    () => {

      value =
        (
          value *
          1664525 +
          1013904223
        ) >>> 0;


      return (
        value /
        4294967296
      );

    };


  for (
    let i =
      output.length - 1;

    i > 0;

    i--
  ) {

    const j =
      Math.floor(
        random() *
        (i + 1)
      );


    [
      output[i],
      output[j]
    ] = [
      output[j],
      output[i]
    ];

  }


  return output;

}


/* =========================
   TIMER
========================= */

function formatTime(
  seconds
) {

  const safe =
    Math.max(
      0,
      seconds
    );


  const min =
    Math.floor(
      safe / 60
    );


  const sec =
    safe % 60;


  return (
    String(min)
      .padStart(
        2,
        "0"
      ) +
    ":" +
    String(sec)
      .padStart(
        2,
        "0"
      )
  );

}


function updateTimerDisplay() {

  const timer =
    $("#timerValue");


  if (!timer) {
    return;
  }


  timer.textContent =
    formatTime(
      timeLeft
    );

}


function stopTimer() {

  if (!timerId) {
    return;
  }


  clearInterval(
    timerId
  );


  timerId =
    null;

}


function startTimer() {

  stopTimer();


  updateTimerDisplay();


  timerId =
    setInterval(
      () => {

        if (gameOver) {

          stopTimer();

          return;

        }


        timeLeft--;


        updateTimerDisplay();


        if (
          timeLeft <= 0
        ) {

          timeLeft =
            0;


          updateTimerDisplay();


          stopTimer();


          gameOver =
            true;


          selected =
            null;


          render();


          showGameOver();

        }

      },

      1000
    );

}


/* =========================
   START LEVEL
========================= */

function startLevel(
  number = level
) {

  level =
    number;


  selected =
    null;


  completedKinds =
    0;


  gameOver =
    false;


  removeDragGhost();


  cleanupPointerListeners();


  stopTimer();


  const config =
    configForLevel(
      level
    );


  timeLeft =
    config.time;


  const foods =
    FOOD
      .slice(
        0,
        config.kinds
      )
      .flatMap(
        (food) =>
          Array(
            TRAY_CAPACITY
          ).fill(
            food
          )
      );


  const shuffled =
    seededShuffle(

      foods,

      config.seed +
      shuffleNonce *
      10007

    );


  /*
    음식 종류 수 + 빈 도시락 2개
  */

  trays =
    Array.from(

      {
        length:
          config.kinds + 2
      },

      () => ({

        items: [],

        complete:
          false

      })

    );


  /*
    앞쪽 도시락에
    음식을 분배
  */

  shuffled.forEach(
    (
      food,
      index
    ) => {

      trays[
        index %
        config.kinds
      ].items.push(
        food
      );

    }
  );


  $("#levelValue").textContent =
    level;


  updateTimerDisplay();


  const clearOverlay =
    $("#clearOverlay");


  if (clearOverlay) {

    clearOverlay.hidden =
      true;

  }


  const gameOverOverlay =
    $("#gameOverOverlay");


  if (gameOverOverlay) {

    gameOverOverlay.hidden =
      true;

  }


  render();


  startTimer();

}


/* =========================
   FOOD IMAGE
========================= */

function foodImage(
  food,
  state = "normal"
) {

  return (
    `${ASSET}food/food_${food}` +
    `${
      state === "normal"
        ? ""
        : `_${state}`
    }.png`
  );

}


/* =========================
   RENDER
========================= */

function render() {

  board.innerHTML =
    "";


  trays.forEach(
    (
      tray,
      trayIndex
    ) => {

      const trayEl =
        document.createElement(
          "button"
        );


      trayEl.type =
        "button";


      trayEl.className =
        "tray";


      trayEl.dataset.trayIndex =
        String(
          trayIndex
        );


      const selectableTarget =
        !!selected &&

        selected.tray !==
          trayIndex &&

        !tray.complete &&

        tray.items.length <
          TRAY_CAPACITY &&

        (
          tray.items.length === 0 ||

          tray.items[0] ===
            selected.food
        );


      if (
        tray.complete
      ) {

        trayEl.classList.add(
          "is-complete"
        );

      }


      if (
        selectableTarget
      ) {

        trayEl.classList.add(
          "target"
        );

      }


      trayEl.dataset.selected =
        (
          selected &&
          selected.tray ===
            trayIndex
        )
          ? "true"
          : "false";


      trayEl.setAttribute(
        "aria-label",

        tray.complete
          ? "완료된 도시락"
          : `${tray.items.length}개 음식이 있는 도시락`
      );


      trayEl.setAttribute(
        "aria-disabled",

        String(
          tray.complete ||
          gameOver
        )
      );


      trayEl.addEventListener(
        "click",

        (event) => {

          event.preventDefault();


          onTrayClick(
            trayIndex
          );

        }
      );


      trayEl.addEventListener(
        "dragstart",

        (event) => {

          event.preventDefault();

        }
      );


      const slots =
        document.createElement(
          "div"
        );


      slots.className =
        "slots";


      for (
        let slotIndex = 0;

        slotIndex <
        TRAY_CAPACITY;

        slotIndex++
      ) {

        const slot =
          document.createElement(
            "div"
          );


        slot.className =
          "slot";


        const food =
          tray.items[
            slotIndex
          ];


        if (food) {

          const image =
            document.createElement(
              "img"
            );


          /*
            배열 0번째 =
            맨 위 음식
          */

          const isTopFood =
            slotIndex === 0;


          const isActive =
            selected &&

            selected.tray ===
              trayIndex &&

            selected.slot ===
              slotIndex;


          image.className =
            "food";


          if (
            isTopFood &&
            !tray.complete &&
            !gameOver
          ) {

            image.classList.add(
              "pickable"
            );

          }

          else {

            image.classList.add(
              "locked"
            );

          }


          if (
            isActive
          ) {

            image.classList.add(
              "active"
            );

          }


          image.src =
            foodImage(

              food,

              tray.complete
                ? "complete"

                : isActive
                  ? "selected"

                  : "normal"

            );


          image.alt =
            food;


          image.draggable =
            false;


          image.setAttribute(
            "draggable",
            "false"
          );


          image.addEventListener(
            "dragstart",

            (event) => {

              event.preventDefault();

            }
          );


          /*
            음식 클릭
          */

          image.addEventListener(
            "click",

            (event) => {

              event.preventDefault();

              event.stopPropagation();


              if (
                ignoreNextClick
              ) {

                ignoreNextClick =
                  false;

                return;

              }


              onFoodClick(
                trayIndex,
                slotIndex
              );

            }
          );


          /*
            맨 위 음식만 드래그 가능
          */

          if (
            isTopFood &&
            !tray.complete &&
            !gameOver
          ) {

            image.addEventListener(
              "pointerdown",

              (event) => {

                beginPointerDrag(

                  event,

                  trayIndex,

                  food,

                  image

                );

              }
            );

          }


          slot.append(
            image
          );

        }

        else {

          slot.classList.add(
            "empty"
          );

        }


        slots.append(
          slot
        );

      }


      trayEl.append(
        slots
      );


      board.append(
        trayEl
      );

    }
  );

}


/* =========================
   FOOD CLICK
========================= */

function onFoodClick(
  trayIndex,
  slotIndex
) {

  if (gameOver) {
    return;
  }


  const tray =
    trays[
      trayIndex
    ];


  if (
    !tray ||
    tray.complete
  ) {

    return;

  }


  /*
    맨 위 음식만 선택 가능
  */

  if (
    slotIndex !== 0
  ) {

    showToast(
      "맨 위 음식부터 옮길 수 있어요!"
    );

    return;

  }


  const food =
    tray.items[
      slotIndex
    ];


  if (!food) {
    return;
  }


  /*
    아무 음식도
    선택하지 않은 상태
  */

  if (!selected) {

    selected = {

      tray:
        trayIndex,

      slot:
        0,

      food:
        food

    };


    render();


    return;

  }


  /*
    선택한 음식 다시 클릭
    → 선택 취소
  */

  if (
    selected.tray ===
      trayIndex &&

    selected.slot ===
      slotIndex
  ) {

    selected =
      null;


    render();


    return;

  }


  /*
    이미 음식이 선택된 상태에서
    다른 도시락 맨 위 음식 클릭

    → 그 도시락 자체를
      클릭한 것으로 처리
  */

  if (
    selected.tray !==
    trayIndex
  ) {

    tryMoveFood(

      selected.tray,

      trayIndex

    );


    return;

  }

}


/* =========================
   TRAY CLICK
========================= */

function onTrayClick(
  targetIndex
) {

  if (gameOver) {
    return;
  }


  if (!selected) {

    showToast(
      "먼저 맨 위 음식을 눌러주세요."
    );

    return;

  }


  /*
    자신의 도시락 클릭
    → 선택 취소
  */

  if (
    selected.tray ===
    targetIndex
  ) {

    selected =
      null;


    render();


    return;

  }


  tryMoveFood(

    selected.tray,

    targetIndex

  );

}


/* =========================
   MOVE CHECK
========================= */

function canMoveFood(
  sourceIndex,
  targetIndex
) {

  if (
    sourceIndex ===
    targetIndex
  ) {

    return false;

  }


  const source =
    trays[
      sourceIndex
    ];


  const target =
    trays[
      targetIndex
    ];


  if (
    !source ||
    !target
  ) {

    return false;

  }


  if (
    source.complete ||
    target.complete
  ) {

    return false;

  }


  if (
    source.items.length ===
    0
  ) {

    return false;

  }


  if (
    target.items.length >=
    TRAY_CAPACITY
  ) {

    return false;

  }


  const movingFood =
    source.items[0];


  /*
    빈 도시락이면
    어떤 음식이든 가능
  */

  if (
    target.items.length ===
    0
  ) {

    return true;

  }


  /*
    음식이 있다면
    맨 위 음식과 같은 종류만 가능
  */

  return (
    target.items[0] ===
    movingFood
  );

}


/* =========================
   MOVE
========================= */

function tryMoveFood(
  sourceIndex,
  targetIndex
) {

  if (gameOver) {
    return false;
  }


  const source =
    trays[
      sourceIndex
    ];


  const target =
    trays[
      targetIndex
    ];


  if (
    !source ||
    !target
  ) {

    return false;

  }


  if (
    target.complete
  ) {

    showToast(
      "완성된 도시락은 건드릴 수 없어요!"
    );

    return false;

  }


  if (
    target.items.length >=
    TRAY_CAPACITY
  ) {

    showToast(
      "이 도시락은 가득 찼어요!"
    );

    return false;

  }


  if (
    sourceIndex ===
    targetIndex
  ) {

    return false;

  }


  if (
    !canMoveFood(
      sourceIndex,
      targetIndex
    )
  ) {

    if (
      target.items.length > 0 &&

      target.items[0] !==
        source.items[0]
    ) {

      showToast(
        "같은 음식 위에만 올릴 수 있어요!"
      );

    }


    return false;

  }


  const movingFood =
    source.items[0];


  const flight =
    captureFlight(

      sourceIndex,

      targetIndex,

      movingFood

    );


  /*
    맨 위 음식 제거
  */

  const food =
    source.items.shift();


  /*
    대상 맨 위에 추가
  */

  target.items.unshift(
    food
  );


  selected =
    null;


  checkComplete(
    target
  );


  playTick();


  render();


  animateFlight(
    flight
  );


  checkGameState();


  return true;

}


/* =========================
   COMPLETE
========================= */

function checkComplete(
  tray
) {

  if (
    !tray ||
    tray.complete
  ) {

    return;

  }


  if (
    tray.items.length ===
      TRAY_CAPACITY &&

    new Set(
      tray.items
    ).size ===
      1
  ) {

    tray.complete =
      true;


    completedKinds++;


    playComplete();

  }

}


/* =========================
   VALID MOVE
========================= */

function hasAnyValidMove() {

  for (
    let sourceIndex = 0;

    sourceIndex <
    trays.length;

    sourceIndex++
  ) {

    const source =
      trays[
        sourceIndex
      ];


    if (
      source.complete ||
      source.items.length === 0
    ) {

      continue;

    }


    for (
      let targetIndex = 0;

      targetIndex <
      trays.length;

      targetIndex++
    ) {

      if (
        sourceIndex ===
        targetIndex
      ) {

        continue;

      }


      if (
        canMoveFood(
          sourceIndex,
          targetIndex
        )
      ) {

        return true;

      }

    }

  }


  return false;

}


/* =========================
   GAME STATE
========================= */

function checkGameState() {

  const config =
    configForLevel(
      level
    );


  const isCleared =
    completedKinds ===
      config.kinds &&

    trays.every(
      (tray) =>
        tray.complete ||
        tray.items.length ===
          0
    );


  /*
    CLEAR
  */

  if (
    isCleared
  ) {

    stopTimer();


    setTimeout(
      showClear,
      250
    );


    return;

  }


  /*
    가능한 이동이
    하나도 없다면 즉시 게임오버
  */

  if (
    !hasAnyValidMove()
  ) {

    gameOver =
      true;


    selected =
      null;


    stopTimer();


    render();


    showGameOver();


    return;

  }

}


/* =========================
   FLIGHT ANIMATION
========================= */

function captureFlight(
  sourceTray,
  targetTray,
  food
) {

  const source =
    board
      .children[
        sourceTray
      ]
      ?.querySelectorAll(
        ".slot"
      )[0]
      ?.querySelector(
        ".food"
      );


  const target =
    board
      .children[
        targetTray
      ]
      ?.querySelectorAll(
        ".slot"
      )[0];


  if (
    !source ||
    !target
  ) {

    return null;

  }


  return {

    source:
      source
        .getBoundingClientRect(),

    target:
      target
        .getBoundingClientRect(),

    food:
      food

  };

}


function animateFlight(
  flight
) {

  if (!flight) {
    return;
  }


  const image =
    document.createElement(
      "img"
    );


  image.className =
    "food-flyer";


  image.src =
    foodImage(
      flight.food,
      "selected"
    );


  image.alt =
    "";


  image.draggable =
    false;


  const {
    source,
    target
  } = flight;


  image.style.left =
    `${source.left}px`;


  image.style.top =
    `${source.top}px`;


  image.style.width =
    `${source.width}px`;


  image.style.height =
    `${source.height}px`;


  document.body.append(
    image
  );


  const x =
    target.left +
    (
      target.width -
      source.width
    ) /
    2 -
    source.left;


  const y =
    target.top +
    (
      target.height -
      source.height
    ) /
    2 -
    source.top;


  const animation =
    image.animate(
      [

        {
          transform:
            "translate(0, 0) scale(1.08)",

          opacity:
            1
        },

        {
          transform:
            `translate(${x * .55}px, ${y * .38 - 18}px) scale(1.13)`,

          opacity:
            1,

          offset:
            .52
        },

        {
          transform:
            `translate(${x}px, ${y}px) scale(.92)`,

          opacity:
            .15
        }

      ],

      {

        duration:
          230,

        easing:
          "cubic-bezier(.22,.8,.28,1)"

      }
    );


  animation.onfinish =
    () => {

      image.remove();

    };

}


/* =========================
   POINTER DRAG
========================= */

function beginPointerDrag(
  event,
  trayIndex,
  food,
  imageElement
) {

  if (gameOver) {
    return;
  }


  if (
    event.pointerType ===
      "mouse" &&

    event.button !==
      0
  ) {

    return;

  }


  if (
    event.cancelable
  ) {

    event.preventDefault();

  }


  imageElement.draggable =
    false;


  const rect =
    imageElement
      .getBoundingClientRect();


  dragState = {

    pointerId:
      event.pointerId,

    sourceTray:
      trayIndex,

    food:
      food,

    startX:
      event.clientX,

    startY:
      event.clientY,

    offsetX:
      event.clientX -
      rect.left,

    offsetY:
      event.clientY -
      rect.top,

    width:
      rect.width,

    height:
      rect.height,

    dragging:
      false,

    ghost:
      null

  };


  window.addEventListener(
    "pointermove",
    handlePointerMove,
    {
      passive:
        false
    }
  );


  window.addEventListener(
    "pointerup",
    handlePointerUp
  );


  window.addEventListener(
    "pointercancel",
    handlePointerCancel
  );

}


/* =========================
   POINTER MOVE
========================= */

function handlePointerMove(
  event
) {

  if (
    !dragState ||
    event.pointerId !==
      dragState.pointerId
  ) {

    return;

  }


  const moveX =
    event.clientX -
    dragState.startX;


  const moveY =
    event.clientY -
    dragState.startY;


  const distance =
    Math.hypot(
      moveX,
      moveY
    );


  /*
    클릭 / 드래그 구분
  */

  if (
    !dragState.dragging &&
    distance > 7
  ) {

    dragState.dragging =
      true;


    createDragGhost(
      event
    );

  }


  if (
    !dragState.dragging
  ) {

    return;

  }


  if (
    event.cancelable
  ) {

    event.preventDefault();

  }


  moveDragGhost(
    event.clientX,
    event.clientY
  );

}


/* =========================
   POINTER UP
========================= */

function handlePointerUp(
  event
) {

  if (
    !dragState ||
    event.pointerId !==
      dragState.pointerId
  ) {

    return;

  }


  const wasDragging =
    dragState.dragging;


  const sourceTray =
    dragState.sourceTray;


  cleanupPointerListeners();


  /*
    실제 드래그가 아니라면
    일반 클릭으로 처리
  */

  if (
    !wasDragging
  ) {

    dragState =
      null;


    return;

  }


  /*
    드래그 종료 직후
    click 이벤트 차단
  */

  ignoreNextClick =
    true;


  setTimeout(
    () => {

      ignoreNextClick =
        false;

    },

    0
  );


  const element =
    document.elementFromPoint(
      event.clientX,
      event.clientY
    );


  const trayElement =
    element
      ?.closest(
        ".tray"
      );


  removeDragGhost();


  dragState =
    null;


  if (
    !trayElement
  ) {

    showToast(
      "도시락 위에 놓아주세요!"
    );


    return;

  }


  const targetIndex =
    Number(
      trayElement
        .dataset
        .trayIndex
    );


  if (
    Number.isNaN(
      targetIndex
    )
  ) {

    return;

  }


  tryMoveFood(
    sourceTray,
    targetIndex
  );

}


/* =========================
   POINTER CANCEL
========================= */

function handlePointerCancel() {

  cleanupPointerListeners();


  removeDragGhost();


  dragState =
    null;

}


/* =========================
   DRAG GHOST
========================= */

function createDragGhost(
  event
) {

  if (!dragState) {
    return;
  }


  const ghost =
    document.createElement(
      "img"
    );


  ghost.className =
    "drag-food";


  ghost.src =
    foodImage(
      dragState.food,
      "selected"
    );


  ghost.alt =
    "";


  ghost.draggable =
    false;


  ghost.style.width =
    `${dragState.width}px`;


  ghost.style.height =
    `${dragState.height}px`;


  document.body.append(
    ghost
  );


  dragState.ghost =
    ghost;


  moveDragGhost(
    event.clientX,
    event.clientY
  );

}


function moveDragGhost(
  x,
  y
) {

  if (
    !dragState?.ghost
  ) {

    return;

  }


  dragState
    .ghost
    .style
    .left =
      `${
        x -
        dragState.offsetX
      }px`;


  dragState
    .ghost
    .style
    .top =
      `${
        y -
        dragState.offsetY
      }px`;

}


function removeDragGhost() {

  const ghosts =
    document.querySelectorAll(
      ".drag-food"
    );


  ghosts.forEach(
    (ghost) => {

      ghost.remove();

    }
  );


  if (
    dragState?.ghost
  ) {

    dragState.ghost =
      null;

  }

}


function cleanupPointerListeners() {

  window.removeEventListener(
    "pointermove",
    handlePointerMove
  );


  window.removeEventListener(
    "pointerup",
    handlePointerUp
  );


  window.removeEventListener(
    "pointercancel",
    handlePointerCancel
  );

}


/* =========================
   OVERLAYS
========================= */

function showClear() {

  /*
    최고 클리어 기록 저장
  */

  if (
    level >
    progress.highestCleared
  ) {

    progress.highestCleared =
      level;


    saveProgress();

  }


  updateContinueButton();


  const overlay =
    $("#clearOverlay");


  if (!overlay) {
    return;
  }


  overlay.hidden =
    false;


  playComplete();

}


function showGameOver() {

  stopTimer();


  const overlay =
    $("#gameOverOverlay");


  if (overlay) {

    overlay.hidden =
      false;

  }


  beep(
    210,
    .26
  );

}


/* =========================
   TOAST
========================= */

function showToast(
  message
) {

  clearTimeout(
    toastTimer
  );


  const toast =
    $("#toast");


  if (!toast) {
    return;
  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },

      1600
    );

}


/* =========================
   SOUND
========================= */

function beep(
  frequency,
  duration
) {

  if (muted) {
    return;
  }


  try {

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;


    if (!AudioContextClass) {
      return;
    }


    const context =
      new AudioContextClass();


    const oscillator =
      context
        .createOscillator();


    const gain =
      context
        .createGain();


    oscillator
      .frequency
      .value =
        frequency;


    gain
      .gain
      .setValueAtTime(
        .035,
        context.currentTime
      );


    gain
      .gain
      .exponentialRampToValueAtTime(
        .001,
        context.currentTime +
        duration
      );


    oscillator
      .connect(
        gain
      )
      .connect(
        context.destination
      );


    oscillator.start();


    oscillator.stop(
      context.currentTime +
      duration
    );

  }

  catch {

    /* 소리 사용 불가 시 무시 */

  }

}


function playTick() {

  beep(
    540,
    .08
  );

}


function playComplete() {

  beep(
    820,
    .18
  );

}


/* =========================
   SAVE DATA
========================= */

function loadProgress() {

  try {

    const saved =
      localStorage.getItem(
        SAVE_KEY
      );


    if (!saved) {
      return;
    }


    const parsed =
      JSON.parse(
        saved
      );


    progress.highestCleared =
      Number(
        parsed.highestCleared
      ) ||
      0;

  }

  catch {

    progress.highestCleared =
      0;

  }

}


function saveProgress() {

  try {

    localStorage.setItem(

      SAVE_KEY,

      JSON.stringify(
        progress
      )

    );

  }

  catch {

    /* localStorage 사용 불가 */

  }

}


/* =========================
   CONTINUE
========================= */

function getContinueLevel() {

  return Math.max(
    1,
    progress.highestCleared +
    1
  );

}


function updateContinueButton() {

  const button =
    $("#continueButton");


  if (!button) {
    return;
  }


  /*
    아직 한 번도
    클리어하지 않았다면
    이어하기 숨김
  */

  if (
    progress.highestCleared <=
    0
  ) {

    button.hidden =
      true;


    return;

  }


  const nextLevel =
    getContinueLevel();


  button.hidden =
    false;


  button.setAttribute(
    "aria-label",
    `LEVEL ${nextLevel}부터 이어하기`
  );

}


/* =========================
   GLOBAL DRAG BLOCK
========================= */

document.addEventListener(
  "dragstart",

  (event) => {

    const target =
      event.target;


    if (
      target instanceof
        Element &&

      (
        target.closest(
          ".food"
        ) ||

        target.closest(
          ".tray"
        ) ||

        target.closest(
          ".game"
        )
      )
    ) {

      event.preventDefault();

    }

  }
);


document.addEventListener(
  "drop",

  (event) => {

    if (
      event.target instanceof
        Element &&

      event.target.closest(
        ".game"
      )
    ) {

      event.preventDefault();

    }

  }
);


document.addEventListener(
  "dragover",

  (event) => {

    if (
      event.target instanceof
        Element &&

      event.target.closest(
        ".game"
      )
    ) {

      event.preventDefault();

    }

  }
);


/* =========================
   BUTTON EVENTS
========================= */


/*
  HOME 버튼
  → 시작 화면으로 이동

  진행 기록은 삭제하지 않음
*/

$("#resetButton")
  ?.addEventListener(
    "click",

    (event) => {

      event.preventDefault();


      stopTimer();


      removeDragGhost();


      cleanupPointerListeners();


      selected =
        null;


      gameOver =
        false;


      $("#clearOverlay").hidden =
        true;


      $("#gameOverOverlay").hidden =
        true;


      board.innerHTML =
        "";


      updateContinueButton();


      $("#startOverlay").hidden =
        false;

    }
  );


/*
  처음부터 시작
*/

$("#startButton")
  ?.addEventListener(
    "click",

    (event) => {

      event.preventDefault();


      $("#startOverlay").hidden =
        true;


      shuffleNonce =
        0;


      startLevel(
        1
      );


      playTick();

    }
  );


/*
  이어하기
*/

$("#continueButton")
  ?.addEventListener(
    "click",

    (event) => {

      event.preventDefault();


      $("#startOverlay").hidden =
        true;


      shuffleNonce =
        0;


      startLevel(
        getContinueLevel()
      );


      playTick();

    }
  );


/*
  클리어 화면에서
  같은 레벨 다시 플레이
*/

$("#restartButton")
  ?.addEventListener(
    "click",

    (event) => {

      event.preventDefault();


      shuffleNonce++;


      startLevel(
        level
      );

    }
  );


/*
  막힘 / 시간초과 후
  같은 레벨을 새 배치로 다시하기
*/

$("#gameOverRestartButton")
  ?.addEventListener(
    "click",

    (event) => {

      event.preventDefault();


      shuffleNonce++;


      startLevel(
        level
      );

    }
  );


/*
  다음 레벨
*/

$("#nextButton")
  ?.addEventListener(
    "click",

    (event) => {

      event.preventDefault();


      shuffleNonce =
        0;


      startLevel(
        level + 1
      );

    }
  );


/*
  SOUND
*/

$("#settingsButton")
  ?.addEventListener(
    "click",

    (event) => {

      event.preventDefault();


      muted =
        !muted;


      showToast(
        muted
          ? "소리를 껐어요."
          : "소리를 켰어요."
      );

    }
  );


/* =========================
   INITIAL
========================= */

loadProgress();


updateContinueButton();


const levelValue =
  $("#levelValue");


if (levelValue) {

  levelValue.textContent =
    "1";

}


const initialTimer =
  $("#timerValue");


if (initialTimer) {

  initialTimer.textContent =
    formatTime(
      LEVELS[0].time
    );

}