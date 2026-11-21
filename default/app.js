(function () {
  "use strict";
  function waitBridge(cb) {
    if (window.CFA) return cb();
    var tries = 0;
    var timer = setInterval(function () {
      if (window.CFA) { clearInterval(timer); cb(); }
      else if (++tries > 2000) { clearInterval(timer); show("bridge timeout"); }
    }, 30);
    window.addEventListener("CFA_READY", function () {
      clearInterval(timer); if (window.CFA) cb();
    });
  }
  var openTabs = [];
  var activePath = null;
  function $(id) { return document.getElementById(id); }
  function show(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", "\u0022": "&" + "quot;" }[c];
    });
  }
  function listDir(path, el, indent) {
    CFA.request("fs.list", { path: path }).then(function (d) {
      var items = (d.items || []).sort(function (a, b) {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name < b.name ? -1 : 1;
      });
      el.innerHTML = "";
      if (!items.length) { el.innerHTML = '<div class="node" style="color:#555">(empty)</div>'; return; }
      items.forEach(function (it) {
        var div = document.createElement("div");
        div.className = "node " + (it.type === "dir" ? "dir" : "file");
        div.style.paddingLeft = (12 + indent * 14) + "px";
        div.textContent = (it.type === "dir" ? "\u{1F4C1} " : "\u{1F4C4} ") + it.name;
        div.onclick = function () { it.type === "dir" ? toggleDir(it.path, div, indent) : openFile(it.path); };
        el.appendChild(div);
      });
    }, function (e) {
      el.innerHTML = '<div class="node" style="color:#f14c4c">error: ' + esc(e.code || "?") + "</div>";
    });
  }
  function toggleDir(path, nodeDiv, indent) {
    var next = nodeDiv.nextElementSibling;
    if (next && next.classList.contains("children")) {
      next.classList.toggle("open");
      return;
    }
    var box = document.createElement("div");
    box.className = "children open";
    nodeDiv.after(box);
    listDir(path, box, indent + 1);
  }
  function refreshTree() { listDir(".", $("filetree"), 0); }
  function openFile(path) {
    var t = openTabs.find(function (x) { return x.path === path; });
    if (t) return activate(path);
    CFA.request("fs.read", { path: path }).then(function (d) {
      openTabs.push({ path: path, content: d.content, dirty: false });
      activate(path);
    }, function (e) { show("open failed: " + (e.code || "?")); });
  }
  function activate(path) {
    activePath = path;
    renderTabs();
    var t = openTabs.find(function (x) { return x.path === path; });
    $("editor").value = t.content;
    $("empty-hint").style.display = "none";
    $("st-file").textContent = path + (t.dirty ? " \u25CF" : "");
  }
  function renderTabs() {
    var bar = $("tabs");
    bar.innerHTML = "";
    openTabs.forEach(function (t) {
      var div = document.createElement("div");
      div.className = "tab" + (t.path === activePath ? " active" : "");
      div.textContent = t.path.split("/").pop() + (t.dirty ? " \u25CF" : "");
      div.onclick = function () { activate(t.path); };
      bar.appendChild(div);
    });
  }
  function saveActive() {
    if (!activePath) return show("no file");
    var t = openTabs.find(function (x) { return x.path === activePath; });
    CFA.request("fs.write", { path: t.path, content: $("editor").value }).then(function () {
      t.dirty = false;
      renderTabs();
      $("st-file").textContent = t.path;
      show("saved");
    }, function (e) { show("save failed: " + (e.code || "?")); });
  }
  function newFile() {
    var name = prompt("new file name:");
    if (!name) return;
    CFA.request("fs.write", { path: name, content: "" }).then(function () {
      refreshTree();
      openFile(name);
    }, function (e) { show("create failed: " + (e.code || "?")); });
  }
  function runActive() {
    if (!activePath) return show("no file");
    saveActive();
    var ext = activePath.split(".").pop().toLowerCase();
    var cmd = { py: "python3", js: "node", sh: "sh" }[ext] || "cat";
    CFA.request("terminal.write", { command: cmd + " " + activePath }).then(function () {
      show("sent: " + cmd);
    }, function (e) { show("run failed: " + (e.code || "?")); });
  }
  function sendCmd(cmd) {
    CFA.request("terminal.write", { command: cmd }).then(function () {
      show("$ " + cmd);
    }, function (e) { show("failed: " + (e.code || "?")); });
  }
  function refreshStatus() {
    CFA.request("terminal.status", {}).then(function (d) {
      $("st-term").textContent = d.running ? "terminal: running" : "terminal: stopped";
    }, function () { $("st-term").textContent = "terminal: ?"; });
  }
  waitBridge(function () {
    refreshTree();
    refreshStatus();
    $("editor").addEventListener("input", function () {
      var t = openTabs.find(function (x) { return x.path === activePath; });
      if (t && !t.dirty) { t.dirty = true; renderTabs(); }
    });
    document.querySelectorAll("#termbar button[data-cmd]").forEach(function (b) {
      b.onclick = function () { sendCmd(b.dataset.cmd); };
    });
    $("btn-run").onclick = runActive;
    $("btn-menu").onclick = function () {
      var op = prompt("1=save  2=new file  3=refresh");
      if (op === "1") saveActive();
      else if (op === "2") newFile();
      else if (op === "3") refreshTree();
    };
    setInterval(refreshStatus, 5000);
  });
})();
