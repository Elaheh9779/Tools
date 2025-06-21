const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const reloadImageBtn = document.getElementById("reloadImage");
const submitBtn = document.getElementById("submitBtn");
const createPolygonBtn = document.getElementById("createPolygon");
const editModeBtn = document.getElementById("editMode");
const deletePointBtn = document.getElementById("deletePoint");
const spinner = document.getElementById("spinner");
const modal = document.getElementById("modal");
const BASE_URL = "";

let img = new Image();
let polygons = [];
let currentPolygonIndex = -1;
let editMode = false;
let deleteMode = false;
let draggingPoint = null;
let mousePos = { x: 0, y: 0 };
let hoveredNode = null;
let currentImageUrl = "";
let currentID;

function resetState() {
  editMode = false;
  deleteMode = false;
  polygons = [];
  currentPolygonIndex = polygons.push([]) - 1;
  setActiveButton(createPolygonBtn);
  canvas.style.cursor = "crosshair";
}

async function loadImage() {
  try {
    spinner.style.display = "block";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resetState();

    const response = await fetch("get_random_image.php");
    const data = await response.json();
    currentImageUrl = data.image;

    img.onload = () => {
      const container = document.querySelector(".container");
      const maxWidth = container.clientWidth;
      const scaleFactor = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scaleFactor;
      spinner.style.display = "none";
      redraw();
    };
    img.src = currentImageUrl;
  } catch (error) {
    spinner.style.display = "none";
    alert("Failed to load image: " + error.message);
  }
}

function setActiveButton(button) {
  [createPolygonBtn, editModeBtn, deletePointBtn].forEach((btn) =>
    btn.classList.remove("active")
  );
  button.classList.add("active");
}

function showModal(message) {
  document.getElementById("modalContent").innerText = message;
  modal.style.display = "flex";
  setTimeout(() => {
    modal.style.display = "none";
  }, 3000);
}

async function submitPolygons() {
  const formatted = polygons
    .filter((p) => p.length >= 3)
    .map((polygon) =>
      polygon.map((point) => ({
        x: parseFloat((point.x / canvas.width).toFixed(4)),
        y: parseFloat((point.y / canvas.height).toFixed(4)),
      }))
    );

  if (formatted.length === 0) {
    alert("No valid polygons to submit.");
    return;
  }

  try {
    const response = await fetch("store_data.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: currentImageUrl,
        polygons: formatted,
        user_id: currentID,
      }),
    });

    if (response.ok) {
      showModal("Submitted completely. Thank you for your efforts.");
    } else {
      alert("Submission failed.");
    }
  } catch (err) {
    alert("Error during submission: " + err.message);
  }
}

window.onload = loadImage;
reloadImageBtn.addEventListener("click", loadImage);
submitBtn.addEventListener("click", submitPolygons);

console.log("currentPolygonIndex", currentPolygonIndex);

createPolygonBtn.addEventListener("click", () => {
  if (editMode === false && deleteMode === false) return;
  editMode = false;
  deleteMode = false;
  currentPolygonIndex = polygons.push([]) - 1;
  setActiveButton(createPolygonBtn);
  canvas.style.cursor = "crosshair";
});

editModeBtn.addEventListener("click", () => {
  if (polygons[currentPolygonIndex].length) return;
  editMode = true;
  deleteMode = false;
  setActiveButton(editModeBtn);
});

