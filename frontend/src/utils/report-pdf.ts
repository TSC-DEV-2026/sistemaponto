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
  worked: string
  overtime: string
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
  totals: { worked: string; overtime: string; shortage: string; bank: string }
  notes: string[]
}

function paint(value: string, x: number, y: number, size: number) {
  return `0 g BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${pdfText(value)} Tj ET`
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
  const metricWidth = sheet.hourBank ? 46 : 54
  const metricCount = sheet.hourBank ? 4 : 3
  const punchWidth = (tableWidth - dateWidth - metricWidth * metricCount) / punchCount
  const punchLabel = (index: number) => {
    const pair = Math.floor(index / 2) + 1
    const kind = index % 2 === 0 ? "E" : "S"
    return punchWidth >= 40 ? `${kind === "E" ? "Entrada" : "Saída"} ${pair}` : `${kind}${pair}`
  }
  const columns = [
    { label: "Dia", width: dateWidth },
    ...Array.from({ length: punchCount }, (_, index) => ({ label: punchLabel(index), width: punchWidth })),
    { label: "Trab.", width: metricWidth },
    { label: "Extra", width: metricWidth },
    { label: "Falta", width: metricWidth },
    ...(sheet.hourBank ? [{ label: "Banco", width: metricWidth }] : []),
  ]
  const rowHeight = 15
  const headerHeight = 16
  const pages: string[][] = []
  let cursor = 0
  while (cursor < sheet.days.length || pages.length === 0) {
    const commands = ["0.4 w", "0.55 G", "0 g"]
    let y = 814
    commands.push(paint("Folha de ponto", margin, y, 13))
    y -= 16
    commands.push(paint(sheet.period, margin, y, 9))
    y -= 18
    commands.push(paint(`Empresa: ${sheet.company}`, margin, y, 9))
    y -= 14
    commands.push(paint(`Nome: ${sheet.name}`, margin, y, 9))
    y -= 14
    commands.push(paint(`CPF: ${sheet.cpf}`, margin, y, 9))
    commands.push(paint(`Matrícula: ${sheet.registration}`, margin + 210, y, 9))
    y -= 16
    const remaining = sheet.days.length - cursor
    const room = y - 36
    const notesHeight = 12 * sheet.notes.length + 70
    const fitsWithClose = headerHeight + remaining * rowHeight + rowHeight + notesHeight <= room
    const capacity = Math.max(1, Math.floor((room - (fitsWithClose ? notesHeight : 0) - headerHeight - rowHeight) / rowHeight))
    const count = Math.min(remaining, capacity)
    const slice = sheet.days.slice(cursor, cursor + count)
    const last = cursor + count >= sheet.days.length
    const rows = last
      ? [...slice, { date: "Total", punches: [], off: false, worked: sheet.totals.worked, overtime: sheet.totals.overtime, shortage: sheet.totals.shortage, bank: sheet.totals.bank }]
      : slice
    const tableTop = y
    const tableHeight = headerHeight + rows.length * rowHeight
    let x = margin
    columns.forEach((column) => {
      commands.push(box(x, tableTop - headerHeight, column.width, headerHeight, "0.93 g"))
      x += column.width
    })
    rows.forEach((day, index) => {
      const top = tableTop - headerHeight - index * rowHeight
      if (day.off) commands.push(box(margin, top - rowHeight, tableWidth, rowHeight, "0.96 g"))
      if (day.date === "Total") commands.push(box(margin, top - rowHeight, tableWidth, rowHeight, "0.93 g"))
    })
    commands.push(`0.55 G ${box(margin, tableTop - tableHeight, tableWidth, tableHeight, null)}`)
    x = margin
    columns.forEach((column) => {
      commands.push(rule(x, tableTop, x, tableTop - tableHeight))
      x += column.width
    })
    commands.push(rule(margin + tableWidth, tableTop, margin + tableWidth, tableTop - tableHeight))
    rows.forEach((_, index) => {
      const top = tableTop - headerHeight - index * rowHeight
      commands.push(rule(margin, top, margin + tableWidth, top))
    })
    x = margin
    columns.forEach((column) => {
      commands.push(paint(column.label, x + 2, tableTop - 11, 7))
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
        ...(sheet.hourBank ? [day.bank] : []),
      ]
      let cell = margin
      values.forEach((value, column) => {
        commands.push(paint(value, cell + 2, top - 11, 7))
        cell += columns[column].width
      })
    })
    cursor += count
    if (last) {
      let noteY = tableTop - tableHeight - 16
      sheet.notes.forEach((note) => {
        commands.push(paint(note, margin, noteY, 8))
        noteY -= 12
      })
      const signY = 58
      commands.push(`0.2 G ${rule(margin, signY, margin + 210, signY)}`)
      commands.push(paint("Empregador", margin, signY - 14, 9))
      commands.push(rule(margin + tableWidth - 210, signY, margin + tableWidth, signY))
      commands.push(paint("Funcionário", margin + tableWidth - 210, signY - 14, 9))
    }
    pages.push(commands)
    if (count === 0) break
  }
  return pages
}

function renderStreams(pages: string[][]) {
  const objects: string[] = []
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
  const kids = pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  pages.forEach((commands, index) => {
    const pageNumber = 4 + index * 2
    const stream = commands.join("\n")
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

export function closingSheetsPdf(sheets: ClosingSheet[]) {
  const pages = sheets.flatMap(sheetPages)
  if (pages.length === 0) {
    return render([["Folha de ponto", "", "Nenhuma pessoa neste período."]])
  }
  return renderStreams(pages)
}
