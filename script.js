const canvas = document.getElementById("canvas");     // 内部用（8192px）
const ctx = canvas.getContext("2d");
const preview = document.getElementById("preview");   // 表示用（4096px）
const pctx = preview.getContext("2d");

const upload = document.getElementById("imageUpload");
const textInput = document.getElementById("textInput");
const zoomInput = document.getElementById("zoom");

// 影の不透明度
let shadowOpacity = 0.3;
document.getElementById("shadowOpacity").addEventListener("input", e => {
  shadowOpacity = parseFloat(e.target.value);
  document.getElementById("shadowValue").textContent = shadowOpacity.toFixed(2); // ← 表示更新
  draw();
});


let background = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

let dragging = false;
let lastX, lastY;


// プレビューキャンバスでマウス操作
preview.addEventListener("mousedown", e => {
  dragging = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
});

preview.addEventListener("mousemove", e => {
  if (!dragging) return;
  let dx = e.offsetX - lastX;
  let dy = e.offsetY - lastY;
  
  // 内部キャンバスはプレビューの2倍なので補正
  offsetX += dx * 2;
  offsetY += dy * 2;

  lastX = e.offsetX;
  lastY = e.offsetY;

  draw();
});

preview.addEventListener("mouseup", () => dragging = false);
preview.addEventListener("mouseleave", () => dragging = false);


function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 背景画像（拡大縮小対応）
  if (background) {
  const imgW = background.width * scale * 2; 
  const imgH = background.height * scale * 2;
  ctx.drawImage(background, offsetX, offsetY, imgW, imgH);
}

  // 白枠
  ctx.lineWidth = 70;
  ctx.strokeStyle = "white";
  roundRect(ctx, 130, 130, canvas.width - 260, canvas.height - 260, 25); 
  ctx.stroke();
  ctx.shadowColor = "rgba(255, 255, 255, 0.93)"; // 白に近い影
  ctx.shadowBlur = 30;                       // ぼかし半径
  ctx.shadowOffsetX = 0;                     // 横ずれなし
  ctx.shadowOffsetY = 0;                     // 縦ずれなし

  ctx.strokeRect(ctx, 130, 130, canvas.width - 250, canvas.height - 250);

// 影の設定をリセット（他の描画に影を残さないため）
ctx.shadowColor = "transparent";

  // テキスト（改行対応 + 影ぼかし）
  ctx.font = "780px 'IPAexGothic', sans-serif"; // 2倍サイズで描画
  ctx.fillStyle = "white";
  ctx.shadowColor = `rgba(0,0,0,${shadowOpacity})`;
  ctx.shadowBlur = 70;
  ctx.shadowOffsetX = 70;
  ctx.shadowOffsetY =  50;

  const lines = textInput.value.toUpperCase().split("\n");
  const lineHeight = 880; // 行間も2倍に
  lines.forEach((line, i) => {
    ctx.fillText(line, 270, 910 + i * lineHeight);
  });

  ctx.shadowColor = "transparent"; // 影リセット


 // プレビューに縮小して描画
  pctx.clearRect(0, 0, preview.width, preview.height);
  pctx.drawImage(canvas, 0, 0, preview.width, preview.height);
}

// 画像アップロード
upload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    background = img;
    draw();
  };
  img.src = URL.createObjectURL(file);
});

// 入力イベント
textInput.addEventListener("input", draw);
zoomInput.addEventListener("input", e => {
  scale = parseFloat(e.target.value);
  document.getElementById("zoomValue").textContent = scale.toFixed(2); // ← 表示更新
  draw();
});

// 保存処理（showSaveFilePicker対応版）
document.getElementById("saveBtn").addEventListener("click", async () => {
  try {
    // 1️⃣ Blob を確実に生成
    const blob = await new Promise((resolve) => {
      preview.toBlob((b) => resolve(b), "image/png");
    });
    if (!blob) throw new Error("Blobが生成されませんでした");

    // 2️⃣ showSaveFilePickerが使えるか確認
    if ("showSaveFilePicker" in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: "thumbnail.png",
        types: [
          {
            description: "PNG Image",
            accept: { "image/png": [".png"] },
          },
        ],
      });

      // 3️⃣ 書き込み
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      alert("保存が完了しました ✅");
      return;
    }

    // 4️⃣ 非対応ブラウザ用フォールバック
    const link = document.createElement("a");
    link.download = "thumbnail.png";
    link.href = URL.createObjectURL(blob);
    link.click();
  } catch (err) {
    console.error("保存エラー:", err);
    alert("保存に失敗しました。ブラウザの対応状況を確認してください。");
  }
});



// 初期描画
draw();