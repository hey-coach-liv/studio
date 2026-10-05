// Drawing pad for the "Leave a note" form. The drawing is attached as a PNG when the form is sent.
(() => {
  const form = document.getElementById("note-form");
  const wrap = document.getElementById("canvas-wrap");
  const canvas = document.getElementById("pad");
  if (!form || !canvas) return;

  const ctx = canvas.getContext("2d");
  const hint = document.getElementById("pad-hint");
  const error = document.getElementById("form-error");
  const state = { tool: "pencil", color: "#151515", size: 3, drawing: false, dirty: false, last: null };
  const history = [];

  const sent = document.getElementById("sent-note");

  function resize() {
    const snapshot = state.dirty ? canvas.toDataURL() : null;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = wrap.getBoundingClientRect();
    if (Math.round(width * ratio) === canvas.width && Math.round(height * ratio) === canvas.height) return;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (snapshot) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = snapshot;
    }
  }

  function saveHistory() {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 30) history.shift();
  }

  function markDirty() {
    state.dirty = true;
    hint.hidden = true;
    error.hidden = true;
  }

  function point(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function stroke(from, to) {
    ctx.save();
    ctx.globalCompositeOperation = state.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = state.color;
    ctx.lineWidth = state.tool === "eraser" ? state.size * 4 : state.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  function placeText(at) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "pad-text-input";
    input.placeholder = "Type, then press Enter";
    input.style.left = `${at.x}px`;
    input.style.top = `${at.y}px`;
    input.style.color = state.color;
    wrap.appendChild(input);
    input.focus();
    let done = false;
    const commit = () => {
      if (done) return;
      done = true;
      const text = input.value.trim();
      input.remove();
      if (!text) return;
      saveHistory();
      const fontSize = state.size > 3 ? 30 : 20;
      ctx.fillStyle = state.color;
      ctx.font = `${fontSize}px Gelasio, Georgia, serif`;
      ctx.textBaseline = "top";
      ctx.fillText(text, at.x, at.y);
      markDirty();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { done = true; input.remove(); }
    });
    input.addEventListener("blur", commit);
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (state.tool === "text") {
      e.preventDefault();
      placeText(point(e));
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    saveHistory();
    state.drawing = true;
    state.last = point(e);
    stroke(state.last, state.last);
    markDirty();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!state.drawing) return;
    const next = point(e);
    stroke(state.last, next);
    state.last = next;
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach((type) =>
    canvas.addEventListener(type, () => { state.drawing = false; })
  );

  function selectIn(group, button) {
    group.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("is-active", b === button);
      if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", b === button);
    });
  }

  form.querySelectorAll("[data-tool]").forEach((button) =>
    button.addEventListener("click", () => {
      state.tool = button.dataset.tool;
      wrap.dataset.tool = state.tool;
      selectIn(button.parentElement, button);
    })
  );

  form.querySelectorAll("[data-color]").forEach((button) =>
    button.addEventListener("click", () => {
      state.color = button.dataset.color;
      if (state.tool === "eraser") form.querySelector('[data-tool="pencil"]').click();
      selectIn(button.parentElement, button);
    })
  );

  form.querySelectorAll("[data-size]").forEach((button) =>
    button.addEventListener("click", () => {
      state.size = Number(button.dataset.size);
      selectIn(button.parentElement, button);
    })
  );

  document.getElementById("undo").addEventListener("click", () => {
    const previous = history.pop();
    if (!previous) return;
    ctx.putImageData(previous, 0, 0);
    if (!history.length) { state.dirty = false; hint.hidden = false; }
  });

  document.getElementById("clear").addEventListener("click", () => {
    if (!state.dirty) return;
    saveHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.dirty = false;
    hint.hidden = false;
  });

  function drawingBlob() {
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const octx = out.getContext("2d");
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0);
    return new Promise((resolve) => out.toBlob(resolve, "image/png"));
  }

  function resetPad() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    history.length = 0;
    state.dirty = false;
    hint.hidden = false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = form.elements.Message.value.trim();
    if (!state.dirty && !message) {
      error.textContent = "Add a drawing or a message before sending.";
      error.hidden = false;
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    const label = button.innerHTML;
    button.disabled = true;
    button.textContent = "Sending...";
    error.hidden = true;

    const data = new FormData(form);
    data.delete("_next");
    data.delete("attachment");
    if (state.dirty) data.append("attachment", await drawingBlob(), "drawing.png");

    try {
      const response = await fetch(form.dataset.endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || String(result.success) === "false") throw new Error(result.message || "Send failed");
      form.reset();
      resetPad();
      sent.hidden = false;
      sent.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      error.textContent = "Sorry, that didn't send. Please try again or email oyong.partner@gmail.com.";
      error.hidden = false;
    } finally {
      button.disabled = false;
      button.innerHTML = label;
    }
  });

  window.addEventListener("resize", resize);
  resize();
})();
