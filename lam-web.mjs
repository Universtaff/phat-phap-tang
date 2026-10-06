// lam-web.mjs — trang web tĩnh của kênh Phật Pháp Tăng (GitHub Pages: universtaff.github.io/phat-phap-tang).
//   node lam-web.mjs --du-lieu   # (máy local) gom du-lieu.json từ ../dong-bo-mxh/hang-doi.json + ../kich-ban/loi-<ma>.json
//   node lam-web.mjs             # dựng _site/ — job GitHub Actions chạy mỗi ngày, cần biến YT_API_KEY
// Mỗi tập một trang: video nhúng + LỜI KỂ đúng như đã đọc (loi-<ma>.json — KHÔNG lấy tệp kịch bản .md, trong đó có
// ghi chú nội bộ "những gì không được nói") + nguồn kinh & ghi công ảnh lấy nguyên từ mô tả YouTube.
// Chỉ dựng trang cho video YouTube ĐÃ công khai (khoá API công khai không thấy video đang hẹn) ⇒ job hằng ngày tự thêm
// trang khi tập hẹn giờ lên sóng. Google đọc được chữ chứ không đọc được video — đây là đường để người tìm gặp kênh.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const D = import.meta.dirname, OUT = join(D, "_site");
const GOC = "https://universtaff.github.io/phat-phap-tang";

if (process.argv.includes("--du-lieu")) {
  const P = join(D, "..");
  const hdGoc = JSON.parse(readFileSync(join(P, "dong-bo-mxh", "hang-doi.json"), "utf8"));
  const du = hdGoc.map((x) => {
    const t = join(P, "kich-ban", `loi-${x.ma}.json`);
    return { ma: x.ma, tuyen: x.tuyen, tap: x.tap, yt: x.yt, tieuDe: x.tieuDe, moTa: x.moTaFb,
      loi: existsSync(t) ? JSON.parse(readFileSync(t, "utf8")).map((c) => c[1]).filter(Boolean) : [] };
  });
  writeFileSync(join(D, "du-lieu.json"), JSON.stringify(du, null, 1) + "\n");
  console.log(`du-lieu.json: ${du.length} tap`);
  process.exit(0);
}
const LINK = {
  yt: "https://www.youtube.com/@phatphaptanggz",
  fb: "https://www.facebook.com/profile.php?id=61594979856647",
  ig: "https://www.instagram.com/phatphaptang.theravada/",
  tt: "https://www.tiktok.com/@quyytambao99",
};
const hd = JSON.parse(readFileSync(join(D, "du-lieu.json"), "utf8"));

// ngày đăng YouTube (cho VideoObject + sắp xếp) — khoá API công khai, 1 đơn vị/50 video
const KHOA = process.env.YT_API_KEY;
if (!KHOA) { console.error("thieu YT_API_KEY"); process.exit(1); }
const ngay = new Map();
for (let i = 0; i < hd.length; i += 50) {
  const r = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${hd.slice(i, i + 50).map((x) => x.yt).join(",")}&key=${KHOA}`)).json();
  for (const v of r.items ?? []) ngay.set(v.id, { luc: v.snippet.publishedAt, dai: v.contentDetails.duration });
}
// chỉ tập YouTube đã công khai (API khoá công khai không thấy video riêng tư/đang hẹn)
const tap = hd.filter((x) => ngay.has(x.yt));

const NHOM = [
  { ma: "cuoc-doi", ten: "Cuộc đời Đức Phật", mo: "Từ đản sinh ở Lumbinī đến Niết bàn ở Kusinārā, kể theo Tam tạng Pāli.", lay: (x) => x.tuyen === "duc-phat" && x.tap <= 31 },
  { ma: "chuyen-trong-kinh", ten: "Những câu chuyện trong kinh", mo: "Các nhân vật và điển tích quanh Đức Phật, mỗi tập một câu chuyện.", lay: (x) => x.tuyen === "duc-phat" && x.tap >= 32 && x.tap <= 50 },
  { ma: "dau-chan", ten: "Dấu chân còn lại — các thánh tích", mo: "Đi qua các thánh tích: lời kinh, chữ khắc trên đá và những gì khảo cổ tìm lại được.", lay: (x) => x.tuyen === "duc-phat" && x.tap >= 51 },
  { ma: "phap-cu", ten: "Kinh Pháp Cú", mo: "Từng bài kệ Pháp Cú, kèm câu chuyện mà Chú giải kể là duyên khởi của bài kệ.", lay: (x) => x.tuyen === "phap-cu" },
  { ma: "cac-coi", ten: "Các cõi và chúng sinh", mo: "Các cõi trong vũ trụ quan Phật giáo, theo kinh điển Pāli.", lay: (x) => x.tuyen === "cac-coi" },
];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const linkHoa = (s) => esc(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, "")}</a>`);

