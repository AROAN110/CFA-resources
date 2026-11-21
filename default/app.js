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
  function base(p) { return p.split("/").pop(); }
  function tabOf(p) { return openTabs.find(function (x) { return x.path === p; }); }

  // ---------- 文件树 ----------
  function listDir(path, el, indent) {
    el.innerHTML = '<div class="node dim">loading...</div>';
    CFA.request("fs.list", { path: path }).then(function (d) {
      var items = (d.items || []).sort(function (a, b) {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name < b.name ? -1 : 1;
      });
      el.innerHTML = "";
      if (!items.length) { el.innerHTML = '<div class="node dim">(empty)</div>'; return; }
      items.forEach(function (it) {
        var div = document.createElement("div");
        div.className = "node " + it.type;
        div.style.paddingLeft = (12 + indent * 14) + "px";
        div.textContent = (it.type === "dir" ? "\u{1F4C1} " : "\u{1F4C4} ") + it.name;
        var timer = null, held = false;
        div.addEventListener("touchstart", function () {
          held = false;
          timer = setTimeout(function () { held = true; fileMenu(it); }, 600);
        });
        div.addEventListener("touchend", function () { clearTimeout(timer); });
        div.onclick = function () {
          if (held) { held = false; return; }
          it.type === "dir" ? toggleDir(it.path, div, indent) : openFile(it.path);
        };
        el.appendChild(div);
      });
    }, function (e) {
      el.innerHTML = '<div class="node err">error: ' + esc(e.code || "?") + "</div>";
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

  // 长按菜单：重命名 / 删除
  function fileMenu(it) {
    var op = prompt(base(it.path) + "\n1=rename  2=delete  (cancel=none)");
    if (op === "1") {
      var nn = prompt("new name:", base(it.path));
      if (!nn || nn === base(it.path)) return;
      var np = it.path.slice(0, it.path.length - base(it.path).length) + nn;
      CFA.request("fs.write", { path: np, content: "" }).then(function () {
        CFA.request("fs.delete", { path: it.path }).then(function () {
          if (tabOf(it.path)) closeTab(it.path);
          refreshTree();
          show("renamed");
        });
      }, function (e) { show("rename failed: " + (e.code || "?")); });
    } else if (op === "2") {
      if (!confirm("delete " + base(it.path) + "?")) return;
      CFA.request("fs.delete", { path: it.path }).then(function () {
        if (tabOf(it.path)) closeTab(it.path);
        refreshTree();
        show("deleted");
      }, function (e) { show("delete failed: " + (e.code || "?")); });
    }
  }

  // ---------- 多标签 ----------
  function openFile(path) {
    if (tabOf(path)) return activate(path);
    CFA.request("fs.read", { path: path }).then(function (d) {
      openTabs.push({ path: path, content: d.content, dirty: false });
      activate(path);
    }, function (e) { show("open failed: " + (e.code || "?") + (e.message ? " " + e.message : "")); });
  }
  function activate(path) {
    activePath = path;
    renderTabs();
    $("editor").value = tabOf(path).content;
    $("empty-hint").style.display = "none";
    $("st-file").textContent = path + (tabOf(path).dirty ? " \u25CF" : "");
  }
  function renderTabs() {
    var bar = $("tabs");
    bar.innerHTML = "";
    openTabs.forEach(function (t) {
      var div = document.createElement("div");
      div.className = "tab" + (t.path === activePath ? " active" : "");
      div.textContent = base(t.path) + (t.dirty ? " \u25CF" : "");
      div.onclick = function () { activate(t.path); };
      var x = document.createElement("span");
      x.className = "x";
      x.textContent = "\u00D7";
      x.onclick = function (ev) { ev.stopPropagation(); closeTab(t.path); };
      div.appendChild(x);
      bar.appendChild(div);
    });
  }
  function closeTab(path) {
    var t = tabOf(path);
    if (t && t.dirty && !confirm(base(path) + " has unsaved changes, close anyway?")) return;
    var i = openTabs.indexOf(t);
    openTabs.splice(i, 1);
    if (activePath === path) {
      activePath = openTabs.length ? openTabs[Math.max(0, i - 1)].path : null;
      if (activePath) activate(activePath);
      else {
        $("editor").value = "";
        $("empty-hint").style.display = "flex";
        $("st-file").textContent = "no file";
        renderTabs();
      }
    } else renderTabs();
  }

  // ---------- 保存 / 新建 / 运行 ----------
  function saveActive() {
    if (!activePath) return show("no file");
    var t = tabOf(activePath);
    CFA.request("fs.write", { path: t.path, content: $("editor").value }).then(function () {
      t.content = $("editor").value;
      t.dirty = false;
      renderTabs();
      $("st-file").textContent = t.path;
      show("saved");
    }, function (e) { show("save failed: " + (e.code || "?") + (e.message ? " " + e.message : "")); });
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

  // ---------- 接线 ----------
  waitBridge(function () {
    refreshTree();
    refreshStatus();
    $("editor").addEventListener("input", function () {
      var t = tabOf(activePath);
      if (t && !t.dirty) { t.dirty = true; renderTabs(); $("st-file").textContent = t.path + " \u25CF"; }
    });
    document.querySelectorAll("#termbar button[data-cmd]").forEach(function (b) {
      b.onclick = function () { sendCmd(b.dataset.cmd); };
    });
    $("btn-run").onclick = runActive;
    $("btn-menu").onclick = function () {
      var op = prompt("1=save  2=new file  3=refresh tree");
      if (op === "1") saveActive();
      else if (op === "2") newFile();
      else if (op === "3") refreshTree();
    };
    setInterval(refreshStatus, 5000);
  });
})();
