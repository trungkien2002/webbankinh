export function glassesArt(color = "#64452f", dark = false, round = false) {
  const shape = round
    ? '<ellipse cx="184" cy="153" rx="98" ry="73"/><ellipse cx="417" cy="153" rx="98" ry="73"/>'
    : '<path d="M85 104Q180 81 280 107L265 174Q256 217 186 219Q109 220 97 174Z"/><path d="M319 107Q418 81 514 104L502 174Q487 218 419 219Q344 218 332 174Z"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 310"><ellipse cx="303" cy="238" rx="210" ry="10" fill="#000" opacity=".05"/><path d="M71 113L154 51Q171 36 188 45L385 92M527 113L434 51Q421 40 404 48L228 91" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"/>${shape.replaceAll("/>", ` fill="${dark ? "#505d4d" : "#e8eee1"}" fill-opacity=".7" stroke="${color}" stroke-width="12"/>`)}<path d="M279 123Q300 111 321 123M78 110L57 109M520 110L542 109" fill="none" stroke="${color}" stroke-width="10"/><path d="M126 120L146 119M365 120L387 117" stroke="white" opacity=".6" stroke-width="5" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