/** Tách mô tả YouTube: đoạn mở (tóm tắt) · khối nguồn/ghi công · bỏ link YouTube + dòng thẻ. */
function tachMoTa(x) {
  const than = x.moTa.split("\n").slice(2).join("\n");          // bỏ dòng tiêu đề + dòng trống đầu
  const dong = than.split("\n").filter((l) => !/^▶ Xem trên YouTube/.test(l) && !/^\s*(#[\p{L}\p{N}_]+\s*)+$/u.test(l));
  const i = dong.findIndex((l) => /^[📿📖🖼🪨🧭⛏🎵🔔💬]/u.test(l));
  const mo = (i < 0 ? dong : dong.slice(0, i)).join("\n").trim();
  const nguon = i < 0 ? "" : dong.slice(i).join("\n").trim();
  return { mo, nguon };
}

const CSS = `:root{--nen:#faf6ee;--be-mat:#fffdf8;--chu:#2b1d12;--nhat:#6b5a48;--vang:#9a6b1f;--vien:#e6dccb;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--nen:#16110c;--be-mat:#1f1811;--chu:#ece2d0;--nhat:#b3a38c;--vang:#d4a24c;--vien:#3a2e22;color-scheme:dark}}
:root[data-theme="dark"]{--nen:#16110c;--be-mat:#1f1811;--chu:#ece2d0;--nhat:#b3a38c;--vang:#d4a24c;--vien:#3a2e22;color-scheme:dark}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--nen);color:var(--chu);font:18px/1.75 "Noto Serif",Georgia,serif}
a{color:var(--vang);text-underline-offset:3px}a:hover{text-decoration-thickness:2px}
.khung{max-width:720px;margin:0 auto;padding:0 16px}
header{border-bottom:1px solid var(--vien);background:var(--be-mat)}
header .khung{display:flex;align-items:center;gap:12px;padding-block:12px}
header img{width:44px;height:44px;border-radius:50%}
header a{color:inherit;text-decoration:none;font-weight:700;letter-spacing:.02em}
header small{display:block;font-weight:400;color:var(--nhat);font-size:14px;letter-spacing:0}
h1{font-size:clamp(26px,5vw,34px);line-height:1.3;margin:32px 0 8px;text-wrap:balance}
h2{font-size:22px;line-height:1.35;margin:44px 0 6px}
.nhat{color:var(--nhat)}.nho{font-size:15px}
.mo{font-size:19px}
.video{max-width:340px;margin:24px auto;aspect-ratio:9/16;border-radius:14px;overflow:hidden;background:#000;border:1px solid var(--vien)}
.video iframe{width:100%;height:100%;border:0;display:block}
.loi p{margin:0 0 1.1em}
.nguon{background:var(--be-mat);border:1px solid var(--vien);border-radius:12px;padding:16px 18px;font-size:15px;line-height:1.65;white-space:pre-line;overflow-wrap:anywhere}
.ds{list-style:none;padding:0;margin:12px 0 0}
.ds li{border-top:1px solid var(--vien)}.ds li:last-child{border-bottom:1px solid var(--vien)}
.ds a{display:flex;gap:12px;padding:10px 2px;color:inherit;text-decoration:none}
.ds a:hover span:last-child{color:var(--vang)}
.ds span:first-child{color:var(--vang);min-width:3.2em;font-variant-numeric:tabular-nums}
.chuyen{display:flex;justify-content:space-between;gap:16px;margin:36px 0;font-size:16px}
.chuyen a{max-width:48%}.chuyen a:last-child{text-align:right;margin-left:auto}
.nut{display:inline-block;padding:10px 18px;border:1px solid var(--vang);border-radius:999px;text-decoration:none;font-size:16px}
footer{border-top:1px solid var(--vien);margin-top:56px;padding:24px 0 40px;font-size:15px;color:var(--nhat)}
footer nav{display:flex;flex-wrap:wrap;gap:8px 18px;margin-bottom:10px}
:focus-visible{outline:2px solid var(--vang);outline-offset:2px}`;

const khung = ({ tieuDe, moTa, url, than, jsonld = "", anh = `${GOC}/logo.png` }) => `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(tieuDe)}</title><meta name="google-site-verification" content="oooxwV_rr5c1GsUInLzSgfZT_0Dp_1LyYF_66iSCTfA"><meta name="description" content="${esc(moTa)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(tieuDe)}"><meta property="og:description" content="${esc(moTa)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${anh}"><meta property="og:locale" content="vi_VN">
<link rel="icon" href="${GOC}/logo.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap&subset=vietnamese,latin-ext" rel="stylesheet">
<style>${CSS}</style>${jsonld}</head><body>
<header><div class="khung"><img src="${GOC}/logo.png" alt="" width="44" height="44"><a href="${GOC}/">Phật Pháp Tăng · Theravāda<small>Kể chuyện Đức Phật theo Tam tạng Pāli</small></a></div></header>
<main class="khung">${than}</main>
<footer><div class="khung"><nav><a href="${LINK.yt}">YouTube</a><a href="${LINK.fb}">Facebook</a><a href="${LINK.ig}">Instagram</a><a href="${LINK.tt}">TikTok</a></nav>
Nội dung bám kinh tạng Nikāya và Luật tạng, bản dịch Việt của HT. Thích Minh Châu; chi tiết nào lấy từ chú giải đều ghi rõ là chú giải. Hình ảnh là hiện vật thật và phim thật, không dựng bằng AI.</div></footer>
</body></html>
`;

// ---- dựng ----
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
copyFileSync(join(D, "logo.png"), join(OUT, "logo.png"));
writeFileSync(join(OUT, ".nojekyll"), "");

const trang = [];
const muc = [];
for (const n of NHOM) {
  const ds = tap.filter(n.lay).sort((p, q) => p.tap - q.tap);
  if (!ds.length) continue;
  muc.push(`<h2 id="${n.ma}">${esc(n.ten)}</h2><p class="nhat nho">${esc(n.mo)} · ${ds.length} tập</p><ol class="ds">${ds.map((x) =>
    `<li><a href="${GOC}/${x.ma}/"><span>${x.tuyen === "phap-cu" ? "Kệ" : "Tập"} ${esc(x.tuyen === "phap-cu" ? (/Pháp Cú ([\d–-]+)/.exec(x.tieuDe)?.[1] ?? x.tap) : x.tap)}</span><span>${esc(x.tieuDe.replace(/^(Dấu chân còn lại · )?(Tập \d+|Pháp Cú [\d–-]+)\s*—\s*/, ""))}</span></a></li>`).join("")}</ol>`);
  ds.forEach((x, i) => {
    const { mo, nguon } = tachMoTa(x);
    const loi = x.loi ?? [];
    const url = `${GOC}/${x.ma}/`, nd = ngay.get(x.yt);
    const truoc = ds[i - 1], sau = ds[i + 1];
    const jsonld = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org", "@type": "VideoObject", name: x.tieuDe, description: mo || x.tieuDe,
      thumbnailUrl: [`https://i.ytimg.com/vi/${x.yt}/hqdefault.jpg`], uploadDate: nd.luc, duration: nd.dai,
      embedUrl: `https://www.youtube-nocookie.com/embed/${x.yt}`, contentUrl: `https://www.youtube.com/watch?v=${x.yt}`, inLanguage: "vi",
    }).replace(/</g, "\\u003c")}</script>`;
    const than = `<p class="nhat nho" style="margin-top:24px"><a href="${GOC}/#${n.ma}">${esc(n.ten)}</a></p>
<h1>${esc(x.tieuDe)}</h1>
${mo ? `<p class="mo">${esc(mo).replace(/\n+/g, " ")}</p>` : ""}
<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${x.yt}" title="${esc(x.tieuDe)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
${loi.length ? `<h2>Lời kể</h2><div class="loi">${loi.map((p) => `<p>${esc(p)}</p>`).join("")}</div>` : ""}
${nguon ? `<h2>Nguồn kinh và ghi công hình ảnh</h2><div class="nguon">${linkHoa(nguon)}</div>` : ""}
<p style="margin-top:28px"><a class="nut" href="https://www.youtube.com/watch?v=${x.yt}">Xem trên YouTube</a></p>
<nav class="chuyen">${truoc ? `<a href="${GOC}/${truoc.ma}/">← ${esc(truoc.tieuDe)}</a>` : "<span></span>"}${sau ? `<a href="${GOC}/${sau.ma}/">${esc(sau.tieuDe)} →</a>` : ""}</nav>`;
    mkdirSync(join(OUT, x.ma), { recursive: true });
    writeFileSync(join(OUT, x.ma, "index.html"), khung({ tieuDe: `${x.tieuDe} · Phật Pháp Tăng`, moTa: (mo || x.tieuDe).replace(/\s+/g, " ").slice(0, 160), url, than, jsonld, anh: `https://i.ytimg.com/vi/${x.yt}/hqdefault.jpg` }));
    trang.push({ url, luc: nd.luc });
  });
}
writeFileSync(join(OUT, "index.html"), khung({
  tieuDe: "Phật Pháp Tăng · Theravāda — kể chuyện Đức Phật theo Tam tạng Pāli",
  moTa: "Cuộc đời Đức Phật, Kinh Pháp Cú và các thánh tích, kể theo kinh điển Pāli. Mỗi tập có video, lời kể đầy đủ và nguồn kinh.",
  url: `${GOC}/`,
  than: `<h1>Kể chuyện Đức Phật theo Tam tạng Pāli</h1>
<p class="mo">Kênh dành cho người muốn hiểu giáo lý Đức Phật từ gốc. Mỗi tập dưới đây có video, lời kể đầy đủ và nguồn kinh để tự đối chiếu.</p>
<p><a class="nut" href="${LINK.yt}">Kênh YouTube</a></p>${muc.join("")}`,
}));
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${GOC}/</loc></url>\n${trang.map((t) => `<url><loc>${t.url}</loc><lastmod>${t.luc.slice(0, 10)}</lastmod></url>`).join("\n")}\n</urlset>\n`);
console.log(`web/: ${trang.length} trang tap + trang chu + sitemap (${tap.length}/${hd.length} tap da cong khai tren YouTube)`);

