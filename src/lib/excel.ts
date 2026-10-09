function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadExcel(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const cells = (values: (string | number | null | undefined)[]) => values.map((value) => {
    const text = value == null ? "" : String(value);
    return `<Cell><Data ss:Type="String">${escapeXml(text)}</Data></Cell>`;
  }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Report"><Table>
<Row>${cells(headers)}</Row>
${rows.map((row) => `<Row>${cells(row)}</Row>`).join("")}
</Table></Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
