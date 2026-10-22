import { create } from "qrcode/lib/core/qrcode.js"

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 36
const COLUMNS = 2
const ROWS = 3
const GAP = 16
const CARDS_PER_PAGE = COLUMNS * ROWS

export type QrCardPdf = {
  full_name: string
  content: string
}

function latin(value: string) {
  return Array.from(value)
    .map((char) => (char.charCodeAt(0) <= 255 ? char : "?"))
    .join("")
}

function pdfText(value: string) {
  return `(${latin(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`
}

function widthOf(value: string, size: number) {
  return latin(value).length * size * 0.52
}

function nameLines(value: string, maxWidth: number, size: number) {
  const maxChars = Math.max(1, Math.floor(maxWidth / (size * 0.52)))
  const words = latin(value)
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => (widthOf(word, size) > maxWidth ? word.match(new RegExp(`.{1,${maxChars}}`, "g")) || [word] : [word]))
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (current && widthOf(next, size) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) {
    lines.push(current)
  }
  return lines.slice(0, 2).map((line, index) => (index === 1 && lines.length > 2 ? `${line.slice(0, Math.max(0, line.length - 3))}...` : line))
}

function number(value: number) {
  return value.toFixed(2)
}

function qrDrawing(
  x: number,
  y: number,
  cell: number,
  modules: { size: number; get(row: number, col: number): number | boolean },
) {
  const paint = cell + 0.2
  const parts: string[] = []
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (!modules.get(row, column)) {
        continue
      }
      const px = x + column * cell
      const py = y + (modules.size - 1 - row) * cell
      parts.push(`${number(px)} ${number(py)} ${number(paint)} ${number(paint)} re`)
    }
  }
  if (parts.length === 0) {
    return ""
  }
  return `0 0 0 rg\n${parts.join("\n")}\nf`
}

function pageStream(cards: QrCardPdf[], page: number, pages: number) {
  const usableWidth = PAGE_WIDTH - MARGIN * 2
  const cardWidth = (usableWidth - GAP) / COLUMNS
  const cardHeight = 230
  const commands = [
    "0.45 0.45 0.45 rg",
    "BT",
    "/F1 11 Tf",
    `1 0 0 1 ${MARGIN} ${PAGE_HEIGHT - 28} Tm`,
    `${pdfText("QR Code para registro de ponto")} Tj`,
    "ET",
    "BT",
    "/F1 9 Tf",
    `1 0 0 1 ${PAGE_WIDTH - MARGIN - widthOf(`${page} / ${pages}`, 9)} 24 Tm`,
    `${pdfText(`${page} / ${pages}`)} Tj`,
    "ET",
  ]
  cards.forEach((card, index) => {
    const column = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    const x = MARGIN + column * (cardWidth + GAP)
    const y = PAGE_HEIGHT - 48 - (row + 1) * cardHeight - row * GAP
    const titleSize = 13
    const lines = nameLines(card.full_name, cardWidth - 24, titleSize)
    const modules = create(card.content, { errorCorrectionLevel: "M" }).modules
    const titleBlock = 26 + Math.max(0, lines.length - 1) * 16
    const cell = Math.min((cardWidth - 8) / (modules.size + 8), (cardHeight - titleBlock - 8) / (modules.size + 8))
    const qrX = x + (cardWidth - cell * modules.size) / 2
    const qrY = y + cell * 4
    commands.push("0.82 0.82 0.82 RG")
    commands.push("1 w")
    commands.push(`${number(x)} ${number(y)} ${number(cardWidth)} ${number(cardHeight)} re S`)
    commands.push("BT")
    commands.push(`/F2 ${titleSize} Tf`)
    lines.forEach((line, lineIndex) => {
      const textX = x + (cardWidth - widthOf(line, titleSize)) / 2
      const textY = y + cardHeight - 22 - lineIndex * 16
      commands.push(`1 0 0 1 ${number(textX)} ${number(textY)} Tm`)
      commands.push("0 0 0 rg")
      commands.push(`${pdfText(line)} Tj`)
    })
    commands.push("ET")
    commands.push(qrDrawing(qrX, qrY, cell, modules))
  })
  return commands.filter(Boolean).join("\n")
}

function render(streams: string[]) {
  const objects: string[] = []
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
  const kids = streams.map((_, index) => `${5 + index * 2} 0 R`).join(" ")
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${streams.length} >>`
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  streams.forEach((stream, index) => {
    const pageNumber = 5 + index * 2
    objects[pageNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${pageNumber + 1} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
    objects[pageNumber + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })
  let file = "%PDF-1.4\n"
  const offsets = [0]
  for (let number = 1; number < objects.length; number += 1) {
    offsets[number] = file.length
    file += `${number} 0 obj\n${objects[number]}\nendobj\n`
  }
  const xref = file.length
  file += `xref\n0 ${objects.length}\n`
  file += "0000000000 65535 f \n"
  for (let number = 1; number < objects.length; number += 1) {
    file += `${String(offsets[number]).padStart(10, "0")} 00000 n \n`
  }
  file += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  const bytes = new Uint8Array(file.length)
  for (let index = 0; index < file.length; index += 1) {
    bytes[index] = file.charCodeAt(index) & 255
  }
  return bytes
}

export function qrCardsPdf(cards: QrCardPdf[]): Uint8Array<ArrayBuffer> {
  const pages: string[] = []
  const pageCount = Math.ceil(cards.length / CARDS_PER_PAGE)
  for (let page = 0; page < pageCount; page += 1) {
    const slice = cards.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE)
    pages.push(pageStream(slice, page + 1, pageCount))
  }
  return render(pages)
}
