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

export type ClosingSheetDay = {
  date: string
  punches: string[]
  off: boolean
  absence: boolean
  worked: string
  overtime: string
  night: string
  shortage: string
  bank: string
}

export type ClosingSheet = {
  company: string
  name: string
  cpf: string
  registration: string
  period: string
  hourBank: boolean
  days: ClosingSheetDay[]
  totals: { worked: string; overtime: string; night: string; shortage: string; bank: string }
  notes: string[]
}

const GREEN = "0.118 0.541 0.227"
const INK = "0.067 0.094 0.153"
const MUTED = "0.322 0.392 0.478"
const LINE = "0.820 0.855 0.886"
const PAPER = "0.965 0.976 0.969"
const ZEBRAS = "0.973 0.980 0.976"
const OFF = "0.945 0.953 0.965"
const ABSENCE = "0.992 0.941 0.941"
const TOTAL = "0.886 0.949 0.910"

function paint(value: string, x: number, y: number, size: number, font = "F1") {
  return `BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${pdfText(value)} Tj ET`
}

function fill(color: string) {
  return `${color} rg`
}

function rule(x1: number, y1: number, x2: number, y2: number) {
  return `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
}

function box(x: number, y: number, width: number, height: number, fill: string | null) {
  const origin = `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`
  return fill ? `${fill} ${origin} f` : `${origin} S`
}

function sheetPages(sheet: ClosingSheet) {
  const margin = 28
  const pageWidth = 595
  const tableWidth = pageWidth - margin * 2
  const punchCount = Math.max(4, ...sheet.days.map((day) => day.punches.length))
  const dateWidth = 42
  const metricWidth = sheet.hourBank ? 58 : 64
  const metricCount = sheet.hourBank ? 5 : 4
  const punchWidth = (tableWidth - dateWidth - metricWidth * metricCount) / punchCount
  const punchLabel = (index: number) => {
    const pair = Math.floor(index / 2) + 1
    const kind = index % 2 === 0 ? "E" : "S"
    return punchWidth >= 40 ? `${kind === "E" ? "Entrada" : "Saída"} ${pair}` : `${kind}${pair}`
  }
  const columns = [
    { label: "Dia", width: dateWidth },
    ...Array.from({ length: punchCount }, (_, index) => ({ label: punchLabel(index), width: punchWidth })),
    { label: "H. trabalhadas", width: metricWidth },
    { label: "H. extras", width: metricWidth },
    { label: "H. faltantes", width: metricWidth },
    { label: "H. noturnas", width: metricWidth },
    ...(sheet.hourBank ? [{ label: "Banco", width: metricWidth }] : []),
  ]
  const rowHeight = 16
  const headerHeight = 18
  const pages: string[][] = []
  let cursor = 0
  let pageNumber = 0
  const noteLines = sheet.notes.flatMap((note) => wrap(note))
  while (cursor < sheet.days.length || pages.length === 0) {
    pageNumber += 1
    const commands = ["0.6 w"]
    commands.push(box(0, 790, pageWidth, 52, fill(GREEN)))
    commands.push(fill("1 1 1"))
    commands.push(paint("Folha de ponto", margin, 812, 16, "F2"))
    commands.push(paint(sheet.period, pageWidth - margin - sheet.period.length * 4.6, 800, 9))
    commands.push(box(margin, 708, tableWidth, 70, fill(PAPER)))
    commands.push(box(margin, 708, 4, 70, fill(GREEN)))
    commands.push(fill(INK))
    commands.push(paint(sheet.name, margin + 16, 754, 13, "F2"))
    commands.push(fill(MUTED))
    commands.push(paint(sheet.company, margin + 16, 736, 9))
    commands.push(paint(`CPF ${sheet.cpf}`, margin + 16, 720, 9))
    commands.push(paint(`Matrícula ${sheet.registration}`, margin + 230, 720, 9))
    const y = 692
    const remaining = sheet.days.length - cursor
    const room = y - 24
    const notesHeight = 18 + noteLines.length * 12 + 78
    const fitsWithClose = headerHeight + remaining * rowHeight + rowHeight + notesHeight <= room
    const capacity = Math.max(1, Math.floor((room - (fitsWithClose ? notesHeight : 0) - headerHeight - rowHeight) / rowHeight))
    const count = Math.min(remaining, capacity)
    const slice = sheet.days.slice(cursor, cursor + count)
    const last = cursor + count >= sheet.days.length
    const rows = last
      ? [...slice, { date: "Total", punches: [], off: false, absence: false, worked: sheet.totals.worked, overtime: sheet.totals.overtime, night: sheet.totals.night, shortage: sheet.totals.shortage, bank: sheet.totals.bank }]
      : slice
    const tableTop = y
    const tableHeight = headerHeight + rows.length * rowHeight
    let x = margin
    columns.forEach((column) => {
      commands.push(box(x, tableTop - headerHeight, column.width, headerHeight, fill(GREEN)))
      x += column.width
    })
    rows.forEach((day, index) => {
      const top = tableTop - headerHeight - index * rowHeight
      const tone = day.date === "Total" ? TOTAL : day.absence ? ABSENCE : day.off ? OFF : index % 2 === 1 ? ZEBRAS : "1 1 1"
      commands.push(box(margin, top - rowHeight, tableWidth, rowHeight, fill(tone)))
    })
    commands.push(`${LINE} RG`)
    commands.push(rule(margin, tableTop - headerHeight, margin + tableWidth, tableTop - headerHeight))
    rows.forEach((_, index) => {
      const top = tableTop - headerHeight - (index + 1) * rowHeight
      commands.push(rule(margin, top, margin + tableWidth, top))
    })
    x = margin
    columns.forEach((column) => {
      commands.push(rule(x, tableTop, x, tableTop - tableHeight))
      x += column.width
    })
    commands.push(rule(margin + tableWidth, tableTop, margin + tableWidth, tableTop - tableHeight))
    commands.push(fill("1 1 1"))
    x = margin
    columns.forEach((column) => {
      commands.push(paint(column.label, x + 4, tableTop - 12, 7, "F2"))
      x += column.width
    })
    rows.forEach((day, index) => {
      const top = tableTop - headerHeight - index * rowHeight
      const values = [
        day.date,
        ...Array.from({ length: punchCount }, (_, punch) => day.punches[punch] || ""),
        day.worked,
        day.overtime,
        day.shortage,
        day.night,
        ...(sheet.hourBank ? [day.bank] : []),
      ]
      commands.push(fill(day.absence && day.date !== "Total" ? "0.620 0.165 0.165" : INK))
      let cell = margin
      values.forEach((value, column) => {
        const width = columns[column].width
        const numeric = column > punchCount
        const shift = numeric ? Math.max(4, width - 6 - value.length * 4) : 4
        commands.push(paint(value, cell + shift, top - 11, 8, day.date === "Total" ? "F2" : "F1"))
        cell += width
      })
    })
    cursor += count
    if (last) {
      let noteY = tableTop - tableHeight - 20
      commands.push(fill(MUTED))
      noteLines.forEach((note) => {
        commands.push(paint(note, margin, noteY, 8))
        noteY -= 12
      })
      const signY = noteY - 28
      const left = margin
      const right = margin + tableWidth / 2 + 12
      const lineWidth = tableWidth / 2 - 28
      commands.push(`${LINE} RG`)
      commands.push(rule(left, signY, left + lineWidth, signY))
      commands.push(rule(right, signY, right + lineWidth, signY))
      commands.push(fill(MUTED))
      commands.push(paint("Assinatura do empregador", left, signY - 14, 8))
      commands.push(paint("Assinatura do funcionário", right, signY - 14, 8))
    }
    commands.push(fill(MUTED))
    commands.push(paint(`Página ${pageNumber}`, pageWidth - margin - 52, 16, 8))
    pages.push(commands)
    if (count === 0) break
  }
  return pages
}

function renderStreams(pages: string[][]) {
  const objects: string[] = []
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
  const kids = pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  pages.forEach((commands, index) => {
    const pageNumber = 5 + index * 2
    const stream = commands.join("\n")
    objects[pageNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${pageNumber + 1} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
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

export function closingSheetsPdf(sheets: ClosingSheet[]) {
  const pages = sheets.flatMap(sheetPages)
  if (pages.length === 0) {
    return render([["Folha de ponto", "", "Nenhuma pessoa neste período."]])
  }
  return renderStreams(pages)
}
