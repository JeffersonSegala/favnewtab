const viewport = document.getElementById("viewport");
const titleEl = document.getElementById("title");
const backBtn = document.getElementById("back");


let homeData = [];
let navigationStack = [];
let dragSourceId = null;


chrome.bookmarks.getTree(tree => {
  const barra = tree[0].children.find(n => n.id === "1");
  const normalized = barra.children.map(deepNormalize);


  chrome.storage.local.get(["homeOrder"], res => {
    homeData = applyOrder(normalized, res.homeOrder);
    renderHome();
  });
});


function deepNormalize(node) {
  const isFolder = !node.url;
  return {
    id: node.id,
    title: node.title || "",
    url: node.url || null,
    isFolder,
    children: isFolder ? node.children.map(deepNormalize) : []
  };
}

function applyOrder(items, order) {
  if (!order) return items;


  const map = new Map(items.map(i => [i.id, i]));
  const ordered = [];


  order.forEach(id => {
    if (map.has(id)) ordered.push(map.get(id));
  });


  items.forEach(i => {
    if (!order.includes(i.id)) ordered.push(i);
  });


  return ordered;
}


function persistOrder() {
  chrome.storage.local.set({
    homeOrder: homeData.map(i => i.id)
  });
}

function renderHome() {
  navigationStack = [];
  backBtn.hidden = true;
  renderView("Favoritos", homeData, true);
}

function renderView(title, items, draggable = false) {
  titleEl.textContent = title;
  viewport.innerHTML = "";


  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "item";
    el.dataset.id = item.id;


    if (draggable) {
      el.draggable = true;
      el.addEventListener("dragstart", onDragStart);
      el.addEventListener("dragover", onDragOver);
      el.addEventListener("drop", onDrop);
      el.addEventListener("dragend", onDragEnd);
    }


    const icon = document.createElement("div");
    icon.className = "icon";


    if (item.isFolder) {
      const grid = document.createElement("div");
      grid.className = "folder-grid";


      item.children
        .filter(c => c.url)
        .slice(0, 9)
        .forEach(child => {
          const img = document.createElement("img");
          img.src = getFavicon(child.url);
          grid.appendChild(img);
        });


      icon.appendChild(grid);
      el.onclick = () => openFolder(item);
    } else {
      const img = document.createElement("img");
      img.src = getFavicon(item.url);
      icon.appendChild(img);
      el.onclick = () => location.href = item.url;
    }


    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "Lorem ipsum";


    el.appendChild(icon);
    el.appendChild(label);
    viewport.appendChild(el);
  });
}

function onDragStart(e) {
  console.log("dragstart");
  dragSourceId = this.dataset.id;
  this.classList.add("dragging");
}


function onDragOver(e) {
  e.preventDefault();

  document.querySelectorAll('.item.drag-over')
    .forEach(el => el.classList.remove('drag-over'));

  this.classList.add('drag-over');
}

function onDrop(e) {
  console.log("drop");
  e.preventDefault();
  const targetId = this.dataset.id;
  if (dragSourceId === targetId) return;


  const from = homeData.findIndex(i => i.id === dragSourceId);
  const to = homeData.findIndex(i => i.id === targetId);


  const [moved] = homeData.splice(from, 1);
  homeData.splice(to, 0, moved);


  persistOrder();
  renderHome();
}

function onDragEnd() {
  dragSourceId = null;
  document.querySelectorAll('.item').forEach(i => {
    i.classList.remove('dragging', 'drag-over');
  });
}


function openFolder(folder) {
  navigationStack.push(folder);
  backBtn.hidden = false;
  backBtn.onclick = goBack;
  renderView(folder.title, folder.children);
}


function goBack() {
  navigationStack.pop();


  if (navigationStack.length === 0) {
    renderHome();
  } else {
    const current = navigationStack[navigationStack.length - 1];
    renderView(current.title, current.children);
  }
}

function getFavicon(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return "";
  }
}