deletePointBtn.addEventListener("click", () => {
  if (polygons[currentPolygonIndex].length) return;

  deleteMode = true;
  editMode = false;
  setActiveButton(deletePointBtn);
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (deleteMode) {
    for (let i = polygons.length - 1; i >= 0; i--) {
      let polygon = polygons[i];
      let polygonShallow = [...polygon];
      for (let j = 0; j < polygon.length; j++) {
        const point = polygon[j];
        if (Math.abs(point.x - x) <= 12 && Math.abs(point.y - y) <= 12) {
          polygon.splice(j, 1);
          if (hasAnyIntersection(polygons)) {
            polygons[i] = polygonShallow;
            window.alert("Deleting this node will create an intersection.");
            return;
          }
          if (polygon.length === 2) {
            if (window.confirm("Do you want to remove the polygon?")) {
              polygons.splice(i, 1);
              currentPolygonIndex = polygons.length - 1;
            } else {
              polygon.splice(j, 0, point);
              currentPolygonIndex = polygons.length - 1;
            }
          }
          redraw();
          return;
        }
      }

      if (polygon.length >= 3 && isPointInPolygon({ x, y }, polygon)) {
        if (window.confirm("Do you want to remove the polygon?")) {
          polygons.splice(i, 1);
          currentPolygonIndex = polygons.length - 1;
          redraw();
        }
        return;
      }
    }
    return;
  }

  if (!editMode && currentPolygonIndex !== -1) {
    if (currentPolygonIndex === 5) {
      alert("Maximum number of polygons reached!");
      return;
    }
    let polygon = polygons[currentPolygonIndex];
    let polygonShallow = [...polygon];

    if (polygon.length >= 3) {
      const first = polygon[0];
      const last = polygon[polygon.length - 1];

      if (Math.abs(first.x - x) <= 12 && Math.abs(first.y - y) <= 12) {
        for (const other of polygons) {
          for (let j = 0; j < other.length - 1; j++) {
            const a = other[j];
            const b = other[j + 1];
            if (
              other === polygon &&
              (a === last || b === last || a === first || b === first)
            )
              continue;
            if (doLinesIntersect(last, first, a, b)) return;
          }
        }
        if (hasAnyIntersection(polygons)) {
          window.alert(
            "Adding this node is blocked. because it adds intersection which is not allowed."
          );
          return;
        }
        currentPolygonIndex = polygons.push([]) - 1;
        updateToolbarState();
        redraw();
        return;
      }
    }

    const newPoint = { x, y };
    for (let i = 0; i < polygons.length; i++) {
      if (i !== currentPolygonIndex && isPointInPolygon(newPoint, polygons[i]))
        return;
    }

    const lastPoint = polygon[polygon.length - 1];
    if (lastPoint) {
      for (const other of polygons) {
        for (let j = 0; j < other.length - 1; j++) {
          const a = other[j];
          const b = other[j + 1];
          if (other === polygon && (a === lastPoint || b === lastPoint))
            continue;
          if (doLinesIntersect(lastPoint, newPoint, a, b)) return;
        }
      }
    }

    polygon.push(newPoint);
    updateToolbarState();
    redraw();
  }
});

canvas.addEventListener("mousedown", (event) => {
  if (!editMode) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  for (let i = 0; i < polygons.length; i++) {
    for (let j = 0; j < polygons[i].length; j++) {
      const point = polygons[i][j];
      if (Math.abs(point.x - x) <= 12 && Math.abs(point.y - y) <= 12) {
        draggingPoint = { polygonIndex: i, pointIndex: j };
        return;
      }
    }
  }
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  mousePos = { x, y };
  hoveredNode = null;
  let hovering = false;

  for (let i = 0; i < polygons.length; i++) {
    for (let j = 0; j < polygons[i].length; j++) {
      const point = polygons[i][j];
      if (Math.abs(point.x - x) <= 12 && Math.abs(point.y - y) <= 12) {
        hovering = true;
        if (deleteMode) hoveredNode = { polygonIndex: i, pointIndex: j };
        break;
      }
    }
  }

  if (editMode) {
    canvas.style.cursor = hovering ? "pointer" : "default";
  } else if (deleteMode) {
    const trashCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='black' viewBox='0 0 24 24'><path d='M3 6h18v2H3zm2 3h14l-1.5 13h-11z'/></svg>") 12 12, auto`;
    canvas.style.cursor = hovering ? trashCursor : "default";
  } else if (!editMode && !deleteMode && currentPolygonIndex !== -1) {
    const polygon = polygons[currentPolygonIndex];

    // ✅ NEW: Show checkmark cursor if hovering near first point
    if (polygon.length >= 3) {
      const first = polygon[0];
      if (Math.abs(first.x - x) <= 12 && Math.abs(first.y - y) <= 12) {
        const checkCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='green' viewBox='0 0 24 24'><path d='M20.285 6.709l-11.264 11.264-5.285-5.285 1.414-1.414 3.871 3.871 9.85-9.85z'/></svg>") 12 12, auto`;
        canvas.style.cursor = checkCursor;
        redraw();
        return;
      }
    }

    // Default create mode cursor
    canvas.style.cursor = "crosshair";
  }

  if (!draggingPoint) {
    redraw();
    return;
  }

  const { polygonIndex, pointIndex } = draggingPoint;
  const originalPoint = polygons[polygonIndex][pointIndex];
  polygons[polygonIndex][pointIndex] = { x, y };

  if (!isValidMove(polygons[polygonIndex], polygonIndex)) {
    polygons[polygonIndex][pointIndex] = originalPoint;
  }

  redraw();
});

canvas.addEventListener("mouseup", () => {
  draggingPoint = null;
});

// canvas.addEventListener('dblclick', () => {
//   if (!editMode && !deleteMode && currentPolygonIndex !== -1) {
//     if (polygons[currentPolygonIndex].length > 0) {
//       polygons[currentPolygonIndex].pop();
//     }
//     createPolygonBtn.click();
//   }
// });

