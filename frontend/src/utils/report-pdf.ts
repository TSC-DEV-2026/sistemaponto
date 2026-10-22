const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const LINES_PER_PAGE = 46

export type ReportPdfLine = {
  occurredOn: string
  title: string
  fullName: string
  detail: string
}

function latin(value: string) {
  return Array.from(value)
    .map((char) => (char.charCodeAt(0) <= 255 ? char : "?"))
    .join("")
}

function pdfText(value: string) {
  return `(${latin(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`
}

function wrap(value: string) {
  const max = 90
  const words = value.split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return [""]
  }
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const pieces = word.length > max ? word.match(new RegExp(`.{1,${max}}`, "g")) || [word] : [word]
    for (const piece of pieces) {
      const next = current ? `${current} ${piece}` : piece
      if (current && next.length > max) {
        lines.push(current)
        current = piece
      } else {
        current = next
      }
    }
  }
  if (current) {
    lines.push(current)
  }
  return lines
}

function paginate(header: string[], body: string[], repeat: string[]) {
  const pages: string[][] = []
  let current = [...header]
  for (const line of body) {
    if (current.length >= LINES_PER_PAGE) {
      pages.push(current)
      current = [...repeat]
    }
    current.push(line)
  }
  if (current.length > 0) {
    pages.push(current)
  }
  return pages
}

function pageStream(lines: string[]) {
  const commands = ["BT", "/F1 11 Tf", "16 TL", "48 790 Td"]
  for (const line of lines) {
    commands.push(`${pdfText(line)} Tj`)
    commands.push("T*")
  }
  commands.push("ET")
  return commands.join("\n")
}

function render(pages: string[][]) {
  const objects: string[] = []
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
  const kids = pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  pages.forEach((lines, index) => {
    const pageNumber = 4 + index * 2
    const stream = pageStream(lines)
    objects[pageNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${pageNumber + 1} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`
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

export function reportPdf(input: { name: string; from: string; until: string; total: number; items: ReportPdfLine[] }) {
  const count = input.total === 0 ? "Nenhum registro neste período." : `${input.total} registros encontrados`
  const interval = `De ${input.from} até ${input.until}`
  const header = [input.name, interval, count, ""]
  const body = input.items.flatMap((item) => {
    const who = item.fullName ? ` · ${item.fullName}` : ""
    return [...wrap(`${item.occurredOn} · ${item.title}${who}`), ...wrap(item.detail), ""]
  })
  return render(paginate(header, body, [input.name, interval, ""]))
}