function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function doLinesIntersect(p1, p2, q1, q2) {
  function ccw(a, b, c) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  return (
    ccw(p1, q1, q2) !== ccw(p2, q1, q2) && ccw(p1, p2, q1) !== ccw(p1, p2, q2)
  );
}

function isValidMove(polygon, polygonIndex) {
  for (let i = 0; i < polygon.length; i++) {
    const a1 = polygon[i];
    const a2 = polygon[(i + 1) % polygon.length];
    for (let j = 0; j < polygon.length; j++) {
      if (
        Math.abs(i - j) <= 1 ||
        (i === 0 && j === polygon.length - 1) ||
        (j === 0 && i === polygon.length - 1)
      )
        continue;
      const b1 = polygon[j];
      const b2 = polygon[(j + 1) % polygon.length];
      if (doLinesIntersect(a1, a2, b1, b2)) return false;
    }
    for (let k = 0; k < polygons.length; k++) {
      if (k === polygonIndex) continue;
      const other = polygons[k];
      for (let m = 0; m < other.length; m++) {
        const c1 = other[m];
        const c2 = other[(m + 1) % other.length];
        if (doLinesIntersect(a1, a2, c1, c2)) return false;
      }
    }
  }
  return true;
}

function hasAnyIntersection(polygons) {
  for (let i = 0; i < polygons.length; i++) {
    const polyA = polygons[i];

    // 1. Self-intersection in polyA
    for (let a = 0; a < polyA.length; a++) {
      const a1 = polyA[a];
      const a2 = polyA[(a + 1) % polyA.length];
      for (let b = 0; b < polyA.length; b++) {
        if (
          Math.abs(a - b) <= 1 ||
          (a === 0 && b === polyA.length - 1) ||
          (b === 0 && a === polyA.length - 1)
        )
          continue;

        const b1 = polyA[b];
        const b2 = polyA[(b + 1) % polyA.length];
        if (doLinesIntersect(a1, a2, b1, b2)) return true;
      }
    }

    // 2. Check against every other polygon
    for (let j = 0; j < polygons.length; j++) {
      if (i === j) continue;

      const polyB = polygons[j];

      // 2.1 Line intersection check
      for (let a = 0; a < polyA.length; a++) {
        const a1 = polyA[a];
        const a2 = polyA[(a + 1) % polyA.length];
        for (let b = 0; b < polyB.length; b++) {
          const b1 = polyB[b];
          const b2 = polyB[(b + 1) % polyB.length];
          if (doLinesIntersect(a1, a2, b1, b2)) return true;
        }
      }

      // 2.2 Full containment check
      // If all points of polyB are inside polyA, or vice versa
      if (
        polyA.length >= 3 &&
        polyB.length >= 3 &&
        (polyB.every((pt) => isPointInPolygon(pt, polyA)) ||
          polyA.every((pt) => isPointInPolygon(pt, polyB)))
      ) {
        return true;
      }
    }
  }

  return false;
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  polygons.forEach((polygon, i) => {
    if (polygon.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(polygon[0].x, polygon[0].y);
      for (let j = 1; j < polygon.length; j++) {
        ctx.lineTo(polygon[j].x, polygon[j].y);
      }
      if (polygon.length >= 3 && currentPolygonIndex !== i) {
        ctx.closePath();
        ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
        ctx.fill();
      }
      ctx.strokeStyle = "blue";
      ctx.stroke();
    }

    polygon.forEach((point, j) => {
      let color = "red";
      if (
        (deleteMode || editMode) &&
        hoveredNode &&
        hoveredNode.polygonIndex === i &&
        hoveredNode.pointIndex === j
      ) {
        color = "yellow";
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  if (!editMode && !deleteMode && currentPolygonIndex !== -1) {
    const polygon = polygons[currentPolygonIndex];
    if (polygon.length > 0) {
      const last = polygon[polygon.length - 1];

      // ✅ Check intersection
      let intersects = false;
      for (let i = 0; i < polygons.length; i++) {
        const poly = polygons[i];
        for (let j = 0; j < poly.length; j++) {
          const a = poly[j];
          const b = poly[(j + 1) % poly.length];

          // 🛑 Skip adjacent lines in same polygon
          if (
            poly === polygon &&
            (a === last || b === last || polygon[0] === b)
          ) {
            continue;
          }

          if (doLinesIntersect(last, mousePos, a, b)) {
            intersects = true;
            break;
          }
        }
        if (intersects) break;
      }

      // 🔴 Set color based on intersection
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = intersects ? "red" : "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function hasUnfinishedPolygon() {
  return polygons[currentPolygonIndex]?.length > 0;
}

function updateToolbarState() {
  editModeBtn.disabled = hasUnfinishedPolygon();
  deletePointBtn.disabled = hasUnfinishedPolygon();
}
